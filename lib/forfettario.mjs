// Calcolo della stima fiscale in regime forfettario.
// Modulo PURO: nessun DOM, nessuna aliquota cablata. Ogni valore fiscale arriva
// da `parametri` — vedi docs/calcolatore-forfettario-piano.md §2.3 e §6.
// Lo importano sia il browser sia lo script che genera l'esempio nell'HTML,
// così l'esempio statico non può divergere da ciò che vede l'utente (§2.4).

const CASSE = ['gestioneSeparata', 'artigiani', 'commercianti'];
const REGIMI = ['ordinaria', 'startup'];

// Arrotonda ai centesimi. Si applica a OGNI passaggio, e il valore arrotondato
// entra nel passaggio successivo: così la cascata mostrata all'utente torna per
// costruzione, invece che per fortuna. Su una pagina che parla di tasse, numeri
// che non si sommano a vista sembrano un errore di calcolo.
const centesimi = (n) => Math.round(n * 100) / 100;

// Un parametro fiscale assente non deve propagarsi come NaN fino allo schermo:
// un numero sbagliato è peggio di nessun numero.
function numero(valore, dove) {
  if (typeof valore !== 'number' || !Number.isFinite(valore)) {
    throw new Error(`parametro fiscale mancante o non numerico: ${dove}`);
  }
  return valore;
}

// I contributi dovuti nell'anno, per cassa previdenziale (§6.2).
function contributi(redditoLordo, cassa, riduzione35, parametri) {
  if (!CASSE.includes(cassa)) throw new Error(`cassa non riconosciuta: ${cassa}`);
  const c = parametri.inps?.[cassa] ?? {};

  // Gestione Separata: nessun minimale, si paga in proporzione fino al massimale.
  if (cassa === 'gestioneSeparata') {
    const tetto = numero(c.massimale, `inps.${cassa}.massimale`);
    return Math.min(redditoLordo, tetto) * numero(c.aliquota, `inps.${cassa}.aliquota`);
  }

  // Artigiani e commercianti: il fisso è dovuto anche a reddito zero (§11.1),
  // più una percentuale sulla parte che eccede il minimale, su DUE scaglioni —
  // il secondo si raggiunge dentro il forfettario (85.000 × 0,78 = 66.300), non
  // è un caso limite.
  const minimale = numero(c.minimale, `inps.${cassa}.minimale`);
  const scaglione = numero(c.scaglione, `inps.${cassa}.scaglione`);
  const base = Math.min(redditoLordo, numero(c.massimale, `inps.${cassa}.massimale`));

  const primoScaglione = Math.max(0, Math.min(base, scaglione) - minimale);
  const secondoScaglione = Math.max(0, base - Math.max(scaglione, minimale));

  const dovuti =
    numero(c.fisso, `inps.${cassa}.fisso`) +
    primoScaglione * numero(c.aliquota, `inps.${cassa}.aliquota`) +
    secondoScaglione * numero(c.aliquotaOltre, `inps.${cassa}.aliquotaOltre`);

  // La riduzione opzionale per i forfettari vale su entrambe le componenti.
  if (!riduzione35) return dovuti;
  return dovuti * (1 - numero(c.riduzione, `inps.${cassa}.riduzione`));
}

// Il coefficiente di redditività del gruppo di attività (Allegato 4 L. 190/2014).
// Non c'è un coefficiente per codice ATECO: i codici stanno dentro un gruppo, e
// il gruppo ha un coefficiente — vedi §2.7 del piano.
export function coefficientePerGruppo(gruppo, parametri) {
  // `gruppo` è l'identificatore corto (es. "professionali"), non la descrizione
  // di legge: serve per il selettore e per la querystring condivisibile.
  const trovato = parametri.coefficienti?.find((c) => c.id === gruppo);
  if (!trovato) throw new Error(`gruppo non riconosciuto: ${gruppo}`);
  return numero(trovato.coefficiente, `coefficienti[${gruppo}].coefficiente`);
}

// Oltre 85.000 € si esce dal regime dall'anno SUCCESSIVO; oltre 100.000 € il
// regime cessa nell'anno STESSO, con IVA sulle operazioni successive. Entrambe
// le soglie sono incluse: si esce superandole, non raggiungendole.
// Art. 1 comma 71 L. 190/2014, come modificato dalla L. 197/2022.
function statoDelRegime(ricavi, parametri) {
  const limite = numero(parametri.limiteRicavi?.valore, 'limiteRicavi.valore');
  const immediata = numero(parametri.limiteRicavi?.uscitaImmediata, 'limiteRicavi.uscitaImmediata');

  if (ricavi > immediata) return 'uscita-immediata';
  if (ricavi > limite) return 'uscita-anno-successivo';
  return 'dentro';
}

export function calcola({ ricavi, coefficiente, cassa, regime, riduzione35 }, parametri) {
  if (!REGIMI.includes(regime)) throw new Error(`regime non riconosciuto: ${regime}`);

  const redditoLordo = centesimi(ricavi * coefficiente);
  const contributiDovuti = centesimi(contributi(redditoLordo, cassa, riduzione35, parametri));

  // I contributi possono eccedere il reddito: l'imponibile non va sotto zero (§11.5).
  const redditoImponibile = centesimi(Math.max(0, redditoLordo - contributiDovuti));

  const aliquota = numero(
    parametri.impostaSostitutiva?.[regime]?.valore,
    `impostaSostitutiva.${regime}.valore`,
  );
  const impostaSostitutiva = centesimi(redditoImponibile * aliquota);
  const netto = centesimi(ricavi - contributiDovuti - impostaSostitutiva);

  // Le due soglie del regime hanno effetti DIVERSI, e confonderle su una pagina
  // pubblica sarebbe un danno. Il modulo non estrapola e non nasconde: dichiara
  // quale dei due casi è, e chi mostra decide come dirlo (§11.2).
  const statoRegime = statoDelRegime(ricavi, parametri);

  return {
    redditoLordo,
    contributi: contributiDovuti,
    redditoImponibile,
    impostaSostitutiva,
    netto,
    statoRegime,
  };
}
