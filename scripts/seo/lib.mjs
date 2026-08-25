// Utilità condivise fra il gate di build e (in futuro) il crawler di produzione.
// Vedi docs/console-sito-piano.md §2.1: le regole si scrivono una volta sola.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import { parse } from 'node-html-parser';

export const CONFIG = {
  origin: 'https://quotify.it',
  // Pagine escluse dal requisito "deve stare in sitemap": non sono contenuto indicizzabile.
  fuoriSitemap: ['404.html'],
  titleMin: 30,
  titleMax: 60,
  descMin: 70,
  descMax: 160,
  paroleMin: 300,
  assetMaxKB: 200,
};

/** Elenca ricorsivamente i file sotto `dir`, come path relativi con separatore POSIX. */
export function elencaFile(dir, base = dir) {
  const out = [];
  for (const nome of readdirSync(dir)) {
    const abs = join(dir, nome);
    if (statSync(abs).isDirectory()) out.push(...elencaFile(abs, base));
    else out.push(relative(base, abs).split(sep).join('/'));
  }
  return out;
}

/**
 * Path di file → URL servita da Cloudflare Pages (URL pulite, senza .html).
 * 'index.html' → '/'   'privacy.html' → '/privacy'   'a/index.html' → '/a'
 */
export function fileToUrl(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length);
  if (rel.endsWith('.html')) return '/' + rel.slice(0, -'.html'.length);
  return '/' + rel;
}

/**
 * URL interna → elenco di path di file che potrebbero servirla.
 * L'inverso di fileToUrl non è univoco: '/privacy' può essere privacy.html o privacy/index.html.
 */
export function urlToFileCandidati(urlPath) {
  const p = urlPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (p === '') return ['index.html'];
  if (p.includes('.')) return [p]; // ha già un'estensione: è un asset
  return [`${p}.html`, `${p}/index.html`];
}

/** Offset di carattere → numero di riga 1-based. */
export function rigaDi(html, offset) {
  if (typeof offset !== 'number') return null;
  let riga = 1;
  for (let i = 0; i < offset && i < html.length; i++) if (html[i] === '\n') riga++;
  return riga;
}

/** Riga del primo nodo restituito, o null. */
export function riga(html, nodo) {
  return nodo && Array.isArray(nodo.range) ? rigaDi(html, nodo.range[0]) : null;
}

/** Testo visibile: via script, style, noscript e commenti. */
export function testoVisibile(root) {
  const copia = parse(root.toString());
  copia.querySelectorAll('script, style, noscript, template').forEach((n) => n.remove());
  return copia.structuredText.replace(/\s+/g, ' ').trim();
}

export function contaParole(root) {
  const t = testoVisibile(root);
  return t ? t.split(' ').length : 0;
}

/** Carica e analizza tutte le pagine HTML di `distDir`. */
export function caricaPagine(distDir) {
  const tutti = elencaFile(distDir);
  return {
    tuttiIFile: tutti,
    pagine: tutti
      .filter((f) => f.endsWith('.html'))
      .map((f) => {
        const html = readFileSync(join(distDir, f), 'utf8');
        return { file: f, url: fileToUrl(f), html, root: parse(html, { comment: false }) };
      }),
  };
}

/** Estrae le <loc> da una sitemap XML, senza dipendenze: qui una regex basta ed è sicura. */
export function locSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

export function assoluto(href) {
  return /^https?:\/\//i.test(href || '');
}

export function esito(level, rule, file, line, message, hint) {
  return { level, rule, file, line, message, hint };
}

export { parse, posix };
