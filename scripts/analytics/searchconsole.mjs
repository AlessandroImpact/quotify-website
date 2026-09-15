// Involucro Node attorno a lib/searchconsole.mjs.
//
// La logica sta nel modulo condiviso, che gira anche sul Worker: qui c'è solo
// la parte che in un Worker non avrebbe senso, cioè leggere la chiave da disco.
// Sul Worker la stessa chiave arriva da un segreto Cloudflare.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { lettore } from '../../lib/searchconsole.mjs';

export { SITO } from '../../lib/searchconsole.mjs';

const PERCORSO = process.env.GSC_CHIAVE || resolve(homedir(), '.config/quotify/search-console.json');

let cache = null;
function leggi() {
  if (cache) return cache;
  cache = lettore(JSON.parse(readFileSync(PERCORSO, 'utf8')));
  return cache;
}

/** Senza chiave il cruscotto si genera comunque, solo senza la parte Google:
 *  è un caso atteso, non un guasto. */
export function chiaveDisponibile() {
  try { leggi(); return true; } catch { return false; }
}

export const totali = (o) => leggi().totali(o);
export const rendimento = (o) => leggi().rendimento(o);
export const statoUrl = (u) => leggi().statoUrl(u);
export const sitemap = () => leggi().sitemap();
