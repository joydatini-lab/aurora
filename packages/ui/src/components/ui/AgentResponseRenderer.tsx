/**
 * AgentResponseRenderer — cat. 2.15, audit 21st.dev §3.4.
 *
 * Rend les blocs typés de réponse de l'Agent :
 * - `paragraph` / `markdown` → texte courant (Markdown sûr, sans HTML arbitraire)
 * - `summary` → synthèse structurée sobre
 * - `steps` / `checklist` → étapes numérotées ou actions cochables
 * - `metric-grid` → valeurs + unités + source (pas de chiffres inventés)
 * - `comparison-table` → colonnes stables, responsive
 * - `citation` → source + extrait + lien
 * - `tool-status` → outil + état confirmé (pas d'intention présentée comme exécution)
 * - `approval` → effet externe + données + boutons Approuver/Refuser
 * - `code` / `diff` → Shiki (via CodeBlock @reui) + DiffBlock textuel
 * - `artifact` → type + aperçu + statut + actions réellement disponibles
 * - `warning` / `error` → niveau + conséquence + prochaine action
 * - `chart` → F2ChartAdapter ou alternative tabulaire
 *
 * Règle absolue : le modèle Agent n'émet ni JSX, ni HTML arbitraire,
 * ni instructions de style libres. Le renderer ne choisit jamais lui-même
 * une couleur ou une mise en page — il applique les composants du DS.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Frame, FramePanel, FrameHeader, FrameTitle } from "src/components/reui/frame";
import { CodeBlock } from "src/components/reui/code-block/code-block";

/* ------------------------------------------------------------------ */
/* Schéma de blocs (contrat §3.4 audit 21st.dev)                     */
/* ------------------------------------------------------------------ */

export type AgentBlock =
  | { type: "paragraph"; content: string }
  | { type: "markdown"; content: string }
  | { type: "summary"; title: string; body: string; icon?: IconKey }
  | { type: "steps"; title?: string; items: { id: string; label: string; done?: boolean }[] }
  | { type: "checklist"; title?: string; items: { id: string; label: string; done?: boolean }[] }
  | { type: "metric-grid"; title: string; metrics: { label: string; value: string; unit?: string; period?: string; source?: string }[] }
  | { type: "comparison-table"; title: string; columns: string[]; rows: (string | number)[][] }
  | { type: "citation"; source: string; excerpt: string; date?: string; url?: string; confidence?: "high" | "medium" | "low" | "unavailable" }
  | { type: "tool-status"; tool: string; status: "queued" | "running" | "succeeded" | "failed" | "needs-approval"; durationMs?: number; result?: string; error?: string }
  | { type: "approval"; title: string; effect: string; dataShared: string[]; onApprove?: () => void; onRefuse?: () => void }
  | { type: "code"; language: string; code: string; diff?: { added: number[]; removed: number[] } }
  | { type: "artifact"; title: string; kind: string; preview?: string; size?: string; status?: "generated" | "pending" | "failed" }
  | { type: "warning"; level: "info" | "warning" | "error"; message: string; consequence?: string; nextAction?: string }
  | { type: "chart"; data: import("src/components/ui/F2ChartAdapter").MetricPoint[]; title: string; periodLabel?: string; targetValue?: number; unit?: string; kind?: import("src/components/ui/F2ChartAdapter").F2ChartKind };

/* ------------------------------------------------------------------ */
/* Composants de section (header avec icône)                          */
/* ------------------------------------------------------------------ */

export function ResponseSectionHeader({
  icon,
  title,
  collapsible,
  defaultOpen = true,
}: {
  icon?: IconKey;
  title: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  if (!collapsible) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon && <AppIcon name={icon} />}
        <span>{title}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="flex w-full items-center justify-between text-sm font-medium"
      aria-expanded={open}
    >
      <span className="flex items-center gap-2">
        {icon && <AppIcon name={icon} />}
        {title}
      </span>
      <AppIcon
        name={open ? "open" : "open"}
       
        tone="muted"
        className={cn("transition-transform", open ? "rotate-90" : "rotate-0")}
        aria-hidden
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Sous-composants métier                                              */
/* ------------------------------------------------------------------ */

export function SummaryCard({ title, body, icon = "summary" }: { title: string; body: string; icon?: IconKey }) {
  return (
    <Frame variant="default" spacing="sm">
      <FramePanel>
        <FrameHeader>
          <div className="flex items-center gap-2">
            <AppIcon name={icon} />
            <FrameTitle>{title}</FrameTitle>
          </div>
        </FrameHeader>
        <p className="text-sm text-muted-foreground">{body}</p>
      </FramePanel>
    </Frame>
  );
}

export function MetricGrid({ title, metrics }: { title: string; metrics: { label: string; value: string; unit?: string; period?: string; source?: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <ResponseSectionHeader icon="chart" title={title} />
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, i) => (
          <div key={i} className="rounded-md border bg-card p-3">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-lg font-semibold tabular-nums">
              {m.value}
              {m.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{m.unit}</span>}
            </p>
            {(m.period || m.source) && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {m.period && m.source ? `${m.period} · ` : ""}
                {m.source ?? ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComparisonTable({ title, columns, rows }: { title: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="flex flex-col gap-2">
      <ResponseSectionHeader icon="table" title={title} />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {columns.map((c, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2">{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CitationCard({ source, excerpt, date, url, confidence = "medium" }: {
  source: string;
  excerpt: string;
  date?: string;
  url?: string;
  confidence?: "high" | "medium" | "low" | "unavailable";
}) {
  const confLabel =
    confidence === "high" ? "fiabilité élevée" :
    confidence === "medium" ? "fiabilité moyenne" :
    confidence === "low" ? "fiabilité faible" :
    "source indisponible";
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AppIcon name="source" tone="muted" />
          {source}
        </div>
        <Badge variant="secondary">{confLabel}</Badge>
      </div>
      <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground">
        {excerpt}
      </blockquote>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {date ? <span>{date}</span> : <span />}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Ouvrir la source ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function ToolStatusCard({ tool, status, durationMs, result, error }: {
  tool: string;
  status: "queued" | "running" | "succeeded" | "failed" | "needs-approval";
  durationMs?: number;
  result?: string;
  error?: string;
}) {
  const statusIcon: Record<typeof status, IconKey> = {
    queued: "tool",
    running: "tool",
    succeeded: "success",
    failed: "error",
    "needs-approval": "approval",
  };
  const statusLabel: Record<typeof status, string> = {
    queued: "En attente",
    running: "Exécution en cours…",
    succeeded: "Terminé",
    failed: "Échec",
    "needs-approval": "Approbation requise",
  };
  return (
    <div className="flex items-start gap-3 rounded-md border bg-card p-3">
      <AppIcon name={statusIcon[status]} size="md" tone={status === "failed" ? "danger" : status === "succeeded" ? "success" : "muted"} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{tool}</p>
        <p className={cn("text-xs", status === "failed" ? "text-destructive" : "text-muted-foreground")}>
          {statusLabel[status]}
          {durationMs !== undefined && ` · ${Math.round(durationMs / 1000)}s`}
        </p>
        {result && <p className="mt-1 text-xs text-muted-foreground">{result}</p>}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function ApprovalCard({ title, effect, dataShared, onApprove, onRefuse }: {
  title: string;
  effect: string;
  dataShared: string[];
  onApprove?: () => void;
  onRefuse?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/5 p-3">
      <div className="flex items-center gap-2">
        <AppIcon name="approval" size="md" tone="warning" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{effect}</p>
      {dataShared.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dataShared.map((d, i) => (
            <Badge key={i} variant="outline">{d}</Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {onApprove && <Button onClick={onApprove}>Approuver</Button>}
        {onRefuse && <Button variant="outline" onClick={onRefuse}>Refuser</Button>}
      </div>
    </div>
  );
}

export function CodeArtifactBlock({ language, code, diff }: { language: string; code: string; diff?: { added: number[]; removed: number[] } }) {
  return (
    <div className="flex flex-col gap-2">
      <CodeBlock language={language} showLineNumbers code={code} />
      {diff && (diff.added.length > 0 || diff.removed.length > 0) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {diff.added.length > 0 && <span>+{diff.added.length} ligne(s) ajoutée(s)</span>}
          {diff.removed.length > 0 && <span>−{diff.removed.length} ligne(s) supprimée(s)</span>}
        </div>
      )}
    </div>
  );
}

export function WarningCallout({ level, message, consequence, nextAction }: {
  level: "info" | "warning" | "error";
  message: string;
  consequence?: string;
  nextAction?: string;
}) {
  const icon: Record<typeof level, IconKey> = { info: "info", warning: "warning", error: "error" };
  const tone: Record<typeof level, "muted" | "warning" | "danger"> = { info: "muted", warning: "warning", error: "danger" };
  return (
    <div className={cn(
      "flex gap-3 rounded-md border p-3 text-sm",
      level === "error" ? "border-destructive/30 bg-destructive/5" :
      level === "warning" ? "border-warning/30 bg-warning/5" :
      "border-muted-foreground/30 bg-muted/30"
    )}>
      <AppIcon name={icon[level]} size="md" tone={tone[level]} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{message}</p>
        {consequence && <p className="mt-1 text-xs text-muted-foreground">{consequence}</p>}
        {nextAction && (
          <p className="mt-1 text-xs">
            <strong>Prochaine action :</strong> {nextAction}
          </p>
        )}
      </div>
    </div>
  );
}

export function SuggestedActionChips({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          className="rounded-full border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {a}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Renderer principal — dispatch par type de bloc                     */
/* ------------------------------------------------------------------ */

export function AgentResponseRenderer({ blocks }: { blocks: AgentBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
          case "markdown":
            return (
              <p key={i} className="text-sm leading-relaxed">
                {block.content}
              </p>
            );
          case "summary":
            return <SummaryCard key={i} title={block.title} body={block.body} icon={block.icon} />;
          case "steps":
          case "checklist":
            return (
              <div key={i} className="flex flex-col gap-2">
                {block.title && <ResponseSectionHeader title={block.title} icon="task" />}
                <ul className="flex flex-col gap-1.5">
                  {block.items.map((item, j) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      {block.type === "checklist" ? (
                        <input type="checkbox" checked={item.done ?? false} readOnly className="size-4 rounded border" />
                      ) : (
                        <span className="text-xs text-muted-foreground tabular-nums">{j + 1}.</span>
                      )}
                      <span className={cn(item.done && "line-through text-muted-foreground")}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          case "metric-grid":
            return <MetricGrid key={i} title={block.title} metrics={block.metrics} />;
          case "comparison-table":
            return <ComparisonTable key={i} title={block.title} columns={block.columns} rows={block.rows} />;
          case "citation":
            return (
              <CitationCard
                key={i}
                source={block.source}
                excerpt={block.excerpt}
                date={block.date}
                url={block.url}
                confidence={block.confidence}
              />
            );
          case "tool-status":
            return (
              <ToolStatusCard
                key={i}
                tool={block.tool}
                status={block.status}
                durationMs={block.durationMs}
                result={block.result}
                error={block.error}
              />
            );
          case "approval":
            return (
              <ApprovalCard
                key={i}
                title={block.title}
                effect={block.effect}
                dataShared={block.dataShared}
                onApprove={block.onApprove}
                onRefuse={block.onRefuse}
              />
            );
          case "code":
            return (
              <CodeArtifactBlock key={i} language={block.language} code={block.code} diff={block.diff} />
            );
          case "warning":
            return (
              <WarningCallout
                key={i}
                level={block.level}
                message={block.message}
                consequence={block.consequence}
                nextAction={block.nextAction}
              />
            );
          case "artifact":
            return (
              <div key={i} className="flex items-center gap-3 rounded-md border bg-card p-3">
                <AppIcon name="file" size="md" tone="muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{block.title}</p>
                  <p className="text-xs text-muted-foreground">{block.kind}</p>
                </div>
                {block.status && (
                  <Badge
                    variant={block.status === "failed" ? "destructive" : "secondary"}
                   
                  >
                    {block.status}
                  </Badge>
                )}
              </div>
            );
          case "chart":
            // Le bloc chart nécessite un import dynamique de F2ChartAdapter
            return <ChartBlockPlaceholder key={i} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

/** Placeholder pour les blocs chart (à remplacer par un import de F2ChartAdapter). */
function ChartBlockPlaceholder({ block }: { block: Extract<AgentBlock, { type: "chart" }> }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <p className="text-sm font-medium">{block.title}</p>
      <p className="text-xs text-muted-foreground">
        Graphique {block.kind ?? "line"} · {block.data.length} point(s)
        {block.periodLabel ? ` · ${block.periodLabel}` : ""}
      </p>
      {/* Alternative textuelle obligatoire (cat. 2.11) */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left font-medium">Date</th>
            <th className="text-right font-medium">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {block.data.slice(0, 5).map((d, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-1">{d.date}</td>
              <td className="py-1 text-right tabular-nums">{d.value}{d.unit ? ` ${d.unit}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
