export interface IpcaYear {
  year: number;
  rate: number;
  months: number;
}

export const IPCA_YEARS: IpcaYear[] = [
  { year: 2020, rate: 4.52, months: 12 },
  { year: 2021, rate: 10.06, months: 12 },
  { year: 2022, rate: 5.79, months: 12 },
  { year: 2023, rate: 4.62, months: 12 },
  { year: 2024, rate: 4.83, months: 12 },
  { year: 2025, rate: 4.26, months: 12 },
  { year: 2026, rate: 3.44, months: 7 },
];

const byYear = new Map(IPCA_YEARS.map((r) => [r.year, r]));

export function ipcaYear(year: number): IpcaYear | undefined {
  return byYear.get(year);
}

export function ipcaFactor(fromYear: number, toYear: number): number | null {
  if (toYear < fromYear) return null;
  let factor = 1;
  for (let y = fromYear + 1; y <= toYear; y++) {
    const row = byYear.get(y);
    if (!row) return null;
    factor *= 1 + row.rate / 100;
  }
  return factor;
}

export function ipcaPct(fromYear: number, toYear: number): number | null {
  const f = ipcaFactor(fromYear, toYear);
  return f == null ? null : (f - 1) * 100;
}

export function ipcaRebased(
  series: { year: number; median: number }[],
): { year: number; ipca: number }[] {
  const base = series.find((p) => p.median > 0);
  if (!base) return [];
  return series.map((p) => {
    const f = ipcaFactor(base.year, p.year);
    return { year: p.year, ipca: f == null ? NaN : base.median * f };
  });
}
