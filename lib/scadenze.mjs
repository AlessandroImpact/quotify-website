// Classificazione delle scadenze rispetto a oggi.
//
// Modulo puro, senza DOM: lo usa il browser per evidenziare la prossima
// scadenza e il conto alla rovescia. Deliberatamente NON lo usa il generatore
// dell'HTML statico — "mancano 70 giorni" scritto dentro la pagina sarebbe
// falso il giorno dopo. Lo stato temporale si calcola nel browser, il
// contenuto sta nell'HTML.

export const PASSATA = 'passata';
export const PROSSIMA = 'prossima';
export const FUTURA = 'futura';

const GIORNO = 86400000;

// Mezzogiorno UTC per entrambe le date: così il conteggio dei giorni non
// dipende dall'ora in cui qualcuno apre la pagina, né dal fuso.
const aMezzogiorno = (d) =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);

export function classifica(scadenze, oggi = new Date()) {
  const adesso = aMezzogiorno(oggi);
  let trovataLaProssima = false;

  return scadenze
    .map((s) => {
      const quando = aMezzogiorno(new Date(`${s.data}T12:00:00Z`));
      const giorni = Math.round((quando - adesso) / GIORNO);

      // Nel giorno stesso si è ancora in tempo: si versa entro la giornata.
      let stato = giorni < 0 ? PASSATA : FUTURA;
      if (stato !== PASSATA && !trovataLaProssima) {
        stato = PROSSIMA;
        trovataLaProssima = true;
      }
      return { ...s, stato, giorni };
    });
}
