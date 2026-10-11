import { test } from 'node:test';
import assert from 'node:assert/strict';

import { leggiVista, scriviVista } from './vista.mjs';

const PREDEFINITA = { scheda: 'oggi', periodo: '28', confronto: true, canale: null, campagna: null };

test('hash vuoto o sconosciuto: la vista predefinita', () => {
  assert.deepEqual(leggiVista(''), PREDEFINITA);
  assert.deepEqual(leggiVista('#boh?periodo=mille&confronto=x'), PREDEFINITA);
});

test('legge scheda, periodo, confronto e filtri', () => {
  assert.deepEqual(leggiVista('#marketing?periodo=7&confronto=0&canale=Ricerca+Google&campagna=lancio%20ottobre'),
    { scheda: 'marketing', periodo: '7', confronto: false, canale: 'Ricerca Google', campagna: 'lancio ottobre' });
});

test('scrive solo quello che non è predefinito, e torna indietro uguale', () => {
  assert.equal(scriviVista(PREDEFINITA), '#oggi');
  const v = { scheda: 'imbuto', periodo: '90', confronto: false, canale: 'Social', campagna: null };
  assert.equal(scriviVista(v), '#imbuto?periodo=90&confronto=0&canale=Social');
  assert.deepEqual(leggiVista(scriviVista(v)), v);
});

test('i link delle frasi (#marketing?canale=…) si leggono', () => {
  assert.equal(leggiVista('#marketing?canale=Social').canale, 'Social');
});
