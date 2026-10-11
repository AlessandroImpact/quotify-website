-- Cruscotto: docs/cruscotto-piano.md §5.1.

-- Query e pagine di Search Console, un giorno alla volta. Il cruscotto non
-- chiama Google (la firma RSA si mangerebbe i 10 ms di CPU): legge da qui.
-- Per le pagine la chiave è il percorso, non l'URL intero.
CREATE TABLE ricerca (
  giorno      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('query', 'pagina')),
  chiave      TEXT NOT NULL,
  clic        INTEGER NOT NULL,
  impressioni INTEGER NOT NULL,
  posizione   REAL NOT NULL,
  PRIMARY KEY (giorno, tipo, chiave)
);

-- Avvisi già inviati: la stessa chiave non parte due volte.
CREATE TABLE avvisi (
  chiave     TEXT PRIMARY KEY,
  inviato_il TEXT NOT NULL,
  testo      TEXT NOT NULL
);
