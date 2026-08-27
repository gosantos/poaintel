"use client";

import Link from "next/link";
import { bairroDisplay } from "@/lib/bairros";
import { slugify } from "@/lib/data";
import { formatNumber, rsm2 } from "@/lib/format";
import { BairroFilter } from "@/components/bairro-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface HeatRow {
  bairro: string;
  bairroNorm: string;
  nAll: number;
  byYear: Record<number, { n: number; medianRsm2: number }>;
}

export function YearHeatmap({
  years,
  rows,
}: {
  years: number[];
  rows: HeatRow[];
}) {
  const vals = rows.flatMap((r) =>
    years.map((y) => r.byYear[y]?.medianRsm2).filter((v): v is number => !!v),
  );
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 1);

  return (
    <div>
      <BairroFilter />
      <div className="mt-3 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-40 bg-card">
                Bairro
              </TableHead>
              {years.map((y) => (
                <TableHead key={y} className="text-right font-mono">
                  {y}
                  {y === 2026 ? "*" : ""}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.bairroNorm} data-bairro={r.bairroNorm}>
                <TableCell className="sticky left-0 z-10 bg-card">
                  <Link
                    href={`/bairro/${slugify(r.bairroNorm)}`}
                    className="font-medium hover:underline"
                  >
                    {bairroDisplay(r.bairro)}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">
                    {formatNumber(r.nAll)} tx
                  </div>
                </TableCell>
                {years.map((y) => {
                  const cell = r.byYear[y];
                  if (!cell) {
                    return (
                      <TableCell
                        key={y}
                        className="text-right text-muted-foreground"
                      >
                        —
                      </TableCell>
                    );
                  }
                  const rel = (cell.medianRsm2 - min) / span;
                  const alpha = 0.06 + 0.5 * rel;
                  return (
                    <TableCell
                      key={y}
                      className="text-right"
                      style={{
                        backgroundColor: `color-mix(in oklab, var(--chart-1) ${alpha * 100}%, transparent)`,
                      }}
                    >
                      <div className="font-mono text-xs tabular-nums">
                        {rsm2(cell.medianRsm2)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatNumber(cell.n)}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        *2026 parcial. Célula = mediana R$/m² e volume do ano. Cor relativa ao
        intervalo da tabela.
      </p>
    </div>
  );
}
