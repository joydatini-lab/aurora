/**
 * CanvasView — espace de travail d'édition de documents / canvas (cat. 2.16, 4.16).
 *
 * Étape 2 (muet) : reçoit `CanvasViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.16) :
 * - `CanvasHeader` (titre + statut de sync + menu)
 * - `CanvasViewSwitch` (vue : éditeur / source markdown / source HTML / outline)
 * - `TipTapEditorSurface` (surface d'édition riche — le parent fournit TipTap)
 * - `RichTextToolbar` (boutons formatage)
 * - `SlashCommandMenu` (menu de commandes « / »)
 * - `MarkdownSourceEditor` / `HtmlSourceEditor` (éditeurs source)
 * - `CanvasSyncStatus` (badge de synchronisation)
 * - `VersionHistoryPanel` (historique de versions)
 * - `CanvasOutline` (plan / table des matières)
 * - `InsertMediaDialog` (insertion d'image / audio / tableau / artifact)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { useEditor, EditorContent } from "@tiptap/react";
import { buildCanvasExtensions, type CanvasTiptapOptions } from "src/components/ui/tiptap-extensions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type CanvasSyncState =
  | "synced"
  | "saving"
  | "unsaved"
  | "conflict"
  | "error";

export const SYNC_STATE_LABELS: Record<CanvasSyncState, string> = {
  synced: "Synchronisé",
  saving: "Enregistrement…",
  unsaved: "Modifications non enregistrées",
  conflict: "Conflit de version",
  error: "Erreur de sync",
};

export type CanvasDocView = "editor" | "markdown" | "html" | "outline";

export interface CanvasVersion {
  id: string;
  label: string;
  author: string;
  createdAt: string;
  /** Est la version active. */
  isCurrent?: boolean;
}

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

export interface CanvasViewData {
  /** Titre du document. */
  title: string;
  /** Statut de synchronisation. */
  syncState: CanvasSyncState;
  /** Vue courante. */
  activeView: CanvasDocView;
  /** Contenu texte (markdown pour source view). */
  content: string;
  /** Historique. */
  versions: CanvasVersion[];
  /** Plan (toc). */
  outline: OutlineItem[];
  /** Date de dernière sauvegarde. */
  lastSavedAt?: string;
}

export interface CanvasViewProps {
  data: CanvasViewData;
  onViewChange: (v: CanvasDocView) => void;
  onContentChange: (content: string) => void;
  /** Sauvegarde. */
  onSave?: () => void;
  /** Restaure une version. */
  onRestoreVersion?: (versionId: string) => void;
  /** Modifie le titre. */
  onTitleChange?: (title: string) => void;
  /** Conteneur de l'éditeur (TipTap) fourni par le parent. */
  editorChildren?: React.ReactNode;
  /** Appelé quand on insère un média. */
  onInsertMedia?: (kind: "image" | "audio" | "table" | "artifact", ref: string) => void;
  /** Résolution d'un conflit. */
  onResolveConflict?: (strategy: "take-theirs" | "take-mine" | "merge") => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* CanvasSyncStatus                                                   */
/* ------------------------------------------------------------------ */

export function CanvasSyncStatus({
  state,
  lastSavedAt,
  className,
}: {
  state: CanvasSyncState;
  lastSavedAt?: string;
  className?: string;
}) {
  const cfg: Record<
    CanvasSyncState,
    { icon: IconKey; tone: "default" | "muted" | "success" | "warning" | "danger" }
  > = {
    synced: { icon: "success", tone: "success" },
    saving: { icon: "timer", tone: "muted" },
    unsaved: { icon: "warning", tone: "warning" },
    conflict: { icon: "warning", tone: "warning" },
    error: { icon: "error", tone: "danger" },
  };
  const c = cfg[state];
  return (
    <div
      data-slot="canvas-sync-status"
      data-state={state}
      className={cn("flex items-center gap-1.5 text-xs", className)}
      role="status"
    >
      <AppIcon name={c.icon} size="xs" tone={c.tone} aria-hidden />
      <span className="text-muted-foreground">{SYNC_STATE_LABELS[state]}</span>
      {state === "synced" && lastSavedAt && (
        <span className="text-muted-foreground/60 tabular-nums">
          ·{" "}
          {new Date(lastSavedAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CanvasViewSwitch                                                   */
/* ------------------------------------------------------------------ */

const VIEW_LABELS: Record<CanvasDocView, string> = {
  editor: "Éditeur",
  markdown: "Markdown",
  html: "HTML",
  outline: "Plan",
};

export interface CanvasViewSwitchProps {
  value: CanvasDocView;
  onChange: (v: CanvasDocView) => void;
  /** Vues disponibles. */
  views?: CanvasDocView[];
  className?: string;
}

export function CanvasViewSwitch({
  value,
  onChange,
  views = ["editor", "markdown", "html", "outline"],
  className,
}: CanvasViewSwitchProps) {
  return (
    <div
      data-slot="canvas-view-switch"
      className={cn(
        "flex items-center gap-1 rounded-md border p-0.5",
        className
      )}
      role="tablist"
      aria-label="Vue du document"
    >
      {views.map((v) => (
        <Button
          key={v}
          variant={value === v ? "secondary" : "ghost"}
          size="sm"
          className={cn("h-7 px-2.5 text-xs", value !== v && "text-muted-foreground")}
          onClick={() => onChange(v)}
        >
          {VIEW_LABELS[v]}
        </Button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RichTextToolbar                                                    */
/* ------------------------------------------------------------------ */

export interface ToolbarAction {
  key: string;
  label: string;
  icon: IconKey;
  disabled?: boolean;
  onAction: () => void;
}

export interface RichTextToolbarProps {
  actions: ToolbarAction[];
  /** Boutons formatage actuels (gras, italique…). */
  activeFormat?: string[];
  onToggleFormat?: (key: string) => void;
  /** Sélecteur de niveau de titre. */
  onHeadingLevel?: (level: number) => void;
  className?: string;
}

export function RichTextToolbar({
  actions,
  activeFormat = [],
  onHeadingLevel,
  className,
}: RichTextToolbarProps) {
  return (
    <div
      data-slot="rich-text-toolbar"
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-md border bg-muted/20 p-1",
        className
      )}
      role="toolbar"
      aria-label="Outils de formatage"
    >
      {/* Niveaux de titre */}
      {onHeadingLevel && (
        <Select
          onValueChange={(v) => onHeadingLevel(Number(v))}
        >
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue placeholder="Paragraphe" />
          </SelectTrigger>
          <SelectContent>
            {[
              { v: "1", l: "Titre 1" },
              { v: "2", l: "Titre 2" },
              { v: "3", l: "Titre 3" },
              { v: "0", l: "Paragraphe" },
            ].map((h) => (
              <SelectItem key={h.v} value={h.v}>
                {h.l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="mx-1 h-4 w-px bg-border" aria-hidden />

      {actions.map((a) => {
        const active = activeFormat.includes(a.key);
        return (
          <Button
            key={a.key}
            variant={active ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2 text-xs", a.disabled && "opacity-40")}
            disabled={a.disabled}
            onClick={a.onAction}
            aria-pressed={active}
            aria-label={a.label}
          >
            <AppIcon name={a.icon} size="xs" aria-hidden />
          </Button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SlashCommandMenu                                                   */
/* ------------------------------------------------------------------ */

export interface SlashCommand {
  key: string;
  label: string;
  description?: string;
  icon: IconKey;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { key: "heading", label: "Titre", description: "Ajouter un titre", icon: "summary" },
  { key: "list", label: "Liste", description: "Liste à puces", icon: "table" },
  { key: "task", label: "Liste de tâches", description: "Checklist", icon: "task" },
  { key: "quote", label: "Citation", description: "Bloc de citation", icon: "citation" },
  { key: "code", label: "Bloc de code", description: "Snippet code", icon: "code" },
  { key: "table", label: "Tableau", description: "Insérer un tableau", icon: "table" },
  { key: "image", label: "Image", description: "Insérer une image", icon: "image" },
  { key: "artifact", label: "Artifact", description: "Lier un artifact", icon: "file" },
  { key: "callout", label: "Callout", description: "Encadré d'alerte", icon: "warning" },
];

export interface SlashCommandMenuProps {
  open: boolean;
  query: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  /** Position du menu (left/top en px, par rapport au conteneur). */
  position?: { top: number; left: number };
  className?: string;
}

export function SlashCommandMenu({
  open,
  query,
  onSelect,
  onClose,
  position,
  className,
}: SlashCommandMenuProps) {
  if (!open) return null;
  const filtered = SLASH_COMMANDS.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.key.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      data-slot="slash-command-menu"
      className={cn(
        "absolute z-50 w-64 rounded-lg border bg-card p-1 shadow-lg",
        className
      )}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
      }}
      role="menu"
      aria-label="Commandes"
    >
      {filtered.length === 0 && (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          Aucune commande
        </p>
      )}
      {filtered.map((c) => (
        <button
          key={c.key}
          type="button"
          role="menuitem"
          onClick={() => {
            onSelect(c.key);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
        >
          <AppIcon name={c.icon} size="sm" tone="muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{c.label}</p>
            {c.description && (
              <p className="text-xs text-muted-foreground">{c.description}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TipTapEditorSurface                                                */
/* ------------------------------------------------------------------ */

export interface TipTapEditorSurfaceProps {
  /** Édition auto-portante (canvas-agentique) : le composant monte son propre
   *  `useEditor` TipTap via `buildCanvasExtensions`. */
  content?: string;
  /** Appelé à chaque frappe (le parent peut re-sérialiser en markdown). */
  onContentChange?: (content: string) => void;
  /** Compat : éditeur TipTap injecté par le parent (prioritaire sur le mode
   *  auto-portant). Garde les consommateurs existants (apps/mobile canvas)
   *  fonctionnels pendant la migration Task 3bis. */
  editorChildren?: React.ReactNode;
  /** Optionnel : config avancée des extensions (mention / link / table). */
  tiptapOptions?: CanvasTiptapOptions;
  /** Permet le menu « / ». */
  onSlashCommand?: (query: string, position: { top: number; left: number }) => void;
  slashOpen?: boolean;
  className?: string;
}

export function TipTapEditorSurface({
  content,
  onContentChange,
  editorChildren,
  tiptapOptions,
  className,
}: TipTapEditorSurfaceProps) {
  // Mode auto-portant : le composant crée son éditeur TipTap (Task 3).
  const autoEditor = useEditor(
    {
      extensions: buildCanvasExtensions(tiptapOptions),
      content: content ?? "",
      editorProps: {
        attributes: {
          class: "tiptap canvas-editor min-h-64 w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        onContentChange?.(editor.getHTML());
      },
      immediatelyRender: false,
    },
    [],
  );

  return (
    <div
      data-slot="tiptap-editor-surface"
      className={cn(
        "relative flex-1 overflow-y-auto p-4",
        className,
      )}
    >
      {/* Priorité au parent (compat) */}
      {editorChildren ? (
        editorChildren
      ) : autoEditor ? (
        <EditorContent editor={autoEditor} />
      ) : (
        /* Fallback non-editable (si useEditor n'a pas encore monté) */
        <div className="min-h-64 text-sm text-muted-foreground">
          {content ?? ""}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MarkdownSourceEditor / HtmlSourceEditor                            */
/* ------------------------------------------------------------------ */

export interface SourceEditorProps {
  value: string;
  onChange: (v: string) => void;
  /** Appelé quand on valide (Ctrl+S ou bouton). */
  onSave?: () => void;
  language?: "markdown" | "html";
  className?: string;
}

export function MarkdownSourceEditor(props: SourceEditorProps) {
  return <SourceEditorImpl {...props} language="markdown" />;
}

export function HtmlSourceEditor(props: SourceEditorProps) {
  return <SourceEditorImpl {...props} language="html" />;
}

function SourceEditorImpl({
  value,
  onChange,
  onSave,
  language = "markdown",
  className,
}: SourceEditorProps) {
  return (
    <div
      data-slot={`source-editor-${language}`}
      className={cn("flex flex-col gap-2 p-4", className)}
    >
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          {language.toUpperCase()}
        </Badge>
        {onSave && (
          <Button size="sm" className="h-7 text-xs" onClick={onSave}>
            Enregistrer
          </Button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-h-64 flex-1 resize-none rounded-md border bg-muted/20 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={`Éditeur source ${language}`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VersionHistoryPanel                                                */
/* ------------------------------------------------------------------ */

export interface VersionHistoryPanelProps {
  versions: CanvasVersion[];
  onRestore?: (versionId: string) => void;
  className?: string;
}

export function VersionHistoryPanel({
  versions,
  onRestore,
  className,
}: VersionHistoryPanelProps) {
  if (versions.length === 0) {
    return (
      <div
        data-slot="version-history-panel"
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center",
          className
        )}
      >
        <AppIcon name="timer" size="lg" tone="muted" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aucune version enregistrée
        </p>
      </div>
    );
  }
  return (
    <div
      data-slot="version-history-panel"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <h3 className="text-xs font-medium text-muted-foreground">
        Historique
      </h3>
      {versions.map((v) => (
        <div
          key={v.id}
          className={cn(
            "flex items-center gap-2 rounded-md border bg-card px-2.5 py-2",
            v.isCurrent && "border-primary bg-primary/5"
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{v.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {v.author} ·{" "}
              {new Date(v.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {v.isCurrent ? (
            <Badge variant="secondary" className="text-[10px]">
              Actuelle
            </Badge>
          ) : (
            onRestore && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => onRestore(v.id)}
              >
                Restaurer
              </Button>
            )
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CanvasOutline                                                       */
/* ------------------------------------------------------------------ */

export interface CanvasOutlineProps {
  items: OutlineItem[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

export function CanvasOutline({
  items,
  activeId,
  onSelect,
  className,
}: CanvasOutlineProps) {
  if (items.length === 0) {
    return (
      <div
        data-slot="canvas-outline"
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center",
          className
        )}
      >
        <AppIcon name="summary" size="lg" tone="muted" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aucun titre dans le document
        </p>
      </div>
    );
  }
  return (
    <div
      data-slot="canvas-outline"
      className={cn("flex flex-col gap-0.5", className)}
      role="tree"
      aria-label="Plan du document"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="treeitem"
          aria-selected={activeId === item.id}
          onClick={() => onSelect?.(item.id)}
          style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
          className={cn(
            "rounded px-2 py-1 text-left text-sm transition-colors",
            activeId === item.id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {item.text}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* InsertMediaDialog                                                 */
/* ------------------------------------------------------------------ */

export type MediaKind = "image" | "audio" | "table" | "artifact";

export interface InsertMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (kind: MediaKind, ref: string) => void;
  /** Pièces disponibles (images, audio…). */
  mediaItems?: { id: string; label: string; kind: MediaKind }[];
  className?: string;
}

export function InsertMediaDialog({
  open,
  onOpenChange,
  onInsert,
  mediaItems = [],
  className,
}: InsertMediaDialogProps) {
  const [kind, setKind] = React.useState<MediaKind>("image");
  const [custom, setCustom] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-sm", className)}>
        <DialogHeader>
          <DialogTitle>Insérer un média</DialogTitle>
          <DialogDescription>
            Choisir le type de contenu à insérer dans le document.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(["image", "audio", "table", "artifact"] as MediaKind[]).map(
              (k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    kind === k
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {k === "table" ? "Tableau" : k === "artifact" ? "Artifact" : k === "audio" ? "Audio" : "Image"}
                </button>
              )
            )}
          </div>

          {mediaItems.length > 0 ? (
            <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {mediaItems
                .filter((m) => m.kind === kind)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onInsert(kind, m.id);
                      onOpenChange(false);
                    }}
                    className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <AppIcon
                      name={
                        kind === "image" ? "image" : kind === "audio" ? "audio" : "file"
                      }
                      size="xs"
                      tone="muted"
                      aria-hidden
                    />
                    {m.label}
                  </button>
                ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={
                  kind === "image"
                    ? "URL de l'image ou ID…"
                    : kind === "audio"
                      ? "URL de l'audio…"
                      : "Référence…"
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Collez un URL ou saisissez une référence, puis insérez.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (custom.trim()) {
                onInsert(kind, custom.trim());
                onOpenChange(false);
                setCustom("");
              } else {
                onOpenChange(false);
              }
            }}
          >
            Insérer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function CanvasView({
  data,
  onViewChange,
  onContentChange,
  onSave,
  onRestoreVersion,
  onTitleChange,
  editorChildren,
  onInsertMedia,
  onResolveConflict,
  className,
}: CanvasViewProps) {
  const [slashOpen, setSlashOpen] = React.useState(false);
  const [slashQuery, setSlashQuery] = React.useState("");
  const [mediaDialogOpen, setMediaDialogOpen] = React.useState(false);

  return (
    <div
      data-slot="canvas-view"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      {/* En-tête */}
      <div className="flex flex-col gap-2.5 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              value={data.title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Sans titre"
              className="min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-tight focus:outline-none"
              aria-label="Titre du document"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CanvasSyncStatus
              state={data.syncState}
              lastSavedAt={data.lastSavedAt}
            />
            {onSave && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={onSave}
                disabled={data.syncState === "synced"}
              >
                Enregistrer
              </Button>
            )}
            {onInsertMedia && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMediaDialogOpen(true)}
              >
                <AppIcon name="image" size="xs" aria-hidden />
                Insérer
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <CanvasViewSwitch value={data.activeView} onChange={onViewChange} />
          {data.syncState === "conflict" && onResolveConflict && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Conflit :</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => onResolveConflict("take-mine")}
              >
                La mienne
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => onResolveConflict("take-theirs")}
              >
                L'autre
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Barre d'outils formatage (vue éditeur seulement) */}
      {data.activeView === "editor" && (
        <div className="border-b px-4 py-2">
          <RichTextToolbar
            actions={[
              { key: "bold", label: "Gras", icon: "code", onAction: () => {} },
              { key: "italic", label: "Italique", icon: "code", onAction: () => {} },
              { key: "link", label: "Lien", icon: "open", onAction: () => {} },
              {
                key: "slash",
                label: "Commandes",
                icon: "terminal",
                onAction: () => {
                  setSlashOpen(true);
                  setSlashQuery("");
                },
              },
            ]}
          />
        </div>
      )}

      {/* Corps : vue active */}
      <div className="flex min-h-0 flex-1 flex-col">
        {data.activeView === "editor" && (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <TipTapEditorSurface
              content={data.content}
              onContentChange={onContentChange}
              editorChildren={editorChildren}
            />
            <SlashCommandMenu
              open={slashOpen}
              query={slashQuery}
              onSelect={(key) => onContentChange(`${data.content} [${key}]`)}
              onClose={() => setSlashOpen(false)}
              position={{ top: 100, left: 16 }}
            />
          </div>
        )}

        {data.activeView === "markdown" && (
          <MarkdownSourceEditor
            value={data.content}
            onChange={onContentChange}
            onSave={onSave}
          />
        )}

        {data.activeView === "html" && (
          <HtmlSourceEditor
            value={data.content}
            onChange={onContentChange}
            onSave={onSave}
          />
        )}

        {data.activeView === "outline" && (
          <div className="flex flex-col gap-3 p-4">
            <CanvasOutline items={data.outline} />
          </div>
        )}
      </div>

      {/* Historique (latéral, visible en bas sur mobile) */}
      {data.versions.length > 0 && (
        <div className="border-t px-4 py-3">
          <VersionHistoryPanel
            versions={data.versions}
            onRestore={onRestoreVersion}
          />
        </div>
      )}

      {/* Dialogues */}
      {onInsertMedia && (
        <InsertMediaDialog
          open={mediaDialogOpen}
          onOpenChange={setMediaDialogOpen}
          onInsert={(kind, ref) => onInsertMedia(kind, ref)}
        />
      )}
    </div>
  );
}
