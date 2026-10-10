# Raccoglitore di metriche — piano di implementazione

> Stato: **proposta, non ancora implementata**. Data: 2026-10-10.
> Origine: la richiesta era «una piattaforma personalizzata dove guardare tutte le metriche —
> app, sito, landing, UTM, social, tutto». È troppo grande per un solo progetto: sono sei fonti
> indipendenti, e tre non esistono. Questo documento copre **il primo dei quattro pezzi**, il
> solo che non possa essere ricostruito a posteriori. La scomposizione è al §2.
> Ricognizione di partenza: §9.

---

## 1. Obiettivo

Due cose che oggi si perdono ogni giorno, e nessuna delle due si recupera dopo:

1. **L'attribuzione.** Cloudflare Web Analytics non conserva la query string, quindi oggi non
   esiste alcun modo di sapere *quale* post, campagna o messaggio ha portato una visita. Vediamo
   `www.linkedin.com` e nient'altro.
2. **Lo storico.** Cloudflare conserva circa 30 giorni e poi cancella. Ogni notte che passa senza
   archiviare è un giorno di storia cancellato per sempre.

**Non è un cruscotto.** Quando questo progetto sarà finito non si vedrà niente di nuovo: si vedrà
un database che si sta riempiendo. La schermata è il terzo pezzo (§2) e ha senso dopo, quando
c'è qualcosa da mostrare.

**Non è un sostituto di Cloudflare Web Analytics.** Il beacon di Cloudflare resta la misura del
traffico totale, e sa filtrare i bot meglio di noi. Questo raccoglitore fa l'unica cosa che
Cloudflare non sa fare: attribuire.

### Il criterio di successo

Tre prove, tutte verificabili con un numero in mano:

- **Fra un mese**, alla domanda «quale canale ha portato le visite di questa settimana» si
  risponde con una query, non con un'ipotesi.
- **Alla prima esecuzione**, l'archivio contiene **16 mesi di Search Console** e i ~30 giorni di
  Cloudflare ancora visibili — storia che oggi non abbiamo e che senza questo lavoro non avremo
  mai.
- **Una notte saltata si ripara da sé** la notte dopo, senza che nessuno se ne accorga.

---

## 2. La scomposizione

Quattro progetti, in quest'ordine. Ognuno ha la sua specifica e la sua implementazione.

| # | Progetto | Stato | Perché in questo punto |
|---|---|---|---|
| **1** | **Raccoglitore: UTM + storico** | **questo documento** | Prerequisito di tutto, e l'unica parte non ricostruibile a posteriori |
| 2 | Landing promo «3 mesi gratis» + lead magnet | approvata, ferma | Genera il traffico da misurare; senza il #1 nascerebbe non misurabile |
| 3 | Cruscotto unico su `quotify.it/cruscotto` | da specificare | Ha senso quando c'è qualcosa da unire |
| 4 | App Store e social | bloccato | Manca la chiave API di App Store Connect; le API di LinkedIn non sono praticabili per una pagina personale |

Il #4 è bloccato da fuori, non da noi. Per i social, in particolare: possiamo misurare i clic che
**arrivano**, non le impressioni **dentro** la piattaforma. Quelle restano nel loro pannello.

---

## 3. Contesto: metà dell'impianto esiste già

| Dove | Cosa fa | Come si aggiorna |
|---|---|---|
| `functions/api/metriche.js` | serve i dati di Search Console, protetta da `METRICHE_CHIAVE` | chiamata dal Worker dell'app |
| `lib/searchconsole.mjs` | lettore dell'API Search Console (JWT RS256 via Web Crypto) | — |
| `scripts/analytics/cruscotto.mjs` | genera `cruscotto/index.html` in locale | `npm run cruscotto` |
| `scripts/analytics/indicizzazione.mjs` | fotografa lo stato di indicizzazione delle 26 pagine | `npm run indicizzazione` |
| Gestione Admin nell'app | Crescita, Economia, Inviti, Sito web | in produzione |

`functions/api/metriche.js` dichiara già il modello architetturale di tutto il sistema, e questo
piano lo rispetta:

> *«Il sito possiede i propri dati di ricerca e li offre; l'app li consuma.»*

Segreti presenti sul progetto Pages `quotify-website`: `GSC_CHIAVE`, `METRICHE_CHIAVE`.
Nessun D1, nessun KV: **questo progetto introduce l'unica infrastruttura nuova di tutti e quattro.**

---

## 4. Decisioni già prese (e perché)

Queste sono chiuse. Cambiarle rimette in discussione il resto del piano.

### 4.1 Niente cookie, e il prezzo che si paga

Il modo normale di fare attribuzione è un cookie. Qui no — non per scrupolo, per categoria
legale: un cookie di statistica non è tecnicamente necessario, quindi richiede consenso. È
esattamente il motivo per cui il beacon di Cloudflare è senza cookie e si usa senza banner.

Il raccoglitore registra: **quando, su quale pagina, con quali parametri UTM, da quale host, da
quale paese**. Nient'altro. Nessun cookie, nessun IP, nessuno User-Agent, nessun identificatore
nemmeno derivato o cifrato.

**Il prezzo è reale e permanente, e va scritto qui perché nessuno lo riscopra con sorpresa fra sei
mesi:** non sapremo mai se chi è arrivato da LinkedIn è poi tornato, né quante visite ha fatto
prima di registrarsi. Sapremo quante visite ha portato ogni campagna e dove sono atterrate. La
via per saperne di più passa da un banner di consenso, e a questa scala non vale il cambio.

Senza identificatori il trattamento sta nella zona che il Garante ha accettato come statistica
anonima. Questo documento non è un parere legale. Anche nella lettura più favorevole,
**`privacy.html` va integrata** con un paragrafo che dica che il sito tiene un registro di
provenienza: è lavoro di questo progetto (§7, Fase 4), non di un altro.

### 4.2 La cattura è lato server, e scarta per difetto

`functions/_middleware.js` intercetta la richiesta, legge query string e `Referer`, e scrive
dentro `waitUntil`.

Il problema è il rumore: la zona prende circa **24.000 richieste di scanner a settimana**. Se
registrassimo tutto, l'archivio sarebbe fatto di bot. La difesa non è una lista di user agent da
mantenere a mano — è che **i bot non portano parametri UTM**.

Quindi si registra **solo** una richiesta che soddisfa almeno una condizione:

- porta un parametro `utm_*`, **oppure**
- ha un `Referer` con host esterno a `quotify.it`

Tutto il resto si scarta. Le visite dirette e i totali continuiamo a leggerli da Cloudflare.
**In caso di dubbio il raccoglitore scarta**: un archivio piccolo e pulito serve, uno grande e
sporco no.

### 4.3 L'archiviatore è un Worker separato, nello stesso repository

Le Pages Functions di questo progetto conoscono solo i gestori `onRequest*`; non esiste un
gestore programmato (§5.3). La fotografia notturna non può girare dentro il sito.

Tre strade erano aperte. Scartate:

- **GitHub Actions** — riuserebbe `cruscotto.mjs` e `indicizzazione.mjs` così come sono, e lo
  storico finirebbe versionato in git. Scartata perché costringe a mettere la chiave
  dell'account di servizio Google in un **terzo posto**, e sui segreti la regola del progetto è
  che non si moltiplicano i depositi.
- **Il Mac, a mano** — il più economico, e somiglia a come `npm run indicizzazione` lavora oggi.
  Scartata perché tradisce il requisito: una fotografia mancata perché il Mac era spento è
  **storia perduta per sempre**, ed è precisamente il rischio che questo progetto esiste per
  chiudere.

Scelta: un Worker `quotify-archivio` con `scheduled()`. I segreti restano su Cloudflare, funziona
col Mac spento, e il cruscotto poi interrogherà una sola cosa in un solo linguaggio.

Vive **in questo repository**, non in uno nuovo, così importa `lib/searchconsole.mjs` che già
esiste e già funziona invece di riscriverlo.

### 4.4 Nessun dato duplicato fra D1 e Cloudflare

La tabella `visite` non contiene dispositivo, browser, né il totale delle visite: **Cloudflare ce
li dà già**. Duplicarli significherebbe avere due numeri diversi per la stessa domanda e passare
il tempo a chiedersi quale sia vero.

L'unica eccezione è `paese`, perché serve *per campagna*, e quell'incrocio Cloudflare non lo sa
fare.

### 4.5 Un solo rimaneggiamento di codice esistente

Le query GraphQL vanno estratte da `scripts/analytics/cruscotto.mjs` (23 KB, query impastate con
la generazione dell'HTML) in un `lib/cloudflare.mjs` puro. Il Worker ha bisogno delle prime senza
il secondo.

Serve a non avere le stesse query scritte in due posti che divergono in silenzio. **Nessun altro
rimaneggiamento è in questo piano**: se durante il lavoro ne emerge uno necessario, si ferma e si
chiede.

### 4.6 Una richiesta per giorno, non una per dimensione

Il piano gratuito dei Workers concede **50 sottorichieste esterne per invocazione** (§5.5), e un
giro ingenuo dell'archiviatore ne farebbe più di settanta. La soluzione non è spezzare il lavoro
in mille esecuzioni: è **non fare richieste inutili**.

Due accorgimenti, entrambi già provati sul campo:

- **Cloudflare**: GraphQL accetta più interrogazioni con alias nella stessa richiesta. Tutte le
  scomposizioni di un giorno — totali, pagine, provenienze, paesi, dispositivi, browser — stanno
  in **una** sottorichiesta, non in sei.
- **Search Console**: una `searchanalytics/query` con dimensione `date` restituisce fino a 480
  righe in un colpo. Sedici mesi di storia sono **due o tre sottorichieste**, non cinquecento.
  `functions/api/metriche.js` lo fa già così, con `righe: 480`.

Risultato: il recupero iniziale dei 30 giorni di Cloudflare costa ~33 sottorichieste, il regime
di crociera ~7. Dentro il limite con margine, **senza** dipendere da un abbonamento.

A protezione, l'archiviatore ha un tetto esplicito di giorni per esecuzione (§7, Fase 5): non può
sforare nemmeno se la fonte restituisce qualcosa di inatteso.

---

## 5. I vincoli scoperti verificando

Non sono dettagli: cambiano ciò che il sistema può promettere. Comandi e output al §9.

### 5.1 Cloudflare non conserva la query string — gli UTM sono impossibili senza di noi

La documentazione di Web Analytics elenca le dimensioni disponibili: Country, Host, **Path**,
Referer, Device type, Browser, Operating system, Site, Exclude Bots, Navigation type. **Nessuna
dimensione per la query string.** Verifica indipendente sul campo: su 6 percorsi distinti degli
ultimi 7 giorni, **zero contengono `?` oppure `=`**.

Quindi gli UTM non sono una schermata da aggiungere: sono un raccoglitore da costruire. È la
ragione d'essere di questo progetto.

### 5.2 Il campionamento di Cloudflare dipende dalla finestra

Misurato il 2026-10-10:

```
ultimi  1g:  count=3    visits=3    sampleInterval=1
ultimi  7g:  count=21   visits=15   sampleInterval=1
ultimi 14g:  count=30   visits=20   sampleInterval=10
ultimi 30g:  count=90   visits=60   sampleInterval=10
```

**Fino a 7 giorni i numeri sono esatti. Da 14 in su sono stimati** e arrivano a multipli di dieci.

Questo **corregge** `docs/console-sito-piano.md` e il piano del pannello Sito web nell'app, che
affermano «tutti i conteggi sono multipli di dieci» come se valesse sempre.

Conseguenza operativa diretta: **l'archiviatore deve interrogare un giorno per volta**, non una
finestra larga. A un giorno `sampleInterval` è 1, quindi le fotografie che mettiamo in archivio
sono esatte. Se interrogassimo 30 giorni in un colpo archivieremmo stime, per sempre.

### 5.3 Le Pages Functions non hanno trigger a tempo

L'elenco dei collegamenti disponibili per Pages (KV, D1, Durable Objects, R2, Hyperdrive, Queues,
Vectorize, Analytics Engine, AI, service bindings) non include un gestore programmato: le Pages
Functions espongono solo `onRequest*`. Da qui la decisione §4.3.

D1 **sì** si collega a Pages, dalla console o dal file di configurazione, e ha anche un'API HTTP
per l'accesso dall'esterno.

### 5.4 Search Console corregge i dati per due o tre giorni

Già noto e già gestito in `functions/api/metriche.js`, che chiede fino a `giorno(-1)` per non
leggere zeri finali che sembrano un crollo. Qui ha una conseguenza in più: una fotografia scattata
una volta sola congelerebbe numeri che Google ha poi corretto. Da qui il §6.3.

### 5.5 Il piano gratuito dei Workers: 50 sottorichieste e 10 ms di CPU

| | Workers Free | Workers Paid |
|---|---|---|
| Sottorichieste esterne per invocazione | **50** | 10.000 |
| Tempo di CPU | **10 ms** | 5 min |
| Trigger cron per account | 5 | 250 |

È il vincolo più stretto di tutto il progetto, e un disegno ingenuo lo sfonda: 26 controlli di
indicizzazione + quattro giorni × (3 chiamate Google + 6 Cloudflare) + il token fanno **~71
sottorichieste**. Oltre il limite, e al primo recupero di storia sarebbero centinaia.

Risolto dal §4.6 e dallo sdoppiamento del cron (§7, Fase 5), **senza** cambiare piano.

**Misurato il 2026-10-10, e Workers Paid è escluso per scelta.** Un Worker usa e getta
(`quotify-prova-cpu`, cancellato subito dopo) ha eseguito ogni minuto il caso peggiore: firma del
token Google, due chiamate reali a Search Console, interpretazione di due risposte da 480 righe e
di 30 giorni di Cloudflare.

```
esecuzioni 9 · esito success 9/9 · CPU da 6,81 a 8,55 ms su 10
```

Tre lezioni:

- **In locale la stima era 4 ms, sul Worker vero il doppio.** Node non è un sostituto della misura.
- **Il costo che domina è la firma RSA del token Google**, non i dati. Non cresce con gli anni di
  storia: il caso a 480 righe era già dentro la prova.
- **Una prima versione della prova ha toccato 11,59 ms** e non è stata interrotta: Cloudflare
  tollera sforamenti occasionali, ma termina chi sfora con costanza. Quella versione fabbricava i
  dati a ogni giro, quindi non era il lavoro vero — però mostra quanto il margine sia stretto se
  si accumula tutto in un'unica esecuzione.

Da qui la decisione del §7, Fase 5: **un mestiere per esecuzione**. La firma del token non si somma
mai al resto.

### 5.7 I trigger cron sono 5 per account, non per Worker, e 3 sono occupati

Rilevato il 2026-10-10 sull'account Personale: `maison-sisters` (`0 8 * * *`), `myperiod-api`
(`0 9 * * *`), `quotify-cron` (`0 * * * *`). **Liberi: 2.** Un disegno a due cron riempirebbe
l'account e lascerebbe gli altri progetti senza posto. L'archiviatore ne usa **uno**.

### 5.6 Un `wrangler.toml` nel repository del sito può rompere il deploy

Oggi `quotify-website` **non ha** un file di configurazione: il deploy è
`npx wrangler pages deploy dist --project-name=quotify-website --branch=main` e funziona così da
88 commit. Introdurre un `wrangler.toml` cambia il modo in cui wrangler interpreta quel comando e
può pretendere campi che oggi non esistono.

Quindi: **il collegamento D1 si fa dalla console** (Impostazioni → Collegamenti), non con un file
nuovo. Per lo sviluppo locale si passano gli argomenti direttamente a `wrangler pages dev`, che la
documentazione indica come alternativa supportata. Il Worker dell'archiviatore avrà il **suo**
`wrangler.toml`, nella sua cartella, dove non tocca niente.

---

## 6. I dati

### 6.1 `visite` — il flusso degli eventi attribuiti

```sql
CREATE TABLE visite (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quando      TEXT NOT NULL,   -- ISO 8601 UTC
  giorno      TEXT NOT NULL,   -- YYYY-MM-DD, per raggruppare senza funzioni di data
  percorso    TEXT NOT NULL,   -- pagina d'arrivo, senza query string
  sorgente    TEXT,            -- utm_source, oppure l'host di provenienza
  mezzo       TEXT,            -- utm_medium
  campagna    TEXT,            -- utm_campaign
  contenuto   TEXT,            -- utm_content
  termine     TEXT,            -- utm_term
  provenienza TEXT,            -- host del Referer grezzo, per controllo
  paese       TEXT             -- da request.cf.country
);
CREATE INDEX visite_giorno   ON visite(giorno);
CREATE INDEX visite_campagna ON visite(campagna, giorno);
```

`giorno` è ridondante rispetto a `quando` ed è deliberato: permette di raggruppare per giorno
senza funzioni di data, che in SQLite su fusi diversi sono una fonte di errori silenziosi.

`sorgente` ha una precedenza esplicita: se c'è `utm_source` vince quello, altrimenti si ricade
sull'host del `Referer`. Così una visita da LinkedIn senza UTM e una con UTM finiscono nella
stessa colonna e si sommano.

### 6.2 `storico` — una fotografia al giorno

```sql
CREATE TABLE storico (
  giorno       TEXT PRIMARY KEY,
  preso_il     TEXT NOT NULL,
  visite       INTEGER,
  pagine_viste INTEGER,
  impressioni  INTEGER,
  clic         INTEGER,
  posizione    REAL,
  indicizzate  INTEGER,
  dati         TEXT NOT NULL    -- JSON: tutto il resto
);
```

Le sei colonne in chiaro sono quelle che vorremo sempre, e rendono un andamento una query banale.
Tutto il resto — pagine, provenienze, paesi, Core Web Vitals, e domani App Store — sta nel JSON
di `dati`, così **aggiungere una metrica non richiede una migrazione**. A 365 righe l'anno il
costo di non poterla indicizzare è nullo; il costo di una migrazione per ogni nuovo numero
sarebbe reale.

`dati` contiene anche un campo `fonti` che dice quali sorgenti hanno risposto e quali no, perché
un giorno parziale dichiarato parziale vale più di un giorno assente (§6.5).

**Le colonne sono nullabili, e lo saranno davvero.** I giorni più vecchi di 30 arriveranno solo da
Search Console, perché Cloudflare li ha già cancellati: avranno `impressioni` e `clic` pieni e
`visite` e `pagine_viste` a `NULL`. Non è un guasto, è il confine delle fonti — e chi disegnerà il
cruscotto deve distinguere un `NULL` da uno zero, perché uno significa «non lo sappiamo» e
l'altro «nessuno è passato».

### 6.3 Tre comportamenti dell'archiviatore

Contano più dello schema.

**Riscrive, non accoda.** `INSERT … ON CONFLICT(giorno) DO UPDATE`. Rieseguirlo è sempre sicuro.

**Rifà gli ultimi quattro giorni, ogni notte.** Per il §5.4. Senza questo congeleremmo per sempre
numeri che Google ha corretto, e lo scopriremmo mesi dopo guardando un grafico sbagliato senza
sapere perché.

**Riempie ogni buco che riesce ancora a vedere.** A ogni esecuzione controlla quali giorni mancano
e recupera quelli ancora disponibili alla fonte. Due conseguenze: la prima esecuzione importa
subito 16 mesi di Search Console e i ~30 giorni di Cloudflare; e una notte saltata si ripara da
sola quella dopo.

### 6.4 La regola non negoziabile del middleware

La scrittura su D1 sta dentro `waitUntil`, avvolta in un `try/catch` che inghiotte tutto.
**Una pagina non deve mai rallentare o fallire perché la statistica non è andata giù.**

Se il collegamento `DB` manca — per esempio in una distribuzione di prova che non l'ha — il
middleware non fa nulla e passa avanti, in silenzio.

### 6.5 L'archiviatore si lamenta, ma non si arrende

Interroga Cloudflare e Search Console in modo indipendente. Se una fonte cade, scrive la
fotografia con quello che ha e annota in `dati.fonti` quale è mancata. Il buco si vede, si può
ritentare, e grazie al riempimento dei buchi (§6.3) la notte dopo ci riprova da sé.

Il token Cloudflare e la chiave Google non entrano **mai** in un messaggio d'errore restituito.
`metriche.js` lo fa già giusto, col commento che spiega perché: *«passa accanto alla chiave a ogni
chiamata e non deve uscire di qui»*. Stessa disciplina.

---

## 7. Fasi

### Fase 0 — Provare l'assunto che regge tutto

Il disegno poggia sul fatto che `functions/_middleware.js` scatti **anche sulle pagine HTML
statiche**. La documentazione dice che gira su tutte le richieste del progetto, ma è il fondamento
di tutto il resto.

Un middleware minimo che aggiunge un'intestazione di risposta, un deploy, un `curl` su una pagina
statica e uno su `/api/metriche`. **Se l'assunto cade, il disegno cambia: fermarsi e chiedere, non
arrangiare.**

Non proseguire senza questa verifica fatta e il risultato incollato qui sotto.

### Fase 1 — Il database

```bash
CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh
npx wrangler d1 create quotify-metriche
# poi lo schema del §6 in migrations/0001_iniziale.sql
npx wrangler d1 migrations apply quotify-metriche --remote
```

Collegare il database al progetto Pages come `DB` **dalla console** (Impostazioni →
Collegamenti), e **non** creando un `wrangler.toml`: §5.6 spiega perché toccherebbe il comando di
deploy. Per lo sviluppo locale, gli argomenti passati direttamente a `wrangler pages dev`.

### Fase 2 — La logica pura, con i suoi test

Prima del codice che gira sul bordo, perché è qui che stanno gli errori veri.

- `lib/attribuzione.mjs` — estrazione degli UTM da un URL, classificazione di un host di
  provenienza in famiglia, e la decisione **registrare o scartare** del §4.2.
- `lib/attribuzione.test.mjs` — casi: UTM completi, UTM parziali, solo referrer esterno,
  referrer interno (scarta), nessuno dei due (scarta), query string con parametri non UTM
  (scarta), UTM con valori assurdi o lunghissimi (troncare, non rifiutare).
- `lib/cloudflare.mjs` — costruzione delle query estratta da `cruscotto.mjs` (§4.5), `fetch`
  iniettato dall'esterno.
- `lib/cloudflare.test.mjs` — con un `fetch` finto: forma della query, interpretazione della
  risposta, e il caso dell'errore GraphQL che arriva con stato 200.

Convenzione già in casa: `lib/*.test.mjs` accanto al modulo, eseguiti da `npm test`
(`node --test`). Oggi sono 70 e passano tutti: **devono restare 70 che passano, più i nuovi.**

### Fase 3 — Il middleware

`functions/_middleware.js`, guscio sottile sopra `lib/attribuzione.mjs`. Regola §6.4.

### Fase 4 — La privacy

Il paragrafo in `privacy.html` (§4.1). Attenzione: è una pagina di contenuto, quindi passa dal
gate SEO, e se si tocca `revisionato` in `data/pagine.json` serve `npm run gen` prima che il gate
torni verde.

### Fase 5 — L'archiviatore

`worker-archivio/` nello stesso repository, con il suo `wrangler.toml`:

```toml
name = "quotify-archivio"
main = "indice.mjs"
[triggers]
crons = ["0 * * * *"]   # UNO solo, ogni ora: §5.7
[limits]
subrequests = 45        # tetto di sicurezza sotto il limite di 50 del piano gratuito
```

**Un cron, tre mestieri, uno per esecuzione.** Il Worker legge l'ora da
`controller.scheduledTime` e decide:

| Ora UTC | Mestiere | Costo |
|---|---|---|
| 04 | Cloudflare: fotografie dei giorni mancanti o da rifare | nessuna firma RSA, CPU minima |
| 05 | Search Console: rendimento, storia per data | una firma, la parte pesante del §5.5 |
| 06 del lunedì | Indicizzazione: 26 controlli | una firma, 26 sottorichieste |
| tutte le altre | niente: esce subito | trascurabile |

Separare Google da Cloudflare è ciò che allarga il margine di CPU misurato al §5.5. Le 21
esecuzioni vuote al giorno sono irrilevanti rispetto alle 100.000 concesse.

Una conseguenza da sapere: se un'esecuzione fallisce, il suo mestiere riprova **il giorno dopo**
alla stessa ora, non un'ora dopo. Il riempimento dei buchi (§6.3) rende la cosa innocua.

Solo `scheduled()`, **nessun gestore `fetch`**: niente superficie HTTP, niente da proteggere.
Si prova in locale con `wrangler dev --test-scheduled`.

Interroga **un giorno per volta** per Cloudflare (§5.2), con tutte le scomposizioni in una sola
richiesta con alias (§4.6), e un tetto di **massimo 30 giorni per esecuzione**. Segreti:
`GSC_CHIAVE` e il token analytics, messi con `wrangler secret put` da stdin.

Il modulo Google non va scritto: `lib/searchconsole.mjs` espone già `rendimento`, `totali`,
`statoUrl` e `sitemap`, e `scripts/analytics/searchconsole.mjs` è un involucro di 32 righe il cui
commento dichiara che *«la logica sta nel modulo condiviso, che gira anche sul Worker»*. Questo
piano usa quella porta, com'era previsto.

Il token Cloudflare per questo Worker va creato **nuovo e di sola lettura**, con **un solo**
permesso: `Account → Analisi account → Leggi`. (Prima versione di questo piano: due permessi, anche
`Zona → Analytics`. Rivisto scrivendo l'implementazione: le query di zona restano nel cruscotto
locale, l'archiviatore legge solo Web Analytics, che sta a livello di account.) Il token di deploy, che pubblica Pages e tocca DNS e D1, non entra in un Worker.

---

## 8. Verifica

1. **Fase 0 passata**, con l'output incollato nel documento.
2. `npm test` — i 70 test esistenti verdi, più quelli nuovi.
3. Un `curl` a una pagina con `?utm_source=prova&utm_campaign=collaudo`, poi
   `npx wrangler d1 execute quotify-metriche --remote --command "SELECT * FROM visite ORDER BY id DESC LIMIT 5"`:
   la riga c'è, con i campi giusti.
4. Un `curl` a una pagina **senza** UTM e senza referrer: **nessuna riga nuova**. Lo scarto
   funziona tanto quanto la registrazione.
5. Un `curl` con il collegamento `DB` rimosso: la pagina risponde 200 e nei tempi normali. La
   regola §6.4 vale solo se è provata.
6. `wrangler dev --test-scheduled` e una `SELECT count(*) FROM storico`: **16 mesi di righe di
   Search Console alla prima esecuzione**, non una.
7. Cancellare a mano tre giorni da `storico`, rieseguire: tornano. Il riempimento dei buchi vale
   solo se è provato.
8. Confrontare una fotografia a un giorno con `npm run cruscotto` sulla stessa data: sono due
   letture indipendenti della stessa fonte e **devono dare lo stesso numero**.
9. `npx wrangler tail quotify-archivio` durante un'esecuzione vera: contare le sottorichieste e
   leggere il tempo di CPU consumato. Sono i due numeri del §5.5, e vanno visti, non supposti.
10. Dopo il collegamento D1 alla console, **rifare il deploy del sito con il comando di sempre** e
    verificare che risponda: è la prova che il §5.6 è stato rispettato.

---

## 9. Ricognizione (2026-10-10)

Comandi e output che hanno prodotto le decisioni di questo piano.

**Stato del traffico**, a conferma della scala in gioco: 21 pagine viste e 15 visite negli ultimi
7 giorni, 6 percorsi distinti. Nessun limite di D1 o di Pages Functions è lontanamente in vista.

**Il campionamento** (§5.2): tabella misurata, quattro finestre, `sampleInterval` 1 fino a 7
giorni e 10 da 14 in su.

**La query string** (§5.1): `rumPageloadEventsAdaptiveGroups` raggruppato per `requestPath`,
7 giorni — 6 percorsi, zero con `?` oppure `=`. Più l'elenco delle dimensioni dalla
documentazione Cloudflare, dove la query string non compare.

**Lo stato del repository**: nessun `wrangler.toml`, nessun D1, nessun KV; segreti `GSC_CHIAVE` e
`METRICHE_CHIAVE` sul progetto Pages `quotify-website`; una sola Pages Function
(`functions/api/metriche.js`); remote GitHub `AlessandroImpact/quotify-website` senza workflow;
88 commit.

**Lo stato dell'indicizzazione**, per riferimento: 21 pagine indicizzate su 26, invariato da 12
giorni, con `/guide/fattura-scartata-sdi` scansionata ma non indicizzata e `/assistenza`,
`/termini`, `/cookie` ancora sconosciute a Google.

---

## 10. Rischi

| Rischio | Mitigazione |
|---|---|
| Il middleware non scatta sulle pagine statiche | Fase 0 lo prova prima di scrivere il resto; se cade, il disegno cambia e si chiede |
| Il middleware rallenta il sito | Scrittura in `waitUntil` dopo la risposta; verifica 5 col collegamento rimosso |
| L'archivio si riempie di bot | Si scarta per difetto (§4.2); verifica 4 lo prova |
| Il token analytics finisce in un log o in una risposta | Mai nei messaggi d'errore, come già fa `metriche.js`; token nuovo di sola lettura |
| Si archiviano stime invece di numeri esatti | Interrogare un giorno per volta (§5.2); verifica 8 confronta con `npm run cruscotto` |
| Qualcuno si aspetta di vedere una schermata | §1: questo progetto non ha interfaccia, e il §2 dice quando arriva |
| Qualcuno si aspetta di riconoscere i visitatori di ritorno | §4.1 lo esclude per scelta, e dice il prezzo |
| L'archiviatore sfora le 50 sottorichieste del piano gratuito | §4.6 le riduce a ~7 in crociera, i due cron separano i mestieri, `[limits] subrequests = 45` ferma il resto; verifica 9 lo misura |
| L'archiviatore sfora i 10 ms di CPU del piano gratuito | Misurato: 6,8–8,6 ms nel caso peggiore con tutto insieme. Un mestiere per esecuzione allarga il margine; verifica 9 lo rimisura. Workers Paid escluso per scelta |
| L'archiviatore occupa i posti cron di altri progetti | §5.7: un solo trigger, ne restano liberi 1 su 5 |
| Un `wrangler.toml` nuovo rompe il deploy del sito | §5.6: collegamento dalla console, nessun file nuovo nella radice; verifica 10 |
