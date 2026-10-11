// Tutto l'SQL del raccoglitore di metriche, in un posto solo.
//
// Lavora su qualunque oggetto con l'interfaccia di D1 (prepare → bind →
// run/all/first, e batch): in produzione è D1, nei test è SQLite in
// memoria (lib/d1-in-memoria.mjs) con lo stesso schema.
//
// TRE REGOLE (docs/raccoglitore-metriche-piano.md §6.3):
//   - si riscrive, non si accoda: INSERT … ON CONFLICT DO UPDATE;
//   - ogni lavoro tocca SOLO le sue colonne, e fonde il suo pezzo di `dati`
//     con json_patch: Cloudflare, Google e l'indicizzazione condividono la
//     riga senza cancellarsi a vicenda;
//   - un errore annota la fonte e NON tocca i numeri: un dato buono di ieri
//     non diventa NULL perché stanotte la fonte non ha risposto.
//
// Ogni valore passa da bind(): mai concatenato nell'SQL.

/** Cloudflare conserva «circa 30 giorni». Il giorno più vecchio può essere
 *  già parzialmente cancellato: archiviarlo congelerebbe un numero dimezzato. */
export const FINESTRA_CLOUDFLARE = 28;
/** Gli ultimi giorni si rifanno sempre: le fonti li correggono ancora. */
export const RIFAI = 4;
/** Tetto di giorni per esecuzione: le sottorichieste sono 50 (§5.5). */
export const TETTO_GIORNI = 30;
/** Search Console pubblica con due o tre giorni di ritardo. */
export const RITARDO_GOOGLE = 3;
/** Un giorno assente si scrive come zero solo quando è uscito dalla finestra
 *  che si riscrive ogni notte, più una settimana di margine: i ritardi di
 *  Google oltre i tre giorni esistono, e uno zero scritto troppo presto
 *  resterebbe congelato per sempre (revisione finale, punto 1). */
export const MARGINE_ZERI = 7;
/** Istruzioni di Google per esecuzione. D1 gratuito concede 50 query per
 *  invocazione, e la CPU è misurata con poco margine (§5.5): la storia
 *  lunga arriva in più notti invece di bloccare tutte le notti. */
export const TETTO_GOOGLE = 40;
/** privacy.html §5: «Dati di navigazione: massimo 26 mesi». */
export const CONSERVAZIONE_GIORNI = 790;

const GIORNO_MS = 86400000;
const spostato = (data, giorni) => new Date(Date.parse(`${data}T00:00:00Z`) + giorni * GIORNO_MS).toISOString().slice(0, 10);

/** Da ieri all'indietro, n giorni. Oggi non c'è mai: non è ancora finito. */
export function giorniIndietro(oggi, n) {
  return Array.from({ length: n }, (_, i) => spostato(oggi, -(i + 1)));
}

export async function registraVisita(db, v) {
  await db.prepare(`INSERT INTO visite
      (quando, giorno, percorso, sorgente, mezzo, campagna, contenuto, termine, provenienza, paese)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(v.quando, v.giorno, v.percorso, v.sorgente, v.mezzo, v.campagna, v.contenuto, v.termine, v.provenienza, v.paese)
    .run();
}

/** I giorni da fotografare: gli ultimi RIFAI sempre, più ogni giorno della
 *  finestra che non ha ancora un numero di Cloudflare. Dal più recente. */
export async function giorniDaFareCloudflare(db, oggi) {
  const candidati = giorniIndietro(oggi, FINESTRA_CLOUDFLARE);
  const { results } = await db
    .prepare('SELECT giorno FROM storico WHERE giorno >= ? AND pagine_viste IS NOT NULL')
    .bind(candidati.at(-1))
    .all();
  const fatti = new Set(results.map((r) => r.giorno));
  return candidati
    .filter((g, i) => i < RIFAI || !fatti.has(g))
    .slice(0, TETTO_GIORNI);
}

/** Annota che una fonte non ha risposto, senza toccare nessun numero. */
export function istruzioneErrore(db, giorno, fonte, presoIl) {
  return db.prepare(`INSERT INTO storico (giorno, preso_il, dati) VALUES (?, ?, ?)
      ON CONFLICT(giorno) DO UPDATE SET dati = json_patch(storico.dati, excluded.dati)`)
    .bind(giorno, presoIl, JSON.stringify({ fonti: { [fonte]: 'errore' } }));
}

/** foto = null vuol dire che Cloudflare non ha risposto per quel giorno. */
export function istruzioneCloudflare(db, giorno, foto, presoIl) {
  if (!foto) return istruzioneErrore(db, giorno, 'cloudflare', presoIl);
  return db.prepare(`INSERT INTO storico (giorno, preso_il, visite, pagine_viste, dati) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(giorno) DO UPDATE SET
        preso_il = excluded.preso_il,
        visite = excluded.visite,
        pagine_viste = excluded.pagine_viste,
        dati = json_patch(storico.dati, excluded.dati)`)
    .bind(giorno, presoIl, foto.visite, foto.pagineViste,
      JSON.stringify({ cloudflare: foto, fonti: { cloudflare: 'ok' } }));
}

function istruzioneGoogle(db, giorno, clic, impressioni, posizione, presoIl) {
  return db.prepare(`INSERT INTO storico (giorno, preso_il, impressioni, clic, posizione, dati) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(giorno) DO UPDATE SET
        preso_il = excluded.preso_il,
        impressioni = excluded.impressioni,
        clic = excluded.clic,
        posizione = excluded.posizione,
        dati = json_patch(storico.dati, excluded.dati)`)
    .bind(giorno, presoIl, impressioni, clic, posizione, JSON.stringify({ fonti: { google: 'ok' } }));
}

/**
 * Dalle righe di Search Console per data alle istruzioni da eseguire.
 *
 * Un giorno ASSENTE dalla risposta vuol dire zero impressioni — ma solo se
 * è più vecchio di RIFAI + MARGINE_ZERI giorni. Prima, può voler dire «Google
 * non l'ha ancora elaborato», e scriverci zero sarebbe inventare un crollo.
 *
 * Si parte dal primo giorno con dati: prima, il sito per Google non c'era.
 * Si scrivono solo i giorni non ancora archiviati, più gli ultimi RIFAI:
 * riscrivere 480 giorni ogni notte costerebbe CPU per niente (§5.5).
 */
export async function istruzioniGoogle(db, righe, oggi, presoIl) {
  if (!righe.length) return [];
  const perGiorno = new Map(righe.map((r) => [r.keys[0], r]));
  const primo = [...perGiorno.keys()].sort()[0];
  const ultimoZero = spostato(oggi, -(RIFAI + MARGINE_ZERI));
  const recenti = new Set(giorniIndietro(oggi, RIFAI));

  const { results } = await db
    .prepare('SELECT giorno FROM storico WHERE giorno >= ? AND impressioni IS NOT NULL')
    .bind(primo)
    .all();
  const fatti = new Set(results.map((r) => r.giorno));

  const daFare = [];
  for (let g = primo; g < oggi; g = spostato(g, 1)) {
    if (fatti.has(g) && !recenti.has(g)) continue;
    const r = perGiorno.get(g);
    if (r) daFare.push([g, r.clicks ?? 0, r.impressions ?? 0, r.position ?? null]);
    else if (g <= ultimoZero) daFare.push([g, 0, 0, null]);
  }
  // Prima il presente, poi la storia dal più vecchio: con il tetto, il
  // presente non resta mai indietro e la storia converge in poche notti.
  daFare.sort(([a], [b]) => (recenti.has(b) - recenti.has(a)) || (recenti.has(a) ? b.localeCompare(a) : a.localeCompare(b)));
  return daFare.slice(0, TETTO_GOOGLE).map(([g, c, i, p]) => istruzioneGoogle(db, g, c, i, p, presoIl));
}

/** Stessa regola di scripts/analytics/indicizzazione.mjs: «indicizzata» sì,
 *  «non indicizzata» no. Un errore di controllo non è un'indicizzazione. */
export function eIndicizzata(stato) {
  return /indicizzata/i.test(stato) && !/non indicizzata/i.test(stato);
}

export function contaIndicizzate(esiti) {
  return esiti.filter((e) => eIndicizzata(e.stato)).length;
}

export function istruzioneIndicizzazione(db, giorno, esiti, presoIl) {
  return db.prepare(`INSERT INTO storico (giorno, preso_il, indicizzate, dati) VALUES (?, ?, ?, ?)
      ON CONFLICT(giorno) DO UPDATE SET
        indicizzate = excluded.indicizzate,
        dati = json_patch(storico.dati, excluded.dati)`)
    .bind(giorno, presoIl, contaIndicizzate(esiti),
      JSON.stringify({ indicizzazione: esiti, fonti: { indicizzazione: 'ok' } }));
}

/** La promessa di privacy.html: le visite oltre i 26 mesi si cancellano. */
export function istruzionePulizia(db, oggi) {
  return db.prepare('DELETE FROM visite WHERE giorno < ?').bind(spostato(oggi, -CONSERVAZIONE_GIORNI));
}

/** Le query e le pagine si riscrivono sulla stessa finestra dei giorni di
 *  Google che possono ancora cambiare, più il margine degli zeri. */
export const FINESTRA_RICERCA = RIFAI + MARGINE_ZERI;
/** Righe per istruzione: una sola INSERT per blocco, non una per riga. D1
 *  gratuito concede 50 query per invocazione, e 16 mesi di query sono migliaia. */
const BLOCCO_RICERCA = 2000;

const percorsoDi = (url) => {
  try { return new URL(url).pathname; } catch { return url; }
};

/** Da righe di Search Console con dimensioni [date, query|page] a righe compatte. */
export function righeRicerca(tipo, righe) {
  return righe
    .filter((r) => r.keys?.length === 2)
    .map((r) => ({
      g: r.keys[0],
      t: tipo,
      k: tipo === 'pagina' ? percorsoDi(r.keys[1]) : r.keys[1],
      c: r.clicks ?? 0,
      i: r.impressions ?? 0,
      p: r.position ?? 0,
    }));
}

/**
 * La finestra [daGiorno, …] si riscrive per intero: prima si cancella, poi si
 * inserisce. Così una query che Google non riporta più per un giorno sparisce
 * invece di restare congelata. Le righe passano come UN parametro JSON e
 * json_each le apre dentro D1.
 */
export function istruzioniRicerca(db, righe, daGiorno) {
  const istruzioni = [db.prepare('DELETE FROM ricerca WHERE giorno >= ?').bind(daGiorno)];
  for (let i = 0; i < righe.length; i += BLOCCO_RICERCA) {
    istruzioni.push(db.prepare(`INSERT INTO ricerca (giorno, tipo, chiave, clic, impressioni, posizione)
        SELECT j.value->>'g', j.value->>'t', j.value->>'k', j.value->>'c', j.value->>'i', j.value->>'p'
        FROM json_each(?) AS j WHERE true
        ON CONFLICT(giorno, tipo, chiave) DO UPDATE SET
          clic = excluded.clic, impressioni = excluded.impressioni, posizione = excluded.posizione`)
      .bind(JSON.stringify(righe.slice(i, i + BLOCCO_RICERCA))));
  }
  return istruzioni;
}

/** Stessa promessa di privacy.html per i dati di ricerca: 26 mesi. */
export function istruzionePuliziaRicerca(db, oggi) {
  return db.prepare('DELETE FROM ricerca WHERE giorno < ?').bind(spostato(oggi, -CONSERVAZIONE_GIORNI));
}
