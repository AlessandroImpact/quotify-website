import { test } from 'node:test';
import assert from 'node:assert/strict';

import { leggiRiassunto, canaleIscritto, URL_RIASSUNTO, CANALE_SCONOSCIUTO } from './riassunto.mjs';

const BUONO = { versione: 1, generato: 'x', giorni: [], coorte: [], totali: {}, eventi: [], medianaGiorniAlPagamento: null };
const risponde = (corpo, stato = 200) => {
  const chiamate = [];
  const f = async (url, o) => { chiamate.push({ url, o }); return new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status: stato }); };
  return { f, chiamate };
};

test('senza chiave l\'app è «in attesa» e non si chiama nessuno', async () => {
  const { f, chiamate } = risponde(BUONO);
  assert.deepEqual(await leggiRiassunto({ chiave: '', da: '2026-10-01', a: '2026-10-07', fetch: f }), { stato: 'in-attesa', dati: null });
  assert.equal(chiamate.length, 0);
});

test('una risposta buona passa, con la chiave nell\'intestazione e il periodo nell\'indirizzo', async () => {
  const { f, chiamate } = risponde(BUONO);
  const r = await leggiRiassunto({ chiave: 'k', da: '2026-10-01', a: '2026-10-07', fetch: f });
  assert.equal(r.stato, 'ok');
  assert.deepEqual(r.dati, BUONO);
  assert.equal(chiamate[0].url, `${URL_RIASSUNTO}?da=2026-10-01&a=2026-10-07`);
  assert.equal(chiamate[0].o.headers.Authorization, 'Bearer k');
});

for (const [nome, corpo, stato, atteso] of [
  ['404: l\'endpoint non esiste ancora', 'non trovato', 404, 'in-attesa'],
  ['500', 'guasto', 500, 'errore'],
  ['401: chiave sbagliata', 'no', 401, 'errore'],
  ['JSON rotto', '{', 200, 'errore'],
  ['versione sconosciuta', { ...BUONO, versione: 2 }, 200, 'errore'],
]) {
  test(`riassunto con ${nome} → ${atteso}`, async () => {
    const { f } = risponde(corpo, stato);
    assert.deepEqual(await leggiRiassunto({ chiave: 'k', da: '2026-10-01', a: '2026-10-07', fetch: f }), { stato: atteso, dati: null });
  });
}

test('rete giù o tempo scaduto → errore, mai un\'eccezione', async () => {
  const f = async () => { throw new Error('timeout'); };
  assert.deepEqual(await leggiRiassunto({ chiave: 'k', da: '2026-10-01', a: '2026-10-07', fetch: f }), { stato: 'errore', dati: null });
});

test('canaleIscritto: gli UTM del visitatore vincono, quelli interni lasciano parlare il referrer', () => {
  assert.equal(canaleIscritto({ sorgente: 'linkedin', rif: null }), 'Social');
  assert.equal(canaleIscritto({ sorgente: 'linkedin', rif: 'www.google.com' }), 'Social');
  assert.equal(canaleIscritto({ sorgente: 'sito', rif: 'www.google.com' }), 'Ricerca Google');
  assert.equal(canaleIscritto({ sorgente: 'sito', rif: null }), 'Diretto o interno');
  assert.equal(canaleIscritto({ sorgente: null, rif: 'chatgpt.com' }), 'Assistenti AI');
  assert.equal(canaleIscritto({ sorgente: null, rif: null }), CANALE_SCONOSCIUTO);
});
