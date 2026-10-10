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
} from './archivio.mjs';

/** 1 token + 1 sitemap + 40 controlli = 42, sotto il tetto di 45. */
export const MASSIMO_URL = 40;
/** Search Console conserva 16 mesi: da prima non restituisce niente. */
export const GIORNI_GOOGLE = 485;

const SITEMAP = 'https://quotify.it/sitemap.xml';
const spostato = (data, giorni) => new Date(Date.parse(`${data}T00:00:00Z`) + giorni * 86400000).toISOString().slice(0, 10);

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
  await db.batch(istruzioni);
  log(`cloudflare: ${giorni.length} giorni, ${errori} errori`);
  return { giorni: giorni.length, errori };
}

/** Search Console: una richiesta per data su 16 mesi (§4.6). Se Google non
 *  risponde si annota su ieri e si rilancia: l'esecuzione deve risultare
 *  fallita nelle statistiche del Worker, o nessuno se ne accorge. */
export async function lavoroGoogle({ db, g, oggi, presoIl, log = console.log }) {
  let righe;
  try {
    righe = await g.rendimento({ da: spostato(oggi, -GIORNI_GOOGLE), a: spostato(oggi, -1), dimensioni: ['date'], righe: 25000 });
  } catch (e) {
    await db.batch([istruzioneErrore(db, giorniIndietro(oggi, 1)[0], 'google', presoIl)]);
    throw e;
  }
  const istruzioni = await istruzioniGoogle(db, righe, oggi, presoIl);
  if (istruzioni.length) await db.batch(istruzioni);
  log(`google: ${righe.length} giorni con dati, ${istruzioni.length} scritti`);
  return { istruzioni: istruzioni.length };
}

/** Indicizzazione: la sitemap pubblicata è la lista delle pagine, così il
 *  Worker non ha bisogno del repository. Un indirizzo che fallisce diventa
 *  un esito «errore», come in scripts/analytics/indicizzazione.mjs. */
export async function lavoroIndicizzazione({ db, g, fetch: f = globalThis.fetch, oggi, presoIl, log = console.log }) {
  const r = await f(SITEMAP);
  if (!r.ok) {
    await db.batch([istruzioneErrore(db, oggi, 'indicizzazione', presoIl)]);
    throw new Error(`sitemap ${r.status}`);
  }
  const tutti = urlDallaSitemap(await r.text());
  const urls = tutti.slice(0, MASSIMO_URL);
  if (tutti.length > urls.length) log(`indicizzazione: la sitemap ha ${tutti.length} indirizzi, controllati i primi ${MASSIMO_URL}`);

  const esiti = [];
  for (const u of urls) {
    try {
      esiti.push(await g.statoUrl(u));
    } catch (e) {
      esiti.push({ url: u, stato: `errore: ${e.message}`, ultimaScansione: null });
    }
  }
  const indicizzate = contaIndicizzate(esiti);
  await db.batch([istruzioneIndicizzazione(db, oggi, esiti, presoIl)]);
  log(`indicizzazione: ${esiti.length} pagine, ${indicizzate} indicizzate`);
  return { pagine: esiti.length, indicizzate };
}
