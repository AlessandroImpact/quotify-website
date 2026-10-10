import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onRequest } from '../functions/_middleware.js';
import { apriInMemoria } from './d1-in-memoria.mjs';

const BROWSER = 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';

// Un contesto di Pages Functions finto: la pagina «servita» è una risposta
// fissa, e le promesse passate a waitUntil si raccolgono per aspettarle.
function contesto(indirizzo, { env = { DB: apriInMemoria() }, intestazioni = {}, metodo = 'GET', cf = { country: 'IT' }, stato = 200 } = {}) {
  const promesse = [];
  const request = new Request(indirizzo, { method: metodo, headers: { 'User-Agent': BROWSER, 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', ...intestazioni } });
  Object.defineProperty(request, 'cf', { value: cf });
  return {
    ctx: {
      request, env,
      next: async () => new Response('<html>pagina</html>', { status: stato, headers: { 'Content-Type': 'text/html' } }),
      waitUntil: (p) => promesse.push(p),
    },
    attendi: () => Promise.all(promesse),
    env,
  };
}

test('una visita con UTM si registra, e la pagina arriva intatta', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/?utm_source=linkedin&utm_campaign=lancio');
  const r = await onRequest(ctx);
  await attendi();
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '<html>pagina</html>');
  const righe = env.DB.tutte('SELECT sorgente, campagna, paese, percorso FROM visite');
  assert.deepEqual(righe, [{ sorgente: 'linkedin', campagna: 'lancio', paese: 'IT', percorso: '/' }]);
});

test('una visita diretta non si registra', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/');
  await onRequest(ctx);
  await attendi();
  assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});

test('le risorse statiche e le API non si registrano nemmeno con gli UTM', async () => {
  for (const p of ['/style.css?utm_source=x', '/api/metriche?utm_source=x']) {
    const { ctx, attendi, env } = contesto(`https://quotify.it${p}`);
    await onRequest(ctx);
    await attendi();
    assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0, p);
  }
});

test('una pagina che risponde errore non si registra: nessuno è atterrato davvero', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/inesistente?utm_source=x', { stato: 404 });
  const r = await onRequest(ctx);
  await attendi();
  assert.equal(r.status, 404);
  assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});

// --- La regola non negoziabile del §6.4
test('senza il collegamento DB la pagina arriva lo stesso, in silenzio', async () => {
  const { ctx } = contesto('https://quotify.it/?utm_source=x', { env: {} });
  const r = await onRequest(ctx);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '<html>pagina</html>');
});

test('se il database esplode la pagina arriva lo stesso', async () => {
  const rotto = { prepare: () => { throw new Error('D1 giù'); } };
  const { ctx, attendi } = contesto('https://quotify.it/?utm_source=x', { env: { DB: rotto } });
  const r = await onRequest(ctx);
  await attendi();
  assert.equal(r.status, 200);
});

test('se la scrittura fallisce in modo asincrono, waitUntil non riceve una promessa rifiutata', async () => {
  const lento = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error('D1 in ritardo'); } }) }) };
  const { ctx, attendi } = contesto('https://quotify.it/?utm_source=x', { env: { DB: lento } });
  await onRequest(ctx);
  await assert.doesNotReject(attendi());
});

test('senza request.cf (sviluppo locale) il paese è null e non si rompe niente', async () => {
  // null e non undefined: undefined farebbe scattare il valore predefinito di contesto().
  const { ctx, attendi, env } = contesto('https://quotify.it/?utm_source=x', { cf: null });
  await onRequest(ctx);
  await attendi();
  assert.equal(env.DB.tutte('SELECT paese FROM visite')[0].paese, null);
});

test('un bot verificato da Cloudflare non si registra', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/?utm_source=x', { cf: { country: 'US', verifiedBotCategory: 'Search Engine Crawler' } });
  await onRequest(ctx);
  await attendi();
  assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});

test('una richiesta che il browser non dichiara come navigazione non si registra', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/?utm_source=x', { intestazioni: { 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Dest': 'empty' } });
  await onRequest(ctx);
  await attendi();
  assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});
