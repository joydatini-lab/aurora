/**
 * AppIcon — wrapper Lucide React monochrome (cat. 21st.dev §1.3.1).
 *
 * Les composants métier et le renderer de réponse Agent importent `AppIcon`,
 * jamais `lucide-react` directement. `name` est une clé sémantique du registre
 * `IconKey` ; le modèle Agent émet une `IconKey`, jamais un import arbitraire.
 *
 * Couleur : `currentColor` par défaut (hérité du texte). Les variantes `tone`
 * appliquent une couleur sémantique issue des CSS variables du thème
 * (`--success`, `--warning`, `--destructive`, `--muted-foreground`).
 */
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "src/lib/utils";

/**
 * Registre `IconKey` (cat. §1.3.1).
 * Le modèle Agent choisit une de ces clés ; la clé n'est qu'un index dans le
 * `Record` de Lucide qui garantit qu'aucune icône arbitraire ne passe.
 */
export type IconKey =
  | "summary" | "insight" | "source" | "citation"
  | "warning" | "success" | "error" | "info"
  | "task" | "project" | "calendar" | "timer" | "habit"
  | "chart" | "table" | "file" | "file-pdf" | "file-doc"
  | "image" | "audio" | "code" | "terminal" | "tool"
  | "approval" | "permission" | "copy" | "retry" | "open";

export type AppIconProps = {
  name: IconKey;
  size?: "xs" | "sm" | "md" | "lg";
  /** Couleur sémantique ; défaut = `currentColor` (hérité). */
  tone?: "default" | "muted" | "success" | "warning" | "danger";
  /**
   * Libellé accessible : requis si l'icône porte une action ou une information.
   * Passer `aria-hidden` pour une icône purement décorative (pas de libellé).
   */
  label?: string;
  "aria-hidden"?: true;
  className?: string;
};

const SIZE: Record<NonNullable<AppIconProps["size"]>, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
};

const TONE: Record<NonNullable<AppIconProps["tone"]>, string> = {
  default: "text-current",
  muted: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

/** Registre clé → composant Lucide (import sélectif, tree-shaking). */
const ICONS: Record<IconKey, LucideIcon> = {
  summary: Icons.ListTree,
  insight: Icons.Lightbulb,
  source: Icons.BookOpen,
  citation: Icons.Quote,
  warning: Icons.AlertTriangle,
  success: Icons.CheckCircle,
  error: Icons.XCircle,
  info: Icons.Info,
  task: Icons.CheckSquare,
  project: Icons.Folder,
  calendar: Icons.Calendar,
  timer: Icons.Timer,
  habit: Icons.Repeat,
  chart: Icons.BarChart3,
  table: Icons.Table,
  file: Icons.File,
  "file-pdf": Icons.FileText,
  "file-doc": Icons.File,
  image: Icons.Image,
  audio: Icons.Volume,
  code: Icons.Code,
  terminal: Icons.Terminal,
  tool: Icons.Wrench,
  approval: Icons.ShieldCheck,
  permission: Icons.Lock,
  copy: Icons.Copy,
  retry: Icons.RotateCw,
  open: Icons.ExternalLink,
};

export function AppIcon({
  name,
  size = "md",
  tone = "default",
  label,
  "aria-hidden": ariaHidden,
  className,
}: AppIconProps) {
  const Icon = ICONS[name];
  if (!Icon) return null;

  const ariaProps = ariaHidden
    ? { "aria-hidden": true as const }
    : label
      ? { "aria-label": label, role: "img" as const }
      : {};

  return (
    <Icon
      size={SIZE[size]}
      className={cn("shrink-0", TONE[tone], className)}
      {...ariaProps}
    />
  );
}
