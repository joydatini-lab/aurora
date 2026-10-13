/**
 * ReviewSummaryCards — cartes de synthèse de la revue (cat. 2.7, 4.7).
 *
 * Étape 2 (muet) : reçoit `ReviewSummaryData` + callbacks. Pas de store.
 *
 * Structure (cat. 2.7) :
 * - Score global + tendance (↑/↓)
 * - Équilibre : temps de travail / repos / apprentissage
 * - Écart vs objectif
 * - Cause principale (top cause)
 */
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";

export interface ReviewSummaryData {
  /** Note globale (0-100) ou null. */
  score: number | null;
  /** Tendance : + / - / = par rapport à la période précédente. */
  trend: "up" | "down" | "flat";
  /** Écart vs objectif en points (positif = au-dessus). */
  gapVsTarget?: number;
  /** Balance (0-100 chacun, les 3 doivent faire ~100). */
  balance: {
    work: number;
    rest: number;
    learning: number;
  };
  /** Cause principale détectée (libellé court). */
  topCause?: string;
}

export interface ReviewSummaryCardsProps {
  data: ReviewSummaryData;
  /** Libellé de la période ("Cette semaine"). */
  periodLabel?: string;
  /** Appelé pour ouvrir le détail du score. */
  onOpenScore?: () => void;
  /** Appelé pour filtrer par cause. */
  onSelectCause?: (cause: string) => void;
  className?: string;
}

export function ReviewSummaryCards({
  data,
  periodLabel,
  onOpenScore,
  onSelectCause,
  className,
}: ReviewSummaryCardsProps) {
  const { score, trend, gapVsTarget, balance, topCause } = data;
  const totalPct = balance.work + balance.rest + balance.learning;
  const workPct = totalPct > 0 ? Math.round((balance.work / totalPct) * 100) : 0;
  const restPct = totalPct > 0 ? Math.round((balance.rest / totalPct) * 100) : 0;
  const learningPct = totalPct > 0 ? Math.round((balance.learning / totalPct) * 100) : 0;

  const gapLabel =
    gapVsTarget === undefined
      ? null
      : gapVsTarget === 0
        ? "À l'objectif"
        : gapVsTarget > 0
          ? `+${gapVsTarget} pts vs objectif`
          : `${gapVsTarget} pts vs objectif`;

  const trendIcon: IconKey =
    trend === "up" ? "success" : trend === "down" ? "warning" : "info";

  return (
    <div
      data-slot="review-summary-cards"
      className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3", className)}
    >
      {/* Score global */}
      <button
        type="button"
        onClick={onOpenScore}
        disabled={!onOpenScore}
        className={cn(
          "flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition-colors",
          onOpenScore && "hover:border-muted-foreground/40 cursor-pointer"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {periodLabel ?? "Score"}
          </span>
          <AppIcon name={trendIcon} size="xs" tone="muted" aria-hidden />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {score ?? "—"}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
        {gapLabel && (
          <span
            className={cn(
              "text-[11px] font-medium",
              (gapVsTarget ?? 0) >= 0 ? "text-primary" : "text-destructive"
            )}
          >
            {gapLabel}
          </span>
        )}
      </button>

      {/* Équilibre */}
      <div className="col-span-2 flex flex-col gap-2 rounded-lg border bg-card p-3 sm:col-span-1 sm:col-start-1">
        <span className="text-xs font-medium text-muted-foreground">Équilibre</span>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="bg-primary" style={{ width: `${workPct}%` }} />
          <div className="bg-primary/60" style={{ width: `${restPct}%` }} />
          <div className="bg-primary/30" style={{ width: `${learningPct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">{workPct}%</span>
            <br />
            Travail
          </div>
          <div>
            <span className="font-semibold text-foreground">{restPct}%</span>
            <br />
            Repos
          </div>
          <div>
            <span className="font-semibold text-foreground">{learningPct}%</span>
            <br />
            Apprentissage
          </div>
        </div>
      </div>

      {/* Cause principale */}
      <button
        type="button"
        onClick={() => topCause && onSelectCause?.(topCause)}
        disabled={!topCause || !onSelectCause}
        className={cn(
          "flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition-colors",
          topCause && onSelectCause && "hover:border-muted-foreground/40 cursor-pointer"
        )}
      >
        <span className="text-xs font-medium text-muted-foreground">
          Cause principale
        </span>
        {topCause ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[11px]">
              {topCause}
            </Badge>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </button>
    </div>
  );
}
