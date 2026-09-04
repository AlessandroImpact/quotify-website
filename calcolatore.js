// Il calcolatore interattivo.
//
// Non costruisce niente: prende i nodi che il generatore ha già scritto in HTML
// e li rende vivi (docs/calcolatore-forfettario-piano.md §2.2). Per questo non
// c'è un pulsante "Calcola" e non c'è uno stato "vuoto" della pagina: chi arriva
// con JavaScript disattivato — e Googlebot al primo passaggio — vede lo stesso
// caso svolto che vedrebbe altrimenti.

import { calcola, coefficientePerGruppo } from './lib/forfettario.mjs';
import { eur, pct } from './lib/formato.mjs';
import parametri from './data/parametri-fiscali-2026.json';

const radice = document.querySelector('[data-calcolatore]');

if (radice) {
  const pagina = radice.closest('main') ?? document;
  const $ = (sel) => pagina.querySelector(sel);
  const campo = (nome) => pagina.querySelector(`[data-campo="${nome}"]`);
  const nota = (nome) => pagina.querySelector(`[data-nota="${nome}"]`);
  const segmento = (nome) => pagina.querySelector(`[data-segmento="${nome}"]`);

  const menoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CASSE = {
    gestioneSeparata: 'Gestione Separata',
    artigiani: 'Artigiani',
    commercianti: 'Commercianti',
  };

  const AVVISI = {
    'uscita-anno-successivo':
      'Sopra 85.000 € resti nel forfettario per quest’anno, ma ne esci a partire dal prossimo. ' +
      'La stima qui sopra vale per l’anno in corso.',
    'uscita-immediata':
      'Sopra 100.000 € il regime cessa nell’anno stesso: dal momento del superamento devi ' +
      'applicare l’IVA. Questa stima non è più valida.',
  };

  // ── stato ────────────────────────────────────────────────────────────────
  const iniziale = JSON.parse(radice.dataset.esempio);

  const CHIAVI = { fatturato: 'ricavi', attivita: 'gruppo', cassa: 'cassa', regime: 'regime' };

  function daIndirizzo() {
    const q = new URLSearchParams(location.search);
    const out = {};
    for (const [param, chiave] of Object.entries(CHIAVI)) {
      const v = q.get(param);
      if (v !== null) out[chiave] = chiave === 'ricavi' ? Number(v) : v;
    }
    if (q.has('riduzione')) out.riduzione35 = q.get('riduzione') === '1';
    return out;
  }

  // Una querystring manomessa non deve rompere la pagina: si ricade
  // sull'esempio, che è sempre valido (§11.7).
  function ripulisci(s) {
    const valido = { ...iniziale, ...s };
    const gruppi = parametri.coefficienti.gruppi.map((g) => g.id);

    if (!Number.isFinite(valido.ricavi) || valido.ricavi < 0) valido.ricavi = iniziale.ricavi;
    valido.ricavi = Math.min(valido.ricavi, 10_000_000);
    if (!gruppi.includes(valido.gruppo)) valido.gruppo = iniziale.gruppo;
    if (!(valido.cassa in CASSE)) valido.cassa = iniziale.cassa;
    if (!['ordinaria', 'startup'].includes(valido.regime)) valido.regime = iniziale.regime;
    valido.riduzione35 = Boolean(valido.riduzione35) && valido.cassa !== 'gestioneSeparata';
    return valido;
  }

  let stato = ripulisci(daIndirizzo());

  // ── animazione dei numeri ────────────────────────────────────────────────
  const precedenti = new Map();
  const animazioni = new Map();

  const percentuale = (n) => `${(n * 100).toFixed(1).replace('.', ',')}%`;

  function mostra(nome, valore) {
    const el = campo(nome);
    if (!el) return;

    // Un valore non calcolabile (la quota a fatturato zero) non diventa "0%":
    // sarebbe falso, perché i contributi fissi restano dovuti.
    if (valore === null) {
      el.textContent = '—';
      precedenti.delete(nome);
      return;
    }

    const formatta = el.dataset.formato === 'percentuale' ? percentuale : eur;

    const da = precedenti.get(nome);
    precedenti.set(nome, valore);

    if (menoMovimento || da === undefined || da === valore) {
      el.textContent = formatta(valore);
      return;
    }

    cancelAnimationFrame(animazioni.get(nome));
    const inizio = performance.now();
    const durata = 320;

    const passo = (ora) => {
      const t = Math.min(1, (ora - inizio) / durata);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = formatta(da + (valore - da) * eased);
      if (t < 1) animazioni.set(nome, requestAnimationFrame(passo));
      else el.textContent = formatta(valore);
    };
    animazioni.set(nome, requestAnimationFrame(passo));
  }

  // ── disegno ──────────────────────────────────────────────────────────────
  function aggiorna() {
    const coefficiente = coefficientePerGruppo(stato.gruppo, parametri);
    const r = calcola({ ...stato, coefficiente }, parametri);
    const inps = parametri.inps[stato.cassa];

    // Si aggiornano i campi che la pagina ESPONE, non una lista scritta qui:
    // così lo stesso script serve il calcolatore e la pagina
    // sull'accantonamento, che mostrano voci diverse dello stesso risultato.
    const valori = { ...r, ricavi: stato.ricavi };
    for (const el of pagina.querySelectorAll('[data-campo]')) {
      if (el.dataset.campo in valori) mostra(el.dataset.campo, valori[el.dataset.campo]);
    }

    if (nota('redditoLordo')) {
      nota('redditoLordo').textContent =
        `fatturato × ${pct(coefficiente)} di coefficiente di redditività`;
    }
    if (nota('contributi')) {
      nota('contributi').textContent =
        stato.cassa === 'gestioneSeparata'
          ? `Gestione Separata, ${pct(inps.aliquota)} sul reddito lordo`
          : `${CASSE[stato.cassa]}: ${eur(inps.fisso)} fissi più ${pct(inps.aliquota)} sull’eccedenza` +
            (stato.riduzione35 ? ', ridotti del 35%' : '');
    }
    if (nota('impostaSostitutiva')) {
      nota('impostaSostitutiva').textContent =
        `${pct(parametri.impostaSostitutiva[stato.regime].valore)} sulla base imponibile`;
    }
    if (nota('netto')) {
      const quota = stato.ricavi > 0 ? ((r.netto / stato.ricavi) * 100).toFixed(1) : '0,0';
      nota('netto').textContent =
        stato.ricavi > 0
          ? `${String(quota).replace('.', ',')}% del tuo fatturato`
          : 'i contributi fissi sono dovuti anche senza incassi';
    }

    for (const [nome, valore] of [
      ['netto', r.netto],
      ['contributi', r.contributi],
      ['imposta', r.impostaSostitutiva],
    ]) {
      const el = segmento(nome);
      if (el) el.style.width = `${stato.ricavi > 0 ? Math.max(0, (valore / stato.ricavi) * 100) : 0}%`;
    }

    const riduzione = $('[data-riduzione]');
    if (riduzione) riduzione.hidden = stato.cassa === 'gestioneSeparata';

    const avviso = $('[data-avviso-regime]');
    if (avviso) {
      const testo = AVVISI[r.statoRegime];
      avviso.hidden = !testo;
      avviso.textContent = testo ?? '';
    }

    const q = new URLSearchParams();
    for (const [param, chiave] of Object.entries(CHIAVI)) q.set(param, String(stato[chiave]));
    if (stato.riduzione35) q.set('riduzione', '1');
    history.replaceState(null, '', `${location.pathname}?${q}`);
  }

  // ── controlli ────────────────────────────────────────────────────────────
  function sincronizzaControlli() {
    for (const el of pagina.querySelectorAll('[data-controllo]')) {
      const chiave = el.dataset.controllo;
      if (el.type === 'checkbox') el.checked = Boolean(stato[chiave]);
      else el.value = String(stato[chiave]);
    }
  }

  for (const el of pagina.querySelectorAll('[data-controllo]')) {
    // 'input' e non 'change': il risultato si muove mentre si muove lo slider.
    el.addEventListener('input', () => {
      const chiave = el.dataset.controllo;
      const valore =
        el.type === 'checkbox' ? el.checked : chiave === 'ricavi' ? Number(el.value) : el.value;

      stato = ripulisci({ ...stato, [chiave]: valore });
      sincronizzaControlli();
      aggiorna();
    });
  }

  // ── copia del link ───────────────────────────────────────────────────────
  const copia = $('[data-copia-link]');
  if (copia && navigator.clipboard) {
    // Nasce `hidden` nell'HTML: senza JavaScript un pulsante che copia il link
    // non fa niente, e un comando morto è peggio di un comando assente.
    copia.hidden = false;
    const originale = copia.textContent;
    copia.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        copia.textContent = 'Link copiato';
      } catch {
        copia.textContent = 'Copia non riuscita';
      }
      setTimeout(() => { copia.textContent = originale; }, 2000);
    });
  } else if (copia) {
    copia.hidden = true;
  }

  sincronizzaControlli();
  aggiorna();
}
