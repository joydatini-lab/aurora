/**
 * TaskFilterBar — barre de filtres tâches (cat. 2.4, 2.2 Kanban).
 *
 * Étape 2 (muet) : reçoit `filters` (état courant) + `onChange`.
 * Pas de store, pas d'API. Chaque chip actif est supprimable individuellement.
 *
 * Filtres supportés (cat. 2.4) :
 * - statut, priorité, échéance (plage), projet, assigné, étiquette,
 *   récurrence, retard
 */
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                 */
/* ------------------------------------------------------------------ */

export interface TaskFilter {
  key: string;
  label: string;
  /** Valeur filtrée (ex. "haute", "a_faire"). */
  value: string;
}

export interface TaskFilterBarProps {
  /** Filtres actifs (chips supprimables). */
  filters: TaskFilter[];
  /** Appelé quand un filtre est supprimé. */
  onRemoveFilter?: (key: string) => void;
  /** Recherche texte locale (debounce géré par le parent). */
  search?: string;
  onSearchChange?: (q: string) => void;
  /** Statut (null = tous). */
  status?: string | null;
  onStatusChange?: (s: string | null) => void;
  /** Priorité (null = toutes). */
  priority?: string | null;
  onPriorityChange?: (p: string | null) => void;
  /** Appelé pour ouvrir l'éditeur de filtres avancés. */
  onOpenAdvanced?: () => void;
  /** Nombre total de résultats (affiché à droite). */
  resultCount?: number;
  /** Appelé quand « Tout effacer » est cliqué. */
  onClearAll?: () => void;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "en_revue", label: "En revue" },
  { value: "termine", label: "Terminé" },
];

const PRIORITY_OPTIONS = [
  { value: "0", label: "Basse" },
  { value: "2", label: "Moyenne" },
  { value: "4", label: "Haute" },
  { value: "5", label: "Critique" },
];

/* ------------------------------------------------------------------ */
/* Composant                                                          */
/* ------------------------------------------------------------------ */

function TaskFilterBar({
  filters,
  onRemoveFilter,
  search = "",
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  onOpenAdvanced,
  resultCount,
  onClearAll,
  className,
}: TaskFilterBarProps) {
  const hasActiveFilters = filters.length > 0 || !!status || !!priority || !!search;

  return (
    <div
      data-slot="task-filter-bar"
      className={cn("flex flex-col gap-2", className)}
    >
      {/* Ligne 1 : recherche + statut + priorité + filtres avancés */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <AppIcon
            name="open"
            size="xs"
            tone="muted"
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            aria-hidden
          />
          <Input
            placeholder="Rechercher une tâche…"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-7 h-8 text-sm"
            aria-label="Rechercher"
          />
        </div>

        {/* Statut */}
        <Select value={status ?? "all"} onValueChange={(v) => onStatusChange?.(v === "all" ? null : v)}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priorité */}
        <Select value={priority ?? "all"} onValueChange={(v) => onPriorityChange?.(v === "all" ? null : v)}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les priorités</SelectItem>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtres avancés */}
        {onOpenAdvanced && (
          <Button variant="outline" size="sm" onClick={onOpenAdvanced} className="h-8 text-xs">
            <AppIcon name="chart" size="xs" aria-hidden />
            Filtres
          </Button>
        )}
      </div>

      {/* Ligne 2 : chips de filtres actifs + compteur */}
      {(hasActiveFilters || resultCount !== undefined) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onRemoveFilter?.(f.key)}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs transition-colors hover:bg-muted"
            >
              {f.label}
              <AppIcon name="error" size="xs" tone="muted" aria-hidden />
            </button>
          ))}
          {onClearAll && hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Effacer tout
            </button>
          )}
          {resultCount !== undefined && (
            <span className="ml-auto text-xs text-muted-foreground">
              {resultCount} résultat{resultCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { TaskFilterBar };
