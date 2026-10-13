/**
 * KanbanColumn — colonne du board Kanban (cat. 2.2-A).
 *
 * Étape 2 (muet) : reçoit `column` (id, title, WIP limit) + `tasks` + callbacks.
 * Le drag-and-drop est géré par le parent via `onDragStart` / `onDropOnColumn`.
 * (dnd-kit est le moteur drag standard ReUI — le composant est muet.)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { TaskCard, type TaskCardData } from "./TaskCard";

export interface KanbanColumnData {
  id: string;
  title: string;
  /** WIP limit (si défini, compteur rouge quand dépassé). */
  wipLimit?: number;
  /** Couleur d'accent de l'en-tête (token). */
  accent?: "default" | "primary" | "success" | "warning" | "destructive";
}

export interface KanbanColumnProps
  extends Omit<React.ComponentProps<"section">, "onDrop" | "onDragOver" | "onDragLeave"> {
  column: KanbanColumnData;
  tasks: TaskCardData[];
  /** Appelé pour créer une tâche dans cette colonne. */
  onQuickCreate?: (columnId: string) => void;
  /** Appelé pour ouvrir le menu de colonne (renommer, WIP, supprimer). */
  onColumnMenu?: (columnId: string) => void;
  /** Appelé quand une carte est cliquée. */
  onOpenTask?: (taskId: string) => void;
  /** Appelé au drag start d'une carte (dnd-kit ou HTML5 natif). */
  onDragStartCard?: (taskId: string, columnId: string) => void;
  /** Appelé quand le drop survient sur cette colonne. */
  onDropOnColumn?: (columnId: string) => void;
  /** Appelé quand le survol de drop démarre. */
  onDragEnterColumn?: (columnId: string) => void;
  /** Appelé quand le survol de drop se termine. */
  onDragLeaveColumn?: (columnId: string) => void;
  /** État local : est-on en train de survoler cette colonne ? */
  isDragOver?: boolean;
  className?: string;
}

const ACCENT_CLASS: Record<NonNullable<KanbanColumnData["accent"]>, string> = {
  default: "border-transparent",
  primary: "border-primary/30 bg-primary/5",
  success: "border-success/30 bg-success/5",
  warning: "border-warning/30 bg-warning/5",
  destructive: "border-destructive/30 bg-destructive/5",
};

function KanbanColumn({
  column,
  tasks,
  onQuickCreate,
  onColumnMenu,
  onOpenTask,
  onDragStartCard,
  onDropOnColumn,
  onDragEnterColumn,
  onDragLeaveColumn,
  isDragOver = false,
  className,
  ...props
}: KanbanColumnProps) {
  const wipExceeded =
    column.wipLimit !== undefined && tasks.length > column.wipLimit;

  return (
    <section
      data-slot="kanban-column"
      data-column-id={column.id}
      data-is-drag-over={isDragOver}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-lg border bg-muted/20 p-2 transition-colors",
        column.accent ? ACCENT_CLASS[column.accent] : "border-border",
        isDragOver && "ring-2 ring-primary/40 bg-primary/5",
        className
      )}
      onDragEnter={() => onDragEnterColumn?.(column.id)}
      onDragLeave={() => onDragLeaveColumn?.(column.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropOnColumn?.(column.id)}
      {...props}
    >
      {/* En-tête de colonne */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{column.title}</h3>
          <Badge variant="outline" className="text-xs">
            {tasks.length}
            {column.wipLimit !== undefined && (
              <span
                className={cn(
                  "ml-0.5",
                  wipExceeded ? "text-destructive" : "text-muted-foreground"
                )}
              >
                /{column.wipLimit}
              </span>
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {onColumnMenu && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-6"
              onClick={() => onColumnMenu(column.id)}
              aria-label={`Menu colonne ${column.title}`}
            >
              <AppIcon name="open" size="xs" aria-hidden />
            </Button>
          )}
          {onQuickCreate && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-6 text-muted-foreground"
              onClick={() => onQuickCreate(column.id)}
              aria-label="Ajouter une tâche"
            >
              <AppIcon name="task" size="xs" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {/* Cartes */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.length === 0 && (
          <p className="flex items-center justify-center rounded border border-dashed p-4 text-xs text-muted-foreground">
            Aucune tâche
          </p>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => onDragStartCard?.(task.id, column.id)}
          >
            <TaskCard
              data={task}
              variant="kanban"
              draggable
              onOpen={onOpenTask}
            />
          </div>
        ))}
      </div>

      {/* Zone de drop vide */}
      {tasks.length === 0 && isDragOver && (
        <div className="rounded border border-dashed border-primary/40 p-4 text-center text-xs text-primary">
          Déposer ici
        </div>
      )}
    </section>
  );
}

export { KanbanColumn };
