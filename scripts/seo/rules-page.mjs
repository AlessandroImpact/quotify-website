// Controlli che si applicano a una singola pagina.
// `error` blocca il deploy, `warn` viene stampato e basta (docs/console-sito-piano.md §5.2).

import { CONFIG, riga, contaParole, assoluto, esito } from './lib.mjs';

const E = 'error';
const W = 'warn';

// Pagine che esistono per ragioni legali o di servizio, non per posizionarsi.
// Chiedere loro una query obiettivo sarebbe un falso positivo, e i falsi
// positivi sono ciò che fa spegnere i gate (docs/console-sito-piano.md §2.2).
// Tutto il resto è contenuto: una pagina nuova rientra QUI per difetto, così
// nessuno può pubblicare un articolo dimenticandosi di dire per cosa l'ha
// scritto. Vedi docs/calcolatore-forfettario-piano.md §9.
const PAGINE_DI_SERVIZIO = new Set([
  'index.html', 'privacy.html', 'cookie.html', 'termini.html', 'assistenza.html', '404.html',
]);

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Dopo quanti giorni una pagina che descrive una situazione IN CORSO va
// riguardata. Non è un blocco: è un promemoria. Una pagina così diventa falsa
// da sola, senza che nessuno tocchi niente.
const GIORNI_PRIMA_DI_RIVEDERE = 90;

/** @returns {Array} findings per la pagina */
export function controllaPagina(pag, ctx) {
  const f = [];
  const { root, html, file } = pag;
  const at = (nodo) => riga(html, nodo);
  const meta = (nome) => root.querySelector(`meta[name="${nome}"]`);
  const prop = (p) => root.querySelector(`meta[property="${p}"]`);

  const robots = (meta('robots')?.getAttribute('content') || '').toLowerCase();
  const isNoindex = robots.includes('noindex');
  pag.noindex = isNoindex;

  // ── lang ──────────────────────────────────────────────────────────────────
  const htmlEl = root.querySelector('html');
  if (!htmlEl?.getAttribute('lang')) {
    f.push(esito(E, 'lang-mancante', file, at(htmlEl), '<html> senza attributo lang',
      'Aggiungere lang="it": il mercato è solo italiano.'));
  }

  // ── title ─────────────────────────────────────────────────────────────────
  const titleEl = root.querySelector('title');
  const title = titleEl?.structuredText?.trim() || '';
  pag.title = title;
  if (!title) {
    f.push(esito(E, 'title-mancante', file, at(titleEl), '<title> assente o vuoto',
      'Senza title la pagina è inutilizzabile in SERP.'));
  } else if (title.length < CONFIG.titleMin || title.length > CONFIG.titleMax) {
    f.push(esito(W, 'title-lunghezza', file, at(titleEl),
      `<title> di ${title.length} caratteri (consigliati ${CONFIG.titleMin}-${CONFIG.titleMax})`));
  }

  // ── meta description ──────────────────────────────────────────────────────
  const descEl = meta('description');
  const desc = descEl?.getAttribute('content')?.trim() || '';
  pag.description = desc;
  if (!desc && !isNoindex) {
    f.push(esito(E, 'description-mancante', file, at(descEl), 'meta description assente o vuota',
      'Senza description Google genera lo snippet a caso dal contenuto.'));
  } else if (desc && (desc.length < CONFIG.descMin || desc.length > CONFIG.descMax)) {
    f.push(esito(W, 'description-lunghezza', file, at(descEl),
      `meta description di ${desc.length} caratteri (consigliati ${CONFIG.descMin}-${CONFIG.descMax})`));
  }

  // ── canonical ─────────────────────────────────────────────────────────────
  const canEl = root.querySelector('link[rel="canonical"]');
  const can = canEl?.getAttribute('href') || '';
  if (!canEl && isNoindex) {
    // Una pagina noindex non ha bisogno di canonical: non entra nell'indice.
  } else if (!canEl) {
    f.push(esito(E, 'canonical-mancante', file, null, 'link rel="canonical" assente',
      `Attesa: <link rel="canonical" href="${CONFIG.origin}${pag.url}" />`));
  } else if (!assoluto(can)) {
    f.push(esito(E, 'canonical-relativo', file, at(canEl), `canonical con URL relativo: "${can}"`,
      'Il canonical va sempre assoluto, altrimenti è ambiguo.'));
  } else if (can.replace(/\/$/, '') !== `${CONFIG.origin}${pag.url}`.replace(/\/$/, '')) {
    f.push(esito(W, 'canonical-diverso', file, at(canEl),
      `canonical "${can}" non coincide con l'URL servita "${CONFIG.origin}${pag.url}"`));
  }

  // ── h1 ────────────────────────────────────────────────────────────────────
  const h1 = root.querySelectorAll('h1');
  if (h1.length === 0) {
    f.push(esito(E, 'h1-mancante', file, null, 'nessun <h1> nella pagina'));
  } else if (h1.length > 1) {
    f.push(esito(E, 'h1-multiplo', file, at(h1[1]), `${h1.length} elementi <h1> (deve essercene uno)`));
  }

  // ── gerarchia heading ─────────────────────────────────────────────────────
  let prec = 0;
  for (const h of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const lv = Number(h.tagName[1]);
    if (prec && lv > prec + 1) {
      f.push(esito(W, 'heading-salto', file, at(h), `salto da h${prec} a h${lv}`));
    }
    prec = lv;
  }

  // ── immagini ──────────────────────────────────────────────────────────────
  for (const img of root.querySelectorAll('img')) {
    if (img.getAttribute('alt') === undefined) {
      f.push(esito(E, 'img-senza-alt', file, at(img),
        `<img src="${img.getAttribute('src') || '?'}"> senza attributo alt`,
        'alt="" è valido e corretto per le immagini decorative.'));
    }
  }

  // ── link ──────────────────────────────────────────────────────────────────
  for (const a of root.querySelectorAll('a')) {
    const href = a.getAttribute('href');
    const testo = a.structuredText.trim().slice(0, 40) || '(senza testo)';
    if (href === undefined) continue;
    if (href === '#' || href.trim() === '') {
      f.push(esito(E, 'link-morto', file, at(a), `link morto href="${href}" — "${testo}"`,
        'O punta a una pagina vera, o si toglie dal markup.'));
      continue;
    }
    if (a.getAttribute('target') === '_blank') {
      const rel = (a.getAttribute('rel') || '').toLowerCase();
      if (!rel.includes('noopener')) {
        f.push(esito(W, 'blank-senza-noopener', file, at(a), `target="_blank" senza rel="noopener" — "${testo}"`));
      }
    }
    // Link interni: la risoluzione contro dist/ la fa il controllo di sito.
    if (href.startsWith('/') && !href.startsWith('//')) {
      ctx.linkInterni.push({ file, riga: at(a), href: href.split('#')[0].split('?')[0], testo });
    }
  }

  // ── Open Graph ────────────────────────────────────────────────────────────
  for (const p of ['og:image', 'og:url']) {
    const el = prop(p);
    const v = el?.getAttribute('content') || '';
    if (el && p === 'og:image' && assoluto(v)) ctx.immaginiSocial.push({ file, riga: at(el), url: v, prop: p });
    if (el && !assoluto(v)) {
      f.push(esito(E, 'og-relativo', file, at(el), `${p} con URL relativo: "${v}"`,
        'Le specifiche Open Graph richiedono URL assolute: con una relativa non esce anteprima.'));
    }
  }
  if (!isNoindex) {
    const mancanti = ['og:title', 'og:description', 'og:url', 'og:type'].filter((p) => !prop(p));
    if (mancanti.length) {
      f.push(esito(W, 'og-incompleto', file, null, `Open Graph incompleto: manca ${mancanti.join(', ')}`));
    }
  }

  const tw = root.querySelector('meta[name="twitter:image"]');
  const twv = tw?.getAttribute('content') || '';
  if (tw && assoluto(twv)) ctx.immaginiSocial.push({ file, riga: at(tw), url: twv, prop: 'twitter:image' });

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const ld = root.querySelectorAll('script[type="application/ld+json"]');
  pag.jsonldTypes = [];
  for (const s of ld) {
    let dato;
    try {
      dato = JSON.parse(s.structuredText);
    } catch (e) {
      f.push(esito(E, 'jsonld-invalido', file, at(s), `JSON-LD non parsabile: ${e.message}`));
      continue;
    }
    const nodi = Array.isArray(dato) ? dato : dato['@graph'] || [dato];
    for (const n of nodi) {
      if (!n || !n['@type']) {
        f.push(esito(E, 'jsonld-senza-type', file, at(s), 'blocco JSON-LD senza @type'));
      } else {
        pag.jsonldTypes.push(...[].concat(n['@type']));
      }
    }
  }

  // ── volume di contenuto ───────────────────────────────────────────────────
  const parole = contaParole(root);
  pag.parole = parole;
  if (!isNoindex && parole < CONFIG.paroleMin) {
    f.push(esito(W, 'contenuto-scarso', file, null,
      `${parole} parole di testo visibile (soglia ${CONFIG.paroleMin})`));
  }

  // ── meta di misurazione ───────────────────────────────────────────────────
  // Perché fra sei mesi si possa rispondere a "questa pagina si posiziona per
  // quello per cui l'ho scritta, e da quando?" senza ricostruirlo a memoria.
  if (!isNoindex && !PAGINE_DI_SERVIZIO.has(file)) {
    const dichiarato = (nome) => (meta(`quotify:${nome}`)?.getAttribute('content') || '').trim();

    const query = dichiarato('query-obiettivo');
    if (!query) {
      f.push(esito(E, 'query-obiettivo-mancante', file, null,
        'pagina di contenuto senza <meta name="quotify:query-obiettivo">',
        'Dichiarare per quale ricerca è stata scritta: è la chiave con cui si misurerà se ha funzionato.'));
    }

    if (dichiarato('verifica-fiscale') !== 'verificata') {
      f.push(esito(E, 'verifica-fiscale-mancante', file, null,
        'contenuto fiscale non ancora verificato da una persona',
        'Impostare quotify:verifica-fiscale="verificata" dopo aver controllato ogni affermazione.'));
    }

    const date = ['pubblicato', 'revisionato'].map(dichiarato);
    if (date.some((d) => !DATA_ISO.test(d))) {
      f.push(esito(E, 'date-contenuto-mancanti', file, null,
        'quotify:pubblicato o quotify:revisionato assenti o non in formato AAAA-MM-GG',
        'Senza la data di pubblicazione, "si posiziona da quando?" resta senza risposta per sempre.'));
    }

    // Una pagina marcata "in evoluzione" descrive qualcosa che sta cambiando —
    // una norma in transitorio, una tabella non ancora aggiornata. Marcarla è
    // volontario: chiedere una revisione periodica a un articolo su una norma
    // stabile produrrebbe solo revisioni finte.
    if (dichiarato('in-evoluzione') && DATA_ISO.test(date[1])) {
      const oggi = ctx.oggi ?? new Date();
      const giorni = Math.floor((oggi - new Date(`${date[1]}T12:00:00Z`)) / 86400000);
      if (giorni > GIORNI_PRIMA_DI_RIVEDERE) {
        f.push(esito(W, 'contenuto-in-evoluzione-fermo', file, null,
          `pagina su una situazione in corso, ferma da ${giorni} giorni`,
          'Verificare se la situazione descritta è ancora quella, poi aggiornare quotify:revisionato.'));
      }
    }

    // Coerenza: non è un blocco perché una query può legittimamente non
    // comparire alla lettera nel titolo. Ma quasi sempre è una svista.
    if (query) {
      const dove = `${title} ${root.querySelector('h1')?.structuredText || ''}`.toLowerCase();
      const assenti = query.toLowerCase().split(/\s+/).filter((w) => w && !dove.includes(w));
      if (assenti.length) {
        f.push(esito(W, 'query-obiettivo-incoerente', file, null,
          `la query obiettivo "${query}" non compare in title né in h1 (mancano: ${assenti.join(', ')})`));
      }
    }
  }

  return f;
}
