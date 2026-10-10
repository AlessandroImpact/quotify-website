# Raccoglitore di metriche — piano di implementazione passo per passo

> **Per chi esegue:** SOTTO-SKILL RICHIESTA: superpowers:subagent-driven-development (consigliata)
> oppure superpowers:executing-plans, un compito alla volta. I passi usano le caselle (`- [ ]`).

**Obiettivo:** registrare la provenienza delle visite a quotify.it (UTM e referrer, che Cloudflare
non conserva) e archiviare ogni notte le metriche di Cloudflare, Search Console e indicizzazione
prima che scadano.

**Architettura:** un database D1 `quotify-metriche` con due tabelle. Un middleware di Pages Functions
scrive le visite attribuite. Un Worker separato `quotify-archivio`, con un solo cron orario, fa un
lavoro per esecuzione e scrive le fotografie giornaliere. Tutta la logica sta in moduli puri sotto
`lib/`, testati con `node --test` e con SQLite incorporato in Node; middleware e Worker sono gusci
sottili.

**Tecnologie:** JavaScript ESM, Cloudflare Pages Functions, Cloudflare Workers (piano gratuito), D1,
`node:test`, `node:sqlite` (Node 24.14), wrangler 4.76.

**Specifica:** [`docs/raccoglitore-metriche-piano.md`](raccoglitore-metriche-piano.md). Questo piano
argomenta da lì: chi esegue legge entrambi. Quando qui si cita «§4.1», è la specifica.

## Vincoli globali

Valgono per ogni compito, anche quando il compito non li ripete.

- `~/Developer/"Quotify App"` è **in sola lettura**. Nessun file dell'app si tocca.
- Credenziali: `source ~/.zshrc` poi `CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh`. Esporta
  `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. **Mai `wrangler login` né `logout`.**
- Gli script con le credenziali vanno eseguiti con **zsh**, non bash: `cf-env.sh` in bash non carica
  niente (scoperto il 2026-10-10).
- Deploy del sito, invariato: `npx wrangler pages deploy dist --project-name=quotify-website --branch=main`.
- **Nessun `wrangler.toml` nella radice del repository** (§5.6). Il Worker ha il suo, in `worker-archivio/`.
- Segreti: mai in chat, mai in un messaggio d'errore restituito, mai nei log. Si caricano con
  `wrangler secret put` **da stdin**.
- **Nessun cookie, nessun IP, nessuno User-Agent registrato** (§4.1). Lo User-Agent si legge solo per
  decidere se scartare.
- Piano gratuito Workers: **50 sottorichieste** per invocazione (tetto nostro: 45), **10 ms di CPU**,
  **5 cron per account, 3 già occupati** (§5.5, §5.7). L'archiviatore usa **un** cron: `0 * * * *`.
- Il giorno è sempre **UTC** (`toISOString().slice(0, 10)`), come in Cloudflare.
- Finestra Cloudflare da archiviare: **28 giorni**, non 30. La conservazione misurata è «circa 30»,
  e il giorno più vecchio può essere già parzialmente cancellato: archiviarlo vorrebbe dire congelare
  un numero dimezzato come se fosse vero.
- I test esistenti sono **70 e passano tutti**. Alla fine di ogni compito: 70 + i nuovi, tutti verdi.
- Commit convenzionali in italiano, come la storia del repository, chiusi con:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_015ygL5i6ggJVzuSkq5dEnwu
  ```

## Il punto più sorvegliato

Le cinque situazioni che la specifica implica, che nessun test ovvio copre, e che più facilmente
tradirebbero chi usa il raccoglitore. Ognuna ha il suo test nel compito che ne possiede il codice.

1. **Le anteprime dei link sui social.** Quando pubblichi un link con UTM su LinkedIn, Facebook o
   WhatsApp, la piattaforma lo scarica subito per generare l'anteprima — con gli UTM e senza persona
   dietro. Contarle gonfierebbe ogni campagna di una visita fantasma per ogni condivisione. Atteso:
   scartate. Test nel Compito 2 (`LinkedInBot`, `facebookexternalhit`, `WhatsApp`, `Slackbot`).
2. **Lo spam di referrer.** Bot che inventano un `Referer` esterno per comparire nelle statistiche.
   Atteso: scartati se lo User-Agent è vuoto o da automa, o se Cloudflare li dichiara bot verificati.
   Test nel Compito 2.
3. **Un errore che cancella un dato buono.** L'archiviatore rifà gli ultimi quattro giorni ogni notte:
   se Cloudflare cade proprio quella notte, la riga già buona non deve diventare `NULL`. Atteso:
   l'errore si annota in `dati.fonti`, i numeri restano. Test nel Compito 4.
4. **Valori UTM ostili o maldestri.** Lunghissimi, con caratteri di controllo, `LinkedIn` contro
   `linkedin`, parametro vuoto, apici per tentare un'iniezione SQL. Atteso: troncati a 200, ripuliti,
   in minuscolo, vuoto = assente, scritti con parametri legati e mai concatenati. Test nei Compiti 2 e 4.
5. **Gli ultimi giorni di Search Console.** Google pubblica i dati con due o tre giorni di ritardo: un
   giorno recente assente dalla risposta non è «zero impressioni», è «non ancora». Atteso: un giorno
   assente si scrive come zero solo se ha più di tre giorni; i più recenti si lasciano vuoti. Test nel
   Compito 4.

---

## Mappa dei file

| File | Stato | Responsabilità |
|---|---|---|
| `lib/attribuzione.mjs` | nuovo | decide se una richiesta è una visita da attribuire e costruisce la riga; `famiglia()` spostata qui |
| `lib/attribuzione.test.mjs` | nuovo | test della decisione e della pulizia |
| `lib/cloudflare.mjs` | nuovo | client GraphQL di Cloudflare con `fetch` iniettabile, query di un giorno con alias |
| `lib/cloudflare.test.mjs` | nuovo | test con un `fetch` finto |
| `lib/archivio.mjs` | nuovo | tutto l'SQL: scrivere visite, scegliere i giorni da fotografare, scrivere le fotografie |
| `lib/archivio.test.mjs` | nuovo | test su SQLite in memoria con lo stesso schema di D1 |
| `lib/d1-in-memoria.mjs` | nuovo | **solo per i test**: involucro con l'interfaccia di D1 attorno a `node:sqlite` |
| `lib/archiviatore.mjs` | nuovo | i tre lavori notturni e la scelta del lavoro dall'orario |
| `lib/archiviatore.test.mjs` | nuovo | test con client finti e database in memoria |
| `functions/_middleware.js` | nuovo | guscio: chiama `attribuzione` e `archivio` dentro `waitUntil` |
| `lib/middleware.test.mjs` | nuovo | il middleware con un contesto finto, compresa la regola §6.4. **Non** in `functions/`: lì ogni file rischia di diventare una rotta, e wrangler proverebbe a impacchettare `node:test` |
| `worker-archivio/wrangler.toml` | nuovo | configurazione del Worker: un cron, D1, limiti |
| `worker-archivio/indice.mjs` | nuovo | guscio: legge l'ora, sceglie il lavoro, lo esegue |
| `worker-archivio/migrazioni/0001_iniziale.sql` | nuovo | lo schema del §6, unica fonte anche per i test |
| `scripts/analytics/cruscotto.mjs` | modificato | usa `lib/cloudflare.mjs` e `famiglia()` da `lib/attribuzione.mjs` |
| `privacy.html` | modificato | il registro di provenienza dichiarato (§4.1) |
| `docs/raccoglitore-metriche-piano.md` | modificato | l'esito della Fase 0 incollato al suo posto |

---

### Compito 1: Provare che il middleware scatta sulle pagine HTML statiche

È la Fase 0 della specifica: tutto il resto poggia su questo. Si fa su una **distribuzione di
anteprima**, non in produzione. Se fallisce, **ci si ferma e si chiede**: il disegno cambia.

**File:**
- Crea (temporaneo, MAI committato): `functions/_middleware.js`
- Modifica: `docs/raccoglitore-metriche-piano.md` (sezione «Fase 0»)

**Interfacce:**
- Consuma: niente.
- Produce: un fatto verificato, scritto nella specifica.

- [ ] **Passo 1: Scrivere il middleware di prova**

```js
// PROVA DELLA FASE 0 — non va committato. Dimostra che il middleware gira
// anche sulle pagine statiche aggiungendo un'intestazione riconoscibile.
export const onRequest = async (context) => {
  const r = await context.next();
  const copia = new Response(r.body, r);
  copia.headers.set('X-Prova-Middleware', 'scattato');
  return copia;
};
```

- [ ] **Passo 2: Costruire e distribuire su un ramo di anteprima**

```zsh
cd ~/Developer/quotify-website && source ~/.zshrc && CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh
npm run build && npx wrangler pages deploy dist --project-name=quotify-website --branch=prova-middleware
```

Atteso: un indirizzo `https://prova-middleware.quotify-website.pages.dev`.

- [ ] **Passo 3: Misurare su quattro tipi di risorsa**

```zsh
for p in / /guide/preventivi /privacy /style.css /api/metriche; do
  printf '%-20s ' "$p"; curl -sI "https://prova-middleware.quotify-website.pages.dev$p" | grep -iE '^(HTTP|x-prova-middleware)' | tr '\r\n' '  '; echo
done
```

Atteso: `x-prova-middleware: scattato` almeno su `/`, `/guide/preventivi` e `/privacy`. Il valore
su `/style.css` e `/api/metriche` è informativo: il codice vero scarta comunque quei percorsi.

**Se `/` o `/guide/preventivi` NON hanno l'intestazione: fermarsi, cancellare il file, riportare
l'output all'utente. Non proseguire.**

- [ ] **Passo 4: Togliere il middleware di prova**

```zsh
rm functions/_middleware.js && git status --short functions/
```

Atteso: nessuna riga. La distribuzione di anteprima resta, ed è innocua: non è collegata a D1 e
nessuno la conosce.

- [ ] **Passo 5: Scrivere l'esito nella specifica**

In `docs/raccoglitore-metriche-piano.md`, sostituire la riga
`Non proseguire senza questa verifica fatta e il risultato incollato qui sotto.` con:

````markdown
**✅ Verificata il <data>.** Distribuzione di anteprima `prova-middleware`, risposte:

```
<incollare qui l'output del Passo 3>
```
````

- [ ] **Passo 6: Commit**

```zsh
git add docs/raccoglitore-metriche-piano.md
git commit -m "docs(metriche): fase 0 — il middleware scatta sulle pagine statiche" -m "<righe di attribuzione dei Vincoli globali>"
```

---

### Compito 2: `lib/attribuzione.mjs` — decidere chi registrare

**File:**
- Crea: `lib/attribuzione.mjs`
- Crea: `lib/attribuzione.test.mjs`
- Modifica: `scripts/analytics/cruscotto.mjs:117-127` (la funzione `famiglia` si sposta)

**Interfacce:**
- Consuma: niente.
- Produce:
  - `OSPITE: 'quotify.it'`, `LUNGHEZZA_MASSIMA: 200`
  - `famiglia(host: string|null|undefined): string`
  - `hostDi(referer: string|null): string|null`
  - `interno(host: string): boolean`
  - `utmDa(url: URL): { sorgente, mezzo, campagna, contenuto, termine }` (ognuno `string|null`)
  - `ePagina({ metodo: string, percorso: string, intestazioni: Headers }): boolean`
  - `attribuisci({ url: URL, referer: string|null, userAgent: string|null, paese: string|null, botVerificato?: boolean, adesso?: Date }): Visita|null`
  - Tipo `Visita`: `{ quando, giorno, percorso, sorgente, mezzo, campagna, contenuto, termine, provenienza, paese }`, ogni campo `string|null` tranne i primi tre, sempre stringhe.

- [ ] **Passo 1: Scrivere i test che falliscono**

`lib/attribuzione.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { famiglia, hostDi, interno, utmDa, ePagina, attribuisci } from './attribuzione.mjs';

const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ADESSO = new Date('2026-10-10T21:15:00Z');
const visita = (indirizzo, altro = {}) => attribuisci({
  url: new URL(indirizzo), referer: null, userAgent: BROWSER, paese: 'IT', adesso: ADESSO, ...altro,
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
```

- [ ] **Passo 2: Verificare che falliscano**

Esegui: `node --test lib/attribuzione.test.mjs`
Atteso: FALLISCE con `Cannot find module` su `./attribuzione.mjs`.

- [ ] **Passo 3: Scrivere il modulo**

`lib/attribuzione.mjs`:

```js
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
// condivisione conterebbe come una visita.
const AUTOMA = /bot\b|bot\/|bot-|crawl|spider|slurp|externalhit|whatsapp|curl|wget|python|httpclient|okhttp|go-http|java\/|axios|node-fetch|headless|lighthouse/i;

/** Raggruppa gli host in famiglie: "google.com" e "www.google.it" sono la
 *  stessa risposta alla domanda «da dove arriva la gente».
 *
 *  CORRETTO rispetto al cruscotto originale: lì `t\.co` trovava «t.co»
 *  dentro «chatgpt.com», e `x\.com` dentro «netflix.com», quindi le visite
 *  da ChatGPT finivano fra i Social. Ora i domini corti si confrontano
 *  INTERI (o come sottodominio), e gli assistenti si controllano prima. */
const DOMINIO = (nomi) => new RegExp(`(^|\\.)(${nomi.join('|')})$`);
const ASSISTENTI = /chatgpt|openai|claude|perplexity|gemini/;
const SOCIAL_NOMI = /facebook|instagram|linkedin|twitter|reddit/;
const SOCIAL_CORTI = DOMINIO(['x\\.com', 't\\.co', 'lnkd\\.in', 'fb\\.me']);

export function famiglia(host) {
  if (!host || host === OSPITE) return 'Diretto o interno';
  if (/google\./.test(host)) return 'Ricerca Google';
  if (/bing\.|duckduckgo|ecosia|yahoo/.test(host)) return 'Altri motori';
  if (ASSISTENTI.test(host)) return 'Assistenti AI';
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

/**
 * La decisione del §4.2. Restituisce la riga da scrivere, o null.
 * Si registra solo con almeno un UTM, oppure con un referrer esterno.
 */
export function attribuisci({ url, referer, userAgent, paese, botVerificato = false, adesso = new Date() }) {
  if (botVerificato) return null;
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
```

Il codice paese accetta anche cifre perché Cloudflare usa `T1` per Tor.

- [ ] **Passo 4: Verificare che passino**

Esegui: `node --test lib/attribuzione.test.mjs`
Atteso: tutti PASS.

Se un caso degli automi fallisce, correggere la regola `AUTOMA`, **mai** il test: ogni riga di quei
cicli è una visita fantasma.

- [ ] **Passo 5: Spostare `famiglia` fuori dal cruscotto**

In `scripts/analytics/cruscotto.mjs`:
- cancellare il commento che inizia con `// Le sorgenti grezze sono host:` e la funzione `famiglia`
  intera (righe 117-127 circa);
- aggiungere fra gli import, dopo `import * as gsc from './searchconsole.mjs';`:

```js
import { famiglia } from '../../lib/attribuzione.mjs';
```

La costante `OSPITE` del cruscotto resta dov'è: la usa anche altrove.

**Questo cambia il cruscotto, ed è voluto**: una visita da `chatgpt.com` ora finisce in *Assistenti
AI* invece che in *Social*. Va scritto nel messaggio di commit. Il confronto del Compito 3 (stessi
numeri) resta valido: lì si confrontano i conteggi, e la famiglia cambia solo l'etichetta di righe
che negli ultimi 7 giorni, se ci sono, vanno guardate a mano.

- [ ] **Passo 6: Tutti i test, e il cruscotto ancora vivo**

```zsh
npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'
node --check scripts/analytics/cruscotto.mjs && echo "cruscotto: sintassi ok"
```

Atteso: `fail 0`, e `tests` pari a 70 più i nuovi.

- [ ] **Passo 7: Commit**

```zsh
git add lib/attribuzione.mjs lib/attribuzione.test.mjs scripts/analytics/cruscotto.mjs
git commit -m "feat(metriche): decidere quali visite attribuire, e scartare il resto" -m "famiglia() passa in lib/ e si corregge: /t\.co/ prendeva chatgpt.com per un social." -m "<righe di attribuzione>"
```

---

### Compito 3: `lib/cloudflare.mjs` — le query fuori dal cruscotto

Il §4.5: l'unico rimaneggiamento di codice esistente. Il cruscotto deve produrre **gli stessi
numeri** prima e dopo.

**File:**
- Crea: `lib/cloudflare.mjs`
- Crea: `lib/cloudflare.test.mjs`
- Modifica: `scripts/analytics/cruscotto.mjs:39-67` (`chiediVitals` e `chiedi`)

**Interfacce:**
- Consuma: niente.
- Produce:
  - `GRAPHQL`, `OSPITE`, `class ErroreCloudflare extends Error`
  - `finestraGiorno(data: 'YYYY-MM-DD'): { da: string, fino: string }`
  - `QUERY_GIORNO: string`
  - `interpretaGiorno(account: object): Fotografia`
  - `cliente({ token, account, fetch? }): { pageload({ da, fino, selezione, limite? }): Promise<object[]>, vitals({ da, fino, selezione }): Promise<object|null>, giorno(data): Promise<Fotografia> }`
  - Tipo `Fotografia`: `{ pagineViste: number, visite: number, campionamento: number|null, pagine, provenienze, paesi, dispositivi, browser: {chiave: string, viste: number}[], vitals: {campioni, lcp, fcp, cls, inp, ttfb}|null }` — tempi in **millisecondi**, `cls` senza unità.

- [ ] **Passo 1: Fotografare i numeri del cruscotto PRIMA di toccarlo**

```zsh
source ~/.zshrc && CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh
npm run cruscotto -- 7 >/dev/null && cp cruscotto/index.html "$TMPDIR/cruscotto-prima.html" && echo salvato
```

Sette giorni, perché lì i numeri sono esatti (§5.2) e il confronto non balla col campionamento.

- [ ] **Passo 2: Scrivere i test che falliscono**

`lib/cloudflare.test.mjs`:

```js
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
```

- [ ] **Passo 3: Verificare che falliscano**

Esegui: `node --test lib/cloudflare.test.mjs`
Atteso: FALLISCE con `Cannot find module` su `./cloudflare.mjs`.

- [ ] **Passo 4: Scrivere il modulo**

`lib/cloudflare.mjs`:

```js
// Lettore dell'API GraphQL di Cloudflare per il sito quotify.it.
//
// Estratto da scripts/analytics/cruscotto.mjs (piano §4.5) perché ora lo
// usa anche il Worker dell'archiviatore. `fetch` si inietta dall'esterno:
// nei test è una finta, e niente esce in rete.
//
// Il token non compare MAI in un messaggio d'errore: un errore finisce nei
// log, e i log non sono un posto per i segreti.

export const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
export const OSPITE = 'quotify.it';

export class ErroreCloudflare extends Error {}

const FILTRO = `filter:{datetime_geq:$da,datetime_lt:$fino,requestHost:"${OSPITE}"}`;
const TESTA = 'query($a:String!,$da:Time!,$fino:Time!){viewer{accounts(filter:{accountTag:$a}){';

/** Un giorno UTC, estremo superiore escluso. A un giorno il campionamento
 *  è 1, cioè i numeri sono esatti (§5.2): per questo si archivia così. */
export function finestraGiorno(data) {
  const inizio = new Date(`${data}T00:00:00Z`);
  const dopo = new Date(inizio.getTime() + 86400000);
  return { da: `${data}T00:00:00Z`, fino: `${dopo.toISOString().slice(0, 10)}T00:00:00Z` };
}

// Tutte le scomposizioni di un giorno in UNA richiesta, con gli alias:
// sul piano gratuito le sottorichieste sono 50 per esecuzione (§4.6).
// I Core Web Vitals stanno in un dataset proprio, non in quello dei pageload.
export const QUERY_GIORNO = `${TESTA}
  tot:rumPageloadEventsAdaptiveGroups(limit:1,${FILTRO}){count sum{visits} avg{sampleInterval}}
  pag:rumPageloadEventsAdaptiveGroups(limit:100,${FILTRO},orderBy:[count_DESC]){count sum{visits} dimensions{requestPath}}
  ref:rumPageloadEventsAdaptiveGroups(limit:100,${FILTRO},orderBy:[count_DESC]){count sum{visits} dimensions{refererHost}}
  pae:rumPageloadEventsAdaptiveGroups(limit:60,${FILTRO},orderBy:[count_DESC]){count dimensions{countryName}}
  dis:rumPageloadEventsAdaptiveGroups(limit:10,${FILTRO},orderBy:[count_DESC]){count dimensions{deviceType}}
  bro:rumPageloadEventsAdaptiveGroups(limit:20,${FILTRO},orderBy:[count_DESC]){count dimensions{userAgentBrowser}}
  cwv:rumWebVitalsEventsAdaptiveGroups(limit:1,${FILTRO}){count quantiles{largestContentfulPaintP75 firstContentfulPaintP75 cumulativeLayoutShiftP75 interactionToNextPaintP75 timeToFirstByteP75}}
}}}`;

const elenco = (righe, dimensione) =>
  (righe ?? []).map((r) => ({ chiave: r.dimensions?.[dimensione] ?? '', viste: r.count }));

/** Dalla risposta grezza alla fotografia di un giorno. Un giorno senza
 *  eventi è uno ZERO vero: Cloudflare ha risposto, e non è passato nessuno. */
export function interpretaGiorno(acc) {
  const t = acc.tot?.[0];
  const v = acc.cwv?.[0];
  // I quantili arrivano in MICROSECONDI; il CLS non ha unità.
  const ms = (x) => (x == null ? null : x / 1000);
  return {
    pagineViste: t?.count ?? 0,
    visite: t?.sum?.visits ?? 0,
    campionamento: t?.avg?.sampleInterval ?? null,
    pagine: elenco(acc.pag, 'requestPath'),
    provenienze: elenco(acc.ref, 'refererHost'),
    paesi: elenco(acc.pae, 'countryName'),
    dispositivi: elenco(acc.dis, 'deviceType'),
    browser: elenco(acc.bro, 'userAgentBrowser'),
    vitals: v?.quantiles ? {
      campioni: v.count,
      lcp: ms(v.quantiles.largestContentfulPaintP75),
      fcp: ms(v.quantiles.firstContentfulPaintP75),
      cls: v.quantiles.cumulativeLayoutShiftP75 ?? null,
      inp: ms(v.quantiles.interactionToNextPaintP75),
      ttfb: ms(v.quantiles.timeToFirstByteP75),
    } : null,
  };
}

export function cliente({ token, account, fetch: f = globalThis.fetch }) {
  if (!token || !account) throw new ErroreCloudflare('mancano il token o l\'account di Cloudflare');

  async function graphql(query, variabili) {
    const r = await f(GRAPHQL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { a: account, ...variabili } }),
    });
    let d;
    try {
      d = await r.json();
    } catch {
      throw new ErroreCloudflare(`risposta non leggibile (${r.status})`);
    }
    // GraphQL risponde 200 anche quando sbaglia: l'errore sta nel corpo.
    if (d.errors?.length) throw new ErroreCloudflare(d.errors.map((e) => e.message).join('; '));
    if (!r.ok) throw new ErroreCloudflare(`Cloudflare ${r.status}`);
    return d.data?.viewer?.accounts?.[0] ?? {};
  }

  return {
    async pageload({ da, fino, selezione, limite = 100 }) {
      const q = `${TESTA}rumPageloadEventsAdaptiveGroups(limit:${limite},${FILTRO},orderBy:[count_DESC]){${selezione}}}}}`;
      return (await graphql(q, { da, fino })).rumPageloadEventsAdaptiveGroups ?? [];
    },
    async vitals({ da, fino, selezione }) {
      const q = `${TESTA}rumWebVitalsEventsAdaptiveGroups(limit:1,${FILTRO}){${selezione}}}}}`;
      return (await graphql(q, { da, fino })).rumWebVitalsEventsAdaptiveGroups?.[0] ?? null;
    },
    async giorno(data) {
      return interpretaGiorno(await graphql(QUERY_GIORNO, finestraGiorno(data)));
    },
  };
}
```

- [ ] **Passo 5: Verificare che passino**

Esegui: `node --test lib/cloudflare.test.mjs`
Atteso: tutti PASS.

- [ ] **Passo 6: Far usare il modulo al cruscotto**

In `scripts/analytics/cruscotto.mjs`:

1. Aggiungere fra gli import:
```js
import { cliente } from '../../lib/cloudflare.mjs';
```
2. Sostituire **le due funzioni intere** `chiediVitals` (col commento sopra di essa) e `chiedi` con:
```js
// Le query vivono in lib/cloudflare.mjs, condivise col Worker dell'archiviatore.
// I Core Web Vitals stanno in un dataset PROPRIO, non in quello dei pageload.
const cf = cliente({ token, account });
const finestra = { da: iso(inizio), fino: iso(oggi) };
const chiediVitals = (selezione) => cf.vitals({ ...finestra, selezione });
const chiedi = (selezione, limite = 100) => cf.pageload({ ...finestra, selezione, limite });
```
Le firme restano identiche: nessun'altra riga del cruscotto cambia. `chiediZona` e `ospitiPerGiorno`
**restano dove sono**: interrogano la zona, non il sito, e l'archiviatore non ne ha bisogno.

- [ ] **Passo 7: Gli stessi numeri di prima**

```zsh
npm run cruscotto -- 7 >/dev/null
diff <(grep -oE '<td class="n">[^<]+' "$TMPDIR/cruscotto-prima.html") <(grep -oE '<td class="n">[^<]+' cruscotto/index.html) && echo "IDENTICI"
diff <(grep -oE 'class="valore"[^<]*>[^<]+' "$TMPDIR/cruscotto-prima.html") <(grep -oE 'class="valore"[^<]*>[^<]+' cruscotto/index.html) && echo "CIFRE IDENTICHE"
```

Atteso: `IDENTICI` e `CIFRE IDENTICHE`. Se il secondo `grep` non trova niente, cercare nel file la
classe usata per le cifre di sintesi e ripetere con quella: il punto è confrontare i numeri, non le
date di generazione. Una differenza che compare a cavallo della mezzanotte è dovuta all'ora, non al
codice: rigenerare entrambi in un minuto.

- [ ] **Passo 8: Tutti i test**

Esegui: `npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'`
Atteso: `fail 0`.

- [ ] **Passo 9: Commit**

```zsh
git add lib/cloudflare.mjs lib/cloudflare.test.mjs scripts/analytics/cruscotto.mjs
git commit -m "refactor(metriche): le query di Cloudflare in un modulo condiviso" -m "Il cruscotto produce gli stessi numeri; il Worker dell'archiviatore potrà usarle." -m "<righe di attribuzione>"
```

---

### Compito 4: Lo schema e `lib/archivio.mjs` — tutto l'SQL in un posto

**File:**
- Crea: `worker-archivio/migrazioni/0001_iniziale.sql`
- Crea: `lib/d1-in-memoria.mjs` (solo per i test)
- Crea: `lib/archivio.mjs`
- Crea: `lib/archivio.test.mjs`

**Interfacce:**
- Consuma: `Visita` (Compito 2), `Fotografia` (Compito 3).
- Produce:
  - `FINESTRA_CLOUDFLARE = 28`, `RIFAI = 4`, `TETTO_GIORNI = 30`, `RITARDO_GOOGLE = 3`, `CONSERVAZIONE_GIORNI = 790`
  - `giorniIndietro(oggi: 'YYYY-MM-DD', n: number): string[]` — da ieri all'indietro
  - `registraVisita(db, visita: Visita): Promise<void>`
  - `giorniDaFareCloudflare(db, oggi): Promise<string[]>`
  - `istruzioneCloudflare(db, giorno, foto: Fotografia|null, presoIl): D1PreparedStatement`
  - `istruzioniGoogle(db, righe: {keys:[string], clicks, impressions, position}[], oggi, presoIl): Promise<D1PreparedStatement[]>`
  - `istruzioneErrore(db, giorno, fonte: 'cloudflare'|'google'|'indicizzazione', presoIl): D1PreparedStatement`
  - `contaIndicizzate(esiti: {stato: string}[]): number`
  - `istruzioneIndicizzazione(db, giorno, esiti, presoIl): D1PreparedStatement`
  - `istruzionePulizia(db, oggi): D1PreparedStatement` — cancella le visite oltre la conservazione
  - `apriInMemoria(): D1-like` (da `lib/d1-in-memoria.mjs`)

**Perché la pulizia:** `privacy.html`, §5, promette per i dati di navigazione «massimo 26 mesi». Il
registro delle provenienze ricade in quella promessa: senza una cancellazione automatica, fra 26 mesi
la violeremmo. 790 giorni sono 26 mesi abbondanti per difetto: 26 × 30,4.

- [ ] **Passo 1: Lo schema**

`worker-archivio/migrazioni/0001_iniziale.sql` — copiato dal §6 della specifica, **unica fonte**:
lo usano D1 in produzione e SQLite nei test.

```sql
-- Raccoglitore di metriche: docs/raccoglitore-metriche-piano.md §6.

-- Le visite attribuite. Solo quello che Cloudflare non sa fare.
CREATE TABLE visite (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quando      TEXT NOT NULL,
  giorno      TEXT NOT NULL,
  percorso    TEXT NOT NULL,
  sorgente    TEXT,
  mezzo       TEXT,
  campagna    TEXT,
  contenuto   TEXT,
  termine     TEXT,
  provenienza TEXT,
  paese       TEXT
);
CREATE INDEX visite_giorno   ON visite(giorno);
CREATE INDEX visite_campagna ON visite(campagna, giorno);

-- Una fotografia al giorno, prima che Cloudflare la cancelli.
-- Le colonne sono nullabili, e lo saranno davvero: NULL vuol dire
-- «non lo sappiamo», zero vuol dire «nessuno è passato».
CREATE TABLE storico (
  giorno       TEXT PRIMARY KEY,
  preso_il     TEXT NOT NULL,
  visite       INTEGER,
  pagine_viste INTEGER,
  impressioni  INTEGER,
  clic         INTEGER,
  posizione    REAL,
  indicizzate  INTEGER,
  dati         TEXT NOT NULL DEFAULT '{}'
);
```

- [ ] **Passo 2: L'involucro D1 per i test**

`lib/d1-in-memoria.mjs`:

```js
// SOLO PER I TEST. Un database SQLite in memoria con la stessa interfaccia
// di D1 (prepare → bind → run/all/first, e batch), così l'SQL vero di
// lib/archivio.mjs si prova senza rete e senza wrangler. Lo schema è lo
// stesso file che va su D1: se divergessero, i test mentirebbero.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const SCHEMA = new URL('../worker-archivio/migrazioni/0001_iniziale.sql', import.meta.url);

export function apriInMemoria() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(SCHEMA, 'utf8'));

  const istruzione = (sql, valori = []) => ({
    sql,
    valori,
    bind: (...v) => {
      // D1 rifiuta undefined: lo facciamo anche qui, o un test passerebbe
      // dove la produzione fallisce.
      if (v.some((x) => x === undefined)) throw new TypeError('D1_TYPE_ERROR: undefined non è un valore legabile');
      return istruzione(sql, v);
    },
    run: async () => { db.prepare(sql).run(...valori); return { success: true }; },
    all: async () => ({ results: db.prepare(sql).all(...valori).map((r) => ({ ...r })) }),
    first: async () => { const r = db.prepare(sql).get(...valori); return r ? { ...r } : null; },
  });

  return {
    prepare: (sql) => istruzione(sql),
    batch: async (istruzioni) => {
      db.exec('BEGIN');
      try {
        for (const i of istruzioni) db.prepare(i.sql).run(...i.valori);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return istruzioni.map(() => ({ success: true }));
    },
    // Per le asserzioni dei test.
    tutte: (sql) => db.prepare(sql).all().map((r) => ({ ...r })),
  };
}
```

- [ ] **Passo 3: Scrivere i test che falliscono**

`lib/archivio.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apriInMemoria } from './d1-in-memoria.mjs';
import {
  FINESTRA_CLOUDFLARE, giorniIndietro, registraVisita, giorniDaFareCloudflare,
  istruzioneCloudflare, istruzioniGoogle, istruzioneErrore, contaIndicizzate,
  istruzioneIndicizzazione, istruzionePulizia,
} from './archivio.mjs';

const OGGI = '2026-10-10';
const PRESO = '2026-10-10T04:00:01.000Z';
const VISITA = {
  quando: '2026-10-09T10:00:00.000Z', giorno: '2026-10-09', percorso: '/',
  sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', contenuto: null, termine: null,
  provenienza: 'www.linkedin.com', paese: 'IT',
};
const FOTO = (visite) => ({
  pagineViste: visite * 2, visite, campionamento: 1, pagine: [], provenienze: [],
  paesi: [], dispositivi: [], browser: [], vitals: null,
});
const riga = (db, giorno) => {
  const r = db.tutte(`SELECT * FROM storico WHERE giorno = '${giorno}'`)[0];
  return r && { ...r, dati: JSON.parse(r.dati) };
};

test('giorniIndietro parte da ieri, mai da oggi: oggi non è ancora finito', () => {
  assert.deepEqual(giorniIndietro(OGGI, 3), ['2026-10-09', '2026-10-08', '2026-10-07']);
  assert.deepEqual(giorniIndietro('2026-03-01', 1), ['2026-02-28']);
});

test('registraVisita scrive tutti i campi', async () => {
  const db = apriInMemoria();
  await registraVisita(db, VISITA);
  const [r] = db.tutte('SELECT * FROM visite');
  assert.equal(r.campagna, 'lancio');
  assert.equal(r.paese, 'IT');
  assert.equal(r.contenuto, null);
});

// --- Il punto più sorvegliato, n. 4: l'iniezione
test('un valore ostile si scrive come testo e la tabella sopravvive', async () => {
  const db = apriInMemoria();
  await registraVisita(db, { ...VISITA, campagna: "x'); drop table visite;--" });
  const r = db.tutte('SELECT campagna FROM visite');
  assert.deepEqual(r, [{ campagna: "x'); drop table visite;--" }]);
});

test('database vuoto: si fotografano tutti i 28 giorni della finestra, dal più recente', async () => {
  const db = apriInMemoria();
  const g = await giorniDaFareCloudflare(db, OGGI);
  assert.equal(g.length, FINESTRA_CLOUDFLARE);
  assert.equal(g[0], '2026-10-09');
  assert.equal(g.at(-1), '2026-09-12');
});

test('a regime si rifanno solo gli ultimi quattro giorni', async () => {
  const db = apriInMemoria();
  await db.batch(giorniIndietro(OGGI, 28).map((g) => istruzioneCloudflare(db, g, FOTO(1), PRESO)));
  assert.deepEqual(await giorniDaFareCloudflare(db, OGGI), ['2026-10-09', '2026-10-08', '2026-10-07', '2026-10-06']);
});

test('un buco in mezzo alla finestra si riempie la notte dopo', async () => {
  const db = apriInMemoria();
  const tutti = giorniIndietro(OGGI, 28);
  await db.batch(tutti.filter((g) => g !== '2026-09-20').map((g) => istruzioneCloudflare(db, g, FOTO(1), PRESO)));
  assert.ok((await giorniDaFareCloudflare(db, OGGI)).includes('2026-09-20'));
});

test('un giorno con solo i dati di Google conta come mancante per Cloudflare', async () => {
  const db = apriInMemoria();
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-09-20'], clicks: 0, impressions: 3, position: 9 }], OGGI, PRESO));
  await db.batch(giorniIndietro(OGGI, 28).filter((g) => g !== '2026-09-20').map((g) => istruzioneCloudflare(db, g, FOTO(1), PRESO)));
  assert.ok((await giorniDaFareCloudflare(db, OGGI)).includes('2026-09-20'));
});

test('riscrivere lo stesso giorno aggiorna invece di duplicare', async () => {
  const db = apriInMemoria();
  await db.batch([istruzioneCloudflare(db, '2026-10-09', FOTO(5), PRESO)]);
  await db.batch([istruzioneCloudflare(db, '2026-10-09', FOTO(7), PRESO)]);
  assert.equal(db.tutte('SELECT count(*) n FROM storico')[0].n, 1);
  assert.equal(riga(db, '2026-10-09').visite, 7);
});

// --- Il punto più sorvegliato, n. 3: un errore non cancella un dato buono
test('un errore di Cloudflare su un giorno già buono lascia i numeri e annota la fonte', async () => {
  const db = apriInMemoria();
  await db.batch([istruzioneCloudflare(db, '2026-10-09', FOTO(5), PRESO)]);
  await db.batch([istruzioneCloudflare(db, '2026-10-09', null, PRESO)]);
  const r = riga(db, '2026-10-09');
  assert.equal(r.visite, 5);
  assert.equal(r.pagine_viste, 10);
  assert.equal(r.dati.fonti.cloudflare, 'errore');
  assert.equal(r.dati.cloudflare.visite, 5);
});

test('un errore su un giorno mai visto crea la riga con i numeri a NULL, non a zero', async () => {
  const db = apriInMemoria();
  await db.batch([istruzioneCloudflare(db, '2026-10-09', null, PRESO)]);
  const r = riga(db, '2026-10-09');
  assert.equal(r.visite, null);
  assert.equal(r.dati.fonti.cloudflare, 'errore');
});

test('un giorno con errore resta da rifare', async () => {
  const db = apriInMemoria();
  await db.batch(giorniIndietro(OGGI, 28).map((g) => istruzioneCloudflare(db, g, g === '2026-09-15' ? null : FOTO(1), PRESO)));
  assert.ok((await giorniDaFareCloudflare(db, OGGI)).includes('2026-09-15'));
});

test('Google e Cloudflare convivono nella stessa riga senza cancellarsi a vicenda', async () => {
  const db = apriInMemoria();
  await db.batch([istruzioneCloudflare(db, '2026-10-01', FOTO(4), PRESO)]);
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-10-01'], clicks: 1, impressions: 9, position: 7.5 }], OGGI, PRESO));
  await db.batch([istruzioneIndicizzazione(db, '2026-10-01', [{ stato: 'Inviata e indicizzata' }], PRESO)]);
  const r = riga(db, '2026-10-01');
  assert.equal(r.visite, 4);
  assert.equal(r.impressioni, 9);
  assert.equal(r.posizione, 7.5);
  assert.equal(r.indicizzate, 1);
  assert.deepEqual(r.dati.fonti, { cloudflare: 'ok', google: 'ok', indicizzazione: 'ok' });
});

// --- Il punto più sorvegliato, n. 5: gli ultimi giorni di Search Console
test('Google: un giorno vecchio assente dalla risposta è uno zero; uno recente è «non ancora»', async () => {
  const db = apriInMemoria();
  const righe = [{ keys: ['2026-10-01'], clicks: 0, impressions: 2, position: 40 }];
  await db.batch(await istruzioniGoogle(db, righe, OGGI, PRESO));
  assert.equal(riga(db, '2026-10-02').impressioni, 0);        // 8 giorni fa, assente: zero
  assert.equal(riga(db, '2026-10-06').impressioni, 0);        // 4 giorni fa: ormai definitivo
  assert.equal(riga(db, '2026-10-07'), undefined);            // 3 giorni fa: non ancora
  assert.equal(riga(db, '2026-10-09'), undefined);            // ieri: non ancora
  assert.equal(riga(db, '2026-10-02').posizione, null);       // zero impressioni: nessuna posizione
});

test('Google: niente righe prima del primo giorno con dati — il sito non esisteva', async () => {
  const db = apriInMemoria();
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-09-30'], clicks: 0, impressions: 1, position: 12 }], OGGI, PRESO));
  assert.equal(riga(db, '2026-09-29'), undefined);
  assert.equal(db.tutte('SELECT min(giorno) g FROM storico')[0].g, '2026-09-30');
});

test('Google: un giorno recente presente nella risposta si scrive, ed è da riscrivere domani', async () => {
  const db = apriInMemoria();
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-10-08'], clicks: 0, impressions: 1, position: 5 }], OGGI, PRESO));
  assert.equal(riga(db, '2026-10-08').impressioni, 1);
});

test('Google: risposta vuota, nessuna istruzione', async () => {
  assert.deepEqual(await istruzioniGoogle(apriInMemoria(), [], OGGI, PRESO), []);
});

test('Google: i giorni già scritti e vecchi non si riscrivono ogni notte', async () => {
  const db = apriInMemoria();
  const righe = [{ keys: ['2026-08-01'], clicks: 0, impressions: 1, position: 5 }];
  await db.batch(await istruzioniGoogle(db, righe, OGGI, PRESO));
  const seconda = await istruzioniGoogle(db, righe, OGGI, PRESO);
  // restano solo i giorni recenti degli ultimi quattro, e solo se presenti o definitivi
  assert.ok(seconda.length < 10, `troppe istruzioni: ${seconda.length}`);
});

test('istruzioneErrore annota la fonte senza toccare i numeri', async () => {
  const db = apriInMemoria();
  await db.batch(await istruzioniGoogle(db, [{ keys: ['2026-10-01'], clicks: 2, impressions: 9, position: 7 }], OGGI, PRESO));
  await db.batch([istruzioneErrore(db, '2026-10-01', 'google', PRESO)]);
  const r = riga(db, '2026-10-01');
  assert.equal(r.impressioni, 9);
  assert.equal(r.dati.fonti.google, 'errore');
});

test('contaIndicizzate: «non indicizzata» non conta, gli errori nemmeno', () => {
  assert.equal(contaIndicizzate([
    { stato: 'Inviata e indicizzata' },
    { stato: 'Inviata e indicizzata' },
    { stato: 'Pagina scansionata, ma attualmente non indicizzata' },
    { stato: 'Rilevata, ma attualmente non indicizzata' },
    { stato: "L'URL è sconosciuto a Google" },
    { stato: 'errore: Search Console 429' },
  ]), 2);
});

test('istruzioneIndicizzazione conserva lo stato di ogni pagina in dati', async () => {
  const db = apriInMemoria();
  const esiti = [{ url: 'https://quotify.it/', stato: 'Inviata e indicizzata', ultimaScansione: '2026-10-06' }];
  await db.batch([istruzioneIndicizzazione(db, OGGI, esiti, PRESO)]);
  assert.deepEqual(riga(db, OGGI).dati.indicizzazione, esiti);
});

test('la pulizia cancella le visite oltre 26 mesi e lascia le altre', async () => {
  const db = apriInMemoria();
  await registraVisita(db, { ...VISITA, giorno: '2024-08-01' });
  await registraVisita(db, { ...VISITA, giorno: '2024-09-01' });
  await db.batch([istruzionePulizia(db, OGGI)]);
  assert.deepEqual(db.tutte('SELECT giorno FROM visite'), [{ giorno: '2024-09-01' }]);
});
```

- [ ] **Passo 4: Verificare che falliscano**

Esegui: `node --test lib/archivio.test.mjs`
Atteso: FALLISCE con `Cannot find module` su `./archivio.mjs`.

- [ ] **Passo 5: Scrivere il modulo**

`lib/archivio.mjs`:

```js
// Tutto l'SQL del raccoglitore di metriche, in un posto solo.
//
// Lavora su qualunque oggetto con l'interfaccia di D1 (prepare → bind →
// run/all/first, e batch): in produzione è D1, nei test è SQLite in
// memoria (lib/d1-in-memoria.mjs) con lo stesso schema.
//
// TRE REGOLE (docs/raccoglitore-metriche-piano.md §6.3):
//   - si riscrive, non si accoda: INSERT … ON CONFLICT DO UPDATE;
//   - ogni lavoro tocca SOLO le sue colonne, e fonde il suo pezzo di `dati`
//     con json_patch: Cloudflare, Google e l'indicizzazione condividono la
//     riga senza cancellarsi a vicenda;
//   - un errore annota la fonte e NON tocca i numeri: un dato buono di ieri
//     non diventa NULL perché stanotte la fonte non ha risposto.
//
// Ogni valore passa da bind(): mai concatenato nell'SQL.

/** Cloudflare conserva «circa 30 giorni». Il giorno più vecchio può essere
 *  già parzialmente cancellato: archiviarlo congelerebbe un numero dimezzato. */
export const FINESTRA_CLOUDFLARE = 28;
/** Gli ultimi giorni si rifanno sempre: le fonti li correggono ancora. */
export const RIFAI = 4;
/** Tetto di giorni per esecuzione: le sottorichieste sono 50 (§5.5). */
export const TETTO_GIORNI = 30;
/** Search Console pubblica con due o tre giorni di ritardo. */
export const RITARDO_GOOGLE = 3;
/** privacy.html §5: «Dati di navigazione: massimo 26 mesi». */
export const CONSERVAZIONE_GIORNI = 790;

const GIORNO_MS = 86400000;
const spostato = (data, giorni) => new Date(Date.parse(`${data}T00:00:00Z`) + giorni * GIORNO_MS).toISOString().slice(0, 10);

/** Da ieri all'indietro, n giorni. Oggi non c'è mai: non è ancora finito. */
export function giorniIndietro(oggi, n) {
  return Array.from({ length: n }, (_, i) => spostato(oggi, -(i + 1)));
}

export async function registraVisita(db, v) {
  await db.prepare(`INSERT INTO visite
      (quando, giorno, percorso, sorgente, mezzo, campagna, contenuto, termine, provenienza, paese)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(v.quando, v.giorno, v.percorso, v.sorgente, v.mezzo, v.campagna, v.contenuto, v.termine, v.provenienza, v.paese)
    .run();
}

/** I giorni da fotografare: gli ultimi RIFAI sempre, più ogni giorno della
 *  finestra che non ha ancora un numero di Cloudflare. Dal più recente. */
export async function giorniDaFareCloudflare(db, oggi) {
  const candidati = giorniIndietro(oggi, FINESTRA_CLOUDFLARE);
  const { results } = await db
    .prepare('SELECT giorno FROM storico WHERE giorno >= ? AND pagine_viste IS NOT NULL')
    .bind(candidati.at(-1))
    .all();
  const fatti = new Set(results.map((r) => r.giorno));
  return candidati
    .filter((g, i) => i < RIFAI || !fatti.has(g))
    .slice(0, TETTO_GIORNI);
}

/** Annota che una fonte non ha risposto, senza toccare nessun numero. */
export function istruzioneErrore(db, giorno, fonte, presoIl) {
  return db.prepare(`INSERT INTO storico (giorno, preso_il, dati) VALUES (?, ?, ?)
      ON CONFLICT(giorno) DO UPDATE SET dati = json_patch(storico.dati, excluded.dati)`)
    .bind(giorno, presoIl, JSON.stringify({ fonti: { [fonte]: 'errore' } }));
}

/** foto = null vuol dire che Cloudflare non ha risposto per quel giorno. */
export function istruzioneCloudflare(db, giorno, foto, presoIl) {
  if (!foto) return istruzioneErrore(db, giorno, 'cloudflare', presoIl);
  return db.prepare(`INSERT INTO storico (giorno, preso_il, visite, pagine_viste, dati) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(giorno) DO UPDATE SET
        preso_il = excluded.preso_il,
        visite = excluded.visite,
        pagine_viste = excluded.pagine_viste,
        dati = json_patch(storico.dati, excluded.dati)`)
    .bind(giorno, presoIl, foto.visite, foto.pagineViste,
      JSON.stringify({ cloudflare: foto, fonti: { cloudflare: 'ok' } }));
}

function istruzioneGoogle(db, giorno, clic, impressioni, posizione, presoIl) {
  return db.prepare(`INSERT INTO storico (giorno, preso_il, impressioni, clic, posizione, dati) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(giorno) DO UPDATE SET
        preso_il = excluded.preso_il,
        impressioni = excluded.impressioni,
        clic = excluded.clic,
        posizione = excluded.posizione,
        dati = json_patch(storico.dati, excluded.dati)`)
    .bind(giorno, presoIl, impressioni, clic, posizione, JSON.stringify({ fonti: { google: 'ok' } }));
}

/**
 * Dalle righe di Search Console per data alle istruzioni da eseguire.
 *
 * Un giorno ASSENTE dalla risposta vuol dire zero impressioni — ma solo se
 * ha più di RITARDO_GOOGLE giorni. Prima, vuol dire «Google non l'ha ancora
 * elaborato», e scriverci zero sarebbe inventare un crollo.
 *
 * Si parte dal primo giorno con dati: prima, il sito per Google non c'era.
 * Si scrivono solo i giorni non ancora archiviati, più gli ultimi RIFAI:
 * riscrivere 480 giorni ogni notte costerebbe CPU per niente (§5.5).
 */
export async function istruzioniGoogle(db, righe, oggi, presoIl) {
  if (!righe.length) return [];
  const perGiorno = new Map(righe.map((r) => [r.keys[0], r]));
  const primo = [...perGiorno.keys()].sort()[0];
  const ultimoDefinitivo = spostato(oggi, -(RITARDO_GOOGLE + 1));
  const recenti = new Set(giorniIndietro(oggi, RIFAI));

  const { results } = await db
    .prepare('SELECT giorno FROM storico WHERE giorno >= ? AND impressioni IS NOT NULL')
    .bind(primo)
    .all();
  const fatti = new Set(results.map((r) => r.giorno));

  const istruzioni = [];
  for (let g = primo; g < oggi; g = spostato(g, 1)) {
    if (fatti.has(g) && !recenti.has(g)) continue;
    const r = perGiorno.get(g);
    if (r) {
      istruzioni.push(istruzioneGoogle(db, g, r.clicks ?? 0, r.impressions ?? 0, r.position ?? null, presoIl));
    } else if (g <= ultimoDefinitivo) {
      istruzioni.push(istruzioneGoogle(db, g, 0, 0, null, presoIl));
    }
  }
  return istruzioni;
}

/** Stessa regola di scripts/analytics/indicizzazione.mjs: «indicizzata» sì,
 *  «non indicizzata» no. Un errore di controllo non è un'indicizzazione. */
export function contaIndicizzate(esiti) {
  return esiti.filter((e) => /indicizzata/i.test(e.stato) && !/non indicizzata/i.test(e.stato)).length;
}

export function istruzioneIndicizzazione(db, giorno, esiti, presoIl) {
  return db.prepare(`INSERT INTO storico (giorno, preso_il, indicizzate, dati) VALUES (?, ?, ?, ?)
      ON CONFLICT(giorno) DO UPDATE SET
        indicizzate = excluded.indicizzate,
        dati = json_patch(storico.dati, excluded.dati)`)
    .bind(giorno, presoIl, contaIndicizzate(esiti),
      JSON.stringify({ indicizzazione: esiti, fonti: { indicizzazione: 'ok' } }));
}

/** La promessa di privacy.html: le visite oltre i 26 mesi si cancellano. */
export function istruzionePulizia(db, oggi) {
  return db.prepare('DELETE FROM visite WHERE giorno < ?').bind(spostato(oggi, -CONSERVAZIONE_GIORNI));
}
```

Nota per chi esegue: `istruzioneIndicizzazione` **non** aggiorna `preso_il`, perché quella colonna
dice quando sono stati presi i numeri di traffico della riga, e l'indicizzazione del lunedì non li
tocca.

- [ ] **Passo 6: Verificare che passino**

Esegui: `node --test lib/archivio.test.mjs 2>&1 | grep -v ExperimentalWarning`
Atteso: tutti PASS. L'avviso `ExperimentalWarning: SQLite is an experimental feature` è normale in
Node 24 e non è un errore.

- [ ] **Passo 7: Tutti i test, e commit**

```zsh
npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'
git add worker-archivio/migrazioni/0001_iniziale.sql lib/d1-in-memoria.mjs lib/archivio.mjs lib/archivio.test.mjs
git commit -m "feat(metriche): lo schema e l'SQL dell'archivio, provati su SQLite" -m "<righe di attribuzione>"
```

---

### Compito 5: Il middleware

**File:**
- Crea: `functions/_middleware.js`
- Crea: `lib/middleware.test.mjs` (fuori da `functions/`: vedi la mappa dei file)

**Interfacce:**
- Consuma: `ePagina`, `attribuisci` (Compito 2); `registraVisita` (Compito 4); `apriInMemoria` (Compito 4, solo test).

Verifica preliminare, perché il test sta fuori dalla cartella delle rotte:

```zsh
ls functions/
```

Atteso dopo questo compito: `_middleware.js` e `api/`, **nient'altro**.
- Produce: `onRequest(context)` per Pages Functions.

- [ ] **Passo 1: Scrivere i test che falliscono**

`lib/middleware.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onRequest } from '../functions/_middleware.js';
import { apriInMemoria } from './d1-in-memoria.mjs';

const BROWSER = 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';

// Un contesto di Pages Functions finto: la pagina «servita» è una risposta
// fissa, e le promesse passate a waitUntil si raccolgono per aspettarle.
function contesto(indirizzo, { env = { DB: apriInMemoria() }, intestazioni = {}, metodo = 'GET', cf = { country: 'IT' }, stato = 200 } = {}) {
  const promesse = [];
  const request = new Request(indirizzo, { method: metodo, headers: { 'User-Agent': BROWSER, ...intestazioni } });
  Object.defineProperty(request, 'cf', { value: cf });
  return {
    ctx: {
      request, env,
      next: async () => new Response('<html>pagina</html>', { status: stato, headers: { 'Content-Type': 'text/html' } }),
      waitUntil: (p) => promesse.push(p),
    },
    attendi: () => Promise.all(promesse),
    env,
  };
}

test('una visita con UTM si registra, e la pagina arriva intatta', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/?utm_source=linkedin&utm_campaign=lancio');
  const r = await onRequest(ctx);
  await attendi();
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '<html>pagina</html>');
  const righe = env.DB.tutte('SELECT sorgente, campagna, paese, percorso FROM visite');
  assert.deepEqual(righe, [{ sorgente: 'linkedin', campagna: 'lancio', paese: 'IT', percorso: '/' }]);
});

test('una visita diretta non si registra', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/');
  await onRequest(ctx);
  await attendi();
  assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});

test('le risorse statiche e le API non si registrano nemmeno con gli UTM', async () => {
  for (const p of ['/style.css?utm_source=x', '/api/metriche?utm_source=x']) {
    const { ctx, attendi, env } = contesto(`https://quotify.it${p}`);
    await onRequest(ctx);
    await attendi();
    assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0, p);
  }
});

test('una pagina che risponde errore non si registra: nessuno è atterrato davvero', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/inesistente?utm_source=x', { stato: 404 });
  const r = await onRequest(ctx);
  await attendi();
  assert.equal(r.status, 404);
  assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});

// --- La regola non negoziabile del §6.4
test('senza il collegamento DB la pagina arriva lo stesso, in silenzio', async () => {
  const { ctx } = contesto('https://quotify.it/?utm_source=x', { env: {} });
  const r = await onRequest(ctx);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '<html>pagina</html>');
});

test('se il database esplode la pagina arriva lo stesso', async () => {
  const rotto = { prepare: () => { throw new Error('D1 giù'); } };
  const { ctx, attendi } = contesto('https://quotify.it/?utm_source=x', { env: { DB: rotto } });
  const r = await onRequest(ctx);
  await attendi();
  assert.equal(r.status, 200);
});

test('se la scrittura fallisce in modo asincrono, waitUntil non riceve una promessa rifiutata', async () => {
  const lento = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error('D1 in ritardo'); } }) }) };
  const { ctx, attendi } = contesto('https://quotify.it/?utm_source=x', { env: { DB: lento } });
  await onRequest(ctx);
  await assert.doesNotReject(attendi());
});

test('senza request.cf (sviluppo locale) il paese è null e non si rompe niente', async () => {
  // null e non undefined: undefined farebbe scattare il valore predefinito di contesto().
  const { ctx, attendi, env } = contesto('https://quotify.it/?utm_source=x', { cf: null });
  await onRequest(ctx);
  await attendi();
  assert.equal(env.DB.tutte('SELECT paese FROM visite')[0].paese, null);
});

test('un bot verificato da Cloudflare non si registra', async () => {
  const { ctx, attendi, env } = contesto('https://quotify.it/?utm_source=x', { cf: { country: 'US', verifiedBotCategory: 'Search Engine Crawler' } });
  await onRequest(ctx);
  await attendi();
  assert.equal(env.DB.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});
```

- [ ] **Passo 2: Verificare che falliscano**

Esegui: `node --test lib/middleware.test.mjs 2>&1 | grep -v ExperimentalWarning`
Atteso: FALLISCE con `Cannot find module` su `./_middleware.js`.

- [ ] **Passo 3: Scrivere il middleware**

`functions/_middleware.js`:

```js
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
```

- [ ] **Passo 4: Verificare che passino**

Esegui: `node --test lib/middleware.test.mjs 2>&1 | grep -v ExperimentalWarning`
Atteso: tutti PASS.

- [ ] **Passo 5: La costruzione del sito non si accorge di niente**

```zsh
npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'
npm run build 2>&1 | tail -5
```

Atteso: `fail 0`; la build termina col gate SEO verde. Vite non pubblica `functions/` dentro
`dist/` e non deve: le Functions le carica wrangler al deploy, dalla cartella `functions/` accanto.

- [ ] **Passo 6: Commit — ma NON ancora il deploy**

```zsh
git add functions/_middleware.js lib/middleware.test.mjs
git commit -m "feat(metriche): il middleware che registra le visite attribuite" -m "Non può rallentare né rompere una pagina: scrive dopo la risposta e inghiotte ogni errore. Senza il collegamento DB non fa nulla." -m "<righe di attribuzione>"
```

Il deploy avviene nel Compito 8, **dopo** il collegamento D1 e **dopo** la privacy: un middleware
pubblicato senza DB è innocuo, ma registrare prima di averlo dichiarato in `privacy.html` no.

---

### Compito 6: La privacy

**File:**
- Modifica: `privacy.html:152` (data), `:166-174` (§2), `:200-207` (§5)

**Interfacce:** nessuna.

`privacy.html` non ha `revisionato` nel registro (`data/pagine.json`), quindi **non** serve
`npm run gen`.

- [ ] **Passo 1: La data di aggiornamento**

Sostituire:
```html
      <p class="text-sm text-slate-500 mb-10">Ultimo aggiornamento: 25 agosto 2026</p>
```
con la data del giorno in cui si esegue, nello stesso formato, per esempio:
```html
      <p class="text-sm text-slate-500 mb-10">Ultimo aggiornamento: 11 ottobre 2026</p>
```

- [ ] **Passo 2: Il registro di provenienza fra i dati raccolti (§2)**

Dopo la riga
```html
            <li><strong>Dati tecnici:</strong> cookie tecnici e analitici (vedi Cookie Policy).</li>
```
aggiungere:
```html
            <li><strong>Registro di provenienza del sito:</strong> quando una pagina di quotify.it viene aperta da un link esterno o da un link con parametri di campagna (UTM), registriamo data e ora, la pagina d'arrivo, i parametri di campagna, il sito di provenienza e il paese. Non registriamo l'indirizzo IP, il browser, né alcun identificativo, e non usiamo cookie per questo scopo: non è possibile ricollegare due visite alla stessa persona. Serve solo a capire quali canali portano visitatori al sito.</li>
```

- [ ] **Passo 3: La conservazione (§5)**

Sostituire:
```html
            <li><strong>Dati di navigazione:</strong> massimo 26 mesi.</li>
```
con:
```html
            <li><strong>Dati di navigazione e registro di provenienza:</strong> massimo 26 mesi, poi cancellati automaticamente.</li>
```

- [ ] **Passo 4: Build e gate**

```zsh
npm run build 2>&1 | tail -5
grep -c 'Registro di provenienza' dist/privacy.html
```

Atteso: gate verde; `1`.

- [ ] **Passo 5: Commit**

```zsh
git add privacy.html
git commit -m "docs(privacy): il registro di provenienza del sito" -m "Senza cookie e senza identificativi; conservato al massimo 26 mesi, come gli altri dati di navigazione." -m "<righe di attribuzione>"
```

---

### Compito 7: `lib/archiviatore.mjs` — i tre lavori notturni

**File:**
- Crea: `lib/archiviatore.mjs`
- Crea: `lib/archiviatore.test.mjs`

**Interfacce:**
- Consuma: da `lib/archivio.mjs` (Compito 4) `giorniDaFareCloudflare`, `istruzioneCloudflare`,
  `istruzioniGoogle`, `istruzioneErrore`, `istruzioneIndicizzazione`, `istruzionePulizia`,
  `giorniIndietro`, `contaIndicizzate`; il client `cf` di `lib/cloudflare.mjs` (Compito 3) con `giorno(data)`; il
  lettore `g` di `lib/searchconsole.mjs` con `rendimento()` e `statoUrl()`.
- Produce:
  - `MASSIMO_URL = 40`, `GIORNI_GOOGLE = 485`
  - `mestiere(istante: number|Date): 'cloudflare'|'google'|'indicizzazione'|null`
  - `urlDallaSitemap(xml: string): string[]`
  - `lavoroCloudflare({ db, cf, oggi, presoIl }): Promise<{ giorni: number, errori: number }>`
  - `lavoroGoogle({ db, g, oggi, presoIl }): Promise<{ istruzioni: number }>`
  - `lavoroIndicizzazione({ db, g, fetch, oggi, presoIl }): Promise<{ pagine: number, indicizzate: number }>`

**Perché `MASSIMO_URL = 40`:** 1 token Google + 1 sitemap + 40 controlli = 42, sotto il tetto di 45.
Oggi la sitemap ha 26 indirizzi. Se un giorno supererà 40, i controlli si fermano a 40 e il log lo
dice: meglio una fotografia parziale dichiarata che un'esecuzione interrotta a metà da Cloudflare.

**Perché `GIORNI_GOOGLE = 485`:** Search Console conserva 16 mesi. Chiedere da prima restituisce
semplicemente niente; chiedere di meno perderebbe la coda della storia alla prima esecuzione.

- [ ] **Passo 1: Scrivere i test che falliscono**

`lib/archiviatore.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apriInMemoria } from './d1-in-memoria.mjs';
import { mestiere, urlDallaSitemap, lavoroCloudflare, lavoroGoogle, lavoroIndicizzazione, MASSIMO_URL } from './archiviatore.mjs';

const OGGI = '2026-10-10';
const PRESO = '2026-10-10T04:00:01.000Z';
const FOTO = { pagineViste: 4, visite: 2, campionamento: 1, pagine: [], provenienze: [], paesi: [], dispositivi: [], browser: [], vitals: null };
const zitto = () => {}; // i lavori loggano: nei test non serve leggerlo

test('mestiere: un lavoro per ora, il resto del tempo niente', () => {
  assert.equal(mestiere(Date.parse('2026-10-10T04:00:00Z')), 'cloudflare');
  assert.equal(mestiere(Date.parse('2026-10-10T05:00:00Z')), 'google');
  assert.equal(mestiere(Date.parse('2026-10-12T06:00:00Z')), 'indicizzazione'); // lunedì
  assert.equal(mestiere(Date.parse('2026-10-10T06:00:00Z')), null);            // sabato
  assert.equal(mestiere(Date.parse('2026-10-10T03:00:00Z')), null);
  assert.equal(mestiere(Date.parse('2026-10-10T04:59:59Z')), 'cloudflare');    // un cron in ritardo resta nella sua ora
});

test('urlDallaSitemap legge ogni <loc>, e niente se la sitemap è vuota', () => {
  const xml = '<urlset><url><loc>https://quotify.it/</loc></url><url><loc>https://quotify.it/guide</loc></url></urlset>';
  assert.deepEqual(urlDallaSitemap(xml), ['https://quotify.it/', 'https://quotify.it/guide']);
  assert.deepEqual(urlDallaSitemap(''), []);
});

test('lavoroCloudflare: alla prima esecuzione fotografa 28 giorni', async () => {
  const db = apriInMemoria();
  const chiesti = [];
  const cf = { giorno: async (g) => { chiesti.push(g); return FOTO; } };
  const esito = await lavoroCloudflare({ db, cf, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.deepEqual(esito, { giorni: 28, errori: 0 });
  assert.equal(db.tutte('SELECT count(*) n FROM storico WHERE visite = 2')[0].n, 28);
});

test('lavoroCloudflare: un giorno che fallisce non ferma gli altri e si annota', async () => {
  const db = apriInMemoria();
  const cf = { giorno: async (g) => { if (g === '2026-10-08') throw new Error('Cloudflare 502'); return FOTO; } };
  const esito = await lavoroCloudflare({ db, cf, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.equal(esito.errori, 1);
  const r = db.tutte("SELECT visite, dati FROM storico WHERE giorno = '2026-10-08'")[0];
  assert.equal(r.visite, null);
  assert.equal(JSON.parse(r.dati).fonti.cloudflare, 'errore');
});

test('lavoroCloudflare: fa anche la pulizia delle visite oltre i 26 mesi', async () => {
  const db = apriInMemoria();
  db.tutte("INSERT INTO visite (quando, giorno, percorso) VALUES ('x', '2024-01-01', '/') RETURNING id");
  await lavoroCloudflare({ db, cf: { giorno: async () => FOTO }, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.equal(db.tutte('SELECT count(*) n FROM visite')[0].n, 0);
});

test('lavoroGoogle: una richiesta sola, per data, su 16 mesi', async () => {
  const db = apriInMemoria();
  const richieste = [];
  const g = { rendimento: async (o) => { richieste.push(o); return [{ keys: ['2026-10-01'], clicks: 1, impressions: 5, position: 8 }]; } };
  await lavoroGoogle({ db, g, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.equal(richieste.length, 1);
  assert.deepEqual(richieste[0].dimensioni, ['date']);
  assert.equal(richieste[0].da, '2025-06-12');
  assert.equal(richieste[0].a, '2026-10-09');
  assert.equal(db.tutte("SELECT impressioni FROM storico WHERE giorno = '2026-10-01'")[0].impressioni, 5);
});

test('lavoroGoogle: se Google non risponde, si annota su ieri e non si scrive nessun numero', async () => {
  const db = apriInMemoria();
  const g = { rendimento: async () => { throw new Error('Search Console 503'); } };
  await assert.rejects(lavoroGoogle({ db, g, oggi: OGGI, presoIl: PRESO, log: zitto }), /503/);
  const [r] = db.tutte('SELECT giorno, impressioni, dati FROM storico');
  assert.equal(r.giorno, '2026-10-09');
  assert.equal(r.impressioni, null);
  assert.equal(JSON.parse(r.dati).fonti.google, 'errore');
});

test('lavoroIndicizzazione: legge la sitemap e controlla ogni indirizzo', async () => {
  const db = apriInMemoria();
  const xml = '<urlset><url><loc>https://quotify.it/</loc></url><url><loc>https://quotify.it/privacy</loc></url></urlset>';
  const f = async (url) => { assert.equal(url, 'https://quotify.it/sitemap.xml'); return new Response(xml); };
  const g = { statoUrl: async (u) => ({ url: u, stato: u.endsWith('/') ? 'Inviata e indicizzata' : 'Rilevata, ma attualmente non indicizzata', ultimaScansione: null }) };
  const esito = await lavoroIndicizzazione({ db, g, fetch: f, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.deepEqual(esito, { pagine: 2, indicizzate: 1 });
  assert.equal(db.tutte(`SELECT indicizzate FROM storico WHERE giorno = '${OGGI}'`)[0].indicizzate, 1);
});

test('lavoroIndicizzazione: un indirizzo che fallisce diventa un esito «errore», non un\'eccezione', async () => {
  const db = apriInMemoria();
  const xml = '<loc>https://quotify.it/</loc><loc>https://quotify.it/guide</loc>';
  const g = { statoUrl: async (u) => { if (u.endsWith('guide')) throw new Error('Search Console 429'); return { url: u, stato: 'Inviata e indicizzata', ultimaScansione: null }; } };
  const esito = await lavoroIndicizzazione({ db, g, fetch: async () => new Response(xml), oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.deepEqual(esito, { pagine: 2, indicizzate: 1 });
  const dati = JSON.parse(db.tutte('SELECT dati FROM storico')[0].dati);
  assert.equal(dati.indicizzazione[1].stato, 'errore: Search Console 429');
});

test(`lavoroIndicizzazione: oltre ${MASSIMO_URL} indirizzi si ferma e lo dice`, async () => {
  const db = apriInMemoria();
  const xml = Array.from({ length: 55 }, (_, i) => `<loc>https://quotify.it/p${i}</loc>`).join('');
  let controlli = 0;
  const righe = [];
  const g = { statoUrl: async (u) => { controlli++; return { url: u, stato: 'Inviata e indicizzata', ultimaScansione: null }; } };
  await lavoroIndicizzazione({ db, g, fetch: async () => new Response(xml), oggi: OGGI, presoIl: PRESO, log: (...a) => righe.push(a.join(' ')) });
  assert.equal(controlli, MASSIMO_URL);
  assert.ok(righe.some((r) => /55/.test(r) && /40/.test(r)), righe.join('\n'));
});

test('lavoroIndicizzazione: una sitemap irraggiungibile annota l\'errore e non scrive numeri', async () => {
  const db = apriInMemoria();
  const g = { statoUrl: async () => { throw new Error('non dovrebbe essere chiamato'); } };
  await assert.rejects(lavoroIndicizzazione({ db, g, fetch: async () => new Response('', { status: 503 }), oggi: OGGI, presoIl: PRESO, log: zitto }), /sitemap 503/);
  const r = db.tutte('SELECT indicizzate, dati FROM storico')[0];
  assert.equal(r.indicizzate, null);
  assert.equal(JSON.parse(r.dati).fonti.indicizzazione, 'errore');
});
```

- [ ] **Passo 2: Verificare che falliscano**

Esegui: `node --test lib/archiviatore.test.mjs 2>&1 | grep -v ExperimentalWarning`
Atteso: FALLISCE con `Cannot find module` su `./archiviatore.mjs`.

- [ ] **Passo 3: Scrivere il modulo**

`lib/archiviatore.mjs`:

```js
// I tre lavori notturni dell'archiviatore — docs/raccoglitore-metriche-piano.md.
//
// UN CRON, TRE MESTIERI, UNO PER ESECUZIONE (§5.5, §5.7). Sul piano
// gratuito la CPU è 10 ms per esecuzione, e la voce che pesa è la firma
// RSA del token Google: misurata il 2026-10-10, il caso peggiore con tutto
// insieme stava fra 6,8 e 8,6 ms. Separare Google da Cloudflare è ciò che
// lascia margine. E i cron sono 5 per ACCOUNT, tre già occupati da altri
// progetti: ne usiamo uno solo, ogni ora, e l'ora sceglie il lavoro.
//
// Qui non c'è rete: client e fetch arrivano da fuori. worker-archivio/
// indice.mjs li costruisce; i test passano delle finte.

import {
  giorniDaFareCloudflare, istruzioneCloudflare, istruzioniGoogle, istruzioneErrore,
  istruzioneIndicizzazione, istruzionePulizia, giorniIndietro, contaIndicizzate,
} from './archivio.mjs';

/** 1 token + 1 sitemap + 40 controlli = 42, sotto il tetto di 45. */
export const MASSIMO_URL = 40;
/** Search Console conserva 16 mesi: da prima non restituisce niente. */
export const GIORNI_GOOGLE = 485;

const SITEMAP = 'https://quotify.it/sitemap.xml';
const spostato = (data, giorni) => new Date(Date.parse(`${data}T00:00:00Z`) + giorni * 86400000).toISOString().slice(0, 10);

export function mestiere(istante) {
  const d = new Date(istante);
  const ora = d.getUTCHours();
  if (ora === 4) return 'cloudflare';
  if (ora === 5) return 'google';
  if (ora === 6 && d.getUTCDay() === 1) return 'indicizzazione';
  return null;
}

export function urlDallaSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** Cloudflare: un giorno per richiesta (numeri esatti, §5.2), ogni giorno
 *  indipendente dagli altri. Un errore annota, non ferma. */
export async function lavoroCloudflare({ db, cf, oggi, presoIl, log = console.log }) {
  const giorni = await giorniDaFareCloudflare(db, oggi);
  const istruzioni = [];
  let errori = 0;
  for (const g of giorni) {
    let foto = null;
    try {
      foto = await cf.giorno(g);
    } catch (e) {
      errori++;
      log(`cloudflare ${g}: ${e.message}`);
    }
    istruzioni.push(istruzioneCloudflare(db, g, foto, presoIl));
  }
  istruzioni.push(istruzionePulizia(db, oggi));
  await db.batch(istruzioni);
  log(`cloudflare: ${giorni.length} giorni, ${errori} errori`);
  return { giorni: giorni.length, errori };
}

/** Search Console: una richiesta per data su 16 mesi (§4.6). Se Google non
 *  risponde si annota su ieri e si rilancia: l'esecuzione deve risultare
 *  fallita nelle statistiche del Worker, o nessuno se ne accorge. */
export async function lavoroGoogle({ db, g, oggi, presoIl, log = console.log }) {
  let righe;
  try {
    righe = await g.rendimento({ da: spostato(oggi, -GIORNI_GOOGLE), a: spostato(oggi, -1), dimensioni: ['date'], righe: 25000 });
  } catch (e) {
    await db.batch([istruzioneErrore(db, giorniIndietro(oggi, 1)[0], 'google', presoIl)]);
    throw e;
  }
  const istruzioni = await istruzioniGoogle(db, righe, oggi, presoIl);
  if (istruzioni.length) await db.batch(istruzioni);
  log(`google: ${righe.length} giorni con dati, ${istruzioni.length} scritti`);
  return { istruzioni: istruzioni.length };
}

/** Indicizzazione: la sitemap pubblicata è la lista delle pagine, così il
 *  Worker non ha bisogno del repository. Un indirizzo che fallisce diventa
 *  un esito «errore», come in scripts/analytics/indicizzazione.mjs. */
export async function lavoroIndicizzazione({ db, g, fetch: f = globalThis.fetch, oggi, presoIl, log = console.log }) {
  const r = await f(SITEMAP);
  if (!r.ok) {
    await db.batch([istruzioneErrore(db, oggi, 'indicizzazione', presoIl)]);
    throw new Error(`sitemap ${r.status}`);
  }
  const tutti = urlDallaSitemap(await r.text());
  const urls = tutti.slice(0, MASSIMO_URL);
  if (tutti.length > urls.length) log(`indicizzazione: la sitemap ha ${tutti.length} indirizzi, controllati i primi ${MASSIMO_URL}`);

  const esiti = [];
  for (const u of urls) {
    try {
      esiti.push(await g.statoUrl(u));
    } catch (e) {
      esiti.push({ url: u, stato: `errore: ${e.message}`, ultimaScansione: null });
    }
  }
  const indicizzate = contaIndicizzate(esiti);
  await db.batch([istruzioneIndicizzazione(db, oggi, esiti, presoIl)]);
  log(`indicizzazione: ${esiti.length} pagine, ${indicizzate} indicizzate`);
  return { pagine: esiti.length, indicizzate };
}
```


- [ ] **Passo 4: Verificare che passino**

Esegui: `node --test lib/archiviatore.test.mjs 2>&1 | grep -v ExperimentalWarning`
Atteso: tutti PASS.

- [ ] **Passo 5: Tutti i test, e commit**

```zsh
npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'
git add lib/archiviatore.mjs lib/archiviatore.test.mjs
git commit -m "feat(metriche): i tre lavori notturni dell'archiviatore" -m "<righe di attribuzione>"
```

---

### Compito 8: Il Worker, il database vero, e la messa in produzione

Qui si esce dal repository e si toccano risorse vere. Ogni passo ha la sua verifica, e l'ordine conta:
**il sito con il middleware si pubblica solo dopo che D1 esiste, è collegato, e la privacy è online.**

**File:**
- Crea: `worker-archivio/wrangler.toml`
- Crea: `worker-archivio/indice.mjs`

**Interfacce:**
- Consuma: `lettore` (`lib/searchconsole.mjs`), `cliente` (Compito 3), i tre lavori e `mestiere` (Compito 7).
- Produce: il Worker `quotify-archivio` in esecuzione, il database `quotify-metriche` popolato.

- [ ] **Passo 1: Il token di sola lettura — lo crea l'utente**

È l'unico passo che non si può fare da riga di comando: chiedere all'utente di crearlo nella console
Cloudflare, **Il mio profilo → Token API → Crea token → Token personalizzato**, con esattamente:

| Permesso | Livello |
|---|---|
| Account → Analisi account | Leggi — risorsa: solo l'account Personale |

Uno solo, non i due che dice la specifica al §7, Fase 5: le query di **zona** sono rimaste nel
cruscotto locale (Compito 3), e l'archiviatore legge solo Web Analytics, che sta a livello di
account. Meno permessi del previsto è la direzione giusta.

Nome: `quotify-archivio-sola-lettura`. Il valore **non va incollato in chat**: l'utente lo salva in
`~/vault/secrets/quotify/cf-analytics-token` e poi `chmod 600` su quel file. Verificare:

```zsh
ls -l ~/vault/secrets/quotify/cf-analytics-token
```

Atteso: `-rw-------`. Se i permessi sono diversi, chiedere all'utente di correggerli prima di
proseguire.

- [ ] **Passo 2: Creare il database**

```zsh
cd ~/Developer/quotify-website/worker-archivio && source ~/.zshrc && CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh
npx wrangler d1 create quotify-metriche
```

Atteso: un `database_id` in formato UUID. Annotarlo per il passo dopo.

- [ ] **Passo 3: La configurazione del Worker**

`worker-archivio/wrangler.toml` (al posto di `ID_DEL_DATABASE`, l'UUID del passo 2):

```toml
# Archiviatore delle metriche di quotify.it — docs/raccoglitore-metriche-piano.md
name = "quotify-archivio"
main = "indice.mjs"
compatibility_date = "2026-09-01"
# Nessun indirizzo pubblico: il Worker ha solo scheduled(), niente da servire.
workers_dev = false

[triggers]
# UNO solo, ogni ora (§5.7): l'ora sceglie il lavoro.
crons = ["0 * * * *"]

[limits]
# Sotto il limite di 50 del piano gratuito, con margine.
subrequests = 45

[vars]
CF_ACCOUNT_ID = "9293958902c961a60201936782d4c1c9"

[[d1_databases]]
binding = "DB"
database_name = "quotify-metriche"
database_id = "ID_DEL_DATABASE"
migrations_dir = "migrazioni"
```

Verificare che non sia rimasto il segnaposto:

```zsh
grep -c ID_DEL_DATABASE wrangler.toml
```

Atteso: `0`.

- [ ] **Passo 4: Applicare lo schema al database vero**

```zsh
npx wrangler d1 migrations apply quotify-metriche --remote
npx wrangler d1 execute quotify-metriche --remote --command "SELECT name FROM sqlite_master WHERE type IN ('table','index') ORDER BY name"
```

Atteso: `storico`, `visite`, `visite_campagna`, `visite_giorno` (più le tabelle interne `d1_migrations`
e `sqlite_sequence`).

- [ ] **Passo 5: Il guscio del Worker**

`worker-archivio/indice.mjs`:

```js
// Worker dell'archiviatore — docs/raccoglitore-metriche-piano.md.
//
// Solo scheduled(), nessun fetch(): niente superficie HTTP, niente da
// proteggere. Un cron ogni ora; mestiere() sceglie il lavoro dall'ora,
// e nelle ore senza lavoro si esce subito.
//
// I segreti (GSC_CHIAVE, CF_ANALYTICS_TOKEN) restano qui dentro: nessun
// messaggio di log li contiene, e gli errori dei moduli sono scritti per
// non contenerli.

import { lettore } from '../lib/searchconsole.mjs';
import { cliente } from '../lib/cloudflare.mjs';
import { mestiere, lavoroCloudflare, lavoroGoogle, lavoroIndicizzazione } from '../lib/archiviatore.mjs';

export default {
  async scheduled(controller, env) {
    const lavoro = mestiere(controller.scheduledTime);
    if (!lavoro) return;

    const oggi = new Date(controller.scheduledTime).toISOString().slice(0, 10);
    const presoIl = new Date().toISOString();
    const db = env.DB;

    if (lavoro === 'cloudflare') {
      const cf = cliente({ token: env.CF_ANALYTICS_TOKEN, account: env.CF_ACCOUNT_ID });
      await lavoroCloudflare({ db, cf, oggi, presoIl });
    } else if (lavoro === 'google') {
      await lavoroGoogle({ db, g: lettore(JSON.parse(env.GSC_CHIAVE)), oggi, presoIl });
    } else {
      await lavoroIndicizzazione({ db, g: lettore(JSON.parse(env.GSC_CHIAVE)), oggi, presoIl });
    }
  },
};
```

La cartella `worker-archivio/.wrangler/` che wrangler crea è già ignorata: la regola `.wrangler/` di
`.gitignore` vale a ogni profondità.

- [ ] **Passo 6: Distribuire il Worker e caricare i segreti da stdin**

```zsh
npx wrangler deploy 2>&1 | grep -E 'Upload|Startup|schedule|Version|rror'
npx wrangler secret put GSC_CHIAVE < ~/.config/quotify/search-console.json
npx wrangler secret put CF_ANALYTICS_TOKEN < ~/vault/secrets/quotify/cf-analytics-token
npx wrangler secret list
```

Atteso: `schedule: 0 * * * *`; nell'elenco dei segreti `GSC_CHIAVE` e `CF_ANALYTICS_TOKEN`, **nessun
valore stampato**.

Se il deploy rifiuta `[limits] subrequests` sul piano gratuito, togliere quella sezione, ridistribuire
e scriverlo nella specifica al §5.5: il tetto resta garantito dal codice (28 giorni + 2, oppure 42).

Contare i cron dell'account: devono essere 4 su 5.

```zsh
for w in maison-sisters myperiod-api quotify-cron quotify-archivio; do
  curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$w/schedules" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import json,sys; print('$w', [s['cron'] for s in json.load(sys.stdin)['result']['schedules']])"
done
```

- [ ] **Passo 7: Collegare D1 al progetto Pages — solo produzione, senza file nuovi**

Per il §5.6, niente `wrangler.toml` nella radice. Si usa l'API, con una fotografia prima e dopo per
dimostrare che i segreti esistenti non si sono persi.

```zsh
cd ~/Developer/quotify-website && source ~/.zshrc && CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh
ID=$(grep database_id worker-archivio/wrangler.toml | cut -d'"' -f2)
echo "--- prima"; npx wrangler pages secret list --project-name=quotify-website 2>&1 | grep -E '^\s+-'
curl -s -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/quotify-website" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' \
  --data "{\"deployment_configs\":{\"production\":{\"d1_databases\":{\"DB\":{\"id\":\"$ID\"}}}}}" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("successo:", d["success"], d.get("errors") or ""); print("D1 produzione:", d["result"]["deployment_configs"]["production"].get("d1_databases"))'
echo "--- dopo"; npx wrangler pages secret list --project-name=quotify-website 2>&1 | grep -E '^\s+-'
```

Atteso: `successo: True`, `DB` col suo id, e **gli stessi due segreti prima e dopo** (`GSC_CHIAVE`,
`METRICHE_CHIAVE`). **Se un segreto è sparito, fermarsi e dirlo all'utente subito**: va ricaricato
prima di qualunque deploy, o `/api/metriche` smette di funzionare per l'app.

Se il token di deploy non ha il permesso per la PATCH, il collegamento lo fa l'utente dalla console
(Workers & Pages → quotify-website → Impostazioni → Collegamenti → D1, variabile `DB`, solo
Produzione), e poi si ripete il controllo dei segreti.

L'anteprima resta **senza** DB, per scelta: il middleware lì non fa nulla, e le prove sui rami di
anteprima non sporcano l'archivio.

- [ ] **Passo 8: Pubblicare il sito**

```zsh
npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'
npm run build 2>&1 | tail -3
npx wrangler pages deploy dist --project-name=quotify-website --branch=main 2>&1 | tail -4
```

Atteso: test verdi, gate verde, deploy completato. **Il comando di deploy è quello di sempre**: è la
prova del §5.6.

- [ ] **Passo 9: Le verifiche del §8 sul sito vero**

```zsh
UA='Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'
cd worker-archivio
# 3. una visita con UTM si registra
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' -A "$UA" 'https://quotify.it/?utm_source=prova&utm_campaign=collaudo'
# 4. una visita senza UTM e senza referrer no
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' -A "$UA" 'https://quotify.it/guide'
# l'anteprima di LinkedIn no
curl -s -o /dev/null -w '%{http_code}\n' -A 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient)' 'https://quotify.it/?utm_source=prova&utm_campaign=collaudo-anteprima'
sleep 3
npx wrangler d1 execute quotify-metriche --remote --command "SELECT quando, percorso, sorgente, campagna, paese FROM visite ORDER BY id DESC LIMIT 5"
```

Atteso: tutti `200`; nel database **una sola** riga, `campagna = 'collaudo'`, `paese` valorizzato.
Nessuna riga `collaudo-anteprima`.

Poi togliere le righe di prova, perché non sono visite vere:

```zsh
npx wrangler d1 execute quotify-metriche --remote --command "DELETE FROM visite WHERE campagna LIKE 'collaudo%'"
```

- [ ] **Passo 10: Le esecuzioni vere — il giorno dopo**

Dopo le 06:00 UTC del giorno successivo (e dopo il primo lunedì per l'indicizzazione):

```zsh
npx wrangler d1 execute quotify-metriche --remote --command "SELECT count(*) giorni, min(giorno) dal, max(giorno) al, sum(visite IS NOT NULL) con_cloudflare, sum(impressioni IS NOT NULL) con_google FROM storico"
npx wrangler d1 execute quotify-metriche --remote --command "SELECT giorno, visite, pagine_viste, impressioni, clic, json_extract(dati,'$.fonti') fonti FROM storico ORDER BY giorno DESC LIMIT 6"
```

Atteso: `con_cloudflare = 28`; `con_google` dal primo giorno con dati di Search Console in poi;
`fonti` con `"ok"`.

**Verifica 8 della specifica** — stesso numero da due letture indipendenti. Scegliere un giorno della
tabella (non ieri) e confrontare con il cruscotto su un giorno solo:

```zsh
cd .. && npm run cruscotto -- 1   # poi leggere visite e pagine viste in cruscotto/index.html
```

Il confronto vale per il giorno intero più recente che il cruscotto copre; se i due numeri non
coincidono, la causa più probabile è la finestra (il cruscotto usa «ultime 24 ore», l'archivio il
giorno UTC): ripetere con una query diretta su quel giorno con `lib/cloudflare.mjs`.

**Verifica 9 della specifica** — CPU e sottorichieste vere, per ciascuno dei tre lavori:

```zsh
DA=$(date -u -v-2d +%Y-%m-%dT%H:%M:%SZ); A=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -s https://api.cloudflare.com/client/v4/graphql -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"query\":\"query(\$a:String!,\$da:Time!,\$b:Time!){viewer{accounts(filter:{accountTag:\$a}){workersInvocationsAdaptive(limit:100,filter:{scriptName:\\\"quotify-archivio\\\",datetime_geq:\$da,datetime_lt:\$b},orderBy:[datetimeHour_ASC]){sum{requests errors subrequests} max{cpuTime} dimensions{datetimeHour status}}}}}\",\"variables\":{\"a\":\"$CLOUDFLARE_ACCOUNT_ID\",\"da\":\"$DA\",\"b\":\"$A\"}}" \
  | python3 -c 'import json,sys; [print(x["dimensions"]["datetimeHour"][:13], x["dimensions"]["status"], "sottorich", x["sum"]["subrequests"], "CPU max %.2f ms" % (x["max"]["cpuTime"]/1000)) for x in json.load(sys.stdin)["data"]["viewer"]["accounts"][0]["workersInvocationsAdaptive"] if x["sum"]["subrequests"]]'
```

Atteso: alle ore 04 e 05 (e 06 del lunedì) `success`, sottorichieste ≤ 45, CPU sotto 10 ms. Se una
CPU supera 10 ms **con costanza**, fermarsi e riportarlo: la specifica ha escluso Workers Paid, quindi
la soluzione va trovata nel disegno, non nel portafoglio.

**Verifica 7 della specifica** — il riempimento dei buchi:

```zsh
npx wrangler d1 execute quotify-metriche --remote --command "DELETE FROM storico WHERE giorno IN (SELECT giorno FROM storico WHERE visite IS NOT NULL ORDER BY giorno LIMIT 3 OFFSET 10)"
```

e il giorno dopo rieseguire la prima query di questo passo: `con_cloudflare` deve essere di nuovo 28.

- [ ] **Passo 11: Commit e storia**

```zsh
git add worker-archivio/wrangler.toml worker-archivio/indice.mjs
git commit -m "feat(metriche): il Worker dell'archiviatore, un cron solo" -m "<righe di attribuzione>"
```

Poi in `history.md`, una sezione per la sessione con: cosa è andato in produzione, i numeri della
verifica 9, e le trappole incontrate. Commit separato `docs(storia): …`.

---

## Copertura della specifica

| Specifica | Compito |
|---|---|
| §4.1 niente cookie; privacy | 2 (nessun campo identificativo), 6 |
| §4.2 cattura lato server, scarto per difetto | 2, 5 |
| §4.3 Worker separato nello stesso repository | 8 |
| §4.4 nessun dato duplicato | 4 (lo schema) |
| §4.5 query fuori dal cruscotto, stessi numeri | 3 |
| §4.6 una richiesta per giorno; Google per data | 3 (`QUERY_GIORNO`), 7 (`lavoroGoogle`) |
| §5.2 un giorno per volta | 3 (`finestraGiorno`), 4 |
| §5.4 Search Console in ritardo | 4 (`RITARDO_GOOGLE`) |
| §5.5 50 sottorichieste, 10 ms | 7 (`MASSIMO_URL`, un lavoro per esecuzione), 8 (`[limits]`, verifica 9) |
| §5.6 nessun `wrangler.toml` nella radice | 8 (Passo 8 via API, Passo 9 deploy invariato) |
| §5.7 un cron solo | 7 (`mestiere`), 8 |
| §6.1, §6.2 schema | 4 |
| §6.3 riscrive, rifà quattro giorni, riempie i buchi | 4 |
| §6.4 il middleware non rompe mai una pagina | 5 |
| §6.5 errori annotati, segreti fuori dai messaggi | 3, 4, 7 |
| Fase 0 | 1 |
| §8 verifiche 1-10 | 1 (1), tutti (2), 5 (5, con un test), 8 (3, 4, 6-10) |
| privacy.html «massimo 26 mesi» | 4 (`istruzionePulizia`), 7, 6 |
