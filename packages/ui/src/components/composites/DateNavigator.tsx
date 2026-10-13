/**
 * DateNavigator — navigation de date (cat. 2.3, 1.4).
 *
 * Précédent / Suivant + libellé de date ou plage + bouton « Aujourd'hui »
 * + sélecteur de période.
 *
 * Étape 2 (muet) : reçoit `date` (Date) + `onDateChange` + `onPeriodChange`.
 * Pas de store, pas d'API.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";

export type DatePeriod = "day" | "week" | "month" | "quarter" | "year";

export const PERIOD_LABELS: Record<DatePeriod, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  quarter: "Trimestre",
  year: "Année",
};

export interface DateNavigatorProps {
  /** Date courante (début de la période affichée). */
  date: Date;
  /** Appelé quand on change de période. */
  onDateChange: (d: Date) => void;
  /** Période courante. */
  period?: DatePeriod;
  /** Appelé quand on change de période. */
  onPeriodChange?: (p: DatePeriod) => void;
  /** Libellé personnalisé de la plage (si non fourni, on dérive de `date` + `period`). */
  label?: string;
  /** Affiche le bouton « Aujourd'hui ». */
  showToday?: boolean;
  className?: string;
}

function DateNavigator({
  date,
  onDateChange,
  period = "month",
  onPeriodChange,
  label,
  showToday = true,
  className,
}: DateNavigatorProps) {
  const today = React.useMemo(() => new Date(), []);
  const isToday =
    date.toDateString() === today.toDateString() &&
    period === "day";

  /** Décale selon la période. */
  const step = (dir: -1 | 1) => {
    const d = new Date(date);
    switch (period) {
      case "day":
        d.setDate(d.getDate() + dir);
        break;
      case "week":
        d.setDate(d.getDate() + dir * 7);
        break;
      case "month":
        d.setMonth(d.getMonth() + dir);
        break;
      case "quarter":
        d.setMonth(d.getMonth() + dir * 3);
        break;
      case "year":
        d.setFullYear(d.getFullYear() + dir);
        break;
    }
    onDateChange(d);
  };

  /** Libellé de la plage (dérivé si `label` non fourni). */
  const displayLabel =
    label ??
    (() => {
      const fmt = new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
      });
      switch (period) {
        case "day":
          return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
        case "week":
          return `Semaine du ${fmt.format(date)}`;
        case "quarter":
          return `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
        case "year":
          return date.getFullYear().toString();
        default:
          return fmt.format(date);
      }
    })();

  return (
    <div
      data-slot="date-navigator"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {/* Flèches */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="outline"
          size="icon-xs"
          className="size-7"
          onClick={() => step(-1)}
          aria-label="Période précédente"
        >
          <AppIcon name="retry" size="xs" aria-hidden className="rotate-180" />
        </Button>
        {showToday && (
          <Button
            variant={isToday ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onDateChange(today)}
          >
            Aujourd'hui
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-xs"
          className="size-7"
          onClick={() => step(1)}
          aria-label="Période suivante"
        >
          <AppIcon name="retry" size="xs" aria-hidden />
        </Button>
      </div>

      {/* Libellé de plage */}
      <span className="text-sm font-medium min-w-0 truncate">
        {displayLabel}
      </span>

      {/* Sélecteur de période */}
      {onPeriodChange && (
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {(Object.keys(PERIOD_LABELS) as DatePeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange?.(p)}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
              aria-pressed={period === p}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { DateNavigator };
