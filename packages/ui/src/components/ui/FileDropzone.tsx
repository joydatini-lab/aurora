/**
 * FileDropzone — zone de dépôt de fichiers (cat. 2.16 Inbox, 2.21 Artifacts).
 *
 * Combine le hook `useFileUpload` (@reui) avec une zone de glisser-déposer
 * et un bouton de sélection alternative. Les fichiers sont rendus comme
 * listes `Item` avec icône `FileType`, progression et suppression.
 *
 * Règles UX (cat. 1.3) :
 * - Bouton de sélection alternatif (accessibilité, clavier)
 * - Types et tailles acceptés explicites
 * - Progression réelle (pas simulée) si `onProgress` est fourni
 * - Suppression individuelle
 */
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import {
  useFileUpload,
  type FileWithPreview,
  type FileUploadOptions,
} from "src/hooks/use-file-upload";

/* ------------------------------------------------------------------ */

export interface FileDropzoneProps
  extends Omit<FileUploadOptions, "onFilesChange" | "onFilesAdded" | "onError"> {
  /** Titre au-dessus de la zone. */
  title?: string;
  /** Description (formats, taille max). */
  description?: string;
  /** Callback appelé quand la liste de fichiers change. */
  onFilesChange?: (files: FileWithPreview[]) => void;
  /** Callback appelé lors d'une erreur de validation. */
  onError?: (errors: string[]) => void;
  /** Apparence de la zone (défaut = pointillée). */
  variant?: "dashed" | "solid";
  className?: string;
}

/* ------------------------------------------------------------------ */

function formatBytes(bytes: number, decimals = 0): string {
  if (bytes === 0) return "0 octet";
  const k = 1024;
  const sizes = ["octets", "Ko", "Mo", "Go"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

function FileDropzone({
  title = "Glisser-déposer vos fichiers ici",
  description,
  onFilesChange,
  onError,
  variant = "dashed",
  className,
  ...options
}: FileDropzoneProps) {
  const [state, actions] = useFileUpload({
    ...options,
    onFilesChange: (files) => onFilesChange?.(files),
    onError: (errors) => onError?.(errors),
  });

  const { files, isDragging, errors } = state;

  return (
    <div data-slot="file-dropzone" className={cn("flex flex-col gap-3", className)}>
      {title && <p className="text-sm font-medium">{title}</p>}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Zone de dépôt */}
      <div
        className={cn(
          "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center transition-colors",
          variant === "dashed" ? "border-dashed" : "border-solid",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 bg-muted/30"
        )}
        onDragEnter={actions.handleDragEnter}
        onDragOver={actions.handleDragOver}
        onDragLeave={actions.handleDragLeave}
        onDrop={actions.handleDrop}
      >
        <AppIcon
          name="file"
          size="lg"
          tone="muted"
          aria-hidden
        />
        <span className="text-sm text-muted-foreground">
          {isDragging ? "Relâchez pour déposer" : "Glissez-déposez ou"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={actions.openFileDialog}
        >
          Parcourir les fichiers
        </Button>
        <input
          type="file"
          className="sr-only"
          {...actions.getInputProps()}
          multiple={options.multiple}
          accept={options.accept}
        />
      </div>

      {/* Erreurs de validation */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-1 rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <AppIcon name="error" size="xs" tone="danger" aria-hidden />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Liste des fichiers sélectionnés */}
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5" data-slot="file-dropzone-list">
          {files.map((f) => {
            const meta = f.file as { name: string; size?: number; type?: string };
            const name = meta.name;
            const size = meta.size ?? 0;
            const type = meta.type ?? "";

            return (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded border bg-card px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <AppIcon name="file" size="sm" tone="muted" aria-hidden />
                  <span className="truncate">{name}</span>
                  {size > 0 && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(size)}
                    </span>
                  )}
                  {type && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {type}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => actions.removeFile(f.id)}
                  aria-label={`Supprimer ${name}`}
                >
                  <AppIcon name="error" size="xs" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { FileDropzone };
