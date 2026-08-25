// Verifica che il robots.txt esprima davvero la politica che crediamo.
// docs/console-sito-piano.md §4.1 — decisione del 2026-08-25: citazione sì, addestramento no.
//
// Il punto delicato non è scrivere le direttive, è l'ORDINE dei gruppi.
// RFC 9309 dice che vince il gruppo con lo user-agent più specifico, ma non tutti
// i crawler lo implementano: molti prendono il primo gruppo il cui nome è contenuto
// nello user-agent. Con 'Applebot' prima di 'Applebot-Extended' le due letture
// divergono. Qui le calcoliamo entrambe e pretendiamo che coincidano.

/** Politica attesa: true = deve poter leggere /, false = non deve. */
export const POLITICA = {
  Googlebot: true, 'Google-Extended': true, Bingbot: true, Applebot: true,
  'OAI-SearchBot': true, 'ChatGPT-User': true,
  'Claude-SearchBot': true, 'Claude-User': true,
  PerplexityBot: true, 'Perplexity-User': true,
  GPTBot: false, ClaudeBot: false, CCBot: false, Bytespider: false,
  Amazonbot: false, 'meta-externalagent': false, 'Applebot-Extended': false,
  AhrefsBot: false, SemrushBot: false, PetalBot: false, DataForSeoBot: false,
  MJ12bot: false, DotBot: false, BLEXBot: false, SeekportBot: false,
  serpstatbot: false, ZoominfoBot: false,
};

/** Spezza un robots.txt in gruppi { agents: [], regole: [{tipo, path}] }. */
export function analizza(testo) {
  const gruppi = [];
  let corrente = null;
  let ultimaEraAgent = false;
  for (const grezza of testo.split(/\r?\n/)) {
    const riga = grezza.replace(/#.*$/, '').trim();
    if (!riga) continue;
    const [chiaveGrezza, ...resto] = riga.split(':');
    const chiave = chiaveGrezza.trim().toLowerCase();
    const valore = resto.join(':').trim();
    if (chiave === 'user-agent') {
      if (!corrente || !ultimaEraAgent) { corrente = { agents: [], regole: [] }; gruppi.push(corrente); }
      corrente.agents.push(valore.toLowerCase());
      ultimaEraAgent = true;
    } else if (chiave === 'allow' || chiave === 'disallow') {
      if (!corrente) continue;
      corrente.regole.push({ tipo: chiave, path: valore });
      ultimaEraAgent = false;
    } else ultimaEraAgent = false;
  }
  return gruppi;
}

function consenteSecondo(gruppo, path) {
  if (!gruppo) return true; // nessun gruppo applicabile → tutto permesso
  let migliore = null;
  for (const r of gruppo.regole) {
    if (r.path === '' && r.tipo === 'disallow') continue; // "Disallow:" vuoto = consenti tutto
    if (path.startsWith(r.path)) {
      if (!migliore || r.path.length > migliore.path.length ||
          (r.path.length === migliore.path.length && r.tipo === 'allow')) migliore = r;
    }
  }
  return migliore ? migliore.tipo === 'allow' : true;
}

/** Lettura conforme a RFC 9309: vince il nome di user-agent più lungo che combacia. */
export function consenteRfc(gruppi, ua, path = '/') {
  const u = ua.toLowerCase();
  let scelto = null, lung = -1;
  for (const g of gruppi) for (const a of g.agents) {
    if (a !== '*' && u.includes(a) && a.length > lung) { scelto = g; lung = a.length; }
  }
  if (!scelto) scelto = gruppi.find((g) => g.agents.includes('*'));
  return consenteSecondo(scelto, path);
}

/** Lettura ingenua: vince il PRIMO gruppo il cui nome è contenuto nello user-agent. */
export function consenteIngenuo(gruppi, ua, path = '/') {
  const u = ua.toLowerCase();
  const scelto = gruppi.find((g) => g.agents.some((a) => a !== '*' && u.includes(a)))
    || gruppi.find((g) => g.agents.includes('*'));
  return consenteSecondo(scelto, path);
}

/** @returns {Array<{ua, atteso, rfc, ingenuo, problema}>} solo i casi che non tornano */
export function verifica(testo, politica = POLITICA) {
  const gruppi = analizza(testo);
  const brutti = [];
  for (const [ua, atteso] of Object.entries(politica)) {
    const rfc = consenteRfc(gruppi, ua);
    const ingenuo = consenteIngenuo(gruppi, ua);
    if (rfc !== atteso) {
      brutti.push({ ua, atteso, rfc, ingenuo, problema: 'politica' });
    } else if (rfc !== ingenuo) {
      brutti.push({ ua, atteso, rfc, ingenuo, problema: 'ordine' });
    }
  }
  return brutti;
}
