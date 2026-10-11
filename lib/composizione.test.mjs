import { test } from 'node:test';
import assert from 'node:assert/strict';

import { totali, serie, canali, campagne, imbuto, occasioni, componi } from './composizione.mjs';

const vuoto = () => ({ serie: [], provenienze: [], pagine: [], paesi: [], visiteUtm: [], query: [], pagineRicerca: [] });
const app = (m = {}) => ({ versione: 1, giorni: [], coorte: [], totali: { ricavoMensileCentesimi: 990 }, eventi: [], medianaGiorniAlPagamento: 4, ...m });
const riga = (giorno, m = {}) => ({ giorno, visite: null, pagineViste: null, clic: null, impressioni: null, posizione: null, ...m });

test('serie: un elemento per ogni giorno, i buchi restano null', () => {
  const a = { ...vuoto(), serie: [riga('2026-10-01', { visite: 3 }), riga('2026-10-03', { visite: 1 })] };
  const s = serie({ da: '2026-10-01', a: '2026-10-03' }, a, null);
  assert.deepEqual(s.map((x) => [x.giorno, x.visite, x.iscritti]), [['2026-10-01', 3, null], ['2026-10-02', null, null], ['2026-10-03', 1, null]]);
});

test('serie: con l\'app, gli iscritti di un giorno senza riga sono zero', () => {
  const s = serie({ da: '2026-10-01', a: '2026-10-02' }, vuoto(), app({ giorni: [{ giorno: '2026-10-01', iscritti: 2, attivati: 0, nuoviPro: 0, nuoviPaganti: 0 }] }));
  assert.deepEqual(s.map((x) => x.iscritti), [2, 0]);
});

test('totali: i null non diventano zero; tutto null resta null', () => {
  const t = totali({ ...vuoto(), serie: [riga('a', { visite: 3 }), riga('b'), riga('c', { visite: 2 })] }, null);
  assert.equal(t.visite, 5);
  assert.equal(t.clic, null);
  assert.equal(t.iscritti, null);
  assert.equal(totali(vuoto(), app()).iscritti, 0);
  assert.equal(totali(vuoto(), app()).ricavoMensileCentesimi, 990);
});

test('canali: famiglie dalle provenienze, visite attribuite e iscritti per canale', () => {
  const a = {
    ...vuoto(),
    provenienze: [{ host: 'www.linkedin.com', viste: 4 }, { host: 'lnkd.in', viste: 1 }, { host: '', viste: 9 }],
    visiteUtm: [{ sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', n: 3 }],
  };
  const c = canali(a, app({ coorte: [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', rif: null, iscritti: 2, attivati: 1, pro: 1, paganti: 1 },
    { sorgente: null, mezzo: null, campagna: null, rif: null, iscritti: 5, attivati: 0, pro: 0, paganti: 0 },
  ] }));
  assert.deepEqual(c.find((x) => x.famiglia === 'Social'), { famiglia: 'Social', pagineViste: 5, visiteUtm: 3, iscritti: 2, paganti: 1 });
  assert.equal(c.find((x) => x.famiglia === 'Diretto o interno').pagineViste, 9);
  assert.equal(c.find((x) => x.famiglia === 'Provenienza sconosciuta').iscritti, 5);
  assert.equal(c[0].famiglia, 'Diretto o interno'); // ordinati per pagine viste
});

test('canali senza app: iscritti e paganti null, non zero', () => {
  const [c] = canali({ ...vuoto(), provenienze: [{ host: 'www.google.com', viste: 2 }] }, null);
  assert.deepEqual(c, { famiglia: 'Ricerca Google', pagineViste: 2, visiteUtm: 0, iscritti: null, paganti: null });
});

test('campagne: solo visite con UTM; gli iscritti si agganciano a sorgente, mezzo e campagna', () => {
  const a = { ...vuoto(), visiteUtm: [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', contenuto: 'post1', n: 2 },
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', contenuto: 'post2', n: 1 },
    { sorgente: 'www.google.com', mezzo: null, campagna: null, contenuto: null, n: 7 }, // solo referrer
  ] };
  const c = campagne(a, app({ coorte: [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', rif: null, iscritti: 1, attivati: 0, pro: 0, paganti: 0 },
    { sorgente: 'sito', mezzo: 'guida', campagna: 'clienti', rif: null, iscritti: 3, attivati: 0, pro: 0, paganti: 0 },
    { sorgente: 'newsletter', mezzo: 'email', campagna: 'ottobre', rif: null, iscritti: 1, attivati: 1, pro: 1, paganti: 1 },
  ] }));
  assert.deepEqual(c, [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', visite: 3, iscritti: 1, paganti: 0 },
    { sorgente: 'newsletter', mezzo: 'email', campagna: 'ottobre', visite: 0, iscritti: 1, paganti: 1 },
  ]);
});

test('imbuto: null senza app; con l\'app cinque gradini, anche per canale', () => {
  assert.equal(imbuto(vuoto(), null, 10), null);
  const a = { ...vuoto(), visiteUtm: [{ sorgente: 'linkedin', mezzo: 'social', campagna: 'x', n: 20 }] };
  const i = imbuto(a, app({ coorte: [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'x', rif: null, iscritti: 4, attivati: 2, pro: 1, paganti: 1 },
    { sorgente: null, mezzo: null, campagna: null, rif: null, iscritti: 6, attivati: 1, pro: 0, paganti: 0 },
  ] }), 120);
  assert.deepEqual(i.gradini.map((g) => [g.nome, g.valore]), [['Visite', 120], ['Iscrizioni', 10], ['Attivazione', 3], ['Pro', 1], ['Pagante', 1]]);
  assert.deepEqual(i.perCanale.Social.map((g) => g.valore), [20, 4, 2, 1, 1]);
  assert.equal(i.perCanale['Provenienza sconosciuta'][0].valore, null); // le visite di chi? non si sa
  assert.equal(i.medianaGiorniAlPagamento, 4);
});

test('occasioni: molte impressioni e CTR sotto la mediana; con la mediana a zero contano i clic a zero', () => {
  const p = (chiave, clic, impressioni) => ({ chiave, clic, impressioni, posizione: 10 });
  assert.deepEqual(occasioni([p('/a', 10, 100), p('/b', 1, 300), p('/c', 5, 50), p('/d', 0, 20)]).map((x) => x.chiave), ['/b']);
  assert.deepEqual(occasioni([p('/a', 0, 150), p('/b', 0, 400), p('/c', 0, 10)]).map((x) => x.chiave), ['/b', '/a']);
  assert.deepEqual(occasioni([]), []);
});

test('componi: con l\'app in errore il resto è intero e l\'imbuto è null', () => {
  const archivio = { ...vuoto(), serie: [riga('2026-10-05', { visite: 2, pagineViste: 3 })] };
  const r = componi({
    intervallo: { periodo: '7', da: '2026-10-05', a: '2026-10-11', giorni: 7 },
    precedente: null, archivio, archivioPrecedente: null,
    novita: { provenienze: [], campagne: [] },
    stato: { primi: { cloudflare: '2026-09-13', google: '2025-06-12' }, indice: { ultima: null, precedente: null, pagine: [], entrate: [], uscite: [] }, salute: { vitals: null, giornoVitals: null, fonti: [], ultimoGiornoGoogle: null } },
    oggi: null,
    app: { stato: 'errore', dati: null }, appPrecedente: null,
    fonti: { archivio: 'ok', cloudflare: 'errore', app: 'errore' },
    generato: '2026-10-12T08:00:00.000Z',
  });
  assert.equal(r.serie.length, 7);
  assert.equal(r.totali.visite, 2);
  assert.equal(r.totali.iscritti, null);
  assert.equal(r.imbuto, null);
  assert.equal(r.totaliPrecedente, null);
  assert.deepEqual(r.fonti, { archivio: 'ok', cloudflare: 'errore', app: 'errore' });
  assert.deepEqual(r.periodo, { nome: '7', da: '2026-10-05', a: '2026-10-11', giorni: 7 });
  assert.ok(r.osservazioni.length >= 1);
});
