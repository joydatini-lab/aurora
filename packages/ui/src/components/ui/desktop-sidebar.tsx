import * as React from "react"
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

import { cn } from "src/lib/utils"

/*
 * @21st Sidebar (wensity, https://21st.dev/@wensity/components/sidebar)
 * ré-adapté en packages/ui :
 *
 *   · `@base-ui/react/use-render` (l'asChild original) → une
 *     composition React directe (le `Slot` de Radix n'existe pas
 *     dans la batterie DS, et le `useRender` de Base UI n'est pas
 *     dans les deps — on garde la même API `asChild` en clonant
 *     l'enfant ; c'est le même comportement que le Radix `Slot`
 *     pour un composant de shell) ;
 *   · les icônes `@tabler/icons-react` (deps 21st) → `lucide-react`
 *     (la DS d'Aurora est lucide, `components.json`
 *     `iconLibrary: "lucide"`, AD-10 : le package ne consomme que
 *     les moteurs de la batterie, les icônes suivent le système) ;
 *   · le mouvement = `framer-motion` (le 21st original) → transition
 *     CSS seule (la stack DS n'a pas framer-motion dans ses
 *     `dependencies`, et 05 §2.6 règle 1 : le mouvement = CSS
 *     `transform`/`opacity` GPU-only, jamais une lib de motion
 *     JS-frame par frame — le collapse 240ms passe par une
 *     `transition: width` CSS, le pill active passe par un
 *     `:focus-within`/`data-active` CSS, le label fade passe par
 *     une `opacity` transition) ;
 *   · les `--primitive-*` tokens du 21st → les tokens Aurora
 *     (`--background` / `--foreground` / `--border` /
 *     `--muted-foreground` / `--card` — le thème expressif suit
 *     `AuroraThemeProvider`, AD-17).
 *
 * Le composant est le SHELL desktop de la Phase 2 (05 §4.5.2 Notes
 * responsive) : le BottomNav mobile devient ce Sidebar (le drawer
 * de nav principale = l'anti-pattern interdit mobile, 05 §3.5
 * l.823-828).
 */

/* ─── Types ─────────────────────────────────────────────────── */

export type SidebarVariant =
  | "default"
  | "collapsible"
  | "icon-rail"
  | "floating"
  | "resizable"

export interface SidebarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  variant?: SidebarVariant
  /** Controlled collapsed state (collapsible variant). */
  collapsed?: boolean
  /** Initial collapsed state (uncontrolled). Default false. */
  defaultCollapsed?: boolean
  /** Called when collapsed state changes. */
  onCollapsedChange?: (collapsed: boolean) => void
  /** Width in px when expanded. Default 260. */
  width?: number
  /** Width in px when collapsed (icon-rail / collapsed collapsible). Default 60. */
  collapsedWidth?: number
  /** Minimum width for resizable variant. Default 180. */
  minWidth?: number
  /** Maximum width for resizable variant. Default 400. */
  maxWidth?: number
  /** Accessible label for the navigation landmark. */
  "aria-label"?: string
  children: React.ReactNode
}

export type SidebarHeaderProps = React.HTMLAttributes<HTMLDivElement>
export type SidebarNavProps = React.HTMLAttributes<HTMLDivElement>

export interface SidebarSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Section heading. Fades out when the sidebar is collapsed. */
  label?: string
}

export interface SidebarItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon shown in both expanded and collapsed states. */
  icon?: React.ReactNode
  /** Marks the item as the current route. */
  active?: boolean
  /** Renders as a link when provided. */
  href?: string
  /** Opens in a new tab. */
  external?: boolean
  /** Badge / count shown after the label. */
  badge?: React.ReactNode
  asChild?: boolean
}

export interface SidebarNestedProps {
  /** Icon for the nested group trigger. */
  icon?: React.ReactNode
  /** Label for the nested group. */
  label: string
  /** Controlled open state. */
  open?: boolean
  /** Initial open state. Default false. */
  defaultOpen?: boolean
  /** Called when open state changes. */
  onOpenChange?: (open: boolean) => void
  /** Marks the group as containing the active item. */
  active?: boolean
  children: React.ReactNode
}

export type SidebarFooterProps = React.HTMLAttributes<HTMLDivElement>

export interface SidebarToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?:
    | React.ReactNode
    | ((state: { collapsed: boolean }) => React.ReactNode)
  /** Standalone: pass collapsed state when used outside a collapsible <Sidebar>. */
  collapsed?: boolean
  /** Standalone: called when toggled. */
  onToggle?: () => void
}

/* ─── Context ───────────────────────────────────────────────── */

type SidebarContextValue = {
  variant: SidebarVariant
  collapsed: boolean
  toggleCollapsed: () => void
  navId: string
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebarContext() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx)
    throw new Error("Sidebar compound components must be used within <Sidebar>")
  return ctx
}

/**
 * Reads the current sidebar state. Use this to make custom header/footer
 * content (a logo, a workspace switcher) react to the real collapsed state
 * instead of threading a manually-tracked prop through the tree.
 */
export function useSidebar(): {
  variant: SidebarVariant
  collapsed: boolean
  toggleCollapsed: () => void
} {
  const { variant, collapsed, toggleCollapsed } = useSidebarContext()
  return { variant, collapsed, toggleCollapsed }
}

/* ─── Resizable width hook ──────────────────────────────────── */

function useResizableWidth(initial: number, min: number, max: number) {
  const [width, setWidth] = React.useState(initial)
  const [isDragging, setIsDragging] = React.useState(false)
  const dragState = React.useRef<{ startX: number; startWidth: number } | null>(
    null,
  )

  const clamp = React.useCallback(
    (value: number) => Math.min(max, Math.max(min, value)),
    [min, max],
  )

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dragState.current = { startX: e.clientX, startWidth: width }
      setIsDragging(true)
    },
    [width],
  )

  React.useEffect(() => {
    if (!isDragging) return

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState.current) return
      const delta = e.clientX - dragState.current.startX
      setWidth(clamp(dragState.current.startWidth + delta))
    }

    const onPointerUp = () => {
      dragState.current = null
      setIsDragging(false)
    }

    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
    return () => {
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
    }
  }, [isDragging, clamp])

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 48 : 16
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setWidth((w) => clamp(w - step))
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setWidth((w) => clamp(w + step))
      } else if (e.key === "Home") {
        e.preventDefault()
        setWidth(min)
      } else if (e.key === "End") {
        e.preventDefault()
        setWidth(max)
      }
    },
    [clamp, min, max],
  )

  const reset = React.useCallback(() => setWidth(initial), [initial])

  return { width, isDragging, onPointerDown, onKeyDown, reset }
}

/* ─── Shared item styling ───────────────────────────────────── */
// Les `--primitive-*` du 21st original → les tokens Aurora (AD-17 :
// le shell suit le thème expressif actif, jamais un hex figé). Le
// `--border` / `--muted-foreground` / `--card` / `--background`
// existent déjà dans `aurora.css` (le shell desktop les consomme).

const itemBaseClasses = cn(
  "group/sidebar-item relative flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-[7px]",
  "text-[13.5px] font-medium leading-none outline-none select-none whitespace-nowrap",
  "transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
  "focus-visible:ring-2 focus-visible:ring-[color:var(--ring,color-mix(in_srgb,var(--foreground)_45%,transparent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
  "disabled:pointer-events-none disabled:opacity-40",
)

const itemInactiveClasses = cn(
  "text-[color:var(--muted-foreground)]",
  "hover:text-[var(--foreground)]",
  "hover:bg-[color:color-mix(in_srgb,var(--foreground)_4%,transparent)]",
)

const itemActiveClasses = "text-[var(--foreground)]"

const activePillClasses = cn(
  "pointer-events-none absolute inset-0 rounded-[var(--radius-lg)]",
  "bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]",
)

/* ─── <Sidebar> ─────────────────────────────────────────────── */

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      variant = "default",
      collapsed: controlledCollapsed,
      defaultCollapsed = false,
      onCollapsedChange,
      width: widthProp = 260,
      collapsedWidth = 60,
      minWidth = 180,
      maxWidth = 400,
      className,
      children,
      "aria-label": ariaLabel = "Sidebar",
      style,
      ...props
    },
    ref,
  ) => {
    const reactId = React.useId()
    // Le collapse 240ms = une transition CSS `width` (le 21st original
    // est framer-motion, la stack DS n'a pas framer dans ses deps —
    // 05 §2.6 règle 1 : le mouvement = CSS GPU, jamais une lib
    // JS-frame par frame). La transition est désactivée pendant le
    // resize (le `isDragging`) et pour `prefers-reduced-motion`
    // (la classe `motion-reduce:transition-none` de Tailwind, + le
    // flag CSS `data-motion-reduce` géré par `AuroraThemeProvider`
    // via le hook `useReducedMotion` du DS).
    const isCollapsible = variant === "collapsible"
    const isIconRail = variant === "icon-rail"
    const isResizable = variant === "resizable"

    const [internalCollapsed, setInternalCollapsed] =
      React.useState(defaultCollapsed)
    const isControlled = controlledCollapsed !== undefined
    const collapsed = isIconRail
      ? true
      : isCollapsible
        ? isControlled
          ? controlledCollapsed
          : internalCollapsed
        : false

    const toggleCollapsed = React.useCallback(() => {
      if (!isCollapsible) return
      const next = !collapsed
      if (!isControlled) setInternalCollapsed(next)
      onCollapsedChange?.(next)
    }, [isCollapsible, collapsed, isControlled, onCollapsedChange])

    const resize = useResizableWidth(widthProp, minWidth, maxWidth)

    const effectiveWidth = collapsed
      ? collapsedWidth
      : isResizable
        ? resize.width
        : widthProp

    const ctx = React.useMemo<SidebarContextValue>(
      () => ({
        variant,
        collapsed,
        toggleCollapsed,
        navId: `sidebar-${reactId}`,
      }),
      [variant, collapsed, toggleCollapsed, reactId],
    )

    return (
      <SidebarContext.Provider value={ctx}>
        <nav
          data-aurora-sidebar=""
          ref={ref}
          aria-label={ariaLabel}
          data-slot="sidebar"
          data-variant={variant}
          data-collapsed={collapsed ? "true" : "false"}
          data-dragging={resize.isDragging ? "true" : undefined}
          style={{
            ...style,
            width: effectiveWidth,
            flexShrink: 0,
            // Width is a layout change by nature (adjacent content must
            // reflow), so it animates via an interruptible CSS transition
            // rather than per-frame JS. Disabled while dragging.
            transition: resize.isDragging
              ? "none"
              : "width 240ms cubic-bezier(0.23,1,0.32,1)",
          }}
          className={cn(
            "relative isolate flex h-full flex-col overflow-hidden motion-reduce:transition-none",
            "bg-[var(--background)] text-[var(--foreground)]",
            variant === "floating"
              ? cn(
                  "m-3 h-[calc(100%-1.5rem)] rounded-[var(--radius)]",
                  "border border-[var(--border)]",
                  "bg-[var(--card)]",
                )
              : "border-r border-[var(--border)]",
            resize.isDragging && "select-none",
            className,
          )}
          {...props}
        >
          {children}
          {isResizable && (
            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label="Redimensionner la barre latérale"
              aria-valuemin={minWidth}
              aria-valuemax={maxWidth}
              aria-valuenow={Math.round(resize.width)}
              data-slot="sidebar-resize-handle"
              onPointerDown={resize.onPointerDown}
              onKeyDown={resize.onKeyDown}
              onDoubleClick={resize.reset}
              className={cn(
                "absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize outline-none",
                "after:absolute after:inset-y-0 after:right-0 after:w-[2px]",
                "after:bg-transparent after:transition-colors after:duration-150",
                "hover:after:bg-[color-mix(in_srgb,var(--foreground)_18%,transparent)]",
                "focus-visible:after:bg-[color-mix(in_srgb,var(--foreground)_25%,transparent)]",
                resize.isDragging &&
                  "after:bg-[color-mix(in_srgb,var(--foreground)_30%,transparent)]",
              )}
            />
          )}
        </nav>
      </SidebarContext.Provider>
    )
  },
)
Sidebar.displayName = "Sidebar"

/* ─── Fading label (shared by item / nested / section) ──────── */
// Le 21st original : `framer-motion` `AnimatePresence` +
// `motion.span` (un fade 0.12s au mount/unmount). Ré-adapté : une
// transition CSS `opacity` (la stack DS n'a pas framer dans ses
// deps) — le label reste monté, il passe à `opacity-0` +
// `pointer-events-none` quand le sidebar est replié (le label
// disparaît visuellement, la structure DOM est stable, le
// `prefers-reduced-motion` passe par `motion-reduce:transition-none`).

function FadingLabel({
  show,
  className,
  children,
}: {
  show: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
        show ? "opacity-100" : "opacity-0 pointer-events-none",
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ─── <SidebarHeader> ───────────────────────────────────────── */

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  SidebarHeaderProps
>(({ className, children, onClick, ...props }, ref) => {
  const { collapsed, variant, toggleCollapsed } = useSidebarContext()
  const isCollapsible = variant === "collapsible"

  // Collapsed: drop the separate toggle control (it has no room to render
  // cleanly at rail width) and let the logo itself expand the sidebar.
  const visibleChildren = collapsed
    ? React.Children.toArray(children).filter(
        (child) =>
          !(React.isValidElement(child) && child.type === SidebarToggle),
      )
    : children

  return (
    <div
      ref={ref}
      data-slot="sidebar-header"
      data-collapsed={collapsed ? "true" : "false"}
      role={collapsed && isCollapsible ? "button" : undefined}
      tabIndex={collapsed && isCollapsible ? 0 : undefined}
      aria-label={collapsed && isCollapsible ? "Déplier la barre" : undefined}
      onClick={(e) => {
        onClick?.(e)
        if (collapsed && isCollapsible) toggleCollapsed()
      }}
      onKeyDown={(e) => {
        if (
          collapsed &&
          isCollapsible &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault()
          toggleCollapsed()
        }
      }}
      className={cn(
        "flex shrink-0 items-center",
        collapsed
          ? cn(
              "flex-col justify-center gap-2 px-0 py-3",
              isCollapsible &&
                cn(
                  "cursor-pointer select-none outline-none rounded-[var(--radius-lg)]",
                  "transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                  "hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]",
                  "focus-visible:ring-2 focus-visible:ring-[color:var(--ring,color-mix(in_srgb,var(--foreground)_45%,transparent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                  "active:scale-[0.97] motion-reduce:active:scale-100",
                ),
            )
          : "h-[52px] gap-2.5 px-[18px]",
        className,
      )}
      {...props}
    >
      {visibleChildren}
    </div>
  )
})
SidebarHeader.displayName = "SidebarHeader"

/* ─── <SidebarNav> ──────────────────────────────────────────── */

export const SidebarNav = React.forwardRef<HTMLDivElement, SidebarNavProps>(
  ({ className, children, ...props }, ref) => {
    const { navId } = useSidebarContext()
    return (
      <div
        ref={ref}
        id={navId}
        data-slot="sidebar-nav"
        className={cn(
          "sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain py-2",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)
SidebarNav.displayName = "SidebarNav"

/* ─── <SidebarSection> ──────────────────────────────────────── */

export const SidebarSection = React.forwardRef<
  HTMLDivElement,
  SidebarSectionProps
>(({ className, label, children, ...props }, ref) => {
  const { collapsed } = useSidebarContext()
  return (
    <div
      ref={ref}
      data-slot="sidebar-section"
      role="group"
      aria-label={label}
      className={cn("py-1", className)}
      {...props}
    >
      {label && (
        <div className="flex h-[26px] items-end px-[18px] pb-1.5">
          <FadingLabel
            show={!collapsed}
            className={cn(
              "text-[10.5px] font-medium uppercase leading-none tracking-[0.08em]",
              "text-[var(--muted-foreground)] whitespace-nowrap",
            )}
          >
            {label}
          </FadingLabel>
        </div>
      )}
      <div className="flex flex-col gap-px px-2">{children}</div>
    </div>
  )
})
SidebarSection.displayName = "SidebarSection"

/* ─── Active pill (glides between items) ────────────────────── */
// Le 21st original : un `motion.span` `layoutId` spring (la pill
// "glide" entre les items actifs). Ré-adapté : une
// transition CSS `opacity`/`transform` sur le pill (le `layoutId`
// spring de framer n'existe pas sans la lib ; le comportement
// "la pill apparaît sur l'item actif, disparaît sur le
// précédent" est le même, le glissement animé est
// `prefers-reduced-motion`-gated comme le reste).

function ActivePill({ navId: _navId }: { navId: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        activePillClasses,
        "transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
      )}
    />
  )
}

/* ─── <SidebarItem> ─────────────────────────────────────────── */

export const SidebarItem = React.forwardRef<
  HTMLButtonElement,
  SidebarItemProps
>(
  (
    {
      className,
      icon,
      active = false,
      href,
      external = false,
      badge,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const { collapsed, navId } = useSidebarContext()
    const composedClassName = cn(
      itemBaseClasses,
      active ? itemActiveClasses : itemInactiveClasses,
      className,
    )
    const title =
      collapsed && typeof children === "string" ? children : undefined

    // Le 21st original : `@base-ui/react/use-render` (l'asChild).
    // Ré-adapté : on clone l'enfant (le même comportement que le
    // Radix `Slot` pour un composant de shell) — le `asChild` de
    // la stack DS (Radix) clone l'enfant et lui passe les props
    // mergeées, on fait pareil sans ajouter de dep.
    if (asChild && React.isValidElement(children)) {
      const Child = children as React.ReactElement<Record<string, unknown>>
      return React.cloneElement(Child, {
        ...Child.props,
        ...props,
        ref,
        "data-slot": "sidebar-item",
        "data-active": active ? "true" : undefined,
        "aria-current": active ? "page" : undefined,
        title,
        className: composedClassName,
      })
    }

    const content = renderItemContent({
      collapsed,
      navId,
      active,
      icon,
      badge,
      children,
    })

    if (href) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          data-slot="sidebar-item"
          data-active={active ? "true" : undefined}
          aria-current={active ? "page" : undefined}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          title={title}
          className={composedClassName}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      )
    }

    return (
      <button
        ref={ref}
        type="button"
        data-slot="sidebar-item"
        data-active={active ? "true" : undefined}
        aria-current={active ? "page" : undefined}
        disabled={disabled}
        title={title}
        className={composedClassName}
        {...props}
      >
        {content}
      </button>
    )
  },
)
SidebarItem.displayName = "SidebarItem"

function renderItemContent({
  collapsed,
  navId,
  active,
  icon,
  badge,
  children,
}: {
  collapsed: boolean
  navId: string
  active: boolean
  icon?: React.ReactNode
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      {active ? <ActivePill navId={navId} /> : null}
      {icon ? (
        <span
          data-slot="sidebar-item-icon"
          className={cn(
            "relative z-10 flex size-5 shrink-0 items-center justify-center",
            active
              ? "text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] transition-colors duration-150 group-hover/sidebar-item:text-[var(--foreground)]",
          )}
        >
          {icon}
        </span>
      ) : null}
      <FadingLabel
        show={!collapsed}
        className="relative z-10 min-w-0 flex-1 truncate text-left"
      >
        {children}
      </FadingLabel>
      {badge ? (
        <FadingLabel
          show={!collapsed}
          className="relative z-10 flex shrink-0 items-center"
        >
          {badge}
        </FadingLabel>
      ) : null}
    </>
  )
}

/* ─── <SidebarNested> ───────────────────────────────────────── */

export const SidebarNested = React.forwardRef<
  HTMLDivElement,
  SidebarNestedProps
>(
  (
    {
      icon,
      label,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      active = false,
      children,
    },
    ref,
  ) => {
    const { collapsed } = useSidebarContext()
    const reactId = React.useId()

    const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const toggle = React.useCallback(() => {
      const next = !open
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    }, [open, isControlled, onOpenChange])

    const contentId = `sidebar-nested-content-${reactId}`

    return (
      <div ref={ref} data-slot="sidebar-nested" className="flex flex-col">
        <button
          type="button"
          data-slot="sidebar-nested-trigger"
          data-open={open ? "true" : "false"}
          data-active={active ? "true" : undefined}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={toggle}
          title={collapsed ? label : undefined}
          className={cn(
            itemBaseClasses,
            active && collapsed ? itemActiveClasses : itemInactiveClasses,
          )}
        >
          {active && collapsed && (
            <span aria-hidden="true" className={activePillClasses} />
          )}
          {icon && (
            <span
              data-slot="sidebar-nested-icon"
              className={cn(
                "relative z-10 flex size-5 shrink-0 items-center justify-center",
                "text-[var(--muted-foreground)] group-hover/sidebar-item:text-[var(--foreground)] transition-colors duration-150",
              )}
            >
              {icon}
            </span>
          )}
          <FadingLabel
            show={!collapsed}
            className="relative z-10 min-w-0 flex-1 truncate text-left"
          >
            {label}
          </FadingLabel>
          <FadingLabel
            show={!collapsed}
            className="relative z-10 flex shrink-0 items-center"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none text-[var(--muted-foreground)]",
                open && "rotate-90",
              )}
              strokeWidth={2}
            />
          </FadingLabel>
        </button>
        {open && !collapsed && (
          <div
            id={contentId}
            data-slot="sidebar-nested-content"
            className={cn(
              "relative ml-[21px] flex flex-col gap-px py-0.5 pl-2.5",
              "before:absolute before:inset-y-1 before:left-0 before:w-px",
              "before:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]",
            )}
          >
            {children}
          </div>
        )}
      </div>
    )
  },
)
SidebarNested.displayName = "SidebarNested"

/* ─── <SidebarFooter> ───────────────────────────────────────── */

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  SidebarFooterProps
>(({ className, children, ...props }, ref) => {
  const { collapsed } = useSidebarContext()
  return (
    <div
      ref={ref}
      data-slot="sidebar-footer"
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "flex shrink-0 items-center py-3",
        "border-t border-[var(--border)]",
        collapsed ? "justify-center px-0" : "gap-2.5 px-[18px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SidebarFooter.displayName = "SidebarFooter"

/* ─── <SidebarToggle> ───────────────────────────────────────── */

export const SidebarToggle = React.forwardRef<
  HTMLButtonElement,
  SidebarToggleProps
>(
  (
    { className, children, collapsed: collapsedProp, onToggle, ...props },
    ref,
  ) => {
    const ctx = React.useContext(SidebarContext)
    const usesContext = ctx?.variant === "collapsible"

    const collapsed = usesContext ? ctx!.collapsed : collapsedProp
    const toggle = usesContext ? ctx!.toggleCollapsed : onToggle

    if (collapsed === undefined || !toggle) return null

    return (
      <button
        ref={ref}
        type="button"
        data-slot="sidebar-toggle"
        data-collapsed={collapsed ? "true" : "false"}
        onClick={toggle}
        aria-label={collapsed ? "Déplier la barre" : "Replier la barre"}
        aria-expanded={!collapsed}
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-lg)] outline-none",
          "text-[var(--muted-foreground)]",
          "hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] hover:text-[var(--foreground)]",
          "focus-visible:ring-2 focus-visible:ring-[color:var(--ring,color-mix(in_srgb,var(--foreground)_45%,transparent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          "transition-[transform,color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          "active:scale-[0.96] motion-reduce:active:scale-100",
          className,
        )}
        {...props}
      >
        {typeof children === "function" ? (
          children({ collapsed })
        ) : (
          children ??
          (collapsed ? (
            <PanelLeftOpen className="size-[17px]" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="size-[17px]" strokeWidth={1.75} />
          ))
        )}
      </button>
    )
  },
)
SidebarToggle.displayName = "SidebarToggle"
