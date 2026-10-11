import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compitiDellOra, silenzioso, settimanaIso, avvisiEventi, avvisiGiornalieri, avvisiSettimanali, CRUSCOTTO } from './avvisi.mjs';

const chiavi = (l) => l.map((a) => a.chiave);

test('compitiDellOra: gli eventi ogni ora tranne le 05 e il lunedì alle 06, il giornaliero alle 07, il settimanale il lunedì alle 07', () => {
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-13T05:00:00Z')), { eventi: false, giornaliero: false, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-12T06:00:00Z')), { eventi: false, giornaliero: false, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-13T06:00:00Z')), { eventi: true, giornaliero: false, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-13T03:00:00Z')), { eventi: true, giornaliero: false, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-13T07:00:00Z')), { eventi: true, giornaliero: true, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-12T07:00:00Z')), { eventi: true, giornaliero: true, settimanale: true });
});

test('silenzioso: dalle 22 alle 8 ora di Roma, ora legale inclusa', () => {
  assert.equal(silenzioso(Date.parse('2026-10-11T21:30:00Z')), true);  // 23:30 CEST
  assert.equal(silenzioso(Date.parse('2026-10-12T06:30:00Z')), false); // 08:30 CEST
  assert.equal(silenzioso(Date.parse('2026-12-01T06:30:00Z')), true);  // 07:30 CET
  assert.equal(silenzioso(Date.parse('2026-12-01T21:00:00Z')), true);  // 22:00 CET
  assert.equal(silenzioso(Date.parse('2026-12-01T20:59:00Z')), false); // 21:59 CET
});

test('settimanaIso: anche a cavallo d\'anno', () => {
  assert.equal(settimanaIso('2026-10-12'), '2026-W42');
  assert.equal(settimanaIso('2026-01-01'), '2026-W01');
  assert.equal(settimanaIso('2026-12-28'), '2026-W53');
  assert.equal(settimanaIso('2027-01-01'), '2026-W53');
  assert.equal(settimanaIso('2025-12-29'), '2026-W01');
});

test('avvisiEventi: paganti sempre, iscritti solo con un canale noto', () => {
  const a = avvisiEventi([
    { id: 'h1', tipo: 'pagante', quando: 'x', sorgente: 'linkedin', campagna: 'lancio', rif: null },
    { id: 'h2', tipo: 'pagante', quando: 'x', sorgente: null, campagna: null, rif: null },
    { id: 'h3', tipo: 'iscritto', quando: 'x', sorgente: null, campagna: null, rif: null },
    { id: 'h4', tipo: 'iscritto', quando: 'x', sorgente: 'sito', campagna: 'clienti', rif: 'www.google.com' },
  ]);
  assert.deepEqual(a.map((x) => [x.chiave, x.testo]), [
    ['pagante:h1', '💶 Nuovo pagante, da Social (campagna lancio)'],
    ['pagante:h2', '💶 Nuovo pagante'],
    ['primo-iscritto:Ricerca Google:', '🌱 Primo iscritto da Ricerca Google'],
  ]);
  assert.equal(a[0].link, `${CRUSCOTTO}#imbuto`);
});

const giorni = (valori, ultimo = '2026-10-11') => valori.map((visite, i) => ({
  giorno: new Date(Date.parse(`${ultimo}T00:00:00Z`) - (valori.length - 1 - i) * 864e5).toISOString().slice(0, 10),
  visite,
  fonti: { cloudflare: 'ok', google: 'ok' },
}));

test('zero visite ieri: avviso solo se la settimana prima ne aveva almeno 10 al giorno', () => {
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([12, 12, 12, 12, 12, 12, 12, 0]), ieri: '2026-10-11' })), ['zero:2026-10-11']);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([5, 5, 5, 5, 5, 5, 5, 0]), ieri: '2026-10-11' })), []);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([30, 30, 0]), ieri: '2026-10-11' })), []); // storia troppo corta
});

test('picco: tre volte la mediana di 28 giorni e almeno 30 visite', () => {
  const base = Array(28).fill(8);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([...base, 30]), ieri: '2026-10-11' })), ['picco:2026-10-11']);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([...base, 29]), ieri: '2026-10-11' })), []);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([...Array(28).fill(1), 20]), ieri: '2026-10-11' })), []);
});

test('archivio fermo: una fonte in errore due notti di fila, o Cloudflare che non ha scritto ieri', () => {
  const s = giorni([10, 10]);
  s[0].fonti.google = 'errore';
  s[1].fonti.google = 'errore';
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: s, ieri: '2026-10-11' })), ['fermo:google:2026-10-11']);
  const t = giorni([10, 10]);
  t[1].fonti.google = 'errore';
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: t, ieri: '2026-10-11' })), []);
  const u = giorni([10]);
  u[0].fonti = { google: 'ok' };
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: u, ieri: '2026-10-11' })), ['fermo:cloudflare:2026-10-11']);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: [], ieri: '2026-10-11' })), ['fermo:cloudflare:2026-10-11']);
});

test('settimanale: uscite dall\'indice e il riassunto con le frasi', () => {
  const a = avvisiSettimanali({
    indice: { uscite: ['/privacy'] },
    frasi: [{ testo: 'Le visite sono passate da 20 a 40 (+100%)' }, { testo: 'Prima visita da reddit.com' }],
    settimanaUscite: '2026-W42', settimanaRiassunto: '2026-W41',
  });
  assert.deepEqual(chiavi(a), ['indice-uscita:/privacy:2026-W42', 'riassunto:2026-W41']);
  assert.equal(a[1].testo, '🗓️ La settimana su quotify.it\n• Le visite sono passate da 20 a 40 (+100%)\n• Prima visita da reddit.com');
  assert.equal(a[1].link, `${CRUSCOTTO}#oggi?periodo=7`);
});
