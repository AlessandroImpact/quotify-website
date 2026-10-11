import { test } from 'node:test';
import assert from 'node:assert/strict';

import { invia } from './telegram.mjs';

test('invia: un messaggio con il link sotto, senza anteprima, silenzioso se richiesto', async () => {
  let chiamata;
  const f = async (url, o) => { chiamata = { url, corpo: JSON.parse(o.body) }; return Response.json({ ok: true }); };
  assert.equal(await invia({ token: 'T0K', chat: '42', testo: 'ciao', link: 'https://quotify.it/cruscotto', silenzioso: true, fetch: f }), true);
  assert.equal(chiamata.url, 'https://api.telegram.org/botT0K/sendMessage');
  assert.deepEqual(chiamata.corpo, {
    chat_id: '42', text: 'ciao\nhttps://quotify.it/cruscotto', disable_notification: true, link_preview_options: { is_disabled: true },
  });
});

test('invia: ok:false, 4xx/5xx, JSON rotto o rete giù → false, mai un\'eccezione', async () => {
  const casi = [
    async () => Response.json({ ok: false, description: 'chat not found' }),
    async () => new Response('', { status: 429 }),
    async () => new Response('{', { status: 200 }),
    async () => { throw new Error('rete'); },
  ];
  for (const f of casi) assert.equal(await invia({ token: 'T', chat: '1', testo: 'x', fetch: f }), false);
});
