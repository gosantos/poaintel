import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    year: integer("year").notNull(),
    dataEstimativa: text("data_estimativa").notNull(),
    dataPagamento: text("data_pagamento"),
    baseDeCalculo: real("base_de_calculo").notNull(),
    percTransmitido: real("perc_transmitido").notNull().default(100),
    fullBase: real("full_base").notNull(),
    rsm2: real("rsm2").notNull(),
    finalidadeConstrucao: text("finalidade_construcao").notNull(),
    logradouro: text("logradouro").notNull(),
    logradouroNorm: text("logradouro_norm").notNull(),
    nEndereco: text("n_endereco"),
    nUnidade: text("n_unidade"),
    complementoEndereco: text("complemento_endereco"),
    bairro: text("bairro").notNull(),
    bairroNorm: text("bairro_norm").notNull(),
    cep: text("cep"),
    areaTotalTerreno: real("area_total_terreno"),
    areaConstrTotal: real("area_constr_total"),
    areaConstrPrivativa: real("area_constr_privativa").notNull(),
    anoConstrucao: integer("ano_construcao"),
    nMatricula: text("n_matricula"),
    nZona: text("n_zona"),
    situacao: text("situacao").notNull(),
    tier: text("tier"),
    band: text("band"),
  },
  (t) => [
    index("idx_bairro").on(t.bairroNorm),
    index("idx_logradouro").on(t.logradouroNorm),
    index("idx_endereco").on(t.logradouroNorm, t.nEndereco),
    index("idx_bairro_tier_band").on(t.bairroNorm, t.tier, t.band),
    index("idx_year").on(t.year),
  ],
);

export type Transaction = typeof transactions.$inferSelect;