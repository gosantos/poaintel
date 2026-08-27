export function pctChange(
  from: number | null | undefined,
  to: number | null | undefined,
): number | null {
  if (from == null || to == null || !(from > 0)) return null;
  return (to / from - 1) * 100;
}

export function vsBenchmark(
  value: number,
  p50: number | null | undefined,
): { pct: number; p50: number } | null {
  if (p50 == null || !(p50 > 0)) return null;
  return { pct: (value / p50 - 1) * 100, p50 };
}

export function sharePct(part: number, total: number): number {
  if (!(total > 0)) return 0;
  return (part / total) * 100;
}

export function spreadRatio(p10: number, p90: number): number | null {
  if (!(p10 > 0)) return null;
  return p90 / p10;
}
