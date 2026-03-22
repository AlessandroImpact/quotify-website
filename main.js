/**
 * main.js — Quotify Landing Page
 * All interactions: scroll animations, navbar, mobile menu, FAQ accordion,
 * smooth scroll, stats counter animation.
 */

/* ═══════════════════════════════════════════════════════════════
   SCROLL ANIMATION — IntersectionObserver
═══════════════════════════════════════════════════════════════ */
function initScrollAnimations() {
  const animateElements = document.querySelectorAll(".animate-on-scroll");

  if (!animateElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          // Once visible, stop observing this element
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  animateElements.forEach((el) => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════
   STICKY NAVBAR — Glass effect on scroll
═══════════════════════════════════════════════════════════════ */
function initStickyNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  let lastScrollY = 0;
  let ticking = false;

  const handleScroll = () => {
    lastScrollY = window.scrollY;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (lastScrollY > 50) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  // Run once on load in case page is already scrolled
  handleScroll();
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE MENU TOGGLE
═══════════════════════════════════════════════════════════════ */
function initMobileMenu() {
  const btn = document.getElementById("mobile-menu-btn");
  const menu = document.getElementById("mobile-menu");
  const hamburgerIcon = document.getElementById("hamburger-icon");
  const closeIcon = document.getElementById("close-icon");

  if (!btn || !menu) return;

  let isOpen = false;

  const openMenu = () => {
    isOpen = true;
    menu.removeAttribute("hidden");
    // Use rAF to allow display:block to apply before adding transition class
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        menu.classList.add("open");
      });
    });
    hamburgerIcon.classList.add("hidden");
    closeIcon.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
  };

  const closeMenu = () => {
    isOpen = false;
    menu.classList.remove("open");
    hamburgerIcon.classList.remove("hidden");
    closeIcon.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");

    // Re-add hidden after transition ends
    const onTransitionEnd = () => {
      if (!isOpen) {
        menu.setAttribute("hidden", "");
      }
      menu.removeEventListener("transitionend", onTransitionEnd);
    };
    menu.addEventListener("transitionend", onTransitionEnd);
  };

  btn.addEventListener("click", () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when a nav link is clicked
  const navLinks = menu.querySelectorAll(".mobile-nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  // Close menu on outside click
  document.addEventListener("click", (e) => {
    if (isOpen && !menu.contains(e.target) && !btn.contains(e.target)) {
      closeMenu();
    }
  });

  // Close menu on resize to desktop
  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth >= 1024 && isOpen) {
        closeMenu();
      }
    },
    { passive: true }
  );
}

/* ═══════════════════════════════════════════════════════════════
   FAQ ACCORDION
═══════════════════════════════════════════════════════════════ */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const btn = item.querySelector(".faq-btn");
    const content = item.querySelector(".faq-content");

    if (!btn || !content) return;

    btn.addEventListener("click", () => {
      const isCurrentlyOpen = item.classList.contains("open");

      // Close all other items
      faqItems.forEach((otherItem) => {
        if (otherItem !== item && otherItem.classList.contains("open")) {
          closeFaqItem(otherItem);
        }
      });

      // Toggle current item
      if (isCurrentlyOpen) {
        closeFaqItem(item);
      } else {
        openFaqItem(item);
      }
    });

    // Keyboard accessibility: also open on Enter/Space (already native for button)
  });
}

function openFaqItem(item) {
  const btn = item.querySelector(".faq-btn");
  const content = item.querySelector(".faq-content");

  item.classList.add("open");
  content.classList.add("open");
  btn.setAttribute("aria-expanded", "true");
  content.setAttribute("aria-hidden", "false");
}

function closeFaqItem(item) {
  const btn = item.querySelector(".faq-btn");
  const content = item.querySelector(".faq-content");

  item.classList.remove("open");
  content.classList.remove("open");
  btn.setAttribute("aria-expanded", "false");
  content.setAttribute("aria-hidden", "true");
}

/* ═══════════════════════════════════════════════════════════════
   SMOOTH SCROLL — Anchor links
═══════════════════════════════════════════════════════════════ */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  const navbar = document.getElementById("navbar");

  anchorLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      // Skip empty hashes
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 64;
      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - navbarHeight - 16;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });

      // Update URL without triggering scroll
      history.pushState(null, "", href);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   STATS COUNTER ANIMATION
═══════════════════════════════════════════════════════════════ */
function initStatsCounters() {
  const counters = document.querySelectorAll(".stat-counter");
  if (!counters.length) return;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute("data-target"), 10);
    if (isNaN(target)) return;

    const duration = 1800; // ms
    const startTime = performance.now();

    const tick = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue = Math.floor(easedProgress * target);

      // Format large numbers with dots as thousands separator (Italian convention)
      if (target >= 1000) {
        el.textContent = currentValue.toLocaleString("it-IT");
      } else {
        el.textContent = currentValue;
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Ensure final value is exactly the target
        if (target >= 1000) {
          el.textContent = target.toLocaleString("it-IT");
        } else {
          el.textContent = target;
        }
      }
    };

    requestAnimationFrame(tick);
  };

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

/* ═══════════════════════════════════════════════════════════════
   HERO — Entrance animation on load
═══════════════════════════════════════════════════════════════ */
function initHeroAnimation() {
  const hero = document.getElementById("hero");
  if (!hero) return;

  // Animate hero children sequentially
  const animatables = hero.querySelectorAll(
    ".inline-flex, h1, p, .flex.flex-col, .grid"
  );

  animatables.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = `opacity 0.7s ease, transform 0.7s ease`;
    el.style.transitionDelay = `${i * 0.12}s`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVE NAV LINK HIGHLIGHTING
═══════════════════════════════════════════════════════════════ */
function initActiveNavHighlight() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(
    'header nav a[href^="#"], #mobile-menu a[href^="#"]'
  );

  if (!sections.length || !navLinks.length) return;

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");

          navLinks.forEach((link) => {
            const href = link.getAttribute("href");
            if (href === `#${id}`) {
              link.style.color = "white";
              link.style.fontWeight = "600";
            } else {
              link.style.color = "";
              link.style.fontWeight = "";
            }
          });
        }
      });
    },
    {
      threshold: 0.3,
      rootMargin: "-80px 0px -40% 0px",
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

/* ═══════════════════════════════════════════════════════════════
   INIT — Run all modules on DOM ready
═══════════════════════════════════════════════════════════════ */
function init() {
  initStickyNavbar();
  initMobileMenu();
  initScrollAnimations();
  initFaqAccordion();
  initSmoothScroll();
  initStatsCounters();
  initHeroAnimation();
  initActiveNavHighlight();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
