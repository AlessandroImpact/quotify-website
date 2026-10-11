// GET /api/cruscotto — i dati del cruscotto. Protetto da Cloudflare Access e,
// in più, dalla verifica del suo token qui dentro (lib/accesso.mjs): lo stesso
// progetto risponde anche su *.pages.dev, che Access non copre.
//
// Tutta la logica sta in lib/cruscotto-api.mjs, dove i test la raggiungono.
//
// SEGRETI E VARIABILI sul progetto Pages `quotify-website`, solo produzione:
//   ACCESS_TEAM, ACCESS_AUD, CRUSCOTTO_EMAIL   chi può entrare
//   CF_ANALYTICS_TOKEN, CF_ACCOUNT_ID          Cloudflare, sola lettura
//   RIASSUNTO_CHIAVE                           la chiave condivisa con l'app

import { rispondi, verificaPer } from '../../lib/cruscotto-api.mjs';

export const onRequestGet = (context) => rispondi({
  request: context.request,
  env: context.env,
  cache: caches.default,
  waitUntil: (p) => context.waitUntil(p),
  verifica: verificaPer(context.env),
});
