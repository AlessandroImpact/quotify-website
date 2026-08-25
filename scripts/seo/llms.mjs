#!/usr/bin/env node
// Genera dist/llms.txt dalle pagine reali del build — docs/console-sito-piano.md §10.2.
// Scritto a mano divergerebbe dal sito entro un mese; generato, non può.
// Uso: node scripts/seo/llms.mjs [dist]

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { CONFIG, caricaPagine } from './lib.mjs';

const distDir = process.argv[2] || 'dist';
const O = CONFIG.origin;
const { pagine } = caricaPagine(distDir);
const pulisci = (t) => (t || '').replace(/\s+/g, ' ').trim();

const home = pagine.find((p) => p.url === '/');
if (!home) { console.error('❌ llms: dist/index.html non trovato'); process.exit(1); }

// Prezzi e FAQ dal DOM, come per il JSON-LD: una sola fonte di verità.
const piani = home.root.querySelectorAll('.pricing-card').map((c) => ({
  nome: pulisci(c.querySelector('.uppercase')?.structuredText),
  prezzo: pulisci(c.querySelector('.text-5xl')?.structuredText),
  claim: pulisci(c.querySelector('p.text-slate-500')?.structuredText),
}));
const faq = home.root.querySelectorAll('.faq-item').map((i) => ({
  d: pulisci(i.querySelector('.faq-btn span')?.structuredText),
  r: pulisci(i.querySelector('.faq-content p')?.structuredText),
}));

const indicizzabili = pagine
  .filter((p) => !/noindex/i.test(p.root.querySelector('meta[name="robots"]')?.getAttribute('content') || ''))
  .sort((a, b) => (a.url === '/' ? -1 : b.url === '/' ? 1 : a.url.localeCompare(b.url)));

const oggi = new Date().toISOString().slice(0, 10);

const out = `# Quotify

> ${pulisci(home.root.querySelector('meta[name="description"]')?.getAttribute('content'))}

Quotify è un gestionale web e mobile per freelance e professionisti italiani che operano in
Regime Forfettario. Copre preventivi, fatturazione elettronica verso il Sistema di Interscambio
(SDI) dell'Agenzia delle Entrate, gestione progetti e monitoraggio fiscale.

- Mercato: esclusivamente Italia; interfaccia e assistenza solo in lingua italiana.
- Destinatari: partite IVA in Regime Forfettario. Il regime ordinario non è supportato.
- Applicazione: ${O.replace('https://', 'https://app.')} — questo sito è la pagina di presentazione.
- Dati aggiornati al: ${oggi}

## Prezzi

${piani.map((p) => `- **${p.nome}** — ${p.prezzo}${p.claim ? `. ${p.claim}` : ''}`).join('\n')}

## Pagine

${indicizzabili.map((p) => {
  const t = pulisci(p.root.querySelector('title')?.structuredText);
  const d = pulisci(p.root.querySelector('meta[name="description"]')?.getAttribute('content'));
  return `- [${t}](${O}${p.url}): ${d}`;
}).join('\n')}

## Domande frequenti

${faq.map((f) => `### ${f.d}\n\n${f.r}`).join('\n\n')}

## Contatti

- Assistenza: ${O}/assistenza
- Sede: Milano, Italia — P.IVA IT10838411212
`;

writeFileSync(join(distDir, 'llms.txt'), out, 'utf8');
console.log(`✔ llms.txt generato: ${indicizzabili.length} pagine, ${piani.length} piani, ${faq.length} FAQ, ${out.length} byte`);
