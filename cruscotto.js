// Il cruscotto — docs/cruscotto-piano.md §4.
//
// Un guscio: chiede /api/cruscotto e disegna. Nessun dato sta nella pagina.
// Lo stato sta nell'indirizzo (lib/vista.mjs). Toccare una riga filtra sui
// dati già scaricati: non fa richieste.

import './cruscotto.css';
import { linea, minilinea, imbuto, esc } from './lib/grafici.mjs';
import { leggiVista, scriviVista } from './lib/vista.mjs';
import { numero, variazione, SOGLIE } from './lib/osservazioni.mjs';
import { famiglia } from './lib/attribuzione.mjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const memoria = new Map();
let vista = leggiVista(location.hash);

// ── formati ───────────────────────────────────────────────────────────────
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const giornoBreve = (g) => `${Number(g.slice(8, 10))} ${MESI[Number(g.slice(5, 7)) - 1]}`;
// I centesimi interi, sempre due decimali: «€ 59,40», non «€ 59,4».
const euro = (c) => (c == null ? '—'
  : `€ ${numero(Math.trunc(c / 100))},${String(Math.abs(Math.round(c)) % 100).padStart(2, '0')}`);
const percento = (x) => (x == null ? '—' : `${numero(x * 100)}%`);
const MESSAGGI_APP = { 'in-attesa': 'in attesa dell\'app', errore: 'app non raggiungibile' };

function delta(attuale, precedente, soglia) {
  if (!vista.confronto) return '';
  const v = variazione(attuale, precedente, soglia);
  if (!v) return '<span class="delta">—</span>';
  const verso = v.rapporto > 0 ? 'su' : v.rapporto < 0 ? 'giu' : '';
  return `<span class="delta ${verso}">${v.rapporto > 0 ? '▲' : v.rapporto < 0 ? '▼' : ''} ${v.testo}</span>`;
}

const tabella = (intestazioni, righe) => `<div class="tabella"><table><thead><tr>${intestazioni
  .map(([t, n]) => `<th${n ? ' class="n"' : ''}>${esc(t)}</th>`).join('')}</tr></thead><tbody>${righe.join('') || `<tr><td colspan="${intestazioni.length}">Niente in questo periodo</td></tr>`}</tbody></table></div>`;
const cella = (v, n = false) => `<td${n ? ' class="n"' : ''}>${v}</td>`;

const figura = (svg) => `<figure class="grafico-con-lettura" style="margin:0">${svg}<div class="lettura" aria-live="polite"></div></figure>`;

// ── dati ──────────────────────────────────────────────────────────────────
async function carica() {
  const chiave = `${vista.periodo}|${vista.confronto ? 1 : 0}`;
  if (memoria.has(chiave)) return memoria.get(chiave);
  let r;
  try {
    r = await fetch(`/api/cruscotto?periodo=${vista.periodo}&confronto=${vista.confronto ? 1 : 0}`, {
      credentials: 'same-origin', headers: { Accept: 'application/json' },
    });
  } catch {
    // Con la sessione di Access scaduta la richiesta viene rimandata alla
    // pagina di accesso su un altro dominio, e il browser la blocca qui.
    throw new Error('Sessione scaduta o rete assente: ricarica la pagina.');
  }
  if (r.status === 403) throw new Error('Accesso negato: ricarica la pagina per rientrare.');
  if (r.status === 503) throw new Error('Archivio non disponibile in questo momento.');
  if (!r.ok) throw new Error(`Il cruscotto non ha risposto (${r.status}).`);
  const d = await r.json();
  memoria.set(chiave, d);
  return d;
}

// ── scheda Oggi ───────────────────────────────────────────────────────────
function cifra(nome, valore, formato, campo, d, soglia, conLinea = true) {
  // Visite, pagine viste, clic e impressioni si confrontano solo sui giorni
  // che hanno un dato in entrambi i periodi (lib/composizione.mjs, confrontabili).
  const cfr = d.confrontabili && campo in d.confrontabili ? d.confrontabili[campo] : undefined;
  const att = cfr !== undefined ? cfr?.attuale ?? null : d.totali[campo];
  const prec = cfr !== undefined ? cfr?.precedente ?? null : d.totaliPrecedente?.[campo] ?? null;
  const assente = att == null && ['iscritti', 'nuoviPro', 'ricavoMensileCentesimi'].includes(campo);
  return `<div class="riquadro cifra"><div class="nome">${esc(nome)}</div>
    <div class="valore">${assente ? '—' : formato(valore)}</div>
    ${assente ? `<div class="attesa">${MESSAGGI_APP[d.fonti.app] ?? 'non ancora misurato'}</div>` : (soglia != null ? delta(att, prec, soglia) : '')}
    ${conLinea && !assente ? minilinea(d.serie.map((s) => s[campo] ?? null)) : ''}</div>`;
}

function oreDelGiorno(righe) {
  const perOra = new Map(righe.map((r) => [new Date(r.ora).getUTCHours(), r.visite]));
  return Array.from({ length: 24 }, (_, h) => perOra.get(h) ?? null);
}

function disegnaOggi(d) {
  const t = d.totali;
  const cifre = `<div class="cifre">
    ${cifra('Visite', t.visite, numero, 'visite', d, SOGLIE.visite)}
    ${cifra('Iscritti', t.iscritti, numero, 'iscritti', d, SOGLIE.iscritti)}
    ${cifra('Nuovi Pro', t.nuoviPro, numero, 'nuoviPro', d, SOGLIE.iscritti)}
    ${cifra('Ricavo mensile', t.ricavoMensileCentesimi, euro, 'ricavoMensileCentesimi', d, null, false)}
  </div>`;

  const frasi = `<div class="riquadro"><h2>Cosa è cambiato</h2><ul class="frasi">${d.osservazioni
    .map((f) => `<li><a href="${esc(f.link)}">${esc(f.testo)}</a></li>`).join('')}</ul></div>`;

  const andamento = `<div class="riquadro"><h2>Visite per giorno</h2>${figura(linea({
    punti: d.serie.map((s) => ({ x: giornoBreve(s.giorno), y: s.visite })),
    confronto: vista.confronto && d.seriePrecedente ? d.seriePrecedente.map((s) => ({ x: giornoBreve(s.giorno), y: s.visite })) : null,
    titolo: 'Visite per giorno', formato: numero,
  }))}${d.primi.cloudflare && d.primi.cloudflare > d.periodo.da
    ? `<p class="nota">Le visite sono archiviate dal ${giornoBreve(d.primi.cloudflare)}: prima di allora il grafico è vuoto, non a zero.</p>` : ''}</div>`;

  const ora = new Date();
  // Le ore arrivano in UTC; l'etichetta è nell'ora del telefono, calcolata sul
  // giorno di oggi (con una data fissa sbaglierebbe di un'ora con l'ora legale).
  const etichettaOra = (h) => `${String(new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth(), ora.getUTCDate(), h)).getHours()).padStart(2, '0')}:00`;
  const giornata = `<div class="riquadro"><h2>Oggi, ora per ora</h2>${d.oggi
    ? figura(linea({
      punti: oreDelGiorno(d.oggi.perOra).map((v, h) => ({ x: etichettaOra(h), y: h <= ora.getUTCHours() ? v ?? 0 : null })),
      confronto: oreDelGiorno(d.oggi.ieriPerOra).map((v, h) => ({ x: etichettaOra(h), y: v ?? 0 })),
      titolo: 'Visite di oggi, ora per ora, con ieri tratteggiato', formato: numero,
    }))
    : '<p class="attesa">Cloudflare non ha risposto: niente dati di oggi.</p>'}</div>`;

  const s = d.salute;
  const indicizzate = d.indice.pagine.filter((p) => p.indicizzata).length;
  const fonti = s.fonti[0] ?? {};
  const v = s.vitals;
  const salute = `<div class="riquadro"><h2>Salute</h2><div class="salute">
    <span>Indice: <strong>${indicizzate}/${d.indice.pagine.length}</strong>${d.indice.ultima ? ` (${giornoBreve(d.indice.ultima)})` : ''}</span>
    <span>LCP ${v?.lcp != null ? `<strong class="${v.lcp <= 2500 ? 'si' : 'no'}">${numero(v.lcp)} ms</strong>` : '—'}</span>
    <span>INP ${v?.inp != null ? `<strong class="${v.inp <= 200 ? 'si' : 'no'}">${numero(v.inp)} ms</strong>` : '—'}</span>
    <span>CLS ${v?.cls != null ? `<strong class="${v.cls <= 0.1 ? 'si' : 'no'}">${v.cls.toFixed(2).replace('.', ',')}</strong>` : '—'}</span>
    <span>Notte del ${fonti.giorno ? giornoBreve(fonti.giorno) : '—'}: Cloudflare ${fonti.cloudflare === 'errore' ? '<strong class="no">errore</strong>' : 'ok'}, Google ${fonti.google === 'errore' || fonti.ricerca === 'errore' ? '<strong class="no">errore</strong>' : 'ok'}</span>
    <span>Search Console fino al ${s.ultimoGiornoGoogle ? giornoBreve(s.ultimoGiornoGoogle) : '—'}</span>
    <span>App: ${d.fonti.app === 'ok' ? 'ok' : `<span class="attesa">${MESSAGGI_APP[d.fonti.app]}</span>`}</span>
  </div></div>`;

  return cifre + frasi + andamento + `<div class="due">${giornata}${salute}</div>`;
}

// ── scheda Marketing ──────────────────────────────────────────────────────
function disegnaMarketing(d) {
  const { canale, campagna } = vista;
  const utm = d.visiteUtm.filter((v) => (!canale || famiglia(v.sorgente) === canale) && (!campagna || v.campagna === campagna));

  let andamento;
  if (canale || campagna) {
    const perGiorno = new Map();
    for (const v of utm) perGiorno.set(v.giorno, (perGiorno.get(v.giorno) ?? 0) + v.n);
    andamento = `<div class="riquadro"><h2>Visite attribuite per giorno</h2>${figura(linea({
      punti: d.serie.map((s) => ({ x: giornoBreve(s.giorno), y: perGiorno.get(s.giorno) ?? 0 })),
      titolo: 'Visite attribuite per giorno', formato: numero,
    }))}</div>`;
  } else {
    andamento = `<div class="riquadro"><h2>Pagine viste per giorno</h2>${figura(linea({
      punti: d.serie.map((s) => ({ x: giornoBreve(s.giorno), y: s.pagineViste })),
      confronto: vista.confronto && d.seriePrecedente ? d.seriePrecedente.map((s) => ({ x: giornoBreve(s.giorno), y: s.pagineViste })) : null,
      titolo: 'Pagine viste per giorno', formato: numero,
    }))}</div>`;
  }

  const appNota = (d.fonti.app === 'ok' ? '' : `<p class="nota">Iscritti e paganti: ${MESSAGGI_APP[d.fonti.app]}.</p>`)
    + (d.visiteUtmTroncate ? '<p class="attesa">Troppe visite attribuite per questo periodo: i giorni più vecchi sono esclusi dalle colonne UTM. Scegli un periodo più breve.</p>' : '');
  const canali = `<div class="riquadro"><h2>Canali</h2>${tabella(
    [['Canale'], ['Pagine viste', 1], ['Visite con UTM', 1], ['Iscritti', 1], ['Paganti', 1]],
    d.canali.map((c) => `<tr data-canale="${esc(c.famiglia)}">${cella(esc(c.famiglia))}${cella(numero(c.pagineViste), 1)}${cella(numero(c.visiteUtm), 1)}${cella(numero(c.iscritti), 1)}${cella(numero(c.paganti), 1)}</tr>`),
  )}${appNota}<p class="nota">Cloudflare dà le pagine viste per provenienza, non le visite.</p></div>`;

  const campagne = d.campagne.filter((c) => !canale || famiglia(c.sorgente) === canale);
  const tabCampagne = `<div class="riquadro"><h2>Campagne</h2>${tabella(
    [['Sorgente'], ['Mezzo'], ['Campagna'], ['Visite', 1], ['Iscritti', 1], ['Paganti', 1]],
    campagne.map((c) => `<tr data-campagna="${esc(c.campagna ?? '')}">${cella(esc(c.sorgente ?? '—'))}${cella(esc(c.mezzo ?? '—'))}${cella(esc(c.campagna ?? '—'))}${cella(numero(c.visite), 1)}${cella(numero(c.iscritti), 1)}${cella(numero(c.paganti), 1)}</tr>`),
  )}</div>`;

  let dettaglio = '';
  if (campagna) {
    const conta = (campo) => {
      const m = new Map();
      for (const v of utm) m.set(v[campo] ?? '—', (m.get(v[campo] ?? '—') ?? 0) + v.n);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    dettaglio = `<div class="due"><div class="riquadro"><h2>Pagine d'arrivo</h2>${tabella([['Pagina'], ['Visite', 1]],
      conta('percorso').map(([k, n]) => `<tr>${cella(esc(k))}${cella(numero(n), 1)}</tr>`))}</div>
      <div class="riquadro"><h2>Paesi</h2>${tabella([['Paese'], ['Visite', 1]],
      conta('paese').map(([k, n]) => `<tr>${cella(esc(k))}${cella(numero(n), 1)}</tr>`))}</div></div>`;
  }

  const r = d.ricerca;
  const ricerca = `<div class="riquadro"><h2>Ricerca Google</h2>${figura(linea({
    punti: d.serie.map((s) => ({ x: giornoBreve(s.giorno), y: s.clic })),
    confronto: vista.confronto && d.seriePrecedente ? d.seriePrecedente.map((s) => ({ x: giornoBreve(s.giorno), y: s.clic })) : null,
    titolo: 'Clic da Google per giorno', formato: numero,
  }))}<p class="nota">Clic ${numero(d.totali.clic)} · impressioni ${numero(d.totali.impressioni)} ${delta(d.confrontabili?.clic?.attuale ?? null, d.confrontabili?.clic?.precedente ?? null, SOGLIE.clic)}.
    I giorni di Search Console sono in ora del Pacifico, quelli di Cloudflare in UTC. Google nasconde le ricerche rare: le righe sommano meno del totale.</p>
    <div class="due"><div>${tabella([['Ricerca'], ['Clic', 1], ['Impr.', 1], ['Pos.', 1]],
      r.query.map((q) => `<tr>${cella(esc(q.chiave))}${cella(numero(q.clic), 1)}${cella(numero(q.impressioni), 1)}${cella(numero(q.posizione), 1)}</tr>`))}</div>
    <div>${tabella([['Pagina'], ['Clic', 1], ['Impr.', 1], ['Pos.', 1]],
      r.pagine.map((p) => `<tr>${cella(esc(p.chiave))}${cella(numero(p.clic), 1)}${cella(numero(p.impressioni), 1)}${cella(numero(p.posizione), 1)}</tr>`))}</div></div></div>`;

  const occasioni = r.occasioni.length ? `<div class="riquadro"><h2>Occasioni</h2>${tabella([['Pagina'], ['Impr.', 1], ['CTR', 1], ['Pos.', 1]],
    r.occasioni.map((p) => `<tr>${cella(esc(p.chiave))}${cella(numero(p.impressioni), 1)}${cella(percento(p.ctr), 1)}${cella(numero(p.posizione), 1)}</tr>`))}
    <p class="nota">Molte impressioni, pochi clic: un titolo o una descrizione migliori rendono di più qui.</p></div>` : '';

  const indice = `<div class="riquadro"><h2>Indicizzazione</h2>${tabella([['Pagina'], ['Stato'], ['Dal']],
    d.indice.pagine.map((p) => `<tr>${cella(esc(p.percorso))}${cella(`<span class="${p.indicizzata ? 'si' : 'no'}">${esc(p.stato)}</span>`)}${cella(giornoBreve(p.dal))}</tr>`))}</div>`;

  return andamento + canali + tabCampagne + dettaglio + ricerca + occasioni + indice;
}

// ── scheda Imbuto ─────────────────────────────────────────────────────────
function disegnaImbuto(d) {
  if (!d.imbuto) {
    return `<div class="riquadro"><h2>Imbuto</h2><p class="attesa">L'imbuto ha bisogno dei numeri dell'app: ${MESSAGGI_APP[d.fonti.app] ?? 'non disponibili'}.</p></div>`;
  }
  const canali = Object.keys(d.imbuto.perCanale).sort();
  const scelto = vista.canale && d.imbuto.perCanale[vista.canale] ? vista.canale : null;
  const gradini = scelto ? d.imbuto.perCanale[scelto] : d.imbuto.gradini;
  const scelte = `<div class="chip" role="group" aria-label="Canale">${['', ...canali].map((c) =>
    `<button type="button" data-imbuto-canale="${esc(c)}" aria-pressed="${(c || null) === scelto}">${esc(c || 'Tutti')}</button>`).join('')}</div>`;
  return `<div class="riquadro"><h2>Dalla visita al pagamento</h2>${scelte}${imbuto(gradini)}
    <p class="nota">Coorte: gli iscritti nel periodo, con il loro stato di oggi. Mediana fra iscrizione e primo pagamento: ${d.imbuto.medianaGiorniAlPagamento == null ? '—' : `${numero(d.imbuto.medianaGiorniAlPagamento)} giorni`}.</p>
    <p class="nota">«Provenienza sconosciuta»: chi si è iscritto prima che l'app salvasse la provenienza, o chi è arrivato passando da più pagine del sito (senza cookie la provenienza vale solo per il salto diretto).</p></div>`;
}

// ── disegno e comandi ─────────────────────────────────────────────────────
const DISEGNI = { oggi: disegnaOggi, marketing: disegnaMarketing, imbuto: disegnaImbuto };

function aggiornaComandi() {
  $$('[data-periodo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.periodo === vista.periodo)));
  $('[data-confronto]').checked = vista.confronto;
  $$('[data-vai]').forEach((a) => {
    a.href = scriviVista({ ...vista, scheda: a.dataset.vai });
    if (a.dataset.vai === vista.scheda) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const filtro = $('[data-filtro]');
  const etichetta = [vista.canale && `canale: ${vista.canale}`, vista.campagna && `campagna: ${vista.campagna}`].filter(Boolean).join(' · ');
  filtro.hidden = !etichetta;
  filtro.innerHTML = etichetta ? `<button type="button" data-togli-filtro>${esc(etichetta)} ✕</button>` : '';
  $$('[data-scheda]').forEach((s) => { s.hidden = s.dataset.scheda !== vista.scheda; });
}

async function aggiorna() {
  vista = leggiVista(location.hash);
  aggiornaComandi();
  const stato = $('[data-stato]');
  stato.className = 'stato';
  stato.textContent = 'Carico…';
  stato.hidden = false;
  try {
    const d = await carica();
    $('[data-aggiornato]').textContent = `aggiornato alle ${new Date(d.generato).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    $(`[data-scheda="${vista.scheda}"]`).innerHTML = DISEGNI[vista.scheda](d);
    stato.hidden = true;
  } catch (e) {
    stato.className = 'stato errore';
    stato.textContent = e.message;
  }
}

const vai = (cambi) => { location.hash = scriviVista({ ...vista, ...cambi }); };

document.addEventListener('click', (e) => {
  const t = e.target;
  const periodo = t.closest('[data-periodo]');
  if (periodo) return vai({ periodo: periodo.dataset.periodo });
  if (t.closest('[data-togli-filtro]')) return vai({ canale: null, campagna: null });
  const imb = t.closest('[data-imbuto-canale]');
  if (imb) return vai({ canale: imb.dataset.imbutoCanale || null });
  const riga = t.closest('tr[data-canale], tr[data-campagna]');
  if (riga?.dataset.canale) return vai({ scheda: 'marketing', canale: riga.dataset.canale, campagna: null });
  if (riga?.dataset.campagna) return vai({ scheda: 'marketing', campagna: riga.dataset.campagna });
  const zona = t.closest('.g-zona');
  if (zona) leggi(zona);
  if (t.closest('[data-tema-tasto]')) cambiaTema();
});
document.addEventListener('pointerover', (e) => {
  const zona = e.target.closest?.('.g-zona');
  if (zona) leggi(zona);
});
$('[data-confronto]').addEventListener('change', (e) => vai({ confronto: e.target.checked }));
window.addEventListener('hashchange', aggiorna);

/** Il valore sotto il dito o il cursore, scritto sotto il grafico. */
function leggi(zona) {
  const lettura = zona.closest('figure')?.querySelector('.lettura');
  if (!lettura) return;
  const { etichetta, valore, confronto } = zona.dataset;
  lettura.textContent = `${etichetta}: ${valore}${confronto != null ? ` (prima: ${confronto})` : ''}`;
}

function cambiaTema() {
  const radice = document.documentElement;
  const nuovo = radice.dataset.tema === 'scuro' ? 'chiaro' : 'scuro';
  radice.dataset.tema = nuovo;
  try { localStorage.setItem('quotify:tema', nuovo); } catch { /* memoria non disponibile */ }
}

aggiorna();
