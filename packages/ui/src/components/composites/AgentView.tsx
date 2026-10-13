/**
 * AgentView — vue de conversation avec l'Agent IA (cat. 2.14, 4.14).
 *
 * Étape 2 (muet) : reçoit `AgentViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.14, aligned assistant-ui Message model) :
 * - `ConversationHeader` (titre + statut + menu)
 * - `MessageList` (liste de messages, scrollable)
 *   - `UserMessageBubble` (align right, primary bg)
 *   - `AssistantMessageBubble` (align left, card bg, blocks `AgentBlock[]`)
 *   - `StreamingIndicator` (indicateur de streaming en cours)
 *   - `MessageActionBar` (actions par message : copier, rejouer, citer)
 *   - `CitationList` (citations liées à un message)
 *   - `ToolRunCard` (exécution d'outil : statut, entrée, sortie)
 * - `AgentComposer` (zone de saisie + pièces jointes + modèle)
 * - `AttachmentTray` (pièces jointes en attente)
 * - `ModelPickerModal` (choix du modèle)
 * - `PermissionApprovalDialog` (dialogue d'approbation pour outils à risque)
 *
 * Le renderer des blocs (`AgentBlock`) est fourni par `AgentResponseRenderer`
 * (déjà existant en UI). Ce composant est le conteneur de la conversation.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type MessageRole = "user" | "assistant" | "system";

export type ToolRunStatus = "pending" | "running" | "done" | "error";

export interface ToolRunData {
  id: string;
  name: string;
  status: ToolRunStatus;
  /** Résumé de l'entrée. */
  inputSummary?: string;
  /** Résumé de la sortie (si terminé). */
  outputSummary?: string;
  /** Erreur (si échec). */
  error?: string;
}

export interface MessageCitation {
  id: string;
  label: string;
  source?: string;
  url?: string;
}

export interface AgentMessage {
  id: string;
  role: MessageRole;
  /** Texte principal (pour user/system) ou premier bloc (assistant). */
  content: string;
  /** Blocs de réponse Agent (assistant uniquement). */
  blocks?: import("src/components/ui/AgentResponseRenderer").AgentBlock[];
  /** Outils exécutés dans ce message. */
  toolRuns?: ToolRunData[];
  /** Citations. */
  citations?: MessageCitation[];
  /** Statut du message (assistant-ui MessageStatus). */
  status?: "running" | "complete" | "incomplete" | "requires-action";
  /** Est en cours de streaming. */
  isStreaming?: boolean;
  /** Horodatage. */
  timestamp?: string;
  /** Pièces jointes. */
  attachments?: { id: string; name: string; type: string }[];
}

export interface AgentModel {
  id: string;
  name: string;
  /** Provider. */
  provider?: string;
  /** Est le modèle par défaut. */
  isDefault?: boolean;
  /** Description courte. */
  description?: string;
}

export interface AgentViewData {
  /** Titre de la conversation. */
  title: string;
  /** Statut global (idle, thinking, streaming, requires-action, error). */
  status: "idle" | "thinking" | "streaming" | "requires-action" | "error";
  messages: AgentMessage[];
  /** Messages qui nécessitent une approbation d'outil. */
  pendingApprovals?: ToolRunData[];
  /** Modèles disponibles. */
  models: AgentModel[];
  /** Modèle courant. */
  activeModelId: string;
  /** Pièces jointes en attente (composer). */
  pendingAttachments?: { id: string; name: string; type: string; size?: number }[];
  /** Valeur du champ de saisie. */
  draft: string;
  /** Libellé d'erreur (si status = error). */
  errorLabel?: string;
}

export interface AgentViewProps {
  data: AgentViewData;
  onSend: (message: string, attachments?: string[]) => void;
  onStopStreaming?: () => void;
  onModelChange: (modelId: string) => void;
  onApproveTool?: (toolRunId: string) => void;
  onRejectTool?: (toolRunId: string) => void;
  onCopyMessage?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  /** Conteneur de la liste de messages (scroll). */
  onScrollToBottom?: () => void;
  /** Appelé pour prévisualiser une citation. */
  onOpenCitation?: (citation: MessageCitation) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* ConversationHeader                                                 */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<AgentViewData["status"], string> = {
  idle: "Prêt",
  thinking: "Réflexion…",
  streaming: "En cours",
  "requires-action": "Action requise",
  error: "Erreur",
};

export interface ConversationHeaderProps {
  title: string;
  status: AgentViewData["status"];
  modelName: string;
  onOpenMenu?: () => void;
  className?: string;
}

export function ConversationHeader({
  title,
  status,
  modelName,
  onOpenMenu,
  className,
}: ConversationHeaderProps) {
  return (
    <div
      data-slot="conversation-header"
      className={cn(
        "flex items-center justify-between gap-3 border-b px-4 py-3",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AppIcon name="insight" size="sm" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={
                status === "error"
                  ? "destructive"
                  : status === "idle"
                    ? "outline"
                    : "secondary"
              }
              className="text-[10px]"
            >
              {STATUS_LABEL[status]}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {modelName}
            </span>
          </div>
        </div>
      </div>
      {onOpenMenu && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-7"
          onClick={onOpenMenu}
          aria-label="Menu de la conversation"
        >
          <AppIcon name="open" size="xs" aria-hidden />
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UserMessageBubble                                                  */
/* ------------------------------------------------------------------ */

export interface UserMessageBubbleProps {
  message: AgentMessage;
  className?: string;
}

export function UserMessageBubble({
  message,
  className,
}: UserMessageBubbleProps) {
  return (
    <div
      data-slot="user-message-bubble"
      className={cn(
        "flex flex-col items-end gap-1",
        className
      )}
    >
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
        {message.content}
      </div>
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1">
          {message.attachments.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
            >
              <AppIcon
                name={a.type.includes("image") ? "image" : "file"}
                size="xs"
                aria-hidden
              />
              {a.name}
            </span>
          ))}
        </div>
      )}
      {message.timestamp && (
        <span className="text-[10px] text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ToolRunCard                                                        */
/* ------------------------------------------------------------------ */

const TOOL_STATUS: Record<
  ToolRunStatus,
  { label: string; icon: IconKey; tone: "default" | "muted" | "success" | "warning" | "danger" }
> = {
  pending: { label: "En attente", icon: "timer", tone: "muted" },
  running: { label: "En cours", icon: "tool", tone: "default" },
  done: { label: "Terminé", icon: "success", tone: "success" },
  error: { label: "Erreur", icon: "error", tone: "danger" },
};

export interface ToolRunCardProps {
  tool: ToolRunData;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

export function ToolRunCard({
  tool,
  onApprove,
  onReject,
  className,
}: ToolRunCardProps) {
  const cfg = TOOL_STATUS[tool.status];
  return (
    <div
      data-slot="tool-run-card"
      data-status={tool.status}
      className={cn(
        "flex flex-col gap-1.5 rounded-md border bg-muted/20 p-2.5 text-xs",
        tool.status === "error" && "border-destructive/30 bg-destructive/5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <AppIcon
            name={cfg.icon}
            size="xs"
            tone={cfg.tone}
            aria-hidden
          />
          <span className="font-medium">{tool.name}</span>
          <Badge variant="outline" className="text-[10px]">
            {cfg.label}
          </Badge>
        </div>
        {tool.status === "pending" && onApprove && onReject && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              onClick={onReject}
            >
              Refuser
            </Button>
            <Button
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              onClick={onApprove}
            >
              Autoriser
            </Button>
          </div>
        )}
      </div>
      {tool.inputSummary && (
        <p className="text-muted-foreground">
          <span className="font-medium">Entrée :</span> {tool.inputSummary}
        </p>
      )}
      {tool.outputSummary && (
        <p className="text-muted-foreground">
          <span className="font-medium">Sortie :</span> {tool.outputSummary}
        </p>
      )}
      {tool.error && (
        <p className="text-destructive">{tool.error}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CitationList                                                       */
/* ------------------------------------------------------------------ */

export interface CitationListProps {
  citations: MessageCitation[];
  onOpen?: (c: MessageCitation) => void;
  className?: string;
}

export function CitationList({
  citations,
  onOpen,
  className,
}: CitationListProps) {
  if (citations.length === 0) return null;
  return (
    <div
      data-slot="citation-list"
      className={cn("flex flex-col gap-1", className)}
    >
      <p className="text-[10px] font-medium text-muted-foreground">
        Sources
      </p>
      {citations.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onOpen?.(c)}
          className={cn(
            "flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-left text-xs transition-colors",
            onOpen && "hover:bg-muted cursor-pointer"
          )}
        >
          <AppIcon name="citation" size="xs" tone="muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{c.label}</span>
          {c.source && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {c.source}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StreamingIndicator                                                 */
/* ------------------------------------------------------------------ */

export interface StreamingIndicatorProps {
  label?: string;
  className?: string;
}

export function StreamingIndicator({
  label = "Génère une réponse…",
  className,
}: StreamingIndicatorProps) {
  return (
    <div
      data-slot="streaming-indicator"
      className={cn(
        "flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground",
        className
      )}
      role="status"
    >
      <div className="flex gap-0.5">
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:120ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
      </div>
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AssistantMessageBubble                                             */
/* ------------------------------------------------------------------ */

export interface AssistantMessageBubbleProps {
  message: AgentMessage;
  onCopy?: (content: string) => void;
  onRegenerate?: () => void;
  onOpenCitation?: (c: MessageCitation) => void;
  onApproveTool?: (id: string) => void;
  onRejectTool?: (id: string) => void;
  className?: string;
}

export function AssistantMessageBubble({
  message,
  onCopy,
  onRegenerate,
  onOpenCitation,
  onApproveTool,
  onRejectTool,
  className,
}: AssistantMessageBubbleProps) {
  return (
    <div
      data-slot="assistant-message-bubble"
      className={cn(
        "flex flex-col gap-2",
        className
      )}
    >
      {/* Blocs de réponse (si fournis par le conteneur via `blocks`) */}
      {message.blocks && message.blocks.length > 0 ? (
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm border bg-card p-3.5 text-sm">
          {/* Le parent rend les blocs via AgentResponseRenderer */}
          <div data-slot="agent-blocks-container">{message.content}</div>
          {message.toolRuns && message.toolRuns.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 border-t pt-3">
              {message.toolRuns.map((t) => (
                <ToolRunCard
                  key={t.id}
                  tool={t}
                  onApprove={
                    t.status === "pending" ? () => onApproveTool?.(t.id) : undefined
                  }
                  onReject={
                    t.status === "pending" ? () => onRejectTool?.(t.id) : undefined
                  }
                />
              ))}
            </div>
          )}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <CitationList
                citations={message.citations}
                onOpen={onOpenCitation}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2 text-sm">
          {message.content}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pl-1">
        {onCopy && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            onClick={() => onCopy(message.content)}
          >
            <AppIcon name="copy" size="xs" aria-hidden />
            Copier
          </Button>
        )}
        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            onClick={onRegenerate}
          >
            <AppIcon name="retry" size="xs" aria-hidden />
            Régénérer
          </Button>
        )}
        {message.timestamp && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MessageList                                                        */
/* ------------------------------------------------------------------ */

export interface MessageListProps {
  messages: AgentMessage[];
  status: AgentViewData["status"];
  onCopy?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onOpenCitation?: (c: MessageCitation) => void;
  onApproveTool?: (id: string) => void;
  onRejectTool?: (id: string) => void;
  onScrollToBottom?: () => void;
  className?: string;
}

export function MessageList({
  messages,
  status,
  onCopy,
  onRegenerate,
  onOpenCitation,
  onApproveTool,
  onRejectTool,
  onScrollToBottom,
  className,
}: MessageListProps) {
  return (
    <div
      data-slot="message-list"
      className={cn(
        "flex flex-1 flex-col gap-3 overflow-y-auto p-4",
        className
      )}
      onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
          onScrollToBottom?.();
        }
      }}
      role="log"
      aria-live="polite"
    >
      {messages.map((m) =>
        m.role === "user" ? (
          <UserMessageBubble key={m.id} message={m} />
        ) : m.role === "assistant" ? (
          <AssistantMessageBubble
            key={m.id}
            message={m}
            onCopy={(c) => onCopy?.(m.id, c)}
            onRegenerate={() => onRegenerate?.(m.id)}
            onOpenCitation={onOpenCitation}
            onApproveTool={onApproveTool}
            onRejectTool={onRejectTool}
          />
        ) : (
          <div
            key={m.id}
            className="mx-auto max-w-[80%] rounded-md bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground"
          >
            {m.content}
          </div>
        )
      )}

      {status === "thinking" && <StreamingIndicator label="Réflexion…" />}
      {status === "streaming" && <StreamingIndicator />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AttachmentTray                                                     */
/* ------------------------------------------------------------------ */

export interface AttachmentTrayProps {
  attachments: { id: string; name: string; type: string; size?: number }[];
  onRemove: (id: string) => void;
  onOpenFilePicker?: () => void;
  className?: string;
}

export function AttachmentTray({
  attachments,
  onRemove,
  onOpenFilePicker,
  className,
}: AttachmentTrayProps) {
  if (attachments.length === 0 && !onOpenFilePicker) return null;
  return (
    <div
      data-slot="attachment-tray"
      className={cn(
        "flex items-center gap-1.5 border-t px-3 py-2",
        className
      )}
    >
      {attachments.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
        >
          <AppIcon
            name={a.type.includes("image") ? "image" : "file"}
            size="xs"
            tone="muted"
            aria-hidden
          />
          <span className="max-w-24 truncate">{a.name}</span>
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            aria-label={`Retirer ${a.name}`}
            className="text-muted-foreground/50 hover:text-foreground"
          >
            <AppIcon name="retry" size="xs" className="rotate-45" aria-hidden />
          </button>
        </div>
      ))}
      {onOpenFilePicker && (
        <button
          type="button"
          onClick={onOpenFilePicker}
          className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <AppIcon name="file" size="xs" aria-hidden />
          Joindre
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ModelPickerModal                                                   */
/* ------------------------------------------------------------------ */

export interface ModelPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: AgentModel[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function ModelPickerModal({
  open,
  onOpenChange,
  models,
  activeId,
  onSelect,
  className,
}: ModelPickerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-sm", className)}>
        <DialogHeader>
          <DialogTitle>Choisir un modèle</DialogTitle>
          <DialogDescription>
            Sélectionner le modèle IA pour cette conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onSelect(m.id);
                onOpenChange(false);
              }}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                activeId === m.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              )}
            >
              <AppIcon name="tool" size="sm" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{m.name}</p>
                  {m.isDefault && (
                    <Badge variant="outline" className="text-[10px]">
                      Par défaut
                    </Badge>
                  )}
                </div>
                {m.provider && (
                  <p className="text-xs text-muted-foreground">{m.provider}</p>
                )}
                {m.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* PermissionApprovalDialog                                          */
/* ------------------------------------------------------------------ */

export interface PermissionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: ToolRunData | null;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

export function PermissionApprovalDialog({
  open,
  onOpenChange,
  tool,
  onApprove,
  onReject,
  className,
}: PermissionApprovalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <AppIcon name="approval" size="md" tone="warning" aria-hidden />
              Autoriser l'outil ?
            </span>
          </DialogTitle>
          <DialogDescription>
            {tool
              ? `L'agent souhaite exécuter « ${tool.name} ».`
              : "L'agent souhaite exécuter un outil."}
            {tool?.inputSummary && (
              <p className="mt-2 rounded-md bg-muted p-2 text-xs">
                <span className="font-medium">Entrée :</span> {tool.inputSummary}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onReject}>
            Refuser
          </Button>
          <Button size="sm" onClick={onApprove}>
            Autoriser
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* AgentComposer                                                      */
/* ------------------------------------------------------------------ */

export interface AgentComposerProps {
  value: string;
  onSend: () => void;
  onStop?: () => void;
  isStreaming: boolean;
  /** Est le statut error → bouton "Réessayer". */
  isError?: boolean;
  attachments: { id: string; name: string; type: string; size?: number }[];
  onRemoveAttachment?: (id: string) => void;
  onOpenFilePicker?: () => void;
  modelLabel: string;
  onOpenModelPicker?: () => void;
  /** Placeholder du champ. */
  placeholder?: string;
  className?: string;
}

export function AgentComposer({
  value,
  onSend,
  onStop,
  isStreaming,
  isError,
  attachments,
  onRemoveAttachment,
  onOpenFilePicker,
  modelLabel,
  onOpenModelPicker,
  placeholder = "Poser une question…",
  className,
}: AgentComposerProps) {
  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div
      data-slot="agent-composer"
      className={cn("flex flex-col gap-2 border-t p-3", className)}
    >
      <AttachmentTray
        attachments={attachments}
        onRemove={(id) => onRemoveAttachment?.(id)}
        onOpenFilePicker={onOpenFilePicker}
      />

      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          placeholder={placeholder}
          rows={2}
          className="min-h-12 flex-1 resize-none rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Saisie du message"
        />
        <div className="flex flex-col gap-1.5">
          {onOpenModelPicker && (
            <button
              type="button"
              onClick={onOpenModelPicker}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted"
            >
              <AppIcon name="tool" size="xs" aria-hidden />
              <span className="max-w-20 truncate">{modelLabel}</span>
            </button>
          )}
          {isStreaming ? (
            <Button
              size="sm"
              className="h-9 w-9 p-0"
              onClick={onStop}
              aria-label="Arrêter"
            >
              <AppIcon name="error" size="sm" aria-hidden />
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-9 w-9 p-0"
              onClick={onSend}
              disabled={!canSend}
              aria-label={isError ? "Réessayer" : "Envoyer"}
            >
              <AppIcon name={isError ? "retry" : "open"} size="sm" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function AgentView({
  data,
  onSend,
  onStopStreaming,
  onModelChange,
  onApproveTool,
  onRejectTool,
  onCopyMessage,
  onRegenerate,
  onScrollToBottom,
  onOpenCitation,
  className,
}: AgentViewProps) {
  const [modelPickerOpen, setModelPickerOpen] = React.useState(false);
  const [approvalOpen, setApprovalOpen] = React.useState(false);
  const activeModel = data.models.find((m) => m.id === data.activeModelId);

  const pendingApproval = data.pendingApprovals?.[0] ?? null;

  const handleSend = () => {
    if (!data.draft.trim()) return;
    onSend(
      data.draft,
      data.pendingAttachments?.map((a) => a.id)
    );
  };

  return (
    <div
      data-slot="agent-view"
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        className
      )}
    >
      <ConversationHeader
        title={data.title}
        status={data.status}
        modelName={activeModel?.name ?? "—"}
        onOpenMenu={() => setModelPickerOpen(true)}
      />

      {data.status === "error" && data.errorLabel && (
        <div className="flex items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AppIcon name="error" size="xs" tone="danger" aria-hidden />
          <span className="flex-1">{data.errorLabel}</span>
        </div>
      )}

      <MessageList
        messages={data.messages}
        status={data.status}
        onCopy={(id, c) => onCopyMessage?.(id, c)}
        onRegenerate={onRegenerate}
        onOpenCitation={onOpenCitation}
        onApproveTool={(id) => {
          onApproveTool?.(id);
          setApprovalOpen(false);
        }}
        onRejectTool={(id) => {
          onRejectTool?.(id);
          setApprovalOpen(false);
        }}
        onScrollToBottom={onScrollToBottom}
      />

      <AgentComposer
        value={data.draft}
        onSend={handleSend}
        onStop={onStopStreaming}
        isStreaming={data.status === "streaming"}
        isError={data.status === "error"}
        attachments={data.pendingAttachments ?? []}
        modelLabel={activeModel?.name ?? "—"}
        onOpenModelPicker={() => setModelPickerOpen(true)}
      />

      <ModelPickerModal
        open={modelPickerOpen}
        onOpenChange={setModelPickerOpen}
        models={data.models}
        activeId={data.activeModelId}
        onSelect={onModelChange}
      />

      {pendingApproval && (
        <PermissionApprovalDialog
          open={approvalOpen || data.status === "requires-action"}
          onOpenChange={setApprovalOpen}
          tool={pendingApproval}
          onApprove={() => {
            onApproveTool?.(pendingApproval.id);
            setApprovalOpen(false);
          }}
          onReject={() => {
            onRejectTool?.(pendingApproval.id);
            setApprovalOpen(false);
          }}
        />
      )}
    </div>
  );
}
