// Dalle letture alla risposta del cruscotto — docs/cruscotto-piano.md §5.2.
//
// Funzioni pure: ricevono quello che le letture hanno trovato e non sanno
// da dove arriva. `app` è il riassunto dell'app già validato (dati) o null:
// null vuol dire «non lo sappiamo», e i campi dell'app restano null — mai 0.

import { famiglia } from './attribuzione.mjs';
import { canaleIscritto } from './riassunto.mjs';
import { spostato } from './cruscotto.mjs';
import { frasi } from './osservazioni.mjs';

/** Somma che ignora i null; se sono tutti null, il totale è null. */
const somma = (righe, campo) => {
  let t = null;
  for (const r of righe ?? []) if (r[campo] != null) t = (t ?? 0) + r[campo];
  return t;
};
const sommaApp = (app, campo) => (app ? somma(app.giorni, campo) ?? 0 : null);

export function totali(archivio, app) {
  return {
    visite: somma(archivio.serie, 'visite'),
    pagineViste: somma(archivio.serie, 'pagineViste'),
    clic: somma(archivio.serie, 'clic'),
    impressioni: somma(archivio.serie, 'impressioni'),
    iscritti: sommaApp(app, 'iscritti'),
    nuoviPro: sommaApp(app, 'nuoviPro'),
    nuoviPaganti: sommaApp(app, 'nuoviPaganti'),
    ricavoMensileCentesimi: app?.totali?.ricavoMensileCentesimi ?? null,
  };
}

/** Un elemento per OGNI giorno dell'intervallo: i giorni senza riga in
 *  storico sono buchi (null), e il grafico li disegna come buchi. */
export function serie({ da, a }, archivio, app) {
  const perGiorno = new Map(archivio.serie.map((r) => [r.giorno, r]));
  const dellApp = new Map((app?.giorni ?? []).map((r) => [r.giorno, r]));
  const fuori = [];
  for (let g = da; g <= a; g = spostato(g, 1)) {
    const r = perGiorno.get(g);
    const x = dellApp.get(g);
    fuori.push({
      giorno: g,
      visite: r?.visite ?? null,
      pagineViste: r?.pagineViste ?? null,
      clic: r?.clic ?? null,
      impressioni: r?.impressioni ?? null,
      posizione: r?.posizione ?? null,
      iscritti: app ? x?.iscritti ?? 0 : null,
      nuoviPro: app ? x?.nuoviPro ?? 0 : null,
      nuoviPaganti: app ? x?.nuoviPaganti ?? 0 : null,
    });
  }
  return fuori;
}

export function canali(archivio, app) {
  const m = new Map();
  const di = (f) => {
    if (!m.has(f)) m.set(f, { famiglia: f, pagineViste: 0, visiteUtm: 0, iscritti: app ? 0 : null, paganti: app ? 0 : null });
    return m.get(f);
  };
  for (const p of archivio.provenienze) di(famiglia(p.host)).pagineViste += p.viste ?? 0;
  for (const v of archivio.visiteUtm) di(famiglia(v.sorgente)).visiteUtm += v.n;
  for (const c of app?.coorte ?? []) {
    const r = di(canaleIscritto(c));
    r.iscritti += c.iscritti ?? 0;
    r.paganti += c.paganti ?? 0;
  }
  return [...m.values()].sort((a, b) => b.pagineViste - a.pagineViste || b.visiteUtm - a.visiteUtm || a.famiglia.localeCompare(b.famiglia));
}

const chiaveCampagna = (r) => [r.sorgente ?? '', r.mezzo ?? '', r.campagna ?? ''].join('\u0000');

/** Solo visite con UTM veri (mezzo o campagna): un referrer da solo non è una
 *  campagna. Gli UTM interni «sito» dell'app dicono quale bottone, non quale
 *  campagna, e qui non entrano. */
export function campagne(archivio, app) {
  const m = new Map();
  const di = (r) => {
    const k = chiaveCampagna(r);
    if (!m.has(k)) m.set(k, { sorgente: r.sorgente ?? null, mezzo: r.mezzo ?? null, campagna: r.campagna ?? null, visite: 0, iscritti: app ? 0 : null, paganti: app ? 0 : null });
    return m.get(k);
  };
  for (const v of archivio.visiteUtm) {
    if (v.mezzo == null && v.campagna == null) continue;
    di(v).visite += v.n;
  }
  for (const c of app?.coorte ?? []) {
    if (c.sorgente === 'sito' || (c.mezzo == null && c.campagna == null)) continue;
    const r = di(c);
    r.iscritti += c.iscritti ?? 0;
    r.paganti += c.paganti ?? 0;
  }
  return [...m.values()].sort((a, b) => b.visite - a.visite || (b.iscritti ?? 0) - (a.iscritti ?? 0) || chiaveCampagna(a).localeCompare(chiaveCampagna(b)));
}

const NOMI_GRADINI = ['Visite', 'Iscrizioni', 'Attivazione', 'Pro', 'Pagante'];

export function imbuto(archivio, app, visite) {
  if (!app) return null;
  const gradini = (v, righe) => {
    const s = (campo) => righe.reduce((t, c) => t + (c[campo] ?? 0), 0);
    return [v, s('iscritti'), s('attivati'), s('pro'), s('paganti')].map((valore, i) => ({ nome: NOMI_GRADINI[i], valore }));
  };
  const visitePerCanale = new Map();
  for (const v of archivio.visiteUtm) {
    const f = famiglia(v.sorgente);
    visitePerCanale.set(f, (visitePerCanale.get(f) ?? 0) + v.n);
  }
  const perCanale = {};
  const gruppi = new Map();
  for (const c of app.coorte ?? []) {
    const f = canaleIscritto(c);
    if (!gruppi.has(f)) gruppi.set(f, []);
    gruppi.get(f).push(c);
  }
  for (const [f, righe] of gruppi) perCanale[f] = gradini(visitePerCanale.get(f) ?? null, righe);
  return {
    gradini: gradini(visite, app.coorte ?? []),
    perCanale,
    medianaGiorniAlPagamento: app.medianaGiorniAlPagamento ?? null,
  };
}

/** Pagine viste spesso su Google e cliccate poco: dove un titolo migliore
 *  rende di più. «Poco» = CTR sotto la mediana delle pagine del sito. */
export function occasioni(pagine) {
  const ctr = (p) => (p.impressioni ? p.clic / p.impressioni : 0);
  const valori = pagine.filter((p) => p.impressioni > 0).map(ctr).sort((a, b) => a - b);
  if (!valori.length) return [];
  const n = valori.length;
  const mediana = n % 2 ? valori[(n - 1) / 2] : (valori[n / 2 - 1] + valori[n / 2]) / 2;
  return pagine
    .filter((p) => p.impressioni >= 100 && (ctr(p) < mediana || (mediana === 0 && p.clic === 0)))
    .sort((a, b) => b.impressioni - a.impressioni)
    .slice(0, 10)
    .map((p) => ({ ...p, ctr: ctr(p) }));
}

const misure = (archivio, t, c) => ({
  visite: t.visite,
  iscritti: t.iscritti,
  clic: t.clic,
  canali: c.map(({ famiglia: f, pagineViste }) => ({ famiglia: f, pagineViste })),
  query: archivio.query,
  pagine: archivio.pagineRicerca,
});

export function componi({ intervallo, precedente, archivio, archivioPrecedente, novita, stato, oggi, app, appPrecedente, fonti, generato }) {
  const dati = app?.stato === 'ok' ? app.dati : null;
  const datiPrima = appPrecedente?.stato === 'ok' ? appPrecedente.dati : null;
  const t = totali(archivio, dati);
  const tPrima = archivioPrecedente ? totali(archivioPrecedente, datiPrima) : null;
  const c = canali(archivio, dati);
  const cPrima = archivioPrecedente ? canali(archivioPrecedente, datiPrima) : null;

  return {
    generato,
    periodo: { nome: intervallo.periodo, da: intervallo.da, a: intervallo.a, giorni: intervallo.giorni },
    precedente: precedente ? { da: precedente.da, a: precedente.a } : null,
    fonti,
    oggi,
    serie: serie(intervallo, archivio, dati),
    seriePrecedente: archivioPrecedente ? serie(precedente, archivioPrecedente, datiPrima) : null,
    totali: t,
    totaliPrecedente: tPrima,
    canali: c,
    campagne: campagne(archivio, dati),
    visiteUtm: archivio.visiteUtm,
    pagine: archivio.pagine,
    paesi: archivio.paesi,
    ricerca: {
      query: archivio.query.slice(0, 25),
      pagine: archivio.pagineRicerca.slice(0, 25),
      occasioni: occasioni(archivio.pagineRicerca),
    },
    indice: stato.indice,
    imbuto: imbuto(archivio, dati, t.visite),
    salute: stato.salute,
    primi: stato.primi,
    osservazioni: frasi({
      giorni: intervallo.giorni,
      attuale: misure(archivio, t, c),
      precedente: archivioPrecedente ? misure(archivioPrecedente, tPrima, cPrima) : null,
      novita,
      indice: stato.indice,
    }),
  };
}
