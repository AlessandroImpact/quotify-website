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
