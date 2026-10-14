// empty-state.tsx — état vide riche (Untitled UI v8 `empty-state`, option B)
//
// Ré-adapté : l'original importe des assets Untitled UI internes
// (`@/components/foundations/featured-icon`, `@/components/shared-assets/...`,
// `@untitledui/file-icons`, `@untitledui/icons`) que la batterie DS d'Aurora
// n'a pas. On ne garde que la structure sémantique (contexte `RootContext`,
// sous-composants `Title`/`Header`/`Content`/`Description`/`Footer` + les
// variantes d'avatar) en reposant sur :
//   - `AppIcon` (batterie DS, `components.json` `iconLibrary: lucide`) pour
//     l'icône centrale, à la place de `FeaturedIconbase` + `SearchLg` ;
//   - `empty.tsx` de la batterie pour le layout de base (`Empty`,
//     `EmptyTitle`, …) — la version "riche" ici n'est qu'une couche
//     optionnelle par-dessus (avatars, pattern, illustrations), jamais
//     obligatoire.
//
// Zéro React-Aria, zéro `@untitledui/*` : ce composant est purement
// présentationnel (contexte React + CSS), l'option B ne s'applique qu'à
// `date-range-picker` (le seul vrai morceau React-Aria du lot).
import type { ComponentPropsWithRef, ReactNode } from "react";
import { createContext, useContext } from "react";

import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "./AppIcon";
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

const RootContext = createContext<RootContextProps>({ size: "md" });

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

interface RootProps extends ComponentPropsWithRef<"div">, RootContextProps {}

const Root = ({ size = "md", className, ...props }: RootProps) => (
  <RootContext.Provider value={{ size }}>
    <EmptyBase className={cn("w-full", className)} {...props} />
  </RootContext.Provider>
);

/* ------------------------------------------------------------------ */
/* Header (icône + contenu optionnel au-dessus du titre)               */
/* ------------------------------------------------------------------ */

interface HeaderProps extends ComponentPropsWithRef<"div"> {
  /** Icône centrale (clé de la batterie `AppIcon`, ex. `file`/`task`/…). */
  icon?: IconKey;
  /** Teinte sémantique de l'icône (`AppIcon.tone` : `default`/`muted`/
      `success`/`warning`/`danger`). */
  tone?: "default" | "muted" | "success" | "warning" | "danger";
  /** Tailles de l'icône (`AppIcon` : `xs`/`sm`/`md`/`lg`). */
  iconSize?: "xs" | "sm" | "md" | "lg";
  /** Contenu additionnel (ex. un label) rendu sous l'icône. */
  children?: ReactNode;
}

const Header = ({ icon, tone, iconSize, children, className, ...props }: HeaderProps) => {
  const { size } = useContext(RootContext);
  const resolvedIconSize = iconSize ?? (size === "sm" ? "md" : "lg");

  return (
    <div
      data-slot="empty-state-header"
      className={cn(
        "relative mb-3 flex flex-col items-center justify-center",
        (size === "md" || size === "lg") && "mb-4",
        className
      )}
      {...props}
    >
      {icon && (
        <AppIcon
          name={icon}
          size={resolvedIconSize}
          tone={tone}
          className="mb-2"
          aria-hidden
        />
      )}
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Content / Footer / Title / Description (repose sur empty.tsx)       */
/* ------------------------------------------------------------------ */

const Content = (props: ComponentPropsWithRef<"div">) => <EmptyContent {...props} />;

const Footer = ({ className, ...props }: ComponentPropsWithRef<"div">) => (
  <div data-slot="empty-state-footer" className={cn("z-10 flex gap-3", className)} {...props} />
);

const Title = (props: ComponentPropsWithRef<"div">) => <EmptyTitle {...props} />;

const Description = (props: ComponentPropsWithRef<"div">) => <EmptyDescription {...props} />;

/* ------------------------------------------------------------------ */
/* Avatar decorations (le motif "avatars concentriques/rows" de
   l'original — ne repose QUE sur des <img>, pas d'asset Untitled UI)  */
/* ------------------------------------------------------------------ */

export interface EmptyAvatar {
  src: string;
  alt?: string;
}

interface AvatarRowProps extends ComponentPropsWithRef<"div"> {
  /** Avatars fanés de chaque côté du contenu central. */
  avatars?: EmptyAvatar[];
  /** Contenu central (ex. l'icône de l'état vide). */
  children?: ReactNode;
}

const AvatarRow = ({ avatars = [], children, className, ...props }: AvatarRowProps) => {
  const { size: rootSize } = useContext(RootContext);
  const sizeKey = rootSize || "md";
  // Du plus petit (bordure) vers le centre (plus grand).
  const sizes =
    sizeKey === "sm"
      ? ["size-8 rounded-md", "size-9 rounded-[7px]", "size-10 rounded-lg", "size-11 rounded-[9px]"]
      : sizeKey === "md"
        ? ["size-10 rounded-lg", "size-11 rounded-[9px]", "size-12 rounded-[10px]"]
        : ["size-10 rounded-lg", "size-11 rounded-[9px]", "size-12 rounded-[10px]"];

  const count = sizes.length;
  const leftAvatars = avatars.slice(0, count);
  const rightAvatars = avatars.slice(count, count * 2);

  const renderAvatar = (avatar: EmptyAvatar, sizeClass: string | undefined, key: number) => (
    <div
      key={key}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full ring-1 ring-black/10",
        sizeClass,
      )}
    >
      <img src={avatar.src} alt={avatar.alt || ""} className="size-full rounded-full object-cover" />
    </div>
  );

  return (
    <div
      aria-hidden="true"
      className={cn(
        "-m-1 flex items-center justify-center p-1",
        sizeKey === "sm" ? "gap-4" : sizeKey === "md" ? "gap-5" : "gap-6",
        className
      )}
      {...props}
    >
      <div className={cn("flex items-center", sizeKey === "sm" ? "gap-2" : "gap-3")}>
        {leftAvatars.map((a, i) => renderAvatar(a, sizes[i], i))}
      </div>
      {children}
      <div className={cn("flex items-center", sizeKey === "sm" ? "gap-2" : "gap-3")}>
        {rightAvatars.map((a, i) => renderAvatar(a, sizes[count - 1 - i], i + count))}
      </div>
    </div>
  );
};

interface AvatarRadiusProps extends ComponentPropsWithRef<"div"> {
  /** Avatars placés sur des cercles concentriques derrière l'état vide. */
  avatars?: EmptyAvatar[];
}

const AvatarRadius = ({ avatars = [], className, ...props }: AvatarRadiusProps) => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none relative flex size-40 items-center justify-center",
      className
    )}
    {...props}
  >
    {avatars.slice(0, 3).map((a, i) => (
      <img
        key={i}
        src={a.src}
        alt=""
        className={cn(
          "absolute rounded-full ring-1 ring-black/10",
          i === 0 ? "size-10" : i === 1 ? "size-8" : "size-6"
        )}
        style={{
          transform: `translate(${i * 24 - 24}px, ${i % 2 === 0 ? -24 : 24}px)`,
        }}
      />
    ))}
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
};

EmptyState.Title = Title;
EmptyState.Header = Header;
EmptyState.Footer = Footer;
EmptyState.Content = Content;
EmptyState.Description = Description;
EmptyState.AvatarRow = AvatarRow;
EmptyState.AvatarRadius = AvatarRadius;

export { EmptyState };
