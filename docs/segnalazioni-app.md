# Segnalazioni sull'app, raccolte scrivendo le guide

Queste note nascono dalla stesura delle guide su quotify.it: per scriverle è stato letto il
codice di `~/Developer/Quotify App` in sola lettura, e lungo la strada sono emerse cose che
vale la pena verificare. **Nessuna è stata toccata**: l'app è un altro progetto e va discussa
nella sua chat.

Ogni voce ha il riferimento `file:riga` e cosa succede in pratica. L'ordine è per impatto.

---

## 0. La fattura verso un cliente estero esce con nazione «IT»

**Priorità: la più alta del registro.** Non è una stima imprecisa: è un documento fiscale
formalmente errato.

**Dove**:
- `functions/lib/fatturaPA.ts:133` — l'`IdPaese` del cliente è la costante `IT`.
- `functions/lib/fatturaPA.ts:218` e `:232` — `<Nazione>IT</Nazione>` è scritta a mano sia per
  il cedente sia per il cessionario.
- `src/types/index.ts` — l'interfaccia `Client` **non ha un campo nazione**: via, CAP, comune e
  provincia, e basta.
- `functions/lib/fatturaPA.ts:158` e `:255` — la natura è sempre `N2.2`, anche dove
  un'operazione verso l'estero ne richiederebbe una diversa.

**Cosa succede**: se si registra un cliente estero e gli si emette fattura, l'XML dichiara che
quel soggetto ha sede in Italia e, se ha una partita IVA, che è italiana. La fattura può passare
i controlli formali dello SdI ed essere comunque sbagliata nel merito.

**Perché è la voce più grave**: le altre voci di questo registro producono numeri leggermente
diversi dal vero. Questa produce un documento fiscale che afferma il falso su un dato
anagrafico, e nessuno se ne accorge finché non lo guarda un commercialista.

**Possibili direzioni**, in ordine di costo crescente:
1. **Impedire il caso**: bloccare in anagrafica i clienti con sede fuori dall'Italia, con un
   messaggio che spieghi perché. Onesto e immediato — l'app dichiara cosa non fa.
2. **Aggiungere il campo nazione** al cliente e portarlo in `IdPaese` e `Nazione`, con il codice
   destinatario `XXXXXXX` per i soggetti non stabiliti in Italia.
3. **Gestire davvero l'estero**: nature diverse a seconda del tipo di operazione, e i relativi
   adempimenti. È un progetto, non una correzione.

**Conseguenza sul sito**: la guida `/guide/fattura-cliente-estero-forfettario` è stata
**rimandata** (decisione del 9 settembre 2026). Le alternative erano scriverla dicendo
apertamente che l'app non copre il caso, oppure aspettare: si è scelto di aspettare. La guida
si scrive quando l'estero sarà gestito, così potrà spiegare come si fa invece di spiegare
perché non si può. Finché la voce 0 resta aperta, la pagina non esiste.

---

## 1. Gli «altri costi» del preventivo non arrivano in fattura

**Dove**: `src/pages/InvoicePage.tsx:113-123` — la conversione costruisce le righe della fattura
solo da `servizi`. Il campo `altri_costi` del preventivo non compare da nessuna parte nel file.

**Cosa succede**: chi mette trasferte, materiali o rimborsi negli «altri costi» e poi fattura
dal preventivo accettato **fattura meno di quanto aveva preventivato**. Non c'è nessun avviso:
la fattura nasce con un totale più basso e l'unico modo di accorgersene è ricontrollare a mano.

**Perché conta**: è una perdita di denaro silenziosa e ripetibile, e colpisce proprio il
percorso che l'app promuove come principale.

**Possibili direzioni**: riportare gli altri costi come riga di fattura; oppure avvisare in
conversione che quel campo non verrà trasferito; oppure togliere il campo dal preventivo e
trattare tutto come righe di servizio.

**Documentato in**: `/guide/dal-preventivo-alla-fattura`, in evidenza e nella FAQ sul totale
che non coincide.

---

## 2. L'accantonamento salta i progetti senza «richiede fattura»

**Dove**: `functions/api/dashboard/index.ts:65` — il calcolo di imposte e contributi è dentro
`if (p.richiede_fattura === 1)`.

**Cosa succede**: un progetto accettato senza quella spunta entra nel **fatturato dell'anno**
ma non genera **accantonamento**. I due numeri della stessa schermata si riferiscono quindi a
insiemi diversi di progetti, senza che nulla lo dica.

**Perché conta**: la spunta è facile da dimenticare, e l'effetto è accantonare meno del dovuto
— cioè l'errore nella direzione peggiore.

**Possibili direzioni**: segnalare a schermo quanti progetti sono esclusi dall'accantonamento;
oppure rendere la spunta esplicita alla creazione invece di lasciarla a un valore implicito.

**Documentato in**: `/guide/f24-e-dashboard`, in un riquadro di avviso.

---

## 3. Le stime fiscali usano la data di emissione, non l'incasso

**Dove**: `functions/api/f24/index.ts:43-48` — il fatturato è la somma degli `imponibile` delle
fatture dell'anno con `stato != 'bozza'`, per `anno`/`data_emissione`. Fra i nove valori di
`InvoiceStato` (`src/types/index.ts:155`) **non ce n'è nessuno di pagamento**, e non esiste una
data di incasso.

**Cosa succede**: nel regime forfettario il reddito è per cassa. La stima diverge in due casi
concreti: la fattura di dicembre incassata a gennaio, contata nell'anno sbagliato; e la fattura
mai pagata, contata comunque. Con molto insoluto a fine anno la stima è più alta del reale.

**Perché conta**: è una scelta strutturale, non un difetto — ma decide quanto è affidabile il
numero su cui l'utente accantona.

**Possibili direzioni**: se un giorno si tracciassero gli incassi, le stime diventerebbero
esatte e la dashboard guadagnerebbe la domanda «quanto mi devono». È una funzione grossa, non
una correzione.

**Documentato in**: `/guide/f24-e-dashboard`, sezione dedicata, inquadrato come «è per questo
che si chiama stima».

---

## 4. Il bollo riaddebitato resta fuori dall'imponibile

**Dove**: `functions/lib/invoiceTotals.ts:22-26` — `imponibile` somma solo le righe;
`bollo_virtuale` entra in `totale_documento` ma non in `imponibile`. L'F24 somma `imponibile`.

**Cosa succede**: i 2 € di bollo addebitati al cliente non concorrono alle stime.

**Cosa dice l'Agenzia**: la risposta a interpello **n. 428 del 12 agosto 2022** è esplicita —
«l'importo del bollo addebitato in fattura al cliente assume la natura di ricavo o compenso e
concorre alla determinazione forfetaria del reddito soggetto ad imposta sostitutiva».

**Perché conta**: in denaro è irrisorio (pochi centesimi a fattura), ma è una divergenza
verificabile rispetto a una posizione ufficiale, e cresce con molte fatture piccole.

**Documentato in**: `/guide/marca-da-bollo-fattura-elettronica`, dichiarato apertamente.

---

## 5. Le notifiche delle scadenze fiscali hanno date fisse

**Dove**: `functions/api/reminders/send-push.ts:165-167` — le scadenze sono scritte nel codice
come 30 giugno e 30 novembre, con avviso a 7 giorni e 1 giorno prima.

**Cosa succede**: quando esce una proroga (nel 2026 la prima scadenza è slittata al 20 luglio)
l'avviso arriva comunque sulla data ordinaria, quindi **in anticipo**. Alessandro ha già
valutato che va bene così: meglio un promemoria prima che dopo. Resta il fatto che l'etichetta
mostrata annuncia una scadenza in una data che quell'anno può non essere quella vera.

**Possibili direzioni**: nessuna urgenza. Se un giorno si volesse, le date potrebbero arrivare
da un file di configurazione aggiornabile come `data/scadenze-2026.json` del sito, invece che
dal codice.

**Documentato in**: `/guide/app-su-telefono`, formulato come «l'avviso arriva comunque in
anticipo, che è il verso giusto in cui sbagliare».

---

## 6. Cadenze ricorrenti: solo la mensile è esposta

**Dove**: `functions/lib/recurring.ts:10` — `CADENZE_ATTIVE = ['mensile']`, mentre `PASSO_MESI`
prevede già bimestrale, trimestrale e annuale.

**Cosa succede**: niente di rotto. È una funzione pronta a metà, con il grosso del lavoro già
fatto: chi ha un canone trimestrale oggi deve fare le fatture a mano.

**Documentato in**: `/guide/fatture-ricorrenti`, detto chiaramente invece di lasciar intendere
che ci siano.

---

## 7. Ordine delle sezioni nel profilo

**Dove**: `src/pages/ProfilePage.tsx` — l'ordine è Dati Personali, Dati Fatturazione, **Dati
Bancari**, Impostazioni Fiscali, INPS e F24, Privacy e dati.

**Osservazione minore**: i quattro campi da cui dipende ogni calcolo dell'app (coefficiente,
aliquota d'imposta, aliquota contributiva, ATECO) stanno in Impostazioni Fiscali, cioè **dopo**
i dati bancari. Al primo accesso sono la cosa più importante da compilare e sono la quarta
sezione che si incontra.

**Nota**: questa è un'impressione di prodotto, non un difetto. Scritta qui solo perché mi
sarebbe sfuggita se non avessi dovuto elencare le sezioni in una guida — e per poco l'avevo
elencate nell'ordine sbagliato.

---

## 8. Gestione Admin → Sito web: il confronto fra settimane conta i giorni sbagliati

**Dove**: `functions/lib/cloudflareAnalytics.ts:355-358`, `confrontoSettimane`.

**Cosa succede**: la funzione ordina la serie giornaliera e prende `slice(-7)` come «ultimi 7
giorni» e `slice(-14, -7)` come «7 precedenti». Ma Cloudflare **non restituisce righe per i
giorni a zero**: la serie ha una riga solo nei giorni con traffico. Con otto giorni di dati in
un mese, `slice(-7)` copre dal 26 agosto al 21 settembre e `slice(-14, -7)` resta il solo 25
agosto.

**Effetto visto il 22 settembre 2026**: il pannello dice «Ultimi 7 giorni: 550 pagine viste
contro 30 dei 7 precedenti». Le cifre vere di calendario sono **30 contro 20**. I 550
includono le 480 viste del 4 settembre (una pagina, zero sessioni: la riga già isolata come
non-navigazione), che è di tre settimane fa.

**Correzione**: prima di tagliare, costruire i 14 giorni di calendario che finiscono ieri e
riempire con zero quelli assenti; poi sommare. La stessa cosa vale per qualunque altra
finestra ricavata per `slice` da quella serie.

**Non è un difetto**: il «▲1733%» sulla card «Pagine viste» confronta i 30 giorni con i 30
precedenti, quando il sito non esisteva: la percentuale è corretta e insignificante insieme.
Se serve, la card potrebbe tacere la variazione quando il periodo precedente ha meno di N
giorni di storico — è la stessa logica del `null` già usato quando il termine di paragone è
zero.

---

## Domande aperte, non difetti

Due cose notate sulla nota di credito che **non** risultano sbagliate: sono punti su cui la
documentazione ufficiale non si pronuncia, o su cui la scelta dell'app è difendibile. Stanno
qui perché è meglio averle guardate e archiviate che non essersele mai poste.

### A. Il segno degli importi nella nota di credito

**Dove**: `src/pages/InvoicePage.tsx:148` — le righe vengono ricopiate dalla fattura originale
con `prezzo_unitario` e `importo` invertiti di segno (`-Math.abs`).

**La domanda**: la documentazione dell'Agenzia **non specifica** se un TD04 debba portare importi
positivi o negativi. L'unica indicazione vicina è che i documenti integrativi TD16-TD19 vogliono
importi negativi *e che in quei casi non va usato il TD04* — il che lascia intendere, senza
dirlo, che il TD04 segua la convenzione opposta.

**Perché probabilmente va bene così**: le fatture vere passano, quindi lo SdI non obietta. E il
segno negativo ha un effetto utile a valle: l'F24 somma gli `imponibile` delle fatture non in
bozza, quindi una nota di credito negativa **riduce correttamente la base delle stime**. Con
importi positivi le stime crescerebbero invece di calare.

**Cosa varrebbe la pena fare**: nulla, se non chiedere conferma a un commercialista o verificare
come si comportano i gestionali riceventi. È l'unico punto in cui una scelta interna potrebbe
apparire diversa a chi legge il documento dall'altra parte.

### B. La causale della nota di credito perde la dicitura sulla ritenuta

**Dove**: `src/pages/InvoicePage.tsx:146` — la causale viene sovrascritta con
`Storno fattura {numero} del {data}`, al posto della `CAUSALE_DEFAULT` che porta la dicitura del
comma 67 sulla non applicazione della ritenuta.

**Perché non è un problema**: il riferimento normativo del regime forfettario (articolo 1, commi
54-89) è una **costante nell'XML** (`functions/lib/fatturaPA.ts:74`) e finisce comunque in
`DatiRiepilogo`, indipendentemente dalla causale. Quindi la nota di credito dichiara comunque il
regime; perde solo la frase sulla ritenuta, che su uno storno ha meno senso di averla.

**Annotato solo per completezza**: se un giorno si volesse, le due informazioni potrebbero
convivere (storno + dicitura) invece di escludersi.

---

## Cose verificate che invece vanno bene

Per equilibrio, le cose che sembravano buchi e non lo erano:

- **Le diciture del forfettario sono complete**: `RF19`, aliquota `0.00` e `N2.2` su righe e
  riepilogo (`functions/lib/fatturaPA.ts`), riferimento normativo automatico, e la dicitura
  sulla ritenuta del comma 67 già come causale predefinita (`src/pages/InvoicePage.tsx:18`).
- **La numerazione conta le fatture importate** da altri gestionali, quindi chi cambia software
  a metà anno non si ritrova due fatture numero 1 (`functions/lib/invoiceNumber.ts`).
- **Le conferme dell'assistente sono protette lato server**, non solo da istruzione al modello
  (`functions/api/ai/chat.ts`).
- **Le anteprime dei link non fanno scattare** la notifica «preventivo visualizzato»
  (`functions/api/quotes/share/[token].ts:34-37`).
- **`0000000` non batte mai un codice destinatario reale** nella fusione delle schede cliente
  (`functions/api/clients/lookup.ts:125-127`).
- **Un'occorrenza ricorrente saltata o scaduta non lascia buchi** nella numerazione, perché il
  numero si assegna solo alla conferma (`functions/lib/recurringMaterialize.ts`).
