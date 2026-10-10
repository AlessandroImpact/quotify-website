// Lettore dell'API GraphQL di Cloudflare per il sito quotify.it.
//
// Estratto da scripts/analytics/cruscotto.mjs (piano §4.5) perché ora lo
// usa anche il Worker dell'archiviatore. `fetch` si inietta dall'esterno:
// nei test è una finta, e niente esce in rete.
//
// Il token non compare MAI in un messaggio d'errore: un errore finisce nei
// log, e i log non sono un posto per i segreti.

export const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
export const OSPITE = 'quotify.it';

export class ErroreCloudflare extends Error {}

const FILTRO = `filter:{datetime_geq:$da,datetime_lt:$fino,requestHost:"${OSPITE}"}`;
const TESTA = 'query($a:String!,$da:Time!,$fino:Time!){viewer{accounts(filter:{accountTag:$a}){';

/** Un giorno UTC, estremo superiore escluso. A un giorno il campionamento
 *  è 1, cioè i numeri sono esatti (§5.2): per questo si archivia così. */
export function finestraGiorno(data) {
  const inizio = new Date(`${data}T00:00:00Z`);
  const dopo = new Date(inizio.getTime() + 86400000);
  return { da: `${data}T00:00:00Z`, fino: `${dopo.toISOString().slice(0, 10)}T00:00:00Z` };
}

// Tutte le scomposizioni di un giorno in UNA richiesta, con gli alias:
// sul piano gratuito le sottorichieste sono 50 per esecuzione (§4.6).
// I Core Web Vitals stanno in un dataset proprio, non in quello dei pageload.
export const QUERY_GIORNO = `${TESTA}
  tot:rumPageloadEventsAdaptiveGroups(limit:1,${FILTRO}){count sum{visits} avg{sampleInterval}}
  pag:rumPageloadEventsAdaptiveGroups(limit:100,${FILTRO},orderBy:[count_DESC]){count sum{visits} dimensions{requestPath}}
  ref:rumPageloadEventsAdaptiveGroups(limit:100,${FILTRO},orderBy:[count_DESC]){count sum{visits} dimensions{refererHost}}
  pae:rumPageloadEventsAdaptiveGroups(limit:60,${FILTRO},orderBy:[count_DESC]){count dimensions{countryName}}
  dis:rumPageloadEventsAdaptiveGroups(limit:10,${FILTRO},orderBy:[count_DESC]){count dimensions{deviceType}}
  bro:rumPageloadEventsAdaptiveGroups(limit:20,${FILTRO},orderBy:[count_DESC]){count dimensions{userAgentBrowser}}
  cwv:rumWebVitalsEventsAdaptiveGroups(limit:1,${FILTRO}){count quantiles{largestContentfulPaintP75 firstContentfulPaintP75 cumulativeLayoutShiftP75 interactionToNextPaintP75 timeToFirstByteP75}}
}}}`;

const elenco = (righe, dimensione) =>
  (righe ?? []).map((r) => ({ chiave: r.dimensions?.[dimensione] ?? '', viste: r.count }));

/** Dalla risposta grezza alla fotografia di un giorno. Un giorno senza
 *  eventi è uno ZERO vero: Cloudflare ha risposto, e non è passato nessuno. */
export function interpretaGiorno(acc) {
  const t = acc.tot?.[0];
  const v = acc.cwv?.[0];
  // I quantili arrivano in MICROSECONDI; il CLS non ha unità.
  const ms = (x) => (x == null ? null : x / 1000);
  return {
    pagineViste: t?.count ?? 0,
    visite: t?.sum?.visits ?? 0,
    campionamento: t?.avg?.sampleInterval ?? null,
    pagine: elenco(acc.pag, 'requestPath'),
    provenienze: elenco(acc.ref, 'refererHost'),
    paesi: elenco(acc.pae, 'countryName'),
    dispositivi: elenco(acc.dis, 'deviceType'),
    browser: elenco(acc.bro, 'userAgentBrowser'),
    vitals: v?.quantiles ? {
      campioni: v.count,
      lcp: ms(v.quantiles.largestContentfulPaintP75),
      fcp: ms(v.quantiles.firstContentfulPaintP75),
      cls: v.quantiles.cumulativeLayoutShiftP75 ?? null,
      inp: ms(v.quantiles.interactionToNextPaintP75),
      ttfb: ms(v.quantiles.timeToFirstByteP75),
    } : null,
  };
}

export function cliente({ token, account, fetch: f = globalThis.fetch }) {
  if (!token || !account) throw new ErroreCloudflare('mancano il token o l\'account di Cloudflare');

  async function graphql(query, variabili) {
    const r = await f(GRAPHQL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { a: account, ...variabili } }),
    });
    let d;
    try {
      d = await r.json();
    } catch {
      throw new ErroreCloudflare(`risposta non leggibile (${r.status})`);
    }
    // GraphQL risponde 200 anche quando sbaglia: l'errore sta nel corpo.
    if (d.errors?.length) throw new ErroreCloudflare(d.errors.map((e) => e.message).join('; '));
    if (!r.ok) throw new ErroreCloudflare(`Cloudflare ${r.status}`);
    // Un elenco di account vuoto NON è un giorno senza visite: vuol dire che
    // il token non vede l'account (permesso tolto, account sbagliato). Se lo
    // trattassimo come zero, l'archiviatore scriverebbe zeri sopra i giorni
    // buoni e li segnerebbe come fatti.
    const conti = d.data?.viewer?.accounts;
    if (!Array.isArray(conti) || !conti.length) throw new ErroreCloudflare('account non visibile al token');
    return conti[0];
  }

  return {
    async pageload({ da, fino, selezione, limite = 100 }) {
      const q = `${TESTA}rumPageloadEventsAdaptiveGroups(limit:${limite},${FILTRO},orderBy:[count_DESC]){${selezione}}}}}`;
      return (await graphql(q, { da, fino })).rumPageloadEventsAdaptiveGroups ?? [];
    },
    async vitals({ da, fino, selezione }) {
      const q = `${TESTA}rumWebVitalsEventsAdaptiveGroups(limit:1,${FILTRO}){${selezione}}}}}`;
      return (await graphql(q, { da, fino })).rumWebVitalsEventsAdaptiveGroups?.[0] ?? null;
    },
    async giorno(data) {
      const acc = await graphql(QUERY_GIORNO, finestraGiorno(data));
      // Un giorno vero senza visite ha `tot: []`; l'assenza del campo è un'altra cosa.
      if (!Array.isArray(acc.tot)) throw new ErroreCloudflare('risposta senza i totali del giorno');
      return interpretaGiorno(acc);
    },
  };
}
