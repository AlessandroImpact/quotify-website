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

export const PAGINA = 'calcolo-tasse-forfettario.html';
export const PARAMETRI = 'data/parametri-fiscali-2026.json';

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
function bloccoControlli(p) {
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

function bloccoEsempio(p) {
  const coefficiente = coefficientePerGruppo(ESEMPIO.gruppo, p);
  const r = calcola({ ...ESEMPIO, coefficiente }, p);

  const riga = (etichetta, nome, valore, nota, forte = false, segno = '') => `
        <tr class="${forte ? 'font-semibold text-slate-900' : 'text-slate-700'}">
          <th scope="row" class="py-3 pr-4 text-left font-normal">${etichetta}
            <span class="block text-sm text-slate-500" data-nota="${nome}">${nota}</span></th>
          <td class="py-3 text-right">${segno}${campo(nome, valore)}</td>
        </tr>`;

  return `${bloccoControlli(p)}${bloccoBarra(r, ESEMPIO.ricavi)}
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

function bloccoAteco(p) {
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

function sostituisci(html, nome, contenuto) {
  const inizio = `<!-- generato:${nome}:inizio -->`;
  const fine = `<!-- generato:${nome}:fine -->`;
  const i = html.indexOf(inizio);
  const j = html.indexOf(fine);

  if (i === -1 || j === -1 || j < i) {
    throw new Error(`marcatori "generato:${nome}" assenti o invertiti in ${PAGINA}`);
  }
  return html.slice(0, i + inizio.length) + contenuto + '\n      ' + html.slice(j);
}

export function generaBlocchi(html, parametri) {
  let out = sostituisci(html, 'esempio', bloccoEsempio(parametri));
  out = sostituisci(out, 'ateco', bloccoAteco(parametri));
  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const parametri = JSON.parse(readFileSync(PARAMETRI, 'utf8'));
  const prima = readFileSync(PAGINA, 'utf8');
  const dopo = generaBlocchi(prima, parametri);

  if (process.argv.includes('--verifica')) {
    if (prima !== dopo) {
      console.error(`✖ ${PAGINA} non è allineato a ${PARAMETRI}. Eseguire: npm run gen`);
      process.exit(1);
    }
    console.log(`✔ ${PAGINA} è allineato a ${PARAMETRI}`);
  } else {
    writeFileSync(PAGINA, dopo);
    console.log(prima === dopo ? `= ${PAGINA} già aggiornato` : `✔ ${PAGINA} rigenerato`);
  }
}
