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

// useGrouping: 'always' e non il predefinito: in italiano il raggruppamento
// CLDR parte da cinque cifre, quindi 5240,07 finirebbe sotto 30.000,00 senza
// punto. In una colonna di importi allineati si legge male.
const eur = (n) =>
  `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, useGrouping: 'always' })}&nbsp;€`;
const pct = (n) => `${(n * 100).toLocaleString('it-IT')}%`;

function bloccoEsempio(p) {
  const coefficiente = coefficientePerGruppo(ESEMPIO.gruppo, p);
  const r = calcola({ ...ESEMPIO, coefficiente }, p);
  const quota = (v) => ((v / ESEMPIO.ricavi) * 100).toFixed(1).replace('.', ',');

  const riga = (etichetta, valore, nota, forte = false) => `
        <tr class="${forte ? 'font-semibold text-slate-900' : 'text-slate-700'}">
          <th scope="row" class="py-3 pr-4 text-left font-normal">${etichetta}
            <span class="block text-sm text-slate-500">${nota}</span></th>
          <td class="py-3 text-right tabular-nums whitespace-nowrap">${valore}</td>
        </tr>`;

  return `
      <table class="w-full border-collapse">
        <caption class="sr-only">Esempio di calcolo per ${ESEMPIO.mestiere.toLowerCase()}</caption>
        <tbody class="divide-y divide-slate-200">${riga(
          'Fatturato incassato nell’anno',
          eur(ESEMPIO.ricavi),
          'quello che i clienti ti hanno effettivamente pagato',
          true,
        )}${riga(
          'Reddito imponibile lordo',
          eur(r.redditoLordo),
          `fatturato × ${pct(coefficiente)} di coefficiente di redditività`,
        )}${riga(
          'Contributi INPS',
          `− ${eur(r.contributi)}`,
          `Gestione Separata, ${pct(p.inps.gestioneSeparata.aliquota)} sul reddito lordo`,
        )}${riga(
          'Base imponibile',
          eur(r.redditoImponibile),
          'i contributi versati si deducono dal reddito',
        )}${riga(
          'Imposta sostitutiva',
          `− ${eur(r.impostaSostitutiva)}`,
          `${pct(p.impostaSostitutiva.ordinaria.valore)} sulla base imponibile`,
        )}${riga(
          'Restano',
          eur(r.netto),
          `il ${quota(r.netto)}% di quello che hai fatturato`,
          true,
        )}
        </tbody>
      </table>`;
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
