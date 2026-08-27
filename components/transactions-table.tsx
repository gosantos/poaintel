import { formatPct, fullDate, money, rsm2 } from "@/lib/format";
import { tierLabel } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface TxRow {
  id: number;
  year: number;
  dataEstimativa: string;
  dataPagamento: string | null;
  fullBase: number;
  rsm2: number;
  nUnidade: string | null;
  area: number;
  tier: string | null;
  band: string | null;
  situacao: string;
  logradouro?: string | null;
  nEndereco?: string | null;
  comp: { pct: number; p50: number } | null;
}

export function CompBadge({ pct }: { pct: number }) {
  const down = pct <= 0;
  return (
    <Badge
      variant={down ? "secondary" : "outline"}
      className={
        down
          ? "border-transparent bg-emerald-500/15 font-mono text-emerald-700 dark:text-emerald-400"
          : "font-mono text-amber-700 dark:text-amber-400"
      }
    >
      {formatPct(pct)}
    </Badge>
  );
}

export function TransactionsTable({
  rows,
  showAddress = false,
}: {
  rows: TxRow[];
  showAddress?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            {showAddress && <TableHead>Endereço</TableHead>}
            <TableHead>Apto</TableHead>
            <TableHead className="text-right">Área</TableHead>
            <TableHead className="text-right">Base</TableHead>
            <TableHead className="text-right">R$/m²</TableHead>
            <TableHead className="text-right">vs p50</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">
                {fullDate(r.dataEstimativa)}
              </TableCell>
              {showAddress && (
                <TableCell className="max-w-48 truncate text-xs">
                  {r.logradouro
                    ? `${r.logradouro}${r.nEndereco ? `, ${r.nEndereco}` : ""}`
                    : "—"}
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{r.nUnidade || "—"}</span>
                  {r.tier && (
                    <span className="text-[11px] text-muted-foreground">
                      {tierLabel(r.tier)}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {r.area.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {money(r.fullBase)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {rsm2(r.rsm2)}
              </TableCell>
              <TableCell className="text-right">
                {r.comp ? <CompBadge pct={r.comp.pct} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}