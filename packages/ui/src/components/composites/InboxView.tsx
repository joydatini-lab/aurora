/**
 * InboxView — boîte de capture / tri (cat. 2.15, 4.15).
 *
 * Étape 2 (muet) : reçoit `InboxViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.15) :
 * - `CaptureComposer` (composer une capture : type + contenu + tags)
 * - `CaptureTypeSelector` (sélection du type de capture)
 * - `CaptureInboxList` (liste des captures)
 * - `CaptureDetailDrawer` (détail d'une capture)
 * - `TriageActionBar` (actions de tri : tâche, événement, habitude, ignorer)
 * - `BulkTriageToolbar` (tri groupé)
 * - `CaptureStatusBadge` (badge de statut)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "src/components/ui/drawer";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type CaptureType = "idea" | "task" | "event" | "link" | "note" | "reminder";

export const CAPTURE_TYPE_LABELS: Record<CaptureType, string> = {
  idea: "Idée",
  task: "Tâche",
  event: "Événement",
  link: "Lien",
  note: "Note",
  reminder: "Rappel",
};

export const CAPTURE_TYPE_ICONS: Record<CaptureType, IconKey> = {
  idea: "insight",
  task: "task",
  event: "calendar",
  link: "open",
  note: "file-doc",
  reminder: "timer",
};

export type CaptureStatus =
  | "captured"
  | "triaged"
  | "converted"
  | "archived"
  | "ignored";

export const CAPTURE_STATUS_LABELS: Record<CaptureStatus, string> = {
  captured: "Capturée",
  triaged: "Triée",
  converted: "Convertie",
  archived: "Archivée",
  ignored: "Ignorée",
};

export interface CaptureData {
  id: string;
  type: CaptureType;
  title: string;
  content?: string;
  url?: string;
  tags?: string[];
  status: CaptureStatus;
  /** Référence vers l'objet converti (tâche, événement…). */
  convertedToRef?: string;
  createdAt: string;
  /** Capturée par (utilisateur / agent). */
  source?: "user" | "agent";
}

export interface InboxViewData {
  captures: CaptureData[];
  /** Statut en cours de filtrage. */
  activeStatus: CaptureStatus | "all";
  /** Recherche. */
  searchQuery?: string;
  /** Sélection multiple (tri groupé). */
  selectedIds: string[];
}

export interface InboxViewProps {
  data: InboxViewData;
  onCapture: (capture: Omit<CaptureData, "id" | "createdAt" | "status">) => void;
  onTriage: (captureId: string, to: CaptureType, ref?: string) => void;
  onIgnore: (captureId: string) => void;
  onArchive: (captureId: string) => void;
  onSelect: (id: string | null) => void;
  onToggleSelect: (id: string) => void;
  onClearSelection: () => void;
  onBulkTriage: (ids: string[], to: CaptureType) => void;
  onBulkIgnore: (ids: string[]) => void;
  /** Appelé quand on ouvre le détail (drawer). */
  activeCaptureId?: string | null;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* CaptureStatusBadge                                                 */
/* ------------------------------------------------------------------ */

export function CaptureStatusBadge({
  status,
  className,
}: {
  status: CaptureStatus;
  className?: string;
}) {
  const variant =
    status === "converted"
      ? "default"
      : status === "ignored"
        ? "outline"
        : status === "archived"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant} className={cn("text-[10px]", className)}>
      {CAPTURE_STATUS_LABELS[status]}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* CaptureTypeSelector                                                */
/* ------------------------------------------------------------------ */

export interface CaptureTypeSelectorProps {
  value: CaptureType;
  onChange: (t: CaptureType) => void;
  className?: string;
}

export function CaptureTypeSelector({
  value,
  onChange,
  className,
}: CaptureTypeSelectorProps) {
  const types = Object.keys(CAPTURE_TYPE_LABELS) as CaptureType[];
  return (
    <div
      data-slot="capture-type-selector"
      className={cn(
        "flex items-center gap-1 rounded-md border p-0.5",
        className
      )}
      role="radiogroup"
      aria-label="Type de capture"
    >
      {types.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
            value === t
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <AppIcon name={CAPTURE_TYPE_ICONS[t]} size="xs" aria-hidden />
          <span className="hidden sm:inline">{CAPTURE_TYPE_LABELS[t]}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CaptureComposer                                                    */
/* ------------------------------------------------------------------ */

export interface CaptureComposerProps {
  value: { type: CaptureType; title: string; content: string; url?: string; tags: string[] };
  onChange: (v: CaptureComposerProps["value"]) => void;
  onSubmit: () => void;
  isDisabled?: boolean;
  /** Appelé pour ajouter un tag. */
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  className?: string;
}

export function CaptureComposer({
  value,
  onChange,
  onSubmit,
  isDisabled,
  onAddTag,
  onRemoveTag,
  className,
}: CaptureComposerProps) {
  const canSubmit = value.title.trim().length > 0 && !isDisabled;

  return (
    <div
      data-slot="capture-composer"
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-3.5",
        className
      )}
    >
      <CaptureTypeSelector
        value={value.type}
        onChange={(t) => onChange({ ...value, type: t })}
      />

      <input
        type="text"
        value={value.title}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
        placeholder="Titre de la capture…"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {value.type === "link" && (
        <input
          type="url"
          value={value.url ?? ""}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      <textarea
        value={value.content}
        onChange={(e) => onChange({ ...value, content: e.target.value })}
        placeholder="Détails (optionnel)…"
        rows={2}
        className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Tags */}
      {onAddTag && (
        <div className="flex flex-wrap items-center gap-1">
          {value.tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]"
            >
              {t}
              {onRemoveTag && (
                <button
                  type="button"
                  onClick={() => onRemoveTag(t)}
                  aria-label={`Retirer le tag ${t}`}
                  className="text-muted-foreground/50 hover:text-foreground"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          <input
            type="text"
            placeholder="Ajouter un tag…"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                onAddTag(e.currentTarget.value.trim());
                e.currentTarget.value = "";
              }
            }}
            className="w-28 rounded-md border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          Capturer
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TriageActionBar                                                    */
/* ------------------------------------------------------------------ */

export interface TriageActionBarProps {
  onTriage: (to: CaptureType) => void;
  onIgnore?: () => void;
  onArchive?: () => void;
  disabled?: boolean;
  className?: string;
}

export function TriageActionBar({
  onTriage,
  onIgnore,
  onArchive,
  disabled,
  className,
}: TriageActionBarProps) {
  const targets: { to: CaptureType; label: string; icon: IconKey }[] = [
    { to: "task", label: "Tâche", icon: "task" },
    { to: "event", label: "Événement", icon: "calendar" },
    { to: "idea", label: "Idée", icon: "insight" },
  ];
  return (
    <div
      data-slot="triage-action-bar"
      className={cn(
        "flex flex-wrap items-center gap-1.5 border-t pt-3",
        disabled && "opacity-50",
        className
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">
        Convertir en :
      </span>
      {targets.map((t) => (
        <Button
          key={t.to}
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          disabled={disabled}
          onClick={() => onTriage(t.to)}
        >
          <AppIcon name={t.icon} size="xs" aria-hidden />
          {t.label}
        </Button>
      ))}
      <div className="flex-1" />
      {onArchive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={disabled}
          onClick={onArchive}
        >
          Archiver
        </Button>
      )}
      {onIgnore && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          disabled={disabled}
          onClick={onIgnore}
        >
          Ignorer
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BulkTriageToolbar                                                  */
/* ------------------------------------------------------------------ */

export interface BulkTriageToolbarProps {
  count: number;
  onTriage: (to: CaptureType) => void;
  onIgnore: () => void;
  onClear: () => void;
  className?: string;
}

export function BulkTriageToolbar({
  count,
  onTriage,
  onIgnore,
  onClear,
  className,
}: BulkTriageToolbarProps) {
  if (count === 0) return null;
  return (
    <div
      data-slot="bulk-triage-toolbar"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2",
        className
      )}
      role="toolbar"
    >
      <span className="text-xs font-medium tabular-nums">
        {count} sélection{count > 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={() => onTriage("task")}
        >
          <AppIcon name="task" size="xs" aria-hidden />
          Tâches
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={() => onTriage("event")}
        >
          <AppIcon name="calendar" size="xs" aria-hidden />
          Événements
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={onIgnore}
        >
          Ignorer
        </Button>
      </div>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={onClear}
      >
        Tout désélectionner
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CaptureDetailDrawer                                                */
/* ------------------------------------------------------------------ */

export interface CaptureDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capture: CaptureData | null;
  onTriage: (to: CaptureType) => void;
  onIgnore?: () => void;
  onArchive?: () => void;
  /** Appelé pour ouvrir l'objet converti. */
  onOpenConvertedRef?: (ref: string) => void;
  className?: string;
}

export function CaptureDetailDrawer({
  open,
  onOpenChange,
  capture,
  onTriage,
  onIgnore,
  onArchive,
  onOpenConvertedRef,
  className,
}: CaptureDetailDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("rounded-t-xl", className)}>
        {capture && (
          <>
            <DrawerHeader>
              <div className="flex items-center justify-between">
                <DrawerTitle className="flex items-center gap-2">
                  <AppIcon
                    name={CAPTURE_TYPE_ICONS[capture.type]}
                    size="sm"
                    aria-hidden
                  />
                  {CAPTURE_TYPE_LABELS[capture.type]}
                </DrawerTitle>
                <CaptureStatusBadge status={capture.status} />
              </div>
              <DrawerDescription>
                {new Date(capture.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex flex-col gap-3 px-4 pb-4">
              <div>
                <h3 className="text-base font-semibold">{capture.title}</h3>
                {capture.content && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {capture.content}
                  </p>
                )}
              </div>

              {capture.url && (
                <a
                  href={capture.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <AppIcon name="open" size="xs" aria-hidden />
                  {capture.url}
                </a>
              )}

              {capture.tags && capture.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {capture.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              {capture.status === "converted" && capture.convertedToRef && (
                <button
                  type="button"
                  onClick={() => onOpenConvertedRef?.(capture.convertedToRef!)}
                  className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-2 text-xs transition-colors hover:bg-muted"
                >
                  <AppIcon name="success" size="xs" tone="success" aria-hidden />
                  Convertie en {capture.convertedToRef}
                </button>
              )}

              {(capture.status === "captured" || capture.status === "triaged") && (
                <TriageActionBar
                  onTriage={onTriage}
                  onIgnore={onIgnore}
                  onArchive={onArchive}
                />
              )}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* CaptureInboxList                                                   */
/* ------------------------------------------------------------------ */

export interface CaptureInboxListProps {
  captures: CaptureData[];
  selectedIds: string[];
  activeId?: string | null;
  onSelect: (id: string | null) => void;
  onToggleSelect: (id: string) => void;
  /** Affiche le mode tri groupé. */
  showSelection?: boolean;
  className?: string;
}

export function CaptureInboxList({
  captures,
  selectedIds,
  activeId,
  onSelect,
  onToggleSelect,
  showSelection = true,
  className,
}: CaptureInboxListProps) {
  if (captures.length === 0) {
    return (
      <div
        data-slot="capture-inbox-list"
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center",
          className
        )}
      >
        <AppIcon name="task" size="lg" tone="muted" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aucune capture pour le moment
        </p>
      </div>
    );
  }

  return (
    <div
      data-slot="capture-inbox-list"
      className={cn("flex flex-col gap-2", className)}
    >
      {captures.map((c) => {
        const isSelected = selectedIds.includes(c.id);
        return (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            data-slot="capture-inbox-item"
            data-capture-id={c.id}
            data-selected={isSelected}
            onClick={() => onSelect(c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect(c.id);
            }}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-card p-3 transition-colors hover:border-muted-foreground/40",
              activeId === c.id && "border-primary bg-primary/5"
            )}
          >
            {showSelection && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(c.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Sélectionner ${c.title}`}
                className="mt-0.5 size-4 shrink-0 rounded border-border"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <AppIcon
                  name={CAPTURE_TYPE_ICONS[c.type]}
                  size="xs"
                  tone="muted"
                  aria-hidden
                />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {c.title}
                </p>
                <CaptureStatusBadge status={c.status} />
              </div>
              {c.content && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {c.content}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>
                  {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                {c.tags && c.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-muted px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                  </span>
                )}
                {c.source === "agent" && (
                  <span className="flex items-center gap-0.5">
                    <AppIcon name="insight" size="xs" aria-hidden />
                    Agent
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function InboxView({
  data,
  onCapture,
  onTriage,
  onIgnore,
  onArchive,
  onSelect,
  onToggleSelect,
  onClearSelection,
  onBulkTriage,
  onBulkIgnore,
  activeCaptureId,
  className,
}: InboxViewProps) {
  const [composer, setComposer] = React.useState<CaptureComposerProps["value"]>(
    { type: "idea", title: "", content: "", url: "", tags: [] }
  );
  const [composerOpen, setComposerOpen] = React.useState(true);

  const filtered = data.captures.filter((c) => {
    if (data.activeStatus !== "all" && c.status !== data.activeStatus)
      return false;
    if (data.searchQuery) {
      const q = data.searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.content?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCapture = () => {
    onCapture({
      type: composer.type,
      title: composer.title.trim(),
      content: composer.content.trim() || undefined,
      url: composer.url?.trim() || undefined,
      tags: composer.tags,
      source: "user",
    });
    setComposer({ type: composer.type, title: "", content: "", url: "", tags: [] });
  };

  return (
    <div
      data-slot="inbox-view"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <AppIcon name="task" size="lg" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Captures
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.captures.length} capture
              {data.captures.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setComposerOpen((o) => !o)}
        >
          {composerOpen ? "Masquer" : "Nouvelle capture"}
        </Button>
      </div>

      {/* Composer */}
      {composerOpen && (
        <CaptureComposer
          value={composer}
          onChange={setComposer}
          onSubmit={handleCapture}
          onAddTag={(tag) =>
            setComposer((c) => ({ ...c, tags: [...c.tags, tag] }))
          }
          onRemoveTag={(tag) =>
            setComposer((c) => ({
              ...c,
              tags: c.tags.filter((t) => t !== tag),
            }))
          }
        />
      )}

      {/* Tri groupé */}
      <BulkTriageToolbar
        count={data.selectedIds.length}
        onTriage={(to) => onBulkTriage(data.selectedIds, to)}
        onIgnore={() => onBulkIgnore(data.selectedIds)}
        onClear={onClearSelection}
      />

      {/* Liste */}
      <CaptureInboxList
        captures={filtered}
        selectedIds={data.selectedIds}
        activeId={activeCaptureId}
        onSelect={onSelect}
        onToggleSelect={onToggleSelect}
      />

      {/* Drawer de détail */}
      {activeCaptureId && (
        <CaptureDetailDrawer
          open={!!activeCaptureId}
          onOpenChange={(open) => !open && onSelect(null)}
          capture={
            data.captures.find((c) => c.id === activeCaptureId) ?? null
          }
          onTriage={(to) => {
            onTriage(activeCaptureId, to);
            onSelect(null);
          }}
          onIgnore={() => {
            onIgnore(activeCaptureId);
            onSelect(null);
          }}
          onArchive={() => {
            onArchive(activeCaptureId);
            onSelect(null);
          }}
        />
      )}
    </div>
  );
}
