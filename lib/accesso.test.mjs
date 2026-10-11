import { test } from 'node:test';
import assert from 'node:assert/strict';

import { verificatore, AccessoNegato } from './accesso.mjs';

const TEAM = 'quotify';
const AUD = 'aud-cruscotto';
const EMAIL = 'terracciano41@gmail.com';
const ISS = `https://${TEAM}.cloudflareaccess.com`;
const ADESSO = Date.parse('2026-10-12T08:00:00Z');
const ORA = Math.floor(ADESSO / 1000);

const b64url = (b) => Buffer.from(b).toString('base64url');

async function coppia(kid) {
  const k = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', k.publicKey)), kid, alg: 'RS256', use: 'sig' };
  return { privata: k.privateKey, jwk };
}

async function firma(privata, corpo, { kid = 'k1', alg = 'RS256' } = {}) {
  const testa = b64url(JSON.stringify({ alg, kid, typ: 'JWT' }));
  const dati = b64url(JSON.stringify(corpo));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privata, new TextEncoder().encode(`${testa}.${dati}`));
  return `${testa}.${dati}.${b64url(sig)}`;
}

const corpoValido = (extra = {}) => ({ aud: [AUD], email: EMAIL, iss: ISS, exp: ORA + 600, iat: ORA - 10, ...extra });

async function ambiente() {
  const buona = await coppia('k1');
  const chiamate = [];
  const f = async (url) => { chiamate.push(url); return Response.json({ keys: [buona.jwk] }); };
  let ora = ADESSO;
  const v = verificatore({ team: TEAM, aud: AUD, email: EMAIL, fetch: f, adesso: () => ora });
  return { buona, chiamate, v, avanza: (ms) => { ora += ms; } };
}

test('un token giusto passa e restituisce l\'email', async () => {
  const { buona, v, chiamate } = await ambiente();
  assert.deepEqual(await v.verifica(await firma(buona.privata, corpoValido())), { email: EMAIL });
  assert.deepEqual(chiamate, [`${ISS}/cdn-cgi/access/certs`]);
});

test('l\'email si confronta senza badare a maiuscole e spazi', async () => {
  const { buona, v } = await ambiente();
  await v.verifica(await firma(buona.privata, corpoValido({ email: ' Terracciano41@Gmail.com ' })));
});

for (const [nome, corpo] of [
  ['scaduto', corpoValido({ exp: ORA - 1 })],
  ['senza scadenza', corpoValido({ exp: undefined })],
  ['non ancora valido', corpoValido({ nbf: ORA + 3600 })],
  ['aud di un\'altra applicazione', corpoValido({ aud: ['altra'] })],
  ['emittente di un altro team', corpoValido({ iss: 'https://altro.cloudflareaccess.com' })],
  ['email di un altro', corpoValido({ email: 'qualcuno@example.com' })],
  ['senza email', corpoValido({ email: undefined })],
]) {
  test(`rifiuta un token ${nome}`, async () => {
    const { buona, v } = await ambiente();
    await assert.rejects(v.verifica(await firma(buona.privata, corpo)), AccessoNegato);
  });
}

test('rifiuta un token firmato con un\'altra chiave che dichiara lo stesso kid', async () => {
  const { v } = await ambiente();
  const falsa = await coppia('k1');
  await assert.rejects(v.verifica(await firma(falsa.privata, corpoValido())), AccessoNegato);
});

test('rifiuta alg diverso da RS256, token assente e spazzatura', async () => {
  const { buona, v } = await ambiente();
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido(), { alg: 'none' })), AccessoNegato);
  await assert.rejects(v.verifica(null), AccessoNegato);
  await assert.rejects(v.verifica(''), AccessoNegato);
  await assert.rejects(v.verifica('a.b'), AccessoNegato);
  await assert.rejects(v.verifica('!!!.???.***'), AccessoNegato);
});

test('configurazione incompleta: nessuno passa, nemmeno con un token giusto', async () => {
  const buona = await coppia('k1');
  const f = async () => Response.json({ keys: [buona.jwk] });
  for (const conf of [{ team: '', aud: AUD, email: EMAIL }, { team: TEAM, aud: '', email: EMAIL }, { team: TEAM, aud: AUD, email: '' }]) {
    const v = verificatore({ ...conf, fetch: f, adesso: () => ADESSO });
    await assert.rejects(v.verifica(await firma(buona.privata, corpoValido())), AccessoNegato);
  }
});

test('i certificati si tengono in memoria; un kid sconosciuto li fa richiedere al più una volta al minuto', async () => {
  const { buona, v, chiamate, avanza } = await ambiente();
  await v.verifica(await firma(buona.privata, corpoValido()));
  await v.verifica(await firma(buona.privata, corpoValido()));
  assert.equal(chiamate.length, 1);
  // Appena caricati: un kid sconosciuto non li fa richiedere.
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido(), { kid: 'ignoto' })), AccessoNegato);
  assert.equal(chiamate.length, 1);
  // Passato un minuto sì, una volta; subito dopo di nuovo no.
  avanza(61_000);
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido(), { kid: 'ignoto' })), AccessoNegato);
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido(), { kid: 'ignoto' })), AccessoNegato);
  assert.equal(chiamate.length, 2);
});

test('certificati irraggiungibili: rifiuta, non lascia passare', async () => {
  const buona = await coppia('k1');
  const v = verificatore({ team: TEAM, aud: AUD, email: EMAIL, fetch: async () => new Response('', { status: 502 }), adesso: () => ADESSO });
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido())), AccessoNegato);
});
