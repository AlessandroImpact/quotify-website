# Quotify — campi da incollare durante il setup

Handle definitivo: **@quotifyita** — su Facebook e su Instagram.

Storia della scelta, per non ripercorrerla fra sei mesi: la prima scelta era `quotifyit`,
libero su entrambe. Impostandolo come nome utente della **Pagina Facebook**, Meta lo ha
riservato anche su Instagram, che ha iniziato a rifiutarlo. Abbiamo rinominato la Pagina
per liberarlo, ma Meta tiene in attesa un nome appena rilasciato — verificato: trenta
secondi dopo il rilascio risultava già non disponibile anche su Facebook stesso.
**Lezione operativa: prendere sempre prima l'handle su Instagram, poi sulla Pagina.**
Gli handle "ovvi" erano tutti occupati da app di citazioni straniere: `quotify`,
`quotify.it`, `quotify.app`, `quotify_it`, `quotifyapp`, `getquotify`, `quotify.io`,
`quotify.co`, `heyquotify`. Su Facebook, inoltre, Meta **vieta la parola "official"**
nei nomi utente (regola anti-impersonificazione): `quotify.official` e `quotifyofficial`
sono entrambi rifiutati, anche se su Instagram sarebbero liberi.

Restavano liberi su Instagram: `quotifyita`, `quotify.italia`, `quotify.pro`,
`tryquotify`, `quotify.official`, `quotifyhq`, `usequotify`.

---

## FACEBOOK — Pagina

| Campo | Valore |
|---|---|
| Nome pagina | `Quotify` |
| Nome utente | `quotifyita` → facebook.com/quotifyita |
| Categoria 1 | `Azienda di software` |
| Categoria 2 | `App` |
| Categoria 3 | `Servizio aziendale` |
| Bio (255 car.) | vedi sotto |
| Sito web | `https://quotify.it` |
| Email | `info@alessandroterracciano.com` |
| Città | Milano, Italia |
| Pulsante CTA | **Iscriviti** → `https://quotify.it/fb` |
| Immagine profilo | `profilo/avatar-quotify-1080.png` |
| Copertina | `profilo/cover-facebook-1640x856.png` |

**Bio Facebook (238 caratteri):**
```
Il gestionale pensato solo per i freelance italiani in Regime Forfettario. Preventivi PDF, fatture elettroniche SDI, modello F24, scadenze e assistente AI — in un'unica app. Beta gratuita, senza carta di credito.
```

**Descrizione lunga / "Altre informazioni":**
```
Quotify nasce da un problema concreto: chi lavora in Regime Forfettario usa gestionali costruiti per le SRL, dove il 90% delle funzioni non serve e quel 10% che serve — la dicitura corretta in fattura, la soglia degli 85.000 €, il calcolo dell'imposta sostitutiva, l'F24 — non c'è.

Quotify fa solo quello, e lo fa bene:
• Pipeline Kanban dei progetti, dal preventivo all'incasso
• Preventivi PDF con 3 template, logo e colori personalizzati
• Fatture elettroniche XML FatturaPA con invio diretto al Sistema di Interscambio
• Anagrafica clienti compilata in automatico dalla Partita IVA
• Dashboard fiscale: fatturato, soglia forfettaria, imposta sostitutiva stimata, contributi INPS
• Modello F24 precompilato
• QuotifAI, l'assistente che risponde sui tuoi dati reali
• App iOS nativa + PWA installabile, con notifiche push

Attualmente in beta gratuita. quotify.it

Nota: i contenuti pubblicati su questa pagina hanno finalità informativa e non sostituiscono la consulenza del tuo commercialista.
```

---

## INSTAGRAM — Profilo professionale (Business)

| Campo | Valore |
|---|---|
| Nome utente | `quotifyita` |
| Nome (campo ricercabile, 30 car.) | `Quotify · Regime forfettario` (28/30) |
| Categoria | `Software` (oppure `App mobile`) |
| Tipo account | **Azienda**, non Creator |
| Pulsanti contatto | Email: `info@alessandroterracciano.com` — no telefono, no indirizzo |
| Link | `https://quotify.it/beta` — redirect 302 verso la registrazione, con gli UTM applicati lato server |
| Immagine profilo | `profilo/avatar-quotify-1080.png` |

**Bio Instagram (139 caratteri, limite 150):**
```
Il gestionale dei freelance in Regime Forfettario 🇮🇹
Preventivi · Fatture SDI · F24 · Assistente AI
Beta gratuita 👇
```

**Alternativa più diretta (147 caratteri):**
```
Fatture SDI, preventivi e F24 per chi è in Forfettario 🇮🇹
Ti diciamo quanto mettere da parte, prima di spenderlo
Beta gratuita 👇
```

### Il link in bio

Il link visibile nella bio è `quotify.it/beta`. I parametri UTM non si vedono: li applica
il redirect lato server, definito in `quotify-website/public/_redirects`.

| Path | Va a | Da usare in |
|---|---|---|
| `quotify.it/beta` | registrazione, `utm_source=instagram` | **bio Instagram** (unico posto dove l'URL è visibile) |
| `quotify.it/fb` | registrazione, `utm_source=facebook` | pulsante della Pagina |
| `quotify.it/tt` | registrazione, `utm_source=tiktok` | bio TikTok |
| `quotify.it/li` | registrazione, `utm_source=linkedin` | LinkedIn |
| `quotify.it/yt` | registrazione, `utm_source=youtube` | descrizioni YouTube |

⚠️ I redirect diventano attivi **solo dopo il prossimo deploy** del sito
(`npm run build` + deploy su Cloudflare Pages, dal tuo Mac).

### Alternative per il campo Nome

Il limite è 30 caratteri. `L'app per il regime forfettario` ne conta 31, quindi non entra.

| Opzione | Car. | Nota |
|---|---|---|
| `Quotify · Regime forfettario` | 28 | **scelta** — tiene il brand e la chiave di ricerca esatta |
| `L'app del regime forfettario` | 28 | la tua formulazione, ma il nome del brand sparisce dalla riga in grassetto |
| `L'app per il forfettario` | 24 | idem, più corta |

Il campo Nome si può cambiare quando vuoi (a differenza del nome utente, che ha dei limiti
di frequenza): se fra un mese preferisci l'altra, si cambia in dieci secondi.

---

## Storie in evidenza (Highlight) — copertine in `highlight/`

| Ordine | Nome (max ~15 car. visibili) | File copertina |
|---|---|---|
| 1 | `Cos'è` | highlight-app.png |
| 2 | `Preventivi` | highlight-preventivi.png |
| 3 | `Fatture SDI` | highlight-fatture.png |
| 4 | `Fisco` | highlight-fisco.png |
| 5 | `QuotifAI` | highlight-ai.png |
| 6 | `FAQ` | highlight-faq.png |

---

## Cose da NON scrivere (policy Meta + tutela consumatore)

- ❌ "Risparmia sulle tasse", "paga meno tasse", "abbatti il carico fiscale" → si legge come
  promessa di risultato economico su prodotti finanziari: revisione lunga o rifiuto dell'inserzione.
  ✅ "Sai sempre quanto mettere da parte."
- ❌ "Sostituisce il commercialista" → oltre al rischio policy è falso e attira reclami.
  ✅ "Lavora insieme al tuo commercialista."
- ❌ Numeri di utenti/fatture non verificabili. Vedi la nota su `500+ freelance attivi` nel documento 05.
- ❌ Screenshot con P.IVA, nomi o importi di clienti reali. Usa sempre `Digital Agency Roma` e i dati demo.
