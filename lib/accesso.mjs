// Verifica del JWT di Cloudflare Access — docs/cruscotto-piano.md §8.
//
// PERCHÉ ANCHE QUI, SE C'È GIÀ ACCESS
// Access protegge quotify.it/cruscotto. Ma lo stesso progetto Pages risponde
// anche su quotify-website-970.pages.dev, che Access NON copre: senza questa
// verifica, lì i dati sarebbero aperti a chiunque conosca l'indirizzo.
//
// Solo Web Crypto: gira identico in una Pages Function e in Node (i test).
// Ogni dubbio è un rifiuto. Il messaggio d'errore resta qui dentro: a chi
// chiama si risponde 403 e basta.

export class AccessoNegato extends Error {}

const ALGORITMO = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
/** Le chiavi di Access ruotano di rado: un'ora in memoria basta. */
const DURATA_CHIAVI_MS = 3_600_000;
/** Un kid sconosciuto fa richiedere i certificati, ma non più di così:
 *  altrimenti ogni token inventato diventerebbe una richiesta in uscita. */
const PAUSA_RICHIESTA_MS = 60_000;
/** Tolleranza sugli orologi per `nbf`. */
const TOLLERANZA_S = 60;

function decodifica(parte) {
  const b64 = parte.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (parte.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
const json = (parte) => JSON.parse(new TextDecoder().decode(decodifica(parte)));
const normale = (s) => String(s ?? '').trim().toLowerCase();

export function verificatore({ team, aud, email, fetch: f = globalThis.fetch, adesso = () => Date.now() }) {
  if (!team || !aud || !email) {
    return { verifica: async () => { throw new AccessoNegato('configurazione incompleta'); } };
  }
  const emittente = `https://${team}.cloudflareaccess.com`;
  let chiavi = new Map();
  let caricateIl = -Infinity;

  async function carica() {
    caricateIl = adesso();
    const r = await f(`${emittente}/cdn-cgi/access/certs`);
    if (!r.ok) throw new AccessoNegato('certificati non disponibili');
    const { keys } = await r.json();
    const nuove = new Map();
    for (const k of keys ?? []) {
      if (k.kty !== 'RSA' || !k.kid) continue;
      nuove.set(k.kid, await crypto.subtle.importKey('jwk', k, ALGORITMO, false, ['verify']));
    }
    chiavi = nuove;
  }

  async function chiave(kid) {
    const scadute = adesso() - caricateIl > DURATA_CHIAVI_MS;
    const ignota = !chiavi.has(kid) && adesso() - caricateIl > PAUSA_RICHIESTA_MS;
    if (scadute || ignota) await carica();
    const k = chiavi.get(kid);
    if (!k) throw new AccessoNegato('chiave sconosciuta');
    return k;
  }

  return {
    async verifica(token) {
      if (typeof token !== 'string') throw new AccessoNegato('token assente');
      const parti = token.split('.');
      if (parti.length !== 3) throw new AccessoNegato('token malformato');
      let testa, corpo, firma;
      try {
        testa = json(parti[0]);
        corpo = json(parti[1]);
        firma = decodifica(parti[2]);
      } catch {
        throw new AccessoNegato('token illeggibile');
      }
      if (testa?.alg !== 'RS256') throw new AccessoNegato('algoritmo non ammesso');

      const valida = await crypto.subtle.verify(ALGORITMO, await chiave(testa.kid), firma,
        new TextEncoder().encode(`${parti[0]}.${parti[1]}`));
      if (!valida) throw new AccessoNegato('firma non valida');

      const ora = Math.floor(adesso() / 1000);
      if (typeof corpo.exp !== 'number' || corpo.exp <= ora) throw new AccessoNegato('scaduto');
      if (typeof corpo.nbf === 'number' && corpo.nbf > ora + TOLLERANZA_S) throw new AccessoNegato('non ancora valido');
      if (corpo.iss !== emittente) throw new AccessoNegato('emittente sbagliato');
      const destinatari = Array.isArray(corpo.aud) ? corpo.aud : [corpo.aud];
      if (!destinatari.includes(aud)) throw new AccessoNegato('applicazione sbagliata');
      if (!corpo.email || normale(corpo.email) !== normale(email)) throw new AccessoNegato('utente non ammesso');
      return { email: corpo.email };
    },
  };
}
