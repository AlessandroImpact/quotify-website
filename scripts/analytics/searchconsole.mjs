// Lettura di Google Search Console.
//
// Cloudflare dice quanta gente è arrivata; Search Console dice COSA ha cercato
// e IN CHE POSIZIONE siamo usciti. Per un sito che vive di contenuti è il dato
// che conta: le quindici guide servono a comparire su ricerche precise, e solo
// qui si vede se funziona.
//
// AUTENTICAZIONE — account di servizio, non OAuth: nessun consenso da
// rinnovare, nessun token che scade da rimettere a mano. Google vuole un JWT
// firmato con la chiave privata, che poi si scambia per un token d'accesso.
//
// La chiave NON sta nel repository: vive in ~/.config/quotify/search-console.json
// con permessi 600. Il percorso si può cambiare con GSC_CHIAVE.

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const PERCORSO = process.env.GSC_CHIAVE || resolve(homedir(), '.config/quotify/search-console.json');

/** Proprietà "Dominio" in Search Console: copre sottodomini e http+https.
 *  Non è `https://quotify.it/` — sono due proprietà diverse e sbagliarla
 *  restituisce zero righe senza alcun errore, che è il modo peggiore di
 *  fallire. */
export const SITO = 'sc-domain:quotify.it';

let chiaveCache = null;
function chiave() {
  if (chiaveCache) return chiaveCache;
  try {
    chiaveCache = JSON.parse(readFileSync(PERCORSO, 'utf8'));
  } catch {
    throw new ChiaveMancante(`Chiave di Search Console non leggibile in ${PERCORSO}`);
  }
  return chiaveCache;
}

/** Caso atteso, non un guasto: senza chiave il cruscotto si genera lo stesso,
 *  solo senza la parte di ricerca. */
export class ChiaveMancante extends Error {}

export function chiaveDisponibile() {
  try { chiave(); return true; } catch { return false; }
}

const b64 = (s) => Buffer.from(s).toString('base64url');

let tokenCache = { valore: null, scade: 0 };
async function token() {
  if (tokenCache.valore && Date.now() < tokenCache.scade) return tokenCache.valore;
  const k = chiave();
  const ora = Math.floor(Date.now() / 1000);
  const testa = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64(JSON.stringify({
    iss: k.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: k.token_uri,
    iat: ora,
    exp: ora + 3600,
  }));
  const firma = createSign('RSA-SHA256').update(`${testa}.${corpo}`).end()
    .sign(k.private_key).toString('base64url');

  const r = await fetch(k.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${testa}.${corpo}.${firma}`,
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`Google non ha emesso il token: ${JSON.stringify(d).slice(0, 200)}`);
  // Un minuto di margine: meglio riprenderlo che usarlo scaduto a metà giro.
  tokenCache = { valore: d.access_token, scade: Date.now() + (d.expires_in - 60) * 1000 };
  return d.access_token;
}

async function chiedi(percorso, corpo) {
  const t = await token();
  const r = await fetch(`https://searchconsole.googleapis.com${percorso}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Search Console ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  return d;
}

const sito = () => encodeURIComponent(SITO);

/**
 * Rendimento nella ricerca.
 *
 * ATTENZIONE alla dimensione `query`: Google NASCONDE le ricerche sotto una
 * certa soglia di volume, per non rendere identificabile chi ha cercato. Su un
 * sito giovane questo significa zero righe anche quando i clic ci sono — non è
 * un errore, ed è per questo che i totali si chiedono SENZA dimensioni.
 */
export async function rendimento({ da, a, dimensioni = [], righe = 100 }) {
  const d = await chiedi(`/webmasters/v3/sites/${sito()}/searchAnalytics/query`, {
    startDate: da, endDate: a, dimensions: dimensioni, rowLimit: righe,
  });
  return d.rows ?? [];
}

/** Totali del periodo: nessuna dimensione, quindi nessuna anonimizzazione. */
export async function totali({ da, a }) {
  const r = await rendimento({ da, a, righe: 1 });
  const x = r[0] ?? {};
  return {
    clic: x.clicks ?? 0,
    impressioni: x.impressions ?? 0,
    ctr: x.ctr ?? 0,
    posizione: x.position ?? 0,
  };
}

/**
 * Stato di indicizzazione di un singolo URL.
 *
 * È la domanda che nessun altro strumento risponde: non «quanto traffico fa»
 * ma «Google sa che esiste?». Tre risposte tipiche, in ordine di gravità:
 *   'L'URL è sconosciuto a Google'          → non l'ha mai visto
 *   'Rilevata, ma attualmente non indicizzata' → l'ha visto, non l'ha presa
 *   'Inviata e indicizzata'                 → a posto
 *
 * Lenta: circa due secondi per URL, con quota giornaliera. Non va chiamata
 * in un ciclo stretto su tutte le pagine a ogni aggiornamento.
 */
export async function statoUrl(url) {
  const d = await chiedi('/v1/urlInspection/index:inspect', {
    inspectionUrl: url, siteUrl: SITO, languageCode: 'it',
  });
  const i = d.inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    stato: i.coverageState ?? 'sconosciuto',
    verdetto: i.verdict ?? null,
    robots: i.robotsTxtState ?? null,
    ultimaScansione: i.lastCrawlTime ? i.lastCrawlTime.slice(0, 10) : null,
  };
}

/** Sitemap registrate, con quando Google le ha scaricate davvero.
 *  Il campo `indexed` che l'API restituisce è morto da anni: vale sempre 0
 *  e non va mostrato, altrimenti si legge un allarme che non esiste. */
export async function sitemap() {
  const d = await chiedi(`/webmasters/v3/sites/${sito()}/sitemaps`);
  return (d.sitemap ?? []).map((s) => ({
    percorso: s.path,
    inviata: s.lastSubmitted?.slice(0, 10) ?? null,
    scaricata: s.lastDownloaded?.slice(0, 10) ?? null,
    errori: Number(s.errors ?? 0),
    avvisi: Number(s.warnings ?? 0),
    urlDichiarati: Number(s.contents?.[0]?.submitted ?? 0),
  }));
}
