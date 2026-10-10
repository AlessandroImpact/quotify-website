import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cliente, finestraGiorno, interpretaGiorno, QUERY_GIORNO, ErroreCloudflare, GRAPHQL } from './cloudflare.mjs';

// Un fetch finto che registra cosa gli è stato chiesto e risponde quello che gli si dice.
function finto(corpo, stato = 200) {
  const chiamate = [];
  const f = async (url, opzioni) => {
    chiamate.push({ url, opzioni, corpo: JSON.parse(opzioni.body) });
    return new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status: stato });
  };
  return { f, chiamate };
}

const RISPOSTA_GIORNO = {
  data: { viewer: { accounts: [{
    tot: [{ count: 21, sum: { visits: 15 }, avg: { sampleInterval: 1 } }],
    pag: [{ count: 14, sum: { visits: 10 }, dimensions: { requestPath: '/' } }],
    ref: [{ count: 3, sum: { visits: 3 }, dimensions: { refererHost: 'www.linkedin.com' } }],
    pae: [{ count: 20, dimensions: { countryName: 'IT' } }],
    dis: [{ count: 12, dimensions: { deviceType: 'desktop' } }],
    bro: [{ count: 9, dimensions: { userAgentBrowser: 'Safari' } }],
    cwv: [{ count: 11, quantiles: {
      largestContentfulPaintP75: 796000, firstContentfulPaintP75: 650000,
      cumulativeLayoutShiftP75: 0.02, interactionToNextPaintP75: 40000, timeToFirstByteP75: 120000,
    } }],
  }] } },
};

test('finestraGiorno: da mezzanotte a mezzanotte UTC, estremo superiore escluso', () => {
  assert.deepEqual(finestraGiorno('2026-10-08'), { da: '2026-10-08T00:00:00Z', fino: '2026-10-09T00:00:00Z' });
  assert.deepEqual(finestraGiorno('2026-12-31'), { da: '2026-12-31T00:00:00Z', fino: '2027-01-01T00:00:00Z' });
});

test('QUERY_GIORNO chiede tutte le scomposizioni in una sola richiesta', () => {
  for (const alias of ['tot:', 'pag:', 'ref:', 'pae:', 'dis:', 'bro:', 'cwv:']) assert.ok(QUERY_GIORNO.includes(alias), alias);
  assert.ok(QUERY_GIORNO.includes('requestHost:"quotify.it"'));
});

test('interpretaGiorno: le Core Web Vitals passano da microsecondi a millisecondi, CLS no', () => {
  const f = interpretaGiorno(RISPOSTA_GIORNO.data.viewer.accounts[0]);
  assert.equal(f.pagineViste, 21);
  assert.equal(f.visite, 15);
  assert.equal(f.campionamento, 1);
  assert.deepEqual(f.pagine, [{ chiave: '/', viste: 14 }]);
  assert.deepEqual(f.provenienze, [{ chiave: 'www.linkedin.com', viste: 3 }]);
  assert.deepEqual(f.vitals, { campioni: 11, lcp: 796, fcp: 650, cls: 0.02, inp: 40, ttfb: 120 });
});

test('un giorno senza nessuna visita è uno zero vero, non un dato mancante', () => {
  const f = interpretaGiorno({ tot: [], pag: [], ref: [], pae: [], dis: [], bro: [], cwv: [] });
  assert.equal(f.pagineViste, 0);
  assert.equal(f.visite, 0);
  assert.equal(f.vitals, null);
  assert.deepEqual(f.pagine, []);
});

test('giorno(): una sola richiesta, con la finestra giusta e il token nell\'intestazione', async () => {
  const { f, chiamate } = finto(RISPOSTA_GIORNO);
  const c = cliente({ token: 'TOKEN-SEGRETO', account: 'acc-1', fetch: f });
  const foto = await c.giorno('2026-10-08');
  assert.equal(chiamate.length, 1);
  assert.equal(chiamate[0].url, GRAPHQL);
  assert.equal(chiamate[0].opzioni.headers.Authorization, 'Bearer TOKEN-SEGRETO');
  assert.deepEqual(chiamate[0].corpo.variables, { a: 'acc-1', da: '2026-10-08T00:00:00Z', fino: '2026-10-09T00:00:00Z' });
  assert.equal(foto.visite, 15);
});

test('GraphQL risponde 200 anche quando sbaglia: l\'errore nel corpo deve diventare un\'eccezione', async () => {
  const { f } = finto({ errors: [{ message: 'cannot request a time range wider than 1d' }] });
  const c = cliente({ token: 't', account: 'a', fetch: f });
  await assert.rejects(c.giorno('2026-10-08'), (e) => e instanceof ErroreCloudflare && /time range/.test(e.message));
});

test('una risposta che non è JSON diventa un errore leggibile, non un crash', async () => {
  const { f } = finto('<html>502 Bad Gateway</html>', 502);
  const c = cliente({ token: 't', account: 'a', fetch: f });
  await assert.rejects(c.giorno('2026-10-08'), /non leggibile \(502\)/);
});

test('il token non compare mai in un messaggio d\'errore', async () => {
  const { f } = finto({ errors: [{ message: 'Authentication error' }] }, 403);
  const c = cliente({ token: 'TOKEN-CHE-NON-DEVE-USCIRE', account: 'a', fetch: f });
  await assert.rejects(c.giorno('2026-10-08'), (e) => !e.message.includes('TOKEN-CHE-NON-DEVE-USCIRE'));
});

test('senza token o account il cliente si rifiuta di nascere', () => {
  assert.throws(() => cliente({ token: '', account: 'a' }), ErroreCloudflare);
  assert.throws(() => cliente({ token: 't', account: undefined }), ErroreCloudflare);
});

test('pageload e vitals passano la selezione e la finestra così come sono', async () => {
  const { f, chiamate } = finto({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [{ count: 3 }], rumWebVitalsEventsAdaptiveGroups: [{ count: 2 }] }] } } });
  const c = cliente({ token: 't', account: 'a', fetch: f });
  assert.deepEqual(await c.pageload({ da: 'D', fino: 'F', selezione: 'count dimensions{date}', limite: 400 }), [{ count: 3 }]);
  assert.ok(chiamate[0].corpo.query.includes('limit:400'));
  assert.ok(chiamate[0].corpo.query.includes('count dimensions{date}'));
  assert.deepEqual(await c.vitals({ da: 'D', fino: 'F', selezione: 'count' }), { count: 2 });
});

// --- Revisione finale, punto 3: una risposta vuota non è un giorno a zero
test('un account non visibile al token è un errore, non un giorno senza visite', async () => {
  for (const corpo of [{ data: { viewer: { accounts: [] } } }, { data: null }, {}]) {
    const { f } = finto(corpo);
    const c = cliente({ token: 't', account: 'a', fetch: f });
    await assert.rejects(c.giorno('2026-10-08'), ErroreCloudflare, JSON.stringify(corpo));
  }
});

test('una risposta senza i totali del giorno è un errore', async () => {
  const { f } = finto({ data: { viewer: { accounts: [{ pag: [] }] } } });
  const c = cliente({ token: 't', account: 'a', fetch: f });
  await assert.rejects(c.giorno('2026-10-08'), /totali/);
});
