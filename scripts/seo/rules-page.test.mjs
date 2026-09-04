import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';

import { controllaPagina } from './rules-page.mjs';

// Una pagina di contenuto ben formata. Ogni test ne rompe un pezzo solo, e si
// filtrano le regole di misurazione: le altre (title, alt, link…) hanno già i
// loro collaudi e qui farebbero solo rumore.
const MISURAZIONE = new Set([
  'query-obiettivo-mancante',
  'verifica-fiscale-mancante',
  'date-contenuto-mancanti',
  'query-obiettivo-incoerente',
]);

function pagina(meta = {}, file = 'guida-qualcosa.html') {
  const predefiniti = {
    'quotify:query-obiettivo': 'calcolo tasse forfettario',
    'quotify:pubblicato': '2026-09-04',
    'quotify:revisionato': '2026-09-04',
    'quotify:verifica-fiscale': 'verificata',
  };
  const tutti = { ...predefiniti, ...meta };
  const tag = Object.entries(tutti)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `<meta name="${k}" content="${v}" />`)
    .join('\n');

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<title>Calcolo tasse forfettario 2026 — quanto resta davvero</title>
<meta name="description" content="Una descrizione lunga il giusto per non far scattare la regola sulla lunghezza minima, che qui non interessa a nessuno." />
<link rel="canonical" href="https://quotify.it/x" />
${tag}</head><body><h1>Calcolo tasse forfettario</h1></body></html>`;

  return { file, url: '/x', html, root: parse(html, { comment: false }) };
}

const regole = (pag) =>
  controllaPagina(pag, { linkInterni: [], immaginiSocial: [] })
    .filter((f) => MISURAZIONE.has(f.rule))
    .map((f) => f.rule);

test('una pagina di contenuto ben dichiarata non ha rilievi di misurazione', () => {
  assert.deepEqual(regole(pagina()), []);
});

test('una pagina di contenuto senza query obiettivo non si pubblica', () => {
  assert.deepEqual(regole(pagina({ 'quotify:query-obiettivo': null })), ['query-obiettivo-mancante']);
});

test('un contenuto fiscale non ancora verificato non si pubblica', () => {
  assert.deepEqual(
    regole(pagina({ 'quotify:verifica-fiscale': 'da-verificare' })),
    ['verifica-fiscale-mancante'],
  );
});

test('senza data di pubblicazione non si potrà mai dire "da quando"', () => {
  // È la chiave del join con Search Console (Fase 5 del piano console): senza,
  // "questa pagina si posiziona da quando?" resta senza risposta per sempre.
  assert.deepEqual(regole(pagina({ 'quotify:pubblicato': null })), ['date-contenuto-mancanti']);
  assert.deepEqual(regole(pagina({ 'quotify:pubblicato': '4 settembre' })), ['date-contenuto-mancanti']);
});

test('una query obiettivo che non compare nel titolo è un avviso, non un blocco', () => {
  const f = controllaPagina(pagina({ 'quotify:query-obiettivo': 'fattura elettronica forfettario' }),
    { linkInterni: [], immaginiSocial: [] });
  const incoerente = f.find((x) => x.rule === 'query-obiettivo-incoerente');

  assert.ok(incoerente, 'la regola non è scattata');
  assert.equal(incoerente.level, 'warn');
});

test('le pagine di servizio non devono dichiarare niente', () => {
  // Privacy, cookie e termini non sono contenuto scritto per posizionarsi:
  // chiedergli una query obiettivo sarebbe un falso positivo, e i falsi
  // positivi sono ciò che fa spegnere i gate.
  for (const file of ['index.html', 'privacy.html', 'cookie.html', 'termini.html', 'assistenza.html', '404.html']) {
    const nuda = pagina(
      { 'quotify:query-obiettivo': null, 'quotify:pubblicato': null,
        'quotify:revisionato': null, 'quotify:verifica-fiscale': null },
      file,
    );
    assert.deepEqual(regole(nuda), [], `${file} non dovrebbe avere rilievi`);
  }
});
