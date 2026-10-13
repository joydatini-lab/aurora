import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "src/lib/utils"

/*
 * @21st Command Menu (uvain, https://21st.dev/@uvain/components/command-menu-palette)
 * ré-adapté en packages/ui : le SHELL desktop de la recherche globale ⌘K
 * (la Phase 2, 05 §4.5.2 : le desktop a la TopBar, le command palette
 * vit dedans). Les tokens `text-popover-foreground` / `bg-muted` /
 * `ring-border` existent déjà dans `aurora.css` (le thème expressif
 * suit `AuroraThemeProvider`, AD-17). Le mouvement (zoom/fade 95 →
 * 100) est gated par `motion-safe` (05 §2.6 règle 2 : si
 * `prefers-reduced-motion` → pas d'animation). Les données (les
 * labels "Go to", les shortcuts "G O") sont des DEMOS — le
 * consommateur (l'app desktop) remplace par la donnée réelle (les
 * routes de l'app, les actions du `agent`), jamais un label anglais
 * figé (05 §2.5 : l'app est 100 % française, AD-17).
 */

/* Layro System · CommandMenu. Composed from the 21st source into one
   file; themed with the Aurora shadcn/ui tokens. */

const SQUIRCLE = "[corner-shape:squircle]"

const LAYER = {
  /** Dropdowns and popovers anchored to a trigger. */
  popover: 60,
  /** Dialog scrim and panel. */
  dialog: 70,
  /** Toasts, which must clear an open dialog. */
  toast: 80,
} as const

/* =========================================================== command == */

/**
 * ⌘K: one box that finds anything and does anything. Built on cmdk for
 * the ranking and the keyboard, inside a Radix dialog for focus and
 * Escape.
 *
 *   const [open, setOpen] = useCommandShortcut();
 *   <CommandMenu open={open} onOpenChange={setOpen}
 *     placeholder="Rechercher ou aller à…">
 *     <CommandGroup heading="Aller à">
 *       <CommandItem icon={<Home />} onSelect={() => go("/")}>
 *         Aperçu
 *       </CommandItem>
 *     </CommandGroup>
 *   </CommandMenu>
 *
 * Les parties inline (`<Command>`, `<CommandInput>`, `<CommandList>`,
 * `<CommandItem>`) fonctionnent aussi SANS le dialog — pour un
 * panneau de recherche inline dans une page (le pattern du DS
 * "command palette dans la TopBar", 05 §4.5.2).
 */

/** Opens on ⌘K (Mac) or Ctrl+K (everywhere else). Returns [open, setOpen]. */
export function useCommandShortcut(key = "k") {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === key && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [key])
  return [open, setOpen] as const
}

export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(function Command({ className, ...props }, ref) {
  return (
    <CommandPrimitive
      ref={ref}
      className={cn(
        "flex w-full flex-col overflow-hidden text-popover-foreground",
        className,
      )}
      {...props}
    />
  )
})

export function CommandInput({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-3.5">
      <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <CommandPrimitive.Input
        className={cn(
          "h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
    </div>
  )
}

export function CommandList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>) {
  /* cmdk wraps the groups in a sizing div with no role, which leaves the
     listbox with a child that is neither an option nor a group. Marking it
     presentational keeps the listbox → group → option chain intact. */
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    ref.current?.querySelector("[cmdk-list-sizer]")?.setAttribute(
      "role",
      "presentation",
    )
    /* A listbox may only own groups and options, so the dividers are drawn, not announced. */
    ref.current?.querySelectorAll("[cmdk-separator]").forEach((el) =>
      el.setAttribute("role", "none"),
    )
  })
  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn(
        "max-h-[min(360px,60dvh)] overflow-y-auto overscroll-contain p-1.5",
        className,
      )}
      {...props}
    />
  )
}

export function CommandEmpty({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className={cn(
        "px-3 py-8 text-center text-[13px] text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

export function CommandGroup({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        "py-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase",
        className,
      )}
      {...props}
    />
  )
}

export function CommandSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn("-mx-1.5 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export interface CommandItemProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> {
  icon?: React.ReactNode
  /** Display only: "⌘N", "G M". */
  shortcut?: string
  /** A second line under the label. */
  hint?: React.ReactNode
}

export function CommandItem({
  className,
  icon,
  shortcut,
  hint,
  children,
  ...props
}: CommandItemProps) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] outline-none select-none",
        "data-[selected=true]:bg-accent data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="grid min-w-0 flex-1">
        <span className="truncate">{children}</span>
        {hint && (
          <span className="truncate text-[11.5px] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      {shortcut && (
        <span className="flex gap-1">
          {shortcut.split(" ").map((k, i) => (
            <kbd
              key={i}
              className="grid h-5 min-w-5 place-items-center rounded-[5px] bg-muted px-1 font-sans text-[10.5px] text-foreground/70"
            >
              {k}
            </kbd>
          ))}
        </span>
      )}
    </CommandPrimitive.Item>
  )
}

export interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  placeholder?: string
  emptyText?: string
  /** Hint shown in the footer. */
  footer?: React.ReactNode
  children: React.ReactNode
}

export function CommandMenu({
  open,
  onOpenChange,
  // Les labels par défaut sont des PLACES DE DEMO : le consommateur
  // (l'app desktop) les remplace par sa propre donnée (les routes FR
  // de l'app, les actions du `agent`) — jamais un label anglais figé
  // (05 §2.5 : l'app est 100 % française, AD-17).
  placeholder = "Rechercher ou aller à…",
  emptyText = "Aucun résultat.",
  footer,
  children,
}: CommandMenuProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{ zIndex: LAYER.dialog }}
          className="fixed inset-0 bg-black/30 dark:bg-black/60 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0"
        />
        <DialogPrimitive.Content
          style={{ zIndex: LAYER.dialog }}
          aria-describedby={undefined}
          className={cn(
            "fixed top-[12dvh] left-1/2 w-[calc(100vw-24px)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-[16px] bg-popover shadow-2xl ring-1 ring-border outline-none",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:zoom-out-95",
            SQUIRCLE,
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Menu de commandes
          </DialogPrimitive.Title>
          <Command loop>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              {children}
            </CommandList>
            <div className="flex items-center gap-3 border-t border-border px-3.5 py-2 text-[11.5px] text-muted-foreground">
              {footer ?? (
                <>
                  <span>
                    <kbd className="font-sans">↑↓</kbd> pour naviguer
                  </span>
                  <span>
                    <kbd className="font-sans">↵</kbd> pour ouvrir
                  </span>
                  <span>
                    <kbd className="font-sans">esc</kbd> pour fermer
                  </span>
                </>
              )}
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { CommandMenu as Component }
