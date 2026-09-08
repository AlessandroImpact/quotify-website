// Regole di gate che leggono il SORGENTE, non `dist/`.
// `controllaSito` riceve distDir e legge solo lì: i parametri fiscali e il
// modulo di calcolo stanno nel repo, quindi vanno controllati qui.
// Vedi docs/calcolatore-forfettario-piano.md §10.

import { esito } from './lib.mjs';
import { generaBlocchi, PAGINE, generaSitemap, bloccoHeaders } from '../content/genera-calcolatore.mjs';

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

// Utility di colore legate al tema CHIARO. Il markup delle pagine di contenuto
// è scritto con queste, e style.css le rimappa una per una sul tema scuro.
// Usarne una non mappata produce una pagina rotta sul tema scuro, e non se ne
// accorge nessuno finché qualcuno non cambia tema.
const COLORI_MAPPATI = new Set([
  'bg-white', 'bg-slate-50', 'bg-slate-200', 'bg-slate-300', 'bg-slate-500',
  'text-slate-400', 'text-slate-500', 'text-slate-600', 'text-slate-700',
  'text-slate-800', 'text-slate-900',
  'hover:text-slate-700', 'hover:text-slate-900',
  'border-slate-100', 'border-slate-200', 'border-slate-300',
  'hover:border-slate-400', 'divide-slate-200', 'ring-slate-300',
  'placeholder-slate-400',
  'bg-amber-50', 'border-amber-200', 'text-amber-900', 'text-amber-950',
  'bg-red-50', 'border-red-200', 'text-red-900', 'text-red-700',
  'bg-primary-50', 'border-primary-200', 'border-white',
  'text-primary-600', 'text-primary-700', 'text-primary-800',
]);

// Solo l'estremo CHIARO della scala rompe sul tema scuro. `bg-slate-900` o
// `text-slate-300` stanno su pannelli già scuri di proposito, e una
// trasparenza come `bg-white/10` è un velo voluto: segnalarle sarebbe un falso
// positivo, e i falsi positivi fanno spegnere i gate.
const SCALA = /^(?:hover:|focus:|group-hover:|sm:|md:|lg:)?(bg|text|border|divide|ring|placeholder)-(?:white|(?:slate|gray|zinc|neutral|stone)-(\d{2,3}))$/;

function rompeSuScuro(classe) {
  if (classe.includes('/')) return false;           // velo con trasparenza
  const m = SCALA.exec(classe);
  if (!m) return false;
  const [, proprieta, tono] = m;
  if (tono === undefined) return proprieta !== 'text';   // *-white: solo se non è testo
  const n = Number(tono);
  return proprieta === 'text' ? n >= 500 : n <= 300;
}

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
  sorgentiPagine = [], ausiliari = [], dati = { parametri }, oggi = new Date(),
}) {
  const f = [];

  // ── sitemap e header di cache seguono il registro ─────────────────────────
  // Dimenticarsi di rigenerarli non rompe niente in modo visibile: la pagina
  // semplicemente non entra in sitemap e nessuno se ne accorge per settimane.
  for (const { file, contenuto } of ausiliari) {
    const atteso = file.endsWith('sitemap.xml')
      ? generaSitemap(dati)
      : contenuto.replace(
          /(<!-- generato:cache:inizio -->)[\s\S]*?(# <!-- generato:cache:fine -->)/,
          `$1\n${bloccoHeaders(dati)}\n$2`,
        );
    if (atteso !== contenuto) {
      f.push(
        esito(E, 'ausiliario-non-sincronizzato', file, null,
          `${file} non è allineato a data/pagine.json`,
          'Eseguire "npm run gen": una pagina nuova resterebbe fuori dalla sitemap senza che nessuno se ne accorga.'),
      );
    }
  }

  // ── l'HTML generato dice quello che dice il JSON ──────────────────────────
  // I blocchi generati sono committati per far funzionare `npm run dev`: il
  // prezzo è che possono restare indietro. Qui si rigenerano in memoria e si
  // confrontano, così la divergenza è impossibile invece che improbabile.
  for (const { file, sorgente } of sorgentiPagine) {
    const blocchi = PAGINE.find((p) => p.file === file)?.blocchi;
    if (!blocchi) continue;

    let atteso;
    try {
      atteso = generaBlocchi(sorgente, dati, blocchi);
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

  // ── le date vogliono la stessa verifica dei numeri ────────────────────────
  // Un coefficiente sbagliato dà una stima sbagliata; una data sbagliata fa
  // perdere una scadenza. Se il file esiste, chi l'ha controllato deve firmarlo.
  if (dati.scadenze && (!dati.scadenze.verificatoIl || !dati.scadenze.verificatoDa)) {
    f.push(
      esito(E, 'scadenze-non-verificate', 'data/scadenze-2026.json', null,
        'le scadenze non sono state verificate da una persona',
        'Compilare "verificatoIl" e "verificatoDa" dopo aver confrontato ogni data con la sua fonte.'),
    );
  }

  // ── provenienza di ogni valore ────────────────────────────────────────────
  controllaFonti(parametri, '', false, fileParametri, f);

  // ── nessun colore chiaro non mappato ──────────────────────────────────────
  for (const { file, sorgente } of sorgentiPagine) {
    if (!/data-tema-tasto|testata-pagina/.test(sorgente)) continue;
    const corpo = sorgente.slice(sorgente.indexOf('<body'));
    const nonMappate = new Set();
    for (const m of corpo.matchAll(/class="([^"]*)"/g)) {
      for (const u of m[1].split(/\s+/)) {
        if (rompeSuScuro(u) && !COLORI_MAPPATI.has(u)) nonMappate.add(u);
      }
    }
    if (nonMappate.size) {
      f.push(
        esito(E, 'colore-non-mappato', file, null,
          `classi di colore chiaro senza corrispettivo scuro: ${[...nonMappate].join(', ')}`,
          'Aggiungere la rimappatura in style.css e la classe in COLORI_MAPPATI, oppure usare una classe già mappata.'),
      );
    }
  }

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
