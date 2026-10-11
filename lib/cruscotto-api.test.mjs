import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apriInMemoria } from './d1-in-memoria.mjs';
import { rispondi, CACHE_OK_S, CACHE_ERRORE_S } from './cruscotto-api.mjs';
import { URL_RIASSUNTO } from './riassunto.mjs';
import { GRAPHQL } from './cloudflare.mjs';

const ADESSO = Date.parse('2026-10-12T08:10:00Z');
const passa = async () => ({ email: 'terracciano41@gmail.com' });
const rifiuta = async () => { throw new Error('no'); };

function dbConDati() {
  const db = apriInMemoria();
  db.tutte(`INSERT INTO storico (giorno, preso_il, visite, pagine_viste, dati) VALUES
    ('2026-09-13', 'x', 1, 1, '{}'), ('2026-10-10', 'x', 4, 6, '{"cloudflare":{"provenienze":[{"chiave":"www.linkedin.com","viste":2}]}}') RETURNING giorno`);
  return db;
}

// Rete finta: Cloudflare risponde le ore, l'app risponde come le si dice.
function rete({ cloudflare = 200, app = 404 } = {}) {
  const chiamate = [];
  const f = async (url, o) => {
    chiamate.push(String(url));
    if (String(url) === GRAPHQL) {
      if (cloudflare !== 200) return new Response('guasto', { status: cloudflare });
      return Response.json({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [
        { count: 2, sum: { visits: 1 }, dimensions: { datetimeHour: '2026-10-11T21:00:00Z' } },
        { count: 5, sum: { visits: 3 }, dimensions: { datetimeHour: '2026-10-12T07:00:00Z' } },
      ] }] } } });
    }
    if (String(url).startsWith(URL_RIASSUNTO)) return new Response('', { status: app });
    throw new Error(`rete finta: ${url}`);
  };
  return { f, chiamate };
}

function cacheFinta() {
  const m = new Map();
  return {
    m,
    match: async (r) => m.get(r.url)?.clone(),
    put: async (r, risposta) => { m.set(r.url, risposta); },
  };
}

const ENV = (db) => ({ DB: db, CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'a', RIASSUNTO_CHIAVE: 'k' });
const richiesta = (q = 'periodo=7') => new Request(`https://quotify.it/api/cruscotto?${q}`);

test('senza un token Access valido: 403, nessuna lettura, niente cache', async () => {
  const db = new Proxy({}, { get: () => { throw new Error('il database non andava toccato'); } });
  const r = await rispondi({ request: richiesta(), env: ENV(db), adesso: ADESSO, fetch: rete().f, verifica: rifiuta });
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await r.json(), { errore: 'Non autorizzato.' });
});

test('senza database (anteprima): 503 con le fonti in errore', async () => {
  const r = await rispondi({ request: richiesta(), env: { ...ENV(null), DB: undefined }, adesso: ADESSO, fetch: rete().f, verifica: passa });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).fonti.archivio, 'errore');
});

test('giorno normale con l\'app che non ha ancora l\'endpoint: 200, app «in attesa», oggi diviso per giorno', async () => {
  const r = await rispondi({ request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, verifica: passa });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  const d = await r.json();
  assert.deepEqual(d.fonti, { archivio: 'ok', cloudflare: 'ok', app: 'in-attesa' });
  assert.deepEqual(d.periodo, { nome: '7', da: '2026-10-05', a: '2026-10-11', giorni: 7 });
  assert.equal(d.totali.visite, 4);
  assert.deepEqual(d.oggi.perOra, [{ ora: '2026-10-12T07:00:00Z', visite: 3, pagineViste: 5 }]);
  assert.deepEqual(d.oggi.ieriPerOra, [{ ora: '2026-10-11T21:00:00Z', visite: 1, pagineViste: 2 }]);
  assert.equal(d.precedente, null);
});

test('confronto=1: periodo precedente e serie precedente della stessa lunghezza', async () => {
  const d = await (await rispondi({ request: richiesta('periodo=7&confronto=1'), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, verifica: passa })).json();
  assert.deepEqual(d.precedente, { da: '2026-09-28', a: '2026-10-04' });
  assert.equal(d.seriePrecedente.length, 7);
});

test('Cloudflare giù: oggi è null, il resto risponde', async () => {
  const d = await (await rispondi({ request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete({ cloudflare: 502 }).f, verifica: passa })).json();
  assert.equal(d.fonti.cloudflare, 'errore');
  assert.equal(d.oggi, null);
  assert.equal(d.totali.visite, 4);
});

test('Cloudflare non configurato: errore senza nemmeno provarci', async () => {
  const { f, chiamate } = rete();
  const d = await (await rispondi({ request: richiesta(), env: { ...ENV(dbConDati()), CF_ANALYTICS_TOKEN: '' }, adesso: ADESSO, fetch: f, verifica: passa })).json();
  assert.equal(d.fonti.cloudflare, 'errore');
  assert.ok(!chiamate.includes(GRAPHQL));
});

test('cache: la seconda richiesta non rifà le chiamate; durata breve se qualcosa è in errore', async () => {
  const cache = cacheFinta();
  const sospesi = [];
  const { f, chiamate } = rete({ cloudflare: 502 });
  const argomenti = { request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: f, cache, waitUntil: (p) => sospesi.push(p), verifica: passa };
  await rispondi(argomenti);
  await Promise.all(sospesi);
  const prima = chiamate.length;
  const r = await rispondi({ ...argomenti, request: richiesta() });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal(chiamate.length, prima);
  const [salvata] = cache.m.values();
  assert.equal(salvata.headers.get('Cache-Control'), `max-age=${CACHE_ERRORE_S}`);
});

test('cache: con Cloudflare a posto e l\'app solo «in attesa» si tiene cinque minuti', async () => {
  const cache = cacheFinta();
  const sospesi = [];
  await rispondi({ request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, cache, waitUntil: (p) => sospesi.push(p), verifica: passa });
  await Promise.all(sospesi);
  const [salvata] = cache.m.values();
  assert.equal(salvata.headers.get('Cache-Control'), `max-age=${CACHE_OK_S}`);
});

test('cache: anche una risposta in cache passa prima dal controllo di accesso', async () => {
  const cache = cacheFinta();
  const sospesi = [];
  const argomenti = { request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, cache, waitUntil: (p) => sospesi.push(p) };
  await rispondi({ ...argomenti, verifica: passa });
  await Promise.all(sospesi);
  assert.equal((await rispondi({ ...argomenti, request: richiesta(), verifica: rifiuta })).status, 403);
});

test('un periodo sconosciuto usa la stessa voce di cache di 28 giorni', async () => {
  const cache = cacheFinta();
  const sospesi = [];
  await rispondi({ request: richiesta('periodo=boh'), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, cache, waitUntil: (p) => sospesi.push(p), verifica: passa });
  await Promise.all(sospesi);
  assert.deepEqual([...cache.m.keys()], ['https://quotify.it/api/cruscotto?periodo=28&confronto=0&giorno=2026-10-12']);
});
