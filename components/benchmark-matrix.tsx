import { bandLabel, TIERS, tierLabel } from "@/lib/data";
import { formatNumber, rsm2 } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface BenchmarkCellData {
  tier: string;
  band: string;
  n: number;
  p25: number;
  p50: number;
  p75: number;
}

const BANDS = ["S", "M", "L", "XL"] as const;

export function BenchmarkMatrix({
  cells,
}: {
  cells: BenchmarkCellData[];
}) {
  const byKey = new Map(cells.map((c) => [`${c.tier}|${c.band}`, c]));
  const maxP50 = Math.max(...cells.map((c) => c.p50), 1);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Construção</TableHead>
            {BANDS.map((b) => (
              <TableHead key={b} className="text-center">
                <span className="font-medium">{b}</span>
                <span className="ml-1.5 hidden font-normal text-muted-foreground sm:inline">
                  {bandLabel(b)}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {TIERS.map((tier) => (
            <TableRow key={tier}>
              <TableCell className="font-medium">
                {tierLabel(tier)}
              </TableCell>
              {BANDS.map((band) => {
                const cell = byKey.get(`${tier}|${band}`);
                if (!cell) {
                  return (
                    <TableCell key={band} className="text-center text-muted-foreground">
                      —
                    </TableCell>
                  );
                }
                const rel = cell.p50 / maxP50;
                const alpha = 0.05 + 0.26 * rel;
                return (
                  <TableCell
                    key={band}
                    className="text-center align-middle"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--chart-1) ${alpha * 100}%, transparent)`,
                    }}
                  >
                    <div className="font-mono text-sm font-medium tabular-nums">
                      {rsm2(cell.p50)}
                    </div>
                     <div className="text-xs text-muted-foreground">
                      {formatNumber(cell.n)} tx
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}