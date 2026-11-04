# Ricerca fiscale: grafico, copywriter, social media manager, traduttore, consulente marketing (forfettario)

**Data**: 4 novembre 2026. Base fattuale per 5 pagine SEO di quotify.it. Va verificata da una persona prima della pubblicazione.
**Non ripeto** quanto già in `docs/ricerca-professioni-forfettario.md` e nelle premesse (coeff. 78%, GS 26,07%/24%, bollo 2 euro sopra 77,47, no ritenuta c. 67, N2.2/N2.1, integrazione IVA acquisti esteri).

## Etichette
- **[V]** fonte primaria letta in questa sessione (testo visto).
- **[V-sec]** fonte primaria esistente, ma letta solo tramite riassunto dello strumento di ricerca/fetch (il PDF non era leggibile). Da riaprire a mano.
- **[D]** dedotto/ricordato, non verificato.
- **[C]** conflitto tra fonti.

## LIMITE TECNICO IMPORTANTE (leggere prima)
In questa sessione non avevo una shell. Non ho potuto scaricare e decomprimere l'xlsx ISTAT: il fetch lo restituisce come binario compresso (salvato in `/Users/alessandroterracciano/.claude-work/projects/-Users-alessandroterracciano-Developer-quotify-website/42315eea-fc92-4572-a49e-ab089b9aeaf0/tool-results/webfetch-1793780303072-1ochlc.xlsx`, illeggibile senza unzip) e il tool Read rifiuta i binari. **Quindi il punto 1 (codici vecchi e TOTALE/PARZIALE) NON è confermato.** Stessa sorte per quasi tutti i PDF dell'Agenzia delle Entrate (circ. 9/E 2019, risposta 517/2019, risposta 13/2026, circ. 26/E 2022): stream compressi non leggibili. Per quelli ho solo riassunti: [V-sec] o secondari. Le pagine HTML di Normattiva e della sezione FAQ AdE invece erano leggibili: [V].

Per chiudere il punto 1 in 2 minuti, da terminale: `mkdir x && cd x && unzip ../Corrispondenza-bidirezionale-2025-vs-2022-IT.xlsx && ls xl/worksheets` e cercare i codici in `xl/worksheets/sheet2.xml` con `xl/sharedStrings.xml` (i testi stanno nelle shared strings, il foglio contiene solo gli indici). Il file ha anche un aggiornamento 2026 (nota: https://www.istat.it/wp-content/uploads/2026/07/Aggiornamento-2026-Tavola-raccordo-bidirezionale-ATECO-2025-ATECO-2022-Nota.pdf, non letta): controllare che l'xlsx 2025 non sia superato.

---

## 1. Codici ATECO (NON confermati sul file ISTAT)

| ATECO 2025 | Descrizione 2025 | Codice vecchio (ATECO 2007 agg. 2022) | Corrispondenza | Stato |
|---|---|---|---|---|
| 74.12.09 | Altre attività di progettazione grafica e di comunicazione visiva (descrizione già [V] dal PDF ISTAT nella ricerca precedente) | non verificato; ipotesi famiglia 74.10.x | non verificata | **[D] da leggere nel file** |
| 73.11.01 | Ideazione di campagne pubblicitarie (idem) | ipotesi 73.11.01 | non verificata | [D] |
| 73.11.02 | titolo **[C]**: la ricerca precedente scrive "Conduzione di campagne di marketing e altri servizi pubblicitari"; altre pagine secondarie riportano "Servizi di consulenza sulle campagne pubblicitarie e altre attività di marketing" | ipotesi 73.11.02 | non verificata | [C]/[D] |
| 74.30.00 | Attività di traduzione e interpretariato | ipotesi 74.30.00 | non verificata | [D] |
| 70.20.09 | Consulenza imprenditoriale e altre attività di consulenza gestionale n.c.a. | ipotesi 70.22.09 | non verificata | [D] |
| 73.11.03 | Attività di influencer marketing | **nessuna fonte**; ipotesi 73.11.02 (codice nuovo, probabile corrispondenza PARZIALE) | non verificata | [D] |

Cose accertate sul 73.11.03 (secondarie, codiceateco.it): esclude content creation di influencer/blogger (58.19.00; 59.11.00 per i video), esclude pianificazione campagne social (73.11.01), esclude le apparizioni nei vlog (90.20.09). [V-sec/secondaria]. **Conseguenza fiscale rilevante**: un content creator "puro" in ATECO 2025 non ricade in 73.11.03 ma in 58.19/59.11/90.xx, cioè nel gruppo 58-63 o 90-93 al **67%**, non 78%. Da verificare nella struttura ISTAT prima di scriverlo.

Data di operatività 73.11.03 **[C]**: alcune fonti dicono 1/1/2025, altre 1/4/2025. INPS circ. 44 del 19/2/2025 dice che "dal 1° gennaio 2025" è stato introdotto 73.11.03 (letta tramite riassunto): [V-sec] https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2025/02/Circolare_14835/Allegati/15927_Circolare-numero-44-del-19-02-2025.pdf

---

## 2a. GRAFICO

### Diritti d'autore sulle opere grafiche
- Regola generale (circ. 9/E del 10/4/2019 e risposta a interpello 517 del 12/12/2019): i proventi di diritto d'autore (art. 53 c. 2 lett. b TUIR) di un forfettario seguono il regime del forfettario **solo se correlati all'attività professionale**; altrimenti sono reddito separato fuori dal regime. [V-sec: confermato da riassunti dei documenti e da un articolo di prassi; i PDF AdE non erano leggibili.]
 - circ. 9/E 2019: https://www.agenziaentrate.gov.it/portale/documents/20143/297183/Circolare+n+9+del+10+aprile+2019_Circolare+9+del+10+aprile+2019.pdf/4d0ea018-7b88-fd53-b03e-56b370db6f91
 - risposta 517/2019: https://www.agenziaentrate.gov.it/portale/documents/20143/2198423/Risposta+n.+517+del+2019.pdf/6081fc89-cabb-3cc6-e443-53c2bbc0fa2c
- Un articolo (informazionefiscale.it, secondario) fa l'esempio "grafico che cede disegni = correlato; programmatore che scrive un romanzo = non correlato" e lo attribuisce alla risposta 517/2019. L'esempio **non l'ho potuto leggere nell'AdE**: [D] come esempio AdE. Non scriverlo come citazione AdE.
- Meccanica del calcolo **[C]**: i riassunti dicono che i proventi correlati sono "ridotti del 25% (40% se under 35)" (forfetizzazione art. 54 c. 8 TUIR) e poi sommati ai compensi; un altro riassunto (e la logica dell'art. 1 c. 64 L. 190/2014, [V]: reddito = ricavi/compensi x coefficiente) farebbe pensare al coefficiente di redditività. **Non so quale sia; non scrivere né 25% né 78% per i diritti d'autore.**
- Concorrono alla soglia 85.000: i riassunti dicono che i correlati concorrono ai ricavi/compensi della soglia. [V-sec].
- Ritenuta: il committente non applica ritenuta ai compensi correlati se il professionista rilascia la dichiarazione (risposta 517/2019, [V-sec]); coerente con c. 67 [V].
- Risposta AdE n. 13 del 20/1/2026 (art. 53 c. 2 lett. b, opere musicali, per quanto riportato da Ipsoa): non letta. https://www.agenziaentrate.gov.it/portale/documents/20143/9570465/Risposta+n.+13_2026/e4264ba2-2b03-bd60-5461-25f6b42d77d1 . Da leggere a mano, può essere il riferimento più recente.

### Spese anticipate e rivendita (stampe, gadget)
- Art. 15 n. 3 DPR 633/72 [V] (Normattiva, vigente al 4/11/2026): sono escluse dalla base imponibile "le somme dovute a titolo di rimborso delle anticipazioni fatte in nome e per conto della controparte" "purché regolarmente documentate". Link: https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1972-10-26;633~art15!vig=2026-11-04
- Che le anticipazioni art. 15 **non concorrano né al reddito né alla soglia** del forfettario: solo fonti secondarie concordi (fiscal-focus.it, centrofiscale.com); **non ho trovato un documento AdE letto**. [V-sec/secondario]. La condizione (fattura intestata al cliente, importo senza ricarico) è nel testo della norma [V] ma l'applicazione al forfettario non l'ho vista nella prassi.
- Rivendita di stampe/gadget acquistati e fatturati al cliente con ricarico: nessuna fonte primaria; per logica è cessione/ricavo [D]. Se il fornitore intesta la fattura al grafico (non al cliente) non è art. 15 [D]. Coefficiente applicabile ai ricavi da cessione di beni (78% dell'attività 74.12 o 40% di un codice commercio) **non verificato**. Non scriverlo.

## 2b. COPYWRITER
- Stesso quadro di 2a (circ. 9/E 2019, risposta 517/2019): diritti d'autore **correlati** all'attività autonoma restano nel forfettario e concorrono alla soglia [V-sec]; **non correlati** (es. romanzo pubblicato con un editore, non legato al lavoro di copy) sono fuori dal regime, tassazione separata/IRPEF art. 53 c. 2 lett. b + 54 c. 8 [V-sec per il principio, D per i dettagli].
- Se non correlati concorrano alla soglia: **[C]/non risolto**. Un articolo secondario dice che anche i non fatturati vanno sommati "secondo recenti chiarimenti AdE" senza citare il documento. Non scrivere.
- L'esempio di copywriter come fattispecie correlata (testi per un cliente con cessione dei diritti d'uso nel contratto) è [D].
- Circ. 10/E 2016: https://www.agenziaentrate.gov.it/portale/documents/20143/298247/Circolare+10E+del+4+aprile+2016_Circolare+n.+10_E+del+4+aprile+2016.pdf/028b9b7e-66f0-0edf-128c-0613fd0563fd : **non letta** (PDF illeggibile); nelle ricerche non è emerso un passo sui diritti d'autore (il tema è in 9/E 2019).
- Soglia: art. 1 c. 54 lett. a L. 190/2014 [V]: "hanno conseguito ricavi ovvero hanno percepito compensi, ragguagliati ad anno, non superiori a euro 85.000". Uscita immediata: c. 71 [V] "dall'anno stesso in cui i ricavi o i compensi percepiti sono superiori a 100.000 euro". Link: https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2014-12-23;190~art1!vig=2026-11-04

## 2c. SOCIAL MEDIA MANAGER

### Acquisto di pubblicità da Meta/Google Ireland
- Base normativa [V] (Normattiva L. 190/2014 art. 1 c. 58, vigente 4/11/2026): lett. d) i forfettari "applicano alle prestazioni di servizi ricevute da soggetti non residenti o rese ai medesimi gli articoli 7-ter e seguenti" del DPR 633/72 (quindi l'acquisto di servizi da soggetto UE/extra-UE è territorialmente rilevante in Italia, con inversione contabile); lett. e-bis) "versano l'imposta relativa agli acquisti di beni o servizi per i quali si rende applicabile l'inversione contabile, compresi quelli intracomunitari, entro il 16 del secondo mese successivo a ciascuno dei trimestri solari", senza diritto a detrazione.
- **[C] rispetto alla ricerca precedente**: lì era scritto "F24 entro il 16 del mese successivo" (circ. 32/E 2023). Il testo vigente di Normattiva dice **trimestrale** (16 del secondo mese successivo al trimestre; per le date effettive: 16 maggio, 20 agosto, 16 novembre, 16 febbraio, con slittamento dei festivi, [secondario]). La lett. e-bis è stata introdotta dal D.Lgs. 81/2025 (secondario; la pagina Normattiva non indica la data di entrata in vigore nel passo letto). Il c. 60 continua a citare il termine mensile (secondario: coordinamento imperfetto). **Decorrenza in conflitto**: 13/6/2025 (pubblicazione) o acquisti dal 1/10/2025 (due letture secondarie). Per novembre 2026 il trimestrale è comunque quello vigente. Prima di pubblicare, aprire il D.Lgs. 81/2025 e la prassi AdE successiva.
- Documento: autofattura/integrazione elettronica TD17 (servizi da estero); per acquisti UE di beni TD18; extra-UE autofattura TD17 (secondarie). [V-sec] circ. 26/E del 13/7/2022: i forfettari dal 1/7/2022 sono tenuti a trasmettere i dati delle operazioni con l'estero (emesse e ricevute); le operazioni ricevute vanno trasmesse "entro il quindicesimo giorno del mese successivo"; trasmissione dei dati e adempimento di integrazione sono "autonomi" anche se un invio unico può bastare. https://www.agenziaentrate.gov.it/portale/documents/20143/4562953/circolare+n.+26+del+13.07.2022.pdf/1dd1ef7e-5561-a226-67f9-1848bb2d648f
- FAQ AdE "Fatture verso e da soggetti stranieri" [V]: autofattura elettronica in luogo dell'esterometro (circ. 14/E 2019); TD18 per acquisti intra; con codice destinatario XXXXXXX si evita l'esterometro per quella fattura ma non gli INTRA. Pagina senza data di aggiornamento. https://www.agenziaentrate.gov.it/portale/schede/comunicazioni/fatture-e-corrispettivi/faq-fe/risposte-alle-domande-piu-frequenti-categoria/fatture-verso-e-da-soggetti-stranieri-transfrontaliere
- Caso specifico "Meta Ireland/Google Ireland acquistate da forfettario": **nessun interpello o FAQ AdE trovato**. Le guide dei professionisti dicono: integrazione + versamento, IVA indetraibile. È la conseguenza diretta del c. 58 [D come applicazione]. INTRA-2 quater per servizi UE ricevuti: solo fonte secondaria, **non scrivere**.
- Codice tributo F24 per il versamento: nessuna fonte AdE letta.
- Guida compilazione FE: la versione aggiornata è la **1.9 del 5/3/2024** (non la 1.8 citata prima): https://www.agenziaentrate.gov.it/portale/documents/20143/451259/Guida_compilazione-FE-Esterometro-V_1.9_2024-03-05.pdf/67fe4c2d-1174-e8de-f1ee-cea77b7f5203 (non letta; verificare che sia ancora l'ultima).

### Budget pubblicitario del cliente anticipato e rifatturato
- Se l'inserzione è fatturata da Meta/Google **all'account del cliente** e il social media manager paga per suo conto con documento intestato al cliente: è art. 15 n. 3 [V testo norma]: non concorre alla base imponibile; prassi AdE specifica sul forfettario non letta (solo secondari: fiscal-focus.it "Forfettari. Le spese in nome e per conto non concorrono al plafond").
- Se l'account pubblicitario è del professionista e rifattura al cliente (con o senza ricarico): è un servizio acquistato in proprio e rivenduto; per la logica dell'art. 15 non è "in nome e per conto" [D], quindi compenso/ricavo e concorre alla soglia 85.000 [D]. Nessuna fonte primaria. **Non scrivere come regola AdE**; scrivere solo che dipende da chi è l'intestatario della fattura e che serve la valutazione del commercialista.

## 2d. TRADUTTORE

### Clienti UE ed extra UE
- Servizi B2B a committenti esteri: art. 1 c. 58 lett. d) [V] rimanda agli artt. 7-ter e ss.: fuori campo IVA in Italia. Natura N2.1 (artt. 7-7-septies) confermata dalla guida AdE FE [V-sec; premessa dell'utente].
- Documento: TD01, codice destinatario XXXXXXX, IdPaese del cliente (FAQ AdE transfrontaliere [V]). Per i consumatori esteri il CodiceFiscale resta vuoto [V]. Con XXXXXXX l'esterometro per quella fattura è assolto [V]. Circ. 26/E 2022 [V-sec]: forfettari obbligati alla trasmissione dei dati delle operazioni con l'estero dal 1/7/2022.
- Se per i forfettari il file XML verso l'estero sia obbligatorio sempre (anche con ricavi sotto 25.000) dal 2024: l'estensione generale della fattura elettronica ai forfettari è nell'art. 18 DL 36/2022 [secondario: edotto.com; non ho aperto il testo]. **[D], da verificare su Normattiva (DL 36/2022 art. 18).**
- **[C] N2.1 / N2.2 per i clienti esteri**: alcune fonti secondarie dicono N2.2 per tutte le operazioni di un forfettario, anche estere. Vale la premessa dell'utente (N2.1 estero); la guida AdE v1.8/1.9 elenca N2.1 per artt. 7-7-septies [V-sec]. Controllare la v1.9 a mano.
- **VIES**: nessuna fonte primaria trovata (né FAQ AdE né circolare) che dica se il forfettario debba iscriversi per servizi B2B a clienti UE. Fonti secondarie discordanti ("dipende"). Il riferimento normativo probabile è l'art. 35 c. 7-bis DPR 633/72 [D, non aperto]. **Non scrivere "obbligatoria" né "non serve".** Scrivere al massimo: l'iscrizione è gratuita e si chiede all'AdE (modello AA9/12 secondo fonti secondarie).
- INTRASTAT servizi resi (INTRA-1 quater): solo fonti secondarie dicono che il forfettario deve presentarlo. [D]. Non scrivere.

### Traduzioni giurate/asseverate
- Marca da bollo sul verbale: **16 euro ogni 4 facciate**, max 25 righe per facciata (o 16 euro ogni 100 righe); il verbale di asseverazione conta, il testo originale da tradurre no; gli allegati hanno regole separate (2 euro ciascuno, Tribunale di Pisa). [V-sec: riassunto di ricerca su promemoria Prefettura e istruzioni dei Tribunali; PDF non leggibili.] Fonti: https://prefettura.interno.gov.it/sites/default/files/99/2024-01/promemoria_asseverazioni_traduttori.pdf ; https://tribunale-treviso.giustizia.it/resources/cms/documents/ISTRUZIONI_ASSEVERAZIONE_TRADUZIONI.pdf ; https://www.tribunale.pisa.it/allegatinews/A_16209.pdf . Riferimento normativo (DPR 642/1972 tariffa): articolo non verificato.
- **Chi paga e come si espone in fattura: nessuna fonte primaria.** Prassi dichiarata da una guida non ufficiale: il traduttore la anticipa e la include nel prezzo. Se sia anticipazione art. 15 n. 3 (non concorre alla soglia) o parte del compenso: [D] non risolto. **Non scrivere una regola.**
- Il bollo di 2 euro sulla fattura del traduttore resta quello generale (>77,47) [premessa].

## 2e. CAUSE OSTATIVE (consulente marketing e in generale)
Testo Normattiva, art. 1 c. 57 L. 190/2014, "vigente al 04/11/2026" (aggiornamento 11/8/2026) [V]:
- **lett. d-bis)**: "le persone fisiche la cui attività sia esercitata prevalentemente nei confronti di datori di lavoro" "con i quali sono in corso rapporti di lavoro o erano intercorsi rapporti di lavoro nei due precedenti periodi d'imposta"; esclusa dalla causa chi inizia una nuova attività dopo il periodo di pratica obbligatoria per arti o professioni. Il tratto "ovvero nei confronti di soggetti direttamente o indirettamente riconducibili ai suddetti datori di lavoro" non risultava nei frammenti letti: [D], da verificare. Il criterio per misurare la "prevalenza" (circ. 9/E 2019) non l'ho letto.
- **lett. d-ter)**: "i soggetti che nell'anno precedente hanno percepito redditi di lavoro dipendente e redditi assimilati" "eccedenti l'importo di 30.000 euro; la verifica di tale soglia è irrilevante se il rapporto di lavoro è cessato."
- **Soglia aggiornata [V]**: il testo consolidato di L. 190/2014 mostra ancora 30.000, ma una norma speciale la porta a 35.000. L. 207/2024 art. 1 c. 12: "Per gli anni 2025 e 2026, il limite di cui all'articolo 1, comma 57, lettera d-ter) ... è elevato a 35.000 euro" (testo letto in due frammenti; la riga con il richiamo alla L. 190/2014 è confermata). L. 199/2025 art. 1 c. 27 sostituisce "l'anno 2025" con "gli anni 2025 e 2026" nel c. 12 della L. 207/2024 [V]. Quindi **35.000 per il 2025 e il 2026; 30.000 dal 2027** salvo nuova norma. https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2024-12-30;207~art1 e https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2025-12-30;199~art1
- Nota sul riferimento temporale: la d-ter guarda l'anno precedente. Dire "per chi nel 2025 ha percepito redditi di lavoro dipendente sopra 35.000 euro, il forfettario 2026 è precluso" è coerente col testo; per il 2027 vale il reddito 2026 contro 30.000 se non cambia nulla [D come applicazione]. Un disegno di legge di bilancio 2027 potrebbe cambiarlo: **non verificato** (oggi è novembre 2026, la manovra è in corso). Una versione di L. 190/2014 art. 1 "in vigore dal 1-1-2027" esiste su Normattiva ma il suo contenuto sulla d-ter non l'ho letto.
- Fonti secondarie contraddittorie (alcune dicono 30.000 per il 2026): hanno torto rispetto al testo sopra.

## 2f. INFLUENCER (bonus)
- INPS circ. 44 del 19/2/2025 (creatori di contenuti digitali) [V-sec]: l'inquadramento dipende da come si svolge l'attività; se organizzata in forma d'impresa con vendita di video o gestione di banner, rientra nel terziario commerciale (Gestione Commercianti); altri casi rientrano nel lavoro autonomo. Una news INPS del 29/5/2025 parla di Gestione Separata in modo più semplice. **[C] tra le due letture**: non dichiarare "GS" per gli influencer. https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2025.05.content-creator-indicazioni-su-come-gestire-tasse-e-contributi.html (testo non letto)
- Fiscale: nessun documento AdE letto sui compensi dalle piattaforme estere (fatturare o no a Google/Meta/TikTok, natura, ritenute estere). Segnali secondari: controlli AdE su influencer, DAC7 (le piattaforme comunicano i redditi al fisco, 31 gennaio): non rilevante per scrivere regole. Non scrivere nulla di operativo.

---

## 3. Verifiche umane prima di pubblicare
1. Estrarre i codici vecchi dall'xlsx ISTAT (foglio 2) e annotare TOTALE/PARZIALE.
2. Leggere a mano circ. 9/E 2019 e risposte 517/2019 e 13/2026 sul meccanismo di calcolo dei diritti d'autore (25/40% o coefficiente).
3. D.Lgs. 81/2025 e c. 60: versamento IVA reverse charge trimestrale, decorrenza.
4. DL 36/2022 art. 18: obbligo di fattura elettronica dei forfettari e dati esteri.
5. VIES e INTRASTAT per forfettari con servizi UE.
6. Bollo sul verbale di asseverazione: base normativa e trattamento in fattura.
7. Legge di bilancio 2027: soglia d-ter.
8. Struttura ISTAT: titolo di 73.11.02 e codice per il content creator.

## Aggiornamento 4 novembre 2026 — codici ATECO verificati sul file ISTAT [V]

Letti direttamente da `Corrispondenza-bidirezionale-2025-vs-2022-IT.xlsx`, foglio 2.

| ATECO 2025 | Descrizione | ATECO 2022 | Tipo |
|---|---|---|---|
| 74.12.09 | Altre attività di progettazione grafica e di comunicazione visiva | 74.10.29 Altre attività dei disegnatori grafici | TOTALE |
| 73.11.01 | Ideazione di campagne pubblicitarie | 73.11.01 | TOTALE |
| 73.11.02 | Conduzione di campagne di marketing e altri servizi pubblicitari | 73.11.02 (parziale: l'influencer marketing passa a 73.11.03) | TOTALE |
| 73.11.03 | Attività di influencer marketing | 73.11.02 (parte) | TOTALE |
| 74.30.0 | Attività di traduzione e interpretariato | 74.30.0 Traduzione e interpretariato | TOTALE |
| 70.20.09 | Consulenza imprenditoriale e altre attività di consulenza gestionale n.c.a. | 70.22.09 | TOTALE |

Il titolo di 73.11.02 non è più in conflitto: è quello sopra, letto sulla fonte.

## Divisione 90 al 67%: verificato sul file ISTAT [V]

- 90.11.09 «Altre attività di creazione letteraria e composizione musicale» (ex 90.03.09, parziale). Note ISTAT: scrittori individuali, composizioni musicali, **stesura di testi e composizioni per conto di terzi**, sceneggiatura, **stesura di manuali tecnici**.
- 90.11.02 «Attività di blogger indipendenti» (ex 90.03.09, parziale).
- 90.12.00 «Attività di creazione di arti visive» (ex 90.03.09, parziale). Note ISTAT: scultori, pittori, **fumettisti**, caricaturisti, calligrafi, **lettering digitale**, **creazione di arti visive in forme digitali**.
- La divisione 90 è nel gruppo «altre attività economiche» al 67% (All. 2 L. 145/2018), contro il 78% di 73.11.01 e 74.12.09.
