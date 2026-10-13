/**
 * TaskCard — carte tâche (cat. 2.4 Tasks, 2.2 Kanban, 2.9 Retro).
 *
 * Étape 2 (muet) : le composant ne fait aucun appel API ni ne lit de store.
 * Il reçoit `TaskCardData` et émet des événements via les props `on*`.
 *
 * Variantes :
 * - `variant="default"` — carte pleine (vue Liste / Kanban)
 * - `variant="compact"` — ligne dense (vue Liste dense)
 * - `variant="kanban"` — carte pour KanbanBoard (drop + drag handle)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { PriorityFlag, /* priorityToLevel, */ type PriorityLevel } from "./PriorityFlag";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export interface TaskCardData {
  id: string;
  title: string;
  description?: string;
  priority: 0 | 1 | 2 | 3 | 4 | 5;
  dueDate?: string;
  assignees?: { id: string; name: string; avatarUrl?: string }[];
  tags?: string[];
  /** Progression 0-100 (sous-tâches). */
  progress?: number;
  /** Indicateur de blocage. */
  isBlocked?: boolean;
  /** Statut interne (pour Kanban). */
  status?: "a_faire" | "en_cours" | "en_revue" | "termine";
}

export type TaskCardVariant = "default" | "compact" | "kanban";

export interface TaskCardProps
  extends Omit<React.ComponentProps<"article">, "onClick"> {
  data: TaskCardData;
  variant?: TaskCardVariant;
  /** Affiche les assignees (avatars ou initiales). */
  showAssignees?: boolean;
  /** Affiche les sous-tâches / progression. */
  showProgress?: boolean;
  /** Affiche les tags. */
  showTags?: boolean;
  /** Appelé au clic sur le corps de la carte (pas les actions secondaires). */
  onOpen?: (id: string) => void;
  /** Appelé quand le drapeau priorité change (mode interactif = true). */
  onPriorityChange?: (id: string, level: PriorityLevel) => void;
  /** Appelé quand la tâche est cochée (marquer terminée). */
  onComplete?: (id: string) => void;
  /** Affiche le bouton « Terminer » (désactivé si `status === "termine"`). */
  showComplete?: boolean;
  /** Appelé quand l'utilisateur clique sur le menu (plus d'actions). */
  onMenu?: (id: string) => void;
  /** Affiche le handle de drag (variant kanban). */
  draggable?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Sous-composants                                                     */
/* ------------------------------------------------------------------ */

function AssigneeAvatars({
  assignees,
  max = 3,
}: {
  assignees?: TaskCardData["assignees"];
  max?: number;
}) {
  if (!assignees || assignees.length === 0) return null;
  const shown = assignees.slice(0, max);
  const overflow = assignees.length - shown.length;
  return (
    <div className="flex -space-x-1.5" aria-label={`${assignees.length} assigné(s)`}>
      {shown.map((a) => (
        <span
          key={a.id}
          className="grid size-5 place-items-center overflow-hidden rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground"
          title={a.name}
        >
          {a.avatarUrl ? (
            <img src={a.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            a.name.slice(0, 2).toUpperCase()
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span className="grid size-5 place-items-center rounded-full border-2 border-card bg-muted text-[10px] text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function ProgressRing({ value, size = 16 }: { value: number; size?: number }) {
  const r = (size - 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} aria-hidden className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="2" className="stroke-muted" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="2"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="stroke-primary"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

function TaskCard({
  data,
  variant = "default",
  showAssignees = true,
  showProgress = true,
  showTags = true,
  onOpen,
  onPriorityChange,
  onComplete,
  showComplete = true,
  onMenu,
  draggable = false,
  className,
  ...props
}: TaskCardProps) {
  const isDone = data.status === "termine";
  /* const level = priorityToLevel(data.priority); */

  const handleClick = () => {
    if (!onOpen) return;
    onOpen(data.id);
  };

  const handlePriority = (newLevel: PriorityLevel) => {
    onPriorityChange?.(data.id, newLevel);
  };

  return (
    <article
      data-slot="task-card"
      data-variant={variant}
      draggable={draggable || undefined}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border bg-card text-card-foreground transition-colors hover:border-muted-foreground/40",
        variant === "default" && "p-3",
        variant === "compact" && "px-3 py-2",
        variant === "kanban" && "cursor-grab p-3 active:cursor-grabbing",
        isDone && "opacity-60",
        className
      )}
      {...props}
    >
      {/* Drag handle (kanban) */}
      {draggable && (
        <div
          className="absolute left-1 top-1 hidden cursor-grab text-muted-foreground/40 group-hover:block"
          data-drag-handle
          aria-hidden
        >
          <AppIcon name="open" size="xs" aria-hidden />
        </div>
      )}

      {/* Ligne 1 : titre + priorité + blocage */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {data.title}
          </p>
          {data.description && variant !== "compact" && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {data.description}
            </p>
          )}
        </div>
        {data.isBlocked && (
          <AppIcon name="warning" size="xs" tone="warning" aria-hidden />
        )}
      </div>

      {/* Ligne 2 : métadonnées */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <PriorityFlag
          priority={data.priority}
          interactive={!!onPriorityChange}
          onChange={handlePriority}
          showLabel={variant !== "compact"}
          className="shrink-0"
        />
        {data.dueDate && (
          <span className="shrink-0">
            {new Date(data.dueDate).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        )}
        {data.progress !== undefined && showProgress && variant !== "compact" && (
          <span className="flex items-center gap-1 shrink-0">
            <ProgressRing value={data.progress} />
            <span className="tabular-nums">{data.progress}%</span>
          </span>
        )}
        {data.tags && showTags && variant !== "compact" && (
          <div className="flex flex-wrap gap-1">
            {data.tags.slice(0, 3).map((t, i) => (
              <Badge key={i} variant="outline" className="text-[10px] leading-none">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Ligne 3 : assignees + actions */}
      <div className="flex items-center justify-between gap-2">
        {showAssignees ? (
          <AssigneeAvatars assignees={data.assignees} />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {showComplete && !isDone && onComplete && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onComplete(data.id)}
              aria-label="Marquer comme terminée"
              className="size-6"
            >
              <AppIcon name="success" size="xs" aria-hidden />
            </Button>
          )}
          {onMenu && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMenu(data.id)}
              aria-label="Plus d'actions"
              className="size-6"
            >
              <AppIcon name="open" size="xs" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export { TaskCard };
