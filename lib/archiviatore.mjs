// I tre lavori notturni dell'archiviatore — docs/raccoglitore-metriche-piano.md.
//
// UN CRON, TRE MESTIERI, UNO PER ESECUZIONE (§5.5, §5.7). Sul piano
// gratuito la CPU è 10 ms per esecuzione, e la voce che pesa è la firma
// RSA del token Google: misurata il 2026-10-10, il caso peggiore con tutto
// insieme stava fra 6,8 e 8,6 ms. Separare Google da Cloudflare è ciò che
// lascia margine. E i cron sono 5 per ACCOUNT, tre già occupati da altri
// progetti: ne usiamo uno solo, ogni ora, e l'ora sceglie il lavoro.
//
// Qui non c'è rete: client e fetch arrivano da fuori. worker-archivio/
// indice.mjs li costruisce; i test passano delle finte.

import {
  giorniDaFareCloudflare, istruzioneCloudflare, istruzioniGoogle, istruzioneErrore,
  istruzioneIndicizzazione, istruzionePulizia, giorniIndietro, contaIndicizzate,
  righeRicerca, istruzioniRicerca, istruzionePuliziaRicerca, FINESTRA_RICERCA, istruzioneFonteOk,
} from './archivio.mjs';
import { leggiStato, leggiArchivio, leggiNovita, precedente } from './cruscotto.mjs';
import { componi } from './composizione.mjs';
import { compitiDellOra, avvisiEventi, avvisiGiornalieri, avvisiSettimanali, settimanaIso, MASSIMO_PER_GIRO } from './avvisi.mjs';

/** 1 token + 1 sitemap + 40 controlli = 42, sotto il tetto di 45. */
export const MASSIMO_URL = 40;
/** Search Console conserva 16 mesi: da prima non restituisce niente. */
export const GIORNI_GOOGLE = 485;

/** Righe per richiesta a Search Console: il massimo che concede. */
export const RIGHE_PAGINA_GOOGLE = 25000;
/** Pagine per dimensione: 100.000 righe bastano per anni a un sito come questo,
 *  e il tetto tiene le sottorichieste lontane da 50. */
const PAGINE_MASSIME = 4;

async function tutteLeRighe(g, opzioni) {
  const tutte = [];
  for (let pagina = 0; pagina < PAGINE_MASSIME; pagina++) {
    const r = await g.rendimento({ ...opzioni, righe: RIGHE_PAGINA_GOOGLE, daRiga: pagina * RIGHE_PAGINA_GOOGLE });
    tutte.push(...r);
    if (r.length < RIGHE_PAGINA_GOOGLE) break;
  }
  return tutte;
}

const SITEMAP = 'https://quotify.it/sitemap.xml';
const spostato = (data, giorni) => new Date(Date.parse(`${data}T00:00:00Z`) + giorni * 86400000).toISOString().slice(0, 10);

/** La chiave dell'account di servizio Google, dal segreto. Un JSON rotto
 *  NON deve finire nel messaggio d'errore: V8 cita un pezzo del testo, e
 *  quel testo è una chiave privata (revisione finale, punto 6). */
export function chiaveGoogle(testo) {
  try {
    return JSON.parse(testo);
  } catch {
    throw new Error('GSC_CHIAVE non è JSON valido');
  }
}

export function mestiere(istante) {
  const d = new Date(istante);
  const ora = d.getUTCHours();
  if (ora === 4) return 'cloudflare';
  if (ora === 5) return 'google';
  if (ora === 6 && d.getUTCDay() === 1) return 'indicizzazione';
  return null;
}

export function urlDallaSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** Cloudflare: un giorno per richiesta (numeri esatti, §5.2), ogni giorno
 *  indipendente dagli altri. Un errore annota, non ferma. */
export async function lavoroCloudflare({ db, cf, oggi, presoIl, log = console.log }) {
  const giorni = await giorniDaFareCloudflare(db, oggi);
  const istruzioni = [];
  let errori = 0;
  for (const g of giorni) {
    let foto = null;
    try {
      foto = await cf.giorno(g);
    } catch (e) {
      errori++;
      log(`cloudflare ${g}: ${e.message}`);
    }
    istruzioni.push(istruzioneCloudflare(db, g, foto, presoIl));
  }
  istruzioni.push(istruzionePulizia(db, oggi));
  istruzioni.push(istruzionePuliziaRicerca(db, oggi));
  await db.batch(istruzioni);
  log(`cloudflare: ${giorni.length} giorni, ${errori} errori`);
  return { giorni: giorni.length, errori };
}

/** Giorni di storia di query e pagine recuperati per notte. Tutti insieme alla
 *  prima esecuzione sarebbero troppi per i 10 ms di CPU, e un isolato ucciso
 *  per CPU non arriva nemmeno ad annotare l'errore: fallirebbe ogni notte in
 *  silenzio (revisione finale, punto 2). Così 16 mesi arrivano in ~8 notti. */
export const NOTTE_RICERCA = 60;

const piuRecente = (a, b) => (a > b ? a : b);

/** Search Console: una richiesta per data su 16 mesi (§4.6), poi query e
 *  pagine per giorno (cruscotto §5.1) sulla finestra che Google corregge
 *  ancora, più una tranche di storia per notte. Se Google non risponde si
 *  annota su ieri e si rilancia: l'esecuzione deve risultare fallita nelle
 *  statistiche del Worker, o nessuno se ne accorge. */
export async function lavoroGoogle({ db, g, oggi, presoIl, log = console.log }) {
  const ieri = giorniIndietro(oggi, 1)[0];
  let righe;
  try {
    righe = await g.rendimento({ da: spostato(oggi, -GIORNI_GOOGLE), a: ieri, dimensioni: ['date'], righe: 25000 });
  } catch (e) {
    await db.batch([istruzioneErrore(db, ieri, 'google', presoIl)]);
    throw e;
  }
  const istruzioni = await istruzioniGoogle(db, righe, oggi, presoIl);
  if (istruzioni.length) await db.batch(istruzioni);

  const recenti = spostato(oggi, -FINESTRA_RICERCA);
  const fronte = (await db.prepare("SELECT min(giorno) AS g FROM storico WHERE dati->>'$.fonti.ricerca' = 'ok'").first())?.g ?? null;
  const primoGoogle = (await db.prepare('SELECT min(giorno) AS g FROM storico WHERE impressioni > 0').first())?.g ?? null;
  // Più indietro di così non c'è niente: Search Console tiene 16 mesi, e prima
  // del primo giorno con impressioni il sito per Google non esisteva.
  const limite = piuRecente(spostato(oggi, -GIORNI_GOOGLE), primoGoogle ?? ieri);
  const finoA = spostato(fronte && fronte < recenti ? fronte : recenti, -1);
  const daStoria = piuRecente(spostato(finoA, -(NOTTE_RICERCA - 1)), limite);
  const finestre = [{ da: recenti, a: ieri }];
  if (daStoria <= finoA) finestre.push({ da: daStoria, a: finoA });

  let dettaglio = 0;
  for (const f of finestre) {
    let righeF;
    try {
      const query = await tutteLeRighe(g, { da: f.da, a: f.a, dimensioni: ['date', 'query'] });
      const pagine = await tutteLeRighe(g, { da: f.da, a: f.a, dimensioni: ['date', 'page'] });
      righeF = [...righeRicerca('query', query), ...righeRicerca('pagina', pagine)];
    } catch (e) {
      await db.batch([istruzioneErrore(db, ieri, 'ricerca', presoIl)]);
      throw e;
    }
    await db.batch([...istruzioniRicerca(db, righeF, f.da, f.a), istruzioneFonteOk(db, f.da, 'ricerca', presoIl)]);
    dettaglio += righeF.length;
  }

  log(`google: ${righe.length} giorni con dati, ${istruzioni.length} scritti, ${dettaglio} righe di dettaglio su ${finestre.map((f) => `${f.da}…${f.a}`).join(' e ')}`);
  return { istruzioni: istruzioni.length, ricerca: dettaglio };
}

/** Indicizzazione: la sitemap pubblicata è la lista delle pagine, così il
 *  Worker non ha bisogno del repository. Un indirizzo che fallisce diventa
 *  un esito «errore», come in scripts/analytics/indicizzazione.mjs. */
/** Google risponde 500 ogni tanto all'ispezione di un URL, e un secondo dopo
 *  risponde bene: un 5xx si riprova una volta. Le chiamate restano comunque al
 *  più MASSIMO_URL, per stare nelle 50 sottorichieste del piano gratuito. */
export const PAUSA_RIPROVA_MS = 2000;
const daRiprovare = (e) => /Search Console 5\d\d/.test(e.message);

export async function lavoroIndicizzazione({ db, g, fetch: f = globalThis.fetch, oggi, presoIl, log = console.log, attendi = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const r = await f(SITEMAP);
  if (!r.ok) {
    await db.batch([istruzioneErrore(db, oggi, 'indicizzazione', presoIl)]);
    throw new Error(`sitemap ${r.status}`);
  }
  const tutti = urlDallaSitemap(await r.text());
  const urls = tutti.slice(0, MASSIMO_URL);
  if (tutti.length > urls.length) log(`indicizzazione: la sitemap ha ${tutti.length} indirizzi, controllati i primi ${MASSIMO_URL}`);

  const esiti = [];
  let riprovabili = MASSIMO_URL - urls.length;
  for (const u of urls) {
    try {
      esiti.push(await g.statoUrl(u));
    } catch (e) {
      let errore = e;
      if (daRiprovare(e) && riprovabili > 0) {
        riprovabili--;
        await attendi(PAUSA_RIPROVA_MS);
        try {
          esiti.push(await g.statoUrl(u));
          continue;
        } catch (e2) {
          errore = e2;
        }
      }
      esiti.push({ url: u, stato: `errore: ${errore.message}`, ultimaScansione: null });
    }
  }
  const indicizzate = contaIndicizzate(esiti);
  await db.batch([istruzioneIndicizzazione(db, oggi, esiti, presoIl)]);
  log(`indicizzazione: ${esiti.length} pagine, ${indicizzate} indicizzate`);
  return { pagine: esiti.length, indicizzate };
}

/** Gli avvisi di quest'ora — docs/cruscotto-piano.md §6.2. `riassunto` legge
 *  l'app (lib/riassunto.mjs): qui arriva da fuori, nei test è una finta. */
export async function raccogliAvvisi({ db, istante, oggi, riassunto }) {
  const compiti = compitiDellOra(istante);
  const ieri = spostato(oggi, -1);
  const avvisi = [];

  if (compiti.eventi) {
    const r = await riassunto({ da: spostato(oggi, -7), a: oggi });
    if (r.stato === 'ok') avvisi.push(...avvisiEventi(r.dati.eventi));
  }

  if (compiti.giornaliero) {
    const { results } = await db.prepare(`SELECT giorno, visite, dati->'$.fonti' AS fonti FROM storico
        WHERE giorno BETWEEN ? AND ? ORDER BY giorno`).bind(spostato(oggi, -29), ieri).all();
    const storico = results.map((r) => ({ giorno: r.giorno, visite: r.visite, fonti: r.fonti ? JSON.parse(r.fonti) : null }));
    avvisi.push(...avvisiGiornalieri({ storico, ieri }));
  }

  if (compiti.settimanale) {
    const stato = await leggiStato(db);
    const settimana = { periodo: '7', da: spostato(oggi, -7), a: ieri, giorni: 7 };
    const prima = precedente(settimana);
    const [archivio, archivioPrecedente, novita, app, appPrecedente] = await Promise.all([
      leggiArchivio(db, settimana),
      leggiArchivio(db, prima),
      leggiNovita(db, settimana, stato.primi.cloudflare),
      riassunto(settimana),
      riassunto(prima),
    ]);
    const { osservazioni } = componi({
      intervallo: settimana, precedente: prima, archivio, archivioPrecedente, novita, stato,
      oggi: null, app, appPrecedente, fonti: {}, generato: new Date(istante).toISOString(),
    });
    avvisi.push(...avvisiSettimanali({
      indice: stato.indice, frasi: osservazioni,
      settimanaUscite: settimanaIso(oggi), settimanaRiassunto: settimanaIso(ieri),
    }));
  }
  return avvisi;
}

/** Manda gli avvisi non ancora mandati. La chiave si scrive SOLO dopo che
 *  Telegram ha confermato: un invio fallito riparte all'ora dopo. */
export async function lavoroAvvisi({ db, avvisi, invia, silenzioso, presoIl, log = console.log }) {
  if (!avvisi.length) return { inviati: 0, saltati: 0, falliti: 0 };
  const unici = [...new Map(avvisi.map((a) => [a.chiave, a])).values()];
  const { results } = await db.prepare('SELECT chiave FROM avvisi WHERE chiave IN (SELECT value FROM json_each(?))')
    .bind(JSON.stringify(unici.map((a) => a.chiave))).all();
  const gia = new Set(results.map((r) => r.chiave));
  const nuovi = unici.filter((a) => !gia.has(a.chiave));

  let inviati = 0;
  let falliti = 0;
  for (const a of nuovi.slice(0, MASSIMO_PER_GIRO)) {
    if (await invia({ testo: a.testo, link: a.link, silenzioso })) {
      await db.prepare('INSERT INTO avvisi (chiave, inviato_il, testo) VALUES (?, ?, ?) ON CONFLICT(chiave) DO NOTHING')
        .bind(a.chiave, presoIl, a.testo).run();
      inviati++;
    } else {
      falliti++;
    }
  }
  log(`avvisi: ${inviati} inviati, ${gia.size} già mandati, ${falliti} falliti`);
  return { inviati, saltati: gia.size, falliti };
}
