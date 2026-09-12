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
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OSPITE = 'quotify.it';
const GIORNI = Number(process.argv[2]) || 30;

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

const num = (n) => n.toLocaleString('it-IT');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Le sorgenti grezze sono host: si raggruppano in famiglie, perché
// "google.com" e "www.google.it" sono la stessa risposta alla domanda
// «da dove arriva la gente».
function famiglia(host) {
  if (!host || host === '' || host === OSPITE) return 'Diretto o interno';
  if (/google\./.test(host)) return 'Ricerca Google';
  if (/bing\.|duckduckgo|ecosia|yahoo/.test(host)) return 'Altri motori';
  if (/facebook|instagram|linkedin|twitter|x\.com|t\.co|reddit/.test(host)) return 'Social';
  if (/chatgpt|openai|claude|perplexity|gemini/.test(host)) return 'Assistenti AI';
  return host;
}

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

  const [sintesi, perGiorno, pagine, sorgenti, paesi, dispositivi, browser, anomalie] = await Promise.all([
    chiedi('count sum{visits}', 1),
    chiedi('count dimensions{date}', 400),
    chiedi('count dimensions{requestPath}', 100),
    chiedi('count dimensions{refererHost}', 100),
    chiedi('count dimensions{countryName}', 60),
    chiedi('count dimensions{deviceType}', 10),
    chiedi('count dimensions{userAgentBrowser}', 20),
    // Righe con molte pagine viste e nessuna visita: non è navigazione umana.
    chiedi('count sum{visits} dimensions{date requestPath}', 200),
  ]);

  // Una visita è una sessione. Una pagina vista senza nessuna visita associata
  // vuol dire che nessuno ha iniziato una sessione: ricarichi automatici,
  // sonde, crawler che eseguono JavaScript. Vanno mostrati a parte, altrimenti
  // un solo giorno anomalo decide l'intero cruscotto.
  const sospette = anomalie
    .filter((r) => r.count >= 50 && (r.sum?.visits ?? 0) === 0)
    .sort((a, b) => b.count - a.count);
  const visteSospette = sospette.reduce((s, r) => s + r.count, 0);

  const viste = sintesi[0]?.count ?? 0;
  const visite = sintesi[0]?.sum?.visits ?? 0;
  const perVisita = visite ? (viste / visite).toFixed(1).replace('.', ',') : '—';

  const giorni = raggruppa(perGiorno, 'date').sort((a, b) => a[0].localeCompare(b[0]));
  const elencoPagine = raggruppa(pagine, 'requestPath');
  const elencoSorgenti = raggruppa(sorgenti, 'refererHost', famiglia);
  const elencoPaesi = raggruppa(paesi, 'countryName');
  const elencoDisp = raggruppa(dispositivi, 'deviceType');
  const elencoBrowser = raggruppa(browser, 'userAgentBrowser');

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
  td.pc{text-align:right;color:var(--tenue);font-variant-numeric:tabular-nums;padding-left:.75rem;width:3.5rem}
  .andamento{position:relative;height:120px;margin:.5rem 0}
  .col{position:absolute;bottom:0;background:var(--blu);border-radius:3px 3px 0 0}
  .assi{display:flex;justify-content:space-between;color:var(--tenue);font-size:.75rem}
  .nota{background:#236cef14;border:1px solid #236cef3d;border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.5rem;font-size:.875rem;color:#cfe0ff}
  .nota b{color:#fff}
  .vuoto{color:var(--tenue);margin:0}
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
  <b>Sono numeri campionati.</b> Nel piano gratuito Cloudflare misura una parte delle
  visite e moltiplica: per questo i conteggi sono sempre multipli di dieci. Vanno letti
  come ordini di grandezza e andamenti, non come conteggi esatti.
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

<section><h2>Pagine più viste</h2>${barre(elencoPagine.slice(0, 15), viste)}</section>

<div class="griglia">
  <section><h2>Da dove arrivano</h2>${barre(elencoSorgenti.slice(0, 10), viste)}</section>
  <section><h2>Paesi</h2>${barre(elencoPaesi.slice(0, 10), viste)}</section>
  <section><h2>Dispositivi</h2>${barre(elencoDisp, viste)}</section>
  <section><h2>Browser</h2>${barre(elencoBrowser.slice(0, 8), viste)}</section>
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
