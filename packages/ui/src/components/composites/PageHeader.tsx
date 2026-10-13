/**
 * PageHeader — cat. §1.1 (App shell).
 *
 * Titre, description, icône, badges, actions principales et menu secondaire.
 * Contraintes (cat. §1.1) :
 * - une action principale maximum visuellement dominante
 * - autres actions dans le menu ou en style secondaire
 */
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { Badge, type BadgeProps } from "src/components/ui/badge";

export interface PageHeaderBadge extends BadgeProps {
  label: string;
}

export interface PageHeaderProps {
  /** Icône principale (registre `IconKey`). */
  icon?: IconKey;
  /** Titre de la page (obligatoire). */
  title: string;
  /** Description optionnelle (sous-titre contextuel). */
  description?: string;
  /** Badges d'état / statut (ex. "En cours", "3 tâches bloquées"). */
  badges?: PageHeaderBadge[];
  /** Action principale (bouton primaire, unique). */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: IconKey;
    disabled?: boolean;
  };
  /** Actions secondaires (boutons outline/ghost). */
  secondaryActions?: {
    label: string;
    onClick: () => void;
    icon?: IconKey;
  }[];
  /** Menu des points (dropdown) — le composant appelle `onMenuOpen` si fourni. */
  onMenuOpen?: () => void;
  className?: string;
}

function PageHeader({
  icon,
  title,
  description,
  badges = [],
  primaryAction,
  secondaryActions = [],
  onMenuOpen,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between", className)}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {icon && <AppIcon name={icon} size="lg" aria-hidden />}
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {badges.map((b, i) => (
            <Badge key={i} variant={b.variant}>
              {b.label}
            </Badge>
          ))}
        </div>
        {description && (
          <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {primaryAction && (
          <Button
            size="sm"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.icon && (
              <AppIcon name={primaryAction.icon} size="sm" aria-hidden />
            )}
            {primaryAction.label}
          </Button>
        )}
        {secondaryActions.map((a, i) => (
          <Button key={i} variant="outline" size="sm" onClick={a.onClick}>
            {a.icon && <AppIcon name={a.icon} size="sm" aria-hidden />}
            {a.label}
          </Button>
        ))}
        {onMenuOpen && (
          <Button variant="ghost" size="icon-sm" onClick={onMenuOpen} aria-label="Plus d'actions">
            <AppIcon name="open" size="sm" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

export { PageHeader };
