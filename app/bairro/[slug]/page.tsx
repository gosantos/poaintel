import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { TrendChart } from "@/components/trend-chart";
import { BenchmarkMatrix } from "@/components/benchmark-matrix";
import { TransactionsTable, TxRow } from "@/components/transactions-table";
import { bairroDisplay } from "@/lib/bairros";
import { formatArea, formatNumber, formatPct, money, rsm2 } from "@/lib/format";
import { slugify } from "@/lib/data";
import { pctChange, vsBenchmark } from "@/lib/market";
import {
  getBairros,
  getBenchmarks,
  getOverview,
  getRecentTransactions,
  getTrend,
} from "@/db/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bairros = await getBairros();
  const meta = bairros.find((b) => slugify(b.bairroNorm) === slug);
  return { title: meta ? bairroDisplay(meta.bairro) : "Bairro" };
}

export default async function BairroPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const bairros = await getBairros();
  const meta = bairros.find((b) => slugify(b.bairroNorm) === slug);
  if (!meta) notFound();
  const bairroNorm = meta.bairroNorm;

  const [overview, trend, benchCells, recent] = await Promise.all([
    getOverview({ bairroNorm }),
    getTrend({ bairroNorm }),
    getBenchmarks(bairroNorm),
    getRecentTransactions(bairroNorm),
  ]);

  const display = bairroDisplay(meta.bairro);
  const cellLookup = new Map(benchCells.map((c) => [`${c.tier}|${c.band}`, c]));

  const rows: TxRow[] = recent.map((r) => {
    const cell = cellLookup.get(`${r.tier}|${r.band}`);
    const comp = vsBenchmark(r.rsm2, cell?.p50);
    return {
      id: r.id,
      year: r.year,
      dataEstimativa: r.dataEstimativa,
      dataPagamento: r.dataPagamento,
      fullBase: r.fullBase,
      rsm2: r.rsm2,
      nUnidade: r.nUnidade,
      area: r.areaConstrPrivativa,
      tier: r.tier,
      band: r.band,
      situacao: r.situacao,
      logradouro: r.logradouro,
      nEndereco: r.nEndereco,
      comp,
    };
  });

  const withVol = trend.filter((t) => t.n > 0 && t.year <= 2025);
  const lastFull = withVol[withVol.length - 1];
  const prevFull = withVol[withVol.length - 2];
  const yoy =
    lastFull && prevFull ? pctChange(prevFull.median, lastFull.median) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/bairros" />} className="mb-4 -ml-2 text-muted-foreground">
        <ChevronLeft className="size-4" />
        Todos os bairros
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{display}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatNumber(overview.total)} vendas · {overview.yearMin}–
            {overview.yearMax}
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={`/busca?bairro=${encodeURIComponent(bairroNorm)}`} />}>
          <Search className="size-4" />
          Buscar neste bairro
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Transações" value={formatNumber(overview.total)} />
        <StatCard
          label="Mediana R$/m²"
          value={rsm2(overview.medianRsm2)}
          hint={
            yoy !== null && lastFull
              ? `${formatPct(yoy)} em ${lastFull.year} vs ${lastFull.year - 1}`
              : "todos os anos"
          }
        />
        <StatCard
          label="Valor mediano"
          value={money(overview.medianFullBase)}
        />
        <StatCard label="Área média" value={formatArea(overview.meanArea)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mediana R$/m² por ano</CardTitle>
            <CardDescription>
              {display} e IPCA nacional ·{" "}
              {trend[trend.length - 1]?.year === 2026 ? "2026 parcial" : "série completa"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              A linha pontilhada é o primeiro ano da série neste bairro,
              atualizado pelo IPCA nacional.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Benchmark por construção × tamanho</CardTitle>
            <CardDescription>
              Mediana R$/m² (p50) por célula e número de transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BenchmarkMatrix cells={benchCells} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Transações recentes</CardTitle>
          <CardDescription>
            Últimas {rows.length} vendas em {display}, comparadas com o
            benchmark do bairro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable rows={rows} showAddress />
        </CardContent>
      </Card>
    </div>
  );
}