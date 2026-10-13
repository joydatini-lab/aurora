/**
 * ReviewView — vue de synthèse de revue (cat. 2.7, 4.7).
 *
 * Étape 2 (muet) : reçoit `ReviewViewData` + callbacks. Pas de store, pas d'API.
 *
 * Compose : `ReviewSummaryCards` + `ReviewBalanceTable` +
 * `ReviewComparisonPanel` (vs période précédente) +
 * `CauseChipGroup` + `ActionStepList`.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import {
  ReviewSummaryCards,
  ReviewSummaryData,
} from "src/components/composites/ReviewSummaryCards";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type ReviewPeriod = "day" | "week" | "month" | "quarter" | "custom";

export interface ReviewRowData {
  category: string;
  /** Valeur (ex. heures). */
  value: number;
  unit: string;
  /** Valeur précédente (pour le delta). */
  previous?: number;
  /** Cause associée (libellé). */
  cause?: string;
}

export interface ReviewComparisonData {
  /** Libellé de la période comparée. */
  label: string;
  /** Score de la période comparée. */
  score: number | null;
  /** Lignes de comparaison. */
  rows: ReviewRowData[];
}

export interface ReviewCause {
  id: string;
  label: string;
  /** Ponderation (0-100, poids de la cause dans l'écart). */
  weight?: number;
  /** Couleur d'accent optionnelle. */
  color?: string;
}

export interface ReviewActionStep {
  id: string;
  label: string;
  detail?: string;
  /** Assigné à une habitude / tâche existante. */
  linkedRef?: string;
  /** Progression (0-100). */
  progress?: number;
  /** Statut courant. */
  status?: "todo" | "in-progress" | "done";
}

export interface ReviewViewData {
  period: ReviewPeriod;
  periodLabel: string;
  summary: ReviewSummaryData;
  rows: ReviewRowData[];
  comparison?: ReviewComparisonData;
  causes: ReviewCause[];
  actions: ReviewActionStep[];
}

export interface ReviewViewProps {
  data: ReviewViewData;
  /** Appelé quand on ouvre le détail d'une cause. */
  onOpenCauseDetail?: (causeId: string) => void;
  /** Appelé pour marquer un action step comme terminé. */
  onToggleAction?: (actionId: string, done: boolean) => void;
  /** Appelé pour publier / archiver la revue. */
  onPublish?: () => void;
  onArchive?: () => void;
  /** Cause active (filtrage). */
  activeCauseId?: string | null;
  onActiveCauseChange?: (id: string | null) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* CauseChipGroup                                                     */
/* ------------------------------------------------------------------ */

export interface CauseChipGroupProps {
  causes: ReviewCause[];
  activeId?: string | null;
  onChange: (id: string | null) => void;
  className?: string;
}

export function CauseChipGroup({
  causes,
  activeId,
  onChange,
  className,
}: CauseChipGroupProps) {
  return (
    <div
      data-slot="cause-chip-group"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
          activeId === null
            ? "border-primary bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        Toutes
      </button>
      {causes.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id === activeId ? null : c.id)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            c.id === activeId
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {c.color && (
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: c.color }}
              aria-hidden
            />
          )}
          {c.label}
          {c.weight !== undefined && (
            <span className="tabular-nums text-muted-foreground/70">
              {c.weight}%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ReviewBalanceTable                                                  */
/* ------------------------------------------------------------------ */

export interface ReviewBalanceTableProps {
  rows: ReviewRowData[];
  activeCauseId?: string | null;
  onRowClick?: (row: ReviewRowData) => void;
  className?: string;
}

export function ReviewBalanceTable({
  rows,
  activeCauseId,
  onRowClick,
  className,
}: ReviewBalanceTableProps) {
  return (
    <div
      data-slot="review-balance-table"
      className={cn("overflow-hidden rounded-lg border bg-card", className)}
    >
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Catégorie</th>
            <th className="px-3 py-2 text-right font-medium">Valeur</th>
            <th className="px-3 py-2 text-right font-medium">Delta</th>
            <th className="px-3 py-2 text-left font-medium">Cause</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const delta =
              row.previous !== undefined ? row.value - row.previous : undefined;
            const isFiltered =
              activeCauseId !== null &&
              activeCauseId !== undefined &&
              row.cause !== activeCauseId;
            return (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border/40 last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/30",
                  isFiltered && "opacity-40"
                )}
              >
                <td className="px-3 py-2 font-medium">{row.category}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.value}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {row.unit}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums",
                    delta === undefined
                      ? "text-muted-foreground"
                      : delta > 0
                        ? "text-primary"
                        : delta < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                  )}
                >
                  {delta === undefined ? "—" : delta > 0 ? `+${delta}` : delta}
                </td>
                <td className="px-3 py-2">
                  {row.cause ? (
                    <Badge variant="outline" className="text-[10px]">
                      {row.cause}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ReviewComparisonPanel                                               */
/* ------------------------------------------------------------------ */

export interface ReviewComparisonPanelProps {
  comparison: ReviewComparisonData;
  currentSummary: ReviewSummaryData;
  className?: string;
}

export function ReviewComparisonPanel({
  comparison,
  currentSummary,
  className,
}: ReviewComparisonPanelProps) {
  return (
    <div
      data-slot="review-comparison-panel"
      className={cn(
        "rounded-lg border bg-card p-4",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Comparaison</h3>
        <Badge variant="outline" className="text-[10px]">
          {comparison.label}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Score</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {comparison.score ?? "—"}
          </p>
        </div>
        <div className="rounded-md bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Actuel</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {currentSummary.score ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ActionStepList                                                      */
/* ------------------------------------------------------------------ */

export interface ActionStepListProps {
  actions: ReviewActionStep[];
  onToggle?: (id: string, done: boolean) => void;
  onOpenLinkedRef?: (ref: string) => void;
  className?: string;
}

export function ActionStepList({
  actions,
  onToggle,
  onOpenLinkedRef,
  className,
}: ActionStepListProps) {
  if (actions.length === 0) return null;
  return (
    <div
      data-slot="action-step-list"
      className={cn("flex flex-col gap-2", className)}
    >
      <h3 className="text-sm font-semibold">Actions à mener</h3>
      {actions.map((a) => {
        const done = a.status === "done";
        return (
          <div
            key={a.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border bg-card p-3",
              done && "opacity-60"
            )}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              onClick={() => onToggle?.(a.id, !done)}
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              )}
            >
              {done && <AppIcon name="success" size="xs" aria-hidden />}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  done && "line-through text-muted-foreground"
                )}
              >
                {a.label}
              </p>
              {a.detail && (
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              )}
              {a.linkedRef && onOpenLinkedRef && (
                <button
                  type="button"
                  onClick={() => onOpenLinkedRef(a.linkedRef!)}
                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <AppIcon name="open" size="xs" aria-hidden />
                  {a.linkedRef}
                </button>
              )}
              {a.progress !== undefined && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${a.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {a.progress}%
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function ReviewView({
  data,
  onOpenCauseDetail,
  onToggleAction,
  onPublish,
  onArchive,
  activeCauseId,
  onActiveCauseChange,
  className,
}: ReviewViewProps) {
  const [localCause, setLocalCause] = React.useState<string | null>(null);
  const effectiveCause = activeCauseId ?? localCause;

  const handleCauseChange = (id: string | null) => {
    setLocalCause(id);
    onActiveCauseChange?.(id);
    if (id) onOpenCauseDetail?.(id);
  };

  return (
    <div
      data-slot="review-view"
      className={cn("flex flex-col gap-5", className)}
    >
      {/* En-tête */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Revue {data.periodLabel}
            </h2>
            <p className="text-sm text-muted-foreground">
              Période : {data.period}
            </p>
          </div>
          {(onPublish || onArchive) && (
            <div className="flex items-center gap-2">
              {onArchive && (
                <Button variant="outline" size="sm" onClick={onArchive}>
                  Archiver
                </Button>
              )}
              {onPublish && (
                <Button size="sm" onClick={onPublish}>
                  Publier la revue
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Cartes de synthèse */}
        <ReviewSummaryCards
          data={data.summary}
          periodLabel={data.periodLabel}
          onSelectCause={(c) => handleCauseChange(c)}
        />
      </div>

      {/* Causes */}
      <div className="flex flex-col gap-2">
        <CauseChipGroup
          causes={data.causes}
          activeId={effectiveCause}
          onChange={handleCauseChange}
        />
      </div>

      {/* Comparaison */}
      {data.comparison && (
        <ReviewComparisonPanel
          comparison={data.comparison}
          currentSummary={data.summary}
        />
      )}

      {/* Table de balance */}
      <ReviewBalanceTable
        rows={data.rows}
        activeCauseId={effectiveCause}
      />

      {/* Actions */}
      <ActionStepList
        actions={data.actions}
        onToggle={(id, done) => onToggleAction?.(id, done)}
      />
    </div>
  );
}
