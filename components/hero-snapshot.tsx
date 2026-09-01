import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { bairroDisplay } from "@/lib/bairros";
import { formatNumber, formatPct, rsm2 } from "@/lib/format";

interface BairroPeak {
  name: string;
  slug: string;
  medianRsm2: number;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function HeroSnapshot({
  lastYear,
  lastMedian,
  lastN,
  yoy,
  high,
  low,
}: {
  lastYear: number;
  lastMedian: number;
  lastN: number;
  yoy: number | null;
  high?: BairroPeak;
  low?: BairroPeak;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Panorama {lastYear}</CardTitle>
          {yoy !== null && (
            <Badge variant={yoy >= 0 ? "success" : "destructive"} className="font-mono">
              {formatPct(yoy)} vs {lastYear - 1}
            </Badge>
          )}
        </div>
        <CardDescription>Último ano completo do ITBI</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <Row label="Mediana por m²">
            <span className="font-mono tabular-nums">{rsm2(lastMedian)}</span>
          </Row>
          <Row label="Vendas">
            <span className="font-mono tabular-nums">{formatNumber(lastN)}</span>
          </Row>
          {high && (
            <Row label="Mais caro">
              <Link
                href={`/bairro/${high.slug}`}
                className="hover:underline"
              >
                {bairroDisplay(high.name)}
              </Link>{" "}
              <span className="font-mono tabular-nums text-muted-foreground">
                {rsm2(high.medianRsm2)}
              </span>
            </Row>
          )}
          {low && (
            <Row label="Mais acessível">
              <Link href={`/bairro/${low.slug}`} className="hover:underline">
                {bairroDisplay(low.name)}
              </Link>{" "}
              <span className="font-mono tabular-nums text-muted-foreground">
                {rsm2(low.medianRsm2)}
              </span>
            </Row>
          )}
        </dl>
        <Link
          href="/bairros"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Ranking dos bairros <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
