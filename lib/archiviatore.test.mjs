import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apriInMemoria } from './d1-in-memoria.mjs';
import { mestiere, urlDallaSitemap, lavoroCloudflare, lavoroGoogle, lavoroIndicizzazione, MASSIMO_URL } from './archiviatore.mjs';

const OGGI = '2026-10-10';
const PRESO = '2026-10-10T04:00:01.000Z';
const FOTO = { pagineViste: 4, visite: 2, campionamento: 1, pagine: [], provenienze: [], paesi: [], dispositivi: [], browser: [], vitals: null };
const zitto = () => {}; // i lavori loggano: nei test non serve leggerlo

test('mestiere: un lavoro per ora, il resto del tempo niente', () => {
  assert.equal(mestiere(Date.parse('2026-10-10T04:00:00Z')), 'cloudflare');
  assert.equal(mestiere(Date.parse('2026-10-10T05:00:00Z')), 'google');
  assert.equal(mestiere(Date.parse('2026-10-12T06:00:00Z')), 'indicizzazione'); // lunedì
  assert.equal(mestiere(Date.parse('2026-10-10T06:00:00Z')), null);            // sabato
  assert.equal(mestiere(Date.parse('2026-10-10T03:00:00Z')), null);
  assert.equal(mestiere(Date.parse('2026-10-10T04:59:59Z')), 'cloudflare');    // un cron in ritardo resta nella sua ora
});

test('urlDallaSitemap legge ogni <loc>, e niente se la sitemap è vuota', () => {
  const xml = '<urlset><url><loc>https://quotify.it/</loc></url><url><loc>https://quotify.it/guide</loc></url></urlset>';
  assert.deepEqual(urlDallaSitemap(xml), ['https://quotify.it/', 'https://quotify.it/guide']);
  assert.deepEqual(urlDallaSitemap(''), []);
});

test('lavoroCloudflare: alla prima esecuzione fotografa 28 giorni', async () => {
  const db = apriInMemoria();
  const chiesti = [];
  const cf = { giorno: async (g) => { chiesti.push(g); return FOTO; } };
  const esito = await lavoroCloudflare({ db, cf, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.deepEqual(esito, { giorni: 28, errori: 0 });
  assert.equal(db.tutte('SELECT count(*) n FROM storico WHERE visite = 2')[0].n, 28);
});

test('lavoroCloudflare: un giorno che fallisce non ferma gli altri e si annota', async () => {
  const db = apriInMemoria();
  const cf = { giorno: async (g) => { if (g === '2026-10-08') throw new Error('Cloudflare 502'); return FOTO; } };
  const esito = await lavoroCloudflare({ db, cf, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.equal(esito.errori, 1);
  const r = db.tutte("SELECT visite, dati FROM storico WHERE giorno = '2026-10-08'")[0];
  assert.equal(r.visite, null);
  assert.equal(JSON.parse(r.dati).fonti.cloudflare, 'errore');
});

test('lavoroCloudflare: fa anche la pulizia delle visite oltre i 26 mesi', async () => {
  const db = apriInMemoria();
  db.tutte("INSERT INTO visite (quando, giorno, percorso) VALUES ('x', '2024-01-01', '/') RETURNING id");
  await lavoroCloudflare({ db, cf: { giorno: async () => FOTO }, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.equal(db.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});

test('lavoroGoogle: una richiesta sola, per data, su 16 mesi', async () => {
  const db = apriInMemoria();
  const richieste = [];
  const g = { rendimento: async (o) => { richieste.push(o); return [{ keys: ['2026-10-01'], clicks: 1, impressions: 5, position: 8 }]; } };
  await lavoroGoogle({ db, g, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.equal(richieste.length, 1);
  assert.deepEqual(richieste[0].dimensioni, ['date']);
  assert.equal(richieste[0].da, '2025-06-12');
  assert.equal(richieste[0].a, '2026-10-09');
  assert.equal(db.tutte("SELECT impressioni FROM storico WHERE giorno = '2026-10-01'")[0].impressioni, 5);
});

test('lavoroGoogle: se Google non risponde, si annota su ieri e non si scrive nessun numero', async () => {
  const db = apriInMemoria();
  const g = { rendimento: async () => { throw new Error('Search Console 503'); } };
  await assert.rejects(lavoroGoogle({ db, g, oggi: OGGI, presoIl: PRESO, log: zitto }), /503/);
  const [r] = db.tutte('SELECT giorno, impressioni, dati FROM storico');
  assert.equal(r.giorno, '2026-10-09');
  assert.equal(r.impressioni, null);
  assert.equal(JSON.parse(r.dati).fonti.google, 'errore');
});

test('lavoroIndicizzazione: legge la sitemap e controlla ogni indirizzo', async () => {
  const db = apriInMemoria();
  const xml = '<urlset><url><loc>https://quotify.it/</loc></url><url><loc>https://quotify.it/privacy</loc></url></urlset>';
  const f = async (url) => { assert.equal(url, 'https://quotify.it/sitemap.xml'); return new Response(xml); };
  const g = { statoUrl: async (u) => ({ url: u, stato: u.endsWith('/') ? 'Inviata e indicizzata' : 'Rilevata, ma attualmente non indicizzata', ultimaScansione: null }) };
  const esito = await lavoroIndicizzazione({ db, g, fetch: f, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.deepEqual(esito, { pagine: 2, indicizzate: 1 });
  assert.equal(db.tutte(`SELECT indicizzate FROM storico WHERE giorno = '${OGGI}'`)[0].indicizzate, 1);
});

test('lavoroIndicizzazione: un indirizzo che fallisce diventa un esito «errore», non un\'eccezione', async () => {
  const db = apriInMemoria();
  const xml = '<loc>https://quotify.it/</loc><loc>https://quotify.it/guide</loc>';
  const g = { statoUrl: async (u) => { if (u.endsWith('guide')) throw new Error('Search Console 429'); return { url: u, stato: 'Inviata e indicizzata', ultimaScansione: null }; } };
  const esito = await lavoroIndicizzazione({ db, g, fetch: async () => new Response(xml), oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.deepEqual(esito, { pagine: 2, indicizzate: 1 });
  const dati = JSON.parse(db.tutte('SELECT dati FROM storico')[0].dati);
  assert.equal(dati.indicizzazione[1].stato, 'errore: Search Console 429');
});

test(`lavoroIndicizzazione: oltre ${MASSIMO_URL} indirizzi si ferma e lo dice`, async () => {
  const db = apriInMemoria();
  const xml = Array.from({ length: 55 }, (_, i) => `<loc>https://quotify.it/p${i}</loc>`).join('');
  let controlli = 0;
  const righe = [];
  const g = { statoUrl: async (u) => { controlli++; return { url: u, stato: 'Inviata e indicizzata', ultimaScansione: null }; } };
  await lavoroIndicizzazione({ db, g, fetch: async () => new Response(xml), oggi: OGGI, presoIl: PRESO, log: (...a) => righe.push(a.join(' ')) });
  assert.equal(controlli, MASSIMO_URL);
  assert.ok(righe.some((r) => /55/.test(r) && /40/.test(r)), righe.join('\n'));
});

test('lavoroIndicizzazione: una sitemap irraggiungibile annota l\'errore e non scrive numeri', async () => {
  const db = apriInMemoria();
  const g = { statoUrl: async () => { throw new Error('non dovrebbe essere chiamato'); } };
  await assert.rejects(lavoroIndicizzazione({ db, g, fetch: async () => new Response('', { status: 503 }), oggi: OGGI, presoIl: PRESO, log: zitto }), /sitemap 503/);
  const r = db.tutte('SELECT indicizzate, dati FROM storico')[0];
  assert.equal(r.indicizzate, null);
  assert.equal(JSON.parse(r.dati).fonti.indicizzazione, 'errore');
});
