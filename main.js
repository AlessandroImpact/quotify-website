/* ═══════════════════════════════════════════════════════════════
   Quotify — homepage 3D scroll-driven
   Riferimento: docs/redesign-3d-handoff.md

   Un solo loop di animazione, nessuna libreria 3D: tutta la grafica
   è CSS. Three.js e GSAP sono stati rimossi con il redesign.
═══════════════════════════════════════════════════════════════ */
import Lenis from '@studio-freight/lenis'

/* ── helper ────────────────────────────────────────────────── */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const ease = (t) => 1 - Math.pow(1 - t, 3)
const smooth = (t) => t * t * (3 - 2 * t)
const seg = (p, a, b) => clamp01((p - a) / (b - a))
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))

/** Raggruppa le migliaia a mano: toLocaleString('it-IT') non è
 *  affidabile in tutti i runtime e produrrebbe "2000" accanto a
 *  valori raggruppati scritti a mano. */
const eur = (n) => '€ ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ── il loop ───────────────────────────────────────────────── */
const ticks = []
const onTick = (fn) => ticks.push(fn)
let last = performance.now()

function loop() {
  // Riprogrammare PRIMA del lavoro: così un'eccezione non spegne
  // l'animazione per sempre. Nessun latch "frame in coda": se quel
  // frame non arriva (tab in background) la pagina resterebbe ferma.
  requestAnimationFrame(loop)
  if (document.hidden) { last = performance.now(); return }
  const now = performance.now()
  const dt = Math.min((now - last) / 1000, 0.25)
  last = now
  for (const fn of ticks) {
    try { fn(dt, now) } catch (err) { console.warn('tick', err) }
  }
}

/* ── progresso di una sezione pinned ───────────────────────── */
function progresso(section) {
  const rect = section.getBoundingClientRect()
  const total = Math.max(section.offsetHeight - window.innerHeight, 1)
  return clamp01(-rect.top / total)
}

/* ═══════════════════════════════════════════════════════════════
   1. HERO
═══════════════════════════════════════════════════════════════ */
const CHIP_SEEDS = [
  [-0.80, -0.46, -260, -18],
  [ 0.82, -0.52, -420,  14],
  [-0.86,  0.18, -180,  10],
  [ 0.84,  0.30, -340, -12],
  [-0.52,  0.66, -520,  16],
  [ 0.56,  0.70, -240, -20],
  [-0.16, -0.52, -600,   8],
  [ 0.20,  0.62, -140,  -8],
]
const HERO_WINDOWS = [[0, 0.06], [0.24, 0.42], [0.46, 0.60], [0.62, 0.74], [0.80, 1.001]]
const CHIP_NASCOSTI_MOBILE = new Set([2, 3])

/**
 * I colori si alternano girando ATTORNO AL CENTRO, non nell'ordine del DOM.
 * I seed di posizione alternano già sinistra/destra (indici pari a sinistra,
 * dispari a destra): un'alternanza per indice finisce esattamente sopra quella
 * divisione e produce metà schermo di un colore e metà dell'altro.
 * Va ricalcolata anche al resize: su telefono spariscono due chip e senza
 * ricalcolo due dello stesso colore finirebbero adiacenti.
 */
function applicaColoriChip(chips, stretto) {
  CHIP_SEEDS
    .map(([sx, sy], i) => ({ i, angolo: Math.atan2(-sy, sx) }))
    .filter((c) => !(stretto && CHIP_NASCOSTI_MOBILE.has(c.i)))
    .sort((a, b) => a.angolo - b.angolo)
    .forEach((c, n) => {
      const pill = chips[c.i]?.querySelector('.chip')
      if (!pill) return
      pill.classList.toggle('chip-blu', n % 2 === 0)
      pill.classList.toggle('chip-chiaro', n % 2 === 1)
    })
}

function initHero() {
  const section = $('#top')
  if (!section) return
  const stage = $('[data-hero]', section)
  const halo = $('[data-hero-halo]', stage)
  const chips = $$('[data-chip]', stage)
  const fit = $('[data-hero-fit]', stage)
  const card = $('[data-hero-card]', stage)
  const stamp = $('[data-hero-stamp]', stage)
  const dash = $('[data-hero-dash]', stage)
  const captions = $$('[data-caption]', stage)
  const rails = $$('[data-rail]', stage)
  if (!card || !fit) return

  chips.forEach((c) => (c.style.willChange = 'transform, opacity'))
  let strettoUltimo = null
  ;[card, dash, fit].forEach((e) => (e.style.willChange = 'transform'))

  // Adatta documento e dashboard alla banda libera fra il bordo alto
  // e le didascalie ancorate in basso. Su finestre basse, senza questo,
  // la card finisce sopra il testo.
  let fitOk = false
  function fitHero() {
    const cap = captions[1]
    if (!cap) return
    const cr = cap.getBoundingClientRect()
    const fr = fit.getBoundingClientRect()
    if (!cr.height || !fr.height) return          // nodi non ancora misurabili: riprova al prossimo frame
    const capTop = cr.top - fr.top
    const bandTop = 82
    const bandBottom = capTop + 56
    const H = card.offsetHeight || 530
    const s = Math.max(0.8, Math.min(1, (bandBottom - bandTop) / H))
    const shift = (bandTop + bandBottom) / 2 - window.innerHeight / 2
    fit.style.transform = `translateY(${shift}px) scale(${s})`
    fitOk = true
  }
  fitHero()
  window.addEventListener('resize', () => { fitOk = false; fitHero() })

  onTick(() => {
    if (!fitOk) fitHero()                          // un fit fallito e mai ripetuto lascia la scena storta
    const p = progresso(section)
    const vw = window.innerWidth
    const vh = window.innerHeight

    if ((vw < 720) !== strettoUltimo) {
      strettoUltimo = vw < 720
      applicaColoriChip(chips, strettoUltimo)
    }

    if (halo) halo.style.opacity = 0.55 + 0.45 * Math.sin(p * Math.PI)

    const gather = ease(seg(p, 0, 0.2))
    const f = 1 - gather
    const chipStretto = vw < 720
    chips.forEach((chip, i) => {
      // Su telefono restano sei: i due più vicini al centro verticale (indici 2 e 3,
      // "Coefficiente 78%" e "Soglia € 85.000") cadrebbero sopra il titolo.
      if (chipStretto && CHIP_NASCOSTI_MOBILE.has(i)) { chip.style.opacity = '0'; chip.style.visibility = 'hidden'; return }
      chip.style.visibility = 'visible'
      const [sx, sy, z, rot] = CHIP_SEEDS[i % CHIP_SEEDS.length]
      const pz = (1500 + Math.abs(z) * f) / 1500
      // Con sei chip c'è più aria: si spingono un po' più larghi per stare
      // comunque lontani dal titolo.
      // 0.42 e non di più: la pillola più larga è ~114px e con sx=0.82 il suo
      // bordo uscirebbe dallo schermo oltre 0.44. Il respiro in più lo prende
      // in verticale, dove su un telefono lo spazio c'è.
      const spreadX = chipStretto ? 0.42 : 0.46
      const spreadY = chipStretto ? 0.5 : 0.44
      chip.style.opacity = Math.max(0, 0.95 - gather * 1.1)
      // Ogni pillola si orienta verso il centro della scena: è questo che le fa
      // leggere come oggetti nello spazio invece che come etichette piatte.
      const rx = -sy * 15 * f
      const ry = sx * 17 * f
      chip.style.transform =
        `translate3d(${sx * vw * spreadX * f * pz}px, ${sy * vh * spreadY * f * pz}px, ${z * f}px)` +
        ` rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rot * f}deg) scale(${0.7 + 0.3 * f})`
    })

    const inP = ease(seg(p, 0.02, 0.26))
    const ft = seg(p, 0.405, 0.475)
    const flip = smooth(ft)                        // smoothstep: attraversa i 90° in fretta
    const shrink = ease(seg(p, 0.72, 0.9))
    const rotY = -42 + 42 * inP + 180 * flip
    const rotX = 16 - 16 * inP
    const scale = (0.62 + 0.38 * inP) * (1 - 0.32 * shrink)
    const tz = (-420 + 420 * inP) - 260 * shrink

    // Su schermo stretto card e dashboard NON si separano in orizzontale: i
    // valori del design (-44% e +26%) presuppongono spazio laterale che a 390px
    // non c'è, e l'ultimo stage finiva mezzo fuori schermo. Qui la card sfuma
    // mentre la dashboard arriva al centro: stessa lettura, senza uscite.
    const stretto = vw < 720
    const cardX = stretto ? 0 : -44 * shrink
    card.style.transform =
      `translate3d(${cardX}%, 0, ${tz}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`
    card.style.opacity = (0.1 + 0.9 * ease(seg(p, 0.07, 0.24))) * (stretto ? 1 - shrink * 0.92 : 1)

    if (stamp) {
      const sp = ease(seg(p, 0.56, 0.68))
      stamp.style.opacity = sp
      stamp.style.transform = `translateY(${(1 - sp) * 14}px) scale(${0.92 + 0.08 * sp})`
    }

    if (dash) {
      const dp = ease(seg(p, 0.76, 0.94))
      const stretta = vw < 720
      dash.style.marginLeft = stretta ? '0px' : '-6vw'
      const dashX = stretta ? -50 : 26          // centrata su mobile, a destra su desktop
      dash.style.opacity = dp
      dash.style.transform =
        `translate3d(${dashX + (1 - dp) * (stretta ? 24 : 60)}%, -50%, ${120 * dp}px)` +
        ` rotateY(${-14 * (1 - dp)}deg) scale(${0.9 + 0.1 * dp})`
    }

    let attivo = 0
    captions.forEach((cap, i) => {
      const [a, b] = HERO_WINDOWS[i] || [0, 1]
      // Le finestre della specifica si sovrappongono (la 02 chiude a 0.60, la 03
      // apre a 0.62, ma entrambe dissolvono su 0.07-0.09): due blocchi di testo
      // restano insieme al 50% e si leggono uno sopra l'altro. Qui la dissolvenza
      // in entrata parte esattamente dove finisce quella in uscita precedente:
      // stesso ritmo, nessuna sovrapposizione.
      const prevB = i > 0 ? HERO_WINDOWS[i - 1][1] : 0
      const inF = i === 0 ? 1 : seg(p, prevB, prevB + 0.035)
      const outF = i === HERO_WINDOWS.length - 1 ? 0 : seg(p, b - 0.035, b)
      const o = Math.max(0, Math.min(inF, 1 - outF))
      cap.style.opacity = o
      // Tolta dal rendering, non solo trasparente: a opacità zero un elemento
      // resta comunque un layer da comporre, e basta un arrotondamento a farlo
      // riaffiorare sotto la grafica 3D.
      cap.style.visibility = o <= 0.002 ? 'hidden' : 'visible'
      const base = cap.hasAttribute('data-stage') ? 'translateX(-50%) ' : ''
      cap.style.transform = `${base}translateY(${(1 - o) * 18}px)`
      cap.style.pointerEvents = o > 0.5 ? 'auto' : 'none'
      if (o > 0.5) attivo = i
    })
    rails.forEach((r, i) => {
      r.style.width = i === attivo ? '22px' : '10px'
      r.style.background = i === attivo ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)'
    })
  })
}

/* ═══════════════════════════════════════════════════════════════
   2. CAROSELLO CILINDRICO
═══════════════════════════════════════════════════════════════ */
function initRing() {
  const section = $('#sistema')
  if (!section) return
  const stage = $('[data-ring-stage]', section)
  const ring = $('[data-ring]', stage)
  const panels = $$('[data-panel]', stage)
  const caps = $$('[data-ring-caption]', stage)
  const dots = $$('[data-ring-dot]', stage)
  const heading = $('[data-ring-heading]', stage)
  const capWrap = $('[data-ring-captions]', stage)
  if (!ring || !panels.length) return

  ring.style.willChange = 'transform'
  let radius = 0
  let fitScale = 1
  let shift = 0

  function layout() {
    radius = Math.max(300, Math.min(window.innerWidth * 0.58, 560))
    panels.forEach((el, i) => {
      el.style.transform = `rotateY(${i * 60}deg) translateZ(${radius}px)`
    })
    // Il translateZ in avanti ingrandisce il pannello frontale: senza
    // compensare, esce sopra il titolo e la didascalia.
    const bandTop = heading ? heading.offsetTop + heading.offsetHeight + 14 : 120
    const bandBottom = capWrap ? capWrap.offsetTop - 14 : window.innerHeight - 160
    const band = Math.max(bandBottom - bandTop, 200)
    const H = panels[0].offsetHeight || 420
    const persp = 1200
    const k = 0.18 * radius
    fitScale = Math.min(1, (band * persp) / (H * persp + band * k))
    shift = (bandTop + bandBottom) / 2 - window.innerHeight / 2
  }
  layout()
  window.addEventListener('resize', layout)

  let turn = 0
  onTick((dt) => {
    const p = progresso(section)
    const u = p * 5
    const i = Math.min(4, Math.floor(u))
    const t = u - i
    const dwell = 0.34
    const tt = clamp01((t - dwell) / (1 - dwell * 2))
    const target = (i + smooth(tt)) * 60

    // inseguimento smorzato indipendente dal frame rate
    const k = 1 - Math.exp(-dt / 0.11)
    turn += (target - turn) * k
    if (Math.abs(target - turn) < 0.05) turn = target

    ring.style.transform =
      `translateY(${shift}px) scale(${fitScale}) translateZ(${-radius * 0.82}px) rotateY(${-turn}deg)`

    // stato derivato dalla rotazione, non da p: così opacità e
    // didascalie arrivano insieme al movimento
    const activeF = turn / 60
    const near = Math.round(activeF)
    panels.forEach((el, idx) => {
      const d = Math.abs(activeF - idx)
      el.style.opacity = Math.max(0.1, 1 - d * 0.8)
      el.style.filter = d > 0.5 ? 'blur(3px)' : 'none'
    })
    caps.forEach((el, idx) => {
      const o = clamp01(1 - Math.abs(activeF - idx) * 1.7)
      el.style.opacity = o
      el.style.transform = `translateY(${(1 - o) * 14}px)`
    })
    dots.forEach((el, idx) => {
      el.style.width = idx === near ? '20px' : '8px'
      el.style.background = idx === near ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)'
    })
  })
}

/* ═══════════════════════════════════════════════════════════════
   3. IL BANCO DI LAVORO
═══════════════════════════════════════════════════════════════ */
const SERVICES = [
  { id: 0, name: 'Sviluppo sito web — 20h', price: 2000 },
  { id: 1, name: 'Logo e brand identity', price: 450 },
  { id: 2, name: 'Consulenza UX — 5h', price: 500 },
  { id: 3, name: 'App mobile', price: 4800 },
  { id: 4, name: 'Newsletter mensile', price: 600 },
]
const DEFAULT_SELECTED = [0, 2]

const FLOW = [
  { tipo: 'Preventivo', numero: 'PR-2026-0118', badge: 'Bozza',              bg: '#f6f8fc', bd: '#e6ecf5', dot: '#94a3b8', fg: '#64748b', cta: 'Genera il PDF' },
  { tipo: 'Preventivo', numero: 'PR-2026-0118', badge: 'PDF generato',       bg: '#eef4ff', bd: '#bfdbfe', dot: '#236CEF', fg: '#1d4ed8', cta: 'Trasforma in fattura XML' },
  { tipo: 'Fattura elettronica', numero: 'FT-2026-0042', badge: 'XML pronto', bg: '#eef4ff', bd: '#bfdbfe', dot: '#236CEF', fg: '#1d4ed8', cta: 'Invia al SDI' },
  { tipo: 'Fattura elettronica', numero: 'FT-2026-0042', badge: 'Consegnata dal SDI', bg: '#ecfdf5', bd: '#a7f3d0', dot: '#10b981', fg: '#047857', cta: 'Fatto. Tutto risolto ✓' },
]

function initBench() {
  const root = $('#banco')
  if (!root) return
  const listaEl = $('[data-bench-services]', root)
  const righeEl = $('[data-bench-rows]', root)
  const doc = $('[data-bench-doc]', root)
  if (!listaEl || !righeEl) return

  let selected = [...DEFAULT_SELECTED]
  let flow = 0

  function bottone(s, on) {
    return `<button type="button" data-service="${s.id}" aria-pressed="${on}"
      class="w-full flex items-center gap-3 rounded-[14px] px-[1.125rem] py-[0.9375rem] text-left transition-[background,border-color,transform] duration-200 hover:translate-x-[3px]"
      style="background:${on ? 'rgba(35,108,239,0.14)' : 'rgba(255,255,255,0.025)'};border:1px solid ${on ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.08)'}">
      <span class="w-[22px] h-[22px] rounded-md grid place-items-center text-[0.75rem] font-bold shrink-0"
            style="background:${on ? '#236CEF' : 'rgba(255,255,255,0.07)'};color:${on ? '#fff' : 'rgba(232,237,247,0.4)'}">${on ? '✓' : '+'}</span>
      <span class="flex-1 text-[0.875rem]" style="color:${on ? '#ffffff' : 'rgba(232,237,247,0.65)'}">${s.name}</span>
      <span class="text-[0.875rem] font-semibold tnum" style="color:${on ? '#ffffff' : 'rgba(232,237,247,0.4)'}">${eur(s.price)}</span>
    </button>`
  }

  function render() {
    listaEl.innerHTML = SERVICES.map((s) => bottone(s, selected.includes(s.id))).join('')

    const scelti = SERVICES.filter((s) => selected.includes(s.id))
    righeEl.innerHTML = scelti.length
      ? scelti.map((s) => `<div class="flex items-center justify-between px-3 py-2.5" style="border-top:1px solid #f4f7fc">
          <span class="text-[0.8125rem]" style="color:#475569">${s.name}</span>
          <span class="text-[0.8125rem] font-semibold tnum" style="color:#0f172a">${eur(s.price)}</span></div>`).join('')
      : `<div class="px-3 py-8 text-center text-[0.8125rem]" style="color:#94a3b8">Aggiungi una voce a sinistra</div>`

    const tot = scelti.reduce((a, s) => a + s.price, 0)
    const reddito = tot * 0.78
    const imposta = reddito * 0.05
    const inps = reddito * 0.2623
    const netto = tot - imposta - inps
    const pct = Math.min(100, (tot / 85000) * 100)

    const set = (sel, v) => { const el = $(sel, root); if (el) el.textContent = v }
    set('[data-bench-reddito]', eur(reddito))
    set('[data-bench-imposta]', eur(imposta))
    set('[data-bench-inps]', eur(inps))
    set('[data-bench-netto]', eur(Math.max(0, netto)))
    set('[data-bench-tot]', eur(tot))
    set('[data-bench-totale]', eur(tot))
    const bar = $('[data-bench-bar]', root)
    if (bar) bar.style.width = pct + '%'

    const rv = $('[data-recap-voci]'), rt = $('[data-recap-tot]'), rn = $('[data-recap-netto]')
    if (rv) rv.textContent = scelti.length === 1 ? '1 voce' : `${scelti.length} voci`
    if (rt) rt.textContent = eur(tot)
    if (rn) rn.textContent = eur(Math.max(0, netto))
    const xmlTot = $('[data-bench-xml-tot]', root)
    if (xmlTot) xmlTot.textContent = tot.toFixed(2)

    // stato del documento
    const f = FLOW[flow]
    set('[data-doc-tipo]', f.tipo)
    set('[data-doc-numero]', f.numero)
    set('[data-doc-badge-text]', f.badge)
    const badge = $('[data-doc-badge]', root)
    if (badge) { badge.style.background = f.bg; badge.style.borderColor = f.bd }
    const bdot = $('[data-doc-badge-dot]', root)
    if (bdot) bdot.style.background = f.dot
    const btxt = $('[data-doc-badge-text]', root)
    if (btxt) btxt.style.color = f.fg
    const cta = $('[data-bench-cta]', root)
    if (cta) {
      cta.textContent = f.cta
      cta.style.background = flow === 3 ? '#059669' : '#236CEF'
      cta.disabled = flow === 3 || !scelti.length
      cta.style.opacity = scelti.length ? '1' : '0.45'
    }
    const xml = $('[data-bench-xml]', root)
    if (xml) xml.classList.toggle('hidden', flow < 2)

    $$('[data-step]', root).forEach((st, i) => {
      const dot = $('[data-step-dot]', st)
      const lab = $('[data-step-label]', st)
      const done = i < flow, cur = i === flow
      if (dot) {
        dot.style.background = done ? '#10b981' : cur ? '#236CEF' : '#eef2f8'
        dot.style.color = done || cur ? '#fff' : '#94a3b8'
        dot.textContent = done ? '✓' : String(i + 1)
      }
      if (lab) lab.style.color = cur ? '#0f172a' : done ? '#059669' : '#94a3b8'
    })
  }

  listaEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-service]')
    if (!b) return
    const id = Number(b.dataset.service)
    selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    flow = 0                                   // toccare le voci riporta il documento in bozza
    render()
  })
  $('[data-bench-cta]', root)?.addEventListener('click', () => { if (flow < 3) { flow++; render() } })
  $('[data-bench-reset]', root)?.addEventListener('click', () => { flow = 0; selected = [...DEFAULT_SELECTED]; render() })

  render()

  /* Barra di riepilogo: compare quando la sezione è a schermo ma il totale del
     documento non lo è ancora. Sparisce appena il documento è visibile — a quel
     punto il riscontro ce l'hai già davanti e la barra sarebbe solo ingombro. */
  const recap = $('[data-bench-recap]')
  const totaleDoc = $('[data-bench-totale]', root)
  if (recap && totaleDoc) {
    recap.addEventListener('click', () => {
      doc?.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'center' })
    })
    let mostrata = null
    onTick(() => {
      const sez = root.getBoundingClientRect()
      const tot = totaleDoc.getBoundingClientRect()
      const sezioneInVista = sez.top < window.innerHeight * 0.6 && sez.bottom > 120
      const totaleGiaVisibile = tot.top < window.innerHeight - 96 && tot.bottom > 0
      const vuole = sezioneInVista && !totaleGiaVisibile
      if (vuole === mostrata) return
      mostrata = vuole
      recap.classList.toggle('translate-y-full', !vuole)
      recap.setAttribute('aria-hidden', String(!vuole))
    })
  }

  /* Inclinazione al mouse — solo rotazioni, mai translateZ: facendo
     avanzare la card sotto il puntatore i bottoni entrano ed escono
     da sotto il cursore e i click si perdono. */
  if (doc && !ridotto) {
    doc.style.willChange = 'transform'
    let tx = -7, ty = 3, cx = -7, cy = 3
    window.addEventListener('mousemove', (e) => {
      if (doc.contains(e.target)) { tx = -7; ty = 3; return }   // dentro la card: torna a riposo
      const rect = root.getBoundingClientRect()
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2
      tx = -7 + nx * 6
      ty = 3 - ny * 4
    })
    onTick((dt) => {
      const k = 1 - Math.exp(-dt / 0.11)
      cx += (tx - cx) * k
      cy += (ty - cy) * k
      doc.style.transform = `rotateY(${cx}deg) rotateX(${cy}deg)`
    })
  }
}

/* ═══════════════════════════════════════════════════════════════
   4. TITOLO A RIEMPIMENTO LIQUIDO + NUMERI
═══════════════════════════════════════════════════════════════ */
function initLiquid() {
  const head = $('[data-liquid]')
  if (!head || ridotto) return
  // Le proprietà di clipping si aggiungono da JS: così senza JS il
  // titolo resta un testo leggibile invece che trasparente.
  head.style.webkitBackgroundClip = 'text'
  head.style.backgroundClip = 'text'
  head.style.webkitTextFillColor = 'transparent'
  head.style.backgroundRepeat = 'no-repeat'
  onTick(() => {
    const r = head.getBoundingClientRect()
    const f = clamp01((window.innerHeight * 0.86 - r.top) / (r.height + window.innerHeight * 0.28)) * 100
    head.style.backgroundImage =
      `linear-gradient(to top, #236CEF 0%, #4d8bf5 ${Math.max(0, f - 4)}%, #7fb0f9 ${f}%,` +
      ` rgba(232,237,247,0.16) ${Math.min(100, f + 3)}%, rgba(232,237,247,0.16) 100%)`
  })
}

function initNumeri() {
  const section = $('[data-numeri]')
  if (!section) return
  const nums = $$('[data-num]', section)
  const bars = $$('[data-num-bar]', section)
  if (!nums.length || ridotto) return

  const fmt = (v, tipo) => {
    if (tipo === 'thousands') return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    if (tipo === 'pct2') return v.toFixed(2).replace('.', ',') + '%'
    return Math.round(v) + '%'
  }

  let start = 0
  let fatto = false
  onTick((dt, now) => {
    if (fatto) return
    if (!start) {
      if (section.getBoundingClientRect().top < window.innerHeight * 0.8) start = now
      else return
    }
    const t = clamp01((now - start) / 1600)
    nums.forEach((el, i) => {
      const e = ease(clamp01((t - i * 0.09) / 0.7))
      el.textContent = fmt(Number(el.dataset.target) * e, el.dataset.format)
      el.style.opacity = 0.15 + 0.85 * e
      el.style.transform = `translateY(${(1 - e) * 16}px)`
      const bar = bars[i]
      if (bar) bar.style.width = Number(bar.dataset.bar) * e + '%'
    })
    if (t >= 1) fatto = true
  })
}

/* ═══════════════════════════════════════════════════════════════
   5. INTERFACCIA — reveal, tilt, FAQ, menu, navbar, CTA
═══════════════════════════════════════════════════════════════ */
function initReveals() {
  const items = $$('.reveal')
  if (!items.length || ridotto) return
  // Il contenuto parte visibile; la classe che lo nasconde viene messa
  // solo ora, quando sappiamo che il JS gira. Nessun contenuto può
  // restare invisibile per colpa di un observer che non scatta.
  document.documentElement.classList.add('js-motion')
  const check = () => {
    let vivi = 0
    for (const el of items) {
      if (el.classList.contains('is-in')) continue
      vivi++
      if (el.getBoundingClientRect().top < window.innerHeight * 0.94) el.classList.add('is-in')
    }
    return vivi
  }
  check()
  onTick(check)
}

function initTilt() {
  if (ridotto) return
  $$('[data-tilt]').forEach((wrap) => {
    const inner = $('[data-tilt-inner]', wrap)
    if (!inner) return
    const deg = Number(wrap.dataset.tilt) || 0
    const riposo = `rotateY(${deg}deg)`
    inner.style.transform = riposo
    wrap.addEventListener('mouseenter', () => { inner.style.transform = 'rotateY(0deg) translateZ(40px)' })
    wrap.addEventListener('mouseleave', () => { inner.style.transform = riposo })
  })
}

function initFaq() {
  const items = $$('.faq-item')

  const setOpen = (item, open) => {
    const btn = $('[data-faq-btn]', item)
    const panel = $('[data-faq-panel]', item)
    const plus = $('[data-faq-plus]', item)
    const idx = $('[data-faq-idx]', item)
    if (!btn || !panel) return
    panel.style.height = open ? panel.scrollHeight + 'px' : '0px'
    btn.setAttribute('aria-expanded', String(open))
    item.style.background = open ? 'rgba(35,108,239,0.06)' : 'transparent'
    if (plus) {
      plus.style.transform = open ? 'rotate(45deg)' : 'rotate(0deg)'
      plus.style.color = open ? '#60a5fa' : 'rgba(232,237,247,0.3)'
    }
    if (idx) idx.style.color = open ? '#60a5fa' : 'rgba(147,197,253,0.4)'
  }

  items.forEach((item) => {
    const btn = $('[data-faq-btn]', item)
    if (!btn) return
    btn.addEventListener('click', () => {
      const eraAperto = btn.getAttribute('aria-expanded') === 'true'
      items.forEach((o) => setOpen(o, false))   // un solo pannello aperto alla volta
      if (!eraAperto) setOpen(item, true)
    })
  })

  // Se la finestra cambia larghezza il testo si riflow: l'altezza fissa
  // del pannello aperto va ricalcolata, altrimenti taglia o avanza.
  window.addEventListener('resize', () => {
    items.forEach((item) => {
      const btn = $('[data-faq-btn]', item)
      if (btn && btn.getAttribute('aria-expanded') === 'true') setOpen(item, true)
    })
  })
}

function initMenu() {
  const btn = $('#menu-toggle')
  const menu = $('#mobile-menu')
  if (!btn || !menu) return
  const chiudi = () => {
    menu.classList.remove('open')
    btn.setAttribute('aria-expanded', 'false')
    btn.setAttribute('aria-label', 'Apri il menu')
  }
  btn.addEventListener('click', () => {
    const aperto = menu.classList.toggle('open')
    btn.setAttribute('aria-expanded', String(aperto))
    btn.setAttribute('aria-label', aperto ? 'Chiudi il menu' : 'Apri il menu')
  })
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudi))
}

function initCtaGlow() {
  const section = $('[data-cta]')
  if (!section || ridotto) return
  // L'alone non è più un elemento: viveva a bottom:-20% e l'overflow:hidden
  // della sezione lo tagliava di netto sul bordo inferiore, disegnando una riga
  // (misurato: 26 livelli di salto fra due pixel adiacenti). Ora è il centro del
  // radiale del velo, che è mascherato e quindi non può produrre bordi.
  onTick(() => {
    const rect = section.getBoundingClientRect()
    const p = clamp01(1 - rect.top / window.innerHeight)
    section.style.setProperty('--salita', `${-p * 70}px`)
  })
}

/* ═══════════════════════════════════════════════════════════════
   6. CONSENSO COOKIE + META PIXEL

   Il pixel di Meta è un cookie di profilazione di terza parte:
   viene caricato SOLO dopo un consenso esplicito e affermativo.
   Cloudflare Web Analytics resta sempre attivo perché è cookieless.
═══════════════════════════════════════════════════════════════ */
const META_PIXEL_ID = '1474396618080757'
const CONSENT_KEY = 'quotify_cookie_consent'

function readConsent() {
  try { return localStorage.getItem(CONSENT_KEY) } catch { return null }
}
function writeConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value) } catch { /* storage non disponibile */ }
}

function trackRegistrationClicks() {
  $$('a[href*="app.quotify.it/register"]').forEach((a) => {
    if (a.dataset.fbTracked) return
    a.dataset.fbTracked = '1'
    a.addEventListener('click', () => {
      if (window.fbq) window.fbq('track', 'Lead', { content_name: 'cta_registrazione_sito' })
    })
  })
}

function loadMetaPixel() {
  if (window.fbq) return
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []
    t = b.createElement(e); t.async = !0; t.src = v
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */
  window.fbq('init', META_PIXEL_ID)
  window.fbq('track', 'PageView')
  trackRegistrationClicks()
}

function initCookieBanner() {
  const consent = readConsent()
  if (consent === 'accepted') loadMetaPixel()

  // Revoca dalla Cookie Policy. Agganciata con un listener, non con
  // onclick="" nel markup: la CSP non consente 'unsafe-inline', quindi
  // un handler inline sarebbe silenziosamente inerte — e la revoca del
  // consenso è un obbligo, non un extra.
  const resetConsent = () => {
    try { localStorage.removeItem(CONSENT_KEY) } catch { /* niente da rimuovere */ }
    location.reload()
  }
  window.quotifyResetCookieConsent = resetConsent
  $('#cookie-manage')?.addEventListener('click', resetConsent)

  const banner = $('#cookie-banner')
  const acceptBtn = $('#cookie-accept')
  const rejectBtn = $('#cookie-reject')
  if (!banner || !acceptBtn || !rejectBtn) return
  if (consent) return

  banner.removeAttribute('hidden')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.remove('translate-y-full'))
  })

  const closeBanner = () => {
    banner.classList.add('translate-y-full')
    setTimeout(() => banner.setAttribute('hidden', ''), 300)
  }
  acceptBtn.addEventListener('click', () => { writeConsent('accepted'); loadMetaPixel(); closeBanner() })
  rejectBtn.addEventListener('click', () => { writeConsent('rejected'); closeBanner() })
}

/* ═══════════════════════════════════════════════════════════════
   AVVIO
═══════════════════════════════════════════════════════════════ */
function init() {
  initCookieBanner()
  initMenu()
  initFaq()

  if (!ridotto) {
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })
    onTick((dt, now) => lenis.raf(now))
  }

  initReveals()
  initTilt()
  initHero()
  initRing()
  initBench()
  initLiquid()
  initNumeri()
  initCtaGlow()

  requestAnimationFrame(loop)
  // Il tick gira anche sullo scroll, per reattività immediata quando
  // il browser limita i frame.
  window.addEventListener('scroll', () => { for (const fn of ticks) { try { fn(0, performance.now()) } catch {} } }, { passive: true })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()
