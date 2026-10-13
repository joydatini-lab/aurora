// button-group.tsx — shadcn/ui `button-group` + `button-group-text`
// (registry item, https://ui.shadcn.com/docs/components/button-group) —
// installé manuellement pour le lot ReUI (le registry `@reui` de
// `components.json` n'expose pas cet item, mais `filters-*.tsx` l'importe
// via `../../../components/ui/button-group` — sans lui, le build de
// `@aurora/ui` (et donc `apps/mobile`/`apps/desktop`) casse avec
// "Could not resolve '../../../components/ui/button-group'").
//
// Comportement (doc shadcn) : fusionne les enfants `Button`/`ButtonGroupText`
// DIRECTS (`*:data-[slot=button-group-text]:inset-0`,
// `[&>[data-slot]~[data-slot]]:border-l-0`) — c'est exactement ce que les
// `filters-chip.tsx`/`filters-editors.tsx` s'appuient dessus (voir leurs
// commentaires "fuses DIRECT children only").
//
// `render` prop (pattern house ReUI/shadcn v2, même que `button.tsx`
// ci-contre via `asChild` + `Slot`) : délégué au `Slot` de
// `@radix-ui/react-slot` déjà installée (jamais d'import de
// `@radix-ui/react-primitives`, non présent dans `packages/ui`).

import * as React from "react"
import { cn } from "src/lib/utils"

/**
 * Container fusionnant ses `Button`/`ButtonGroupText` enfants directs en un
 * seul segment visuel (bordures latérales partagées).
 */
function ButtonGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group"
      className={cn(
        "flex w-fit items-center justify-center gap-2 *:data-[slot=button-group-text]:inset-0 *:data-[slot=button-group-text]:size-4 [&>button]:shrink-0 [&>button]:data-[size=icon]:size-4 [&>button]:data-[slot=button-group-text]:size-4 [&>button]:data-[slot=button-group-text]:flex-1 data-[variant=outline]:*:data-[slot=button-group-text]:bg-background [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Un segment "texte" (non interactif) de `ButtonGroup` — ex. le label
 * champ d'un chip de filtre, au milieu des segments `Button` interactifs.
 * `render` (élément ou balise) remplace la balise par défaut (`div`),
 * même pattern de délégation que `button.tsx` (`asChild` → `Slot`).
 */
function ButtonGroupText({
  className,
  render,
  ...props
}: React.ComponentProps<"div"> & {
  /** Élément (ex. `<button type="button" />`) ou nom de balise à rendre. */
  render?: React.ReactElement | keyof React.JSX.IntrinsicElements
}) {
  const Comp = (render ?? "div") as unknown as React.ComponentType<React.HTMLAttributes<HTMLElement>>
  return (
    <Comp
      data-slot="button-group-text"
      className={cn(
        "flex w-full items-center justify-center rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium shadow-xs transition-[background-color,border-color,color,box-shadow] group-hover/field:bg-foreground group-hover/field:text-background dark:group-hover/field:bg-input dark:group-hover/field:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupText }
