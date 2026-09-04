// Regole di gate che leggono il SORGENTE, non `dist/`.
// `controllaSito` riceve distDir e legge solo lì: i parametri fiscali e il
// modulo di calcolo stanno nel repo, quindi vanno controllati qui.
// Vedi docs/calcolatore-forfettario-piano.md §10.

import { esito } from './lib.mjs';
import { generaBlocchi, PAGINE } from '../content/genera-calcolatore.mjs';

const E = 'error';
const W = 'warn';

// Numeri che in un modulo di calcolo non sono valori fiscali ma aritmetica.
// La lista è chiusa e va tenuta tale: se diventa il posto dove si mette
// qualsiasi numero scomodo, la regola smette di servire.
//   0, 1   — confronti e complementi
//   100    — conversione in percentuale
//   10000  — scala dell'arrotondamento a quattro decimali
//   12     — mesi in un anno
const INNOCUI = new Set([0, 1, 100, 10000, 12]);

// Numeri nel JSON che sono metadati, non valori fiscali: non hanno una fonte
// perché non affermano niente sul fisco.
const METADATI = new Set(['annoImposta', 'progressivo']);

function senzaCommenti(sorgente) {
  return sorgente.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

// Cammina l'albero dei parametri. Ogni oggetto che contiene direttamente un
// numero deve dichiarare `fonte` e `url`, oppure ereditarli da un antenato:
// è per questo che la fonte sta DENTRO il contenitore e non accanto.
function controllaFonti(nodo, percorso, ereditata, file, f) {
  if (Array.isArray(nodo)) {
    nodo.forEach((v, i) => controllaFonti(v, `${percorso}[${i}]`, ereditata, file, f));
    return;
  }
  if (nodo === null || typeof nodo !== 'object') return;

  const propria = Boolean(nodo.fonte) && Boolean(nodo.url);
  const coperto = propria || ereditata;

  const haNumeri = Object.entries(nodo).some(
    ([k, v]) => !k.startsWith('_') && !METADATI.has(k) && typeof v === 'number',
  );

  if (haNumeri && !coperto) {
    f.push(
      esito(E, 'param-fiscale-senza-fonte', file, null,
        `${percorso || 'radice'} contiene valori fiscali senza "fonte" e "url"`,
        'Ogni numero deve avere una provenienza citabile: la pagina la mostra e serve a rifarne la verifica.'),
    );
  }

  for (const [k, v] of Object.entries(nodo)) {
    if (k.startsWith('_')) continue;
    controllaFonti(v, percorso ? `${percorso}.${k}` : k, coperto, file, f);
  }
}

export function controllaContenuti({
  parametri, fileParametri, sorgenteCalcolo, fileCalcolo,
  sorgentiPagine = [], oggi = new Date(),
}) {
  const f = [];

  // ── l'HTML generato dice quello che dice il JSON ──────────────────────────
  // I blocchi generati sono committati per far funzionare `npm run dev`: il
  // prezzo è che possono restare indietro. Qui si rigenerano in memoria e si
  // confrontano, così la divergenza è impossibile invece che improbabile.
  for (const { file, sorgente } of sorgentiPagine) {
    const blocchi = PAGINE.find((p) => p.file === file)?.blocchi;
    if (!blocchi) continue;

    let atteso;
    try {
      atteso = generaBlocchi(sorgente, parametri, blocchi);
    } catch (e) {
      f.push(
        esito(E, 'calcolatore-non-generabile', file, null,
          `impossibile rigenerare i blocchi: ${e.message}`,
          'I marcatori <!-- generato:…:inizio --> e :fine devono esistere entrambi e in ordine.'),
      );
      continue;
    }
    if (atteso !== sorgente) {
      f.push(
        esito(E, 'calcolatore-non-sincronizzato', file, null,
          `${file} non è allineato a ${fileParametri}`,
          'Eseguire "npm run gen": la pagina pubblicherebbe numeri diversi da quelli che il calcolo usa.'),
      );
    }
  }

  // ── verifica umana ────────────────────────────────────────────────────────
  if (!parametri.verificatoIl || !parametri.verificatoDa) {
    f.push(
      esito(E, 'param-fiscale-non-verificato', fileParametri, null,
        'i parametri fiscali non sono stati verificati da una persona',
        'Compilare "verificatoIl" e "verificatoDa" dopo aver confrontato ogni valore con la sua fonte.'),
    );
  }

  // ── provenienza di ogni valore ────────────────────────────────────────────
  controllaFonti(parametri, '', false, fileParametri, f);

  // ── freschezza ────────────────────────────────────────────────────────────
  // Un parametro non diventa sbagliato il 1° gennaio: un calcolo sul 2026 resta
  // corretto per il 2026. Diventa sbagliato quando si chiede del 2027 e la
  // pagina risponde col 2026. Da marzo le circolari INPS sono uscite, quindi il
  // file aggiornato è scrivibile e non avere aggiornato diventa un errore.
  const anno = oggi.getFullYear();
  const mese = oggi.getMonth();
  if (parametri.annoImposta < anno) {
    const grave = mese >= 2;
    f.push(
      esito(grave ? E : W, 'param-fiscale-scaduto', fileParametri, null,
        `parametri dell'anno d'imposta ${parametri.annoImposta}, siamo nel ${anno}`,
        'Scrivere data/parametri-fiscali-<anno>.json con i valori nuovi e le loro fonti.'),
    );
  } else if (parametri.annoImposta === anno && mese === 11) {
    f.push(
      esito(W, 'param-fiscale-scaduto', fileParametri, null,
        `l'anno d'imposta ${anno + 1} si avvicina e i parametri sono ancora del ${anno}`,
        'Le circolari INPS escono a febbraio: da marzo questo avviso diventa un errore.'),
    );
  }

  // ── nessun numero fiscale cablato nel codice ──────────────────────────────
  const numeri = [...senzaCommenti(sorgenteCalcolo).matchAll(/\b\d+(?:\.\d+)?\b/g)]
    .map((m) => m[0])
    .filter((n) => !INNOCUI.has(Number(n)));

  if (numeri.length) {
    f.push(
      esito(W, 'numeri-fiscali-nel-codice', fileCalcolo, null,
        `numeri nel modulo di calcolo che non sono aritmetica: ${[...new Set(numeri)].join(', ')}`,
        'I valori fiscali stanno nel JSON dei parametri, dove hanno una fonte e una data.'),
    );
  }

  return f;
}
