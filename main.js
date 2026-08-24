/**
 * main.js — Quotify Landing Page (Premium Animations)
 * Lenis smooth scroll, GSAP ScrollTrigger, Three.js globe,
 * scroll-driven hero, view-item reveals, hover inertia.
 */

import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

/* ═══════════════════════════════════════════════════════════════
   REDUCED MOTION CHECK
═══════════════════════════════════════════════════════════════ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isMobile = window.innerWidth < 768

/* ═══════════════════════════════════════════════════════════════
   LENIS SMOOTH SCROLL
═══════════════════════════════════════════════════════════════ */
let lenis

function initLenis() {
  if (prefersReducedMotion) return

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

/* ═══════════════════════════════════════════════════════════════
   HERO SCROLL-DRIVEN ANIMATIONS
═══════════════════════════════════════════════════════════════ */
function initHeroScrollDriven() {
  if (prefersReducedMotion || isMobile) return

  const scrollSpace = document.querySelector('.hero-scroll-space')
  if (!scrollSpace) return

  // Stat cards spread outward
  gsap.fromTo('.stat-1',
    { x: 0, y: 0, scale: 1 },
    {
      x: '-35vw', y: '8vh', scale: 0.85, ease: 'none',
      scrollTrigger: { trigger: scrollSpace, start: 'top top', end: '40% top', scrub: true }
    }
  )
  gsap.fromTo('.stat-2',
    { x: 0, y: 0, scale: 1 },
    {
      x: 0, y: '28vh', scale: 0.85, ease: 'none',
      scrollTrigger: { trigger: scrollSpace, start: 'top top', end: '40% top', scrub: true }
    }
  )
  gsap.fromTo('.stat-3',
    { x: 0, y: 0, scale: 1 },
    {
      x: '35vw', y: '8vh', scale: 0.85, ease: 'none',
      scrollTrigger: { trigger: scrollSpace, start: 'top top', end: '40% top', scrub: true }
    }
  )

  // Title fade + subtle scale
  gsap.fromTo('.hero-title',
    { opacity: 1, scale: 1 },
    {
      opacity: 0.2, scale: 1.05, ease: 'none',
      scrollTrigger: { trigger: scrollSpace, start: '20% top', end: '60% top', scrub: true }
    }
  )

  // Subtitle + CTAs fade
  gsap.to('.hero-subtitle', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: scrollSpace, start: '15% top', end: '45% top', scrub: true }
  })
  gsap.to('.hero-ctas', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: scrollSpace, start: '10% top', end: '35% top', scrub: true }
  })

  // Scroll indicator fades
  gsap.to('.hero-scroll-indicator', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: scrollSpace, start: 'top top', end: '10% top', scrub: true }
  })

  // Background circles parallax
  gsap.to('.hero-bg-circle', {
    y: '-30%', ease: 'none',
    scrollTrigger: { trigger: scrollSpace, start: 'top top', end: 'bottom top', scrub: true }
  })

  // 3D Grid parallax
  gsap.to('.hero-grid-floor', {
    backgroundPositionY: '-20rem', ease: 'none',
    scrollTrigger: { trigger: scrollSpace, start: 'top top', end: 'bottom top', scrub: true }
  })
  gsap.to('.hero-grid-ceiling', {
    backgroundPositionY: '20rem', ease: 'none',
    scrollTrigger: { trigger: scrollSpace, start: 'top top', end: 'bottom top', scrub: true }
  })
}

/* ═══════════════════════════════════════════════════════════════
   LIQUID GRADIENT BLOB — WebGL Shader
═══════════════════════════════════════════════════════════════ */
function initLiquidGradient() {
  const canvas = document.getElementById('liquid-canvas')
  if (!canvas || prefersReducedMotion) return

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
  if (!gl) return

  const vertSrc = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`
  const fragSrc = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_res;

    // Simplex-ish noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m * m; m = m * m;
      vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x_) - 0.5;
      vec3 a0 = x_ - floor(x_ + 0.5);
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      float t = u_time * 0.15;

      // Multiple noise layers for organic feel
      float n1 = snoise(uv * 2.0 + vec2(t, t * 0.7)) * 0.5;
      float n2 = snoise(uv * 3.5 - vec2(t * 0.8, t * 0.5)) * 0.3;
      float n3 = snoise(uv * 1.2 + vec2(t * 0.3, -t * 0.6)) * 0.4;
      float n = n1 + n2 + n3;

      // Quotify blue palette
      vec3 c1 = vec3(30.0/255.0, 58.0/255.0, 138.0/255.0);   // primary-900
      vec3 c2 = vec3(37.0/255.0, 99.0/255.0, 235.0/255.0);    // primary-600
      vec3 c3 = vec3(99.0/255.0, 102.0/255.0, 241.0/255.0);   // indigo-500
      vec3 c4 = vec3(59.0/255.0, 130.0/255.0, 246.0/255.0);   // primary-400

      vec3 color = mix(c1, c2, smoothstep(-0.5, 0.3, n));
      color = mix(color, c3, smoothstep(0.1, 0.6, n + uv.y * 0.3));
      color = mix(color, c4, smoothstep(0.3, 0.8, n - uv.x * 0.2));

      float alpha = 0.35 + n * 0.15;
      gl_FragColor = vec4(color, alpha);
    }
  `

  function createShader(type, src) {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }

  const prog = gl.createProgram()
  gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vertSrc))
  gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fragSrc))
  gl.linkProgram(prog)
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
  const posLoc = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  const uTime = gl.getUniformLocation(prog, 'u_time')
  const uRes = gl.getUniformLocation(prog, 'u_res')

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.5)
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  resize()
  window.addEventListener('resize', resize, { passive: true })

  let animId
  function render(time) {
    animId = requestAnimationFrame(render)
    gl.uniform1f(uTime, time * 0.001)
    gl.uniform2f(uRes, canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  // Only run when hero visible
  const heroSection = document.getElementById('hero')
  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { render(performance.now()) }
    else { cancelAnimationFrame(animId) }
  }, { threshold: 0.05 })
  obs.observe(heroSection)
}

/* ═══════════════════════════════════════════════════════════════
   IPHONE 3D — Scroll-driven rotation
═══════════════════════════════════════════════════════════════ */
function initIPhoneShowcase() {
  if (prefersReducedMotion) return
  const section = document.querySelector('.iphone-section')
  const device = document.querySelector('.iphone-device')
  const text = document.querySelector('.iphone-text')
  if (!section || !device || !text) return

  // Start: phone rotated, text visible
  gsap.set(device, { rotateY: -45, rotateX: 10, scale: 0.9 })

  // Single timeline scrubbed to scroll
  const phoneTl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5
    }
  })

  phoneTl
    // 0→20%: text fades, phone starts rotating
    .to(text, { opacity: 0, y: -30, duration: 0.2, ease: 'none' }, 0)
    .to(device, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.3, ease: 'power1.out' }, 0)
    // 30→70%: phone holds front-facing
    .to(device, { rotateY: 5, duration: 0.4, ease: 'none' })
    // 70→100%: phone tilts gently away
    .to(device, { rotateY: 30, rotateX: -10, scale: 0.85, duration: 0.3, ease: 'none' })
}



/* ═══════════════════════════════════════════════════════════════
   HERO ENTRANCE ANIMATION
═══════════════════════════════════════════════════════════════ */
function initHeroAnimation() {
  const animatables = document.querySelectorAll('.hero-anim')
  if (!animatables.length) return

  if (prefersReducedMotion) {
    animatables.forEach(el => { el.style.opacity = '1' })
    return
  }

  animatables.forEach((el, i) => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease'
    el.style.transitionDelay = `${i * 0.12}s`

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      })
    })
  })
}

/* ═══════════════════════════════════════════════════════════════
   STICKY NAVBAR — Glass effect on scroll
═══════════════════════════════════════════════════════════════ */
function initStickyNavbar() {
  const navbar = document.getElementById('navbar')
  if (!navbar) return

  let lastScrollY = 0
  let ticking = false

  const handleScroll = () => {
    lastScrollY = window.scrollY
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (lastScrollY > 50) {
          navbar.classList.add('scrolled')
        } else {
          navbar.classList.remove('scrolled')
        }
        ticking = false
      })
      ticking = true
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE MENU TOGGLE
═══════════════════════════════════════════════════════════════ */
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn')
  const menu = document.getElementById('mobile-menu')
  const hamburgerIcon = document.getElementById('hamburger-icon')
  const closeIcon = document.getElementById('close-icon')

  if (!btn || !menu) return

  let isOpen = false

  const openMenu = () => {
    isOpen = true
    menu.removeAttribute('hidden')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { menu.classList.add('open') })
    })
    hamburgerIcon.classList.add('hidden')
    closeIcon.classList.remove('hidden')
    btn.setAttribute('aria-expanded', 'true')
  }

  const closeMenu = () => {
    isOpen = false
    menu.classList.remove('open')
    hamburgerIcon.classList.remove('hidden')
    closeIcon.classList.add('hidden')
    btn.setAttribute('aria-expanded', 'false')
    const onTransitionEnd = () => {
      if (!isOpen) menu.setAttribute('hidden', '')
      menu.removeEventListener('transitionend', onTransitionEnd)
    }
    menu.addEventListener('transitionend', onTransitionEnd)
  }

  btn.addEventListener('click', () => { isOpen ? closeMenu() : openMenu() })
  menu.querySelectorAll('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', () => closeMenu())
  })
  document.addEventListener('click', (e) => {
    if (isOpen && !menu.contains(e.target) && !btn.contains(e.target)) closeMenu()
  })
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && isOpen) closeMenu()
  }, { passive: true })
}

/* ═══════════════════════════════════════════════════════════════
   FAQ ACCORDION
═══════════════════════════════════════════════════════════════ */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item')

  faqItems.forEach((item) => {
    const btn = item.querySelector('.faq-btn')
    const content = item.querySelector('.faq-content')
    if (!btn || !content) return

    btn.addEventListener('click', () => {
      const isCurrentlyOpen = item.classList.contains('open')
      faqItems.forEach((otherItem) => {
        if (otherItem !== item && otherItem.classList.contains('open')) closeFaqItem(otherItem)
      })
      isCurrentlyOpen ? closeFaqItem(item) : openFaqItem(item)
    })
  })
}

function openFaqItem(item) {
  const btn = item.querySelector('.faq-btn')
  const content = item.querySelector('.faq-content')
  item.classList.add('open')
  content.classList.add('open')
  btn.setAttribute('aria-expanded', 'true')
  content.setAttribute('aria-hidden', 'false')
}

function closeFaqItem(item) {
  const btn = item.querySelector('.faq-btn')
  const content = item.querySelector('.faq-content')
  item.classList.remove('open')
  content.classList.remove('open')
  btn.setAttribute('aria-expanded', 'false')
  content.setAttribute('aria-hidden', 'true')
}

/* ═══════════════════════════════════════════════════════════════
   SMOOTH SCROLL — Anchor links
═══════════════════════════════════════════════════════════════ */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]')
  const navbar = document.getElementById('navbar')

  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href')
      if (!href || href === '#') return
      const target = document.querySelector(href)
      if (!target) return
      e.preventDefault()
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 64
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 16

      if (lenis) {
        lenis.scrollTo(targetTop, { duration: 1.2 })
      } else {
        window.scrollTo({ top: targetTop, behavior: 'smooth' })
      }
      history.pushState(null, '', href)
    })
  })
}

/* ═══════════════════════════════════════════════════════════════
   STATS COUNTER ANIMATION
═══════════════════════════════════════════════════════════════ */
function initStatsCounters() {
  const counters = document.querySelectorAll('.stat-counter')
  if (!counters.length) return

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-target'), 10)
    if (isNaN(target)) return
    const duration = 1800
    const startTime = performance.now()

    const tick = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      const currentValue = Math.floor(easedProgress * target)
      el.textContent = target >= 1000 ? currentValue.toLocaleString('it-IT') : currentValue
      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        el.textContent = target >= 1000 ? target.toLocaleString('it-IT') : target
      }
    }
    requestAnimationFrame(tick)
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target)
          counterObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.5 }
  )
  counters.forEach((counter) => counterObserver.observe(counter))
}

/* ═══════════════════════════════════════════════════════════════
   VIEW-ITEM REVEAL ANIMATIONS
═══════════════════════════════════════════════════════════════ */
function initReveals() {
  if (prefersReducedMotion) {
    document.querySelectorAll('[data-reveal], [data-reveal-item]').forEach(el => {
      el.classList.add('revealed')
    })
    return
  }

  // Single reveals
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15 }
  )
  document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el))

  // Staggered reveals for lists
  document.querySelectorAll('[data-reveal-list]').forEach(list => {
    const items = list.querySelectorAll('[data-reveal-item]')
    const listObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          items.forEach((item, i) => {
            setTimeout(() => item.classList.add('revealed'), i * 100)
          })
          listObserver.unobserve(list)
        }
      },
      { threshold: 0.15 }
    )
    listObserver.observe(list)
  })
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL ANIMATION — IntersectionObserver (existing)
═══════════════════════════════════════════════════════════════ */
function initScrollAnimations() {
  const animateElements = document.querySelectorAll('.animate-on-scroll')
  if (!animateElements.length) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  )
  animateElements.forEach((el) => observer.observe(el))
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVE NAV LINK HIGHLIGHTING
═══════════════════════════════════════════════════════════════ */
function initActiveNavHighlight() {
  const sections = document.querySelectorAll('section[id]')
  const navLinks = document.querySelectorAll('header nav a[href^="#"], #mobile-menu a[href^="#"]')
  if (!sections.length || !navLinks.length) return

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id')
          navLinks.forEach((link) => {
            const href = link.getAttribute('href')
            if (href === `#${id}`) {
              link.style.color = 'white'
              link.style.fontWeight = '600'
            } else {
              link.style.color = ''
              link.style.fontWeight = ''
            }
          })
        }
      })
    },
    { threshold: 0.3, rootMargin: '-80px 0px -40% 0px' }
  )
  sections.forEach((section) => sectionObserver.observe(section))
}

/* ═══════════════════════════════════════════════════════════════
   GSAP HOVER INERTIA — Feature Cards
═══════════════════════════════════════════════════════════════ */
function initHoverInertia() {
  if (prefersReducedMotion || isMobile) return

  let mouseVelX = 0, mouseVelY = 0, prevX = 0, prevY = 0
  document.addEventListener('mousemove', (e) => {
    mouseVelX = e.clientX - prevX
    mouseVelY = e.clientY - prevY
    prevX = e.clientX
    prevY = e.clientY
  })

  document.querySelectorAll('.feature-card').forEach(card => {
    let tl
    card.addEventListener('mouseenter', () => {
      if (tl) tl.kill()
      tl = gsap.timeline()
      tl.to(card, {
        x: mouseVelX * 0.4,
        y: mouseVelY * 0.4,
        rotation: (Math.random() - 0.5) * 6,
        duration: 0.3,
        ease: 'power2.out'
      })
      tl.to(card, {
        x: 0, y: 0, rotation: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.4)',
      })
    })
    card.addEventListener('mouseleave', () => {
      if (tl) tl.kill()
      gsap.to(card, { x: 0, y: 0, rotation: 0, duration: 0.4, ease: 'power2.out' })
    })
  })
}

/* ═══════════════════════════════════════════════════════════════
   THREE.JS GLOBE
═══════════════════════════════════════════════════════════════ */
function initGlobe() {
  const canvas = document.getElementById('globe-canvas')
  if (!canvas) return

  const size = Math.min(isMobile ? 300 : 600, canvas.parentElement.clientWidth)
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(size, size)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0, 3)
  camera.position.z = 1.5

  // Globe group (for mouse interaction)
  const globeGroup = new THREE.Group()
  scene.add(globeGroup)

  // Globe geometry with gradient shader
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
      void main() {
        float t = (v_normal.y + 1.0) / 2.0;
        vec3 top = vec3(59.0/255.0, 130.0/255.0, 246.0/255.0);
        vec3 mid = vec3(37.0/255.0, 99.0/255.0, 235.0/255.0);
        vec3 bottom = vec3(29.0/255.0, 78.0/255.0, 216.0/255.0);
        vec3 color = t < 0.6 ? mix(top, mid, t / 0.6) : mix(mid, bottom, (t - 0.6) / 0.4);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide
  })

  const globe = new THREE.Mesh(geometry, material)
  globeGroup.add(globe)

  // Load earth map for dot placement
  new THREE.TextureLoader().load('/images/earth-map-colored.png', (mask) => {
    const canvas2 = document.createElement('canvas')
    const ctx = canvas2.getContext('2d')
    const w = mask.image.width, h = mask.image.height
    canvas2.width = w; canvas2.height = h
    ctx.drawImage(mask.image, 0, 0)
    const pixels = ctx.getImageData(0, 0, w, h).data

    const dotGeo = new THREE.CircleGeometry(0.012, 16)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    const matrices = []
    const dummy = new THREE.Object3D()

    const step = isMobile ? 3.5 : 2.5
    for (let lat = -90; lat <= 90; lat += step) {
      for (let lon = -180; lon <= 180; lon += step) {
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
        matrices.push(dummy.matrix.clone())
      }
    }

    const dots = new THREE.InstancedMesh(dotGeo, dotMat, matrices.length)
    matrices.forEach((m, i) => dots.setMatrixAt(i, m))
    globeGroup.add(dots)
  })

  // Initial rotation centered on Italy
  globeGroup.rotation.x = 0.3
  globeGroup.rotation.y = -0.2

  // Mouse drag interaction
  let isDragging = false
  let dragStartX = 0, dragStartY = 0
  let rotStartX = 0, rotStartY = 0
  let autoRotateSpeed = 0.003

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    rotStartX = globeGroup.rotation.y
    rotStartY = globeGroup.rotation.x
    autoRotateSpeed = 0 // pause auto-rotate during drag
    canvas.style.cursor = 'grabbing'
  })

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    const dx = (e.clientX - dragStartX) * 0.005
    const dy = (e.clientY - dragStartY) * 0.005
    globeGroup.rotation.y = rotStartX + dx
    globeGroup.rotation.x = Math.max(-0.8, Math.min(0.8, rotStartY + dy))
  })

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false
      canvas.style.cursor = 'grab'
      // Resume auto-rotate after a short delay
      setTimeout(() => { autoRotateSpeed = 0.003 }, 1500)
    }
  })

  canvas.style.cursor = 'grab'

  let animId
  let isVisible = false
  const animate = () => {
    animId = requestAnimationFrame(animate)
    if (!isDragging) {
      globeGroup.rotation.y += autoRotateSpeed
    }
    renderer.render(scene, camera)
  }

  // Only animate when visible
  const globeSection = document.querySelector('.globe-section')
  const globeObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !isVisible) {
      isVisible = true
      animate()
      globeSection.classList.add('in-view')
    } else if (!entry.isIntersecting && isVisible) {
      isVisible = false
      cancelAnimationFrame(animId)
    }
  }, { threshold: 0.1 })
  globeObserver.observe(globeSection)

  // Resize
  window.addEventListener('resize', () => {
    const mobile = window.innerWidth < 768
    const newSize = Math.min(mobile ? 300 : 600, canvas.parentElement.clientWidth)
    renderer.setSize(newSize, newSize)
  }, { passive: true })
}

/* ═══════════════════════════════════════════════════════════════
   COOKIE BANNER
═══════════════════════════════════════════════════════════════ */
function initCookieBanner() {
  const banner = document.getElementById('cookie-banner')
  const acceptBtn = document.getElementById('cookie-accept')
  if (!banner || !acceptBtn) return
  if (localStorage.getItem('cookie_consent')) return

  banner.removeAttribute('hidden')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { banner.classList.remove('translate-y-full') })
  })

  acceptBtn.addEventListener('click', () => {
    localStorage.setItem('cookie_consent', 'accepted')
    banner.classList.add('translate-y-full')
    setTimeout(() => banner.setAttribute('hidden', ''), 300)
  })
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
function init() {
  initLenis()
  initStickyNavbar()
  initMobileMenu()
  initScrollAnimations()
  initReveals()
  initFaqAccordion()
  initSmoothScroll()
  initStatsCounters()
  initActiveNavHighlight()
  initLiquidGradient()
  initHeroAnimation()
  initHeroScrollDriven()
  initIPhoneShowcase()
  initHoverInertia()
  initGlobe()
  initCookieBanner()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
