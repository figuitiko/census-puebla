import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  /** 0..1. Omit for tiles with no meter. `null` renders an empty meter ("no data yet"). */
  ratio?: number | null;
  /** The one number the view leads with: 48px. Exactly one per view. */
  hero?: boolean;
};

export function StatTile({ label, value, caption, ratio, hero }: Props) {
  const percent = ratio == null ? 0 : Math.round(ratio * 100);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {/* Proportional figures on purpose: tabular-nums makes big standalone numbers look loose. */}
        <p className={cn("font-semibold leading-none", hero ? "text-5xl" : "text-3xl")}>{value}</p>
        {ratio !== undefined && (
          <div
            role="meter"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: "var(--viz-meter-track)" }}
          >
            <div className="h-full rounded-full" style={{ width: `${percent}%`, background: "var(--viz-meter-fill)" }} />
          </div>
        )}
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}

export const formatPercent = (ratio: number | null) => (ratio === null ? "—" : `${Math.round(ratio * 100)}%`);
