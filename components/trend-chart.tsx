"use client";

import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumber, formatPct, rsm2 } from "@/lib/format";
import { ipcaRebased, ipcaYear } from "@/lib/ipca";

export interface TrendPoint {
  year: number;
  n: number;
  median: number;
  min: number;
  max: number;
}

const chartConfig = {
  median: { label: "Mediana R$/m²", color: "var(--chart-1)" },
  ipca: { label: "IPCA", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function TrendChart({
  data,
  className,
  compareIpca = true,
}: {
  data: TrendPoint[];
  className?: string;
  compareIpca?: boolean;
}) {
  const ipca = compareIpca ? ipcaRebased(data) : [];
  const ipcaByYear = new Map(ipca.map((p) => [p.year, p.ipca]));
  const chartData = data.map((d) => ({
    ...d,
    label: String(d.year),
    ipca: ipcaByYear.get(d.year),
  }));
  const showIpca = compareIpca && ipca.some((p) => Number.isFinite(p.ipca));

  return (
    <ChartContainer
      config={chartConfig}
      className={className}
      initialDimension={{ width: 600, height: 280 }}
    >
      <ComposedChart data={chartData} accessibilityLayer margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => `${formatNumber(v)}`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => {
                if (name === "median") {
                  const ipcaVal = (item?.payload as { ipca?: number })?.ipca;
                  const vs =
                    ipcaVal && ipcaVal > 0
                      ? ((Number(value) / ipcaVal) - 1) * 100
                      : null;
                  return (
                    <div className="flex w-full flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Mediana</span>
                        <span className="ml-auto font-mono tabular-nums">
                          {rsm2(Number(value))}
                        </span>
                      </div>
                      {vs !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">vs IPCA</span>
                          <span className="ml-auto font-mono tabular-nums">
                            {formatPct(vs)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                if (name === "ipca") {
                  const y = (item?.payload as { year?: number })?.year;
                  const row = y ? ipcaYear(y) : undefined;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        IPCA{row && row.months < 12 ? " parcial" : ""}
                      </span>
                      <span className="ml-auto font-mono tabular-nums">
                        {rsm2(Number(value))}
                      </span>
                    </div>
                  );
                }
                return null;
              }}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as { n?: number } | undefined;
                return (
                  <div className="flex flex-col gap-0.5">
                    <span>{label}</span>
                    <span className="font-normal text-muted-foreground">
                      {p ? `${formatNumber(p.n ?? 0)} transações` : ""}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        {showIpca && <ChartLegend content={<ChartLegendContent />} />}
        <Area
          dataKey="median"
          type="monotone"
          stroke="var(--color-median)"
          fill="var(--color-median)"
          fillOpacity={0.14}
          strokeWidth={2}
          dot={{ fill: "var(--color-median)", strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5 }}
        />
        {showIpca && (
          <Line
            dataKey="ipca"
            type="monotone"
            stroke="var(--color-ipca)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ fill: "var(--color-ipca)", strokeWidth: 0, r: 2.5 }}
            activeDot={{ r: 5 }}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  );
}
