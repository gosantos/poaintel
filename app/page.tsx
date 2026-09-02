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
import { HeroSnapshot } from "@/components/hero-snapshot";
import { TrendChart } from "@/components/trend-chart";
import { VolumeChart } from "@/components/volume-chart";
import { TierTrendChart, TierTrendTable } from "@/components/tier-trend-chart";
import { BairroRankChart } from "@/components/bairro-rank-chart";
import { bairroDisplay } from "@/lib/bairros";
import { formatArea, formatNumber, formatPct, money, rsm2 } from "@/lib/format";
import {
  getBairroMovers,
  getBairrosByMedian,
  getOverview,
  getTierTrend,
  getTopBairros,
  getTrend,
} from "@/db/queries";
import { slugify } from "@/lib/data";
import { pctChange } from "@/lib/market";

export default async function HomePage() {
  const [overview, trend, topBairros, high, low, movers, tierTrend] = await Promise.all([
    getOverview(),
    getTrend({}),
    getTopBairros(12),
    getBairrosByMedian("desc", 2, 80),
    getBairrosByMedian("asc", 1, 80),
    getBairroMovers(2024, 2025, 30),
    getTierTrend(),
  ]);
  const hot = movers.filter((m) => m.yoy > 25).slice(0, 3);

  const withVolume = trend.filter((t) => t.n > 0);
  const fullYears = withVolume.filter((t) => t.year <= 2025);
  const last = fullYears[fullYears.length - 1] ?? withVolume[withVolume.length - 1];
  const prev = fullYears[fullYears.length - 2];
  const yoy = last && prev ? pctChange(prev.median, last.median) : null;
  const y2020 = withVolume.find((t) => t.year === 2020);
  const price5y = pctChange(y2020?.median, last?.median);
  const vol5y = pctChange(y2020?.n, last?.n);

  return (
    <div className="relative">
      <section className="border-b bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <Badge variant="outline" className="mb-4">
              Dados abertos · Secretaria da Fazenda de Porto Alegre
            </Badge>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              Preço real de apartamentos em Porto Alegre.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Vendas registradas no ITBI de 2020 a 2026. Pesquise um endereço,
              compare com o bairro e veja o mercado por construção e tamanho.
            </p>
            <div className="mt-8">
              <HomeSearch />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Ex.: <Link href="/busca?rua=fernando+machado&numero=813" className="font-medium text-foreground underline underline-offset-2">Rua Fernando Machado 813</Link> ·{" "}
              <Link href="/busca?rua=duque+de+caxias" className="font-medium text-foreground underline underline-offset-2">Duque de Caxias</Link>
            </p>
          </div>
          {last && (
            <div className="hidden lg:block">
              <HeroSnapshot
                lastYear={last.year}
                lastMedian={last.median}
                lastN={last.n}
                yoy={yoy}
                high={
                  high[0]
                    ? {
                        name: high[0].bairro,
                        slug: slugify(high[0].bairroNorm),
                        medianRsm2: high[0].medianRsm2,
                      }
                    : undefined
                }
                low={
                  low[0]
                    ? {
                        name: low[0].bairro,
                        slug: slugify(low[0].bairroNorm),
                        medianRsm2: low[0].medianRsm2,
                      }
                    : undefined
                }
              />
            </div>
          )}
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
                Mix da cidade e IPCA. Não é valorização do mesmo estoque
                {withVolume[withVolume.length - 1]?.year === 2026 ? " · 2026 parcial" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={trend} />
              <p className="mt-2 text-sm text-muted-foreground">
                A linha pontilhada é a mediana do primeiro ano da série,
                atualizada pelo IPCA (IBGE / BCB SGS 433). Em 2026 o IPCA vai
                até julho.
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

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Valorização por época de construção</CardTitle>
            <CardDescription>
              Cinco grupos. Prédio novo é caro, velho é barato. A média da
              cidade mistura os dois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TierTrendChart data={tierTrend} />
            <TierTrendTable data={tierTrend} />
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Bairros com mais volume
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mediana R$/m² nos bairros com mais vendas
            </p>
          </div>
          <Link
            href="/bairros"
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-foreground underline-offset-4 hover:underline"
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
                    const delta = pctChange(overview.medianRsm2, b.medianRsm2);
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
                              variant={delta < 0 ? "success" : "outline"}
                              className="font-mono"
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
              A mediana da cidade sobe quando entra mais lançamento no mix. A
              diferença também está nos bairros.
            </p>
          </div>
          <Link
            href="/insights"
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Briefing completo <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">O mix puxa a mediana</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-foreground">
              {price5y !== null && vol5y !== null ? (
                <>
                  De 2020 a {last?.year} a mediana da cidade subiu {formatPct(price5y)}{" "}
                  e o volume, {formatPct(vol5y)}. Isso mistura épocas de obra.
                </>
              ) : (
                <>Série de 2020 a 2026 com vendas reais de apartamentos.</>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">O bairro muda o preço</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-foreground">
              {high[0] && low[0] ? (
                <>
                  {bairroDisplay(high[0].bairro)} medeia {rsm2(high[0].medianRsm2)} e{" "}
                  {bairroDisplay(low[0].bairro)}, {rsm2(low[0].medianRsm2)}. Compare
                  pela célula do bairro.
                </>
              ) : (
                <>O R$/m² muda mais entre bairros do que a mediana da cidade mostra.</>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2024 e 2025, bairro a bairro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-foreground">
              {hot.length > 0 ? (
                <>
                  {hot.map((m) => bairroDisplay(m.bairro)).join(", ")} subiram mais
                  de 25% na mediana e outros recuaram. A tabela está no briefing.
                </>
              ) : (
                <>A variação de 2024 a 2025 mudou de bairro para bairro.</>
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
            <CardContent className="text-sm leading-relaxed text-foreground">
              O ITBI registra vendas concluídas, com milhares de transações por ano.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Scale className="size-5 text-primary" />
              <CardTitle className="mt-3">Benchmark por bairro</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-foreground">
              Compare qualquer unidade com a mediana do bairro, por época de
              construção e tamanho.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Landmark className="size-5 text-primary" />
              <CardTitle className="mt-3">2020 a 2026</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-foreground">
              Sete anos por rua, bairro, construção e área. Fonte:
              dadosabertos.poa.br.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}