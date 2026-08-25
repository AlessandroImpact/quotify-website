#!/usr/bin/env node
// Genera i dati strutturati JSON-LD della home a partire dal contenuto VISIBILE di dist/index.html.
// docs/console-sito-piano.md §10: dati strutturati che divergono dal contenuto sono un danno,
// non un vantaggio. Estraendoli dal DOM la divergenza è impossibile per costruzione.
// Uso: node scripts/seo/jsonld.mjs [dist]

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { CONFIG } from './lib.mjs';

const distDir = process.argv[2] || 'dist';
const file = join(distDir, 'index.html');
const O = CONFIG.origin;

const html = readFileSync(file, 'utf8');
const root = parse(html);
const pulisci = (t) => (t || '').replace(/\s+/g, ' ').trim();

function fatale(msg) {
  console.error(`❌ jsonld: ${msg}`);
  console.error('   Il markup della home è cambiato: aggiornare i selettori qui, non disattivare il passo.');
  process.exit(1);
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
const faq = root.querySelectorAll('.faq-item').map((item) => ({
  domanda: pulisci(item.querySelector('.faq-btn span')?.structuredText),
  risposta: pulisci(item.querySelector('.faq-content p')?.structuredText),
}));
if (!faq.length || faq.some((f) => !f.domanda || !f.risposta)) fatale('FAQ non estraibili da .faq-item');

// ── Prezzi ───────────────────────────────────────────────────────────────────
const piani = root.querySelectorAll('.pricing-card').map((card) => {
  const nome = pulisci(card.querySelector('.uppercase')?.structuredText);
  const grezzo = pulisci(card.querySelector('.text-5xl')?.structuredText); // es. "€ 6,99/mese"
  const m = grezzo.match(/€\s*([\d.,]+)/);
  return { nome, prezzo: m ? m[1].replace(/\./g, '').replace(',', '.') : null };
});
if (!piani.length || piani.some((p) => !p.nome || p.prezzo === null)) fatale('prezzi non estraibili da .pricing-card');

// ── Grafo ────────────────────────────────────────────────────────────────────
const grafo = [
  {
    '@type': 'Organization',
    '@id': `${O}/#organization`,
    name: 'Quotify',
    url: `${O}/`,
    logo: { '@type': 'ImageObject', url: `${O}/pwa-512x512.png`, width: 512, height: 512 },
    vatID: 'IT10838411212',
    address: { '@type': 'PostalAddress', addressLocality: 'Milano', addressCountry: 'IT' },
    areaServed: { '@type': 'Country', name: 'Italia' },
  },
  {
    '@type': 'WebSite',
    '@id': `${O}/#website`,
    url: `${O}/`,
    name: 'Quotify',
    inLanguage: 'it-IT',
    publisher: { '@id': `${O}/#organization` },
  },
  {
    '@type': 'SoftwareApplication',
    '@id': `${O}/#software`,
    name: 'Quotify',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Fatturazione elettronica e gestione preventivi',
    operatingSystem: 'Web, iOS, Android',
    inLanguage: 'it-IT',
    url: `${O}/`,
    publisher: { '@id': `${O}/#organization` },
    description: pulisci(root.querySelector('meta[name="description"]')?.getAttribute('content')),
    offers: piani.map((p) => ({
      '@type': 'Offer',
      name: p.nome,
      price: p.prezzo,
      priceCurrency: 'EUR',
      category: p.prezzo === '0' ? 'free' : 'subscription',
      url: `${O}/#prezzi`,
      availability: 'https://schema.org/InStock',
    })),
  },
  {
    '@type': 'FAQPage',
    '@id': `${O}/#faq`,
    inLanguage: 'it-IT',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.domanda,
      acceptedAnswer: { '@type': 'Answer', text: f.risposta },
    })),
  },
];

const blocco = `<script type="application/ld+json">${JSON.stringify(
  { '@context': 'https://schema.org', '@graph': grafo }
)}</script>`;

if (html.includes('application/ld+json')) fatale('dist/index.html contiene già un blocco JSON-LD');
writeFileSync(file, html.replace('</head>', `    ${blocco}\n  </head>`), 'utf8');

console.log(`✔ JSON-LD generato: Organization, WebSite, SoftwareApplication (${piani.length} offerte: ${piani
  .map((p) => `${p.nome} €${p.prezzo}`).join(', ')}), FAQPage (${faq.length} domande)`);
