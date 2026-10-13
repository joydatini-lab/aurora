/**
 * TaskRow — ligne tâche dense (cat. 2.4 Liste, 2.2 Projet Liste).
 *
 * Étape 2 (muet) : reçoit `TaskRowData` + callbacks. Pas de store.
 * La ligne est plus légère qu'une `TaskCard` variant="compact" :
 * colonnes fixes, hover-action au survol, checkbox inline.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Checkbox } from "src/components/ui/checkbox";
import { Progress } from "src/components/ui/progress";
import { PriorityFlag, /* priorityToLevel, */ type PriorityLevel } from "./PriorityFlag";
import type { TaskCardData } from "./TaskCard";

export interface TaskRowProps
  extends Omit<React.ComponentProps<"div">, "onClick"> {
  data: TaskCardData;
  /** Appelé quand la checkbox est cochée/décochée. */
  onToggleComplete?: (id: string, isDone: boolean) => void;
  /** Appelé quand le titre est cliqué (ouvia `onOpen`). */
  onOpen?: (id: string) => void;
  /** Appelé quand le drapeau priorité change. */
  onPriorityChange?: (id: string, level: PriorityLevel) => void;
  /** Affiche le bouton menu. */
  onMenu?: (id: string) => void;
  /** Affiche la colonne progression. */
  showProgress?: boolean;
  /** Affiche les dates. */
  showDates?: boolean;
  /** Colonne étiquettes. */
  showTags?: boolean;
  className?: string;
}

function TaskRow({
  data,
  onToggleComplete,
  onOpen,
  onPriorityChange,
  onMenu,
  showProgress = true,
  showDates = true,
  showTags = true,
  className,
  ...props
}: TaskRowProps) {
  const isDone = data.status === "termine";
  void (0) // _level = priorityToLevel(data.priority);

  return (
    <div
      data-slot="task-row"
      data-state={isDone ? "done" : "active"}
      className={cn(
        "group flex items-center gap-3 border-b px-3 py-2 text-sm transition-colors hover:bg-muted/30 last:border-0",
        className
      )}
      {...props}
    >
      {/* Checkbox */}
      {onToggleComplete && (
        <Checkbox
          checked={isDone}
          onCheckedChange={(v) => onToggleComplete(data.id, v === true)}
          aria-label={`Marquer ${data.title} comme terminée`}
        />
      )}

      {/* Titre */}
      <button
        type="button"
        onClick={() => onOpen?.(data.id)}
        className={cn(
          "min-w-0 flex-1 truncate text-left font-medium hover:text-primary focus-visible:outline-none",
          isDone && "text-muted-foreground line-through"
        )}
      >
        {data.title}
      </button>

      {/* Priorité */}
      <div className="w-20 shrink-0">
        <PriorityFlag
          priority={data.priority}
          interactive={!!onPriorityChange}
          onChange={(l) => onPriorityChange?.(data.id, l)}
          showLabel={false}
          className="justify-start"
        />
      </div>

      {/* Échéance */}
      {showDates && data.dueDate ? (
        <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
          {new Date(data.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
        </span>
      ) : (
        <span className="w-16 shrink-0" />
      )}

      {/* Progression */}
      {showProgress && data.progress !== undefined && (
        <div className="flex w-24 shrink-0 items-center gap-1.5">
          <Progress value={data.progress} className="h-1.5" />
          <span className="text-xs tabular-nums text-muted-foreground">{data.progress}%</span>
        </div>
      )}

      {/* Tags */}
      {showTags && data.tags && data.tags.length > 0 && (
        <div className="hidden shrink-0 gap-1 md:flex">
          {data.tags.slice(0, 2).map((t, i) => (
            <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions au survol */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onPriorityChange && (
          <PriorityFlag
            priority={data.priority}
            interactive
            onChange={(l) => onPriorityChange(data.id, l)}
            showLabel={false}
            className="size-6"
          />
        )}
        {onMenu && (
          <button
            type="button"
            onClick={() => onMenu(data.id)}
            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Actions"
          >
            <AppIcon name="open" size="xs" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export { TaskRow };
