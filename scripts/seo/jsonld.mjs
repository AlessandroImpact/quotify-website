#!/usr/bin/env node
// Genera i dati strutturati JSON-LD a partire dal contenuto VISIBILE delle pagine.
// docs/console-sito-piano.md §10: dati strutturati che divergono dal contenuto sono un danno,
// non un vantaggio. Estraendoli dal DOM la divergenza è impossibile per costruzione.
//
// Ogni pagina dichiara quale grafo vuole con <body data-jsonld="…">; index.html
// resta "home" anche senza dichiararlo, per non toccare ciò che già funziona.
// Uso: node scripts/seo/jsonld.mjs [dist]

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { CONFIG, caricaPagine } from './lib.mjs';

const distDir = process.argv[2] || 'dist';
const O = CONFIG.origin;
const pulisci = (t) => (t || '').replace(/\s+/g, ' ').trim();

// Estrazione condivisa: le FAQ si leggono allo stesso modo su ogni pagina.
function estraiFaq(root) {
  return root.querySelectorAll('[data-faq]').map((item) => ({
    domanda: pulisci(item.querySelector('[data-faq-q]')?.structuredText),
    risposta: pulisci(item.querySelector('[data-faq-a]')?.structuredText),
  }));
}

function fatale(msg) {
  console.error(`❌ jsonld: ${msg}`);
  console.error('   Il markup della home è cambiato: aggiornare i selettori qui, non disattivare il passo.');
  process.exit(1);
}

// L'entità Organization sta su OGNI pagina che dichiara un grafo, non solo in
// home. Un `publisher` che punta a un @id assente dalla pagina è un riferimento
// che il motore può non risolvere — e l'identità del marchio è l'obiettivo per
// cui questi dati esistono (docs/console-sito-piano.md §3, query di marca).
function organizzazione() {
  return (
  {
    '@type': 'Organization',
    '@id': `${O}/#organization`,
    name: 'Quotify',
    url: `${O}/`,
    logo: { '@type': 'ImageObject', url: `${O}/pwa-512x512.png`, width: 512, height: 512 },
    vatID: 'IT10838411212',
    email: 'info@quotify.it',
    address: { '@type': 'PostalAddress', addressLocality: 'Milano', addressCountry: 'IT' },
    areaServed: { '@type': 'Country', name: 'Italia' },
    // sameAs lega il dominio ai profili ufficiali: è il segnale con cui Google
    // capisce QUALE Quotify siamo, fra gli otto prodotti omonimi che esistono.
    // Verificati raggiungibili il 2026-09-03 prima di dichiararli.
    sameAs: [
      'https://www.instagram.com/quotifyita',
      'https://www.facebook.com/quotifyita',
    ],
  }
  );
}

function grafoHome(root) {
// ── FAQ ──────────────────────────────────────────────────────────────────────
const faq = estraiFaq(root);
if (!faq.length || faq.some((f) => !f.domanda || !f.risposta)) fatale('FAQ non estraibili da [data-faq]');

// ── Prezzi ───────────────────────────────────────────────────────────────────
const piani = root.querySelectorAll('[data-plan]').map((card) => {
  const nome = pulisci(card.querySelector('[data-plan-name]')?.structuredText);
  const grezzo = pulisci(card.querySelector('[data-plan-price]')?.structuredText); // es. "€ 6,99"
  const m = grezzo.match(/€\s*([\d.,]+)/);
  return { nome, prezzo: m ? m[1].replace(/\./g, '').replace(',', '.') : null };
});
if (!piani.length || piani.some((p) => !p.nome || p.prezzo === null)) fatale('prezzi non estraibili da [data-plan]');

// ── Grafo ────────────────────────────────────────────────────────────────────
const grafo = [
  organizzazione(),
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

return grafo;
}

function grafoCalcolatore(root) {
  const faq = estraiFaq(root);
  if (!faq.length || faq.some((f) => !f.domanda || !f.risposta)) {
    fatale('calcolatore: FAQ non estraibili da [data-faq]');
  }

  const url = `${O}/calcolo-tasse-forfettario`;

  // WebApplication e non SoftwareApplication: quest'ultimo è già dichiarato per
  // Quotify in home, e due entità dello stesso tipo sullo stesso sito
  // confondono l'associazione. Lo strumento è una cosa, il prodotto un'altra.
  return [
    organizzazione(),
    {
      '@type': 'WebApplication',
      '@id': `${url}#strumento`,
      name: 'Calcolo tasse regime forfettario',
      url,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      inLanguage: 'it-IT',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      description: pulisci(root.querySelector('meta[name="description"]')?.getAttribute('content')),
      publisher: { '@id': `${O}/#organization` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: 'it-IT',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.domanda,
        acceptedAnswer: { '@type': 'Answer', text: f.risposta },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#briciole`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Quotify', item: `${O}/` },
        { '@type': 'ListItem', position: 2, name: 'Calcolo tasse forfettario', item: url },
      ],
    },
  ];
}

const COSTRUTTORI = { home: grafoHome, calcolatore: grafoCalcolatore };

const { pagine } = caricaPagine(distDir);
let generati = 0;

for (const pag of pagine) {
  const dichiarato = pag.root.querySelector('body')?.getAttribute('data-jsonld');
  const nome = dichiarato ?? (pag.file === 'index.html' ? 'home' : null);
  if (!nome) continue;

  const costruttore = COSTRUTTORI[nome];
  if (!costruttore) fatale(`${pag.file} dichiara data-jsonld="${nome}", che non esiste`);

  const percorso = join(distDir, pag.file);
  const html = readFileSync(percorso, 'utf8');
  if (html.includes('application/ld+json')) fatale(`${pag.file} contiene già un blocco JSON-LD`);

  const blocco = `<script type="application/ld+json">${JSON.stringify(
    { '@context': 'https://schema.org', '@graph': costruttore(pag.root) }
  )}</script>`;

  writeFileSync(percorso, html.replace('</head>', `    ${blocco}\n  </head>`), 'utf8');
  console.log(`\u2714 JSON-LD "${nome}" \u2192 ${pag.file}`);
  generati += 1;
}

if (!generati) fatale('nessuna pagina ha prodotto dati strutturati');
