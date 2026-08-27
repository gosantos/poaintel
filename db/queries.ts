import { sql, type SQL } from "drizzle-orm";
import { matchStreets, type StreetHit } from "@/lib/fuzzy";
import { db } from "./client";
import { transactions, type Transaction } from "./schema";

export interface TxFilters {
  bairroNorm?: string;
  ruaNorm?: string;
  ruaNorms?: string[];
  numero?: string;
  years?: number[];
  minM2?: number;
  maxM2?: number;
}

export function buildWhere(f: TxFilters): SQL | null {
  const conds: SQL[] = [];
  conds.push(sql`base_de_calculo > 0 AND area_constr_privativa > 0`);
  if (f.bairroNorm) conds.push(sql`bairro_norm = ${f.bairroNorm}`);
  if (f.ruaNorms && f.ruaNorms.length > 0) {
    conds.push(
      sql`logradouro_norm IN (${sql.join(
        f.ruaNorms.map((s) => sql`${s}`),
        sql`, `,
      )})`,
    );
  } else if (f.ruaNorm) {
    conds.push(sql`logradouro_norm LIKE ${`%${f.ruaNorm}%`}`);
  }
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
    SELECT MAX(bairro) AS bairro, bairro_norm, n,
      AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN rsm2 END) AS median_rsm2,
      MAX(year) AS year_max
    FROM ranked
    GROUP BY bairro_norm, n
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
  return getTopBairros(limit);
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

export interface StreetCatalogRow {
  logradouro: string;
  logradouroNorm: string;
}

let streetCatalog: StreetCatalogRow[] | null = null;

export function resetStreetCatalog(): void {
  streetCatalog = null;
}

export async function getStreetCatalog(): Promise<StreetCatalogRow[]> {
  if (streetCatalog) return streetCatalog;
  const rows = await db.all<{ logradouro: string; logradouro_norm: string }>(sql`
    SELECT logradouro_norm, MIN(logradouro) AS logradouro
    FROM transactions
    GROUP BY logradouro_norm
  `);
  streetCatalog = rows.map((r) => ({
    logradouro: r.logradouro,
    logradouroNorm: r.logradouro_norm,
  }));
  return streetCatalog;
}

export interface ResolvedStreet extends StreetHit {
  logradouro: string;
}

export async function resolveStreetQuery(query: string): Promise<ResolvedStreet[]> {
  const catalog = await getStreetCatalog();
  const hits = matchStreets(
    query,
    catalog.map((c) => c.logradouroNorm),
  );
  const byNorm = new Map(catalog.map((c) => [c.logradouroNorm, c.logradouro]));
  return hits.map((h) => ({
    ...h,
    logradouro: byNorm.get(h.logradouroNorm) ?? h.logradouroNorm,
  }));
}

export interface Percentiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  n: number;
}

export async function getPercentiles(f?: TxFilters): Promise<Percentiles> {
  const where = buildWhere(f ?? {}) ?? sql`1 = 1`;
  const countRow = await db.get<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM transactions WHERE ${where}`,
  );
  const n = Number(countRow?.n ?? 0);
  if (n === 0) return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, n: 0 };

  const at = async (p: number) => {
    const off = Math.max(0, Math.min(n - 1, Math.floor((n - 1) * p)));
    const row = await db.get<{ v: number }>(sql`
      SELECT rsm2 AS v FROM transactions WHERE ${where}
      ORDER BY rsm2 LIMIT 1 OFFSET ${off}
    `);
    return Number(row?.v ?? 0);
  };

  const [p10, p25, p50, p75, p90] = await Promise.all([
    at(0.1),
    at(0.25),
    at(0.5),
    at(0.75),
    at(0.9),
  ]);
  return { p10, p25, p50, p75, p90, n };
}

export interface TierYearPoint {
  year: number;
  tier: string;
  n: number;
  median: number;
}

export async function getTierTrend(f: TxFilters = {}): Promise<TierYearPoint[]> {
  const where = buildWhere(f) ?? sql`1 = 1`;
  const rows = await db.all<Record<string, number | string>>(sql`
    WITH ranked AS (
      SELECT year, COALESCE(tier, '?') AS t, rsm2,
        ROW_NUMBER() OVER (PARTITION BY year, COALESCE(tier, '?') ORDER BY rsm2) AS rn,
        COUNT(*) OVER (PARTITION BY year, COALESCE(tier, '?')) AS n
      FROM transactions
      WHERE ${where}
    )
    SELECT year, t AS tier, n,
      AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN rsm2 END) AS median
    FROM ranked
    GROUP BY year, t, n
    ORDER BY year, t
  `);
  return rows.map((r) => ({
    year: Number(r.year),
    tier: String(r.tier),
    n: Number(r.n),
    median: Number(r.median),
  }));
}

export interface GroupStat {
  key: string;
  n: number;
  medianRsm2: number;
}

export async function getGroupStats(
  group: "tier" | "band",
): Promise<GroupStat[]> {
  const col = group === "tier" ? "tier" : "band";
  const rows = await db.all<Record<string, number | string>>(sql`
    WITH ranked AS (
      SELECT COALESCE(${sql.raw(col)}, '?') AS k, rsm2,
        ROW_NUMBER() OVER (PARTITION BY COALESCE(${sql.raw(col)}, '?') ORDER BY rsm2) AS rn,
        COUNT(*) OVER (PARTITION BY COALESCE(${sql.raw(col)}, '?')) AS n
      FROM transactions
      WHERE base_de_calculo > 0 AND area_constr_privativa > 0
    )
    SELECT k, n,
      AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN rsm2 END) AS median_rsm2
    FROM ranked
    GROUP BY k, n
  `);
  return rows.map((r) => ({
    key: String(r.k),
    n: Number(r.n),
    medianRsm2: Number(r.median_rsm2),
  }));
}

export interface BairroMover {
  bairro: string;
  bairroNorm: string;
  n0: number;
  n1: number;
  med0: number;
  med1: number;
  yoy: number;
}

export async function getBairroMovers(
  year0 = 2024,
  year1 = 2025,
  minN = 30,
): Promise<BairroMover[]> {
  const rows = await db.all<Record<string, number | string>>(sql`
    WITH ranked AS (
      SELECT bairro, bairro_norm, year, rsm2,
        ROW_NUMBER() OVER (PARTITION BY bairro_norm, year ORDER BY rsm2) AS rn,
        COUNT(*) OVER (PARTITION BY bairro_norm, year) AS n
      FROM transactions
      WHERE base_de_calculo > 0 AND area_constr_privativa > 0
        AND year IN (${year0}, ${year1})
    ),
    med AS (
      SELECT MAX(bairro) AS bairro, bairro_norm, year, n,
        AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN rsm2 END) AS med
      FROM ranked
      GROUP BY bairro_norm, year, n
      HAVING n >= ${minN}
    )
    SELECT a.bairro, a.bairro_norm,
      a.n AS n0, a.med AS med0, b.n AS n1, b.med AS med1,
      (b.med / a.med - 1) * 100 AS yoy
    FROM med a
    JOIN med b ON a.bairro_norm = b.bairro_norm AND a.year = ${year0} AND b.year = ${year1}
    WHERE a.med > 0
    ORDER BY yoy DESC
  `);
  return rows.map((r) => ({
    bairro: String(r.bairro),
    bairroNorm: String(r.bairro_norm),
    n0: Number(r.n0),
    n1: Number(r.n1),
    med0: Number(r.med0),
    med1: Number(r.med1),
    yoy: Number(r.yoy),
  }));
}

export async function getBairrosByMedian(
  order: "asc" | "desc",
  limit = 8,
  minN = 80,
): Promise<BairroSummary[]> {
  const dir = order === "asc" ? sql`ASC` : sql`DESC`;
  const rows = await db.all<Record<string, number | string>>(sql`
    WITH ranked AS (
      SELECT bairro, bairro_norm, year, rsm2,
        ROW_NUMBER() OVER (PARTITION BY bairro_norm ORDER BY rsm2) AS rn,
        COUNT(*) OVER (PARTITION BY bairro_norm) AS n
      FROM transactions
      WHERE base_de_calculo > 0 AND area_constr_privativa > 0
    )
    SELECT MAX(bairro) AS bairro, bairro_norm, n,
      AVG(CASE WHEN rn IN ((n + 1) / 2, (n + 2) / 2) THEN rsm2 END) AS median_rsm2,
      MAX(year) AS year_max
    FROM ranked
    GROUP BY bairro_norm, n
    HAVING n >= ${minN}
    ORDER BY median_rsm2 ${dir}
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

export interface BairroYearCell {
  bairro: string;
  bairroNorm: string;
  year: number;
  n: number;
  medianRsm2: number;
  nAll: number;
}

export async function getBairroYearMatrix(
  minYearN = 10,
  minAll = 40,
): Promise<BairroYearCell[]> {
  const rows = await db.all<Record<string, number | string>>(sql`
    WITH ranked AS (
      SELECT bairro, bairro_norm, year, rsm2,
        ROW_NUMBER() OVER (PARTITION BY bairro_norm, year ORDER BY rsm2) AS rn,
        COUNT(*) OVER (PARTITION BY bairro_norm, year) AS n_year,
        COUNT(*) OVER (PARTITION BY bairro_norm) AS n_all
      FROM transactions
      WHERE base_de_calculo > 0 AND area_constr_privativa > 0
    )
    SELECT MAX(bairro) AS bairro, bairro_norm, year, n_year, n_all,
      AVG(CASE WHEN rn IN ((n_year + 1) / 2, (n_year + 2) / 2) THEN rsm2 END) AS median_rsm2
    FROM ranked
    WHERE n_all >= ${minAll} AND n_year >= ${minYearN}
    GROUP BY bairro_norm, year, n_year, n_all
  `);
  return rows.map((r) => ({
    bairro: String(r.bairro),
    bairroNorm: String(r.bairro_norm),
    year: Number(r.year),
    n: Number(r.n_year),
    medianRsm2: Number(r.median_rsm2),
    nAll: Number(r.n_all),
  }));
}