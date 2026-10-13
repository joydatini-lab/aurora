/**
 * AscentFeed — flux de formation / apprentissage (cat. 2.5, 4.5).
 *
 * Étape 2 (muet) : reçoit `cards: AscentCardData[]` + `onAction` / `onOpen`
 * + `filter` (filtre local par type ou profondeur). Pas de store, pas d'API.
 *
 * Affiche le `AscentCard` en mode feed (liste verticaledense) avec
 * - en-tête de progression (`AscentProgressHeader`)
 * - filtres par type / profondeur (chips)
 * - liste de `AscentCard`
 * - `NextCardPreview` (aperçu de la prochaine carte)
 * - `SavedItemsList` (cartes déjà enregistrées)
 *
 * Les sous-composants sont exportés individuellement.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import {
  AscentCard,
  type AscentCardData,
  type AscentCardType,
  type AscentAction,
  type DepthLevel,
} from "src/components/composites/AscentCard";
import {
  Card,
  CardContent,
  CardHeader,
  } from "src/components/ui/card";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type AscentFilterKey =
  | "type"
  | "depth"
  | "source"
  | "status"
  | "recency";

export interface AscentFilter {
  key: AscentFilterKey;
  value?: string;
}

export interface AscentFeedProps {
  cards: AscentCardData[];
  /** Identifiant de la carte courante (pour marquer l'avancement). */
  activeCardId?: string;
  onAction?: (action: AscentAction, cardId: string) => void;
  onOpen?: (cardId: string) => void;
  onSourceClick?: (source: AscentCardData["source"], cardId: string) => void;
  /** Valeur + setter de l'input de réflexion (type = reflection). */
  reflectionValue?: string;
  onReflectionChange?: (value: string, cardId: string) => void;
  /** Affiche l'en-tête de progression. */
  showHeader?: boolean;
  /** Affiche les filtres. */
  showFilters?: boolean;
  /** Affiche l'aperçu de la prochaine carte. */
  showNextPreview?: boolean;
  /** Affiche la liste des cartes enregistrées. */
  showSaved?: boolean;
  /** Nombre de cartes affichées avant "Afficher plus". */
  pageSize?: number;
  /** Appelé quand on affiche plus. */
  onLoadMore?: () => void;
  /** Appelé pour un feedback (upvote / downvote) sur une carte. */
  onFeedback?: (cardId: string, vote: "up" | "down") => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* AscentProgressHeader                                                */
/* ------------------------------------------------------------------ */

export interface AscentProgressHeaderProps {
  total: number;
  completed: number;
  inProgress?: number;
  saved?: number;
  streak?: number;
  label?: string;
  className?: string;
}

export function AscentProgressHeader({
  total,
  completed,
  inProgress = 0,
  saved = 0,
  streak,
  label = "Progression",
  className,
}: AscentProgressHeaderProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div
      data-slot="ascent-progress-header"
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {completed}/{total} · {pct}%
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <AppIcon name="success" size="xs" aria-hidden />
          {completed} terminé
        </span>
        <span className="flex items-center gap-1">
          <AppIcon name="task" size="xs" aria-hidden />
          {inProgress} en cours
        </span>
        <span className="flex items-center gap-1">
          <AppIcon name="source" size="xs" aria-hidden />
          {saved} enregistré
        </span>
        {streak !== undefined && streak > 0 && (
          <span className="flex items-center gap-1">
            <AppIcon name="timer" size="xs" aria-hidden />
            série {streak}j
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AscentFilters                                                       */
/* ------------------------------------------------------------------ */

export interface AscentFiltersProps {
  value: AscentFilter;
  onChange: (f: AscentFilter) => void;
  /** Types disponibles (si non fourni, tous). */
  types?: AscentCardType[];
  /** Profondeurs disponibles. */
  depths?: DepthLevel[];
  className?: string;
}

const TYPE_LABELS: Record<AscentCardType, string> = {
  insight: "Insight",
  principle: "Principe",
  "mental-model": "Modèle mental",
  framework: "Cadre",
  strategy: "Stratégie",
  tactic: "Tactique",
  checklist: "Checklist",
  question: "Question",
  experiment: "Expérience",
  "case-study": "Étude de cas",
  "source-excerpt": "Extrait",
  reflection: "Réflexion",
};

/* const DEPTH_KEYS: DepthLevel[] = ["beginner", "intermediate", "advanced"]; */
const DEPTH_SHORT: Record<DepthLevel, string> = {
  beginner: "Déb.",
  intermediate: "Interm.",
  advanced: "Av.",
};

export function AscentFilters({
  value,
  onChange,
  types,
  depths,
  className,
}: AscentFiltersProps) {
  const typeList = types ?? (Object.keys(TYPE_LABELS) as AscentCardType[]);
  return (
    <div
      data-slot="ascent-filters"
      className={cn("flex flex-col gap-2", className)}
    >
      {/* Filtres principaux */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ key: "type" })}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            value.key === "type" && !value.value
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
        >
          Tous les types
        </button>
        {typeList.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ key: "type", value: t })}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              value.key === "type" && value.value === t
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      {depths && depths.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Profondeur :</span>
          {depths.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ key: "depth", value: d })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                value.key === "depth" && value.value === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {DEPTH_SHORT[d]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NextCardPreview                                                     */
/* ------------------------------------------------------------------ */

export interface NextCardPreviewProps {
  card: AscentCardData;
  onOpen?: (id: string) => void;
  className?: string;
}

export function NextCardPreview({
  card,
  onOpen,
  className,
}: NextCardPreviewProps) {
  return (
    <Card
      data-slot="ascent-next-preview"
      className={cn("gap-0 py-3", className)}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
        <AppIcon name="insight" size="sm" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Prochaine carte
          </p>
          <p className="truncate text-sm font-medium">{card.title}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onOpen?.(card.id)}
        >
          Prévisualiser
        </Button>
      </CardHeader>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* SavedItemsList                                                      */
/* ------------------------------------------------------------------ */

export interface SavedItemsListProps {
  items: AscentCardData[];
  onRemove?: (id: string) => void;
  onOpen?: (id: string) => void;
  className?: string;
}

export function SavedItemsList({
  items,
  onRemove,
  onOpen,
  className,
}: SavedItemsListProps) {
  if (items.length === 0) return null;
  return (
    <div
      data-slot="ascent-saved-list"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <AppIcon name="source" size="xs" aria-hidden />
        Enregistré ({items.length})
      </div>
      {items.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
        >
          <button
            type="button"
            onClick={() => onOpen?.(c.id)}
            className="min-w-0 flex-1 truncate text-left hover:text-primary"
          >
            {c.title}
          </button>
          <Badge variant="outline" className="text-[10px]">
            {TYPE_LABELS[c.type]}
          </Badge>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(c.id)}
              aria-label={`Retirer ${c.title} des enregistrements`}
              className="text-muted-foreground/40 hover:text-foreground"
            >
              <AppIcon name="retry" size="xs" className="rotate-45" aria-hidden />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FeedbackControl                                                     */
/* ------------------------------------------------------------------ */

export interface FeedbackControlProps {
  value: "up" | "down" | null;
  onChange: (v: "up" | "down" | null) => void;
  className?: string;
}

export function FeedbackControl({
  value,
  onChange,
  className,
}: FeedbackControlProps) {
  return (
    <div
      data-slot="ascent-feedback"
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label="Feedback"
    >
      <button
        type="button"
        aria-label="Utile"
        aria-pressed={value === "up"}
        onClick={() => onChange(value === "up" ? null : "up")}
        className={cn(
          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
          value === "up"
            ? "border-primary bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        <AppIcon name="success" size="xs" aria-hidden />
        Utile
      </button>
      <button
        type="button"
        aria-label="Peu utile"
        aria-pressed={value === "down"}
        onClick={() => onChange(value === "down" ? null : "down")}
        className={cn(
          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
          value === "down"
            ? "border-destructive bg-destructive/10 text-destructive"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        <AppIcon name="warning" size="xs" aria-hidden />
        Peu utile
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function AscentFeed({
  cards,
  activeCardId,
  onAction,
  onOpen,
  onSourceClick,
  reflectionValue,
  onReflectionChange,
  showHeader = true,
  showFilters = true,
  showNextPreview = true,
  showSaved = true,
  pageSize = 10,
  onLoadMore,
  onFeedback,
  className,
}: AscentFeedProps) {
  const [filter, setFilter] = React.useState<AscentFilter>({ key: "type" });
  const [visibleCount, setVisibleCount] = React.useState(pageSize);
  const [feedback, setFeedback] = React.useState<
    Record<string, "up" | "down" | null>
  >({});

  const completed = cards.filter((c) => c.progress === 100).length;
  const inProgress = cards.filter(
    (c) => c.progress !== undefined && c.progress < 100
  ).length;
  const saved = cards.filter((c) => c.isSaved).length;

  const filtered = cards.filter((c) => {
    if (filter.key === "type" && filter.value)
      return c.type === filter.value;
    if (filter.key === "depth" && filter.value)
      return c.depth === filter.value;
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const nextCard = filtered[visible.length];
  const savedCards = cards.filter((c) => c.isSaved);

  const handleCardAction = (cardId: string, action: AscentAction) => {
    onAction?.(action, cardId);
  };

  const handleFeedback = (cardId: string, vote: "up" | "down") => {
    onFeedback?.(cardId, vote);
    setFeedback((f) => ({ ...f, [cardId]: vote }));
  };

  return (
    <div
      data-slot="ascent-feed"
      className={cn("flex flex-col gap-4", className)}
    >
      {showHeader && (
        <AscentProgressHeader
          total={cards.length}
          completed={completed}
          inProgress={inProgress}
          saved={saved}
        />
      )}

      {showFilters && <AscentFilters value={filter} onChange={setFilter} />}

      {/* Feed */}
      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <Card className="py-12 text-center">
            <CardContent className="flex flex-col items-center gap-2">
              <AppIcon name="insight" size="lg" tone="muted" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Aucune carte dans ce filtre
              </p>
            </CardContent>
          </Card>
        )}
        {visible.map((card) => (
          <div key={card.id} className="flex flex-col gap-2">
            <AscentCard
              data={card}
              onAction={(a) => handleCardAction(card.id, a)}
              onOpen={(id) => onOpen?.(id)}
              onSourceClick={(s) => onSourceClick?.(s, card.id)}
              reflectionValue={
                card.id === activeCardId ? reflectionValue : undefined
              }
              onReflectionChange={
                card.id === activeCardId
                  ? (v) => onReflectionChange?.(v, card.id)
                  : undefined
              }
            />
            {onFeedback && (
              <div className="flex items-center justify-end">
                <FeedbackControl
                  value={feedback[card.id] ?? null}
                  onChange={(v) => {
                    if (v === null) {
                      setFeedback((f) => ({ ...f, [card.id]: null }));
                    } else {
                      handleFeedback(card.id, v);
                    }
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charger plus */}
      {filtered.length > visibleCount && onLoadMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setVisibleCount((c) => c + pageSize);
            onLoadMore();
          }}
          className="self-center"
        >
          Afficher plus ({filtered.length - visibleCount})
        </Button>
      )}

      {/* Prochaine carte */}
      {showNextPreview && nextCard && (
        <NextCardPreview card={nextCard} onOpen={(id) => onOpen?.(id)} />
      )}

      {/* Enregistrés */}
      {showSaved && savedCards.length > 0 && (
        <SavedItemsList
          items={savedCards}
          onOpen={(id) => onOpen?.(id)}
          onRemove={(id) => onAction?.("save", id)}
        />
      )}
    </div>
  );
}
