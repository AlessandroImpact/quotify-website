// SOLO PER I TEST. Un database SQLite in memoria con la stessa interfaccia
// di D1 (prepare → bind → run/all/first, e batch), così l'SQL vero di
// lib/archivio.mjs si prova senza rete e senza wrangler. Lo schema sono
// gli stessi file che vanno su D1: se divergessero, i test mentirebbero.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

// Tutte le migrazioni, in ordine di nome: sono gli stessi file che vanno su D1.
const MIGRAZIONI = new URL('../worker-archivio/migrazioni/', import.meta.url);
const SCHEMA = readdirSync(MIGRAZIONI).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(new URL(f, MIGRAZIONI), 'utf8')).join('\n');

export function apriInMemoria() {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);

  const istruzione = (sql, valori = []) => ({
    sql,
    valori,
    bind: (...v) => {
      // D1 rifiuta undefined: lo facciamo anche qui, o un test passerebbe
      // dove la produzione fallisce.
      if (v.some((x) => x === undefined)) throw new TypeError('D1_TYPE_ERROR: undefined non è un valore legabile');
      return istruzione(sql, v);
    },
    run: async () => { db.prepare(sql).run(...valori); return { success: true }; },
    all: async () => ({ results: db.prepare(sql).all(...valori).map((r) => ({ ...r })) }),
    first: async () => { const r = db.prepare(sql).get(...valori); return r ? { ...r } : null; },
  });

  return {
    prepare: (sql) => istruzione(sql),
    batch: async (istruzioni) => {
      db.exec('BEGIN');
      try {
        for (const i of istruzioni) db.prepare(i.sql).run(...i.valori);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return istruzioni.map(() => ({ success: true }));
    },
    // Per le asserzioni dei test.
    tutte: (sql) => db.prepare(sql).all().map((r) => ({ ...r })),
  };
}
