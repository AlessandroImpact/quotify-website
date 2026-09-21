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
/**
 * La persona che risponde dei contenuti.
 *
 * NON dichiara alcuna qualifica: Alessandro non è un commercialista e il sito
 * non lo afferma da nessuna parte. `knowsAbout` descrive gli argomenti che
 * tratta, che è un'altra cosa da un titolo professionale.
 */
function persona() {
  return {
    '@type': 'Person',
    '@id': `${O}/#autore`,
    name: 'Alessandro Terracciano',
    url: `${O}/chi-siamo`,
    email: 'info@quotify.it',
    worksFor: { '@id': `${O}/#organization` },
    knowsAbout: [
      'Regime forfettario',
      'Fatturazione elettronica',
      'Sistema di Interscambio',
      'Imposta sostitutiva',
      'Contributi INPS per lavoratori autonomi',
    ],
  };
}

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

function grafoArticolo(root) {
  const faq = estraiFaq(root);
  const meta = (nome) => root.querySelector(`meta[name="${nome}"]`)?.getAttribute('content')?.trim();
  const url = root.querySelector('link[rel="canonical"]')?.getAttribute('href');

  if (!url) fatale('articolo: manca il canonical, da cui si ricava @id');
  const pubblicato = meta('quotify:pubblicato');
  const revisionato = meta('quotify:revisionato');
  if (!pubblicato || !revisionato) fatale('articolo: mancano quotify:pubblicato o quotify:revisionato');

  const titolo = pulisci(root.querySelector('h1')?.structuredText) ||
    pulisci(root.querySelector('title')?.structuredText);

  const grafo = [
    organizzazione(),
    persona(),
    {
      '@type': 'Article',
      '@id': `${url}#articolo`,
      headline: titolo,
      description: pulisci(root.querySelector('meta[name="description"]')?.getAttribute('content')),
      inLanguage: 'it-IT',
      datePublished: pubblicato,
      dateModified: revisionato,
      // L'autore È una persona (cambio del 2026-09-21).
      //
      // La decisione del 2026-09-03 era «l'organizzazione, perché nessuno ha
      // una qualifica fiscale da rivendicare». Confondeva due cose diverse:
      // dichiarare un AUTORE non è rivendicare una QUALIFICA. Su materia
      // fiscale Google chiede chi risponde di quello che è scritto, e
      // un'organizzazione è un'entità senza faccia. La qualifica continuiamo a
      // non dichiararla, perché non c'è; la responsabilità sì, perché c'è.
      author: { '@id': `${O}/#autore` },
      publisher: { '@id': `${O}/#organization` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      isAccessibleForFree: true,
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#briciole`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Quotify', item: `${O}/` },
        { '@type': 'ListItem', position: 2, name: titolo, item: url },
      ],
    },
  ];

  if (faq.length) {
    if (faq.some((f) => !f.domanda || !f.risposta)) fatale('articolo: FAQ incomplete in [data-faq]');
    grafo.splice(2, 0, {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: 'it-IT',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.domanda,
        acceptedAnswer: { '@type': 'Answer', text: f.risposta },
      })),
    });
  }

  return grafo;
}

function grafoGuide(root) {
  const url = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!url) fatale('guide: manca il canonical, da cui si ricava @id');

  // L'elenco si legge dal contenuto VISIBILE, non da un registro a parte: è la
  // stessa regola di tutto il resto del file. Se una voce sparisce dalla
  // pagina, sparisce anche dai dati strutturati, senza che nessuno se ne
  // debba ricordare.
  const voci = root.querySelectorAll('.voce-a').map((a, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: pulisci(a.querySelector('.voce-titolo')?.structuredText),
    url: `${O}${a.getAttribute('href')}`,
  }));
  if (!voci.length) fatale('guide: nessuna voce estraibile da .voce-a');

  const grafo = [
    organizzazione(),
    {
      '@type': 'CollectionPage',
      '@id': `${url}#raccolta`,
      name: pulisci(root.querySelector('h1')?.structuredText),
      description: pulisci(root.querySelector('meta[name="description"]')?.getAttribute('content')),
      url,
      inLanguage: 'it-IT',
      isPartOf: { '@id': `${O}/#website` },
      publisher: { '@id': `${O}/#organization` },
      mainEntity: { '@id': `${url}#elenco` },
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#elenco`,
      numberOfItems: voci.length,
      itemListOrder: 'https://schema.org/ItemListUnordered',
      itemListElement: voci,
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#briciole`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Quotify', item: `${O}/` },
        { '@type': 'ListItem', position: 2, name: 'Guide', item: url },
      ],
    },
  ];

  const faq = estraiFaq(root);
  if (faq.length) {
    if (faq.some((f) => !f.domanda || !f.risposta)) fatale('guide: FAQ incomplete in [data-faq]');
    grafo.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: 'it-IT',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.domanda,
        acceptedAnswer: { '@type': 'Answer', text: f.risposta },
      })),
    });
  }

  return grafo;
}

/** La pagina che presenta chi risponde dei contenuti. AboutPage è il tipo
 *  che Google associa a «chi siamo», e il mainEntity è la persona. */
function grafoChiSiamo(root) {
  const url = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!url) fatale('chisiamo: manca il canonical');
  return [
    organizzazione(),
    persona(),
    {
      '@type': 'AboutPage',
      '@id': url,
      url,
      name: pulisci(root.querySelector('h1')?.structuredText),
      description: pulisci(root.querySelector('meta[name="description"]')?.getAttribute('content')),
      inLanguage: 'it-IT',
      mainEntity: { '@id': `${O}/#autore` },
      isPartOf: { '@id': `${O}/#website` },
    },
  ];
}

const COSTRUTTORI = { home: grafoHome, calcolatore: grafoCalcolatore, articolo: grafoArticolo, guide: grafoGuide, chisiamo: grafoChiSiamo };

const { pagine } = caricaPagine(distDir);
let generati = 0;

for (const pag of pagine) {
  const dichiarato = pag.root.querySelector('body')?.getAttribute('data-jsonld');
  // Nessuna eccezione per la home: dichiara anche lei, come tutte. Un caso
  // speciale nel codice è un caso che il gate non può controllare.
  const nome = dichiarato ?? null;
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
