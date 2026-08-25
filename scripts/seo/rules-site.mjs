// Controlli che richiedono di vedere tutte le pagine insieme, o l'intero dist/.

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG, locSitemap, urlToFileCandidati, esito } from './lib.mjs';
import { verifica as verificaRobots } from './robots.mjs';

const E = 'error';
const W = 'warn';

export function controllaSito(distDir, pagine, tuttiIFile, ctx) {
  const f = [];
  const esiste = new Set(tuttiIFile);
  const servibile = (urlPath) => urlToFileCandidati(urlPath).some((c) => esiste.has(c));

  // ── link interni rotti ────────────────────────────────────────────────────
  for (const l of ctx.linkInterni) {
    if (l.href && !servibile(l.href)) {
      f.push(esito(E, 'link-interno-rotto', l.file, l.riga,
        `link a "${l.href}" — nessun file corrispondente in dist/ ("${l.testo}")`));
    }
  }

  // ── immagini social esistenti ───────────────────────────────────────────
  for (const im of ctx.immaginiSocial) {
    if (!im.url.startsWith(CONFIG.origin)) continue; // ospitata altrove: non possiamo verificarla
    const path = im.url.slice(CONFIG.origin.length);
    if (!servibile(path)) {
      f.push(esito(E, 'og-image-inesistente', im.file, im.riga,
        `${im.prop} punta a ${im.url}, che non esiste in dist/`,
        "L'anteprima social resterebbe vuota."));
    }
  }

  // ── sitemap ───────────────────────────────────────────────────────────────
  const sitemapFile = join(distDir, 'sitemap.xml');
  let inSitemap = new Set();
  if (!esiste.has('sitemap.xml')) {
    f.push(esito(E, 'sitemap-mancante', 'sitemap.xml', null, 'sitemap.xml assente da dist/'));
  } else {
    const loc = locSitemap(readFileSync(sitemapFile, 'utf8'));
    if (!loc.length) f.push(esito(E, 'sitemap-vuota', 'sitemap.xml', null, 'sitemap senza <loc>'));
    for (const u of loc) {
      if (!u.startsWith(CONFIG.origin)) {
        f.push(esito(E, 'sitemap-origine-errata', 'sitemap.xml', null,
          `<loc> fuori dall'origine ${CONFIG.origin}: ${u}`));
        continue;
      }
      const path = u.slice(CONFIG.origin.length) || '/';
      inSitemap.add(path.replace(/\/$/, '') || '/');
      if (!servibile(path)) {
        f.push(esito(E, 'sitemap-url-inesistente', 'sitemap.xml', null,
          `<loc> ${u} non ha un file corrispondente in dist/ — la sitemap promette un 404`));
      }
      const pag = pagine.find((p) => p.url === path);
      if (pag?.noindex) {
        f.push(esito(E, 'sitemap-url-noindex', 'sitemap.xml', null,
          `<loc> ${u} è in sitemap ma la pagina ha meta robots noindex`));
      }
    }
  }

  // ── pagine orfane ─────────────────────────────────────────────────────────
  for (const p of pagine) {
    if (p.noindex || CONFIG.fuoriSitemap.includes(p.file)) continue;
    if (!inSitemap.has(p.url.replace(/\/$/, '') || '/')) {
      f.push(esito(E, 'pagina-orfana', p.file, null,
        `pagina indicizzabile assente dalla sitemap (URL ${p.url})`,
        'O si aggiunge alla sitemap, o si marca noindex.'));
    }
  }

  // ── duplicati ─────────────────────────────────────────────────────────────
  for (const [campo, regola] of [['title', 'title-duplicato'], ['description', 'description-duplicata']]) {
    const visti = new Map();
    for (const p of pagine) {
      const v = p[campo];
      if (!v) continue;
      if (visti.has(v)) {
        f.push(esito(W, regola, p.file, null, `${campo} identico a ${visti.get(v)}: "${v.slice(0, 60)}…"`));
      } else visti.set(v, p.file);
    }
  }

  // ── peso degli asset ──────────────────────────────────────────────────────
  for (const rel of tuttiIFile) {
    if (rel.endsWith('.html')) continue;
    const kb = statSync(join(distDir, rel)).size / 1024;
    if (kb > CONFIG.assetMaxKB) {
      f.push(esito(W, 'asset-pesante', rel, null, `${kb.toFixed(0)} KB non compressi (soglia ${CONFIG.assetMaxKB} KB)`));
    }
  }

  // ── robots.txt: esprime davvero la politica decisa? ──────────────────────
  if (!esiste.has('robots.txt')) {
    f.push(esito(E, 'robots-mancante', 'robots.txt', null, 'robots.txt assente da dist/'));
  } else {
    for (const b of verificaRobots(readFileSync(join(distDir, 'robots.txt'), 'utf8'))) {
      f.push(b.problema === 'politica'
        ? esito(E, 'robots-politica', 'robots.txt', null,
            `${b.ua}: atteso ${b.atteso ? 'ammesso' : 'vietato'}, il file dice ${b.rfc ? 'ammesso' : 'vietato'}`,
            'La politica è in scripts/seo/robots.mjs (POLITICA).')
        : esito(E, 'robots-ordine', 'robots.txt', null,
            `${b.ua}: un crawler conforme a RFC 9309 legge "${b.rfc ? 'ammesso' : 'vietato'}", uno ingenuo "${b.ingenuo ? 'ammesso' : 'vietato'}"`,
            'Spostare il gruppo più specifico PRIMA di quello più generico.'));
    }
  }

  // ── file richiesti d'ufficio da browser e crawler ────────────────────────
  // Nessuno li dichiara, tutti li chiedono: se mancano sono 404 puri nei log.
  for (const atteso of ['favicon.ico', 'apple-touch-icon.png']) {
    if (!esiste.has(atteso)) {
      f.push(esito(W, 'file-atteso-mancante', atteso, null,
        `${atteso} assente: browser e crawler lo richiedono comunque, genera un 404`));
    }
  }

  // ── segreti finiti nel build (docs/console-sito-piano.md §13) ─────────────
  const spie = [
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chiave privata'],
    [/"private_key"\s*:/, 'campo private_key di un service account Google'],
    [/\bsk-[A-Za-z0-9]{20,}/, 'API key in stile sk-'],
    [/\bghp_[A-Za-z0-9]{30,}/, 'token GitHub'],
  ];
  for (const rel of tuttiIFile) {
    if (/\.(png|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf|mp4)$/i.test(rel)) continue;
    const testo = readFileSync(join(distDir, rel), 'utf8');
    for (const [re, cosa] of spie) {
      if (re.test(testo)) f.push(esito(E, 'segreto-in-dist', rel, null, `sembra contenere ${cosa}`));
    }
  }

  return f;
}
