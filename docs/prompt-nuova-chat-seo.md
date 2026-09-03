Lavoriamo su ~/Developer/quotify-website, il sito pubblico di Quotify (quotify.it).
NON è il repo dell'applicazione: quello è ~/Developer/"Quotify App" (app.quotify.it)
e non va toccato. Esiste anche ~/Developer/Quotify, vecchia copia dell'app: ignorala.

Questa chat è dedicata solo al progetto SEO/GEO. Non toccare grafica o design.

## Leggi prima questo

`docs/console-sito-piano.md` — piano a fasi della console di controllo del sito, con
la ricognizione del 25/08/2026, le decisioni prese e il perché, e i riscontri con
file:riga. È il registro di tutto il lavoro SEO fatto finora. Contiene anche i punti
in cui la diagnosi iniziale era sbagliata, con la correzione: leggili, non ripetere
quegli errori.

## Cosa è già fatto

**Fase 0 — Search Console.** Proprietà Dominio `quotify.it` verificata il 25/08/2026
(è il t0 di ogni confronto storico). Sitemap inviata e letta lo stesso giorno.
Stato all'ultima verifica: home indicizzata, `/cookie` e `/termini` "Rilevata ma non
ancora indicizzata" tramite sitemap, `/privacy` e `/assistenza` ancora sconosciute a
Google. Nessun ostacolo tecnico: Googlebot riceve 200 con il contenuto completo.
Le uniche pagine di referral della home sono link spam da directory automatiche:
zero autorità in entrata.

**Fase 1 — Fondamenta tecniche.** canonical assoluto, Open Graph completo con
immagine dedicata 1200×630, JSON-LD (Organization, WebSite, SoftwareApplication +
Offer, FAQPage) generato dal DOM in fase di build, `llms.txt` generato dal build,
link morti rimossi, favicon.ico e apple-touch-icon.
Lato Cloudflare: managed robots.txt spento (bloccava ClaudeBot, GPTBot,
Google-Extended e altri), `browser_cache_ttl` da 14400 a 0, `always_use_https` on,
regola WAF con esenzione per i bot verificati, Web Analytics finalmente attivo —
era configurato dal 31/03 con "escludi i visitatori UE" su un sito il cui pubblico
è interamente italiano, quindi non raccoglieva nulla da cinque mesi.

**Fase 2 — Gate SEO in build.** `scripts/seo/` — 23 regole che bloccano
`npm run build`: title, description, canonical, h1, lang, alt, link morti, JSON-LD,
og:image inesistente, sitemap, pagine orfane, segreti finiti in dist/, gestori
inline vietati dalla CSP, e la politica dei crawler nel robots.txt verificata con
due letture (RFC 9309 e ingenua) per intercettare i problemi di ordinamento.
Collaudato reintroducendo i bug di proposito.

## Cosa manca

Fasi 3-8 del piano: crawler di produzione + D1, console dietro Cloudflare Access,
API Search Console, prestazioni, GEO, allerte.

## Le due cose da guardare per prime

**1. Search Console → Rendimento.** Al 26/08 rispondeva "Elaborazione dei dati in
corso, ricontrolla tra un giorno o due". Ora dovrebbe esserci. Servono impression
totali e le query. È il dato che decide tutto il resto.

⚠️ Il piano afferma in §3 che Search Console non ha storico precedente alla verifica
della proprietà. **Quell'affermazione non è mai stata verificata.** Se nel grafico
compaiono dati anteriori al 25/08/2026, è falsa e va corretta nel documento.

**2. Il traffico è praticamente zero.** Cloudflare Web Analytics: 18 pageview dal
25/08, quasi tutte di test. Su 5 pagine e zero traffico, una console di misurazione
misura il nulla. Tienilo presente prima di proporre di costruirla.

## La raccomandazione aperta, da discutere

Prima la pipeline dei contenuti, poi la console. Le query obiettivo dichiarate —
"fattura elettronica forfettario", "calcolo F24 forfettario", "quanto accantonare
tasse partita iva" — non hanno una pagina. "F24" e "accantonare" non compaiono in
nessun file del repo.

L'idea in discussione: ogni articolo dichiara nel proprio codice la query obiettivo
e la data di pubblicazione, il gate di build lo verifica, e da lì il sistema può
rispondere a "questo articolo si posiziona per quello per cui l'ho scritto, e da
quando?" — che è la forma onesta di "cosa aiuta e cosa no". Va deciso prima del
primo articolo: aggiungerlo dopo venti significa ricostruire a memoria perché ognuno
era stato scritto.

## Obiettivi dichiarati e cosa significano davvero

**"Voglio comparire subito se uno cerca quotify."** È una query di marca, ed è diversa
dal resto. Verificato il 27/08: esistono almeno otto prodotti chiamati Quotify — due
app iOS di citazioni, una Android, quotifyai.com, quotify.dev (Shopify),
quotify.life (assicurazioni), quotify.app, proquote.app. Tre hanno il dominio a
corrispondenza esatta. **Sono tutti anglofoni**, e il mercato di Quotify è solo
l'Italia: con il `.it`, che Google pesa molto sulle ricerche it-IT, la query di marca
in Italia è vincibile. A livello globale non lo è, e non serve.

Cosa la fa vincere, in ordine: essere indicizzati (in corso), segnali di identità
dell'entità, e contenuto che renda ovvio quale Quotify sei.

**Due lacune trovate il 27/08 e chiuse il 03/09:**

1. ✅ **`sameAs` aggiunto** all'Organization: `instagram.com/quotifyita` e
   `facebook.com/quotifyita`, entrambi verificati raggiungibili prima di
   dichiararli (Facebook risponde 400 a curl per rilevamento bot — va controllato
   col browser, la Pagina esiste ed è "Quotify | Milan").
2. ✅ **Contatto spostato su `info@quotify.it`**, 19 occorrenze in 5 pagine più il
   campo `email` dell'Organization e `llms.txt`.
   ⚠️ **Da verificare**: che quella casella riceva davvero. Il dominio ha MX
   (`mx.quotify.it`) ma nel social-kit era documentata `social@quotify.it`. Un
   contatto che rimbalza è peggio di uno su un dominio di terzi.

Resta da fare su questo fronte: nient'altro di tecnico. Da qui in poi la query di
marca si vince facendosi indicizzare e avendo contenuto che renda ovvio chi sei.

**"SEO forte e aggressiva."** Aggressiva in volume e velocità di contenuti veri: sì,
ed è l'unica leva che sposti davvero l'ago. Aggressiva nel senso di link comprati,
PBN, doorway page o keyword stuffing: no, e non per moralismo — Quotify tocca la
fiscalità delle persone, una penalizzazione manuale toglie dall'indice e la fiducia
è ciò che il prodotto vende. Se ti viene chiesto di fare una di queste cose, dillo
chiaramente prima di farla.

## Skill SEO disponibile

`AgriciDaniel/claude-seo` (MIT, nessuna API key richiesta):
```
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo
/seo setup
```
25 sub-skill e 18 agenti. **Attenzione alla sovrapposizione**: il suo audit tecnico,
la validazione schema e i controlli su sitemap e crawlability rifanno cose che il
gate di build già controlla — con la differenza che il gate blocca il deploy e la
skill produce un report. Il valore che aggiunge davvero è dove il progetto è
scoperto: clustering semantico, GEO/AEO (citabilità dei passaggi, gerarchia delle
domande, densità di attribuzione), E-E-A-T, analisi competitor e le API Google.
Non scrive i contenuti e non costruisce link.

## Vincoli

- Quotify è un gestionale per freelance italiani in regime forfettario. Mercato solo
  Italia, solo lingua italiana.
- Stack: Vite + Tailwind v4 + JavaScript vanilla, nessun framework. Cloudflare Pages,
  Functions, D1. Niente WordPress.
- Il contenuto va servito lato server o pre-generato: una SPA non si indicizza.
- I contenuti stanno in codice. La console serve a vedere e capire, non a pubblicare.
- Deploy: `CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh` e poi
  `npx wrangler pages deploy dist --project-name=quotify-website --branch=main`.
  Il `source` senza override NON funziona: la mappa in cf-env.sh non conosce questa
  cartella. Mai `wrangler login` o `logout`.
- Il token Cloudflare ha Pages e lettura delle impostazioni di zona. Non ha DNS, WAF
  né Bot Management: quelle modifiche vanno fatte dal dashboard.

## Come voglio che lavoriamo

- Verifica, non supporre. Se dici che una cosa funziona, mostrami il comando e
  l'output.
- Riscontri concreti: file:riga, oppure l'HTML davvero servito in produzione.
- Se una cosa non è realistica, dimmelo prima di costruirla, non dopo.
- Ogni fase deve essere verificabile da sola.
- I piani vanno nel formato di ~/Developer/"Quotify App"/docs/fatture-ricorrenti-piano.md.
- Non aprire lavori che non ti ho chiesto.

Comincia dicendomi cosa serve guardare in Search Console: le schermate le apro io,
tu dimmi dove cliccare e cosa leggerti.
