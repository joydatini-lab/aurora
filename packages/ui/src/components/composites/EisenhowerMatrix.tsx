/**
 * EisenhowerMatrix — matrice 2×2 (cat. 2.4, memory eisenhower-redesign-prompt-8).
 *
 * Repère orthonormé accent + 4 en-têtes de quadrant teintés.
 * Couleurs INTERDITES sur les cartes (règle de la memory).
 *
 * Étape 2 (muet) : reçoit les tâches par quadrant + `onMove` (glisser/déplacer).
 * Les tâches sont des `TaskCard` variant="kanban" (draggable).
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { TaskCard, type TaskCardData } from "./TaskCard";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                 */
/* ------------------------------------------------------------------ */

export type QuadrantId = "do" | "schedule" | "delegate" | "eliminate";

export interface EisenhowerMatrixProps {
  /** Tâches réparties par quadrant (SsoT du parent). */
  quadrants: Record<QuadrantId, TaskCardData[]>;
  /** Appelé quand une tâche est déplacée vers un autre quadrant (drag-and-drop ou clavier). */
  onMoveTask?: (taskId: string, from: QuadrantId, to: QuadrantId) => void;
  /** Appelé pour créer une tâche dans un quadrant (le +). */
  onQuickCreate?: (quadrant: QuadrantId) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Configuration des quadrants (teintes subtiles, pas de couleur sur les cartes) */
/* ------------------------------------------------------------------ */

const QUADRANTS: {
  id: QuadrantId;
  label: string;
  sublabel: string;
  headerClass: string;
}[] = [
  {
    id: "do",
    label: "Faire",
    sublabel: "Urgent + Important",
    headerClass: "border-l-4 border-l-red-500",
  },
  {
    id: "schedule",
    label: "Planifier",
    sublabel: "Non urgent + Important",
    headerClass: "border-l-4 border-l-emerald-500",
  },
  {
    id: "delegate",
    label: "Déléguer",
    sublabel: "Urgent + Non important",
    headerClass: "border-l-4 border-l-amber-500",
  },
  {
    id: "eliminate",
    label: "Éliminer",
    sublabel: "Non urgent + Non important",
    headerClass: "border-l-4 border-l-gray-400",
  },
];

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

function EisenhowerMatrix({
  quadrants,
  onMoveTask,
  onQuickCreate,
  className,
}: EisenhowerMatrixProps) {
  const [dragOver, setDragOver] = React.useState<QuadrantId | null>(null);
  const [dragTask, setDragTask] = React.useState<{ id: string; from: QuadrantId } | null>(null);

  const handleDragStart = (id: string, from: QuadrantId) => {
    setDragTask({ id, from });
  };

  const handleDrop = (to: QuadrantId) => {
    if (dragTask && dragTask.from !== to) {
      onMoveTask?.(dragTask.id, dragTask.from, to);
    }
    setDragTask(null);
    setDragOver(null);
  };

  return (
    <div
      data-slot="eisenhower-matrix"
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}
    >
      {QUADRANTS.map((q) => (
        <div
          key={q.id}
          data-quadrant={q.id}
          className={cn(
            "flex flex-col rounded-lg border bg-card transition-colors",
            q.headerClass,
            dragOver === q.id && "ring-2 ring-primary/30 bg-primary/5"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(q.id);
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop(q.id)}
        >
          {/* En-tête du quadrant */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div>
              <h3 className="text-sm font-semibold">{q.label}</h3>
              <p className="text-xs text-muted-foreground">{q.sublabel}</p>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {quadrants[q.id].length}
            </span>
          </div>

          {/* Tâches du quadrant */}
          <div className="flex min-h-32 flex-col gap-2 p-2">
            {quadrants[q.id].length === 0 && (
              <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                Aucune tâche
              </p>
            )}
            {quadrants[q.id].map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task.id, q.id)}
                onDragEnd={() => setDragTask(null)}
              >
                <TaskCard
                  data={task}
                  variant="kanban"
                  draggable
                  showAssignees={false}
                  showTags={false}
                />
              </div>
            ))}
          </div>

          {/* Quick create */}
          {onQuickCreate && (
            <Button
              variant="ghost"
              size="sm"
              className="m-2 mt-0 h-7 w-full justify-start gap-1 text-xs text-muted-foreground"
              onClick={() => onQuickCreate(q.id)}
            >
              <AppIcon name="task" size="xs" aria-hidden />
              Ajouter
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export { EisenhowerMatrix };
