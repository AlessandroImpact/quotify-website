// L'apertura della pagina delle guide non è un titolo: è il fatto più urgente
// nella vita di chi legge. Quanti giorni mancano alla prossima scadenza si può
// sapere solo nel browser — scritto nell'HTML sarebbe falso domani.

import { classifica, PROSSIMA } from './lib/scadenze.mjs';
import scadenze from './data/scadenze-2026.json';

const box = document.querySelector('[data-urgenza]');

if (box) {
  // Solo le scadenze che riguardano chiunque: mostrare una rata da artigiano a
  // un libero professionista sarebbe la stessa confusione che il filtro della
  // pagina delle scadenze serve a togliere.
  const comuni = scadenze.scadenze.filter((s) => s.chi === 'tutti');
  const prossima = classifica(comuni).find((s) => s.stato === PROSSIMA);

  if (prossima) {
    const data = new Date(`${prossima.data}T12:00:00Z`).toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', timeZone: 'UTC',
    });
    box.hidden = false;
    box.querySelector('[data-urgenza-num]').textContent =
      prossima.giorni === 0 ? 'oggi' : prossima.giorni;
    box.querySelector('[data-urgenza-cosa]').textContent =
      prossima.giorni === 0
        ? `${prossima.titolo}, oggi.`
        : `${prossima.giorni === 1 ? 'giorno' : 'giorni'} al ${data}: ${prossima.titolo.toLowerCase()}.`;
  }
}

// Ingresso progressivo del registro. La classe .anima la mette il JavaScript,
// così senza di lui le voci sono visibili da subito invece che invisibili
// per sempre.
const registri = document.querySelectorAll('.registro');
if (registri.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    && 'IntersectionObserver' in window) {
  const osserva = new IntersectionObserver((voci) => {
    for (const v of voci) {
      if (v.isIntersecting) { v.target.classList.add('dentro'); osserva.unobserve(v.target); }
    }
  }, { rootMargin: '0px 0px -10% 0px' });

  for (const r of registri) {
    r.classList.add('anima');
    r.querySelectorAll('.voce').forEach((v) => osserva.observe(v));
  }
}
