# Ricerca fiscale: artigiano edile e agente di commercio in forfettario (pagine SEO quotify.it)

**Data**: 4 novembre 2026. Va verificata da una persona prima della pubblicazione.
**Non ripeto** quanto già in `docs/ricerca-professioni-forfettario.md` e `docs/ricerca-creativi-consulenti.md` (INPS circ. 14/2026, coefficienti 86% e 62%, cause ostative, c. 67, bollo, soglie).

## Etichette
- **[V]** fonte primaria letta in questa sessione (testo visto).
- **[V-sec]** fonte primaria che esiste, ma letta solo tramite un riassunto dello strumento di fetch/ricerca (molti PDF AdE ed Enasarco sono illeggibili: stream compressi). Da riaprire a mano.
- **[D]** dedotto o ricordato, non verificato.
- **[C]** conflitto o lacuna tra fonti.

## LIMITE TECNICO
In questa sessione NON avevo una shell (né Grep funzionante: manca `rg`). Non ho potuto interrogare il file ISTAT in scratchpad. **Tutti i codici ATECO vecchi sono [D] e vanno verificati da te.** Vedi sezione A1/B1.

**Allarme sul file ISTAT**: la pagina ISTAT dell'aggiornamento 2026 (15/7/2026) dice che il nuovo file "sostituisce" quello del 7/2/2025 e rivede solo le corrispondenze tra codici (descrizioni invariate; le righe cambiate sono evidenziate in giallo). [V] https://www.istat.it/notizia/relazioni-corrispondenza-ateco-2025-ateco-2022-aggiornamento-2026/
- Il file già estratto in scratchpad deriva dall'URL del 2025 (`.../2025/02/Corrispondenza-bidirezionale-2025-vs-2022-IT.xlsx`): **potrebbe essere superato**. Il file 2026: https://www.istat.it/wp-content/uploads/2026/07/Aggiornamento-2026-Tavola-raccordo-bidirezionale-ATECO-2025-ATECO-2022-italiano.xlsx
- Anche le tabelle già pubblicate nei due documenti precedenti (e il "Aggiornamento 4 novembre" in `ricerca-creativi-consulenti.md`) vanno ricontrollate sul file 2026.
- Nota: la corrispondenza ISTAT è 2025 <-> **2022**, non 2007. Il coefficiente forfettario si legge sui gruppi ATECO 2007; per le divisioni 41-43 e 46.1 la divisione è stabile (41-43 e 46.1 esistono in tutte le versioni), quindi il coefficiente non cambia col codice vecchio/nuovo purché il codice resti in 41-43 / 46.1 [D].

---

## A) ARTIGIANO EDILE

### A1. Codici ATECO (da verificare nel file ISTAT 2026)
Codici da cercare nella colonna "ATECO 2025" (e annotare TOTALE/PARZIALE e il codice 2022):

| Mestiere | Codice atteso (ATECO 2007/2022) [D] | Da verificare in ATECO 2025 |
|---|---|---|
| Elettricista | 43.21.01 Installazione di impianti elettrici in edifici o in altre opere di costruzione (inclusa manutenzione e riparazione) | 43.21.01 e figli 43.21.0x |
| Idraulico | 43.22.01 Installazione di impianti idraulici, di riscaldamento e di condizionamento dell'aria (inclusa manutenzione e riparazione) in edifici o in altre opere di costruzione | 43.22.01 e 43.22.0x |
| Imbianchino | 43.34.00 Tinteggiatura e posa in opera di vetri | 43.34.xx (in ATECO 2025 il 4° livello potrebbe essere scisso) |
| Piastrellista / posatore pavimenti | 43.33.00 Rivestimento di pavimenti e di muri | 43.33.xx |
| Cartongessista | 43.31.00 Intonacatura e stuccatura (include cartongesso) oppure 43.39.09 Altri lavori di completamento e di finitura degli edifici n.c.a. | 43.31, 43.39.xx |
| Muratore | 41.20.00 Costruzione di edifici residenziali e non residenziali; 43.99.09 Altre attività dei lavori speciali di costruzione n.c.a. (murature) | 41.20.xx, 43.99.xx |
| Serramentista | 43.32.01 Posa in opera di infissi, arredi, controsoffitti, pareti mobili e simili | 43.32.xx |

- Il coefficiente 86% si applica ai gruppi 41-43 (All. 2 L. 145/2018, già [V-sec] nei documenti precedenti), non al singolo codice.
- Trappola da controllare: l'**attività prevalente** del mestiere può cadere in un codice **fuori** da 41-43 (es. falegname 16.23.xx = 67%, fabbro/infissi in metallo 25.xx = 67%, installazione di impianti industriali 33.20.xx = 67%). Non scrivere in pagina che "tutti gli artigiani edili sono all'86%".

### A2. Iscrizione: Albo artigiani, INPS, INAIL

**Albo e INPS Artigiani** [V]: INPS, scheda "Iscrizione Gestione Artigiani": https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.iscrizione-gestione-artigiani.html
- Requisiti dell'imprenditore artigiano: 18 anni (16 con autorizzazione del tribunale); esercita l'attività personalmente come titolare, anche con l'aiuto dei familiari; svolge in modo abituale e prevalente lavoro manuale; piena responsabilità dell'impresa; rispetto dei limiti dimensionali L. 443/1985.
- Domanda di iscrizione all'Albo imprese artigiane "entro 30 giorni dall'inizio dell'attività artigiana".
- Strumento: Comunicazione Unica (quadro AA per l'Albo), presentata alla Camera di Commercio; assolve insieme Registro imprese e adempimenti INPS.
- L'iscrizione all'Albo dà origine all'obbligo INPS, ma INPS può verificare i requisiti in autonomia ("artigiani di fatto", messaggio INPS 1138 del 14/3/2018, [V-sec]): se mancano i requisiti legali, i contributi si pagano comunque per il periodo di lavoro effettivo. Fonti: https://www.inps.it/bussola/VisualizzaDoc.aspx?sVirtualURL=/Messaggi/Messaggio+numero+1138+del+14-03-2018.htm ; circ. INPS 80/2012 https://servizi2.inps.it/servizi/Bussola/VisualizzaDoc.aspx?sVirtualURL=%2FCircolari%2FCircolare+numero+80+del+08-06-2012.htm [V-sec]
- Norma L. 443/1985 art. 5, Normattiva (testo "vigente dal 7-4-2026" per la pagina): "È istituito l'albo provinciale delle imprese artigiane"; "l'iscrizione all'albo è costitutiva e condizione per la concessione delle agevolazioni"; sanzione per uso improprio della denominazione artigiana pari all'1% del fatturato con minimo 25.000 euro [V-sec, riassunto]. https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1985-08-08;443~art5!vig=2026-11-04
- **[C]** Normattiva mostra l'art. 5 con data di vigenza 7/4/2026: significa che è stato modificato di recente. Non ho letto la modifica. Verificare quale legge e se cambia il requisito di iscrizione o la sanzione prima di scrivere sulla qualifica artigiana.
- Il collegamento con coefficiente/forfettario: nessuno. L'iscrizione all'Albo non cambia il coefficiente (dipende dal codice ATECO). Cambia la gestione INPS (Artigiani).
- Contributi INPS Artigiani 2026, riduzione 35%, 50% nuovi iscritti: già nei documenti precedenti (non ripeto). Per la riduzione 50% INPS segnala apertura procedura il 8/8/2025 sul Portale delle Agevolazioni (per iscritti 2025, 36 mesi) [V-sec]; resta la lacuna di compatibilità col forfettario [C] già segnalata.

**INAIL** (titolare artigiano):
- Obbligo: DPR 1124/1965 art. 4 n. 3, assicurati "gli artigiani, che prestano abitualmente opera manuale nelle rispettive imprese" [V]. https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1965-06-30;1124~art4!vig=2026-11-04 (la mia richiesta cercava "titolari e soci"; il testo letto dice solo "artigiani che prestano abitualmente opera manuale": va bene per il titolare artigiano, ma la formula esatta sui soci non l'ho trovata.)
- INAIL pagina "Impresa artigiana senza dipendenti": il titolare è soggetto assicurante e paga ogni anno il premio con **autoliquidazione**, rateizzabile; il DURC attesta la regolarità INPS/INAIL/Casse Edili [V]. https://www.inail.it/portale/assicurazione/it/Datore-di-Lavoro/Impresa-artigiana-senza-dipendenti.html
- Calcolo [V]: premio = rata (anticipo anno in corso) + regolazione (anno precedente), entrambe sul **premio speciale unitario artigiani** comunicato da INAIL nel "Fascicolo aziende" (comunicazione delle basi di calcolo) al netto di riduzioni. Pagamento con F24 entro il 16 febbraio (2027: martedì 16/2); in 4 rate solo via Alpi online entro il 28 febbraio (rate: 16/2, 16/5, 16/8 -> 20/8, 16/11), con slittamento festivi. https://www.inail.it/portale/assicurazione/it/Datore-di-Lavoro/Impresa-artigiana-senza-dipendenti/pagamento-premio-assicurativo-e-regolarita-impresa-artigiana/autoliquidazione-impresa-artigiana-senza-dipendenti.html
- Guida autoliquidazione 2025/2026 (PDF, non letto, solo riassunto [V-sec]): c'è una riduzione per le imprese artigiane (L. 296/2006 c. 780-781) che si applica solo alla regolazione; addizionale ANMIL 1%. https://www.inail.it/content/dam/assicurazione/documenti/2025/12/Guida%20autoliquidazione%202025-2026.pdf
- **Importo del premio per il titolare: NON trovato** (dipende dalla voce di tariffa e dal premio speciale unitario). **Non scrivere una cifra.** Si può scrivere solo che esiste, che è annuale, che si paga con F24 e che il calcolo è fatto da INAIL (basi di calcolo nel Fascicolo aziende).
- Il premio INAIL non è un costo che riduce il reddito forfettario (nel forfettario i costi non si deducono; il reddito = ricavi x coefficiente) [D, ma discende da L. 190/2014 c. 64 già [V] nei doc precedenti].
- Rapporto col forfettario: INAIL dice (anche nelle guide) che l'obbligo vale per i dipendenti e per il titolare artigiano; nessuna esenzione specifica per i forfettari trovata. [D]

### A3. Fatturazione

**3a. Forfettario fornitore (subappaltatore) e reverse charge edilizia**
- Norma [V]: art. 17 c. 6 DPR 633/72, testo Normattiva vigente al 4/11/2026: lett. a) prestazioni (anche di manodopera) del settore edile rese da **subappaltatori** a imprese di costruzione/ristrutturazione, all'appaltatore principale o ad altro subappaltatore (esclusi contraenti generali); lett. a-ter) prestazioni di pulizia, demolizione, installazione di impianti e completamento relative ad edifici. Il testo letto **non** contiene eccezioni per il regime forfettario. https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1972-10-26;633~art17!vig=2026-11-04
- Regola per il forfettario: il reverse charge **non si applica alle prestazioni rese da forfettari**; il subappaltatore forfettario emette fattura senza IVA come sempre, e il committente non integra nulla. Fonte primaria: AdE, comunicato stampa del 27/3/2015 sulla circolare 14/E del 27/3/2015, che dice che il reverse charge non si applica a cessioni e prestazioni di soggetti che si avvalgono del regime forfetario o dei minimi (par. 7 della circolare) [V-sec: letto nelle citazioni di un riassunto; i due PDF AdE erano illeggibili]. Link: https://agenziaentrate.gov.it/portale/documents/20143/314020/CS+27032015+reverse_053_Com.+st.+circolare+reverse+charge+27.03.2015.pdf/e0c28690-cc9d-d323-8f1c-8b18ea6b8ded/-/cs-27032015-reverse ; circolare: https://enna.ance.it/wp-content/uploads/archivet/19940-C_M_%20n_14-E%20del%2027%20marzo%202015.pdf (copia ANCE, non AdE).
  - **Non confermato** da me sul testo della circolare. **Va letta a mano al par. 7.** Le guide (regime-forfettario.it, cavour.biz, ediltecnico.it) la citano allo stesso modo, ma una di esse attribuisce la regola anche alla circ. 37/E del 29/12/2006, che invece è anteriore al forfettario del 2015: probabilmente riferita ad altro regime (minimi): **[C] non citare la 37/E**.
  - La regola vale per la lett. a) e, per coerenza del principio ("prestazioni di forfettari"), per la a-ter) [D]. Non ho trovato interpello AdE specifico sulla a-ter) per forfettari (la risposta 845/2021 che discute la a-ter) non parla di forfettari).
- Cosa si scrive in fattura [V per N2.2 in generale; D per l'applicazione all'edilizia]: natura **N2.2** ("operazioni non soggette - altri casi"), riferimento a L. 190/2014 art. 1 c. 54-89 (guida AdE FE forfettari, già nei doc precedenti: https://www.agenziaentrate.gov.it/portale/fattura-elettronica-per-i-forfettari). **N6.x (N6.3 subappalto edile, N6.7 comparto edile e connessi) NON si usa** quando il fornitore è forfettario: N6.x è il codice del cedente in reverse charge. Le tabelle N6.3/N6.7 vengono da fonti secondarie (fattureincloud, partitaiva.it, fiscomania) e **non le ho verificate** su Allegato A/guida FE: [D]. Per la pagina basta dire "N2.2, non N6".
- Il committente (impresa) vede una fattura senza IVA e non fa TD16 [D, coerente con la regola sopra].
- Caso inverso: il forfettario **committente** che riceve fattura in reverse charge deve assolvere l'IVA e non la detrae: c. 58 lett. e-bis) L. 190/2014 [V in `ricerca-creativi-consulenti.md`]: versamento **trimestrale** (16 del secondo mese successivo al trimestre), non mensile. Il conflitto con circ. 32/E 2023 resta [C] già segnalato.
- Il forfettario subappaltatore che per errore espone IVA o scrive diciture di reverse charge: non ho trovato fonte primaria sul trattamento. Circ. 11/E 2007 punto 5.1 (fattura con IVA invece di reverse charge) è per soggetti ordinari [V-sec tramite ANCE]. **Non scrivere.**

**3b. Fatture a privati con bonus edilizi: ritenuta sui bonifici**
- Norma e aliquota [V]: AdE, "Le regole da rispettare per avere le agevolazioni fiscali": banche e Poste applicano ritenuta a titolo di acconto sul bonifico al fornitore dei lavori (art. 25 DL 78/2010); **11% per i bonifici dal 1/3/2024** (art. 1 c. 88 L. 213/2023; prima 8%). https://www.agenziaentrate.gov.it/portale/le-regole-da-rispettare-per-avere-le-agevolazioni-fiscali . Conferma: guida AdE "Recupero del patrimonio edilizio 2026" https://www.agenziaentrate.gov.it/portale/documents/20143/10186910/Recupero_patrimonio_edilizio.pdf/e35fb9b9-8b03-55a9-363d-ef20618276da [V-sec]. Codice tributo versamento banca 1039 [V-sec, scadenzario AdE].
- Dati da indicare nel bonifico [V] (stessa pagina AdE): causale che indichi il pagamento per interventi di recupero del patrimonio edilizio con detrazione; codice fiscale del beneficiario della detrazione; partita IVA o codice fiscale del beneficiario del bonifico (l'impresa); con più beneficiari della detrazione, i codici di tutti; per le parti comuni condominiali anche CF del condominio e dell'amministratore/condomino che paga. Il bonifico può essere ordinato da persona diversa dal beneficiario della detrazione.
- Errori nel bonifico [V]: se non consente la ritenuta, la detrazione non spetta salvo ripetizione del pagamento; se non correggibile, la detrazione spetta con **dichiarazione sostitutiva dell'impresa** che attesta la corretta contabilizzazione dei corrispettivi (circ. 8/E 2017 [V-sec]; ris. 55/E 2012 [V-sec]).
- **Forfettari e ritenuta**: 
  - La pagina AdE sopra **non menziona i forfettari** [V] né una dichiarazione da consegnare alla banca.
  - Ris. 47/E del 5/7/2013: per i contribuenti in **regime di vantaggio** (i "minimi", predecessori) la ritenuta non si applica se hanno rilasciato alla banca la dichiarazione; il recupero eventuale in dichiarazione è indicato in RS33 [V-sec, dal riassunto di una ricerca; PDF illeggibile]. https://www.agenziaentrate.gov.it/portale/documents/20143/304164/Risoluzione+47+05072013+ritenute+acconto_risoluzione+47ex.pdf/f94e21da-8e40-01b4-4502-255a752ec2c2
  - L'estensione ai **forfettari** (L. 190/2014 c. 67: non assoggettati a ritenuta da parte del sostituto d'imposta, con dichiarazione al sostituto [V]) risulta solo da fonti secondarie (regimeminimi.com, studiopappalardo.com, salvatorecrapanzano.com: esonero con dichiarazione alla banca; se la banca la applica comunque, si scomputa dall'imposta sostitutiva in dichiarazione, quadro RS rigo RS40, oppure si chiede il rimborso). **[C] Non ho trovato AdE primaria che dica che il c. 67 copre la ritenuta art. 25 DL 78/2010 delle banche.** Il c. 67 parla di "sostituto d'imposta", e le banche in questo caso agiscono come sostituti ex art. 25 DL 78/2010: l'estensione è plausibile [D], ma la ritenuta bancaria è disciplinata da altra norma. Il rigo RS40 va verificato sulle istruzioni del Modello Redditi PF vigente.
  - **Posizione prudente per la pagina**: non scrivere "i forfettari sono esenti" né "la banca la applica sempre". Scrivere solo: la banca applica l'11% sui bonifici per bonus edilizi (fonte AdE); chi è forfettario ha il c. 67 L. 190/2014 che esclude la ritenuta d'acconto con dichiarazione al sostituto; per i bonifici consegnare alla banca la dichiarazione è la prassi riportata dalle fonti di settore (da far verificare); se la ritenuta è stata applicata, si recupera in dichiarazione o con rimborso (rimandare al commercialista).
- Base di calcolo: 11% su importo **comprensivo di IVA** (dato 2010, circ. 40/E 2010, [V-sec]); per un forfettario IVA = 0, quindi la base è il corrispettivo [D]. https://www.agenziaentrate.gov.it/portale/documents/20143/300230/Circ+40+del+28+07+2010_Circ40e_del_280710.pdf/6a68d70f-de6f-7461-9c75-66f3c102645a
- Dati che servono al cliente per la detrazione (lato fattura): le fatture e le spese per interventi edilizi servono come documenti; non ho una fonte AdE che elenchi i campi obbligatori della fattura dell'impresa. **Il cliente conserva fattura + ricevuta del bonifico** (guida AdE "Recupero patrimonio edilizio 2026", [V-sec]); **la fattura riporta natura/diciture da forfettario**. Non scrivere altro.
- Bonus: non verificata la disciplina 2026 per aliquota/proroga delle detrazioni (ecobonus, bonus ristrutturazioni al 50% o 36%): fuori ambito, non scrivere percentuali.

**3c. Altro**: sicurezza/DURC: ignorati (salvo che il DURC attesta regolarità INPS+INAIL+Casse Edili, utile solo come nota [V]).

---

## B) AGENTE DI COMMERCIO

### B1. Codici ATECO (da verificare nel file ISTAT 2026)
Cercare in ATECO 2025 la divisione **46.1** "Intermediari del commercio" e annotare per ogni agente-tipo TOTALE/PARZIALE e codice 2022:
| Settore | Codice ATECO 2007/2022 atteso [D] |
|---|---|
| Materie prime agricole, animali vivi, tessili, semilavorati | 46.11.0x |
| Combustibili, minerali, metalli, prodotti chimici | 46.12.0x |
| Legname e materiali da costruzione | 46.13.0x |
| Macchinari, attrezzature, imbarcazioni, aeromobili | 46.14.0x |
| Mobili, articoli per la casa, ferramenta | 46.15.0x |
| Prodotti tessili, abbigliamento, calzature, pelletteria | 46.16.0x |
| Prodotti alimentari, bevande, tabacco | 46.17.0x |
| Prodotti specifici (farmaceutici, cosmetici, elettronica) | 46.18.xx |
| Prodotti vari | 46.19.0x |
- Il coefficiente 62% vale per tutta 46.1 [V-sec, All. 2 L. 145/2018]. La descrizione 46.18/46.19 e le sottovoci 2025 non sono state lette: **[D] tutto**.
- Attenzione: un agente che agisce in nome proprio per conto altrui (commissionario) o che compra e rivende non è in 46.1: commercio 46.2-46.9 = 40%. Non scrivere regole oltre la divisione.

### B2. Enasarco 2026
- **Minimali e massimali 2026** [V] (dal 1/1/2026, per ciascun rapporto di agenzia; adeguamento ISTAT): plurimandatario minimale **515 euro** (128,75 a trimestre), massimale provvigionale **30.478 euro**; monomandatario minimale **1.026 euro** (256,50 a trimestre), massimale **45.717 euro**. https://www.enasarco.it/2026/02/minimali-e-massimali-2026/
- Minimale dovuto solo se il rapporto ha prodotto provvigioni nell'anno; **la differenza tra contributi e minimale è a totale carico della mandante** [V-sec]. https://www.enasarco.it/guida/contributo-minimo-annuo-minimale/
- **Aliquota**: 17% totale = 14% previdenza + 3% previdenza di solidarietà, "dal 2020, valore indicato come attuale" [V]. https://www.enasarco.it/guida/come-si-calcola-il-contributo-previdenziale/ ; bilancio consuntivo 2025 conferma 17% per il 2025 [V-sec] https://www.enasarco.it/wp-content/uploads/2026/04/BILANCIO-2025-COMPLETO.pdf . La pagina **non dà un valore "2026"**: dire "17% (aliquota in vigore dal 2020, invariata nei documenti Enasarco consultati)".
- **Ripartizione**: 50% agente / 50% preponente (8,5% + 8,5%): regolamento delle attività istituzionali "a carico del preponente e dell'agente in misura paritetica" [V-sec, riassunto di ricerca; il PDF era illeggibile]. https://www.enasarco.it/wp-content/uploads/2025/02/Regolamento-attivita-istituzionali-in-vigore-dal-05-02-2025.pdf . **Versa tutto il preponente**, responsabile anche per la quota dell'agente, trattenendola al momento del pagamento delle provvigioni [V per "versa il preponente", pagina Enasarco; V-sec per la trattenuta, Bilancio sociale 2023].
- **Giovani agenti (art. 5-bis)**: aliquote 11/9/7% per tre anni, solo per prima iscrizione o nuovo incarico **nel 2021-2023**, under 31, forma individuale [V]. https://www.enasarco.it/guida/nuove-misure-art-5-bis/ . Chi si è iscritto nel 2023 è agevolato al massimo fino al 2025: **per un nuovo agente 2026 non esiste** [D come conseguenza]. Non scriverlo come opzione.
- **Massimale/minimale e forfettario**: nessuna differenza dal regime IVA; l'Enasarco è una contribuzione del rapporto di agenzia, non del reddito.
- **FIRR** [C/lacuna]:
  - Cos'è/chi lo paga: contributo **interamente a carico della ditta preponente**, calcolato sulle provvigioni e rimborsi spese liquidati nell'anno, aliquote decrescenti per scaglioni e differenziate per mono/plurimandato; versamento entro il 31 marzo dell'anno successivo [V-sec: solo fonti di settore, no pagina Enasarco con le cifre]. Enasarco gestisce dal 1/1/2024 il FIRR "in modo separato e autonomo" da previdenza e assistenza [V]. https://www.enasarco.it/guida/gestione-separata-del-firr/
  - Misura: fonti di settore indicano per i monomandatari 4% fino a 12.400 euro, 2% da 12.400 a 18.600, 1% oltre 18.600; per i plurimandatari 4% fino a 6.200 (scaglioni successivi non trovati) [D, fonte non primaria, e potenzialmente superate dall'AEC 4/6/2025]. **Le cifre vanno lette** nell'Accordo Economico Collettivo (commercio) del 4 giugno 2025: https://www.enasarco.it/wp-content/uploads/2025/06/Rinnovo_AEC_4_giugno_2025_firmato-compresso.pdf (troppo grande per il fetch) e nel Disciplinare FIRR https://www.enasarco.it/wp-content/uploads/2026/03/disciplinare-FIRR-approvato-cda.pdf e Circolare FIRR-BIS https://www.enasarco.it/wp-content/uploads/2026/03/CIRCOLARE-INTERPRETATIVA-FIRR-BIS-1.pdf (elenco da https://www.enasarco.it/raccolta-normativa/ [V]).
  - **Non scrivere le aliquote FIRR.** Scrivere solo che è a carico del preponente, che si accumula in un fondo e che viene liquidato a fine rapporto.
  - Liquidazione [V-sec]: alla cessazione, le somme dell'anno di cessazione le paga la mandante; quelle accantonate fino al 31/12 dell'anno precedente le liquida Enasarco.
  - Il FIRR **non entra nella fattura dell'agente** [D].

### B3. INPS Commercianti per l'agente
- Obbligo [V-sec]: circ. INPS 99/2011 (punto 3): il versamento Enasarco ha natura **integrativa**; gli iscritti Enasarco, "ricorrendone i requisiti", sono anche soggetti alla Gestione Commercianti (L. 613/1966), senza elencare i requisiti. https://www.inps.it/bussola/visualizzadoc.aspx?svirtualurl=/circolari/circolare numero 99 del 22-07-2011.htm . Circ. INPS 171/2003 (L. 160/1975, L. 662/1996): agenti con determinati requisiti iscritti alla gestione commercianti [V-sec]. L'Osservatorio INPS elenca tra gli iscritti alla gestione commercianti "l'agente e rappresentante di commercio" [V-sec].
- **Requisiti esatti (abitualità e prevalenza, art. 1 c. 203 L. 662/1996)**: [D] non verificati. **[C]/lacuna**: non ho trovato una scheda INPS specifica per gli agenti. Non scrivere "obbligatoria sempre"; scrivere "in genere l'agente in forma individuale è iscritto alla Gestione Commercianti oltre ad Enasarco, secondo i requisiti INPS di abitualità e prevalenza".
- Contributo minimo e riduzione 35%: applicabili come per i commercianti (INPS circ. 14/2026, già [V]); il minimale 4.611,64 euro è dovuto anche con reddito zero. Nessuna esenzione per l'agente trovata.
- Indennizzo di cessazione attività commerciale: per gli agenti iscritti da almeno cinque anni alla Gestione commercianti, 611,85 euro per 13 mensilità nel 2026 [V-sec, scheda INPS]. https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.50256.indennizzo-per-cessazione-definitiva-dell-attivit-commerciale.html . Non scrivere (fuori ambito).
- Iscrizione INPS Commercianti: tramite Comunicazione Unica alla Camera di Commercio [V-sec, scheda "Iscrizione Gestione Commercianti"]. https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.50172.iscrizione-gestione-commercianti.html

### B4. La fattura dell'agente in forfettario
- **Enasarco non va in "DatiCassaPrevidenziale"**: AdE FAQ sulla fatturazione elettronica (FAQ n. 50 nelle versioni 2018-2022) dice che il contributo Enasarco non è un tipico contributo di "cassa previdenziale" che concorre alla base IVA, ma ha gestione **similare a una ritenuta**; da indicare in **AltriDatiGestionali**: `TipoDato` = CASSA-PREV, `RiferimentoTesto` = ENASARCO (e il relativo codice TC07), `RiferimentoNumero` = importo del contributo, `RiferimentoData` non valorizzato [V-sec: riassunto del PDF, che non ho potuto aprire]. https://www.agenziaentrate.gov.it/portale/documents/20143/287582/2FAQ+pubblicate+il+21+dicembre+2018+(aggiornata+il+22+dicembre+2022).pdf/05634809-cb84-7ef1-4b3b-00471ef00e90 e https://www.agenziaentrate.gov.it/portale/documents/20143/287582/18+Tutte+le+faq+(aggiornate+al+22-12-22).pdf/8972a305-aaa1-a15b-3b11-9147e4f204e8
  - **TC07** = tipo cassa ENASARCO nelle specifiche tecniche: lo cita la FAQ, ma non ho letto la tabella TipoCassa (Allegato A, versione 1.8 o 1.9.1). [D/V-sec].
  - **[C] in sospeso**: il blocco DatiCassaPrevidenziale è per la cassa della categoria professionale (ImportoContributoCassa, AlCassa); la FAQ indica un percorso diverso per Enasarco. Per un agente forfettario che emette tramite Quotify: scrivere in pagina "secondo l'AdE" e far verificare sulle specifiche vigenti (Allegato A v. 1.9.1 pubblicata nel 2025, non letta).
  - L'**importo** è indicativo: la quota agente è lo 8,5% sulle provvigioni di competenza, ma **il preponente la calcola e la versa**; l'agente non versa nulla a Enasarco. Se l'agente la espone in fattura, è un dato informativo (trattenuta applicata dal preponente) e non una somma che l'agente deve incassare in meno nell'importo IVA [D]. Non ho trovato una regola AdE su come comporre l'ImportoPagamento. **Non scrivere.**
- **Nessuna ritenuta d'acconto** per l'agente forfettario: c. 67 L. 190/2014: i ricavi/compensi dei forfettari "non sono assoggettati a ritenuta d'acconto da parte del sostituto d'imposta" e il contribuente rilascia "un'apposita dichiarazione" (reddito soggetto a imposta sostitutiva) [V]. https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2014-12-23;190~art1!vig=2026-11-04
  - Ritenuta ordinaria sulle provvigioni degli agenti: art. 25-bis DPR 600/73 [V]: commisurata al **50%** delle provvigioni, o al **20%** se l'agente dichiara di avvalersi in modo continuativo di dipendenti o terzi; l'aliquota è quella del primo scaglione IRPEF (art. 11 TUIR). Il "23%" non è nel testo letto: dire "aliquota del primo scaglione IRPEF (art. 11 TUIR)" e non 23%. https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1973-09-29;600~art25bis!vig=2026-11-04
  - Il c. 67 non menziona gli agenti: l'applicazione agli agenti è per principio generale [D]. Non ho trovato risposta AdE specifica (le risposte 149/2025, 245/2023 e ris. 36/E 2019 discutono il c. 67 in via generale [V-sec]).
  - Diciture in fattura: la FAQ AdE suggerisce, per i forfettari, di completare indicando il regime e, in descrizione, che gli importi non sono soggetti a ritenuta [V-sec]. Link: stesso PDF FAQ.
- **IVA**: nessuna (N2.2). **Bollo**: 2 euro oltre 77,47 (già nei doc precedenti). Le provvigioni sono prestazioni di servizi: IVA 0% [D].
- **Mandanti esteri**: le provvigioni da mandanti UE/extra UE seguono i criteri per servizi B2B esteri (N2.1, art. 1 c. 58 lett. d) [V]); l'Enasarco è dovuta comunque per preponenti con sede in Italia [D: non verificato per preponenti esteri]. Non scrivere.

### B5. Requisiti per fare l'agente (breve)
- Il ruolo agenti è stato soppresso (art. 74 D.Lgs. 59/2010) [V-sec: guide camerali, non il testo]; oggi si presenta SCIA alla Camera di Commercio / Registro imprese con la comunicazione unica, allegando il contratto di agenzia; restano i requisiti morali e professionali della L. 204/1985 adattati; requisiti professionali alternativi: titolo di studio, esperienza di due anni negli ultimi cinque, corso regionale, o iscrizione alla sezione REA [V-sec]. Link camerali: https://www.rc.camcom.gov.it/registro-imprese-e-diritto-annuale/attivita-con-requisiti/agenti-e-rappresentanti-di-commercio ; https://www.ge.camcom.gov.it/it/avvia/albi-ruoli-ed-elenchi/agenti-e-rappresentanti-di-commercio-2025/agenti-e-rappresentanti-di-commercio ; https://www.mimit.gov.it/images/stories/normativa/decreto-ARC.pdf
- Verifica dei requisiti: periodicità citata come 5 anni (Ravenna) o 4 anni (Genova): **[C] non scriverlo**. Obbligo Enasarco di iscrizione: "obbligatoria per tutti gli agenti che operano in Italia" (regolamento, [V-sec]).

---

## Verifiche umane prima di pubblicare
1. Ripetere sul file ISTAT **2026** (link in alto) i codici A1/B1 e i codici dei doc precedenti.
2. Leggere circolare 14/E del 27/3/2015, par. 7 (reverse charge e forfettari) e decidere se vale anche per la lett. a-ter).
3. Leggere la tabella natura IVA nell'Allegato A / guida FE v1.9: N2.2, N6.3, N6.7.
4. Ritenuta bonifici bancari ai forfettari: cercare fonte AdE (risposta a interpello o istruzioni Modello Redditi) che colleghi c. 67 all'art. 25 DL 78/2010; verificare rigo RS40.
5. L. 443/1985 art. 5: quale modifica ha prodotto la vigenza del 7/4/2026.
6. FIRR: aliquote e scaglioni dal AEC 4/6/2025 / disciplinare FIRR.
7. FAQ AdE n. 50 e specifiche tecniche (TC07, AltriDatiGestionali): leggere il testo.
8. INPS: requisiti di iscrizione Commercianti per agenti (circ. 171/2003, 99/2011).
9. INAIL: premio speciale unitario artigiani 2026 (solo se si vuole una cifra).
