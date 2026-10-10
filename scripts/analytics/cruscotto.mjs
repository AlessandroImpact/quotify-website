#!/usr/bin/env node
// Cruscotto delle visite al sito — genera una pagina HTML autonoma.
//
// PERCHÉ ESISTE: la Panoramica di Cloudflare mostra il traffico di TUTTA la
// zona quotify.it, app.quotify.it compresa, bot inclusi. Quei numeri non
// dicono quanta gente legge il sito. Web Analytics invece misura solo dove
// c'è il beacon, cioè il sito: è già il dato pulito. Qui lo si tira fuori e
// lo si mette in una pagina leggibile.
//
// I dati NON finiscono mai in `dist/`: la pagina generata sta fuori dalla
// cartella che viene pubblicata, e il token non compare da nessuna parte
// nell'output.
//
// USO:  CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh && npm run cruscotto
//       npm run cruscotto -- 7     (ultimi 7 giorni invece di 30)

import { writeFileSync, mkdirSync } from 'node:fs';
import * as gsc from './searchconsole.mjs';
import { famiglia } from '../../lib/attribuzione.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OSPITE = 'quotify.it';
const GIORNI = Number(process.argv[2]) || 30;

const ZONA = '847d6d3fc9755fa9e34ea0fd4e1d7e0a';  // quotify.it
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) {
  console.error('\n  Mancano le credenziali Cloudflare.');
  console.error('  Esegui prima:  CF_ACCOUNT=personale source ~/vault/bin/cf-env.sh\n');
  process.exit(1);
}

const oggi = new Date();
const inizio = new Date(oggi.getTime() - GIORNI * 86400000);
const iso = (d) => d.toISOString().slice(0, 19) + 'Z';

// I Core Web Vitals stanno in un dataset PROPRIO, non in quello dei pageload:
// e' per questo che i nomi dei campi sembravano inesistenti finche' li si
// cercava nel posto sbagliato.
async function chiediVitals(selezione) {
  const query = `query($a:String!,$da:Time!,$b:Time!){viewer{accounts(filter:{accountTag:$a}){
    rumWebVitalsEventsAdaptiveGroups(limit:1,filter:{datetime_geq:$da,datetime_lt:$b,requestHost:"${OSPITE}"}){${selezione}}}}}`;
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { a: account, da: iso(inizio), b: iso(oggi) } }),
  });
  const d = await r.json();
  if (d.errors) throw new Error(d.errors.map((e) => e.message).join('; '));
  return d.data.viewer.accounts[0]?.rumWebVitalsEventsAdaptiveGroups?.[0] ?? null;
}

async function chiedi(selezione, limite = 100) {
  const query = `query($a:String!,$da:Time!,$b:Time!){viewer{accounts(filter:{accountTag:$a}){
    rumPageloadEventsAdaptiveGroups(limit:${limite},filter:{datetime_geq:$da,datetime_lt:$b,requestHost:"${OSPITE}"},orderBy:[count_DESC]){${selezione}}}}}`;
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { a: account, da: iso(inizio), b: iso(oggi) } }),
  });
  const d = await r.json();
  if (d.errors) throw new Error(d.errors.map((e) => e.message).join('; '));
  return d.data.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? [];
}

// Le due interrogazioni di ZONA. Servono a un'altra domanda: non «quanta
// gente legge» — quella la risponde Web Analytics — ma «quanto di questo
// dominio è il sito». Il resto è l'applicazione, e i bot.
async function chiediZona(corpo, variabili = {}) {
  const query = `query($z:String!${Object.keys(variabili).map((k) => `,$${k}:String!`).join('')}){viewer{zones(filter:{zoneTag:$z}){${corpo}}}}`;
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { z: ZONA, ...variabili } }),
  });
  const d = await r.json();
  if (d.errors) throw new Error(d.errors.map((e) => e.message).join('; '));
  return d.data.viewer.zones[0] ?? {};
}

// Il piano gratuito non concede finestre più larghe di un giorno sul dataset
// dettagliato: la divisione per hostname si chiede un giorno per volta.
async function ospitiPerGiorno(giorni) {
  const oggiUTC = new Date(Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth(), oggi.getUTCDate()));
  const richieste = Array.from({ length: giorni }, (_, i) => {
    const d = new Date(oggiUTC.getTime() - (i + 1) * 86400000);
    const a = d.toISOString().slice(0, 10);
    return chiediZona(
      `httpRequestsAdaptiveGroups(limit:40,filter:{datetime_geq:"${a}T00:00:00Z",datetime_lt:"${a}T23:59:59Z"},orderBy:[count_DESC]){count dimensions{clientRequestHTTPHost}}`
    ).then((z) => z.httpRequestsAdaptiveGroups ?? []).catch(() => []);
  });
  const tutti = (await Promise.all(richieste)).flat();
  const m = new Map();
  for (const r of tutti) {
    const h = (r.dimensions.clientRequestHTTPHost || '(vuoto)').replace(/:\d+$/, '');
    m.set(h, (m.get(h) || 0) + r.count);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const num = (n) => n.toLocaleString('it-IT');

// Le soglie sono quelle pubblicate da Google. Un numero da solo non dice
// niente a chi legge: 292 e' buono o pessimo? Il giudizio va accanto.
const SOGLIE = {
  lcp: { nome: 'LCP', desc: 'caricamento del contenuto principale', buono: 2500, medio: 4000, unita: 'ms' },
  fcp: { nome: 'FCP', desc: 'primo contenuto visibile', buono: 1800, medio: 3000, unita: 'ms' },
  cls: { nome: 'CLS', desc: 'stabilita del layout', buono: 0.1, medio: 0.25, unita: '' },
  inp: { nome: 'INP', desc: 'reattivita ai clic', buono: 200, medio: 500, unita: 'ms' },
  ttfb: { nome: 'TTFB', desc: 'risposta del server', buono: 800, medio: 1800, unita: 'ms' },
};
const giudizio = (v, s) => (v <= s.buono ? 'buono' : v <= s.medio ? 'migliorabile' : 'scarso');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function barre(righe, totale) {
  if (!righe.length) return '<p class="vuoto">Nessun dato nel periodo.</p>';
  return `<table>${righe.map(([k, v]) => {
    const pc = totale ? Math.round((v / totale) * 100) : 0;
    return `<tr><th scope="row">${esc(k)}</th><td class="q"><span class="riempi" style="width:${pc}%"></span></td>
      <td class="n">${num(v)}</td><td class="pc">${pc}%</td></tr>`;
  }).join('')}</table>`;
}

function raggruppa(dati, chiave, trasforma = (x) => x) {
  const m = new Map();
  for (const r of dati) {
    const k = trasforma(r.dimensions[chiave]);
    m.set(k, (m.get(k) || 0) + r.count);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function andamento(perGiorno) {
  if (!perGiorno.length) return '';
  const max = Math.max(...perGiorno.map(([, v]) => v)) || 1;
  const larg = 100 / perGiorno.length;
  return `<div class="andamento" role="img" aria-label="Pagine viste giorno per giorno">
    ${perGiorno.map(([d, v], i) => {
      const h = Math.max(2, (v / max) * 100);
      return `<span class="col" style="left:${i * larg}%;width:${larg * 0.72}%;height:${h}%" title="${d}: ${num(v)}"></span>`;
    }).join('')}
  </div>
  <div class="assi"><span>${perGiorno[0][0]}</span><span>${perGiorno.at(-1)[0]}</span></div>`;
}

const main = async () => {
  process.stdout.write(`  Interrogo Web Analytics per ${OSPITE}, ultimi ${GIORNI} giorni…\n`);

  const [sintesi, perGiorno, pagine, sorgenti, paesi, dispositivi, browser, sistemi, anomalie] = await Promise.all([
    chiedi('count sum{visits} avg{sampleInterval}', 1),
    chiedi('count dimensions{date}', 400),
    chiedi('count dimensions{requestPath}', 100),
    chiedi('count dimensions{refererHost}', 100),
    chiedi('count dimensions{countryName}', 60),
    chiedi('count dimensions{deviceType}', 10),
    chiedi('count dimensions{userAgentBrowser}', 20),
    chiedi('count dimensions{userAgentOS}', 20),
    // Righe con molte pagine viste e nessuna visita: non è navigazione umana.
    chiedi('count sum{visits} dimensions{date requestPath}', 200),
  ]);

  // Il confronto con la zona: opzionale, richiede il permesso analytics.
  let ospiti = [], zonaTot = 0, erroreZona = null;
  try {
    ospiti = await ospitiPerGiorno(7);
    zonaTot = ospiti.reduce((s, [, v]) => s + v, 0);
  } catch (e) { erroreZona = e.message; }

  // Una visita è una sessione. Una pagina vista senza nessuna visita associata
  // vuol dire che nessuno ha iniziato una sessione: ricarichi automatici,
  // sonde, crawler che eseguono JavaScript. Vanno mostrati a parte, altrimenti
  // un solo giorno anomalo decide l'intero cruscotto.
  const sospette = anomalie
    .filter((r) => r.count >= 50 && (r.sum?.visits ?? 0) === 0)
    .sort((a, b) => b.count - a.count);
  const visteSospette = sospette.reduce((s, r) => s + r.count, 0);

  // I Core Web Vitals stanno in un dataset proprio. Sono un fattore di
  // posizionamento, quindi vanno guardati anche quando il traffico è poco.
  let vitals = null;
  try {
    vitals = await chiediVitals(
      'count quantiles{largestContentfulPaintP75 firstContentfulPaintP75 cumulativeLayoutShiftP75 interactionToNextPaintP75 timeToFirstByteP75}');
  } catch { /* facoltativi: il cruscotto si genera comunque */ }

  // Search Console: l'unica fonte che dice COSA cercano e DOVE usciamo.
  let ricerca = null;
  if (gsc.chiaveDisponibile()) {
    const da = inizio.toISOString().slice(0, 10);
    const a = oggi.toISOString().slice(0, 10);
    try {
      const [tot, perPagina, perQuery, perData, sitemaps] = await Promise.all([
        gsc.totali({ da, a }),
        gsc.rendimento({ da, a, dimensioni: ['page'], righe: 20 }),
        gsc.rendimento({ da, a, dimensioni: ['query'], righe: 20 }),
        gsc.rendimento({ da, a, dimensioni: ['date'], righe: 400 }),
        gsc.sitemap(),
      ]);
      ricerca = { tot, perPagina, perQuery, perData, sitemaps };
    } catch (e) {
      ricerca = { errore: e.message };
    }
  }

  const viste = sintesi[0]?.count ?? 0;
  const visite = sintesi[0]?.sum?.visits ?? 0;
  const perVisita = visite ? (viste / visite).toFixed(1).replace('.', ',') : '—';
  // L'API dichiara ogni quanti eventi reali ne registra uno: e' la precisione
  // vera dei numeri qui sopra, e non va dedotta a occhio dai multipli.
  const campione = Math.round(sintesi[0]?.avg?.sampleInterval ?? 0);

  const giorni = raggruppa(perGiorno, 'date').sort((a, b) => a[0].localeCompare(b[0]));
  const elencoPagine = raggruppa(pagine, 'requestPath');
  const elencoSorgenti = raggruppa(sorgenti, 'refererHost', famiglia);
  const elencoPaesi = raggruppa(paesi, 'countryName');
  const elencoDisp = raggruppa(dispositivi, 'deviceType');
  const elencoBrowser = raggruppa(browser, 'userAgentBrowser');
  const elencoSistemi = raggruppa(sistemi, 'userAgentOS');

  const daRicerca = elencoSorgenti
    .filter(([k]) => k === 'Ricerca Google' || k === 'Altri motori')
    .reduce((s, [, v]) => s + v, 0);

  const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cruscotto — ${OSPITE}</title>
<style>
  :root{--fondo:#0b0f1a;--carta:#121826;--bordo:#e8edf71f;--testo:#e8edf7;--tenue:#e8edf78c;--blu:#236CEF;--verde:#34d399}
  *{box-sizing:border-box}
  body{margin:0;background:var(--fondo);color:var(--testo);font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:clamp(1.25rem,4vw,3rem)}
  .guscio{max-width:1080px;margin:0 auto}
  h1{font-size:clamp(1.5rem,4vw,2rem);margin:0 0 .25rem;letter-spacing:-.02em}
  .sotto{color:var(--tenue);margin:0 0 2rem;font-size:.9375rem}
  .cifre{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem}
  .cifra{background:var(--carta);border:1px solid var(--bordo);border-radius:16px;padding:1.25rem}
  .cifra b{display:block;font-size:2rem;font-weight:800;letter-spacing:-.03em;line-height:1.1}
  .cifra span{color:var(--tenue);font-size:.8125rem;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
  .cifra em{display:block;color:var(--tenue);font-style:normal;font-size:.8125rem;margin-top:.35rem}
  section{background:var(--carta);border:1px solid var(--bordo);border-radius:16px;padding:1.25rem 1.5rem;margin-bottom:1.25rem}
  h2{font-size:1rem;margin:0 0 1rem;letter-spacing:.02em}
  table{width:100%;border-collapse:collapse}
  th[scope=row]{text-align:left;font-weight:500;padding:.4rem .75rem .4rem 0;white-space:nowrap;max-width:22rem;overflow:hidden;text-overflow:ellipsis}
  td.q{width:50%}
  .riempi{display:block;height:8px;border-radius:99px;background:var(--blu);min-width:2px}
  td.n{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;padding-left:1rem}
  td.pc{text-align:right;color:var(--tenue);font-variant-numeric:tabular-nums;padding-left:.75rem;white-space:nowrap}
  td.n{white-space:nowrap}
  .andamento{position:relative;height:120px;margin:.5rem 0}
  .col{position:absolute;bottom:0;background:var(--blu);border-radius:3px 3px 0 0}
  .assi{display:flex;justify-content:space-between;color:var(--tenue);font-size:.75rem}
  .nota{background:#236cef14;border:1px solid #236cef3d;border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.5rem;font-size:.875rem;color:#cfe0ff}
  .nota b{color:#fff}
  .vuoto{color:var(--tenue);margin:0}
  .spiega{color:var(--tenue);font-size:.875rem;margin:0 0 1rem}
  h3{font-size:.8125rem;text-transform:uppercase;letter-spacing:.08em;color:var(--tenue);margin:1.5rem 0 .5rem}
  .vitali{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.75rem}
  .vitale{border:1px solid var(--bordo);border-radius:12px;padding:.875rem;border-left-width:3px}
  .vitale span{display:block;font-size:.75rem;font-weight:700;letter-spacing:.06em;color:var(--tenue)}
  .vitale b{display:block;font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:.15rem 0}
  .vitale em{display:block;font-style:normal;font-size:.75rem;color:var(--tenue)}
  .vitale i{display:block;font-style:normal;font-size:.6875rem;margin-top:.4rem;opacity:.75}
  .vitale.buono{border-left-color:var(--verde)} .vitale.buono b{color:var(--verde)}
  .vitale.migliorabile{border-left-color:#fbbf24} .vitale.migliorabile b{color:#fbbf24}
  .vitale.scarso{border-left-color:#f87171} .vitale.scarso b{color:#f87171}
  .spiega b{color:var(--testo)}
  .allarme{border-color:#f59e0b4d;background:#f59e0b12}
  .allarme h2{color:#fbbf24}
  .allarme p{color:var(--tenue);font-size:.875rem;margin:0 0 1rem}
  .allarme b{color:var(--testo)}
  .griglia{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem}
  footer{color:var(--tenue);font-size:.8125rem;margin-top:2rem}
</style></head><body><div class="guscio">

<h1>Cruscotto del sito</h1>
<p class="sotto">${OSPITE} · ultimi ${GIORNI} giorni · generato il ${oggi.toLocaleString('it-IT')}</p>

<div class="nota">
  <b>Cosa stai guardando.</b> Questi numeri vengono da Cloudflare Web Analytics, che conta
  solo le pagine dove è installato il beacon — cioè il sito. Non c'è dentro
  <b>app.quotify.it</b>, non ci sono i bot, non ci sono le chiamate alle API.
  È per questo che sono molto più bassi della Panoramica di Cloudflare: quella misura
  tutto il dominio, applicazione compresa.
  <br><br>
  <b>Sono numeri campionati.</b> Cloudflare ne registra uno ogni
  <b>${campione || '?'}</b> e moltiplica: un «${campione || 50}» qui sopra può essere
  <b>una sola visita vera</b>. Vanno letti come ordini di grandezza, mai come conteggi
  esatti. I dati di Google più sotto, invece, sono esatti.
</div>

<div class="cifre">
  <div class="cifra"><span>Visite</span><b>${num(visite)}</b><em>sessioni distinte — la cifra che conta</em></div>
  <div class="cifra"><span>Pagine viste</span><b>${num(viste)}</b><em>${perVisita} per visita${visteSospette ? `, di cui ${num(visteSospette)} senza sessione` : ''}</em></div>
  <div class="cifra"><span>Da motori di ricerca</span><b>${num(daRicerca)}</b><em>${viste ? Math.round((daRicerca / viste) * 100) : 0}% delle pagine viste</em></div>
  <div class="cifra"><span>Paesi</span><b>${num(elencoPaesi.length)}</b><em>${elencoPaesi[0] ? esc(elencoPaesi[0][0]) + ' in testa' : '—'}</em></div>
</div>

${sospette.length ? `<section class="allarme"><h2>Traffico che non è navigazione</h2>
  <p>Queste righe hanno molte pagine viste e <b>nessuna visita</b>: nessuno ha iniziato
  una sessione, quindi non è gente che legge. Di solito sono ricarichi automatici,
  sonde di controllo o crawler che eseguono JavaScript. Pesano
  <b>${viste ? Math.round((visteSospette / viste) * 100) : 0}%</b> del totale qui sopra.</p>
  <table>${sospette.slice(0, 6).map((r) => `<tr><th scope="row">${esc(r.dimensions.date)} · ${esc(r.dimensions.requestPath)}</th>
    <td class="n">${num(r.count)}</td><td class="pc">0 visite</td></tr>`).join('')}</table></section>` : ''}

<section><h2>Giorno per giorno</h2>${andamento(giorni)}</section>

${vitals?.quantiles ? `<section><h2>Core Web Vitals</h2>
  <p class="spiega">Misurati sui visitatori veri, non in laboratorio. Sono un fattore di
  posizionamento: contano anche quando il traffico è poco.</p>
  <div class="vitali">${(() => {
    const q = vitals.quantiles;
    const valori = [
      ['lcp', q.largestContentfulPaintP75 / 1000],
      ['fcp', q.firstContentfulPaintP75 / 1000],
      ['cls', q.cumulativeLayoutShiftP75],
      ['inp', q.interactionToNextPaintP75 / 1000],
      ['ttfb', q.timeToFirstByteP75 / 1000],
    ];
    return valori.filter(([, v]) => v != null && !Number.isNaN(v)).map(([k, v]) => {
      const s = SOGLIE[k]; const g = giudizio(v, s);
      const mostrato = s.unita === 'ms' ? `${Math.round(v)} ms` : v.toFixed(3).replace('.', ',');
      return `<div class="vitale ${g}"><span>${s.nome}</span><b>${mostrato}</b>
        <em>${s.desc}</em><i>${g} · soglia ${s.unita === 'ms' ? s.buono + ' ms' : String(s.buono).replace('.', ',')}</i></div>`;
    }).join('');
  })()}</div></section>` : ''}

${ricerca && !ricerca.errore ? `<section><h2>Google — rendimento nella ricerca</h2>
  <p class="spiega">Da Search Console. Risponde a una domanda che Cloudflare non può porre:
  <b>cosa cerca la gente</b> e <b>in che posizione usciamo</b>. Dati esatti, non campionati,
  conservati sedici mesi.</p>
  <div class="cifre">
    <div class="cifra"><span>Clic</span><b>${num(ricerca.tot.clic)}</b><em>da risultati di ricerca</em></div>
    <div class="cifra"><span>Impressioni</span><b>${num(ricerca.tot.impressioni)}</b><em>volte che siamo comparsi</em></div>
    <div class="cifra"><span>CTR</span><b>${(ricerca.tot.ctr * 100).toFixed(1).replace('.', ',')}%</b><em>clic su impressioni</em></div>
    <div class="cifra"><span>Posizione media</span><b>${ricerca.tot.posizione.toFixed(1).replace('.', ',')}</b><em>dove compariamo</em></div>
  </div>
  <h3>Pagine che compaiono</h3>
  ${ricerca.perPagina.length ? `<table>${ricerca.perPagina.slice(0, 12).map((r) => `<tr>
      <th scope="row">${esc(r.keys[0].replace('https://quotify.it', '') || '/')}</th>
      <td class="n">${r.clicks} clic</td><td class="n">${r.impressions} impr</td>
      <td class="pc">pos ${r.position.toFixed(1).replace('.', ',')}</td></tr>`).join('')}</table>`
    : '<p class="vuoto">Nessuna pagina è ancora comparsa nei risultati.</p>'}
  <h3>Ricerche che ci hanno trovato</h3>
  ${ricerca.perQuery.length ? `<table>${ricerca.perQuery.slice(0, 12).map((r) => `<tr>
      <th scope="row">${esc(r.keys[0])}</th>
      <td class="n">${r.clicks} clic</td><td class="n">${r.impressions} impr</td>
      <td class="pc">pos ${r.position.toFixed(1).replace('.', ',')}</td></tr>`).join('')}</table>`
    : `<p class="spiega">Nessuna ricerca visibile. <b>Non significa zero ricerche</b>: Google
       nasconde le query sotto una soglia di volume, per non rendere identificabile chi ha
       cercato. Con ${num(ricerca.tot.impressioni)} impressioni è il caso normale.</p>`}
  ${ricerca.sitemaps.length ? `<h3>Sitemap</h3><table>${ricerca.sitemaps.map((x) => `<tr>
      <th scope="row">${esc(x.percorso.replace('https://quotify.it', ''))}</th>
      <td class="n">${x.urlDichiarati} URL</td>
      <td class="pc">letta ${x.scaricata ?? 'mai'}</td>
      <td class="pc">${x.errori ? `<b style="color:#f87171">${x.errori} errori</b>` : 'nessun errore'}</td>
      </tr>`).join('')}</table>` : ''}
</section>` : ricerca?.errore ? `<section class="allarme"><h2>Google — non raggiungibile</h2>
  <p>${esc(ricerca.errore)}</p></section>` : ''}

<section><h2>Pagine più viste</h2>${barre(elencoPagine.slice(0, 15), viste)}</section>

${ospiti.length ? `<section><h2>Il sito dentro il dominio</h2>
  <p class="spiega">Richieste HTTP a tutta la zona <b>quotify.it</b> negli ultimi 7 giorni, divise
  per nome. È la scomposizione del numero che vedi nella Panoramica di Cloudflare: la maggior
  parte non è il sito. Qui dentro ci sono anche i bot e i file (immagini, fogli di stile),
  mentre il cruscotto qui sopra conta solo le pagine aperte da persone.</p>
  ${barre(ospiti.slice(0, 8), zonaTot)}
  <p class="spiega" style="margin-top:1rem">In totale <b>${num(zonaTot)}</b> richieste alla zona,
  contro <b>${num(viste)}</b> pagine viste sul sito: il rapporto dice quanto del traffico grezzo
  sia effettivamente lettura.</p></section>` : ''}

<div class="griglia">
  <section><h2>Da dove arrivano</h2>${barre(elencoSorgenti.slice(0, 10), viste)}</section>
  <section><h2>Paesi</h2>${barre(elencoPaesi.slice(0, 10), viste)}</section>
  <section><h2>Dispositivi</h2>${barre(elencoDisp, viste)}</section>
  <section><h2>Browser</h2>${barre(elencoBrowser.slice(0, 8), viste)}</section>
  <section><h2>Sistemi</h2>${barre(elencoSistemi.slice(0, 8), viste)}</section>
</div>

<footer>
  I Core Web Vitals non sono qui: i loro campi non sono esposti da questo token e
  restano nell'interfaccia Cloudflare. Search Console resta la fonte per le query di
  ricerca e le posizioni: misura solo i clic da Google, quindi è un sottoinsieme
  di quanto vedi qui.
</footer>
</div></body></html>`;

  mkdirSync(resolve(RADICE, 'cruscotto'), { recursive: true });
  const dove = resolve(RADICE, 'cruscotto/index.html');
  writeFileSync(dove, html);
  console.log(`\n  Visite ${num(visite)} · pagine viste ${num(viste)} · da ricerca ${num(daRicerca)}`);
  console.log(`  Scritto in ${dove}\n`);
};

main().catch((e) => { console.error('\n  Errore:', e.message, '\n'); process.exit(1); });
