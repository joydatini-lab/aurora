/**
 * CountdownCard — carte de compte à rebours (cat. 2.4, 4.4).
 *
 * Étape 2 (muet) : reçoit `CountdownData` + callbacks. Pas de store, pas d'API.
 *
 * Règles UX (cat. 2.4) :
 * - Jour J affiché en grand + libellé
 * - Image optionnelle (couverture)
 * - Statut : à venir / aujourd'hui / expiré / terminé
 * - Actions : modifier / créer événement / partager / supprimer
 *
 * Sous-composants exportés :
 * - `CountdownStatusBadge` (badge de statut)
 * - `CountdownDaysLabel` (libellé "J-12", "Aujourd'hui", "Hier", "J+3")
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";

export type CountdownStatus =
  | "upcoming"
  | "today"
  | "expired"
  | "completed";

export interface CountdownData {
  id: string;
  title: string;
  /** Date cible (ISO string). */
  date: string;
  /** Couleur d'accent (hex ou token). */
  color?: string;
  /** Image de couverture. */
  imageUrl?: string;
  /** Statut dérivé ou explicite. */
  status?: CountdownStatus;
  /** Sous-titre (lieu, note). */
  subtitle?: string;
  /** Nombre de jours restants (décalé). */
  daysUntil?: number;
}

export interface CountdownCardProps
  extends Omit<React.ComponentProps<"article">, "onClick"> {
  data: CountdownData;
  variant?: "default" | "compact";
  showActions?: boolean;
  onEdit?: (id: string) => void;
  onCreateEvent?: (id: string) => void;
  onShare?: (id: string) => void;
  onRemove?: (id: string) => void;
  onOpen?: (id: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* CountdownStatusBadge                                                */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  CountdownStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  upcoming: { label: "À venir", variant: "secondary" },
  today: { label: "Aujourd'hui", variant: "default" },
  expired: { label: "Expiré", variant: "destructive" },
  completed: { label: "Terminé", variant: "outline" },
};

export function CountdownStatusBadge({
  status,
  className,
}: {
  status: CountdownStatus;
  className?: string;
}) {
  const c = STATUS_CONFIG[status];
  return (
    <Badge variant={c.variant} className={cn("text-[10px]", className)}>
      {c.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* CountdownDaysLabel                                                  */
/* ------------------------------------------------------------------ */

export function countdownDaysLabel(daysUntil?: number, status?: CountdownStatus) {
  if (status === "completed") return "Terminé";
  if (daysUntil === undefined) return "";
  if (daysUntil === 0) return "Aujourd'hui";
  if (daysUntil === 1) return "Demain";
  if (daysUntil === -1) return "Hier";
  if (daysUntil > 0) return `J-${daysUntil}`;
  return `J+${Math.abs(daysUntil)}`;
}

export function CountdownDaysLabel({
  daysUntil,
  status,
  size = "md",
  className,
}: {
  daysUntil?: number;
  status?: CountdownStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const label = countdownDaysLabel(daysUntil, status);
  if (!label) return null;
  const sizeClass =
    size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-base";
  return (
    <span
      className={cn(
        "font-semibold tabular-nums tracking-tight",
        sizeClass,
        status === "today" && "text-primary",
        status === "expired" && "text-destructive",
        className
      )}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function CountdownCard({
  data,
  variant = "default",
  showActions = true,
  onEdit,
  onCreateEvent,
  onShare,
  onRemove,
  onOpen,
  className,
  ...props
}: CountdownCardProps) {
  const status = data.status ?? "upcoming";
  const isCompact = variant === "compact";

  return (
    <article
      data-slot="countdown-card"
      data-countdown-id={data.id}
      data-status={status}
      data-variant={variant}
      onClick={() => onOpen?.(data.id)}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-muted-foreground/40",
        status === "completed" && "opacity-60",
        className
      )}
      {...props}
    >
      {/* Image de couverture */}
      {data.imageUrl && (
        <div
          className={cn("w-full overflow-hidden", isCompact ? "h-24" : "h-32")}
          style={{
            backgroundColor: data.color ? `${data.color}20` : undefined,
          }}
        >
          <img
            src={data.imageUrl}
            alt={data.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <div className={cn("flex flex-col gap-2 p-4", isCompact && "p-3")}>
        {/* En-tête : statut + jours */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CountdownDaysLabel
                daysUntil={data.daysUntil}
                status={status}
                size={isCompact ? "sm" : "md"}
              />
              {status === "today" && (
                <CountdownStatusBadge status="today" />
              )}
              {status === "completed" && (
                <CountdownStatusBadge status="completed" />
              )}
            </div>
            <p
              className={cn(
                "mt-1 truncate font-medium leading-tight",
                isCompact ? "text-sm" : "text-base"
              )}
            >
              {data.title}
            </p>
            {data.subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {data.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions &&
          (onEdit || onCreateEvent || onShare || onRemove) && (
            <div
              className={cn(
                "flex items-center gap-1.5 border-t pt-2.5",
                !isCompact && "mt-1"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {onCreateEvent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs flex-1"
                  onClick={() => onCreateEvent(data.id)}
                >
                  <AppIcon name="calendar" size="xs" aria-hidden />
                  Créer un événement
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7"
                  onClick={() => onEdit(data.id)}
                  aria-label="Modifier"
                >
                  <AppIcon name="code" size="xs" aria-hidden />
                </Button>
              )}
              {onShare && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7"
                  onClick={() => onShare(data.id)}
                  aria-label="Partager"
                >
                  <AppIcon name="open" size="xs" aria-hidden />
                </Button>
              )}
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => onRemove(data.id)}
                  aria-label="Supprimer"
                >
                  <AppIcon name="retry" size="xs" aria-hidden />
                </Button>
              )}
            </div>
          )}
      </div>
    </article>
  );
}
