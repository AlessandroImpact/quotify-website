import { test } from 'node:test';
import assert from 'node:assert/strict';

import { eur, pct } from './formato.mjs';

test('gli importi hanno sempre il separatore delle migliaia', () => {
  // In italiano il raggruppamento CLDR parte da cinque cifre: senza forzarlo,
  // 5240,07 finirebbe incolonnato sotto 30.000,00 senza punto.
  assert.equal(eur(5240.07), '5.240,07 €');
  assert.equal(eur(30000), '30.000,00 €');
  assert.equal(eur(0), '0,00 €');
});

test('gli importi negativi restano leggibili', () => {
  assert.equal(eur(-4521.36), '-4.521,36 €');
});

test('le percentuali non mostrano decimali inutili', () => {
  assert.equal(pct(0.67), '67%');
  assert.equal(pct(0.2607), '26,07%');
  assert.equal(pct(0.2448), '24,48%');
});
