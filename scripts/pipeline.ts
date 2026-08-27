import { readFileSync, readdirSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { bairroDisplay } from "../lib/bairros";
import { band, norm, tier } from "../lib/data";

export const FINALIDADE = new Set(["APARTAMENTO", "APARTAMENTO DE COBERTURA"]);
export const PAID_SITUACAO = new Set(["Impressa", "Retificada"]);

export interface RawRow {
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

export interface InsertRow {
  year: number;
  dataEstimativa: string;
  dataPagamento: string | null;
  baseDeCalculo: number;
  percTransmitido: number;
  fullBase: number;
  rsm2: number;
  finalidadeConstrucao: string;
  logradouro: string;
  logradouroNorm: string;
  nEndereco: string | null;
  nUnidade: string | null;
  complementoEndereco: string | null;
  bairro: string;
  bairroNorm: string;
  cep: string | null;
  areaTotalTerreno: number | null;
  areaConstrTotal: number | null;
  areaConstrPrivativa: number;
  anoConstrucao: number | null;
  nMatricula: string | null;
  nZona: string | null;
  situacao: string;
  tier: string;
  band: string;
}

export function num(x: string | undefined): number | null {
  if (x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export function textSync(path: string): string {
  return readFileSync(path, "utf-8");
}

export function parseCsv(text: string): RawRow[] {
  const records = parse(text, {
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

export function parseCsvFile(path: string): RawRow[] {
  return parseCsv(textSync(path));
}

export function dedupe(rows: RawRow[]): RawRow[] {
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

export function toInsert(r: RawRow): InsertRow {
  return {
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
  };
}

export interface SourceLoad {
  files: string[];
  raw: RawRow[];
  final: RawRow[];
}

export function loadSourceRows(csvDir: string, log = console.log): SourceLoad {
  const files = readdirSync(csvDir)
    .filter((f) => /^itbi-\d{4}\.csv$/.test(f))
    .map((f) => `${csvDir}/${f}`)
    .sort();
  if (files.length === 0) {
    throw new Error(`Nenhum CSV encontrado em ${csvDir}`);
  }

  log(`Lendo ${files.length} arquivos de ${csvDir}...`);
  let raw: RawRow[] = [];
  for (const f of files) {
    const rows = parseCsvFile(f);
    log(`  ${f} → ${rows.length} apartamentos/coberturas válidos`);
    raw = raw.concat(rows);
  }

  log(`\nDeduplicando ${raw.length} linhas...`);
  const final = dedupe(raw);
  log(`  → ${final.length} transações únicas`);
  return { files, raw, final };
}