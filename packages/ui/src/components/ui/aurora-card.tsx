/**
 * AuroraCard — les 5 archétypes de carte du design system Aurora
 * (05 design system, lot 2026-10).
 *
 * SSoT de la morphologie (Z0–Z7, 8 zones) — le composant remplace
 * les ~40 classes ad-hoc `.xxx-card` (la `matrix feature → zones`
 * vit dans le plan du lot, chaque feature = le socle `title` + au
 * max 4 zones).
 *
 * La famille :
 *   - `entity`  (C1) : ligne compacte, 1 titre + 1–2 tags — la
 *     `.task-row`, `.habits-card`, `.skill-card`, `.integration-card`,
 *     `.veille-program-card` (le `variant` pilote l'enveloppe, jamais
 *     le contenu).
 *   - `object`  (C2) : posée, multi-sections (header / content /
 *     footer séparés) — la `.review-card`, `.retro-card`,
 *     `.skill-doc-sheet-card`, `.countdown-card`.
 *   - `kpi`     (C3) : KPI-tile (le `value` mono 24px + le `unit` +
 *     le `delta`, la barre de 3px accent en haut, le `progress`
 *     optionnel) — la `.stat-tile` / StatTile, image #7/#8 du brief
 *     (les stats & les widgets).
 *   - `node`    (C4) : nœud spatial (le graphe, le positionnement
 *     vit dans le parent — la carte n'est que le contenu) — la
 *     `.goal-feature-node`, NodeCard.
 *   - `media`   (C5) : image en tête + overlay gradient + titre /
 *     description au-dessus de l'image + chips + CTA en pied —
 *     image #5 du brief (les cartes projet & discovery), le style
 *     premium.
 *
 * Les 5 états AD-13 (idle / loading / empty / error / offline) vivent
 * DANS la carte (la prop `state`) — le shell (l'enveloppe + le titre)
 * reste toujours lisible, jamais une carte factice (AD-7).
 *
 * Radius par défaut (reco) : `rounded-lg` = 8px, `sm` = `rounded` =
 * 4px. Jamais un radius > 12 pour une carte (la `media` est le seul
 * cas, image en tête = le radius suit le parent).
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { badgeVariants } from "./badge";

// ---------------------------------------------------------------------------
// Les contrats (types publics — le `contracts.ts` du DS, AD-10)
// ---------------------------------------------------------------------------

export type CardVariant = "entity" | "object" | "kpi" | "node" | "media";
export type CardState = "idle" | "loading" | "empty" | "error" | "offline";
export type CardSize = "sm" | "md";

export interface AuroraCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  /** L'archétype (Z0, l'enveloppe). */
  variant?: CardVariant;
  /** La densité (le `sm` = le padding réduit, 1 ligne, les listes). */
  size?: CardSize;
  /** Z2 — le titre (SSoT 05 §3.3 : une carte SANS titre est interdite).
   *  Optionnel que si un `title` est fourni via le `AuroraCardHeader` enfant. */
  title?: React.ReactNode;
  /** Z2b — le sous-titre (le muted sous le titre). */
  subtitle?: React.ReactNode;
  /** Z1 — l'icône (un composant Lucide, un `ReactNode`). */
  icon?: React.ReactNode;
  /** La teinte de l'icône (token, AD-17 — jamais une valeur brute). */
  iconTone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  /** Z3 — les badges/chips (les `Badge` du DS, jamais une couleur
   *  brute, AD-17). */
  badges?: React.ReactNode;
  /** Z4 — le body (le `AuroraCardActions`/le content principal). */
  children?: React.ReactNode;
  /** Z5a — la valeur KPI (le `value` mono 24px, le C3). */
  value?: React.ReactNode;
  valueUnit?: React.ReactNode;
  /** Z5b — le delta (le +/− mono, le C3, image #8). */
  delta?: React.ReactNode;
  deltaTone?: "up" | "down" | "flat";
  /** Z5c — la barre de progression (le C3 / le C2 optionnel). */
  progress?: number;
  progressLabel?: React.ReactNode;
  /** Z6 — les actions (les CTA, le `Button` du DS, le footer de la
   *  carte ou le `AuroraCardActions` en-tête). */
  actions?: React.ReactNode;
  /** Z7 — le footer (les métas, la date, le compteur). */
  footer?: React.ReactNode;
  /** Le lien (si fourni, la carte devient un `<a>`, `role="link"`). */
  href?: string;
  /** Z-image (le C5) : le src de la couverture (l'image en tête). */
  imageSrc?: string;
  imageAlt?: string;
  /** AD-13 — l'état (le contenu est remplacé, le shell reste). */
  state?: CardState;
  /** L'état vide personnalisé (le CTA, le message). */
  emptyMessage?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** L'état erreur personnalisé (le message, le `onRetry`). */
  errorMessage?: React.ReactNode;
  onRetry?: () => void;
  /** L'état hors-ligne (le badge + le contenu last-known, AD-7). */
  offlineBadge?: React.ReactNode;
  /** L'état chargement (le skeleton, le shape de la carte). */
  loadingRows?: number;
}

export interface AuroraCardBadge {
  label: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
  /** La teinte sémantique (les tokens AD-13, FROZEN 05 §5.1). */
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  className?: string;
}

// ---------------------------------------------------------------------------
// Les pièces (les sous-composants, le shadcn Card rétro-adapté)
// ---------------------------------------------------------------------------

const ICON_TONE: Record<NonNullable<AuroraCardProps["iconTone"]>, string> = {
  neutral: "text-muted-foreground",
  accent: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

const TONE_BADGE: Record<NonNullable<AuroraCardBadge["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  accent: "bg-accent text-primary border-primary/20",
  success: "bg-success-surface text-success border-success/20",
  warning: "bg-warning-surface text-warning border-warning/20",
  danger: "bg-danger-surface text-danger border-danger/20",
  info: "bg-info-surface text-info border-info/20",
};

export function AuroraCardHeader({
  title,
  subtitle,
  icon,
  iconTone = "neutral",
  badges,
  className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconTone?: AuroraCardProps["iconTone"];
  badges?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-card-header
      className={cn("flex items-start gap-2.5", className)}
    >
      {icon ? (
        <span
          aria-hidden
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            "bg-muted/60",
            ICON_TONE[iconTone ?? "neutral"],
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {title ? (
          <h3 className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {title}
          </h3>
        ) : null}
        {subtitle ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {badges ? <div className="shrink-0">{badges}</div> : null}
    </div>
  );
}

export function AuroraCardBadge({
  label,
  variant = "secondary",
  tone,
  className,
}: AuroraCardBadge) {
  return (
    <span
      data-card-badge
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        badgeVariants({ variant }),
        tone ? TONE_BADGE[tone] : undefined,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function AuroraCardProgress({
  value,
  label,
  className,
}: {
  value: number;
  label?: React.ReactNode;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div data-card-progress className={cn("w-full", className)}>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {label ? (
        <div className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
          {label}
        </div>
      ) : null}
    </div>
  );
}

export function AuroraCardValue({
  value,
  unit,
  delta,
  deltaTone,
  className,
}: {
  value: React.ReactNode;
  unit?: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: AuroraCardProps["deltaTone"];
  className?: string;
}) {
  const deltaClass =
    deltaTone === "up"
      ? "text-success"
      : deltaTone === "down"
        ? "text-warning"
        : "text-muted-foreground";
  return (
    <div data-card-value className={cn("flex items-baseline gap-2", className)}>
      <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </span>
      {unit ? (
        <span className="text-xs text-muted-foreground">{unit}</span>
      ) : null}
      {delta ? (
        <span className={cn("ml-auto font-mono text-xs font-medium", deltaClass)}>
          {delta}
        </span>
      ) : null}
    </div>
  );
}

export function AuroraCardActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-card-actions
      className={cn(
        "flex flex-wrap items-center gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AuroraCardFooter({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-card-footer
      className={cn(
        "flex items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AuroraCardContent({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-card-content className={cn("min-w-0 flex-1", className)}>
      {children}
    </div>
  );
}

/**
 * La couverture (le C5 `media`) — l'image en tête + le gradient
 * overlay + le titre / le sous-titre + les chips au-dessus de
 * l'image (image #5 du brief). Le CTA vit dans le `AuroraCardActions`
 * (le pied, sous l'image), jamais au-dessus.
 */
export function AuroraCardCover({
  imageSrc,
  imageAlt,
  title,
  subtitle,
  badges,
  children,
}: {
  imageSrc?: string;
  imageAlt?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div data-card-cover className="relative -mx-4 -mt-4 mb-1 min-h-0 sm:-mx-3 sm:-mt-3">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt ?? ""}
          className="h-36 w-full object-cover sm:h-40"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden
          className="h-36 w-full bg-gradient-to-br from-primary/15 via-accent/10 to-transparent sm:h-40"
        />
      )}
      {/* Le gradient overlay (le titre reste lisible au-dessus de
           l'image, image #5) — l'accent = le token du thème, AD-17. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
        {title ? (
          <h3 className="text-base font-semibold leading-tight text-background">
            {title}
          </h3>
        ) : null}
        {subtitle ? (
          <p className="line-clamp-2 text-xs text-background/80">{subtitle}</p>
        ) : null}
        {badges ? <div className="flex flex-wrap gap-1.5">{badges}</div> : null}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Les états AD-13 (le shell reste, le contenu est remplacé)
// ---------------------------------------------------------------------------

function CardSkeleton({ rows = 2, className }: { rows?: number; className?: string }) {
  return (
    <div
      data-card-state="loading"
      role="status"
      aria-label="Chargement"
      className={cn("flex w-full flex-col gap-2", className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-3 rounded-full bg-muted animate-pulse-skeleton",
            i === 0 ? "h-4 w-2/3" : i === rows - 1 ? "w-1/2" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

function CardEmpty({
  message,
  action,
  className,
}: {
  message?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-card-state="empty"
      className={cn(
        "flex w-full flex-col items-center gap-2 py-4 text-center",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        {message ?? "Rien ici pour le moment."}
      </p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

function CardError({
  message,
  onRetry,
  className,
}: {
  message?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      data-card-state="error"
      role="alert"
      className={cn("flex w-full flex-col gap-2 py-2", className)}
    >
      <p className="text-xs text-danger">{message ?? "Impossible de charger cette carte."}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded border border-danger/40 px-2 py-1 text-[11px] font-medium text-danger hover:bg-danger/10"
        >
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

function CardOffline({
  badge,
  children,
}: {
  badge?: React.ReactNode;
  /** Le contenu last-known (AD-7, le miroir local reste lisible). */
  children?: React.ReactNode;
}) {
  return (
    <div data-card-state="offline" className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        {badge ?? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2 py-0.5 text-[10px] font-medium text-warning">
            Hors ligne
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Le composant SSoT (le conteneur + la composition par archétype)
// ---------------------------------------------------------------------------

export function AuroraCard({
  variant = "object",
  size = "md",
  title,
  subtitle,
  icon,
  iconTone,
  badges,
  children,
  value,
  valueUnit,
  delta,
  deltaTone,
  progress,
  progressLabel,
  actions,
  footer,
  href,
  imageSrc,
  imageAlt,
  state = "idle",
  emptyMessage,
  emptyAction,
  errorMessage,
  onRetry,
  offlineBadge,
  loadingRows,
  className,
  ...rest
}: AuroraCardProps) {
  /* Le conteneur (le Z0) — le `variant` pilote L'ENVELOPPE (le
     padding, le radius, la bordure, l'ombre), JAMAIS le contenu. */
  const shell = cn(
    "group/card relative isolate flex w-full flex-col overflow-hidden rounded-lg bg-card text-card-foreground ring-1 ring-foreground/10",
    variant === "entity" && "gap-1.5 p-3 ring-foreground/5 shadow-none",
    variant === "object" && "gap-3 p-4 shadow-sm",
    variant === "kpi" &&
      "gap-2 p-4 shadow-sm border-t-[3px] border-t-primary",
    variant === "node" && "gap-1 rounded-md p-2.5 ring-foreground/10",
    variant === "media" && "gap-0 p-0 shadow-md ring-foreground/5",
    size === "sm" && "text-xs",
    className,
  );

  /* Le contenu par état (AD-13 — le shell reste, le contenu change). */
  const body = (() => {
    switch (state) {
      case "loading":
        return <CardSkeleton rows={loadingRows} />;
      case "empty":
        return <CardEmpty message={emptyMessage} action={emptyAction} />;
      case "error":
        return <CardError message={errorMessage} onRetry={onRetry} />;
      case "offline":
        return (
          <CardOffline badge={offlineBadge}>
            {children}
          </CardOffline>
        );
      case "idle":
      default:
        return children;
    }
  })();

  /* Le C5 `media` : le titre + le sous-titre + les chips vivent AU-DESSUS
     de l'image (le `AuroraCardCover`), le `AuroraCardActions` (le CTA) vit en PIED
     (sous l'image) — image #5 du brief. */
  const isMedia = variant === "media";

  const Tag: React.ElementType = href ? "a" : "div";

  return (
    <Tag
      data-aurora-component="AuroraCard"
      data-card-variant={variant}
      data-card-size={size}
      data-card-state={state}
      {...(href ? { href, role: "link" as const } : {})}
      {...rest}
      className={cn(
        shell,
        (href || rest.onClick) &&
          "cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]",
      )}
    >
      {isMedia ? (
        <AuroraCardCover
          imageSrc={imageSrc}
          imageAlt={imageAlt}
          title={title}
          subtitle={subtitle}
          badges={badges}
        />
      ) : (
        <AuroraCardHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          iconTone={iconTone}
          badges={badges}
        />
      )}

      {/* Le KPI (le C3) : le `value` + le `delta` + le `progress`,
           optionnel par variante (image #7/#8 du brief). Quand
           `value` est absent (l'état vide, AD-7) — jamais une valeur
           factice — le KPI-tile reste lisible via le header + le
           `CardValue` vide (un em-dash muet, la règle SSoT du DS). */}
      {variant === "kpi" && (
        <>
          {value !== undefined ? (
            <AuroraCardValue
              value={value}
              unit={valueUnit}
              delta={delta}
              deltaTone={deltaTone}
            />
          ) : (
            <div
              data-card-value-empty
              className="flex items-baseline gap-2 font-mono text-2xl font-semibold text-foreground tabular-nums"
            >
              <span>—</span>
            </div>
          )}
          {progress !== undefined && (
            <AuroraCardProgress value={progress} label={progressLabel} />
          )}
        </>
      )}

      {/* Le content (le C2/C4) : le `children` est le body principal
           (l'état `idle` seulement — les autres états remplacent le
           contenu par leur shell). */}
      {state === "idle" && !isMedia && children !== undefined && children !== null ? (
        <AuroraCardContent>{children}</AuroraCardContent>
      ) : null}

      {actions ? <AuroraCardActions>{actions}</AuroraCardActions> : null}
      {footer ? <AuroraCardFooter>{footer}</AuroraCardFooter> : null}

      {/* Le shell AD-13 (l'état remplace le contenu, le shell reste
           lisible). */}
      {state !== "idle" ? <div className="min-w-0 flex-1">{body}</div> : null}
    </Tag>
  );
}

AuroraCard.displayName = "AuroraCard";

export const cardBadgeVariants = badgeVariants;
