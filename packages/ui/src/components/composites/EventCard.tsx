/**
 * EventCard — carte d'événement (cat. 2.3 Calendar, 2.2 Scheduling).
 *
 * Étape 2 (muet) : reçoit `EventCardData` + callbacks `onOpen`/`onEdit`/`onJoin`.
 * Affiche : titre, horaire, source/calendrier, participants, lieu,
 * statut, indicateur de récurrence, couleur d'accent.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";

export interface EventCardData {
  id: string;
  title: string;
  start: string;
  end?: string;
  /** Couleur d'accent du calendrier/source (hex ou token). */
  color?: string;
  /** Source ou nom du calendrier. */
  source?: string;
  /** Participants (initiales ou noms courts). */
  participants?: string[];
  /** Lieu physique ou lien. */
  location?: string;
  locationUrl?: string;
  /** Statut (invité, confirmé, en attente). */
  status?: "needs-action" | "tentative" | "confirmed" | "declined";
  /** Indicateur de récurrence. */
  isRecurring?: boolean;
  /** Description courte. */
  description?: string;
}

export interface EventCardProps
  extends Omit<React.ComponentProps<"article">, "onClick"> {
  data: EventCardData;
  /** Affiche les actions (Voir / Modifier / Rejoindre). */
  showActions?: boolean;
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
  onJoin?: (id: string) => void;
  /** Affiche en mode compact (liste dense). */
  variant?: "default" | "compact";
  className?: string;
}

const STATUS_LABEL = {
  "needs-action": "Action requise",
  tentative: "Peut-être",
  confirmed: "Confirmé",
  declined: "Refusé",
} as const;

function EventCard({
  data,
  showActions = true,
  onOpen,
  onEdit,
  onJoin,
  variant = "default",
  className,
  ...props
}: EventCardProps) {
  const start = new Date(data.start);
  const end = data.end ? new Date(data.end) : null;
  const timeFmt = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const endTimeFmt = end?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  // (l'ancien calcul `sameDay` etait une expression non assignee —
  //  no-unused-expressions. Le label d'heure ci-dessous porte l'info.)

  const hourLabel = end
    ? `${timeFmt} – ${endTimeFmt}`
    : timeFmt;

  return (
    <article
      data-slot="event-card"
      data-event-id={data.id}
      data-variant={variant}
      onClick={() => onOpen?.(data.id)}
      className={cn(
        "group flex gap-3 rounded-lg border bg-card transition-colors hover:border-muted-foreground/40",
        variant === "default" ? "p-3 cursor-pointer" : "px-3 py-2",
        className
      )}
      {...props}
    >
      {/* Colonne temps (accent coloré) */}
      <div
        className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md py-1 text-center"
        style={{ backgroundColor: data.color ? `${data.color}15` : undefined }}
      >
        <span className="text-xs font-semibold tabular-nums">{hourLabel}</span>
        {data.isRecurring && (
          <AppIcon name="habit" size="xs" tone="muted" aria-hidden />
        )}
      </div>

      {/* Contenu */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{data.title}</p>
            {data.description && variant === "default" && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {data.description}
              </p>
            )}
          </div>
          {showActions && (onOpen || onEdit || onJoin) && (
            <div
              className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {onJoin && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-6"
                  onClick={() => onJoin(data.id)}
                  aria-label="Rejoindre l'événement"
                >
                  <AppIcon name="calendar" size="xs" aria-hidden />
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-6"
                  onClick={() => onEdit(data.id)}
                  aria-label="Modifier l'événement"
                >
                  <AppIcon name="code" size="xs" aria-hidden />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Métadonnées */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {data.source && (
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: data.color ?? "currentColor" }}
                aria-hidden
              />
              {data.source}
            </span>
          )}
          {data.location && (
            <span className="flex items-center gap-0.5">
              <AppIcon name="project" size="xs" tone="muted" aria-hidden />
              <span className="truncate max-w-32">{data.location}</span>
            </span>
          )}
          {data.status && (
            <Badge variant={data.status === "confirmed" ? "default" : "outline"} className="text-[10px]">
              {STATUS_LABEL[data.status]}
            </Badge>
          )}
          {data.participants && data.participants.length > 0 && (
            <span className="text-muted-foreground">
              {data.participants.length} participant{data.participants.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export { EventCard };
