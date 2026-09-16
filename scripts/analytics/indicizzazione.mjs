#!/usr/bin/env node
// Stato di indicizzazione di ogni pagina del sito.
//
// È la domanda che nessun altro strumento risponde: non «quanto traffico fa»
// ma «Google sa che questa pagina esiste?». Senza risposta positiva qui, ogni
// altra metrica è rumore — una guida che Google non ha mai visto non può
// ricevere visite, per quanto sia scritta bene.
//
// Sta a parte dal cruscotto perché è un lavoro a LOTTI: circa due secondi per
// URL e una quota giornaliera. Non si può chiamare a ogni apertura di pagina.
//
// Ogni esecuzione aggiunge una fotografia a cruscotto/indicizzazione.json, così
// si vede il movimento nel tempo invece di un singolo istante.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statoUrl, chiaveDisponibile } from './searchconsole.mjs';

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STORICO = resolve(RADICE, 'cruscotto/indicizzazione.json');

if (!chiaveDisponibile()) {
  console.error('\n  Chiave di Search Console non trovata in ~/.config/quotify/\n');
  process.exit(1);
}

const urls = [...readFileSync(resolve(RADICE, 'public/sitemap.xml'), 'utf8')
  .matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

console.log(`\n  ${urls.length} pagine da controllare, circa due secondi ciascuna…\n`);

const esiti = [];
for (const u of urls) {
  try {
    const r = await statoUrl(u);
    esiti.push(r);
    const breve = u.replace('https://quotify.it', '') || '/';
    console.log(`  ${breve.padEnd(44)} ${r.stato.padEnd(42)} ${r.ultimaScansione ?? ''}`);
  } catch (e) {
    esiti.push({ url: u, stato: `errore: ${e.message}`, ultimaScansione: null });
    console.log(`  ${u.replace('https://quotify.it', '').padEnd(44)} errore: ${e.message}`);
  }
}

const per = {};
for (const e of esiti) per[e.stato] = (per[e.stato] ?? 0) + 1;
console.log('\n  riepilogo:');
for (const [s, n] of Object.entries(per).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(n).padStart(3)}  ${s}`);
}

// Lo storico: una riga per esecuzione. Il confronto con la volta prima è la
// cosa che dice se stiamo andando avanti, e un singolo controllo non lo può dire.
mkdirSync(dirname(STORICO), { recursive: true });
const storico = existsSync(STORICO) ? JSON.parse(readFileSync(STORICO, 'utf8')) : [];
const quando = new Date().toISOString().slice(0, 16).replace('T', ' ');
storico.push({ quando, riepilogo: per, pagine: esiti });
writeFileSync(STORICO, JSON.stringify(storico, null, 2));

if (storico.length > 1) {
  const prima = storico[storico.length - 2];
  const indicizzate = (r) => Object.entries(r).filter(([k]) => /indicizzata/i.test(k) && !/non indicizzata/i.test(k))
    .reduce((s, [, v]) => s + v, 0);
  const delta = indicizzate(per) - indicizzate(prima.riepilogo);
  console.log(`\n  rispetto al ${prima.quando}: ${delta >= 0 ? '+' : ''}${delta} pagine indicizzate`);
}
console.log(`\n  fotografia ${storico.length} salvata in ${STORICO}\n`);
