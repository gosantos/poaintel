import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}