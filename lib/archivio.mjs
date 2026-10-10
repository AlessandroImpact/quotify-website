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
 * ha più di RITARDO_GOOGLE giorni. Prima, vuol dire «Google non l'ha ancora
 * elaborato», e scriverci zero sarebbe inventare un crollo.
 *
 * Si parte dal primo giorno con dati: prima, il sito per Google non c'era.
 * Si scrivono solo i giorni non ancora archiviati, più gli ultimi RIFAI:
 * riscrivere 480 giorni ogni notte costerebbe CPU per niente (§5.5).
 */
export async function istruzioniGoogle(db, righe, oggi, presoIl) {
  if (!righe.length) return [];
  const perGiorno = new Map(righe.map((r) => [r.keys[0], r]));
  const primo = [...perGiorno.keys()].sort()[0];
  const ultimoDefinitivo = spostato(oggi, -(RITARDO_GOOGLE + 1));
  const recenti = new Set(giorniIndietro(oggi, RIFAI));

  const { results } = await db
    .prepare('SELECT giorno FROM storico WHERE giorno >= ? AND impressioni IS NOT NULL')
    .bind(primo)
    .all();
  const fatti = new Set(results.map((r) => r.giorno));

  const istruzioni = [];
  for (let g = primo; g < oggi; g = spostato(g, 1)) {
    if (fatti.has(g) && !recenti.has(g)) continue;
    const r = perGiorno.get(g);
    if (r) {
      istruzioni.push(istruzioneGoogle(db, g, r.clicks ?? 0, r.impressions ?? 0, r.position ?? null, presoIl));
    } else if (g <= ultimoDefinitivo) {
      istruzioni.push(istruzioneGoogle(db, g, 0, 0, null, presoIl));
    }
  }
  return istruzioni;
}

/** Stessa regola di scripts/analytics/indicizzazione.mjs: «indicizzata» sì,
 *  «non indicizzata» no. Un errore di controllo non è un'indicizzazione. */
export function contaIndicizzate(esiti) {
  return esiti.filter((e) => /indicizzata/i.test(e.stato) && !/non indicizzata/i.test(e.stato)).length;
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
