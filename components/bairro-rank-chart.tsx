"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { bairroDisplay } from "@/lib/bairros";
import { formatNumber, rsm2 } from "@/lib/format";

const chartConfig = {
  median: { label: "Mediana R$/m²", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function BairroRankChart({
  data,
  className,
}: {
  data: { bairro: string; n: number; medianRsm2: number }[];
  className?: string;
}) {
  const chartData = [...data]
    .sort((a, b) => b.medianRsm2 - a.medianRsm2)
    .map((d) => ({
      ...d,
      median: d.medianRsm2,
      label: bairroDisplay(d.bairro),
    }));

  return (
    <ChartContainer config={chartConfig} className={className} initialDimension={{ width: 600, height: 320 }}>
      <BarChart
        data={chartData}
        layout="vertical"
        accessibilityLayer
        margin={{ left: 4, right: 12 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${formatNumber(v)}`}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={130}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => {
                if (name === "median") {
                  const n = (item?.payload as { n?: number })?.n;
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono tabular-nums">
                        {rsm2(Number(value))}
                      </span>
                      <span className="text-muted-foreground">
                        {formatNumber(n ?? 0)} transações
                      </span>
                    </div>
                  );
                }
                return null;
              }}
              labelKey="label"
            />
          }
        />
        <Bar
          dataKey="median"
          fill="var(--color-median)"
          radius={4}
          maxBarSize={18}
        />
      </BarChart>
    </ChartContainer>
  );
}