# Calcolatore tasse forfettario — piano di implementazione

> Stato: **proposta, non ancora implementata**. Data: 2026-09-03.
> Origine: i primi dati veri di Search Console (`docs/console-sito-piano.md` §3.2) — 3 impressioni
> in otto giorni, tutte sulla home, tutte riconducibili alla query di marca. **Domanda non di marca:
> zero.** Non è un problema di posizionamento: non esiste una pagina per nessuna delle query
> obiettivo. Questa è la prima pagina di contenuto del sito.

---

## 1. Obiettivo

Una pagina pubblica su `quotify.it/calcolo-tasse-forfettario` che risponde a *"quanto pago di
tasse in regime forfettario"* con una stima calcolata su fatturato, coefficiente di redditività
e cassa previdenziale — e che **si posiziona su Google**, il che non è la stessa cosa che
funzionare.

Non è un obiettivo sostituire il commercialista, né coprire ogni caso fiscale. La pagina calcola
una stima annua e dichiara cosa non copre.

Non è un obiettivo replicare il calcolo dell'app: il calcolo dell'app opera su dati reali
dell'utente, questo su tre numeri inseriti a mano.

---

## 2. Decisioni già prese (e perché)

Queste sono chiuse. Cambiarle rimette in discussione il resto del piano.

### 2.1 Lo strumento è anche il documento

Googlebot esegue il JavaScript ma indicizza l'HTML servito. Una pagina con tre campi vuoti e un
pulsante "Calcola" per Google dice *"inserisci il fatturato"*: nessuna risposta, nessun
posizionamento.

Quindi tutto ciò che deve posizionare — esempio numerico svolto, tabella dei coefficienti, FAQ,
limiti del calcolo — sta **nell'HTML statico**, prima che il JS parta. Il calcolatore è un
sovrappiù per l'utente, non il contenuto della pagina.

### 2.2 L'esempio svolto È lo stato iniziale del calcolatore

La pagina si apre su un caso calcolato per intero, scritto in HTML. Quando il JS parte non
ridisegna e non svuota niente: prende quei nodi e li rende vivi.

Le alternative sono peggiori. Un calcolatore che si popola al `load` produce un salto visivo e
una versione "vuota" della pagina che esiste comunque nel sorgente. Due blocchi separati — uno
statico per Google, uno interattivo per l'utente — sono contenuto duplicato e due verità da tenere
allineate a mano.

### 2.3 Nessun numero fiscale nel codice

`lib/forfettario.mjs` non contiene aliquote, coefficienti né minimali: li riceve come argomento.
I valori stanno in `data/parametri-fiscali-<anno>.json`, ognuno con la propria fonte citata e un
`verificatoIl`. Aggiornare l'anno prossimo significa scrivere un file, non rileggere il codice.

### 2.4 Il calcolo è un modulo puro, condiviso fra browser e build

`lib/forfettario.mjs` non tocca il DOM. Lo importa il browser e lo importa lo script che genera
l'esempio svolto nell'HTML. Così **l'esempio statico non può divergere da ciò che l'utente vede
muovendo i cursori**: è lo stesso codice sugli stessi parametri.

È anche l'unica parte davvero testabile.

### 2.5 Bundle Vite, non file statico in `public/`

Il sito ha due pattern: `main.js` passa da Vite ed esce in `/assets/` con l'hash nel nome;
`public/assistenza.js` è statico, senza hash, e per questo ha una riga dedicata in
`public/_headers:46`.

Si segue il primo. Con l'hash nel nome il file ricade sotto la regola `immutable` già esistente
(`public/_headers:42`) — una riga di configurazione in meno da ricordare, e nessun rischio di
servire una versione vecchia del calcolo. Serve comunque, perché un file in `public/` non può
importare `lib/forfettario.mjs`.

### 2.6 ⚠️ È una stima, e la pagina lo dice

La firma editoriale del sito è `Organization`, non un commercialista (decisione del 03/09). La
pagina dichiara, in HTML statico e non in un footer minuscolo: che è una stima, su quale anno
d'imposta, con quali fonti, e **cosa non copre** — casse professionali private, IRAP, addizionali,
redditi diversi dal forfettario, principio di cassa sui contributi (§6.4).

Non è prudenza legale: su query YMYL dichiarare i limiti è ciò che distingue uno strumento
affidabile da uno che promette certezze, ed è ciò che gli assistenti AI citano.

### 2.7 v1 con i nove gruppi, non con mille codici ATECO

Il forfettario non ha un coefficiente per codice: l'Allegato 4 alla L. 190/2014 raggruppa le
attività in **nove gruppi** con cinque valori. Il dato autorevole sono nove righe.

La coda lunga SEO sta nel mappare i singoli codici sul gruppo, ed è lì che c'è il volume di
lavoro. v1 copre i nove gruppi più i codici più frequenti fra i freelance; la mappatura completa
è un'espansione successiva, e solo se la pagina dimostra di prendere traffico. Non si scrivono
mille righe di dati prima di sapere se qualcuno arriva.

### 2.8 Niente librerie

Tailwind v4 e JavaScript vanilla, come il resto del sito. Nessuna libreria di grafici, nessuna di
animazione, nessun framework. La CSP in `public/_headers:18` è `script-src 'self'`: nessun
gestore inline, nessuna CDN. Tutto in `addEventListener`.

---

## 3. Perché uno strumento e non un blog

Le query obiettivo dichiarate — "fattura elettronica forfettario", "calcolo F24 forfettario",
"quanto accantonare tasse partita iva" — sono query di testa presidiate da domini con anni di
storia e migliaia di link (Fiscozen, Fatture in Cloud, portali di commercialisti, l'Agenzia delle
Entrate). Con zero backlink legittimi (§3 del piano console) e un dominio ri-registrato a marzo
2026, sono un obiettivo a 12-24 mesi, e i contenuti da soli non le vincono.

Uno strumento cambia tre cose rispetto a un articolo:

1. **La firma `Organization` è credibile.** Quotify calcola davvero l'F24 e trasmette davvero al
   SDI: lo strumento è il prodotto, non un'affermazione di competenza. La stessa firma su un
   saggio fiscale è debole.
2. **È l'unica cosa che qualcuno linka spontaneamente.** Blog, forum e gruppi di partite IVA
   linkano un calcolatore utile; non linkano il quattordicesimo articolo su cos'è il forfettario.
   È l'unica leva sull'autorità in entrata, che oggi è zero.
3. **L'intento "voglio calcolare" è meno presidiato** dell'intento "voglio capire".

Aspettativa realistica, dichiarata prima e non dopo: "calcolo tasse forfettario" non si vince in
un mese. Quello che questa pagina può ragionevolmente prendere in poche settimane è la coda —
combinazioni ATECO, "gestione separata quanto pago", "forfettario 5 per cento quanto si paga".

---

## 4. Struttura dei file

```
calcolo-tasse-forfettario.html          la pagina — HTML statico completo
calcolatore.js                          entry referenziata dall'HTML → Vite la bundla in /assets/
lib/forfettario.mjs                     il calcolo puro, zero DOM
lib/forfettario.test.mjs                i test del calcolo
data/parametri-fiscali-2026.json        aliquote, coefficienti, minimali — con fonte e data
scripts/content/genera-calcolatore.mjs  scrive tabella ed esempio dentro l'HTML
scripts/seo/rules-contenuti.mjs         regole di gate che leggono il sorgente, non dist/
```

Modifiche a file esistenti:

| File | Modifica | Perché |
|---|---|---|
| `vite.config.js:10-16` | nuovo entry `calcolatore` | altrimenti la pagina non entra nel build |
| `public/_headers` | riga `Cache-Control` per `/calcolo-tasse-forfettario` | ogni path deve matchare **una sola** regola (vedi il commento in testa al file) |
| `public/sitemap.xml` | nuova `<url>` | il gate ha già una regola sulle pagine in sitemap |
| `index.html` + footer | link alla pagina | **obbligatorio**: il gate ha una regola sulle pagine orfane |
| `package.json` | script `gen` e `test` | generazione e test |

### Tabella ed esempio: generati e committati

Nell'HTML ci sono marcatori:

```html
<!-- generato:ateco:inizio -->  …  <!-- generato:ateco:fine -->
<!-- generato:esempio:inizio --> … <!-- generato:esempio:fine -->
```

`npm run gen` li riempie leggendo il JSON dei parametri e usando `lib/forfettario.mjs`. **Il
risultato si committa**, così `npm run dev` mostra la pagina vera e non un buco.

Una regola del gate rigenera in memoria e confronta: se il JSON cambia e l'HTML non è stato
rigenerato, il build fallisce. Fonte unica, divergenza impossibile.

**Alternativa scartata**: generare dentro `dist/` dopo `vite build`, come già fa
`scripts/seo/jsonld.mjs`. Funzionerebbe, ma il JSON-LD è invisibile mentre questa è contenuto
visibile: si finirebbe a progettare la pagina in `dev` con la tabella vuota.

---

## 5. I parametri fiscali

`data/parametri-fiscali-2026.json`. Ogni valore porta la sua fonte.

```json
{
  "annoImposta": 2026,
  "verificatoIl": "2026-__-__",
  "verificatoDa": "",
  "limiteRicavi":  { "valore": 85000, "fonte": "", "url": "" },
  "impostaSostitutiva": {
    "ordinaria": { "valore": 0.15, "fonte": "", "url": "" },
    "startup":   { "valore": 0.05, "anni": 5, "fonte": "", "url": "" }
  },
  "coefficienti": [
    { "gruppo": "…", "coefficiente": 0.78, "ateco": ["…"], "fonte": "Allegato 4 L. 190/2014" }
  ],
  "inps": {
    "gestioneSeparata": { "aliquota": null, "massimale": null, "fonte": "", "url": "" },
    "artigiani":    { "fisso": null, "minimale": null, "aliquota": null, "riduzione": 0.35,
                      "fonte": "", "url": "" },
    "commercianti": { "fisso": null, "minimale": null, "aliquota": null, "riduzione": 0.35,
                      "fonte": "", "url": "" }
  }
}
```

I valori sono **deliberatamente nulli in questo piano**: vanno riempiti dopo la verifica di §15,
non copiati da memoria. Un calcolatore fiscale sbagliato è peggio di nessun calcolatore.

La pagina mostra, in HTML statico sotto il risultato: anno d'imposta, data di verifica e le fonti
con i link veri. Serve all'utente per fidarsi e al GEO — la densità di attribuzione è uno dei
criteri con cui gli assistenti decidono se citare.

---

## 6. Il calcolo

### 6.1 La catena

```
ricavi                    inseriti dall'utente (principio di cassa: incassato, non fatturato)
reddito lordo           = ricavi × coefficiente(gruppo)
contributi              = §6.2
reddito imponibile      = max(0, reddito lordo − contributi deducibili)
imposta sostitutiva     = reddito imponibile × aliquota(ordinaria | startup)
netto stimato           = ricavi − contributi − imposta sostitutiva
```

### 6.2 I contributi, per cassa

**Gestione Separata** — nessun minimale: si paga in proporzione al reddito lordo, fino al
massimale.

```
contributi = min(reddito lordo, massimale) × aliquota
```

**Artigiani e commercianti** — contributi fissi dovuti **anche a reddito zero**, più una
percentuale sulla parte eccedente il minimale. Il forfettario può optare per la riduzione del 35%
su entrambe le componenti.

```
eccedenza  = max(0, reddito lordo − minimale)
contributi = (fisso + eccedenza × aliquota) × (opzione35 ? 0,65 : 1)
```

### 6.3 Il regime al 5%

La pagina **non decide l'ammissibilità**: l'utente sceglie, la pagina spiega le condizioni
(nuova attività, nessuna attività assimilabile nei tre anni precedenti, primi cinque periodi
d'imposta) e le dichiara come responsabilità di chi calcola.

### 6.4 ⚠️ L'assunzione che va dichiarata: contributi dovuti ≠ contributi dedotti

Sono deducibili i contributi **effettivamente versati nell'anno**, non quelli maturati. Chi è al
primo anno versa poco o nulla e deduce poco o nulla; a regime, versa nell'anno anche il saldo
dell'anno prima.

Il calcolatore assume `versati = dovuti`. È l'assunzione standard di ogni simulatore, ed è
**sbagliata al primo anno di attività** — cioè proprio per il pubblico più numeroso di questa
pagina.

Non si nasconde: quando l'utente seleziona il regime startup, la pagina mostra un avviso che
spiega che al primo anno l'imposta reale sarà **più alta** della stima, perché non c'è ancora
nulla da dedurre. Dirlo è più utile che dare un numero rassicurante e sbagliato.

---

## 7. La pagina: cosa c'è nell'HTML statico

Nell'ordine, tutto presente prima che il JS parta:

1. **`<h1>` e paragrafo di apertura** che rispondono alla query in due righe, senza preamboli.
2. **Il calcolatore** con l'esempio precompilato (§2.2) — consulente informatico, 30.000 €,
   gestione separata — e la cascata dei passaggi già svolta con numeri veri.
3. **Come si calcola**, la spiegazione discorsiva della catena di §6.1.
4. **La tabella dei coefficienti** per gruppo, con i codici ATECO di ciascuno. È il blocco che
   intercetta da solo la coda lunga *"coefficiente redditività ATECO xx.xx"*.
5. **Cosa questo calcolo non copre** (§2.6).
6. **FAQ**, che diventano `FAQPage` in JSON-LD.
7. **Fonti e data di verifica.**
8. **La CTA verso l'app**, dopo il risultato e non prima: chi arriva da Google ha appena scoperto
   quanto deve, ed è l'unico momento in cui *"Quotify mette da parte questa cifra per te"* è
   un'informazione utile invece che pubblicità.

### URL e canonical

`https://quotify.it/calcolo-tasse-forfettario` — corto, contiene la query esatta, coerente con
gli URL puliti già serviti da Pages.

Lo stato del calcolatore va in querystring (`?fatturato=30000&gruppo=professionali`) perché è così
che la pagina diventa condivisibile, ed è così che si prendono link. Ma la querystring crea uno
spazio di URL infinito, e su un sito che Google degna di poche scansioni è uno spreco che si paga.

Quindi: **canonical assoluto e fisso** su `/calcolo-tasse-forfettario` da qualunque variante. Si
condivide, non si duplica.

---

## 8. Interattività

**Nessun pulsante "Calcola".** Il risultato si aggiorna mentre l'utente muove i controlli.

**La barra che si scompone.** Una barra orizzontale che rappresenta il fatturato e si divide in
tre segmenti — netto, contributi, imposta — che si ridimensionano fluidamente. Comunica in un
colpo d'occhio quanto di ciò che si fattura resta davvero. È `width` e `transform` in CSS: gira a
60fps sul telefono e pesa zero.

**I numeri contano** verso il nuovo valore invece di saltarci, con `requestAnimationFrame`. La
riga della cascata che cambia si evidenzia.

**I controlli**: slider sul fatturato 0–85.000 **con la soglia marcata sulla scala**, affiancato
da un campo numerico per la precisione; regime 5% / 15% con gli anni di attività; cassa
previdenziale; gruppo o codice ATECO con ricerca; casella per la riduzione del 35% (visibile solo
per artigiani e commercianti).

**Due cose non negoziabili.** `prefers-reduced-motion`: se impostato, i numeri cambiano e basta.
E `aria-live="polite"` sul blocco del risultato con `<label>` veri su ogni controllo — uno slider
senza etichetta, per un lettore di schermo, è un oggetto muto.

**Cosa non si fa**: nessun grafico a torta (illeggibile su tre valori di cui uno dominante),
nessuna animazione d'ingresso (ritarda l'LCP per niente), nessun effetto 3D (il fatturato di
qualcuno non è il posto per fare il figo).

---

## 9. Dati strutturati e meta di misurazione

### JSON-LD

⚠️ **`scripts/seo/jsonld.mjs` oggi non è generico**: legge `join(distDir, 'index.html')`
(`scripts/seo/jsonld.mjs:13`) ed esce con errore se vi trova già un blocco JSON-LD
(`scripts/seo/jsonld.mjs:107`). Le altre quattro pagine non hanno dati strutturati: ce li ha solo
la home. Non basta "fare come per le altre pagine" — non lo fa nessuno.

**Miglioramento mirato, dentro questo lavoro**: generalizzare `jsonld.mjs` perché iteri sulle
pagine che si dichiarano tali con un attributo (`<body data-jsonld="calcolatore">`), lasciando il
comportamento della home identico a oggi. È un refactor piccolo e obbligato: senza, ogni pagina di
contenuto futura ripete lo stesso problema. Non si estende oltre questo — nessun altro riordino di
`scripts/seo/`.

Per il calcolatore genera: `WebApplication` (`applicationCategory: FinanceApplication`),
`FAQPage`, `BreadcrumbList`.

Non `SoftwareApplication`: quello è già dichiarato per Quotify in home, e due entità dello stesso
tipo sullo stesso sito confondono l'associazione. Il calcolatore è un'applicazione web, il
prodotto è un'altra cosa.

### I meta di misurazione

```html
<meta name="quotify:query-obiettivo"  content="calcolo tasse forfettario" />
<meta name="quotify:query-secondarie" content="calcolatore regime forfettario, quanto pago di tasse in forfettario" />
<meta name="quotify:pubblicato"       content="2026-__-__" />
<meta name="quotify:revisionato"      content="2026-__-__" />
<meta name="quotify:verifica-fiscale" content="da-verificare" />
```

Meta tag e non un file di registro, per non avere due fonti che divergono: il gate li trova
scandendo `dist/` con `node-html-parser`, già dipendenza.

Quando arriverà la Fase 5 del piano console (API Search Console), questi campi sono la chiave del
join: **query dichiarata ↔ posizione misurata, con `pubblicato` come origine**. È ciò che risponde
a *"questa pagina si posiziona per quello per cui l'ho scritta, e da quando?"*. Va messo adesso:
ricostruirlo a memoria dopo venti pagine non si può.

---

## 10. Regole nuove del gate

Firma esistente: `esito(livello, id, file, riga, messaggio, suggerimento)` in
`scripts/seo/rules-page.mjs:10`.

⚠️ **Attenzione a dove vanno.** `controllaSito` riceve `distDir` e legge solo lì
(`scripts/seo/rules-site.mjs:11`), mentre i parametri fiscali e il modulo di calcolo stanno nel
**sorgente**, non in `dist/`. Metterle in `rules-site.mjs` significherebbe farle leggere fuori dal
proprio perimetro.

Quindi le regole che guardano il sorgente vanno in un modulo nuovo,
`scripts/seo/rules-contenuti.mjs`, invocato da `gate.mjs` accanto agli altri due
(`scripts/seo/gate.mjs:27-30`). `rules-site.mjs` resta su `dist/`.

| id | livello | dove | cosa impedisce |
|---|---|---|---|
| `param-fiscale-senza-fonte` | **error** | rules-contenuti | un valore comparso nel JSON senza che si sappia da dove viene |
| `calcolatore-non-sincronizzato` | **error** | rules-contenuti | HTML generato che dice una cosa e il JSON un'altra |
| `param-fiscale-scaduto` | warn → **error** | rules-contenuti | che arrivi il 2027 e la pagina calcoli col 2026 senza dirlo |
| `numeri-fiscali-nel-codice` | warn | rules-contenuti | un'aliquota rientrata di soppiatto in `lib/forfettario.mjs` |
| `query-obiettivo-mancante` | **error** | rules-page | una pagina di contenuto senza dichiarare per cosa è stata scritta |
| `verifica-fiscale-mancante` | **error** | rules-page | pubblicare un calcolo che nessuno ha controllato |
| `query-obiettivo-incoerente` | warn | rules-page | query dichiarata che non compare né in `title` né in `h1` |

### Sulla freschezza (`param-fiscale-scaduto`)

Un parametro non diventa sbagliato il 1° gennaio: un calcolo sul 2026 resta corretto *per il
2026*. Diventa sbagliato quando la gente chiede del 2027 e la pagina risponde col 2026.

E un gate che blocca il build a una **data** anziché a una modifica del codice è una mina: ci si
ritrova a non poter fare un hotfix per un motivo che non c'entra.

Quindi: **`warn` dal 1° dicembre**, **`error` dal 1° marzo** se `annoImposta` non è l'anno
corrente — le circolari INPS escono a febbraio, quindi a marzo il file aggiornato è scrivibile.
Deciso il 2026-09-03.

### `verifica-fiscale-mancante`

Blocca il build finché `quotify:verifica-fiscale` non vale `verificata`. È il modello di
produzione deciso il 03/09 reso esecutivo: la bozza la scrive l'assistente, **la materia fiscale
la verifica il proprietario**, e finché non l'ha fatto la pagina non esce.

---

## 11. Casi limite

### 11.1 Fatturato 0 con artigiani o commercianti
I contributi fissi sono dovuti lo stesso. La pagina mostra un numero positivo dove l'utente si
aspetta zero, e **lo spiega accanto al risultato** invece di lasciarlo sembrare un bug.

### 11.2 Oltre gli 85.000
Fuori dal regime. Il calcolatore non estrapola: dichiara che oltre la soglia il calcolo non vale
più e spiega la differenza fra il superamento (uscita dall'anno successivo) e la soglia superiore
(uscita immediata). La soglia è marcata sullo slider, così ci si arriva vedendola.

### 11.3 Cassa professionale privata
Avvocati, ingegneri, architetti, medici non stanno in Gestione Separata. **v1 non li copre**, e lo
dice esplicitamente invece di dare un numero sbagliato. Sono un'espansione successiva: ogni cassa
ha regole proprie.

### 11.4 Primo anno di attività
Vedi §6.4: l'assunzione `versati = dovuti` è sbagliata proprio lì. Avviso esplicito.

### 11.5 Reddito imponibile negativo
Con artigiani a fatturato basso, i contributi possono eccedere il reddito lordo. `max(0, …)`
sull'imponibile, e nessuna imposta negativa.

### 11.6 JavaScript disattivato o non ancora caricato
La pagina resta leggibile e utile: l'esempio svolto è nell'HTML (§2.2). È il caso normale per
Googlebot al primo passaggio.

### 11.7 Querystring manomessa
Valori fuori scala, negativi o non numerici: si ricade sui valori dell'esempio, senza errori in
console e senza pagina rotta.

---

## 12. Test

`lib/forfettario.mjs` è puro, quindi testabile senza DOM né browser. Con `node --test`, nessuna
dipendenza nuova.

| Caso | Verifica |
|---|---|
| Gestione separata, reddito sotto il massimale | catena completa di §6.1 |
| Gestione separata oltre il massimale | il contributo si ferma al massimale |
| Artigiani a fatturato 0 | contributi = fisso, imposta = 0 (§11.1) |
| Artigiani sopra il minimale | fisso + percentuale sull'eccedenza |
| Riduzione 35% | applicata a entrambe le componenti |
| Regime startup | aliquota 5%, non 15% |
| Imponibile negativo | `max(0, …)`, nessuna imposta negativa (§11.5) |
| Ogni gruppo dei coefficienti | il coefficiente applicato è quello del gruppo scelto |
| Parametri mancanti nel JSON | errore esplicito, non `NaN` silenzioso |

Il test più importante non è nell'elenco: **l'esempio svolto nell'HTML deve coincidere con
l'output del modulo**. Non è un test, è la regola `calcolatore-non-sincronizzato` del gate — che
non si può dimenticare di eseguire.

---

## 13. Fasi di lavoro

| # | Cosa | Verificabile da sola |
|---|---|---|
| 1 | **Verifica dei parametri fiscali** (§15) e riempimento del JSON | il file ha ogni `fonte` e `url` compilati |
| 2 | `lib/forfettario.mjs` + test | `npm test` verde su tutti i casi di §12 |
| 3 | `scripts/content/genera-calcolatore.mjs` + le regole di gate su parametri e sincronia | il gate fallisce se si tocca il JSON senza rigenerare |
| 4 | La pagina HTML statica, senza JS: contenuto, tabella, FAQ, fonti | `npm run build` passa il gate; la pagina è utile con JS disattivato |
| 5 | `calcolatore.js`: interattività e animazione | i valori cambiano, `prefers-reduced-motion` rispettato, nessuna violazione CSP |
| 6 | Generalizzare `jsonld.mjs` (§9) | la home produce lo **stesso** JSON-LD di prima, byte per byte; il calcolatore ne produce uno suo |
| 7 | Integrazione: sitemap, `_headers`, link da home e footer, meta di misurazione | gate verde, nessuna pagina orfana |
| 8 | Deploy e richiesta di indicizzazione in Search Console | la pagina è raggiungibile e Controllo URL dice "indicizzazione consentita" |

La Fase 1 è bloccante e non è codice: senza parametri verificati, tutto il resto calcola numeri
inventati.

---

## 14. Rischi

| Rischio | Gravità | Mitigazione |
|---|---|---|
| Il calcolatore dà un numero sbagliato | **alta** — è il rischio vero: Quotify vende fiducia sulle tasse altrui | Parametri con fonte e verifica umana (§5); gate `verifica-fiscale-mancante`; test su ogni ramo (§12); limiti dichiarati (§2.6) |
| I parametri invecchiano in silenzio | **alta** | `param-fiscale-scaduto`, `error` da marzo (§10) |
| La pagina non si posiziona comunque | media — probabile nei primi mesi | Aspettativa dichiarata in §3; si misura sulla coda, non sulla query di testa; i meta di §9 permettono di dirlo con i dati |
| Lo spazio di URL da querystring spreca scansioni | media | Canonical fisso (§7) |
| Si scala a mille codici ATECO prima di sapere se funziona | media | §2.7: v1 con i nove gruppi |
| Il JS gonfia il caricamento | bassa | Nessuna libreria (§2.8); il bundle attuale è 28,5 KB, c'è margine |
| Sembra consulenza fiscale | media | §2.6 e §6.4: la pagina dichiara assunzioni e limiti nel corpo, non in fondo |

---

## 15. Da verificare prima di scrivere una riga di codice

Nessuno di questi valori va scritto a memoria. Ognuno richiede la fonte ufficiale e la data.

1. **Quale classificazione ATECO è in vigore** e come si mappa sui gruppi dell'Allegato 4. La
   rinumerazione recente rende i codici del 2007 non sovrapponibili a quelli attuali, e l'utente
   confronterà con la propria visura.
2. **Aliquota della Gestione Separata** per l'anno d'imposta, e il massimale. Circolare INPS.
3. **Contributi fissi, minimale e aliquota** per artigiani e per commercianti — sono diversi fra
   loro. Circolare INPS.
4. **La riduzione del 35%**: perimetro e condizioni.
5. **I nove gruppi e i cinque coefficienti** dell'Allegato 4 alla L. 190/2014, testo vigente.
6. **Soglia dei ricavi** e regole di uscita (superamento nell'anno successivo vs uscita immediata).
7. **Condizioni del regime al 5%** e durata.

Questa verifica è la Fase 1 e la fa il proprietario, non l'assistente (decisione del 03/09).

---

## Riferimenti nel codice

| Cosa | Dove |
|---|---|
| Entry delle pagine nel build | `vite.config.js:10-16` |
| CSP — `script-src 'self'` | `public/_headers:18` |
| Regola `immutable` per `/assets/*` | `public/_headers:42` |
| Pattern del file statico senza hash (scartato, §2.5) | `public/_headers:46`, `assistenza.html:165` |
| Pattern del bundle Vite (adottato) | `assistenza.html:164`, `main.js` |
| Firma delle regole del gate | `scripts/seo/rules-page.mjs:10` |
| Regole di sito e orfane | `scripts/seo/rules-site.mjs` |
| Generazione JSON-LD — **cablata sulla home** | `scripts/seo/jsonld.mjs:13`, `:107` |
| Punto in cui `gate.mjs` compone le regole | `scripts/seo/gate.mjs:27-30` |
| `controllaSito` legge solo `dist/` | `scripts/seo/rules-site.mjs:11` |
| Catena del build | `package.json` → `scripts.build` |
| Perché questa pagina esiste | `docs/console-sito-piano.md` §3.2 |
