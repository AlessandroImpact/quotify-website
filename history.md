# Storia dei lavori — quotify.it

> Registro delle sessioni su questo repo. Serve a **riprendere il filo in una chat nuova**
> senza rileggere tutto: dove siamo, cosa è stato deciso e perché, cosa viene dopo.
>
> Il dettaglio sta altrove e non va duplicato qui:
> - `docs/console-sito-piano.md` — piano della console, ricognizioni, riscontri Search Console
> - `docs/calcolatore-forfettario-piano.md` — piano del calcolatore, decisioni e regole di gate
> - I messaggi di commit — ogni decisione ha il suo perché scritto lì dentro

---

## Dove siamo oggi (21 settembre 2026)

**Il sito**: 5 pagine fiscali + 15 guide all'app + hub + chi siamo + home + 4 di servizio.
Su 26 URL in sitemap, **19 indicizzati**; fuori restano le legali (che vanno bene così),
`/guide/app-su-telefono` (sconosciuta a Google, richiesta di nuovo il 21/09) e
`/guide/fattura-scartata-sdi` (scansionata ma non indicizzata: si aspetta). `/chi-siamo` è
appena stata richiesta. Le impressioni in ricerca sono ancora vicine a zero: dominio nuovo.

| | |
|---|---|
| Pagine in sitemap | 26 |
| Test | 70, verdi |
| Regole di gate | ~37, bloccano il deploy |
| Core Web Vitals (Cloudflare RUM) | LCP 308 ms · CLS 0 · INP 16 ms · TTFB 201 ms — tutti buoni |
| Schemi SVG nelle guide | 7 |
| Misura | `npm run cruscotto` (Cloudflare + Search Console), `npm run indicizzazione` (stato per URL) |

**Le pagine fiscali** (le guide all'app sono elencate più sotto)

| URL | Cosa | Query obiettivo |
|---|---|---|
| `/guide` | Hub e pilastro, 1.890 parole | regime forfettario |
| `/calcolo-tasse-forfettario` | Calcolatore interattivo + schema del calcolo | calcolo tasse forfettario |
| `/scadenze-fiscali-forfettario` | Calendario con filtro per cassa | scadenze fiscali forfettario 2026 |
| `/quanto-accantonare-tasse-partita-iva` | Percentuale da accantonare | quanto accantonare tasse partita iva |
| `/ateco-2025-forfettario` | Il transitorio ATECO | ateco 2025 forfettario |
| `/chi-siamo` | Chi risponde delle guide, e con che regole | — (pagina di fiducia, non di ricerca) |

---|---|
| Pagine in sitemap | 10 |
| Test | 66, verdi |
| Regole di gate | ~35, bloccano il deploy |
| Lighthouse (mobile) | SEO 100 · Best Practices 100 · Accessibilità 96 home / 100 contenuti |
| Ultimo dato Search Console | 1 impressione in 7 giorni al 07/09 — troppo presto per concludere |

**Le pagine di contenuto**

| URL | Cosa | Query obiettivo |
|---|---|---|
| `/guide` | Hub e pilastro, 1.890 parole | regime forfettario |
| `/calcolo-tasse-forfettario` | Calcolatore interattivo | calcolo tasse forfettario |
| `/scadenze-fiscali-forfettario` | Calendario con filtro per cassa | scadenze fiscali forfettario 2026 |
| `/quanto-accantonare-tasse-partita-iva` | Percentuale da accantonare | quanto accantonare tasse partita iva |
| `/ateco-2025-forfettario` | Il transitorio ATECO | ateco 2025 forfettario |

---

## Come si lavora qui

Sono le regole che hanno retto finora. Cambiarle è possibile, ma consapevolmente.

**1. Verifica alla fonte, sempre.** Su cinque verifiche fatte alla fonte primaria in questa
sessione, **cinque hanno corretto qualcosa** che sapevo o che le fonti secondarie davano per
buono: il coefficiente dello sviluppatore (67%, non 78%), la scadenza di giugno 2026 (è il 20
luglio), la terza rata INPS (16 novembre, non 17), le condizioni del 5% (tre, non una), la
soglia dei redditi da lavoro dipendente (35.000 €, non 30.000). Le fonti secondarie su materia
fiscale sono sbagliate con una frequenza che sorprende.

**2. Nessuna pagina esce senza verifica umana.** `quotify:verifica-fiscale` deve valere
`verificata`, e il gate blocca il deploy finché non lo è. Chi scrive la bozza non è chi
conferma i fatti fiscali. Se si aggiunge contenuto fiscale a una pagina già approvata, la
verifica torna indietro: far passare affermazioni nuove sotto un'approvazione vecchia svuota
il meccanismo.

**3. Ogni numero ha una fonte citabile**, e il gate lo controlla. I valori stanno in
`data/parametri-fiscali-<anno>.json` e `data/scadenze-<anno>.json`, mai nel codice.

**4. Una fonte sola per ogni cosa.** `data/pagine.json` genera `<head>`, entry di build,
header di cache e sitemap. `data/navigazione.json` genera testata, menu e piè di pagina. Se
due posti dicono la stessa cosa, divergono — è successo tre volte e ogni volta il confronto
l'ha trovato.

**5. Si verifica guardando, non solo leggendo.** Molti difetti sono emersi solo aprendo la
pagina in un browser: il marchio nero su fondo nero, il CLS che si vede solo a cache vuota,
gli importi senza separatore delle migliaia, «il 80,1%» invece di «l'80,1%».

**6. Le pagine si mostrano, non si fanno aprire.** Server locale avviato da chi lavora,
URL passato pronto. Vedi la memoria di progetto.

---

## Sessioni

### 3 settembre 2026 — Ricognizione SEO
Verificata la proprietà Search Console e letti i primi dati. `sameAs` ai profili ufficiali,
contatto su `info@quotify.it`. Ricognizione sulla query di marca: otto prodotti omonimi, tutti
anglofoni, quindi in Italia vincibile.

### 4 settembre 2026 — Il calcolatore, e le fondamenta
- **Ricognizione Search Console**: 3 impressioni in 8 giorni, tutte di marca, domanda non di
  marca **zero**. Verificato che non esiste backfill prima della verifica della proprietà, ma
  solo per il Rendimento. Scoperto che il dominio ha un passato (spam Zen Cart nel 2014) —
  nessuna azione manuale, nessuna eredità.
- **Il calcolatore**: modulo di calcolo puro guidato dai test, parametri con le fonti,
  pagina statica completa senza JavaScript, interattività che rende vivi i nodi già scritti.
- **Le regole di gate**: parametri senza fonte, parametri scaduti, sincronia fra dati e HTML,
  meta di misurazione, verifica fiscale.
- **Prestazioni**: Inter ospitato in proprio, CLS da 0,1279 a 0. CSP senza origini esterne.
- **Contenuti**: ATECO 2025, quanto accantonare.

### 7 settembre 2026 — Scadenze, telaio, hub
- **Calendario delle scadenze** con filtro per cassa in CSS puro (funziona senza JavaScript).
- **Telaio condiviso**: testata, menu e piede erano duplicati a mano in otto file ed erano già
  divergenti. Ora generati da una fonte.
- **`/guide`**: da indice a pilastro, 493 → 1.890 parole.

### 8 settembre 2026 — Registro unico e temi
- **`data/pagine.json`**: aggiungere una pagina richiedeva quattro file toccati a mano, ora è
  una voce JSON più il corpo. Il confronto con l'output congelato ha trovato tre derive:
  `og:title` fermi ai titoli vecchi su quattro pagine, la home senza `favicon.ico`, i nomi
  dell'hub dedotti da una regex.
- **Temi**: scuro per difetto, chiaro a scelta, commutatore nell'intestazione. Il chiaro resta
  il markup esistente, lo scuro è uno strato di rimappatura. Regola `colore-non-mappato` per
  impedire che una pagina nuova sia rotta sul tema scuro.

### 8 settembre 2026 — Le guide ai moduli dell'app
Sei guide scritte e pubblicate leggendo il codice dell'app, non l'interfaccia: profilo fiscale,
bacheca, preventivi, conversione in fattura, anagrafica clienti, fatture ricorrenti. Ogni
affermazione ha una fonte in `file:riga`, e le sole cose girate ad Alessandro sono quelle
fiscali, che dal codice non si deducono.

Cose emerse leggendo, che nell'app non sono scritte da nessuna parte:
- **Difetto vero**: gli «altri costi» del preventivo non passano in fattura — la conversione
  costruisce le righe solo dai servizi. Chi ci mette trasferte fattura meno di quanto ha
  preventivato. Documentato in evidenza sul sito; l'app non è stata toccata.
- Spostare una scheda sulla bacheca e rimetterla dov'era **fa ripartire il follow-up da zero**:
  i promemoria precedenti sono già stati chiusi.
- «Scaduto» non è uno stato salvato ma calcolato a ogni lettura, e solo per bozza e inviato:
  accettati e rifiutati non scadono mai.
- I valori predefiniti del profilo (78 / 15 / 26,07) descrivono un consulente in Gestione
  Separata: plausibili, quindi non sembrano un errore, e sbagliati per tutti gli altri.

Il gate ha fatto il suo lavoro due volte: ha bloccato una guida per `bg-slate-100` non mappato
sul tema scuro, e ha segnalato due query obiettivo incoerenti con il titolo. Emerso però che
la regola `colore-non-mappato` **non copre emerald e rosa**: usate in due riquadri, sarebbero
rimaste chiare sul tema scuro senza alcuna segnalazione. Sostituite con palette mappate; la
regola resta da allargare.

### 9 settembre 2026 — Il gruppo A, e una guida non scritta
Quattro guide del gruppo A pubblicate: fattura scartata, natura N2.2 e diciture, marca da bollo,
nota di credito. Per queste i fatti fiscali sono stati presi dalle fonti primarie e non dalla
memoria — il PDF dei codici errore dello SdI, la guida ufficiale sul bollo, la risposta a
interpello 428/2022 — scaricandoli ed estraendoli invece di citarli.

Due volte è servito davvero:
- la ricerca web dava la soglia di differimento del bollo a **250 €**, la guida ufficiale dice
  **5.000 €**. Scritto 250, avremmo mandato la gente a versare a maggio invece che a settembre;
- quattro codici di scarto che ricordavo (00320, 00422, 00445, 00471) **non risultano**
  nell'elenco ufficiale, e sono stati tolti invece di inventarne la descrizione.

Emersa e documentata la risposta 428/2022: il bollo riaddebitato al cliente è ricavo e concorre
al reddito forfettario. L'app lo tiene fuori dall'imponibile, quindi le stime lo escludono.

**La sedicesima guida non è stata scritta.** Preparandola è emerso che l'app scrive `Nazione` e
`IdPaese` come costante `IT` per chiunque, e che il cliente non ha affatto un campo nazione: una
fattura a un cliente estero uscirebbe dichiarandolo con sede in Italia. Le alternative erano
pubblicarla dicendo apertamente che il caso non è coperto, oppure aspettare. Si è scelto di
aspettare.

Nato `docs/segnalazioni-app.md`: tutto ciò che è emerso leggendo il codice dell'app, con
`file:riga`, impatto e possibili direzioni. Otto voci, due domande aperte e — per equilibrio —
l'elenco delle cose che sembravano buchi e non lo erano. Va verificato nella chat dell'app.

### 12–16 settembre 2026 — Tema chiaro in home, misura, Search Console

- **Home anche in chiaro** e passaggio animato fra pagine (View Transitions). Ha richiesto
  diversi giri: il blu doveva essere quello di Quotify (`#236CEF`), i pulsanti blu sempre con
  testo bianco, le schermate citate restano scure. Modello a tre superfici, invariante
  bianco-su-blu con specificità sufficiente. Verificato con screenshot e calcolo dei contrasti.
- **`npm run cruscotto`**: Cloudflare Web Analytics (solo sito, ~30 giorni, campionato) +
  Core Web Vitals + Search Console. Le visite sono la cifra guida, non le pagine viste: c'era
  una riga da 480 viste e zero visite che da sola faceva l'86% del mese.
- **Search Console via service account** (chiave in `~/.config/quotify/`, mai nel repo) e
  `/api/metriche`, la prima Pages Function del sito: espone rendimento e stato sitemap all'app
  con un segreto condiviso. Decisione: **Cloudflare dentro l'app, Google fuori**, così l'app
  non si appesantisce. Il piano per la sezione admin è in `Quotify App/docs/`.
- **`npm run indicizzazione`**: stato di ogni URL della sitemap via URL Inspection API, con
  storico e delta. È la misura che conta finché le impressioni restano a zero.
- Token Cloudflare del deploy ruotato con permessi di sola lettura sulle analytics.

### 21 settembre 2026 — Dati strutturati, chi siamo, schemi

Tre lavori distinti, tutti pubblicati.

**Una regressione seria, trovata per caso.** Tredici guide erano online **senza dati
strutturati**: il generatore costruisce Article, FAQPage e BreadcrumbList solo se il body
dichiara `data-jsonld`, e le tredici non lo dichiaravano. Nessuna regola se ne accorgeva.
Aggiunto l'attributo e due regole di gate (`dati-strutturati-non-dichiarati`,
`dati-strutturati-incoerenti`) che confrontano il registro col markup. La prima stesura usava
`?.` sul registro e per questo controllava nulla senza dirlo — lo stesso difetto che doveva
correggere; ora se il registro manca il gate si ferma. In serata è emerso che quel `throw`
rompeva tre test che costruivano il contesto senza registro: sistemati, e aggiunti quattro
test sulla regola stessa.

**`/chi-siamo`.** Su materia fiscale una pagina che dice chi c'è dietro è un segnale di
fiducia che mancava. Decisioni: nessuna credenziale inventata, nessun commercialista citato
(l'amico che ha fatto il controllo non vuole comparire), l'esigenza raccontata com'è — un
forfettario che non aveva un posto dove tenere tutto. Le quattro regole con cui sono fatte le
pagine sono verificabili, inclusa quella di dichiarare i limiti del proprio prodotto. Aggiunto
`Person` (`/#autore`) come `author` di ogni Article: rovescia la scelta del 3 settembre, e il
perché sta nel commento in `jsonld.mjs`.

**Sette schemi SVG.** Dove un flusso a stati, un albero di decisione o un calcolo a passaggi si
capisce meglio guardandolo: calcolo tasse, stati della fattura, colonne della bacheca, ciclo
delle ricorrenti, risposta al preventivo, scelta del codice destinatario, bacheca contro F24.
SVG inline con testo vero, `title`/`desc`, `figcaption` che aggiunge invece di ripetere, colori
dai token `.schema` così seguono i due temi; sotto 480px scorrono in orizzontale. Le altre otto
guide sono rimaste senza: erano procedure lineari, un disegno avrebbe solo ripetuto il testo.
Verificati con render headless in entrambi i temi, a 390px e sulle pagine pubblicate. Poi
`revisionato` portato a oggi per le sette pagine (il `lastmod` in sitemap era fermo all'8) e
sitemap reinviata via API.

**Indicizzazione.** Le richieste manuali funzionano: da 6 a 19 pagine indicizzate in quattro
giorni. Le tre sitemap fantasma del 2014 in Search Console le ha tolte Alessandro. La «1
impressione su 10 pagine» del 20 settembre era una nostra ricerca `site:`, non domanda vera.

### 11 ottobre 2026 — il raccoglitore delle metriche in produzione

Spec in `docs/raccoglitore-metriche-piano.md`, piano in `docs/raccoglitore-metriche-implementazione.md`.
Due pezzi: il middleware Pages (`functions/_middleware.js`) registra in D1 `quotify-metriche`
le sole visite con UTM o referrer esterno, senza cookie, IP né User-Agent; il Worker
`quotify-archivio` (un cron orario, 4 su 5 dell'account) archivia ogni notte Web Analytics
(04 UTC), Search Console (05 UTC) e il lunedì l'indicizzazione (06 UTC). Revisione finale:
sette correzioni, 176 test. CPU misurata 6,8-8,6 ms sul piano gratuito.

Pubblicazione: token nuovo `quotify-archivio-sola-lettura` (solo Analisi account → Lettura,
token di account, in `~/vault/secrets/quotify/cf-analytics-token`), D1 legato **solo** alla
produzione di Pages (segreti `GSC_CHIAVE` e `METRICHE_CHIAVE` intatti). Prove reali: registrata
solo la visita con UTM; senza UTM, LinkedInBot e richiesta non-navigazione scartate. Riga di
prova cancellata. Da controllare il 12 ottobre dopo le 06 UTC: prime righe in `storico`.

---

## Segnalazioni sull'app

Le cose notate leggendo il codice dell'app mentre si
scrivevano le guide stanno in [`docs/segnalazioni-app.md`](docs/segnalazioni-app.md), con
riferimenti `file:riga`. Vanno verificate nella chat dedicata a quel progetto: qui non si
tocca nulla dell'app.

---

## Contenuti: fatti e da fare

Si spunta man mano. Ogni riga fatta porta la data di pubblicazione.

### Fisco — pagine di primo livello (URL piatti)

- [x] `/guide` — hub e pilastro · 07/09/2026
- [x] `/calcolo-tasse-forfettario` · 04/09/2026
- [x] `/quanto-accantonare-tasse-partita-iva` · 04/09/2026
- [x] `/ateco-2025-forfettario` · 04/09/2026
- [x] `/scadenze-fiscali-forfettario` · 07/09/2026

### Guide all'app — gruppo A, rispondono a una ricerca vera

Hanno volume di ricerca: documentano il prodotto **e** intercettano domande.

- [x] `/guide/stati-fattura-elettronica` — i nove stati e cosa fare per ognuno · 08/09/2026
- [x] `/guide/fattura-scartata-sdi` — codici errore testuali dal PDF ufficiale AdE, regola dei 5 giorni da circolare 13/E (8 set 2026)
- [x] `/guide/codice-destinatario` — cos'è, dove si trova, cosa mettere se manca · 08/09/2026
- [x] `/guide/natura-n2-2-diciture-forfettario` — N2.2, RF19 e le due diciture con le formulazioni ufficiali AdE (9 set 2026)
- [x] `/guide/marca-da-bollo-fattura-elettronica` — soglia, scadenze e differimento a 5.000 € dalla guida ufficiale; bollo riaddebitato come ricavo (interpello 428/2022) (9 set 2026)
- [x] `/guide/nota-di-credito-td04` — impostata su quando NON serve; il principio di cassa che rende lo storno neutro sul reddito (9 set 2026)
- [~] `/guide/fattura-cliente-estero-forfettario` — **rimandata** (9 set 2026). L'app oggi
  scrive nazione `IT` a mano per chiunque e non ha un campo nazione sul cliente: vedi voce 0
  di [`docs/segnalazioni-app.md`](docs/segnalazioni-app.md). Si scrive quando l'app gestira'
  l'estero, cosi' la guida potra' dire come si fa invece di dire che non si puo'.

### Guide all'app — gruppo B, documentazione dei moduli

Traffico atteso vicino a zero. Servono a chi c'è già e a chi sta valutando.

- [x] `/guide/primo-accesso-profilo-fiscale` — i quattro numeri del profilo; campi e valori predefiniti verificati su `ProfilePage.tsx` (8 set 2026)
- [x] `/guide/bacheca-progetti` — cinque colonne e regola dei promemoria verificate su `project-state-machine.ts` (8 set 2026)
- [x] `/guide/preventivi` — stati, template, link pubblico e risposta del cliente verificati su `dates.ts` e sugli endpoint share (8 set 2026)
- [x] `/guide/dal-preventivo-alla-fattura` — conversione, numerazione e il caso degli «altri costi» che non passano, verificati su `InvoicePage.tsx` e `invoiceNumber.ts` (8 set 2026)
- [x] `/guide/clienti` — anagrafica, ricerca dal Registro Imprese e il caso dei professionisti non iscritti, verificati su `clients/lookup.ts` (8 set 2026)
- [x] `/guide/fatture-ricorrenti` — ciclo dell'occorrenza, finestra di 7 giorni e segnaposto, verificati su `recurring.ts` e `recurringMaterialize.ts` (8 set 2026)
- [x] `/guide/f24-e-dashboard` — le due fonti diverse dei numeri e il limite emissione/incasso, verificati su `f24/index.ts` e `dashboard/index.ts` (8 set 2026)
- [x] `/guide/quotifai` — perimetro, conferme lato server, regola sulle stime e soglie 85k/100k, verificati su `ai/chat.ts` (8 set 2026)
- [x] `/guide/app-su-telefono` — app iOS ufficiale col widget, installazione dal browser e le tre notifiche; corretta la home che diceva ancora «senza App Store» (8 set 2026)

### Non contenuto, ma manca

- [x] `/chi-siamo` — chi risponde delle guide, senza credenziali inventate; Person come autore degli Article (21 set 2026)
- [x] Schemi SVG in sette guide, a partire dal calcolo «dai ricavi al netto» (21 set 2026)
- [ ] `assistenza.html` è magra (167 parole)

---

## Cosa viene dopo

**Guide**: fatte 15 su 16. La sedicesima (cliente estero) aspetta che l'app gestisca la
nazione del cliente — voce 0 di `docs/segnalazioni-app.md`.

⚠️ **`~/Developer/Quotify App/docs/guida-utente.md` è dell'11 marzo 2026 e NON va usata come
fonte**: descrive sei stati del progetto quando il codice ne ha cinque, con nomi diversi, e
non copre clienti, fatture, ricorrenti, F24, abbonamento e onboarding. La fonte è il codice:
`src/pages/` per le schermate, `src/types/index.ts` per gli stati.

**Appuntamenti**
- **Fine settembre**: `npm run indicizzazione` — devono entrare `/chi-siamo`,
  `/guide/app-su-telefono` e, se Google cambia idea, `/guide/fattura-scartata-sdi`. Se
  quest'ultima resta fuori dopo 2-3 settimane, ha troppo testo preso dalla tabella ufficiale:
  va riscritta con più del nostro.
- **Quando Search Console mostra query non anonimizzate**: scegliere le code lunghe da
  coprire. Non prima — senza dati è tirare a indovinare.
- **Metà ottobre**: rivedere le scadenze prima del picco di novembre. La pagina è marcata
  `in-evoluzione` e il gate avvisa da solo dopo 90 giorni.
- **1 marzo 2027**: il gate blocca il build se i parametri fiscali sono ancora del 2026.

**Aperto, non urgente**
- **Zero backlink legittimi.** È il vincolo che nessuna ottimizzazione supera. Per l'Italia i
  gruppi Facebook dei forfettari valgono più di Reddit; niente link comprati, mai.
- Nella chat dell'app: il piano `admin-sito-google-piano.md` (consumare `/api/metriche`,
  CWV) e le otto voci di `segnalazioni-app.md`.
- Le due chiavi Firebase Admin trovate in `~/Downloads` vanno **revocate** dalla console.
- Regola di gate per `revisionato` mancante nel registro (oggi ripiega in silenzio su una
  data fissa): proposta, non fatta.
- `assistenza.html` è magra (169 parole).

## Trappole già incontrate

- **Deploy e propagazione**: verificare il dominio pochi secondi dopo il deploy dà 404 o
  contenuto vecchio. Usare l'URL diretto del deploy (`<hash>.pages.dev`) per la verifica
  immediata, il dominio dopo qualche minuto.
- **Cache dell'edge**: l'HTML ha `s-maxage=300`, sitemap e `llms.txt` pure (erano 3600, e una
  pagina nuova restava fuori dalla sitemap servita per un'ora). Il token Cloudflare non ha il
  permesso di svuotare la cache: si aspetta o si usa il dashboard.
- **`source ~/vault/bin/cf-env.sh` va eseguito nella stessa chiamata del deploy**: in una pipe
  esporta in una subshell e il token non arriva.
- **Niente `[limits]` nel `wrangler.toml` di un Worker**: il piano gratuito rifiuta il deploy
  (errore 100328). Il tetto di 50 sottorichieste c'è comunque.
- **Un PATCH al progetto Pages può azzerare i segreti**: fotografare `wrangler pages secret
  list` prima e dopo.
- **Search Console ha 2-3 giorni di ritardo.** Nessuna misura è immediata.
- **Le richieste di indicizzazione si fanno a mano**, una per URL: la URL Inspection API
  legge lo stato ma non chiede la scansione. Il reinvio della sitemap invece si fa via API
  (`PUT .../sitemaps/<url>`, scope `webmasters` pieno — il modulo condiviso ha solo quello
  in lettura, apposta).
- **Chrome headless non scende sotto ~500px di finestra**: uno screenshot a 390px è un ritaglio
  di una pagina più larga e sembra rotto. Per il telefono si usa un iframe da 390px dentro una
  finestra normale.
- **Cambiare `revisionato` nel registro richiede `npm run gen`**: i blocchi generati portano
  la data, e il gate blocca finché non sono allineati.
