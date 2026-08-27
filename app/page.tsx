import Link from "next/link";
import {
  Building2,
  CircleDollarSign,
  ArrowRight,
  Landmark,
  ScanSearch,
  Scale,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { HomeSearch } from "@/components/home-search";
import { TrendChart } from "@/components/trend-chart";
import { VolumeChart } from "@/components/volume-chart";
import { BairroRankChart } from "@/components/bairro-rank-chart";
import { bairroDisplay } from "@/lib/bairros";
import { formatArea, formatNumber, formatPct, money, rsm2 } from "@/lib/format";
import {
  getBairroMovers,
  getBairrosByMedian,
  getOverview,
  getTopBairros,
  getTrend,
} from "@/db/queries";
import { slugify } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [overview, trend, topBairros, high, low, movers] = await Promise.all([
    getOverview(),
    getTrend({}),
    getTopBairros(12),
    getBairrosByMedian("desc", 2, 80),
    getBairrosByMedian("asc", 1, 80),
    getBairroMovers(2024, 2025, 30),
  ]);
  const hot = movers.filter((m) => m.yoy > 25).slice(0, 3);

  const withVolume = trend.filter((t) => t.n > 0);
  const fullYears = withVolume.filter((t) => t.year <= 2025);
  const last = fullYears[fullYears.length - 1] ?? withVolume[withVolume.length - 1];
  const prev = fullYears[fullYears.length - 2];
  const yoy =
    last && prev && prev.median > 0
      ? ((last.median / prev.median) - 1) * 100
      : null;
  const y2020 = withVolume.find((t) => t.year === 2020);
  const price5y =
    y2020 && last && y2020.median > 0
      ? ((last.median / y2020.median) - 1) * 100
      : null;
  const vol5y =
    y2020 && last && y2020.n > 0 ? ((last.n / y2020.n) - 1) * 100 : null;

  return (
    <div className="relative">
      <section className="border-b bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <Badge variant="outline" className="mb-4">
            Dados abertos · Secretaria da Fazenda de Porto Alegre
          </Badge>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            O preço real de cada apartamento em Porto Alegre.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Transações de venda registradas no ITBI, 2020–2026. Pesquise por
            endereço, compare com o bairro e acompanhe o mercado com
            benchmarks por construção e tamanho.
          </p>
          <div className="mt-8">
            <HomeSearch />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ex.: <Link href="/busca?rua=fernando+machado&numero=813" className="underline underline-offset-2 hover:text-foreground">Rua Fernando Machado 813</Link> ·{" "}
            <Link href="/busca?rua=duque+de+caxias" className="underline underline-offset-2 hover:text-foreground">Duque de Caxias</Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Transações"
            value={formatNumber(overview.total)}
            hint={`${overview.yearMin}–${overview.yearMax}`}
            icon={<Landmark className="size-4" />}
          />
          <StatCard
            label="Mediana R$/m²"
            value={rsm2(overview.medianRsm2)}
            hint={
              yoy !== null && last
                ? `${formatPct(yoy)} em ${last.year} vs ${last.year - 1}`
                : undefined
            }
            icon={<CircleDollarSign className="size-4" />}
          />
          <StatCard
            label="Valor mediano"
            value={money(overview.medianFullBase)}
            hint="por imóvel"
            icon={<Building2 className="size-4" />}
          />
          <StatCard
            label="Área média"
            value={formatArea(overview.meanArea)}
            hint="privativa"
            icon={<Scale className="size-4" />}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Mediana R$/m² por ano</CardTitle>
              <CardDescription>
                Mediana da cidade vs IPCA (1º ano corrigido)
                {withVolume[withVolume.length - 1]?.year === 2026 ? " · 2026 parcial" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Pontilhado: mediana do primeiro ano da série atualizada pelo
                IPCA (IBGE / BCB SGS 433). 2026: IPCA até julho.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Volume de transações</CardTitle>
              <CardDescription>Apartamentos vendidos por ano</CardDescription>
            </CardHeader>
            <CardContent>
              <VolumeChart data={trend} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Bairros com mais volume
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mediana R$/m² nos bairros mais transacionados
            </p>
          </div>
          <Link
            href="/bairros"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <BairroRankChart
                data={topBairros}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Bairro</TableHead>
                    <TableHead className="text-right">Tx</TableHead>
                    <TableHead className="text-right">Mediana R$/m²</TableHead>
                    <TableHead className="text-right">vs cidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topBairros.map((b, i) => {
                    const delta =
                      b.medianRsm2 > 0
                        ? ((b.medianRsm2 / overview.medianRsm2) - 1) * 100
                        : null;
                    return (
                      <TableRow key={b.bairroNorm}>
                        <TableCell className="text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/bairro/${slugify(b.bairroNorm)}`}
                            className="font-medium hover:underline"
                          >
                            {bairroDisplay(b.bairro)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatNumber(b.n)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {rsm2(b.medianRsm2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {delta !== null && (
                            <Badge
                              variant="outline"
                              className={
                                delta < 0
                                  ? "border-transparent bg-emerald-500/15 font-mono text-emerald-700 dark:text-emerald-400"
                                  : "font-mono"
                              }
                            >
                              {formatPct(delta)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Leitura do mercado
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Volume subiu; a mediana da cidade quase não. A polarização está
              nos bairros.
            </p>
          </div>
          <Link
            href="/insights"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Briefing completo <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cinco anos, pouco preço</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {price5y !== null && vol5y !== null ? (
                <>
                  Mediana {formatPct(price5y)} de 2020 a {last?.year}. Volume{" "}
                  {formatPct(vol5y)}. O ITBI aqueceu em transações, não no
                  R$/m² da cidade.
                </>
              ) : (
                <>Série 2020–2026 de vendas reais de apartamentos.</>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">A mediana mente o bairro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {high[0] && low[0] ? (
                <>
                  {bairroDisplay(high[0].bairro)} medeia {rsm2(high[0].medianRsm2)};{" "}
                  {bairroDisplay(low[0].bairro)}, {rsm2(low[0].medianRsm2)}. Compare
                  célula a célula, não com a cidade.
                </>
              ) : (
                <>O R$/m² muda mais entre bairros do que a mediana da cidade sugere.</>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2024–25 foi desigual</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {hot.length > 0 ? (
                <>
                  {hot.map((m) => bairroDisplay(m.bairro)).join(", ")} subiram mais
                  de 25% na mediana. Outros recuaram. O briefing tem a tabela
                  inteira.
                </>
              ) : (
                <>A variação 2024–2025 não foi uniforme entre bairros.</>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <ScanSearch className="size-5 text-primary" />
              <CardTitle className="mt-3">Preço real de venda</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              O ITBI registra o que de fato foi vendido, não anúncios. São
              milhares de transações reais por ano.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Scale className="size-5 text-primary" />
              <CardTitle className="mt-3">Benchmark por bairro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Compare qualquer unidade contra a mediana do bairro, ajustada
              por época de construção e tamanho.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Landmark className="size-5 text-primary" />
              <CardTitle className="mt-3">2020–2026</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sete anos de história, por rua, bairro, construção e área.
              Fonte: dadosabertos.poa.br.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}