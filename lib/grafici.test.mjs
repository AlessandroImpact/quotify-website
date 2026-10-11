import { test } from 'node:test';
import assert from 'node:assert/strict';

import { esc, linea, minilinea, imbuto } from './grafici.mjs';

const pulito = (svg) => assert.ok(!/NaN|Infinity|undefined/.test(svg), `uscita sporca: ${svg.slice(0, 200)}`);
const p = (...ys) => ys.map((y, i) => ({ x: `g${i}`, y }));

test('esc: niente markup dai dati', () => {
  assert.equal(esc('<script>"a"&\'b\''), '&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;');
});

test('linea vuota o tutta null: un riquadro che lo dice, niente tracciato', () => {
  for (const punti of [[], p(null, null)]) {
    const svg = linea({ punti, titolo: 'Visite' });
    assert.match(svg, /Nessun dato/);
    assert.doesNotMatch(svg, /<path/);
    pulito(svg);
  }
});

test('linea con un punto solo: un cerchio, non un tracciato degenere', () => {
  const svg = linea({ punti: p(5), titolo: 'Visite' });
  assert.match(svg, /<circle/);
  pulito(svg);
});

test('linea: i null spezzano il tracciato in segmenti', () => {
  const svg = linea({ punti: p(1, 2, null, 3, 4), titolo: 'Visite' });
  const d = svg.match(/class="g-linea" d="([^"]*)"/)[1];
  assert.equal((d.match(/M/g) ?? []).length, 2);
  pulito(svg);
});

test('linea: tutti zero non divide per zero', () => {
  pulito(linea({ punti: p(0, 0, 0), titolo: 'Visite' }));
});

test('linea: una zona per punto, con valore e confronto leggibili', () => {
  const svg = linea({ punti: p(1, null), confronto: p(3, 4), titolo: 'Visite', formato: (v) => `${v} v` });
  const zone = [...svg.matchAll(/<rect class="g-zona"[^>]*>/g)].map((m) => m[0]);
  assert.equal(zone.length, 2);
  assert.match(zone[0], /data-valore="1 v"/);
  assert.match(zone[0], /data-confronto="3 v"/);
  assert.match(zone[1], /data-valore="—"/);
  assert.match(svg, /class="g-confronto"/);
});

test('linea: etichette e titolo escapati', () => {
  const svg = linea({ punti: [{ x: '<b>', y: 1 }], titolo: '"x"' });
  assert.ok(!svg.includes('<b>'));
  assert.ok(svg.includes('&lt;b&gt;'));
});

test('minilinea: vuota, tutta null, un valore: sempre pulita', () => {
  for (const v of [[], [null, null], [3], [0, 0], [1, null, 2]]) pulito(minilinea(v));
});

test('imbuto: larghezze in proporzione al primo gradino, passaggi in percentuale', () => {
  const svg = imbuto([{ nome: 'Visite', valore: 100 }, { nome: 'Iscrizioni', valore: 10 }, { nome: 'Pagante', valore: 0 }]);
  assert.match(svg, />10%</);
  assert.match(svg, />0%</);
  pulito(svg);
});

test('imbuto: gradini a zero o null non rompono niente', () => {
  for (const g of [[], [{ nome: 'Visite', valore: 0 }, { nome: 'Iscrizioni', valore: 0 }], [{ nome: 'Visite', valore: null }, { nome: 'Iscrizioni', valore: 3 }]]) {
    pulito(imbuto(g));
  }
  assert.match(imbuto([{ nome: 'Visite', valore: null }, { nome: 'Iscrizioni', valore: 3 }]), />—</);
});
