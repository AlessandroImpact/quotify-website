// Raccoglitore delle visite attribuite — docs/raccoglitore-metriche-piano.md.
//
// LA REGOLA NON NEGOZIABILE (§6.4): una pagina non deve mai rallentare o
// fallire perché la statistica non è andata giù. Quindi:
//   - la pagina si chiede PRIMA, e si restituisce comunque;
//   - la scrittura va in waitUntil, cioè dopo che la risposta è partita;
//   - ogni errore, sincrono o asincrono, si inghiotte;
//   - senza il collegamento DB (anteprime, sviluppo locale) non si fa nulla.
//
// Qui non c'è logica: chi registrare lo decide lib/attribuzione.mjs, come
// scriverlo lib/archivio.mjs.

import { ePagina, attribuisci } from '../lib/attribuzione.mjs';
import { registraVisita } from '../lib/archivio.mjs';

export const onRequest = async (context) => {
  const risposta = await context.next();

  try {
    const { request, env } = context;
    if (!env.DB || !risposta.ok) return risposta;

    const url = new URL(request.url);
    if (!ePagina({ metodo: request.method, percorso: url.pathname, intestazioni: request.headers })) return risposta;

    const visita = attribuisci({
      url,
      referer: request.headers.get('Referer'),
      userAgent: request.headers.get('User-Agent'),
      paese: request.cf?.country ?? null,
      botVerificato: Boolean(request.cf?.verifiedBotCategory),
    });
    if (visita) {
      context.waitUntil(registraVisita(env.DB, visita).catch(() => {}));
    }
  } catch {
    // Deliberato: vedi la regola in testa.
  }

  return risposta;
};
