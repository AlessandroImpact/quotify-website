// Le regole degli avvisi — docs/cruscotto-piano.md §6.2.
//
// Eventi, non tendenze: un pagante, un canale nuovo, il sito giù, un picco,
// l'archivio fermo, una pagina uscita dall'indice; più il riassunto del
// lunedì. Ogni avviso ha una CHIAVE: la tabella `avvisi` la ricorda, e la
// stessa chiave non parte due volte (lavoroAvvisi in archiviatore.mjs).
// Niente dati personali nei testi: canali e campagne, mai persone.

import { numero } from './osservazioni.mjs';
import { canaleIscritto, CANALE_SCONOSCIUTO } from './riassunto.mjs';

export const CRUSCOTTO = 'https://quotify.it/cruscotto';
/** Messaggi per esecuzione: tiene le sottorichieste lontane da 50 anche nel
 *  giorno in cui tutto succede insieme. Il resto parte all'ora dopo. */
export const MASSIMO_PER_GIRO = 10;

const GIORNO_MS = 864e5;
const spostato = (data, giorni) => new Date(Date.parse(`${data}T00:00:00Z`) + giorni * GIORNO_MS).toISOString().slice(0, 10);
const oraDiRoma = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: 'numeric', hourCycle: 'h23' });

export function compitiDellOra(istante) {
  const d = new Date(istante);
  const ora = d.getUTCHours();
  const lunedi = d.getUTCDay() === 1;
  // Alle 05 il Worker firma il token Google: CPU già vicina al limite (§3.2).
  // Il lunedì alle 06 l'indicizzazione usa fino a 42 sottorichieste su 50: il
  // riassunto dell'app più dieci messaggi le farebbero sforare.
  return { eventi: ora !== 5 && !(ora === 6 && lunedi), giornaliero: ora === 7, settimanale: ora === 7 && lunedi };
}

/** Di notte il telefono non suona: il messaggio arriva, in silenzio. */
export function silenzioso(istante) {
  const ora = Number(oraDiRoma.format(new Date(istante)));
  return ora >= 22 || ora < 8;
}

/** Settimana ISO 8601: quella che contiene il giovedì. */
export function settimanaIso(data) {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
  const anno = d.getUTCFullYear();
  const quattroGennaio = new Date(Date.UTC(anno, 0, 4));
  const n = 1 + Math.round(((d - quattroGennaio) / GIORNO_MS - 3 + ((quattroGennaio.getUTCDay() + 6) % 7)) / 7);
  return `${anno}-W${String(n).padStart(2, '0')}`;
}

const canaleNoto = (e) => {
  const c = canaleIscritto(e);
  return c === CANALE_SCONOSCIUTO ? null : c;
};

export function avvisiEventi(eventi) {
  const fuori = [];
  for (const e of eventi ?? []) {
    const canale = canaleNoto(e);
    const campagna = e.campagna && e.sorgente !== 'sito' ? e.campagna : null;
    const dettaglio = campagna ? ` (campagna ${campagna})` : '';
    if (e.tipo === 'pagante') {
      fuori.push({ chiave: `pagante:${e.id}`, testo: `💶 Nuovo pagante${canale ? `, da ${canale}` : ''}${dettaglio}`, link: `${CRUSCOTTO}#imbuto` });
    } else if (e.tipo === 'iscritto' && canale) {
      // La chiave è il canale (più la campagna): parte solo la prima volta.
      fuori.push({
        chiave: `primo-iscritto:${canale}:${campagna ?? ''}`,
        testo: `🌱 Primo iscritto da ${canale}${dettaglio}`,
        link: `${CRUSCOTTO}#marketing?canale=${encodeURIComponent(canale)}`,
      });
    }
  }
  return fuori;
}

const mediana = (v) => {
  const s = [...v].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const NOMI_FONTI = { cloudflare: 'Cloudflare', google: 'Search Console', ricerca: 'Search Console (query e pagine)' };

/** `storico`: le righe dei 29 giorni fino a ieri, [{ giorno, visite, fonti }]. */
export function avvisiGiornalieri({ storico, ieri }) {
  const fuori = [];
  const link = `${CRUSCOTTO}#oggi`;
  const perGiorno = new Map(storico.map((r) => [r.giorno, r]));
  const r = perGiorno.get(ieri);
  const prima = storico.filter((x) => x.giorno < ieri && x.visite != null).map((x) => x.visite);

  const sette = prima.slice(-7);
  const media = sette.length ? sette.reduce((a, b) => a + b, 0) / sette.length : 0;
  if (r?.visite === 0 && sette.length === 7 && media >= 10) {
    fuori.push({ chiave: `zero:${ieri}`, testo: `🔴 Ieri zero visite su quotify.it (media dei sette giorni prima: ${numero(media)}). Sito giù o beacon rotto?`, link });
  }

  const ventotto = prima.slice(-28);
  if (r?.visite != null && r.visite >= 30 && ventotto.length >= 7) {
    const m = mediana(ventotto);
    if (m > 0 && r.visite >= 3 * m) {
      fuori.push({ chiave: `picco:${ieri}`, testo: `📈 Picco: ieri ${numero(r.visite)} visite, ${numero(r.visite / m)} volte il solito`, link });
    }
  }

  // Il lavoro di Cloudflare scrive SEMPRE la riga di ieri, buona o in errore:
  // se manca, il lavoro non è proprio girato.
  if (!r?.fonti?.cloudflare) {
    fuori.push({ chiave: `fermo:cloudflare:${ieri}`, testo: '⚠️ L\'archivio di Cloudflare non ha scritto la notte scorsa', link });
  }
  const altroIeri = perGiorno.get(spostato(ieri, -1));
  for (const fonte of Object.keys(NOMI_FONTI)) {
    if (r?.fonti?.[fonte] === 'errore' && altroIeri?.fonti?.[fonte] === 'errore') {
      fuori.push({ chiave: `fermo:${fonte}:${ieri}`, testo: `⚠️ L'archivio di ${NOMI_FONTI[fonte]} è in errore da due notti`, link });
    }
  }
  return fuori;
}

export function avvisiSettimanali({ indice, frasi, settimanaUscite, settimanaRiassunto }) {
  const fuori = (indice?.uscite ?? []).map((p) => ({
    chiave: `indice-uscita:${p}:${settimanaUscite}`,
    testo: `📉 ${p} è uscita dall'indice di Google`,
    link: `${CRUSCOTTO}#marketing`,
  }));
  fuori.push({
    chiave: `riassunto:${settimanaRiassunto}`,
    testo: ['🗓️ La settimana su quotify.it', ...frasi.map((f) => `• ${f.testo}`)].join('\n'),
    link: `${CRUSCOTTO}#oggi?periodo=7`,
  });
  return fuori;
}
