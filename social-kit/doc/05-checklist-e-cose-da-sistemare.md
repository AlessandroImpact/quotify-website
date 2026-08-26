# Checklist di setup + cose emerse dall'analisi

## STATO — aggiornato il 25/08/2026

**Facebook** → facebook.com/quotifyita · **Instagram** → instagram.com/quotifyita
Entrambi collegati fra loro e dentro il portfolio business **Quotify**.

| Fatto | Elemento | Valore |
|---|---|---|
| ✅ | Pagina Facebook | Quotify · ID 61593847438004 |
| ✅ | Nome utente FB | `quotifyita` |
| ✅ | Categorie FB | Azienda di software · Pagina dell'app |
| ✅ | Bio FB (183 car.) | "Il gestionale pensato solo per i freelance italiani…" |
| ✅ | Sito, email, Milano, nessun orario | — |
| ✅ | Avatar + copertina 1640×624 | marchio ufficiale dell'app |
| ✅ | Pulsante CTA | Iscriviti → app.quotify.it/register?utm_source=facebook… |
| ✅ | Account Instagram | `quotifyita`, e-mail `social@quotify.it` |
| ✅ | Tipo account IG | Professionale → **Azienda** |
| ✅ | Categoria IG | Software (mostrata sul profilo) |
| ✅ | Bio IG (118 car.) | 3 righe, come da doc 01 |
| ✅ | Avatar IG | marchio ufficiale |
| ✅ | Contatto business IG | `support@quotify.it` |
| ✅ | Collegamento IG ↔ Pagina | fatto, con accesso ai DM da Business Suite |
| ✅ | Portfolio business | **Quotify** (già esistente) — contiene ora Pagina + IG |
| ⚠️ | **Claim in homepage ancora online** | 500+ / 10.000+ / 99.9% — vedi sotto |
| ⬜ | **Link in bio IG** | il web non lo consente: **da fare dall'app sul telefono** |
| ⬜ | **Nome IG** → `Quotify · Regime forfettario` | idem, campo modificabile solo da app |
| ⬜ | Storie in evidenza | richiedono di pubblicare prima le storie: da app |
| ✅ | Portfolio business corretto | **Quotify** (`1583718346730435`) — separato dal tuo personale |
| ✅ | **Dominio quotify.it VERIFICATO** | confermato da Meta il 25/08/2026 |
| ✅ | Redirect `quotify.it/beta` | attivo in produzione |
| ✅ | Pixel testato in produzione | prima del consenso: 0 script Meta; dopo "Accetta": `fbq` attivo e `_fbp` scritto |
| ✅ | Cookie banner a consenso preventivo | Rifiuta / Accetta, su tutte e 5 le pagine |
| ✅ | Pixel `1474396618080757` | installato, si carica solo dopo il consenso |
| ✅ | CSP aggiornata | senza, il pixel sarebbe stato bloccato |
| ⏸ | WhatsApp | saltato: richiede un numero personale su una Pagina pubblica |
| ⏸ | Invita amici | **saltato di proposito** — vedi nota sotto |

### Da fare dall'app Instagram sul telefono (5 minuti)

1. **Modifica profilo → Link → Aggiungi link esterno** → `https://quotify.it/beta`
   (funzionerà dopo il deploy del sito; nel frattempo puoi mettere `https://app.quotify.it/register`)
2. **Modifica profilo → Nome** → `Quotify · Regime forfettario` (28/30 caratteri)
3. Pubblica 6 storie con le copertine in `social-kit/highlight/` e crea le storie in evidenza
   con i nomi: Cos'è · Preventivi · Fatture SDI · Fisco · QuotifAI · FAQ

### Perché non ho invitato i tuoi amici

Facebook lo propone come primo passo e sembra gratis, ma non lo è: i primi follower
insegnano all'algoritmo chi è il tuo pubblico. Se i primi 80 sono amici e parenti che
non sono freelance forfettari, ogni post successivo verrà mostrato per prima cosa a
persone come loro — e il tasso di interazione crollerà proprio sul pubblico che ti serve.
Meglio 30 follower in target che 200 di cortesia.

Fanno eccezione le persone che *sono* davvero in target: quelle invitale a mano, una per una.

---

## A. Ordine esatto delle operazioni (non invertirlo)

| # | Passo | Chi | Note |
|---|---|---|---|
| 1 | Login su Facebook col profilo personale | **Tu** | Serve un profilo personale: è il proprietario tecnico, non comparirà mai sulla Pagina |
| 2 | Creare la **Pagina Facebook** `Quotify` | Io | Campi nel doc 01 |
| 3 | Impostare nome utente `quotifyita` | Io | Se occupato: `quotify.italia` (verificato libero) |
| 4 | Caricare avatar + copertina, bio, CTA, sito | Io | File in `profilo/` |
| 5 | Creare l'**account Instagram** `quotifyita` con email dedicata | **Tu** (login/verifica) | Vedi nota sull'email qui sotto |
| 6 | Convertire IG in **Account professionale → Azienda** | Io | Non Creator |
| 7 | Collegare IG ↔ Pagina Facebook | Io | Da IG: Impostazioni → Condivisione con altre app |
| 8 | Creare il **Business Manager** e portarci dentro Pagina + IG | Io | business.facebook.com |
| 8b | Deploy del sito con `public/_redirects` (già scritto) | **Tu** | Attiva `quotify.it/beta` |
| 9 | Verificare il dominio `quotify.it` | Io + tuo deploy | Doc 04 |
| 10 | Creare il **Pixel** e installarlo | Io | **Solo dopo** aver sistemato il cookie banner |
| 11 | Caricare le 6 storie in evidenza | Io | File in `highlight/` |
| 12 | Pubblicare i primi 3 post + primo Reel | Io | Doc 03 |
| 13 | Attivare l'autenticazione a due fattori su tutto | **Tu** | Obbligatoria per il Business Manager |

**Email dedicata per Instagram — su Aruba, non su Cloudflare.**
L'MX di `quotify.it` è `mx.quotify.it` → 62.149.128.x, cioè **Aruba**. Cloudflare Email
Routing non è utilizzabile senza sostituire i record MX, il che spegnerebbe le caselle
esistenti: gli indirizzi vanno creati nel pannello Aruba.

Servono due indirizzi, ed entrambi possono essere semplici **alias con inoltro** alla
casella che leggi già (gratis, e non ti aggiunge una inbox da controllare):

| Indirizzo | Serve a | Tipo |
|---|---|---|
| `social@quotify.it` | proprietario degli account Instagram/TikTok/LinkedIn | alias con inoltro basta: deve solo *ricevere* i codici |
| `support@quotify.it` | contatto pubblico su sito e Pagina Facebook | meglio casella vera, così puoi anche *rispondere* da quell'indirizzo |

**Nota originaria.** Non usare la tua personale: crea (o fai alias su)
`social@quotify.it`. Se l'account IG è legato a un'email che un domani non controlli più,
il profilo diventa irrecuperabile. Stessa logica per `support@quotify.it`, che oggi manca:
il sito espone `info@alessandroterracciano.com`, che è personale e comunica "un tizio"
invece che "un prodotto". È una delle cose che più abbassa il tasso di registrazione in
un SaaS agli inizi.

## B. Cose emerse dall'analisi che vanno sistemate

### 🔴 Priorità alta — i numeri sull'homepage
`quotify-website/index.html` dichiara nell'hero:

- **500+ Freelance attivi**
- **10.000+ Fatture emesse**
- **99.9% Uptime garantito**

e nella sezione Globe: *"Unisciti a centinaia di freelance italiani che usano già Quotify"*.

Se i numeri reali della beta non li reggono, va corretto **prima** di iniziare a portarci
traffico social. Tre ragioni concrete, in ordine di gravità:

1. Le inserzioni Meta vengono rifiutate per claim non sostanziabili, e i rifiuti ripetuti
   danneggiano permanentemente l'account pubblicitario.
2. È pratica commerciale ingannevole ai sensi del Codice del Consumo.
3. È il tipo di cosa che un concorrente segnala volentieri.

E c'è un motivo migliore per toglierli: **la strategia che abbiamo scelto è build-in-public.**
"Siamo 47 e crescendo, entra adesso" è più forte di "500+", perché è verificabile e ti fa
guadagnare la credibilità che poi userai per tutto il resto. Sostituisci con:
*"In beta · [numero vero] freelance a bordo · Zero carta di credito"*.

Sull'uptime: 99.9% "garantito" è un impegno contrattuale (SLA) che non hai. Diventa
*"Infrastruttura Cloudflare"*.

### 🟡 Prezzi incoerenti tra le pagine
- L'homepage mostra il piano Pro a **€ 6,99/mese**.
- La FAQ, poco sotto, dice *"Il prezzo definitivo non è ancora stato annunciato"*.
- Il listing App Store dice **€ 6,99/mese o € 69,99/anno**.

Chi legge la pagina intera lo nota. Allinea: se il prezzo è deciso, togli quella FAQ e
sostituiscila con "Cosa succede ai miei dati se non rinnovo?" — che è la domanda che le
persone si fanno davvero prima di iscriversi.

### 🟡 Formato FatturaPA: due versioni diverse nella documentazione
Il sito dice **XML FatturaPA 1.2.2**, il listing App Store dice **1.2.1**. Uno dei due è
vecchio. Da allineare prima che qualcuno di tecnico lo chieda nei commenti.

### 🟢 Da fare quando hai dieci minuti
- **Immagine OG**: `og-quotify.jpg` esiste già. Ricontrolla che sia aggiornata: è
  l'anteprima che appare ogni volta che qualcuno condivide quotify.it su Facebook o WhatsApp.
- **Prenota @quotifyita anche su TikTok, LinkedIn, X e YouTube.** Costa dieci minuti oggi
  e non si recupera dopo.
- **Nome della cartella video**: gli 8 video hanno una versione `-web` (≈3 MB) e una piena
  (≈24 MB). Carica sempre quella piena su Instagram.

## C. Sui video che hai già

Sono la cosa migliore che hai: 8 Reel verticali 1080×1920, 20 secondi, coerenti nel
formato e nel montaggio hook → dimostrazione. Coprono esattamente i dolori giusti:

| # | Video | Dolore che tocca |
|---|---|---|
| 01 | preventivo → fattura | Rifare tutto due volte |
| 02 | notifica preventivo visualizzato | Il silenzio dopo l'invio |
| 03 | F24 | "Quanto devo mettere da parte" ← il più forte |
| 04 | fatture ricorrenti | Lavoro ripetitivo mensile |
| 05 | promemoria follow-up | Il lavoro perso per non aver richiamato |
| 06 | anagrafica da P.IVA | Copiare dati dalle visure |
| 07 | fattura SDI | Paura di sbagliare |
| 08 | QuotifAI | Domande fuori orario |

Con 3 Reel a settimana coprono le prime tre settimane. Dalla quarta servono contenuti
girati da te — ed è meglio così: **il volto in camera è ciò che sposta la reach**, e i
video di prodotto da soli si esauriscono in fretta.

Due migliorie per la prossima serie:
1. **Testo dell'hook al primo fotogramma.** Adesso partono con l'icona per circa un secondo:
   in un feed è il secondo in cui la persona scorre via.
2. **Sottotitoli aperti (burned-in).** La stragrande maggioranza guarda senza audio.
   Posso generarli e riesportarli, i file sono già qui.
