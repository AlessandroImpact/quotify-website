# Cruscotto unico di quotify.it — specifica

> Stato: **specifica approvata a voce, da rileggere**. Data: 2026-10-11.
> Progetto 3 della scomposizione in `docs/raccoglitore-metriche-piano.md` §2.
> Prerequisito: il raccoglitore (progetto 1), in produzione dall'11 ottobre 2026.

---

## 1. Cosa è e a cosa serve

Una pagina su `quotify.it/cruscotto`, visibile solo ad Alessandro, che mette in un posto solo
tutto quello che oggi sta in cinque: Cloudflare Web Analytics, le visite attribuite (D1), Search
Console, lo stato di indicizzazione e i numeri dell'app (Gestione Admin). Si guarda soprattutto
dal telefono.

Risponde a tre domande, una per scheda:

| Scheda | Domanda |
|---|---|
| **Oggi** | Come sta andando, e cosa è cambiato? |
| **Marketing** | Quale canale, campagna, guida o ricerca porta gente? |
| **Imbuto** | Dalla visita al pagamento: dove si perde la gente, e quale canale porta paganti? |

Oltre a mostrare: si esplora cliccando, scrive in italiano cosa è cambiato, e avvisa da solo su
Telegram — più un riassunto ogni lunedì.

### Criterio di successo

- Dal telefono, in meno di dieci secondi dall'apertura, si sa se la settimana va meglio o peggio
  della precedente e perché.
- Alla domanda «quale campagna ha portato paganti» si risponde toccando una riga, non con una
  query — a partire dal giorno in cui l'app salva la provenienza (§7).
- Un evento che conta (primo pagante, sito giù, pagina uscita dall'indice) arriva sul telefono
  entro un'ora, senza aprire nulla.
- I numeri del cruscotto coincidono con `npm run cruscotto` sugli stessi giorni.

### Fuori da questo progetto

- Le metriche **dentro** i social e App Store (progetto 4, bloccato).
- Domande libere a un assistente («fargli domande»): scartato il 2026-10-11.
- Sostituire Gestione Admin nell'app: resta dov'è.

---

## 2. Decisioni prese (11 ottobre 2026)

| Decisione | Scelta | Perché |
|---|---|---|
| Dove vive | Sul sito, rotta protetta | Scelta di Alessandro all'inizio del progetto |
| Schede | Tre: Oggi, Marketing, Imbuto | Nessuna delle tre domande sacrificata |
| Imbuto | **Filo vero**: l'app salva la provenienza all'iscrizione | Affiancare visite e iscritti per giorno mostra correlazioni, non cause |
| Dati dell'app | **A**: l'app espone un riassunto aggregato, il sito lo legge | Il sito non vede mai email né dati personali; l'app resta padrona del suo database. Scartate B (binding D1 diretto: dà al sito il potere di scrivere sui dati dei clienti) e C (API D1: lenta, vede le email, si rompe in silenzio se cambia lo schema) |
| «Geniale» | Esplorare cliccando, frasi su cosa è cambiato, avvisi | — |
| Avvisi | Telegram | Gratis, una chiamata HTTP, arriva subito |
| Riassunto settimanale | Sì, il lunedì mattina | Approvato |
| Piano Cloudflare | Gratuito | Workers Paid escluso per scelta |

---

## 3. Architettura

```
 telefono ──► Cloudflare Access (codice via email, solo terracciano41@gmail.com)
                  │
                  ▼
   quotify.it/cruscotto           guscio statico: HTML + JS, grafici SVG fatti a mano
                  │ fetch
                  ▼
   /api/cruscotto?periodo=…&confronto=…     Pages Function, cache 5 min
      ├─ D1 quotify-metriche   storico, ricerca, visite, avvisi       (nostro)
      ├─ Cloudflare GraphQL    solo «oggi», che l'archivio non ha ancora
      └─ app.quotify.it/api/interno/riassunto    aggregati dell'app, segreto condiviso

   Worker quotify-archivio (già attivo, un cron orario)
      ├─ 04 UTC  Cloudflare → storico                         (esiste)
      ├─ 05 UTC  Search Console → storico + ricerca           (esteso: §5.1)
      ├─ 06 UTC  lunedì: indicizzazione                       (esiste)
      ├─ 07 UTC  avvisi del giorno; lunedì anche il riassunto (nuovo)
      └─ ogni ora tranne le 05: eventi dell'app → avvisi      (nuovo)
```

### 3.1 I pezzi

| File | Compito | Dipende da |
|---|---|---|
| `cruscotto.html` + `src/cruscotto/*.js` | La pagina: tre schede, comandi, stato nell'URL | `/api/cruscotto` |
| `lib/grafici.mjs` | Linea, barre, imbuto, mini-linea → stringa SVG. Puro | niente |
| `lib/cruscotto.mjs` | Query D1 e composizione della risposta. Riceve le fonti come parametri | `lib/attribuzione.mjs` (`famiglia`) |
| `lib/osservazioni.mjs` | Dai numeri alle frasi e alle regole degli avvisi. Puro | niente |
| `lib/accesso.mjs` | Verifica del JWT di Cloudflare Access. Solo Web Crypto | niente |
| `lib/telegram.mjs` | Invio di un messaggio | `fetch` |
| `functions/api/cruscotto.js` | Accesso → fonti in parallelo → risposta, cache | i quattro sopra |
| `worker-archivio/` | + avvisi orari e giornalieri, + riassunto del lunedì, + archivio `ricerca` | `lib/osservazioni.mjs`, `lib/telegram.mjs` |

Tutte le funzioni pure ricevono `adesso` come parametro: nessuna legge l'orologio da sé, così i
test fissano il tempo.

### 3.2 Vincolo di CPU (piano gratuito: 10 ms)

Misurato col raccoglitore: la firma RSA del token Google costa da sola 6-8 ms. Quindi:

- **La Pages Function non chiama mai Google.** Query e pagine di Search Console le archivia il
  Worker ogni notte nella tabella `ricerca` (§5.1); il cruscotto legge D1.
- **Le aggregazioni su periodi lunghi si fanno in SQL**, dentro D1 (`json_each` sui campi di
  `storico.dati`), non in JavaScript: il tempo di D1 non conta come CPU della Function.
- La verifica del JWT di Access è una **verifica** RS256, non una firma: costa una frazione.
- Il controllo orario degli eventi **salta le 05 UTC**, l'ora in cui il Worker firma il token
  Google.

Verifica 9 (§11) misura la CPU della Function con `pagesFunctionsInvocationsAdaptive` (o
equivalente) su 12 mesi di periodo. Se supera 10 ms, la mitigazione è precalcolare i totali
settimanali in una tabella nel lavoro notturno.

---

## 4. La pagina

### 4.1 Comandi comuni

- **Periodo**: 7 giorni, 28 giorni, 90 giorni, 12 mesi, tutto. Predefinito 28.
- **Confronto**: col periodo precedente di pari durata, oppure spento.
- **Stato nell'URL**: `#marketing?periodo=28&confronto=1&canale=social&campagna=lancio`. Il tasto
  indietro funziona, una vista si salva nei preferiti, i link degli avvisi aprono la vista giusta.
- Ogni cifra mostra la variazione (▲ +40%, ▼ −12%) e una mini-linea. Sotto le soglie di §6.1 la
  variazione non si mostra: si mostra «—».

### 4.2 Scheda Oggi

1. **Quattro cifre**: visite (Cloudflare), iscritti, nuovi Pro, ricavo mensile ricorrente (app).
2. **Cosa è cambiato**: da tre a cinque frasi (§6.1).
3. **La giornata in corso**: visite di oggi ora per ora, sovrapposte a ieri. Fonte: Cloudflare
   GraphQL dal vivo, perché l'archivio arriva fino a ieri.
4. **Salute**, una riga: pagine indicizzate (n/26), Core Web Vitals dell'ultimo giorno, esito
   dell'ultima notte per ciascuna fonte (`storico.dati.fonti`), giorno più recente di Search
   Console.

### 4.3 Scheda Marketing

1. **Canali** (famiglie di `famiglia()`): pagine viste per provenienza (Cloudflare,
   `storico.dati.cloudflare.provenienze` — Cloudflare non dà le visite per provenienza),
   visite con UTM (D1 `visite`), iscritti, paganti (app). Le ultime due colonne dicono «in attesa
   dell'app» finché il riassunto non risponde.
2. **Campagne UTM**: sorgente, mezzo, campagna, contenuto, visite. Toccare una riga filtra la
   scheda: andamento giornaliero, pagine d'arrivo, paesi.
3. **Ricerca**: clic, impressioni, posizione media nel tempo; prime query e prime pagine del
   periodo; riquadro **Occasioni** — pagine con impressioni ≥ 100 e CTR sotto la mediana del sito,
   ordinate per impressioni.
4. **Indicizzazione**: pagina per pagina, con lo storico delle fotografie del lunedì. Una pagina
   che entra o esce si vede.

### 4.4 Scheda Imbuto

- Cinque gradini col tasso di passaggio: **visite → iscrizioni → attivazione** (primo preventivo o
  prima fattura) **→ Pro → pagante**.
- Filtrabile per canale. Le visite vengono da Cloudflare (totale) o da D1 (attribuite) a seconda
  del filtro: con un canale scelto, i gradini successivi usano la provenienza salvata dall'app.
- Gli iscritti senza provenienza (tutti quelli prima di §7, più chi non arriva da un link
  tracciato) stanno in **«provenienza sconosciuta»**, dichiarata.
- Tempo mediano fra iscrizione e primo pagamento.
- La coorte è quella degli **iscritti nel periodo**, con il loro stato attuale: un iscritto di
  marzo diventato pagante ad aprile conta nella coorte di marzo.

### 4.5 Vincoli onesti

- Lo storico Cloudflare parte dal 13 settembre 2026; Search Console da circa giugno 2025. Con
  «12 mesi» o «tutto», il grafico delle visite comincia dove cominciano i dati, con una nota: mai
  zeri inventati per riempire.
- `NULL` in `storico` è «non lo sappiamo» e si disegna come un buco, non come zero.

### 4.6 Forma

- Niente framework né librerie di grafici, niente script di terzi. Gli stessi token di colore del
  sito, i due temi.
- Prima il telefono: 390 px, schede come barra in basso, tabelle che scorrono in orizzontale.
- Grafici SVG con valore leggibile al tocco e al passaggio del mouse; `title`/`desc` per gli
  screen reader.
- `<meta name="robots" content="noindex, nofollow">`; fuori da sitemap e `llms.txt` (il gate SEO
  già lo pretende per le pagine `noindex`).
- La cartella locale `cruscotto/` (generata da `npm run cruscotto`, ignorata da git) si rinomina
  `cruscotto-locale/`, per non confondersi con la rotta.

---

## 5. Dati

### 5.1 Estensioni dell'archivio (migrazione `0002`)

```sql
-- Query e pagine di Search Console, un giorno alla volta. Il cruscotto non
-- chiama Google (§3.2): legge da qui.
CREATE TABLE ricerca (
  giorno      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('query', 'pagina')),
  chiave      TEXT NOT NULL,
  clic        INTEGER NOT NULL,
  impressioni INTEGER NOT NULL,
  posizione   REAL NOT NULL,
  PRIMARY KEY (giorno, tipo, chiave)
);

-- Avvisi già inviati: la stessa chiave non parte due volte.
CREATE TABLE avvisi (
  chiave     TEXT PRIMARY KEY,
  inviato_il TEXT NOT NULL,
  testo      TEXT NOT NULL
);
```

- Il lavoro Google delle 05 aggiunge due richieste (`dimensions: [date, query]` e
  `[date, page]`, `rowLimit` 25000) sugli stessi giorni che già rifà, e scrive con upsert.
  Alla prima esecuzione recupera i 16 mesi in un colpo: sono due richieste, non 970. Se una
  risposta arriva con 25000 righe esatte si pagina con `startRow`, entro il tetto di sottorichieste.
- Google nasconde le query sotto una soglia di volume: la somma delle righe di `ricerca` è
  **minore** dei totali di `storico`. Il cruscotto mostra i totali da `storico` e le righe da
  `ricerca`, mai la somma delle righe come totale.
- `ricerca` rientra nella pulizia dei 26 mesi.

### 5.2 Il contratto di `/api/cruscotto`

`GET /api/cruscotto?periodo=7|28|90|365|tutto&confronto=0|1` → JSON:

```js
{
  generato: '2026-10-12T08:00:00Z',
  periodo: { da: '2026-09-14', a: '2026-10-11', giorni: 28 },
  precedente: { da, a } | null,
  fonti: {                       // lo stato di ciascuna, sempre presente
    archivio:   'ok' | 'errore',
    cloudflare: 'ok' | 'errore',             // solo «oggi»
    app:        'ok' | 'errore' | 'in-attesa' // in-attesa = riassunto non configurato o 404
  },
  oggi:      { perOra: [{ ora, visite }], ieriPerOra: [...] } | null,
  serie:     [{ giorno, visite, pagineViste, clic, impressioni, posizione, iscritti, ... }],
  canali:    [{ famiglia, visite, visiteUtm, iscritti, paganti }],
  campagne:  [{ sorgente, mezzo, campagna, contenuto, visite, iscritti, paganti }],
  ricerca:   { query: [...], pagine: [...], occasioni: [...] },
  indice:    { ultima: '2026-10-06', pagine: [{ percorso, stato, dal }] },
  imbuto:    { gradini: [{ nome, valore }], perCanale: {...}, medianaGiorniAlPagamento } | null,
  salute:    { vitals, fonti: { cloudflare, google, indicizzazione }, ultimoGiornoGoogle },
  osservazioni: [{ testo, peso, link }],
  totaliPrecedente: {...} | null
}
```

`null` in un blocco significa «fonte non disponibile», e la pagina lo scrive. Il periodo
`precedente` è calcolato dal server, non dal client.

### 5.3 Cache

`caches.default`, chiave sull'URL senza intestazioni. 5 minuti se tutte le fonti sono `ok`,
1 minuto altrimenti. L'URL della cache include periodo e confronto; il filtro per canale e
campagna si applica nel client sui dati già scaricati, così toccare una riga non fa richieste.

---

## 6. Osservazioni e avvisi (`lib/osservazioni.mjs`)

### 6.1 Le frasi

Una frase esce solo se supera **volume e scarto insieme**. Soglie in un oggetto solo, esportato:

```js
export const SOGLIE = {
  visite: 20,        // entrambi i periodi sopra questa soglia
  iscritti: 3,
  clic: 10,
  scartoMinimo: 0.25 // ±25%
};
```

| Tipo | Esempio | Condizione |
|---|---|---|
| Variazione | «Le visite da Ricerca Google sono passate da 40 a 85 (+113%)» | entrambi ≥ soglia e scarto ≥ 25% |
| Novità | «Prima visita da reddit.com», «La campagna `lancio-ottobre` ha portato le prime 6 visite» | chiave assente nei 90 giorni precedenti |
| Ricerca | «Nuova query fra le prime 10: *regime forfettario 2027*», «`/guide/f24-e-dashboard` è salita da posizione 18 a 9» | impressioni ≥ 20 nel periodo |
| Indice | «`/assistenza` è entrata nell'indice» | cambio fra due fotografie |
| Quiete | «Settimana senza scossoni» | nessuna delle precedenti |

Ogni frase ha un `peso`; se ne mostrano al massimo cinque, in ordine di peso, e ognuna porta il
link alla vista che la spiega. Le frasi si generano dal server (`/api/cruscotto`) e dal Worker
(riassunto del lunedì) con la stessa funzione.

### 6.2 Gli avvisi

| Quando (UTC) | Avviso | Chiave di deduplica |
|---|---|---|
| Ogni ora tranne le 05 | **Nuovo pagante**, col canale se noto | `pagante:<id opaco>` |
| Ogni ora tranne le 05 | **Primo iscritto da un canale o una campagna mai visti** | `primo-iscritto:<sorgente>:<campagna>` |
| 07, ogni giorno | **Visite a zero ieri** con media dei 7 giorni prima ≥ 10 | `zero:<giorno>` |
| 07, ogni giorno | **Picco**: ieri ≥ 3 × mediana dei 28 giorni e ≥ 30 visite | `picco:<giorno>` |
| 07, ogni giorno | **Archivio fermo**: una fonte in errore due notti di fila | `fermo:<fonte>:<giorno>` |
| 07, lunedì | **Pagina uscita dall'indice** | `indice-uscita:<percorso>:<settimana ISO>` |
| 07, lunedì | **Riassunto settimanale**: le frasi di §6.1 sulla settimana chiusa | `riassunto:<settimana ISO>` |

- La chiave si scrive in `avvisi` **solo dopo** che Telegram ha risposto `ok`: un invio fallito
  si ritenta all'ora dopo.
- Dalle 22 alle 8 ora italiana (`Europe/Rome`, ora legale inclusa) i messaggi partono con
  `disable_notification: true`.
- Nessun dato personale nei messaggi: «Nuovo pagante, da LinkedIn (campagna lancio-ottobre)».
- Ogni messaggio porta il link alla vista del cruscotto.

Segreti del Worker: `TELEGRAM_TOKEN` (segreto), `TELEGRAM_CHAT` (variabile), `RIASSUNTO_CHIAVE`
(segreto). Il bot lo crea Alessandro con @BotFather.

Costo in sottorichieste: ≤ 2 in più all'ora (riassunto dell'app, Telegram), ≤ 4 alle 07 il lunedì.

---

## 7. Il filo con l'app

### 7.1 Dal sito all'app: la provenienza

Il sito non usa cookie né memoria del browser, e non comincia ora: salvare sul dispositivo un
identificativo di campagna per legarlo poi a un account è tracciamento individuale e chiederebbe
il consenso.

Quindi la provenienza viaggia **solo nel salto diretto**: sulla pagina d'arrivo, uno script
aggiunge ai link verso `app.quotify.it` i parametri della visita corrente:

La pagina di iscrizione dell'app è `/register` (`src/App.tsx:261` dell'app). I link del sito
portano già UTM **interni** (`utm_source=sito&utm_medium=guida&utm_campaign=clienti`): dicono
quale bottone, non quale canale.

```
https://app.quotify.it/register?utm_source=linkedin&utm_medium=social&utm_campaign=lancio&rif=www.linkedin.com
```

- Se la pagina corrente ha `utm_*` (il visitatore è arrivato da una campagna), **sostituiscono**
  quelli interni del link. Altrimenti gli UTM interni restano.
- `rif` è l'host di `document.referrer` se esterno; si aggiunge in entrambi i casi.
- Il canale lo decide il sito: `rif` se c'è, altrimenti `sorgente` (§7.2, punto 3).
- Se la persona naviga prima su un'altra pagina del sito, la provenienza si perde e l'iscritto
  finisce in «sconosciuta». È il prezzo, dichiarato, di non usare cookie.
- Stessa pulizia dei valori di `lib/attribuzione.mjs`: minuscole, niente caratteri di controllo,
  200 caratteri.

### 7.2 Nell'app (documento per la sessione dell'app)

Va scritto in `Quotify App/docs/cruscotto-riassunto.md` e implementato da quella sessione. Contiene:

1. **Lettura** dei parametri sulla pagina di iscrizione e loro inoltro alla registrazione, sia
   email/password (`functions/api/auth/register.ts`) sia Google/Apple (`oauthAccesso.ts`, che ha
   già il campo `referrer`).
2. **Salvataggio** nella colonna esistente `users.registrazione_referrer`, in un formato fisso:
   `s=<sorgente>;m=<mezzo>;c=<campagna>;r=<host>` (campi vuoti omessi).
3. **L'endpoint** `GET /api/interno/riassunto?da=YYYY-MM-DD&a=YYYY-MM-DD`, protetto da
   `Authorization: Bearer <RIASSUNTO_CHIAVE>` con confronto a tempo costante, fail-closed:

```js
{
  versione: 1,
  generato: ISO,
  giorni:     [{ giorno, iscritti, attivati, nuoviPro, nuoviPaganti }],
  coorte:     [{ sorgente, mezzo, campagna, rif, iscritti, attivati, pro, paganti }],  // iscritti in [da, a]
  totali:     { utenti, pro, paganti, ricavoMensileCentesimi },
  eventi:     [{ id, tipo: 'iscritto' | 'pagante', quando, sorgente, campagna, rif }], // ultimi 7 giorni
  medianaGiorniAlPagamento: number | null
}
```

   - `id` è un hash opaco (SHA-256 di `user_id` + un sale segreto), mai l'id vero.
   - Nessuna email, nessun nome, nessun importo per utente.
   - `sorgente` grezza: il raggruppamento in famiglie lo fa il sito, in un posto solo.
4. **Test** che la sessione dell'app deve scrivere: chiave mancante o sbagliata → 401; segreto
   non configurato → 401; nessun campo personale nella risposta; formato della provenienza.
5. **Privacy**: la provenienza salvata con l'account è un dato personale; l'informativa va
   aggiornata (§9).

Finché l'app non risponde, `fonti.app = 'in-attesa'` e le colonne relative dicono «in attesa
dell'app». Nient'altro si rompe.

---

## 8. Sicurezza

1. **Cloudflare Access**: un'applicazione self-hosted su `quotify.it/cruscotto` e
   `quotify.it/api/cruscotto`, criterio «email uguale a `terracciano41@gmail.com`», metodo codice
   via email, sessione 7 giorni. Piano gratuito (≤ 50 utenti).
2. **Verifica nella Function** (`lib/accesso.mjs`): l'intestazione `Cf-Access-Jwt-Assertion`
   deve essere un JWT RS256 firmato da una chiave pubblicata in
   `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, con `aud` uguale all'AUD tag
   dell'applicazione, non scaduto, ed `email` uguale a `CRUSCOTTO_EMAIL`. Le chiavi pubbliche si
   tengono in cache.
   **Perché anche qui**: lo stesso progetto Pages risponde su `quotify-website-970.pages.dev`,
   che Access non copre. Senza questa verifica, lì i dati sarebbero aperti.
3. **Fail-closed**: se manca uno fra `ACCESS_TEAM`, `ACCESS_AUD`, `CRUSCOTTO_EMAIL`, o la verifica
   fallisce per qualunque motivo → 403, corpo fisso, nessun dettaglio.
4. **Il guscio** `cruscotto.html` non contiene dati: anche servito senza protezione non dice nulla.
5. **Le anteprime** non hanno D1 (`raccoglitore-metriche-piano.md`, scelta del deploy): su un
   deploy d'anteprima l'endpoint risponde con `fonti.archivio = 'errore'`.
6. **Segreti**: `CF_ANALYTICS_TOKEN` (lo stesso token di sola lettura del Worker) e
   `RIASSUNTO_CHIAVE` sul progetto Pages, solo produzione; caricati via stdin. Il PATCH di Pages
   va fotografato prima e dopo (`history.md`, trappole).
7. Nessun segreto nei messaggi d'errore, nei log, nella risposta.

---

## 9. Privacy

- Il cruscotto non raccoglie nulla di nuovo: legge quello che il raccoglitore già conserva.
- La **provenienza all'iscrizione** (§7) è nuova: lega un canale a un account. Base giuridica:
  legittimo interesse (sapere quali canali portano clienti), nessun dato sul dispositivo.
  `privacy.html` §2 va aggiornata con una voce: «Al momento dell'iscrizione registriamo il canale
  da cui sei arrivato (per esempio una campagna o un sito), insieme all'account». Conservazione:
  quella dell'account.
- I messaggi Telegram non contengono dati personali.

---

## 10. Fasi

| # | Fase | Prodotto | Dipende da |
|---|---|---|---|
| 0 | Documento per l'app | `Quotify App/docs/cruscotto-riassunto.md` | — (prima, così l'app lavora in parallelo) |
| 1 | Archivio esteso | migrazione `0002`, `ricerca` nel lavoro Google, pulizia | — |
| 2 | Accesso | `lib/accesso.mjs`, `functions/api/cruscotto.js` che risponde solo 403/200 vuoto, applicazione Access | Alessandro: Zero Trust attivo |
| 3 | Dati | `lib/cruscotto.mjs`, contratto §5.2, cache | 1, 2 |
| 4 | Pagina | `cruscotto.html`, `lib/grafici.mjs`, tre schede | 3 |
| 5 | Osservazioni | `lib/osservazioni.mjs`, frasi nella scheda Oggi | 3 |
| 6 | Avvisi | Worker: avvisi orari, del giorno, riassunto del lunedì | 5; Alessandro: bot Telegram |
| 7 | Provenienza sul sito | script dei link verso l'app, privacy aggiornata | 0 |

Le fasi 1-6 funzionano senza l'app: le parti dell'app restano «in attesa».

---

## 11. Verifiche

1. `npm test`: tutte le funzioni pure, con i casi di §12.
2. `quotify.it/cruscotto` da una finestra anonima → schermata di Access.
3. `curl https://quotify-website-970.pages.dev/api/cruscotto` → **403**.
4. `curl https://quotify.it/api/cruscotto` con un `Cf-Access-Jwt-Assertion` inventato → **403**.
5. Dopo l'accesso, con periodo 7 giorni: visite e pagine viste uguali a `npm run cruscotto`
   sugli stessi giorni.
6. Pagina a 390 px e a 1280 px, tema chiaro e scuro, con dati veri e con l'app «in attesa».
7. Messaggio Telegram di prova; lo stesso avviso fatto girare due volte → un solo messaggio.
8. Dopo la prima notte con la fase 1: `ricerca` ha righe su ~16 mesi.
9. CPU della Function con periodo «tutto» sotto 10 ms (§3.2).

---

## 12. Rischi e casi da testare

| Rischio | Mitigazione |
|---|---|
| Numeri piccoli che producono frasi assurde («+200%» da 1 a 3) | Soglie di volume §6.1; test con 0, 1, soglia−1, soglia |
| Dati aperti su `*.pages.dev` | Verifica del JWT nella Function (§8.2); verifica 3 |
| Token Access forgiato, scaduto, con `aud` o email sbagliati | Test con chiavi generate nel test per ciascun caso |
| Avviso ripetuto ogni ora | Chiave in `avvisi`; test con due esecuzioni |
| Avviso perso perché Telegram era giù | Chiave scritta solo dopo `ok`; test con Telegram che fallisce |
| Function oltre i 10 ms di CPU | §3.2; verifica 9 |
| L'app cambia il riassunto e il cruscotto mostra numeri sbagliati | Campo `versione`; versione sconosciuta → `fonti.app = 'errore'` |
| Somma delle query presa per totale | §5.1: totali solo da `storico` |
| Fuso orario: Search Console in ora del Pacifico, Cloudflare in UTC | Dichiarato nella pagina accanto al grafico della ricerca (minore già noto del raccoglitore) |
| Serie vuote o di un solo punto nei grafici | Test di `lib/grafici.mjs` |
