// La parte viva della pagina delle scadenze.
//
// Lo stato temporale — quale scadenza è la prossima, quanti giorni mancano —
// NON può stare nell'HTML: sarebbe falso il giorno dopo. Sta qui, e si calcola
// nel browser sulla data di chi guarda. Il contenuto invece è tutto statico:
// senza JavaScript la pagina resta il calendario completo, e anche il filtro
// continua a funzionare perché è fatto in CSS.

import { classifica, PASSATA, PROSSIMA } from './lib/scadenze.mjs';

const linea = document.querySelector('ol.linea');

if (linea) {
  const voci = [...linea.querySelectorAll('[data-scadenza]')];
  const radio = [...document.querySelectorAll('input[name="chi"]')];
  const scheda = document.querySelector('[data-prossima]');
  const conteggio = document.querySelector('[data-conteggio-filtro]');
  const menoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const quandoTesto = (g) => (g === 0 ? 'è oggi' : g === 1 ? 'è domani' : `fra ${g} giorni`);

  const filtro = () => radio.find((r) => r.checked)?.value ?? 'tutte';

  // Chi versa alla Gestione Separata non ha rate fisse: mostrargliele in mezzo
  // alle sue è esattamente ciò che rende un calendario fraintendibile.
  const riguarda = (el) => filtro() !== 'gestione-separata' || el.dataset.chi === 'tutti';

  function ridisegna() {
    const attive = voci.filter(riguarda);

    for (const el of voci) {
      // Il nascondere lo fa il CSS con `:has()`, così funziona anche senza
      // JavaScript. Lo rifacciamo anche qui per i browser che `:has()` non ce
      // l'hanno: senza, mostrerebbero tutte le voci mentre il conteggio ne
      // considera solo alcune — peggio che non filtrare affatto.
      el.hidden = !riguarda(el);
      el.classList.remove('passata', 'prossima');
      const pallino = el.querySelector('.pallino');
      pallino?.classList.remove('bg-primary-600', 'ring-primary-600');
      pallino?.classList.add('bg-slate-300', 'ring-slate-300');
      const conto = el.querySelector('.conto');
      if (conto) { conto.hidden = true; conto.className = 'conto ml-2 normal-case tracking-normal font-medium text-primary-700'; }
    }

    // La classificazione gira SOLO sulle scadenze che riguardano l'utente:
    // è il motivo per cui il filtro esiste. Per chi è in Gestione Separata la
    // prossima non è la rata INPS di metà novembre, è l'acconto di fine mese.
    const stati = classifica(attive.map((el) => ({ data: el.dataset.data, el })));

    for (const s of stati) {
      const conto = s.el.querySelector('.conto');
      if (s.stato === PASSATA) {
        s.el.classList.add('passata');
        if (conto) { conto.hidden = false; conto.textContent = 'già passata'; conto.classList.add('text-slate-400'); }
      } else if (s.stato === PROSSIMA) {
        s.el.classList.add('prossima');
        const pallino = s.el.querySelector('.pallino');
        pallino?.classList.add('bg-primary-600', 'ring-primary-600');
        pallino?.classList.remove('bg-slate-300', 'ring-slate-300');
        if (conto) { conto.hidden = false; conto.textContent = quandoTesto(s.giorni); }

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

    if (scheda && !stati.some((s) => s.stato === PROSSIMA)) scheda.hidden = true;

    if (conteggio) {
      const nascoste = voci.length - attive.length;
      conteggio.hidden = nascoste === 0;
      conteggio.textContent = nascoste === 0 ? ''
        : `${nascoste} scadenze su ${voci.length} non ti riguardano: sono le rate dei contributi fissi, che versano solo artigiani e commercianti.`;
    }

    const q = new URLSearchParams(location.search);
    if (filtro() === 'tutte') q.delete('chi'); else q.set('chi', filtro());
    history.replaceState(null, '', q.toString() ? `${location.pathname}?${q}` : location.pathname);
  }

  const scelto = new URLSearchParams(location.search).get('chi');
  const iniziale = radio.find((r) => r.value === scelto);
  if (iniziale) iniziale.checked = true;

  radio.forEach((r) => r.addEventListener('change', ridisegna));
  ridisegna();

  // Ingresso progressivo, solo quando le voci entrano nello schermo. Con
  // prefers-reduced-motion si salta: l'informazione non deve mai dipendere
  // dall'animazione.
  if (!menoMovimento && 'IntersectionObserver' in window) {
    linea.classList.add('anima');
    const osserva = new IntersectionObserver((entrate) => {
      for (const e of entrate) {
        if (e.isIntersecting) { e.target.classList.add('dentro'); osserva.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    voci.forEach((v) => osserva.observe(v));
  }
}
