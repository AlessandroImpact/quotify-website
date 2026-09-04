import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { generaBlocchi, ESEMPIO } from './genera-calcolatore.mjs';
import { calcola, coefficientePerGruppo } from '../../lib/forfettario.mjs';

const P = JSON.parse(readFileSync('data/parametri-fiscali-2026.json', 'utf8'));

const scheletro = `<h2>Esempio</h2>
<!-- generato:esempio:inizio -->
<!-- generato:esempio:fine -->
<h2>Coefficienti</h2>
<!-- generato:ateco:inizio -->
<!-- generato:ateco:fine -->`;

test("l'esempio generato riporta i numeri che il modulo calcola davvero", () => {
  const atteso = calcola(
    { ...ESEMPIO, coefficiente: coefficientePerGruppo(ESEMPIO.gruppo, P) },
    P,
  );
  const html = generaBlocchi(scheletro, P);

  // Confronto sui VALORI, non sulle stringhe: la prima versione di questo test
  // formattava con la stessa funzione del generatore e quindi verificava sé
  // stesso — non si accorse che gli importi a quattro cifre uscivano senza
  // separatore delle migliaia.
  const numeri = [...html.matchAll(/([\d.]+,\d{2})&nbsp;€/g)]
    .map((m) => Number(m[1].replaceAll('.', '').replace(',', '.')));

  // Se l'esempio scritto nella pagina divergesse dal calcolo, la pagina
  // mentirebbe a chi non tocca i cursori — cioè a Google e alla maggior parte
  // dei visitatori.
  for (const [nome, valore] of Object.entries(atteso)) {
    if (typeof valore !== 'number') continue;
    assert.ok(numeri.includes(valore), `${nome} = ${valore} non compare nell'esempio generato`);
  }
});

test('la tabella generata contiene tutti e nove i gruppi di legge', () => {
  const html = generaBlocchi(scheletro, P);

  assert.equal(P.coefficienti.gruppi.length, 9);
  for (const g of P.coefficienti.gruppi) {
    assert.ok(html.includes(g.descrizione), `manca il gruppo ${g.id}`);
  }
});

test('la tabella cita la fonte dei coefficienti', () => {
  const html = generaBlocchi(scheletro, P);
  assert.ok(html.includes(P.coefficienti.url), 'manca il link alla fonte');
});

test('rigenerare due volte dà lo stesso risultato', () => {
  const una = generaBlocchi(scheletro, P);
  assert.equal(generaBlocchi(una, P), una);
});

test('un marcatore mancante ferma la generazione invece di produrre metà pagina', () => {
  assert.throws(
    () => generaBlocchi('<p>niente marcatori</p>', P),
    /generato:esempio/,
  );
});

test('le cifre in euro sono formattate in modo coerente fra loro', () => {
  // Il test precedente confrontava l'output con la STESSA funzione che lo
  // produce: verificava sé stesso. Questo asserisce una proprietà indipendente —
  // in una colonna di importi allineati, o hanno tutti il separatore delle
  // migliaia o non ce l'ha nessuno. "30.000,00" sopra "5240,07" si legge male.
  const html = generaBlocchi(scheletro, P);
  const blocco = html.slice(
    html.indexOf('generato:esempio:inizio'),
    html.indexOf('generato:esempio:fine'),
  );

  const importi = [...blocco.matchAll(/([\d.]+,\d{2})&nbsp;€/g)].map((m) => m[1]);
  assert.ok(importi.length >= 5, 'nessun importo trovato nel blocco');

  for (const importo of importi) {
    const intero = importo.split(',')[0].replaceAll('.', '');
    if (Number(intero) >= 1000) {
      assert.ok(importo.includes('.'), `${importo} è ≥ 1000 ma non ha il separatore delle migliaia`);
    }
  }
});
