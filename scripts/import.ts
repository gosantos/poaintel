import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";
import { db, client } from "../db/client";
import { transactions } from "../db/schema";
import { band, norm, tier } from "../lib/data";
import { bairroDisplay } from "../lib/bairros";

const CSV_DIR = process.env.ITBI_CSV_DIR ?? "../apartment-hunt/itbi/csv";
const FINALIDADE = new Set(["APARTAMENTO", "APARTAMENTO DE COBERTURA"]);
const PAID_SITUACAO = new Set(["Impressa", "Retificada"]);

interface RawRow {
  year: number;
  dataEstimativa: string;
  dataPagamento: string;
  baseDeCalculo: number;
  percTransmitido: number;
  finalidadeConstrucao: string;
  logradouro: string;
  nEndereco: string;
  nUnidade: string;
  complementoEndereco: string;
  bairro: string;
  cep: string;
  areaTotalTerreno: number | null;
  areaConstrTotal: number | null;
  areaConstrPrivativa: number;
  anoConstrucao: number | null;
  nMatricula: string;
  nZona: string;
  situacao: string;
}

function num(x: string | undefined): number | null {
  if (x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function parseCsv(path: string): RawRow[] {
  const records = parse(textSync(path), {
    delimiter: ";",
    quote: "'",
    columns: false,
    relax_column_count: true,
    relax_quotes: true,
  }) as string[][];

  const rows: RawRow[] = [];
  for (const r of records) {
    if (r.length < 18 || r[0] === "data_estimativa") continue;
    const finalidade = r[4].trim();
    if (!FINALIDADE.has(finalidade)) continue;
    const base = num(r[2]);
    const area = num(r[13]);
    if (!base || base <= 0 || !area || area <= 0) continue;
    const perc = num(r[3]) ?? 100;
    const est = r[0].split(" ")[0].replaceAll("/", "-");
    const year = Number(est.slice(0, 4));
    const anoConstrucao = num(r[14]);
    rows.push({
      year,
      dataEstimativa: est,
      dataPagamento: (r[1] || "").split(" ")[0].replaceAll("/", "-"),
      baseDeCalculo: base,
      percTransmitido: perc,
      finalidadeConstrucao: finalidade,
      logradouro: r[5].trim(),
      nEndereco: r[6].trim(),
      nUnidade: r[7].trim(),
      complementoEndereco: r[8].trim(),
      bairro: r[9].trim(),
      cep: r[10].trim(),
      areaTotalTerreno: num(r[11]),
      areaConstrTotal: num(r[12]),
      areaConstrPrivativa: area,
      anoConstrucao: anoConstrucao ? Math.trunc(anoConstrucao) : null,
      nMatricula: r[15].trim(),
      nZona: r[16].trim(),
      situacao: r[17].trim(),
    });
  }
  return rows;
}

function textSync(path: string): string {
  return readFileSync(path, "utf-8");
}

function dedupe(rows: RawRow[]): RawRow[] {
  const byUnit = new Map<string, RawRow[]>();
  for (const r of rows) {
    const key = [norm(r.logradouro), r.nEndereco, r.nUnidade].join("|");
    const group = byUnit.get(key);
    if (group) group.push(r);
    else byUnit.set(key, [r]);
  }

  const final: RawRow[] = [];
  for (const group of byUnit.values()) {
    const paid = group.filter(
      (t) => t.dataPagamento && PAID_SITUACAO.has(t.situacao),
    );
    const seen = new Set<string>();
    for (const t of group) {
      if (t.situacao === "Reestimada") continue;
      const identity = [t.dataEstimativa, t.baseDeCalculo, t.percTransmitido, t.areaConstrPrivativa, t.situacao].join("|");
      if (seen.has(identity)) continue;
      seen.add(identity);
      if (t.dataPagamento && PAID_SITUACAO.has(t.situacao)) {
        final.push(t);
        continue;
      }
      const shadowed = paid.some(
        (p) => p.dataEstimativa.slice(0, 4) === t.dataEstimativa.slice(0, 4) && p.baseDeCalculo === t.baseDeCalculo,
      );
      if (shadowed) continue;
      final.push(t);
    }
  }
  return final;
}

async function main() {
  const files = readdirSync(CSV_DIR)
    .filter((f) => /^itbi-\d{4}\.csv$/.test(f))
    .map((f) => `${CSV_DIR}/${f}`)
    .sort();
  if (files.length === 0) {
    console.error(`Nenhum CSV encontrado em ${CSV_DIR}`);
    console.error("Aponte com ITBI_CSV_DIR=... ou rode a partir do workspace certo.");
    process.exit(1);
  }

  console.log(`Lendo ${files.length} arquivos de ${CSV_DIR}...`);
  let raw: RawRow[] = [];
  for (const f of files) {
    const rows = parseCsv(f);
    console.log(`  ${f} → ${rows.length} apartamentos/coberturas válidos`);
    raw = raw.concat(rows);
  }

  console.log(`\nDeduplicando ${raw.length} linhas...`);
  const final = dedupe(raw);
  console.log(`  → ${final.length} transações únicas`);

  mkdirSync(dirname("data/itbi.db"), { recursive: true });

  await db.run(sql`DROP TABLE IF EXISTS transactions`);
  await db.run(sql`
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
  `);

  const BATCH = 30;
  for (let i = 0; i < final.length; i += BATCH) {
    const chunk = final.slice(i, i + BATCH);
    await db.transaction(async (tx) => {
      await tx.insert(transactions).values(
        chunk.map((r) => ({
        year: r.year,
        dataEstimativa: r.dataEstimativa,
        dataPagamento: r.dataPagamento || null,
        baseDeCalculo: r.baseDeCalculo,
        percTransmitido: r.percTransmitido,
        fullBase: r.baseDeCalculo / (r.percTransmitido / 100),
        rsm2: r.baseDeCalculo / r.areaConstrPrivativa,
        finalidadeConstrucao: r.finalidadeConstrucao,
        logradouro: r.logradouro,
        logradouroNorm: norm(r.logradouro),
        nEndereco: r.nEndereco || null,
        nUnidade: r.nUnidade || null,
        complementoEndereco: r.complementoEndereco || null,
        bairro: r.bairro,
        bairroNorm: norm(bairroDisplay(r.bairro)).toLowerCase(),
        cep: r.cep || null,
        areaTotalTerreno: r.areaTotalTerreno,
        areaConstrTotal: r.areaConstrTotal,
        areaConstrPrivativa: r.areaConstrPrivativa,
        anoConstrucao: r.anoConstrucao,
        nMatricula: r.nMatricula || null,
        nZona: r.nZona || null,
        situacao: r.situacao,
        tier: tier(r.anoConstrucao),
        band: band(r.areaConstrPrivativa),
      })),
      );
    });
    process.stdout.write(`  inseridos ${Math.min(i + BATCH, final.length)}/${final.length}\r`);
  }

  const result = await db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM transactions`);
  console.log(`\nConcluído. ${result[0]?.n ?? 0} transações no banco (data/itbi.db).`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});