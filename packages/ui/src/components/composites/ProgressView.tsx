/**
 * ProgressView — vue de progression (cat. 2.10, 4.10).
 *
 * Étape 2 (muet) : reçoit `ProgressViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.10) :
 * - `ProgressHeader` (titre + période + sélecteur de période)
 * - `KPIStatTile` (4 tuiles KPI : score, balance, écart vs objectif, cause top)
 * - `MetricSelector` (choix de la métrique affichée dans le chart)
 * - `ChartFrame` (encadrement du `F2ChartAdapter` : état chargement / erreur / vide)
 * - `ProgressTimeSeriesChart` (gagne le `F2ChartAdapter`)
 * - `ChartDataTable` (données tabulaires sous le chart)
 * - `BreakdownTable` (répartition par catégorie)
 *
 * Le chart lui-même est fourni par le conteneur parent via `ChartFrame`,
 * car `F2ChartAdapter` est un composant de la couche UI qui ne dépend que de
 * `MetricPoint[]`.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { /* Badge */ } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import {
  F2ChartAdapter,
  type F2ChartKind,
  type MetricPoint,
} from "src/components/ui/F2ChartAdapter";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type ProgressPeriod = "week" | "month" | "quarter" | "year";

export interface KPIStat {
  id: string;
  label: string;
  value: string;
  unit?: string;
  /** Tendance vs période précédente. */
  delta?: number;
  /** Libellé de tendance ("+2 pts"). */
  deltaLabel?: string;
  /** Icone. */
  icon: IconKey;
  /** Ton sémantique de la valeur. */
  tone?: "default" | "success" | "warning" | "danger";
}

export interface BreakdownRow {
  id: string;
  label: string;
  value: number;
  /** Pourcentage de l'ensemble (0-100). */
  pct: number;
  /** Couleur d'accent (catégorie). */
  color?: string;
  /** Valeur précédente (pour delta). */
  previous?: number;
}

export interface ProgressViewData {
  /** Titre de la vue ("Progression"). */
  title: string;
  /** Période courante. */
  period: ProgressPeriod;
  /** Libellé de période ("Ce mois-ci"). */
  periodLabel: string;
  /** KPI à afficher (max 4). */
  kpis: KPIStat[];
  /** Séries du chart (1 ou plusieurs, `series` distingue). */
  chartData: MetricPoint[];
  /** Type de chart (line/area/bar/column). */
  chartKind: F2ChartKind;
  /** Métriques disponibles (pour le sélecteur). */
  metrics: string[];
  /** Métrique courante. */
  activeMetric: string;
  /** Lignes de la table de data. */
  dataRows: MetricPoint[];
  /** Répartition par catégorie. */
  breakdown: BreakdownRow[];
}

export interface ProgressViewProps {
  data: ProgressViewData;
  onPeriodChange: (p: ProgressPeriod) => void;
  onMetricChange: (m: string) => void;
  /** Appelé quand le chart est prêt / erreur. */
  onChartStateChange?: (state: "loading" | "error" | "ready") => void;
  /** État de chargement du chart. */
  chartLoading?: boolean;
  /** Erreur du chart. */
  chartError?: string | null;
  /** Appelé pour exporter / consulter. */
  onExport?: () => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* ProgressHeader                                                      */
/* ------------------------------------------------------------------ */

const PERIODS: { key: ProgressPeriod; label: string }[] = [
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "quarter", label: "Trimestre" },
  { key: "year", label: "Année" },
];

export interface ProgressHeaderProps {
  title: string;
  periodLabel: string;
  period: ProgressPeriod;
  onPeriodChange: (p: ProgressPeriod) => void;
  onExport?: () => void;
  className?: string;
}

export function ProgressHeader({
  title,
  periodLabel,
  period,
  onPeriodChange,
  onExport,
  className,
}: ProgressHeaderProps) {
  return (
    <div
      data-slot="progress-header"
      className={cn(
        "flex flex-col gap-2.5 border-b pb-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1 rounded-md border p-0.5"
          role="tablist"
          aria-label="Période"
        >
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              variant={period === p.key ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2 text-xs",
                period !== p.key && "text-muted-foreground"
              )}
              onClick={() => onPeriodChange(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {onExport && (
          <Button variant="outline" size="sm" className="h-7" onClick={onExport}>
            <AppIcon name="open" size="xs" aria-hidden />
            Exporter
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KPIStatTile                                                         */
/* ------------------------------------------------------------------ */

export function KPIStatTile({
  kpi,
  className,
}: {
  kpi: KPIStat;
  className?: string;
}) {
  const deltaPositive = (kpi.delta ?? 0) >= 0;
  return (
    <div
      data-slot="kpi-stat-tile"
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border bg-card p-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {kpi.label}
        </span>
        <AppIcon
          name={kpi.icon}
          size="xs"
          tone={kpi.tone === "danger" ? "danger" : kpi.tone === "warning" ? "warning" : kpi.tone === "success" ? "success" : "muted"}
          aria-hidden
        />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">
          {kpi.value}
        </span>
        {kpi.unit && (
          <span className="text-xs text-muted-foreground">{kpi.unit}</span>
        )}
      </div>
      {kpi.deltaLabel && (
        <span
          className={cn(
            "text-[11px] font-medium tabular-nums",
            deltaPositive ? "text-success" : "text-destructive"
          )}
        >
          {deltaPositive ? "▲" : "▼"} {kpi.deltaLabel}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MetricSelector                                                      */
/* ------------------------------------------------------------------ */

export interface MetricSelectorProps {
  metrics: string[];
  value: string;
  onChange: (m: string) => void;
  className?: string;
}

export function MetricSelector({
  metrics,
  value,
  onChange,
  className,
}: MetricSelectorProps) {
  return (
    <div
      data-slot="metric-selector"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {metrics.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={value === m}
          className={cn(
            "rounded-full border px-3 py-0.5 text-xs transition-colors",
            value === m
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ChartFrame                                                          */
/* ------------------------------------------------------------------ */

export interface ChartFrameProps {
  /** Titre du chart (optionnel). */
  title?: string;
  /** Sous-titre (métrique courante). */
  subtitle?: string;
  /** État de chargement. */
  loading?: boolean;
  /** Erreur. */
  error?: string | null;
  /** Données vides. */
  isEmpty?: boolean;
  /** Enfant (le `F2ChartAdapter`). */
  children: React.ReactNode;
  /** Appelé pour réessayer. */
  onRetry?: () => void;
  className?: string;
}

export function ChartFrame({
  title,
  subtitle,
  loading,
  error,
  isEmpty,
  children,
  onRetry,
  className,
}: ChartFrameProps) {
  return (
    <div
      data-slot="chart-frame"
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4",
        className
      )}
    >
      {(title || subtitle) && (
        <div className="flex items-start justify-between gap-2">
          <div>
            {title && (
              <h3 className="text-sm font-semibold">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md bg-muted/30">
          <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          <span className="text-xs text-muted-foreground">
            Chargement du graphique…
          </span>
        </div>
      ) : error ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md bg-muted/30">
          <AppIcon name="error" size="lg" tone="danger" aria-hidden />
          <p className="text-sm text-muted-foreground">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="h-7" onClick={onRetry}>
              Réessayer
            </Button>
          )}
        </div>
      ) : isEmpty ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md bg-muted/30">
          <AppIcon name="chart" size="lg" tone="muted" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Aucune donnée pour cette période
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ChartDataTable                                                      */
/* ------------------------------------------------------------------ */

export interface ChartDataTableProps {
  rows: MetricPoint[];
  className?: string;
}

export function ChartDataTable({ rows, className }: ChartDataTableProps) {
  if (rows.length === 0) return null;
  return (
    <div
      data-slot="chart-data-table"
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        className
      )}
    >
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Date</th>
            <th className="px-3 py-2 text-left font-medium">Série</th>
            <th className="px-3 py-2 text-right font-medium">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 tabular-nums">
                {new Date(r.date).toLocaleDateString("fr-FR")}
              </td>
              <td className="px-3 py-2">{r.series ?? r.metric}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.value}
                {r.unit ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {r.unit}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BreakdownTable                                                      */
/* ------------------------------------------------------------------ */

export interface BreakdownTableProps {
  rows: BreakdownRow[];
  /** Libellé du total. */
  totalLabel?: string;
  className?: string;
}

export function BreakdownTable({
  rows,
  totalLabel = "Total",
  className,
}: BreakdownTableProps) {
  const totalValue = rows.reduce((acc, r) => acc + r.value, 0);
  return (
    <div
      data-slot="breakdown-table"
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        className
      )}
    >
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Catégorie</th>
            <th className="px-3 py-2 text-right font-medium">Valeur</th>
            <th className="px-3 py-2 text-right font-medium">Part</th>
            <th className="px-3 py-2 text-right font-medium">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const delta = row.previous !== undefined ? row.value - row.previous : undefined;
            return (
              <tr key={row.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {row.color && (
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />
                    )}
                    {row.label}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.value}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                      {row.pct}%
                    </span>
                  </div>
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums",
                    delta === undefined
                      ? "text-muted-foreground"
                      : delta > 0
                        ? "text-success"
                        : delta < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                  )}
                >
                  {delta === undefined
                    ? "—"
                    : delta > 0
                      ? `+${delta}`
                      : delta}
                </td>
              </tr>
            );
          })}
          {totalValue > 0 && (
            <tr className="border-t font-medium">
              <td className="px-3 py-2">{totalLabel}</td>
              <td className="px-3 py-2 text-right tabular-nums">{totalValue}</td>
              <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                100%
              </td>
              <td className="px-3 py-2" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function ProgressView({
  data,
  onPeriodChange,
  onMetricChange,
  /* onChartStateChange, */
  chartLoading,
  chartError,
  onExport,
  className,
}: ProgressViewProps) {
  const filteredData = data.chartData.filter(
    (d) => d.metric === data.activeMetric || !d.metric
  );

  return (
    <div
      data-slot="progress-view"
      className={cn("flex flex-col gap-5", className)}
    >
      <ProgressHeader
        title={data.title}
        periodLabel={data.periodLabel}
        period={data.period}
        onPeriodChange={onPeriodChange}
        onExport={onExport}
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KPIStatTile key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Chart */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <MetricSelector
            metrics={data.metrics}
            value={data.activeMetric}
            onChange={onMetricChange}
          />
        </div>
        <ChartFrame
          title="Évolution"
          subtitle={data.activeMetric}
          loading={chartLoading}
          error={chartError ?? null}
          isEmpty={filteredData.length === 0}
          onRetry={onExport}
        >
          <F2ChartAdapter
            data={filteredData}
            kind={data.chartKind}
            title={data.activeMetric}
            periodLabel={data.periodLabel}
            height={280}
            isLoading={chartLoading}
            error={chartError ? new Error(chartError) : null}
          />
        </ChartFrame>
      </div>

      {/* Table de données */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Données</h3>
        <ChartDataTable rows={data.dataRows} />
      </div>

      {/* Répartition */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Répartition</h3>
        <BreakdownTable rows={data.breakdown} />
      </div>
    </div>
  );
}
