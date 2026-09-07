// La parte viva della pagina delle scadenze.
//
// Lo stato temporale — quale scadenza è la prossima, quanti giorni mancano —
// NON può stare nell'HTML: sarebbe falso il giorno dopo. Sta qui, e si calcola
// nel browser sulla data di chi guarda. Il contenuto invece è tutto statico:
// senza JavaScript la pagina resta il calendario completo, che è ciò che
// si indicizza.

import { classifica, PASSATA, PROSSIMA } from './lib/scadenze.mjs';

const linea = document.querySelector('[data-scadenza]')?.closest('ol');

if (linea) {
  const voci = [...linea.querySelectorAll('[data-scadenza]')];
  const menoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stati = classifica(
    voci.map((el) => ({ id: el.dataset.scadenza, data: el.dataset.data, el })),
  );

  const quandoTesto = (g) => {
    if (g === 0) return 'è oggi';
    if (g === 1) return 'è domani';
    return `fra ${g} giorni`;
  };

  for (const s of stati) {
    const pallino = s.el.querySelector('.pallino');
    const conto = s.el.querySelector('.conto');

    if (s.stato === PASSATA) {
      s.el.classList.add('passata');
      if (conto) { conto.hidden = false; conto.textContent = 'già passata'; conto.classList.add('text-slate-400'); }
    } else if (s.stato === PROSSIMA) {
      s.el.classList.add('prossima');
      pallino?.classList.add('bg-primary-600', 'ring-primary-600');
      pallino?.classList.remove('bg-slate-300', 'ring-slate-300');
      if (conto) { conto.hidden = false; conto.textContent = quandoTesto(s.giorni); }

      const scheda = document.querySelector('[data-prossima]');
      if (scheda) {
        scheda.hidden = false;
        scheda.querySelector('[data-prossima-titolo]').textContent =
          s.el.querySelector('h3').textContent.trim();
        const data = s.el.querySelector('time').textContent.trim();
        scheda.querySelector('[data-prossima-quando]').textContent =
          s.giorni === 0 ? `Oggi, ${data}.` : `${data} — ${quandoTesto(s.giorni)}.`;
      }
    }
  }

  // Ingresso progressivo delle voci, solo quando entrano nello schermo. Con
  // prefers-reduced-motion si saltano gli effetti e restano tutte visibili:
  // l'informazione non deve mai dipendere dall'animazione.
  if (!menoMovimento && 'IntersectionObserver' in window) {
    linea.classList.add('anima');
    const osserva = new IntersectionObserver((voci_) => {
      for (const v of voci_) {
        if (v.isIntersecting) { v.target.classList.add('dentro'); osserva.unobserve(v.target); }
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    voci.forEach((v) => osserva.observe(v));
  }
}
