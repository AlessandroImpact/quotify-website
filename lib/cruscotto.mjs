// Le letture del cruscotto — docs/cruscotto-piano.md §5.
//
// Tutto quello che si somma su molti giorni si somma DENTRO D1 (json_each su
// storico.dati): il tempo di D1 non conta nei 10 ms di CPU della Function,
// il JSON.parse di un anno di righe sì (§3.2).
//
// NULL resta NULL. Un giorno in cui Cloudflare non ha risposto non è un
// giorno senza visite, e la pagina lo disegna come un buco.

import { eIndicizzata } from './archivio.mjs';

const GIORNO_MS = 86400000;

export const PERIODI = ['7', '28', '90', '365', 'tutto'];
export const PERIODO_PREDEFINITO = '28';
/** Quanto indietro si guarda per dire che una provenienza o una campagna è «nuova». */
export const MEMORIA_NOVITA = 90;
/** Righe di visite attribuite (raggruppate) per risposta. */
export const TETTO_VISITE_UTM = 5000;

export const spostato = (data, giorni) =>
  new Date(Date.parse(`${data}T00:00:00Z`) + giorni * GIORNO_MS).toISOString().slice(0, 10);

/** Giorni fra due date, estremi inclusi. */
export function giorniFra(da, a) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / GIORNO_MS) + 1;
}

/** Il periodo finisce sempre ieri: oggi non è finito, e l'archivio non ce l'ha. */
export function intervallo(periodo, oggi, primo = null) {
  const p = PERIODI.includes(periodo) ? periodo : PERIODO_PREDEFINITO;
  const a = spostato(oggi, -1);
  if (p === 'tutto') {
    const da = primo && primo <= a ? primo : a;
    return { periodo: p, da, a, giorni: giorniFra(da, a) };
  }
  const giorni = Number(p);
  return { periodo: p, da: spostato(oggi, -giorni), a, giorni };
}

export function precedente({ da, giorni }) {
  return { da: spostato(da, -giorni), a: spostato(da, -1), giorni };
}

const tutte = (db, sql, ...valori) => db.prepare(sql).bind(...valori).all().then((r) => r.results);
const una = (db, sql, ...valori) => db.prepare(sql).bind(...valori).first();

/** Un elenco di storico.dati.cloudflare sommato sui giorni. Pari merito in
 *  ordine di chiave, così il risultato non dipende dall'ordine di D1. */
const SQL_ELENCO = (campo, nome) => `
  SELECT j.value->>'chiave' AS ${nome}, sum(j.value->>'viste') AS viste
  FROM storico, json_each(storico.dati, '$.cloudflare.${campo}') AS j
  WHERE storico.giorno BETWEEN ? AND ?
  GROUP BY 1 ORDER BY viste DESC, 1 LIMIT ?`;

/** La posizione media di più giorni è pesata sulle impressioni: un giorno con
 *  una impressione in posizione 50 non deve valere quanto uno con cento. */
const SQL_RICERCA = `
  SELECT chiave, sum(clic) AS clic, sum(impressioni) AS impressioni,
    round(sum(posizione * impressioni) / max(sum(impressioni), 1), 1) AS posizione
  FROM ricerca WHERE tipo = ? AND giorno BETWEEN ? AND ?
  GROUP BY chiave ORDER BY clic DESC, impressioni DESC, chiave LIMIT 100`;

export async function leggiArchivio(db, { da, a }) {
  const [serie, provenienze, pagine, paesi, visiteUtm, query, pagineRicerca] = await Promise.all([
    tutte(db, `SELECT giorno, visite, pagine_viste AS pagineViste, clic, impressioni, posizione
      FROM storico WHERE giorno BETWEEN ? AND ? ORDER BY giorno`, da, a),
    tutte(db, SQL_ELENCO('provenienze', 'host'), da, a, 200),
    tutte(db, SQL_ELENCO('pagine', 'percorso'), da, a, 50),
    tutte(db, SQL_ELENCO('paesi', 'paese'), da, a, 20),
    // Grezze ma raggruppate: il client filtra per canale e campagna senza
    // tornare al server. Il tetto protegge da un'inondazione di UTM; se scatta
    // cadono i giorni più VECCHI (revisione finale, punto 4). Una riga in più
    // del tetto serve a sapere che è scattato.
    tutte(db, `SELECT giorno, sorgente, mezzo, campagna, contenuto, percorso, paese, count(*) AS n
      FROM visite WHERE giorno BETWEEN ? AND ?
      GROUP BY 1, 2, 3, 4, 5, 6, 7 ORDER BY giorno DESC, n DESC LIMIT ?`, da, a, TETTO_VISITE_UTM + 1),
    tutte(db, SQL_RICERCA, 'query', da, a),
    tutte(db, SQL_RICERCA, 'pagina', da, a),
  ]);
  const visiteUtmTroncate = visiteUtm.length > TETTO_VISITE_UTM;
  return {
    serie, provenienze, pagine, paesi,
    visiteUtm: visiteUtm.slice(0, TETTO_VISITE_UTM).reverse(),
    visiteUtmTroncate,
    query, pagineRicerca,
  };
}

/**
 * Provenienze e campagne comparse nel periodo e assenti nei 90 giorni prima.
 * Le provenienze hanno bisogno di 90 giorni di storia Cloudflare per dirlo:
 * prima, tutto sembrerebbe nuovo. Le campagne no — una campagna è nuova per
 * definizione la prima volta che porta qualcuno.
 */
export async function leggiNovita(db, { da, a }, primoCloudflare) {
  const inizio = spostato(da, -MEMORIA_NOVITA);
  const fine = spostato(da, -1);
  const storiaBasta = Boolean(primoCloudflare) && primoCloudflare <= inizio;
  const [provenienze, campagne] = await Promise.all([
    storiaBasta ? tutte(db, `
      SELECT DISTINCT j.value->>'chiave' AS host
      FROM storico, json_each(storico.dati, '$.cloudflare.provenienze') AS j
      WHERE storico.giorno BETWEEN ? AND ? AND j.value->>'chiave' != ''
        AND j.value->>'chiave' NOT IN (
          SELECT k.value->>'chiave' FROM storico AS s, json_each(s.dati, '$.cloudflare.provenienze') AS k
          WHERE s.giorno BETWEEN ? AND ?)
      ORDER BY host`, da, a, inizio, fine) : [],
    tutte(db, `
      SELECT campagna, count(*) AS visite FROM visite
      WHERE giorno BETWEEN ? AND ? AND campagna IS NOT NULL
        AND campagna NOT IN (SELECT campagna FROM visite WHERE giorno BETWEEN ? AND ? AND campagna IS NOT NULL)
      GROUP BY campagna ORDER BY visite DESC, campagna`, da, a, inizio, fine),
  ]);
  return { provenienze: provenienze.map((r) => r.host), campagne };
}

const percorsoDi = (url) => {
  try { return new URL(url).pathname; } catch { return url; }
};
const errore = (stato) => /^errore/i.test(stato ?? '');

/** Le fotografie del lunedì, dalla più recente. Un controllo fallito non è
 *  un'uscita dall'indice: è un controllo fallito. */
export function interpretaIndice(fotografie) {
  if (!fotografie.length) return { ultima: null, precedente: null, pagine: [], entrate: [], uscite: [] };
  const mappe = fotografie.map((f) => new Map(f.esiti.map((e) => [percorsoDi(e.url), e])));
  const [ora, prima] = mappe;

  const pagine = [...ora.entries()].map(([percorso, e]) => {
    const si = eIndicizzata(e.stato);
    let dal = fotografie[0].giorno;
    for (let i = 1; i < mappe.length; i++) {
      const x = mappe[i].get(percorso);
      if (!x || errore(x.stato) || eIndicizzata(x.stato) !== si) break;
      dal = fotografie[i].giorno;
    }
    return { percorso, stato: e.stato, indicizzata: si, dal };
  }).sort((x, y) => x.percorso.localeCompare(y.percorso));

  const cambiate = (da, verso) => (prima ? [...ora.entries()]
    .filter(([p, e]) => {
      const x = prima.get(p);
      return x && !errore(x.stato) && !errore(e.stato) && eIndicizzata(x.stato) === da && eIndicizzata(e.stato) === verso;
    })
    .map(([p]) => p).sort() : []);

  return {
    ultima: fotografie[0].giorno,
    precedente: fotografie[1]?.giorno ?? null,
    pagine,
    entrate: cambiate(false, true),
    uscite: cambiate(true, false),
  };
}

const leggiJson = (t) => (t ? JSON.parse(t) : null);

export async function leggiStato(db) {
  const [primi, fotografie, ultimoCf, fonti, ultimoGoogle] = await Promise.all([
    una(db, `SELECT min(CASE WHEN pagine_viste IS NOT NULL THEN giorno END) AS cloudflare,
                    min(CASE WHEN impressioni IS NOT NULL THEN giorno END) AS google FROM storico`),
    tutte(db, `SELECT giorno, dati->'$.indicizzazione' AS esiti FROM storico
      WHERE indicizzate IS NOT NULL ORDER BY giorno DESC LIMIT 12`),
    una(db, `SELECT giorno, dati->'$.cloudflare.vitals' AS vitals FROM storico
      WHERE pagine_viste IS NOT NULL ORDER BY giorno DESC LIMIT 1`),
    tutte(db, `SELECT giorno, dati->'$.fonti' AS fonti FROM storico ORDER BY giorno DESC LIMIT 3`),
    una(db, 'SELECT max(giorno) AS giorno FROM storico WHERE impressioni IS NOT NULL'),
  ]);
  return {
    primi: { cloudflare: primi?.cloudflare ?? null, google: primi?.google ?? null },
    indice: interpretaIndice(fotografie.map((r) => ({ giorno: r.giorno, esiti: leggiJson(r.esiti) ?? [] }))),
    salute: {
      vitals: leggiJson(ultimoCf?.vitals),
      giornoVitals: ultimoCf?.giorno ?? null,
      fonti: fonti.map((r) => ({ giorno: r.giorno, ...(leggiJson(r.fonti) ?? {}) })),
      ultimoGiornoGoogle: ultimoGoogle?.giorno ?? null,
    },
  };
}
