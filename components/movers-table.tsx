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
              <div className="text-xs text-muted-foreground">
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
                variant={r.yoy < 0 ? "success" : r.yoy > 8 ? "warning" : "outline"}
                className="font-mono"
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
