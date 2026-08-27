"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumber } from "@/lib/format";

const chartConfig = {
  n: { label: "Transações", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function VolumeChart({
  data,
  className,
}: {
  data: { year: number; n: number }[];
  className?: string;
}) {
  const chartData = data.map((d) => ({ ...d, label: String(d.year) }));

  return (
    <ChartContainer config={chartConfig} className={className} initialDimension={{ width: 600, height: 260 }}>
      <BarChart data={chartData} accessibilityLayer margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Transações</span>
                  <span className="ml-auto font-mono tabular-nums">
                    {formatNumber(Number(value))}
                  </span>
                </div>
              )}
              labelKey="label"
            />
          }
        />
        <Bar
          dataKey="n"
          fill="var(--color-n)"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ChartContainer>
  );
}