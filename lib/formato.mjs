// Formattazione dei numeri, condivisa fra il generatore dell'HTML statico e il
// calcolatore nel browser. Sta qui per lo stesso motivo per cui ci sta il
// calcolo: se i due formattassero per conto proprio, l'esempio della pagina e
// il risultato interattivo mostrerebbero gli stessi valori scritti in due modi.

// useGrouping: 'always' e non il predefinito. In italiano il raggruppamento
// CLDR parte da cinque cifre, quindi "5240,07" finirebbe incolonnato sotto
// "30.000,00" senza il punto. In una colonna di importi si legge male.
const IMPORTO = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

const PERCENTUALE = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

// Spazio unificatore prima del simbolo: l'importo non deve mai andare a capo
// separato dalla sua valuta.
export const eur = (n) => `${IMPORTO.format(n)} €`;

export const pct = (n) => `${PERCENTUALE.format(n * 100)}%`;
