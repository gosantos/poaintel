import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchForm } from "@/components/search-form";
import { CompBadge, TransactionsTable, TxRow } from "@/components/transactions-table";
import { BenchmarkMatrix } from "@/components/benchmark-matrix";
import { bairroDisplay, resolveBairroNorm } from "@/lib/bairros";
import { formatNumber, money, rsm2 } from "@/lib/format";
import { norm, slugify } from "@/lib/data";
import { vsBenchmark } from "@/lib/market";
import { searchSchema } from "@/lib/search";
import { summarizeUnits } from "@/lib/units";
import {
  getBairros,
  getBenchmarks,
  getOverview,
  resolveStreetQuery,
  searchTransactions,
  type ResolvedStreet,
} from "@/db/queries";
import type { Transaction } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Busca por endereço" };

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = {
    rua: sp.rua ? String(sp.rua) : undefined,
    numero: sp.numero ? String(sp.numero) : undefined,
    bairro: sp.bairro ? String(sp.bairro) : undefined,
    ano: sp.ano ? String(sp.ano) : undefined,
    minM2: sp.minM2 ? String(sp.minM2) : undefined,
    maxM2: sp.maxM2 ? String(sp.maxM2) : undefined,
    porUnidade: sp.porUnidade ? String(sp.porUnidade) : undefined,
  };
  const parsed = searchSchema.safeParse(raw);

  const allBairros = await getBairros();
  const bairroNorm = parsed.success
    ? resolveBairroNorm(parsed.data.bairro, allBairros)
    : undefined;

  let years: number[] | undefined;
  let minM2: number | undefined;
  let maxM2: number | undefined;
  let porUnidade = false;
  if (parsed.success) {
    years = parsed.data.ano?.map(Number).filter(Boolean);
    minM2 = parsed.data.minM2;
    maxM2 = parsed.data.maxM2;
    porUnidade = !!parsed.data.porUnidade;
  }

  const hasQuery =
    parsed.success &&
    (parsed.data.rua || parsed.data.numero || bairroNorm);

  let streetHits: ResolvedStreet[] = [];
  if (parsed.success && parsed.data.rua) {
    streetHits = await resolveStreetQuery(parsed.data.rua);
  }
  const ruaNorms = streetHits.map((h) => h.logradouroNorm);
  const fuzzyOnly =
    streetHits.length > 0 && streetHits.every((h) => h.method === "fuzzy");

  let rows: Transaction[] = [];
  let bairrosPresent: string[] = [];
  let resultOverview = null;
  if (hasQuery) {
    const filters = {
      ruaNorms: fuzzyOnly ? ruaNorms : undefined,
      ruaNorm:
        !fuzzyOnly && parsed.success && parsed.data.rua
          ? norm(parsed.data.rua)
          : undefined,
      numero: parsed.success ? parsed.data.numero : undefined,
      bairroNorm,
      years,
      minM2,
      maxM2,
    };
    rows = await searchTransactions(filters);
    bairrosPresent = [...new Set(rows.map((r) => r.bairroNorm))].sort();
    if (rows.length > 0) resultOverview = await getOverview(filters);
  }

  const mainBairro = bairroNorm ?? bairrosPresent[0];
  const benchCells = mainBairro
    ? await getBenchmarks(mainBairro, years)
    : [];
  const cellLookup = new Map<string, { p50: number }>();
  for (const b of bairrosPresent) {
    const cells = await getBenchmarks(b, years);
    for (const c of cells) cellLookup.set(`${b}|${c.tier}|${c.band}`, c);
  }

  const txRows: TxRow[] = rows.map((r) => {
    const cell = cellLookup.get(`${r.bairroNorm}|${r.tier}|${r.band}`);
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
      comp,
    };
  });

  const porUnidadeRows = txRows;

  const title = parsed.success && parsed.data.rua
    ? parsed.data.rua + (parsed.data.numero ? `, ${parsed.data.numero}` : "")
    : "Busca por endereço";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Busca por endereço
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Encontre vendas do ITBI por rua, número e bairro.
        </p>
      </div>

      <SearchForm bairros={allBairros} />

      {!hasQuery && (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <SearchX className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Digite uma rua, mesmo com erro de digitação, ou selecione um bairro.
            </p>
          </CardContent>
        </Card>
      )}

      {hasQuery && rows.length === 0 && (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <SearchX className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhuma transação encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente um trecho menor de rua, tire o número ou amplie os
                filtros.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasQuery && rows.length > 0 && (
        <div className="mt-8 space-y-6">
          {fuzzyOnly && (
            <p className="text-sm text-muted-foreground">
              Nenhuma rua bateu no nome. Ruas próximas, por Levenshtein e sem
              maiúsculas nem acentos:{" "}
              {streetHits.map((h) => h.logradouro).join(" · ")}
            </p>
          )}

          {resultOverview && (
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="outline" className="font-mono">
                mediana {rsm2(resultOverview.medianRsm2)}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {money(resultOverview.medianFullBase)} / imóvel
              </Badge>
              <Badge variant="outline">
                {resultOverview.yearMin}–{resultOverview.yearMax}
              </Badge>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <Badge variant="secondary" className="font-mono">
              {formatNumber(rows.length)} transações
            </Badge>
            {bairrosPresent.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {bairrosPresent.map((b, i) => (
                  <span key={b}>
                    {i > 0 && " · "}
                    <Link
                      href={`/bairro/${slugify(b)}`}
                      className="font-medium underline underline-offset-2 hover:text-foreground"
                    >
                      {bairroDisplay(rows.find((r) => r.bairroNorm === b)?.bairro ?? b)}
                    </Link>
                  </span>
                ))}
              </span>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {porUnidade ? "Resumo por unidade" : "Transações"}
                  </CardTitle>
                  <CardDescription>
                    {porUnidade
                      ? "Média de preço por apartamento"
                      : "Cada linha compara o R$/m² com a mediana do bairro, por construção e tamanho (p50)"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {porUnidade ? (
                    <UnitTable rows={porUnidadeRows} />
                  ) : (
                    <TransactionsTable rows={txRows} />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Benchmark ·{" "}
                    {mainBairro
                      ? bairroDisplay(
                          rows.find((r) => r.bairroNorm === mainBairro)?.bairro ??
                            allBairros.find((b) => b.bairroNorm === mainBairro)?.bairro ??
                            mainBairro,
                        )
                      : "—"}
                  </CardTitle>
                  <CardDescription>
                    Mediana R$/m² por época de construção × tamanho
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BenchmarkMatrix cells={benchCells} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Filtros aplicados</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-xs">
                  {parsed.success && parsed.data.rua && (
                    <Badge variant="outline">Rua: {parsed.data.rua}</Badge>
                  )}
                  {parsed.success && parsed.data.numero && (
                    <Badge variant="outline">Nº: {parsed.data.numero}</Badge>
                  )}
                  {mainBairro && (
                    <Badge variant="outline">Bairro: {bairroDisplay(rows[0]?.bairro ?? "")}</Badge>
                  )}
                  {years && years.length > 0 && (
                    <Badge variant="outline">Anos: {years.join(", ")}</Badge>
                  )}
                  {minM2 != null && <Badge variant="outline">≥ {minM2} m²</Badge>}
                  {maxM2 != null && <Badge variant="outline">≤ {maxM2} m²</Badge>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitTable({ rows }: { rows: TxRow[] }) {
  const units = summarizeUnits(rows);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Apto</th>
            <th className="py-2 pr-4 text-right font-medium">Área</th>
            <th className="py-2 pr-4 text-right font-medium">Média</th>
            <th className="py-2 pr-4 text-right font-medium">R$/m²</th>
            <th className="py-2 pr-4 text-right font-medium">vs p50</th>
            <th className="py-2 text-right font-medium">Vendas</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
              <tr key={u.unit} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono">{u.unit}</td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums">
                  {u.area ? u.area.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums">
                  {money(u.avgBase)}
                </td>
                <td className="py-2 pr-4 text-right font-mono tabular-nums">
                  {u.avgRsm2 ? rsm2(u.avgRsm2) : "—"}
                </td>
                <td className="py-2 pr-4 text-right">
                  {u.comp ? (
                    <CompBadge pct={u.comp.pct} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">
                  {u.sales}x
                  <span className="ml-1 text-xs">{u.years.join(", ")}</span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}