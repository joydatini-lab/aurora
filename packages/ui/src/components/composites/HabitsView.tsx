/**
 * HabitsView — grille d'habitudes (cat. 2.6, 4.6).
 *
 * Étape 2 (muet) : reçoit `HabitsViewData` (habitudes + dates) + callbacks.
 * Pas de store, pas d'API.
 *
 * Structure (cat. 2.6) :
 * - `HabitWeekGrid` : colonnes = 7 derniers jours, lignes = habitudes
 * - `HabitCompletionToggle` : cellule cliquable (complétée / non)
 * - `HabitStreakBadge` : série courante par habitude
 * - `SevenDayBand` : bandeau de synthèse (7 pastilles, 1 par habitude-jour)
 *
 * Les sous-composants sont exportés individuellement.
 */
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Progress } from "src/components/ui/progress";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type HabitFrequency = "daily" | "weekly" | "custom";

export interface HabitItem {
  id: string;
  title: string;
  icon?: IconKey;
  color?: string;
  frequency: HabitFrequency;
  /** Nombre de jours consécutifs (série courante). */
  streak: number;
  /** Complétion totale (nb de jours accomplis). */
  totalCompleted: number;
  /** Objectif (ex. "7/jour" pour daily). */
  targetLabel?: string;
  /** Progression de la journée (0-100). */
  todayProgress?: number;
}

export interface HabitDayData {
  /** Date ISO (YYYY-MM-DD). */
  date: string;
  /** Libellé court (L, M, M, J, V, S, D). */
  dayLabel: string;
  /** Indique si c'est aujourd'hui. */
  isToday?: boolean;
}

export interface HabitCompletionState {
  habitId: string;
  date: string;
  completed: boolean;
}

export interface HabitsViewData {
  habits: HabitItem[];
  days: HabitDayData[];
  completions: HabitCompletionState[];
}

export interface HabitsViewProps {
  data: HabitsViewData;
  onToggle: (habitId: string, date: string, completed: boolean) => void;
  onEditHabit?: (habitId: string) => void;
  onAddHabit?: () => void;
  /** Affiche la bande de 7 jours (synthèse). */
  showSevenDayBand?: boolean;
  /** Affiche les stats (série, total). */
  showStats?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* HabitCompletionToggle                                               */
/* ------------------------------------------------------------------ */

export interface HabitCompletionToggleProps {
  completed: boolean;
  onToggle: () => void;
  color?: string;
  dayLabel?: string;
  isToday?: boolean;
  disabled?: boolean;
}

export function HabitCompletionToggle({
  completed,
  onToggle,
  color,
  dayLabel,
  isToday,
  disabled,
}: HabitCompletionToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={completed}
      aria-label={dayLabel ? `Habit sur ${dayLabel}` : "Habit"}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex size-7 items-center justify-center rounded-md border text-xs transition-colors",
        completed
          ? "border-transparent text-white"
          : "border-border bg-background text-transparent hover:bg-muted",
        isToday && !completed && "ring-2 ring-ring",
        disabled && "cursor-not-allowed opacity-50"
      )}
      style={completed && color ? { backgroundColor: color } : undefined}
    >
      <AppIcon name="success" size="xs" aria-hidden />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* HabitStreakBadge                                                    */
/* ------------------------------------------------------------------ */

export function HabitStreakBadge({
  streak,
  className,
}: {
  streak: number;
  className?: string;
}) {
  if (streak <= 0) return null;
  return (
    <Badge
      variant={streak >= 7 ? "default" : "outline"}
      className={cn("gap-0.5 text-[10px]", className)}
    >
      <AppIcon name="timer" size="xs" aria-hidden />
      {streak}j
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* SevenDayBand                                                        */
/* ------------------------------------------------------------------ */

export interface SevenDayBandProps {
  days: HabitDayData[];
  /** Completions groupées par date : { date: completedCount / totalCount }. */
  dayStats: { date: string; completed: number; total: number }[];
  className?: string;
}

export function SevenDayBand({ days, dayStats, className }: SevenDayBandProps) {
  const byDate = new Map(dayStats.map((d) => [d.date, d]));
  return (
    <div
      data-slot="seven-day-band"
      className={cn("flex items-center gap-2", className)}
    >
      {days.map((day) => {
        const stat = byDate.get(day.date);
        const pct = stat && stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
        return (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full border text-[10px] font-medium tabular-nums",
                day.isToday
                  ? "border-primary bg-primary/10 text-primary"
                  : pct >= 100
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
              )}
            >
              {pct}%
            </div>
            <span
              className={cn(
                "text-[10px]",
                day.isToday ? "font-semibold text-primary" : "text-muted-foreground"
              )}
            >
              {day.dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HabitRow                                                            */
/* ------------------------------------------------------------------ */

export interface HabitRowProps {
  habit: HabitItem;
  days: HabitDayData[];
  completions: HabitCompletionState[];
  onToggle: (habitId: string, date: string, completed: boolean) => void;
  onEditHabit?: (habitId: string) => void;
  showStats?: boolean;
  className?: string;
}

export function HabitRow({
  habit,
  days,
  completions,
  onToggle,
  onEditHabit,
  showStats = true,
  className,
}: HabitRowProps) {
  const completionByDate = new Map(
    completions
      .filter((c) => c.habitId === habit.id)
      .map((c) => [c.date, c.completed])
  );

  return (
    <div
      data-slot="habit-row"
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        className
      )}
    >
      {/* Icon + title */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          {habit.icon && <AppIcon name={habit.icon} size="sm" aria-hidden />}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {habit.title}
          </span>
          {onEditHabit && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-6"
              onClick={() => onEditHabit(habit.id)}
              aria-label={`Modifier ${habit.title}`}
            >
              <AppIcon name="code" size="xs" aria-hidden />
            </Button>
          )}
        </div>
        {showStats && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HabitStreakBadge streak={habit.streak} />
            {habit.targetLabel && <span>{habit.targetLabel}</span>}
            <span>{habit.totalCompleted} complétion{habit.totalCompleted > 1 ? "s" : ""}</span>
          </div>
        )}
        {showStats && habit.todayProgress !== undefined && (
          <Progress value={habit.todayProgress} className="mt-1 h-1" />
        )}
      </div>

      {/* 7 cellules */}
      <div className="flex shrink-0 gap-1">
        {days.map((day) => {
          const completed = completionByDate.get(day.date) ?? false;
          return (
            <div key={day.date} className="flex flex-col items-center gap-0.5">
              <HabitCompletionToggle
                completed={completed}
                onToggle={() => onToggle(habit.id, day.date, !completed)}
                color={habit.color}
                dayLabel={day.dayLabel}
                isToday={day.isToday}
              />
              <span className="text-[9px] text-muted-foreground">
                {day.dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function HabitsView({
  data,
  onToggle,
  onEditHabit,
  onAddHabit,
  showSevenDayBand = true,
  showStats = true,
  className,
}: HabitsViewProps) {
  /* Stats pour la bande 7 jours : par date, combien de complétions. */
  const dayStats = data.days.map((d) => {
    const completed = data.completions.filter(
      (c) => c.date === d.date && c.completed
    ).length;
    return { date: d.date, completed, total: data.habits.length };
  });

  return (
    <div
      data-slot="habits-view"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Habitudes</h2>
        {onAddHabit && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddHabit}>
            <AppIcon name="task" size="xs" aria-hidden />
            Nouvelle habitude
          </Button>
        )}
      </div>

      {/* Bande 7 jours */}
      {showSevenDayBand && (
        <SevenDayBand days={data.days} dayStats={dayStats} />
      )}

      {/* Grille d'habitudes */}
      <div className="flex flex-col gap-2">
        {data.habits.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <AppIcon name="habit" size="lg" tone="muted" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Aucune habitude encore
            </p>
            {onAddHabit && (
              <Button variant="outline" size="sm" onClick={onAddHabit}>
                Créer ma première habitude
              </Button>
            )}
          </div>
        ) : (
          data.habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              days={data.days}
              completions={data.completions.filter((c) => c.habitId === habit.id)}
              onToggle={onToggle}
              onEditHabit={onEditHabit}
              showStats={showStats}
            />
          ))
        )}
      </div>
    </div>
  );
}
