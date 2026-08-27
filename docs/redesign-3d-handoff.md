> Documento di handoff del redesign, copiato da `design_handoff_quotify_3d/README.md`
> il 2026-08-26 e conservato qui perché il codice lo cita nei commenti.
> I prototipi `.dc.html` non sono nel repo: girano su un runtime proprietario e
> ogni valore che serviva all'implementazione è riportato qui sotto.

---

# Handoff: Quotify — homepage 3D scroll-driven

## Overview

Ridisegno completo della homepage `quotify.it`. Sostituisce l'attuale hero a gradiente + griglia
di feature con un'esperienza continua guidata dallo scroll: un singolo documento 3D che attraversa
la pagina (preventivo → XML FatturaPA → consegna SDI → dashboard fiscale), un carosello cilindrico
dei sei moduli, e una demo interattiva reale del calcolo forfettario.

Palette e font sono quelli del sistema attuale: `#236CEF` con la scala `primary-*` già definita in
`style.css`, famiglia Inter. Nessun colore di brand nuovo.

## About the design files

I file in questo pacchetto sono **riferimenti di design realizzati in HTML** — prototipi che mostrano
aspetto e comportamento previsti, **non codice di produzione da copiare**. Il prototipo gira su un
runtime a componenti proprietario (template + classe logica) che non esiste nel repo di Quotify.

Il compito è **ricreare questi design nell'ambiente già presente nel codebase**: Vite +
Tailwind CSS v4 (`@import "tailwindcss"` con blocco `@theme` in `style.css`) + JavaScript vanilla in
`main.js`, come nel sito attuale. Non introdurre React per questo lavoro: tutta la logica descritta
qui è manipolazione diretta di `style.transform` / `style.opacity` in un loop di animazione, cosa che
il `main.js` esistente già fa (ha già GSAP e un sistema `animate-on-scroll`).

Il prototipo è pensato per essere letto insieme a questo README: **tutti i numeri della coreografia
sono documentati qui sotto**, così l'implementazione non richiede di eseguire il prototipo.

## Fidelity

**High-fidelity.** Colori, tipografia, spaziature, tempi e curve sono definitivi. La UI va ricreata
fedelmente usando le utility Tailwind e i token già presenti in `style.css`. Dove sotto compaiono
valori in `rem`, corrispondono alla scala Tailwind di default (0.8125rem = `text-[13px]`, ecc.);
usare le classi equivalenti dove esistono e valori arbitrari dove no.

Un punto di attenzione: nel prototipo **tutto lo stile è inline** per un vincolo del runtime.
Nel repo di Quotify va invece scritto con classi Tailwind. Le uniche cose che devono restare inline
(scritte da JS a runtime) sono `transform`, `opacity`, `filter`, `width` delle barre e
`background-image` del titolo liquido.

---

## Struttura della pagina

Ordine delle sezioni, dall'alto:

| # | id | Tipo | Altezza |
|---|----|------|---------|
| 1 | `#top` | Hero pinned, scroll-driven | `460vh` (sticky interno `100vh`) |
| 2 | — | Ticker orizzontale infinito | auto (`padding: 1.125rem 0`) |
| 3 | `#sistema` | Carosello cilindrico pinned | `420vh` (sticky interno `100vh`) |
| 4 | `#banco` | Demo interattiva | auto |
| 5 | — | I numeri del forfettario | auto |
| 6 | `#prezzi` | Piani Free / Pro | auto |
| 7 | `#faq` | Accordion | auto |
| 8 | — | CTA finale | auto |
| 9 | — | Footer | auto |

Padding verticale standard delle sezioni non-pinned:
`clamp(5rem, 16vh, 10rem)`; padding orizzontale `clamp(1.25rem, 5vw, 3rem)`; contenitore
`max-width: 1320px; margin: 0 auto`.

**Nessuna media query.** Il layout è responsive per costruzione: `clamp()` per la tipografia e
`grid-template-columns: repeat(auto-fit, minmax(min(100%, Npx), 1fr))` per le griglie. Mantenere
questo approccio: è ciò che rende l'esperienza 3D usabile su mobile senza un secondo layout.

---

## 1. Hero — `#top`

Sezione alta `460vh`. Dentro, un contenitore `position: sticky; top: 0; height: 100vh;
overflow: hidden`.

### Progresso di scroll

Tutta la coreografia dipende da un unico scalare:

```js
const rect = section.getBoundingClientRect();
const total = Math.max(section.offsetHeight - window.innerHeight, 1);
const p = clamp01(-rect.top / total);   // 0 → 1
```

Helper usati in tutte le formule:

```js
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const ease    = t => 1 - Math.pow(1 - t, 3);          // cubic-out
const seg     = (p, a, b) => clamp01((p - a) / (b - a));
```

### Livelli di sfondo (dal fondo verso l'alto)

1. `radial-gradient(120% 90% at 50% 0%, #0d1b3e 0%, #05080f 55%, #04060d 100%)`
2. Alone: cerchio `min(120vw, 1100px)` centrato, `radial-gradient(circle, rgba(35,108,239,0.30) 0%, rgba(35,108,239,0.05) 45%, transparent 70%)`, `filter: blur(20px)`.
   Opacità animata: `0.55 + 0.45 * Math.sin(p * Math.PI)`
3. Griglia: due `linear-gradient` a `rgba(255,255,255,0.035)` 1px, `background-size: 64px 64px`,
   mascherata con `radial-gradient(70% 60% at 50% 45%, #000 0%, transparent 100%)`
4. Scena 3D: wrapper con `perspective: 1500px; perspective-origin: 50% 45%`

### Gerarchia della scena 3D

```
div[perspective:1500px; perspective-origin:50% 45%]
└── #hero-scene  (position:absolute; inset:0; transform-style:preserve-3d)
    ├── 8 × chip wrapper   (position:absolute; top:50%; left:50%; preserve-3d)
    │    └── pillola       (transform: translate(-50%,-50%))
    └── #hero-fit          (position:absolute; inset:0; preserve-3d)  ← scalato da JS
         ├── dashboard
         └── card documento (due facce)
```

Perché `#hero-fit` è separato: la scala di adattamento va applicata **solo** a documento e
dashboard. I chip sono posizionati in frazioni della viewport; scalarli li tirerebbe verso il
centro, sopra il titolo.

### I chip di burocrazia (8)

Testi, in ordine: `Codice destinatario`, `XML FatturaPA 1.2.2`, `Coefficiente 78%`,
`Soglia € 85.000`, `Contributi INPS`, `Art. 1 c. 54-89`, `PEC del cliente`, `Imposta sostitutiva`.

Stile pillola: `background: rgba(255,255,255,0.05)`, `border: 1px solid rgba(255,255,255,0.12)`,
`backdrop-filter: blur(8px)`, `border-radius: 10px`, `padding: 0.5rem 0.75rem`,
`font-size: 0.6875rem`, `font-weight: 600`, `color: rgba(232,237,247,0.72)`, `white-space: nowrap`.

Seed per chip — `[fattoreX, fattoreY, zPx, rotazioneDeg]`:

```js
const CHIP_SEEDS = [
  [-0.80, -0.46, -260, -18],
  [ 0.82, -0.52, -420,  14],
  [-0.86,  0.18, -180,  10],
  [ 0.84,  0.30, -340, -12],
  [-0.52,  0.66, -520,  16],
  [ 0.56,  0.70, -240, -20],
  [-0.16, -0.52, -600,   8],
  [ 0.20,  0.62, -140,  -8],
];
```

Per ogni chip, a ogni frame:

```js
const gather = ease(seg(p, 0, 0.2));   // 0 = sparsi, 1 = aggregati al centro
const f  = 1 - gather;
const pz = (1500 + Math.abs(z) * f) / 1500;   // compensa la riduzione prospettica

opacity  = Math.max(0, 0.75 - gather * 0.9);
transform = `translate3d(${sx * vw * 0.46 * f * pz}px,
                         ${sy * vh * 0.44 * f * pz}px,
                         ${z * f}px)
             rotate(${rot * f}deg)
             scale(${0.7 + 0.3 * f})`;
```

I moltiplicatori `0.46` / `0.44` sono tarati: valori più alti spingono i chip fuori dal frame su
finestre larghe, più bassi li fanno collidere col titolo. Non modificarli senza rimisurare a
924×540 **e** a 1440×800.

### La card documento

Dimensioni: `width: min(84vw, 400px)`, `height: min(112vw, 530px)`, centrata con
`margin-left: calc(min(84vw, 400px) / -2)` e `margin-top: calc(min(112vw, 530px) / -2)`.

> Attenzione: non usare `margin-left: min(-42vw, -200px)`. Con valori negativi `min()` prende il
> **più** negativo e la card si sposta fuori centro. Derivare il margine dalla stessa espressione
> della dimensione, come sopra.

Contenitore `transform-style: preserve-3d`; due figli `position: absolute; inset: 0` con
`backface-visibility: hidden`, il secondo con `transform: rotateY(180deg)`.

**Faccia A — preventivo.** `background: #fbfcfe`, `border-radius: 18px`, `padding: 1.5rem`,
`box-shadow: 0 40px 100px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12)`.
Contenuto: eyebrow `PREVENTIVO` (0.5625rem, 700, `letter-spacing: 0.16em`, `#236CEF`), numero
`PR-2026-0118` (1.0625rem, 700, `#0f172a`), logo 26px in alto a destra; due box `Da / A`
(`#f4f7fc`, radius 10px) con `Mario Rossi` e `Acme Srl`; due righe
`Sviluppo web — 20h / € 2.000` e `Consulenza UX — 5h / € 500` separate da
`1px solid #eef2f8`; footer `#eef4ff` radius 12px con
`Regime forfettario / IVA esente — Art. 1 c. 54-89` (0.5625rem, `#3b82f6`) e totale
`€ 2.500` (1.375rem, 800, `#1d4ed8`).

**Faccia B — XML.** `background: #070c18`, `border: 1px solid rgba(96,165,250,0.28)`.
Eyebrow `FATTURA ELETTRONICA` (`#60a5fa`) + badge SDI (`rgba(16,185,129,0.14)` su bordo
`rgba(16,185,129,0.35)`, pallino `#34d399`). Blocco monospace 0.5625rem,
`line-height: 1.85`, `color: rgba(147,197,253,0.72)`, con i tag `<FatturaElettronica versione="FPR12">`,
`<CodiceDestinatario>M5UXCR1`, `<PrezzoTotale>2500.00`, `<Natura>N2.2` (valore in `#6ee7b7`).
In fondo il timbro di consegna (vedi sotto).

**Animazione della card:**

```js
const inP    = ease(seg(p, 0.02, 0.26));      // entrata
const ft     = seg(p, 0.405, 0.475);
const flip   = ft * ft * (3 - 2 * ft);        // smoothstep: attraversa i 90° velocemente
const shrink = ease(seg(p, 0.72, 0.9));       // arretra per far entrare la dashboard

rotY  = -42 + 42 * inP + 180 * flip;
rotX  = 16 - 16 * inP;
scale = (0.62 + 0.38 * inP) * (1 - 0.32 * shrink);
tz    = (-420 + 420 * inP) - 260 * shrink;
tx    = -44 * shrink;                          // in %

transform = `translate3d(${tx}%, 0, ${tz}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
opacity   = 0.1 + 0.9 * ease(seg(p, 0.07, 0.24));
```

Due dettagli non ovvi, entrambi bug risolti in fase di design:

- **La finestra del flip è strettissima (0.405 → 0.475) e usa smoothstep, non cubic-out.** Un piano
  senza spessore a 90° è invisibile. Con una finestra larga o una curva che rallenta a metà, la card
  resta di taglio per centinaia di pixel di scroll e la sezione sembra vuota. Smoothstep è più
  rapida al centro, quindi il momento di profilo dura un istante — e cade **tra** due didascalie.
- **`shrink` sposta la card di −44% e la arretra di 260px in Z**, mentre la dashboard avanza di
  +120px: senza questo le due grafiche si sovrappongono nell'ultimo passaggio.

**Timbro di consegna** (dentro la faccia B):
`sp = ease(seg(p, 0.56, 0.68))`; `opacity = sp`;
`transform = translateY(${(1-sp)*14}px) scale(${0.92 + 0.08*sp})`.

**Dashboard** — `width: min(78vw, 320px)`, `margin-left: -6vw`, `background: rgba(10,16,32,0.86)`,
`border: 1px solid rgba(147,197,253,0.18)`, radius 18px, `backdrop-filter: blur(14px)`.
Contiene: `Fatturato € 62.400` (box blu), `Da versare € 2.433` (box verde), barra soglia al 73%,
label `€ 62.400 / € 85.000`.

```js
const dp = ease(seg(p, 0.76, 0.94));
opacity   = dp;
transform = `translate3d(${26 + (1-dp)*60}%, -50%, ${120*dp}px)
             rotateY(${-14*(1-dp)}deg) scale(${0.9 + 0.1*dp})`;
```

### Didascalie di stage

Cinque blocchi sovrapposti. Il primo è il titolo della pagina; gli altri quattro sono ancorati
`bottom: clamp(2rem, 8vh, 5rem); left: 50%; transform: translateX(-50%)`,
`width: min(92vw, 520px)`, centrati.

I quattro blocchi di stage hanno un **piano leggibile**: `background: rgba(4,6,13,0.72)`,
`backdrop-filter: blur(16px)`, `border: 1px solid rgba(255,255,255,0.07)`, `border-radius: 20px`,
`padding: 1.125rem 1.375rem`. Serve perché la card bianca può passare dietro di loro.

Contenuti:

| # | Eyebrow | Titolo | Corpo |
|---|---------|--------|-------|
| 0 | badge `Beta gratuita` | `La burocrazia italiana / in un solo oggetto.` | `Preventivo, fattura elettronica, SDI, tasse. Scorri e guardalo risolversi da solo.` |
| 1 | `01 — PREVENTIVO` | `Un documento, non venti campi` | `Righe, cliente, totale. La dicitura del forfettario è già dentro, sempre corretta.` |
| 2 | `02 — XML FATTURAPA` | `Lo stesso documento, girato` | `Nessuna riscrittura. Il preventivo diventa XML 1.2.2 conforme, con natura N2.2 già impostata.` |
| 3 | `03 — SISTEMA DI INTERSCAMBIO` | `Consegnata. Senza altri portali` | `Invio, ricevuta e notifica in tempo reale. Non apri più il sito dell'Agenzia.` |
| 4 | `04 — TASSE` | `Sai già quanto ti resta` | `Imposta sostitutiva, contributi INPS e soglia degli 85.000 € aggiornati a ogni fattura.` |

Titolo hero: `font-size: clamp(2.25rem, 7.5vw, 4.5rem)`, `font-weight: 800`, `line-height: 1.02`,
`letter-spacing: -0.035em`, `text-wrap: balance`. Sottotitolo `clamp(1rem, 2.6vw, 1.25rem)`,
`color: rgba(232,237,247,0.58)`, `max-width: 34rem`.
Titoli di stage: `clamp(1.375rem, 4.5vw, 2rem)`, 700, `letter-spacing: -0.02em`.
Eyebrow: 0.625rem, 700, `letter-spacing: 0.18em`, uppercase, `#60a5fa` (`#6ee7b7` per lo stage 03).

**Finestre di visibilità:**

```js
const windows = [[0, 0.06], [0.24, 0.42], [0.46, 0.60], [0.62, 0.74], [0.80, 1.001]];

const inF  = seg(p, a - 0.05, a + 0.04);
const outF = isLast ? 0 : seg(p, b - 0.02, b + 0.05);
const o    = Math.min(isFirst ? 1 : inF, 1 - outF);
opacity   = Math.max(0, o);
transform = `translateY(${(1 - o) * 18}px)`;      // + translateX(-50%) per gli stage
pointerEvents = o > 0.5 ? 'auto' : 'none';
```

La finestra del titolo chiude a **0.06** (non 0.20): il documento bianco arriva al centro intorno a
0.18–0.26 e il titolo è bianco. Con la chiusura tardiva si legge bianco su bianco. Misurato dopo la
correzione: a p=0.09 titolo 0.29 / card 0.38 (lo scambio), a p=0.12 titolo a zero e card al 68%.

**Rail di stage** — 5 trattini a destra, `right: clamp(0.75rem, 3vw, 2rem)`, `top: 50%`,
`gap: 0.75rem`, `height: 2px`. Attivo: `width: 22px`, `background: rgba(255,255,255,0.55)`.
Inattivo: `width: 10px`, `rgba(255,255,255,0.16)`. `transition: width .35s ease, background .35s ease`.

### Adattamento alla viewport (`fitHero`)

Su finestre più basse di ~850px la card centrata finisce sopra le didascalie ancorate in basso.
Non risolverlo con un cap in `vh` sulla card (diventa illeggibile): misurare la banda libera e
adattare `#hero-fit`.

```js
const capTop     = caption1.getBoundingClientRect().top - fit.getBoundingClientRect().top;
const bandTop    = 82;
const bandBottom = capTop + 56;          // la card può correre dietro il piano sfocato
const H = card.offsetHeight;             // 530
const s = Math.max(0.8, Math.min(1, (bandBottom - bandTop) / H));   // pavimento di leggibilità
const shift = (bandTop + bandBottom) / 2 - window.innerHeight / 2;
fit.style.transform = `translateY(${shift}px) scale(${s})`;
```

Ricalcolare su `resize`. Se al primo frame i nodi non sono ancora misurabili, **ritentare**: un fit
fallito e mai ripetuto è stato causa di un bug reale.

---

## 2. Ticker

Fascia con `border-top` e `border-bottom` `1px solid rgba(255,255,255,0.07)`, `padding: 1.125rem 0`,
`overflow: hidden`.

Dentro, un `display: flex; width: max-content` con **due copie identiche** della lista e
`animation: marquee 32s linear infinite` dove `marquee` va da `translate3d(0,0,0)` a
`translate3d(-50%,0,0)`.

Parole: `Preventivo`, `Fattura XML`, `Invio SDI`, `Imposta sostitutiva`, `Contributi INPS`,
`Soglia 85.000`, `Pipeline`, separate da `◆` in `#236CEF`.
Stile: 0.75rem, `font-weight: 500`, `letter-spacing: 0.22em`, uppercase,
`color: rgba(232,237,247,0.28)`, `gap: 2.5rem`.

**Hover su ogni parola:** `color: #fff; font-weight: 800`, `transition: color .2s ease`.
Il peso base è 500 (non 700) perché serve stacco visibile verso 800. Verificato che il cambio di
peso non produce reflow della riga.

---

## 3. Il sistema — `#sistema` (carosello cilindrico)

Sezione `420vh`, sticky interno `100vh`.
Sfondo: `radial-gradient(80% 70% at 50% 55%, #0a142c 0%, #04060d 70%)` più un pattern di punti
`radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)` `background-size: 34px 34px`,
mascherato con `radial-gradient(60% 55% at 50% 50%, #000, transparent)`.

Titolo in alto (`top: clamp(4.5rem, 12vh, 7rem)`, `z-index: 3`): eyebrow `IL SISTEMA` +
h2 `Sei moduli, un solo dato` (`clamp(1.5rem, 4.5vw, 2.5rem)`, 800, `max-width: 22ch`).

### Geometria

Wrapper `perspective: 1200px; perspective-origin: 50% 50%`.
Anello: `position: absolute; top: 50%; left: 50%; width: 0; height: 0; transform-style: preserve-3d`.

```js
const radius = Math.max(300, Math.min(window.innerWidth * 0.58, 560));
// una volta, e su resize:
panels.forEach((el, i) => {
  el.style.transform = `rotateY(${i * 60}deg) translateZ(${radius}px)`;
});
```

Pannelli: `width: min(74vw, 340px)`, `height: min(94vw, 420px)`, margini negativi derivati come per
la card. Card interna: **`box-sizing: border-box`** obbligatorio — con `height: 100%` + `padding`
in content-box la card risulta 44px più alta del wrapper e taglia il proprio contenuto.

Stile card: `background: rgba(9,15,30,0.92)`, `border: 1px solid rgba(255,255,255,0.1)`,
`border-radius: 22px`, `padding: 1.375rem`, `backdrop-filter: blur(10px)`,
`box-shadow: 0 50px 90px -40px rgba(0,0,0,0.95)`.
Il pannello 03 usa `background: rgba(7,12,24,0.95)` e `border: 1px solid rgba(96,165,250,0.24)`.

Intestazione di ogni pannello: nome modulo a sinistra (0.625rem, 700, `letter-spacing: 0.16em`,
uppercase, `rgba(147,197,253,0.6)`) e indice monospace a destra (0.6875rem, `rgba(255,255,255,0.22)`).

Contenuti: **01 Pipeline** (3 righe progetto + una tratteggiata "Trascina qui"),
**02 Preventivi PDF** (tre miniature template), **03 Fattura SDI** (blocco XML + banda verde di
consegna), **04 QuotifAI** (tre bolle di chat + campo input), **05 Dashboard fiscale**
(due KPI, barra soglia 73%, istogramma a 6 barre), **06 App iOS + PWA** (tre notifiche con logo).

### Rotazione con fermi (detents)

Senza fermi la rotazione è lineare e nessun pannello è mai davvero a fuoco: il pannello frontale si
ferma a ~0.73 di opacità, due pannelli sono sempre pari e le didascalie non compaiono mai. Con i
fermi ogni pannello sosta frontale per un tratto di scroll e poi ruota rapidamente al successivo.

```js
const u = p * 5;                       // 6 pannelli = 5 intervalli
const i = Math.min(4, Math.floor(u));
const t = u - i;
const dwell = 0.34;                                     // sosta su ciascun lato
const tt = clamp01((t - dwell) / (1 - dwell * 2));
const target = (i + tt * tt * (3 - 2 * tt)) * 60;       // gradi

// inseguimento smorzato, indipendente dal frame rate
const k = 1 - Math.exp(-dt / 0.11);                     // dt in secondi
turn += (target - turn) * k;
if (Math.abs(target - turn) < 0.05) turn = target;

ring.style.transform = `translateY(${shift}px) scale(${fitScale})
                        translateZ(${-radius * 0.82}px) rotateY(${-turn}deg)`;
```

Stato derivato **dalla rotazione smorzata**, non da `p` (così opacità, sfocatura e indicatori
arrivano insieme alla rotazione):

```js
const activeF = turn / 60;
// pannelli
const d = Math.abs(activeF - i);
opacity = Math.max(0.1, 1 - d * 0.8);
filter  = d > 0.5 ? 'blur(3px)' : 'none';
// didascalie
opacity = clamp01(1 - Math.abs(activeF - i) * 1.7);
transform = `translateY(${(1 - o) * 14}px)`;
// indicatori
width = i === Math.round(activeF) ? '20px' : '8px';
```

### Adattamento dell'anello

Il `translateZ` in avanti ingrandisce il pannello frontale per prospettiva; senza compensazione
finisce sopra il proprio titolo e la propria didascalia. Misurare la banda libera e risolvere la
scala tenendo conto dell'ingrandimento:

```js
const bandTop    = headingBlock.offsetTop + headingBlock.offsetHeight + 14;
const bandBottom = captionWrapper.offsetTop - 14;
const band = bandBottom - bandTop;
const H = panel.offsetHeight;               // 420
const persp = 1200, k = 0.18 * radius;      // 0.18 = 1 − 0.82
const fitScale = Math.min(1, (band * persp) / (H * persp + band * k));
const shift    = (bandTop + bandBottom) / 2 - window.innerHeight / 2;
```

Didascalie sotto l'anello (`bottom: clamp(2rem, 8vh, 4.5rem)`, `max-width: 620px`, contenitore
`height: 4.5rem` con i sei blocchi sovrapposti in `position: absolute; inset: 0`):

| # | Titolo | Corpo |
|---|--------|-------|
| 1 | Pipeline Kanban | Progetti illimitati. Trascini, e importo e stato pagamento seguono. |
| 2 | Preventivi PDF | Tre template professionali, il tuo logo, invio diretto al cliente. |
| 3 | Fatturazione SDI | XML FatturaPA 1.2.2, codice destinatario e PEC gestiti da noi. |
| 4 | QuotifAI | Il consulente fiscale che legge i tuoi dati e risponde in italiano. |
| 5 | Dashboard fiscale | Fatturato, soglia, imposte e contributi. In tempo reale, senza sorprese. |
| 6 | App iOS + PWA | Installala sul telefono. Notifiche push per scadenze e stati SDI. |

Sei indicatori in basso al centro, stesso pattern del rail dell'hero (20px / 8px).

---

## 4. Il banco di lavoro — `#banco` (demo interattiva)

Sfondo `linear-gradient(180deg, #04060d 0%, #060b18 45%, #04060d 100%)` più un alone in alto
`radial-gradient(ellipse at 50% 0%, rgba(35,108,239,0.22) 0%, transparent 65%)`.

Intestazione centrata: eyebrow `IL BANCO DI LAVORO`, h2
`Fai un preventivo adesso. Senza registrarti` (`clamp(1.875rem, 6vw, 3.25rem)`, 800,
`letter-spacing: -0.035em`), sottotitolo
`Aggiungi le voci e guarda il forfettario ricalcolarsi. Poi mandalo al SDI.`

Griglia a due colonne: `repeat(auto-fit, minmax(min(100%, 340px), 1fr))`, gap
`clamp(1.5rem, 4vw, 3.5rem)`, `align-items: start`.

### Colonna sinistra — controlli

**Blocco 01 — Scegli le voci.** Cinque bottoni:

```js
const SERVICES = [
  { id: 0, name: 'Sviluppo sito web — 20h', price: 2000 },
  { id: 1, name: 'Logo e brand identity',   price: 450  },
  { id: 2, name: 'Consulenza UX — 5h',      price: 500  },
  { id: 3, name: 'App mobile',              price: 4800 },
  { id: 4, name: 'Newsletter mensile',      price: 600  },
];
const DEFAULT_SELECTED = [0, 2];
```

Stile bottone — `border-radius: 14px`, `padding: 0.9375rem 1.125rem`, hover
`transform: translateX(3px)`, `transition: background .2s, border-color .2s, transform .2s`.

| | non selezionato | selezionato |
|---|---|---|
| background | `rgba(255,255,255,0.025)` | `rgba(35,108,239,0.14)` |
| border | `rgba(255,255,255,0.08)` | `rgba(96,165,250,0.45)` |
| testo | `rgba(232,237,247,0.65)` | `#ffffff` |
| quadratino 22px | `rgba(255,255,255,0.07)` / `rgba(232,237,247,0.4)` con `+` | `#236CEF` / `#fff` con `✓` |

Toggle di una voce **azzera il flow a 0** (il documento torna in bozza).

**Blocco 02 — Il forfettario, calcolato.** Tre righe a filo
(`border-bottom: 1px solid rgba(255,255,255,0.06)`, `padding: 0.875rem 0`), etichetta a sinistra
0.8125rem `rgba(232,237,247,0.5)` con la percentuale in `rgba(232,237,247,0.28)`, valore a destra
1.0625rem 600 `#fff` `font-variant-numeric: tabular-nums`.

```js
const tot     = selected.reduce((a, s) => a + s.price, 0);
const reddito = tot * 0.78;          // coefficiente di redditività
const imposta = reddito * 0.05;      // imposta sostitutiva primi 5 anni
const inps    = reddito * 0.2623;    // gestione separata
const netto   = tot - imposta - inps;
const pct     = Math.min(100, tot / 85000 * 100);
```

`Ti resta in tasca` — eyebrow 0.6875rem 700 `letter-spacing: 0.18em` uppercase
`rgba(110,231,183,0.7)`, valore `clamp(2.5rem, 9vw, 4rem)` 800 `letter-spacing: -0.04em`.

Barra soglia: traccia 6px `rgba(255,255,255,0.07)`, riempimento
`linear-gradient(90deg, #236CEF, #60a5fa)`, `transition: width .55s cubic-bezier(0.16,1,0.3,1)`.

**Formattazione valuta.** Non usare `Number.toLocaleString('it-IT')`: in alcuni runtime restituisce
`2000` invece di `2.000`, e finisce accanto a valori raggruppati scritti a mano. Raggruppare
esplicitamente:

```js
const eur = n => '€ ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
```

### Colonna destra — il documento

Wrapper `perspective: 1500px; perspective-origin: 50% 40%`; dentro un `#bench-doc` con
`transform-style: preserve-3d`. Card bianca `border-radius: 22px`,
`box-shadow: 0 70px 120px -50px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.14), 0 0 90px -30px rgba(35,108,239,0.5)`.

**Inclinazione al mouse — tre regole, tutte necessarie:**

1. Nessun `translateZ` variabile. Facendo avanzare e arretrare la card sotto il puntatore, il bordo
   dei bottoni entra ed esce da sotto il cursore: il cursore alterna manina e freccia e i click si
   perdono. Solo rotazioni.
2. Quando il puntatore entra nella card, l'inclinazione torna a riposo e si ferma. I bottoni restano
   immobili.
3. Non dichiarare `transform` nello stile statico dell'elemento se il framework possiede quella
   proprietà (in React la riscrive a ogni render annullando l'animazione). In vanilla JS non è un
   problema, ma vale come nota se un giorno la pagina passasse a un framework.

```js
// target
if (doc.contains(e.target)) { tx = -7; ty = 3; }
else {
  const nx = (e.clientX / innerWidth - 0.5) * 2;
  const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  tx = -7 + nx * 6;
  ty = 3 - ny * 4;
}
// nel loop, smorzato con lo stesso k dell'anello
cx += (tx - cx) * k;  cy += (ty - cy) * k;
doc.style.transform = `rotateY(${cx}deg) rotateX(${cy}deg)`;
```

**Stepper** in testa alla card (4 passi su `#fbfcfe`, `border-bottom: 1px solid #eef2f8`):
`Preventivo`, `PDF firmato`, `XML FatturaPA`, `Consegnata SDI`. Pallino 20px —
completato `#10b981`, corrente `#236CEF`, futuro `#eef2f8` con testo `#94a3b8`.
Etichetta: corrente `#0f172a`, completata `#059669`, futura `#94a3b8`.

**Stato del documento** (`flow` 0→3):

| flow | Tipo | Numero | Badge | CTA |
|------|------|--------|-------|-----|
| 0 | Preventivo | PR-2026-0118 | `Bozza` — bg `#f6f8fc`, bordo `#e6ecf5`, pallino `#94a3b8`, testo `#64748b` | `Genera il PDF` |
| 1 | Preventivo | PR-2026-0118 | `PDF generato` — `#eef4ff` / `#bfdbfe` / `#236CEF` / `#1d4ed8` | `Trasforma in fattura XML` |
| 2 | Fattura elettronica | FT-2026-0042 | `XML pronto` — come sopra | `Invia al SDI` |
| 3 | Fattura elettronica | FT-2026-0042 | `Consegnata dal SDI` — `#ecfdf5` / `#a7f3d0` / `#10b981` / `#047857` | `Fatto. Tutto risolto ✓` |

Da `flow >= 2` appare il blocco XML sotto il totale (`#070c18`, radius 14px, monospace 0.6875rem)
con `<ImportoTotaleDocumento>` uguale a `tot.toFixed(2)`.

CTA primaria: `#236CEF` (`#059669` a flow 3), `border-radius: 14px`, `padding: 0.9375rem 1.25rem`,
`box-shadow: 0 14px 30px -14px rgba(35,108,239,0.8)`, hover `translateY(-2px)`.
Secondaria `Ricomincia`: bianco, bordo `#e6ecf5`, testo `#64748b` → hover `#0f172a` / `#cbd5e1`;
riporta `flow = 0` e la selezione a `[0, 2]`.

Corpo del documento: intestazione Cedente `Mario Rossi / P.IVA 12345678901` e Cliente
`Acme Srl / SDI M5UXCR1` in box `#f6f8fc` radius 12px; tabella righe con intestazione `#fbfcfe`
(0.625rem, 700, `letter-spacing: 0.1em`, uppercase, `#94a3b8`) e righe separate da
`1px solid #f4f7fc`; stato vuoto `Aggiungi una voce a sinistra` (`#94a3b8`, centrato);
piede `#eef4ff` radius 14px con dicitura `Regime forfettario — IVA esente / Art. 1 c. 54-89 L. 190/2014`
e totale `clamp(1.5rem, 4vw, 1.875rem)` 800 `#1d4ed8`.

---

## 5. I numeri del forfettario

### Titolo a riempimento liquido

`Quattro numeri che decidono il tuo anno. Quotify li tiene tutti` —
`clamp(1.875rem, 6vw, 3.25rem)`, 800, `letter-spacing: -0.035em`, `text-wrap: balance`.

Colore statico `rgba(232,237,247,0.16)` così il testo è leggibile anche prima che JS parta; le
proprietà di clipping vengono aggiunte da JS al primo frame:

```js
head.style.webkitBackgroundClip = 'text';
head.style.backgroundClip = 'text';
head.style.webkitTextFillColor = 'transparent';
head.style.backgroundRepeat = 'no-repeat';
```

Riempimento guidato dallo scroll (dal basso verso l'alto, tre stop a fare il menisco):

```js
const r = head.getBoundingClientRect();
const f = clamp01((innerHeight * 0.86 - r.top) / (r.height + innerHeight * 0.28)) * 100;
head.style.backgroundImage =
  `linear-gradient(to top,
     #236CEF 0%,
     #4d8bf5 ${Math.max(0, f - 4)}%,
     #7fb0f9 ${f}%,
     rgba(232,237,247,0.16) ${Math.min(100, f + 3)}%,
     rgba(232,237,247,0.16) 100%)`;
```

### Le quattro celle

Griglia `repeat(auto-fit, minmax(min(100%, 210px), 1fr))` con `gap: 1px` e
`background: rgba(255,255,255,0.08)` sul contenitore (le linee di separazione sono il gap).
Celle `background: #04060d`, `padding: clamp(1.75rem, 4vw, 2.5rem) clamp(1.25rem, 3vw, 1.75rem)`,
hover `background: #070d1c`, `transition: background .35s ease`.

Ogni cella: indice monospace + etichetta uppercase in testa, numero
`clamp(2.25rem, 7vw, 3.375rem)` 800 `letter-spacing: -0.04em` `tabular-nums`, barra 3px, descrizione
0.8125rem `rgba(232,237,247,0.45)`.

| # | Etichetta | Valore | Barra | Descrizione |
|---|-----------|--------|-------|-------------|
| 01 | Soglia annuale | 85.000 | 73% | Superarla ti butta fuori dal regime: Quotify ti avvisa prima. |
| 02 | Coefficiente | 78% | 78% | La redditività della tua attività, applicata a ogni fattura. |
| 03 | Imposta | 5% | 5% | Sostitutiva dei primi cinque anni. Poi 15%, e il calcolo cambia da solo. |
| 04 | Contributi | 26,23% | 26,23% | INPS gestione separata, accantonati fattura per fattura. |

Animazione all'ingresso in viewport (parte quando `section.top < innerHeight * 0.8`, durata 1600ms):

```js
const t = clamp01((now - start) / 1600);
for (let i = 0; i < 4; i++) {
  const e = ease(clamp01((t - i * 0.09) / 0.7));    // sfalsata
  num.textContent = format(TARGET[i] * e);
  num.style.opacity   = 0.15 + 0.85 * e;
  num.style.transform = `translateY(${(1 - e) * 16}px)`;
  bar.style.width     = `${BAR[i] * e}%`;
}
```

`26,23%` si formatta con la virgola decimale italiana e il punto per le migliaia.

---

## 6. Prezzi — `#prezzi`

Contenitore `max-width: 980px`. Intestazione centrata: badge `BETA GRATUITA`
(`rgba(16,185,129,0.12)` su bordo `rgba(16,185,129,0.3)`, testo `#6ee7b7`), h2
`Due piani, nessuna carta di credito`, sottotitolo
`Durante la beta il piano Free è completo. Il Pro lo provi 14 giorni.`

Griglia in `perspective: 1600px`. Le due schede sono **lastre inclinate**: `rotateY(6deg)` la Free,
`rotateY(-6deg)` la Pro; all'hover `rotateY(0deg) translateZ(40px)`,
`transition: transform .4s cubic-bezier(0.16,1,0.3,1), border-color .3s ease`.

> Se la scheda ha anche un'animazione di reveal che scrive `transform`, le due si annullano a
> vicenda: comporre entrambe nella stessa stringa (`rotateY(...) translateY(...)`) oppure mettere
> l'inclinazione su un wrapper interno.

**Free** — `background: rgba(255,255,255,0.03)`, `border: 1px solid rgba(255,255,255,0.09)`,
`border-radius: 24px`, `padding: clamp(1.75rem, 4vw, 2.5rem)`. Prezzo `€ 0/mese`
(`clamp(2.5rem, 8vw, 3.25rem)`, 800, suffisso 1rem 400 `rgba(232,237,247,0.35)`).
Sottotitolo `Per iniziare senza pensieri.` Spunte `#34d399`. CTA
`rgba(255,255,255,0.07)` bordo `rgba(255,255,255,0.14)` → hover `rgba(255,255,255,0.12)`,
testo `Inizia gratis`.

Voci: Pipeline Kanban — progetti illimitati / Preventivi PDF — creazione e download /
Creazione fatture elettroniche (XML) / Dashboard fiscale / QuotifAI — 3 messaggi al mese /
Notifiche push e promemoria automatici / App nativa iOS + PWA installabile.

**Pro** — `background: linear-gradient(180deg, rgba(35,108,239,0.18) 0%, rgba(35,108,239,0.04) 100%)`,
`border: 1px solid rgba(96,165,250,0.35)`,
`box-shadow: 0 60px 110px -60px rgba(35,108,239,1)`. Nastro `CONSIGLIATO` in alto a destra
(`#236CEF`, `border-radius: 0 0 10px 10px`, 0.625rem 700 `letter-spacing: 0.12em`).
Prezzo `€ 6,99/mese`, sottotitolo `Per chi vuole il massimo dal proprio business.`
Spunte `#60a5fa`. CTA `#236CEF` → hover `#1d4ed8`, testo `Prova Pro gratis — 14 giorni`.

Voci: Tutto quello del piano Free, più: / Invio fatture al SDI direttamente dall'app /
QuotifAI illimitato / Branding personalizzato — logo e colori su PDF / Supporto prioritario.

Tutte le CTA puntano a `https://app.quotify.it/register`.

---

## 7. FAQ — `#faq`

Contenitore `max-width: 880px`. h2 `Domande frequenti`.
Lista con `border-top` e `border-bottom` per riga `1px solid rgba(255,255,255,0.09)` (nessuna card).

Riga chiusa → aperta: `background` da `transparent` a `rgba(35,108,239,0.06)`,
indice monospace da `rgba(147,197,253,0.4)` a `#60a5fa`, `+` da `rgba(232,237,247,0.3)` a `#60a5fa`
e `transform: rotate(45deg)` (`transition: transform .3s cubic-bezier(0.16,1,0.3,1)`).
Bottone `padding: 1.5rem 0.5rem`, domanda `clamp(1rem, 2.6vw, 1.1875rem)` 600.
Risposta `padding: 0 0.5rem 1.75rem clamp(2.5rem, 6vw, 4rem)`, 0.9375rem,
`color: rgba(232,237,247,0.5)`, `line-height: 1.75`, `max-width: 60ch`.
Un solo pannello aperto alla volta.

Le cinque domande e risposte sono nel file di design; sono le stesse del sito attuale, accorciate.
In chiusura: `Hai altre domande? Scrivici` → `mailto:info@alessandroterracciano.com`.

---

## 8. CTA finale

`padding: clamp(9rem, 26vh, 15rem) clamp(1.25rem, 5vw, 3rem)`, centrata.

**Due strati di background** — il radiale del blu resta confinato al centro e ai bordi rientra nel
nero della pagina, così non c'è nessun taglio secco né verso la FAQ né verso il footer:

```css
background:
  linear-gradient(180deg, #04060d 0%, rgba(4,6,13,0.85) 12%, rgba(4,6,13,0) 34%,
                          rgba(4,6,13,0) 62%, rgba(4,6,13,0.7) 84%, #04060d 100%),
  radial-gradient(85% 95% at 50% 78%, #16409c 0%, #0a1c46 45%, #071026 70%, #04060d 100%);
```

Per lo stesso motivo la FAQ chiude con `linear-gradient(180deg, #04060d 0%, #04060d 70%, #050912 100%)`
e il footer apre con `linear-gradient(180deg, #05080f 0%, #04060d 40%)` **senza `border-top`**.

Anello orbitante: cerchio `min(90vw, 620px)` centrato, `border: 1px solid rgba(147,197,253,0.12)`,
`animation: orbit 40s linear infinite` (0→360deg), con il logo 28px agganciato in cima
(`top: -14px; left: 50%; margin-left: -14px`, `opacity: 0.75`).

Alone in basso che si alza con lo scroll:
```js
const p = clamp01(1 - rect.top / innerHeight);
glow.style.transform = `translateY(${-p * 90}px) scale(${0.85 + p * 0.3})`;
```

Titolo `Dal preventivo alle tasse, risolto.` — `clamp(2.25rem, 9vw, 4.75rem)`, 800,
`letter-spacing: -0.045em`, `line-height: 1.0`, `text-wrap: balance`.
Sottotitolo `Gratis durante la beta, senza carta di credito.`
CTA: `Inizia gratis adesso` (bianco su `#1d4ed8`, hover `translateY(-2px)`) e
`Hai domande? Scrivici` (vetro `rgba(255,255,255,0.08)` bordo `rgba(255,255,255,0.2)`).

---

## 9. Footer

Tre colonne `repeat(auto-fit, minmax(min(100%, 220px), 1fr))`, gap `clamp(2rem, 5vw, 3rem)`.
Brand + `La piattaforma per freelance italiani in Regime Forfettario.` +
`P.IVA 10838411212 — Milano, Italia`.
Colonne `Prodotto` (Il sistema / Provalo / Prezzi / FAQ) e `Legale e contatti`
(Privacy Policy / Termini di Servizio / Cookie Policy / Assistenza / email).
Riga finale su `border-top: 1px solid rgba(255,255,255,0.06)`:
`© 2026 Quotify. Tutti i diritti riservati.` e `Fatto con cura per i freelance italiani`.

Intestazioni di colonna: 0.75rem, 700, `letter-spacing: 0.12em`, uppercase,
`rgba(232,237,247,0.35)`. Link 0.875rem `rgba(232,237,247,0.6)`.

---

## Navbar

`position: fixed`, `height: 64px`, `background: rgba(4,6,13,0.5)`,
`backdrop-filter: blur(18px)`, `border-bottom: 1px solid rgba(255,255,255,0.06)`, `z-index: 90`.
Logo 28px radius 8px + wordmark 1.0625rem 700. Link 0.8125rem 500 `rgba(232,237,247,0.55)`:
`Il sistema` (`#sistema`), `Provalo` (`#banco`), `Prezzi` (`#prezzi`).
CTA `Prova gratis`: `#236CEF`, radius 10px, `padding: 0.5rem 1rem`,
`box-shadow: 0 8px 24px -8px rgba(35,108,239,0.9)`.

Il menu mobile non è ridisegnato: riusare quello già in `index.html` / `main.js`, ricolorandolo su
`#04060d` invece di `primary-900`.

---

## Il loop di animazione — note di implementazione

Queste tre cose sono costate debugging reale nel prototipo. Vale la pena replicarle.

**1. Riprogrammare il frame *prima* di eseguire il lavoro.** Con
`tick(); raf(loop);` una singola eccezione spegne l'animazione per sempre. Invertire, e proteggere:

```js
function loop() {
  if (!alive()) return;
  requestAnimationFrame(loop);
  try { tick(); } catch (err) { console.warn('tick', err); }
}
```

**2. Nessun latch `if (queued) return`.** Un pattern comune è marcare un frame come "in coda" e
uscire subito; se quel frame non viene mai consegnato (iframe nascosto, tab in background) il flag
resta alzato e ogni scroll successivo esce anticipatamente: l'intera pagina si congela. Usare un
loop che si rischedula da sé, e in aggiunta chiamare il tick su `scroll` per la reattività
immediata.

**3. Smorzamento basato sul tempo, non per-frame.** `x += (target - x) * 0.09` dipende dal frame
rate: dove i timer sono limitati converge in decine di secondi. Usare
`k = 1 - Math.exp(-dt / 0.11)` con `dt` in secondi, limitato a 0.25.

**Reveal all'ingresso in viewport.** Nel prototipo l'IntersectionObserver non scattava in un
contesto particolare e mezza pagina restava a `opacity: 0`. Il contenuto non deve mai dipendere da
un observer per diventare visibile: nel repo di Quotify va bene usare l'IntersectionObserver già
presente in `main.js`, **ma** partendo da contenuto visibile e togliendo l'animazione con
`@media (prefers-reduced-motion: reduce)`. Parametri usati: stato iniziale
`opacity: 0; transform: translateY(26px)`, transizione
`0.9s cubic-bezier(0.16,1,0.3,1)` con ritardo `(i % 4) * 0.07s`, soglia di attivazione
`rect.top < innerHeight * 0.94`.

**Accessibilità e performance.** Da aggiungere in implementazione, non presente nel prototipo:
- `@media (prefers-reduced-motion: reduce)`: disattivare pin e rotazioni, mostrare le sezioni
  in flusso statico con i contenuti già allo stato finale.
- `will-change: transform` solo sugli elementi effettivamente animati (già indicato sopra).
- Sospendere il loop quando `document.hidden` è vero.
- Le sezioni pinned sono `overflow: hidden`: verificare che non introducano scroll orizzontale
  su iOS.

---

## Design tokens

**Colori — già in `style.css` (`@theme`), da riusare:**

| Token | Hex |
|-------|-----|
| `--color-primary-600` | `#236CEF` |
| `--color-primary-700` | `#1d4ed8` |
| `--color-primary-500` | `#3b82f6` |
| `--color-primary-400` | `#60a5fa` |
| `--color-primary-300` | `#93c5fd` |
| `--color-primary-200` | `#bfdbfe` |
| `--color-primary-100` | `#dbeafe` |
| `--color-primary-50` | `#eff6ff` |

**Colori nuovi da aggiungere al blocco `@theme`** (la scala scura del nuovo sito):

| Nome proposto | Hex | Uso |
|---|---|---|
| `ink-900` | `#04060d` | fondo pagina |
| `ink-800` | `#05080f` | attacco footer |
| `ink-700` | `#070d1c` | fondo alternato, hover celle |
| `ink-600` | `#090f1e` | card dell'anello (con alpha 0.92) |
| `ink-panel` | `#070c18` | faccia XML, blocchi codice |
| `ink-deep` | `#0d1b3e` | alto del radiale hero |
| `ink-mid` | `#0a142c` | radiale sezione sistema |
| `blue-deep` | `#16409c` | centro del radiale CTA |
| `foam` | `#e8edf7` | testo su fondo scuro |
| `liquid-mid` | `#4d8bf5` | stop intermedio riempimento |
| `liquid-top` | `#7fb0f9` | menisco riempimento |

Verde di conferma: `#10b981` / `#34d399` / `#6ee7b7` / `#059669` / `#047857` / `#ecfdf5` /
`#a7f3d0` (già presenti come `emerald-*` di Tailwind).
Neutri chiari usati dentro i documenti bianchi: `#fbfcfe`, `#f6f8fc`, `#f4f7fc`, `#eef4ff`,
`#eef2f8`, `#e6ecf5`, `#cbd5e1`, `#94a3b8`, `#64748b`, `#475569`, `#334155`, `#0f172a`.

**Alpha su bianco ricorrenti:** `0.025` `0.03` `0.05` `0.06` `0.07` `0.08` `0.09` `0.12` `0.14`
`0.16` `0.2` `0.28` `0.35` `0.45` `0.5` `0.55` `0.6` `0.65` `0.72` `0.78`.

**Tipografia.** Inter (già caricata), pesi 400/500/600/700/800.
Display: `clamp(2.25rem, 9vw, 4.75rem)` · H2 sezione: `clamp(1.875rem, 6vw, 3.25rem)` ·
H2 stage: `clamp(1.375rem, 4.5vw, 2rem)` · H3 modulo: `clamp(1.125rem, 3.5vw, 1.625rem)` ·
Numero metrica: `clamp(2.25rem, 7vw, 3.375rem)` · Corpo grande: `clamp(1rem, 2.4vw, 1.125rem)` ·
Corpo: `0.9375rem` / `0.875rem` · Micro: `0.8125rem` / `0.75rem` / `0.6875rem` / `0.625rem` /
`0.5625rem`.
`letter-spacing`: `-0.045em` display, `-0.035em` H2, `-0.02em` H3, `0.12em`–`0.22em` per gli
eyebrow uppercase. Numeri sempre `font-variant-numeric: tabular-nums`.
Monospace: `ui-monospace, SFMono-Regular, Menlo, monospace` per indici e XML.

**Raggi:** 8 · 10 · 12 · 14 · 18 · 20 · 22 · 24 · 99px (pill).
**Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` per le transizioni CSS; cubic-out
`1-(1-t)³` e smoothstep `t²(3-2t)` nel JS.
**Durate:** 0.2s hover · 0.35s stato · 0.55s barra · 0.9s reveal · 1.6s conteggio numeri ·
32s ticker · 40s orbita.

---

## Assets

- `assets/quotify-logo.png` — copia di `public/pwa-192x192.png` del repo. Usata in navbar,
  faccia preventivo, notifiche del pannello 06, anello CTA, footer. In produzione referenziare
  direttamente `/pwa-192x192.png`.
- `assets/quotify-mark.svg`, `assets/quotify-mark-blu.svg` — marchi presi da `_to_delete/` del repo,
  incluse per completezza; non usate nel design finale.
- Nessuna immagine nuova. Non ci sono fotografie né illustrazioni: tutta la grafica è CSS.
  `public/images/earth-map-colored.png` (il globo del sito attuale) **non serve più**.

---

## Files

| File | Contenuto |
|------|-----------|
| `Quotify 3D v2.dc.html` | Il design definitivo, sorgente completo (template + logica). |
| `Quotify 3D.dc.html` | Versione precedente: seconda metà con griglia piatta invece del carosello. Solo per confronto. |
| `Sito Attuale.dc.html` | Ricostruzione del sito attuale, usata come base di confronto. |
| `assets/` | Logo e marchi. |

I `.dc.html` girano su un runtime a componenti proprietario: aprire i file fuori dal progetto di
origine non li renderizza. Sono inclusi come **sorgente di riferimento** — ogni valore necessario
all'implementazione è riportato in questo README.

---

## Note per il deploy

Il repo attuale è Vite (`vite.config.js`) con Tailwind v4 importato in `style.css`, `main.js` come
entrypoint modulo, e artefatti Cloudflare Pages in `public/` (`_headers`, `_redirects`,
`sitemap.xml`, `robots.txt`), più Cloudflare Web Analytics inline in `index.html`.

Da preservare nel rifacimento:

- I meta SEO e Open Graph di `index.html` (title, description, canonical, og:image `og-quotify.jpg`,
  twitter card, `facebook-domain-verification`, `theme-color`).
- Il banner cookie e la sua logica in `main.js` (cookie tecnici + marketing Meta con consenso).
- Le pagine `privacy.html`, `termini.html`, `cookie.html`, `assistenza.html` e i redirect in
  `public/_redirects`.
- Il service worker / manifest PWA e le icone.
- Gli ancoraggi: gli id delle sezioni cambiano (`#funzionalita` → `#sistema`,
  `#come-funziona` → assorbito nel carosello, `#banco` è nuovo). Aggiungere redirect di ancora o
  mantenere gli id vecchi come alias su quelli nuovi, e aggiornare `sitemap.xml`.

Suggerimento di sequenza: implementare prima le sezioni non-pinned (banco, numeri, prezzi, FAQ, CTA,
footer, navbar) — sono HTML e Tailwind ordinari e portano già l'80% del salto visivo. Poi hero e
carosello, che sono i due unici pezzi con coreografia, dietro un singolo modulo JS con il loop
descritto sopra.

---

## Scostamenti in fase di implementazione (2026-08-26)

Tutto il resto è stato implementato con i numeri di questo documento. Un solo
scostamento, e la ragione.

### Finestre di visibilità delle didascalie hero (§1)

Le finestre della specifica producono una **dissolvenza incrociata**: la 02
chiude a `0.60`, la 03 apre a `0.62`, ma dissolvono rispettivamente su `0.07` e
`0.09` di progresso. Risultato: a `p=0.62` la 02 è a `0.43` e la 03 a `0.56`
**contemporaneamente**, e i due blocchi di testo — che occupano la stessa
posizione e hanno lo stesso piano sfocato dietro — si leggono uno sopra l'altro.
Verificato in produzione con uno screenshot: illeggibile.

Misurato su 1000 campioni di scroll:

| | didascalie sovrapposte (>0.15) | nessuna didascalia |
|---|---|---|
| formula della specifica | 108 / 1000 | 81 / 1000 |
| formula adottata | **0 / 1000** | **4 / 1000** |

La formula adottata fa partire la dissolvenza in entrata esattamente dove
finisce quella in uscita precedente:

```js
const prevB = i > 0 ? HERO_WINDOWS[i - 1][1] : 0
const inF  = i === 0 ? 1 : seg(p, prevB, prevB + 0.035)
const outF = isLast ? 0 : seg(p, b - 0.035, b)
const o    = Math.max(0, Math.min(inF, 1 - outF))
```

Le finestre `HERO_WINDOWS` restano quelle della specifica: cambia solo il modo
in cui si entra e si esce.

### Comportamento mobile del banco di lavoro (§4)

Il design mette i controlli a sinistra e il documento a destra. Su una colonna
sola questo diventa: voci → calcoli → documento, e misurato a 390×844 il totale
del documento finiva **1134px sotto** la lista dei servizi. Toccare una voce non
produceva **nessun riscontro visibile**: la sezione promette "guarda il
forfettario ricalcolarsi" e su telefono non manteneva la promessa.

Due interventi, entrambi solo sotto i 1024px:

1. **Ordine**: voci → **documento** → calcoli. Il documento passa da 336px sotto
   il bordo a 94px sopra: è già a schermo mentre scegli. Nel DOM resta dopo i
   calcoli (su desktop occupa la colonna destra su due righe) e viene riportato
   al suo posto con `order`.
2. **Barra di riepilogo** agganciata in basso, con numero di voci, totale e
   "ti resta". Si aggiorna nell'istante del tocco e sparisce da sola appena il
   totale del documento entra in vista.

È l'unica media query del sito. Il design non ne aveva perché il layout è fluido
per costruzione; qui però non è una questione di dimensioni ma di **ordine**, e
non esiste modo di esprimerlo senza un punto di rottura.

### Stage finale dell'hero su schermo stretto (§1)

`shrink` sposta la card di `-44%` e la dashboard di `+26%`: separazione
orizzontale che presuppone spazio laterale. A 390px la dashboard finiva a
`x=606`, cioè **216px fuori schermo**, e l'ultimo stage — il pagamento di tutta
la sequenza — era per metà invisibile.

Sotto i 720px la separazione orizzontale è disattivata: la card resta centrata e
sfuma (`opacity × (1 - shrink·0.92)`) mentre la dashboard arriva al centro.
Stessa lettura, niente che esce. Misurato dopo: dashboard da 31 a 361 su 390.

### `minmax(0, 1fr)` e non `1fr`

Trappola di CSS Grid trovata riscrivendo la griglia del banco: `1fr` vale
`minmax(auto, 1fr)` e `auto` come minimo è **min-content**. Lo stepper del
documento ha quattro etichette che non vanno a capo, quindi la colonna si
allargava a 447px dentro un contenitore da 350 e la pagina scorreva in
orizzontale. La griglia originale del design usava
`minmax(min(100%, 340px), 1fr)`, che il minimo lo limitava — sostituendola con
`1fr` si perdeva quella protezione senza che fosse evidente.

### Chip della burocrazia: materici, e sei su telefono (2026-08-27)

Nel design i chip sono `rgba(255,255,255,0.05)` con testo al 72%: su schermo si
leggono appena. Ora sono pillole chiare con tre ombre sovrapposte (contatto,
distanza, luce sul bordo) e si orientano verso il centro della scena
(`rotateX`/`rotateY` derivati dalla posizione), così leggono come oggetti nello
spazio invece che come etichette piatte.

Sono **alternati girando attorno al centro**: chiaro con testo blu Quotify, blu
con testo bianco, e così via lungo il cerchio.

L'alternanza va calcolata sull'angolo, non sull'ordine nel DOM. I `CHIP_SEEDS`
alternano già sinistra/destra — indici pari a sinistra, dispari a destra — quindi
un'alternanza per indice cade esattamente sopra quella divisione e produce metà
schermo di un colore e metà dell'altro. `applicaColoriChip()` ordina per
`atan2(-sy, sx)` e assegna a giro.

Va ricalcolata anche al cambio di larghezza: su telefono spariscono gli indici 2
e 3, che nell'assegnazione a otto sono **entrambi blu**, e senza ricalcolo
resterebbero due chiari adiacenti. L'HTML porta il default statico a otto chip
per chi non ha JavaScript. I gradienti di fondo sono volutamente strettissimi e il rilievo lo fanno le
quattro ombre: con stop più marcati il contrasto del testo scendeva sotto la
soglia AA — misurato 4,22:1 sul chiaro (fondo `#eef3fb`) e 3,68:1 sul blu
(stop alto `#3b82f6`). Ora 4,58 e 4,71, entrambi sopra 4,5.

Su telefono ne restano **sei**: i due più vicini al centro verticale — indici 2 e
3, `Coefficiente 78%` e `Soglia € 85.000` — cadevano sopra il titolo. Misurato a
390×844: chip 2 a y=451 con l'h1 che finisce a 468, chip 3 a y=512 sul
sottotitolo. Il respiro orizzontale è limitato a `0.42` e non oltre: la pillola
più larga è ~114px e con `sx=0.82` il suo bordo uscirebbe dallo schermo sopra
`0.44`.

### Didascalie tolte dal rendering, non solo trasparenti

A opacità zero un elemento resta un layer da comporre. Ora a `o <= 0.002` passa
a `visibility: hidden`. Non sono riuscito a riprodurre il residuo segnalato
nemmeno spingendo il contrasto di uno screenshot 8×, ma questo lo rende
impossibile per costruzione invece che improbabile.

### Superficie continua: nessuno stacco fra sezioni

Richiesta: fra le sezioni non si deve vedere niente. Misurando i pixel ai bordi
sono emersi tre difetti veri, non uno:

1. Il ticker aveva `border-y` — due righe da 1px, per definizione uno stacco.
2. `faq → cta` (`#050912` → `#04060d`) e `cta → footer` (`#04060d` → `#05080f`)
   avevano colori terminali diversi.
3. Il difetto peggiore, invisibile campionando ai margini: **i veli si
   interrompevano di netto sul bordo della sezione**. Il velo del banco è
   un'ellisse centrata sul bordo superiore, quindi al centro della pagina
   arrivava alla giunzione alla massima intensità — salto di **69 livelli** fra
   due pixel adiacenti. E l'alone della CTA era un elemento a `bottom:-20%`
   tagliato dall'`overflow:hidden` della sezione: altri **26**.

Architettura adottata: una sola superficie (`body`), e ogni sezione ci appoggia
sopra soltanto un velo in uno **pseudo-elemento mascherato**, che la maschera
porta a trasparente prima del bordo. Così la giunzione cade sempre in zona
completamente trasparente. L'alone della CTA non è più un elemento ma il centro
del radiale del velo, mosso dallo scroll tramite la variabile `--salita`: essendo
dentro la maschera, non può produrre bordi.

Salto massimo fra pixel adiacenti, misurato su 8 bordi × 6 posizioni orizzontali:

| | salto peggiore |
|---|---|
| prima | 69 |
| con i veli trasparenti | 26 |
| con i veli mascherati | **2** |

Due livelli sommati su R+G+B, cioè meno di uno per canale: sotto la soglia di
percezione e dentro il rumore di quantizzazione a 8 bit.
