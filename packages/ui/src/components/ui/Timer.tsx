/**
 * Timer — composant pour Focus (Pomodoro / Chronomètre, cat. 2.1).
 *
 * `TimerDisplay` : chiffres principaux + libellé de phase.
 * `TimerControls` : Démarrer / Pause / Réinitialiser / Terminer.
 *
 * Le timer utilise une référence temporelle robuste
 * (`performance.now()` ou `Date.now()`) pour éviter les dérives
 * lorsque l'onglet est en arrière-plan (cat. 2.1 — « timer robuste »).
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { Progress } from "src/components/ui/progress";

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export type TimerMode = "countdown" | "countup";

export function useTimer(
  initialSeconds: number,
  mode: TimerMode = "countdown"
) {
  const [seconds, setSeconds] = React.useState(initialSeconds);
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const startRef = React.useRef<number | null>(null);
  const accumulatedRef = React.useRef(0);

  /** Réinitialise le timer à `initialSeconds`. */
  const reset = React.useCallback(() => {
    setSeconds(initialSeconds);
    setIsRunning(false);
    setIsPaused(false);
    startRef.current = null;
    accumulatedRef.current = 0;
  }, [initialSeconds]);

  const tick = React.useCallback(() => {
    const now = Date.now();
    if (startRef.current === null) return;
    const elapsed = accumulatedRef.current + (now - startRef.current) / 1000;
    const target =
      mode === "countdown"
        ? Math.max(0, initialSeconds - elapsed)
        : elapsed;
    setSeconds(Math.floor(target));

    // Timer terminé en countdown
    if (mode === "countdown" && target <= 0) {
      setIsRunning(false);
      setIsPaused(false);
    }
  }, [mode, initialSeconds]);

  React.useEffect(() => {
    if (!isRunning || isPaused) return;
    startRef.current = Date.now();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isRunning, isPaused, tick]);

  const start = () => {
    if (isPaused) {
      // Reprendre : reset startRef pour la nouvelle session
      startRef.current = Date.now();
      setIsPaused(false);
      return;
    }
    accumulatedRef.current = 0;
    startRef.current = Date.now();
    setIsRunning(true);
  };

  const pause = () => {
    if (!isRunning) return;
    if (startRef.current !== null) {
      accumulatedRef.current += (Date.now() - startRef.current) / 1000;
      startRef.current = null;
    }
    setIsPaused(true);
    setIsRunning(false);
  };

  const stop = () => {
    setIsRunning(false);
    setIsPaused(false);
    startRef.current = null;
    accumulatedRef.current = 0;
    setSeconds(initialSeconds);
  };

  const isDone = mode === "countdown" && seconds <= 0;

  return {
    seconds,
    isRunning,
    isPaused,
    isDone,
    start,
    pause,
    stop,
    reset,
  };
}

/* ------------------------------------------------------------------ */
/* Formatage                                                           */
/* ------------------------------------------------------------------ */

export function formatTimerSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Composants                                                          */
/* ------------------------------------------------------------------ */

export interface TimerDisplayProps {
  /** Valeur affichée en secondes. */
  seconds: number;
  /** Libellé de phase (ex. "Focus", "Pause courte", "Pause longue"). */
  phaseLabel?: string;
  /** Durée totale pour la progression (mode countdown). */
  totalSeconds?: number;
  /** Mode pour l'affichage (countdown = temps restant, countup = temps écoulé). */
  mode?: TimerMode;
  className?: string;
}

function TimerDisplay({
  seconds,
  phaseLabel,
  totalSeconds,
  mode = "countdown",
  className,
}: TimerDisplayProps) {
  const pct =
    totalSeconds && totalSeconds > 0
      ? mode === "countdown"
        ? ((totalSeconds - seconds) / totalSeconds) * 100
        : (seconds / totalSeconds) * 100
      : 0;

  return (
    <div
      data-slot="timer-display"
      className={cn("flex flex-col items-center gap-3", className)}
      aria-live="polite"
    >
      {phaseLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          {phaseLabel}
        </span>
      )}
      <span className="font-mono text-5xl font-semibold tabular-nums sm:text-6xl">
        {formatTimerSeconds(seconds)}
      </span>
      {totalSeconds && totalSeconds > 0 && (
        <div className="w-full max-w-48">
          <Progress value={Math.min(100, Math.max(0, pct))} />
        </div>
      )}
    </div>
  );
}

export interface TimerControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  isDone?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  /** Libellé du bouton principal selon l'état. */
  labels?: {
    play?: string;
    pause?: string;
    reset?: string;
    finish?: string;
  };
  /** Action de fin de session (différente de reset). */
  onFinish?: () => void;
  className?: string;
}

function TimerControls({
  isRunning,
  isPaused,
  isDone,
  onPlay,
  onPause,
  onReset,
  onFinish,
  labels = {},
  className,
}: TimerControlsProps) {
  return (
    <div
      data-slot="timer-controls"
      className={cn("flex items-center justify-center gap-3", className)}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={onReset}
        aria-label="Réinitialiser"
        title="Réinitialiser"
      >
        <AppIcon name="retry" size="sm" />
      </Button>

      {!isRunning || isPaused ? (
        <Button onClick={onPlay} size="lg" className="min-w-28">
          <AppIcon name="timer" size="sm" />
          {isPaused ? labels.play ?? "Reprendre" : labels.play ?? "Démarrer"}
        </Button>
      ) : (
        <Button variant="outline" onClick={onPause} size="lg" className="min-w-28">
          <AppIcon name="timer" size="sm" />
          {labels.pause ?? "Pause"}
        </Button>
      )}

      {(onFinish || isDone) && (
        <Button
          variant="ghost"
          onClick={onFinish}
          className="text-muted-foreground"
        >
          {labels.finish ?? "Terminer"}
        </Button>
      )}
    </div>
  );
}

export { TimerDisplay, TimerControls };
