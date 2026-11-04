# Ricerca concorrenti per le pagine di confronto

Data della ricerca: 2 novembre 2026.

Fonti per Quotify: il codice in `~/Developer/Quotify App` (letto e basta, senza build né comandi che scrivono). I percorsi `file:riga` sono relativi a quella cartella, tranne quelli che iniziano con `index.html`, che si riferiscono a `~/Developer/quotify-website/index.html`.

Fonti per i concorrenti: solo pagine ufficiali (pagine prezzi, pagine prodotto, help center, agenziaentrate.gov.it). I prezzi indicati sono quelli visibili il 2 novembre 2026. Quando un dato non si poteva verificare su una fonte ufficiale, è scritto.

---

## PARTE A: cosa fa davvero Quotify (dal codice)

### A.1 Piani e prezzi

| Voce | Valore | Fonte |
|---|---|---|
| Piani | Due: `free` e `pro`. Il piano effettivo si calcola in un solo punto | `functions/lib/piano.ts:27-71` |
| Pro mensile | 6,99 €/mese | `src/pages/SubscriptionPage.tsx:25`; `docs/app-store-listing.md:194` |
| Pro annuale | 69,99 €/anno (5,83 €/mese, risparmio 13,89 €, cioè "-17%") | `src/pages/SubscriptionPage.tsx:25`, `:483`, `:502`; `docs/app-store-listing.md:195` |
| Web | Stripe Checkout. Il prezzo arriva da variabili d'ambiente (`STRIPE_PRICE_ID` / `STRIPE_PRICE_ID_ANNUAL`), quindi l'importo di Stripe non si legge dal codice | `functions/api/stripe/create-checkout.ts:68` |
| iOS | Apple IAP (StoreKit), prodotti `quotify_pro_monthly` e `quotify_pro_annual`. Notifiche server di Apple in `apple-s2s.ts` | `src/lib/iapPurchase.ts:5-6`; `functions/api/stripe/apple-s2s.ts` |
| Android | Google Play Billing, stessi prodotti. Notifiche RTDN in `google-rtdn.ts`. **Pubblicata su Google Play il 2026-11-02** (versione 1.1.1, versionCode 12), distribuzione solo in Italia | `functions/api/stripe/verify-google-purchase.ts`, `google-rtdn.ts`; `android/app/build.gradle:27-31`; `.claude/memory/STATUS.md:3-9`; `ANDROID-NOTES.md:155` |
| Prova gratuita | **Nessuna.** Il checkout Stripe non imposta un periodo di prova, e la decisione esplicita per iOS e Android è "nessuna offerta, nessuna prova gratuita" | `functions/api/stripe/create-checkout.ts` (nessun `trial`); `ANDROID-NOTES.md:154`, `:203` |
| Programma inviti | 3 mesi di Pro in regalo, che valgono solo con l'email verificata e non si rinnovano da soli | `functions/lib/referral.ts:30`; `functions/lib/piano.ts:44-47`; `src/pages/SubscriptionPage.tsx:356-359` |

### A.2 Cosa resta nel Free e cosa richiede il Pro (controlli lato server)

| Funzione | Free | Pro | Fonte |
|---|---|---|---|
| Progetti, preventivi, clienti | Illimitati | Illimitati | `src/pages/SubscriptionPage.tsx:380`, `:387` |
| Creazione fattura e download XML FatturaPA | Sì: l'endpoint `xml.ts` non controlla il piano | Sì | `functions/api/invoices/[id]/xml.ts` (nessun controllo su `user_plan`) |
| **Invio al SDI** | No (403, con il "muro" registrato) | Sì, senza limiti | `functions/api/invoices/[id]/send-sdi.ts:13-16`; `src/pages/InvoicePage.tsx:399-401` |
| **Modulo F24** | Solo i totali | Calcolo completo con le righe del modello | `functions/api/f24/index.ts:18-22`; `src/pages/F24Page.tsx:269` |
| Fatture ricorrenti | No | Sì | `functions/api/recurring/index.ts:73-75`; `functions/lib/recurring.ts:19` |
| Export CSV per il commercialista | No | Sì | `functions/api/invoices/export.ts:13-17` |
| Import fatture XML da altri gestionali | No | Sì | `functions/api/invoices/import.ts:10-13` |
| Link pubblico del preventivo (il cliente accetta o rifiuta online) | No | Sì | `functions/api/quotes/[id]/share.ts:16-19`; `src/pages/SharedQuotePage.tsx:63-265` |
| Logo e colore del marchio sui PDF | Ignorati dal server | Sì | `functions/api/profile/index.ts:43-47` |
| PDF preventivo senza la dicitura "Quotify" | No (filigrana) | Sì | `src/pages/QuotePage.tsx:199` |
| QuotifAI | **3 messaggi ogni 30 giorni** (finestra mobile) | **30 messaggi all'ora** (non illimitato) | `functions/api/ai/chat.ts:7-10`, `:43-48` |
| Report mensile via email e avvisi delle scadenze fiscali | No | Sì | `src/pages/SubscriptionPage.tsx:372`, `:523`; `functions/lib/piano.ts:5-14` |

### A.3 Funzioni

- **Invio al SDI**: avviene tramite **OpenAPI.it come intermediario unico**. `IdTrasmittente` è sempre la P.IVA del titolare di Quotify, mentre il `CedentePrestatore` è l'utente. La prima volta l'azienda dell'utente viene registrata automaticamente presso OpenAPI (`/business_registry_configurations` + `/api_configurations`). L'invio passa da `/invoices_signature_legal_storage`, cioè **firma e conservazione a norma inclusi** (conservazione affidata a Intesi Group, attraverso OpenAPI). Fonti: `functions/lib/sdiRegistrazione.ts:1-19`, `:136-142`, `:175-182`; `functions/api/invoices/[id]/send-sdi.ts:128-131`, `:200-205`; `CLAUDE.md:30`.
- **Stati SDI in tempo reale**: un webhook di OpenAPI aggiorna lo stato (consegnata, scartata, non consegnata, decorrenza termini) e manda una notifica push. Fonti: `functions/api/sdi/callback.ts:11-23`; `functions/lib/sdi-stato.ts`.
- **Ricezione delle fatture passive: NON c'è.** Il solo callback registrato è `customer-notification`, cioè le notifiche sulle fatture emesse. Manca qualsiasi evento o endpoint per le fatture di fornitori. Fonti: `functions/lib/sdiRegistrazione.ts:177-181`; `functions/api/sdi/callback.ts`.
- **Preventivi**: tre modelli PDF (Classico, Moderno, Minimale), catalogo servizi, conversione in fattura con un tocco (`/invoice/new?from_quote=`), link pubblico con accettazione o rifiuto (solo Pro). Fonti: `src/lib/pdfTemplates.ts:1-59`; `src/components/quote/CatalogManager.tsx`; `src/pages/QuotePage.tsx:363`; `src/pages/InvoicePage.tsx:34`.
- **Progetti e pipeline**: un Kanban con gli stati da `preventivo_da_fare` ad `accettato`/`rifiutato`, e promemoria push legati allo stato. Fonti: `functions/lib/project-state-machine.ts`; `src/components/Kanban.tsx`; `functions/api/reminders/`.
- **Clienti**: anagrafica (azienda o persona fisica), codice destinatario o PEC, ricerca dei dati aziendali da P.IVA (OpenAPI Company). Fonti: `functions/api/clients/lookup.ts:22-23`; `functions/lib/fatturaPA.ts:198-199`.
- **Fatture ricorrenti** (Pro): **solo a cadenza mensile**. Ogni occorrenza crea una bozza che l'utente deve confermare entro 7 giorni, quindi niente invio automatico. Fonti: `functions/lib/recurring.ts:10`, `:23`; `functions/api/recurring/occurrences/[id]/conferma.ts:66`.
- **Nota di credito**: sì, TD04, collegata alla fattura stornata (`DatiFattureCollegate`). Fonti: `functions/lib/fatturaPA.ts:25`, `:246`; `functions/api/invoices/index.ts:142-144`; `src/pages/InvoicePage.tsx:529-567`.
- **Marca da bollo**: bollo virtuale di 2 € aggiunto automaticamente sopra i 77,47 € e riportato nell'XML (`DatiBollo`). È **addebitato al cliente** nel totale. **Il versamento trimestrale del bollo (codici tributo 2521-2524) non è nel modulo F24.** Fonti: `functions/lib/invoiceTotals.ts:8-27`; `functions/lib/fatturaPA.ts:161-163`; `src/lib/fiscal-rules.ts:68-70` (ci sono solo 1790, 1791, 1792).
- **Calcolo delle tasse e accantonamento**: imposta sostitutiva al 15% o al 5% (start-up, con avviso dopo 5 anni), coefficiente di redditività derivato dall'ATECO (un solo coefficiente per profilo), contributi della Gestione Separata (PXX/P10). La base è **per cassa** (l'incassato, non il fatturato), con la registrazione degli incassi. Avvisi sulla soglia di 85.000 € e sull'uscita dal regime oltre i 100.000 €. Fonti: `src/lib/f24.ts:1-45`, `:167-177`, `:207-211`; `src/lib/ateco.ts:1-8`; `functions/lib/incassi.ts:1-10`; `src/components/DashboardStats.tsx:296-344`; `src/components/FiscalCalc.tsx:18-68`.
- **F24**: calcola le righe Erario (codici 1790, 1791, 1792, metodo storico, rate di giugno e novembre, soglie degli acconti) e le righe INPS della Gestione Separata. **Non paga l'F24**: spiega come pagarlo dall'home banking o da F24 web. Chi è artigiano, commerciante o iscritto a una cassa professionale ottiene solo la parte Erario. Fonti: `src/lib/f24.ts:9-20`, `:197-202`, `:243-360`; `src/pages/F24Page.tsx:149-178`.
- **Fatture scadute e incassi**: un solo avviso quando una fattura diventa scaduta senza essere incassata, l'elenco "Da incassare" e la registrazione dei pagamenti. Fonti: `functions/api/invoices/scadute.ts:1-10`; `src/components/IncassoDialog.tsx:42-44`; `functions/api/invoices/[id]/pagamenti.ts`.
- **QuotifAI**: usa il modello Claude Haiku 4.5 e ha 7 strumenti, tutti su progetti, cruscotto e promemoria (`create_project`, `update_project`, `delete_project`, `list_projects`, `get_dashboard`, `list_reminders`, `complete_reminder`). **Non crea né invia fatture.** Il prompt di sistema gli impone di presentare le cifre come "stime da accantonare". Fonti: `functions/api/ai/chat.ts:72-81`, `:87-171`, `:524-527`.
- **Esportazioni**: un CSV annuale delle fatture (numero, data, tipo, cliente, P.IVA, importi, stato, ID SDI). Manca un export massivo degli XML o in ZIP. Fonte: `functions/api/invoices/export.ts:1-25`.
- **Import**: solo file `.xml` FatturaPA singoli (niente `.p7m`, niente ZIP). Fonti: `src/components/invoice/ImportInvoiceModal.tsx:127`; `src/lib/parseXmlInvoice.ts:41`.
- **App**: iOS nativa (Capacitor) con widget sulla schermata Home, Face ID per le azioni delicate come l'invio al SDI, e accesso con Apple o Google. Android pubblicata su Google Play il 2026-11-02. Sul web c'è una PWA installabile. Fonti: `CLAUDE.md:20-22`; `widget/`; `src/lib/biometricAuth.ts`; `src/pages/InvoicePage.tsx:411-414`; `.claude/memory/STATUS.md:3`.
- **Regimi supportati**: **solo il forfettario.** L'XML ha sempre `RegimeFiscale RF19` e `Natura N2.2` con aliquota IVA allo 0%, oltre alla causale fissa senza ritenuta. Fonti: `functions/lib/fatturaPA.ts:1`, `:158`, `:211`, `:255`; `src/pages/InvoicePage.tsx:19`.

### A.4 Cosa Quotify NON fa (verificato nel codice)

1. Non riceve le fatture passive dei fornitori (`sdiRegistrazione.ts:177-181`).
2. Non gestisce regimi diversi dal forfettario: niente IVA, ordinario o semplificato (`fatturaPA.ts:211`).
3. Non fattura alla Pubblica Amministrazione: il formato è sempre FPR12, mai FPA12 (`fatturaPA.ts:189`, `:197`).
4. Non gestisce clienti esteri: `IdPaese` è fisso a `IT` per il cliente, senza TD17-TD19 né autofatture (`fatturaPA.ts:133`).
5. Non gestisce la rivalsa INPS del 4% né la cassa previdenziale (`DatiCassaPrevidenziale`), né la ritenuta d'acconto (nessuna occorrenza in `fatturaPA.ts` e `invoiceTotals.ts`).
6. Non paga l'F24 e non include il versamento del bollo nell'F24 (`F24Page.tsx:149-178`; `fiscal-rules.ts:68-70`).
7. Non prepara la dichiarazione dei redditi (Modello Redditi PF / quadro LM) e non include un commercialista.
8. Non calcola i contributi di artigiani e commercianti né quelli delle casse professionali (`f24.ts:197-202`).
9. Gestisce un solo coefficiente ATECO per profilo, senza attività multiple con coefficienti diversi (`profile/index.ts:52`).
10. Le fatture ricorrenti sono solo mensili e da confermare a mano (`recurring.ts:10`, `:23`).
11. Non ha accesso multiutente o per il commercialista: al commercialista arriva solo il CSV.
12. Non offre prova gratuita del Pro (`ANDROID-NOTES.md:154`).

### A.5 Discrepanze tra il sito (`index.html`) e il codice

| # | Il sito dice | Il codice dice | Gravità |
|---|---|---|---|
| 1 | "Il Pro lo provi 14 giorni" e "Prova Pro gratis — 14 giorni" (`index.html:717`, `:753`) | Nessuna prova gratuita su Stripe, iOS o Android (`create-checkout.ts`; `ANDROID-NOTES.md:154`, `:203`) | **Alta**: è una promessa commerciale falsa |
| 2 | "QuotifAI illimitato" (`index.html:749`) | Limite di 30 messaggi all'ora per il Pro (`ai/chat.ts:8-10`). Anche l'app scrive "illimitato" (`SubscriptionPage.tsx:368`); i Termini prevedono limiti (`TermsPage.tsx:61`) | Media |
| 3 | "Durante la beta il piano Free è completo" (`index.html:717`) | Nel Free mancano SDI, F24 completo, export, import, ricorrenti e link del preventivo (tabella A.2) | **Alta** |
| 4 | La lista del Pro non cita F24, ricorrenti, export CSV, import, report mensile e link del preventivo (`index.html:747-751`) | Sono tutte funzioni Pro (A.2) | Media: l'offerta è sottovalutata |
| 5 | Nessuna menzione del piano annuale da 69,99 € (`index.html:744`, `:817`) | Il piano annuale esiste ed è quello predefinito nell'app (`SubscriptionPage.tsx:18`, `:25`) | Media |
| 6 | "App iOS + PWA" e "App ufficiale su iPhone" (`index.html:508`, `:522`, `:806`); il Free elenca "App nativa iOS + PWA" | L'app Android è su Google Play dal 2026-11-02 (`STATUS.md:3`). Il sito ne parla solo in `guide/app-su-telefono.html` e `elimina-account.html` | Media |
| 7 | "Preventivi PDF … invio diretto al cliente" (`index.html:518`) | Il link pubblico del preventivo è solo Pro (`quotes/[id]/share.ts:16`). Nel Free resta il PDF da condividere a mano | Bassa |
| 8 | "Supporto prioritario" nel Pro (`index.html:751`) | Non esiste una coda di supporto per piano: non verificabile nel codice | Bassa |
| 9 | "Gratis durante la beta" e "chi entra durante la beta mantiene il prezzo di lancio" (`index.html:817`, `:835`) | Il codice non contiene alcuna logica di prezzo bloccato per gli utenti beta. L'app è pubblica sugli store a pagamento | Media: la parola "beta" è datata |
| 10 | "XML FatturaPA 1.2.2" (`index.html:519`, FAQ 02) | L'XML è `versione="FPR12"` con lo schema 1.2.1 (`fatturaPA.ts:189`); "1.2.2" è la versione delle specifiche tecniche | Trascurabile |
| 11 | Il sito non dice che l'invio include firma e conservazione a norma | È incluso (`sdiRegistrazione.ts:140-141`) | È un punto di forza non comunicato |

---

## PARTE B: concorrenti

Come leggere le etichette:
- **[V]** = dato letto il 2026-11-02 sulla pagina ufficiale.
- **[NV]** = la pagina ufficiale non lo dice, oppure non è stato possibile leggerla.

Limiti del metodo:
- Le pagine sono state lette in versione testo, senza eseguire JavaScript. Se un prezzo viene caricato via JS, risulta [NV].
- Le ricerche (SERP) sono state fatte con un motore non localizzato in Italia. Dicono quali pagine esistono, non la loro posizione reale su Google.it.

### B.1 Tabella riassuntiva (forfettario professionista, prezzi al 2026-11-02)

| Prodotto | Prezzo per il forfettario | IVA | Invio SDI | Ricezione passive | Conservazione | Preventivi | Calcolo tasse+INPS | F24 | Dichiarazione / commercialista | App iOS+Android |
|---|---|---|---|---|---|---|---|---|---|---|
| **Quotify** | Free 0 €; Pro 6,99 €/mese o 69,99 €/anno | prezzo finale da store [1] | Pro | **no** | sì (OpenAPI/Intesi) | sì, anche Free | sì, per cassa, GS INPS | calcolato, non pagato | no / no | sì (Android dal 2026-11-02) |
| Fatture in Cloud | 48 € il primo anno, poi 96 €/anno, max 100 documenti/anno | esclusa | sì | sì | sì | sì | solo stima tasse; INPS [NV] | solo notifiche | no / no | sì |
| Fiscozen | 49,90 €/mese o 499 €/anno (12 mesi vincolanti) | inclusa | sì | sì | sì | [NV] | sì (anche artigiani e casse) | generato, pagato dall'utente | **sì / sì** | sì [2] |
| Aruba FE | 1 € per 3 mesi, poi 29,90 €/anno | esclusa | sì | sì | sì | solo con modulo a pagamento | stima imposte; INPS [NV] | [NV] | no / no | sì (app inclusa) |
| Fattura24 | 48 € il primo anno, poi 120 €/anno | esclusa | sì | sì | **no** (rimanda all'AdE) | sì | [NV] | [NV] | no / no | sì |
| Danea Easyfatt | **[NV]**: prezzi caricati via JS | esclusa | sì (anche PA) | sì | sì (10 anni) | sì | [NV] | [NV] | no / no | no (solo desktop + Danea Transfer) |
| FlexTax | 366 €/anno (6 rate da 65,88 €) | inclusa | sì (FlexInvoice) | [NV] | [NV] | [NV] | sì (simulatori) | compilato | sì / sì (team) | **no app nativa** |
| ForfettApp | 264 €/anno; 90 €/trimestre; promo 29 € per 3 mesi | inclusa | sì | sì | [NV] | sì | sì | **pagamento automatico** | sì [3] / sì | sì |
| Quickfisco | 365 €/anno (Standard), 475 €/anno (Premium) | inclusa | sì | [NV] | [NV] | [NV] | sì | predisposto; delega solo Premium | sì / sì | sì |
| AdE "Fatture e Corrispettivi" + app FatturAE | gratis | n/a | sì | sì (consultazione) | sì, su adesione | **no** | **no** | no (gestisce solo il bollo) | no / no | sì (FatturAE, 1,6/5 su App Store) |

Note:
- [1] Gli importi Stripe sono configurati nelle variabili d'ambiente. Il prezzo mostrato in app è quello degli store.
- [2] Le piattaforme dell'app Fiscozen sono confermate dalla pagina https://www.fiscozen.it/guide/fiscozen-vs-flextax/
- [3] La FAQ di ForfettApp dice che la dichiarazione è inclusa solo nell'annuale; le liste dei piani la riportano anche negli altri. Le pagine si contraddicono.

### B.2 Schede

#### Fatture in Cloud (TeamSystem)

**Pagine ufficiali:** https://www.fattureincloud.it/costo/ (/prezzi/ restituisce 404) e https://www.fattureincloud.it/forfettari/

**Prezzi [V], IVA esclusa, canone annuale con rinnovo automatico**

| Piano | Prezzo | Documenti/anno |
|---|---|---|
| Forfettari | 4 €/mese (48 €) il primo anno e solo per nuovi clienti, poi 8 €/mese (96 €/anno) | 100, comprese le fatture ricevute; 500 anagrafiche |
| Standard | 144 €/anno | 100 |
| Premium | 252 €/anno | 400 |
| Premium Plus | 348 €/anno | 800 |
| Complete | 612 €/anno | 3.000 |

- **Costi amministrativi:** 1 € + IVA per pagamento con carta, 2,50 € + IVA con bonifico.
- **Prezzi discordanti:** i dati strutturati della pagina riportano prezzi diversi per Premium, Premium Plus e Complete (19, 27 e 39 €/mese). Usare quelli visibili.
- **Prova [V]:** 31 giorni, ma **senza fatturazione elettronica**.

**Per il forfettario [V]**
- Invio e ricezione SDI (anche verso la PA).
- Firma e conservazione tramite TS Digital.
- Preventivo convertibile in fattura.
- Note di credito.
- Bollo automatico sopra 77,47 €.
- Regime e IVA 0% inseriti in automatico.
- Avviso sulla soglia degli 85.000 €.
- "Stima delle tasse da versare".
- Notifiche delle scadenze F24; il commercialista può caricare gli F24.
- App iOS, Android e AppGallery.

**Non verificati [NV]:** contributi INPS, fatture ricorrenti nel piano Forfettari, generazione dell'F24.

**Pagine di confronto pubblicate da FIC:**
- https://www.fattureincloud.it/confronto/aruba/ ("33% di funzionalità in più", dati al 15/01/2026)
- /confronto/fattura-elettronica-app/
- /confronto/sistemi-fattureweb/
- /confronto/legalinvoice-infocert/

#### Fiscozen

**Pagina prezzi:** https://www.fiscozen.it/prezzi/

**Prezzi [V]**

| Profilo | Regime | Mensile | Annuale | IVA |
|---|---|---|---|---|
| Liberi professionisti | Forfettario | 49,90 € | 499 € | inclusa |
| Artigiani e commercianti | Forfettario | 59,90 € | 599 € | inclusa |
| Liberi professionisti | Semplificato | 119,90 € | 1.199 € | esclusa |
| Artigiani e commercianti | Semplificato | 139,90 € | 1.399 € | esclusa |

- **Extra:** 150 € (aperture, variazioni, cessazioni, dichiarazione dell'anno precedente), PEC 15 €, firma qualificata 40 €, ravvedimento 8,20 €.
- **Vincolo:** contratto di 12 mesi con rinnovo automatico; la disdetta va fatta prima del rinnovo (https://www.fiscozen.it/faq/).
- **Prova gratuita:** [NV]. C'è solo una consulenza telefonica gratuita.

**Cosa include [V]**
- Commercialista dedicato.
- Apertura della P.IVA.
- Dichiarazione dei redditi predisposta, firmata e inviata.
- F24 **generati**; li paga l'utente.
- Tasse e contributi in tempo reale, anche per artigiani, commercianti e casse professionali.
- Fatture elettroniche con conservazione.
- Ricezione delle fatture dei fornitori tramite codice destinatario.
- App.

**Non verificati [NV]:** preventivi, ricorrenti, bollo automatico, note di credito.

**Pagine di confronto pubblicate da Fiscozen:**
- https://www.fiscozen.it/guide/fiscozen-vs-flextax/
- /guide/fiscozen-vs-fidocommercialista/
- /guide/fiscozen-vs-quickfisco/
- /guide/alternativa-commercialista/

**Avvertenza:** FlexTax, nella sua pagina di confronto, attribuisce a Fiscozen 449 e 549 €. Sono dati superati.

#### Aruba Fatturazione Elettronica

**Pagine ufficiali:**
- https://www.aruba.it/listino-fatturazione-elettronica.aspx
- https://www.pec.it/acquista-fatturazione-elettronica.aspx
- https://www.pec.it/fatturazione-elettronica-regime-forfettario.aspx

**Prezzi [V], IVA esclusa**
- 1 € per i primi 3 mesi, poi 29,90 €/anno con 1 GB di spazio (circa 100.000 documenti).
- Utente aggiuntivo: 4,90 €/anno.
- Spazio extra: 29,90 €/anno per GB.
- Moduli Documenti (preventivi e proforma) e Incassi/Pagamenti (scadenzario e prima nota): 9,90 € il primo anno, poi 19,90 €/anno ciascuno.
- Modulo Ordini: 12,50 €, poi 25 €.

**Per il forfettario [V]**
- Invio, ricezione e conservazione inclusi.
- Bollo automatico (guida: https://guide.aruba.it/soluzioni-fatturazione-elettronica/fe/impostazioni-e-cambio-dati-pannello/gestione-profilo/come-attivare-bollo-automatico).
- Causale e N2.2 preimpostate.
- "Calcolatore automatico delle imposte da versare".
- Note di credito TD04.
- App mobile inclusa.
- Demo gratuita, senza invio reale.

**Non verificati [NV]:** INPS, F24, fatture ricorrenti.

**Commercialista:** non incluso. C'è solo la delega al proprio.

**Pagine di confronto pubblicate da Aruba:**
- https://www.pec.it/passa-da-fatture-in-cloud-ad-aruba.aspx
- https://www.pec.it/fatturazione-elettronica-passa-ad-aruba.aspx

#### Fattura24

**Pagina prezzi:** https://www.fattura24.com/prezzi/

**Prezzi [V], IVA esclusa**

| Piano | Primo anno | Rinnovo | Documenti/anno | Utenti |
|---|---|---|---|---|
| Professional + AI | 48 € | 120 €/anno | 3.000 | 2 |
| Business + AI | 144 € | 192 €/anno | 6.000 | 5 |
| Complete + AI | 288 € | 384 €/anno | 10.000 | illimitati |

- **Prova:** gratuita e senza carta. La durata è [NV].

**Cosa include [V]**
- Invio e ricezione SDI.
- Preventivi, ordini, DDT e note di credito.
- Profilo fiscale con regime, INPS, cassa e ritenute.
- Bollo semi-automatico: il software chiede se addebitarlo al cliente; c'è un report trimestrale dei bolli virtuali.
- App iOS e Android.

**Conservazione: NON inclusa, per scelta dichiarata [V].** La FAQ rimanda al servizio dell'AdE.

**Non verificati [NV]:** calcolo di tasse e INPS, F24, fatture ricorrenti.

**Commercialista:** non incluso.

#### Danea Easyfatt (TeamSystem)

**Pagine ufficiali:**
- https://www.danea.it/software/easyfatt/prezzi/
- https://www.danea.it/software/easyfatt/caratteristiche/

**Prezzi: NON VERIFICABILI.** Il testo visibile ha dei segnaposto ("Da € _ al mese + IVA"); le cifre vengono caricate via JS. Gli attributi analytics nel codice HTML riportano Professional 15/35, Enterprise One 25/59 ed Enterprise 40/110 (desktop/cloud), ma non dicono il periodo. **Da non usare** finché non vengono confermati in un browser.

**Edizioni e limiti [V]**
- Professional: 400 fatture elettroniche all'anno (inviate + ricevute).
- Enterprise One: 800.
- Enterprise: nessuna soglia.

**Cosa include [V]**
- Software desktop Windows, con versione cloud.
- Fatturazione verso la PA.
- Conservazione per 10 anni.
- Preventivi convertibili in fattura.
- Fatture ricorrenti (canoni).
- Bollo automatico.
- Prima nota e scadenzario.

**Optional [V]:** Modulo Contabilità a 21 €/mese.

**Non verificati [NV]:** calcolo di tasse forfettarie e INPS, F24, app mobile (esiste solo Danea Transfer).

**Commercialista:** non incluso.

**Demo:** massimo 10 documenti, senza fattura elettronica.

**Da notare:** la pagina prezzi di Easyfatt promuove anche Fatture in Cloud.

#### FlexTax

**Pagina prezzi:** https://flextax.it/prezzi/

**Prezzi [V], solo annuali, IVA inclusa, rateizzabili in 6 rate**

| Profilo forfettario | Servizio | Prezzo | Rate |
|---|---|---|---|
| Professionista | Apertura o cambio consulente + gestione | 366 € | 6 × 65,88 € |
| Artigiano/commerciante | Apertura + gestione | 560 € | – |
| Artigiano/commerciante | Cambio consulente + gestione | 399 € | – |

**Cosa include [V]**
- F24 compilati.
- Dichiarazione dei redditi.
- Simulazioni fiscali.
- Team di consulenti.
- Fatturazione con FlexInvoice.

**App: FlexTax scrive testualmente «FlexTax non dispone attualmente di un'app nativa» [V].** Fonte: https://flextax.it/flextax-vs-fiscozen/

**Non verificati [NV]:** preventivi, ricorrenti, note di credito, conservazione.

**Pagine di confronto pubblicate da FlexTax:**
- https://flextax.it/flextax-vs-fiscozen/
- https://flextax.it/alternative-fiscozen/

#### ForfettApp

**Esiste:** www.forfettapp.it, di FNC S.R.L.

**Store:**
- iOS: https://apps.apple.com/it/app/forfettapp/id1216803333
- Android: https://play.google.com/store/apps/details?id=it.fnc.forfettapp

**Pagina prezzi:** https://www.forfettapp.it/prezzi/

**Prezzi [V], IVA inclusa**
- Promo: 29 € per 3 mesi.
- Trimestrale: 90 €.
- Semestrale: 156 €.
- Annuale: 264 €.
- Nessun rinnovo automatico e nessun piano mensile.

**Cosa include [V]**
- Fatture illimitate.
- Ricezione delle fatture dei fornitori.
- Autofatture intra/extra UE.
- Preventivi con calcolo delle tasse.
- Note di credito e bollo virtuale.
- Proiezione di tasse e INPS collegata al cassetto fiscale.
- **Pagamento automatico degli F24**, anche a rate.
- Dichiarazione dei redditi (con l'incoerenza tra FAQ e piani descritta sopra).
- Commercialista.

**Limiti [V]**
- Per registrarsi servono SPID o CIE e una PEC.
- Niente ex ENPALS e niente Sistema TS.
- La dichiarazione con altri redditi costa extra, da 50 €.

#### Quickfisco

**Pagina prezzi:** https://quickfisco.it/prezzi/

**Prezzi [V], IVA inclusa**
- Standard: 365 €/anno o 36,50 €/mese.
- Premium: 475 €/anno o 47,50 €/mese.

**Cosa include [V]**
- Fatturazione illimitata.
- F24 predisposto.
- Previsionale di tasse e contributi.
- Dichiarazione dei redditi.
- Fino a 6 codici ATECO.
- App iOS e Android.
- Solo Premium: delega di pagamento F24.

**Pagina di confronto che lo cita:** Fiscozen pubblica https://www.fiscozen.it/guide/fiscozen-vs-quickfisco/

#### Agenzia delle Entrate: "Fatture e Corrispettivi" e app FatturAE

**Fonte principale:** https://www.agenziaentrate.gov.it/portale/aree-tematiche/fatturazione-elettronica/fatturazione-elettronica-site-area/servizi-consultazione-e-conservaz-fatture-elettroniche

**Prezzo [V]:** gratuito.

**Cosa fa [V]**
- Procedura web per preparare e trasmettere le fatture.
- Software per PC che le prepara soltanto, senza trasmetterle.
- App FatturAE (iOS e Android) che le prepara e le trasmette.
- Consultazione delle fatture.
- Conservazione a norma, su adesione.
- Accesso con SPID, CIE o CNS.
- Calcolo trimestrale del bollo, con pagamento tramite addebito o F24. Fonte: guida "L'imposta di bollo sulle fatture elettroniche", giugno 2026, su agenziaentrate.gov.it.

**App FatturAE:**
- App Store: https://apps.apple.com/it/app/fatturae/id1263953799
- Versione 2.2.0, aggiornata a fine ottobre 2026. Valutazione **1,6/5 su 160 voti**.
- Google Play: `it.gov.agenziaentrate.fatturae`

**Cosa non prevede:** le pagine ufficiali non citano preventivi, ricorrenti, calcolo dell'imposta sostitutiva o dell'INPS, F24 delle imposte, cruscotto. Nelle pagine di confronto va scritto "non previsto dal servizio".

#### Altri concorrenti valutati e scartati

- **FatturaElettronica APP:** ha una stima di tasse e INPS per forfettari (help center ufficiale: https://intercom.help/fatturaelettronica-app/it/articles/7858537-come-calcolare-le-tue-tasse-e-contributi). Prezzi [NV].
- **TaxMan, Libero SiFattura, Fido Commercialista:** citati solo da fonti terze, non verificati.
- **Xolo, Taxfix, Leeb, SumUp Fatture, Invoicex:** non cercati per nome. Dalle query sul forfettario non sono emersi.

### B.3 Chi presidia già le query "alternative a X" e "X vs Y"

| Query | Chi compare | Spazio per Quotify |
|---|---|---|
| alternative a Fatture in Cloud | centrofiscale.com (CAF), fidocommercialista.it, Capterra, GetApp, G2 | Medio: ci sono molti aggregatori, ma nessuno parla di forfettario e preventivi |
| Fatture in Cloud vs Aruba | FIC (/confronto/aruba/), money.it, Capterra, centrofiscale; Aruba con le pagine "passa a" | Basso: la query non riguarda Quotify |
| alternative a Fiscozen / Fiscozen vs | Fiscozen stessa (vs FlexTax, Fido, Quickfisco), FlexTax, centrofiscale, economia-italia, promarketer (affiliato) | Medio: ci sono vendor forti, ma c'è un angolo chiaro (prezzo, "senza commercialista") |
| alternative a FlexTax | solo le pagine di FlexTax stessa | **Alto: nessuna pagina di terzi** |
| ForfettApp vs / alternative | nessun risultato pertinente (solo una recensione su fintastico.com) | **Alto** |
| alternative a Fattura24 | centrofiscale, aranzulla, trend-online, shopify blog | Medio |
| alternative a Danea Easyfatt | fidocommercialista, Capterra, centrofiscale | Basso: il pubblico è diverso (PMI desktop) |
| alternativa gratuita al portale AdE / FatturAE | fastweb, investireoggi, pmi.it, economia-italia, centrofiscale | **Alto**: l'intento è "ho un'alternativa migliore del gratuito?" e Quotify ha un Free |

---

## PARTE C: sintesi per le pagine di confronto

### Punti di forza reali di Quotify (verificabili)

1. **È il più economico tra chi invia al SDI e calcola le tasse:**
   - Quotify: 69,99 €/anno.
   - Fatture in Cloud Forfettari: 96 €/anno + IVA = 117,12 € dal secondo anno, con 100 documenti.
   - Fattura24: 120 €/anno + IVA dopo il primo anno.
   - Aruba costa meno (29,90 € + IVA) ma non ha calcolo INPS né F24, e i preventivi si pagano a parte.
2. **Il piano Free è utile davvero:** preventivi, clienti e progetti illimitati, fatture XML scaricabili, cruscotto fiscale. Fatture in Cloud e Danea non hanno un free; la prova di FIC esclude la fattura elettronica.
3. **I preventivi sono al centro:** pipeline Kanban, link per l'accettazione online, conversione in fattura. Aruba li fa pagare come modulo; Fiscozen, FlexTax e il portale AdE non li hanno o non li dichiarano.
4. **Calcolo per cassa con le righe dell'F24**, codici tributo inclusi. FIC e Aruba danno solo una "stima delle tasse".
5. **Nessun limite di documenti e nessun vincolo di 12 mesi** (FIC: 100 documenti/anno; Fiscozen: contratto annuale).
6. **Conservazione a norma inclusa** (Fattura24 non la include).
7. **App iOS e Android native**, con widget e Face ID (FlexTax non ha un'app nativa; Danea è desktop).

### Punti deboli oggettivi di Quotify

1. **Nessun commercialista e nessuna dichiarazione dei redditi.** Fiscozen, FlexTax, ForfettApp e Quickfisco li includono. Per chi vuole delegare tutto, Quotify non è un sostituto.
2. **Non riceve le fatture passive.** Tutti gli altri, portale AdE compreso, sì.
3. **Non paga l'F24** (ForfettApp sì, Quickfisco Premium con delega) e non calcola né paga il bollo trimestrale (il portale AdE sì).
4. **Gestisce solo la Gestione Separata:** niente contributi di artigiani, commercianti e casse professionali (Fiscozen sì).
5. **Niente PA, niente clienti esteri, niente rivalsa INPS 4% né cassa previdenziale, un solo ATECO** (Quickfisco fino a 6, Danea e FIC fanno la PA, ForfettApp le autofatture UE).
6. **Fatture ricorrenti solo mensili e da confermare a mano.**
7. **Nessuna prova del Pro**, anche se il sito ne promette una (vedi A.5).

### Pagine di confronto consigliate

1. **Quotify vs Fatture in Cloud** (o "alternativa a Fatture in Cloud per forfettari"):
   - È la query con più volume.
   - Il confronto sul prezzo è netto: 69,99 € contro 117 € IVA inclusa dal secondo anno.
   - Pesano anche il limite di 100 documenti e i preventivi nel piano Free.
2. **Quotify vs Fiscozen** ("ti serve davvero il commercialista online?"):
   - 69,99 € contro 499 €/anno.
   - Va scritto onestamente che Fiscozen include commercialista e dichiarazione; il pubblico è chi ha già un commercialista o fa da sé.
3. **Alternativa al portale gratuito dell'Agenzia delle Entrate / FatturAE:**
   - L'intento è forte e lo spazio poco presidiato.
   - Il Free di Quotify aggiunge preventivi e calcolo delle tasse; FatturAE ha una valutazione di 1,6/5.
4. **Quotify vs Aruba Fatturazione Elettronica:**
   - È il concorrente "low cost" che tutti valutano.
   - Il confronto: preventivi e calcolo F24 inclusi, contro moduli a pagamento e nessun F24.
5. **Quotify vs ForfettApp e FlexTax** (oppure una pagina unica "app per forfettari a confronto"):
   - Nessun terzo presidia queste query.
   - Funziona come confronto tra prezzi e app (FlexTax non ha un'app nativa).

**Da evitare per ora:**
- Danea (target diverso).
- Fattura24 (vantaggio ridotto, a parte la conservazione).

**Prima di pubblicare qualsiasi confronto:**
- Correggere le discrepanze A.5 #1 e #3: un confronto che promette una prova di 14 giorni inesistente è attaccabile.
- Ricontrollare in un browser i dati [NV], in particolare i prezzi di Danea e se Fatture in Cloud e Fattura24 calcolano l'INPS.
