/**
 * EmptyState — component d'état vide opérationnel
 *
 * Conçu selon les règles ReUI :
 * - Empty state with action: titre (1-3 mots), description (~8 mots max), bouton d'action
 * - Typographie sémantique: text-primary, text-muted-foreground
 * - Espacement: gap-* sur les parents, grille 8pt
 * - Couleurs: tokens sémantiques (bg-brand-secondary, text-success, etc.)
 * - Compound component pattern: Root, Header, Content, Title, Description, Footer, AvatarRow, AvatarRadius
 */
import type { ComponentPropsWithRef, ReactNode } from "react";
import { createContext, useContext } from "react";

import { cn } from "src/lib/utils";
import { AppIcon, type IconKey, type IconSize } from "./AppIcon";
import {
  Empty as EmptyBase,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "./empty";

/* ------------------------------------------------------------------ */
/* Contexte partagé                                                    */
/* ------------------------------------------------------------------ */

interface RootContextProps {
  /** Échelle globale (icône + typographie + espacement). */
  size?: "sm" | "md" | "lg";
}

export interface RootProps extends ComponentPropsWithRef<"div">, RootContextProps {}

const RootContext = createContext<RootContextProps>({ size: "md" });

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

const Root = ({ size = "md", className, ...props }: RootProps) => (
  <RootContext.Provider value={{ size }}>
    <EmptyBase className={cn("w-full", className)} {...props} />
  </RootContext.Provider>
);

/* ------------------------------------------------------------------ */
/* Header (icône centrale, avatar row optionnel)                     */
/* ------------------------------------------------------------------ */

export interface HeaderProps extends ComponentPropsWithRef<"div"> {
  /** Icône centrale (clé du registre `AppIcon`). */
  icon?: IconKey;
  /** Teinte sémantique de l'icône. */
  tone?: "default" | "muted" | "success" | "warning" | "danger";
  /** Taille de l'icône. Si non précisé, calculé selon la taille parent. */
  iconSize?: IconSize;
  /** Contenu additionnel (ex. AvatarRow). */
  children?: ReactNode;
}

const Header = ({ icon, tone = "muted", iconSize, children, className, ...props }: HeaderProps) => {
  const { size } = useContext(RootContext);
  // Logique d'adaptation de la taille de l'icône selon la taille de l'état vide
  const resolvedIconSize: IconSize =
    iconSize ?? (size === "sm" ? "sm" : size === "lg" ? "lg" : "md");

  // aria-hidden: l'icône est décorative si pas d'enfants interactifs
  const ariaHidden = children === undefined;

  return (
    <div
      data-slot="empty-state-header"
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        className
      )}
      {...props}
    >
      {icon && (
        <AppIcon
          name={icon}
          size={resolvedIconSize}
          tone={tone}
          aria-hidden={ariaHidden ? true : undefined}
        />
      )}
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export type ContentProps = ComponentPropsWithRef<"div">;

const Content = ({ className, ...props }: ContentProps) => {
  const { size } = useContext(RootContext);
  return (
    <EmptyContent
      data-slot="empty-state-content"
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-3 text-balance text-sm",
        size === "sm" && "gap-2",
        className
      )}
      {...props}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Title                                                               */
/* ------------------------------------------------------------------ */

export type TitleProps = ComponentPropsWithRef<"h3">;

const Title = ({ className, ...props }: TitleProps) => {
  const { size } = useContext(RootContext);
  return (
    <EmptyTitle
      data-slot="empty-state-title"
      className={cn(
        "text-lg font-medium tracking-tight text-primary",
        size === "sm" && "text-base",
        className
      )}
      {...props}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Description                                                         */
/* ------------------------------------------------------------------ */

export type DescriptionProps = ComponentPropsWithRef<"p">;

const Description = ({ className, ...props }: DescriptionProps) => (
  <EmptyDescription
    data-slot="empty-state-description"
    className={cn(
      "text-sm text-muted-foreground [&>a:hover]:text-primary text-balance",
      className
    )}
    {...props}
  />
);

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export type FooterProps = ComponentPropsWithRef<"div">;

const Footer = ({ className, ...props }: FooterProps) => (
  <div
    data-slot="empty-state-footer"
    className={cn("flex gap-2 justify-center", className)}
    {...props}
  />
);

/* ------------------------------------------------------------------ */
/* AvatarRow (ligne d'avatars empilés)                                 */
/* ------------------------------------------------------------------ */

export interface AvatarProps {
  /** URL de l'image. */
  src?: string;
  /** Nom pour l'accessibilité. */
  alt: string;
  /** Badge optionnel (ex. vérifié). */
  badge?: ReactNode;
}

export interface AvatarRowProps extends ComponentPropsWithRef<"div"> {
  /** Liste des avatars à afficher. */
  avatars: AvatarProps[];
  /** Nombre maximum d'avatars à afficher (reste Masqué avec +N). Par défaut: 3. */
  maxVisible?: number;
  /** Classe CSS additionnelle. */
  className?: string;
}

const AvatarRow = ({
  avatars,
  maxVisible = 3,
  className,
  ...props
}: AvatarRowProps) => {
  const { size } = useContext(RootContext);
  const visibleAvatars = avatars.slice(0, maxVisible);
  const hiddenCount = Math.max(0, avatars.length - maxVisible);

  return (
    <div
      data-slot="empty-state-avatar-row"
      className={cn(
        "flex -space-x-2",
        size === "sm" && "-space-x-1",
        className
      )}
      {...props}
    >
      {visibleAvatars.map((avatar, index) => (
        <EmptyAvatar
          key={index}
          src={avatar.src}
          alt={avatar.alt}
          badge={avatar.badge}
          size={size}
        />
      ))}
      {hiddenCount > 0 && (
        <div
          data-slot="empty-state-avatar-more"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground",
            size === "sm" && "h-6 w-6",
          )}
          aria-label={`${hiddenCount} autres membres masqués`}
        >
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Avatar (composant interne pour AvatarRow)                           */
/* ------------------------------------------------------------------ */

export interface EmptyAvatarProps {
  src?: string;
  alt: string;
  badge?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const EmptyAvatar = ({
  src,
  alt,
  badge,
  size = "md",
}: EmptyAvatarProps) => {
  const initials = alt
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      data-slot="empty-avatar"
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-brand-100 to-brand-200",
        size === "sm" && "h-6 w-6",
        size === "lg" && "h-10 w-10",
      )}
      aria-label={alt}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            "h-full w-full rounded-full object-cover",
            size === "sm" && "h-6 w-6",
            size === "lg" && "h-10 w-10",
          )}
        />
      ) : (
        <span className="text-xs font-medium text-brand-700">
          {initials}
        </span>
      )}
      {badge && (
        <div
          data-slot="empty-avatar-badge"
          className={cn(
            "absolute -bottom-0 -right-0 flex h-4 w-4 items-center justify-center rounded-full bg-success text-white",
            size === "sm" && "h-3 w-3",
            size === "lg" && "h-5 w-5",
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* AvatarRadius (bordure ronde personnalisée pour Avatar)              */
/* ------------------------------------------------------------------ */

export interface AvatarRadiusProps extends ComponentPropsWithRef<"div"> {
  /** Rayon de bordure (pixels). Par défaut: 9999 (rond complet). */
  radius?: number;
  /** Contenu de l'avatar (image ou initiales). */
  children: ReactNode;
}

const AvatarRadius = ({
  radius = 9999,
  children,
  className,
  style,
  ...props
}: AvatarRadiusProps) => (
  <div
    data-slot="empty-avatar-radius"
    className={cn("inline-flex", className)}
    style={{ ...style, borderRadius: radius }}
    {...props}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Composite                                                           */
/* ------------------------------------------------------------------ */

const EmptyState = Root as typeof Root & {
  Title: typeof Title;
  Header: typeof Header;
  Footer: typeof Footer;
  Content: typeof Content;
  Description: typeof Description;
  AvatarRow: typeof AvatarRow;
  AvatarRadius: typeof AvatarRadius;
  EmptyAvatar: typeof EmptyAvatar;
};

EmptyState.Title = Title;
EmptyState.Header = Header;
EmptyState.Footer = Footer;
EmptyState.Content = Content;
EmptyState.Description = Description;
EmptyState.AvatarRow = AvatarRow;
EmptyState.AvatarRadius = AvatarRadius;
EmptyState.EmptyAvatar = EmptyAvatar;

export { EmptyState };