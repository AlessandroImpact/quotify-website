# Meta Pixel + verifica dominio — cosa fare (e perché farlo adesso)

Anche a spesa zero. Il pixel **accumula il pubblico** che userai per il retargeting fra
tre mesi: quel pubblico non si può ricostruire retroattivamente.

## 1. Verifica del dominio `quotify.it` — ✅ meta-tag già inserito

**Stato al 25/08/2026.** Il dominio è stato aggiunto al portfolio business **Quotify**
(ID risorsa `1965998144084009`) e il meta-tag è già dentro `index.html`:

```html
<meta name="facebook-domain-verification" content="rwagxwxwkjaf9z5zuksut181376hse" />
```

Manca solo il **deploy del sito**: dopo quello, torna su
Business Suite → Impostazioni → Domini → quotify.it → **Verifica dominio**.
Finché il deploy non c'è, il dominio resta "Not Verified".

---

### Come funziona (per riferimento)

Serve per: possedere le anteprime dei link (nessun altro può modificarle), sbloccare la
configurazione degli eventi aggregati (iOS 14+) e poter passare permessi a chiunque
lavorerà con te.

Percorso: **Business Manager → Impostazioni azienda → Sicurezza del brand → Domini →
Aggiungi → quotify.it → Verifica con meta-tag.**

Poi incolla il tag nel `<head>` di `quotify-website/index.html`, subito dopo `<meta charset>`:

```html
<meta name="facebook-domain-verification" content="INCOLLA_QUI_IL_CODICE" />
```

Deploy (`npm run deploy` dalla cartella del sito) e clicca **Verifica**.

> ⚠️ La registrazione avviene su `app.quotify.it`, che è un sottodominio: verificando
> `quotify.it` copri anche quello. Verifica il dominio radice, non il sottodominio.

## 2. Pixel — ✅ creato e installato (25/08/2026)

| Cosa | Valore |
|---|---|
| Dataset / Pixel ID | `1474396618080757` ("Quotify Web") |
| Portfolio | Quotify (`1583718346730435`) |
| Dove vive il codice | `main.js` → `loadMetaPixel()` |
| Quando si carica | **solo dopo il click su "Accetta"** nel banner |
| Eventi attivi | `PageView` + `Lead` sui link verso `app.quotify.it/register` |

### Cosa è stato modificato

- **`main.js`** — la vecchia `initCookieBanner()` è stata sostituita da un vero gestore
  del consenso: legge la scelta da `localStorage` (chiave `quotify_cookie_consent`),
  carica il pixel solo se vale `accepted`, ed espone `window.quotifyResetCookieConsent()`
  per riaprire il banner. La chiave è nuova di proposito: chi aveva accettato il vecchio
  banner ("OK, ho capito") non aveva prestato un consenso valido alla profilazione, quindi
  la domanda gli viene rifatta.
- **I 5 file HTML** — il banner ora ha due pulsanti di pari evidenza, **Rifiuta** e
  **Accetta**. Il testo dichiara i cookie di marketing invece di negarne l'esistenza.
- **`public/_headers`** — la Content-Security-Policy bloccava `connect.facebook.net`:
  senza questa modifica il pixel non si sarebbe caricato affatto. Aggiunti
  `connect.facebook.net` a `script-src` e `connect-src`, `www.facebook.com` a
  `img-src` e `connect-src`.
- **`cookie.html`** — nuova sezione 3.3 sui cookie di marketing con tabella, durata (3 mesi),
  contitolarità con Meta Platforms Ireland e trasferimento extra-UE; base giuridica corretta
  (art. 6.1.a GDPR + art. 122 D.Lgs. 196/2003); pulsante "Gestisci le preferenze sui cookie".
- **`privacy.html`** — Meta Platforms Ireland aggiunta tra i destinatari dei dati.

### Cosa manca

1. **Deploy del sito.** Fino ad allora il pixel non è online.
2. Dopo il deploy: Business Suite → Domini → `quotify.it` → **Verifica dominio**.
3. Verificare che il pixel spari, con l'estensione **Meta Pixel Helper** su Chrome:
   apri quotify.it, clicca **Rifiuta** → non deve comparire nulla; ricarica, clicca
   **Accetta** → deve comparire `PageView`.

### 3. L'evento che conta davvero: `CompleteRegistration`

Il click sulla CTA è un'intenzione, la registrazione è la conversione — e avviene nel repo
**`Quotify App`**, non nel sito. Senza quell'evento, le campagne future ottimizzerebbero sul
segnale sbagliato.

Va aggiunto lo stesso snippet in `Quotify App`, con lo stesso ID `1474396618080757` e con
lo stesso vincolo di consenso, e nel punto in cui la registrazione va a buon fine:

```ts
if (typeof window !== 'undefined' && (window as any).fbq) {
  (window as any).fbq('track', 'CompleteRegistration', { status: 'beta' })
}
```

⚠️ Anche l'app ha bisogno del proprio banner di consenso e della CSP aggiornata: non
copiare solo lo snippet.
