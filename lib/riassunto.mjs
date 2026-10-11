// Il riassunto dell'app — docs/cruscotto-piano.md §7.2.
//
// L'app dà al sito solo numeri aggregati: niente email, niente id veri. Qui
// si legge, e ogni guasto diventa uno STATO, mai un'eccezione: il cruscotto
// deve funzionare anche quando l'app non risponde, e dirlo.
//
//   in-attesa  la chiave non c'è ancora, o l'app non ha ancora l'endpoint (404)
//   errore     l'app c'è ma la risposta non è usabile
//   ok         dati validi, versione conosciuta

import { famiglia } from './attribuzione.mjs';

export const URL_RIASSUNTO = 'https://app.quotify.it/api/interno/riassunto';
export const VERSIONE_RIASSUNTO = 1;
export const CANALE_SCONOSCIUTO = 'Provenienza sconosciuta';
/** Il cruscotto aspetta l'app al più così: oltre, mostra il resto. */
const ATTESA_MS = 4000;

export async function leggiRiassunto({ chiave, da, a, fetch: f = globalThis.fetch, attesaMs = ATTESA_MS }) {
  if (!chiave) return { stato: 'in-attesa', dati: null };
  let r;
  try {
    r = await f(`${URL_RIASSUNTO}?da=${da}&a=${a}`, {
      headers: { Authorization: `Bearer ${chiave}` },
      signal: AbortSignal.timeout(attesaMs),
    });
  } catch {
    return { stato: 'errore', dati: null };
  }
  if (r.status === 404) return { stato: 'in-attesa', dati: null };
  if (!r.ok) return { stato: 'errore', dati: null };
  let d;
  try {
    d = await r.json();
  } catch {
    return { stato: 'errore', dati: null };
  }
  // Una versione che non conosciamo potrebbe avere campi con un altro
  // significato: meglio dire «errore» che mostrare numeri sbagliati.
  if (d?.versione !== VERSIONE_RIASSUNTO) return { stato: 'errore', dati: null };
  return { stato: 'ok', dati: d };
}

/** Il canale di un iscritto. Gli UTM «sito» dicono quale bottone, non da
 *  dove: in quel caso parla il referrer (spec §7.1). */
export function canaleIscritto({ sorgente, rif }) {
  if (!sorgente && !rif) return CANALE_SCONOSCIUTO;
  if (sorgente && sorgente !== 'sito') return famiglia(sorgente);
  if (rif) return famiglia(rif);
  return famiglia(null);
}
