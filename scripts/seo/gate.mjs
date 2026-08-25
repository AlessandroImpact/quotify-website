#!/usr/bin/env node
// Gate SEO di build — docs/console-sito-piano.md §5.
// Uso: node scripts/seo/gate.mjs [dist]
// Esce con codice 1 se c'è almeno un finding `error`. SEO_GATE=off lo disattiva.

import { existsSync } from 'node:fs';
import { caricaPagine } from './lib.mjs';
import { controllaPagina } from './rules-page.mjs';
import { controllaSito } from './rules-site.mjs';

const distDir = process.argv[2] || 'dist';
const json = process.argv.includes('--json');

if (process.env.SEO_GATE === 'off') {
  console.log('⚠️  SEO_GATE=off — gate SEO disattivato, il deploy passa senza controlli.');
  process.exit(0);
}

if (!existsSync(distDir)) {
  console.error(`❌ gate SEO: cartella "${distDir}" inesistente. Eseguire prima "vite build".`);
  process.exit(1);
}

const { pagine, tuttiIFile } = caricaPagine(distDir);
const ctx = { linkInterni: [], immaginiSocial: [] };

const findings = [
  ...pagine.flatMap((p) => controllaPagina(p, ctx)),
  ...controllaSito(distDir, pagine, tuttiIFile, ctx),
];

const errori = findings.filter((f) => f.level === 'error');
const avvisi = findings.filter((f) => f.level === 'warn');

if (json) {
  console.log(JSON.stringify({ distDir, pagine: pagine.length, errori, avvisi }, null, 2));
  process.exit(errori.length ? 1 : 0);
}

const COL = { error: '\x1b[31m', warn: '\x1b[33m', dim: '\x1b[2m', off: '\x1b[0m', bold: '\x1b[1m' };
const c = process.stdout.isTTY ? COL : Object.fromEntries(Object.keys(COL).map((k) => [k, '']));

function stampa(gruppo, titolo, colore) {
  if (!gruppo.length) return;
  console.log(`\n${colore}${c.bold}${titolo}${c.off}`);
  const perFile = new Map();
  for (const f of gruppo) (perFile.get(f.file) || perFile.set(f.file, []).get(f.file)).push(f);
  for (const [file, lista] of perFile) {
    console.log(`\n  ${c.bold}${file}${c.off}`);
    for (const f of lista) {
      const pos = f.line ? `:${f.line}` : '';
      console.log(`    ${colore}●${c.off} ${file}${pos} ${c.dim}—${c.off} ${f.message}  ${c.dim}[${f.rule}]${c.off}`);
      if (f.hint) console.log(`      ${c.dim}↳ ${f.hint}${c.off}`);
    }
  }
}

console.log(`\n${c.bold}Gate SEO${c.off} ${c.dim}— ${pagine.length} pagine, ${tuttiIFile.length} file in ${distDir}/${c.off}`);
stampa(errori, `✖ ${errori.length} errori — bloccano il deploy`, c.error);
stampa(avvisi, `▲ ${avvisi.length} avvisi — non bloccanti`, c.warn);

if (errori.length) {
  console.log(`\n${c.error}${c.bold}✖ Deploy bloccato: ${errori.length} errori.${c.off}`);
  console.log(`${c.dim}  Sblocco d'emergenza: SEO_GATE=off npm run build${c.off}\n`);
  process.exit(1);
}
console.log(`\n\x1b[32m${c.bold}✔ Gate SEO superato${c.off}${avvisi.length ? ` ${c.dim}(${avvisi.length} avvisi)${c.off}` : ''}\n`);
