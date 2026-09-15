// Lettura di Google Search Console — modulo condiviso.
//
// Gira sia in Node (lo script del cruscotto) sia su un Worker Cloudflare
// (l'endpoint che serve l'app): usa SOLO Web Crypto e fetch, niente API di
// Node. È per questo che la chiave arriva come parametro invece di essere
// letta da disco — chi chiama sa dove tenerla, il modulo no.
//
// Cloudflare dice quanta gente arriva; Search Console dice COSA ha cercato e
// IN CHE POSIZIONE siamo usciti. Per un sito di contenuti è il dato che conta,
// ed è esatto e conservato sedici mesi, non campionato a trenta giorni.

/** Proprietà "Dominio": copre sottodomini e http+https. NON è
 *  `https://quotify.it/` — sono due proprietà distinte, e sbagliarla
 *  restituisce zero righe senza alcun errore, che è il modo peggiore di
 *  fallire perché sembra "nessun dato". */
export const SITO = 'sc-domain:quotify.it';

export class ChiaveNonValida extends Error {}

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const testoB64url = (s) => b64url(new TextEncoder().encode(s));

/** Da PEM PKCS#8 a chiave importabile. Il campo `private_key` del file di
 *  Google arriva con intestazioni e a capo: vanno tolti prima di decodificare. */
async function importaChiave(pem) {
  const corpo = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '');
  let grezza;
  try {
    grezza = Uint8Array.from(atob(corpo), (c) => c.charCodeAt(0));
  } catch {
    throw new ChiaveNonValida('private_key non decodificabile');
  }
  return crypto.subtle.importKey(
    'pkcs8', grezza.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  );
}

/**
 * Crea un lettore legato a una chiave di account di servizio.
 * `chiave` è l'oggetto del file JSON scaricato da Google Cloud.
 */
export function lettore(chiave) {
  if (!chiave?.client_email || !chiave?.private_key || !chiave?.token_uri) {
    throw new ChiaveNonValida('chiave incompleta: servono client_email, private_key e token_uri');
  }

  // Un token dura un'ora. Si tiene finché vale, con un minuto di margine:
  // meglio richiederlo che usarlo scaduto a metà di una raffica di chiamate.
  let cache = { valore: null, scade: 0 };

  async function token() {
    if (cache.valore && Date.now() < cache.scade) return cache.valore;
    const ora = Math.floor(Date.now() / 1000);
    const testa = testoB64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const corpo = testoB64url(JSON.stringify({
      iss: chiave.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: chiave.token_uri,
      iat: ora,
      exp: ora + 3600,
    }));
    const k = await importaChiave(chiave.private_key);
    const firma = b64url(await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5', k, new TextEncoder().encode(`${testa}.${corpo}`)));

    const r = await fetch(chiave.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${testa}.${corpo}.${firma}`,
      }),
    });
    const d = await r.json();
    if (!d.access_token) throw new Error(`Google non ha emesso il token (${r.status})`);
    cache = { valore: d.access_token, scade: Date.now() + (d.expires_in - 60) * 1000 };
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
    if (!r.ok) throw new Error(`Search Console ${r.status}`);
    return d;
  }

  const sito = encodeURIComponent(SITO);

  return {
    /**
     * Rendimento nella ricerca.
     *
     * ATTENZIONE alla dimensione `query`: Google NASCONDE le ricerche sotto
     * una soglia di volume, per non rendere identificabile chi ha cercato. Su
     * un sito giovane questo dà zero righe anche quando i clic ci sono — non è
     * un errore. È il motivo per cui i totali si chiedono SENZA dimensioni.
     */
    async rendimento({ da, a, dimensioni = [], righe = 100 }) {
      const d = await chiedi(`/webmasters/v3/sites/${sito}/searchAnalytics/query`,
        { startDate: da, endDate: a, dimensions: dimensioni, rowLimit: righe });
      return d.rows ?? [];
    },

    async totali({ da, a }) {
      const r = await this.rendimento({ da, a, righe: 1 });
      const x = r[0] ?? {};
      return { clic: x.clicks ?? 0, impressioni: x.impressions ?? 0, ctr: x.ctr ?? 0, posizione: x.position ?? 0 };
    },

    /**
     * Stato di indicizzazione di un URL. È la domanda che nessun altro
     * strumento risponde: non «quanto traffico fa» ma «Google sa che esiste?».
     *   'L'URL è sconosciuto a Google'             → non l'ha mai visto
     *   'Rilevata, ma attualmente non indicizzata' → l'ha visto, non l'ha presa
     *   'Inviata e indicizzata'                    → a posto
     * Lenta (~2s per URL) e a quota giornaliera: mai in un ciclo stretto.
     */
    async statoUrl(url) {
      const d = await chiedi('/v1/urlInspection/index:inspect',
        { inspectionUrl: url, siteUrl: SITO, languageCode: 'it' });
      const i = d.inspectionResult?.indexStatusResult ?? {};
      return {
        url,
        stato: i.coverageState ?? 'sconosciuto',
        verdetto: i.verdict ?? null,
        ultimaScansione: i.lastCrawlTime ? i.lastCrawlTime.slice(0, 10) : null,
      };
    },

    /** Sitemap registrate. Il campo `indexed` dell'API è morto da anni: vale
     *  sempre 0 e non va mostrato, o si legge un allarme che non esiste. */
    async sitemap() {
      const d = await chiedi(`/webmasters/v3/sites/${sito}/sitemaps`);
      return (d.sitemap ?? []).map((s) => ({
        percorso: s.path,
        inviata: s.lastSubmitted?.slice(0, 10) ?? null,
        scaricata: s.lastDownloaded?.slice(0, 10) ?? null,
        errori: Number(s.errors ?? 0),
        avvisi: Number(s.warnings ?? 0),
        urlDichiarati: Number(s.contents?.[0]?.submitted ?? 0),
      }));
    },
  };
}
