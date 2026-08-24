# Prompt: Implementa Animazioni Premium su Quotify

## Contesto

Quotify (https://quotify-website.pages.dev/) e' il sito web della mia app per la gestione del Regime Forfettario per freelancer italiani. Il sito e' gia' costruito e funzionante, ma manca di animazioni e motion design di livello premium.

Voglio portare su Quotify alcune animazioni ispirate a FacilPay.io (un sito premiato su Awwwards). Non si tratta di copiare, ma di **adattare lo stesso approccio tecnico** (GSAP ScrollTrigger, Lenis smooth scroll, perspective grids, scroll-driven storytelling) al design e ai contenuti esistenti di Quotify.

## Stack Attuale di Quotify

- **Build tool:** Vite (script type="module", deploy su Cloudflare Pages)
- **Styling:** Tailwind CSS (classi utility: `bg-white`, `text-slate-900`, `glass`, ecc.)
- **Font:** Inter (Google Fonts)
- **Framework:** HTML statico + JS vanilla (NO React, NO Next.js, NO Astro)
- **Colori principali:**
  - Blu primario: `#2563eb` (blue-600)
  - Blu scuro: `#1e3a8a` (blue-900)
  - Blu navy: `#1d4ed8` (blue-700)
  - Hero gradient: `linear-gradient(135deg, #1e3a8a, #1d4ed8, #2563eb, #3b82f6, #1e40af)`
  - CTA gradient: `linear-gradient(135deg, #0f172a, #1e3a8a 40%, #1d4ed8, #1e1b4b)`
  - Glassmorphism: `bg-white/10 backdrop-blur-sm border-white/20`
- **Sezioni del sito (dall'alto in basso):**
  1. `#hero` — Hero con gradient blu, titolo "La gestione del tuo lavoro da freelancer, finalmente semplice.", badge "Disponibile in beta gratuita", 2 CTA buttons, 3 stat card glass (500+ Freelancer, 10.000+ Fatture, 99.9% Uptime)
  2. `#funzionalita` — Grid 6 feature cards (Pipeline Kanban, Preventivi PDF, Fatturazione SDI, AI Assistant, Dashboard Fiscale, PWA)
  3. Sezione Pipeline Kanban — Showcase con mockup HTML della board Kanban
  4. Sezione Fattura Elettronica — Showcase con mockup HTML della fattura
  5. Sezione AI Assistant — Showcase con mockup HTML della chat AI
  6. `#come-funziona` — 3 step (Crea account, Aggiungi clienti, Gestisci e fattura)
  7. `#prezzi` — Pricing card singola (beta gratuita)
  8. `#faq` — FAQ accordion
  9. CTA finale — "Pronto a semplificare il tuo lavoro da freelancer?"

## Animazioni da Implementare

### 1. LENIS SMOOTH SCROLL (Globale)

Installa e configura Lenis per smooth scrolling su tutto il sito.

```bash
npm install @studio-freight/lenis gsap
```

```javascript
import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
})

lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
```

Aggiungi queste classi CSS:
```css
html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
```

### 2. HERO SCROLL-DRIVEN (Sezione #hero)

Trasforma l'hero attuale in un'esperienza scroll-driven ispirata a FacilPay:

**Concetto:** L'hero diventa una sezione alta ~400vh con un inner container sticky. Mentre l'utente scrolla:
- I 3 stat cards partono posizionati attorno al centro (come i tag "Chat./Pay./Confirm." di FacilPay) e si **allontanano** verso i bordi
- Il titolo principale ha un effetto gradient-text animato
- Un sottile effetto parallasse sugli elementi decorativi di sfondo

**Struttura:**
```html
<section id="hero" class="hero-scroll-container">
  <!-- Crea spazio di scroll -->
  <div class="hero-scroll-space" style="height: 400vh; position: relative;">
    <!-- Inner sticky -->
    <div class="hero-sticky" style="height: 100vh; position: sticky; top: 0; overflow: hidden;">
      <!-- Contenuto hero esistente, tutto centrato -->
      ...
      <!-- Stat cards posizionate con position: absolute -->
      <div class="hero-stat stat-1" style="position: absolute;">500+ Freelancer</div>
      <div class="hero-stat stat-2" style="position: absolute;">10.000+ Fatture</div>
      <div class="hero-stat stat-3" style="position: absolute;">99.9% Uptime</div>
    </div>
  </div>
</section>
```

**GSAP Animations:**
```javascript
// Le stat cards partono centrate sotto il titolo e si allontanano sui lati
gsap.fromTo('.stat-1',
  { x: 0, y: 0, scale: 1 },
  { x: '-40vw', y: '10vh', scale: 0.9, ease: 'none',
    scrollTrigger: { trigger: '.hero-scroll-space', start: 'top top', end: '40% top', scrub: true }
  }
)
gsap.fromTo('.stat-2',
  { x: 0, y: 0, scale: 1 },
  { x: 0, y: '30vh', scale: 0.9, ease: 'none',
    scrollTrigger: { trigger: '.hero-scroll-space', start: 'top top', end: '40% top', scrub: true }
  }
)
gsap.fromTo('.stat-3',
  { x: 0, y: 0, scale: 1 },
  { x: '40vw', y: '10vh', scale: 0.9, ease: 'none',
    scrollTrigger: { trigger: '.hero-scroll-space', start: 'top top', end: '40% top', scrub: true }
  }
)

// Titolo: fade + leggero scale up
gsap.fromTo('h1',
  { opacity: 1, scale: 1 },
  { opacity: 0.3, scale: 1.05, ease: 'none',
    scrollTrigger: { trigger: '.hero-scroll-space', start: '20% top', end: '60% top', scrub: true }
  }
)

// Elementi decorativi di sfondo: parallasse
gsap.to('.hero-bg-circle', {
  y: '-30%', ease: 'none',
  scrollTrigger: { trigger: '.hero-scroll-space', start: 'top top', end: 'bottom top', scrub: true }
})
```

### 3. 3D PERSPECTIVE GRID (Background dell'Hero)

Aggiungi un tunnel di linee prospettiche dietro l'hero, come FacilPay. Adattato ai colori blu di Quotify.

**Implementazione CSS (senza Three.js):**
```css
.hero-grid-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  mix-blend-mode: screen;
  opacity: 0.15;
}

.hero-grid-plane {
  position: absolute;
  width: 200%;
  height: 200%;
  left: -50%;
  background-image:
    linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px);
  background-size: 4rem 4rem;
}

/* Piano inferiore */
.hero-grid-floor {
  bottom: -50%;
  transform-origin: center top;
  transform: rotateX(65deg);
}

/* Piano superiore */
.hero-grid-ceiling {
  top: -50%;
  transform-origin: center bottom;
  transform: rotateX(-65deg);
}
```

Aggiungi questi div dentro la sezione hero, PRIMA del contenuto:
```html
<div class="hero-grid-bg">
  <div class="hero-grid-plane hero-grid-floor"></div>
  <div class="hero-grid-plane hero-grid-ceiling"></div>
</div>
```

Anima il grid con GSAP in parallasse allo scroll:
```javascript
gsap.to('.hero-grid-floor', {
  backgroundPositionY: '-20rem',
  ease: 'none',
  scrollTrigger: { trigger: '.hero-scroll-space', start: 'top top', end: 'bottom top', scrub: true }
})
```

### 4. THREE.JS GLOBE (Nuova sezione o integrazione)

Aggiungi un globo 3D interattivo per comunicare la dimensione "italiana" e "globale" di Quotify. Posizionalo nella sezione `#come-funziona` o crea una nuova sezione prima del pricing.

**Concetto adattato:** Invece di mostrare "182 countries" come FacilPay, mostra:
- "La soluzione italiana per i freelancer"
- Globo centrato sull'Italia con dots luminosi sulle citta' italiane principali
- Widget/card fluttuanti attorno al globo con dati di Quotify:
  - "500+ Freelancer attivi"
  - Card con preview fattura
  - Card "Regime Forfettario"
  - Card "Fattura SDI inviata"
  - Badge "Conforme normativa italiana"

**Codice Three.js (adattato da FacilPay):**
```javascript
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Setup
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 3)
camera.position.z = 1.1

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enablePan = false
controls.enableZoom = false
controls.autoRotate = true
controls.autoRotateSpeed = 0.5 // piu' lento, piu' elegante
controls.minPolarAngle = 0.4 * Math.PI
controls.maxPolarAngle = 0.4 * Math.PI

// Globo con gradient BLU QUOTIFY (non azzurro come FacilPay)
const geometry = new THREE.IcosahedronGeometry(1, 22)
const material = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 v_normal;
    void main() {
      v_normal = normalize(normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 v_normal;
    vec3 getGradient(float y) {
      float t = (y + 1.0) / 2.0;
      // Palette Quotify: blu scuro -> blu primario -> blu chiaro
      vec3 top = vec3(59.0/255.0, 130.0/255.0, 246.0/255.0);    // #3b82f6
      vec3 mid = vec3(37.0/255.0, 99.0/255.0, 235.0/255.0);     // #2563eb
      vec3 bottom = vec3(29.0/255.0, 78.0/255.0, 216.0/255.0);   // #1d4ed8
      if (t < 0.6) return mix(top, mid, t / 0.6);
      return mix(mid, bottom, (t - 0.6) / 0.4);
    }
    void main() {
      gl_FragColor = vec4(getGradient(v_normal.y), 1.0);
    }
  `,
  side: THREE.DoubleSide
})

const globe = new THREE.Mesh(geometry, material)
scene.add(globe)

// Dot map dall'immagine earth-map
new THREE.TextureLoader().load('/images/earth-map-colored.png', (mask) => {
  const canvas2 = document.createElement('canvas')
  const ctx = canvas2.getContext('2d')
  const w = mask.image.width, h = mask.image.height
  canvas2.width = w; canvas2.height = h
  ctx.drawImage(mask.image, 0, 0)
  const pixels = ctx.getImageData(0, 0, w, h).data

  const dotGeo = new THREE.CircleGeometry(0.012, 32)
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  const positions = []
  const dummy = new THREE.Object3D()

  for (let lat = -90; lat <= 90; lat += 2.25) {
    for (let lon = -180; lon <= 180; lon += 2.25) {
      const px = Math.floor(((lon + 180) / 360) * w)
      const py = Math.floor(((90 - lat) / 180) * h)
      const idx = (py * w + px) * 4
      if ((pixels[idx] / 255) < 0.2) continue

      const phi = (90 - lat) * (Math.PI / 180)
      const theta = (lon + 180) * (Math.PI / 180)
      const x = -1.01 * Math.sin(phi) * Math.cos(theta)
      const y = 1.01 * Math.cos(phi)
      const z = 1.01 * Math.sin(phi) * Math.sin(theta)

      dummy.position.set(x, y, z)
      dummy.lookAt(0, 0, 0)
      dummy.updateMatrix()
      positions.push(dummy.matrix.clone())
    }
  }

  const dots = new THREE.InstancedMesh(dotGeo, dotMat, positions.length)
  positions.forEach((m, i) => dots.setMatrixAt(i, m))
  scene.add(dots)
})
```

**Widget fluttuanti (CSS + IntersectionObserver):**
I widget partono raggruppati al centro del globo e si espandono verso l'esterno quando la sezione entra in viewport.

```css
.globe-widget {
  position: absolute;
  transition: all 1.2s cubic-bezier(0.19, 1, 0.22, 1);
  opacity: 0;
  transform: scale(0.8);
}
.globe-section.in-view .globe-widget {
  opacity: 1;
  transform: scale(1);
}
/* Posizioni espanse per ogni widget */
.globe-section.in-view .widget-1 { top: 10%; left: -15%; }
.globe-section.in-view .widget-2 { top: 25%; right: -20%; }
.globe-section.in-view .widget-3 { bottom: 20%; left: -10%; }
.globe-section.in-view .widget-4 { bottom: 15%; right: -15%; }
.globe-section.in-view .widget-5 { top: -5%; left: 30%; }
```

```javascript
// Trigger con IntersectionObserver
const globeSection = document.querySelector('.globe-section')
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) {
    globeSection.classList.add('in-view')
    observer.unobserve(globeSection)
  }
}, { threshold: 0.15 })
observer.observe(globeSection)
```

### 5. VIEW-ITEM REVEAL ANIMATIONS (Globale)

Aggiungi animazioni di ingresso a TUTTI gli elementi del sito usando IntersectionObserver:

```javascript
// Reveal singoli elementi
document.querySelectorAll('[data-reveal]').forEach(el => {
  observer.observe(el)
})

// Reveal staggered per liste
document.querySelectorAll('[data-reveal-list]').forEach(list => {
  const items = list.querySelectorAll('[data-reveal-item]')
  const listObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      items.forEach((item, i) => {
        setTimeout(() => item.classList.add('revealed'), i * 100)
      })
      listObserver.unobserve(list)
    }
  }, { threshold: 0.2 })
  listObserver.observe(list)
})
```

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(2rem);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
[data-reveal].revealed {
  opacity: 1;
  transform: translateY(0);
}
[data-reveal-item] {
  opacity: 0;
  transform: translateY(1.5rem);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
[data-reveal-item].revealed {
  opacity: 1;
  transform: translateY(0);
}
```

Aggiungi `data-reveal` a: titoli di sezione, descrizioni, mockup screenshots, pricing card, CTA.
Aggiungi `data-reveal-list` + `data-reveal-item` a: la grid delle 6 feature cards, i 3 step "Come funziona", le FAQ.

### 6. GSAP HOVER INERTIA (Feature Cards)

Aggiungi l'effetto hover di FacilPay alle 6 feature cards: quando il mouse entra, la card riceve un leggero impulso fisico (inertia) nella direzione del movimento del mouse + una rotazione casuale.

```javascript
gsap.registerPlugin(InertiaPlugin) // se disponibile, altrimenti simula

let mouseVelX = 0, mouseVelY = 0, prevX = 0, prevY = 0
document.addEventListener('mousemove', (e) => {
  mouseVelX = e.clientX - prevX
  mouseVelY = e.clientY - prevY
  prevX = e.clientX
  prevY = e.clientY
})

document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    gsap.to(card, {
      x: mouseVelX * 0.3,
      y: mouseVelY * 0.3,
      rotation: (Math.random() - 0.5) * 8,
      duration: 0.4,
      ease: 'power2.out'
    })
    gsap.to(card, {
      x: 0, y: 0, rotation: 0,
      duration: 0.6,
      ease: 'elastic.out(1, 0.5)',
      delay: 0.3
    })
  })
})
```

## Note Importanti

1. **NON cambiare il design o i contenuti** — aggiungi solo animazioni e motion. I colori, i testi, il layout devono restare identici.
2. **Performance first** — usa `will-change: transform` solo dove necessario, pulisci ScrollTrigger e animazioni quando non servono piu'.
3. **Mobile** — disabilita le animazioni scroll-driven pesanti (hero parallax, grid 3D) sotto i 768px. Il globo Three.js puo' essere ridotto o sostituito con un'immagine statica su mobile.
4. **Accessibilita'** — rispetta `prefers-reduced-motion`: se attivo, disabilita tutte le animazioni GSAP e mostra il sito statico.
5. **Il globo Three.js** richiede l'immagine `earth-map-colored.png` nella cartella public/images. Scaricala da: `https://ksenia-k.com/img/earth-map-colored.png`
6. **Ordine di implementazione consigliato:**
   - Prima: Lenis + view-item reveals (impatto immediato, rischio zero)
   - Poi: Hero scroll-driven + grid 3D (trasformazione principale)
   - Poi: Globe Three.js con widget (wow factor)
   - Ultimo: Hover inertia sulle cards (polish finale)
