import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apriInMemoria } from './d1-in-memoria.mjs';
import {
  intervallo, precedente, giorniFra, leggiArchivio, leggiNovita, leggiStato, interpretaIndice, TETTO_VISITE_UTM,
} from './cruscotto.mjs';

const OGGI = '2026-10-12';

// Una riga di storico come la scrive l'archiviatore.
function giorno(db, g, { visite = null, pagineViste = null, clic = null, impressioni = null, posizione = null, dati = {} } = {}) {
  db.tutte(`INSERT INTO storico (giorno, preso_il, visite, pagine_viste, clic, impressioni, posizione, dati)
    VALUES ('${g}', 'x', ${visite ?? 'NULL'}, ${pagineViste ?? 'NULL'}, ${clic ?? 'NULL'}, ${impressioni ?? 'NULL'}, ${posizione ?? 'NULL'}, '${JSON.stringify(dati).replace(/'/g, "''")}') RETURNING giorno`);
}
const cf = (provenienze = [], pagine = [], paesi = []) => ({ cloudflare: { provenienze, pagine, paesi, vitals: null } });
const visita = (db, g, { sorgente = null, mezzo = null, campagna = null, percorso = '/' } = {}) =>
  db.tutte(`INSERT INTO visite (quando, giorno, percorso, sorgente, mezzo, campagna) VALUES ('x', '${g}', '${percorso}', ${sorgente ? `'${sorgente}'` : 'NULL'}, ${mezzo ? `'${mezzo}'` : 'NULL'}, ${campagna ? `'${campagna}'` : 'NULL'}) RETURNING id`);

test('intervallo: i periodi finiscono ieri e durano quanto dicono', () => {
  assert.deepEqual(intervallo('7', OGGI), { periodo: '7', da: '2026-10-05', a: '2026-10-11', giorni: 7 });
  assert.deepEqual(intervallo('28', OGGI), { periodo: '28', da: '2026-09-14', a: '2026-10-11', giorni: 28 });
  assert.equal(giorniFra('2026-10-05', '2026-10-11'), 7);
});

test('intervallo: un periodo sconosciuto diventa 28 giorni, non un errore', () => {
  assert.equal(intervallo('mille', OGGI).periodo, '28');
  assert.equal(intervallo(null, OGGI).periodo, '28');
});

test('intervallo «tutto» comincia dal primo giorno con dati; senza dati è solo ieri', () => {
  assert.deepEqual(intervallo('tutto', OGGI, '2025-06-12'), { periodo: 'tutto', da: '2025-06-12', a: '2026-10-11', giorni: 487 });
  assert.deepEqual(intervallo('tutto', OGGI, null), { periodo: 'tutto', da: '2026-10-11', a: '2026-10-11', giorni: 1 });
});

test('precedente: stessa durata, subito prima', () => {
  assert.deepEqual(precedente({ da: '2026-10-05', giorni: 7 }), { da: '2026-09-28', a: '2026-10-04', giorni: 7 });
});

test('leggiArchivio: la serie tiene i NULL come NULL e resta nell\'intervallo', async () => {
  const db = apriInMemoria();
  giorno(db, '2026-10-01', { visite: 3, pagineViste: 5 });
  giorno(db, '2026-10-02', { clic: 1, impressioni: 9, posizione: 7 }); // Cloudflare non ha risposto
  giorno(db, '2026-10-20', { visite: 99 });
  const { serie } = await leggiArchivio(db, { da: '2026-10-01', a: '2026-10-11' });
  assert.deepEqual(serie, [
    { giorno: '2026-10-01', visite: 3, pagineViste: 5, clic: null, impressioni: null, posizione: null },
    { giorno: '2026-10-02', visite: null, pagineViste: null, clic: 1, impressioni: 9, posizione: 7 },
  ]);
});

test('leggiArchivio: provenienze, pagine e paesi si sommano sui giorni, in SQL', async () => {
  const db = apriInMemoria();
  giorno(db, '2026-10-01', { visite: 1, dati: cf([{ chiave: 'www.linkedin.com', viste: 2 }, { chiave: '', viste: 5 }], [{ chiave: '/', viste: 7 }], [{ chiave: 'IT', viste: 7 }]) });
  giorno(db, '2026-10-02', { visite: 1, dati: cf([{ chiave: 'www.linkedin.com', viste: 3 }], [{ chiave: '/', viste: 3 }], [{ chiave: 'IT', viste: 3 }]) });
  const a = await leggiArchivio(db, { da: '2026-10-01', a: '2026-10-02' });
  // Pari merito: ordine per host, così il risultato non dipende da D1.
  assert.deepEqual(a.provenienze, [{ host: '', viste: 5 }, { host: 'www.linkedin.com', viste: 5 }]);
  assert.deepEqual(a.pagine, [{ percorso: '/', viste: 10 }]);
  assert.deepEqual(a.paesi, [{ paese: 'IT', viste: 10 }]);
});

test('leggiArchivio: visite attribuite raggruppate e ricerca con posizione pesata sulle impressioni', async () => {
  const db = apriInMemoria();
  visita(db, '2026-10-01', { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio' });
  visita(db, '2026-10-01', { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio' });
  visita(db, '2026-10-02', { sorgente: 'www.google.com' });
  db.tutte("INSERT INTO ricerca VALUES ('2026-10-01', 'query', 'forfettario', 1, 10, 4), ('2026-10-02', 'query', 'forfettario', 0, 30, 8) RETURNING giorno");
  const a = await leggiArchivio(db, { da: '2026-10-01', a: '2026-10-02' });
  assert.deepEqual(a.visiteUtm.map((v) => [v.giorno, v.sorgente, v.campagna, v.n]), [
    ['2026-10-01', 'linkedin', 'lancio', 2],
    ['2026-10-02', 'www.google.com', null, 1],
  ]);
  assert.deepEqual(a.query, [{ chiave: 'forfettario', clic: 1, impressioni: 40, posizione: 7 }]);
});

test('leggiNovita: un host mai visto nei 90 giorni prima è nuovo; uno già visto no', async () => {
  const db = apriInMemoria();
  giorno(db, '2026-07-01', { visite: 1, dati: cf([]) }); // la storia comincia qui
  giorno(db, '2026-08-01', { visite: 1, dati: cf([{ chiave: 'www.linkedin.com', viste: 1 }]) });
  giorno(db, '2026-10-06', { visite: 1, dati: cf([{ chiave: 'www.linkedin.com', viste: 1 }, { chiave: 'reddit.com', viste: 1 }, { chiave: '', viste: 4 }]) });
  visita(db, '2026-08-01', { campagna: 'vecchia' });
  visita(db, '2026-10-06', { campagna: 'vecchia' });
  visita(db, '2026-10-06', { campagna: 'lancio' });
  visita(db, '2026-10-07', { campagna: 'lancio' });
  const n = await leggiNovita(db, { da: '2026-10-05', a: '2026-10-11' }, '2026-07-01');
  assert.deepEqual(n.provenienze, ['reddit.com']);
  assert.deepEqual(n.campagne, [{ campagna: 'lancio', visite: 2 }]);
});

test('leggiNovita: senza 90 giorni di storia Cloudflare, nessuna provenienza è «nuova»', async () => {
  const db = apriInMemoria();
  giorno(db, '2026-10-06', { visite: 1, dati: cf([{ chiave: 'reddit.com', viste: 1 }]) });
  const n = await leggiNovita(db, { da: '2026-10-05', a: '2026-10-11' }, '2026-09-13');
  assert.deepEqual(n.provenienze, []);
});

test('interpretaIndice: entrate, uscite e da quando una pagina è nel suo stato', () => {
  const foto = (giorno, stati) => ({ giorno, esiti: Object.entries(stati).map(([p, stato]) => ({ url: `https://quotify.it${p}`, stato })) });
  const r = interpretaIndice([
    foto('2026-10-12', { '/': 'Inviata e indicizzata', '/assistenza': 'Inviata e indicizzata', '/privacy': 'Rilevata, ma attualmente non indicizzata', '/guide': 'errore: Search Console 500' }),
    foto('2026-10-05', { '/': 'Inviata e indicizzata', '/assistenza': "L'URL è sconosciuto a Google", '/privacy': 'Inviata e indicizzata', '/guide': 'Inviata e indicizzata' }),
    foto('2026-09-28', { '/': 'Inviata e indicizzata' }),
  ]);
  assert.equal(r.ultima, '2026-10-12');
  assert.equal(r.precedente, '2026-10-05');
  assert.deepEqual(r.entrate, ['/assistenza']);
  assert.deepEqual(r.uscite, ['/privacy']); // /guide è un errore di controllo, non un'uscita
  assert.deepEqual(r.pagine.find((p) => p.percorso === '/'), { percorso: '/', stato: 'Inviata e indicizzata', indicizzata: true, dal: '2026-09-28' });
  assert.equal(r.pagine.find((p) => p.percorso === '/assistenza').dal, '2026-10-12');
});

test('interpretaIndice: nessuna fotografia, niente da dire', () => {
  assert.deepEqual(interpretaIndice([]), { ultima: null, precedente: null, pagine: [], entrate: [], uscite: [] });
});

test('leggiStato: primi giorni, vitals più recenti, fonti, ultimo giorno di Google', async () => {
  const db = apriInMemoria();
  giorno(db, '2025-06-12', { impressioni: 1, clic: 0, posizione: 9 });
  giorno(db, '2026-09-13', { visite: 1, pagineViste: 1, dati: { cloudflare: { vitals: { lcp: 900 } }, fonti: { cloudflare: 'ok' } } });
  giorno(db, '2026-10-11', { visite: 2, pagineViste: 2, dati: { cloudflare: { vitals: { lcp: 800 } }, fonti: { cloudflare: 'ok', google: 'errore' } } });
  const s = await leggiStato(db);
  assert.deepEqual(s.primi, { cloudflare: '2026-09-13', google: '2025-06-12' });
  assert.deepEqual(s.salute.vitals, { lcp: 800 });
  assert.equal(s.salute.giornoVitals, '2026-10-11');
  assert.equal(s.salute.ultimoGiornoGoogle, '2025-06-12');
  assert.deepEqual(s.salute.fonti[0], { giorno: '2026-10-11', cloudflare: 'ok', google: 'errore' });
});

test('leggiStato su un archivio vuoto: tutto null o vuoto, niente eccezioni', async () => {
  const s = await leggiStato(apriInMemoria());
  assert.deepEqual(s.primi, { cloudflare: null, google: null });
  assert.equal(s.indice.ultima, null);
  assert.equal(s.salute.vitals, null);
  assert.deepEqual(s.salute.fonti, []);
});

test('leggiArchivio: oltre il tetto delle visite attribuite cadono i giorni più vecchi, non i più recenti, e lo dice', async () => {
  const db = apriInMemoria();
  // 5001 gruppi diversi: un percorso diverso per ognuno, dal 2026-01-01 in avanti.
  db.tutte(`WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < ${TETTO_VISITE_UTM})
    INSERT INTO visite (quando, giorno, percorso, sorgente)
    SELECT 'x', date('2026-01-01', '+' || (i / 20) || ' days'), '/p' || i, 'linkedin' FROM n RETURNING id`);
  const a = await leggiArchivio(db, { da: '2026-01-01', a: '2026-12-31' });
  assert.equal(a.visiteUtm.length, TETTO_VISITE_UTM);
  assert.equal(a.visiteUtmTroncate, true);
  const giorni = a.visiteUtm.map((v) => v.giorno);
  assert.equal(giorni.at(-1), '2026-09-08'); // il più recente c'è: la riga 5000 cade 250 giorni dopo il 1 gennaio
  assert.equal(giorni.filter((g) => g === '2026-01-01').length, 19); // dal più vecchio cade una riga su 20
  assert.deepEqual(giorni, [...giorni].sort()); // e l'ordine resta crescente
});

test('leggiArchivio: sotto il tetto niente troncamento', async () => {
  const a = await leggiArchivio(apriInMemoria(), { da: '2026-01-01', a: '2026-01-07' });
  assert.equal(a.visiteUtmTroncate, false);
});
