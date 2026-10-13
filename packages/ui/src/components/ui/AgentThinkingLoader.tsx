/**
 * AgentThinkingLoader — état « l'agent réfléchit / répond » (docs/ui-libraries.md §9.3).
 *
 * Fondé sur le modèle de thinking de **assistant-ui** : le composant est muet
 * (Étape 2 — aucune API, aucun store global) et expose deux usages :
 *
 * 1. **Statique** (story / design system) — on pilote le rendu via la prop
 *    `status` (voir `AgentThinkingStatus`).
 * 2. **Branché sur assistant-ui** (Étape 4 — conteneur) — la page lit le
 *    statut de la dernière message de la thread et passe `status` vers le
 *    bas. On ne lit JAMAIS le runtime ici : la règle d'or de l'Étape 2 est
 *    que ce composant reste isolable.
 *
 * Rendu selon le statut (sémantique assistant-ui, pas de « blobs magiques ») :
 *   - `thinking`        → 3 points de suspension animés + verbe de thinking
 *                         (Claude « Pondering/Ruminating ») — état de réflexion.
 *   - `streaming`       → indicateur de flux + libellé « En cours d'écriture… ».
 *   - `requires-action` → pastille « Approbation requise » (outil en attente).
 *   - `error`           → ligne d'échec + bouton « Réessayer » (`onRetry`).
 *   - `complete`        → rien (ne rend pas) — le thinking est terminé.
 *
 * Contrats (05 §2.6) : GPU uniquement (transform/opacity), `prefers-reduced-motion`
 * = 100 % statique, couleurs = tokens neutres + accent, `role="status"` +
 * `aria-live="polite"` avec texte SR stable.
 */
import * as React from "react";
import { motion } from "motion/react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { useReducedMotion } from "src/theme/provider";

/* ------------------------------------------------------------------ */
/* Statut de thinking — miroir de `MessageStatus` assistant-ui        */
/* ------------------------------------------------------------------ */

export type AgentThinkingStatus =
  | "thinking"
  | "streaming"
  | "requires-action"
  | "error"
  | "complete";

/**
 * Verbes de thinking par défaut (registre Aurora : sérieux + un jeu, FR,
 * 3e personne présent — à la suite Claude « Pondering / Ruminating »).
 * L'app peut en remplacer le registre (ton de voix).
 */
export const DEFAULT_THINKING_WORDS = [
  "Réfléchit…",
  "Pondère…",
  "Tisse…",
  "Brasse…",
  "Vérifie…",
  "Éclaire…",
  "Distille…",
  "Anticipe…",
];

export interface AgentThinkingLoaderProps {
  /** Statut courant (piloté par le conteneur, jamais lu ici). @default "thinking" */
  status?: AgentThinkingStatus;
  /** Libellé stable pour les lecteurs d'écran (le verbe visible est aria-hidden). */
  label?: string;
  /**
   * Verbes de thinking qui tournent (motif Claude). `[]` = afficher `label`
   * en statique. @default DEFAULT_THINKING_WORDS
   */
  words?: string[];
  /** Période de rotation en ms. @default 2400 */
  wordIntervalMs?: number;
  /** Libellé de l'état `requires-action`. @default "Approbation requise" */
  requiresActionLabel?: string;
  /** Libellé d'erreur. @default "La réponse n'a pas pu aboutir." */
  errorLabel?: string;
  /** Callback « Réessayer » (rendu uniquement si fourni). */
  onRetry?: () => void;
  /** Durée de la réflexion en secondes (chip « Réflexion · Ns » — Claude). */
  elapsedSeconds?: number;
  /** Taille des points en px. @default 16 */
  size?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Points de suspension (GPU : scale + opacity)                       */
/* ------------------------------------------------------------------ */

function ThinkingDots({ reduced, size }: { reduced: boolean; size: number }) {
  const dots = [0, 1, 2];
  return (
    <span
      data-thinking-dots
      aria-hidden
      className="flex items-center gap-1"
      style={{ height: size }}
    >
      {dots.map((i) => (
        <motion.span
          key={i}
          className="rounded-full bg-primary"
          style={{
            width: Math.max(4, size * 0.28),
            height: Math.max(4, size * 0.28),
            opacity: 0.5,
          }}
          animate={
            reduced
              ? { opacity: 0.4 + i * 0.2 }
              : { opacity: [0.4, 1, 0.4] }
          }
          transition={
            reduced
              ? undefined
              : { duration: 1.2, ease: "easeInOut", repeat: Infinity, delay: i * 0.2 }
          }
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Composant                                                          */
/* ------------------------------------------------------------------ */

export function AgentThinkingLoader({
  status = "thinking",
  label = "L'agent réfléchit…",
  words = DEFAULT_THINKING_WORDS,
  wordIntervalMs = 2400,
  requiresActionLabel = "Approbation requise",
  errorLabel = "La réponse n'a pas pu aboutir.",
  onRetry,
  elapsedSeconds,
  size = 16,
  className,
}: AgentThinkingLoaderProps) {
  const reduced = useReducedMotion();
  const wordsRef = React.useRef(words);
  wordsRef.current = words;

  const [wordIdx, setWordIdx] = React.useState(0);
  React.useEffect(() => setWordIdx(0), [words.length]);
  React.useEffect(() => {
    if (reduced || words.length < 2 || status !== "thinking") return;
    const t = window.setInterval(
      () => setWordIdx((i) => (i + 1) % wordsRef.current.length),
      wordIntervalMs,
    );
    return () => window.clearInterval(t);
  }, [reduced, status, words.length, wordIntervalMs]);

  // `complete` = le thinking est terminé : le conteneur retire ce bloc.
  if (status === "complete") return null;

  const visibleWord = words.length > 0 ? words[wordIdx % words.length] : undefined;

  return (
    <div
      data-agent-thinking
      data-thinking-state={status}
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2.5 text-sm text-muted-foreground", className)}
    >
      {/* --- Icône / points selon le statut ---------------------------- */}
      {status === "thinking" && (
        <ThinkingDots reduced={reduced} size={size} />
      )}
      {status === "streaming" && (
        <span className="relative grid size-4 place-items-center" data-thinking-streaming aria-hidden>
          <span
            className="absolute inset-0 rounded-full bg-primary/30"
            style={{ opacity: reduced ? 0.3 : undefined }}
          />
          {!reduced && (
            <motion.span
              className="absolute inset-0 rounded-full bg-primary/40"
              style={{ transformOrigin: "center" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity }}
            />
          )}
        </span>
      )}
      {status === "requires-action" && (
        <AppIcon name="approval" size="sm" tone="warning" data-thinking-approval aria-hidden />
      )}
      {status === "error" && (
        <AppIcon name="error" size="sm" tone="danger" data-thinking-error aria-hidden />
      )}

      {/* --- Libellé visible (aria-hidden, le SR lit `label` stable) --- */}
      <span className="min-w-0" aria-hidden>
        {status === "thinking" && (visibleWord ?? label)}
        {status === "streaming" && "En cours d'écriture…"}
        {status === "requires-action" && requiresActionLabel}
        {status === "error" && errorLabel}
      </span>

      {/* --- Actions / chip ------------------------------------------- */}
      {status === "error" && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="h-7 px-2 text-xs">
          <AppIcon name="retry" size="xs" aria-hidden />
          Réessayer
        </Button>
      )}

      {/* --- Texte SR stable (le rotateur visible est aria-hidden) ---- */}
      <span className="sr-only">{label}</span>

      {elapsedSeconds !== undefined && (
        <span
          data-thinking-elapsed
          className="font-mono text-xs tabular-nums text-muted-foreground/70"
        >
          Réflexion · {elapsedSeconds} s
        </span>
      )}
    </div>
  );
}
