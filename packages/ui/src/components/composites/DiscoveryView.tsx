/**
 * DiscoveryView — découverte / recherche de sources (cat. 2.12, 4.12).
 *
 * Étape 2 (muet) : reçoit `DiscoveryViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.12) :
 * - `DiscoveryHeader` (titre + recherche)
 * - `ProgramCard` (programme de découverte)
 * - `DiscoveryResultsList` (liste de résultats)
 * - `SourceReliabilityMeta` (fiable / moyen / faible + source type)
 * - `ReaderLayout` (lecture d'un extrait)
 * - `ReaderBlock` (bloc de contenu : paragraphe, citation, image)
 * - `ReaderActionBar` (barre d'actions du lecteur)
 * - `SourcePreviewCard` (aperçu d'une source)
 */
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  /* CardTitle, */
} from "src/components/ui/card";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type SourceReliability = "high" | "medium" | "low";
export type SourceKind = "book" | "article" | "course" | "note" | "ai" | "user";

export const SOURCE_KIND_ICONS: Record<SourceKind, IconKey> = {
  book: "source",
  article: "file",
  course: "chart",
  note: "file-doc",
  ai: "tool",
  user: "success",
};

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  book: "Livre",
  article: "Article",
  course: "Cours",
  note: "Note",
  ai: "IA",
  user: "Utilisateur",
};

export const RELIABILITY_LABELS: Record<SourceReliability, string> = {
  high: "Fiable",
  medium: "Moyen",
  low: "Faible",
};

export interface DiscoveryProgram {
  id: string;
  title: string;
  description?: string;
  /** Nombre de sources dans le programme. */
  sourceCount: number;
  /** Temps estimé (min). */
  estimatedMinutes?: number;
  /** Progression (0-100). */
  progress?: number;
  /** Icone. */
  icon?: IconKey;
  /** Statut. */
  status?: "draft" | "active" | "completed";
}

export interface DiscoveryResult {
  id: string;
  title: string;
  snippet?: string;
  sourceKind: SourceKind;
  sourceName: string;
  reliability: SourceReliability;
  /** Date de publication. */
  publishedAt?: string;
  /** Durée de lecture (min). */
  readMinutes?: number;
  /** Est-elle déjà dans la bibliothèque. */
  isSaved?: boolean;
}

export interface DiscoveryViewData {
  title: string;
  description?: string;
  searchQuery: string;
  programs: DiscoveryProgram[];
  results: DiscoveryResult[];
  /** Id du résultat ouvert dans le lecteur. */
  activeResultId?: string | null;
}

export interface DiscoveryViewProps {
  data: DiscoveryViewData;
  onSearch: (q: string) => void;
  onOpenResult: (id: string) => void;
  onCreateProgram?: (title: string, description?: string) => void;
  onOpenProgram?: (id: string) => void;
  onToggleSave?: (resultId: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* DiscoveryHeader                                                    */
/* ------------------------------------------------------------------ */

export interface DiscoveryHeaderProps {
  title: string;
  description?: string;
  searchQuery: string;
  onSearch: (q: string) => void;
  onCreateProgram?: () => void;
  className?: string;
}

export function DiscoveryHeader({
  title,
  description,
  searchQuery,
  onSearch,
  onCreateProgram,
  className,
}: DiscoveryHeaderProps) {
  return (
    <div
      data-slot="discovery-header"
      className={cn("flex flex-col gap-3 border-b pb-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AppIcon name="insight" size="lg" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {onCreateProgram && (
          <Button variant="outline" size="sm" className="h-7 shrink-0" onClick={onCreateProgram}>
            <AppIcon name="task" size="xs" aria-hidden />
            Nouveau
          </Button>
        )}
      </div>
      <div className="relative">
        <AppIcon
          name="open"
          size="xs"
          tone="muted"
          className="absolute left-3 top-1/2 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Rechercher une source, un concept, un programme…"
          className="h-9 pl-9"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProgramCard                                                        */
/* ------------------------------------------------------------------ */

export interface ProgramCardProps {
  program: DiscoveryProgram;
  onOpen?: (id: string) => void;
  className?: string;
}

export function ProgramCard({
  program,
  onOpen,
  className,
}: ProgramCardProps) {
  return (
    <Card
      data-slot="program-card"
      data-status={program.status}
      className={cn("gap-0 py-3", program.status === "completed" && "opacity-60", className)}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
        <AppIcon
          name={program.icon ?? "insight"}
          size="md"
          tone="muted"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{program.title}</p>
            {program.status && program.status !== "draft" && (
              <Badge
                variant={program.status === "active" ? "default" : "outline"}
                className="text-[10px]"
              >
                {program.status === "active" ? "En cours" : "Terminé"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {program.sourceCount} source{program.sourceCount > 1 ? "s" : ""}
            {program.estimatedMinutes !== undefined &&
              ` · ~${program.estimatedMinutes} min`}
          </p>
        </div>
        {onOpen && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={() => onOpen(program.id)}
          >
            Ouvrir
          </Button>
        )}
      </CardHeader>
      {program.progress !== undefined && program.progress < 100 && (
        <CardContent className="p-4 pt-0">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${program.progress}%` }}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* SourceReliabilityMeta                                              */
/* ------------------------------------------------------------------ */

export interface SourceReliabilityMetaProps {
  reliability: SourceReliability;
  sourceKind?: SourceKind;
  sourceName?: string;
  className?: string;
}

export function SourceReliabilityMeta({
  reliability,
  sourceKind,
  sourceName,
  className,
}: SourceReliabilityMetaProps) {
  const dotColor =
    reliability === "high"
      ? "bg-success"
      : reliability === "medium"
        ? "bg-warning"
        : "bg-destructive";
  return (
    <div
      data-slot="source-reliability-meta"
      className={cn("flex items-center gap-2 text-xs", className)}
    >
      <span
        className={cn("size-2 rounded-full", dotColor)}
        aria-hidden
      />
      <span className="text-muted-foreground">
        {RELIABILITY_LABELS[reliability]}
      </span>
      {sourceKind && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <AppIcon
            name={SOURCE_KIND_ICONS[sourceKind]}
            size="xs"
            aria-hidden
          />
          {SOURCE_KIND_LABELS[sourceKind]}
        </span>
      )}
      {sourceName && (
        <span className="truncate font-medium text-foreground">
          {sourceName}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SourcePreviewCard                                                  */
/* ------------------------------------------------------------------ */

export interface SourcePreviewCardProps {
  result: DiscoveryResult;
  onOpen?: (id: string) => void;
  onToggleSave?: (id: string) => void;
  className?: string;
}

export function SourcePreviewCard({
  result,
  onOpen,
  onToggleSave,
  className,
}: SourcePreviewCardProps) {
  return (
    <Card
      data-slot="source-preview-card"
      className={cn("gap-0 py-3", result.isSaved && "border-primary/30", className)}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AppIcon
              name={SOURCE_KIND_ICONS[result.sourceKind]}
              size="sm"
              tone="muted"
              aria-hidden
            />
            <p className="truncate text-sm font-medium">{result.title}</p>
          </div>
          {result.snippet && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {result.snippet}
            </p>
          )}
          <div className="mt-2">
            <SourceReliabilityMeta
              reliability={result.reliability}
              sourceKind={result.sourceKind}
              sourceName={result.sourceName}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {result.isSaved && (
            <Badge variant="secondary" className="text-[10px]">
              Enregistré
            </Badge>
          )}
          {onToggleSave && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-1.5 text-[10px]",
                result.isSaved ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => onToggleSave(result.id)}
            >
              {result.isSaved ? "Retirer" : "Enregistrer"}
            </Button>
          )}
        </div>
      </CardHeader>
      {onOpen && (
        <CardContent className="border-t p-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => onOpen(result.id)}
          >
            Lire l'extrait
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* DiscoveryResultsList                                              */
/* ------------------------------------------------------------------ */

export interface DiscoveryResultsListProps {
  results: DiscoveryResult[];
  onOpen?: (id: string) => void;
  onToggleSave?: (id: string) => void;
  /** Libellé de l'état vide. */
  emptyLabel?: string;
  className?: string;
}

export function DiscoveryResultsList({
  results,
  onOpen,
  onToggleSave,
  emptyLabel = "Aucun résultat",
  className,
}: DiscoveryResultsListProps) {
  return (
    <div
      data-slot="discovery-results-list"
      className={cn("flex flex-col gap-2.5", className)}
    >
      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
          <AppIcon name="insight" size="lg" tone="muted" aria-hidden />
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        results.map((r) => (
          <SourcePreviewCard
            key={r.id}
            result={r}
            onOpen={onOpen}
            onToggleSave={onToggleSave}
          />
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ReaderBlock                                                        */
/* ------------------------------------------------------------------ */

export type ReaderBlockType = "paragraph" | "quote" | "image" | "heading" | "list";

export interface ReaderBlockData {
  id: string;
  type: ReaderBlockType;
  /** Texte (paragraph, quote, heading, list items concaténés). */
  content: string;
  /** URL image (si type = image). */
  src?: string;
  /** Alt text (si type = image). */
  alt?: string;
  /** Attribution de la citation. */
  attribution?: string;
}

export interface ReaderBlockProps {
  block: ReaderBlockData;
  className?: string;
}

export function ReaderBlock({ block, className }: ReaderBlockProps) {
  switch (block.type) {
    case "heading":
      return (
        <h3
          data-slot="reader-block"
          className={cn(
            "mt-4 text-lg font-semibold tracking-tight first:mt-0",
            className
          )}
        >
          {block.content}
        </h3>
      );
    case "paragraph":
      return (
        <p
          data-slot="reader-block"
          className={cn(
            "text-sm leading-relaxed text-foreground first:mt-0",
            className
          )}
        >
          {block.content}
        </p>
      );
    case "quote":
      return (
        <blockquote
          data-slot="reader-block"
          className={cn(
            "my-3 border-l-2 border-primary pl-3 text-sm italic text-muted-foreground",
            className
          )}
        >
          <p>{block.content}</p>
          {block.attribution && (
            <footer className="mt-1 text-xs not-italic">
              — {block.attribution}
            </footer>
          )}
        </blockquote>
      );
    case "image":
      return block.src ? (
        <figure
          data-slot="reader-block"
          className={cn("my-3", className)}
        >
          <img
            src={block.src}
            alt={block.alt ?? ""}
            className="w-full rounded-md border"
          />
          {block.alt && (
            <figcaption className="mt-1 text-center text-xs text-muted-foreground">
              {block.alt}
            </figcaption>
          )}
        </figure>
      ) : null;
    case "list":
      return (
        <ul
          data-slot="reader-block"
          className={cn(
            "my-2 list-disc pl-5 text-sm leading-relaxed",
            className
          )}
        >
          {block.content
            .split("\n")
            .filter(Boolean)
            .map((item, i) => (
              <li key={i}>{item}</li>
            ))}
        </ul>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* ReaderActionBar                                                    */
/* ------------------------------------------------------------------ */

export interface ReaderActionBarProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  saved?: boolean;
  hasPrevious?: boolean;
  hasNext?: boolean;
  className?: string;
}

export function ReaderActionBar({
  onPrevious,
  onNext,
  onSave,
  onShare,
  saved,
  hasPrevious,
  hasNext,
  className,
}: ReaderActionBarProps) {
  return (
    <div
      data-slot="reader-action-bar"
      className={cn(
        "flex items-center gap-2 border-t pt-3",
        className
      )}
    >
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        onClick={onPrevious}
        disabled={!hasPrevious}
      >
        Précédent
      </Button>
      <div className="flex-1" />
      {onShare && (
        <Button variant="ghost" size="sm" className="h-7" onClick={onShare}>
          <AppIcon name="open" size="xs" aria-hidden />
          Partager
        </Button>
      )}
      {onSave && (
        <Button
          variant={saved ? "secondary" : "default"}
          size="sm"
          className="h-7"
          onClick={onSave}
          disabled={saved}
        >
          {saved ? "Enregistré" : "Enregistrer"}
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-7" onClick={onNext} disabled={!hasNext}>
        Suivant
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ReaderLayout                                                        */
/* ------------------------------------------------------------------ */

export interface ReaderLayoutProps {
  result: DiscoveryResult;
  blocks: ReaderBlockData[];
  onPrevious?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  saved?: boolean;
  hasPrevious?: boolean;
  hasNext?: boolean;
  className?: string;
}

export function ReaderLayout({
  result,
  blocks,
  onPrevious,
  onNext,
  onSave,
  onShare,
  saved,
  hasPrevious,
  hasNext,
  className,
}: ReaderLayoutProps) {
  return (
    <div
      data-slot="reader-layout"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* En-tête de lecture */}
      <div className="flex flex-col gap-2 border-b pb-4">
        <SourceReliabilityMeta
          reliability={result.reliability}
          sourceKind={result.sourceKind}
          sourceName={result.sourceName}
        />
        <h2 className="text-lg font-semibold tracking-tight">{result.title}</h2>
        {result.publishedAt && (
          <p className="text-xs text-muted-foreground">
            {new Date(result.publishedAt).toLocaleDateString("fr-FR")}
            {result.readMinutes !== undefined && ` · ${result.readMinutes} min`}
          </p>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-col gap-1">
        {blocks.map((b) => (
          <ReaderBlock key={b.id} block={b} />
        ))}
      </div>

      {/* Barre d'actions */}
      <ReaderActionBar
        onPrevious={onPrevious}
        onNext={onNext}
        onSave={onSave}
        onShare={onShare}
        saved={saved}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function DiscoveryView({
  data,
  onSearch,
  onOpenResult,
  onCreateProgram,
  onOpenProgram,
  onToggleSave,
  className,
}: DiscoveryViewProps) {
  const activeResult = data.activeResultId
    ? data.results.find((r) => r.id === data.activeResultId) ?? null
    : null;

  return (
    <div
      data-slot="discovery-view"
      className={cn("flex flex-col gap-4", className)}
    >
      <DiscoveryHeader
        title={data.title}
        description={data.description}
        searchQuery={data.searchQuery}
        onSearch={onSearch}
        onCreateProgram={onCreateProgram ? () => onCreateProgram("Nouveau programme") : undefined}
      />

      {/* Programmes */}
      {data.programs.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold">Programmes</h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {data.programs.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                onOpen={onOpenProgram}
              />
            ))}
          </div>
        </div>
      )}

      {/* Résultats ou lecteur */}
      {activeResult ? (
        <ReaderLayout
          result={activeResult}
          blocks={[]}
          saved={activeResult.isSaved}
          onSave={onToggleSave ? () => onToggleSave(activeResult.id) : undefined}
          hasPrevious
          hasNext
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold">
            Résultats ({data.results.length})
          </h3>
          <DiscoveryResultsList
            results={data.results}
            onOpen={onOpenResult}
            onToggleSave={onToggleSave}
          />
        </div>
      )}
    </div>
  );
}
