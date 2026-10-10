// Attribuzione delle visite: da dove arriva chi arriva.
//
// PERCHÉ ESISTE: Cloudflare Web Analytics non conserva la query string
// (docs/raccoglitore-metriche-piano.md §5.1). Gli UTM, se non li leggiamo
// noi, non li legge nessuno. Qui sta tutta la logica, pura e senza rete;
// functions/_middleware.js è un guscio che la chiama.
//
// COSA NON FA, per scelta (§4.1): niente cookie, niente IP, niente
// User-Agent registrato. Lo User-Agent si guarda solo per decidere se
// scartare, e poi si dimentica. Il prezzo: non sapremo mai se chi è
// arrivato da una campagna è poi tornato.
//
// IN CASO DI DUBBIO SCARTA (§4.2). Un archivio piccolo e pulito serve,
// uno grande e sporco no.

export const OSPITE = 'quotify.it';

/** Oltre questa lunghezza un valore UTM si tronca. Duecento caratteri
 *  bastano a qualunque nome di campagna scritto da una persona. */
export const LUNGHEZZA_MASSIMA = 200;

const UTM = [
  ['utm_source', 'sorgente'],
  ['utm_medium', 'mezzo'],
  ['utm_campaign', 'campagna'],
  ['utm_content', 'contenuto'],
  ['utm_term', 'termine'],
];

// Gli automi, e soprattutto i generatori di ANTEPRIME dei social: quando
// pubblichi un link con UTM, LinkedIn, Facebook e WhatsApp lo scaricano
// subito, con i parametri e senza nessuno dietro. Senza questo filtro ogni
// condivisione conterebbe come una visita. Su Mastodon ogni istanza federata
// scarica il link per conto suo: decine di visite fantasma per un post.
//
// È il SECONDO cancello, non il primo: il primo è eNavigazione(). Una lista
// di nomi non sarà mai completa. «(?<!cu)bot» perché i telefoni CUBOT sono
// persone.
const AUTOMA = /(?<!cu)bot\b|bot[\/-]|crawl|spider|slurp|externalhit|whatsapp|viber|preview|pagerenderer|mastodon|http\.rb|iframely|embedly|microsoft office|curl|wget|python|httpclient|okhttp|go-http|java\/|axios|node-fetch|headless|lighthouse/i;

/** Raggruppa gli host in famiglie: "google.com" e "www.google.it" sono la
 *  stessa risposta alla domanda «da dove arriva la gente».
 *
 *  CORRETTO rispetto al cruscotto originale: lì `t\.co` trovava «t.co»
 *  dentro «chatgpt.com», e `x\.com` dentro «netflix.com», quindi le visite
 *  da ChatGPT finivano fra i Social. Ora i domini corti si confrontano
 *  INTERI (o come sottodominio), e gli assistenti si controllano prima. */
const DOMINIO = (nomi) => new RegExp(`(^|\\.)(${nomi.join('|')})$`);
// Prima di Google: gemini.google.com è un assistente, non una ricerca, e
// contarlo come ricerca gonfierebbe la cifra che si guarda per la SEO.
const ASSISTENTI = /chatgpt|openai|claude|perplexity|gemini|bard/;
const SOCIAL_NOMI = /facebook|instagram|linkedin|twitter|reddit/;
const SOCIAL_CORTI = DOMINIO(['x\\.com', 't\\.co', 'lnkd\\.in', 'fb\\.me']);

export function famiglia(host) {
  if (!host || interno(host)) return 'Diretto o interno';
  if (ASSISTENTI.test(host)) return 'Assistenti AI';
  if (/google\./.test(host)) return 'Ricerca Google';
  if (/bing\.|duckduckgo|ecosia|yahoo/.test(host)) return 'Altri motori';
  if (SOCIAL_NOMI.test(host) || SOCIAL_CORTI.test(host)) return 'Social';
  return host;
}

/** Host del Referer, in minuscolo. Null se assente o illeggibile. */
export function hostDi(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/** Il sito e i suoi sottodomini, app compresa: passare da uno all'altro è
 *  navigazione, non acquisizione. */
export function interno(host) {
  return host === OSPITE || host.endsWith(`.${OSPITE}`);
}

function pulisci(valore) {
  if (valore == null) return null;
  // Via i caratteri di controllo e gli spazi ai bordi; minuscolo, perché
  // «LinkedIn» e «linkedin» devono finire nella stessa riga o i conteggi si
  // spezzano. Gli apici restano: la difesa dall'iniezione SQL sta nei
  // parametri legati di lib/archivio.mjs, non nel cancellare caratteri.
  const s = String(valore)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, LUNGHEZZA_MASSIMA);
  return s || null;
}

/** I cinque UTM, sempre tutti, null dove mancano. */
export function utmDa(url) {
  const r = {};
  for (const [parametro, campo] of UTM) r[campo] = pulisci(url.searchParams.get(parametro));
  return r;
}

/** È una pagina che una persona apre? Solo GET, mai API, mai risorse
 *  statiche, mai il prefetch del browser — che scarica pagine che
 *  nessuno ha ancora deciso di guardare. */
export function ePagina({ metodo, percorso, intestazioni }) {
  if (metodo !== 'GET') return false;
  if (percorso.startsWith('/api/') || percorso.startsWith('/cdn-cgi/')) return false;
  const ultimo = percorso.split('/').pop();
  if (ultimo.includes('.') && !ultimo.endsWith('.html')) return false;
  const scopo = intestazioni.get('Sec-Purpose') || intestazioni.get('Purpose') || '';
  if (/prefetch|prerender/i.test(scopo)) return false;
  return true;
}

/** Il browser dichiara di star aprendo una pagina per una persona? Tutti i
 *  browser attuali mandano Sec-Fetch-Mode: navigate quando si apre un link
 *  (Safari dalla 16.4). I generatori di anteprime e gli script di spam no.
 *  È il primo cancello del raccoglitore: in caso di dubbio, scarta. */
export function eNavigazione(intestazioni) {
  return intestazioni.get('Sec-Fetch-Mode') === 'navigate' || intestazioni.get('Sec-Fetch-Dest') === 'document';
}

/**
 * La decisione del §4.2. Restituisce la riga da scrivere, o null.
 * Si registra solo con almeno un UTM, oppure con un referrer esterno.
 */
export function attribuisci({ url, referer, userAgent, paese, navigazione = false, botVerificato = false, adesso = new Date() }) {
  if (!navigazione || botVerificato) return null;
  if (!userAgent || AUTOMA.test(userAgent)) return null;

  const utm = utmDa(url);
  const host = hostDi(referer);
  const esterno = host && !interno(host) ? host : null;
  if (!Object.values(utm).some(Boolean) && !esterno) return null;

  const quando = adesso.toISOString();
  return {
    quando,
    giorno: quando.slice(0, 10),
    percorso: url.pathname.slice(0, LUNGHEZZA_MASSIMA),
    sorgente: utm.sorgente ?? esterno,
    mezzo: utm.mezzo,
    campagna: utm.campagna,
    contenuto: utm.contenuto,
    termine: utm.termine,
    // Grezzo anche quando è interno: serve a controllare a mano un caso strano.
    provenienza: host,
    paese: typeof paese === 'string' && /^[A-Z0-9]{2}$/.test(paese) ? paese : null,
  };
}
