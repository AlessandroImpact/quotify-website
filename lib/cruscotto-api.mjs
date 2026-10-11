// La logica di GET /api/cruscotto — docs/cruscotto-piano.md §3, §5.3, §8.
//
// functions/api/cruscotto.js è solo l'involucro: tutto quello che si può
// sbagliare sta qui, dove i test lo raggiungono senza rete.
//
// ORDINE NON NEGOZIABILE: prima l'accesso, poi qualunque altra cosa — anche
// la cache. Una risposta in cache non è una risposta pubblica.

import { verificatore } from './accesso.mjs';
import { PERIODI, PERIODO_PREDEFINITO, intervallo, precedente, leggiArchivio, leggiNovita, leggiStato, spostato } from './cruscotto.mjs';
import { componi } from './composizione.mjs';
import { leggiRiassunto } from './riassunto.mjs';
import { cliente } from './cloudflare.mjs';

export const CACHE_OK_S = 300;
export const CACHE_ERRORE_S = 60;

const NO_STORE = { 'Cache-Control': 'no-store' };
const negato = () => Response.json({ errore: 'Non autorizzato.' }, { status: 403, headers: NO_STORE });
const nonDisponibile = () => Response.json(
  { fonti: { archivio: 'errore', cloudflare: 'errore', app: 'errore' } }, { status: 503, headers: NO_STORE });

let condiviso = null;
/** Un verificatore per isolate: così i certificati di Access restano in
 *  memoria fra una richiesta e l'altra. */
export function verificaPer(env) {
  const chiave = `${env.ACCESS_TEAM}|${env.ACCESS_AUD}|${env.CRUSCOTTO_EMAIL}`;
  if (condiviso?.chiave !== chiave) {
    condiviso = { chiave, v: verificatore({ team: env.ACCESS_TEAM, aud: env.ACCESS_AUD, email: env.CRUSCOTTO_EMAIL }) };
  }
  return (token) => condiviso.v.verifica(token);
}

const senzaMillisecondi = (iso) => iso.replace(/\.\d{3}Z$/, 'Z');

async function leggiOggi(env, f, oggi, ieri, adesso) {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) throw new Error('Cloudflare non configurato');
  const cf = cliente({ token: env.CF_ANALYTICS_TOKEN, account: env.CF_ACCOUNT_ID, fetch: f });
  const righe = await cf.perOra({ da: `${ieri}T00:00:00Z`, fino: senzaMillisecondi(new Date(adesso).toISOString()) });
  return {
    perOra: righe.filter((r) => r.ora.startsWith(oggi)),
    ieriPerOra: righe.filter((r) => r.ora.startsWith(ieri)),
  };
}

export async function rispondi({ request, env, adesso = Date.now(), fetch: f = globalThis.fetch, cache = null, waitUntil = () => {}, verifica }) {
  try {
    await verifica(request.headers.get('Cf-Access-Jwt-Assertion'));
  } catch {
    return negato();
  }
  if (!env.DB) return nonDisponibile();

  const url = new URL(request.url);
  const richiesto = url.searchParams.get('periodo');
  const periodo = PERIODI.includes(richiesto) ? richiesto : PERIODO_PREDEFINITO;
  const confronto = url.searchParams.get('confronto') === '1';
  const oggi = new Date(adesso).toISOString().slice(0, 10);
  // Il giorno nella chiave: a mezzanotte UTC il periodo cambia, e la cache con lui.
  const chiaveCache = new Request(`https://quotify.it/api/cruscotto?periodo=${periodo}&confronto=${confronto ? 1 : 0}&giorno=${oggi}`);

  if (cache) {
    const salvata = await cache.match(chiaveCache).catch(() => null);
    if (salvata) return new Response(salvata.body, { status: 200, headers: { 'Content-Type': 'application/json', ...NO_STORE } });
  }

  let stato;
  try {
    stato = await leggiStato(env.DB);
  } catch {
    return nonDisponibile();
  }
  const primo = [stato.primi.cloudflare, stato.primi.google].filter(Boolean).sort()[0] ?? null;
  const periodoCorrente = intervallo(periodo, oggi, primo);
  const periodoPrima = confronto ? precedente(periodoCorrente) : null;
  const ieri = spostato(oggi, -1);
  const chiave = env.RIASSUNTO_CHIAVE;

  const [archivio, archivioPrima, novita, ore, app, appPrima] = await Promise.allSettled([
    leggiArchivio(env.DB, periodoCorrente),
    periodoPrima ? leggiArchivio(env.DB, periodoPrima) : null,
    leggiNovita(env.DB, periodoCorrente, stato.primi.cloudflare),
    leggiOggi(env, f, oggi, ieri, adesso),
    leggiRiassunto({ chiave, da: periodoCorrente.da, a: periodoCorrente.a, fetch: f }),
    periodoPrima ? leggiRiassunto({ chiave, da: periodoPrima.da, a: periodoPrima.a, fetch: f }) : null,
  ]);
  if (archivio.status !== 'fulfilled' || (periodoPrima && archivioPrima.status !== 'fulfilled')) return nonDisponibile();

  const valore = (r, riserva) => (r.status === 'fulfilled' ? r.value : riserva);
  const statoApp = valore(app, { stato: 'errore', dati: null });
  const fonti = {
    archivio: 'ok',
    cloudflare: ore.status === 'fulfilled' ? 'ok' : 'errore',
    app: statoApp.stato,
  };

  const corpo = componi({
    intervallo: periodoCorrente,
    precedente: periodoPrima,
    archivio: archivio.value,
    archivioPrecedente: periodoPrima ? archivioPrima.value : null,
    novita: valore(novita, { provenienze: [], campagne: [] }),
    stato,
    oggi: valore(ore, null),
    app: statoApp,
    appPrecedente: valore(appPrima, null),
    fonti,
    generato: new Date(adesso).toISOString(),
  });

  if (cache) {
    // «In attesa» non è un guasto: finché l'app non c'è, non serve riprovare ogni minuto.
    const durata = fonti.cloudflare === 'ok' && fonti.app !== 'errore' ? CACHE_OK_S : CACHE_ERRORE_S;
    waitUntil(cache.put(chiaveCache, Response.json(corpo, { headers: { 'Cache-Control': `max-age=${durata}` } })).catch(() => {}));
  }
  return Response.json(corpo, { headers: NO_STORE });
}
