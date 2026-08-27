export const TRANSACTIONS_DDL = `
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  data_estimativa TEXT NOT NULL,
  data_pagamento TEXT,
  base_de_calculo REAL NOT NULL,
  perc_transmitido REAL NOT NULL DEFAULT 100,
  full_base REAL NOT NULL,
  rsm2 REAL NOT NULL,
  finalidade_construcao TEXT NOT NULL,
  logradouro TEXT NOT NULL,
  logradouro_norm TEXT NOT NULL,
  n_endereco TEXT,
  n_unidade TEXT,
  complemento_endereco TEXT,
  bairro TEXT NOT NULL,
  bairro_norm TEXT NOT NULL,
  cep TEXT,
  area_total_terreno REAL,
  area_constr_total REAL,
  area_constr_privativa REAL NOT NULL,
  ano_construcao INTEGER,
  n_matricula TEXT,
  n_zona TEXT,
  situacao TEXT NOT NULL,
  tier TEXT,
  band TEXT
);
CREATE INDEX idx_bairro ON transactions (bairro_norm);
CREATE INDEX idx_logradouro ON transactions (logradouro_norm);
CREATE INDEX idx_endereco ON transactions (logradouro_norm, n_endereco);
CREATE INDEX idx_bairro_tier_band ON transactions (bairro_norm, tier, band);
CREATE INDEX idx_year ON transactions (year);
`;
