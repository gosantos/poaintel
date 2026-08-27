import { sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import { transactions, type Transaction } from "./schema";

export interface TxFilters {
  bairroNorm?: string;
  ruaNorm?: string;
  numero?: string;
  years?: number[];
  minM2?: number;
  maxM2?: number;
}

export function buildWhere(f: TxFilters): SQL | null {
  const conds: SQL[] = [];
  conds.push(sql`base_de_calculo > 0 AND area_constr_privativa > 0`);
  if (f.bairroNorm) conds.push(sql`bairro_norm = ${f.bairroNorm}`);
  if (f.ruaNorm) conds.push(sql`logradouro_norm LIKE ${`%${f.ruaNorm}%`}`);
  if (f.numero) conds.push(sql`n_endereco = ${f.numero}`);
  if (f.years && f.years.length > 0)
    conds.push(sql`year IN (${sql.join(f.years.map((y) => sql`${y}`), sql`, `)})`);
  if (f.minM2 != null) conds.push(sql`area_constr_privativa >= ${f.minM2}`);
  if (f.maxM2 != null) conds.push(sql`area_constr_privativa <= ${f.maxM2}`);
  return sql.join(conds, sql` AND `);
}

export function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const i = ((sorted.length - 1) * p) / 100;
  const lo = Math.floor(i);
  const hi = Math.min(lo + 1, sorted.length - 1);
  const frac = i - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

export function median(sorted: number[]): number {
  return pct(sorted, 50);
}

export interface YearPoint {
  year: number;
  n: number;
  median: number;
  min: number;
  max: number;
}

const MEDIAN_CTE = (group: string, where: SQL) => sql`
  WITH ranked AS (
    SELECT ${sql.raw(group)}, rsm2,
      ROW_NUMBER() OVER (PARTITION BY ${sql.raw(group)} ORDER BY rsm2) AS rn,
      COUNT(*) OVER (PARTITION BY ${sql.raw(group)}) AS n
    FROM transactions
    WHERE ${where}
  )
  SELECT ${sql.raw(group)}, n,
    AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN rsm2 END) AS median,
    MIN(rsm2) AS min,
    MAX(rsm2) AS max
  FROM ranked
  GROUP BY ${sql.raw(group)}, n
  ORDER BY ${sql.raw(group)}
`;

export async function getTrend(
  f: TxFilters,
  group = "year",
): Promise<YearPoint[]> {
  const where = buildWhere(f) ?? sql`1 = 1`;
  const rows = await db.all<Record<string, number | string>>(
    MEDIAN_CTE(group, where),
  );
  return rows.map((r) => ({
    year: Number(r[group]),
    n: Number(r.n),
    median: Number(r.median),
    min: Number(r.min),
    max: Number(r.max),
  }));
}

export interface Overview {
  total: number;
  yearMin: number;
  yearMax: number;
  medianRsm2: number;
  medianFullBase: number;
  meanArea: number;
}

export async function getOverview(f?: TxFilters): Promise<Overview> {
  const where = buildWhere(f ?? {}) ?? sql`1 = 1`;
  const agg = await db.get<Record<string, number | null>>(sql`
    SELECT
      COUNT(*) AS total,
      MIN(year) AS year_min,
      MAX(year) AS year_max,
      AVG(area_constr_privativa) AS mean_area
    FROM transactions WHERE ${where}
  `);
  const medRsm2 = await db.all<{ v: number | null }>(sql`
    SELECT rsm2 AS v FROM transactions WHERE ${where}
    ORDER BY rsm2 LIMIT 1 OFFSET (SELECT (COUNT(*) - 1) / 2 FROM transactions WHERE ${where})
  `);
  const medBase = await db.all<{ v: number | null }>(sql`
    SELECT full_base AS v FROM transactions WHERE ${where}
    ORDER BY full_base LIMIT 1 OFFSET (SELECT (COUNT(*) - 1) / 2 FROM transactions WHERE ${where})
  `);
  return {
    total: Number(agg?.total ?? 0),
    yearMin: Number(agg?.year_min ?? 0),
    yearMax: Number(agg?.year_max ?? 0),
    meanArea: Number(agg?.mean_area ?? 0),
    medianRsm2: Number(medRsm2[0]?.v ?? 0),
    medianFullBase: Number(medBase[0]?.v ?? 0),
  };
}

export async function searchTransactions(
  f: TxFilters,
  limit = 400,
): Promise<Transaction[]> {
  const where = buildWhere(f);
  if (!where) return [];
  return db
    .select()
    .from(transactions)
    .where(where)
    .orderBy(sql`year DESC, data_estimativa DESC`)
    .limit(limit)
    .all();
}

export interface BenchmarkCell {
  tier: string;
  band: string;
  n: number;
  p25: number;
  p50: number;
  p75: number;
}

export async function getBenchmarks(
  bairroNorm: string,
  years?: number[],
): Promise<BenchmarkCell[]> {
  const f: TxFilters = { bairroNorm, years };
  const where = buildWhere(f) ?? sql`1 = 1`;
  const rows = await db
    .select({
      tier: transactions.tier,
      band: transactions.band,
      rsm2: transactions.rsm2,
    })
    .from(transactions)
    .where(where)
    .all();

  const cells = new Map<string, number[]>();
  for (const r of rows) {
    const key = `${r.tier}|${r.band}`;
    const arr = cells.get(key);
    if (arr) arr.push(r.rsm2);
    else cells.set(key, [r.rsm2]);
  }

  return [...cells.entries()]
    .map(([key, vals]) => {
      const [tier, band] = key.split("|");
      const s = [...vals].sort((a, b) => a - b);
      return {
        tier,
        band,
        n: s.length,
        p25: pct(s, 25),
        p50: pct(s, 50),
        p75: pct(s, 75),
      };
    })
    .filter((c) => c.n >= 3);
}

export interface BairroSummary {
  bairro: string;
  bairroNorm: string;
  n: number;
  medianRsm2: number;
  yearMax: number;
}

export async function getTopBairros(
  limit = 15,
  year?: number,
): Promise<BairroSummary[]> {
  const yearCond = year ? sql`AND year = ${year}` : sql``;
  const rows = await db.all<Record<string, number | string>>(sql`
    WITH ranked AS (
      SELECT bairro, bairro_norm, year, rsm2,
        ROW_NUMBER() OVER (PARTITION BY bairro_norm ORDER BY rsm2) AS rn,
        COUNT(*) OVER (PARTITION BY bairro_norm) AS n
      FROM transactions
      WHERE base_de_calculo > 0 AND area_constr_privativa > 0 ${yearCond}
    )
    SELECT bairro, bairro_norm, n,
      AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN rsm2 END) AS median_rsm2,
      MAX(year) AS year_max
    FROM ranked
    GROUP BY bairro, bairro_norm, n
    ORDER BY n DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    bairro: String(r.bairro),
    bairroNorm: String(r.bairro_norm),
    n: Number(r.n),
    medianRsm2: Number(r.median_rsm2),
    yearMax: Number(r.year_max),
  }));
}

export async function getBairros(limit = 500): Promise<BairroSummary[]> {
  const rows = await db
    .select({
      bairro: transactions.bairro,
      bairroNorm: transactions.bairroNorm,
      n: sql<number>`COUNT(*)`,
      medianRsm2: sql<number>`AVG(rsm2)`,
      yearMax: sql<number>`MAX(year)`,
    })
    .from(transactions)
    .groupBy(transactions.bairroNorm)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit)
    .all();
  return rows.map((r) => ({
    bairro: r.bairro,
    bairroNorm: r.bairroNorm,
    n: Number(r.n),
    medianRsm2: Number(r.medianRsm2),
    yearMax: Number(r.yearMax),
  }));
}

export async function getRecentTransactions(
  bairroNorm: string,
  limit = 30,
): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(
      sql`bairro_norm = ${bairroNorm} AND base_de_calculo > 0 AND area_constr_privativa > 0`,
    )
    .orderBy(sql`data_estimativa DESC`)
    .limit(limit)
    .all();
}

export async function getBairroCell(
  bairroNorm: string,
  tier: string,
  band: string,
  years?: number[],
): Promise<BenchmarkCell | null> {
  const cells = await getBenchmarks(bairroNorm, years);
  return cells.find((c) => c.tier === tier && c.band === band) ?? null;
}

export async function countTransactions(f: TxFilters): Promise<number> {
  const where = buildWhere(f);
  if (!where) return 0;
  const row = await db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM transactions WHERE ${where}`);
  return Number(row?.n ?? 0);
}