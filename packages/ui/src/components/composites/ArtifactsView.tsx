/**
 * ArtifactsView — visionneuse d'artefacts (cat. 2.20, 4.20).
 *
 * Étape 2 (muet) : reçoit `ArtifactsViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.20) :
 * - `ArtifactViewerShell` (conteneur : toolbar + viewer + panneau latéral)
 * - Viewers par type : `PdfArtifactViewer`, `DocumentArtifactViewer`,
 *   `PresentationArtifactViewer`, `SpreadsheetArtifactViewer`,
 *   `ImageArtifactViewer`, `AudioArtifactViewer`
 * - `ArtifactMetadataPanel` (panneau latéral : props, auteur, date)
 * - `ArtifactProcessingStatus` (statut : en cours / terminé / erreur)
 * - `PreviewErrorState` / `UnsupportedPreviewState`
 * - `DownloadButton` / `ArtifactVersionList` / `ArtifactAccessBadge`
 * - `ArtifactTypeIcon` / `FileSizeLabel`
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

export type ArtifactType =
  | "pdf"
  | "document"
  | "presentation"
  | "spreadsheet"
  | "image"
  | "audio"
  | "video"
  | "code"
  | "unknown";

export const ARTIFACT_TYPE_ICONS: Record<ArtifactType, IconKey> = {
  pdf: "file-pdf",
  document: "file-doc",
  presentation: "table",
  spreadsheet: "table",
  image: "image",
  audio: "audio",
  video: "chart",
  code: "code",
  unknown: "file",
};

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  pdf: "PDF",
  document: "Document",
  presentation: "Présentation",
  spreadsheet: "Tableur",
  image: "Image",
  audio: "Audio",
  video: "Vidéo",
  code: "Code",
  unknown: "Fichier",
};

export type ArtifactAccess = "private" | "team" | "public";
export type ArtifactProcessingState = "processing" | "ready" | "failed" | "unsupported";

export const PROCESSING_LABELS: Record<ArtifactProcessingState, string> = {
  processing: "Traitement en cours",
  ready: "Prêt",
  failed: "Échec du traitement",
  unsupported: "Type non supporté",
};

export interface ArtifactVersion {
  id: string;
  label: string;
  author?: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface ArtifactData {
  id: string;
  name: string;
  type: ArtifactType;
  /** Taille en octets. */
  sizeBytes: number;
  /** Auteur. */
  author?: string;
  /** Date de création. */
  createdAt: string;
  /** Accessibilité. */
  access: ArtifactAccess;
  /** État de traitement. */
  processingState: ArtifactProcessingState;
  /** Progression (si processing). */
  processingProgress?: number;
  /** Erreur (si failed). */
  processingError?: string;
  /** URL de prévisualisation / téléchargement. */
  previewUrl?: string;
  downloadUrl?: string;
  /** Historique de versions. */
  versions?: ArtifactVersion[];
  /** Métadonnées libres. */
  meta?: Record<string, string>;
  /** Pages (PDF / présentation / spreadsheet). */
  pageCount?: number;
}

export interface ArtifactsViewData {
  title: string;
  /** Artefact actif (viewed). */
  activeArtifact: ArtifactData | null;
  /** Liste des artefacts (pour la navigation). */
  artifacts: ArtifactData[];
}

export interface ArtifactsViewProps {
  data: ArtifactsViewData;
  onSelectArtifact: (id: string) => void;
  onDownload?: (artifactId: string) => void;
  onRestoreVersion?: (artifactId: string, versionId: string) => void;
  /** Appelé quand on change le viewer (page, zoom). */
  onViewerAction?: (action: "prev" | "next" | "zoom-in" | "zoom-out" | "rotate") => void;
  /** Contenu du viewer (fourni par le parent, ex. un <iframe> PDF). */
  viewerContent?: (artifact: ArtifactData) => React.ReactNode;
  /** Est le panneau latéral affiché. */
  showMetadataPanel?: boolean;
  /** Appelé pour changer l'accessibilité. */
  onAccessChange?: (artifactId: string, access: ArtifactAccess) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Utilitaires formats                                                */
/* ------------------------------------------------------------------ */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} Ko`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} Mo`;
  return `${(mb / 1024).toFixed(1)} Go`;
}

export function FileSizeLabel({
  bytes,
  className,
}: {
  bytes: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums text-muted-foreground", className)}>
      {formatFileSize(bytes)}
    </span>
  );
}

export function ArtifactTypeIcon({
  type,
  size = "sm",
  className,
}: {
  type: ArtifactType;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <AppIcon
      name={ARTIFACT_TYPE_ICONS[type]}
      size={size}
      aria-hidden
      className={className}
    />
  );
}

export function ArtifactAccessBadge({
  access,
  className,
}: {
  access: ArtifactAccess;
  className?: string;
}) {
  const cfg: Record<ArtifactAccess, { label: string; variant: "default" | "secondary" | "outline" }> = {
    private: { label: "Privé", variant: "outline" },
    team: { label: "Équipe", variant: "secondary" },
    public: { label: "Public", variant: "default" },
  };
  const c = cfg[access];
  return (
    <Badge variant={c.variant} className={cn("text-[10px]", className)}>
      {c.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* ArtifactProcessingStatus                                           */
/* ------------------------------------------------------------------ */

export interface ArtifactProcessingStatusProps {
  state: ArtifactProcessingState;
  progress?: number;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function ArtifactProcessingStatus({
  state,
  progress,
  error,
  onRetry,
  className,
}: ArtifactProcessingStatusProps) {
  if (state === "ready") return null;

  if (state === "processing") {
    return (
      <div
        data-slot="artifact-processing-status"
        data-state={state}
        className={cn(
          "flex flex-col gap-2 rounded-lg border bg-muted/20 p-4",
          className
        )}
        role="status"
      >
        <div className="flex items-center gap-2">
          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          <span className="text-sm font-medium">{PROCESSING_LABELS.processing}</span>
          {progress !== undefined && (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        {progress !== undefined && (
          <Progress value={progress} className="h-1.5" />
        )}
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div
        data-slot="artifact-processing-status"
        data-state={state}
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4",
          className
        )}
        role="alert"
      >
        <div className="flex items-center gap-2">
          <AppIcon name="error" size="sm" tone="danger" aria-hidden />
          <span className="text-sm font-medium text-destructive">
            {PROCESSING_LABELS.failed}
          </span>
        </div>
        {error && <p className="text-xs text-destructive/80">{error}</p>}
        {onRetry && (
          <Button variant="outline" size="sm" className="h-7 w-fit text-xs" onClick={onRetry}>
            <AppIcon name="retry" size="xs" aria-hidden />
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  /* unsupported */
  return (
    <div
      data-slot="artifact-processing-status"
      data-state={state}
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-muted/20 p-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AppIcon name="warning" size="sm" tone="warning" aria-hidden />
        <span className="text-sm font-medium">{PROCESSING_LABELS.unsupported}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Ce format n'est pas pris en charge par la prévisualisation.
        Utilisez le téléchargement pour consulter l'artefact.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PreviewErrorState / UnsupportedPreviewState                        */
/* ------------------------------------------------------------------ */

export function PreviewErrorState({
  message,
  onRetry,
  onDownload,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  onDownload?: () => void;
  className?: string;
}) {
  return (
    <div
      data-slot="preview-error-state"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center",
        className
      )}
      role="alert"
    >
      <AppIcon name="error" size="lg" tone="danger" aria-hidden />
      <div>
        <p className="text-sm font-medium text-destructive">
          Impossible d'afficher la prévisualisation
        </p>
        {message && <p className="mt-1 text-xs text-muted-foreground">{message}</p>}
      </div>
      <div className="flex items-center gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRetry}>
            <AppIcon name="retry" size="xs" aria-hidden />
            Réessayer
          </Button>
        )}
        {onDownload && (
          <Button size="sm" className="h-7 text-xs" onClick={onDownload}>
            <AppIcon name="open" size="xs" aria-hidden />
            Télécharger
          </Button>
        )}
      </div>
    </div>
  );
}

export function UnsupportedPreviewState({
  typeName,
  onDownload,
  className,
}: {
  typeName: string;
  onDownload?: () => void;
  className?: string;
}) {
  return (
    <div
      data-slot="unsupported-preview-state"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center",
        className
      )}
    >
      <AppIcon name="file" size="lg" tone="muted" aria-hidden />
      <div>
        <p className="text-sm font-medium">
          Prévisualisation {typeName} non disponible
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ce format n'est pas rendu dans l'aperçu. Téléchargez le fichier pour
          le consulter.
        </p>
      </div>
      {onDownload && (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onDownload}>
          <AppIcon name="open" size="xs" aria-hidden />
          Télécharger le {typeName.toLowerCase()}
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DownloadButton                                                     */
/* ------------------------------------------------------------------ */

export interface DownloadButtonProps {
  onDownload: () => void;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

export function DownloadButton({
  onDownload,
  label = "Télécharger",
  variant = "outline",
  className,
}: DownloadButtonProps) {
  return (
    <Button
      variant={variant}
      size="sm"
      className={cn("gap-1.5", className)}
      onClick={onDownload}
    >
      <AppIcon name="open" size="xs" aria-hidden />
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* ArtifactVersionList                                                */
/* ------------------------------------------------------------------ */

export interface ArtifactVersionListProps {
  versions: ArtifactVersion[];
  onRestore?: (versionId: string) => void;
  className?: string;
}

export function ArtifactVersionList({
  versions,
  onRestore,
  className,
}: ArtifactVersionListProps) {
  if (versions.length === 0) return null;
  return (
    <div
      data-slot="artifact-version-list"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <p className="text-xs font-medium text-muted-foreground">
        Historique des versions
      </p>
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
              {v.author ? `${v.author} · ` : ""}
              {new Date(v.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric", month: "short",
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
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px]"
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
/* ArtifactMetadataPanel                                              */
/* ------------------------------------------------------------------ */

export interface ArtifactMetadataPanelProps {
  artifact: ArtifactData;
  onDownload?: () => void;
  onRestoreVersion?: (versionId: string) => void;
  onAccessChange?: (access: ArtifactAccess) => void;
  className?: string;
}

export function ArtifactMetadataPanel({
  artifact,
  onDownload,
  onRestoreVersion,
  onAccessChange,
  className,
}: ArtifactMetadataPanelProps) {
  const metaEntries = Object.entries(artifact.meta ?? {});
  return (
    <div
      data-slot="artifact-metadata-panel"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/30">
          <ArtifactTypeIcon type={artifact.type} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{artifact.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ArtifactAccessBadge access={artifact.access} />
            <Badge variant="outline" className="text-[10px]">
              {ARTIFACT_TYPE_LABELS[artifact.type]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Accessibilité */}
      {onAccessChange && (
        <div className="flex items-center justify-between rounded-md border p-2.5">
          <span className="text-xs font-medium text-muted-foreground">
            Accessibilité
          </span>
          <div className="flex gap-1">
            {(["private", "team", "public"] as ArtifactAccess[]).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={artifact.access === a}
                onClick={() => onAccessChange(a)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                  artifact.access === a
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {a === "private" ? "Privé" : a === "team" ? "Équipe" : "Public"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Props */}
      <dl className="flex flex-col gap-1.5 text-xs">
        {artifact.author && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Auteur</dt>
            <dd className="font-medium">{artifact.author}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Taille</dt>
          <dd className="font-medium tabular-nums">
            {formatFileSize(artifact.sizeBytes)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Créé le</dt>
          <dd className="font-medium tabular-nums">
            {new Date(artifact.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </dd>
        </div>
        {artifact.pageCount !== undefined && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pages</dt>
            <dd className="font-medium tabular-nums">{artifact.pageCount}</dd>
          </div>
        )}
        {metaEntries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="truncate font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Versions */}
      {artifact.versions && artifact.versions.length > 0 && (
        <ArtifactVersionList
          versions={artifact.versions}
          onRestore={onRestoreVersion}
        />
      )}

      {/* Téléchargement */}
      {onDownload && (
        <DownloadButton onDownload={onDownload} className="w-full" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Viewers par type (conteneurs muets)                               */
/* ------------------------------------------------------------------ */

export interface ArtifactViewerProps {
  artifact: ArtifactData;
  /** Rendu fourni par le parent (ex. iframe, canvas). */
  children?: React.ReactNode;
  className?: string;
}

function viewerEmpty(_type: ArtifactType, label: string) {
  return (
    <UnsupportedPreviewState typeName={label} />
  );
}

export function PdfArtifactViewer({
  artifact,
  children,
  className,
}: ArtifactViewerProps) {
  return (
    <div
      data-slot="pdf-artifact-viewer"
      data-artifact-id={artifact.id}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      {artifact.previewUrl ? children : viewerEmpty("pdf", "PDF")}
    </div>
  );
}

export function DocumentArtifactViewer({
  artifact,
  children,
  className,
}: ArtifactViewerProps) {
  return (
    <div
      data-slot="document-artifact-viewer"
      data-artifact-id={artifact.id}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      {artifact.previewUrl ? children : viewerEmpty("document", "Document")}
    </div>
  );
}

export function PresentationArtifactViewer({
  artifact,
  children,
  className,
}: ArtifactViewerProps) {
  return (
    <div
      data-slot="presentation-artifact-viewer"
      data-artifact-id={artifact.id}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      {artifact.previewUrl ? children : viewerEmpty("presentation", "Présentation")}
    </div>
  );
}

export function SpreadsheetArtifactViewer({
  artifact,
  children,
  className,
}: ArtifactViewerProps) {
  return (
    <div
      data-slot="spreadsheet-artifact-viewer"
      data-artifact-id={artifact.id}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      {artifact.previewUrl ? children : viewerEmpty("spreadsheet", "Tableur")}
    </div>
  );
}

export function ImageArtifactViewer({
  artifact,
  children,
  className,
}: ArtifactViewerProps) {
  return (
    <div
      data-slot="image-artifact-viewer"
      data-artifact-id={artifact.id}
      className={cn(
        "flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/20 p-4",
        className
      )}
    >
      {artifact.previewUrl ? (
        children ?? (
          <img
            src={artifact.previewUrl}
            alt={artifact.name}
            className="max-h-full max-w-full rounded-md border object-contain"
          />
        )
      ) : (
        viewerEmpty("image", "Image")
      )}
    </div>
  );
}

export function AudioArtifactViewer({
  artifact,
  children,
  className,
}: ArtifactViewerProps) {
  return (
    <div
      data-slot="audio-artifact-viewer"
      data-artifact-id={artifact.id}
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6",
        className
      )}
    >
      <div className="flex size-20 items-center justify-center rounded-full border bg-muted/20">
        <AppIcon name="audio" size="lg" tone="muted" aria-hidden />
      </div>
      <p className="text-sm font-medium">{artifact.name}</p>
      {children ?? (
        <p className="text-xs text-muted-foreground">
          Prévisualisation audio non disponible
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ArtifactViewerShell                                                */
/* ------------------------------------------------------------------ */

export interface ArtifactViewerShellProps {
  artifact: ArtifactData | null;
  /** Rendu du viewer (fourni par le parent). */
  children?: React.ReactNode;
  onDownload?: () => void;
  onRestoreVersion?: (versionId: string) => void;
  onAccessChange?: (access: ArtifactAccess) => void;
  /** Toolbar : actions de viewer (page, zoom). */
  toolbarActions?: React.ReactNode;
  /** Affiche le panneau de métadonnées. */
  showMetadata?: boolean;
  /** Est le panneau latéral ouvert. */
  metadataOpen?: boolean;
  onToggleMetadata?: () => void;
  className?: string;
}

export function ArtifactViewerShell({
  artifact,
  children,
  onDownload,
  onRestoreVersion,
  onAccessChange,
  toolbarActions,
  showMetadata = true,
  metadataOpen,
  onToggleMetadata,
  className,
}: ArtifactViewerShellProps) {
  if (!artifact) {
    return (
      <div
        data-slot="artifact-viewer-shell"
        data-empty
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center",
          className
        )}
      >
        <AppIcon name="file" size="lg" tone="muted" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aucun artefact sélectionné
        </p>
      </div>
    );
  }

  return (
    <div
      data-slot="artifact-viewer-shell"
      data-artifact-id={artifact.id}
      data-type={artifact.type}
      className={cn("flex min-h-0 flex-col gap-0", className)}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ArtifactTypeIcon type={artifact.type} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{artifact.name}</p>
            <div className="flex items-center gap-1.5">
              <FileSizeLabel bytes={artifact.sizeBytes} className="text-[10px]" />
              <ArtifactAccessBadge access={artifact.access} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {toolbarActions}
          {showMetadata && onToggleMetadata && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onToggleMetadata}
              aria-pressed={metadataOpen}
            >
              <AppIcon name="file-doc" size="xs" aria-hidden />
              Détails
            </Button>
          )}
          {onDownload && <DownloadButton onDownload={onDownload} label="Télécharger" />}
        </div>
      </div>

      {/* Corps : viewer + panneau */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          {children ?? (
            <div className="flex flex-1 items-center justify-center p-4">
              <UnsupportedPreviewState typeName={ARTIFACT_TYPE_LABELS[artifact.type]} />
            </div>
          )}
        </div>

        {showMetadata && metadataOpen !== false && (
          <aside className="w-full shrink-0 border-t p-4 lg:w-72 lg:border-l lg:border-t-0">
            <ArtifactMetadataPanel
              artifact={artifact}
              onDownload={onDownload}
              onRestoreVersion={onRestoreVersion}
              onAccessChange={onAccessChange}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function ArtifactsView({
  data,
  onDownload,
  onRestoreVersion,
  onViewerAction,
  viewerContent,
  showMetadataPanel = true,
  onAccessChange,
  className,
}: ArtifactsViewProps) {
  const [metaOpen, setMetaOpen] = React.useState(true);
  const artifact = data.activeArtifact;

  const viewerEl = artifact
    ? (() => {
        switch (artifact.type) {
          case "pdf":
            return (
              <PdfArtifactViewer artifact={artifact}>
                {viewerContent?.(artifact)}
              </PdfArtifactViewer>
            );
          case "document":
            return (
              <DocumentArtifactViewer artifact={artifact}>
                {viewerContent?.(artifact)}
              </DocumentArtifactViewer>
            );
          case "presentation":
            return (
              <PresentationArtifactViewer artifact={artifact}>
                {viewerContent?.(artifact)}
              </PresentationArtifactViewer>
            );
          case "spreadsheet":
            return (
              <SpreadsheetArtifactViewer artifact={artifact}>
                {viewerContent?.(artifact)}
              </SpreadsheetArtifactViewer>
            );
          case "image":
            return (
              <ImageArtifactViewer artifact={artifact}>
                {viewerContent?.(artifact)}
              </ImageArtifactViewer>
            );
          case "audio":
            return (
              <AudioArtifactViewer artifact={artifact}>
                {viewerContent?.(artifact)}
              </AudioArtifactViewer>
            );
          default:
            return (
              <div className="flex flex-1 items-center justify-center p-4">
                <UnsupportedPreviewState
                  typeName={ARTIFACT_TYPE_LABELS[artifact.type]}
                />
              </div>
            );
        }
      })()
    : null;

  return (
    <div
      data-slot="artifacts-view"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <ArtifactViewerShell
        artifact={artifact}
        showMetadata={showMetadataPanel}
        metadataOpen={metaOpen}
        onToggleMetadata={() => setMetaOpen((o) => !o)}
        onDownload={() => artifact && onDownload?.(artifact.id)}
        onRestoreVersion={(v) => artifact && onRestoreVersion?.(artifact.id, v)}
        onAccessChange={(a) => artifact && onAccessChange?.(artifact.id, a)}
        toolbarActions={
          onViewerAction && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7"
                onClick={() => onViewerAction("prev")}
                aria-label="Précédent"
              >
                <AppIcon name="retry" size="xs" className="rotate-180" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7"
                onClick={() => onViewerAction("next")}
                aria-label="Suivant"
              >
                <AppIcon name="retry" size="xs" aria-hidden />
              </Button>
            </div>
          )
        }
      >
        {/* État de traitement (au-dessus du viewer) */}
        {artifact && artifact.processingState !== "ready" && (
          <div className="px-4 pt-4">
            <ArtifactProcessingStatus
              state={artifact.processingState}
              progress={artifact.processingProgress}
              error={artifact.processingError}
              onRetry={() => onViewerAction?.("next")}
            />
          </div>
        )}
        {viewerEl}
      </ArtifactViewerShell>
    </div>
  );
}
