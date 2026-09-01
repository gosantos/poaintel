"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TIERS, tierLabel } from "@/lib/data";
import { formatNumber, formatPct, rsm2 } from "@/lib/format";
import { pctChange } from "@/lib/market";

export interface TierTrendPoint {
  year: number;
  tier: string;
  n: number;
  median: number;
}

const MIN_N = 30;

const chartConfig = {
  A: { label: tierLabel("A"), color: "var(--chart-3)" },
  B: { label: tierLabel("B"), color: "var(--chart-2)" },
  C: { label: tierLabel("C"), color: "var(--chart-1)" },
  D: { label: tierLabel("D"), color: "var(--chart-4)" },
  E: { label: tierLabel("E"), color: "var(--chart-5)" },
} satisfies ChartConfig;

export function TierTrendChart({
  data,
  className,
}: {
  data: TierTrendPoint[];
  className?: string;
}) {
  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
  const byYearTier = new Map(data.map((d) => [`${d.year}|${d.tier}`, d]));
  const chartData = years.map((year) => {
    const row: Record<string, number | string | null> = {
      year,
      label: String(year),
    };
    for (const t of TIERS) {
      const p = byYearTier.get(`${year}|${t}`);
      row[t] = p && p.n >= MIN_N ? p.median : null;
    }
    return row;
  });

  return (
    <ChartContainer
      config={chartConfig}
      className={className}
      initialDimension={{ width: 600, height: 280 }}
    >
      <LineChart data={chartData} accessibilityLayer margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[
            (dataMin: number) => Math.floor((dataMin - 200) / 500) * 500,
            (dataMax: number) => Math.ceil((dataMax + 200) / 500) * 500,
          ]}
          tickFormatter={(v: number) => `${formatNumber(v)}`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                if (value == null || typeof name !== "string") return null;
                return (
                  <div className="flex w-full items-center gap-2">
                    <span className="text-muted-foreground">{tierLabel(name)}</span>
                    <span className="ml-auto font-mono tabular-nums">
                      {rsm2(Number(value))}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {TIERS.map((t) => (
          <Line
            key={t}
            dataKey={t}
            type="monotone"
            stroke={`var(--color-${t})`}
            strokeWidth={t === "E" ? 2.5 : 2}
            dot={{ fill: `var(--color-${t})`, strokeWidth: 0, r: 2.5 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

export function TierTrendTable({
  data,
  from = 2020,
  to = 2025,
}: {
  data: TierTrendPoint[];
  from?: number;
  to?: number;
}) {
  const byYearTier = new Map(data.map((d) => [`${d.year}|${d.tier}`, d]));
  const totals = new Map<number, number>();
  for (const d of data) {
    totals.set(d.year, (totals.get(d.year) ?? 0) + d.n);
  }

  return (
    <div className="mt-4 overflow-x-auto">
       <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th className="px-1 pb-1 text-left font-medium">Época</th>
            <th className="px-1 pb-1 text-right font-medium">{from}</th>
            <th className="px-1 pb-1 text-right font-medium">{to}</th>
            <th className="px-1 pb-1 text-right font-medium">Δ</th>
            <th className="px-1 pb-1 text-right font-medium">mix {to}</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {TIERS.map((t) => {
            const a = byYearTier.get(`${from}|${t}`);
            const b = byYearTier.get(`${to}|${t}`);
            const aOk = a && a.n >= MIN_N;
            const bOk = b && b.n >= MIN_N;
            const delta = aOk && bOk ? pctChange(a.median, b.median) : null;
            const mix = b && totals.get(to) ? (b.n / (totals.get(to) ?? 0)) * 100 : null;
            return (
              <tr key={t}>
                <td className="px-1 py-0.5 font-sans">{tierLabel(t)}</td>
                <td className="px-1 py-0.5 text-right">
                  {aOk ? rsm2(a.median) : "—"}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {bOk ? rsm2(b.median) : "—"}
                </td>
                <td className="px-1 py-0.5 text-right">
                  {delta === null ? "—" : formatPct(delta)}
                </td>
                <td className="px-1 py-0.5 text-right text-muted-foreground">
                  {mix === null ? "—" : formatPct(mix).replace("+", "")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
