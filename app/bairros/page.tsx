import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BairroFilter } from "@/components/bairro-filter";
import { bairroDisplay } from "@/lib/bairros";
import { formatNumber, rsm2 } from "@/lib/format";
import { slugify } from "@/lib/data";
import { getBairros } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bairros" };

export default async function BairrosPage() {
  const bairros = await getBairros();
  const max = Math.max(...bairros.map((b) => b.medianRsm2), 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bairros</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Volume e mediana R$/m² por bairro de Porto Alegre, 2020–2026.
      </p>

      <div className="mt-6">
        <BairroFilter />
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bairro</TableHead>
                <TableHead className="text-right">Transações</TableHead>
                <TableHead className="text-right">Mediana R$/m²</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Último ano</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bairros.map((b) => (
                <TableRow key={b.bairroNorm} data-bairro={b.bairroNorm}>
                  <TableCell>
                    <Link
                      href={`/bairro/${slugify(b.bairroNorm)}`}
                      className="flex items-center gap-3 font-medium hover:underline"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{
                          backgroundColor: `color-mix(in oklab, var(--chart-1) ${
                            0.15 + 0.85 * (b.medianRsm2 / max)
                          }, transparent)`,
                        }}
                      />
                      {bairroDisplay(b.bairro)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatNumber(b.n)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {rsm2(b.medianRsm2)}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                    {b.yearMax}
                  </TableCell>
                  <TableCell className="text-right">
                    <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}