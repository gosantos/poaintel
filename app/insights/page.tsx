import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { TrendChart } from "@/components/trend-chart";
import { VolumeChart } from "@/components/volume-chart";
import { GroupBarChart } from "@/components/group-bar-chart";
import { MoversTable } from "@/components/movers-table";
import { YearHeatmap, type HeatRow } from "@/components/year-heatmap";
import { bairroDisplay } from "@/lib/bairros";
import { bandLabel, slugify, tierLabel } from "@/lib/data";
import { compact, formatNumber, formatPct, rsm2 } from "@/lib/format";
import { ipcaFactor, ipcaPct, ipcaRebased, ipcaYear } from "@/lib/ipca";
import {
  getBairroMovers,
  getBairroYearMatrix,
  getBairrosByMedian,
  getGroupStats,
  getOverview,
  getPercentiles,
  getTopBairros,
  getTrend,
} from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Intel de mercado" };

const TIER_ORDER = ["pre-1950", "A", "B", "C", "D", "?"];
const BAND_ORDER = ["S", "M", "L", "XL"];

export default async function InsightsPage() {
  const [
    overview,
    trend,
    percentiles,
    byTier,
    byBand,
    movers,
    high,
    low,
    matrix,
    topVolume,
  ] = await Promise.all([
    getOverview(),
    getTrend({}),
    getPercentiles(),
    getGroupStats("tier"),
    getGroupStats("band"),
    getBairroMovers(2024, 2025, 30),
    getBairrosByMedian("desc", 8, 80),
    getBairrosByMedian("asc", 8, 80),
    getBairroYearMatrix(10, 40),
    getTopBairros(10),
  ]);

  const y2020 = trend.find((t) => t.year === 2020);
  const y2024 = trend.find((t) => t.year === 2024);
  const y2025 = trend.find((t) => t.year === 2025);
  const price5y =
    y2020 && y2025 && y2020.median > 0
      ? ((y2025.median / y2020.median) - 1) * 100
      : null;
  const ipca5y = ipcaPct(2020, 2025);
  const ipca5yFactor = ipcaFactor(2020, 2025);
  const vsIpca5y =
    y2020 && y2025 && ipca5yFactor && y2020.median > 0
      ? (y2025.median / (y2020.median * ipca5yFactor) - 1) * 100
      : null;
  const vol5y =
    y2020 && y2025 && y2020.n > 0 ? ((y2025.n / y2020.n) - 1) * 100 : null;
  const cityYoy =
    y2024 && y2025 && y2024.median > 0
      ? ((y2025.median / y2024.median) - 1) * 100
      : null;

  const gainers = movers.filter((m) => m.yoy > 0).slice(0, 8);
  const fallers = [...movers].filter((m) => m.yoy < 0).sort((a, b) => a.yoy - b.yoy).slice(0, 8);
  const topGainer = gainers[0];
  const topFaller = fallers[0];

  const tierD = byTier.find((t) => t.key === "D");
  const tierA = byTier.find((t) => t.key === "A");
  const newPremium =
    tierD && tierA && tierA.medianRsm2 > 0
      ? ((tierD.medianRsm2 / tierA.medianRsm2) - 1) * 100
      : null;
  const unknownN = byTier.find((t) => t.key === "?")?.n ?? 0;

  const bandXl = byBand.find((b) => b.key === "XL");
  const bandM = byBand.find((b) => b.key === "M");
  const xlPremium =
    bandXl && bandM && bandM.medianRsm2 > 0
      ? ((bandXl.medianRsm2 / bandM.medianRsm2) - 1) * 100
      : null;

  const top10n = topVolume.reduce((s, b) => s + b.n, 0);
  const top10share = overview.total > 0 ? (top10n / overview.total) * 100 : 0;
  const spread =
    percentiles.p10 > 0 ? percentiles.p90 / percentiles.p10 : null;

  const years = [...new Set(matrix.map((c) => c.year))].sort((a, b) => a - b);
  const byBairro = new Map<string, HeatRow>();
  for (const c of matrix) {
    const row = byBairro.get(c.bairroNorm) ?? {
      bairro: c.bairro,
      bairroNorm: c.bairroNorm,
      nAll: c.nAll,
      byYear: {},
    };
    row.byYear[c.year] = { n: c.n, medianRsm2: c.medianRsm2 };
    byBairro.set(c.bairroNorm, row);
  }
  const heatRows = [...byBairro.values()].sort((a, b) => {
    const aMed = a.byYear[2025]?.medianRsm2 ?? a.byYear[2024]?.medianRsm2 ?? 0;
    const bMed = b.byYear[2025]?.medianRsm2 ?? b.byYear[2024]?.medianRsm2 ?? 0;
    return bMed - aMed;
  });

  const tierChart = [...byTier]
    .sort((a, b) => TIER_ORDER.indexOf(a.key) - TIER_ORDER.indexOf(b.key))
    .map((t) => ({
      label: t.key === "?" ? "Sem ano" : tierLabel(t.key),
      n: t.n,
      medianRsm2: t.medianRsm2,
    }));
  const bandChart = [...byBand]
    .sort((a, b) => BAND_ORDER.indexOf(a.key) - BAND_ORDER.indexOf(b.key))
    .map((b) => ({
      label: bandLabel(b.key),
      n: b.n,
      medianRsm2: b.medianRsm2,
    }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Badge variant="outline">Briefing · Porto Alegre</Badge>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        O mercado de apartamentos, em uma página.
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Leitura executiva do ITBI {overview.yearMin}–{overview.yearMax}:{" "}
        {formatNumber(overview.total)} vendas reais. Medianas, não médias —
        as médias mentem com outliers de milhões por m².
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mediana cidade"
          value={rsm2(overview.medianRsm2)}
          hint={cityYoy !== null ? `${formatPct(cityYoy)} 2025 vs 2024` : undefined}
        />
        <StatCard
          label="P10 → P90"
          value={`${compact(percentiles.p10)}–${compact(percentiles.p90)}`}
          hint={spread ? `${spread.toFixed(1).replace(".", ",")}× de amplitude` : undefined}
        />
        <StatCard
          label="Volume 2025"
          value={formatNumber(y2025?.n ?? 0)}
          hint={vol5y !== null ? `${formatPct(vol5y)} vs 2020` : undefined}
        />
        <StatCard
          label="Prêmio 2010+"
          value={newPremium !== null ? formatPct(newPremium) : "—"}
          hint="vs apartamentos 1950–69"
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Leituras</h2>
        <ol className="mt-4 grid gap-4 lg:grid-cols-2">
          <Takeaway n={1} title="A cidade aqueceu em volume, não em preço.">
            De 2020 a 2025 a mediana subiu {price5y !== null ? formatPct(price5y) : "—"}.
            O IPCA no mesmo intervalo, {ipca5y !== null ? formatPct(ipca5y) : "—"}.
            {vsIpca5y !== null && (
              <> O m² da cidade ficou {formatPct(vsIpca5y)} em termos reais.</>
            )}{" "}
            Volume, {vol5y !== null ? formatPct(vol5y) : "—"}. Mais transações,
            preço que não acompanhou a inflação.
          </Takeaway>
          <Takeaway n={2} title="A mediana esconde a polarização.">
            Em 2025 a cidade inteira variou {cityYoy !== null ? formatPct(cityYoy) : "—"}.
            {topGainer && (
              <>
                {" "}
                {bairroDisplay(topGainer.bairro)} subiu {formatPct(topGainer.yoy)}
              </>
            )}
            {topFaller && (
              <>
                ; {bairroDisplay(topFaller.bairro)} recuou {formatPct(topFaller.yoy)}
              </>
            )}
            . O mercado não é um, são vários.
          </Takeaway>
          <Takeaway n={3} title="Geografia vale mais que o anúncio.">
            {high[0] && low[0] && (
              <>
                {bairroDisplay(high[0].bairro)} medeia {rsm2(high[0].medianRsm2)};{" "}
                {bairroDisplay(low[0].bairro)}, {rsm2(low[0].medianRsm2)}. O
                percentil 90 ({rsm2(percentiles.p90)}) é {spread ? `${spread.toFixed(1).replace(".", ",")}×` : "várias vezes"} o
                percentil 10 ({rsm2(percentiles.p10)}).
              </>
            )}
          </Takeaway>
          <Takeaway n={4} title="Novo constrói prêmio. Grande também — na cidade.">
            Estoque 2010+ vale {newPremium !== null ? formatPct(newPremium) : "—"} a
            mais por m² que 1950–69. Unidades ≥ 150 m² saem{" "}
            {xlPremium !== null ? formatPct(xlPremium) : "—"} acima da faixa 50–89 m²
            — o XL está nos bairros caros, não o contrário. Por isso o
            benchmark é célula (bairro × construção × tamanho), não a mediana
            da cidade.
          </Takeaway>
        </ol>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mediana R$/m² por ano</CardTitle>
            <CardDescription>
              Cidade vs IPCA · 2026 parcial · p50, não média
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
            <YearStrip trend={trend} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pontilhado: mediana de 2020 × IPCA (IBGE / BCB SGS 433). 2026 até julho.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Volume de transações</CardTitle>
            <CardDescription>
              {y2020 && y2025
                ? `${formatNumber(y2020.n)} em 2020 → ${formatNumber(y2025.n)} em 2025`
                : "Apartamentos vendidos por ano"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VolumeChart data={trend} />
            <p className="mt-3 text-xs text-muted-foreground">
              Os 10 bairros com mais vendas concentram {formatPct(top10share).replace("+", "")} do
              volume. Centro Histórico lidera quantidade, não preço.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          2024 → 2025, bairro a bairro
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Variação da mediana R$/m². Só bairros com ≥ 30 vendas em cada ano.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quem acelerou</CardTitle>
              <CardDescription>Maiores altas de mediana</CardDescription>
            </CardHeader>
            <CardContent>
              <MoversTable rows={gainers} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quem recuou</CardTitle>
              <CardDescription>Maiores quedas de mediana</CardDescription>
            </CardHeader>
            <CardContent>
              <MoversTable rows={fallers} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Mediana por bairro × ano
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A série completa. Filtre pelo nome; clique para abrir o bairro.
        </p>
        <Card className="mt-4">
          <CardContent className="pt-4">
            <YearHeatmap years={years} rows={heatRows} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Época de construção</CardTitle>
            <CardDescription>
              Mediana R$/m² · {formatNumber(unknownN)} transações sem ano de
              obra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupBarChart data={tierChart} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Faixa de tamanho</CardTitle>
            <CardDescription>
              Na cidade o m² do XL custa mais — mix de bairro, não lei física
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupBarChart data={bandChart} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bairros mais caros</CardTitle>
            <CardDescription>≥ 80 transações · mediana 2020–2026</CardDescription>
          </CardHeader>
          <CardContent>
            <ExtremeList rows={high} city={overview.medianRsm2} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bairros mais baratos</CardTitle>
            <CardDescription>≥ 80 transações · mediana 2020–2026</CardDescription>
          </CardHeader>
          <CardContent>
            <ExtremeList rows={low} city={overview.medianRsm2} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição da cidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm tabular-nums">
            <PctRow label="p10" value={percentiles.p10} />
            <PctRow label="p25" value={percentiles.p25} />
            <PctRow label="p50" value={percentiles.p50} />
            <PctRow label="p75" value={percentiles.p75} />
            <PctRow label="p90" value={percentiles.p90} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Concentração</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            Dez bairros = {formatNumber(top10n)} vendas ({formatPct(top10share).replace("+", "")}).
            {topVolume[0] && (
              <>
                {" "}
                {bairroDisplay(topVolume[0].bairro)} sozinho responde por{" "}
                {formatPct((topVolume[0].n / overview.total) * 100).replace("+", "")} do
                cadastro.
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como ler</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            ITBI é preço declarado para o fisco, com piso. 2026 está incompleto.
            Médias de área e R$/m² explodem com outliers — daí a mediana.
            Detalhe em{" "}
            <Link href="/sobre" className="underline underline-offset-2 hover:text-foreground">
              metodologia
            </Link>
            .
          </CardContent>
        </Card>
      </section>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link href="/bairros" className="inline-flex items-center gap-1 hover:text-foreground">
          Abrir todos os bairros <ArrowRight className="size-4" />
        </Link>
      </p>
    </div>
  );
}

function Takeaway({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-xl border bg-card p-4">
      <span className="font-mono text-sm text-muted-foreground">{String(n).padStart(2, "0")}</span>
      <div>
        <p className="font-medium tracking-tight">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function YearStrip({
  trend,
}: {
  trend: { year: number; n: number; median: number }[];
}) {
  const ipca = ipcaRebased(trend);
  const ipcaByYear = new Map(ipca.map((p) => [p.year, p.ipca]));
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="px-1 pb-1 text-left font-medium"> </th>
            {trend.map((t) => (
              <th key={t.year} className="px-1 pb-1 font-medium">
                {t.year}
                {ipcaYear(t.year)?.months === 7 ? "*" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          <tr>
            <td className="px-1 text-muted-foreground">Mediana</td>
            {trend.map((t, i) => {
              const prev = trend[i - 1];
              const d =
                prev && prev.median > 0
                  ? ((t.median / prev.median) - 1) * 100
                  : null;
              return (
                <td key={t.year} className="px-1">
                  <div>{rsm2(t.median)}</div>
                  <div className="text-muted-foreground">
                    {d === null ? "—" : formatPct(d)}
                  </div>
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="px-1 pt-2 text-muted-foreground">vs IPCA</td>
            {trend.map((t) => {
              const indexed = ipcaByYear.get(t.year);
              const vs =
                indexed && indexed > 0 ? (t.median / indexed - 1) * 100 : null;
              return (
                <td key={t.year} className="px-1 pt-2">
                  {vs === null ? "—" : formatPct(vs)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ExtremeList({
  rows,
  city,
}: {
  rows: { bairro: string; bairroNorm: string; n: number; medianRsm2: number }[];
  city: number;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const delta = city > 0 ? ((r.medianRsm2 / city) - 1) * 100 : null;
        return (
          <li key={r.bairroNorm} className="flex items-baseline justify-between gap-3 text-sm">
            <Link
              href={`/bairro/${slugify(r.bairroNorm)}`}
              className="inline-flex items-center gap-1 font-medium hover:underline"
            >
              {bairroDisplay(r.bairro)}
              <ArrowUpRight className="size-3 text-muted-foreground" />
            </Link>
            <span className="font-mono tabular-nums">
              {rsm2(r.medianRsm2)}
              {delta !== null && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatPct(delta)}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function PctRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{rsm2(value)}</span>
    </div>
  );
}
