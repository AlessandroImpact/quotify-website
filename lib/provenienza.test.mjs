import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

// public/provenienza.js è uno script classico (Vite lo serve com'è): lo si
// esegue in un contesto isolato e se ne prende la funzione.
const FILE = new URL('../public/provenienza.js', import.meta.url);
function carica() {
  assert.ok(existsSync(FILE), 'public/provenienza.js non esiste');
  const ctx = vm.createContext({ URL });
  vm.runInContext(readFileSync(FILE, 'utf8'), ctx);
  return ctx.conProvenienza;
}

const INTERNO = 'https://app.quotify.it/register?utm_source=sito&utm_medium=guida&utm_campaign=clienti';

test('i link che non vanno all\'iscrizione restano come sono', () => {
  const conProvenienza = carica();
  assert.equal(conProvenienza('https://app.quotify.it/', 'https://quotify.it/?utm_source=x', 'https://www.google.com/'), 'https://app.quotify.it/');
  assert.equal(conProvenienza('/guide', 'https://quotify.it/', ''), '/guide');
  assert.equal(conProvenienza('https://example.com/register', 'https://quotify.it/', ''), 'https://example.com/register');
});

test('senza UTM del visitatore restano quelli interni, e il referrer esterno si aggiunge', () => {
  const conProvenienza = carica();
  assert.equal(conProvenienza(INTERNO, 'https://quotify.it/guide/clienti', 'https://www.google.com/'), `${INTERNO}&rif=www.google.com`);
});

test('gli UTM del visitatore sostituiscono tutti quelli interni, puliti', () => {
  const conProvenienza = carica();
  assert.equal(
    conProvenienza(INTERNO, 'https://quotify.it/guide/clienti?utm_source=LinkedIn&utm_campaign=Lancio%20Ottobre', 'https://www.linkedin.com/'),
    'https://app.quotify.it/register?utm_source=linkedin&utm_campaign=lancio+ottobre&rif=www.linkedin.com');
});

test('un referrer interno, o nessun referrer, non aggiunge niente', () => {
  const conProvenienza = carica();
  for (const ref of ['', 'https://quotify.it/guide', 'https://www.quotify.it/', 'https://app.quotify.it/login', 'non-un-indirizzo']) {
    assert.equal(conProvenienza(INTERNO, 'https://quotify.it/guide/clienti', ref), INTERNO);
  }
});

test('eseguito due volte dà lo stesso link: nessun parametro doppio', () => {
  const conProvenienza = carica();
  const pagina = 'https://quotify.it/?utm_source=newsletter&utm_medium=email';
  const una = conProvenienza(INTERNO, pagina, 'https://mail.google.com/');
  assert.equal(conProvenienza(una, pagina, 'https://mail.google.com/'), una);
  assert.equal(new URL(una).searchParams.getAll('rif').length, 1);
});

test('valori ostili: caratteri di controllo tolti, 200 caratteri al massimo; un UTM vuoto non conta', () => {
  const conProvenienza = carica();
  const lungo = 'a'.repeat(300);
  const u = new URL(conProvenienza(INTERNO, `https://quotify.it/?utm_source=%0Aspam%00&utm_campaign=${lungo}`, ''));
  assert.equal(u.searchParams.get('utm_source'), 'spam');
  assert.equal(u.searchParams.get('utm_campaign').length, 200);
  assert.equal(conProvenienza(INTERNO, 'https://quotify.it/?utm_source=', ''), INTERNO);
});
