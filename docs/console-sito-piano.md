# Console di controllo del sito — piano di implementazione

> Stato: **proposta, non ancora implementata**. Data: 2026-08-25.
> Origine: serve uno strumento che dica, in ogni momento, cosa è rotto e cosa sta peggiorando
> su quotify.it — senza aprire cinque dashboard diverse e senza fidarsi di quello che c'è nel repo.
> Ricognizione di partenza: §14.

---

## 1. Obiettivo

Una console privata che confronti **quello che il repo dichiara** con **quello che l'edge serve
davvero**, arricchito con i dati reali di Search Console e delle prestazioni, e che conservi
uno storico per rispondere alla domanda "cosa sta peggiorando".

**Non è un CMS.** Pagine e articoli restano in codice. La console legge, non pubblica.

**Non è un clone di SEMrush.** Il valore di SEMrush è un indice di miliardi di pagine e un grafo
dei backlink: dati, non software, e non replicabili. Il valore di questa console è l'opposto —
ha accesso al repo, al build, agli header dell'edge e ai dati proprietari di Search Console.
Su quotify.it sa cose che SEMrush non può sapere.

### Il criterio di successo

Durante la ricognizione sono emersi tre casi in cui il repo dice una cosa e la produzione ne fa
un'altra (§14.1, §14.2, §14.3). Nessuno era visibile leggendo il codice. **La console vale se
avrebbe trovato tutti e tre da sola.** Ogni funzionalità proposta qui sotto va giudicata con
questo metro.

---

## 2. Decisioni già prese (e perché)

Queste sono chiuse. Cambiarle rimette in discussione il resto del piano.

### 2.1 Due motori distinti: gate di build e crawler di produzione

Sono controlli diversi che rispondono a domande diverse, e vanno tenuti separati:

- **Gate di build** — gira su `dist/` durante `npm run build`, **fa fallire il deploy**.
  Copre solo ciò che è deterministico e sotto il tuo controllo: title assente, meta description
  mancante o troppo lunga, canonical assente, `<h1>` assente o duplicato, `href="#"`, immagine
  senza `alt`, JSON-LD non valido, URL in sitemap che non esistono in `dist/`.
  Costo: zero rete, ~200 ms, nessun servizio esterno. **È la fase con il miglior rapporto
  valore/sforzo di tutto il piano.**

- **Crawler di produzione** — gira ogni notte su `https://quotify.it`, **non blocca niente**,
  scrive uno snapshot. Copre ciò che il build non può sapere: header davvero serviti, robots.txt
  davvero servito, redirect, TTFB, link rotti verso l'esterno, differenze fra HTML sorgente e
  HTML servito.

Condividono un modulo di regole comune (`scripts/seo/rules.mjs`), così una regola si scrive
una volta sola. Ma il gate non fa richieste di rete e il crawler non blocca il deploy: mescolarli
significherebbe o un build che fallisce perché Cloudflare ha avuto un singhiozzo, o un controllo
di produzione che nessuno guarda.

### 2.2 Il gate di build fallisce davvero

Un warning che non blocca viene ignorato entro due settimane. Le regole del gate sono divise in
`error` (rompono il build) e `warn` (stampate, non bloccanti), e la lista degli `error` è corta
e indiscutibile — vedi §5.2. Se una regola genera falsi positivi, si sposta a `warn` o si
cancella; non si aggiunge un `--force`.

Eccezione unica: `SEO_GATE=off` come variabile d'ambiente, per sbloccare un hotfix urgente.
Se compare nei log di Cloudflare Pages, è un segnale che una regola è sbagliata.

### 2.3 La console sta dietro Cloudflare Access, non dietro codice di autenticazione

`quotify.it/console/*` protetto da una policy Cloudflare Access (Zero Trust) sulla tua email.
Nessuna pagina di login da scrivere, nessuna sessione da gestire, nessun hash di password nel
repo, nessuna superficie di attacco aggiunta al sito pubblico. Il piano free copre fino a 50
utenti; qui ne serve uno.

In più: `<meta name="robots" content="noindex">` sulle pagine della console e `Disallow: /console/`
in `public/robots.txt` — cintura e bretelle, perché Access già impedisce ai crawler di vedere
qualsiasi cosa.

**Alternativa scartata**: progetto Pages separato su `console.quotify.it`. Più pulito in teoria
(il sito pubblico resta un artefatto 100% statico), ma raddoppia i deploy, i binding e le
configurazioni per un beneficio che con Access è nullo. Se un giorno la console dovesse gestire
segreti di terzi, si rivaluta.

### 2.4 Niente framework nella console

HTML generato lato server dalle Pages Functions, come il resto del sito. Nessun React, nessun
build separato, nessun bundle. Grafici come SVG inline generati lato server.

Il motivo non è ideologico: è che dietro Access, con un solo utente, l'interattività che serve
è "clicca un filtro, ricarica la pagina". Aggiungere una SPA significa aggiungere una toolchain
da mantenere per sempre in cambio di niente.

### 2.5 Lo storico è il prodotto, non un accessorio

"Cosa è rotto adesso" lo dice anche un controllo estemporaneo. **"Cosa sta peggiorando" richiede
serie storiche**, ed è la metà del brief. Quindi D1 dal primo giorno del crawler (Fase 3), non
"aggiungiamo la persistenza dopo".

### 2.6 Nessun dato inventato, nessuna metrica proprietaria

Niente "Quotify SEO Score: 78/100" costruito con pesi arbitrari. Ogni numero mostrato deve avere
una fonte citabile e una data. Dove un valore è una stima e non una misura (il punteggio GEO,
§9), la console lo dichiara esplicitamente nell'interfaccia.

Corollario: se Search Console non ha ancora dati per una pagina, la console scrive "nessun dato",
non "0 impression".

---

## 3. Fase 0 — Search Console ✅ (completata il 2026-08-25)

**`t0` = 2026-08-25.** È la data di riferimento di ogni confronto storico che la console farà.

Stato: proprietà **Dominio** `quotify.it` verificata via record TXT ("Provider del nome di
dominio"); sitemap inviata e letta lo stesso giorno, stato **Riuscita**, 5 URL rilevate.

### ⚠️ Falso allarme: "0 pagine indicizzate"

Subito dopo la verifica la schermata Introduzione mostrava **0 pagine indicizzate, 1 non
indicizzata**. Ne è stata tratta la conclusione che il sito fosse invisibile a Google. **Era
sbagliata.** Il report Indicizzazione → Pagine, aperto poco dopo, dichiarava
*"Elaborazione dei dati in corso"*: quegli zeri erano un report non ancora elaborato, non una
misura.

**Stato reale**, accertato con Controllo URL (che interroga l'indice in diretta e funziona subito):

| URL | Stato | Rilevata tramite |
|---|---|---|
| `/` | **indicizzata** — ultima scansione 25/08 13:41, Googlebot per smartphone | link esterni |
| `/cookie` | Rilevata, non ancora indicizzata | `quotify.it/sitemap.xml` |
| `/termini` | Rilevata, non ancora indicizzata | `quotify.it/sitemap.xml` |
| `/privacy` | sconosciuta a Google | — |
| `/assistenza` | sconosciuta a Google | — |

`Scansione consentita? Sì` · `Recupero pagina: Esito positivo` · `Indicizzazione consentita? Sì`.
Nessun ostacolo tecnico, in nessuna delle cinque.

**"Rilevata, ma attualmente non indicizzata"** è la diagnosi benigna: Google sa che esistono e non
ci è ancora andato. Non è *"Sottoposta a scansione: attualmente non indicizzata"*, che avrebbe
significato una valutazione negativa sul contenuto. E il campo Sitemap è passato da
*"Errore temporaneo di elaborazione"* (home, ore 13:41) a `quotify.it/sitemap.xml` (cookie e
termini, ore 14:20): **la sitemap sta propagando mentre la si guarda**.

**Conclusione**: non esisteva nessun problema di indicizzazione. C'era un sito nuovo che nessuno
aveva mai presentato a Google. Il lavoro tecnico di §4 resta valido, ma va inquadrato come
fondamenta messe a posto prima che servissero, non come un incendio spento.

### Come Google ha trovato il sito: solo link spam

Le pagine di referral della home sono `saint-laser.com/lasernews/...`,
`allbusinesdirectory.com/most-visited-website-list-...` e
`strawbird.org/quotesAbout/?genre=health` — due directory automatiche e un aggregatore di
citazioni che ha probabilmente agganciato il dominio per assonanza con "quotes".

**Non esiste un solo link in entrata legittimo.** Non è un danno (Google ignora questa roba, non
serve disconoscerla), ma fissa un vincolo per il piano: **zero autorità in entrata**, e nessuna
ottimizzazione tecnica la sostituisce.

### ⚠️ Il backfill di Search Console resta da verificare

Più sopra questo piano afferma che Search Console non ha storico precedente alla verifica.
**L'affermazione non è stata verificata** e va trattata come non confermata: al 25/08 sia
Rendimento sia Indicizzazione → Pagine rispondono *"Elaborazione dei dati in corso.
Ricontrolla tra un giorno o due"*. La risposta arriva quando i report si popolano.
Se compariranno dati precedenti al 25/08, l'affermazione era falsa e va corretta.

L'urgenza di verificare la proprietà restava comunque giustificata, ma per un motivo più debole
di quello dichiarato.

### Il dato ancora mancante

**Impression e query della home negli ultimi 3 mesi.** È l'unica cosa che decide se il collo di
bottiglia è la copertura di contenuto (§14.9) o altro. Non disponibile prima del 26-27/08.

---

### 3.1 Storia della fase (per riferimento)

Il report Performance di Search Console accumula i dati **dal momento della verifica della
proprietà**; non esiste backfill dello storico precedente. Il sito è online e non è mai stato
verificato: ogni giorno che passa è uno storico che non recupererai. È l'unica cosa in questo
piano che ha un costo per il ritardo.

Passi:

1. Aggiungere in Search Console una proprietà **Dominio** (`quotify.it`), non prefisso URL:
   copre `http`, `https`, `www` e tutti i sottodomini con un solo record.
2. Verifica via record DNS TXT su Cloudflare (il dominio è già lì: 5 minuti).
3. Inviare `https://quotify.it/sitemap.xml`.
4. Richiedere l'indicizzazione delle 5 URL note.
5. Annotare in `docs/` la data esatta di verifica: è il `t0` di ogni confronto storico che la
   console farà.

> `app.quotify.it` è coperto dalla proprietà Dominio ma non va nella sitemap del sito pubblico
> e non riguarda questa console.

---

## 4. Fase 1 — Chiudere i buchi già noti

La console serve a **trovare** problemi. Questi li abbiamo già trovati (§14): correggerli prima
significa che il primo snapshot del crawler sarà una baseline pulita e non un muro di rosso.

### 4.1 ✅ RISOLTO il 2026-08-25 — gli AI crawler

**Stato finale, verificato sul file servito da quotify.it:** blocco managed Cloudflare **assente**,
`Content-Signal: search=yes, ai-input=yes, ai-train=no`, 27 crawler verificati con 0 discrepanze.

L'interruttore **non era dove indicava la documentazione**. Security Settings → Traffico bot
conteneva altro: le nuove policy AI (Ricerca / Agente / Addestramento) erano tutte su
"Consenti", e l'impostazione legacy "Blocca i bot IA" era già disattivata. Nessuna delle due
bloccava. Il responsabile era un terzo interruttore, **AI Crawl Control → Panoramica →
"Robots.txt gestito"**, in una pagina diversa. Vale la pena annotarlo: seguendo la
documentazione si sarebbe spenta la cosa sbagliata.

#### Il difetto emerso solo dopo

Con il file finalmente servito, `Applebot-Extended` risultava **ammesso** nonostante il
`Disallow: /`. Causa: un parser che fa match per sottostringa incontra prima il gruppo
`Applebot` (che è `Allow`) e si ferma, perché `"applebot"` è contenuto in
`"applebot-extended"`. RFC 9309 impone il match più specifico e non avrebbe sbagliato, ma non
tutti i crawler sono conformi — e `Applebot-Extended` è proprio l'opt-out di Apple
dall'addestramento: sarebbe stato l'unico buco nella politica.

Corretto riordinando i gruppi (specifici prima dei generici) e **blindato nel gate**:
`scripts/seo/robots.mjs` dichiara la politica attesa crawler per crawler e la verifica con due
letture, RFC 9309 e ingenua. Il build fallisce se una si discosta dalla politica **o se le due
divergono fra loro** — è la divergenza a rivelare il problema di ordine, che nessuna delle due
letture da sola segnalerebbe. Collaudato reintroducendo il bug: il build si ferma.

### 4.1b La decisione originale (per riferimento)

In produzione Cloudflare blocca ClaudeBot, GPTBot, Google-Extended, CCBot, Bytespider,
meta-externalagent, Amazonbot, Applebot-Extended. **Finché resta così, il punto GEO del brief è
irrealizzabile** e le Fasi 8-9 sono lavoro sprecato.

Tre opzioni, la scelta è di prodotto e non tecnica:

| Opzione | Effetto | Nota |
|---|---|---|
| Disattivare il managed robots.txt | Tutti gli AI crawler tornano ammessi | Massima citabilità, contenuto usato anche per training |
| Tenerlo, ammettere selettivamente | `Content-Signal: ai-train=no, ai-input=yes` + allow espliciti | Compromesso: citabile senza addestrare |
| Lasciare com'è | Nessuna citazione dagli assistenti | Coerente solo se GEO non interessa più |

**Scelta: opzione 2.** `Google-Extended` e `OAI-SearchBot` ammessi (grounding, ossia citazioni),
`Content-Signal: ai-train=no` mantenuto. Si ottiene l'obiettivo del brief senza regalare il corpus
per l'addestramento.

Da fare nel dashboard: **AI Crawl Control** → rimuovere il `Disallow` per `Google-Extended` e
`OAI-SearchBot` (e valutare `PerplexityBot`), lasciare bloccati i crawler di solo training
(`CCBot`, `Bytespider`, `Amazonbot`, `meta-externalagent`, `ClaudeBot`).

> Il token API in `~/vault/bin/cf-env.sh` **non ha lo scope** per Bot Management né per i ruleset
> WAF (verificato: `Authentication error` su `/bot_management` e su
> `/rulesets/phases/http_request_firewall_custom/entrypoint`). Questa modifica va fatta a mano
> dal dashboard, oppure va emesso un token con scope più ampio.

Vincolo tecnico da verificare in fase di esecuzione: il blocco managed viene **anteposto** al
`robots.txt` del repo e il primo gruppo che matcha vince per molti crawler. Non basta scrivere
`Allow` più in basso nel file: va agito sull'impostazione di zona.

### 4.2 Correzioni di codice — ✅ parte codice completata il 2026-08-25

**Gate SEO: 14 errori → 0.** `npm run build` passa, restano 9 avvisi non bloccanti.

| # | Intervento | Stato |
|---|---|---|
| 1 | Canonical assoluto | ✅ 5 pagine (404 esclusa: è `noindex`) |
| 2 | Open Graph completo + Twitter card | ✅ 5 pagine, `og:image` assoluto |
| 3 | Immagine OG 1200×630 dedicata | ✅ `public/og-quotify.jpg`, 124 KB. Sorgente versionata in `scripts/seo/og-template.html` |
| 4 | JSON-LD | ✅ **generato dal DOM** in build, vedi §4.4 |
| 5 | Link morti | ✅ 8 → 0: loghi → `/`, colonna "Risorse" e Changelog rimossi (footer da 4 a 3 colonne) |
| 6 | Stat leggibili dai crawler | ✅ valore finale nell'HTML, il JS azzera solo un attimo prima di animare; rispetta `prefers-reduced-motion` |
| 7 | Numeri non verificabili | ⏳ **decisione tua**, §10.3 |
| 8 | Cloudflare Web Analytics | ✅ beacon installato nel repo. Il sito era registrato dal 31/03 con `auto_install: true` e l'iniezione non è **mai** avvenuta: 5 mesi in cui `cookie.html` dichiarava un analytics inesistente. Resta da spegnere `auto_install` (non modificabile via API) |
| 9 | Email obfuscation | ✅ risolto togliendo `/cdn-cgi/` dal `Disallow` invece di spegnere l'offuscamento: Googlebot decodifica, gli harvester ingenui no |
| 10 | Browser Cache TTL | ✅ `browser_cache_ttl: 14400 → 0` via API. Verificato: `/` ora serve `max-age=0`, `llms/robots/sitemap` `max-age=3600` |
| 11 | `llms.txt` | ✅ **generato dal build**, 3823 byte |
| 12 | `always_use_https` | ✅ `off → on` via API |
| 13 | WAF `not cf.client.bot` | ✅ espressione ora `(http.host eq "quotify.it" and ip.src.country eq "NL" and not cf.client.bot)`. Nota: al momento la regola intercetta **2 richieste / 0,0%** contro le 1,64k / 41,3% stimate alla creazione — l'ondata olandese era con ogni probabilità PetalBot, sparito da solo dopo il `Disallow` del 24/08 |
| 14 | `favicon.ico` e `apple-touch-icon.png` | ✅ erano 404. AI Crawl Control ne segnalava 88 in 24 ore. Creati; il gate ora avvisa se mancano |

Inoltre: `_headers` con `Content-Type` e cache per `/llms.txt` e `/*.jpg`; `lastmod` della sitemap
portato a `2026-08-25`.

### 4.4 Dati strutturati generati, non scritti a mano

Scostamento deliberato dal piano originale, che diceva di scrivere il JSON-LD dentro `index.html`.

`scripts/seo/jsonld.mjs` gira dopo `vite build` ed **estrae dal DOM di `dist/index.html`** le 5
FAQ (da `.faq-item`) e i 2 piani con i prezzi (da `.pricing-card`), poi costruisce il grafo
`Organization` + `WebSite` + `SoftwareApplication`/`Offer` + `FAQPage` e lo inietta prima di
`</head>`.

Il motivo: dati strutturati che non corrispondono al contenuto visibile sono una violazione
delle linee guida di Google, non un'ottimizzazione. Scritti a mano, divergono al primo cambio di
prezzo. Estratti dal DOM, la divergenza è **impossibile per costruzione**. Se i selettori non
trovano nulla lo script esce con codice 1 e il build si ferma: preferibile a generare un grafo
vuoto in silenzio.

Stesso principio per `scripts/seo/llms.mjs`, che genera `llms.txt` da titoli, description,
prezzi e FAQ delle pagine reali.

### 4.2b Elenco originale degli interventi

| # | Intervento | Dove |
|---|---|---|
| 1 | `<link rel="canonical">` assoluto su tutte e 5 le pagine | i 5 `.html` |
| 2 | Open Graph completo: `og:title`, `og:description`, `og:url`, `og:type`, `og:locale=it_IT`, `og:site_name`, `og:image` **assoluto** + `twitter:card` | i 5 `.html` |
| 3 | Immagine OG dedicata 1200×630 (oggi c'è un'icona PWA quadrata) | `public/og-quotify.png` |
| 4 | JSON-LD: `Organization` + `WebSite` (tutte), `SoftwareApplication` + `Offer` €0/€6,99 e `FAQPage` sulle 5 FAQ esistenti (home) | `index.html` |
| 5 | Eliminare i 7 `href="#"`: loghi → `/`, voci non esistenti rimosse dal footer | `index.html:32,1182,1203,1211-1215` |
| 6 | Stat nell'HTML con il valore finale (`500`, non `0`), il JS anima **da** 0 **verso** il valore già presente | `index.html:163,169` + `main.js:441-460` |
| 7 | Decidere sui numeri "500 freelance / 10.000 fatture": se non sono verificabili, sostituirli o rimuoverli (§9.3) | `index.html:161-176` |
| 8 | Beacon Cloudflare Web Analytics + `script-src`/`connect-src` per `cloudflareinsights.com` in CSP | i 5 `.html`, `public/_headers:18` |
| 9 | Email di contatto: disattivare l'Email Obfuscation **oppure** togliere `/cdn-cgi/` da `Disallow` — oggi i crawler leggono `[email protected]` | `public/robots.txt:7` / zona CF |
| 10 | **Caching → Configuration → Browser Cache TTL** da `4 ore` a **"Respect Existing Headers"**. Confermato via API: `browser_cache_ttl = 14400`. Non è la regola cache `cache-html-landing`, che è corretta (TTL vuoti = rispetta origine) | zona CF |
| 12 | `always_use_https` è **off** (verificato via API). Accenderlo: oggi il redirect http→https arriva da Pages, non dalla zona | zona CF |
| 13 | WAF `anti-scraper-nl`: aggiungere `and not cf.client.bot` all'espressione (§4.3) | zona CF |
| 11 | `llms.txt` (§9.2) | `public/llms.txt` |

Il punto 8 non è cosmetico: `cookie.html:80` **dichiara già** che il sito usa Cloudflare Web
Analytics, e non è vero. È anche il prerequisito per avere dati di campo sui Core Web Vitals (§8).

### 4.3 ⚠️ La regola WAF `anti-scraper-nl` può bloccare crawler legittimi

```
(http.host eq "quotify.it" and ip.src.country eq "NL")  →  Managed Challenge
```

La motivazione è solida — 41,3% del traffico in 24 ore da un solo paese è quasi certamente
scraping, e la regola non va rimossa. Il problema è che è **cieca rispetto ai bot verificati**:
le regole personalizzate WAF vengono valutate prima di qualunque esenzione per i crawler noti,
quindi un bot legittimo che esce da un datacenter in Olanda riceve una sfida JavaScript e vede
una pagina di challenge invece del contenuto. Silenziosamente: nessun log lo segnala come
"crawler perso".

Rilevante perché diverse infrastrutture che servono a questo piano hanno egress in EU/AMS —
i crawler AI di §4.1 e alcuni servizi di misurazione fra cui PageSpeed Insights.

**Correzione a costo zero**, che non indebolisce l'anti-scraping (uno scraper non è un bot
verificato):

```
(http.host eq "quotify.it" and ip.src.country eq "NL" and not cf.client.bot)
```

Il crawler della console (Fase 3) gira su Workers Cloudflare e non è toccato dalla regola, ma
**non deve essere l'unico a passare**: se lui vede il sito e Googlebot no, la console dirà
"tutto ok" mentre il sito è invisibile. Da qui il controllo di §6.3 punto 8.

---

## 5. Fase 2 — Gate SEO in build

### 5.1 Meccanica

`scripts/seo/gate.mjs`, eseguito da `npm run build` come step successivo a `vite build`:

```json
"scripts": {
  "build": "vite build && node scripts/seo/gate.mjs dist"
}
```

Legge ogni `dist/**/*.html` con un parser HTML vero (`node-html-parser`, ~40 KB, zero
dipendenze transitive pesanti — **non** regex: gli attributi su più righe le rompono, come
è successo durante la ricognizione con l'`<h1>` di `index.html:128`).

Uscita: exit code 1 + elenco `file:riga — regola — cosa fare`. Cloudflare Pages fallisce il
deploy.

### 5.2 Le regole

**Errori (bloccano il deploy)**

| Regola | Perché blocca |
|---|---|
| `<title>` assente o vuoto | pagina inutilizzabile in SERP |
| `<meta name="description">` assente o vuota | snippet generato a caso da Google |
| `<link rel="canonical">` assente o relativo | duplicati indicizzati |
| `<h1>` assente, oppure più di uno | struttura ambigua |
| `<html lang>` assente | mercato monolingua italiano |
| `<img>` senza attributo `alt` (`alt=""` è valido per le decorative) | accessibilità + immagini |
| `href="#"` o `href=""` | link morto pubblicato |
| `<script type="application/ld+json">` non parsabile o senza `@type` | dati strutturati rotti |
| `og:image` / `og:url` con URL relativo | anteprima social rotta (bug già presente, `index.html:9`) |
| URL in `sitemap.xml` senza file corrispondente in `dist/` | sitemap che promette 404 |
| Pagina in `dist/` non presente in `sitemap.xml` e senza `noindex` | pagina orfana |
| Link interno verso un path che non esiste in `dist/` | 404 interno |

**Avvisi (stampati, non bloccanti)**

- `<title>` fuori da 30-60 caratteri, `description` fuori da 70-160
- `title` o `description` duplicati fra pagine
- salto di livello negli heading (h2 → h4)
- pagina sotto le 300 parole di testo visibile
- asset in `dist/` sopra i 200 KB non compressi
- `<a target="_blank">` senza `rel="noopener"`

### 5.3 Verificabilità — ✅ collaudato il 2026-08-25

| Collaudo | Atteso | Risultato |
|---|---|---|
| `npm run build` sul sito attuale | exit 1, elenca i problemi reali | ✅ exit 1, 14 errori + 15 avvisi |
| `<title>` rimosso da `privacy.html` | exit 1 citando `privacy.html` | ✅ `privacy.html — <title> assente o vuoto [title-mancante]` |
| `SEO_GATE=off npm run build` | exit 0 con avviso in chiaro | ✅ exit 0 |

Resta il criterio finale: **dopo la Fase 1b il build deve passare pulito**.

### 5.4 File consegnati

| File | Righe | Contenuto |
|---|---|---|
| `scripts/seo/lib.mjs` | 108 | `fileToUrl`, `urlToFileCandidati`, numeri di riga, testo visibile, parsing sitemap — condiviso con il futuro crawler (§2.1) |
| `scripts/seo/rules-page.mjs` | 163 | 19 controlli su singola pagina |
| `scripts/seo/rules-site.mjs` | 98 | link interni, sitemap, orfane, duplicati, peso asset, segreti in `dist/` |
| `scripts/seo/gate.mjs` | 71 | CLI, output raggruppato per file, `--json`, exit code |

Dipendenza aggiunta: `node-html-parser` (devDependency). **Non** regex: gli attributi su più
righe le rompono — è successo davvero durante la ricognizione con l'`<h1>` di `index.html:128`,
che una regex `<h1[^>]*>` non trova.

`npm run seo` esegue il gate da solo, senza rifare il build.

### 5.5 I 14 errori trovati sul sito attuale

| Regola | Occorrenze | Dove |
|---|---|---|
| `canonical-mancante` | 5 | tutte le pagine indicizzabili |
| `link-morto` | 8 | `index.html:33,1183,1204,1212,1213,1214,1215,1216` |
| `og-relativo` | 1 | `index.html:11` — `og:image="/pwa-512x512.png"` |

Più 15 avvisi: Open Graph incompleto su tutte le pagine, 5 title sotto i 30 caratteri,
`assistenza.html` a 100 parole, `main-*.js` a 622 KB, `pwa-512x512.png` a 259 KB.

---

## 6. Fase 3 — Crawler di produzione e storico

### 6.1 Architettura

Le Pages Functions non hanno cron trigger. Si replica il pattern già in uso nell'app
(`cron-worker/index.ts` + endpoint protetto, vedi `functions/api/reminders/send-push.ts`):

```
Worker "quotify-site-cron"  ──(1×/giorno, 04:00 UTC)──▶  POST /console/api/crawl
                                                          (in allowlist Access,
                                                           protetto da header segreto)
                                                                  │
                                                                  ▼
                                                    fetch di ogni URL della sitemap
                                                    + robots.txt + un URL inesistente
                                                                  │
                                                                  ▼
                                                              D1 snapshot
```

### 6.2 Modello dati — `migrations/001_console.sql`

```sql
-- Un'esecuzione del crawler.
CREATE TABLE IF NOT EXISTS crawls (
    id          TEXT PRIMARY KEY,
    started_at  TEXT NOT NULL,           -- ISO8601 UTC
    finished_at TEXT,
    trigger     TEXT NOT NULL,           -- 'cron' | 'manuale'
    commit_sha  TEXT,                    -- CF_PAGES_COMMIT_SHA al momento del crawl
    esito       TEXT NOT NULL DEFAULT 'in_corso'  -- 'ok' | 'parziale' | 'errore'
);

-- Una riga per URL per crawl. È qui che vive lo storico.
CREATE TABLE IF NOT EXISTS page_snapshots (
    id            TEXT PRIMARY KEY,
    crawl_id      TEXT NOT NULL REFERENCES crawls(id) ON DELETE CASCADE,
    url           TEXT NOT NULL,
    http_status   INTEGER NOT NULL,
    redirect_to   TEXT,
    ttfb_ms       INTEGER,
    bytes_html    INTEGER,
    -- Metadati estratti
    title         TEXT,
    description   TEXT,
    canonical     TEXT,
    h1            TEXT,
    n_h1          INTEGER,
    lang          TEXT,
    robots_meta   TEXT,
    og            TEXT NOT NULL DEFAULT '{}',   -- JSON
    jsonld_types  TEXT NOT NULL DEFAULT '[]',   -- JSON: ['Organization','FAQPage']
    n_parole      INTEGER,
    -- Header realmente serviti: è il cuore del confronto intenzione/realtà
    headers       TEXT NOT NULL DEFAULT '{}',   -- JSON
    -- Hash del testo visibile: se cambia senza un commit, qualcosa non torna
    content_hash  TEXT,
    UNIQUE (crawl_id, url)
);
CREATE INDEX IF NOT EXISTS idx_snap_url ON page_snapshots(url, crawl_id);

-- Un problema aperto. Ha una vita: nasce, resta, si chiude.
CREATE TABLE IF NOT EXISTS findings (
    id           TEXT PRIMARY KEY,
    chiave       TEXT NOT NULL,          -- 'regola|url' — identità stabile del problema
    regola       TEXT NOT NULL,
    gravita      TEXT NOT NULL,          -- 'critico' | 'alto' | 'medio' | 'basso'
    url          TEXT,
    dettaglio    TEXT,
    aperto_il    TEXT NOT NULL,
    chiuso_il    TEXT,
    visto_ultima TEXT NOT NULL,
    UNIQUE (chiave)                      -- ⬅️ un problema che persiste non genera N righe
);
CREATE INDEX IF NOT EXISTS idx_find_aperti ON findings(chiuso_il, gravita);

-- Link trovati durante il crawl, per lo stato dei link rotti.
CREATE TABLE IF NOT EXISTS links (
    crawl_id  TEXT NOT NULL REFERENCES crawls(id) ON DELETE CASCADE,
    da_url    TEXT NOT NULL,
    a_url     TEXT NOT NULL,
    tipo      TEXT NOT NULL,             -- 'interno' | 'esterno' | 'ancora'
    status    INTEGER,                   -- null se non verificato
    PRIMARY KEY (crawl_id, da_url, a_url)
);
```

`UNIQUE(chiave)` su `findings` è la garanzia strutturale che un problema che dura tre mesi resti
una riga con `aperto_il` vecchia, e non 90 righe. È quello che rende possibile la domanda "da
quanto è rotto?".

### 6.3 I controlli che solo il crawler può fare

Sono quelli che avrebbero trovato i tre problemi di §14, e sono la ragione d'essere di questa fase:

1. **Header serviti ≠ header dichiarati** — confronta la risposta reale con le regole parsate da
   `public/_headers`. Avrebbe trovato §14.2 (`max-age` riscritto a 14400).
2. **robots.txt servito ≠ robots.txt del repo** — diff testuale. Avrebbe trovato §14.1
   (il blocco managed di Cloudflare anteposto).
3. **Beacon dichiarato ma assente** — cerca nell'HTML servito gli script che i documenti legali
   dichiarano. Avrebbe trovato §14.3.
4. HTML servito ≠ HTML in `dist/` a parità di commit (iniezioni dell'edge, come
   `email-decode.min.js`).
5. Stato dei redirect: `/pagina.html` → 308, `www` → 301, un URL inesistente → 404.
6. Link esterni rotti (con `HEAD`, rate-limitato, esclusi quelli visti sani da meno di 7 giorni).
7. Sitemap: ogni `<loc>` risponde 200 e non è `noindex`.
8. **Fetch con gli User-Agent dei crawler reali** (Googlebot, Google-Extended, OAI-SearchBot,
   PerplexityBot): la risposta è la pagina o una challenge? È l'unico modo per accorgersi che
   una regola WAF o di zona sta nascondendo il sito a chi conta (§4.3).

### 6.4 Idempotenza

Il crawler può essere rieseguito a mano nello stesso giorno. Ogni esecuzione crea un `crawl_id`
nuovo — gli snapshot si accumulano, va bene. I `findings` invece fanno `INSERT ... ON CONFLICT
(chiave) DO UPDATE SET visto_ultima = ...`: un problema che c'era ieri e c'è oggi resta la
stessa riga.

Retention: `page_snapshots` oltre i 400 giorni cancellati dallo stesso cron. D1 free ha 5 GB;
5 pagine × 1 snapshot/giorno non li avvicina nemmeno, ma la regola va scritta ora perché quando
le pagine saranno 200 sarà tardi.

---

## 7. Fase 4 — La console: shell e vista "Salute"

`GET /console` — una sola pagina, che risponde alla domanda del brief: *cosa è rotto e cosa sta
peggiorando*.

```
┌─ quotify.it ────────────────── ultimo crawl: oggi 04:12 · commit 78af4a4 ─┐
│                                                                            │
│  🔴 2 critici     🟠 5 alti     🟡 9 medi        ▁▂▂▄▇█  ← trend 30gg      │
│                                                                            │
│  APERTI DA PIÙ TEMPO                                                       │
│  🔴  AI crawler bloccati dal robots.txt servito       da 47 giorni         │
│  🟠  Cache-Control servito ≠ dichiarato in _headers   da 47 giorni         │
│  🟡  index.html — 7 link href="#"                     da 12 giorni         │
│                                                                            │
│  NOVITÀ DALL'ULTIMO CRAWL                                                  │
│  + /privacy — canonical rimosso                                            │
│  − /  — og:image assoluto (risolto)                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

Regole di interfaccia, non negoziabili:

- **"Da quanto" prima di "cosa"**. Un problema aperto da 47 giorni è più urgente di uno di ieri
  a parità di gravità, perché significa che non lo stai vedendo.
- **Il diff dall'ultimo crawl è la sezione che si guarda ogni giorno.** Tutto il resto è
  consultazione.
- Ogni riga linka al dettaglio della pagina e cita la fonte del dato con la data.

`GET /console/pagina?url=...` — scheda di una URL: metadati attuali, storico dei cambiamenti
(diff del `content_hash`), header serviti, findings aperti, e — dalle fasi successive — le sue
query e le sue prestazioni.

---

## 8. Fase 5 — Search Console

### 8.1 Autenticazione

**Service account Google + JWT**, non OAuth con refresh token utente.

Motivo: un refresh token utente scade, va rinnovato a mano e prima o poi rompe il cron di notte
senza che nessuno se ne accorga. Search Console permette di aggiungere l'email di un service
account come utente della proprietà: da lì è server-to-server, non scade, non richiede
interazione.

Passi: creare il service account su Google Cloud → abilitare la Search Console API → aggiungere
l'email del service account come utente **Full** sulla proprietà Dominio → mettere la chiave
privata in un secret del Worker (mai nel repo, mai in `wrangler.toml`).

### 8.2 Cosa si tira giù

`searchanalytics.query`, un pull al giorno, che copre tutto il brief:

| Dimensioni | Serve a |
|---|---|
| `date` | serie storica di impression/click/CTR/posizione |
| `page` | quali pagine portano traffico |
| `query` | quali ricerche portano traffico |
| `page` + `query` | quale pagina risponde a quale ricerca — **il dato più utile che esista** |
| `device` | mobile vs desktop |

Vincoli reali, da tenere presenti nel codice e nell'interfaccia:
- ritardo di 2-3 giorni sui dati (la console mostra sempre la data effettiva del dato)
- 16 mesi di storico massimo (irrilevante qui: si parte da zero)
- righe filtrate per privacy sulle query rare — i totali per query non tornano mai con il totale
  di pagina, e **non è un bug**: va scritto nell'interfaccia, altrimenti lo si ridebugga ogni sei mesi
- 25.000 righe per richiesta, paginazione con `startRow`

Tabelle: `gsc_daily(data, pagina, query, device, impression, click, posizione)` con
`PRIMARY KEY` composita, riscritta in upsert sugli ultimi 5 giorni a ogni pull (i dati di
Google si assestano per qualche giorno dopo la prima pubblicazione).

### 8.3 "Pagine che perdono posizioni"

La domanda del brief. Definizione operativa, da fissare ora per non discuterla dopo:

> Una pagina "sta peggiorando" se la posizione media degli ultimi 7 giorni è peggiorata di
> **almeno 3 posizioni** rispetto ai 7 giorni precedenti, **e** aveva almeno 30 impression nel
> periodo di confronto.

La soglia sulle impression serve a non far urlare la console per una query vista due volte.
Le stesse regole si applicano per query, non solo per pagina.

---

## 9. Fase 6 — Prestazioni

Due fonti, perché nessuna delle due da sola basta.

### 9.1 Laboratorio — PageSpeed Insights API

Funziona dal primo giorno, senza traffico. Un run per URL per giorno, mobile e desktop.
Restituisce LCP, CLS, TBT, il punteggio Lighthouse e — cosa più utile — **l'elenco delle
opportunità con il peso in KB e ms**, che è ciò che serve per decidere se i 621 KB di Three.js
(§14.7) vanno via.

25.000 richieste/giorno con chiave gratuita: 10 URL × 2 form factor = 20. Nessun problema.

Attenzione: i numeri di laboratorio oscillano fra un run e l'altro. La console mostra la
**mediana degli ultimi 5 run**, mai il singolo valore, e il singolo run solo nel dettaglio.

### 9.2 Campo — Cloudflare Web Analytics

Prerequisito: beacon installato (Fase 1, punto 8). Lettura via GraphQL Analytics API
(`rumPageloadEventsAdaptiveGroups`), che restituisce i percentili p75 di LCP, INP e CLS per path
— che è esattamente la definizione ufficiale dei Core Web Vitals.

Diventa significativo solo con abbastanza visite. **Finché il campione è sotto una soglia minima
(indicativamente 100 pageview nel periodo) la console scrive "campione insufficiente", non un
numero.** Vedi §2.6.

**CrUX è escluso di proposito**: richiede un volume di traffico che il sito oggi non ha, e
interrogarlo per ottenere "nessun dato" ogni giorno non aggiunge niente rispetto al beacon
proprietario.

### 9.3 Peso degli asset

Dal crawler, non da servizi esterni: per ogni asset referenziato, dimensione grezza e
`content-encoding` reale (durante la ricognizione: 621 KB → 176 KB in brotli). Allarme quando
un asset cresce di oltre il 15% rispetto al crawl precedente — è così che si intercetta la
dipendenza aggiunta per sbaglio.

---

## 10. Fase 7 — GEO

### 10.1 Cosa è misurabile e cosa no

**Misurabile** (fatti, dal crawler):
- gli AI crawler sono ammessi dal `robots.txt` **servito**? (§14.1 — oggi: no)
- `llms.txt` esiste e risponde 200? (oggi: 404, verificato)
- il contenuto è nell'HTML servito o richiede JavaScript? (oggi: nell'HTML — è un punto di forza)
- ci sono dati strutturati validi? (oggi: nessuno)
- esistono contatti e attribuzione in chiaro? (oggi: no, §14.4)

**Stimabile, non misurabile** (euristica, e dichiarata tale nell'interfaccia):
- risposte autoconsistenti: ogni `<h2>` è seguito entro 2 paragrafi da una risposta che regge
  fuori contesto? È così che un assistente estrae una citazione
- densità di fatti verificabili: cifre con fonte e data (aliquota 5%/15%, soglia 85.000 €,
  coefficiente 78%) vs affermazioni promozionali
- presenza di date di ultimo aggiornamento visibili

**Non misurabile, e non lo faremo fingendo il contrario**: quante volte gli assistenti citano
davvero quotify.it. Nessun fornitore espone il dato. Interrogare periodicamente le API dei
modelli con un paniere di domande è tecnicamente fattibile, costa, e produce un numero rumoroso
che varia fra un run e l'altro senza che tu abbia cambiato niente. **Fuori dallo scopo di questo
piano**; eventualmente un esperimento separato, etichettato come tale.

### 10.2 `llms.txt`

`public/llms.txt`, generato dal build a partire dalle pagine reali — non scritto a mano, perché
un file a mano diverge dal sito entro un mese. Contiene: cosa è Quotify in tre righe, a chi
serve, prezzi con data, elenco delle pagine con una riga di descrizione ciascuna, contatti.

Il gate di build (Fase 2) verifica che ogni URL citata in `llms.txt` esista in `dist/`.

### 10.3 Le affermazioni non verificabili

"500+ freelance attivi", "10.000+ fatture emesse", "99.9% uptime garantito"
(`index.html:161-176`) sono, in ottica GEO, il tipo esatto di affermazione che un assistente non
citerà — e se lo facesse, sarebbe peggio. Due strade: sostituirle con fatti verificabili sul
regime forfettario (che sono citabilissimi), o renderle vere e datate ("dati al 31/12/2026").

Il crawler segnala come `basso` ogni numero presentato senza fonte né data.

---

## 11. Fase 8 — Vista d'insieme e allerte

Chiude il cerchio del brief: *"dimmi in ogni momento cosa è rotto e cosa sta peggiorando"*.

- **Digest settimanale via email** (lunedì): findings nuovi, findings chiusi, pagine che perdono
  posizioni (§8.3), asset cresciuti, CWV peggiorati. Solo se c'è qualcosa da dire — un'email
  vuota ogni lunedì insegna a ignorare le email di lunedì.
- **Allerta immediata** solo per i critici: una pagina passata a 404 o `noindex`, il sito giù,
  la sitemap rotta, gli AI crawler bloccati. Via email; se serve, via push riusando
  l'infrastruttura dell'app.
- `GET /console/api/stato` → JSON con il conteggio dei findings per gravità, così è
  interrogabile da fuori senza aprire la pagina.

---

## 12. Fasi di lavoro

| # | Fase | Contenuto | Verificabile da solo? |
|---|---|---|---|
| 0 | Search Console | Proprietà Dominio verificata, sitemap inviata, `t0` annotato | sì — dati che iniziano ad arrivare |
| 1a | ✅ Decisione AI crawler presa | §4.1 — citazione sì, training no. Resta da applicare nel dashboard | sì — `curl /robots.txt` |
| 1b | Correzioni note | §4.2, 11 interventi | sì — nuovo `curl` sulle pagine |
| 2 | ✅ Gate di build | `scripts/seo/`, 4 file, agganciato a `npm run build` | fatto e collaudato, §5.3 |
| 3 | Crawler + D1 | Worker cron, migrazione 001, 7 controlli di §6.3 | sì — righe in D1 |
| 4 | Console | Access, shell, vista Salute, dettaglio pagina | sì — la pagina si apre e mostra i findings |
| 5 | Search Console API | Service account, pull giornaliero, viste query/pagina, "sta peggiorando" | sì — dati reali in console |
| 6 | Prestazioni | PSI lab + CF RUM + peso asset | sì |
| 7 | GEO | Controlli fattuali + `llms.txt` generato + euristica citabilità | sì |
| 8 | Allerte | Digest settimanale, allerta critici, `/api/stato` | sì |

Le Fasi 0, 1a e 1b **non dipendono da nulla** e vanno fatte subito. La Fase 2 non dipende da
Cloudflare né da Google e produce valore permanente da sola: se il piano si fermasse lì, avresti
comunque impedito che una pagina senza title finisca online.

Dalla Fase 3 in poi ogni fase aggiunge una scheda alla console già esistente. Nessuna richiede
di rifare quelle prima.

---

## 13. Rischi

| Rischio | Gravità | Mitigazione |
|---|---|---|
| Il gate di build blocca un hotfix urgente | media | `SEO_GATE=off`; lista `error` corta e indiscutibile (§2.2) |
| Falsi positivi che addestrano a ignorare la console | **alta** — uccide lo strumento | Ogni regola nasce `warn`, promossa a `error` solo dopo 2 settimane senza falsi positivi |
| Chiave del service account Google esposta | **alta** | Solo secret del Worker; mai in `wrangler.toml`; il gate di build cerca pattern di chiave privata in `dist/` |
| Access mal configurato → console pubblica | **alta** | `noindex` + `Disallow: /console/` come secondo livello; test in incognito dopo il deploy |
| Cron silenziosamente morto → dati fermi, console che sembra dire "tutto ok" | media | La Salute mostra l'età dell'ultimo crawl in evidenza e diventa rossa oltre 36 ore |
| GSC senza dati per mesi (sito nuovo, poco traffico) | media | "nessun dato" esplicito (§2.6); il valore delle Fasi 2-3 non dipende da GSC |
| Costruire la console invece di scrivere contenuti | **alta** — è il rischio vero | §14.9: su 5 pagine la console dirà 5 cose. Le Fasi 5-8 hanno senso solo con contenuti da misurare |
| D1 che cresce senza controllo | bassa | Retention 400 giorni scritta nel cron dal primo giorno (§6.4) |

---

## 14. Ricognizione del 2026-08-25 — riscontri

Stato del sito al momento della stesura. Tutto verificato, niente dedotto.

### Intenzione nel repo ≠ realtà servita

**14.1 — 🔴 Gli AI crawler sono bloccati in produzione.**
`public/robots.txt` (41 righe) non è ciò che viene servito (102 righe). Cloudflare antepone un
blocco managed con `Disallow: /` per ClaudeBot, GPTBot, Google-Extended, CCBot, Bytespider,
meta-externalagent, Amazonbot, Applebot-Extended, e `Content-Signal: ai-train=no`.
Il punto 4 del brief è oggi irrealizzabile.
`curl -sS https://quotify.it/robots.txt` righe 27-60.

**14.2 — 🔴 `Cache-Control` riscritto dall'edge.**
`public/_headers:23` dichiara `max-age=0, must-revalidate`. Servito:
`public, max-age=14400, s-maxage=3600, must-revalidate`. Ogni valore sotto 14400 viene alzato
(anche `robots.txt` e `sitemap.xml`, dichiarati a 3600), quelli sopra restano
(`/pwa-192x192.png` a 604800, `/assets/*` a 31536000).

**Causa confermata via API** il 2026-08-25:
`GET /zones/847d6d3f.../settings/browser_cache_ttl` → `14400`. È l'impostazione legacy di zona
(Caching → Configuration), non la regola cache `cache-html-landing`, che è configurata
correttamente con i TTL vuoti.
Effetto: dopo un deploy, HTML vecchio per 4 ore ai visitatori di ritorno.

**14.3 — 🔴 Analytics dichiarato ma assente.**
`cookie.html:80` afferma che il sito usa Cloudflare Web Analytics.
`curl -sS https://quotify.it/ | grep -c cloudflareinsights` → **0**. Nessun dato raccolto.

**14.4 — 🟠 Email di contatto invisibile ai crawler.**
L'Email Obfuscation di Cloudflare produce `<a class="__cf_email__" data-cfemail="f990...">`
decodificato da uno script sotto `/cdn-cgi/`, che `public/robots.txt:7` blocca. Crawler e
assistenti AI leggono `[email protected]`. (Inoltre l'indirizzo è
`info@alessandroterracciano.com`, non un dominio `quotify.it`.)
Confermato via API: `email_obfuscation = on`.

### Cosa manca nel codice

**14.5 — 🟠 Nessun canonical, nessun Open Graph completo, nessun dato strutturato.**
`grep -rn 'rel="canonical"|og:title|og:url|twitter:|ld+json' --include='*.html'` → nessuna
occorrenza in tutto il repo. L'unico OG è `index.html:9`, `og:image="/pwa-512x512.png"`:
**URL relativo**, non valido per i validatori OG.
Sprecati: 5 FAQ complete già nell'HTML (`index.html:1004-1130`) senza `FAQPage`; piani €0 e
€6,99 (`index.html:876`, `:936`) senza `SoftwareApplication`/`Offer`.

**14.6 — 🟠 Sette `href="#"`.**
`index.html:32` e `:1182` (loghi, dovrebbero puntare a `/`), `:1203` Changelog,
`:1211-1215` Guida Regime Forfettario, Calcola Contributi INPS, Scadenze Fiscali 2026, Blog,
Documentazione API. Sono esattamente i temi delle query target, e sono link morti.

**14.7 — 🟠 Statistiche a zero nell'HTML.**
`index.html:163` e `:169` contengono `0`, animato in JS verso `data-target`
(`main.js:441-453`). Chi legge l'HTML grezzo — inclusi gli assistenti AI — legge
"0+ Freelance attivi", "0+ Fatture emesse".

**14.8 — 🟡 Peso.**
`/assets/main-DwD_iuHk.js` = 621 KB grezzi / 176 KB in brotli, quasi tutto Three.js, per un
globo e un gradiente. `/images/earth-map-colored.png` = 113 KB. HTML home = 85 KB / 13 KB brotli.

**14.9 — 🟡 Contenuto.**
5 pagine. Parole di testo visibile: `index.html` 1706, `termini.html` 886, `privacy.html` 557,
`cookie.html` 371, `assistenza.html` 185. Sulle query citate nel brief:
"F24" non compare in nessun file; "accantonare" non compare in nessun file;
"fattura elettronica" solo di passaggio in home.
`llms.txt` → HTTP 404.

**14.10 — 🟠 `anti-scraper-nl` senza esenzione per i bot verificati.**
Managed Challenge su tutto il traffico dall'Olanda verso `quotify.it`, senza `not cf.client.bot`.
Vedi §4.3.

**14.11 — 🟡 `always_use_https = off` sulla zona** (verificato via API). Il redirect http→https
oggi funziona lo stesso perché lo fa Pages, ma non è la zona a garantirlo.

**14.12 — 🟡 `cf-env.sh` non riconosce questa cartella.**
`CF_PROJECT_MAP` contiene `["Quotify Website"]`, la directory si chiama `quotify-website`:
nessun match, serve `CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh` a ogni deploy.
Il token caricato ha scope per Pages e per le impostazioni di zona in lettura, **non** per DNS
né per WAF/Bot Management.

### Traffico crawler reale (AI Crawl Control, 24 ore al 2026-08-25)

222 richieste da AI crawler, −52,4% sul periodo precedente. 125 consentite, 97 non riuscite.
**88 crawl finiti in HTTP 404.** `quotify.it/sitemap.xml` è il percorso più crawlato.

| Crawler | Richieste consentite |
|---|---|
| PetalBot (Huawei) | 69 |
| **Claude-SearchBot** | **40** |
| Googlebot | 13 |
| BingBot | 2 |
| Baidu | 1 |
| ChatGPT-User, Applebot, PerplexityBot, CCBot, Bytespider | 0 |

Due osservazioni. **Claude-SearchBot fa 40 richieste** mentre il `robots.txt` gli diceva
`Disallow: /` — sta ignorando la direttiva, ed è la dimostrazione pratica della differenza fra
*esprimere* una preferenza e *imporla* (§4.1). **PetalBot da solo era il 72%** del traffico
crawler pur essendo vietato dal 24/08.

### Cosa funziona già

Contenuto interamente nell'HTML servito (nessuna SPA, ottima base sia SEO che GEO).
`lang="it"` su 5/5. Un solo `<h1>` per pagina su 5/5. Nessuna immagine senza `alt`.
Redirect puliti: `/privacy.html` → 308 → `/privacy`, `www` → 301, `http` → 301.
404 reale con `noindex` (`public/404.html:4`). CSP, HSTS, X-Frame-Options, nosniff,
Permissions-Policy tutti presenti e serviti. Sitemap e robots rispondono 200 con
content-type corretto. TTFB 85-145 ms da Milano, `cf-cache-status: HIT`.

---

## Riferimenti nel codice

- `index.html:9` — unico OG presente, con URL relativo
- `index.html:128` — `<h1>` della home (attributi su più righe: le regex lo mancano)
- `index.html:161-176` — statistiche non verificabili, renderizzate a `0`
- `index.html:876`, `:936` — piani €0 e €6,99, candidati a `Offer`
- `index.html:1004-1130` — 5 FAQ già in HTML, candidate a `FAQPage`
- `index.html:1203`, `:1211-1215` — link morti nel footer
- `main.js:441-460` — animazione dei contatori
- `public/_headers:12-59` — regole header; `:23` la riga sovrascritta dall'edge
- `public/robots.txt` — 41 righe nel repo, 102 servite
- `cookie.html:80` — dichiarazione di Cloudflare Web Analytics non veritiera
- `vite.config.js:8-17` — i 5 entry point; il gate di build va agganciato qui
- `package.json:5-7` — script `build`, dove innestare il gate
- `~/Developer/Quotify App/cron-worker/index.ts` — pattern di Worker cron da replicare
- `~/Developer/Quotify App/functions/api/reminders/send-push.ts` — pattern di endpoint cron protetto
