import Link from "next/link";
import { bairroDisplay } from "@/lib/bairros";
import { slugify } from "@/lib/data";
import { formatNumber, formatPct, rsm2 } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BairroMover } from "@/db/queries";

export function MoversTable({ rows }: { rows: BairroMover[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bairro</TableHead>
          <TableHead className="text-right">2024</TableHead>
          <TableHead className="text-right">2025</TableHead>
          <TableHead className="text-right">Δ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.bairroNorm}>
            <TableCell>
              <Link
                href={`/bairro/${slugify(r.bairroNorm)}`}
                className="font-medium hover:underline"
              >
                {bairroDisplay(r.bairro)}
              </Link>
              <div className="text-[11px] text-muted-foreground">
                {formatNumber(r.n0)} → {formatNumber(r.n1)} tx
              </div>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {rsm2(r.med0)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {rsm2(r.med1)}
            </TableCell>
            <TableCell className="text-right">
              <Badge
                variant="outline"
                className={
                  r.yoy < 0
                    ? "border-transparent bg-emerald-500/15 font-mono text-emerald-700 dark:text-emerald-400"
                    : r.yoy > 8
                      ? "border-transparent bg-amber-500/15 font-mono text-amber-800 dark:text-amber-400"
                      : "font-mono"
                }
              >
                {formatPct(r.yoy)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
