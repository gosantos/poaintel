"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumber, rsm2 } from "@/lib/format";

export interface TrendPoint {
  year: number;
  n: number;
  median: number;
  min: number;
  max: number;
}

const chartConfig = {
  median: { label: "Mediana R$/m²", color: "var(--chart-1)" },
  volume: { label: "Transações", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function TrendChart({
  data,
  className,
}: {
  data: TrendPoint[];
  className?: string;
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: String(d.year),
  }));

  return (
    <ChartContainer config={chartConfig} className={className} initialDimension={{ width: 600, height: 280 }}>
      <AreaChart data={chartData} accessibilityLayer margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
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
              formatter={(value, name) => {
                if (name === "median") {
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Mediana</span>
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
      </AreaChart>
    </ChartContainer>
  );
}