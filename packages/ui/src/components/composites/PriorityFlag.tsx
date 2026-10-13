/**
 * PriorityFlag — drapeau de priorité tâche (cat. 2.4, memory task-priority-flags-4-states).
 *
 * Quatre niveaux : rouge / vert / jaune / gris (pas par tag, pas de glow).
 * `task.priority` (0-5) est le SSoT ; le composant mappant :
 *   0-1 = basse (gris), 2-3 = moyenne (jaune), 4 = haute (vert), 5 = critique (rouge)
 *
 * Étape 2 (muets) : le composant n'appelle pas de store ; il reçoit `level`
 * ou `priority` (0-5) et émet `onChange` si interactif.
 */
import * as React from "react";
import { cn } from "src/lib/utils";

export type PriorityLevel = "none" | "low" | "medium" | "high" | "critical";

export interface PriorityFlagProps
  extends Omit<React.ComponentProps<"button">, "onChange"> {
  /** Niveau prioritaire (dérivé ou explicite). */
  level?: PriorityLevel;
  /**
   * Valeur brute 0-5 (task.priority SSoT).
   * Si fourni, `level` est ignoré (on dérive de priority).
   */
  priority?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Affiche le libellé textuel à côté de la pastille. */
  showLabel?: boolean;
  /** Mode interactif : cliquer cycle le niveau (on émet onChange, muet sinon). */
  interactive?: boolean;
  /** Appelé quand le niveau change (mode interactif). */
  onChange?: (level: PriorityLevel) => void;
  className?: string;
}

/** Couleur par niveau — tokens neutres (pas de glow, pas de couleur seule). */
const COLORS: Record<PriorityLevel, string> = {
  none: "bg-muted-foreground/30",
  low: "bg-muted-foreground/50",
  medium: "bg-yellow-500",
  high: "bg-emerald-500",
  critical: "bg-red-500",
};

const LABELS: Record<PriorityLevel, string> = {
  none: "Aucune",
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

/** Mapping task.priority (0-5) → PriorityLevel (SSoT task-priority-flags-4-states). */
export function priorityToLevel(priority: number): PriorityLevel {
  if (priority <= 1) return "low";
  if (priority <= 3) return "medium";
  if (priority === 4) return "high";
  return "critical";
}

/** Ordre cyclique pour le mode interactif (aucun → critique → critique… → aucun). */
const CYCLE: PriorityLevel[] = ["none", "low", "medium", "high", "critical"];

function PriorityFlag({
  level,
  priority,
  showLabel = true,
  interactive = false,
  onChange,
  className,
  onClick,
  ...props
}: PriorityFlagProps) {
  const resolvedLevel: PriorityLevel =
    priority !== undefined ? priorityToLevel(priority) : (level ?? "none");

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (interactive && onChange) {
      e.stopPropagation();
      const idx = CYCLE.indexOf(resolvedLevel);
      const next = CYCLE[(idx + 1) % CYCLE.length];
      if (next) onChange(next);
    }
  };

  return (
    <button
      type="button"
      data-slot="priority-flag"
      data-priority={resolvedLevel}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        interactive ? "cursor-pointer hover:opacity-80" : "cursor-default",
        className
      )}
      aria-label={showLabel ? `Priorité ${LABELS[resolvedLevel]}` : undefined}
      {...props}
    >
      <span
        className={cn("size-2.5 rounded-full", COLORS[resolvedLevel])}
        aria-hidden
      />
      {showLabel && (
        <span className="text-muted-foreground">{LABELS[resolvedLevel]}</span>
      )}
    </button>
  );
}

export { PriorityFlag };
