import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { controllaContenuti } from './rules-contenuti.mjs';

const OGGI = new Date('2026-09-04T12:00:00Z');

// Parametri finti ma BEN FORMATI: ogni test li rompe in un punto solo, così si
// vede quale regola ha reagito.
const sani = () => ({
  annoImposta: 2026,
  verificatoIl: '2026-09-04',
  verificatoDa: 'Chi Di Dovere',
  limiteRicavi: { valore: 85000, fonte: 'x', url: 'https://esempio.invalid/' },
  coefficienti: {
    fonte: 'Allegato 4',
    url: 'https://esempio.invalid/allegato',
    gruppi: [{ id: 'altre', descrizione: 'Altre', coefficiente: 0.67 }],
  },
});

const calcolaPulito = 'const centesimi = (n) => Math.round(n * 100) / 100;\nexport const x = Math.max(0, 1);';

const controlla = (parametri, sorgente = calcolaPulito, oggi = OGGI) =>
  controllaContenuti({
    parametri,
    fileParametri: 'data/parametri-fiscali-2026.json',
    sorgenteCalcolo: sorgente,
    fileCalcolo: 'lib/forfettario.mjs',
    oggi,
  });

const regole = (findings) => findings.map((f) => f.rule);

test('parametri ben formati e verificati: nessun rilievo', () => {
  assert.deepEqual(regole(controlla(sani())), []);
});

test('parametri non ancora verificati da una persona: il build si ferma', () => {
  const p = sani();
  p.verificatoIl = null;
  p.verificatoDa = null;

  const f = controlla(p);
  assert.deepEqual(regole(f), ['param-fiscale-non-verificato']);
  assert.equal(f[0].level, 'error');
});

test('un valore fiscale senza fonte ferma il build', () => {
  const p = sani();
  delete p.limiteRicavi.url;

  const f = controlla(p);
  assert.deepEqual(regole(f), ['param-fiscale-senza-fonte']);
  assert.equal(f[0].level, 'error');
  assert.match(f[0].message, /limiteRicavi/);
});

test('la fonte dichiarata sul contenitore vale per i valori che contiene', () => {
  // I nove gruppi non ripetono la fonte: la eredita dal contenitore.
  assert.deepEqual(regole(controlla(sani())), []);

  const p = sani();
  delete p.coefficienti.url; // tolta al contenitore, i gruppi restano scoperti
  assert.deepEqual(regole(controlla(p)), ['param-fiscale-senza-fonte']);
});

test('a dicembre i parametri dell\'anno corrente sono solo un promemoria', () => {
  const f = controlla(sani(), calcolaPulito, new Date('2026-12-15T12:00:00Z'));
  assert.deepEqual(regole(f), ['param-fiscale-scaduto']);
  assert.equal(f[0].level, 'warn');
});

test('a gennaio i parametri dell\'anno prima sono ancora un avviso', () => {
  const f = controlla(sani(), calcolaPulito, new Date('2027-01-15T12:00:00Z'));
  assert.equal(f[0].level, 'warn');
});

test('da marzo i parametri dell\'anno prima fermano il build', () => {
  const f = controlla(sani(), calcolaPulito, new Date('2027-03-01T12:00:00Z'));
  assert.deepEqual(regole(f), ['param-fiscale-scaduto']);
  assert.equal(f[0].level, 'error');
});

test('un numero fiscale cablato nel modulo di calcolo è un avviso', () => {
  const f = controlla(sani(), 'const aliquota = 0.2607;');
  assert.deepEqual(regole(f), ['numeri-fiscali-nel-codice']);
  assert.equal(f[0].level, 'warn');
  assert.match(f[0].message, /0\.2607/);
});

test('i numeri dei commenti non contano come valori cablati', () => {
  const sorgente = '// oltre 85000 si esce dal regime (L. 190/2014)\nconst x = 1;';
  assert.deepEqual(regole(controlla(sani(), sorgente)), []);
});

test('il file dei parametri veri passa tutte le regole', () => {
  const veri = JSON.parse(readFileSync('data/parametri-fiscali-2026.json', 'utf8'));
  const f = controllaContenuti({
    parametri: veri,
    fileParametri: 'data/parametri-fiscali-2026.json',
    sorgenteCalcolo: readFileSync('lib/forfettario.mjs', 'utf8'),
    fileCalcolo: 'lib/forfettario.mjs',
    oggi: OGGI,
  });

  // Verificato da una persona il 2026-09-04: da qui in poi questo test è la
  // guardia che il file non regredisca — fonte tolta, verifica azzerata, o un
  // valore fiscale rientrato nel codice.
  assert.deepEqual(regole(f), []);
});

// ─── Sincronia fra il JSON e l'HTML generato ─────────────────────────────────
const paginaVera = () => readFileSync('calcolo-tasse-forfettario.html', 'utf8');

test('la pagina vera è allineata ai parametri veri', () => {
  const veri = JSON.parse(readFileSync('data/parametri-fiscali-2026.json', 'utf8'));
  const f = controllaContenuti({
    parametri: veri,
    fileParametri: 'data/parametri-fiscali-2026.json',
    sorgenteCalcolo: readFileSync('lib/forfettario.mjs', 'utf8'),
    fileCalcolo: 'lib/forfettario.mjs',
    sorgentiPagine: [{ file: 'calcolo-tasse-forfettario.html', sorgente: paginaVera() }],
    dati: {
      parametri: veri,
      scadenze: JSON.parse(readFileSync('data/scadenze-2026.json', 'utf8')),
      navigazione: JSON.parse(readFileSync('data/navigazione.json', 'utf8')),
    },
    oggi: OGGI,
  });

  assert.deepEqual(regole(f), []);
});

test('se i parametri cambiano e la pagina non viene rigenerata, il build si ferma', () => {
  const veri = JSON.parse(readFileSync('data/parametri-fiscali-2026.json', 'utf8'));
  // Un coefficiente cambia nel JSON ma la pagina resta quella di prima: è
  // esattamente il caso in cui la tabella pubblicata direbbe una cosa e il
  // calcolatore un'altra.
  veri.coefficienti.gruppi[0].coefficiente = 0.54;

  const f = controllaContenuti({
    parametri: veri,
    fileParametri: 'data/parametri-fiscali-2026.json',
    sorgenteCalcolo: readFileSync('lib/forfettario.mjs', 'utf8'),
    fileCalcolo: 'lib/forfettario.mjs',
    sorgentiPagine: [{ file: 'calcolo-tasse-forfettario.html', sorgente: paginaVera() }],
    dati: {
      parametri: veri,
      scadenze: JSON.parse(readFileSync('data/scadenze-2026.json', 'utf8')),
      navigazione: JSON.parse(readFileSync('data/navigazione.json', 'utf8')),
    },
    oggi: OGGI,
  });

  assert.deepEqual(regole(f), ['calcolatore-non-sincronizzato']);
  assert.equal(f[0].level, 'error');
});

test('anche le scadenze vogliono una verifica umana, non solo i parametri', () => {
  // Le date sono l'unico contenuto in cui l'errore fa perdere una scadenza.
  // Lasciare `verificatoIl` a null nel file e affidarsi solo al meta della
  // pagina significherebbe avere un campo che non controlla niente.
  const f = controllaContenuti({
    parametri: sani(),
    fileParametri: 'p.json',
    sorgenteCalcolo: calcolaPulito,
    fileCalcolo: 'lib/forfettario.mjs',
    dati: { parametri: sani(), scadenze: { anno: 2026, verificatoIl: null, verificatoDa: null } },
    oggi: OGGI,
  });

  assert.deepEqual(regole(f), ['scadenze-non-verificate']);
  assert.equal(f[0].level, 'error');
});
