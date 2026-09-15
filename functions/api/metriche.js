// GET /api/metriche — i dati di Google Search Console per il sito.
//
// PERCHÉ ESISTE QUI E NON NELL'APP
// L'applicazione legge già Cloudflare: è la stessa infrastruttura su cui gira,
// e aggiungere quelle chiamate non le costa nulla. Google è un'altra cosa:
// un'altra autenticazione, un'altra chiave, un altro fornitore. Metterla
// dentro il Worker dell'applicazione avrebbe appesantito il posto sbagliato.
// Il sito possiede i propri dati di ricerca e li offre; l'app li consuma.
//
// CHI PUÒ CHIAMARLO
// Solo chi conosce METRICHE_CHIAVE, un segreto condiviso con l'applicazione.
// NON è pensato per essere chiamato da un browser: la chiamata parte dal
// Worker dell'app, che ha già fatto il suo controllo di amministratore. Se un
// giorno servisse aprirlo a una pagina, il segreto finirebbe nel codice
// pubblico e servirebbe un meccanismo diverso.
//
// SEGRETI RICHIESTI sul progetto Pages `quotify-website`:
//   GSC_CHIAVE       il contenuto del file JSON dell'account di servizio
//   METRICHE_CHIAVE  la parola d'ordine condivisa con l'app

import { lettore, ChiaveNonValida } from '../../lib/searchconsole.mjs';

/** Dieci minuti. Search Console aggiorna una volta al giorno: chiedere più
 *  spesso non porta dati nuovi, porta solo latenza e consumo di quota. */
const CACHE_SECONDI = 600;

/** Confronto a tempo costante: un `===` su stringhe segrete perde informazione
 *  sul primo carattere sbagliato, e da lì si risale al valore un pezzo per
 *  volta. Qui il costo di farlo bene è tre righe. */
function ugualeSicuro(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const giorno = (scostamento = 0) =>
  new Date(Date.now() + scostamento * 86400000).toISOString().slice(0, 10);

export const onRequestGet = async ({ request, env, waitUntil }) => {
  const atteso = env.METRICHE_CHIAVE;
  const dato = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');

  // Fail-closed: senza segreto configurato non passa nessuno. È deliberato —
  // un endpoint di metriche che si apre da solo quando manca la chiave è
  // esattamente il tipo di errore che non ti accorgi di avere.
  if (!atteso || !ugualeSicuro(dato, atteso)) {
    return Response.json({ successo: false, errore: 'Non autorizzato.' }, { status: 401 });
  }

  const cache = caches.default;
  const chiaveCache = new Request(new URL(request.url).toString(), { method: 'GET' });
  const inCache = await cache.match(chiaveCache).catch(() => null);
  if (inCache) return inCache;

  if (!env.GSC_CHIAVE) {
    return Response.json(
      { successo: false, errore: 'Search Console non configurata.' }, { status: 503 });
  }

  try {
    const g = lettore(JSON.parse(env.GSC_CHIAVE));

    const giorni = Math.min(Number(new URL(request.url).searchParams.get('giorni')) || 30, 480);
    const da = giorno(-giorni);
    // Search Console ha due o tre giorni di ritardo: chiedere fino a oggi
    // restituisce zeri finali che sembrano un crollo del traffico.
    const a = giorno(-1);

    const [totali, perPagina, perQuery, perData, sitemap] = await Promise.all([
      g.totali({ da, a }),
      g.rendimento({ da, a, dimensioni: ['page'], righe: 25 }),
      g.rendimento({ da, a, dimensioni: ['query'], righe: 25 }),
      g.rendimento({ da, a, dimensioni: ['date'], righe: 480 }),
      g.sitemap(),
    ]);

    const riga = (r) => ({
      chiave: r.keys[0],
      clic: r.clicks,
      impressioni: r.impressions,
      ctr: r.ctr,
      posizione: r.position,
    });

    const risposta = Response.json({
      successo: true,
      dati: {
        finestra: { da, a, giorni },
        // Esatti, non campionati: al contrario dei numeri di Cloudflare.
        campionato: false,
        totali,
        pagine: perPagina.map(riga),
        // Vuoto NON significa nessuna ricerca: Google nasconde le query sotto
        // una soglia di volume. Chi disegna la vista deve dirlo, o si legge
        // uno zero che non c'è.
        query: perQuery.map(riga),
        queryNascoste: perQuery.length === 0 && totali.impressioni > 0,
        perGiorno: perData.map((r) => ({ data: r.keys[0], clic: r.clicks, impressioni: r.impressions })),
        sitemap,
      },
    }, { headers: { 'Cache-Control': `max-age=${CACHE_SECONDI}` } });

    waitUntil(cache.put(chiaveCache, risposta.clone()).catch(() => {}));
    return risposta;
  } catch (e) {
    if (e instanceof ChiaveNonValida) {
      return Response.json({ successo: false, errore: 'Chiave di Search Console non valida.' }, { status: 503 });
    }
    // Il messaggio di Google finisce nei log, MAI nella risposta: passa
    // accanto alla chiave a ogni chiamata e non deve uscire di qui.
    console.error('metriche:', e instanceof Error ? e.message : String(e));
    return Response.json({ successo: false, errore: 'Errore nel recupero delle metriche.' }, { status: 500 });
  }
};
