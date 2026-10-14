/**
 * RetroView — rétrospective de sprint / période (cat. 2.8, 4.8).
 *
 * Étape 2 (muet) : reçoit `RetroViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.8) :
 * - `RetroHeader` (période, équipe, statut)
 * - `MissedMilestoneList` (jalons manqués)
 * - `BACSummaryRow` (Budget / Avancement / Coût)
 * - `BACMetricTable` (lignes BAC détaillées)
 * - `MiniGanttRow` (vue gantt compacte)
 * - `RootCauseEditor` (causes racines)
 * - `RetroActionBoard` (board de tri des actions)
 * - `LessonsLearnedCard` (leçons apprises)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";
import {
  DateRangePicker,
  type DateRangePickerValue,
} from "src/components/ui/date-range-picker";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type RetroMilestoneStatus = "missed" | "at-risk" | "met" | "upcoming";

export interface RetroMilestone {
  id: string;
  title: string;
  dueDate: string;
  status: RetroMilestoneStatus;
  /** Écart en jours (positif = en retard). */
  daysLate?: number;
  owner?: string;
}

export interface BACMetric {
  id: string;
  label: string;
  planned: number;
  actual: number;
  unit: string;
  /** Tendance : + = dérive au-dessus du prévu. */
  trend: "up" | "down" | "flat";
}

export interface RetroRootCause {
  id: string;
  title: string;
  description?: string;
  /** Catégorie (ex. "processus", "ressources", "scope"). */
  category?: string;
  /** Actions associées (nb). */
  actionCount?: number;
}

export interface RetroActionItem {
  id: string;
  title: string;
  /** Colonne du board : backlog / this-sprint / next-sprint / done. */
  column: "backlog" | "this-sprint" | "next-sprint" | "done";
  owner?: string;
  dueDate?: string;
}

export interface RetroLesson {
  id: string;
  /** Type : "keep" / "improve" / "start". */
  type: "keep" | "improve" | "start";
  title: string;
  detail?: string;
}

export interface RetroViewData {
  /** Libellé de la période. */
  periodLabel: string;
  /** Période sélectionnée (dates exactes). */
  periodFrom?: Date;
  /** Période sélectionnée (date de fin). */
  periodTo?: Date;
  /** Équipe / projet. */
  teamLabel?: string;
  /** Statut global de la rétro. */
  status: "draft" | "in-review" | "published" | "archived";
  milestones: RetroMilestone[];
  bacMetrics: BACMetric[];
  rootCauses: RetroRootCause[];
  actions: RetroActionItem[];
  lessons: RetroLesson[];
}

export interface RetroViewProps {
  data: RetroViewData;
  onToggleMilestone?: (id: string, status: RetroMilestoneStatus) => void;
  onAddRootCause?: (cause: Omit<RetroRootCause, "id">) => void;
  onRemoveRootCause?: (id: string) => void;
  onMoveAction?: (actionId: string, toColumn: RetroActionItem["column"]) => void;
  onAddLesson?: (lesson: Omit<RetroLesson, "id">) => void;
  onPublish?: () => void;
  /** Appelé quand la période (dates) change via le `DateRangePicker`. */
  onPeriodChange?: (range: DateRangePickerValue) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* RetroHeader                                                        */
/* ------------------------------------------------------------------ */

const RETRO_STATUS: Record<RetroViewData["status"], string> = {
  draft: "Brouillon",
  "in-review": "En revue",
  published: "Publiée",
  archived: "Archivée",
};

export function RetroHeader({
  data,
  onPublish,
  onPeriodChange,
  className,
}: {
  data: RetroViewData;
  onPublish?: () => void;
  onPeriodChange?: (range: DateRangePickerValue) => void;
  className?: string;
}) {
  return (
    <div
      data-slot="retro-header"
      className={cn(
        "flex flex-col gap-3 border-b pb-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AppIcon name="chart" size="lg" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Rétrospective
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.periodLabel}
              {data.teamLabel ? ` · ${data.teamLabel}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={data.status === "published" ? "default" : "outline"}>
            {RETRO_STATUS[data.status]}
          </Badge>
          {data.status === "draft" && onPublish && (
            <Button size="sm" onClick={onPublish}>
              Publier
            </Button>
          )}
        </div>
      </div>
      {onPeriodChange && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Période :</span>
          <DateRangePicker
            size="sm"
            value={{
              from: data.periodFrom,
              to: data.periodTo,
            }}
            onApply={onPeriodChange}
            className="h-7"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MissedMilestoneList                                                */
/* ------------------------------------------------------------------ */

export interface MissedMilestoneListProps {
  milestones: RetroMilestone[];
  onToggle?: (id: string, status: RetroMilestoneStatus) => void;
  className?: string;
}

export function MissedMilestoneList({
  milestones,
  onToggle,
  className,
}: MissedMilestoneListProps) {
  const missed = milestones.filter((m) => m.status === "missed" || m.status === "at-risk");
  if (missed.length === 0) return null;
  return (
    <Card data-slot="missed-milestones" className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">
          Jalons manqués / à risque
        </CardTitle>
        <Badge variant="destructive" className="text-[10px]">
          {missed.length}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {missed.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border px-3 py-2",
              m.status === "missed" && "border-destructive/30 bg-destructive/5",
              m.status === "at-risk" && "border-warning/40 bg-warning/5"
            )}
          >
            <div className="flex items-center gap-2">
              <AppIcon
                name={m.status === "missed" ? "error" : "warning"}
                size="xs"
                tone={m.status === "missed" ? "danger" : "warning"}
                aria-hidden
              />
              <div>
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {m.owner ? `${m.owner} · ` : ""}
                  {new Date(m.dueDate).toLocaleDateString("fr-FR")}
                  {m.daysLate !== undefined && m.daysLate > 0 && (
                    <span className="text-destructive"> · +{m.daysLate}j</span>
                  )}
                </p>
              </div>
            </div>
            {onToggle && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onToggle(m.id, "met")}
              >
                Marquer atteint
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* BACSummaryRow                                                       */
/* ------------------------------------------------------------------ */

export interface BACSummaryRowProps {
  metrics: BACMetric[];
  className?: string;
}

export function BACSummaryRow({
  metrics,
  className,
}: BACSummaryRowProps) {
  const tiles = metrics.slice(0, 4);
  return (
    <div
      data-slot="bac-summary-row"
      className={cn(
        "grid grid-cols-2 gap-2.5 sm:grid-cols-4",
        className
      )}
    >
      {tiles.map((m) => {
        const delta = m.actual - m.planned;
        const isOver = m.unit !== "%" && delta > 0;
        return (
          <Card key={m.id} className="gap-1.5 p-3">
            <CardContent className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {m.label}
                </span>
                <AppIcon
                  name={m.trend === "up" ? "success" : m.trend === "down" ? "warning" : "info"}
                  size="xs"
                  tone="muted"
                  aria-hidden
                />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    isOver && "text-destructive"
                  )}
                >
                  {m.actual}
                  <span className="text-xs text-muted-foreground">
                    {" "}{m.unit}
                  </span>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                prévu {m.planned}
                {m.unit}
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MiniGanttRow                                                       */
/* ------------------------------------------------------------------ */

export interface MiniGanttRow {
  id: string;
  label: string;
  /** Position (0-100) et largeur (0-100) de la barre. */
  startPct: number;
  widthPct: number;
  /** Couleur d'accent. */
  color?: string;
  status?: "done" | "in-progress" | "planned" | "missed";
}

export function MiniGanttRow({
  rows,
  className,
}: {
  rows: MiniGanttRow[];
  className?: string;
}) {
  return (
    <div
      data-slot="mini-gantt-row"
      className={cn("flex flex-col gap-2", className)}
    >
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
            {r.label}
          </span>
          <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
            <div
              className={cn(
                "absolute top-0 h-full rounded transition-all",
                r.status === "done" && "bg-primary",
                r.status === "in-progress" && "bg-primary/70",
                r.status === "planned" && "bg-muted-foreground/20",
                r.status === "missed" && "bg-destructive/60",
                !r.status && "bg-primary"
              )}
              style={{
                left: `${r.startPct}%`,
                width: `${r.widthPct}%`,
                backgroundColor: r.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RootCauseEditor                                                     */
/* ------------------------------------------------------------------ */

export interface RootCauseEditorProps {
  causes: RetroRootCause[];
  onAdd?: (cause: Omit<RetroRootCause, "id">) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

export function RootCauseEditor({
  causes,
  onAdd,
  onRemove,
  className,
}: RootCauseEditorProps) {
  const [newTitle, setNewTitle] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");

  const canAdd = newTitle.trim().length > 0 && onAdd;

  return (
    <div
      data-slot="root-cause-editor"
      className={cn("flex flex-col gap-3", className)}
    >
      <h3 className="text-sm font-semibold">Causes racines</h3>
      <div className="flex flex-col gap-1.5">
        {causes.map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between gap-2 rounded-md border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{c.title}</p>
                {c.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {c.category}
                  </Badge>
                )}
              </div>
              {c.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {c.description}
                </p>
              )}
              {c.actionCount !== undefined && c.actionCount > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {c.actionCount} action{c.actionCount > 1 ? "s" : ""} associée
                  {c.actionCount > 1 ? "s" : ""}
                </p>
              )}
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                aria-label={`Supprimer la cause ${c.title}`}
                className="text-muted-foreground/40 transition-colors hover:text-destructive"
              >
                <AppIcon name="retry" size="xs" className="rotate-45" aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Ajout */}
      {onAdd && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nouvelle cause racine…"
              className="flex-1 h-8 text-sm"
            />
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Catégorie (optionnel)"
              className="h-8 text-sm sm:w-40"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Une cause racine explique un écart BAC ou un jalon manqué.
            </p>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!canAdd}
              onClick={() => {
                onAdd({
                  title: newTitle.trim(),
                  category: newCategory.trim() || undefined,
                });
                setNewTitle("");
                setNewCategory("");
              }}
            >
              Ajouter la cause
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RetroActionBoard                                                    */
/* ------------------------------------------------------------------ */

const RETRO_ACTION_COLUMNS: {
  key: RetroActionItem["column"];
  label: string;
}[] = [
  { key: "backlog", label: "Backlog" },
  { key: "this-sprint", label: "Ce sprint" },
  { key: "next-sprint", label: "Prochain" },
  { key: "done", label: "Fait" },
];

export interface RetroActionBoardProps {
  actions: RetroActionItem[];
  onMoveAction?: (actionId: string, toColumn: RetroActionItem["column"]) => void;
  className?: string;
}

export function RetroActionBoard({
  actions,
  onMoveAction,
  className,
}: RetroActionBoardProps) {
  return (
    <div
      data-slot="retro-action-board"
      className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-4", className)}
    >
      {RETRO_ACTION_COLUMNS.map((col) => {
        const items = actions.filter((a) => a.column === col.key);
        return (
          <div
            key={col.key}
            className="flex min-h-32 flex-col gap-2 rounded-lg border bg-muted/20 p-2"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">
                {col.label}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {items.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-1.5">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border bg-card p-2 text-xs"
                >
                  <p className="font-medium leading-tight">{a.title}</p>
                  {a.owner && (
                    <p className="mt-0.5 text-muted-foreground">{a.owner}</p>
                  )}
                  {onMoveAction && (
                    <div className="mt-1.5 flex items-center gap-1">
                      {RETRO_ACTION_COLUMNS.filter((c) => c.key !== col.key).map(
                        (c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => onMoveAction(a.id, c.key)}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted-foreground/20"
                          >
                            → {c.label}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
                  Vide
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LessonsLearnedCard                                                  */
/* ------------------------------------------------------------------ */

const LESSON_CONFIG: Record<
  RetroLesson["type"],
  { label: string; icon: IconKey; tone: "success" | "warning" | "default" }
> = {
  keep: { label: "À conserver", icon: "success", tone: "success" },
  improve: { label: "À améliorer", icon: "warning", tone: "warning" },
  start: { label: "À démarrer", icon: "info", tone: "default" },
};

export interface LessonsLearnedCardProps {
  lessons: RetroLesson[];
  onAdd?: (lesson: Omit<RetroLesson, "id">) => void;
  className?: string;
}

export function LessonsLearnedCard({
  lessons,
  onAdd,
  className,
}: LessonsLearnedCardProps) {
  const [type, setType] = React.useState<RetroLesson["type"]>("keep");
  const [title, setTitle] = React.useState("");

  const canAdd = title.trim().length > 0 && onAdd;

  return (
    <Card data-slot="lessons-learned-card" className={className}>
      <CardHeader>
        <CardTitle className="text-sm">Leçons apprises</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(["keep", "improve", "start"] as const).map((t) => {
            const items = lessons.filter((l) => l.type === t);
            const cfg = LESSON_CONFIG[t];
            return (
              <div
                key={t}
                className="flex flex-col gap-1.5 rounded-md border p-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <AppIcon name={cfg.icon} size="xs" tone={cfg.tone} aria-hidden />
                  <span className="text-xs font-medium">{cfg.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {items.map((l) => (
                    <p
                      key={l.id}
                      className="text-xs leading-snug text-foreground"
                    >
                      {l.title}
                    </p>
                  ))}
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Aucune
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ajout */}
        {onAdd && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              {(["keep", "improve", "start"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {LESSON_CONFIG[t].label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nouvelle leçon…"
                className="h-8 flex-1 text-sm"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!canAdd}
                onClick={() => {
                  onAdd({ type, title: title.trim() });
                  setTitle("");
                }}
              >
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function RetroView({
  data,
  onToggleMilestone,
  onAddRootCause,
  onRemoveRootCause,
  onMoveAction,
  onAddLesson,
  onPublish,
  onPeriodChange,
  className,
}: RetroViewProps) {
  return (
    <div
      data-slot="retro-view"
      className={cn("flex flex-col gap-5", className)}
    >
      <RetroHeader data={data} onPublish={onPublish} onPeriodChange={onPeriodChange} />

      <MissedMilestoneList
        milestones={data.milestones}
        onToggle={onToggleMilestone}
      />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">BAC (Budget / Avancement / Coût)</h3>
        <BACSummaryRow metrics={data.bacMetrics} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Causes racines</h3>
        <RootCauseEditor
          causes={data.rootCauses}
          onAdd={onAddRootCause}
          onRemove={onRemoveRootCause}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Actions</h3>
        <RetroActionBoard actions={data.actions} onMoveAction={onMoveAction} />
      </div>

      <div className="flex flex-col gap-2">
        <LessonsLearnedCard lessons={data.lessons} onAdd={onAddLesson} />
      </div>
    </div>
  );
}
