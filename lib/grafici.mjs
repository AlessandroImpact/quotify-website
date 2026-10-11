// Grafici SVG fatti a mano — docs/cruscotto-piano.md §4.6.
//
// Niente librerie: niente script di terzi su questo dominio, e i colori
// seguono i due temi del sito via CSS (classi g-*). Funzioni pure che
// restituiscono stringhe: si testano senza browser.
//
// Ogni valore che arriva dai dati passa da esc(): un nome di campagna è
// testo scritto da chiunque abbia costruito un link.

const SIMBOLI = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => SIMBOLI[c]);
const n1 = (v) => Number(v).toFixed(1);

const L = 640;
const A = 180;
const M = { sinistra: 8, destra: 8, alto: 16, basso: 22 };

function riquadroVuoto(larghezza, altezza, titolo) {
  return `<svg class="grafico" viewBox="0 0 ${larghezza} ${altezza}" role="img" aria-label="${esc(titolo)}: nessun dato">`
    + `<text class="g-vuoto" x="${larghezza / 2}" y="${altezza / 2}" text-anchor="middle">Nessun dato</text></svg>`;
}

export function linea({ punti, confronto = null, titolo = '', formato = String }) {
  const n = punti.length;
  const cfr = confronto ? confronto.slice(0, n) : null;
  const valori = [...punti, ...(cfr ?? [])].map((p) => p.y).filter((v) => v != null);
  if (!n || !punti.some((p) => p.y != null)) return riquadroVuoto(L, A, titolo);

  const massimo = Math.max(...valori, 0) || 1;
  const utile = L - M.sinistra - M.destra;
  const passo = n === 1 ? utile : utile / (n - 1);
  const x = (i) => (n === 1 ? M.sinistra + utile / 2 : M.sinistra + i * passo);
  const y = (v) => A - M.basso - (v / massimo) * (A - M.alto - M.basso);

  const tracciato = (pp) => {
    let d = '';
    let dentro = false;
    pp.forEach((p, i) => {
      if (p.y == null) { dentro = false; return; }
      d += `${dentro ? 'L' : 'M'}${n1(x(i))},${n1(y(p.y))}`;
      dentro = true;
    });
    return d;
  };
  // Un punto senza vicini non disegna nessuna linea: serve un cerchio.
  const isolati = punti.map((p, i) => (p.y != null && punti[i - 1]?.y == null && punti[i + 1]?.y == null
    ? `<circle class="g-punto" cx="${n1(x(i))}" cy="${n1(y(p.y))}" r="3"/>` : '')).join('');

  const fmt = (v) => (v == null ? '—' : formato(v));
  const zone = punti.map((p, i) => {
    const sx = Math.max(0, x(i) - passo / 2);
    const confrontoAttr = cfr ? ` data-confronto="${esc(fmt(cfr[i]?.y ?? null))}"` : '';
    return `<rect class="g-zona" x="${n1(sx)}" y="0" width="${n1(Math.min(passo, L))}" height="${A}" data-i="${i}" data-etichetta="${esc(p.x)}" data-valore="${esc(fmt(p.y))}"${confrontoAttr}><title>${esc(p.x)}: ${esc(fmt(p.y))}</title></rect>`;
  }).join('');

  return `<svg class="grafico" viewBox="0 0 ${L} ${A}" role="img" aria-label="${esc(titolo)}">`
    + `<title>${esc(titolo)}</title>`
    + `<line class="g-base" x1="${M.sinistra}" x2="${L - M.destra}" y1="${n1(y(0))}" y2="${n1(y(0))}"/>`
    + (cfr ? `<path class="g-confronto" d="${tracciato(cfr)}"/>` : '')
    + `<path class="g-linea" d="${tracciato(punti)}"/>${isolati}`
    + `<text class="g-asse" x="${M.sinistra}" y="${A - 6}">${esc(punti[0].x)}</text>`
    + `<text class="g-asse" x="${L - M.destra}" y="${A - 6}" text-anchor="end">${esc(punti[n - 1].x)}</text>`
    + `<text class="g-asse" x="${M.sinistra}" y="${M.alto - 4}">${esc(formato(massimo))}</text>`
    + zone
    + '</svg>';
}

export function minilinea(valori) {
  const larghezza = 96;
  const altezza = 24;
  const veri = valori.filter((v) => v != null);
  if (!veri.length) return `<svg class="minilinea" viewBox="0 0 ${larghezza} ${altezza}" aria-hidden="true"></svg>`;
  const massimo = Math.max(...veri, 0) || 1;
  const n = valori.length;
  const x = (i) => (n === 1 ? larghezza / 2 : (i * larghezza) / (n - 1));
  const y = (v) => altezza - 2 - (v / massimo) * (altezza - 4);
  let d = '';
  let dentro = false;
  valori.forEach((v, i) => {
    if (v == null) { dentro = false; return; }
    d += `${dentro ? 'L' : 'M'}${n1(x(i))},${n1(y(v))}`;
    dentro = true;
  });
  const solo = n === 1 ? `<circle class="g-punto" cx="${n1(x(0))}" cy="${n1(y(veri[0]))}" r="2"/>` : '';
  return `<svg class="minilinea" viewBox="0 0 ${larghezza} ${altezza}" aria-hidden="true"><path class="g-linea" d="${d}"/>${solo}</svg>`;
}

export function imbuto(gradini) {
  const alto = 46;
  const etichette = 150;
  const altezza = Math.max(alto, gradini.length * alto);
  if (!gradini.length) return riquadroVuoto(L, alto, 'Imbuto');
  const primo = gradini.find((g) => g.valore != null)?.valore ?? 0;
  const massimo = Math.max(primo, ...gradini.map((g) => g.valore ?? 0), 1);
  const utile = L - etichette - 70;
  const righe = gradini.map((g, i) => {
    const v = g.valore;
    const w = v == null ? 0 : Math.max(2, (v / massimo) * utile);
    const prima = gradini[i - 1]?.valore;
    const passaggio = i === 0 ? '' : prima == null || v == null || prima === 0 ? '—' : `${Math.round((v / prima) * 100)}%`;
    const top = i * alto;
    return `<g class="g-gradino">`
      + `<text class="g-nome" x="0" y="${top + 27}">${esc(g.nome)}</text>`
      + `<rect class="g-barra" x="${etichette}" y="${top + 8}" width="${n1(w)}" height="${alto - 16}" rx="4"/>`
      + `<text class="g-valore" x="${n1(etichette + w + 8)}" y="${top + 27}">${v == null ? '—' : esc(v)}</text>`
      + (i ? `<text class="g-passaggio" x="${L}" y="${top + 27}" text-anchor="end">${passaggio}</text>` : '')
      + '</g>';
  }).join('');
  return `<svg class="grafico imbuto" viewBox="0 0 ${L} ${altezza}" role="img" aria-label="Imbuto"><title>Imbuto</title>${righe}</svg>`;
}
