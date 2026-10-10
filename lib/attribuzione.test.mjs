import { test } from 'node:test';
import assert from 'node:assert/strict';

import { famiglia, hostDi, interno, utmDa, ePagina, attribuisci, eNavigazione } from './attribuzione.mjs';

const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ADESSO = new Date('2026-10-10T21:15:00Z');
const visita = (indirizzo, altro = {}) => attribuisci({
  url: new URL(indirizzo), referer: null, userAgent: BROWSER, paese: 'IT', navigazione: true, adesso: ADESSO, ...altro,
});

test('un link con UTM diventa una visita, con la sorgente presa dal parametro', () => {
  const v = visita('https://quotify.it/?utm_source=linkedin&utm_medium=social&utm_campaign=lancio&utm_content=post-1&utm_term=forfettario');
  assert.deepEqual(v, {
    quando: '2026-10-10T21:15:00.000Z', giorno: '2026-10-10', percorso: '/',
    sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', contenuto: 'post-1', termine: 'forfettario',
    provenienza: null, paese: 'IT',
  });
});

test('basta un solo parametro UTM per registrare', () => {
  const v = visita('https://quotify.it/guide?utm_campaign=newsletter');
  assert.equal(v.campagna, 'newsletter');
  assert.equal(v.sorgente, null);
});

test('senza UTM, un referrer esterno diventa la sorgente', () => {
  const v = visita('https://quotify.it/calcolo-tasse-forfettario', { referer: 'https://www.linkedin.com/' });
  assert.equal(v.sorgente, 'www.linkedin.com');
  assert.equal(v.provenienza, 'www.linkedin.com');
  assert.equal(v.campagna, null);
});

test('utm_source vince sul referrer, ma il referrer resta in provenienza per controllo', () => {
  const v = visita('https://quotify.it/?utm_source=newsletter', { referer: 'https://mail.google.com/' });
  assert.equal(v.sorgente, 'newsletter');
  assert.equal(v.provenienza, 'mail.google.com');
});

test('nessun UTM e nessun referrer: si scarta', () => {
  assert.equal(visita('https://quotify.it/'), null);
});

test('un referrer interno senza UTM si scarta: è navigazione, non acquisizione', () => {
  assert.equal(visita('https://quotify.it/guide', { referer: 'https://quotify.it/' }), null);
  assert.equal(visita('https://quotify.it/', { referer: 'https://app.quotify.it/profilo' }), null);
});

test('parametri che non sono UTM non bastano', () => {
  assert.equal(visita('https://quotify.it/?fbclid=abc&gclid=xyz&ref=qualcosa'), null);
});

test('un parametro UTM vuoto o di soli spazi vale come assente', () => {
  assert.equal(visita('https://quotify.it/?utm_source=&utm_campaign=%20%20'), null);
});

test('i nomi dei parametri sono sensibili alle maiuscole, come nello standard', () => {
  assert.equal(visita('https://quotify.it/?UTM_SOURCE=linkedin'), null);
});

test('i valori finiscono in minuscolo, o «LinkedIn» e «linkedin» spezzano i conteggi', () => {
  assert.equal(visita('https://quotify.it/?utm_source=LinkedIn&utm_campaign=Lancio').sorgente, 'linkedin');
});

test('i valori lunghissimi si troncano a 200 caratteri invece di rifiutare la visita', () => {
  const v = visita(`https://quotify.it/?utm_campaign=${'a'.repeat(5000)}`);
  assert.equal(v.campagna.length, 200);
});

test('caratteri di controllo e spazi ai bordi spariscono', () => {
  const v = visita('https://quotify.it/?utm_source=%0D%0A%20linkedin%00%09');
  assert.equal(v.sorgente, 'linkedin');
});

test('un valore con apici arriva intatto: la difesa dall\'iniezione è nei parametri legati, non qui', () => {
  const v = visita("https://quotify.it/?utm_campaign=x'%3B%20DROP%20TABLE%20visite%3B--");
  assert.equal(v.campagna, "x'; drop table visite;--");
});

test('il giorno è UTC: alle 23:30 UTC è ancora lo stesso giorno, anche se in Italia è già domani', () => {
  const v = visita('https://quotify.it/?utm_source=x', { adesso: new Date('2026-10-10T23:30:00Z') });
  assert.equal(v.giorno, '2026-10-10');
});

test('il percorso non porta mai con sé la query string', () => {
  assert.equal(visita('https://quotify.it/guide/preventivi?utm_source=x&altro=1').percorso, '/guide/preventivi');
});

test('un paese che non è un codice di due lettere diventa null', () => {
  assert.equal(visita('https://quotify.it/?utm_source=x', { paese: undefined }).paese, null);
  assert.equal(visita('https://quotify.it/?utm_source=x', { paese: 'Italia' }).paese, null);
});

// --- Il punto più sorvegliato, n. 1: le anteprime dei link
for (const ua of [
  'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'WhatsApp/2.23.20.0',
  'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  'TelegramBot (like TwitterBot)',
  'Twitterbot/1.0',
]) {
  test(`l'anteprima di un link non è una visita: ${ua.slice(0, 24)}…`, () => {
    assert.equal(visita('https://quotify.it/?utm_source=linkedin&utm_campaign=lancio', { userAgent: ua }), null);
  });
}

// --- Il punto più sorvegliato, n. 2: lo spam di referrer e gli automi
for (const ua of [null, '', 'curl/8.7.1', 'python-requests/2.32', 'Go-http-client/2.0', 'Mozilla/5.0 (compatible; Googlebot/2.1)', 'HeadlessChrome/120']) {
  test(`un automa con referrer esterno si scarta: ${JSON.stringify(ua)}`, () => {
    assert.equal(visita('https://quotify.it/', { referer: 'https://spam.example/', userAgent: ua }), null);
  });
}

test('un bot verificato da Cloudflare si scarta anche con un User-Agent da browser', () => {
  assert.equal(visita('https://quotify.it/?utm_source=x', { botVerificato: true }), null);
});

test('hostDi: minuscolo, null se assente o illeggibile', () => {
  assert.equal(hostDi('https://WWW.LinkedIn.com/feed/'), 'www.linkedin.com');
  assert.equal(hostDi(null), null);
  assert.equal(hostDi('non-un-indirizzo'), null);
});

test('interno: il sito e ogni suo sottodominio, e niente che lo imiti', () => {
  assert.equal(interno('quotify.it'), true);
  assert.equal(interno('app.quotify.it'), true);
  assert.equal(interno('notquotify.it'), false);
  assert.equal(interno('quotify.it.evil.com'), false);
});

test('utmDa restituisce sempre tutti e cinque i campi', () => {
  assert.deepEqual(utmDa(new URL('https://quotify.it/')), {
    sorgente: null, mezzo: null, campagna: null, contenuto: null, termine: null,
  });
});

test('ePagina: solo GET su pagine, mai API, risorse o prefetch', () => {
  const h = (o = {}) => new Headers(o);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/', intestazioni: h() }), true);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/guide/preventivi', intestazioni: h() }), true);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/privacy.html', intestazioni: h() }), true);
  assert.equal(ePagina({ metodo: 'HEAD', percorso: '/', intestazioni: h() }), false);
  assert.equal(ePagina({ metodo: 'POST', percorso: '/', intestazioni: h() }), false);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/api/metriche', intestazioni: h() }), false);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/cdn-cgi/rum', intestazioni: h() }), false);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/style.css', intestazioni: h() }), false);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/assets/logo.svg', intestazioni: h() }), false);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/', intestazioni: h({ 'Sec-Purpose': 'prefetch;prerender' }) }), false);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/', intestazioni: h({ Purpose: 'prefetch' }) }), false);
});

test('famiglia: i domini corti si confrontano interi — chatgpt.com non è t.co', () => {
  // Il difetto del cruscotto originale: /t\.co/ trovava «t.co» dentro «chatgpt.com».
  assert.equal(famiglia('chatgpt.com'), 'Assistenti AI');
  assert.equal(famiglia('t.co'), 'Social');
  assert.equal(famiglia('x.com'), 'Social');
  assert.equal(famiglia('lnkd.in'), 'Social');
  assert.equal(famiglia('www.netflix.com'), 'www.netflix.com');
  assert.equal(famiglia('microsoft.com'), 'microsoft.com');
});

test('famiglia: le altre famiglie restano quelle del cruscotto', () => {
  assert.equal(famiglia(''), 'Diretto o interno');
  assert.equal(famiglia(null), 'Diretto o interno');
  assert.equal(famiglia('quotify.it'), 'Diretto o interno');
  assert.equal(famiglia('www.google.it'), 'Ricerca Google');
  assert.equal(famiglia('duckduckgo.com'), 'Altri motori');
  assert.equal(famiglia('www.linkedin.com'), 'Social');
  assert.equal(famiglia('chatgpt.com'), 'Assistenti AI');
  assert.equal(famiglia('forum.example.it'), 'forum.example.it');
});

// --- Revisione finale, punto 2: le anteprime e lo spam passano il filtro sullo User-Agent
test('senza una navigazione dichiarata dal browser non è una visita', () => {
  assert.equal(visita('https://quotify.it/?utm_source=linkedin', { navigazione: false }), null);
  assert.equal(visita('https://quotify.it/', { referer: 'https://spam.example/', navigazione: false }), null);
});

test('eNavigazione: Sec-Fetch-Mode navigate oppure Sec-Fetch-Dest document', () => {
  assert.equal(eNavigazione(new Headers({ 'Sec-Fetch-Mode': 'navigate' })), true);
  assert.equal(eNavigazione(new Headers({ 'Sec-Fetch-Dest': 'document' })), true);
  assert.equal(eNavigazione(new Headers({ 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Dest': 'image' })), false);
  assert.equal(eNavigazione(new Headers()), false);
});

for (const ua of [
  'Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5',
  'Mastodon/4.2.1 (http.rb/5.1.1; +https://mastodon.social/)',
  'Iframely/1.3.1 (+https://iframely.com/docs/about)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) BingPreview/1.0b',
  'Viber/13.0',
  'Mozilla/5.0 (Linux; Android 11) Google-PageRenderer Google (+https://developers.google.com/+/web/snippet/)',
  'Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.17126; Pro)',
]) {
  test(`anche questa anteprima è scartata dallo User-Agent: ${ua.slice(0, 30)}…`, () => {
    assert.equal(visita('https://quotify.it/?utm_source=linkedin', { userAgent: ua }), null);
  });
}

test('un telefono CUBOT è una persona, non un bot', () => {
  const ua = 'Mozilla/5.0 (Linux; Android 11; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
  assert.notEqual(visita('https://quotify.it/?utm_source=linkedin', { userAgent: ua }), null);
});

// --- Revisione finale, punto 7: Gemini non è una ricerca Google
test('gli assistenti AI di Google non gonfiano la ricerca Google', () => {
  assert.equal(famiglia('gemini.google.com'), 'Assistenti AI');
  assert.equal(famiglia('bard.google.com'), 'Assistenti AI');
  assert.equal(famiglia('www.google.com'), 'Ricerca Google');
});

test('i sottodomini del sito sono interni anche per il cruscotto', () => {
  assert.equal(famiglia('www.quotify.it'), 'Diretto o interno');
  assert.equal(famiglia('app.quotify.it'), 'Diretto o interno');
});
