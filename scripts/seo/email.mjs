#!/usr/bin/env node
// Cloudflare "Email Address Obfuscation" riscrive ogni indirizzo in un link a
// /cdn-cgi/l/email-protection, che il JavaScript decodifica nel browser. Chi
// visita vede l'email normale; i crawler vedono un link interno che risponde
// 404, uno per pagina (Semrush, 5 novembre 2026: 35 errori su 35 pagine).
//
// Cloudflare lascia stare quello che sta fra <!--email_off--> e
// <!--/email_off-->. Qui si avvolge l'intero documento, <head> compreso,
// perché anche il JSON-LD dell'organizzazione contiene l'indirizzo. Il gate
// (regola email-offuscata) verifica che nessun indirizzo resti fuori.
// Uso: node scripts/seo/email.mjs [dist]

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { elencaFile } from './lib.mjs';

const INIZIO = '<!--email_off-->';
const FINE = '<!--/email_off-->';
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Quanti indirizzi stanno fuori da una zona email_off. */
export function emailScoperte(html) {
  const scoperto = html.replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g, '');
  return (scoperto.match(EMAIL) ?? []).length;
}

export function proteggiEmail(html) {
  if (emailScoperte(html) === 0) return html;
  const doctype = html.match(/^\s*<!DOCTYPE[^>]*>\s*/i)?.[0] ?? '';
  const corpo = html.slice(doctype.length).replace(/\s*$/, '');
  return `${doctype.trimEnd()}${doctype ? '\n' : ''}${INIZIO}\n${corpo}\n${FINE}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = process.argv[2] || 'dist';
  let protette = 0;
  for (const f of elencaFile(dist).filter((f) => f.endsWith('.html'))) {
    const percorso = join(dist, f);
    const prima = readFileSync(percorso, 'utf8');
    const dopo = proteggiEmail(prima);
    if (dopo !== prima) { writeFileSync(percorso, dopo); protette += 1; }
  }
  console.log(`✔ email: ${protette} pagine escluse dall'offuscamento di Cloudflare`);
}
