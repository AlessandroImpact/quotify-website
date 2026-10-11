// Lo stato del cruscotto sta nell'indirizzo — docs/cruscotto-piano.md §4.1.
// Così il tasto indietro funziona, una vista si salva, e i link degli avvisi
// e delle frasi aprono la vista giusta. Formato: #scheda?periodo=…&confronto=0&canale=…&campagna=…

import { PERIODI, PERIODO_PREDEFINITO } from './cruscotto.mjs';

export const SCHEDE = ['oggi', 'marketing', 'imbuto'];
const PREDEFINITA = { scheda: 'oggi', periodo: PERIODO_PREDEFINITO, confronto: true, canale: null, campagna: null };

export function leggiVista(hash) {
  const [nome, query = ''] = String(hash ?? '').replace(/^#/, '').split('?');
  const q = new URLSearchParams(query);
  return {
    scheda: SCHEDE.includes(nome) ? nome : PREDEFINITA.scheda,
    periodo: PERIODI.includes(q.get('periodo')) ? q.get('periodo') : PREDEFINITA.periodo,
    confronto: q.get('confronto') !== '0',
    canale: q.get('canale') || null,
    campagna: q.get('campagna') || null,
  };
}

export function scriviVista(v) {
  const q = new URLSearchParams();
  if (v.periodo !== PREDEFINITA.periodo) q.set('periodo', v.periodo);
  if (!v.confronto) q.set('confronto', '0');
  if (v.canale) q.set('canale', v.canale);
  if (v.campagna) q.set('campagna', v.campagna);
  const s = q.toString();
  return `#${v.scheda}${s ? `?${s}` : ''}`;
}
