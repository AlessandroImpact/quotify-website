# Backlink e schede: dove può comparire quotify.it

Data della ricerca: 10 novembre 2026. Nessun account creato e niente inviato: questo è solo l'elenco.

Come ho verificato: ho aperto le pagine con un browser senza account (Playwright) e con richieste dirette. Per sapere se un link è `dofollow` o `nofollow` ho letto l'attributo `rel` dei link in uscita **su una scheda già pubblicata** dello stesso sito (per esempio Zoho Invoice o Fatture in Cloud). Quando il sito blocca i bot (403) o non ho trovato una scheda da controllare, scrivo "non determinato".

Fonte per tutto quello che si dice di Quotify: `docs/ricerca-concorrenti.md`, parte A.

---

## 0. Cosa aspettarsi, in breve

- **Quasi tutte le directory di software danno link `nofollow`, o nessun link.** AlternativeTo, SaaSHub, Product Hunt, SourceForge e la scheda base di Capterra non passano autorità in senso stretto. Servono comunque: creano pagine che si posizionano sul nome "Quotify" e sulle query "alternative a…", e portano qualche visita. Google le usa anche per capire che Quotify esiste come prodotto.
- **L'autorità vera arriva dai link editoriali**, cioè articoli italiani che parlano di forfettario e di app di fatturazione e scelgono di citare Quotify. Sono pochi e richiedono di contattare le persone una per una (sezione 4).
- **Già fatto:** Google Play collega `https://quotify.it/` dal campo "Sito web" (link senza `rel`). La pagina `alessandroterracciano.com/progetti/quotify/` collega `https://quotify.it/` con `rel="noopener noreferrer"`, quindi è un link `dofollow`.
- **Scartati:** cataloghi a pagamento con link garantiti, siti che vendono guest post, raccolte del tipo "Buy guest posts on Italian websites" e siti di comunicati stampa gratuiti.

---

## 1. Siti di recensioni e cataloghi di software

| # | Sito | Pagina per l'invio | Costo | Link | Sforzo | Priorità | Perché |
|---|---|---|---|---|---|---|---|
| 1.1 | **AlternativeTo** | https://alternativeto.net/ → "Add app" (bisogna registrarsi) | Gratis | `nofollow` (verificato sulla scheda di Zoho Invoice: sito, App Store e Play hanno tutti `rel="nofollow noopener"`) | 30 min | **Alta** | Le schede si posizionano bene su "alternative a X", e **mancano del tutto i concorrenti italiani** (vedi 1.1.a) |
| 1.2 | **SaaSHub** | https://www.saashub.com/submit | Gratis. A pagamento ci sono "Feature My Product" ed Expert | `nofollow` (verificato sulla scheda di Fatture in Cloud, che non è verificata). Per i prodotti verificati: non determinato | 30 min | **Alta** | **Fatture in Cloud ha già una scheda** (https://www.saashub.com/fatture-in-cloud, 47 alternative): Quotify va aggiunto tra le alternative. Dopo la verifica c'è la funzione "Submit", con un elenco di 110 directory |
| 1.3 | **G2** | https://sell.g2.com/create-a-profile (dichiara: "claim your profile for free") | Gratis | Non determinato: g2.com risponde 403 | 45 min più 3-5 giorni lavorativi di revisione | **Alta** | **G2 ha comprato Capterra, GetApp e Software Advice da Gartner** (accordo annunciato il 29/01/2026). Le pagine di Capterra.it portano ormai a `legal.g2.com` e `app.g2digitalmarkets.com`, quindi è probabile che lo stesso portale per i fornitori serva tutta la rete. Questo va verificato al momento dell'iscrizione |
| 1.4 | **Capterra Italia / GetApp / Software Advice** | https://www.capterra.it/company/vendors → "Accedi al tuo portale" (https://app.g2digitalmarkets.com/) oppure vendors@capterra.it | Inserzione "BASE" gratis. Il PPC è a pagamento | La tabella di Capterra riserva "Diversi link al tuo sito web" al PPC: con la scheda base **non c'è un link al sito** | 45 min | **Media** | Nessun valore come link. Però Capterra.it ha già le pagine "alternative a Fatture in Cloud" e la categoria "Software Fatturazione Elettronica", che compaiono per le query di confronto (ricerca-concorrenti B.3). Servono le recensioni dei primi utenti |
| 1.5 | **Product Hunt** | https://www.producthunt.com/ → "Launch" (serve un account) | Gratis | Nessun link diretto: sulla scheda di Zoho Invoice gli unici link esterni sono quelli dei social, e il sito passa da un redirect interno | 2-3 h (preparazione e giorno del lancio) | **Media** | Il pubblico non è italiano, ma la scheda resta, si posiziona sul nome e viene ripresa da molti aggregatori. Ha senso con l'angolo "app con assistente AI per freelance italiani" |
| 1.6 | **Uneed** | https://www.uneed.best/submit-a-tool | Coda gratuita (tempi non indicati) oppure "Fast-track" a pagamento | La pagina dichiara un "do-follow backlink", ma solo se il lancio raccoglie abbastanza voti quel giorno | 20 min | **Media** | È uno dei pochi cataloghi che dichiara un link `dofollow`. Il pubblico è di maker, poco di forfettari |
| 1.7 | **SourceForge (Business Software)** | https://sourceforge.net/software/vendors/new | Gratis | Sulla scheda di Zoho Invoice non c'è un link diretto al sito del prodotto, solo banner `nofollow` | 20 min (descrizione in inglese, massimo 1000 caratteri) | Bassa | Pagina in più sul nome, valore SEO scarso |
| 1.8 | **SoftwareSuggest** | https://www.softwaresuggest.com/vendors ("Create FREE Listing") | Gratis. PPC e premium a pagamento | Non determinato | 20 min | Bassa | È rivolto al mercato indiano e internazionale |
| 1.9 | **Crozdesk** | https://vendor.revleads.com/user/signup (indicato dalla home: "apply for a free listing") | Gratis | Non determinato (403) | 20 min | Bassa | È attivo (recensioni di novembre 2026), ma non ha presenza in Italia |
| 1.10 | **Microlaunch** | https://microlaunch.net/ → "New Launch" | La base sembra gratis; Premium, "Feature" e sponsorizzazioni a pagamento (prezzi non indicati) | Non determinato (i link hanno `?ref=microlaunch`) | 20 min | Bassa | È per maker |
| 1.11 | **BetaList** | https://betalist.com/submit | Ci sono piani a pagamento; la pagina non dice se esista un'opzione gratuita | Non determinato | 15 min | Bassa | È pensato per prodotti prima del lancio, e Quotify è già sugli store |
| — | Slant | — | — | — | — | **Escluso** | Il sito risponde con l'errore 526 (certificato SSL non valido) |

### 1.1.a AlternativeTo: Fatture in Cloud e Fiscozen

Ho controllato sia la ricerca interna sia gli indirizzi diretti `/software/<nome>/about/`:

- **Non hanno una scheda:** Fatture in Cloud (`fatture-in-cloud`, `fattureincloud`), Fiscozen, Fattura24, Danea Easyfatt (`danea-easyfatt`, `easyfatt`), FlexTax, Quickfisco, Holded, SumUp Fatture. Le ricerche "fatture", "forfettario" e "fattura elettronica" non trovano niente.
- **Hanno una scheda:** Zoho Invoice (`zoho-invoicing`), Invoice Ninja, FreshBooks, QuickBooks, Wave Accounting, Debitoor.

Quindi oggi **non esiste una pagina "alternative a Fatture in Cloud" su cui aggiungere Quotify**. Ci sono due strade:

1. Pubblicare la scheda di Quotify e indicarla come alternativa ai prodotti che hanno già una scheda (Zoho Invoice, Invoice Ninja, FreshBooks, Debitoor). È lecito e veloce.
2. AlternativeTo si basa sui contributi degli utenti, quindi chiunque può proporre una nuova app. Si può proporre **Fatture in Cloud** (e poi Fiscozen) con una descrizione neutra, e poi segnalare Quotify come sua alternativa. Il rischio è che i moderatori la considerino una mossa interessata. Conviene farlo con un account che abbia già qualche contributo, e scrivere una scheda di Fatture in Cloud corretta e senza commenti. Così Quotify sarebbe la prima alternativa elencata in una pagina che oggi non esiste.

---

## 2. Cataloghi e iniziative italiane

| # | Sito | Pagina | Costo | Link | Sforzo | Priorità | Perché |
|---|---|---|---|---|---|---|---|
| 2.1 | **StartupItalia, lista delle startup e PMI SaaS italiane** | Un articolo aggiornato dalla redazione, che accetta segnalazioni via email (secondo i risultati di ricerca; startupitalia.eu blocca i bot, quindi l'indirizzo email va letto nella pagina). Articolo: https://startupitalia.eu/?p=477940 | Gratis | Non determinato | 30 min (email più scheda) | **Alta** | È una testata italiana autorevole del settore tech. Se la redazione aggiunge Quotify, è un link editoriale |
| 2.2 | **Vetrina startup innovative (Registro Imprese / #ItalyFrontiers)** | https://startup.registroimprese.it/isin/home | Gratis | Non determinato | 1 h | **Solo se** l'attività è iscritta come startup innovativa | Il profilo è obbligatorio per chi è iscritto nella sezione speciale. È un dominio istituzionale, ma **non è accessibile se Quotify è una ditta individuale** |
| 2.3 | **La Tech Made in Italy / Osservatorio dei Software Italiani** | https://www.latechmadeinitaly.com/ (softwareitaliani.com rimanda qui). Contatti: https://www.latechmadeinitaly.com/contatto/ | L'iscrizione alla community è gratis. Per inserire un prodotto nel catalogo non è indicato né il modo né il costo | Non determinato | 20 min (email) | Bassa | C'è un catalogo di software italiani, ma non un modulo per i fornitori: va chiesto |
| 2.4 | **Appvizer.it** | https://www.appvizer.it/ (categoria "Fatture e preventivi") | Non indicato | Non determinato | 15 min (contatto) | Bassa | La home non spiega come i fornitori possano iscriversi |
| — | Startup Base (EconomyUp), Italian Tech database (Assolombarda) | — | — | — | — | **Esclusi** | I domini non rispondono (`startupbase.it`, `italiantech.assolombarda.it`) o la pagina è 404 |

---

## 3. Community: dove un link è accettato

**Regola generale:** i link da Reddit, Quora e forum sono `nofollow` o comunque non contano per l'autorità. Servono a portare persone vere verso le guide e il calcolatore, e solo se rispondono a una domanda precisa. Non vanno mai usati per pubblicare in serie.

| # | Community | Regole verificate | Come usarla | Sforzo | Priorità |
|---|---|---|---|---|---|
| 3.1 | **r/ItaliaPersonalFinance** | Regola 4, testuale: "Sono vietate la pubblicità, i referral […] Sono ammesse solo nel megathread le segnalazioni di tool gratuiti della community, senza pubblicità, abbonamenti o profitti. Ogni infrazione considerata spam comporta il ban permanente senza appello." Regola 2: i link esterni sono ammessi solo insieme a un riassunto, non come contenuto principale. Regola 7: niente contenuti scritti dall'AI | **Mai linkare Quotify**: ha un abbonamento Pro. Al massimo si risponde ai thread sul forfettario senza link, oppure con un link a una guida neutra e un riassunto nel testo, dichiarando di essere l'autore | 15 min a risposta | Bassa (rischio di ban) |
| 3.2 | **r/ItaliaStartups** | Regola 2: "No allo Spam e all'Autopromozione". Regola 5: chi chiede un parere deve descrivere l'idea o il prodotto nel post. Regola 7: niente AI | **Un solo post di richiesta di parere** ("ho costruito un'app per forfettari, cosa ne pensate?"), descritto per bene, scritto a mano, con il link nel testo | 45 min | **Media** |
| 3.3 | **r/partitaiva** | Esiste ed è attivo, ma è piccolo. Non ho trovato regole scritte nella pagina pubblica | Rispondere alle domande su fatture, F24 e bollo con il link alla guida pertinente (es. `guide/marca-da-bollo-fattura-elettronica`), dicendo di essere lo sviluppatore | 15 min a risposta | Media |
| 3.4 | **r/commercialisti** | Esiste; regole non leggibili senza login | Solo risposte tecniche, senza link al prodotto | — | Bassa |
| 3.5 | **r/italy, r/ItaliaCareerAdvice** | r/italy, regola 3: "Autopromozione, spam, sondaggi, referral" vietati. r/ItaliaCareerAdvice non è in tema | Da evitare | — | Esclusi |
| 3.6 | **Forum di FiscoeTasse** (https://www.fiscoetasse.com/forum/) | Attivo: 69.986 iscritti, 481.183 messaggi, discussioni del giorno. Le "Regole del Forum" esistono ma non le ho potute leggere. Un amministratore ha scritto in un thread che nessuno è stato bannato per aver messo link esterni. L'iscrizione richiede dati anagrafici verificabili | Leggere prima le regole. Le sezioni utili sono "Professione Professionista" e "Iva". Si risponde nel merito e si collega una guida di quotify.it solo quando risolve la domanda | 15 min a risposta | Media |
| 3.7 | **Quora in italiano** (it.quora.com) | Il sito esiste ma blocca i bot: le regole non le ho potute leggere oggi. Quora chiede di dichiarare il proprio legame con ciò che si linka (da ricontrollare nelle linee guida al momento) | Risposte su "quanto pago di tasse in forfettario", con il link al calcolatore `calcolo-tasse-forfettario` e la frase "lo sviluppo io" | 20 min a risposta | Bassa |
| 3.8 | **Gruppi Facebook sul forfettario** | **Non verificati**: la ricerca web non indicizza i gruppi. Vanno cercati dall'app di Facebook ("forfettario", "partita IVA freelance") e bisogna leggere il regolamento di ciascuno prima di scrivere: molti vietano i link | Prima partecipare, poi linkare le guide solo se le regole lo permettono | — | Da valutare |

---

## 4. Link editoriali: articoli, liste e redazioni da contattare

Qui si tratta di contattare le persone con un messaggio personale. Non si paga nulla: se una pagina chiede soldi per inserire Quotify, si lascia perdere.

| # | Chi | Pagina | Stato verificato | Proposta | Sforzo | Priorità |
|---|---|---|---|---|---|---|
| 4.1 | **CAF Centro Fiscale** (centrofiscale.com) | https://centrofiscale.com/app-fatturazione-smartphone-2026/ e molti articoli di confronto (`/confronto-software-fatturazione-2026/`, `/software-fatturazione-elettronica-gratis-2026/`, tag `alternativa-fatture-in-cloud`) | Elenca FatturAE, EFFATTA, TaxMan, Aruba, Fatture in Cloud e FatturaElettronica APP. I nomi delle app **non sono collegati** ai loro siti, mentre è collegato Fatturazione Italia, il software del CAF. Contatti: https://centrofiscale.com/contatti/ (info@centrofiscale.com) | Chiedere di aggiungere Quotify alla tabella delle app per smartphone, con i dati verificabili: Free, Pro 69,99 €/anno, iOS e Android. Il link è possibile ma non probabile, dato che hanno un prodotto concorrente | 30 min | Media |
| 4.2 | **PartitaIVA.it** (testata registrata) | https://www.partitaiva.it/software-fatturazione-elettronica/ | Articolo del 17/12/2024, mai aggiornato. Ha l'etichetta "Adv" e link tracciati con `adv`: probabilmente gli inserimenti sono commerciali. Contatti: https://www.partitaiva.it/contatti/, media kit: `/mediakit/` | Proporre un aggiornamento dell'articolo, che è vecchio di due anni. Se rispondono solo con un listino, non si procede | 30 min | Media |
| 4.3 | **Macitynet** | Ogni anno sceglie le migliori app per iPhone sviluppate in Italia (da risultati di ricerca, non verificato sul sito) | Da verificare | Segnalare Quotify come app italiana, nativa per iOS, con widget e Face ID (A.3) | 20 min | Media |
| 4.4 | **iPhoneItalia, rubrica "Sviluppatori si raccontano"** | Contributi via email (indirizzo indicato negli articoli della rubrica) | La rubrica è vecchia: **va controllato che sia ancora attiva** | Raccontare come uno sviluppatore indipendente ha costruito un'app per forfettari | 1 h | Bassa |
| 4.5 | **Testate tech e startup** (StartupItalia, EconomyUp, Punto Informatico) | Redazioni | — | Solo con una notizia vera, per esempio l'uscita su Google Play del 2/11/2026 o dati d'uso | 1 h | Bassa |
| — | FidoCommercialista ("22+ migliori programmi", aggiornato al 18/05/2026) | — | È un concorrente, si mette al primo posto e non collega gli altri software | — | — | Escluso |

### 4.a Guest post

**Non ho trovato blog italiani sul fisco o sulla partita IVA che accettino guest post gratuiti e non commerciali.** In questa nicchia i blog appartengono quasi tutti ai concorrenti (Fiscozen, FlexTax, Quickfisco, FidoCommercialista, Centro Fiscale). Le pagine "scrivi per noi" trovate sono fuori tema (viaggi, moda uomo) o tipiche della compravendita di link: sono escluse. Due sono al limite:

| Sito | Pagina | Note | Priorità |
|---|---|---|---|
| RisorseUmane-HR.it | https://www.risorseumane-hr.it/hr-blog-risorse-umane/pubblica-articolo/ | Accetta articoli su "lavoro, organizzazione, sviluppo delle persone" e li valuta per qualità. Il costo non è indicato. Si potrebbe proporre un articolo su "lavorare a partita IVA: le scadenze del primo anno" | Bassa |
| SEOriented.it | https://seoriented.it/collabora/ | Tratta di SEO e digital marketing: è fuori tema. Ammette al massimo un link esterno e chiede due link verso di sé | Esclusa |

### 4.b Podcast

Ho trovato podcast italiani sul tema, ma **nessuno con un canale dichiarato per proporsi come ospite**: "Partita Iva Easy" (Paolo Merzek, 29 episodi), "Da Zero a Freelance" (Cabina Doppia, due conduttori), "Aspirante Freelance" (10 episodi). Si possono contattare direttamente per raccontare la storia di uno sviluppatore indipendente, ma il link in uscita si limiterebbe alle note dell'episodio. Priorità bassa.

---

## 5. App store e cataloghi di app

| # | Sito | Stato | Priorità |
|---|---|---|---|
| 5.1 | Google Play | Già collega `https://quotify.it/` e `/privacy` | Fatto |
| 5.2 | App Store | Pagina https://apps.apple.com/it/app/quotify/id6761126847. Oggi non l'ho potuta controllare (errore 429): verificare che il campo "Sito web dello sviluppatore" punti a quotify.it | 5 min |
| 5.3 | AppBrain | Non trova ancora `com.alessandroterracciano.quotify` (404). Si popola da solo, forse perché l'app è distribuita solo in Italia: non serve fare niente | — |
| 5.4 | Softonic | Ha un "Publishing Centre" per gli sviluppatori. La pagina di invio non è stata trovata ed è orientata ai programmi da scaricare | Bassa |
| — | Uptodown, siti di APK | Esclusi: distribuiscono APK fuori da Google Play e non c'entrano con un'app con abbonamento | Esclusi |

---

## 6. Le 10 azioni, in ordine

1. **G2: chiedere la scheda gratuita** (https://sell.g2.com/create-a-profile) e chiedere al supporto se la stessa scheda finisce anche su Capterra.it, GetApp e Software Advice (G2 li ha comprati). Circa 45 minuti.
2. **AlternativeTo: pubblicare Quotify** come alternativa a Zoho Invoice, Invoice Ninja, FreshBooks e Debitoor. Circa 30 minuti.
3. **AlternativeTo: proporre la scheda di Fatture in Cloud** (e poi Fiscozen), con un testo neutro, e collegare Quotify come alternativa. Oggi quella pagina non esiste. Circa 30 minuti.
4. **SaaSHub: verificare la scheda** e aggiungere Quotify alle alternative di Fatture in Cloud. Poi usare la loro funzione "Submit", ma scegliendo solo le directory pertinenti. Circa 45 minuti.
5. **StartupItalia: chiedere l'inserimento nella lista dei SaaS italiani** con un'email alla redazione. È il link editoriale più probabile. Circa 30 minuti.
6. **Capterra.it: scheda base** tramite il portale G2 Digital Markets, solo se non è già coperta dal punto 1. Poi chiedere recensioni ai primi utenti. Circa 45 minuti.
7. **CAF Centro Fiscale e PartitaIVA.it: proporre l'aggiornamento** delle tabelle delle app, con i dati verificati. Senza pagare. Circa 1 ora.
8. **r/ItaliaStartups: un solo post di richiesta di parere**, scritto a mano, nel rispetto delle regole 2, 5 e 7. Circa 45 minuti.
9. **Product Hunt e Uneed**: un lancio ciascuno, preparato bene. Uneed dichiara un link `dofollow` se il lancio riceve abbastanza voti. Circa 3 ore in tutto.
10. **Forum di FiscoeTasse e r/partitaiva**: due o tre risposte utili a settimana, con il link alla guida pertinente (bollo, codice destinatario, fattura scartata) e senza parlare dell'abbonamento. È un lavoro continuo.

Prima dei punti 1-7: correggere le discrepanze tra sito e app segnalate in `ricerca-concorrenti.md` A.5 (#1 prova di 14 giorni, #3 "beta"). Le schede e i redattori guarderanno il sito, e una promessa di prova gratuita che non esiste toglie credibilità.

---

## 7. Testi pronti da incollare

Regole seguite: solo funzioni presenti in `ricerca-concorrenti.md` parte A; niente "illimitato", niente prova gratuita, niente "beta"; le funzioni del Pro sono indicate come tali.

### 7.1 Italiano: breve (147 caratteri)

```
Preventivi, fatture elettroniche al SDI e stima di tasse e F24 per chi è in regime forfettario. Web, iOS e Android. Piano Free, Pro da 6,99 €/mese.
```

### 7.2 Italiano: media (503 caratteri)

```
Quotify è l'app italiana pensata solo per chi è in regime forfettario. Crei preventivi in PDF, li segui su una bacheca dei progetti e li trasformi in fattura con un tocco. Il cruscotto stima quanto accantonare per imposta sostitutiva e contributi INPS, calcolati sull'incassato. Con il Pro le fatture elettroniche partono verso il SDI con firma e conservazione a norma incluse, lo stato arriva in tempo reale e l'F24 è calcolato riga per riga. Web, iOS e Android. Free; Pro a 6,99 €/mese o 69,99 €/anno.
```

### 7.3 Italiano: lunga (circa 1250 caratteri)

```
Quotify è un'app italiana per freelance e professionisti in regime forfettario, e fa una cosa sola: tenere insieme preventivi, fatture e tasse di chi ha questa partita IVA.

Preventivi: tre modelli PDF, un catalogo dei servizi e una bacheca Kanban che segue ogni progetto da "preventivo da fare" ad "accettato". Quando il cliente dice sì, il preventivo diventa fattura con un tocco. Con il piano Pro il cliente può accettare o rifiutare il preventivo online da un link.

Fatture: XML FatturaPA con le diciture del forfettario, marca da bollo virtuale aggiunta in automatico sopra i 77,47 €, note di credito. Con il Pro l'invio al SDI include firma e conservazione a norma, e lo stato della fattura (consegnata, scartata) arriva in tempo reale con una notifica.

Tasse: il cruscotto stima l'imposta sostitutiva (15% o 5%) e i contributi della Gestione Separata sull'incassato, con il coefficiente del tuo codice ATECO, e avvisa quando ti avvicini alla soglia degli 85.000 €. Il Pro calcola le righe dell'F24 con i codici tributo ed esporta un CSV per il commercialista.

QuotifAI, l'assistente AI, crea e aggiorna i progetti e risponde sui numeri del cruscotto. Quotify funziona sul web e con le app iOS e Android. Piano Free; Pro a 6,99 €/mese o 69,99 €/anno.
```

### 7.4 English: short (144 characters)

```
Quotes, Italian e-invoices sent to SDI and tax and F24 estimates for freelancers under Italy's regime forfettario. Web, iOS, Android. Free plan.
```

### 7.5 English: medium (505 characters)

```
Quotify is an Italian app built only for freelancers under Italy's flat-rate regime (regime forfettario). Create PDF quotes, track them on a project board and turn them into invoices in one tap. The dashboard estimates the flat tax and INPS contributions to set aside, based on income received. With Pro, e-invoices go to SDI with digital signature and legal archiving included, status updates arrive in real time and F24 lines are calculated. Web, iOS, Android. Free plan; Pro €6.99/month or €69.99/year.
```

### 7.6 Dati da tenere a portata di mano

- Nome: Quotify. Sito: https://quotify.it. Web app: https://app.quotify.it
- App: https://apps.apple.com/it/app/quotify/id6761126847, https://play.google.com/store/apps/details?id=com.alessandroterracciano.quotify
- Fondatore: Alessandro Terracciano, https://www.alessandroterracciano.com
- Categorie: Fatturazione / Invoicing; Contabilità per freelance / Freelance accounting; Preventivi / Quotes & estimates
- Prezzi: Free; Pro 6,99 €/mese o 69,99 €/anno; nessuna prova gratuita
- Limiti da dichiarare se richiesti (A.4): solo regime forfettario; non riceve le fatture passive; non fattura alla PA né a clienti esteri; non include commercialista né dichiarazione dei redditi.
- Pagine da proporre come link nelle community: `calcolo-tasse-forfettario`, `quanto-accantonare-tasse-partita-iva`, `scadenze-fiscali-forfettario`, `guide/marca-da-bollo-fattura-elettronica`, `guide/codice-destinatario`, `guide/fattura-scartata-sdi`, `guide/natura-n2-2-diciture-forfettario`.
