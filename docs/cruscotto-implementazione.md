# Cruscotto unico — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pagina su `quotify.it/cruscotto`, dietro Cloudflare Access, con tre schede (Oggi, Marketing, Imbuto), frasi automatiche su cosa è cambiato e avvisi Telegram, che unisce archivio D1, Cloudflare dal vivo e il riassunto aggregato dell'app.

**Architecture:** Un guscio statico (`cruscotto.html` + `cruscotto.js`, bundlato da Vite) chiama un solo endpoint Pages (`/api/cruscotto`), che verifica il JWT di Access, legge D1 con aggregazioni in SQL, chiede a Cloudflare solo le ore di oggi e all'app solo aggregati. Il Worker `quotify-archivio`, già attivo con un cron orario, archivia in più query e pagine di Search Console e manda gli avvisi. Tutta la logica sta in moduli puri sotto `lib/`, testati con `node --test` e un D1 in memoria.

**Tech Stack:** JavaScript ES modules, Cloudflare Pages Functions + Workers (piano gratuito), D1, Web Crypto, Vite 7, `node:test` + `node:sqlite`. Nessuna dipendenza nuova.

**Spec:** `docs/cruscotto-piano.md`

## Global Constraints

- Piano Cloudflare **gratuito**: 10 ms di CPU per invocazione, 50 sottorichieste, 50 query D1 per invocazione, 5 cron per account (ne sono già usati 4: **nessun cron nuovo**).
- **La Pages Function non chiama mai Google** (spec §3.2). Le aggregazioni su periodi lunghi si fanno in SQL.
- Nessuna dipendenza npm nuova, nessuna libreria di grafici, nessuno script di terzi sulla pagina.
- `NULL` vuol dire «non lo sappiamo», zero vuol dire «nessuno»: mai convertire l'uno nell'altro.
- `~/Developer/"Quotify App"` è in **sola lettura**: si scrive solo `Quotify App/docs/cruscotto-riassunto.md`.
- Segreti solo via stdin (`wrangler secret put` / `wrangler pages secret put`), salvati in `~/vault/secrets/quotify/` con `chmod 600`; mai stampati, mai in un messaggio d'errore o di log.
- Deploy: `source ~/.zshrc` poi `CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh` **nella stessa chiamata** del comando. Mai `wrangler login`/`logout`.
- Un PATCH o una modifica ai segreti del progetto Pages si fotografa prima e dopo con `npx wrangler pages secret list --project-name=quotify-website`.
- Test in `lib/*.test.mjs`, mai sotto `functions/` (diventerebbero rotte). Comando: `npm test`.
- Nessun `wrangler.toml` nella radice del repository. Niente `[limits]` nel `wrangler.toml` del Worker.
- Email ammessa: `terracciano41@gmail.com`. Sito: `quotify.it`; anteprime su `quotify-website-970.pages.dev`.
- Ogni funzione che dipende dall'ora riceve `adesso`/`istante` come parametro.
- Commit convenzionali in italiano, con le due righe di attribuzione della sessione.

## Review Focus

1. **Token Access valido ma per un'altra applicazione o un altro team** (`aud` o `iss` diversi) → 403, mai i dati. Test nel Compito 2.
2. **Periodo «tutto» o «365» con lo storico che comincia a metà finestra e giorni `NULL`** → la serie ha `null` in quei giorni, i totali ignorano i `null`, nessuno zero inventato. Test nel Compito 5.
3. **Riassunto dell'app che risponde 404, 500, JSON rotto, versione sconosciuta o non risponde** → `fonti.app` vale `in-attesa` o `errore`, il resto della risposta è intero. Test nel Compito 5.
4. **Telegram giù o con `ok: false`** → la chiave dell'avviso non si scrive e l'avviso riparte all'ora dopo; un secondo giro con Telegram su non manda doppioni. Test nel Compito 9.
5. **Link verso l'app che hanno già UTM interni, visitatore con UTM propri e/o referrer esterno, script eseguito due volte** → gli UTM del visitatore sostituiscono quelli interni, `rif` si aggiunge una volta, nessun parametro doppio. Test nel Compito 10.

---

## Mappa dei file

| File | Stato | Compito |
|---|---|---|
| `~/Developer/Quotify App/docs/cruscotto-riassunto.md` | nuovo | istruzioni per la sessione dell'app |
| `worker-archivio/migrazioni/0002_cruscotto.sql` | nuovo | tabelle `ricerca` e `avvisi` |
| `lib/d1-in-memoria.mjs` | modifica | carica tutte le migrazioni in ordine |
| `lib/searchconsole.mjs` | modifica | `rendimento` accetta `daRiga` (startRow) |
| `lib/archivio.mjs` | modifica | righe e istruzioni di `ricerca`, pulizia |
| `lib/archiviatore.mjs` | modifica | `lavoroGoogle` archivia query e pagine; `lavoroCloudflare` pulisce `ricerca` |
| `lib/accesso.mjs` | nuovo | verifica del JWT di Cloudflare Access |
| `lib/cruscotto.mjs` | nuovo | intervalli, letture D1, `componi` |
| `lib/osservazioni.mjs` | nuovo | soglie, variazione, frasi |
| `lib/riassunto.mjs` | nuovo | lettura del riassunto dell'app, canale di un iscritto |
| `lib/cloudflare.mjs` | modifica | `perOra` |
| `lib/cruscotto-api.mjs` | nuovo | logica dell'endpoint (accesso, cache, fonti) |
| `functions/api/cruscotto.js` | nuovo | involucro sottile di `cruscotto-api` |
| `lib/attribuzione.mjs` | modifica | `ePagina` esclude `/cruscotto` |
| `lib/grafici.mjs` | nuovo | linea, mini-linea, imbuto in SVG |
| `lib/vista.mjs` | nuovo | stato della pagina ↔ hash dell'URL |
| `cruscotto.html`, `cruscotto.js`, `cruscotto.css` | nuovi | la pagina |
| `vite.config.js`, `public/_headers` | modifica | entry di build, intestazioni |
| `scripts/analytics/cruscotto.mjs`, `indicizzazione.mjs`, `.gitignore` | modifica | `cruscotto/` → `cruscotto-locale/` |
| `lib/avvisi.mjs`, `lib/telegram.mjs` | nuovi | regole degli avvisi, invio |
| `lib/archiviatore.mjs`, `worker-archivio/indice.mjs` | modifica | lavoro degli avvisi nel Worker |
| `public/provenienza.js` | nuovo | UTM e `rif` sui link di iscrizione |
| `scripts/content/genera-calcolatore.mjs` + tutte le pagine | modifica | `<script>` di provenienza nella testa |
| `privacy.html` | modifica | voce sulla provenienza all'iscrizione |

---

### Compito 0: ramo e documento per l'app

**Files:**
- Create: `~/Developer/Quotify App/docs/cruscotto-riassunto.md`

**Interfaces:**
- Produces: il contratto di `GET https://app.quotify.it/api/interno/riassunto` che il Compito 5 consuma: `{ versione: 1, generato, giorni[], coorte[], totali, eventi[], medianaGiorniAlPagamento }`.

- [ ] **Step 1: Creare il ramo**

```bash
cd /Users/alessandroterracciano/Developer/quotify-website && git checkout -b cruscotto main && git status -sb | head -1
```
Expected: `## cruscotto`

- [ ] **Step 2: Scrivere il documento per l'app**

Scrivere `~/Developer/Quotify App/docs/cruscotto-riassunto.md` con esattamente questo contenuto:

````markdown
# Riassunto per il cruscotto di quotify.it — istruzioni per l'app

> Scritto il 2026-10-11 dalla sessione del **sito** (`~/Developer/quotify-website`), che ha letto
> questo repository in sola lettura. Specifica di riferimento: `quotify-website/docs/cruscotto-piano.md` §7.
> Va implementato da una sessione dell'app. Nessuna di queste modifiche è stata fatta.

## Perché

Il sito ha un cruscotto su `quotify.it/cruscotto` che mette insieme traffico, ricerca e app. Per
rispondere a «quale canale porta paganti» servono due cose che oggi l'app non ha:

1. sapere **da dove arriva** chi si iscrive (la colonna `users.registrazione_referrer` esiste dalla
   migrazione 025, ma la pagina di iscrizione non la riempie mai);
2. un endpoint che dia al sito **solo numeri aggregati** — mai email, nomi o id veri.

## 1. Leggere la provenienza sulla pagina di iscrizione

I link del sito verso `https://app.quotify.it/register` arrivano così:

```
/register?utm_source=linkedin&utm_medium=social&utm_campaign=lancio&rif=www.linkedin.com
/register?utm_source=sito&utm_medium=guida&utm_campaign=clienti            (UTM interni: quale bottone)
/register?utm_source=sito&utm_medium=guida&utm_campaign=clienti&rif=www.google.com
```

`RegisterPage` legge al primo render `utm_source`, `utm_medium`, `utm_campaign`, `rif` da
`location.search` e li compone in **una stringa** in questo formato fisso:

```
s=<utm_source>;m=<utm_medium>;c=<utm_campaign>;r=<rif>
```

- campi vuoti **omessi** (`s=sito;m=guida;c=clienti`), nessun parametro → nessuna stringa;
- ogni valore: senza caratteri di controllo, senza `;` e `=`, `trim`, minuscolo, al massimo 200 caratteri.

La stringa va mandata:
- nel corpo di `POST /api/auth/register` come campo `provenienza`;
- nel flusso Google/Apple come `referrer` (il campo esiste già in `functions/lib/oauthAccesso.ts`,
  `OpzioniAccesso.referrer`). Come farla sopravvivere al giro di redirect lo decide l'app,
  nel rispetto della propria cookie policy.

## 2. Salvarla all'iscrizione

- `functions/api/auth/register.ts`: leggere `provenienza` dal corpo, normalizzarla con la stessa
  funzione di `oauthAccesso.ts` (`normalizzaReferrer`, da esportare), salvarla in
  `users.registrazione_referrer` nello stesso `INSERT`, e passarla a `inviaAvvisoIscrizione`
  al posto di `referrer: null`.
- Per Google/Apple il salvataggio c'è già (`oauthAccesso.ts:169-172`): basta che il client passi
  il valore.
- Solo per gli utenti **nuovi**: un account esistente non cambia provenienza.

## 3. L'endpoint `GET /api/interno/riassunto`

```
GET /api/interno/riassunto?da=YYYY-MM-DD&a=YYYY-MM-DD
Authorization: Bearer <RIASSUNTO_CHIAVE>
```

- **Autenticazione**: solo la chiave, confrontata a tempo costante; segreto non configurato → 401.
  Il middleware dell'app oggi chiede la sessione utente su `/api/*`: questa rotta va **esclusa**
  dal controllo utente e protetta **solo** dalla chiave. Nessun cookie, nessun CORS.
- **Parametri**: `da` e `a` obbligatori, formato `YYYY-MM-DD`, `da <= a`, al massimo 800 giorni;
  altrimenti 400.
- **Utenti interni esclusi** con lo stesso criterio di `functions/api/admin/economia.ts` (`interno`).
- `Cache-Control: no-store`.

Risposta 200:

```js
{
  versione: 1,
  generato: '2026-10-12T07:00:00.000Z',
  giorni: [                         // un elemento per OGNI giorno UTC in [da, a], anche a zero
    { giorno: '2026-10-11', iscritti: 2, attivati: 1, nuoviPro: 0, nuoviPaganti: 0 }
  ],
  coorte: [                         // utenti iscritti in [da, a], raggruppati per provenienza; stato ATTUALE
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', rif: 'www.linkedin.com',
      iscritti: 4, attivati: 2, pro: 1, paganti: 1 },
    { sorgente: null, mezzo: null, campagna: null, rif: null, iscritti: 9, attivati: 3, pro: 1, paganti: 0 }
  ],
  totali: { utenti: 120, pro: 14, paganti: 6, ricavoMensileCentesimi: 5940 },  // ad oggi
  eventi: [                         // ultimi 7 giorni rispetto a ora, più recenti prima
    { id: '9f2c…', tipo: 'pagante', quando: '2026-10-11T14:02:11Z',
      sorgente: 'linkedin', campagna: 'lancio', rif: 'www.linkedin.com' }
  ],
  medianaGiorniAlPagamento: 6       // fra iscrizione e primo pagamento, iscritti in [da, a]; null se nessuno
}
```

Definizioni:
- **iscritti**: `users.created_at` nel giorno.
- **attivati**: utenti il cui **primo preventivo o prima fattura** cade nel giorno.
- **nuoviPro**: utenti che nel giorno hanno iniziato ad avere il Pro effettivo (`sqlProEffettivo`), omaggi inclusi.
- **nuoviPaganti**: utenti il cui **primo pagamento riuscito** (tabella `pagamenti`) cade nel giorno.
- **pro / paganti in `coorte` e `totali`**: stato attuale, con `sqlProEffettivo` e `sqlAbbonamentoAttivo`.
- **ricavoMensileCentesimi**: lo stesso calcolo di `ricavoMensile` in `functions/lib/costi.ts`, in centesimi.
- **sorgente/mezzo/campagna/rif**: estratti da `registrazione_referrer` nel formato del punto 1; `null` se assente.
- **id degli eventi**: esadecimale di SHA-256(`RIASSUNTO_SALE` + `:` + tipo + `:` + user_id). Mai l'id vero.
- Nessun campo con email, nomi, importi per singolo utente.

## 4. Test da scrivere

- chiave assente, sbagliata, o segreto non configurato → 401;
- `da`/`a` mancanti, invertiti, oltre 800 giorni, formato errato → 400;
- `giorni` ha un elemento per ogni giorno, anche senza iscritti;
- nella risposta non compare nessuna email né nessun `user_id` (cercarli nel JSON serializzato);
- un iscritto con `registrazione_referrer = 's=linkedin;c=lancio;r=www.linkedin.com'` finisce nella riga giusta di `coorte`;
- la stringa di provenienza: valori con `;`, `=`, maiuscole, caratteri di controllo, oltre 200 caratteri;
- utenti interni esclusi.

## 5. Segreti

- `RIASSUNTO_CHIAVE`: **lo stesso valore** sta già (o starà) sul progetto Pages del sito e sul
  Worker `quotify-archivio`. Si trova in `~/vault/secrets/quotify/riassunto-chiave`.
  Caricarlo con `npx wrangler pages secret put RIASSUNTO_CHIAVE --project-name=quotify < ~/vault/secrets/quotify/riassunto-chiave`.
- `RIASSUNTO_SALE`: solo nell'app, generato a parte (`openssl rand -base64 32`).

## 6. Privacy

La provenienza salvata con l'account è un dato personale. L'informativa (`quotify.it/privacy`, §2)
viene aggiornata dalla sessione del sito con la voce «Provenienza dell'iscrizione».
````

- [ ] **Step 3: Verificare che nel repository dell'app sia cambiato solo quel file**

```bash
git -C ~/Developer/"Quotify App" status --short
```
Expected: una sola riga, `?? docs/cruscotto-riassunto.md` (più eventuali modifiche che c'erano già prima: confrontare con `git -C ~/Developer/"Quotify App" status --short` lanciato **prima** dello Step 2 e annotarlo nel registro). Non si fa commit nel repository dell'app.

---

### Compito 1: archivio esteso (query e pagine di Search Console)

**Files:**
- Create: `worker-archivio/migrazioni/0002_cruscotto.sql`
- Modify: `lib/d1-in-memoria.mjs` (carica tutte le migrazioni)
- Modify: `lib/searchconsole.mjs:106-110` (`rendimento` con `daRiga`)
- Modify: `lib/archivio.mjs` (in fondo: `FINESTRA_RICERCA`, `righeRicerca`, `istruzioniRicerca`, `istruzionePuliziaRicerca`)
- Modify: `lib/archiviatore.mjs` (`lavoroGoogle`, `lavoroCloudflare`, `RIGHE_PAGINA_GOOGLE`)
- Test: `lib/archivio.test.mjs`, `lib/archiviatore.test.mjs`

**Interfaces:**
- Consumes: `g.rendimento({ da, a, dimensioni, righe, daRiga })` → `[{ keys, clicks, impressions, position }]`.
- Produces:
  - tabella `ricerca(giorno, tipo 'query'|'pagina', chiave, clic, impressioni, posizione)`, PK `(giorno, tipo, chiave)`; per `tipo = 'pagina'` la chiave è il **percorso** (`/guide/clienti`), non l'URL intero;
  - tabella `avvisi(chiave PK, inviato_il, testo)`;
  - `FINESTRA_RICERCA = 11`, `righeRicerca(tipo, righe) → [{ g, t, k, c, i, p }]`, `istruzioniRicerca(db, righe, daGiorno) → istruzioni[]`, `istruzionePuliziaRicerca(db, oggi) → istruzione`.

- [ ] **Step 1: Scrivere la migrazione**

`worker-archivio/migrazioni/0002_cruscotto.sql`:

```sql
-- Cruscotto: docs/cruscotto-piano.md §5.1.

-- Query e pagine di Search Console, un giorno alla volta. Il cruscotto non
-- chiama Google (la firma RSA si mangerebbe i 10 ms di CPU): legge da qui.
-- Per le pagine la chiave è il percorso, non l'URL intero.
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

- [ ] **Step 2: Il D1 in memoria carica tutte le migrazioni, in ordine**

In `lib/d1-in-memoria.mjs` sostituire l'import e la costante `SCHEMA` e la riga `db.exec(readFileSync(SCHEMA, 'utf8'));`:

```js
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

// Tutte le migrazioni, in ordine di nome: sono gli stessi file che vanno su D1.
const MIGRAZIONI = new URL('../worker-archivio/migrazioni/', import.meta.url);
const SCHEMA = readdirSync(MIGRAZIONI).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(new URL(f, MIGRAZIONI), 'utf8')).join('\n');
```

e dentro `apriInMemoria()`:

```js
  db.exec(SCHEMA);
```

Aggiornare anche il commento in testa al file: «Lo schema sono gli stessi file che vanno su D1».

- [ ] **Step 3: Scrivere i test di `ricerca` (falliranno)**

In fondo a `lib/archivio.test.mjs` (aggiungere `righeRicerca, istruzioniRicerca, istruzionePuliziaRicerca, FINESTRA_RICERCA` all'import da `./archivio.mjs`):

```js
test('lo schema in memoria ha le tabelle del cruscotto', () => {
  const db = apriInMemoria();
  const nomi = db.tutte("SELECT name FROM sqlite_master WHERE type = 'table'").map((r) => r.name);
  assert.ok(nomi.includes('ricerca'));
  assert.ok(nomi.includes('avvisi'));
});

test('righeRicerca: query così come sono, pagine ridotte al percorso', () => {
  assert.equal(FINESTRA_RICERCA, 11);
  assert.deepEqual(
    righeRicerca('query', [{ keys: ['2026-10-01', 'regime forfettario'], clicks: 2, impressions: 40, position: 7.5 }]),
    [{ g: '2026-10-01', t: 'query', k: 'regime forfettario', c: 2, i: 40, p: 7.5 }]);
  assert.deepEqual(
    righeRicerca('pagina', [{ keys: ['2026-10-01', 'https://quotify.it/guide/clienti'], clicks: 0, impressions: 3, position: 12 }]),
    [{ g: '2026-10-01', t: 'pagina', k: '/guide/clienti', c: 0, i: 3, p: 12 }]);
  // Una riga senza la seconda chiave non è una riga di dettaglio: si scarta.
  assert.deepEqual(righeRicerca('query', [{ keys: ['2026-10-01'], clicks: 1, impressions: 1, position: 1 }]), []);
});

test('istruzioniRicerca: scrive in una istruzione sola, e riscrivendo la finestra toglie le righe sparite', async () => {
  const db = apriInMemoria();
  await db.batch(istruzioniRicerca(db, [
    { g: '2026-09-01', t: 'query', k: 'vecchia', c: 1, i: 10, p: 5 },
    { g: '2026-10-05', t: 'query', k: 'sparita', c: 0, i: 4, p: 20 },
    { g: '2026-10-05', t: 'query', k: 'resta', c: 1, i: 9, p: 8 },
  ], '2026-09-01'));
  const seconda = istruzioniRicerca(db, [{ g: '2026-10-05', t: 'query', k: 'resta', c: 3, i: 12, p: 6 }], '2026-09-29');
  assert.equal(seconda.length, 2); // un DELETE della finestra + un INSERT, non una query per riga
  await db.batch(seconda);
  assert.deepEqual(db.tutte('SELECT giorno, chiave, clic FROM ricerca ORDER BY giorno, chiave'), [
    { giorno: '2026-09-01', chiave: 'vecchia', clic: 1 }, // fuori finestra: intatta
    { giorno: '2026-10-05', chiave: 'resta', clic: 3 },
  ]);
});

test('istruzioniRicerca: senza righe resta solo la cancellazione della finestra', () => {
  const db = apriInMemoria();
  assert.equal(istruzioniRicerca(db, [], '2026-10-01').length, 1);
});

test('istruzionePuliziaRicerca: oltre i 26 mesi si cancella', async () => {
  const db = apriInMemoria();
  await db.batch(istruzioniRicerca(db, [
    { g: '2024-01-01', t: 'query', k: 'antica', c: 0, i: 1, p: 1 },
    { g: '2026-10-01', t: 'query', k: 'nuova', c: 0, i: 1, p: 1 },
  ], '2024-01-01'));
  await db.batch([istruzionePuliziaRicerca(db, '2026-10-10')]);
  assert.deepEqual(db.tutte('SELECT chiave FROM ricerca'), [{ chiave: 'nuova' }]);
});
```

- [ ] **Step 4: Eseguire e vedere fallire**

Run: `node --test lib/archivio.test.mjs 2>&1 | tail -15`
Expected: FAIL — `righeRicerca` non esportato (SyntaxError sull'import) e/o tabella `ricerca` assente.

- [ ] **Step 5: Implementare in `lib/archivio.mjs`**

In fondo al file:

```js
/** Le query e le pagine si riscrivono sulla stessa finestra dei giorni di
 *  Google che possono ancora cambiare, più il margine degli zeri. */
export const FINESTRA_RICERCA = RIFAI + MARGINE_ZERI;
/** Righe per istruzione: una sola INSERT per blocco, non una per riga. D1
 *  gratuito concede 50 query per invocazione, e 16 mesi di query sono migliaia. */
const BLOCCO_RICERCA = 2000;

const percorsoDi = (url) => {
  try { return new URL(url).pathname; } catch { return url; }
};

/** Da righe di Search Console con dimensioni [date, query|page] a righe compatte. */
export function righeRicerca(tipo, righe) {
  return righe
    .filter((r) => r.keys?.length === 2)
    .map((r) => ({
      g: r.keys[0],
      t: tipo,
      k: tipo === 'pagina' ? percorsoDi(r.keys[1]) : r.keys[1],
      c: r.clicks ?? 0,
      i: r.impressions ?? 0,
      p: r.position ?? 0,
    }));
}

/**
 * La finestra [daGiorno, …] si riscrive per intero: prima si cancella, poi si
 * inserisce. Così una query che Google non riporta più per un giorno sparisce
 * invece di restare congelata. Le righe passano come UN parametro JSON e
 * json_each le apre dentro D1.
 */
export function istruzioniRicerca(db, righe, daGiorno) {
  const istruzioni = [db.prepare('DELETE FROM ricerca WHERE giorno >= ?').bind(daGiorno)];
  for (let i = 0; i < righe.length; i += BLOCCO_RICERCA) {
    istruzioni.push(db.prepare(`INSERT INTO ricerca (giorno, tipo, chiave, clic, impressioni, posizione)
        SELECT j.value->>'g', j.value->>'t', j.value->>'k', j.value->>'c', j.value->>'i', j.value->>'p'
        FROM json_each(?) AS j WHERE true
        ON CONFLICT(giorno, tipo, chiave) DO UPDATE SET
          clic = excluded.clic, impressioni = excluded.impressioni, posizione = excluded.posizione`)
      .bind(JSON.stringify(righe.slice(i, i + BLOCCO_RICERCA))));
  }
  return istruzioni;
}

/** Stessa promessa di privacy.html per i dati di ricerca: 26 mesi. */
export function istruzionePuliziaRicerca(db, oggi) {
  return db.prepare('DELETE FROM ricerca WHERE giorno < ?').bind(spostato(oggi, -CONSERVAZIONE_GIORNI));
}
```

- [ ] **Step 6: Eseguire e vedere passare**

Run: `node --test lib/archivio.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `fail 0`

- [ ] **Step 7: `rendimento` accetta `daRiga`**

In `lib/searchconsole.mjs`, sostituire il metodo `rendimento`:

```js
    async rendimento({ da, a, dimensioni = [], righe = 100, daRiga = 0 }) {
      const d = await chiedi(`/webmasters/v3/sites/${sito}/searchAnalytics/query`,
        { startDate: da, endDate: a, dimensions: dimensioni, rowLimit: righe, startRow: daRiga });
      return d.rows ?? [];
    },
```

- [ ] **Step 8: Scrivere i test di `lavoroGoogle` esteso (falliranno)**

In `lib/archiviatore.test.mjs`, **sostituire** il test `'lavoroGoogle: una richiesta sola, per data, su 16 mesi'` con questi, e aggiungere `RIGHE_PAGINA_GOOGLE` all'import da `./archiviatore.mjs`:

```js
// Un Search Console finto che risponde per dimensioni.
function googleFinto(perDimensioni) {
  const richieste = [];
  return {
    richieste,
    rendimento: async (o) => { richieste.push(o); return perDimensioni[o.dimensioni.join(',')]?.(o) ?? []; },
  };
}

test('lavoroGoogle: alla prima esecuzione, date più query e pagine su 16 mesi', async () => {
  const db = apriInMemoria();
  const g = googleFinto({
    date: () => [{ keys: ['2026-10-01'], clicks: 1, impressions: 5, position: 8 }],
    'date,query': () => [{ keys: ['2026-10-01', 'forfettario'], clicks: 1, impressions: 5, position: 8 }],
    'date,page': () => [{ keys: ['2026-10-01', 'https://quotify.it/guide'], clicks: 1, impressions: 5, position: 8 }],
  });
  const esito = await lavoroGoogle({ db, g, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.deepEqual(g.richieste.map((r) => r.dimensioni.join(',')), ['date', 'date,query', 'date,page']);
  for (const r of g.richieste) {
    assert.equal(r.da, '2025-06-12');
    assert.equal(r.a, '2026-10-09');
  }
  assert.equal(db.tutte("SELECT impressioni FROM storico WHERE giorno = '2026-10-01'")[0].impressioni, 5);
  assert.deepEqual(db.tutte('SELECT tipo, chiave FROM ricerca ORDER BY tipo'), [
    { tipo: 'pagina', chiave: '/guide' },
    { tipo: 'query', chiave: 'forfettario' },
  ]);
  assert.equal(esito.ricerca, 2);
});

test('lavoroGoogle: con la ricerca già archiviata, query e pagine solo sugli ultimi 11 giorni', async () => {
  const db = apriInMemoria();
  db.tutte("INSERT INTO ricerca VALUES ('2026-09-20', 'query', 'x', 0, 1, 1) RETURNING giorno");
  const g = googleFinto({});
  await lavoroGoogle({ db, g, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.equal(g.richieste[0].da, '2025-06-12'); // le date restano su 16 mesi
  assert.equal(g.richieste[1].da, '2026-09-29');
  assert.equal(g.richieste[2].da, '2026-09-29');
  assert.equal(db.tutte('SELECT count(*) n FROM ricerca')[0].n, 1); // fuori finestra: intatta
});

test('lavoroGoogle: una pagina piena di risposte fa chiedere la successiva', async () => {
  const db = apriInMemoria();
  const piena = Array.from({ length: RIGHE_PAGINA_GOOGLE }, (_, i) =>
    ({ keys: ['2026-10-01', `q${i}`], clicks: 0, impressions: 1, position: 1 }));
  const g = googleFinto({ 'date,query': (o) => (o.daRiga === 0 ? piena : [{ keys: ['2026-10-01', 'ultima'], clicks: 0, impressions: 1, position: 1 }]) });
  await lavoroGoogle({ db, g, oggi: OGGI, presoIl: PRESO, log: zitto });
  const query = g.richieste.filter((r) => r.dimensioni.join(',') === 'date,query');
  assert.deepEqual(query.map((r) => r.daRiga), [0, RIGHE_PAGINA_GOOGLE]);
  assert.equal(db.tutte("SELECT count(*) n FROM ricerca WHERE tipo = 'query'")[0].n, RIGHE_PAGINA_GOOGLE + 1);
});

test('lavoroGoogle: se il dettaglio fallisce, le date restano scritte e si annota «ricerca»', async () => {
  const db = apriInMemoria();
  const g = googleFinto({
    date: () => [{ keys: ['2026-10-01'], clicks: 1, impressions: 5, position: 8 }],
    'date,query': () => { throw new Error('Search Console 500'); },
  });
  await assert.rejects(lavoroGoogle({ db, g, oggi: OGGI, presoIl: PRESO, log: zitto }), /500/);
  assert.equal(db.tutte("SELECT impressioni FROM storico WHERE giorno = '2026-10-01'")[0].impressioni, 5);
  const ieri = db.tutte("SELECT dati FROM storico WHERE giorno = '2026-10-09'")[0];
  assert.equal(JSON.parse(ieri.dati).fonti.ricerca, 'errore');
});

test('lavoroCloudflare: pulisce anche la ricerca oltre i 26 mesi', async () => {
  const db = apriInMemoria();
  db.tutte("INSERT INTO ricerca VALUES ('2024-01-01', 'query', 'antica', 0, 1, 1) RETURNING giorno");
  await lavoroCloudflare({ db, cf: { giorno: async () => FOTO }, oggi: OGGI, presoIl: PRESO, log: zitto });
  assert.equal(db.tutte('SELECT count(*) n FROM ricerca')[0].n, 0);
});
```

- [ ] **Step 9: Eseguire e vedere fallire**

Run: `node --test lib/archiviatore.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: FAIL — `RIGHE_PAGINA_GOOGLE` non esportato.

- [ ] **Step 10: Implementare in `lib/archiviatore.mjs`**

Aggiungere all'import da `./archivio.mjs`: `righeRicerca, istruzioniRicerca, istruzionePuliziaRicerca, FINESTRA_RICERCA`.

Dopo `GIORNI_GOOGLE`:

```js
/** Righe per richiesta a Search Console: il massimo che concede. */
export const RIGHE_PAGINA_GOOGLE = 25000;
/** Pagine per dimensione: 100.000 righe bastano per anni a un sito come questo,
 *  e il tetto tiene le sottorichieste lontane da 50. */
const PAGINE_MASSIME = 4;

async function tutteLeRighe(g, opzioni) {
  const tutte = [];
  for (let pagina = 0; pagina < PAGINE_MASSIME; pagina++) {
    const r = await g.rendimento({ ...opzioni, righe: RIGHE_PAGINA_GOOGLE, daRiga: pagina * RIGHE_PAGINA_GOOGLE });
    tutte.push(...r);
    if (r.length < RIGHE_PAGINA_GOOGLE) break;
  }
  return tutte;
}
```

In `lavoroCloudflare`, subito dopo `istruzioni.push(istruzionePulizia(db, oggi));`:

```js
  istruzioni.push(istruzionePuliziaRicerca(db, oggi));
```

Sostituire `lavoroGoogle` con:

```js
/** Search Console: una richiesta per data su 16 mesi (§4.6), poi query e
 *  pagine per giorno (cruscotto §5.1) — su 16 mesi la prima volta, poi solo
 *  sulla finestra che Google corregge ancora. Se Google non risponde si annota
 *  su ieri e si rilancia: l'esecuzione deve risultare fallita nelle statistiche
 *  del Worker, o nessuno se ne accorge. */
export async function lavoroGoogle({ db, g, oggi, presoIl, log = console.log }) {
  const ieri = giorniIndietro(oggi, 1)[0];
  let righe;
  try {
    righe = await g.rendimento({ da: spostato(oggi, -GIORNI_GOOGLE), a: ieri, dimensioni: ['date'], righe: 25000 });
  } catch (e) {
    await db.batch([istruzioneErrore(db, ieri, 'google', presoIl)]);
    throw e;
  }
  const istruzioni = await istruzioniGoogle(db, righe, oggi, presoIl);
  if (istruzioni.length) await db.batch(istruzioni);

  const archiviata = await db.prepare('SELECT max(giorno) AS g FROM ricerca').first();
  const da = archiviata?.g ? spostato(oggi, -FINESTRA_RICERCA) : spostato(oggi, -GIORNI_GOOGLE);
  let dettaglio;
  try {
    const query = await tutteLeRighe(g, { da, a: ieri, dimensioni: ['date', 'query'] });
    const pagine = await tutteLeRighe(g, { da, a: ieri, dimensioni: ['date', 'page'] });
    dettaglio = [...righeRicerca('query', query), ...righeRicerca('pagina', pagine)];
  } catch (e) {
    await db.batch([istruzioneErrore(db, ieri, 'ricerca', presoIl)]);
    throw e;
  }
  await db.batch(istruzioniRicerca(db, dettaglio, da));

  log(`google: ${righe.length} giorni con dati, ${istruzioni.length} scritti, ${dettaglio.length} righe di dettaglio dal ${da}`);
  return { istruzioni: istruzioni.length, ricerca: dettaglio.length };
}
```

Aggiornare il commento di `MASSIMO_URL` lasciandolo com'è (riguarda l'indicizzazione).

- [ ] **Step 11: Eseguire tutta la suite**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `fail 0` (176 test di prima + 10 nuovi − 1 sostituito = 185).

- [ ] **Step 12: Commit**

```bash
git add worker-archivio/migrazioni/0002_cruscotto.sql lib/d1-in-memoria.mjs lib/searchconsole.mjs lib/archivio.mjs lib/archivio.test.mjs lib/archiviatore.mjs lib/archiviatore.test.mjs
git commit -m "feat(cruscotto): l'archivio tiene query e pagine di Search Console"
```

---

### Compito 2: verifica del JWT di Cloudflare Access

**Files:**
- Create: `lib/accesso.mjs`
- Test: `lib/accesso.test.mjs`

**Interfaces:**
- Produces: `class AccessoNegato extends Error`; `verificatore({ team, aud, email, fetch?, adesso? }) → { verifica(token: string|null) → Promise<{ email }> }` — rifiuta con `AccessoNegato` in ogni caso dubbio.

- [ ] **Step 1: Scrivere i test (falliranno)**

`lib/accesso.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { verificatore, AccessoNegato } from './accesso.mjs';

const TEAM = 'quotify';
const AUD = 'aud-cruscotto';
const EMAIL = 'terracciano41@gmail.com';
const ISS = `https://${TEAM}.cloudflareaccess.com`;
const ADESSO = Date.parse('2026-10-12T08:00:00Z');
const ORA = Math.floor(ADESSO / 1000);

const b64url = (b) => Buffer.from(b).toString('base64url');

async function coppia(kid) {
  const k = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', k.publicKey)), kid, alg: 'RS256', use: 'sig' };
  return { privata: k.privateKey, jwk };
}

async function firma(privata, corpo, { kid = 'k1', alg = 'RS256' } = {}) {
  const testa = b64url(JSON.stringify({ alg, kid, typ: 'JWT' }));
  const dati = b64url(JSON.stringify(corpo));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privata, new TextEncoder().encode(`${testa}.${dati}`));
  return `${testa}.${dati}.${b64url(sig)}`;
}

const corpoValido = (extra = {}) => ({ aud: [AUD], email: EMAIL, iss: ISS, exp: ORA + 600, iat: ORA - 10, ...extra });

async function ambiente() {
  const buona = await coppia('k1');
  const chiamate = [];
  const f = async (url) => { chiamate.push(url); return Response.json({ keys: [buona.jwk] }); };
  let ora = ADESSO;
  const v = verificatore({ team: TEAM, aud: AUD, email: EMAIL, fetch: f, adesso: () => ora });
  return { buona, chiamate, v, avanza: (ms) => { ora += ms; } };
}

test('un token giusto passa e restituisce l\'email', async () => {
  const { buona, v, chiamate } = await ambiente();
  assert.deepEqual(await v.verifica(await firma(buona.privata, corpoValido())), { email: EMAIL });
  assert.deepEqual(chiamate, [`${ISS}/cdn-cgi/access/certs`]);
});

test('l\'email si confronta senza badare a maiuscole e spazi', async () => {
  const { buona, v } = await ambiente();
  await v.verifica(await firma(buona.privata, corpoValido({ email: ' Terracciano41@Gmail.com ' })));
});

for (const [nome, corpo] of [
  ['scaduto', corpoValido({ exp: ORA - 1 })],
  ['senza scadenza', corpoValido({ exp: undefined })],
  ['non ancora valido', corpoValido({ nbf: ORA + 3600 })],
  ['aud di un\'altra applicazione', corpoValido({ aud: ['altra'] })],
  ['emittente di un altro team', corpoValido({ iss: 'https://altro.cloudflareaccess.com' })],
  ['email di un altro', corpoValido({ email: 'qualcuno@example.com' })],
  ['senza email', corpoValido({ email: undefined })],
]) {
  test(`rifiuta un token ${nome}`, async () => {
    const { buona, v } = await ambiente();
    await assert.rejects(v.verifica(await firma(buona.privata, corpo)), AccessoNegato);
  });
}

test('rifiuta un token firmato con un\'altra chiave che dichiara lo stesso kid', async () => {
  const { v } = await ambiente();
  const falsa = await coppia('k1');
  await assert.rejects(v.verifica(await firma(falsa.privata, corpoValido())), AccessoNegato);
});

test('rifiuta alg diverso da RS256, token assente e spazzatura', async () => {
  const { buona, v } = await ambiente();
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido(), { alg: 'none' })), AccessoNegato);
  await assert.rejects(v.verifica(null), AccessoNegato);
  await assert.rejects(v.verifica(''), AccessoNegato);
  await assert.rejects(v.verifica('a.b'), AccessoNegato);
  await assert.rejects(v.verifica('!!!.???.***'), AccessoNegato);
});

test('configurazione incompleta: nessuno passa, nemmeno con un token giusto', async () => {
  const buona = await coppia('k1');
  const f = async () => Response.json({ keys: [buona.jwk] });
  for (const conf of [{ team: '', aud: AUD, email: EMAIL }, { team: TEAM, aud: '', email: EMAIL }, { team: TEAM, aud: AUD, email: '' }]) {
    const v = verificatore({ ...conf, fetch: f, adesso: () => ADESSO });
    await assert.rejects(v.verifica(await firma(buona.privata, corpoValido())), AccessoNegato);
  }
});

test('i certificati si tengono in memoria; un kid sconosciuto li fa richiedere al più una volta al minuto', async () => {
  const { buona, v, chiamate, avanza } = await ambiente();
  await v.verifica(await firma(buona.privata, corpoValido()));
  await v.verifica(await firma(buona.privata, corpoValido()));
  assert.equal(chiamate.length, 1);
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido(), { kid: 'ignoto' })), AccessoNegato);
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido(), { kid: 'ignoto' })), AccessoNegato);
  assert.equal(chiamate.length, 2);
  avanza(61_000);
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido(), { kid: 'ignoto' })), AccessoNegato);
  assert.equal(chiamate.length, 3);
});

test('certificati irraggiungibili: rifiuta, non lascia passare', async () => {
  const buona = await coppia('k1');
  const v = verificatore({ team: TEAM, aud: AUD, email: EMAIL, fetch: async () => new Response('', { status: 502 }), adesso: () => ADESSO });
  await assert.rejects(v.verifica(await firma(buona.privata, corpoValido())), AccessoNegato);
});
```

- [ ] **Step 2: Eseguire e vedere fallire**

Run: `node --test lib/accesso.test.mjs 2>&1 | tail -5`
Expected: FAIL — `Cannot find module './accesso.mjs'`.

- [ ] **Step 3: Implementare `lib/accesso.mjs`**

```js
// Verifica del JWT di Cloudflare Access — docs/cruscotto-piano.md §8.
//
// PERCHÉ ANCHE QUI, SE C'È GIÀ ACCESS
// Access protegge quotify.it/cruscotto. Ma lo stesso progetto Pages risponde
// anche su quotify-website-970.pages.dev, che Access NON copre: senza questa
// verifica, lì i dati sarebbero aperti a chiunque conosca l'indirizzo.
//
// Solo Web Crypto: gira identico in una Pages Function e in Node (i test).
// Ogni dubbio è un rifiuto. Il messaggio d'errore resta qui dentro: a chi
// chiama si risponde 403 e basta.

export class AccessoNegato extends Error {}

const ALGORITMO = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
/** Le chiavi di Access ruotano di rado: un'ora in memoria basta. */
const DURATA_CHIAVI_MS = 3_600_000;
/** Un kid sconosciuto fa richiedere i certificati, ma non più di così:
 *  altrimenti ogni token inventato diventerebbe una richiesta in uscita. */
const PAUSA_RICHIESTA_MS = 60_000;
/** Tolleranza sugli orologi per `nbf`. */
const TOLLERANZA_S = 60;

function decodifica(parte) {
  const b64 = parte.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (parte.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
const json = (parte) => JSON.parse(new TextDecoder().decode(decodifica(parte)));
const normale = (s) => String(s ?? '').trim().toLowerCase();

export function verificatore({ team, aud, email, fetch: f = globalThis.fetch, adesso = () => Date.now() }) {
  if (!team || !aud || !email) {
    return { verifica: async () => { throw new AccessoNegato('configurazione incompleta'); } };
  }
  const emittente = `https://${team}.cloudflareaccess.com`;
  let chiavi = new Map();
  let caricateIl = -Infinity;

  async function carica() {
    caricateIl = adesso();
    const r = await f(`${emittente}/cdn-cgi/access/certs`);
    if (!r.ok) throw new AccessoNegato('certificati non disponibili');
    const { keys } = await r.json();
    const nuove = new Map();
    for (const k of keys ?? []) {
      if (k.kty !== 'RSA' || !k.kid) continue;
      nuove.set(k.kid, await crypto.subtle.importKey('jwk', k, ALGORITMO, false, ['verify']));
    }
    chiavi = nuove;
  }

  async function chiave(kid) {
    const scadute = adesso() - caricateIl > DURATA_CHIAVI_MS;
    const ignota = !chiavi.has(kid) && adesso() - caricateIl > PAUSA_RICHIESTA_MS;
    if (scadute || ignota) await carica();
    const k = chiavi.get(kid);
    if (!k) throw new AccessoNegato('chiave sconosciuta');
    return k;
  }

  return {
    async verifica(token) {
      if (typeof token !== 'string') throw new AccessoNegato('token assente');
      const parti = token.split('.');
      if (parti.length !== 3) throw new AccessoNegato('token malformato');
      let testa, corpo, firma;
      try {
        testa = json(parti[0]);
        corpo = json(parti[1]);
        firma = decodifica(parti[2]);
      } catch {
        throw new AccessoNegato('token illeggibile');
      }
      if (testa?.alg !== 'RS256') throw new AccessoNegato('algoritmo non ammesso');

      const valida = await crypto.subtle.verify(ALGORITMO, await chiave(testa.kid), firma,
        new TextEncoder().encode(`${parti[0]}.${parti[1]}`));
      if (!valida) throw new AccessoNegato('firma non valida');

      const ora = Math.floor(adesso() / 1000);
      if (typeof corpo.exp !== 'number' || corpo.exp <= ora) throw new AccessoNegato('scaduto');
      if (typeof corpo.nbf === 'number' && corpo.nbf > ora + TOLLERANZA_S) throw new AccessoNegato('non ancora valido');
      if (corpo.iss !== emittente) throw new AccessoNegato('emittente sbagliato');
      const destinatari = Array.isArray(corpo.aud) ? corpo.aud : [corpo.aud];
      if (!destinatari.includes(aud)) throw new AccessoNegato('applicazione sbagliata');
      if (!corpo.email || normale(corpo.email) !== normale(email)) throw new AccessoNegato('utente non ammesso');
      return { email: corpo.email };
    },
  };
}
```

- [ ] **Step 4: Eseguire e vedere passare**

Run: `node --test lib/accesso.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 14`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/accesso.mjs lib/accesso.test.mjs
git commit -m "feat(cruscotto): la verifica del token di Cloudflare Access"
```

---

### Compito 3: le letture del cruscotto da D1

**Files:**
- Create: `lib/cruscotto.mjs`
- Modify: `lib/archivio.mjs` (esportare `eIndicizzata`, usata da `contaIndicizzate`)
- Test: `lib/cruscotto.test.mjs`

**Interfaces:**
- Consumes: tabelle `storico`, `visite`, `ricerca` (Compito 1). `storico.dati` ha la forma `{ cloudflare: { pagine|provenienze|paesi: [{ chiave, viste }], vitals }, fonti: { cloudflare|google|ricerca|indicizzazione: 'ok'|'errore' }, indicizzazione: [{ url, stato, verdetto, ultimaScansione }] }`.
- Produces (tutto da `lib/cruscotto.mjs`):
  - `PERIODI = ['7','28','90','365','tutto']`, `PERIODO_PREDEFINITO = '28'`, `MEMORIA_NOVITA = 90`
  - `spostato(data, giorni) → 'YYYY-MM-DD'`, `giorniFra(da, a) → number` (estremi inclusi)
  - `intervallo(periodo, oggi, primo|null) → { periodo, da, a, giorni }` (`a` = ieri)
  - `precedente({ da, giorni }) → { da, a, giorni }`
  - `leggiArchivio(db, { da, a }) → { serie[], provenienze[{host,viste}], pagine[{percorso,viste}], paesi[{paese,viste}], visiteUtm[{giorno,sorgente,mezzo,campagna,contenuto,percorso,paese,n}], query[{chiave,clic,impressioni,posizione}], pagineRicerca[...] }`
  - `leggiNovita(db, { da, a }, primoCloudflare|null) → { provenienze: string[], campagne: [{ campagna, visite }] }`
  - `leggiStato(db) → { primi: { cloudflare, google }, indice, salute: { vitals, giornoVitals, fonti[], ultimoGiornoGoogle } }`
  - `interpretaIndice(fotografie[{ giorno, esiti[] }] dalla più recente) → { ultima, precedente, pagine[{ percorso, stato, indicizzata, dal }], entrate[], uscite[] }`
  - da `lib/archivio.mjs`: `eIndicizzata(stato) → boolean`

- [ ] **Step 1: Scrivere i test (falliranno)**

`lib/cruscotto.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apriInMemoria } from './d1-in-memoria.mjs';
import {
  intervallo, precedente, giorniFra, leggiArchivio, leggiNovita, leggiStato, interpretaIndice,
} from './cruscotto.mjs';

const OGGI = '2026-10-12';

// Una riga di storico come la scrive l'archiviatore.
function giorno(db, g, { visite = null, pagineViste = null, clic = null, impressioni = null, posizione = null, dati = {} } = {}) {
  db.tutte(`INSERT INTO storico (giorno, preso_il, visite, pagine_viste, clic, impressioni, posizione, dati)
    VALUES ('${g}', 'x', ${visite ?? 'NULL'}, ${pagineViste ?? 'NULL'}, ${clic ?? 'NULL'}, ${impressioni ?? 'NULL'}, ${posizione ?? 'NULL'}, '${JSON.stringify(dati).replace(/'/g, "''")}') RETURNING giorno`);
}
const cf = (provenienze = [], pagine = [], paesi = []) => ({ cloudflare: { provenienze, pagine, paesi, vitals: null } });
const visita = (db, g, { sorgente = null, mezzo = null, campagna = null, percorso = '/' } = {}) =>
  db.tutte(`INSERT INTO visite (quando, giorno, percorso, sorgente, mezzo, campagna) VALUES ('x', '${g}', '${percorso}', ${sorgente ? `'${sorgente}'` : 'NULL'}, ${mezzo ? `'${mezzo}'` : 'NULL'}, ${campagna ? `'${campagna}'` : 'NULL'}) RETURNING id`);

test('intervallo: i periodi finiscono ieri e durano quanto dicono', () => {
  assert.deepEqual(intervallo('7', OGGI), { periodo: '7', da: '2026-10-05', a: '2026-10-11', giorni: 7 });
  assert.deepEqual(intervallo('28', OGGI), { periodo: '28', da: '2026-09-14', a: '2026-10-11', giorni: 28 });
  assert.equal(giorniFra('2026-10-05', '2026-10-11'), 7);
});

test('intervallo: un periodo sconosciuto diventa 28 giorni, non un errore', () => {
  assert.equal(intervallo('mille', OGGI).periodo, '28');
  assert.equal(intervallo(null, OGGI).periodo, '28');
});

test('intervallo «tutto» comincia dal primo giorno con dati; senza dati è solo ieri', () => {
  assert.deepEqual(intervallo('tutto', OGGI, '2025-06-12'), { periodo: 'tutto', da: '2025-06-12', a: '2026-10-11', giorni: 487 });
  assert.deepEqual(intervallo('tutto', OGGI, null), { periodo: 'tutto', da: '2026-10-11', a: '2026-10-11', giorni: 1 });
});

test('precedente: stessa durata, subito prima', () => {
  assert.deepEqual(precedente({ da: '2026-10-05', giorni: 7 }), { da: '2026-09-28', a: '2026-10-04', giorni: 7 });
});

test('leggiArchivio: la serie tiene i NULL come NULL e resta nell\'intervallo', async () => {
  const db = apriInMemoria();
  giorno(db, '2026-10-01', { visite: 3, pagineViste: 5 });
  giorno(db, '2026-10-02', { clic: 1, impressioni: 9, posizione: 7 }); // Cloudflare non ha risposto
  giorno(db, '2026-10-20', { visite: 99 });
  const { serie } = await leggiArchivio(db, { da: '2026-10-01', a: '2026-10-11' });
  assert.deepEqual(serie, [
    { giorno: '2026-10-01', visite: 3, pagineViste: 5, clic: null, impressioni: null, posizione: null },
    { giorno: '2026-10-02', visite: null, pagineViste: null, clic: 1, impressioni: 9, posizione: 7 },
  ]);
});

test('leggiArchivio: provenienze, pagine e paesi si sommano sui giorni, in SQL', async () => {
  const db = apriInMemoria();
  giorno(db, '2026-10-01', { visite: 1, dati: cf([{ chiave: 'www.linkedin.com', viste: 2 }, { chiave: '', viste: 5 }], [{ chiave: '/', viste: 7 }], [{ chiave: 'IT', viste: 7 }]) });
  giorno(db, '2026-10-02', { visite: 1, dati: cf([{ chiave: 'www.linkedin.com', viste: 3 }], [{ chiave: '/', viste: 3 }], [{ chiave: 'IT', viste: 3 }]) });
  const a = await leggiArchivio(db, { da: '2026-10-01', a: '2026-10-02' });
  // Pari merito: ordine per host, così il risultato non dipende da D1.
  assert.deepEqual(a.provenienze, [{ host: '', viste: 5 }, { host: 'www.linkedin.com', viste: 5 }]);
  assert.deepEqual(a.pagine, [{ percorso: '/', viste: 10 }]);
  assert.deepEqual(a.paesi, [{ paese: 'IT', viste: 10 }]);
});

test('leggiArchivio: visite attribuite raggruppate e ricerca con posizione pesata sulle impressioni', async () => {
  const db = apriInMemoria();
  visita(db, '2026-10-01', { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio' });
  visita(db, '2026-10-01', { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio' });
  visita(db, '2026-10-02', { sorgente: 'www.google.com' });
  db.tutte("INSERT INTO ricerca VALUES ('2026-10-01', 'query', 'forfettario', 1, 10, 4), ('2026-10-02', 'query', 'forfettario', 0, 30, 8) RETURNING giorno");
  const a = await leggiArchivio(db, { da: '2026-10-01', a: '2026-10-02' });
  assert.deepEqual(a.visiteUtm.map((v) => [v.giorno, v.sorgente, v.campagna, v.n]), [
    ['2026-10-01', 'linkedin', 'lancio', 2],
    ['2026-10-02', 'www.google.com', null, 1],
  ]);
  assert.deepEqual(a.query, [{ chiave: 'forfettario', clic: 1, impressioni: 40, posizione: 7 }]);
});

test('leggiNovita: un host mai visto nei 90 giorni prima è nuovo; uno già visto no', async () => {
  const db = apriInMemoria();
  giorno(db, '2026-07-01', { visite: 1, dati: cf([{ chiave: 'www.linkedin.com', viste: 1 }]) });
  giorno(db, '2026-10-06', { visite: 1, dati: cf([{ chiave: 'www.linkedin.com', viste: 1 }, { chiave: 'reddit.com', viste: 1 }, { chiave: '', viste: 4 }]) });
  visita(db, '2026-08-01', { campagna: 'vecchia' });
  visita(db, '2026-10-06', { campagna: 'vecchia' });
  visita(db, '2026-10-06', { campagna: 'lancio' });
  visita(db, '2026-10-07', { campagna: 'lancio' });
  const n = await leggiNovita(db, { da: '2026-10-05', a: '2026-10-11' }, '2026-07-01');
  assert.deepEqual(n.provenienze, ['reddit.com']);
  assert.deepEqual(n.campagne, [{ campagna: 'lancio', visite: 2 }]);
});

test('leggiNovita: senza 90 giorni di storia Cloudflare, nessuna provenienza è «nuova»', async () => {
  const db = apriInMemoria();
  giorno(db, '2026-10-06', { visite: 1, dati: cf([{ chiave: 'reddit.com', viste: 1 }]) });
  const n = await leggiNovita(db, { da: '2026-10-05', a: '2026-10-11' }, '2026-09-13');
  assert.deepEqual(n.provenienze, []);
});

test('interpretaIndice: entrate, uscite e da quando una pagina è nel suo stato', () => {
  const foto = (giorno, stati) => ({ giorno, esiti: Object.entries(stati).map(([p, stato]) => ({ url: `https://quotify.it${p}`, stato })) });
  const r = interpretaIndice([
    foto('2026-10-12', { '/': 'Inviata e indicizzata', '/assistenza': 'Inviata e indicizzata', '/privacy': 'Rilevata, ma attualmente non indicizzata', '/guide': 'errore: Search Console 500' }),
    foto('2026-10-05', { '/': 'Inviata e indicizzata', '/assistenza': "L'URL è sconosciuto a Google", '/privacy': 'Inviata e indicizzata', '/guide': 'Inviata e indicizzata' }),
    foto('2026-09-28', { '/': 'Inviata e indicizzata' }),
  ]);
  assert.equal(r.ultima, '2026-10-12');
  assert.equal(r.precedente, '2026-10-05');
  assert.deepEqual(r.entrate, ['/assistenza']);
  assert.deepEqual(r.uscite, ['/privacy']); // /guide è un errore di controllo, non un'uscita
  assert.deepEqual(r.pagine.find((p) => p.percorso === '/'), { percorso: '/', stato: 'Inviata e indicizzata', indicizzata: true, dal: '2026-09-28' });
  assert.equal(r.pagine.find((p) => p.percorso === '/assistenza').dal, '2026-10-12');
});

test('interpretaIndice: nessuna fotografia, niente da dire', () => {
  assert.deepEqual(interpretaIndice([]), { ultima: null, precedente: null, pagine: [], entrate: [], uscite: [] });
});

test('leggiStato: primi giorni, vitals più recenti, fonti, ultimo giorno di Google', async () => {
  const db = apriInMemoria();
  giorno(db, '2025-06-12', { impressioni: 1, clic: 0, posizione: 9 });
  giorno(db, '2026-09-13', { visite: 1, pagineViste: 1, dati: { cloudflare: { vitals: { lcp: 900 } }, fonti: { cloudflare: 'ok' } } });
  giorno(db, '2026-10-11', { visite: 2, pagineViste: 2, dati: { cloudflare: { vitals: { lcp: 800 } }, fonti: { cloudflare: 'ok', google: 'errore' } } });
  const s = await leggiStato(db);
  assert.deepEqual(s.primi, { cloudflare: '2026-09-13', google: '2025-06-12' });
  assert.deepEqual(s.salute.vitals, { lcp: 800 });
  assert.equal(s.salute.giornoVitals, '2026-10-11');
  assert.equal(s.salute.ultimoGiornoGoogle, '2025-06-12');
  assert.deepEqual(s.salute.fonti[0], { giorno: '2026-10-11', cloudflare: 'ok', google: 'errore' });
});

test('leggiStato su un archivio vuoto: tutto null o vuoto, niente eccezioni', async () => {
  const s = await leggiStato(apriInMemoria());
  assert.deepEqual(s.primi, { cloudflare: null, google: null });
  assert.equal(s.indice.ultima, null);
  assert.equal(s.salute.vitals, null);
  assert.deepEqual(s.salute.fonti, []);
});
```

- [ ] **Step 2: Eseguire e vedere fallire**

Run: `node --test lib/cruscotto.test.mjs 2>&1 | tail -5`
Expected: FAIL — `Cannot find module './cruscotto.mjs'`.

- [ ] **Step 3: Esportare `eIndicizzata` da `lib/archivio.mjs`**

Sostituire `contaIndicizzate` con:

```js
/** Stessa regola di scripts/analytics/indicizzazione.mjs: «indicizzata» sì,
 *  «non indicizzata» no. Un errore di controllo non è un'indicizzazione. */
export function eIndicizzata(stato) {
  return /indicizzata/i.test(stato) && !/non indicizzata/i.test(stato);
}

export function contaIndicizzate(esiti) {
  return esiti.filter((e) => eIndicizzata(e.stato)).length;
}
```

- [ ] **Step 4: Implementare `lib/cruscotto.mjs`**

```js
// Le letture del cruscotto — docs/cruscotto-piano.md §5.
//
// Tutto quello che si somma su molti giorni si somma DENTRO D1 (json_each su
// storico.dati): il tempo di D1 non conta nei 10 ms di CPU della Function,
// il JSON.parse di un anno di righe sì (§3.2).
//
// NULL resta NULL. Un giorno in cui Cloudflare non ha risposto non è un
// giorno senza visite, e la pagina lo disegna come un buco.

import { eIndicizzata } from './archivio.mjs';

const GIORNO_MS = 86400000;

export const PERIODI = ['7', '28', '90', '365', 'tutto'];
export const PERIODO_PREDEFINITO = '28';
/** Quanto indietro si guarda per dire che una provenienza o una campagna è «nuova». */
export const MEMORIA_NOVITA = 90;

export const spostato = (data, giorni) =>
  new Date(Date.parse(`${data}T00:00:00Z`) + giorni * GIORNO_MS).toISOString().slice(0, 10);

/** Giorni fra due date, estremi inclusi. */
export function giorniFra(da, a) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / GIORNO_MS) + 1;
}

/** Il periodo finisce sempre ieri: oggi non è finito, e l'archivio non ce l'ha. */
export function intervallo(periodo, oggi, primo = null) {
  const p = PERIODI.includes(periodo) ? periodo : PERIODO_PREDEFINITO;
  const a = spostato(oggi, -1);
  if (p === 'tutto') {
    const da = primo && primo <= a ? primo : a;
    return { periodo: p, da, a, giorni: giorniFra(da, a) };
  }
  const giorni = Number(p);
  return { periodo: p, da: spostato(oggi, -giorni), a, giorni };
}

export function precedente({ da, giorni }) {
  return { da: spostato(da, -giorni), a: spostato(da, -1), giorni };
}

const tutte = (db, sql, ...valori) => db.prepare(sql).bind(...valori).all().then((r) => r.results);
const una = (db, sql, ...valori) => db.prepare(sql).bind(...valori).first();

/** Un elenco di storico.dati.cloudflare sommato sui giorni. Pari merito in
 *  ordine di chiave, così il risultato non dipende dall'ordine di D1. */
const SQL_ELENCO = (campo, nome) => `
  SELECT j.value->>'chiave' AS ${nome}, sum(j.value->>'viste') AS viste
  FROM storico, json_each(storico.dati, '$.cloudflare.${campo}') AS j
  WHERE storico.giorno BETWEEN ? AND ?
  GROUP BY 1 ORDER BY viste DESC, 1 LIMIT ?`;

/** La posizione media di più giorni è pesata sulle impressioni: un giorno con
 *  una impressione in posizione 50 non deve valere quanto uno con cento. */
const SQL_RICERCA = `
  SELECT chiave, sum(clic) AS clic, sum(impressioni) AS impressioni,
    round(sum(posizione * impressioni) / max(sum(impressioni), 1), 1) AS posizione
  FROM ricerca WHERE tipo = ? AND giorno BETWEEN ? AND ?
  GROUP BY chiave ORDER BY clic DESC, impressioni DESC, chiave LIMIT 100`;

export async function leggiArchivio(db, { da, a }) {
  const [serie, provenienze, pagine, paesi, visiteUtm, query, pagineRicerca] = await Promise.all([
    tutte(db, `SELECT giorno, visite, pagine_viste AS pagineViste, clic, impressioni, posizione
      FROM storico WHERE giorno BETWEEN ? AND ? ORDER BY giorno`, da, a),
    tutte(db, SQL_ELENCO('provenienze', 'host'), da, a, 200),
    tutte(db, SQL_ELENCO('pagine', 'percorso'), da, a, 50),
    tutte(db, SQL_ELENCO('paesi', 'paese'), da, a, 20),
    // Grezze ma raggruppate: il client filtra per canale e campagna senza
    // tornare al server. Il tetto protegge da un'inondazione di UTM.
    tutte(db, `SELECT giorno, sorgente, mezzo, campagna, contenuto, percorso, paese, count(*) AS n
      FROM visite WHERE giorno BETWEEN ? AND ?
      GROUP BY 1, 2, 3, 4, 5, 6, 7 ORDER BY giorno, n DESC LIMIT 5000`, da, a),
    tutte(db, SQL_RICERCA, 'query', da, a),
    tutte(db, SQL_RICERCA, 'pagina', da, a),
  ]);
  return { serie, provenienze, pagine, paesi, visiteUtm, query, pagineRicerca };
}

/**
 * Provenienze e campagne comparse nel periodo e assenti nei 90 giorni prima.
 * Le provenienze hanno bisogno di 90 giorni di storia Cloudflare per dirlo:
 * prima, tutto sembrerebbe nuovo. Le campagne no — una campagna è nuova per
 * definizione la prima volta che porta qualcuno.
 */
export async function leggiNovita(db, { da, a }, primoCloudflare) {
  const inizio = spostato(da, -MEMORIA_NOVITA);
  const fine = spostato(da, -1);
  const storiaBasta = Boolean(primoCloudflare) && primoCloudflare <= inizio;
  const [provenienze, campagne] = await Promise.all([
    storiaBasta ? tutte(db, `
      SELECT DISTINCT j.value->>'chiave' AS host
      FROM storico, json_each(storico.dati, '$.cloudflare.provenienze') AS j
      WHERE storico.giorno BETWEEN ? AND ? AND j.value->>'chiave' != ''
        AND j.value->>'chiave' NOT IN (
          SELECT k.value->>'chiave' FROM storico AS s, json_each(s.dati, '$.cloudflare.provenienze') AS k
          WHERE s.giorno BETWEEN ? AND ?)
      ORDER BY host`, da, a, inizio, fine) : [],
    tutte(db, `
      SELECT campagna, count(*) AS visite FROM visite
      WHERE giorno BETWEEN ? AND ? AND campagna IS NOT NULL
        AND campagna NOT IN (SELECT campagna FROM visite WHERE giorno BETWEEN ? AND ? AND campagna IS NOT NULL)
      GROUP BY campagna ORDER BY visite DESC, campagna`, da, a, inizio, fine),
  ]);
  return { provenienze: provenienze.map((r) => r.host), campagne };
}

const percorsoDi = (url) => {
  try { return new URL(url).pathname; } catch { return url; }
};
const errore = (stato) => /^errore/i.test(stato ?? '');

/** Le fotografie del lunedì, dalla più recente. Un controllo fallito non è
 *  un'uscita dall'indice: è un controllo fallito. */
export function interpretaIndice(fotografie) {
  if (!fotografie.length) return { ultima: null, precedente: null, pagine: [], entrate: [], uscite: [] };
  const mappe = fotografie.map((f) => new Map(f.esiti.map((e) => [percorsoDi(e.url), e])));
  const [ora, prima] = mappe;

  const pagine = [...ora.entries()].map(([percorso, e]) => {
    const si = eIndicizzata(e.stato);
    let dal = fotografie[0].giorno;
    for (let i = 1; i < mappe.length; i++) {
      const x = mappe[i].get(percorso);
      if (!x || errore(x.stato) || eIndicizzata(x.stato) !== si) break;
      dal = fotografie[i].giorno;
    }
    return { percorso, stato: e.stato, indicizzata: si, dal };
  }).sort((x, y) => x.percorso.localeCompare(y.percorso));

  const cambiate = (da, verso) => (prima ? [...ora.entries()]
    .filter(([p, e]) => {
      const x = prima.get(p);
      return x && !errore(x.stato) && !errore(e.stato) && eIndicizzata(x.stato) === da && eIndicizzata(e.stato) === verso;
    })
    .map(([p]) => p).sort() : []);

  return {
    ultima: fotografie[0].giorno,
    precedente: fotografie[1]?.giorno ?? null,
    pagine,
    entrate: cambiate(false, true),
    uscite: cambiate(true, false),
  };
}

const leggiJson = (t) => (t ? JSON.parse(t) : null);

export async function leggiStato(db) {
  const [primi, fotografie, ultimoCf, fonti, ultimoGoogle] = await Promise.all([
    una(db, `SELECT min(CASE WHEN pagine_viste IS NOT NULL THEN giorno END) AS cloudflare,
                    min(CASE WHEN impressioni IS NOT NULL THEN giorno END) AS google FROM storico`),
    tutte(db, `SELECT giorno, dati->'$.indicizzazione' AS esiti FROM storico
      WHERE indicizzate IS NOT NULL ORDER BY giorno DESC LIMIT 12`),
    una(db, `SELECT giorno, dati->'$.cloudflare.vitals' AS vitals FROM storico
      WHERE pagine_viste IS NOT NULL ORDER BY giorno DESC LIMIT 1`),
    tutte(db, `SELECT giorno, dati->'$.fonti' AS fonti FROM storico ORDER BY giorno DESC LIMIT 3`),
    una(db, 'SELECT max(giorno) AS giorno FROM storico WHERE impressioni IS NOT NULL'),
  ]);
  return {
    primi: { cloudflare: primi?.cloudflare ?? null, google: primi?.google ?? null },
    indice: interpretaIndice(fotografie.map((r) => ({ giorno: r.giorno, esiti: leggiJson(r.esiti) ?? [] }))),
    salute: {
      vitals: leggiJson(ultimoCf?.vitals),
      giornoVitals: ultimoCf?.giorno ?? null,
      fonti: fonti.map((r) => ({ giorno: r.giorno, ...(leggiJson(r.fonti) ?? {}) })),
      ultimoGiornoGoogle: ultimoGoogle?.giorno ?? null,
    },
  };
}
```

- [ ] **Step 5: Eseguire e vedere passare**

Run: `node --test lib/cruscotto.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: `fail 0`. (La posizione pesata della query è (4·10 + 8·30) / 40 = 7.)

- [ ] **Step 6: Suite intera e commit**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"` — Expected: `fail 0`.

```bash
git add lib/cruscotto.mjs lib/cruscotto.test.mjs lib/archivio.mjs
git commit -m "feat(cruscotto): le letture da D1, con le somme fatte in SQL"
```

---

### Compito 4: le frasi su cosa è cambiato

**Files:**
- Create: `lib/osservazioni.mjs`
- Test: `lib/osservazioni.test.mjs`

**Interfaces:**
- Produces:
  - `SOGLIE = { visite: 20, pagineViste: 20, iscritti: 3, clic: 10, impressioni: 20, scartoMinimo: 0.25, salitaPosizioni: 5 }`, `MASSIMO_FRASI = 5`
  - `numero(n) → string` (migliaia col punto, `—` per `null`)
  - `variazione(attuale, precedente, soglia) → null | { rapporto: number, testo: '+40%' | '−12%' | '0%' }` — `null` se uno dei due manca, è sotto soglia o il precedente è 0.
  - `vistaLink(scheda, filtri = {}) → '#marketing?canale=Social'`
  - `frasi(ingresso) → [{ testo, peso, link }]` (al massimo 5, almeno 1), dove
    `ingresso = { giorni, attuale: Misure, precedente: Misure|null, novita: { provenienze: string[], campagne: [{ campagna, visite }] }, indice: { entrate: string[], uscite: string[] } }` e
    `Misure = { visite, iscritti, clic, canali: [{ famiglia, pagineViste }], query: [{ chiave, impressioni, posizione }], pagine: [{ chiave, impressioni, posizione }] }` (`iscritti` può essere `null`).

- [ ] **Step 1: Scrivere i test (falliranno)**

`lib/osservazioni.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SOGLIE, MASSIMO_FRASI, numero, variazione, vistaLink, frasi } from './osservazioni.mjs';

const misure = (m = {}) => ({ visite: 0, iscritti: null, clic: 0, canali: [], query: [], pagine: [], ...m });
const ingresso = (m = {}) => ({
  giorni: 7, attuale: misure(), precedente: misure(),
  novita: { provenienze: [], campagne: [] }, indice: { entrate: [], uscite: [] }, ...m,
});
const testi = (i) => frasi(i).map((f) => f.testo);

test('numero: migliaia col punto, null come trattino', () => {
  assert.equal(numero(12345), '12.345');
  assert.equal(numero(7), '7');
  assert.equal(numero(null), '—');
  assert.equal(numero(2.5), '2,5');
});

test('variazione: niente sotto soglia, niente su un precedente a zero o mancante', () => {
  assert.equal(variazione(3, 1, SOGLIE.visite), null);
  assert.equal(variazione(60, 19, SOGLIE.visite), null);
  assert.equal(variazione(40, 0, 0), null);
  assert.equal(variazione(null, 30, SOGLIE.visite), null);
  assert.deepEqual(variazione(40, 20, SOGLIE.visite), { rapporto: 1, testo: '+100%' });
  assert.deepEqual(variazione(15, 20, 10), { rapporto: -0.25, testo: '−25%' });
  assert.deepEqual(variazione(20, 20, 10), { rapporto: 0, testo: '0%' });
});

test('vistaLink: scheda più filtri, codificati', () => {
  assert.equal(vistaLink('oggi'), '#oggi');
  assert.equal(vistaLink('marketing', { canale: 'Ricerca Google' }), '#marketing?canale=Ricerca+Google');
});

test('numeri piccoli: da 1 a 3 visite non è una notizia', () => {
  assert.deepEqual(testi(ingresso({ attuale: misure({ visite: 3 }), precedente: misure({ visite: 1 }) })), ['Settimana senza scossoni']);
});

test('una variazione vera si racconta, con i numeri', () => {
  const t = testi(ingresso({ attuale: misure({ visite: 40 }), precedente: misure({ visite: 20 }) }));
  assert.deepEqual(t, ['Le visite sono passate da 20 a 40 (+100%)']);
});

test('uno scarto sotto il 25% non è una notizia', () => {
  assert.deepEqual(testi(ingresso({ attuale: misure({ visite: 24 }), precedente: misure({ visite: 20 }) })), ['Settimana senza scossoni']);
});

test('iscritti a null (app in attesa): nessuna frase sugli iscritti, nessun errore', () => {
  assert.deepEqual(testi(ingresso({ attuale: misure({ iscritti: null }), precedente: misure({ iscritti: null }) })), ['Settimana senza scossoni']);
});

test('canali: la frase porta al canale filtrato', () => {
  const [f] = frasi(ingresso({
    attuale: misure({ canali: [{ famiglia: 'Social', pagineViste: 50 }] }),
    precedente: misure({ canali: [{ famiglia: 'Social', pagineViste: 25 }] }),
  }));
  assert.equal(f.testo, 'Le pagine viste da Social sono passate da 25 a 50 (+100%)');
  assert.equal(f.link, '#marketing?canale=Social');
});

test('novità: campagne nuove e al massimo due provenienze nuove', () => {
  const t = testi(ingresso({ novita: {
    provenienze: ['a.com', 'b.com', 'c.com'],
    campagne: [{ campagna: 'lancio', visite: 6 }, { campagna: 'prova', visite: 1 }],
  } }));
  assert.ok(t.includes('La campagna «lancio» ha portato le prime 6 visite'));
  assert.ok(t.includes('La campagna «prova» ha portato la prima visita'));
  assert.equal(t.filter((x) => x.startsWith('Prima visita da')).length, 2);
});

test('ricerca: nuova query fra le prime 10 e pagine che salgono o scendono di almeno 5 posizioni', () => {
  const t = testi(ingresso({
    attuale: misure({
      query: [{ chiave: 'forfettario 2027', impressioni: 30, posizione: 9 }],
      pagine: [{ chiave: '/guide/f24-e-dashboard', impressioni: 40, posizione: 9 }, { chiave: '/guide', impressioni: 40, posizione: 20 }],
    }),
    precedente: misure({
      query: [],
      pagine: [{ chiave: '/guide/f24-e-dashboard', impressioni: 25, posizione: 18 }, { chiave: '/guide', impressioni: 40, posizione: 12 }],
    }),
  }));
  assert.ok(t.includes('Nuova ricerca fra le prime 10: «forfettario 2027»'));
  assert.ok(t.includes('/guide/f24-e-dashboard è salita dalla posizione 18 alla 9 su Google'));
  assert.ok(t.includes('/guide è scesa dalla posizione 12 alla 20 su Google'));
});

test('ricerca: senza un periodo precedente non c\'è niente di «nuovo»', () => {
  const t = testi(ingresso({ precedente: null, attuale: misure({ query: [{ chiave: 'x', impressioni: 99, posizione: 3 }] }) }));
  assert.deepEqual(t, ['Settimana senza scossoni']);
});

test('indice: un\'uscita pesa più di un\'entrata, e al massimo cinque frasi', () => {
  const f = frasi(ingresso({
    indice: { entrate: ['/assistenza'], uscite: ['/privacy'] },
    novita: { provenienze: ['a.com', 'b.com'], campagne: [{ campagna: 'x', visite: 2 }, { campagna: 'y', visite: 2 }] },
  }));
  assert.equal(f.length, MASSIMO_FRASI);
  assert.equal(f[0].testo, '/privacy è uscita dall\'indice di Google');
  const entrata = f.findIndex((x) => x.testo === '/assistenza è entrata nell\'indice di Google');
  assert.ok(entrata > 0);
});

test('quiete: la parola dipende dalla durata del periodo', () => {
  assert.deepEqual(testi(ingresso({ giorni: 28 })), ['Periodo senza scossoni']);
});
```

- [ ] **Step 2: Eseguire e vedere fallire**

Run: `node --test lib/osservazioni.test.mjs 2>&1 | tail -5`
Expected: FAIL — `Cannot find module './osservazioni.mjs'`.

- [ ] **Step 3: Implementare `lib/osservazioni.mjs`**

```js
// Dai numeri alle frasi — docs/cruscotto-piano.md §6.1.
//
// IL PROBLEMA DEI NUMERI PICCOLI. Con tre visite al giorno, «+200%» vuol dire
// da 1 a 3, e non vuol dire niente. Una frase esce solo se ENTRAMBI i periodi
// superano una soglia di volume E lo scarto è vero. Le soglie stanno qui, in
// un posto solo: quando il sito cresce, si alzano qui.
//
// Lo usano la Function (/api/cruscotto) e il Worker (riassunto del lunedì):
// funzioni pure, nessuna dipendenza.

export const SOGLIE = {
  visite: 20,
  pagineViste: 20,
  iscritti: 3,
  clic: 10,
  impressioni: 20,
  scartoMinimo: 0.25,
  salitaPosizioni: 5,
};
export const MASSIMO_FRASI = 5;
const MASSIMO_PROVENIENZE = 2;
const MASSIMO_QUERY = 2;

/** Migliaia col punto, decimali con la virgola. Scritto a mano: toLocaleString
 *  non è uguale in tutti i runtime (vedi main.js, `eur`). */
export function numero(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const [intera, decimali] = String(Math.round(n * 10) / 10).split('.');
  const segno = intera.startsWith('-') ? '−' : '';
  const cifre = intera.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return segno + cifre + (decimali ? `,${decimali}` : '');
}

/** La variazione da mostrare accanto a una cifra: null se non significa niente. */
export function variazione(attuale, precedente, soglia) {
  if (attuale == null || precedente == null) return null;
  if (precedente === 0 || attuale < soglia || precedente < soglia) return null;
  const rapporto = (attuale - precedente) / precedente;
  const p = Math.round(Math.abs(rapporto) * 100);
  const testo = p === 0 ? '0%' : `${rapporto > 0 ? '+' : '−'}${p}%`;
  return { rapporto, testo };
}

export function vistaLink(scheda, filtri = {}) {
  const q = new URLSearchParams(Object.entries(filtri).filter(([, v]) => v != null && v !== '')).toString();
  return `#${scheda}${q ? `?${q}` : ''}`;
}

const notizia = (attuale, precedente, soglia) => {
  const v = variazione(attuale, precedente, soglia);
  return v && Math.abs(v.rapporto) >= SOGLIE.scartoMinimo ? v : null;
};
const da = (precedente, attuale, v) => `da ${numero(precedente)} a ${numero(attuale)} (${v.testo})`;
const perChiave = (righe) => new Map((righe ?? []).map((r) => [r.chiave, r]));

export function frasi({ giorni, attuale, precedente, novita, indice }) {
  const f = [];
  const aggiungi = (testo, peso, link) => f.push({ testo, peso, link });

  if (precedente) {
    for (const [campo, nome, soglia] of [
      ['visite', 'Le visite', SOGLIE.visite],
      ['iscritti', 'Gli iscritti', SOGLIE.iscritti],
      ['clic', 'I clic da Google', SOGLIE.clic],
    ]) {
      const v = notizia(attuale[campo], precedente[campo], soglia);
      if (v) {
        const verbo = campo === 'visite' ? 'sono passate' : 'sono passati';
        aggiungi(`${nome} ${verbo} ${da(precedente[campo], attuale[campo], v)}`,
          60 + Math.min(40, Math.abs(v.rapporto) * 20), vistaLink(campo === 'clic' ? 'marketing' : 'oggi'));
      }
    }

    const prima = new Map((precedente.canali ?? []).map((c) => [c.famiglia, c.pagineViste]));
    for (const c of attuale.canali ?? []) {
      const v = notizia(c.pagineViste, prima.get(c.famiglia), SOGLIE.pagineViste);
      if (v) aggiungi(`Le pagine viste da ${c.famiglia} sono passate ${da(prima.get(c.famiglia), c.pagineViste, v)}`,
        50 + Math.min(30, Math.abs(v.rapporto) * 15), vistaLink('marketing', { canale: c.famiglia }));
    }

    const primeDieci = (righe) => [...(righe ?? [])].sort((a, b) => b.impressioni - a.impressioni).slice(0, 10);
    const vecchie = new Set(primeDieci(precedente.query).map((q) => q.chiave));
    primeDieci(attuale.query)
      .filter((q) => q.impressioni >= SOGLIE.impressioni && !vecchie.has(q.chiave))
      .slice(0, MASSIMO_QUERY)
      .forEach((q) => aggiungi(`Nuova ricerca fra le prime 10: «${q.chiave}»`, 45, vistaLink('marketing')));

    const pagineprima = perChiave(precedente.pagine);
    for (const p of attuale.pagine ?? []) {
      const x = pagineprima.get(p.chiave);
      if (!x || p.impressioni < SOGLIE.impressioni || x.impressioni < SOGLIE.impressioni) continue;
      const salto = Math.round(x.posizione) - Math.round(p.posizione);
      if (salto >= SOGLIE.salitaPosizioni) {
        aggiungi(`${p.chiave} è salita dalla posizione ${Math.round(x.posizione)} alla ${Math.round(p.posizione)} su Google`, 50, vistaLink('marketing'));
      } else if (salto <= -SOGLIE.salitaPosizioni) {
        aggiungi(`${p.chiave} è scesa dalla posizione ${Math.round(x.posizione)} alla ${Math.round(p.posizione)} su Google`, 48, vistaLink('marketing'));
      }
    }
  }

  for (const c of novita?.campagne ?? []) {
    const quante = c.visite === 1 ? 'la prima visita' : `le prime ${numero(c.visite)} visite`;
    aggiungi(`La campagna «${c.campagna}» ha portato ${quante}`, 65, vistaLink('marketing', { campagna: c.campagna }));
  }
  for (const h of (novita?.provenienze ?? []).slice(0, MASSIMO_PROVENIENZE)) {
    aggiungi(`Prima visita da ${h}`, 40, vistaLink('marketing'));
  }
  for (const p of indice?.uscite ?? []) aggiungi(`${p} è uscita dall'indice di Google`, 70, vistaLink('marketing'));
  for (const p of indice?.entrate ?? []) aggiungi(`${p} è entrata nell'indice di Google`, 55, vistaLink('marketing'));

  if (!f.length) {
    return [{ testo: giorni === 7 ? 'Settimana senza scossoni' : 'Periodo senza scossoni', peso: 0, link: vistaLink('oggi') }];
  }
  // sort è stabile: a pari peso resta l'ordine in cui le regole le hanno scritte.
  return f.sort((a, b) => b.peso - a.peso).slice(0, MASSIMO_FRASI);
}
```

- [ ] **Step 4: Eseguire e vedere passare**

Run: `node --test lib/osservazioni.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: `pass 13`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/osservazioni.mjs lib/osservazioni.test.mjs
git commit -m "feat(cruscotto): le frasi su cosa è cambiato, con le soglie dei numeri piccoli"
```

---

### Compito 5: il riassunto dell'app e la composizione della risposta

**Files:**
- Create: `lib/riassunto.mjs`, `lib/composizione.mjs`
- Test: `lib/riassunto.test.mjs`, `lib/composizione.test.mjs`

**Interfaces:**
- Consumes: `famiglia(host)` da `lib/attribuzione.mjs`; `spostato` da `lib/cruscotto.mjs`; `frasi` da `lib/osservazioni.mjs`; la forma di `leggiArchivio`/`leggiStato`/`leggiNovita` (Compito 3); il contratto del riassunto (Compito 0).
- Produces:
  - `lib/riassunto.mjs`: `URL_RIASSUNTO`, `VERSIONE_RIASSUNTO = 1`, `CANALE_SCONOSCIUTO = 'Provenienza sconosciuta'`, `leggiRiassunto({ chiave, da, a, fetch?, attesaMs? }) → { stato: 'ok'|'errore'|'in-attesa', dati|null }`, `canaleIscritto({ sorgente, rif }) → string`.
  - `lib/composizione.mjs`: `totali(archivio, app|null)`, `serie({ da, a }, archivio, app|null)`, `canali(archivio, app|null)`, `campagne(archivio, app|null)`, `imbuto(archivio, app|null, visite)`, `occasioni(pagineRicerca)`, `componi({ intervallo, precedente, archivio, archivioPrecedente, novita, stato, oggi, app, appPrecedente, fonti, generato }) → risposta` (forma di spec §5.2, più `seriePrecedente`, `visiteUtm`, `pagine`, `paesi`, `primi`).

- [ ] **Step 1: Scrivere i test del riassunto (falliranno)**

`lib/riassunto.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { leggiRiassunto, canaleIscritto, URL_RIASSUNTO, CANALE_SCONOSCIUTO } from './riassunto.mjs';

const BUONO = { versione: 1, generato: 'x', giorni: [], coorte: [], totali: {}, eventi: [], medianaGiorniAlPagamento: null };
const risponde = (corpo, stato = 200) => {
  const chiamate = [];
  const f = async (url, o) => { chiamate.push({ url, o }); return new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status: stato }); };
  return { f, chiamate };
};

test('senza chiave l\'app è «in attesa» e non si chiama nessuno', async () => {
  const { f, chiamate } = risponde(BUONO);
  assert.deepEqual(await leggiRiassunto({ chiave: '', da: '2026-10-01', a: '2026-10-07', fetch: f }), { stato: 'in-attesa', dati: null });
  assert.equal(chiamate.length, 0);
});

test('una risposta buona passa, con la chiave nell\'intestazione e il periodo nell\'indirizzo', async () => {
  const { f, chiamate } = risponde(BUONO);
  const r = await leggiRiassunto({ chiave: 'k', da: '2026-10-01', a: '2026-10-07', fetch: f });
  assert.equal(r.stato, 'ok');
  assert.deepEqual(r.dati, BUONO);
  assert.equal(chiamate[0].url, `${URL_RIASSUNTO}?da=2026-10-01&a=2026-10-07`);
  assert.equal(chiamate[0].o.headers.Authorization, 'Bearer k');
});

for (const [nome, corpo, stato, atteso] of [
  ['404: l\'endpoint non esiste ancora', 'non trovato', 404, 'in-attesa'],
  ['500', 'guasto', 500, 'errore'],
  ['401: chiave sbagliata', 'no', 401, 'errore'],
  ['JSON rotto', '{', 200, 'errore'],
  ['versione sconosciuta', { ...BUONO, versione: 2 }, 200, 'errore'],
]) {
  test(`riassunto con ${nome} → ${atteso}`, async () => {
    const { f } = risponde(corpo, stato);
    assert.deepEqual(await leggiRiassunto({ chiave: 'k', da: '2026-10-01', a: '2026-10-07', fetch: f }), { stato: atteso, dati: null });
  });
}

test('rete giù o tempo scaduto → errore, mai un\'eccezione', async () => {
  const f = async () => { throw new Error('timeout'); };
  assert.deepEqual(await leggiRiassunto({ chiave: 'k', da: '2026-10-01', a: '2026-10-07', fetch: f }), { stato: 'errore', dati: null });
});

test('canaleIscritto: gli UTM del visitatore vincono, quelli interni lasciano parlare il referrer', () => {
  assert.equal(canaleIscritto({ sorgente: 'linkedin', rif: null }), 'Social');
  assert.equal(canaleIscritto({ sorgente: 'linkedin', rif: 'www.google.com' }), 'Social');
  assert.equal(canaleIscritto({ sorgente: 'sito', rif: 'www.google.com' }), 'Ricerca Google');
  assert.equal(canaleIscritto({ sorgente: 'sito', rif: null }), 'Diretto o interno');
  assert.equal(canaleIscritto({ sorgente: null, rif: 'chatgpt.com' }), 'Assistenti AI');
  assert.equal(canaleIscritto({ sorgente: null, rif: null }), CANALE_SCONOSCIUTO);
});
```

- [ ] **Step 2: Eseguire e vedere fallire**

Run: `node --test lib/riassunto.test.mjs 2>&1 | tail -3`
Expected: FAIL — `Cannot find module './riassunto.mjs'`.

- [ ] **Step 3: Implementare `lib/riassunto.mjs`**

```js
// Il riassunto dell'app — docs/cruscotto-piano.md §7.2.
//
// L'app dà al sito solo numeri aggregati: niente email, niente id veri. Qui
// si legge, e ogni guasto diventa uno STATO, mai un'eccezione: il cruscotto
// deve funzionare anche quando l'app non risponde, e dirlo.
//
//   in-attesa  la chiave non c'è ancora, o l'app non ha ancora l'endpoint (404)
//   errore     l'app c'è ma la risposta non è usabile
//   ok         dati validi, versione conosciuta

import { famiglia } from './attribuzione.mjs';

export const URL_RIASSUNTO = 'https://app.quotify.it/api/interno/riassunto';
export const VERSIONE_RIASSUNTO = 1;
export const CANALE_SCONOSCIUTO = 'Provenienza sconosciuta';
/** Il cruscotto aspetta l'app al più così: oltre, mostra il resto. */
const ATTESA_MS = 4000;

export async function leggiRiassunto({ chiave, da, a, fetch: f = globalThis.fetch, attesaMs = ATTESA_MS }) {
  if (!chiave) return { stato: 'in-attesa', dati: null };
  let r;
  try {
    r = await f(`${URL_RIASSUNTO}?da=${da}&a=${a}`, {
      headers: { Authorization: `Bearer ${chiave}` },
      signal: AbortSignal.timeout(attesaMs),
    });
  } catch {
    return { stato: 'errore', dati: null };
  }
  if (r.status === 404) return { stato: 'in-attesa', dati: null };
  if (!r.ok) return { stato: 'errore', dati: null };
  let d;
  try {
    d = await r.json();
  } catch {
    return { stato: 'errore', dati: null };
  }
  // Una versione che non conosciamo potrebbe avere campi con un altro
  // significato: meglio dire «errore» che mostrare numeri sbagliati.
  if (d?.versione !== VERSIONE_RIASSUNTO) return { stato: 'errore', dati: null };
  return { stato: 'ok', dati: d };
}

/** Il canale di un iscritto. Gli UTM «sito» dicono quale bottone, non da
 *  dove: in quel caso parla il referrer (spec §7.1). */
export function canaleIscritto({ sorgente, rif }) {
  if (!sorgente && !rif) return CANALE_SCONOSCIUTO;
  if (sorgente && sorgente !== 'sito') return famiglia(sorgente);
  if (rif) return famiglia(rif);
  return famiglia(null);
}
```

- [ ] **Step 4: Eseguire e vedere passare**

Run: `node --test lib/riassunto.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: `pass 9`, `fail 0`.

- [ ] **Step 5: Scrivere i test della composizione (falliranno)**

`lib/composizione.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { totali, serie, canali, campagne, imbuto, occasioni, componi } from './composizione.mjs';

const vuoto = () => ({ serie: [], provenienze: [], pagine: [], paesi: [], visiteUtm: [], query: [], pagineRicerca: [] });
const app = (m = {}) => ({ versione: 1, giorni: [], coorte: [], totali: { ricavoMensileCentesimi: 990 }, eventi: [], medianaGiorniAlPagamento: 4, ...m });
const riga = (giorno, m = {}) => ({ giorno, visite: null, pagineViste: null, clic: null, impressioni: null, posizione: null, ...m });

test('serie: un elemento per ogni giorno, i buchi restano null', () => {
  const a = { ...vuoto(), serie: [riga('2026-10-01', { visite: 3 }), riga('2026-10-03', { visite: 1 })] };
  const s = serie({ da: '2026-10-01', a: '2026-10-03' }, a, null);
  assert.deepEqual(s.map((x) => [x.giorno, x.visite, x.iscritti]), [['2026-10-01', 3, null], ['2026-10-02', null, null], ['2026-10-03', 1, null]]);
});

test('serie: con l\'app, gli iscritti di un giorno senza riga sono zero', () => {
  const s = serie({ da: '2026-10-01', a: '2026-10-02' }, vuoto(), app({ giorni: [{ giorno: '2026-10-01', iscritti: 2, attivati: 0, nuoviPro: 0, nuoviPaganti: 0 }] }));
  assert.deepEqual(s.map((x) => x.iscritti), [2, 0]);
});

test('totali: i null non diventano zero; tutto null resta null', () => {
  const t = totali({ ...vuoto(), serie: [riga('a', { visite: 3 }), riga('b'), riga('c', { visite: 2 })] }, null);
  assert.equal(t.visite, 5);
  assert.equal(t.clic, null);
  assert.equal(t.iscritti, null);
  assert.equal(totali(vuoto(), app()).iscritti, 0);
  assert.equal(totali(vuoto(), app()).ricavoMensileCentesimi, 990);
});

test('canali: famiglie dalle provenienze, visite attribuite e iscritti per canale', () => {
  const a = {
    ...vuoto(),
    provenienze: [{ host: 'www.linkedin.com', viste: 4 }, { host: 'lnkd.in', viste: 1 }, { host: '', viste: 9 }],
    visiteUtm: [{ sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', n: 3 }],
  };
  const c = canali(a, app({ coorte: [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', rif: null, iscritti: 2, attivati: 1, pro: 1, paganti: 1 },
    { sorgente: null, mezzo: null, campagna: null, rif: null, iscritti: 5, attivati: 0, pro: 0, paganti: 0 },
  ] }));
  assert.deepEqual(c.find((x) => x.famiglia === 'Social'), { famiglia: 'Social', pagineViste: 5, visiteUtm: 3, iscritti: 2, paganti: 1 });
  assert.equal(c.find((x) => x.famiglia === 'Diretto o interno').pagineViste, 9);
  assert.equal(c.find((x) => x.famiglia === 'Provenienza sconosciuta').iscritti, 5);
  assert.equal(c[0].famiglia, 'Diretto o interno'); // ordinati per pagine viste
});

test('canali senza app: iscritti e paganti null, non zero', () => {
  const [c] = canali({ ...vuoto(), provenienze: [{ host: 'www.google.com', viste: 2 }] }, null);
  assert.deepEqual(c, { famiglia: 'Ricerca Google', pagineViste: 2, visiteUtm: 0, iscritti: null, paganti: null });
});

test('campagne: solo visite con UTM; gli iscritti si agganciano a sorgente, mezzo e campagna', () => {
  const a = { ...vuoto(), visiteUtm: [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', contenuto: 'post1', n: 2 },
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', contenuto: 'post2', n: 1 },
    { sorgente: 'www.google.com', mezzo: null, campagna: null, contenuto: null, n: 7 }, // solo referrer
  ] };
  const c = campagne(a, app({ coorte: [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', rif: null, iscritti: 1, attivati: 0, pro: 0, paganti: 0 },
    { sorgente: 'sito', mezzo: 'guida', campagna: 'clienti', rif: null, iscritti: 3, attivati: 0, pro: 0, paganti: 0 },
    { sorgente: 'newsletter', mezzo: 'email', campagna: 'ottobre', rif: null, iscritti: 1, attivati: 1, pro: 1, paganti: 1 },
  ] }));
  assert.deepEqual(c, [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio', visite: 3, iscritti: 1, paganti: 0 },
    { sorgente: 'newsletter', mezzo: 'email', campagna: 'ottobre', visite: 0, iscritti: 1, paganti: 1 },
  ]);
});

test('imbuto: null senza app; con l\'app cinque gradini, anche per canale', () => {
  assert.equal(imbuto(vuoto(), null, 10), null);
  const a = { ...vuoto(), visiteUtm: [{ sorgente: 'linkedin', mezzo: 'social', campagna: 'x', n: 20 }] };
  const i = imbuto(a, app({ coorte: [
    { sorgente: 'linkedin', mezzo: 'social', campagna: 'x', rif: null, iscritti: 4, attivati: 2, pro: 1, paganti: 1 },
    { sorgente: null, mezzo: null, campagna: null, rif: null, iscritti: 6, attivati: 1, pro: 0, paganti: 0 },
  ] }), 120);
  assert.deepEqual(i.gradini.map((g) => [g.nome, g.valore]), [['Visite', 120], ['Iscrizioni', 10], ['Attivazione', 3], ['Pro', 1], ['Pagante', 1]]);
  assert.deepEqual(i.perCanale.Social.map((g) => g.valore), [20, 4, 2, 1, 1]);
  assert.equal(i.perCanale['Provenienza sconosciuta'][0].valore, null); // le visite di chi? non si sa
  assert.equal(i.medianaGiorniAlPagamento, 4);
});

test('occasioni: molte impressioni e CTR sotto la mediana; con la mediana a zero contano i clic a zero', () => {
  const p = (chiave, clic, impressioni) => ({ chiave, clic, impressioni, posizione: 10 });
  assert.deepEqual(occasioni([p('/a', 10, 100), p('/b', 1, 300), p('/c', 5, 50), p('/d', 0, 20)]).map((x) => x.chiave), ['/b']);
  assert.deepEqual(occasioni([p('/a', 0, 150), p('/b', 0, 400), p('/c', 0, 10)]).map((x) => x.chiave), ['/b', '/a']);
  assert.deepEqual(occasioni([]), []);
});

test('componi: con l\'app in errore il resto è intero e l\'imbuto è null', () => {
  const archivio = { ...vuoto(), serie: [riga('2026-10-05', { visite: 2, pagineViste: 3 })] };
  const r = componi({
    intervallo: { periodo: '7', da: '2026-10-05', a: '2026-10-11', giorni: 7 },
    precedente: null, archivio, archivioPrecedente: null,
    novita: { provenienze: [], campagne: [] },
    stato: { primi: { cloudflare: '2026-09-13', google: '2025-06-12' }, indice: { ultima: null, precedente: null, pagine: [], entrate: [], uscite: [] }, salute: { vitals: null, giornoVitals: null, fonti: [], ultimoGiornoGoogle: null } },
    oggi: null,
    app: { stato: 'errore', dati: null }, appPrecedente: null,
    fonti: { archivio: 'ok', cloudflare: 'errore', app: 'errore' },
    generato: '2026-10-12T08:00:00.000Z',
  });
  assert.equal(r.serie.length, 7);
  assert.equal(r.totali.visite, 2);
  assert.equal(r.totali.iscritti, null);
  assert.equal(r.imbuto, null);
  assert.equal(r.totaliPrecedente, null);
  assert.deepEqual(r.fonti, { archivio: 'ok', cloudflare: 'errore', app: 'errore' });
  assert.deepEqual(r.periodo, { nome: '7', da: '2026-10-05', a: '2026-10-11', giorni: 7 });
  assert.ok(r.osservazioni.length >= 1);
});
```

- [ ] **Step 6: Eseguire e vedere fallire**

Run: `node --test lib/composizione.test.mjs 2>&1 | tail -3`
Expected: FAIL — `Cannot find module './composizione.mjs'`.

- [ ] **Step 7: Implementare `lib/composizione.mjs`**

```js
// Dalle letture alla risposta del cruscotto — docs/cruscotto-piano.md §5.2.
//
// Funzioni pure: ricevono quello che le letture hanno trovato e non sanno
// da dove arriva. `app` è il riassunto dell'app già validato (dati) o null:
// null vuol dire «non lo sappiamo», e i campi dell'app restano null — mai 0.

import { famiglia } from './attribuzione.mjs';
import { canaleIscritto } from './riassunto.mjs';
import { spostato } from './cruscotto.mjs';
import { frasi } from './osservazioni.mjs';

/** Somma che ignora i null; se sono tutti null, il totale è null. */
const somma = (righe, campo) => {
  let t = null;
  for (const r of righe ?? []) if (r[campo] != null) t = (t ?? 0) + r[campo];
  return t;
};
const sommaApp = (app, campo) => (app ? somma(app.giorni, campo) ?? 0 : null);

export function totali(archivio, app) {
  return {
    visite: somma(archivio.serie, 'visite'),
    pagineViste: somma(archivio.serie, 'pagineViste'),
    clic: somma(archivio.serie, 'clic'),
    impressioni: somma(archivio.serie, 'impressioni'),
    iscritti: sommaApp(app, 'iscritti'),
    nuoviPro: sommaApp(app, 'nuoviPro'),
    nuoviPaganti: sommaApp(app, 'nuoviPaganti'),
    ricavoMensileCentesimi: app?.totali?.ricavoMensileCentesimi ?? null,
  };
}

/** Un elemento per OGNI giorno dell'intervallo: i giorni senza riga in
 *  storico sono buchi (null), e il grafico li disegna come buchi. */
export function serie({ da, a }, archivio, app) {
  const perGiorno = new Map(archivio.serie.map((r) => [r.giorno, r]));
  const dellApp = new Map((app?.giorni ?? []).map((r) => [r.giorno, r]));
  const fuori = [];
  for (let g = da; g <= a; g = spostato(g, 1)) {
    const r = perGiorno.get(g);
    const x = dellApp.get(g);
    fuori.push({
      giorno: g,
      visite: r?.visite ?? null,
      pagineViste: r?.pagineViste ?? null,
      clic: r?.clic ?? null,
      impressioni: r?.impressioni ?? null,
      posizione: r?.posizione ?? null,
      iscritti: app ? x?.iscritti ?? 0 : null,
      nuoviPro: app ? x?.nuoviPro ?? 0 : null,
      nuoviPaganti: app ? x?.nuoviPaganti ?? 0 : null,
    });
  }
  return fuori;
}

export function canali(archivio, app) {
  const m = new Map();
  const di = (f) => {
    if (!m.has(f)) m.set(f, { famiglia: f, pagineViste: 0, visiteUtm: 0, iscritti: app ? 0 : null, paganti: app ? 0 : null });
    return m.get(f);
  };
  for (const p of archivio.provenienze) di(famiglia(p.host)).pagineViste += p.viste ?? 0;
  for (const v of archivio.visiteUtm) di(famiglia(v.sorgente)).visiteUtm += v.n;
  for (const c of app?.coorte ?? []) {
    const r = di(canaleIscritto(c));
    r.iscritti += c.iscritti ?? 0;
    r.paganti += c.paganti ?? 0;
  }
  return [...m.values()].sort((a, b) => b.pagineViste - a.pagineViste || b.visiteUtm - a.visiteUtm || a.famiglia.localeCompare(b.famiglia));
}

const chiaveCampagna = (r) => [r.sorgente ?? '', r.mezzo ?? '', r.campagna ?? ''].join('\u0000');

/** Solo visite con UTM veri (mezzo o campagna): un referrer da solo non è una
 *  campagna. Gli UTM interni «sito» dell'app dicono quale bottone, non quale
 *  campagna, e qui non entrano. */
export function campagne(archivio, app) {
  const m = new Map();
  const di = (r) => {
    const k = chiaveCampagna(r);
    if (!m.has(k)) m.set(k, { sorgente: r.sorgente ?? null, mezzo: r.mezzo ?? null, campagna: r.campagna ?? null, visite: 0, iscritti: app ? 0 : null, paganti: app ? 0 : null });
    return m.get(k);
  };
  for (const v of archivio.visiteUtm) {
    if (v.mezzo == null && v.campagna == null) continue;
    di(v).visite += v.n;
  }
  for (const c of app?.coorte ?? []) {
    if (c.sorgente === 'sito' || (c.mezzo == null && c.campagna == null)) continue;
    const r = di(c);
    r.iscritti += c.iscritti ?? 0;
    r.paganti += c.paganti ?? 0;
  }
  return [...m.values()].sort((a, b) => b.visite - a.visite || (b.iscritti ?? 0) - (a.iscritti ?? 0) || chiaveCampagna(a).localeCompare(chiaveCampagna(b)));
}

const NOMI_GRADINI = ['Visite', 'Iscrizioni', 'Attivazione', 'Pro', 'Pagante'];

export function imbuto(archivio, app, visite) {
  if (!app) return null;
  const gradini = (v, righe) => {
    const s = (campo) => righe.reduce((t, c) => t + (c[campo] ?? 0), 0);
    return [v, s('iscritti'), s('attivati'), s('pro'), s('paganti')].map((valore, i) => ({ nome: NOMI_GRADINI[i], valore }));
  };
  const visitePerCanale = new Map();
  for (const v of archivio.visiteUtm) {
    const f = famiglia(v.sorgente);
    visitePerCanale.set(f, (visitePerCanale.get(f) ?? 0) + v.n);
  }
  const perCanale = {};
  const gruppi = new Map();
  for (const c of app.coorte ?? []) {
    const f = canaleIscritto(c);
    if (!gruppi.has(f)) gruppi.set(f, []);
    gruppi.get(f).push(c);
  }
  for (const [f, righe] of gruppi) perCanale[f] = gradini(visitePerCanale.get(f) ?? null, righe);
  return {
    gradini: gradini(visite, app.coorte ?? []),
    perCanale,
    medianaGiorniAlPagamento: app.medianaGiorniAlPagamento ?? null,
  };
}

/** Pagine viste spesso su Google e cliccate poco: dove un titolo migliore
 *  rende di più. «Poco» = CTR sotto la mediana delle pagine del sito. */
export function occasioni(pagine) {
  const ctr = (p) => (p.impressioni ? p.clic / p.impressioni : 0);
  const valori = pagine.filter((p) => p.impressioni > 0).map(ctr).sort((a, b) => a - b);
  if (!valori.length) return [];
  const n = valori.length;
  const mediana = n % 2 ? valori[(n - 1) / 2] : (valori[n / 2 - 1] + valori[n / 2]) / 2;
  return pagine
    .filter((p) => p.impressioni >= 100 && (ctr(p) < mediana || (mediana === 0 && p.clic === 0)))
    .sort((a, b) => b.impressioni - a.impressioni)
    .slice(0, 10)
    .map((p) => ({ ...p, ctr: ctr(p) }));
}

const misure = (archivio, t, c) => ({
  visite: t.visite,
  iscritti: t.iscritti,
  clic: t.clic,
  canali: c.map(({ famiglia: f, pagineViste }) => ({ famiglia: f, pagineViste })),
  query: archivio.query,
  pagine: archivio.pagineRicerca,
});

export function componi({ intervallo, precedente, archivio, archivioPrecedente, novita, stato, oggi, app, appPrecedente, fonti, generato }) {
  const dati = app?.stato === 'ok' ? app.dati : null;
  const datiPrima = appPrecedente?.stato === 'ok' ? appPrecedente.dati : null;
  const t = totali(archivio, dati);
  const tPrima = archivioPrecedente ? totali(archivioPrecedente, datiPrima) : null;
  const c = canali(archivio, dati);
  const cPrima = archivioPrecedente ? canali(archivioPrecedente, datiPrima) : null;

  return {
    generato,
    periodo: { nome: intervallo.periodo, da: intervallo.da, a: intervallo.a, giorni: intervallo.giorni },
    precedente: precedente ? { da: precedente.da, a: precedente.a } : null,
    fonti,
    oggi,
    serie: serie(intervallo, archivio, dati),
    seriePrecedente: archivioPrecedente ? serie(precedente, archivioPrecedente, datiPrima) : null,
    totali: t,
    totaliPrecedente: tPrima,
    canali: c,
    campagne: campagne(archivio, dati),
    visiteUtm: archivio.visiteUtm,
    pagine: archivio.pagine,
    paesi: archivio.paesi,
    ricerca: {
      query: archivio.query.slice(0, 25),
      pagine: archivio.pagineRicerca.slice(0, 25),
      occasioni: occasioni(archivio.pagineRicerca),
    },
    indice: stato.indice,
    imbuto: imbuto(archivio, dati, t.visite),
    salute: stato.salute,
    primi: stato.primi,
    osservazioni: frasi({
      giorni: intervallo.giorni,
      attuale: misure(archivio, t, c),
      precedente: archivioPrecedente ? misure(archivioPrecedente, tPrima, cPrima) : null,
      novita,
      indice: stato.indice,
    }),
  };
}
```

- [ ] **Step 8: Eseguire e vedere passare**

Run: `node --test lib/composizione.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: `pass 9`, `fail 0`.

- [ ] **Step 9: Suite intera e commit**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"` — Expected: `fail 0`.

```bash
git add lib/riassunto.mjs lib/riassunto.test.mjs lib/composizione.mjs lib/composizione.test.mjs
git commit -m "feat(cruscotto): il riassunto dell'app e la composizione della risposta"
```

---

### Compito 6: l'endpoint `/api/cruscotto`

**Files:**
- Modify: `lib/cloudflare.mjs` (metodo `perOra` nel `cliente`)
- Modify: `lib/attribuzione.mjs:104-112` (`ePagina` esclude `/cruscotto`)
- Create: `lib/cruscotto-api.mjs`, `functions/api/cruscotto.js`
- Test: `lib/cloudflare.test.mjs`, `lib/attribuzione.test.mjs`, `lib/cruscotto-api.test.mjs`

**Interfaces:**
- Consumes: `verificatore` (Compito 2); `intervallo`, `precedente`, `leggiArchivio`, `leggiNovita`, `leggiStato`, `spostato`, `PERIODI` (Compito 3); `componi` (Compito 5); `leggiRiassunto` (Compito 5); `cliente` (esistente).
- Produces:
  - `cliente(...).perOra({ da, fino }) → [{ ora: '2026-10-12T08:00:00Z', visite, pagineViste }]`
  - `rispondi({ request, env, adesso?, fetch?, cache?, waitUntil?, verifica }) → Response` — 403 se `verifica` rifiuta; 503 senza `env.DB`; altrimenti 200 con il JSON di `componi`.
  - `verificaPer(env) → (token) => Promise` (un verificatore per isolate, con i certificati in memoria).
  - `CACHE_OK_S = 300`, `CACHE_ERRORE_S = 60`.
  - Variabili d'ambiente lette: `DB`, `ACCESS_TEAM`, `ACCESS_AUD`, `CRUSCOTTO_EMAIL`, `CF_ANALYTICS_TOKEN`, `CF_ACCOUNT_ID`, `RIASSUNTO_CHIAVE`.

- [ ] **Step 1: Test di `perOra` e di `ePagina` (falliranno)**

In fondo a `lib/cloudflare.test.mjs`:

```js
test('perOra: una richiesta per ora del giorno, in ordine, con visite e pagine viste', async () => {
  const { f, chiamate } = finto({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [
    { count: 3, sum: { visits: 2 }, dimensions: { datetimeHour: '2026-10-12T07:00:00Z' } },
  ] }] } } });
  const r = await cliente({ token: 't', account: 'a', fetch: f }).perOra({ da: '2026-10-11T00:00:00Z', fino: '2026-10-12T08:10:00Z' });
  assert.deepEqual(r, [{ ora: '2026-10-12T07:00:00Z', visite: 2, pagineViste: 3 }]);
  assert.match(chiamate[0].corpo.query, /datetimeHour_ASC/);
  assert.deepEqual(chiamate[0].corpo.variables, { a: 'a', da: '2026-10-11T00:00:00Z', fino: '2026-10-12T08:10:00Z' });
});
```

In `lib/attribuzione.test.mjs`, dentro il test `'ePagina: solo GET su pagine, mai API, risorse o prefetch'`, aggiungere:

```js
  // Il cruscotto non è una visita da attribuire: è il proprietario che guarda.
  assert.equal(ePagina({ metodo: 'GET', percorso: '/cruscotto', intestazioni: h() }), false);
  assert.equal(ePagina({ metodo: 'GET', percorso: '/cruscotto.html', intestazioni: h() }), false);
```

Run: `node --test lib/cloudflare.test.mjs lib/attribuzione.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: due `not ok` (perOra non è una funzione; `/cruscotto` restituisce true).

- [ ] **Step 2: Implementare `perOra` ed escludere `/cruscotto`**

In `lib/cloudflare.mjs`, dentro l'oggetto restituito da `cliente`, dopo `vitals`:

```js
    /** Ora per ora, per «la giornata in corso». Su due giorni il campionamento
     *  è 1: i numeri sono esatti. */
    async perOra({ da, fino }) {
      const q = `${TESTA}rumPageloadEventsAdaptiveGroups(limit:72,${FILTRO},orderBy:[datetimeHour_ASC]){count sum{visits} dimensions{datetimeHour}}}}}`;
      const righe = (await graphql(q, { da, fino })).rumPageloadEventsAdaptiveGroups ?? [];
      return righe.map((r) => ({ ora: r.dimensions.datetimeHour, visite: r.sum?.visits ?? 0, pagineViste: r.count }));
    },
```

In `lib/attribuzione.mjs`, in `ePagina`, subito dopo la riga di `/api/` e `/cdn-cgi/`:

```js
  if (percorso === '/cruscotto' || percorso === '/cruscotto.html') return false;
```

Run lo stesso comando dello Step 1. Expected: `fail 0`.

- [ ] **Step 3: Scrivere i test dell'endpoint (falliranno)**

`lib/cruscotto-api.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apriInMemoria } from './d1-in-memoria.mjs';
import { rispondi, CACHE_OK_S, CACHE_ERRORE_S } from './cruscotto-api.mjs';
import { URL_RIASSUNTO } from './riassunto.mjs';
import { GRAPHQL } from './cloudflare.mjs';

const ADESSO = Date.parse('2026-10-12T08:10:00Z');
const passa = async () => ({ email: 'terracciano41@gmail.com' });
const rifiuta = async () => { throw new Error('no'); };

function dbConDati() {
  const db = apriInMemoria();
  db.tutte(`INSERT INTO storico (giorno, preso_il, visite, pagine_viste, dati) VALUES
    ('2026-09-13', 'x', 1, 1, '{}'), ('2026-10-10', 'x', 4, 6, '{"cloudflare":{"provenienze":[{"chiave":"www.linkedin.com","viste":2}]}}') RETURNING giorno`);
  return db;
}

// Rete finta: Cloudflare risponde le ore, l'app risponde come le si dice.
function rete({ cloudflare = 200, app = 404 } = {}) {
  const chiamate = [];
  const f = async (url, o) => {
    chiamate.push(String(url));
    if (String(url) === GRAPHQL) {
      if (cloudflare !== 200) return new Response('guasto', { status: cloudflare });
      return Response.json({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [
        { count: 2, sum: { visits: 1 }, dimensions: { datetimeHour: '2026-10-11T21:00:00Z' } },
        { count: 5, sum: { visits: 3 }, dimensions: { datetimeHour: '2026-10-12T07:00:00Z' } },
      ] }] } } });
    }
    if (String(url).startsWith(URL_RIASSUNTO)) return new Response('', { status: app });
    throw new Error(`rete finta: ${url}`);
  };
  return { f, chiamate };
}

function cacheFinta() {
  const m = new Map();
  return {
    m,
    match: async (r) => m.get(r.url)?.clone(),
    put: async (r, risposta) => { m.set(r.url, risposta); },
  };
}

const ENV = (db) => ({ DB: db, CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'a', RIASSUNTO_CHIAVE: 'k' });
const richiesta = (q = 'periodo=7') => new Request(`https://quotify.it/api/cruscotto?${q}`);

test('senza un token Access valido: 403, nessuna lettura, niente cache', async () => {
  const db = new Proxy({}, { get: () => { throw new Error('il database non andava toccato'); } });
  const r = await rispondi({ request: richiesta(), env: ENV(db), adesso: ADESSO, fetch: rete().f, verifica: rifiuta });
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await r.json(), { errore: 'Non autorizzato.' });
});

test('senza database (anteprima): 503 con le fonti in errore', async () => {
  const r = await rispondi({ request: richiesta(), env: { ...ENV(null), DB: undefined }, adesso: ADESSO, fetch: rete().f, verifica: passa });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).fonti.archivio, 'errore');
});

test('giorno normale con l\'app che non ha ancora l\'endpoint: 200, app «in attesa», oggi diviso per giorno', async () => {
  const r = await rispondi({ request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, verifica: passa });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  const d = await r.json();
  assert.deepEqual(d.fonti, { archivio: 'ok', cloudflare: 'ok', app: 'in-attesa' });
  assert.deepEqual(d.periodo, { nome: '7', da: '2026-10-05', a: '2026-10-11', giorni: 7 });
  assert.equal(d.totali.visite, 4);
  assert.deepEqual(d.oggi.perOra, [{ ora: '2026-10-12T07:00:00Z', visite: 3, pagineViste: 5 }]);
  assert.deepEqual(d.oggi.ieriPerOra, [{ ora: '2026-10-11T21:00:00Z', visite: 1, pagineViste: 2 }]);
  assert.equal(d.precedente, null);
});

test('confronto=1: periodo precedente e serie precedente della stessa lunghezza', async () => {
  const d = await (await rispondi({ request: richiesta('periodo=7&confronto=1'), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, verifica: passa })).json();
  assert.deepEqual(d.precedente, { da: '2026-09-28', a: '2026-10-04' });
  assert.equal(d.seriePrecedente.length, 7);
});

test('Cloudflare giù: oggi è null, il resto risponde', async () => {
  const d = await (await rispondi({ request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete({ cloudflare: 502 }).f, verifica: passa })).json();
  assert.equal(d.fonti.cloudflare, 'errore');
  assert.equal(d.oggi, null);
  assert.equal(d.totali.visite, 4);
});

test('Cloudflare non configurato: errore senza nemmeno provarci', async () => {
  const { f, chiamate } = rete();
  const d = await (await rispondi({ request: richiesta(), env: { ...ENV(dbConDati()), CF_ANALYTICS_TOKEN: '' }, adesso: ADESSO, fetch: f, verifica: passa })).json();
  assert.equal(d.fonti.cloudflare, 'errore');
  assert.ok(!chiamate.includes(GRAPHQL));
});

test('cache: la seconda richiesta non rifà le chiamate; durata breve se qualcosa è in errore', async () => {
  const cache = cacheFinta();
  const sospesi = [];
  const { f, chiamate } = rete({ cloudflare: 502 });
  const argomenti = { request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: f, cache, waitUntil: (p) => sospesi.push(p), verifica: passa };
  await rispondi(argomenti);
  await Promise.all(sospesi);
  const prima = chiamate.length;
  const r = await rispondi({ ...argomenti, request: richiesta() });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal(chiamate.length, prima);
  const [salvata] = cache.m.values();
  assert.equal(salvata.headers.get('Cache-Control'), `max-age=${CACHE_ERRORE_S}`);
});

test('cache: con Cloudflare a posto e l\'app solo «in attesa» si tiene cinque minuti', async () => {
  const cache = cacheFinta();
  const sospesi = [];
  await rispondi({ request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, cache, waitUntil: (p) => sospesi.push(p), verifica: passa });
  await Promise.all(sospesi);
  const [salvata] = cache.m.values();
  assert.equal(salvata.headers.get('Cache-Control'), `max-age=${CACHE_OK_S}`);
});

test('cache: anche una risposta in cache passa prima dal controllo di accesso', async () => {
  const cache = cacheFinta();
  const sospesi = [];
  const argomenti = { request: richiesta(), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, cache, waitUntil: (p) => sospesi.push(p) };
  await rispondi({ ...argomenti, verifica: passa });
  await Promise.all(sospesi);
  assert.equal((await rispondi({ ...argomenti, request: richiesta(), verifica: rifiuta })).status, 403);
});

test('un periodo sconosciuto usa la stessa voce di cache di 28 giorni', async () => {
  const cache = cacheFinta();
  const sospesi = [];
  await rispondi({ request: richiesta('periodo=boh'), env: ENV(dbConDati()), adesso: ADESSO, fetch: rete().f, cache, waitUntil: (p) => sospesi.push(p), verifica: passa });
  await Promise.all(sospesi);
  assert.deepEqual([...cache.m.keys()], ['https://quotify.it/api/cruscotto?periodo=28&confronto=0&giorno=2026-10-12']);
});
```

- [ ] **Step 4: Eseguire e vedere fallire**

Run: `node --test lib/cruscotto-api.test.mjs 2>&1 | tail -3`
Expected: FAIL — `Cannot find module './cruscotto-api.mjs'`.

- [ ] **Step 5: Implementare `lib/cruscotto-api.mjs`**

```js
// La logica di GET /api/cruscotto — docs/cruscotto-piano.md §3, §5.3, §8.
//
// functions/api/cruscotto.js è solo l'involucro: tutto quello che si può
// sbagliare sta qui, dove i test lo raggiungono senza rete.
//
// ORDINE NON NEGOZIABILE: prima l'accesso, poi qualunque altra cosa — anche
// la cache. Una risposta in cache non è una risposta pubblica.

import { verificatore } from './accesso.mjs';
import { PERIODI, PERIODO_PREDEFINITO, intervallo, precedente, leggiArchivio, leggiNovita, leggiStato, spostato } from './cruscotto.mjs';
import { componi } from './composizione.mjs';
import { leggiRiassunto } from './riassunto.mjs';
import { cliente } from './cloudflare.mjs';

export const CACHE_OK_S = 300;
export const CACHE_ERRORE_S = 60;

const NO_STORE = { 'Cache-Control': 'no-store' };
const negato = () => Response.json({ errore: 'Non autorizzato.' }, { status: 403, headers: NO_STORE });
const nonDisponibile = () => Response.json(
  { fonti: { archivio: 'errore', cloudflare: 'errore', app: 'errore' } }, { status: 503, headers: NO_STORE });

let condiviso = null;
/** Un verificatore per isolate: così i certificati di Access restano in
 *  memoria fra una richiesta e l'altra. */
export function verificaPer(env) {
  const chiave = `${env.ACCESS_TEAM}|${env.ACCESS_AUD}|${env.CRUSCOTTO_EMAIL}`;
  if (condiviso?.chiave !== chiave) {
    condiviso = { chiave, v: verificatore({ team: env.ACCESS_TEAM, aud: env.ACCESS_AUD, email: env.CRUSCOTTO_EMAIL }) };
  }
  return (token) => condiviso.v.verifica(token);
}

const senzaMillisecondi = (iso) => iso.replace(/\.\d{3}Z$/, 'Z');

async function leggiOggi(env, f, oggi, ieri, adesso) {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) throw new Error('Cloudflare non configurato');
  const cf = cliente({ token: env.CF_ANALYTICS_TOKEN, account: env.CF_ACCOUNT_ID, fetch: f });
  const righe = await cf.perOra({ da: `${ieri}T00:00:00Z`, fino: senzaMillisecondi(new Date(adesso).toISOString()) });
  return {
    perOra: righe.filter((r) => r.ora.startsWith(oggi)),
    ieriPerOra: righe.filter((r) => r.ora.startsWith(ieri)),
  };
}

export async function rispondi({ request, env, adesso = Date.now(), fetch: f = globalThis.fetch, cache = null, waitUntil = () => {}, verifica }) {
  try {
    await verifica(request.headers.get('Cf-Access-Jwt-Assertion'));
  } catch {
    return negato();
  }
  if (!env.DB) return nonDisponibile();

  const url = new URL(request.url);
  const richiesto = url.searchParams.get('periodo');
  const periodo = PERIODI.includes(richiesto) ? richiesto : PERIODO_PREDEFINITO;
  const confronto = url.searchParams.get('confronto') === '1';
  const oggi = new Date(adesso).toISOString().slice(0, 10);
  // Il giorno nella chiave: a mezzanotte UTC il periodo cambia, e la cache con lui.
  const chiaveCache = new Request(`https://quotify.it/api/cruscotto?periodo=${periodo}&confronto=${confronto ? 1 : 0}&giorno=${oggi}`);

  if (cache) {
    const salvata = await cache.match(chiaveCache).catch(() => null);
    if (salvata) return new Response(salvata.body, { status: 200, headers: { 'Content-Type': 'application/json', ...NO_STORE } });
  }

  let stato;
  try {
    stato = await leggiStato(env.DB);
  } catch {
    return nonDisponibile();
  }
  const primo = [stato.primi.cloudflare, stato.primi.google].filter(Boolean).sort()[0] ?? null;
  const periodoCorrente = intervallo(periodo, oggi, primo);
  const periodoPrima = confronto ? precedente(periodoCorrente) : null;
  const ieri = spostato(oggi, -1);
  const chiave = env.RIASSUNTO_CHIAVE;

  const [archivio, archivioPrima, novita, ore, app, appPrima] = await Promise.allSettled([
    leggiArchivio(env.DB, periodoCorrente),
    periodoPrima ? leggiArchivio(env.DB, periodoPrima) : null,
    leggiNovita(env.DB, periodoCorrente, stato.primi.cloudflare),
    leggiOggi(env, f, oggi, ieri, adesso),
    leggiRiassunto({ chiave, da: periodoCorrente.da, a: periodoCorrente.a, fetch: f }),
    periodoPrima ? leggiRiassunto({ chiave, da: periodoPrima.da, a: periodoPrima.a, fetch: f }) : null,
  ]);
  if (archivio.status !== 'fulfilled' || (periodoPrima && archivioPrima.status !== 'fulfilled')) return nonDisponibile();

  const valore = (r, riserva) => (r.status === 'fulfilled' ? r.value : riserva);
  const statoApp = valore(app, { stato: 'errore', dati: null });
  const fonti = {
    archivio: 'ok',
    cloudflare: ore.status === 'fulfilled' ? 'ok' : 'errore',
    app: statoApp.stato,
  };

  const corpo = componi({
    intervallo: periodoCorrente,
    precedente: periodoPrima,
    archivio: archivio.value,
    archivioPrecedente: periodoPrima ? archivioPrima.value : null,
    novita: valore(novita, { provenienze: [], campagne: [] }),
    stato,
    oggi: valore(ore, null),
    app: statoApp,
    appPrecedente: valore(appPrima, null),
    fonti,
    generato: new Date(adesso).toISOString(),
  });

  if (cache) {
    // «In attesa» non è un guasto: finché l'app non c'è, non serve riprovare ogni minuto.
    const durata = fonti.cloudflare === 'ok' && fonti.app !== 'errore' ? CACHE_OK_S : CACHE_ERRORE_S;
    waitUntil(cache.put(chiaveCache, Response.json(corpo, { headers: { 'Cache-Control': `max-age=${durata}` } })).catch(() => {}));
  }
  return Response.json(corpo, { headers: NO_STORE });
}
```

- [ ] **Step 6: L'involucro `functions/api/cruscotto.js`**

```js
// GET /api/cruscotto — i dati del cruscotto. Protetto da Cloudflare Access e,
// in più, dalla verifica del suo token qui dentro (lib/accesso.mjs): lo stesso
// progetto risponde anche su *.pages.dev, che Access non copre.
//
// Tutta la logica sta in lib/cruscotto-api.mjs, dove i test la raggiungono.
//
// SEGRETI E VARIABILI sul progetto Pages `quotify-website`, solo produzione:
//   ACCESS_TEAM, ACCESS_AUD, CRUSCOTTO_EMAIL   chi può entrare
//   CF_ANALYTICS_TOKEN, CF_ACCOUNT_ID          Cloudflare, sola lettura
//   RIASSUNTO_CHIAVE                           la chiave condivisa con l'app

import { rispondi, verificaPer } from '../../lib/cruscotto-api.mjs';

export const onRequestGet = (context) => rispondi({
  request: context.request,
  env: context.env,
  cache: caches.default,
  waitUntil: (p) => context.waitUntil(p),
  verifica: verificaPer(context.env),
});
```

- [ ] **Step 7: Eseguire e vedere passare, poi la suite**

Run: `node --test lib/cruscotto-api.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: `pass 10`, `fail 0`.

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"` — Expected: `fail 0`.

- [ ] **Step 8: Commit**

```bash
git add lib/cloudflare.mjs lib/cloudflare.test.mjs lib/attribuzione.mjs lib/attribuzione.test.mjs lib/cruscotto-api.mjs lib/cruscotto-api.test.mjs functions/api/cruscotto.js
git commit -m "feat(cruscotto): l'endpoint, con l'accesso prima di tutto"
```

---

### Compito 7: grafici SVG e stato della vista

**Files:**
- Create: `lib/grafici.mjs`, `lib/vista.mjs`
- Test: `lib/grafici.test.mjs`, `lib/vista.test.mjs`

**Interfaces:**
- Produces:
  - `lib/grafici.mjs`: `esc(s) → string`; `linea({ punti: [{ x, y|null }], confronto?: [{ x, y|null }]|null, titolo, formato? }) → '<svg …>'` con un `<rect class="g-zona" data-i data-etichetta data-valore [data-confronto]>` per punto; `minilinea(valori: (number|null)[]) → '<svg …>'`; `imbuto(gradini: [{ nome, valore|null }]) → '<svg …>'`. Mai `NaN` o `Infinity` nell'uscita.
  - `lib/vista.mjs`: `SCHEDE = ['oggi', 'marketing', 'imbuto']`; `leggiVista(hash) → { scheda, periodo, confronto: boolean, canale|null, campagna|null }`; `scriviVista(vista) → '#scheda?…'` (omette i valori predefiniti).

- [ ] **Step 1: Scrivere i test (falliranno)**

`lib/grafici.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { esc, linea, minilinea, imbuto } from './grafici.mjs';

const pulito = (svg) => assert.ok(!/NaN|Infinity|undefined/.test(svg), `uscita sporca: ${svg.slice(0, 200)}`);
const p = (...ys) => ys.map((y, i) => ({ x: `g${i}`, y }));

test('esc: niente markup dai dati', () => {
  assert.equal(esc('<script>"a"&\'b\''), '&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;');
});

test('linea vuota o tutta null: un riquadro che lo dice, niente tracciato', () => {
  for (const punti of [[], p(null, null)]) {
    const svg = linea({ punti, titolo: 'Visite' });
    assert.match(svg, /Nessun dato/);
    assert.doesNotMatch(svg, /<path/);
    pulito(svg);
  }
});

test('linea con un punto solo: un cerchio, non un tracciato degenere', () => {
  const svg = linea({ punti: p(5), titolo: 'Visite' });
  assert.match(svg, /<circle/);
  pulito(svg);
});

test('linea: i null spezzano il tracciato in segmenti', () => {
  const svg = linea({ punti: p(1, 2, null, 3, 4), titolo: 'Visite' });
  const d = svg.match(/class="g-linea" d="([^"]*)"/)[1];
  assert.equal((d.match(/M/g) ?? []).length, 2);
  pulito(svg);
});

test('linea: tutti zero non divide per zero', () => {
  pulito(linea({ punti: p(0, 0, 0), titolo: 'Visite' }));
});

test('linea: una zona per punto, con valore e confronto leggibili', () => {
  const svg = linea({ punti: p(1, null), confronto: p(3, 4), titolo: 'Visite', formato: (v) => `${v} v` });
  const zone = [...svg.matchAll(/<rect class="g-zona"[^>]*>/g)].map((m) => m[0]);
  assert.equal(zone.length, 2);
  assert.match(zone[0], /data-valore="1 v"/);
  assert.match(zone[0], /data-confronto="3 v"/);
  assert.match(zone[1], /data-valore="—"/);
  assert.match(svg, /class="g-confronto"/);
});

test('linea: etichette e titolo escapati', () => {
  const svg = linea({ punti: [{ x: '<b>', y: 1 }], titolo: '"x"' });
  assert.ok(!svg.includes('<b>'));
  assert.ok(svg.includes('&lt;b&gt;'));
});

test('minilinea: vuota, tutta null, un valore: sempre pulita', () => {
  for (const v of [[], [null, null], [3], [0, 0], [1, null, 2]]) pulito(minilinea(v));
});

test('imbuto: larghezze in proporzione al primo gradino, passaggi in percentuale', () => {
  const svg = imbuto([{ nome: 'Visite', valore: 100 }, { nome: 'Iscrizioni', valore: 10 }, { nome: 'Pagante', valore: 0 }]);
  assert.match(svg, />10%</);
  assert.match(svg, />0%</);
  pulito(svg);
});

test('imbuto: gradini a zero o null non rompono niente', () => {
  for (const g of [[], [{ nome: 'Visite', valore: 0 }, { nome: 'Iscrizioni', valore: 0 }], [{ nome: 'Visite', valore: null }, { nome: 'Iscrizioni', valore: 3 }]]) {
    pulito(imbuto(g));
  }
  assert.match(imbuto([{ nome: 'Visite', valore: null }, { nome: 'Iscrizioni', valore: 3 }]), />—</);
});
```

`lib/vista.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { leggiVista, scriviVista } from './vista.mjs';

const PREDEFINITA = { scheda: 'oggi', periodo: '28', confronto: true, canale: null, campagna: null };

test('hash vuoto o sconosciuto: la vista predefinita', () => {
  assert.deepEqual(leggiVista(''), PREDEFINITA);
  assert.deepEqual(leggiVista('#boh?periodo=mille&confronto=x'), PREDEFINITA);
});

test('legge scheda, periodo, confronto e filtri', () => {
  assert.deepEqual(leggiVista('#marketing?periodo=7&confronto=0&canale=Ricerca+Google&campagna=lancio%20ottobre'),
    { scheda: 'marketing', periodo: '7', confronto: false, canale: 'Ricerca Google', campagna: 'lancio ottobre' });
});

test('scrive solo quello che non è predefinito, e torna indietro uguale', () => {
  assert.equal(scriviVista(PREDEFINITA), '#oggi');
  const v = { scheda: 'imbuto', periodo: '90', confronto: false, canale: 'Social', campagna: null };
  assert.equal(scriviVista(v), '#imbuto?periodo=90&confronto=0&canale=Social');
  assert.deepEqual(leggiVista(scriviVista(v)), v);
});

test('i link delle frasi (#marketing?canale=…) si leggono', () => {
  assert.equal(leggiVista('#marketing?canale=Social').canale, 'Social');
});
```

- [ ] **Step 2: Eseguire e vedere fallire**

Run: `node --test lib/grafici.test.mjs lib/vista.test.mjs 2>&1 | tail -3`
Expected: FAIL — moduli inesistenti.

- [ ] **Step 3: Implementare `lib/vista.mjs`**

```js
// Lo stato del cruscotto sta nell'indirizzo — docs/cruscotto-piano.md §4.1.
// Così il tasto indietro funziona, una vista si salva, e i link degli avvisi
// e delle frasi aprono la vista giusta. Formato: #scheda?periodo=…&confronto=0&canale=…&campagna=…

import { PERIODI, PERIODO_PREDEFINITO } from './cruscotto.mjs';

export const SCHEDE = ['oggi', 'marketing', 'imbuto'];
const PREDEFINITA = { scheda: 'oggi', periodo: PERIODO_PREDEFINITO, confronto: true, canale: null, campagna: null };

export function leggiVista(hash) {
  const [nome, query = ''] = String(hash ?? '').replace(/^#/, '').split('?');
  const q = new URLSearchParams(query);
  return {
    scheda: SCHEDE.includes(nome) ? nome : PREDEFINITA.scheda,
    periodo: PERIODI.includes(q.get('periodo')) ? q.get('periodo') : PREDEFINITA.periodo,
    confronto: q.get('confronto') !== '0',
    canale: q.get('canale') || null,
    campagna: q.get('campagna') || null,
  };
}

export function scriviVista(v) {
  const q = new URLSearchParams();
  if (v.periodo !== PREDEFINITA.periodo) q.set('periodo', v.periodo);
  if (!v.confronto) q.set('confronto', '0');
  if (v.canale) q.set('canale', v.canale);
  if (v.campagna) q.set('campagna', v.campagna);
  const s = q.toString();
  return `#${v.scheda}${s ? `?${s}` : ''}`;
}
```

Nota: `lib/cruscotto.mjs` importa `lib/archivio.mjs`, che non tocca né rete né Node: la pagina può importarlo (Vite lo impacchetta) senza portarsi dietro altro.

- [ ] **Step 4: Implementare `lib/grafici.mjs`**

```js
// Grafici SVG fatti a mano — docs/cruscotto-piano.md §4.6.
//
// Niente librerie: niente script di terzi su questo dominio, e i colori
// seguono i due temi del sito via CSS (classi g-*). Funzioni pure che
// restituiscono stringhe: si testano senza browser.
//
// Ogni valore che arriva dai dati passa da esc(): un nome di campagna è
// testo scritto da chiunque abbia costruito un link.

const SIMBOLI = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => SIMBOLI[c]);
const n1 = (v) => Number(v).toFixed(1);

const L = 640;
const A = 180;
const M = { sinistra: 8, destra: 8, alto: 16, basso: 22 };

function riquadroVuoto(larghezza, altezza, titolo) {
  return `<svg class="grafico" viewBox="0 0 ${larghezza} ${altezza}" role="img" aria-label="${esc(titolo)}: nessun dato">`
    + `<text class="g-vuoto" x="${larghezza / 2}" y="${altezza / 2}" text-anchor="middle">Nessun dato</text></svg>`;
}

export function linea({ punti, confronto = null, titolo = '', formato = String }) {
  const n = punti.length;
  const cfr = confronto ? confronto.slice(0, n) : null;
  const valori = [...punti, ...(cfr ?? [])].map((p) => p.y).filter((v) => v != null);
  if (!n || !punti.some((p) => p.y != null)) return riquadroVuoto(L, A, titolo);

  const massimo = Math.max(...valori, 0) || 1;
  const utile = L - M.sinistra - M.destra;
  const passo = n === 1 ? utile : utile / (n - 1);
  const x = (i) => (n === 1 ? M.sinistra + utile / 2 : M.sinistra + i * passo);
  const y = (v) => A - M.basso - (v / massimo) * (A - M.alto - M.basso);

  const tracciato = (pp) => {
    let d = '';
    let dentro = false;
    pp.forEach((p, i) => {
      if (p.y == null) { dentro = false; return; }
      d += `${dentro ? 'L' : 'M'}${n1(x(i))},${n1(y(p.y))}`;
      dentro = true;
    });
    return d;
  };
  // Un punto senza vicini non disegna nessuna linea: serve un cerchio.
  const isolati = punti.map((p, i) => (p.y != null && punti[i - 1]?.y == null && punti[i + 1]?.y == null
    ? `<circle class="g-punto" cx="${n1(x(i))}" cy="${n1(y(p.y))}" r="3"/>` : '')).join('');

  const fmt = (v) => (v == null ? '—' : formato(v));
  const zone = punti.map((p, i) => {
    const sx = Math.max(0, x(i) - passo / 2);
    const confrontoAttr = cfr ? ` data-confronto="${esc(fmt(cfr[i]?.y ?? null))}"` : '';
    return `<rect class="g-zona" x="${n1(sx)}" y="0" width="${n1(Math.min(passo, L))}" height="${A}" data-i="${i}" data-etichetta="${esc(p.x)}" data-valore="${esc(fmt(p.y))}"${confrontoAttr}><title>${esc(p.x)}: ${esc(fmt(p.y))}</title></rect>`;
  }).join('');

  return `<svg class="grafico" viewBox="0 0 ${L} ${A}" role="img" aria-label="${esc(titolo)}">`
    + `<title>${esc(titolo)}</title>`
    + `<line class="g-base" x1="${M.sinistra}" x2="${L - M.destra}" y1="${n1(y(0))}" y2="${n1(y(0))}"/>`
    + (cfr ? `<path class="g-confronto" d="${tracciato(cfr)}"/>` : '')
    + `<path class="g-linea" d="${tracciato(punti)}"/>${isolati}`
    + `<text class="g-asse" x="${M.sinistra}" y="${A - 6}">${esc(punti[0].x)}</text>`
    + `<text class="g-asse" x="${L - M.destra}" y="${A - 6}" text-anchor="end">${esc(punti[n - 1].x)}</text>`
    + `<text class="g-asse" x="${M.sinistra}" y="${M.alto - 4}">${esc(formato(massimo))}</text>`
    + zone
    + '</svg>';
}

export function minilinea(valori) {
  const larghezza = 96;
  const altezza = 24;
  const veri = valori.filter((v) => v != null);
  if (!veri.length) return `<svg class="minilinea" viewBox="0 0 ${larghezza} ${altezza}" aria-hidden="true"></svg>`;
  const massimo = Math.max(...veri, 0) || 1;
  const n = valori.length;
  const x = (i) => (n === 1 ? larghezza / 2 : (i * larghezza) / (n - 1));
  const y = (v) => altezza - 2 - (v / massimo) * (altezza - 4);
  let d = '';
  let dentro = false;
  valori.forEach((v, i) => {
    if (v == null) { dentro = false; return; }
    d += `${dentro ? 'L' : 'M'}${n1(x(i))},${n1(y(v))}`;
    dentro = true;
  });
  const solo = n === 1 ? `<circle class="g-punto" cx="${n1(x(0))}" cy="${n1(y(veri[0]))}" r="2"/>` : '';
  return `<svg class="minilinea" viewBox="0 0 ${larghezza} ${altezza}" aria-hidden="true"><path class="g-linea" d="${d}"/>${solo}</svg>`;
}

export function imbuto(gradini) {
  const alto = 46;
  const etichette = 150;
  const altezza = Math.max(alto, gradini.length * alto);
  if (!gradini.length) return riquadroVuoto(L, alto, 'Imbuto');
  const primo = gradini.find((g) => g.valore != null)?.valore ?? 0;
  const massimo = Math.max(primo, ...gradini.map((g) => g.valore ?? 0), 1);
  const utile = L - etichette - 70;
  const righe = gradini.map((g, i) => {
    const v = g.valore;
    const w = v == null ? 0 : Math.max(2, (v / massimo) * utile);
    const prima = gradini[i - 1]?.valore;
    const passaggio = i === 0 ? '' : prima == null || v == null || prima === 0 ? '—' : `${Math.round((v / prima) * 100)}%`;
    const top = i * alto;
    return `<g class="g-gradino">`
      + `<text class="g-nome" x="0" y="${top + 27}">${esc(g.nome)}</text>`
      + `<rect class="g-barra" x="${etichette}" y="${top + 8}" width="${n1(w)}" height="${alto - 16}" rx="4"/>`
      + `<text class="g-valore" x="${n1(etichette + w + 8)}" y="${top + 27}">${v == null ? '—' : esc(v)}</text>`
      + (i ? `<text class="g-passaggio" x="${L}" y="${top + 27}" text-anchor="end">${passaggio}</text>` : '')
      + '</g>';
  }).join('');
  return `<svg class="grafico imbuto" viewBox="0 0 ${L} ${altezza}" role="img" aria-label="Imbuto"><title>Imbuto</title>${righe}</svg>`;
}
```

- [ ] **Step 5: Eseguire e vedere passare**

Run: `node --test lib/grafici.test.mjs lib/vista.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: `pass 14`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add lib/grafici.mjs lib/grafici.test.mjs lib/vista.mjs lib/vista.test.mjs
git commit -m "feat(cruscotto): grafici SVG fatti a mano e lo stato della vista nell'indirizzo"
```

---

### Compito 8: la pagina

**Files:**
- Create: `cruscotto.html`, `cruscotto.js`, `cruscotto.css`
- Modify: `vite.config.js` (entry `cruscotto`), `public/_headers` (regola `/cruscotto`)
- Modify: `scripts/analytics/cruscotto.mjs:370-371`, `scripts/analytics/indicizzazione.mjs:12,21`, `.gitignore` (`cruscotto/` → `cruscotto-locale/`)
- Test: nessun test automatico nuovo (la logica sta nei moduli dei Compiti 3-7); verifica visiva allo Step 7.

**Interfaces:**
- Consumes: `GET /api/cruscotto?periodo&confronto` (Compito 6, forma di `componi`); `linea`, `minilinea`, `imbuto`, `esc` (Compito 7); `leggiVista`, `scriviVista` (Compito 7); `numero`, `variazione`, `SOGLIE` (Compito 4); `famiglia` (esistente).
- Produces: la rotta statica `/cruscotto`.

- [ ] **Step 1: La cartella locale cambia nome**

```bash
cd /Users/alessandroterracciano/Developer/quotify-website
sed -i '' "s#resolve(RADICE, 'cruscotto')#resolve(RADICE, 'cruscotto-locale')#; s#resolve(RADICE, 'cruscotto/index.html')#resolve(RADICE, 'cruscotto-locale/index.html')#" scripts/analytics/cruscotto.mjs
sed -i '' "s#cruscotto/indicizzazione.json#cruscotto-locale/indicizzazione.json#g" scripts/analytics/indicizzazione.mjs
sed -i '' 's#^cruscotto/$#cruscotto-locale/#' .gitignore
[ -d cruscotto ] && mv cruscotto cruscotto-locale
grep -n "cruscotto" .gitignore scripts/analytics/cruscotto.mjs scripts/analytics/indicizzazione.mjs | grep -v "cruscotto-locale\|cruscotto.mjs\|npm run cruscotto" ; ls cruscotto-locale
```
Expected: nessuna riga dal `grep` (resta solo `cruscotto-locale`), e `ls` mostra `index.html  indicizzazione.json`.

- [ ] **Step 2: `cruscotto.html`**

Fuori dal registro delle pagine (`data/pagine.json`) di proposito: niente Open Graph, niente beacon di Cloudflare (le aperture del proprietario non sono traffico), niente sitemap.

```html
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow" />
    <!-- Prima di tutto: il tema salvato, senza lampi. -->
    <script src="/tema.js"></script>
    <title>Cruscotto di quotify.it — sito, ricerca e app</title>
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <script type="module" src="/cruscotto.js"></script>
  </head>
  <body>
    <header class="testa">
      <div class="testa-riga">
        <h1>Cruscotto</h1>
        <span class="aggiornato" data-aggiornato></span>
        <button type="button" class="tasto-tema" data-tema-tasto aria-label="Cambia tema">◐</button>
      </div>
      <div class="comandi">
        <div class="periodi" role="group" aria-label="Periodo">
          <button type="button" data-periodo="7">7 g</button>
          <button type="button" data-periodo="28">28 g</button>
          <button type="button" data-periodo="90">90 g</button>
          <button type="button" data-periodo="365">12 mesi</button>
          <button type="button" data-periodo="tutto">Tutto</button>
        </div>
        <label class="confronto"><input type="checkbox" data-confronto checked /> confronta</label>
      </div>
      <div class="filtro" data-filtro hidden></div>
    </header>

    <main>
      <p class="stato" data-stato role="status">Carico…</p>
      <section data-scheda="oggi" hidden></section>
      <section data-scheda="marketing" hidden></section>
      <section data-scheda="imbuto" hidden></section>
    </main>

    <nav class="schede" aria-label="Schede">
      <a href="#oggi" data-vai="oggi">Oggi</a>
      <a href="#marketing" data-vai="marketing">Marketing</a>
      <a href="#imbuto" data-vai="imbuto">Imbuto</a>
    </nav>
  </body>
</html>
```

- [ ] **Step 3: `cruscotto.css`**

```css
/* Cruscotto — docs/cruscotto-piano.md §4.6. Prima il telefono.
   I colori sono token: il tema scuro è il predefinito del sito (tema.js),
   il chiaro si attiva con data-tema="chiaro". */

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 300 900;
  font-display: swap;
  src: url('/fonts/inter-latin-v20.woff2') format('woff2');
}

:root {
  --sfondo: #0b1120;
  --carta: #111a2e;
  --bordo: #1f2b45;
  --testo: #e6eaf3;
  --tenue: #8c98b2;
  --primario: #5b93ff;
  --confronto: #4b5670;
  --su: #3ccf6e;
  --giu: #ff7a6b;
  --avviso: #f5b13d;
  color-scheme: dark;
}
html[data-tema='chiaro'] {
  --sfondo: #f5f7fb;
  --carta: #ffffff;
  --bordo: #e2e7f0;
  --testo: #0f172a;
  --tenue: #5a6479;
  --primario: #236cef;
  --confronto: #b7c0d0;
  --su: #15803d;
  --giu: #c2410c;
  --avviso: #b45309;
  color-scheme: light;
}

* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--sfondo);
  color: var(--testo);
  font: 15px/1.45 Inter, system-ui, -apple-system, sans-serif;
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
h1 { font-size: 1.15rem; margin: 0; }
h2 { font-size: 0.95rem; margin: 0 0 0.6rem; color: var(--tenue); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
a { color: var(--primario); }
button { font: inherit; color: inherit; }

.testa { position: sticky; top: 0; z-index: 5; background: var(--sfondo); border-bottom: 1px solid var(--bordo); padding: 10px 16px 8px; }
.testa-riga { display: flex; align-items: center; gap: 10px; }
.aggiornato { color: var(--tenue); font-size: 0.8rem; margin-left: auto; }
.tasto-tema { background: none; border: 1px solid var(--bordo); border-radius: 8px; padding: 2px 8px; cursor: pointer; }
.comandi { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
.periodi { display: flex; gap: 4px; overflow-x: auto; }
.periodi button { background: var(--carta); border: 1px solid var(--bordo); border-radius: 999px; padding: 4px 10px; font-size: 0.85rem; white-space: nowrap; cursor: pointer; }
.periodi button[aria-pressed='true'] { background: var(--primario); border-color: var(--primario); color: #fff; }
.confronto { font-size: 0.85rem; color: var(--tenue); display: flex; align-items: center; gap: 4px; }
.filtro { margin-top: 8px; font-size: 0.85rem; }
.filtro button { background: var(--carta); border: 1px solid var(--primario); border-radius: 999px; padding: 2px 10px; cursor: pointer; }

main { padding: 12px 16px; max-width: 1100px; margin: 0 auto; }
.stato { color: var(--tenue); }
.stato.errore { color: var(--giu); }
section { display: grid; gap: 14px; }

.riquadro { background: var(--carta); border: 1px solid var(--bordo); border-radius: 14px; padding: 14px; min-width: 0; }
.cifre { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
@media (min-width: 760px) { .cifre { grid-template-columns: repeat(4, minmax(0, 1fr)); } .due { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } }
.cifra .nome { color: var(--tenue); font-size: 0.8rem; }
.cifra .valore { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.02em; }
.cifra .delta { font-size: 0.8rem; color: var(--tenue); }
.delta.su { color: var(--su); }
.delta.giu { color: var(--giu); }
.nota { color: var(--tenue); font-size: 0.8rem; margin: 6px 0 0; }
.attesa { color: var(--avviso); font-size: 0.85rem; }

.frasi { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.frasi a { color: var(--testo); text-decoration: none; display: block; padding: 8px 10px; border-radius: 10px; background: color-mix(in srgb, var(--primario) 10%, transparent); }

.grafico { width: 100%; height: auto; display: block; }
.g-linea { fill: none; stroke: var(--primario); stroke-width: 2; stroke-linejoin: round; }
.g-confronto { fill: none; stroke: var(--confronto); stroke-width: 1.5; stroke-dasharray: 4 3; }
.g-punto { fill: var(--primario); }
.g-base { stroke: var(--bordo); }
.g-asse, .g-vuoto { fill: var(--tenue); font-size: 11px; }
.g-zona { fill: transparent; cursor: crosshair; }
.g-zona:hover { fill: color-mix(in srgb, var(--primario) 10%, transparent); }
.g-barra { fill: var(--primario); }
.g-nome, .g-valore, .g-passaggio { fill: var(--testo); font-size: 13px; }
.g-passaggio { fill: var(--tenue); }
.minilinea { width: 96px; height: 24px; display: block; margin-top: 4px; }
.minilinea .g-linea { stroke-width: 1.5; }
.lettura { font-size: 0.85rem; color: var(--tenue); min-height: 1.3em; margin-top: 4px; }

.tabella { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--bordo); white-space: nowrap; }
th { color: var(--tenue); font-weight: 600; font-size: 0.78rem; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
tr[data-canale], tr[data-campagna] { cursor: pointer; }
tr[data-canale]:hover, tr[data-campagna]:hover { background: color-mix(in srgb, var(--primario) 8%, transparent); }
.si { color: var(--su); }
.no { color: var(--giu); }

.salute { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 0.85rem; }
.chip { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.chip button { background: var(--carta); border: 1px solid var(--bordo); border-radius: 999px; padding: 3px 10px; font-size: 0.85rem; cursor: pointer; }
.chip button[aria-pressed='true'] { border-color: var(--primario); color: var(--primario); }

.schede { position: fixed; inset: auto 0 0 0; display: flex; background: var(--carta); border-top: 1px solid var(--bordo); padding-bottom: env(safe-area-inset-bottom); z-index: 6; }
.schede a { flex: 1; text-align: center; padding: 14px 0; color: var(--tenue); text-decoration: none; font-weight: 600; }
.schede a[aria-current='page'] { color: var(--primario); }
```

- [ ] **Step 4: `cruscotto.js`**

```js
// Il cruscotto — docs/cruscotto-piano.md §4.
//
// Un guscio: chiede /api/cruscotto e disegna. Nessun dato sta nella pagina.
// Lo stato sta nell'indirizzo (lib/vista.mjs). Toccare una riga filtra sui
// dati già scaricati: non fa richieste.

import './cruscotto.css';
import { linea, minilinea, imbuto, esc } from './lib/grafici.mjs';
import { leggiVista, scriviVista } from './lib/vista.mjs';
import { numero, variazione, SOGLIE } from './lib/osservazioni.mjs';
import { famiglia } from './lib/attribuzione.mjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const memoria = new Map();
let vista = leggiVista(location.hash);

// ── formati ───────────────────────────────────────────────────────────────
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const giornoBreve = (g) => `${Number(g.slice(8, 10))} ${MESI[Number(g.slice(5, 7)) - 1]}`;
const euro = (c) => (c == null ? '—' : `€ ${numero(c / 100)}`);
const percento = (x) => (x == null ? '—' : `${numero(x * 100)}%`);
const MESSAGGI_APP = { 'in-attesa': 'in attesa dell\'app', errore: 'app non raggiungibile' };

function delta(attuale, precedente, soglia) {
  if (!vista.confronto) return '';
  const v = variazione(attuale, precedente, soglia);
  if (!v) return '<span class="delta">—</span>';
  const verso = v.rapporto > 0 ? 'su' : v.rapporto < 0 ? 'giu' : '';
  return `<span class="delta ${verso}">${v.rapporto > 0 ? '▲' : v.rapporto < 0 ? '▼' : ''} ${v.testo}</span>`;
}

const tabella = (intestazioni, righe) => `<div class="tabella"><table><thead><tr>${intestazioni
  .map(([t, n]) => `<th${n ? ' class="n"' : ''}>${esc(t)}</th>`).join('')}</tr></thead><tbody>${righe.join('') || `<tr><td colspan="${intestazioni.length}">Niente in questo periodo</td></tr>`}</tbody></table></div>`;
const cella = (v, n = false) => `<td${n ? ' class="n"' : ''}>${v}</td>`;

const figura = (svg) => `<figure class="grafico-con-lettura" style="margin:0">${svg}<div class="lettura" aria-live="polite"></div></figure>`;

// ── dati ──────────────────────────────────────────────────────────────────
async function carica() {
  const chiave = `${vista.periodo}|${vista.confronto ? 1 : 0}`;
  if (memoria.has(chiave)) return memoria.get(chiave);
  let r;
  try {
    r = await fetch(`/api/cruscotto?periodo=${vista.periodo}&confronto=${vista.confronto ? 1 : 0}`, {
      credentials: 'same-origin', headers: { Accept: 'application/json' },
    });
  } catch {
    // Con la sessione di Access scaduta la richiesta viene rimandata alla
    // pagina di accesso su un altro dominio, e il browser la blocca qui.
    throw new Error('Sessione scaduta o rete assente: ricarica la pagina.');
  }
  if (r.status === 403) throw new Error('Accesso negato: ricarica la pagina per rientrare.');
  if (r.status === 503) throw new Error('Archivio non disponibile in questo momento.');
  if (!r.ok) throw new Error(`Il cruscotto non ha risposto (${r.status}).`);
  const d = await r.json();
  memoria.set(chiave, d);
  return d;
}

// ── scheda Oggi ───────────────────────────────────────────────────────────
function cifra(nome, valore, formato, campo, d, soglia, conLinea = true) {
  const att = d.totali[campo];
  const prec = d.totaliPrecedente?.[campo] ?? null;
  const assente = att == null && ['iscritti', 'nuoviPro', 'ricavoMensileCentesimi'].includes(campo);
  return `<div class="riquadro cifra"><div class="nome">${esc(nome)}</div>
    <div class="valore">${assente ? '—' : formato(valore)}</div>
    ${assente ? `<div class="attesa">${MESSAGGI_APP[d.fonti.app] ?? ''}</div>` : (soglia != null ? delta(att, prec, soglia) : '')}
    ${conLinea && !assente ? minilinea(d.serie.map((s) => s[campo] ?? null)) : ''}</div>`;
}

function oreDelGiorno(righe) {
  const perOra = new Map(righe.map((r) => [new Date(r.ora).getUTCHours(), r.visite]));
  return Array.from({ length: 24 }, (_, h) => perOra.get(h) ?? null);
}

function disegnaOggi(d) {
  const t = d.totali;
  const cifre = `<div class="cifre">
    ${cifra('Visite', t.visite, numero, 'visite', d, SOGLIE.visite)}
    ${cifra('Iscritti', t.iscritti, numero, 'iscritti', d, SOGLIE.iscritti)}
    ${cifra('Nuovi Pro', t.nuoviPro, numero, 'nuoviPro', d, SOGLIE.iscritti)}
    ${cifra('Ricavo mensile', t.ricavoMensileCentesimi, euro, 'ricavoMensileCentesimi', d, null, false)}
  </div>`;

  const frasi = `<div class="riquadro"><h2>Cosa è cambiato</h2><ul class="frasi">${d.osservazioni
    .map((f) => `<li><a href="${esc(f.link)}">${esc(f.testo)}</a></li>`).join('')}</ul></div>`;

  const andamento = `<div class="riquadro"><h2>Visite per giorno</h2>${figura(linea({
    punti: d.serie.map((s) => ({ x: giornoBreve(s.giorno), y: s.visite })),
    confronto: vista.confronto && d.seriePrecedente ? d.seriePrecedente.map((s) => ({ x: giornoBreve(s.giorno), y: s.visite })) : null,
    titolo: 'Visite per giorno', formato: numero,
  }))}${d.primi.cloudflare && d.primi.cloudflare > d.periodo.da
    ? `<p class="nota">Le visite sono archiviate dal ${giornoBreve(d.primi.cloudflare)}: prima di allora il grafico è vuoto, non a zero.</p>` : ''}</div>`;

  const ora = new Date();
  // Le ore arrivano in UTC; l'etichetta è nell'ora del telefono, calcolata sul
  // giorno di oggi (con una data fissa sbaglierebbe di un'ora con l'ora legale).
  const etichettaOra = (h) => `${String(new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth(), ora.getUTCDate(), h)).getHours()).padStart(2, '0')}:00`;
  const giornata = `<div class="riquadro"><h2>Oggi, ora per ora</h2>${d.oggi
    ? figura(linea({
      punti: oreDelGiorno(d.oggi.perOra).map((v, h) => ({ x: etichettaOra(h), y: h <= ora.getUTCHours() ? v ?? 0 : null })),
      confronto: oreDelGiorno(d.oggi.ieriPerOra).map((v, h) => ({ x: etichettaOra(h), y: v ?? 0 })),
      titolo: 'Visite di oggi, ora per ora, con ieri tratteggiato', formato: numero,
    }))
    : '<p class="attesa">Cloudflare non ha risposto: niente dati di oggi.</p>'}</div>`;

  const s = d.salute;
  const indicizzate = d.indice.pagine.filter((p) => p.indicizzata).length;
  const fonti = s.fonti[0] ?? {};
  const v = s.vitals;
  const salute = `<div class="riquadro"><h2>Salute</h2><div class="salute">
    <span>Indice: <strong>${indicizzate}/${d.indice.pagine.length}</strong>${d.indice.ultima ? ` (${giornoBreve(d.indice.ultima)})` : ''}</span>
    <span>LCP ${v?.lcp != null ? `<strong class="${v.lcp <= 2500 ? 'si' : 'no'}">${numero(v.lcp)} ms</strong>` : '—'}</span>
    <span>INP ${v?.inp != null ? `<strong class="${v.inp <= 200 ? 'si' : 'no'}">${numero(v.inp)} ms</strong>` : '—'}</span>
    <span>CLS ${v?.cls != null ? `<strong class="${v.cls <= 0.1 ? 'si' : 'no'}">${v.cls.toFixed(2).replace('.', ',')}</strong>` : '—'}</span>
    <span>Notte del ${fonti.giorno ? giornoBreve(fonti.giorno) : '—'}: Cloudflare ${fonti.cloudflare === 'errore' ? '<strong class="no">errore</strong>' : 'ok'}, Google ${fonti.google === 'errore' || fonti.ricerca === 'errore' ? '<strong class="no">errore</strong>' : 'ok'}</span>
    <span>Search Console fino al ${s.ultimoGiornoGoogle ? giornoBreve(s.ultimoGiornoGoogle) : '—'}</span>
    <span>App: ${d.fonti.app === 'ok' ? 'ok' : `<span class="attesa">${MESSAGGI_APP[d.fonti.app]}</span>`}</span>
  </div></div>`;

  return cifre + frasi + andamento + `<div class="due">${giornata}${salute}</div>`;
}

// ── scheda Marketing ──────────────────────────────────────────────────────
function disegnaMarketing(d) {
  const { canale, campagna } = vista;
  const utm = d.visiteUtm.filter((v) => (!canale || famiglia(v.sorgente) === canale) && (!campagna || v.campagna === campagna));

  let andamento;
  if (canale || campagna) {
    const perGiorno = new Map();
    for (const v of utm) perGiorno.set(v.giorno, (perGiorno.get(v.giorno) ?? 0) + v.n);
    andamento = `<div class="riquadro"><h2>Visite attribuite per giorno</h2>${figura(linea({
      punti: d.serie.map((s) => ({ x: giornoBreve(s.giorno), y: perGiorno.get(s.giorno) ?? 0 })),
      titolo: 'Visite attribuite per giorno', formato: numero,
    }))}</div>`;
  } else {
    andamento = `<div class="riquadro"><h2>Pagine viste per giorno</h2>${figura(linea({
      punti: d.serie.map((s) => ({ x: giornoBreve(s.giorno), y: s.pagineViste })),
      confronto: vista.confronto && d.seriePrecedente ? d.seriePrecedente.map((s) => ({ x: giornoBreve(s.giorno), y: s.pagineViste })) : null,
      titolo: 'Pagine viste per giorno', formato: numero,
    }))}</div>`;
  }

  const appNota = d.fonti.app === 'ok' ? '' : `<p class="nota">Iscritti e paganti: ${MESSAGGI_APP[d.fonti.app]}.</p>`;
  const canali = `<div class="riquadro"><h2>Canali</h2>${tabella(
    [['Canale'], ['Pagine viste', 1], ['Visite con UTM', 1], ['Iscritti', 1], ['Paganti', 1]],
    d.canali.map((c) => `<tr data-canale="${esc(c.famiglia)}">${cella(esc(c.famiglia))}${cella(numero(c.pagineViste), 1)}${cella(numero(c.visiteUtm), 1)}${cella(numero(c.iscritti), 1)}${cella(numero(c.paganti), 1)}</tr>`),
  )}${appNota}<p class="nota">Cloudflare dà le pagine viste per provenienza, non le visite.</p></div>`;

  const campagne = d.campagne.filter((c) => !canale || famiglia(c.sorgente) === canale);
  const tabCampagne = `<div class="riquadro"><h2>Campagne</h2>${tabella(
    [['Sorgente'], ['Mezzo'], ['Campagna'], ['Visite', 1], ['Iscritti', 1], ['Paganti', 1]],
    campagne.map((c) => `<tr data-campagna="${esc(c.campagna ?? '')}">${cella(esc(c.sorgente ?? '—'))}${cella(esc(c.mezzo ?? '—'))}${cella(esc(c.campagna ?? '—'))}${cella(numero(c.visite), 1)}${cella(numero(c.iscritti), 1)}${cella(numero(c.paganti), 1)}</tr>`),
  )}</div>`;

  let dettaglio = '';
  if (campagna) {
    const conta = (campo) => {
      const m = new Map();
      for (const v of utm) m.set(v[campo] ?? '—', (m.get(v[campo] ?? '—') ?? 0) + v.n);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    dettaglio = `<div class="due"><div class="riquadro"><h2>Pagine d'arrivo</h2>${tabella([['Pagina'], ['Visite', 1]],
      conta('percorso').map(([k, n]) => `<tr>${cella(esc(k))}${cella(numero(n), 1)}</tr>`))}</div>
      <div class="riquadro"><h2>Paesi</h2>${tabella([['Paese'], ['Visite', 1]],
      conta('paese').map(([k, n]) => `<tr>${cella(esc(k))}${cella(numero(n), 1)}</tr>`))}</div></div>`;
  }

  const r = d.ricerca;
  const ricerca = `<div class="riquadro"><h2>Ricerca Google</h2>${figura(linea({
    punti: d.serie.map((s) => ({ x: giornoBreve(s.giorno), y: s.clic })),
    confronto: vista.confronto && d.seriePrecedente ? d.seriePrecedente.map((s) => ({ x: giornoBreve(s.giorno), y: s.clic })) : null,
    titolo: 'Clic da Google per giorno', formato: numero,
  }))}<p class="nota">Clic ${numero(d.totali.clic)} · impressioni ${numero(d.totali.impressioni)} ${delta(d.totali.clic, d.totaliPrecedente?.clic ?? null, SOGLIE.clic)}.
    I giorni di Search Console sono in ora del Pacifico, quelli di Cloudflare in UTC. Google nasconde le ricerche rare: le righe sommano meno del totale.</p>
    <div class="due"><div>${tabella([['Ricerca'], ['Clic', 1], ['Impr.', 1], ['Pos.', 1]],
      r.query.map((q) => `<tr>${cella(esc(q.chiave))}${cella(numero(q.clic), 1)}${cella(numero(q.impressioni), 1)}${cella(numero(q.posizione), 1)}</tr>`))}</div>
    <div>${tabella([['Pagina'], ['Clic', 1], ['Impr.', 1], ['Pos.', 1]],
      r.pagine.map((p) => `<tr>${cella(esc(p.chiave))}${cella(numero(p.clic), 1)}${cella(numero(p.impressioni), 1)}${cella(numero(p.posizione), 1)}</tr>`))}</div></div></div>`;

  const occasioni = r.occasioni.length ? `<div class="riquadro"><h2>Occasioni</h2>${tabella([['Pagina'], ['Impr.', 1], ['CTR', 1], ['Pos.', 1]],
    r.occasioni.map((p) => `<tr>${cella(esc(p.chiave))}${cella(numero(p.impressioni), 1)}${cella(percento(p.ctr), 1)}${cella(numero(p.posizione), 1)}</tr>`))}
    <p class="nota">Molte impressioni, pochi clic: un titolo o una descrizione migliori rendono di più qui.</p></div>` : '';

  const indice = `<div class="riquadro"><h2>Indicizzazione</h2>${tabella([['Pagina'], ['Stato'], ['Dal']],
    d.indice.pagine.map((p) => `<tr>${cella(esc(p.percorso))}${cella(`<span class="${p.indicizzata ? 'si' : 'no'}">${esc(p.stato)}</span>`)}${cella(giornoBreve(p.dal))}</tr>`))}</div>`;

  return andamento + canali + tabCampagne + dettaglio + ricerca + occasioni + indice;
}

// ── scheda Imbuto ─────────────────────────────────────────────────────────
function disegnaImbuto(d) {
  if (!d.imbuto) {
    return `<div class="riquadro"><h2>Imbuto</h2><p class="attesa">L'imbuto ha bisogno dei numeri dell'app: ${MESSAGGI_APP[d.fonti.app] ?? 'non disponibili'}.</p></div>`;
  }
  const canali = Object.keys(d.imbuto.perCanale).sort();
  const scelto = vista.canale && d.imbuto.perCanale[vista.canale] ? vista.canale : null;
  const gradini = scelto ? d.imbuto.perCanale[scelto] : d.imbuto.gradini;
  const scelte = `<div class="chip" role="group" aria-label="Canale">${['', ...canali].map((c) =>
    `<button type="button" data-imbuto-canale="${esc(c)}" aria-pressed="${(c || null) === scelto}">${esc(c || 'Tutti')}</button>`).join('')}</div>`;
  return `<div class="riquadro"><h2>Dalla visita al pagamento</h2>${scelte}${imbuto(gradini)}
    <p class="nota">Coorte: gli iscritti nel periodo, con il loro stato di oggi. Mediana fra iscrizione e primo pagamento: ${d.imbuto.medianaGiorniAlPagamento == null ? '—' : `${numero(d.imbuto.medianaGiorniAlPagamento)} giorni`}.</p>
    <p class="nota">«Provenienza sconosciuta»: chi si è iscritto prima che l'app salvasse la provenienza, o chi è arrivato passando da più pagine del sito (senza cookie la provenienza vale solo per il salto diretto).</p></div>`;
}

// ── disegno e comandi ─────────────────────────────────────────────────────
const DISEGNI = { oggi: disegnaOggi, marketing: disegnaMarketing, imbuto: disegnaImbuto };

function aggiornaComandi() {
  $$('[data-periodo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.periodo === vista.periodo)));
  $('[data-confronto]').checked = vista.confronto;
  $$('[data-vai]').forEach((a) => {
    a.href = scriviVista({ ...vista, scheda: a.dataset.vai });
    if (a.dataset.vai === vista.scheda) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const filtro = $('[data-filtro]');
  const etichetta = [vista.canale && `canale: ${vista.canale}`, vista.campagna && `campagna: ${vista.campagna}`].filter(Boolean).join(' · ');
  filtro.hidden = !etichetta;
  filtro.innerHTML = etichetta ? `<button type="button" data-togli-filtro>${esc(etichetta)} ✕</button>` : '';
  $$('[data-scheda]').forEach((s) => { s.hidden = s.dataset.scheda !== vista.scheda; });
}

async function aggiorna() {
  vista = leggiVista(location.hash);
  aggiornaComandi();
  const stato = $('[data-stato]');
  stato.className = 'stato';
  stato.textContent = 'Carico…';
  stato.hidden = false;
  try {
    const d = await carica();
    $('[data-aggiornato]').textContent = `aggiornato alle ${new Date(d.generato).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    $(`[data-scheda="${vista.scheda}"]`).innerHTML = DISEGNI[vista.scheda](d);
    stato.hidden = true;
  } catch (e) {
    stato.className = 'stato errore';
    stato.textContent = e.message;
  }
}

const vai = (cambi) => { location.hash = scriviVista({ ...vista, ...cambi }); };

document.addEventListener('click', (e) => {
  const t = e.target;
  const periodo = t.closest('[data-periodo]');
  if (periodo) return vai({ periodo: periodo.dataset.periodo });
  if (t.closest('[data-togli-filtro]')) return vai({ canale: null, campagna: null });
  const imb = t.closest('[data-imbuto-canale]');
  if (imb) return vai({ canale: imb.dataset.imbutoCanale || null });
  const riga = t.closest('tr[data-canale], tr[data-campagna]');
  if (riga?.dataset.canale) return vai({ scheda: 'marketing', canale: riga.dataset.canale, campagna: null });
  if (riga?.dataset.campagna) return vai({ scheda: 'marketing', campagna: riga.dataset.campagna });
  const zona = t.closest('.g-zona');
  if (zona) leggi(zona);
  if (t.closest('[data-tema-tasto]')) cambiaTema();
});
document.addEventListener('pointerover', (e) => {
  const zona = e.target.closest?.('.g-zona');
  if (zona) leggi(zona);
});
$('[data-confronto]').addEventListener('change', (e) => vai({ confronto: e.target.checked }));
window.addEventListener('hashchange', aggiorna);

/** Il valore sotto il dito o il cursore, scritto sotto il grafico. */
function leggi(zona) {
  const lettura = zona.closest('figure')?.querySelector('.lettura');
  if (!lettura) return;
  const { etichetta, valore, confronto } = zona.dataset;
  lettura.textContent = `${etichetta}: ${valore}${confronto != null ? ` (prima: ${confronto})` : ''}`;
}

function cambiaTema() {
  const radice = document.documentElement;
  const nuovo = radice.dataset.tema === 'scuro' ? 'chiaro' : 'scuro';
  radice.dataset.tema = nuovo;
  try { localStorage.setItem('quotify:tema', nuovo); } catch { /* memoria non disponibile */ }
}

aggiorna();
```

- [ ] **Step 5: Build, intestazioni e gate**

In `vite.config.js`, sostituire il blocco `input:` con:

```js
      // Le entry vengono dal registro: aggiungere una pagina qui a mano era il
      // quarto posto da ricordare, ed è quello che fa fallire il build in modo
      // silenzioso — la pagina semplicemente non viene costruita.
      // Il cruscotto è l'unica eccezione, di proposito: non è una pagina del
      // sito (niente sitemap, niente Open Graph, niente beacon), quindi non
      // sta nel registro. docs/cruscotto-piano.md §4.6.
      input: {
        ...Object.fromEntries(
          registro.pagine.map((v) => [
            v.url === '/' ? 'main' : v.url.slice(1).replace(/\//g, '-'),
            resolve(__dirname, v.file),
          ]),
        ),
        cruscotto: resolve(__dirname, 'cruscotto.html'),
      },
```

In `public/_headers`, **dopo** il marcatore `<!-- generato:cache:fine -->` (fuori dal blocco generato, che `npm run gen` riscrive):

```
# ── Cruscotto: privato, mai in cache, mai nell'indice ──
/cruscotto
  Cache-Control: no-store
  X-Robots-Tag: noindex, nofollow
```

Run:
```bash
npm run build 2>&1 | tail -8 && ls dist/cruscotto.html && grep -c "cruscotto" dist/sitemap.xml dist/llms.txt
```
Expected: `✔ Gate SEO superato`; `dist/cruscotto.html` esiste; `0` occorrenze in sitemap e `llms.txt`. Se il gate ferma il build per una regola su `cruscotto.html`: correggere il markup se la regola ha senso per una pagina privata; se non ce l'ha, scrivere una `Ruling` nel registro e aggiungere l'eccezione più stretta possibile in `scripts/seo/lib.mjs` (`CONFIG`), con un commento che rimandi a questo compito.

Run anche `npm run gen -- --verifica 2>&1 | tail -3` — Expected: tutto `allineato` (il blocco generato di `_headers` non è stato toccato).

- [ ] **Step 6: Dati d'esempio per vedere la pagina**

Scrivere nello scratchpad `esempio-cruscotto.mjs` (non va nel repository):

```js
// Produce una risposta realistica di /api/cruscotto passando dal codice vero
// (rispondi → componi) con un D1 in memoria e una rete finta.
import { writeFileSync } from 'node:fs';
import { apriInMemoria } from '/Users/alessandroterracciano/Developer/quotify-website/lib/d1-in-memoria.mjs';
import { rispondi } from '/Users/alessandroterracciano/Developer/quotify-website/lib/cruscotto-api.mjs';

const db = apriInMemoria();
const ADESSO = Date.parse('2026-11-20T15:30:00Z');
const sp = (g, n) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
for (let i = 120; i >= 1; i--) {
  const g = sp('2026-11-20', -i);
  const v = Math.round(8 + 6 * Math.sin(i / 5) + (120 - i) / 6);
  const dati = { cloudflare: {
    provenienze: [{ chiave: '', viste: v * 2 }, { chiave: 'www.google.com', viste: v }, { chiave: 'www.linkedin.com', viste: Math.round(v / 3) }, ...(i < 6 ? [{ chiave: 'reddit.com', viste: 2 }] : [])],
    pagine: [{ chiave: '/', viste: v * 2 }, { chiave: '/guide', viste: v }], paesi: [{ chiave: 'IT', viste: v * 3 }],
    vitals: { lcp: 1800, inp: 120, cls: 0.02 } }, fonti: { cloudflare: 'ok', google: 'ok' } };
  db.tutte(`INSERT INTO storico (giorno, preso_il, visite, pagine_viste, clic, impressioni, posizione, dati) VALUES ('${g}', 'x', ${i === 40 ? 'NULL' : v}, ${i === 40 ? 'NULL' : v * 3}, ${Math.round(v / 4)}, ${v * 12}, 14.2, '${JSON.stringify(dati)}') RETURNING giorno`);
  db.tutte(`INSERT INTO ricerca VALUES ('${g}', 'query', 'regime forfettario', ${Math.round(v / 6)}, ${v * 4}, 12), ('${g}', 'query', 'calcolo tasse forfettario', 1, ${v * 3}, 18), ('${g}', 'pagina', '/calcolo-tasse-forfettario', 0, ${v * 6}, 9), ('${g}', 'pagina', '/', ${Math.round(v / 4)}, ${v * 5}, 6) RETURNING giorno`);
  if (i < 15) db.tutte(`INSERT INTO visite (quando, giorno, percorso, sorgente, mezzo, campagna, paese) VALUES ('x', '${g}', '/guide/preventivi', 'linkedin', 'social', 'lancio-novembre', 'IT') RETURNING id`);
}
const esiti = (s) => ['/', '/guide', '/assistenza', '/privacy'].map((p) => ({ url: `https://quotify.it${p}`, stato: s(p) }));
db.tutte(`INSERT INTO storico (giorno, preso_il, indicizzate, dati) VALUES ('2026-11-16', 'x', 3, '${JSON.stringify({ indicizzazione: esiti((p) => (p === '/privacy' ? 'Rilevata, ma attualmente non indicizzata' : 'Inviata e indicizzata')) })}') ON CONFLICT(giorno) DO UPDATE SET indicizzate = 3, dati = json_patch(storico.dati, excluded.dati) RETURNING giorno`);

const ore = Array.from({ length: 40 }, (_, h) => ({ count: 3, sum: { visits: 1 + (h % 4) }, dimensions: { datetimeHour: new Date(Date.parse('2026-11-19T00:00:00Z') + h * 36e5).toISOString().replace('.000', '') } }));
const app = { versione: 1, generato: 'x', giorni: [], coorte: [
  { sorgente: 'linkedin', mezzo: 'social', campagna: 'lancio-novembre', rif: 'www.linkedin.com', iscritti: 4, attivati: 3, pro: 1, paganti: 1 },
  { sorgente: 'sito', mezzo: 'guida', campagna: 'clienti', rif: 'www.google.com', iscritti: 6, attivati: 2, pro: 1, paganti: 0 },
  { sorgente: null, mezzo: null, campagna: null, rif: null, iscritti: 9, attivati: 2, pro: 0, paganti: 0 },
], totali: { utenti: 120, pro: 14, paganti: 6, ricavoMensileCentesimi: 5940 }, eventi: [], medianaGiorniAlPagamento: 6 };
const f = async (url) => (String(url).includes('graphql')
  ? Response.json({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: ore }] } } })
  : Response.json(app));
const r = await rispondi({ request: new Request(`https://quotify.it/api/cruscotto?${process.argv[2] ?? 'periodo=28&confronto=1'}`), env: { DB: db, CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'a', RIASSUNTO_CHIAVE: 'k' }, adesso: ADESSO, fetch: f, verifica: async () => ({}) });
writeFileSync(process.argv[3] ?? 'esempio.json', await r.text());
console.log(r.status);
```

Run (nello scratchpad):
```bash
cd <scratchpad> && node --no-warnings esempio-cruscotto.mjs 'periodo=28&confronto=1' esempio.json && node -e "const d=require('./esempio.json');console.log(d.fonti, d.serie.length, d.osservazioni.map(o=>o.testo))"
```
Expected: `200`, fonti tutte `ok`, `28`, e almeno una frase diversa da «senza scossoni».

- [ ] **Step 7: Verifica visiva**

Con `npx vite --port 5179` avviato in background nella radice del repository, aprire `http://localhost:5179/cruscotto.html#oggi` con Playwright, intercettando `/api/cruscotto*` per rispondere con `esempio.json` (`page.route('**/api/cruscotto*', r => r.fulfill({ path: '<scratchpad>/esempio.json', contentType: 'application/json' }))`). Controllare e fotografare:

1. 390 × 844, tema scuro: scheda Oggi, Marketing, Imbuto. Nessuno scorrimento orizzontale della pagina (`document.documentElement.scrollWidth <= 390`), le tabelle scorrono dentro il loro riquadro.
2. 1280 × 900, tema chiaro (cliccare il tasto tema): le tre schede.
3. Toccare una riga di «Canali» → l'indirizzo diventa `#marketing?canale=…` e compare il filtro; ✕ lo toglie.
4. Toccare un punto del grafico → la riga di lettura sotto mostra giorno e valore.
5. Il giorno con visite `NULL` (il 40° indietro, visibile con `periodo=90`) è un buco nella linea, non uno zero.
6. Con una risposta in cui `fonti.app = 'in-attesa'` e `imbuto: null` (rigenerare `esempio.json` cambiando la rete finta perché risponda 404 all'app): le cifre dell'app dicono «in attesa dell'app», l'Imbuto lo spiega, niente si rompe.
7. Con `/api/cruscotto` che risponde 403: compare «Accesso negato: ricarica la pagina per rientrare.»

Correggere CSS o markup finché i sette punti sono veri. Chiudere il server.

- [ ] **Step 8: Suite e commit**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"` — Expected: `fail 0`.

```bash
git add cruscotto.html cruscotto.js cruscotto.css vite.config.js public/_headers scripts/analytics/cruscotto.mjs scripts/analytics/indicizzazione.mjs .gitignore
git commit -m "feat(cruscotto): la pagina, tre schede, prima il telefono"
```

---

### Compito 9: gli avvisi su Telegram

**Files:**
- Create: `lib/avvisi.mjs`, `lib/telegram.mjs`
- Modify: `lib/archiviatore.mjs` (`lavoroAvvisi`, `raccogliAvvisi`), `worker-archivio/indice.mjs`
- Test: `lib/avvisi.test.mjs`, `lib/telegram.test.mjs`, `lib/archiviatore.test.mjs`

**Interfaces:**
- Consumes: tabella `avvisi` (Compito 1); `leggiStato`, `leggiArchivio`, `leggiNovita`, `precedente`, `spostato` (Compito 3); `componi` (Compito 5); `leggiRiassunto`, `canaleIscritto`, `CANALE_SCONOSCIUTO` (Compito 5); `numero` (Compito 4).
- Produces:
  - `lib/avvisi.mjs`: `CRUSCOTTO = 'https://quotify.it/cruscotto'`, `MASSIMO_PER_GIRO = 10`, `compitiDellOra(istante) → { eventi, giornaliero, settimanale }` (eventi saltati alle 05 e il lunedì alle 06: CPU e sottorichieste), `silenzioso(istante) → boolean`, `settimanaIso('YYYY-MM-DD') → 'YYYY-Www'`, `avvisiEventi(eventi)`, `avvisiGiornalieri({ storico, ieri })`, `avvisiSettimanali({ indice, frasi, settimanaUscite, settimanaRiassunto })` — tutte restituiscono `[{ chiave, testo, link }]`.
  - `lib/telegram.mjs`: `invia({ token, chat, testo, link?, silenzioso?, fetch? }) → Promise<boolean>` (mai un'eccezione).
  - `lib/archiviatore.mjs`: `lavoroAvvisi({ db, avvisi, invia, silenzioso, presoIl, log? }) → { inviati, saltati, falliti }`; `raccogliAvvisi({ db, istante, oggi, riassunto }) → avvisi[]` dove `riassunto({ da, a }) → { stato, dati }`.

- [ ] **Step 1: Test delle regole (falliranno)**

`lib/avvisi.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compitiDellOra, silenzioso, settimanaIso, avvisiEventi, avvisiGiornalieri, avvisiSettimanali, CRUSCOTTO } from './avvisi.mjs';

const chiavi = (l) => l.map((a) => a.chiave);

test('compitiDellOra: gli eventi ogni ora tranne le 05 e il lunedì alle 06, il giornaliero alle 07, il settimanale il lunedì alle 07', () => {
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-13T05:00:00Z')), { eventi: false, giornaliero: false, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-12T06:00:00Z')), { eventi: false, giornaliero: false, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-13T06:00:00Z')), { eventi: true, giornaliero: false, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-13T03:00:00Z')), { eventi: true, giornaliero: false, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-13T07:00:00Z')), { eventi: true, giornaliero: true, settimanale: false });
  assert.deepEqual(compitiDellOra(Date.parse('2026-10-12T07:00:00Z')), { eventi: true, giornaliero: true, settimanale: true });
});

test('silenzioso: dalle 22 alle 8 ora di Roma, ora legale inclusa', () => {
  assert.equal(silenzioso(Date.parse('2026-10-11T21:30:00Z')), true);  // 23:30 CEST
  assert.equal(silenzioso(Date.parse('2026-10-12T06:30:00Z')), false); // 08:30 CEST
  assert.equal(silenzioso(Date.parse('2026-12-01T06:30:00Z')), true);  // 07:30 CET
  assert.equal(silenzioso(Date.parse('2026-12-01T21:00:00Z')), true);  // 22:00 CET
  assert.equal(silenzioso(Date.parse('2026-12-01T20:59:00Z')), false); // 21:59 CET
});

test('settimanaIso: anche a cavallo d\'anno', () => {
  assert.equal(settimanaIso('2026-10-12'), '2026-W42');
  assert.equal(settimanaIso('2026-01-01'), '2026-W01');
  assert.equal(settimanaIso('2026-12-28'), '2026-W53');
  assert.equal(settimanaIso('2027-01-01'), '2026-W53');
  assert.equal(settimanaIso('2025-12-29'), '2026-W01');
});

test('avvisiEventi: paganti sempre, iscritti solo con un canale noto', () => {
  const a = avvisiEventi([
    { id: 'h1', tipo: 'pagante', quando: 'x', sorgente: 'linkedin', campagna: 'lancio', rif: null },
    { id: 'h2', tipo: 'pagante', quando: 'x', sorgente: null, campagna: null, rif: null },
    { id: 'h3', tipo: 'iscritto', quando: 'x', sorgente: null, campagna: null, rif: null },
    { id: 'h4', tipo: 'iscritto', quando: 'x', sorgente: 'sito', campagna: 'clienti', rif: 'www.google.com' },
  ]);
  assert.deepEqual(a.map((x) => [x.chiave, x.testo]), [
    ['pagante:h1', '💶 Nuovo pagante, da Social (campagna lancio)'],
    ['pagante:h2', '💶 Nuovo pagante'],
    ['primo-iscritto:Ricerca Google:', '🌱 Primo iscritto da Ricerca Google'],
  ]);
  assert.equal(a[0].link, `${CRUSCOTTO}#imbuto`);
});

const giorni = (valori, ultimo = '2026-10-11') => valori.map((visite, i) => ({
  giorno: new Date(Date.parse(`${ultimo}T00:00:00Z`) - (valori.length - 1 - i) * 864e5).toISOString().slice(0, 10),
  visite,
  fonti: { cloudflare: 'ok', google: 'ok' },
}));

test('zero visite ieri: avviso solo se la settimana prima ne aveva almeno 10 al giorno', () => {
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([12, 12, 12, 12, 12, 12, 12, 0]), ieri: '2026-10-11' })), ['zero:2026-10-11']);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([5, 5, 5, 5, 5, 5, 5, 0]), ieri: '2026-10-11' })), []);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([30, 30, 0]), ieri: '2026-10-11' })), []); // storia troppo corta
});

test('picco: tre volte la mediana di 28 giorni e almeno 30 visite', () => {
  const base = Array(28).fill(8);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([...base, 30]), ieri: '2026-10-11' })), ['picco:2026-10-11']);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([...base, 29]), ieri: '2026-10-11' })), []);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: giorni([...Array(28).fill(1), 20]), ieri: '2026-10-11' })), []);
});

test('archivio fermo: una fonte in errore due notti di fila, o Cloudflare che non ha scritto ieri', () => {
  const s = giorni([10, 10]);
  s[0].fonti.google = 'errore';
  s[1].fonti.google = 'errore';
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: s, ieri: '2026-10-11' })), ['fermo:google:2026-10-11']);
  const t = giorni([10, 10]);
  t[1].fonti.google = 'errore';
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: t, ieri: '2026-10-11' })), []);
  const u = giorni([10]);
  u[0].fonti = { google: 'ok' };
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: u, ieri: '2026-10-11' })), ['fermo:cloudflare:2026-10-11']);
  assert.deepEqual(chiavi(avvisiGiornalieri({ storico: [], ieri: '2026-10-11' })), ['fermo:cloudflare:2026-10-11']);
});

test('settimanale: uscite dall\'indice e il riassunto con le frasi', () => {
  const a = avvisiSettimanali({
    indice: { uscite: ['/privacy'] },
    frasi: [{ testo: 'Le visite sono passate da 20 a 40 (+100%)' }, { testo: 'Prima visita da reddit.com' }],
    settimanaUscite: '2026-W42', settimanaRiassunto: '2026-W41',
  });
  assert.deepEqual(chiavi(a), ['indice-uscita:/privacy:2026-W42', 'riassunto:2026-W41']);
  assert.equal(a[1].testo, '🗓️ La settimana su quotify.it\n• Le visite sono passate da 20 a 40 (+100%)\n• Prima visita da reddit.com');
  assert.equal(a[1].link, `${CRUSCOTTO}#oggi?periodo=7`);
});
```

`lib/telegram.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { invia } from './telegram.mjs';

test('invia: un messaggio con il link sotto, senza anteprima, silenzioso se richiesto', async () => {
  let chiamata;
  const f = async (url, o) => { chiamata = { url, corpo: JSON.parse(o.body) }; return Response.json({ ok: true }); };
  assert.equal(await invia({ token: 'T0K', chat: '42', testo: 'ciao', link: 'https://quotify.it/cruscotto', silenzioso: true, fetch: f }), true);
  assert.equal(chiamata.url, 'https://api.telegram.org/botT0K/sendMessage');
  assert.deepEqual(chiamata.corpo, {
    chat_id: '42', text: 'ciao\nhttps://quotify.it/cruscotto', disable_notification: true, link_preview_options: { is_disabled: true },
  });
});

test('invia: ok:false, 4xx/5xx, JSON rotto o rete giù → false, mai un\'eccezione', async () => {
  const casi = [
    async () => Response.json({ ok: false, description: 'chat not found' }),
    async () => new Response('', { status: 429 }),
    async () => new Response('{', { status: 200 }),
    async () => { throw new Error('rete'); },
  ];
  for (const f of casi) assert.equal(await invia({ token: 'T', chat: '1', testo: 'x', fetch: f }), false);
});
```

- [ ] **Step 2: Eseguire e vedere fallire**

Run: `node --test lib/avvisi.test.mjs lib/telegram.test.mjs 2>&1 | tail -3`
Expected: FAIL — moduli inesistenti.

- [ ] **Step 3: Implementare `lib/telegram.mjs`**

```js
// Un messaggio su Telegram — docs/cruscotto-piano.md §6.2.
//
// Restituisce true solo se Telegram conferma (`ok: true`): è quel true che
// autorizza a segnare l'avviso come inviato. Non lancia mai, e non scrive mai
// il token da nessuna parte: sta nell'indirizzo, e gli indirizzi finiscono
// nei messaggi d'errore.

export async function invia({ token, chat, testo, link = null, silenzioso = false, fetch: f = globalThis.fetch }) {
  try {
    const r = await f(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: link ? `${testo}\n${link}` : testo,
        disable_notification: silenzioso,
        link_preview_options: { is_disabled: true },
      }),
    });
    if (!r.ok) return false;
    const d = await r.json().catch(() => null);
    return d?.ok === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Implementare `lib/avvisi.mjs`**

```js
// Le regole degli avvisi — docs/cruscotto-piano.md §6.2.
//
// Eventi, non tendenze: un pagante, un canale nuovo, il sito giù, un picco,
// l'archivio fermo, una pagina uscita dall'indice; più il riassunto del
// lunedì. Ogni avviso ha una CHIAVE: la tabella `avvisi` la ricorda, e la
// stessa chiave non parte due volte (lavoroAvvisi in archiviatore.mjs).
// Niente dati personali nei testi: canali e campagne, mai persone.

import { numero } from './osservazioni.mjs';
import { canaleIscritto, CANALE_SCONOSCIUTO } from './riassunto.mjs';

export const CRUSCOTTO = 'https://quotify.it/cruscotto';
/** Messaggi per esecuzione: tiene le sottorichieste lontane da 50 anche nel
 *  giorno in cui tutto succede insieme. Il resto parte all'ora dopo. */
export const MASSIMO_PER_GIRO = 10;

const GIORNO_MS = 864e5;
const spostato = (data, giorni) => new Date(Date.parse(`${data}T00:00:00Z`) + giorni * GIORNO_MS).toISOString().slice(0, 10);
const oraDiRoma = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: 'numeric', hourCycle: 'h23' });

export function compitiDellOra(istante) {
  const d = new Date(istante);
  const ora = d.getUTCHours();
  const lunedi = d.getUTCDay() === 1;
  // Alle 05 il Worker firma il token Google: CPU già vicina al limite (§3.2).
  // Il lunedì alle 06 l'indicizzazione usa fino a 42 sottorichieste su 50: il
  // riassunto dell'app più dieci messaggi le farebbero sforare.
  return { eventi: ora !== 5 && !(ora === 6 && lunedi), giornaliero: ora === 7, settimanale: ora === 7 && lunedi };
}

/** Di notte il telefono non suona: il messaggio arriva, in silenzio. */
export function silenzioso(istante) {
  const ora = Number(oraDiRoma.format(new Date(istante)));
  return ora >= 22 || ora < 8;
}

/** Settimana ISO 8601: quella che contiene il giovedì. */
export function settimanaIso(data) {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
  const anno = d.getUTCFullYear();
  const quattroGennaio = new Date(Date.UTC(anno, 0, 4));
  const n = 1 + Math.round(((d - quattroGennaio) / GIORNO_MS - 3 + ((quattroGennaio.getUTCDay() + 6) % 7)) / 7);
  return `${anno}-W${String(n).padStart(2, '0')}`;
}

const canaleNoto = (e) => {
  const c = canaleIscritto(e);
  return c === CANALE_SCONOSCIUTO ? null : c;
};

export function avvisiEventi(eventi) {
  const fuori = [];
  for (const e of eventi ?? []) {
    const canale = canaleNoto(e);
    const campagna = e.campagna && e.sorgente !== 'sito' ? e.campagna : null;
    const dettaglio = campagna ? ` (campagna ${campagna})` : '';
    if (e.tipo === 'pagante') {
      fuori.push({ chiave: `pagante:${e.id}`, testo: `💶 Nuovo pagante${canale ? `, da ${canale}` : ''}${dettaglio}`, link: `${CRUSCOTTO}#imbuto` });
    } else if (e.tipo === 'iscritto' && canale) {
      // La chiave è il canale (più la campagna): parte solo la prima volta.
      fuori.push({
        chiave: `primo-iscritto:${canale}:${campagna ?? ''}`,
        testo: `🌱 Primo iscritto da ${canale}${dettaglio}`,
        link: `${CRUSCOTTO}#marketing?canale=${encodeURIComponent(canale)}`,
      });
    }
  }
  return fuori;
}

const mediana = (v) => {
  const s = [...v].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const NOMI_FONTI = { cloudflare: 'Cloudflare', google: 'Search Console', ricerca: 'Search Console (query e pagine)' };

/** `storico`: le righe dei 29 giorni fino a ieri, [{ giorno, visite, fonti }]. */
export function avvisiGiornalieri({ storico, ieri }) {
  const fuori = [];
  const link = `${CRUSCOTTO}#oggi`;
  const perGiorno = new Map(storico.map((r) => [r.giorno, r]));
  const r = perGiorno.get(ieri);
  const prima = storico.filter((x) => x.giorno < ieri && x.visite != null).map((x) => x.visite);

  const sette = prima.slice(-7);
  const media = sette.length ? sette.reduce((a, b) => a + b, 0) / sette.length : 0;
  if (r?.visite === 0 && sette.length === 7 && media >= 10) {
    fuori.push({ chiave: `zero:${ieri}`, testo: `🔴 Ieri zero visite su quotify.it (media dei sette giorni prima: ${numero(media)}). Sito giù o beacon rotto?`, link });
  }

  const ventotto = prima.slice(-28);
  if (r?.visite != null && r.visite >= 30 && ventotto.length >= 7) {
    const m = mediana(ventotto);
    if (m > 0 && r.visite >= 3 * m) {
      fuori.push({ chiave: `picco:${ieri}`, testo: `📈 Picco: ieri ${numero(r.visite)} visite, ${numero(r.visite / m)} volte il solito`, link });
    }
  }

  // Il lavoro di Cloudflare scrive SEMPRE la riga di ieri, buona o in errore:
  // se manca, il lavoro non è proprio girato.
  if (!r?.fonti?.cloudflare) {
    fuori.push({ chiave: `fermo:cloudflare:${ieri}`, testo: '⚠️ L\'archivio di Cloudflare non ha scritto la notte scorsa', link });
  }
  const altroIeri = perGiorno.get(spostato(ieri, -1));
  for (const fonte of Object.keys(NOMI_FONTI)) {
    if (r?.fonti?.[fonte] === 'errore' && altroIeri?.fonti?.[fonte] === 'errore') {
      fuori.push({ chiave: `fermo:${fonte}:${ieri}`, testo: `⚠️ L'archivio di ${NOMI_FONTI[fonte]} è in errore da due notti`, link });
    }
  }
  return fuori;
}

export function avvisiSettimanali({ indice, frasi, settimanaUscite, settimanaRiassunto }) {
  const fuori = (indice?.uscite ?? []).map((p) => ({
    chiave: `indice-uscita:${p}:${settimanaUscite}`,
    testo: `📉 ${p} è uscita dall'indice di Google`,
    link: `${CRUSCOTTO}#marketing`,
  }));
  fuori.push({
    chiave: `riassunto:${settimanaRiassunto}`,
    testo: ['🗓️ La settimana su quotify.it', ...frasi.map((f) => `• ${f.testo}`)].join('\n'),
    link: `${CRUSCOTTO}#oggi?periodo=7`,
  });
  return fuori;
}
```

- [ ] **Step 5: Eseguire e vedere passare**

Run: `node --test lib/avvisi.test.mjs lib/telegram.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"`
Expected: `pass 10`, `fail 0`.

- [ ] **Step 6: Test di `lavoroAvvisi` e `raccogliAvvisi` (falliranno)**

In `lib/archiviatore.test.mjs`, aggiungere `lavoroAvvisi, raccogliAvvisi` all'import da `./archiviatore.mjs` e `MASSIMO_PER_GIRO` da `./avvisi.mjs`, poi in fondo:

```js
const avviso = (chiave) => ({ chiave, testo: `testo ${chiave}`, link: 'https://quotify.it/cruscotto#oggi' });
function telegramFinto(risponde = true) {
  const inviati = [];
  return { inviati, invia: async (m) => { inviati.push(m); return typeof risponde === 'function' ? risponde(m) : risponde; } };
}

test('lavoroAvvisi: manda gli avvisi nuovi, li ricorda, e al secondo giro non ripete', async () => {
  const db = apriInMemoria();
  const t = telegramFinto();
  const primo = await lavoroAvvisi({ db, avvisi: [avviso('a'), avviso('b')], invia: t.invia, silenzioso: false, presoIl: PRESO, log: zitto });
  assert.deepEqual(primo, { inviati: 2, saltati: 0, falliti: 0 });
  const secondo = await lavoroAvvisi({ db, avvisi: [avviso('a'), avviso('b'), avviso('c')], invia: t.invia, silenzioso: false, presoIl: PRESO, log: zitto });
  assert.deepEqual(secondo, { inviati: 1, saltati: 2, falliti: 0 });
  assert.deepEqual(t.inviati.map((m) => m.testo), ['testo a', 'testo b', 'testo c']);
  assert.equal(t.inviati[0].silenzioso, false);
});

test('lavoroAvvisi: se Telegram non conferma, l\'avviso non si segna e riparte al giro dopo', async () => {
  const db = apriInMemoria();
  const giu = telegramFinto(false);
  assert.deepEqual(await lavoroAvvisi({ db, avvisi: [avviso('a')], invia: giu.invia, silenzioso: true, presoIl: PRESO, log: zitto }), { inviati: 0, saltati: 0, falliti: 1 });
  assert.equal(db.tutte('SELECT count(*) n FROM avvisi')[0].n, 0);
  const su = telegramFinto(true);
  assert.equal((await lavoroAvvisi({ db, avvisi: [avviso('a')], invia: su.invia, silenzioso: true, presoIl: PRESO, log: zitto })).inviati, 1);
  assert.equal(su.inviati[0].silenzioso, true);
});

test('lavoroAvvisi: la stessa chiave due volte nella lista parte una volta; al più MASSIMO_PER_GIRO per giro', async () => {
  const db = apriInMemoria();
  const t = telegramFinto();
  await lavoroAvvisi({ db, avvisi: [avviso('a'), avviso('a')], invia: t.invia, silenzioso: false, presoIl: PRESO, log: zitto });
  assert.equal(t.inviati.length, 1);
  const molti = Array.from({ length: MASSIMO_PER_GIRO + 3 }, (_, i) => avviso(`m${i}`));
  const r = await lavoroAvvisi({ db, avvisi: molti, invia: t.invia, silenzioso: false, presoIl: PRESO, log: zitto });
  assert.equal(r.inviati, MASSIMO_PER_GIRO);
});

test('lavoroAvvisi: niente avvisi, niente query', async () => {
  const db = new Proxy({}, { get: () => { throw new Error('il database non andava toccato'); } });
  assert.deepEqual(await lavoroAvvisi({ db, avvisi: [], invia: async () => true, silenzioso: false, presoIl: PRESO, log: zitto }), { inviati: 0, saltati: 0, falliti: 0 });
});

test('raccogliAvvisi: lunedì alle 07 eventi, giornaliero e riassunto; alle 05 niente, nemmeno l\'app', async () => {
  const db = apriInMemoria();
  db.tutte(`INSERT INTO storico (giorno, preso_il, visite, pagine_viste, dati) VALUES ('2026-10-11', 'x', 5, 5, '{"fonti":{"cloudflare":"ok"}}') RETURNING giorno`);
  const chieste = [];
  const riassunto = async (p) => {
    chieste.push(p);
    return { stato: 'ok', dati: { versione: 1, giorni: [], coorte: [], totali: {}, medianaGiorniAlPagamento: null,
      eventi: [{ id: 'h9', tipo: 'pagante', quando: 'x', sorgente: 'linkedin', campagna: null, rif: null }] } };
  };
  const lunedi = await raccogliAvvisi({ db, istante: Date.parse('2026-10-12T07:00:00Z'), oggi: '2026-10-12', riassunto });
  assert.ok(lunedi.some((a) => a.chiave === 'pagante:h9'));
  assert.ok(lunedi.some((a) => a.chiave === 'riassunto:2026-W41'));
  assert.ok(!lunedi.some((a) => a.chiave.startsWith('fermo:cloudflare')));
  assert.equal(chieste.length, 3); // eventi + settimana + settimana prima

  chieste.length = 0;
  assert.deepEqual(await raccogliAvvisi({ db, istante: Date.parse('2026-10-12T05:00:00Z'), oggi: '2026-10-12', riassunto }), []);
  assert.equal(chieste.length, 0);
});

test('raccogliAvvisi: con l\'app in attesa gli eventi non ci sono, il resto sì', async () => {
  const db = apriInMemoria();
  const r = await raccogliAvvisi({ db, istante: Date.parse('2026-10-13T07:00:00Z'), oggi: '2026-10-13', riassunto: async () => ({ stato: 'in-attesa', dati: null }) });
  assert.deepEqual(r.map((a) => a.chiave), ['fermo:cloudflare:2026-10-12']);
});
```

Run: `node --test lib/archiviatore.test.mjs 2>&1 | tail -3` — Expected: FAIL, `lavoroAvvisi` non esportato.

- [ ] **Step 7: Implementare in `lib/archiviatore.mjs`**

Import in testa, accanto agli altri:

```js
import { leggiStato, leggiArchivio, leggiNovita, precedente } from './cruscotto.mjs';
import { componi } from './composizione.mjs';
import { compitiDellOra, avvisiEventi, avvisiGiornalieri, avvisiSettimanali, settimanaIso, MASSIMO_PER_GIRO } from './avvisi.mjs';
```

In fondo al file:

```js
/** Gli avvisi di quest'ora — docs/cruscotto-piano.md §6.2. `riassunto` legge
 *  l'app (lib/riassunto.mjs): qui arriva da fuori, nei test è una finta. */
export async function raccogliAvvisi({ db, istante, oggi, riassunto }) {
  const compiti = compitiDellOra(istante);
  const ieri = spostato(oggi, -1);
  const avvisi = [];

  if (compiti.eventi) {
    const r = await riassunto({ da: spostato(oggi, -7), a: oggi });
    if (r.stato === 'ok') avvisi.push(...avvisiEventi(r.dati.eventi));
  }

  if (compiti.giornaliero) {
    const { results } = await db.prepare(`SELECT giorno, visite, dati->'$.fonti' AS fonti FROM storico
        WHERE giorno BETWEEN ? AND ? ORDER BY giorno`).bind(spostato(oggi, -29), ieri).all();
    const storico = results.map((r) => ({ giorno: r.giorno, visite: r.visite, fonti: r.fonti ? JSON.parse(r.fonti) : null }));
    avvisi.push(...avvisiGiornalieri({ storico, ieri }));
  }

  if (compiti.settimanale) {
    const stato = await leggiStato(db);
    const settimana = { periodo: '7', da: spostato(oggi, -7), a: ieri, giorni: 7 };
    const prima = precedente(settimana);
    const [archivio, archivioPrecedente, novita, app, appPrecedente] = await Promise.all([
      leggiArchivio(db, settimana),
      leggiArchivio(db, prima),
      leggiNovita(db, settimana, stato.primi.cloudflare),
      riassunto(settimana),
      riassunto(prima),
    ]);
    const { osservazioni } = componi({
      intervallo: settimana, precedente: prima, archivio, archivioPrecedente, novita, stato,
      oggi: null, app, appPrecedente, fonti: {}, generato: new Date(istante).toISOString(),
    });
    avvisi.push(...avvisiSettimanali({
      indice: stato.indice, frasi: osservazioni,
      settimanaUscite: settimanaIso(oggi), settimanaRiassunto: settimanaIso(ieri),
    }));
  }
  return avvisi;
}

/** Manda gli avvisi non ancora mandati. La chiave si scrive SOLO dopo che
 *  Telegram ha confermato: un invio fallito riparte all'ora dopo. */
export async function lavoroAvvisi({ db, avvisi, invia, silenzioso, presoIl, log = console.log }) {
  if (!avvisi.length) return { inviati: 0, saltati: 0, falliti: 0 };
  const unici = [...new Map(avvisi.map((a) => [a.chiave, a])).values()];
  const { results } = await db.prepare('SELECT chiave FROM avvisi WHERE chiave IN (SELECT value FROM json_each(?))')
    .bind(JSON.stringify(unici.map((a) => a.chiave))).all();
  const gia = new Set(results.map((r) => r.chiave));
  const nuovi = unici.filter((a) => !gia.has(a.chiave));

  let inviati = 0;
  let falliti = 0;
  for (const a of nuovi.slice(0, MASSIMO_PER_GIRO)) {
    if (await invia({ testo: a.testo, link: a.link, silenzioso })) {
      await db.prepare('INSERT INTO avvisi (chiave, inviato_il, testo) VALUES (?, ?, ?) ON CONFLICT(chiave) DO NOTHING')
        .bind(a.chiave, presoIl, a.testo).run();
      inviati++;
    } else {
      falliti++;
    }
  }
  log(`avvisi: ${inviati} inviati, ${gia.size} già mandati, ${falliti} falliti`);
  return { inviati, saltati: gia.size, falliti };
}
```

Nota sul conteggio `saltati`: conta le chiavi **distinte** già presenti; nel test con `[a, a]` al primo giro vale 0.

- [ ] **Step 8: Il Worker manda gli avvisi a ogni ora**

Sostituire `worker-archivio/indice.mjs` con:

```js
// Worker dell'archiviatore — docs/raccoglitore-metriche-piano.md e
// docs/cruscotto-piano.md §6.2.
//
// Solo scheduled(), nessun fetch(): niente superficie HTTP, niente da
// proteggere. Un cron ogni ora; mestiere() sceglie il lavoro dall'ora, e gli
// avvisi girano a ogni ora DOPO il lavoro. I due sono indipendenti: un lavoro
// fallito non ferma gli avvisi (che anzi possono dire che è fallito), e un
// avviso fallito non ferma l'archivio. Alla fine l'esecuzione risulta fallita
// se uno dei due è fallito, così le statistiche del Worker lo mostrano.
//
// I segreti (GSC_CHIAVE, CF_ANALYTICS_TOKEN, TELEGRAM_TOKEN, TELEGRAM_CHAT,
// RIASSUNTO_CHIAVE) restano qui dentro: nessun messaggio di log li contiene.

import { lettore } from '../lib/searchconsole.mjs';
import { cliente } from '../lib/cloudflare.mjs';
import { leggiRiassunto } from '../lib/riassunto.mjs';
import { invia } from '../lib/telegram.mjs';
import { silenzioso } from '../lib/avvisi.mjs';
import {
  mestiere, lavoroCloudflare, lavoroGoogle, lavoroIndicizzazione, chiaveGoogle, raccogliAvvisi, lavoroAvvisi,
} from '../lib/archiviatore.mjs';

export default {
  async scheduled(controller, env) {
    const istante = controller.scheduledTime;
    const oggi = new Date(istante).toISOString().slice(0, 10);
    const presoIl = new Date().toISOString();
    const db = env.DB;
    let errore = null;

    try {
      const lavoro = mestiere(istante);
      if (lavoro === 'cloudflare') {
        const cf = cliente({ token: env.CF_ANALYTICS_TOKEN, account: env.CF_ACCOUNT_ID });
        await lavoroCloudflare({ db, cf, oggi, presoIl });
      } else if (lavoro === 'google') {
        await lavoroGoogle({ db, g: lettore(chiaveGoogle(env.GSC_CHIAVE)), oggi, presoIl });
      } else if (lavoro === 'indicizzazione') {
        await lavoroIndicizzazione({ db, g: lettore(chiaveGoogle(env.GSC_CHIAVE)), oggi, presoIl });
      }
    } catch (e) {
      errore = e;
    }

    try {
      if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT) {
        const avvisi = await raccogliAvvisi({
          db, istante, oggi,
          riassunto: ({ da, a }) => leggiRiassunto({ chiave: env.RIASSUNTO_CHIAVE, da, a }),
        });
        await lavoroAvvisi({
          db, avvisi, presoIl, silenzioso: silenzioso(istante),
          invia: (m) => invia({ token: env.TELEGRAM_TOKEN, chat: env.TELEGRAM_CHAT, ...m }),
        });
      }
    } catch (e) {
      console.log(`avvisi: ${e.message}`);
      errore ??= e;
    }

    if (errore) throw errore;
  },
};
```

- [ ] **Step 9: Suite e commit**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"` — Expected: `fail 0`.

Controllare che il Worker si impacchetti: `cd worker-archivio && npx wrangler deploy --dry-run --outdir /tmp/archivio-prova 2>&1 | tail -4` — Expected: `--dry-run: exiting now.` senza errori di import. (Nessuna credenziale necessaria per il dry-run.)

```bash
git add lib/avvisi.mjs lib/avvisi.test.mjs lib/telegram.mjs lib/telegram.test.mjs lib/archiviatore.mjs lib/archiviatore.test.mjs worker-archivio/indice.mjs
git commit -m "feat(cruscotto): gli avvisi su Telegram e il riassunto del lunedì"
```

---

### Compito 10: la provenienza verso l'app e l'informativa

**Files:**
- Create: `public/provenienza.js`
- Modify: `scripts/content/genera-calcolatore.mjs` (funzione `bloccoTesta`), poi tutte le pagine del registro via `npm run gen`
- Modify: `public/_routes.json` (escludere `/provenienza.js`), `privacy.html` (§2, §5, data)
- Test: `lib/provenienza.test.mjs`

**Interfaces:**
- Produces: i link `https://app.quotify.it/register…` portano `utm_*` del visitatore (se presenti) e `rif=<host esterno>`, nel formato che il documento del Compito 0 si aspetta.

- [ ] **Step 1: Scrivere i test (falliranno)**

`lib/provenienza.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

// public/provenienza.js è uno script classico (Vite lo serve com'è): lo si
// esegue in un contesto isolato e se ne prende la funzione.
const FILE = new URL('../public/provenienza.js', import.meta.url);
function carica() {
  assert.ok(existsSync(FILE), 'public/provenienza.js non esiste');
  const ctx = vm.createContext({ URL });
  vm.runInContext(readFileSync(FILE, 'utf8'), ctx);
  return ctx.conProvenienza;
}

const INTERNO = 'https://app.quotify.it/register?utm_source=sito&utm_medium=guida&utm_campaign=clienti';

test('i link che non vanno all\'iscrizione restano come sono', () => {
  const conProvenienza = carica();
  assert.equal(conProvenienza('https://app.quotify.it/', 'https://quotify.it/?utm_source=x', 'https://www.google.com/'), 'https://app.quotify.it/');
  assert.equal(conProvenienza('/guide', 'https://quotify.it/', ''), '/guide');
  assert.equal(conProvenienza('https://example.com/register', 'https://quotify.it/', ''), 'https://example.com/register');
});

test('senza UTM del visitatore restano quelli interni, e il referrer esterno si aggiunge', () => {
  const conProvenienza = carica();
  assert.equal(conProvenienza(INTERNO, 'https://quotify.it/guide/clienti', 'https://www.google.com/'), `${INTERNO}&rif=www.google.com`);
});

test('gli UTM del visitatore sostituiscono tutti quelli interni, puliti', () => {
  const conProvenienza = carica();
  assert.equal(
    conProvenienza(INTERNO, 'https://quotify.it/guide/clienti?utm_source=LinkedIn&utm_campaign=Lancio%20Ottobre', 'https://www.linkedin.com/'),
    'https://app.quotify.it/register?utm_source=linkedin&utm_campaign=lancio+ottobre&rif=www.linkedin.com');
});

test('un referrer interno, o nessun referrer, non aggiunge niente', () => {
  const conProvenienza = carica();
  for (const ref of ['', 'https://quotify.it/guide', 'https://www.quotify.it/', 'https://app.quotify.it/login', 'non-un-indirizzo']) {
    assert.equal(conProvenienza(INTERNO, 'https://quotify.it/guide/clienti', ref), INTERNO);
  }
});

test('eseguito due volte dà lo stesso link: nessun parametro doppio', () => {
  const conProvenienza = carica();
  const pagina = 'https://quotify.it/?utm_source=newsletter&utm_medium=email';
  const una = conProvenienza(INTERNO, pagina, 'https://mail.google.com/');
  assert.equal(conProvenienza(una, pagina, 'https://mail.google.com/'), una);
  assert.equal(new URL(una).searchParams.getAll('rif').length, 1);
});

test('valori ostili: caratteri di controllo tolti, 200 caratteri al massimo; un UTM vuoto non conta', () => {
  const conProvenienza = carica();
  const lungo = 'a'.repeat(300);
  const u = new URL(conProvenienza(INTERNO, `https://quotify.it/?utm_source=%0Aspam%00&utm_campaign=${lungo}`, ''));
  assert.equal(u.searchParams.get('utm_source'), 'spam');
  assert.equal(u.searchParams.get('utm_campaign').length, 200);
  assert.equal(conProvenienza(INTERNO, 'https://quotify.it/?utm_source=', ''), INTERNO);
});
```

Run: `node --test lib/provenienza.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"` — Expected: `fail 6`.

- [ ] **Step 2: Implementare `public/provenienza.js`**

```js
/* Provenienza dell'iscrizione — docs/cruscotto-piano.md §7.1.

   Sui link verso app.quotify.it/register aggiunge da dove è arrivato chi sta
   leggendo QUESTA pagina: gli UTM della pagina (se ci sono, sostituiscono
   quelli interni del bottone, che dicono solo quale bottone) e l'host del
   referrer esterno, come `rif`. L'app li salva all'iscrizione.

   Niente cookie, niente memoria del browser: chi passa da un'altra pagina
   del sito prima di iscriversi perde la provenienza. È il prezzo, dichiarato,
   di non tracciare nessuno.

   Script classico e non modulo: sta in public/, e Vite lo serve così com'è.
   Le funzioni sono globali di proposito: lib/provenienza.test.mjs le prende
   eseguendo questo file in un contesto isolato. */

var UTM_PROVENIENZA = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function pulisciProvenienza(v) {
  return String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().toLowerCase().slice(0, 200);
}

function hostEsterno(referrer, ospite) {
  try {
    var h = new URL(referrer).hostname.toLowerCase();
    if (!h || h === ospite || h.slice(-(ospite.length + 1)) === '.' + ospite) return null;
    return h;
  } catch (e) {
    return null;
  }
}

function conProvenienza(href, paginaUrl, referrer) {
  var u;
  try {
    u = new URL(href);
  } catch (e) {
    return href;
  }
  if (u.hostname !== 'app.quotify.it' || u.pathname !== '/register') return href;

  var pagina = new URL(paginaUrl);
  var delVisitatore = UTM_PROVENIENZA.filter(function (k) { return pulisciProvenienza(pagina.searchParams.get(k)); });
  if (delVisitatore.length) {
    UTM_PROVENIENZA.forEach(function (k) { u.searchParams.delete(k); });
    delVisitatore.forEach(function (k) { u.searchParams.set(k, pulisciProvenienza(pagina.searchParams.get(k))); });
  }
  var rif = hostEsterno(referrer, pagina.hostname.replace(/^www\./, ''));
  if (rif) u.searchParams.set('rif', rif);
  return u.toString();
}

if (typeof document !== 'undefined') {
  var applicaProvenienza = function () {
    var link = document.querySelectorAll('a[href^="https://app.quotify.it/register"]');
    for (var i = 0; i < link.length; i++) {
      link[i].href = conProvenienza(link[i].href, location.href, document.referrer);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applicaProvenienza);
  else applicaProvenienza();
}
```

Run: `node --test lib/provenienza.test.mjs 2>&1 | grep -E "^not ok|^ℹ (pass|fail)"` — Expected: `pass 6`, `fail 0`.

- [ ] **Step 3: Lo script in ogni pagina del registro**

In `scripts/content/genera-calcolatore.mjs`, in `bloccoTesta`, subito **dopo** la riga del beacon di Cloudflare (`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" …></script>`), aggiungere una riga al template:

```js
    <!-- Provenienza sui link di iscrizione: niente cookie. docs/cruscotto-piano.md §7.1 -->
    <script defer src="/provenienza.js"></script>
```

In `public/_routes.json`, nell'elenco `exclude`, dopo `"/assistenza.js",`:

```json
    "/provenienza.js",
```

Run:
```bash
npm run gen 2>&1 | tail -3 && npm run gen -- --verifica 2>&1 | grep -c "✖"; grep -L 'src="/provenienza.js"' *.html guide/*.html
```
Expected: `0` disallineati; l'ultimo `grep -L` elenca **solo** `cruscotto.html` (e `404.html` se non è nel registro).

- [ ] **Step 4: L'informativa**

In `privacy.html`:

1. Dopo la voce `<li><strong>Registro di provenienza del sito:</strong> …</li>` del §2, aggiungere:

```html
            <li><strong>Provenienza dell'iscrizione:</strong> se ti iscrivi a Quotify partendo da un link di questo sito, registriamo insieme al tuo account il canale da cui eri arrivato sulla pagina (per esempio una campagna o il sito di provenienza). Non usiamo cookie né salviamo nulla sul tuo dispositivo per farlo: se prima di iscriverti visiti altre pagine del sito, il dato semplicemente non c'è. Serve a capire quali canali portano iscritti, sulla base del nostro legittimo interesse.</li>
```

2. Nel §5, dopo la voce dei dati di navigazione:

```html
            <li><strong>Provenienza dell'iscrizione:</strong> per la durata dell'account, e cancellata con esso.</li>
```

3. Aggiornare `Ultimo aggiornamento: 10 ottobre 2026` alla data del giorno (formato `11 ottobre 2026`).

- [ ] **Step 5: Build e verifica nel browser**

Run: `npm run build 2>&1 | tail -3` — Expected: `✔ Gate SEO superato`.

Con `npx vite preview --port 5180` in background, aprire con Playwright `http://localhost:5180/guide/clienti?utm_source=prova&utm_campaign=collaudo` e leggere `document.querySelector('a[href*="app.quotify.it/register"]').href`.
Expected: contiene `utm_source=prova&utm_campaign=collaudo` e nessun `utm_medium=guida`. Poi aprire `http://localhost:5180/guide/clienti` e verificare che il link sia identico a quello nel sorgente (UTM interni intatti, nessun `rif`). Chiudere il server.

- [ ] **Step 6: Suite e commit**

Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"` — Expected: `fail 0`.

```bash
git add public/provenienza.js lib/provenienza.test.mjs scripts/content/genera-calcolatore.mjs public/_routes.json privacy.html *.html guide/*.html public/_headers public/sitemap.xml
git commit -m "feat(cruscotto): la provenienza viaggia verso l'iscrizione, senza cookie"
```

---

### Compito 11: messa in produzione

Ogni passo che tocca Cloudflare si esegue con, nella **stessa** chiamata:
`source ~/.zshrc >/dev/null 2>&1; CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh >/dev/null 2>&1; …`

**Files:**
- Modify: `history.md` (sessione e trappole)
- Nessun codice nuovo.

- [ ] **Step 1 (Alessandro): Cloudflare Access**

Chiedere ad Alessandro, con queste istruzioni:
1. dash.cloudflare.com → **Zero Trust**. Se è la prima volta, scegliere il nome del team (per esempio `quotify`) e il piano **Free**.
2. **Access → Applications → Add an application → Self-hosted**.
   - Nome: `Cruscotto quotify.it`. Durata della sessione: **1 settimana**.
   - Domini: `quotify.it` con percorso `cruscotto`, e una seconda riga `quotify.it` con percorso `api/cruscotto`.
3. Policy: **Allow**, nome `Solo Alessandro`, regola **Include → Emails → `terracciano41@gmail.com`**.
4. Metodo di accesso: **One-time PIN**.
5. Salvare, aprire l'applicazione e copiare l'**Application Audience (AUD) Tag**.

Ad Alessandro serve dire: il nome del team e l'AUD (non sono segreti, ma si caricano comunque come segreti per tenerli fuori dal codice).

- [ ] **Step 2: Chiave condivisa con l'app**

```bash
F=~/vault/secrets/quotify/riassunto-chiave
[ -f "$F" ] || (openssl rand -base64 32 | tr -d '\n' > "$F" && chmod 600 "$F")
ls -l "$F" | cut -c1-10; wc -c < "$F"
```
Expected: `-rw-------`, 44 caratteri.

- [ ] **Step 3: Segreti del progetto Pages, solo produzione**

Fotografia prima: `npx wrangler pages secret list --project-name=quotify-website 2>&1 | grep -- "- "` → annotare (attesi: `GSC_CHIAVE`, `METRICHE_CHIAVE`).

Poi (sostituire `<team>` e `<aud>` con i valori dello Step 1; l'account è quello già in `worker-archivio/wrangler.toml`):

```bash
P="--project-name=quotify-website"
printf '%s' '<team>' | npx wrangler pages secret put ACCESS_TEAM $P
printf '%s' '<aud>' | npx wrangler pages secret put ACCESS_AUD $P
printf '%s' 'terracciano41@gmail.com' | npx wrangler pages secret put CRUSCOTTO_EMAIL $P
printf '%s' '9293958902c961a60201936782d4c1c9' | npx wrangler pages secret put CF_ACCOUNT_ID $P
npx wrangler pages secret put CF_ANALYTICS_TOKEN $P < ~/vault/secrets/quotify/cf-analytics-token
npx wrangler pages secret put RIASSUNTO_CHIAVE $P < ~/vault/secrets/quotify/riassunto-chiave
npx wrangler pages secret list $P 2>&1 | grep -- "- "
```
Expected: otto segreti — i due di prima più i sei nuovi.

- [ ] **Step 4: Migrazione di D1 in produzione**

```bash
cd worker-archivio && npx wrangler d1 migrations apply quotify-metriche --remote 2>&1 | tail -6
npx wrangler d1 execute quotify-metriche --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" 2>&1 | grep -E "ricerca|avvisi"
```
Expected: `0002_cruscotto.sql` applicata; le righe `ricerca` e `avvisi`.

- [ ] **Step 5 (Alessandro): il bot Telegram**

Chiedere ad Alessandro: aprire @BotFather su Telegram → `/newbot` → nome `Quotify cruscotto`, username a scelta che finisca in `bot` → **copiare il token**; poi aprire la chat col bot nuovo e scrivergli `/start`. Con il token negli appunti:

```bash
F=~/vault/secrets/quotify/telegram-token
pbpaste | tr -d '\r\n ' > "$F" && chmod 600 "$F" && wc -c < "$F"
T=$(cat "$F"); curl -s "https://api.telegram.org/bot$T/getUpdates" | python3 -c 'import sys,json;d=json.load(sys.stdin);ids={u["message"]["chat"]["id"] for u in d.get("result",[]) if "message" in u};print("ok" if d.get("ok") else "token rifiutato", sorted(ids))'
```
Expected: `ok [<un numero>]`. Salvare quel numero: `printf '%s' '<numero>' > ~/vault/secrets/quotify/telegram-chat && chmod 600 ~/vault/secrets/quotify/telegram-chat`.

Messaggio di prova:
```bash
node --input-type=module -e "import { invia } from './lib/telegram.mjs'; import { readFileSync } from 'node:fs'; const s = (n) => readFileSync(process.env.HOME + '/vault/secrets/quotify/' + n, 'utf8').trim(); console.log(await invia({ token: s('telegram-token'), chat: s('telegram-chat'), testo: '✅ Il cruscotto di quotify.it può scriverti qui.', link: 'https://quotify.it/cruscotto' }))"
```
Expected: `true`, e il messaggio arriva sul telefono di Alessandro (chiedere conferma).

- [ ] **Step 6: Worker con i segreti nuovi**

```bash
cd worker-archivio
npx wrangler secret put TELEGRAM_TOKEN < ~/vault/secrets/quotify/telegram-token
npx wrangler secret put TELEGRAM_CHAT < ~/vault/secrets/quotify/telegram-chat
npx wrangler secret put RIASSUNTO_CHIAVE < ~/vault/secrets/quotify/riassunto-chiave
npx wrangler deploy 2>&1 | grep -E "Uploaded|schedule|ERROR"
npx wrangler secret list 2>&1 | grep -o '"name": *"[A-Z_]*"'
```
Expected: deploy riuscito con `schedule: 0 * * * *`; cinque segreti (`CF_ANALYTICS_TOKEN`, `GSC_CHIAVE`, `RIASSUNTO_CHIAVE`, `TELEGRAM_CHAT`, `TELEGRAM_TOKEN`).

- [ ] **Step 7: Revisione finale, poi il sito**

Dopo la revisione finale del ramo (executing-plans) e le sue correzioni:

```bash
npm test 2>&1 | grep -E "^ℹ (pass|fail)"
git checkout main && git merge --ff-only cruscotto && npm run build 2>&1 | tail -2
npx wrangler pages deploy dist --project-name=quotify-website --branch=main 2>&1 | tail -2
npx wrangler pages secret list --project-name=quotify-website 2>&1 | grep -c -- "- "
```
Expected: suite verde; gate superato; deploy completato; `8` segreti.

- [ ] **Step 8: Verifiche in produzione (spec §11)**

```bash
echo "pages.dev:   $(curl -s -o /dev/null -w '%{http_code}' https://quotify-website-970.pages.dev/api/cruscotto)"
echo "token falso: $(curl -s -o /dev/null -w '%{http_code}' -H 'Cf-Access-Jwt-Assertion: a.b.c' https://quotify-website-970.pages.dev/api/cruscotto)"
echo "dominio:     $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://quotify.it/cruscotto)"
echo "api dominio: $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://quotify.it/api/cruscotto)"
curl -s https://quotify.it/sitemap.xml | grep -c cruscotto
```
Expected: `403`; `403`; `302` verso `https://<team>.cloudflareaccess.com/…`; `302` verso Access; `0`.

Poi, da Alessandro sul telefono: aprire `https://quotify.it/cruscotto`, ricevere il codice via email, entrare. Confrontare visite e pagine viste degli ultimi 7 giorni con `npm run cruscotto` (stessi giorni): devono coincidere.

- [ ] **Step 9: Il giorno dopo (verifiche 8 e 9)**

1. `SELECT count(*), min(giorno), max(giorno) FROM ricerca` su D1 remoto → righe su ~16 mesi.
2. CPU della Function e del Worker con GraphQL (`pagesFunctionsInvocationsAdaptiveGroups` filtrato su `scriptName` del progetto, e `workersInvocationsAdaptive` per `quotify-archivio`): `cpuTimeP99` sotto 10 ms, sottorichieste sotto 50. Se la Function supera i 10 ms con «Tutto», si apre la mitigazione di spec §3.2 (totali settimanali precalcolati) come lavoro separato, chiedendo prima ad Alessandro.
3. Lunedì successivo: arriva il riassunto settimanale su Telegram.

- [ ] **Step 10: Memoria del progetto e consegna**

In `history.md`: una voce di sessione «cruscotto unico» (cosa c'è, dove, segreti per nome, cosa manca dall'app) e due trappole nuove se emerse. Commit `docs(history): il cruscotto in produzione`, push di `main` solo se Alessandro lo chiede.

Dire ad Alessandro che il documento per l'app è in `~/Developer/Quotify App/docs/cruscotto-riassunto.md`, da passare alla sessione dell'app, e che finché l'app non lo implementa le parti dell'app restano «in attesa».
