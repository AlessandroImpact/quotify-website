import { test } from 'node:test';
import assert from 'node:assert/strict';

import { proteggiEmail, emailScoperte } from './email.mjs';

const pagina = `<!DOCTYPE html>
<html lang="it"><head><script type="application/ld+json">{"email":"info@quotify.it"}</script></head>
<body><a href="mailto:info@quotify.it">info@quotify.it</a></body></html>
`;

test('un indirizzo fuori dalla zona protetta è scoperto, anche nel JSON-LD', () => {
  assert.equal(emailScoperte(pagina), 3);
});

test('dopo la protezione nessun indirizzo resta scoperto', () => {
  assert.equal(emailScoperte(proteggiEmail(pagina)), 0);
});

test('la protezione avvolge tutto il documento, doctype escluso', () => {
  const out = proteggiEmail(pagina);
  assert.match(out, /^<!DOCTYPE html>\n<!--email_off-->\n<html/);
  assert.match(out, /<\/html>\n<!--\/email_off-->\n$/);
});

test('proteggere due volte dà lo stesso risultato', () => {
  const una = proteggiEmail(pagina);
  assert.equal(proteggiEmail(una), una);
});

test('una pagina senza indirizzi resta com’è', () => {
  const senza = '<!DOCTYPE html>\n<html><body>niente</body></html>\n';
  assert.equal(proteggiEmail(senza), senza);
});
