/**
 * Message — bulle de conversation (chat Agent, cat. 2.15).
 *
 * Composé avec Frame/ReuiBadge : `align` distingue utilisateur (droite)
 * et assistant/utilisateur (gauche). Les pièces jointes et le code passent
 * par des sous-composants (`MessageAttachment`, `MessageCodeBlock`).
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";

/* ------------------------------------------------------------------ */

export type MessageVariant = "user" | "assistant" | "system";

export interface MessageProps
  extends React.ComponentProps<"div"> {
  /** Position de la bulle dans le fil de conversation. */
  variant?: MessageVariant;
  /** Titre optionnel (ex. nom du modèle pour l'assistant). */
  title?: string;
  /** Libellé du temps (ex. "14:32", "il y a 2 min"). */
  timestamp?: string;
  /** Pièces jointes (type + taille). */
  attachments?: { id: string; name: string; size?: string }[];
  /** Action de copie (affiche un bouton si fourni). */
  onCopy?: () => void;
}

/* ------------------------------------------------------------------ */

function MessageRoot({
  variant = "assistant",
  title,
  timestamp,
  attachments,
  onCopy,
  className,
  children,
  ...props
}: MessageProps) {
  const isUser = variant === "user";

  return (
    <div
      data-slot="message"
      data-variant={variant}
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
        className
      )}
      {...props}
    >
      {(title || timestamp) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {title && <span className="font-medium text-foreground">{title}</span>}
          {timestamp && <span>{timestamp}</span>}
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border bg-card text-card-foreground",
          variant === "system" && "bg-muted text-muted-foreground text-xs"
        )}
      >
        <div className="whitespace-pre-wrap">{children}</div>
      </div>

      {attachments && attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <MessageAttachment key={a.id} name={a.name} size={a.size} />
          ))}
        </div>
      )}

      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <AppIcon name="copy" size="xs" />
          Copier
        </button>
      )}
    </div>
  );
}

function MessageAttachment({ name, size }: { name: string; size?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded border bg-muted/50 px-2 py-1 text-xs">
      <AppIcon name="file" size="xs" tone="muted" />
      <span className="max-w-32 truncate">{name}</span>
      {size && <span className="text-muted-foreground">{size}</span>}
    </div>
  );
}

export const Message = MessageRoot;
export { MessageAttachment };
