#!/usr/bin/env node
// Scrive dentro calcolo-tasse-forfettario.html i due blocchi che devono esistere
// in HTML statico: l'esempio svolto e la tabella dei coefficienti.
// docs/calcolatore-forfettario-piano.md §4.
//
// Il risultato SI COMMITTA: così `npm run dev` mostra la pagina vera e non un
// buco, e il gate può accorgersi se il JSON cambia e l'HTML resta indietro.
//
// Uso: node scripts/content/genera-calcolatore.mjs [--verifica]

import { readFileSync, writeFileSync } from 'node:fs';
import { calcola, coefficientePerGruppo } from '../../lib/forfettario.mjs';
import { eur, pct } from '../../lib/formato.mjs';

export const PARAMETRI = 'data/parametri-fiscali-2026.json';
export const SCADENZE = 'data/scadenze-2026.json';
export const NAVIGAZIONE = 'data/navigazione.json';

// Il caso di apertura della pagina. Uno sviluppatore software sta in ATECO 62,
// gruppo 9, al 67% — non al 78%, che è il gruppo dei consulenti e degli
// ingegneri (§2.2, correzione del 2026-09-04).
export const ESEMPIO = {
  gruppo: 'altre',
  ricavi: 30000,
  cassa: 'gestioneSeparata',
  regime: 'ordinaria',
  mestiere: 'Uno sviluppatore software',
};

const CASSE = [
  ['gestioneSeparata', 'Gestione Separata INPS'],
  ['artigiani', 'Artigiani'],
  ['commercianti', 'Commercianti'],
];

const REGIMI = [
  ['ordinaria', 'Ordinario'],
  ['startup', 'Nuova attività, primi 5 anni'],
];

const campo = (nome, valore) =>
  `<span data-campo="${nome}" class="tabular-nums whitespace-nowrap">${valore}</span>`;

// I controlli sono generati dagli stessi parametri della tabella: un <select>
// scritto a mano si disallineerebbe dal JSON al primo cambio (§2.4).
function bloccoControlli({ parametri: p }) {
  const opzioni = (voci, sel) =>
    voci.map(([v, t]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${t}</option>`).join('');

  const gruppi = p.coefficienti.gruppi.map((g) => [g.id, `${g.descrizione} — ${pct(g.coefficiente)}`]);
  const stato = JSON.stringify({
    ricavi: ESEMPIO.ricavi, gruppo: ESEMPIO.gruppo, cassa: ESEMPIO.cassa,
    regime: ESEMPIO.regime, riduzione35: false,
  });

  const etichetta = 'block text-sm font-medium text-slate-700 mb-2';
  const controllo =
    'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600';

  return `
      <div data-calcolatore data-esempio='${stato}' class="space-y-5">

        <div>
          <label for="c-ricavi" class="${etichetta}">Quanto incassi in un anno</label>
          <div class="flex items-center gap-3">
            <input type="range" id="c-ricavi" data-controllo="ricavi" min="0" max="100000" step="500"
              value="${ESEMPIO.ricavi}" class="flex-1 accent-primary-600" />
            <div class="relative">
              <input type="number" id="c-ricavi-numero" data-controllo="ricavi" min="0" step="500"
                value="${ESEMPIO.ricavi}" aria-label="Fatturato annuo in euro"
                class="w-32 px-3 py-2 rounded-xl border border-slate-300 text-right tabular-nums
                       focus:outline-none focus:ring-2 focus:ring-primary-600" />
            </div>
          </div>
          <p class="mt-1 text-xs text-slate-500">
            La soglia del regime è a 85.000&nbsp;€: oltre, il calcolo cambia di natura.
          </p>
        </div>

        <div class="grid sm:grid-cols-2 gap-5">
          <div>
            <label for="c-gruppo" class="${etichetta}">Che attività fai</label>
            <select id="c-gruppo" data-controllo="gruppo" class="${controllo}">${opzioni(gruppi, ESEMPIO.gruppo)}</select>
          </div>
          <div>
            <label for="c-cassa" class="${etichetta}">Dove versi i contributi</label>
            <select id="c-cassa" data-controllo="cassa" class="${controllo}">${opzioni(CASSE, ESEMPIO.cassa)}</select>
          </div>
          <div>
            <label for="c-regime" class="${etichetta}">Da quanto hai la partita IVA</label>
            <select id="c-regime" data-controllo="regime" class="${controllo}">${opzioni(REGIMI, ESEMPIO.regime)}</select>
          </div>
          <div class="flex items-end" data-riduzione hidden>
            <label class="flex items-center gap-3 text-sm text-slate-700 pb-3">
              <input type="checkbox" data-controllo="riduzione35" class="w-5 h-5 rounded accent-primary-600" />
              Riduzione contributiva del 35%
            </label>
          </div>
        </div>
      </div>`;
}

function bloccoBarra(r, ricavi) {
  const quota = (v) => (ricavi > 0 ? Math.max(0, (v / ricavi) * 100) : 0);
  const seg = (nome, valore, classe, testo) => `
          <div data-segmento="${nome}" class="${classe} h-full flex items-center justify-center
            text-xs font-semibold transition-[width] duration-500 ease-out overflow-hidden"
            style="width: ${quota(valore).toFixed(2)}%"><span class="px-1 truncate">${testo}</span></div>`;

  return `
      <div class="mt-6">
        <div class="flex h-12 rounded-xl overflow-hidden bg-slate-200" role="img"
          aria-label="Ripartizione del fatturato fra netto, contributi e imposta">${seg(
            'netto', r.netto, 'bg-primary-600 text-white', 'netto',
          )}${seg('contributi', r.contributi, 'bg-amber-400 text-amber-950', 'INPS')}${seg(
            'imposta', r.impostaSostitutiva, 'bg-slate-500 text-white', 'imposta',
          )}
        </div>
      </div>`;
}

function bloccoEsempio({ parametri: p }) {
  const coefficiente = coefficientePerGruppo(ESEMPIO.gruppo, p);
  const r = calcola({ ...ESEMPIO, coefficiente }, p);

  const riga = (etichetta, nome, valore, nota, forte = false, segno = '') => `
        <tr class="${forte ? 'font-semibold text-slate-900' : 'text-slate-700'}">
          <th scope="row" class="py-3 pr-4 text-left font-normal">${etichetta}
            <span class="block text-sm text-slate-500" data-nota="${nome}">${nota}</span></th>
          <td class="py-3 text-right">${segno}${campo(nome, valore)}</td>
        </tr>`;

  return `${bloccoControlli({ parametri: p })}${bloccoBarra(r, ESEMPIO.ricavi)}
      <table class="w-full border-collapse mt-6">
        <caption class="sr-only">Calcolo delle tasse in regime forfettario</caption>
        <tbody class="divide-y divide-slate-200" data-risultato aria-live="polite">${riga(
          'Fatturato incassato nell’anno',
          'ricavi',
          eur(ESEMPIO.ricavi),
          'quello che i clienti ti hanno effettivamente pagato',
          true,
        )}${riga(
          'Reddito imponibile lordo',
          'redditoLordo',
          eur(r.redditoLordo),
          `fatturato × ${pct(coefficiente)} di coefficiente di redditività`,
        )}${riga(
          'Contributi INPS',
          'contributi',
          eur(r.contributi),
          `Gestione Separata, ${pct(p.inps.gestioneSeparata.aliquota)} sul reddito lordo`,
          false,
          '− ',
        )}${riga(
          'Base imponibile',
          'redditoImponibile',
          eur(r.redditoImponibile),
          'i contributi versati si deducono dal reddito',
        )}${riga(
          'Imposta sostitutiva',
          'impostaSostitutiva',
          eur(r.impostaSostitutiva),
          `${pct(p.impostaSostitutiva.ordinaria.valore)} sulla base imponibile`,
          false,
          '− ',
        )}${riga(
          'Restano',
          'netto',
          eur(r.netto),
          `${((r.netto / ESEMPIO.ricavi) * 100).toFixed(1).replace('.', ',')}% del tuo fatturato`,
          true,
        )}
        </tbody>
      </table>
      <p data-avviso-regime hidden class="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"></p>`;
}

function bloccoAteco({ parametri: p }) {
  const righe = p.coefficienti.gruppi
    .map(
      (g) => `
          <tr class="align-top">
            <td class="py-3 pr-4 text-slate-800">${g.descrizione}</td>
            <td class="py-3 pr-4 text-slate-500 text-sm font-mono">${g.ateco}</td>
            <td class="py-3 text-right font-semibold text-slate-900 tabular-nums">${pct(g.coefficiente)}</td>
          </tr>`,
    )
    .join('');

  return `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b-2 border-slate-300 text-sm uppercase tracking-wide text-slate-500">
              <th scope="col" class="py-2 pr-4 font-medium">Gruppo di attività</th>
              <th scope="col" class="py-2 pr-4 font-medium">Codici ATECO 2007</th>
              <th scope="col" class="py-2 text-right font-medium">Coefficiente</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">${righe}
          </tbody>
        </table>
      </div>
      <p class="mt-4 text-sm text-slate-500">
        Fonte: <a href="${p.coefficienti.url}" class="underline hover:text-slate-700"
        rel="noopener">${p.coefficienti.fonte}</a>.
      </p>`;
}

function bloccoAccantonamento({ parametri: p }) {
  const coefficiente = coefficientePerGruppo(ESEMPIO.gruppo, p);
  const r = calcola({ ...ESEMPIO, coefficiente }, p);
  const percento = (r.quotaAccantonamento * 100).toFixed(1).replace('.', ',');

  return `${bloccoControlli({ parametri: p })}
      <div class="mt-8 text-center">
        <p class="text-sm uppercase tracking-wide text-slate-500 mb-2">
          Di ogni fattura che ti pagano, metti da parte
        </p>
        <p class="text-6xl sm:text-7xl font-bold text-primary-700 tabular-nums">
          <span data-campo="quotaAccantonamento" data-formato="percentuale">${percento}%</span>
        </p>
        <p class="mt-3 text-slate-600">
          Sono <span data-campo="accantonamentoMensile" class="font-semibold tabular-nums">${eur(r.accantonamentoMensile)}</span>
          al mese, se l\u2019anno andasse come questa stima.
        </p>
      </div>

      <table class="w-full border-collapse mt-8">
        <caption class="sr-only">Da cosa è composta la quota da accantonare</caption>
        <tbody class="divide-y divide-slate-200" data-risultato aria-live="polite">
          <tr class="text-slate-700">
            <th scope="row" class="py-3 pr-4 text-left font-normal">Contributi INPS
              <span class="block text-sm text-slate-500" data-nota="contributi"></span></th>
            <td class="py-3 text-right"><span data-campo="contributi" class="tabular-nums whitespace-nowrap">${eur(r.contributi)}</span></td>
          </tr>
          <tr class="text-slate-700">
            <th scope="row" class="py-3 pr-4 text-left font-normal">Imposta sostitutiva
              <span class="block text-sm text-slate-500" data-nota="impostaSostitutiva"></span></th>
            <td class="py-3 text-right"><span data-campo="impostaSostitutiva" class="tabular-nums whitespace-nowrap">${eur(r.impostaSostitutiva)}</span></td>
          </tr>
          <tr class="font-semibold text-slate-900">
            <th scope="row" class="py-3 pr-4 text-left font-normal">Totale da mettere via in un anno</th>
            <td class="py-3 text-right tabular-nums whitespace-nowrap">${eur(r.contributi + r.impostaSostitutiva)}</td>
          </tr>
        </tbody>
      </table>
      <p data-avviso-regime hidden class="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"></p>`;
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const inItaliano = (iso) => {
  const [a, m, g] = iso.split('-').map(Number);
  return `${g} ${MESI[m - 1]} ${a}`;
};

// La linea del tempo dell'anno. NON contiene lo stato temporale — "mancano 70
// giorni" scritto qui sarebbe falso domani. Lo stato lo mette il browser
// (lib/scadenze.mjs); qui c'è il contenuto, che è ciò che si indicizza.
function bloccoScadenze({ scadenze: s }) {
  const codice = (c) => {
    const d = s.codici[c];
    return `<span class="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-2 py-1 text-xs font-mono">
              <span class="font-semibold">${c}</span>
              <span class="text-slate-500 font-sans">${d ? d.sezione : ''}</span>
            </span>`;
  };

  const voce = (v, i) => `
        <li class="scadenza relative pl-10 sm:pl-12 pb-10 last:pb-0" data-scadenza="${v.id}" data-data="${v.data}" data-chi="${v.chi}" style="--ritardo: ${i * 70}ms">
          <span class="pallino absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-slate-300 ring-1 ring-slate-300" aria-hidden="true"></span>
          <p class="text-sm font-semibold uppercase tracking-wide text-slate-500">
            <time datetime="${v.data}">${inItaliano(v.data)}</time>
            <span class="conto ml-2 normal-case tracking-normal font-medium text-primary-700" hidden></span>
          </p>
          <h3 class="text-lg font-bold text-slate-900 mt-1">${v.titolo}</h3>
          <p class="text-slate-700 mt-1">${v.cosa}</p>
          ${v.slittata ? `<p class="text-sm text-slate-500 mt-1">⤷ ${v.slittata}.</p>` : ''}
          <div class="flex flex-wrap items-center gap-2 mt-3">
            <span class="inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium ${
              v.chi === 'tutti' ? 'bg-primary-50 text-primary-800' : 'bg-amber-50 text-amber-900'
            }">${v.chi === 'tutti' ? 'riguarda tutti i forfettari' : 'solo artigiani e commercianti'}</span>
            ${v.codici.map(codice).join('')}
          </div>
        </li>`;

  // Il filtro funziona in CSS puro, con i radio e `:has()`: chi ha il
  // JavaScript disattivato lo usa lo stesso. Lo stato predefinito mostra TUTTO
  // — nascondere righe al primo caricamento significherebbe presentare a Google
  // una pagina più povera di quella che è.
  const scelta = (valore, etichetta, nota) => `
          <label class="flex-1 min-w-[13rem] cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3
                 transition-colors hover:border-primary-400 has-[:checked]:border-primary-600
                 has-[:checked]:bg-primary-50 has-[:checked]:ring-1 has-[:checked]:ring-primary-600">
            <input type="radio" name="chi" value="${valore}" class="sr-only" ${valore === 'tutte' ? 'checked' : ''} />
            <span class="block font-semibold text-slate-900">${etichetta}</span>
            <span class="block text-sm text-slate-500">${nota}</span>
          </label>`;

  return `
      <div class="filtro-scadenze mb-8">
        <p class="text-sm font-medium text-slate-700 mb-3" id="filtro-etichetta">Dove versi i contributi?</p>
        <div class="flex flex-wrap gap-3" role="radiogroup" aria-labelledby="filtro-etichetta">${
          scelta('tutte', 'Mostrale tutte', 'il calendario completo')
        }${
          scelta('gestione-separata', 'Gestione Separata', 'liberi professionisti')
        }${
          scelta('artigiani', 'Artigiani e commercianti', 'con i contributi fissi')
        }
        </div>
        <p class="mt-3 text-sm text-slate-500" data-conteggio-filtro hidden></p>
      </div>

      <ol class="linea relative border-l-2 border-slate-200 ml-2.5">${s.scadenze.map(voce).join('')}
      </ol>`;
}

// I codici tributo per esteso: è il contenuto che intercetta "codice tributo
// 1791 cosa significa", una ricerca che qualcuno fa davvero col F24 aperto.
function bloccoCodici({ scadenze: s }) {
  const righe = Object.entries(s.codici).map(([c, d]) => `
            <tr class="align-top">
              <td class="py-3 pr-4 font-mono font-semibold text-slate-900">${c}</td>
              <td class="py-3 pr-4 text-slate-500 text-sm whitespace-nowrap">${d.sezione}</td>
              <td class="py-3 text-slate-700">${d.significato}</td>
            </tr>`).join('');

  return `
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b-2 border-slate-300 text-sm uppercase tracking-wide text-slate-500">
              <th scope="col" class="py-2 pr-4 font-medium">Codice</th>
              <th scope="col" class="py-2 pr-4 font-medium">Sezione F24</th>
              <th scope="col" class="py-2 font-medium">Cosa versa</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">${righe}
          </tbody>
        </table>
      </div>`;
}


// ─── Telaio: intestazione, menu e piè di pagina ──────────────────────────────
// Erano duplicati a mano in otto file, ed erano già divergenti — le pagine di
// contenuto avevano una testata vecchia mentre la home aveva quella nuova.
// Adesso c'è una fonte sola e il gate blocca il build se una pagina resta
// indietro. Aggiungere una voce di menu è una riga in data/navigazione.json.

const esterno = (v) => (v.esterno ? ' target="_blank" rel="noopener noreferrer"' : '');

// I contenuti dell'hub si ricavano dalle PAGINE STESSE, non da un elenco a
// parte: un secondo elenco divergerebbe dal primo alla seconda modifica di un
// titolo. Qui si legge solo il <head>, quindi non c'è ciclo con i blocchi
// generati dentro il <body>.
const fraTag = (html, re) => (html.match(re)?.[1] ?? '').trim();

export function leggiContenuto(file, html) {
  const meta = (nome) =>
    fraTag(html, new RegExp(`<meta name="quotify:${nome}" content="([^"]*)"`));
  if (!meta('categoria')) return null;

  return {
    file,
    url: `/${file.replace(/\.html$/, '')}`,
    titolo: fraTag(html, /<h1[^>]*>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, '').trim(),
    descrizione: fraTag(html, /<meta name="description" content="([^"]*)"/),
    categoria: meta('categoria'),
    tipo: meta('tipo') || 'guida',
    pubblicato: meta('pubblicato'),
    query: meta('query-obiettivo'),
    cifra: meta('cifra'),
    cifraNota: meta('cifra-nota'),
  };
}

// Due temi. Il sipario e il piede restano scuri su entrambi — il sipario è una
// sovrapposizione a tutto schermo e il piede porta il proprio fondo — mentre la
// barra in alto cambia: sul chiaro il velo scuro di `.testata::before` sarebbe
// una macchia, e 1.100 parole di fisco si leggono meglio su bianco.
function bloccoTestata({ navigazione: n }, tema) {
  const chiara = tema === 'chiaro';
  const marchio = chiara ? 'text-ink-900' : 'testata-marchio';

  // Tre varianti, e la differenza non è estetica. Sulla home la testata è
  // FISSA perché il contenuto le scorre sotto per disegno. Su una pagina che è
  // un elenco o un testo lungo dev'essere appiccicata: se resta fissa, si
  // sovrappone ai titoli di sezione mentre si scorre.
  const posizione = tema === 'scuro-fisso' ? 'fixed'
    : chiara ? 'testata-chiara sticky' : 'testata-scura sticky';

  return `
      <header class="testata ${posizione} top-0 inset-x-0 z-[100] h-16" role="banner">
        <nav class="relative max-w-[1320px] mx-auto h-full px-[clamp(1.25rem,5vw,3rem)] flex items-center justify-between" aria-label="Navigazione principale">
          <a href="/" class="flex items-center gap-2.5 shrink-0" aria-label="Quotify — torna alla home">
            <img src="/pwa-192x192.png" alt="" aria-hidden="true" width="28" height="28" class="w-7 h-7 rounded-lg" />
            <span class="${marchio} text-[1.0625rem] font-bold tracking-[-0.02em]">Quotify</span>
          </a>

          <div class="flex items-center gap-3 sm:gap-4">
            <a href="https://app.quotify.it/register" target="_blank" rel="noopener noreferrer" class="testata-cta bg-primary-600 hover:bg-primary-700 text-white text-[0.8125rem] font-semibold px-4 py-2 rounded-[10px] shadow-[0_8px_24px_-8px_rgba(35,108,239,0.9)] transition-[background-color,opacity] duration-300">Prova gratis</a>
            <button type="button" id="sipario-innesco" class="innesco ${chiara ? 'text-ink-900' : 'text-foam'}" aria-expanded="false" aria-controls="sipario" aria-label="Apri il menu">
              <span class="innesco-anello" aria-hidden="true"></span>
              <span class="innesco-tratti" aria-hidden="true"><i></i><i></i></span>
            </button>
          </div>
        </nav>
      </header>`;
}

function bloccoSipario({ navigazione: n }) {
  const voce = (v, i) => `
              <li style="--ritardo: ${(0.16 + i * 0.06).toFixed(2)}s">
                <a href="${v.href}" class="sipario-link group flex items-baseline gap-[clamp(0.75rem,3vw,2rem)]" data-sipario-link>
                  <span class="sipario-num font-mono text-[0.75rem] text-primary-300/45 shrink-0">${String(i + 1).padStart(2, '0')}</span>
                  <span class="flex-1 min-w-0">
                    <span class="sipario-voce"><em class="font-extrabold" style="font-size:clamp(2rem,8vw,4.5rem);letter-spacing:-0.04em;line-height:1.05">${v.etichetta}</em></span>
                    <span class="sipario-filo"></span>
                  </span>
                </a>
              </li>`;

  const altro = n.altro.map((v) => `
                  <li><a href="${v.href}"${esterno(v)} class="text-sm text-foam/60 hover:text-foam transition-colors">${v.etichetta}</a></li>`).join('');

  return `
      <div id="sipario" class="sipario" role="dialog" aria-modal="true" aria-label="Menu di navigazione" hidden>
        <div class="sipario-fondo" aria-hidden="true"></div>

        <div class="relative h-full max-w-[1320px] mx-auto px-[clamp(1.25rem,5vw,3rem)] flex flex-col justify-center py-24 overflow-y-auto">
          <nav aria-label="Sezioni del sito">
            <ul role="list" class="space-y-[clamp(0.5rem,2vh,1.25rem)]">${n.principale.map(voce).join('')}
            </ul>
          </nav>

          <div class="sipario-piede mt-[clamp(2.5rem,7vh,4.5rem)]">
            <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
              <div>
                <div class="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foam/35 mb-4">Altro</div>
                <ul role="list" class="flex flex-wrap gap-x-6 gap-y-2.5">${altro}
                </ul>
              </div>
              <a href="https://app.quotify.it/register" target="_blank" rel="noopener noreferrer" class="shrink-0 inline-flex items-center gap-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-[0.9375rem] px-6 py-3.5 rounded-[14px] shadow-[0_16px_36px_-16px_rgba(35,108,239,0.95)] transition-colors">
                Inizia gratis
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>`;
}

function bloccoPiede({ navigazione: n }) {
  const colonna = (titolo, voci) => `
            <div>
              <h3 class="text-xs font-bold tracking-[0.12em] uppercase text-foam/35 mb-4">${titolo}</h3>
              <ul class="space-y-3" role="list">${voci.map((v) => `
                <li><a href="${v.href}"${esterno(v)} class="text-sm text-foam/60 hover:text-foam transition-colors">${v.etichetta}</a></li>`).join('')}
              </ul>
            </div>`;

  return `
      <footer class="velo velo-footer bg-ink-900 text-foam px-[clamp(1.25rem,5vw,3rem)] pt-[clamp(3rem,8vh,5rem)] pb-10" role="contentinfo">
        <div class="max-w-[1320px] mx-auto">
          <div class="grid gap-[clamp(2rem,5vw,3rem)]" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))">
            <div>
              <a href="/" class="flex items-center gap-2.5 mb-4" aria-label="Quotify — torna alla home">
                <img src="/pwa-192x192.png" alt="" aria-hidden="true" width="28" height="28" class="w-7 h-7 rounded-lg" />
                <span class="text-[1.0625rem] font-bold">Quotify</span>
              </a>
              <p class="text-sm text-foam/50 leading-relaxed mb-4" style="max-width:32ch">La piattaforma per freelance italiani in Regime Forfettario.</p>
              <p class="text-xs text-foam/30 tnum">P.IVA 10838411212 — Milano, Italia</p>
            </div>
${colonna('Prodotto', n.piede.prodotto)}
${colonna('Legale e contatti', n.piede.legale)}
          </div>

          <div class="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style="border-top:1px solid rgba(255,255,255,0.06)">
            <p class="text-xs text-foam/30">© 2026 Quotify. Tutti i diritti riservati.</p>
            <p class="text-xs text-foam/30">Fatto con cura per i freelance italiani</p>
          </div>
        </div>
      </footer>`;
}

const TELAIO_HOME = { testata: (d) => bloccoTestata(d, 'scuro-fisso'), sipario: bloccoSipario, piede: bloccoPiede };
const TELAIO_SCURO = { testata: (d) => bloccoTestata(d, 'scuro'), sipario: bloccoSipario, piede: bloccoPiede };
const TELAIO_CHIARO = { testata: (d) => bloccoTestata(d, 'chiaro'), sipario: bloccoSipario, piede: bloccoPiede };

// L'hub delle guide. Un registro, non una griglia di schede: il mondo del
// forfettario è fatto di codici, aliquote e date, e ogni voce si presenta con
// LA cifra di cui parla davvero — 2007 è l'anno della tabella ancora in vigore,
// ed è tutto l'articolo su ATECO in un numero.
function bloccoGuide({ navigazione: n, contenuti }) {
  const voce = (c, i) => `
            <li class="voce" style="--ritardo: ${i * 60}ms">
              <a href="${c.url}" class="voce-a group">
                <span class="voce-cifra" aria-hidden="true">${c.cifra || '·'}</span>
                <span class="voce-corpo">
                  <span class="voce-titolo">${c.titolo}</span>
                  <span class="voce-desc">${c.descrizione}</span>
                  <span class="voce-meta">
                    <span class="voce-tipo">${c.tipo}</span>
                    ${c.cifraNota ? `<span class="voce-nota">${c.cifra} ${c.cifraNota}</span>` : ''}
                  </span>
                </span>
                <span class="voce-freccia" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </a>
            </li>`;

  const sezione = (cat) => {
    const dentro = contenuti.filter((c) => c.categoria === cat.id);
    const conteggio = dentro.length
      ? `${dentro.length} ${dentro.length === 1 ? 'contenuto' : 'contenuti'}`
      : 'in arrivo';

    // Una categoria vuota si mostra lo stesso, dichiarando che è vuota. Dice a
    // chi torna cosa aspettarsi, e a Google di cosa si occupa questo sito.
    const corpo = dentro.length
      ? `<ol class="registro" role="list">${dentro.map(voce).join('')}
          </ol>`
      : `<p class="vuoto">Le stiamo scrivendo: come si crea un preventivo, come si emette una
             fattura elettronica, come si tiene un progetto. Se ne cerchi una in particolare,
             <a href="/assistenza">scrivicelo</a>.</p>`;

    return `
        <section class="gruppo" aria-labelledby="cat-${cat.id}">
          <div class="gruppo-testa">
            <h2 id="cat-${cat.id}" class="gruppo-titolo">${cat.etichetta}</h2>
            <span class="gruppo-conta">${conteggio}</span>
          </div>
          <p class="gruppo-sommario">${cat.sommario} <em>${cat.per}</em></p>
          ${corpo}
        </section>`;
  };

  return n.categorie.map(sezione).join('');
}

function sostituisci(html, nome, contenuto) {
  const inizio = `<!-- generato:${nome}:inizio -->`;
  const fine = `<!-- generato:${nome}:fine -->`;
  const i = html.indexOf(inizio);
  const j = html.indexOf(fine);

  if (i === -1 || j === -1 || j < i) {
    throw new Error(`marcatori "generato:${nome}" assenti o invertiti`);
  }
  return html.slice(0, i + inizio.length) + contenuto + '\n      ' + html.slice(j);
}

// Registro delle pagine generate. Ogni pagina dichiara quali blocchi vuole:
// aggiungerne una è una riga qui, non un secondo script che diverge dal primo.
// Gruppi di blocchi con un nome, invece che posizioni in un elenco: il valore
// predefinito `PAGINE[0].blocchi` si è rotto alla prima pagina aggiunta in
// testa. Un contratto che dipende dall'ordine di un array non è un contratto.
export const BLOCCHI = {
  guide: { guide: bloccoGuide },
  telaioHome: TELAIO_HOME,
  telaioScuro: TELAIO_SCURO,
  telaioChiaro: TELAIO_CHIARO,
  calcolatore: { esempio: bloccoEsempio, ateco: bloccoAteco },
  accantonamento: { accantonamento: bloccoAccantonamento },
  scadenze: { scadenze: bloccoScadenze, codici: bloccoCodici },
};

export const PAGINE = [
  { file: 'index.html', blocchi: BLOCCHI.telaioHome },
  { file: 'guide.html', blocchi: { ...BLOCCHI.telaioScuro, ...BLOCCHI.guide } },
  { file: 'calcolo-tasse-forfettario.html', blocchi: { ...BLOCCHI.telaioChiaro, ...BLOCCHI.calcolatore } },
  { file: 'quanto-accantonare-tasse-partita-iva.html', blocchi: { ...BLOCCHI.telaioChiaro, ...BLOCCHI.accantonamento } },
  { file: 'scadenze-fiscali-forfettario.html', blocchi: { ...BLOCCHI.telaioChiaro, ...BLOCCHI.scadenze } },
  { file: 'ateco-2025-forfettario.html', blocchi: BLOCCHI.telaioChiaro },
  { file: 'assistenza.html', blocchi: BLOCCHI.telaioChiaro },
  { file: 'privacy.html', blocchi: BLOCCHI.telaioChiaro },
  { file: 'termini.html', blocchi: BLOCCHI.telaioChiaro },
  { file: 'cookie.html', blocchi: BLOCCHI.telaioChiaro },
];

// `dati` raccoglie tutte le fonti: i parametri fiscali e le scadenze stanno in
// file diversi perché cambiano per motivi diversi, ma un blocco può averne
// bisogno di entrambi.
export function generaBlocchi(html, dati, blocchi) {
  let out = html;
  for (const [nome, costruisci] of Object.entries(blocchi)) {
    out = sostituisci(out, nome, costruisci(dati));
  }
  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const dati = {
    parametri: JSON.parse(readFileSync(PARAMETRI, 'utf8')),
    scadenze: JSON.parse(readFileSync(SCADENZE, 'utf8')),
    navigazione: JSON.parse(readFileSync(NAVIGAZIONE, 'utf8')),
    contenuti: PAGINE.map((p) => leggiContenuto(p.file, readFileSync(p.file, 'utf8'))).filter(Boolean),
  };
  const verifica = process.argv.includes('--verifica');
  let disallineate = 0;

  for (const { file, blocchi } of PAGINE) {
    const prima = readFileSync(file, 'utf8');
    const dopo = generaBlocchi(prima, dati, blocchi);

    if (verifica) {
      if (prima !== dopo) { console.error(`\u2716 ${file} non è allineato a ${PARAMETRI}`); disallineate += 1; }
      else console.log(`\u2714 ${file} è allineato`);
    } else {
      if (prima !== dopo) writeFileSync(file, dopo);
      console.log(prima === dopo ? `= ${file} già aggiornato` : `\u2714 ${file} rigenerato`);
    }
  }

  if (disallineate) { console.error('   Eseguire: npm run gen'); process.exit(1); }
}
