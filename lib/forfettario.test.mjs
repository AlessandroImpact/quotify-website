import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { calcola, coefficientePerGruppo } from './forfettario.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  PARAMETRI FITTIZI, NON FISCALI.
// Numeri tondi scelti perché il conto si verifichi a mente. Non hanno alcun
// rapporto con la realtà e NON vanno copiati in data/parametri-fiscali-*.json:
// quei valori si verificano alla fonte — docs/calcolatore-forfettario-piano.md §15.
// ─────────────────────────────────────────────────────────────────────────────
const P = {
  annoImposta: 2026,
  limiteRicavi: { valore: 85000 },
  impostaSostitutiva: {
    ordinaria: { valore: 0.15 },
    startup: { valore: 0.05, anni: 5 },
  },
  coefficienti: [
    { id: 'professionali', descrizione: 'Attività professionali…', coefficiente: 0.78 },
    { id: 'commercio', descrizione: 'Commercio all\u2019ingrosso e al dettaglio', coefficiente: 0.4 },
    { id: 'costruzioni', descrizione: 'Costruzioni e attività immobiliari', coefficiente: 0.86 },
  ],
  inps: {
    gestioneSeparata: { aliquota: 0.25, massimale: 100000 },
    artigiani: {
      fisso: 4000, minimale: 18000, aliquota: 0.2,
      scaglione: 50000, aliquotaOltre: 0.25, massimale: 120000, riduzione: 0.35,
    },
    commercianti: {
      fisso: 4200, minimale: 18000, aliquota: 0.21,
      scaglione: 50000, aliquotaOltre: 0.26, massimale: 120000, riduzione: 0.35,
    },
  },
};

test('gestione separata sotto il massimale: coefficiente, contributi, imposta, netto', () => {
  const r = calcola(
    { ricavi: 30000, coefficiente: 0.78, cassa: 'gestioneSeparata', regime: 'ordinaria' },
    P,
  );

  assert.equal(r.redditoLordo, 23400);        // 30000 × 0,78
  assert.equal(r.contributi, 5850);           // 23400 × 0,25
  assert.equal(r.redditoImponibile, 17550);   // 23400 − 5850
  assert.equal(r.impostaSostitutiva, 2632.5); // 17550 × 0,15
  assert.equal(r.netto, 21517.5);             // 30000 − 5850 − 2632,5
});

test('gestione separata: il contributo si ferma al massimale', () => {
  const r = calcola(
    // reddito lordo 156.000 → oltre il massimale fittizio di 100.000
    { ricavi: 200000, coefficiente: 0.78, cassa: 'gestioneSeparata', regime: 'ordinaria' },
    P,
  );

  assert.equal(r.contributi, 25000); // 100.000 × 0,25, NON 156.000 × 0,25
});

test('artigiani a fatturato zero: i contributi fissi sono dovuti lo stesso', () => {
  const r = calcola({ ricavi: 0, coefficiente: 0.78, cassa: 'artigiani', regime: 'ordinaria' }, P);

  assert.equal(r.contributi, 4000);         // il fisso, anche senza reddito
  assert.equal(r.redditoImponibile, 0);
  assert.equal(r.impostaSostitutiva, 0);
  assert.equal(r.netto, -4000);             // si è in perdita: è corretto, e va detto
});

test('artigiani sopra il minimale: fisso più percentuale sulla sola eccedenza', () => {
  const r = calcola(
    { ricavi: 50000, coefficiente: 0.78, cassa: 'artigiani', regime: 'ordinaria' },
    P,
  );

  assert.equal(r.redditoLordo, 39000);      // 50000 × 0,78
  assert.equal(r.contributi, 8200);         // 4000 + (39000 − 18000) × 0,2
  assert.equal(r.redditoImponibile, 30800);
  assert.equal(r.impostaSostitutiva, 4620);
  assert.equal(r.netto, 37180);
});

test('riduzione del 35%: si applica sia al fisso sia alla percentuale', () => {
  const r = calcola(
    { ricavi: 50000, coefficiente: 0.78, cassa: 'artigiani', regime: 'ordinaria', riduzione35: true },
    P,
  );

  assert.equal(r.contributi, 5330);         // 8200 × 0,65 — non solo sull'eccedenza
});

test('arrotonda ai centesimi: nessun risultato con più di due decimali', () => {
  const r = calcola(
    { ricavi: 33333, coefficiente: 0.67, cassa: 'gestioneSeparata', regime: 'ordinaria' },
    P,
  );

  assert.equal(r.redditoLordo, 22333.11);
  assert.equal(r.contributi, 5583.28);       // 5583,2775 arrotondato
  assert.equal(r.redditoImponibile, 16749.83);
  assert.equal(r.impostaSostitutiva, 2512.47);
  assert.equal(r.netto, 25237.25);
});

const cent = (n) => Math.round(n * 100) / 100;

test('la cascata mostrata torna: i numeri arrotondati sono coerenti fra loro', () => {
  // Se l'utente somma quello che legge, deve tornare. Numeri che non tornano a
  // vista, su una pagina che parla di tasse, sembrano un errore di calcolo.
  for (const ricavi of [7777, 21111, 48999, 61234]) {
    const r = calcola({ ricavi, coefficiente: 0.67, cassa: 'gestioneSeparata', regime: 'ordinaria' }, P);

    // Confronto ai centesimi: è la precisione a cui l'utente legge i numeri.
    // Senza, si confronterebbe un valore arrotondato con il rumore in virgola
    // mobile dell'assert stesso. Il test resta severo: se il modulo arrotondasse
    // ogni voce partendo dai valori a piena precisione invece che da quelli già
    // arrotondati, qui comparirebbe uno scarto di un centesimo.
    assert.equal(r.redditoImponibile, cent(r.redditoLordo - r.contributi), `imponibile a ${ricavi}`);
    assert.equal(r.netto, cent(ricavi - r.contributi - r.impostaSostitutiva), `netto a ${ricavi}`);
  }
});

test('regime startup: aliquota al 5%, non al 15%', () => {
  const r = calcola(
    { ricavi: 30000, coefficiente: 0.78, cassa: 'gestioneSeparata', regime: 'startup' },
    P,
  );

  assert.equal(r.redditoImponibile, 17550);   // identico all'ordinario
  assert.equal(r.impostaSostitutiva, 877.5);  // 17550 × 0,05
  assert.equal(r.netto, 23272.5);
});

test('cassa non riconosciuta: errore esplicito, non un risultato sbagliato', () => {
  assert.throws(
    () => calcola({ ricavi: 30000, coefficiente: 0.78, cassa: 'cassaForense', regime: 'ordinaria' }, P),
    /cassa non riconosciuta: cassaForense/,
  );
});

test('regime non riconosciuto: errore esplicito', () => {
  assert.throws(
    () => calcola({ ricavi: 30000, coefficiente: 0.78, cassa: 'gestioneSeparata', regime: 'boh' }, P),
    /regime non riconosciuto: boh/,
  );
});

test('parametro fiscale mancante: errore, mai un NaN silenzioso', () => {
  const senzaAliquota = {
    ...P,
    inps: { ...P.inps, gestioneSeparata: { massimale: 100000 } }, // manca `aliquota`
  };

  assert.throws(
    () => calcola({ ricavi: 30000, coefficiente: 0.78, cassa: 'gestioneSeparata', regime: 'ordinaria' }, senzaAliquota),
    /aliquota/,
  );
});

test('commercianti usa i propri parametri, non quelli degli artigiani', () => {
  const r = calcola(
    { ricavi: 50000, coefficiente: 0.78, cassa: 'commercianti', regime: 'ordinaria' },
    P,
  );

  assert.equal(r.contributi, 8610); // 4200 + (39000 − 18000) × 0,21 — non 8200
});

test('oltre la soglia dei ricavi il risultato lo dichiara', () => {
  const dentro = calcola(
    { ricavi: 50000, coefficiente: 0.78, cassa: 'gestioneSeparata', regime: 'ordinaria' },
    P,
  );
  const fuori = calcola(
    { ricavi: 90000, coefficiente: 0.78, cassa: 'gestioneSeparata', regime: 'ordinaria' },
    P,
  );

  assert.equal(dentro.oltreLimite, false);
  assert.equal(fuori.oltreLimite, true); // il calcolo non vale più: chi lo mostra deve saperlo
});

test('il coefficiente applicato è quello del gruppo scelto', () => {
  assert.equal(coefficientePerGruppo('professionali', P), 0.78);
  assert.equal(coefficientePerGruppo('commercio', P), 0.4);
  assert.equal(coefficientePerGruppo('costruzioni', P), 0.86);
});

test('gruppo non riconosciuto: errore esplicito', () => {
  assert.throws(() => coefficientePerGruppo('inventato', P), /gruppo non riconosciuto: inventato/);
});

test('artigiani oltre lo scaglione: aliquota maggiorata solo sulla parte eccedente', () => {
  const r = calcola(
    { ricavi: 100000, coefficiente: 0.78, cassa: 'artigiani', regime: 'ordinaria' },
    P,
  );

  // lordo 78.000. Fisso 4.000
  //   + da 18.000 a 50.000 → 32.000 × 0,20 = 6.400
  //   + da 50.000 a 78.000 → 28.000 × 0,25 = 7.000
  assert.equal(r.contributi, 17400);
});

test('artigiani: il reddito imponibile ai fini contributivi si ferma al massimale', () => {
  const r = calcola(
    { ricavi: 200000, coefficiente: 0.78, cassa: 'artigiani', regime: 'ordinaria' },
    P,
  );

  // lordo 156.000, tagliato a 120.000. Fisso 4.000 + 6.400 + (70.000 × 0,25 = 17.500)
  assert.equal(r.contributi, 27900);
});

// ─── Contratto con il file dei parametri veri ────────────────────────────────
// Questi test non verificano che i valori siano fiscalmente giusti — quello lo
// può fare solo una persona. Verificano che il file abbia la forma che il
// modulo si aspetta, e servono soprattutto al file dell'anno prossimo.
const REALI = JSON.parse(
  readFileSync(new URL('../data/parametri-fiscali-2026.json', import.meta.url), 'utf8'),
);

test('i parametri reali sono i nove gruppi di legge, tutti risolvibili', () => {
  assert.equal(REALI.coefficienti.length, 9);

  for (const c of REALI.coefficienti) {
    assert.equal(coefficientePerGruppo(c.id, REALI), c.coefficiente, `gruppo ${c.id}`);
    assert.ok(
      [0.4, 0.54, 0.62, 0.67, 0.78, 0.86].includes(c.coefficiente),
      `${c.id}: ${c.coefficiente} non è uno dei sei coefficienti di legge`,
    );
  }
});

test('ogni combinazione di cassa e regime è calcolabile coi parametri reali', () => {
  for (const cassa of ['gestioneSeparata', 'artigiani', 'commercianti']) {
    for (const regime of ['ordinaria', 'startup']) {
      assert.doesNotThrow(
        () => calcola({ ricavi: 50000, coefficiente: 0.67, cassa, regime }, REALI),
        `${cassa} / ${regime}`,
      );
    }
  }
});

test('coi parametri reali la cascata resta coerente su tutto il range del regime', () => {
  for (const ricavi of [0, 15000, 30000, 60000, 85000]) {
    const r = calcola({ ricavi, coefficiente: 0.67, cassa: 'gestioneSeparata', regime: 'ordinaria' }, REALI);

    assert.equal(r.redditoImponibile, cent(r.redditoLordo - r.contributi), `imponibile a ${ricavi}`);
    assert.equal(r.netto, cent(ricavi - r.contributi - r.impostaSostitutiva), `netto a ${ricavi}`);
    assert.equal(r.oltreLimite, false, `oltreLimite a ${ricavi}`);
  }
});
