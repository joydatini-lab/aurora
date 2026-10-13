/**
 * FocusWorkspace — zone centrale de la feature Focus (cat. 2.1).
 *
 * Étape 2 (muet) : reçoit les données + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.1) :
 * - `FocusModeSwitch` (Pomodoro / Chronomètre)
 * - `FocusTimer` (TimerDisplay + TimerControls du module Timer)
 * - `PomodoroPhaseRail` (phases : Focus, Pause courte, Pause longue)
 * - `DurationPresetPicker`
 * - `FocusTaskLink` (tâche associée)
 * - `SoundPickerTrigger` / `SpotifyPicker` (séparés)
 * - `FocusStatsRow`
 *
 * Le composant `FocusWorkspace` est le conteneur visuel ; les sous-composants
 * sont exportés individuellement pour l'assemblage flexible.
 */

import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
/* import { Button } from "src/components/ui/button"; */
import {
  TimerDisplay,
  TimerControls,
  /* useTimer, */
  formatTimerSeconds,
} from "src/components/ui/Timer";
import { StatTile } from "src/components/ui/StatTile";
/* import { Badge } from "src/components/ui/badge"; */

/* ------------------------------------------------------------------ */
/* FocusModeSwitch                                                     */
/* ------------------------------------------------------------------ */

export type FocusMode = "pomodoro" | "chrono";

export interface FocusModeSwitchProps {
  value: FocusMode;
  onChange: (m: FocusMode) => void;
  /** Appelé avant le changement si la session est en cours (confirmation parent). */
  onBeforeChange?: () => void;
  className?: string;
}

export function FocusModeSwitch({
  value,
  onChange,
  onBeforeChange,
  className,
}: FocusModeSwitchProps) {
  return (
    <div
      data-slot="focus-mode-switch"
      className={cn("flex items-center gap-1 rounded-md border p-0.5", className)}
      role="radiogroup"
      aria-label="Mode de focus"
    >
      {(["pomodoro", "chrono"] as FocusMode[]).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={() => {
            onBeforeChange?.();
            onChange(m);
          }}
          className={cn(
            "rounded px-3 py-1 text-sm transition-colors",
            value === m
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {m === "pomodoro" ? "Pomodoro" : "Chronomètre"}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PomodoroPhaseRail                                                   */
/* ------------------------------------------------------------------ */

export type PomodoroPhase = "focus" | "short-break" | "long-break";

export interface PomodoroPhaseRailProps {
  /** Phase courante. */
  phase: PomodoroPhase;
  /** Cycle n° (1 = 1er pomodoro, 2 = 2e, … 5 = pause longue). */
  cycle: number;
  /** Durée configurée (ms) de la phase courante. */
  phaseDurationMs: number;
  /** Appelé pour changer de phase manuellement. */
  onSelectPhase?: (p: PomodoroPhase) => void;
  className?: string;
}

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: "Focus",
  "short-break": "Pause courte",
  "long-break": "Pause longue",
};

export function PomodoroPhaseRail({
  phase,
  cycle,
  /* phaseDurationMs, */
  onSelectPhase,
  className,
}: PomodoroPhaseRailProps) {
  const phases: PomodoroPhase[] = ["focus", "short-break", "long-break"];
  return (
    <div
      data-slot="pomodoro-phase-rail"
      className={cn("flex items-center gap-1", className)}
      role="tablist"
      aria-label="Phases Pomodoro"
    >
      {phases.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          aria-selected={phase === p}
          onClick={() => onSelectPhase?.(p)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs transition-colors",
            phase === p
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent text-muted-foreground hover:bg-muted"
          )}
        >
          {PHASE_LABELS[p]}
        </button>
      ))}
      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
        Cycle {cycle}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DurationPresetPicker                                                */
/* ------------------------------------------------------------------ */

export interface DurationPresetPickerProps {
  /** Presets disponibles (minutes). */
  presets: number[];
  /** Valeur courante (minutes). */
  value: number;
  /** Appelé quand un preset ou la valeur personnalisée change. */
  onChange: (minutes: number) => void;
  /** Bornes de la valeur personnalisée (minutes). */
  min?: number;
  max?: number;
  className?: string;
}

export function DurationPresetPicker({
  presets,
  value,
  onChange,
  min = 5,
  max = 120,
  className,
}: DurationPresetPickerProps) {
  return (
    <div
      data-slot="duration-preset-picker"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            value === p
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:border-muted-foreground/40"
          )}
        >
          {p} min
        </button>
      ))}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-16 rounded border bg-background px-2 text-xs tabular-nums"
        aria-label="Durée personnalisée (minutes)"
      />
      <span className="text-xs text-muted-foreground">min</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FocusStatsRow                                                       */
/* ------------------------------------------------------------------ */

export interface FocusStatsRowProps {
  /** Temps concentré aujourd'hui (minutes). */
  todayMinutes: number;
  /** Sessions terminées aujourd'hui. */
  sessionsToday: number;
  /** Objectif quotidien (minutes ou sessions). */
  dailyTarget: number;
  /** Série (consecutive days). */
  streak: number;
  className?: string;
}

export function FocusStatsRow({
  todayMinutes,
  sessionsToday,
  dailyTarget,
  streak,
  className,
}: FocusStatsRowProps) {
  const tiles = [
    { label: "Concentré", value: formatTimerSeconds(todayMinutes * 60), unit: "aujourd'hui" },
    { label: "Sessions", value: String(sessionsToday), unit: "aujourd'hui" },
    { label: "Objectif", value: String(dailyTarget), unit: "min/jour" },
    { label: "Série", value: String(streak), unit: "jours" },
  ];
  return (
    <div
      data-slot="focus-stats-row"
      className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}
    >
      {tiles.map((t, i) => (
        <StatTile key={i} label={t.label} value={t.value} unit={t.unit} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FocusWorkspace (assemblage)                                        */
/* ------------------------------------------------------------------ */

export interface FocusWorkspaceProps {
  /** Mode courant. */
  mode: FocusMode;
  onModeChange: (m: FocusMode) => void;
  /** Tâche associée (nom ou null). */
  linkedTaskName?: string | null;
  onLinkTask?: (taskId: string | null) => void;
  /** Son / Spotify (séparés). */
  currentSoundLabel?: string;
  onOpenSoundPicker?: () => void;
  /** Statistiques. */
  stats?: FocusStatsRowProps;
  /** Callbacks du timer (le conteneur gère l'état via useTimer si besoin). */
  timerSeconds: number;
  timerTotalSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isDone: boolean;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  onTimerStop: () => void;
  /** Phase pomodoro (si mode = pomodoro). */
  pomodoroPhase?: PomodoroPhase;
  pomodoroCycle?: number;
  onPomodoroPhaseChange?: (p: PomodoroPhase) => void;
  /** Presets de durée (si mode = pomodoro). */
  durationPresets?: number[];
  durationValue?: number;
  onDurationChange?: (min: number) => void;
  /** Variante plein écran (masque les éléments secondaires). */
  fullScreen?: boolean;
  className?: string;
}

export function FocusWorkspace({
  mode,
  onModeChange,
  linkedTaskName,
  onLinkTask,
  currentSoundLabel,
  onOpenSoundPicker,
  stats,
  timerSeconds,
  timerTotalSeconds,
  isRunning,
  isPaused,
  isDone,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onTimerStop,
  pomodoroPhase = "focus",
  pomodoroCycle = 1,
  onPomodoroPhaseChange,
  durationPresets,
  durationValue,
  onDurationChange,
  fullScreen = false,
  className,
}: FocusWorkspaceProps) {
  return (
    <div
      data-slot="focus-workspace"
      data-full-screen={fullScreen}
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col items-center gap-5",
        fullScreen && "min-h-dvh justify-center bg-background/95",
        className
      )}
    >
      {/* Mode switch */}
      <FocusModeSwitch value={mode} onChange={onModeChange} />

      {/* Phase rail (pomodoro) */}
      {mode === "pomodoro" && (
        <PomodoroPhaseRail
          phase={pomodoroPhase}
          cycle={pomodoroCycle}
          phaseDurationMs={timerTotalSeconds * 1000}
          onSelectPhase={onPomodoroPhaseChange}
        />
      )}

      {/* Presets durée (pomodoro) */}
      {mode === "pomodoro" && durationPresets && durationValue !== undefined && (
        <DurationPresetPicker
          presets={durationPresets}
          value={durationValue}
          onChange={(m) => onDurationChange?.(m)}
        />
      )}

      {/* Timer principal */}
      <TimerDisplay
        seconds={timerSeconds}
        totalSeconds={timerTotalSeconds}
        mode={mode === "pomodoro" ? "countdown" : "countup"}
        phaseLabel={
          mode === "pomodoro"
            ? pomodoroPhase === "focus"
              ? "Focus"
              : pomodoroPhase === "short-break"
                ? "Pause courte"
                : "Pause longue"
            : "Chronomètre"
        }
      />

      {/* Controls */}
      <TimerControls
        isRunning={isRunning}
        isPaused={isPaused}
        isDone={isDone}
        onPlay={onTimerStart}
        onPause={onTimerPause}
        onReset={onTimerReset}
        onFinish={onTimerStop}
      />

      {/* Tâche liée + son */}
      {!fullScreen && (
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AppIcon name="task" size="sm" aria-hidden />
            {linkedTaskName ?? "Sans tâche"}
            {onLinkTask && (
              <button
                type="button"
                onClick={() => onLinkTask(null)}
                className="text-xs underline underline-offset-2 hover:text-foreground"
              >
                changer
              </button>
            )}
          </div>
          {currentSoundLabel && onOpenSoundPicker && (
            <button
              type="button"
              onClick={onOpenSoundPicker}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              <AppIcon name="audio" size="xs" aria-hidden />
              {currentSoundLabel}
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      {!fullScreen && stats && <FocusStatsRow {...stats} />}
    </div>
  );
}
