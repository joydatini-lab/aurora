/**
 * AscentCard — carte de formation / apprentissage (cat. 2.5).
 *
 * 12 types : InsightCard, PrincipleCard, MentalModelCard, FrameworkCard,
 * StrategyCard, TacticCard, ChecklistCard, QuestionCard, ExperimentCard,
 * CaseStudyCard, SourceExcerptCard, ReflectionCard.
 *
 * Étape 2 (muet) : reçoit `AscentCardData` + 5 actions principales
 * (Enregistrer / Appliquer / Planifier / Partager / Passer) via `onAction`.
 * Pas de store, pas d'API.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Progress } from "src/components/ui/progress";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type AscentCardType =
  | "insight"
  | "principle"
  | "mental-model"
  | "framework"
  | "strategy"
  | "tactic"
  | "checklist"
  | "question"
  | "experiment"
  | "case-study"
  | "source-excerpt"
  | "reflection";

export type DepthLevel = "beginner" | "intermediate" | "advanced";
export type SourceType = "book" | "article" | "course" | "note" | "ai" | "user";

export interface AscentCardData {
  id: string;
  type: AscentCardType;
  title: string;
  /** Contenu principal (markdown léger ou texte). */
  content: string;
  /** Source d'origine (si type source-excerpt). */
  source?: { type: SourceType; name: string; url?: string };
  /** Profondeur. */
  depth?: DepthLevel;
  /** Temps estimé en minutes. */
  estimatedMinutes?: number;
  /** Indique si déjà enregistrée. */
  isSaved?: boolean;
  /** Progression (0-100, si le contenu est séquentiel). */
  progress?: number;
}

/** Les 5 actions principales (cat. 2.5). */
export type AscentAction = "save" | "apply" | "plan" | "share" | "skip";

export interface AscentCardProps
  extends Omit<React.ComponentProps<"article">, "onClick"> {
  data: AscentCardData;
  /** Appelé quand l'utilisateur clique sur une action. */
  onAction?: (action: AscentAction) => void;
  /** Appelé au clic sur le corps de la carte (pas les actions). */
  onOpen?: (id: string) => void;
  /** Affiche les 5 actions (barre d'actions). */
  showActions?: boolean;
  /** Affiche le badge de profondeur. */
  showDepth?: boolean;
  /** Affiche le badge de source. */
  showSource?: boolean;
  /** Affiche la progression. */
  showProgress?: boolean;
  /** Appelé pour prévisualiser la source (popover). */
  onSourceClick?: (source: AscentCardData["source"]) => void;
  /** Affiche l'input de réflexion (type = reflection). */
  reflectionValue?: string;
  onReflectionChange?: (value: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Configuration des types                                            */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<
  AscentCardType,
  { label: string; icon: IconKey; description?: string }
> = {
  insight: { label: "Insight", icon: "insight" },
  principle: { label: "Principe", icon: "summary" },
  "mental-model": { label: "Modèle mental", icon: "chart" },
  framework: { label: "Cadre", icon: "table" },
  strategy: { label: "Stratégie", icon: "project" },
  tactic: { label: "Tactique", icon: "task" },
  checklist: { label: "Checklist", icon: "task" },
  question: { label: "Question", icon: "info" },
  experiment: { label: "Expérience", icon: "tool" },
  "case-study": { label: "Étude de cas", icon: "source" },
  "source-excerpt": { label: "Extrait source", icon: "citation" },
  reflection: { label: "Réflexion", icon: "insight" },
};

const DEPTH_LABELS: Record<DepthLevel, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

const SOURCE_LABELS: Record<SourceType, string> = {
  book: "Livre",
  article: "Article",
  course: "Cours",
  note: "Note",
  ai: "IA",
  user: "Utilisateur",
};

/* ------------------------------------------------------------------ */
/* Sous-composants                                                     */
/* ------------------------------------------------------------------ */

function DepthBadge({ depth }: { depth: DepthLevel }) {
  return (
    <Badge variant="outline" className="text-[10px]">
      {DEPTH_LABELS[depth]}
    </Badge>
  );
}

function SourceBadge({
  source,
  onClick,
}: {
  source: AscentCardData["source"];
  onClick?: () => void;
}) {
  if (!source) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors",
        onClick && "hover:bg-muted hover:text-foreground cursor-pointer"
      )}
    >
      <AppIcon name="source" size="xs" aria-hidden />
      {SOURCE_LABELS[source.type]} · {source.name}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

function AscentCard({
  data,
  onAction,
  onOpen,
  showActions = true,
  showDepth = true,
  showSource = true,
  showProgress = true,
  onSourceClick,
  reflectionValue,
  onReflectionChange,
  className,
  ...props
}: AscentCardProps) {
  const config = TYPE_CONFIG[data.type];

  const handleAction = (action: AscentAction) => {
    onAction?.(action);
  };

  return (
    <article
      data-slot="ascent-card"
      data-type={data.type}
      onClick={() => onOpen?.(data.id)}
      className={cn(
        "group flex cursor-pointer flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-muted-foreground/40",
        data.isSaved && "border-primary/30 bg-primary/5",
        className
      )}
      {...props}
    >
      {/* En-tête : type + badges + temps */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AppIcon name={config.icon} size="sm" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground">
            {config.label}
          </span>
          {showDepth && data.depth && <DepthBadge depth={data.depth} />}
        </div>
        {data.estimatedMinutes !== undefined && (
          <span className="text-xs tabular-nums text-muted-foreground">
            ~{data.estimatedMinutes} min
          </span>
        )}
      </div>

      {/* Titre */}
      <h3 className="text-base font-semibold leading-tight">{data.title}</h3>

      {/* Contenu */}
      <p className="line-clamp-4 text-sm text-muted-foreground">{data.content}</p>

      {/* Source */}
      {showSource && data.source && (
        <SourceBadge
          source={data.source}
          onClick={() => onSourceClick?.(data.source)}
        />
      )}

      {/* Progression */}
      {showProgress && data.progress !== undefined && (
        <div className="flex items-center gap-2">
          <Progress value={data.progress} className="h-1.5 flex-1" />
          <span className="text-xs tabular-nums text-muted-foreground">
            {data.progress}%
          </span>
        </div>
      )}

      {/* Reflection input (type = reflection) */}
      {data.type === "reflection" && onReflectionChange && (
        <textarea
          value={reflectionValue ?? ""}
          onChange={(e) => onReflectionChange(e.target.value)}
          placeholder="Ta réflexion…"
          rows={2}
          className="w-full resize-none rounded-md border bg-background p-2 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Actions (5 principales) */}
      {showActions && onAction && (
        <div
          className="flex flex-wrap gap-1.5 border-t pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {(
            [
              { action: "save", label: "Enregistrer", icon: "success" },
              { action: "apply", label: "Appliquer", icon: "task" },
              { action: "plan", label: "Planifier", icon: "calendar" },
              { action: "share", label: "Partager", icon: "open" },
              { action: "skip", label: "Passer", icon: "retry" },
            ] as {
              action: AscentAction;
              label: string;
              icon: IconKey;
            }[]
          ).map(({ action, label, icon }) => (
            <Button
              key={action}
              variant={action === "save" ? "default" : "outline"}
              size="sm"
              className={cn("h-7 gap-1 text-xs", action === "skip" && "text-muted-foreground")}
              onClick={() => handleAction(action)}
              disabled={action === "save" && data.isSaved}
            >
              <AppIcon name={icon} size="xs" aria-hidden />
              {label}
            </Button>
          ))}
        </div>
      )}
    </article>
  );
}

export { AscentCard };
