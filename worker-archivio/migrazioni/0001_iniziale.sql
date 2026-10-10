-- Raccoglitore di metriche: docs/raccoglitore-metriche-piano.md §6.

-- Le visite attribuite. Solo quello che Cloudflare non sa fare.
CREATE TABLE visite (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quando      TEXT NOT NULL,
  giorno      TEXT NOT NULL,
  percorso    TEXT NOT NULL,
  sorgente    TEXT,
  mezzo       TEXT,
  campagna    TEXT,
  contenuto   TEXT,
  termine     TEXT,
  provenienza TEXT,
  paese       TEXT
);
CREATE INDEX visite_giorno   ON visite(giorno);
CREATE INDEX visite_campagna ON visite(campagna, giorno);

-- Una fotografia al giorno, prima che Cloudflare la cancelli.
-- Le colonne sono nullabili, e lo saranno davvero: NULL vuol dire
-- «non lo sappiamo», zero vuol dire «nessuno è passato».
CREATE TABLE storico (
  giorno       TEXT PRIMARY KEY,
  preso_il     TEXT NOT NULL,
  visite       INTEGER,
  pagine_viste INTEGER,
  impressioni  INTEGER,
  clic         INTEGER,
  posizione    REAL,
  indicizzate  INTEGER,
  dati         TEXT NOT NULL DEFAULT '{}'
);
