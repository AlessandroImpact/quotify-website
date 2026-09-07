import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { classifica, PROSSIMA, PASSATA, FUTURA } from './scadenze.mjs';

const S = [
  { id: 'a', data: '2026-05-18' },
  { id: 'b', data: '2026-07-20' },
  { id: 'c', data: '2026-11-16' },
  { id: 'd', data: '2026-11-30' },
];
const stati = (oggi) => classifica(S, new Date(oggi)).map((s) => `${s.id}:${s.stato}`);

test('le scadenze già passate sono marcate come tali', () => {
  assert.deepEqual(stati('2026-09-07T12:00:00Z'),
    [`a:${PASSATA}`, `b:${PASSATA}`, `c:${PROSSIMA}`, `d:${FUTURA}`]);
});

test('una sola scadenza è "la prossima": è quella che serve mettere in evidenza', () => {
  const p = classifica(S, new Date('2026-01-01T12:00:00Z')).filter((s) => s.stato === PROSSIMA);
  assert.equal(p.length, 1);
  assert.equal(p[0].id, 'a');
});

test('nel giorno della scadenza si è ancora in tempo, non in ritardo', () => {
  // Chi apre la pagina la mattina del 20 luglio deve leggere "oggi", non
  // "passata": ha ancora tutta la giornata per versare.
  const s = classifica(S, new Date('2026-07-20T09:00:00Z')).find((x) => x.id === 'b');
  assert.equal(s.stato, PROSSIMA);
  assert.equal(s.giorni, 0);
});

test('i giorni mancanti si contano dal giorno, non dall’ora', () => {
  // A qualunque ora del 7 settembre, il 16 novembre dista 70 giorni.
  for (const ora of ['00:30', '12:00', '23:45']) {
    const s = classifica(S, new Date(`2026-09-07T${ora}:00Z`)).find((x) => x.id === 'c');
    assert.equal(s.giorni, 70, `alle ${ora}`);
  }
});

test('quando l’anno è finito non c’è più una prossima scadenza', () => {
  const c = classifica(S, new Date('2027-03-01T12:00:00Z'));
  assert.ok(c.every((s) => s.stato === PASSATA));
});

test('nessuna scadenza del file vero cade di sabato o domenica', () => {
  // Le scadenze slittano al primo giorno lavorativo: se una cade nel weekend,
  // la data è sbagliata. È l’unico errore di date che si può controllare da soli.
  const vere = JSON.parse(readFileSync('data/scadenze-2026.json', 'utf8')).scadenze;
  for (const s of vere) {
    const g = new Date(`${s.data}T12:00:00Z`).getUTCDay();
    assert.ok(g >= 1 && g <= 5, `${s.id} (${s.data}) cade nel fine settimana`);
  }
});
