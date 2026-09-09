# Storia dei lavori — quotify.it

> Registro delle sessioni su questo repo. Serve a **riprendere il filo in una chat nuova**
> senza rileggere tutto: dove siamo, cosa è stato deciso e perché, cosa viene dopo.
>
> Il dettaglio sta altrove e non va duplicato qui:
> - `docs/console-sito-piano.md` — piano della console, ricognizioni, riscontri Search Console
> - `docs/calcolatore-forfettario-piano.md` — piano del calcolatore, decisioni e regole di gate
> - I messaggi di commit — ogni decisione ha il suo perché scritto lì dentro

---

## Dove siamo oggi (8 settembre 2026)

**Il sito**: 6 pagine di contenuto + home + 3 legali. Tutte indicizzate tranne le ultime
pubblicate. Circa 8.400 parole di contenuto dove il 25 agosto ce n'erano zero.

| | |
|---|---|
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
- [ ] `/guide/nota-di-credito-td04` — quando serve e come si emette
- [ ] `/guide/fattura-cliente-estero-forfettario` — UE, extra UE, codici e diciture

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

- [ ] Pagina **chi siamo** — su materia YMYL l'assenza di una pagina che dica chi c'è dietro è un segnale di fiducia mancante
- [ ] Almeno **un'immagine di contenuto** — un diagramma «dove finiscono i 100 € che fatturi»
- [ ] `assistenza.html` è magra (167 parole)

---

## Cosa viene dopo

**In corso**: le guide all'app. Sedici pagine pianificate, divise in due gruppi —
quelle che rispondono a una ricerca vera (stati della fattura, codice destinatario, fattura
scartata) e la documentazione dei moduli. Le nuove vanno sotto `/guide/<slug>`, così sono
segmentabili in Search Console.

⚠️ **`~/Developer/Quotify App/docs/guida-utente.md` è dell'11 marzo 2026 e NON va usata come
fonte**: descrive sei stati del progetto quando il codice ne ha cinque, con nomi diversi, e
non copre clienti, fatture, ricorrenti, F24, abbonamento e onboarding. La fonte è il codice:
`src/pages/` per le schermate, `src/types/index.ts` per gli stati.

**Appuntamenti**
- **21 settembre**: primo export Search Console con dati sufficienti. Guardare impressioni
  totali, quante dall'Italia, se compaiono tutte le pagine, se le query smettono di essere
  anonimizzate.
- **Metà ottobre**: rivedere le scadenze prima del picco di novembre. La pagina è marcata
  `in-evoluzione` e il gate avvisa da solo dopo 90 giorni.
- **1 marzo 2027**: il gate blocca il build se i parametri fiscali sono ancora del 2026.

**Aperto, non urgente**
- Il sito non ha **una sola immagine di contenuto**: Google Immagini è un canale inutilizzato,
  e un diagramma è l'unica cosa che qualcuno rilancerebbe spontaneamente.
- **Zero backlink legittimi**. È il vincolo che nessuna ottimizzazione supera.
- `assistenza.html` è magra (167 parole).

---

## Trappole già incontrate

- **Deploy e propagazione**: verificare il dominio pochi secondi dopo il deploy dà 404 o
  contenuto vecchio. Usare l'URL diretto del deploy (`<hash>.pages.dev`) per la verifica
  immediata, il dominio dopo qualche minuto.
- **Cache dell'edge**: l'HTML ha `s-maxage=300`, sitemap e `llms.txt` pure (erano 3600, e una
  pagina nuova restava fuori dalla sitemap servita per un'ora). Il token Cloudflare non ha il
  permesso di svuotare la cache: si aspetta o si usa il dashboard.
- **`source ~/vault/bin/cf-env.sh` va eseguito nella stessa chiamata del deploy**: in una pipe
  esporta in una subshell e il token non arriva.
- **Search Console ha 2-3 giorni di ritardo.** Nessuna misura è immediata.
- **Le richieste di indicizzazione si fanno a mano**, una per URL, e non sono automatizzabili
  finché non arrivano le API.
