/**
 * GanttRow — 05 §3.6.4: one task = one line (mobile-first Gantt).
 *
 * Shared date axis (JetBrains Mono xs labels, 05 §3.4 Pager);
 * bar status colors: in-progress = primary / done = success /
 * to-do = border-strong / blocked = warning.
 * 5 canonical states: idle / loading / empty / error / offline.
 *
 * Redesign premium (image de référence, manager.go / notion-style) :
 * - Les étiquettes de temps sont en **colonne verticale sticky** (pas
 *   en haut du graphe) — chaque tâche garde sa ligne propre.
 * - La barre de `in-progress` est **bicolore** (fondu avant/après le
 *   % complété) pour un aperçu visuel du progrès.
 * - Un `isMilestone` (jalons, durée nulle) remplace la barre par une
 *   lozange (45°) centrée sur `start`, avec le `title` à droite de la
 *   lozange. `end` et `completionPct` sont ignorés dans ce mode.
 */
import { cn } from "src/lib/utils";
import type { GanttRowProps } from "src/renderers/contracts";

const BAR: Record<GanttRowProps["status"], string> = {
  "in-progress": "bg-primary",
  done: "bg-success",
  todo: "bg-border-strong",
  blocked: "bg-warning",
};

export function GanttRow({
  title,
  status,
  start,
  end,
  completionPct,
  /**
   * Milestone (agent-prompts Phase 2.3) : le bar est remplacé par une
   * lozange (45°) centré sur `start`, avec le `title` à droite de la
   * lozange. Les `completionPct` et `end` sont ignorés (un jalons n'a
   * pas de durée).
   *
   * @summary jalons (marker de durée nulle)
   */
  isMilestone = false,
  axisLabels,
  loading,
  errorMessage,
  onRetry,
  className,
}: GanttRowProps & {
  isMilestone?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const left = Math.min(100, Math.max(0, start * 100));
  const width = Math.max(2, (end - start) * 100);
  // Un jalons = point (pas de durée) : la lozange est centrée sur `start`.
  const milestonePos = Math.min(98, Math.max(1, start * 100));

  if (loading) {
    return (
      <div
        data-aurora-component="GanttRow"
        data-state="loading"
        className={cn("space-y-1", className)}
        role="status"
        aria-label="Chargement"
      >
        <div className="h-3 w-32 rounded bg-muted animate-pulse-skeleton" />
        <div className="h-4 rounded bg-muted animate-pulse-skeleton" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        data-aurora-component="GanttRow"
        data-state="error"
        className={cn("space-y-2", className)}
      >
        <div
          role="alert"
          className="flex items-center justify-between rounded-md border border-danger bg-danger-surface p-3 text-sm text-danger"
        >
          <span>{errorMessage}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-danger/40 px-2 py-1 text-xs hover:bg-danger/20"
            >
              Réessayer
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // Layout premium : le title passe sous la barre (image de référence),
  // la ligne est un bloc unique, aligné sur l'axe vertical des temps.
  const titleInRow = (
    <p className="truncate text-sm font-medium text-foreground">{title}</p>
  );

  return (
    <div
      data-aurora-component="GanttRow"
      data-state="idle"
      data-milestone={isMilestone || undefined}
      className={cn("space-y-1.5", className)}
    >
      {/* La barre (ou le jalons) */}
      <div
        role="progressbar"
        aria-valuenow={isMilestone ? 100 : Math.round(left)}
        aria-valuemax={100}
        aria-valuetext={title}
        className="relative h-5 overflow-hidden rounded-md bg-muted/40"
      >
        {isMilestone ? (
          <div
            aria-hidden
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] shadow-sm"
            style={{
              left: `${milestonePos}%`,
              background: "hsl(var(--aurora-accent-punctual-h))",
            }}
          />
        ) : (
          <div
            className={cn(
              "absolute inset-y-0 rounded-md shadow-sm",
              BAR[status],
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            {status === "in-progress" && completionPct !== undefined ? (
              <div
                className="h-full bg-background/30"
                style={{
                  width: `${Math.min(100, completionPct)}%`,
                }}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Le titre : à gauche pour une tâche, à droite du lozange pour
          un jalons (image de référence : les jalons sont marqués à
          droite du point). */}
      {isMilestone ? (
        <div className="flex items-center gap-2">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {title}
          </p>
          <span
            aria-hidden
            className="h-px flex-1 bg-border"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          {titleInRow}
          {completionPct !== undefined ? (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {completionPct}%
            </span>
          ) : null}
        </div>
      )}

      {/* L'axe de temps : étiquettes en colonne verticale sticky
          (colonne à gauche du graphe), image de référence. */}
      {axisLabels?.length ? (
        <div
          aria-hidden
          className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground/70 tabular-nums"
        >
          {axisLabels.map((lbl) => (
            <span key={lbl}>{lbl}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
