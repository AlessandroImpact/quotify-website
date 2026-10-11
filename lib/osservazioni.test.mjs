import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SOGLIE, MASSIMO_FRASI, numero, variazione, vistaLink, frasi } from './osservazioni.mjs';

const misure = (m = {}) => ({ visite: 0, iscritti: null, clic: 0, canali: [], query: [], pagine: [], ...m });
const ingresso = (m = {}) => ({
  giorni: 7, attuale: misure(), precedente: misure(),
  novita: { provenienze: [], campagne: [] }, indice: { entrate: [], uscite: [] }, ...m,
});
const testi = (i) => frasi(i).map((f) => f.testo);

test('numero: migliaia col punto, null come trattino', () => {
  assert.equal(numero(12345), '12.345');
  assert.equal(numero(7), '7');
  assert.equal(numero(null), '—');
  assert.equal(numero(2.5), '2,5');
});

test('variazione: niente sotto soglia, niente su un precedente a zero o mancante', () => {
  assert.equal(variazione(3, 1, SOGLIE.visite), null);
  assert.equal(variazione(60, 19, SOGLIE.visite), null);
  assert.equal(variazione(40, 0, 0), null);
  assert.equal(variazione(null, 30, SOGLIE.visite), null);
  assert.deepEqual(variazione(40, 20, SOGLIE.visite), { rapporto: 1, testo: '+100%' });
  assert.deepEqual(variazione(15, 20, 10), { rapporto: -0.25, testo: '−25%' });
  assert.deepEqual(variazione(20, 20, 10), { rapporto: 0, testo: '0%' });
});

test('vistaLink: scheda più filtri, codificati', () => {
  assert.equal(vistaLink('oggi'), '#oggi');
  assert.equal(vistaLink('marketing', { canale: 'Ricerca Google' }), '#marketing?canale=Ricerca+Google');
});

test('numeri piccoli: da 1 a 3 visite non è una notizia', () => {
  assert.deepEqual(testi(ingresso({ attuale: misure({ visite: 3 }), precedente: misure({ visite: 1 }) })), ['Settimana senza scossoni']);
});

test('una variazione vera si racconta, con i numeri', () => {
  const t = testi(ingresso({ attuale: misure({ visite: 40 }), precedente: misure({ visite: 20 }) }));
  assert.deepEqual(t, ['Le visite sono passate da 20 a 40 (+100%)']);
});

test('uno scarto sotto il 25% non è una notizia', () => {
  assert.deepEqual(testi(ingresso({ attuale: misure({ visite: 24 }), precedente: misure({ visite: 20 }) })), ['Settimana senza scossoni']);
});

test('iscritti a null (app in attesa): nessuna frase sugli iscritti, nessun errore', () => {
  assert.deepEqual(testi(ingresso({ attuale: misure({ iscritti: null }), precedente: misure({ iscritti: null }) })), ['Settimana senza scossoni']);
});

test('canali: la frase porta al canale filtrato', () => {
  const [f] = frasi(ingresso({
    attuale: misure({ canali: [{ famiglia: 'Social', pagineViste: 50 }] }),
    precedente: misure({ canali: [{ famiglia: 'Social', pagineViste: 25 }] }),
  }));
  assert.equal(f.testo, 'Le pagine viste da Social sono passate da 25 a 50 (+100%)');
  assert.equal(f.link, '#marketing?canale=Social');
});

test('novità: campagne nuove e al massimo due provenienze nuove', () => {
  const t = testi(ingresso({ novita: {
    provenienze: ['a.com', 'b.com', 'c.com'],
    campagne: [{ campagna: 'lancio', visite: 6 }, { campagna: 'prova', visite: 1 }],
  } }));
  assert.ok(t.includes('La campagna «lancio» ha portato le prime 6 visite'));
  assert.ok(t.includes('La campagna «prova» ha portato la prima visita'));
  assert.equal(t.filter((x) => x.startsWith('Prima visita da')).length, 2);
});

test('ricerca: nuova query fra le prime 10 e pagine che salgono o scendono di almeno 5 posizioni', () => {
  const t = testi(ingresso({
    attuale: misure({
      query: [{ chiave: 'forfettario 2027', impressioni: 30, posizione: 9 }],
      pagine: [{ chiave: '/guide/f24-e-dashboard', impressioni: 40, posizione: 9 }, { chiave: '/guide', impressioni: 40, posizione: 20 }],
    }),
    precedente: misure({
      query: [],
      pagine: [{ chiave: '/guide/f24-e-dashboard', impressioni: 25, posizione: 18 }, { chiave: '/guide', impressioni: 40, posizione: 12 }],
    }),
  }));
  assert.ok(t.includes('Nuova ricerca fra le prime 10: «forfettario 2027»'));
  assert.ok(t.includes('/guide/f24-e-dashboard è salita dalla posizione 18 alla 9 su Google'));
  assert.ok(t.includes('/guide è scesa dalla posizione 12 alla 20 su Google'));
});

test('ricerca: senza un periodo precedente non c\'è niente di «nuovo»', () => {
  const t = testi(ingresso({ precedente: null, attuale: misure({ query: [{ chiave: 'x', impressioni: 99, posizione: 3 }] }) }));
  assert.deepEqual(t, ['Settimana senza scossoni']);
});

test('indice: un\'uscita pesa più di un\'entrata, e al massimo cinque frasi', () => {
  const f = frasi(ingresso({
    indice: { entrate: ['/assistenza'], uscite: ['/privacy'] },
    novita: { provenienze: ['a.com', 'b.com'], campagne: [{ campagna: 'x', visite: 2 }, { campagna: 'y', visite: 2 }] },
  }));
  assert.equal(f.length, MASSIMO_FRASI);
  assert.equal(f[0].testo, '/privacy è uscita dall\'indice di Google');
  const entrata = f.findIndex((x) => x.testo === '/assistenza è entrata nell\'indice di Google');
  assert.ok(entrata > 0);
});

test('quiete: la parola dipende dalla durata del periodo', () => {
  assert.deepEqual(testi(ingresso({ giorni: 28 })), ['Periodo senza scossoni']);
});
