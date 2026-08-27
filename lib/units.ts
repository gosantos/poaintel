export interface UnitSale {
  nUnidade: string | null;
  area: number;
  fullBase: number;
  dataEstimativa: string;
  comp: { pct: number; p50: number } | null;
}

export interface UnitSummary {
  unit: string;
  area: number | null;
  avgBase: number;
  avgRsm2: number | null;
  sales: number;
  years: string[];
  comp: { pct: number; p50: number } | null;
}

export function summarizeUnits(rows: UnitSale[]): UnitSummary[] {
  const byUnit = new Map<string, UnitSale[]>();
  for (const r of rows) {
    const key = r.nUnidade ?? "—";
    const arr = byUnit.get(key);
    if (arr) arr.push(r);
    else byUnit.set(key, [r]);
  }

  return [...byUnit.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([unit, sales]) => {
      const areas = new Set(sales.map((s) => s.area));
      const area = areas.size === 1 ? [...areas][0] : null;
      const avgBase =
        sales.reduce((sum, x) => sum + x.fullBase, 0) / sales.length;
      return {
        unit,
        area,
        avgBase,
        avgRsm2: area ? avgBase / area : null,
        sales: sales.length,
        years: [...new Set(sales.map((s) => s.dataEstimativa.slice(0, 4)))],
        comp: sales[0]?.comp ?? null,
      };
    });
}
