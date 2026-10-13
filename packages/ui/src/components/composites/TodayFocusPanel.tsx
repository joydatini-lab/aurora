/**
 * TodayFocusPanel — vue "Aujourd'hui" (cat. 2.4).
 *
 * 3 priorités maximum conseillées, section « En retard »,
 * liste des tâches du jour, blocs planifiés, contrôle de complétion rapide.
 *
 * Étape 2 (muet) : reçoit les données + callbacks.
 */
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { TaskCard, type TaskCardData } from "./TaskCard";
import { TaskRow } from "./TaskRow";

export interface TodayFocusPanelProps {
  /** Tâches prioritaires du jour (max 3 recommandées). */
  focusTasks: TaskCardData[];
  /** Tâches en retard. */
  overdueTasks: TaskCardData[];
  /** Toutes les autres tâches d'aujourd'hui. */
  todayTasks: TaskCardData[];
  /** Blocs planifiés (heure → tâche). */
  scheduledBlocks?: { time: string; task: TaskCardData }[];
  /** Marquer une tâche terminée. */
  onCompleteTask?: (id: string) => void;
  /** Ouvrir une tâche (inspecteur). */
  onOpenTask?: (id: string) => void;
  /** Créer une tâche rapide. */
  onQuickCreate?: () => void;
  className?: string;
}

function TodayFocusPanel({
  focusTasks,
  overdueTasks,
  todayTasks,
  scheduledBlocks,
  onCompleteTask,
  onOpenTask,
  onQuickCreate,
  className,
}: TodayFocusPanelProps) {
  const doneToday = todayTasks.filter((t) => t.status === "termine").length;
  const total = todayTasks.length;

  return (
    <div data-slot="today-focus-panel" className={cn("flex flex-col gap-4", className)}>
      {/* En-tête + quick create */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Aujourd'hui</h2>
          <p className="text-xs text-muted-foreground">
            {doneToday}/{total} terminée{total > 1 ? "s" : ""}
          </p>
        </div>
        {onQuickCreate && (
          <Button size="sm" onClick={onQuickCreate}>
            <AppIcon name="task" size="xs" aria-hidden />
            Nouvelle tâche
          </Button>
        )}
      </div>

      {/* Focus (max 3 recommandés) */}
      {focusTasks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Priorités du jour
          </h3>
          {focusTasks.map((t) => (
            <TaskCard
              key={t.id}
              data={t}
              onOpen={onOpenTask}
              onComplete={onCompleteTask}
              showComplete={!!onCompleteTask}
            />
          ))}
        </section>
      )}

      {/* En retard */}
      {overdueTasks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-red-500 uppercase tracking-wide">
            En retard ({overdueTasks.length})
          </h3>
          {overdueTasks.map((t) => (
            <TaskCard
              key={t.id}
              data={t}
              variant="compact"
              onOpen={onOpenTask}
              onComplete={onCompleteTask}
            />
          ))}
        </section>
      )}

      {/* Blocs planifiés */}
      {scheduledBlocks && scheduledBlocks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Planifié
          </h3>
          <div className="flex flex-col gap-1">
            {scheduledBlocks.map(({ time, task }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
              >
                <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {time}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenTask?.(task.id)}
                    className={cn(
                      "text-left text-sm font-medium hover:text-primary",
                      task.status === "termine" && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Liste du jour */}
      {todayTasks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Liste du jour
          </h3>
          <div>
            {todayTasks.map((t) => (
              <TaskRow
                key={t.id}
                data={t}
                onToggleComplete={
                  onCompleteTask ? (id) => onCompleteTask(id) : undefined
                }
                onOpen={onOpenTask}
                showProgress={false}
                showTags={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export { TodayFocusPanel };
