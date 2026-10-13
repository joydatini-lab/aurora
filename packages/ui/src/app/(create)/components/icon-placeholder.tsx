"use client"
import type { ReactNode } from "react"

type IconPlaceholderProps = {
  lucide?: string
  tabler?: string
  hugeicons?: string
  phosphor?: string
  remixicon?: string
  children?: ReactNode
  "aria-hidden"?: boolean | string
  className?: string
} & Record<string, unknown>

/**
 * Icône placeholder — rend l'enfant ou un bloc neutre.
 * Accepte les props d'icône des registres ReUI (lucide, tabler, etc.)
 * et les prop typiques ARIA. Les icônes réelles ne sont pas résolues ici :
 * en mode Aurora on les importera via l'icône correspondante (Lucide par défaut).
 */
export function IconPlaceholder({
  children,
  "aria-hidden": ariaHidden,
  className,
}: IconPlaceholderProps) {
  return (
    <span
      aria-hidden={ariaHidden === true || ariaHidden === "true" || (ariaHidden !== undefined && ariaHidden !== "false")}
      className={className}
    >
      {children}
    </span>
  )
}
