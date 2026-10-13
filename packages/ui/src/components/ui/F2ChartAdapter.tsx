/**
 * F2ChartAdapter — moteur AntV F2 (Mobile Chart) pour Progress (task CHART-F2-001).
 *
 * `Canvas` (de `@antv/f-react`) rend le canvas 2D + le context F2 ; les
 * géométries (`withLine`, `withArea`, `withInterval`) sont composées au
 * JSX React standard dans les children — c'est le pattern F2 5.x officiel.
 *
 * Le composant `ProgressTimeSeriesChart` consomme ce `F2ChartAdapter`.
 * La couche métier n'importe jamais `@antv/f2` directement.
 *
 * Types supportés (première tranche CHART-F2-001) :
 * - `line` / `area` : séries temporelles
 * - `bar` / `column` : colonnes (KPIs par période)
 * - `targetValue` : valeur cible affichée en texte (repli accessibilité)
 */
import * as React from "react";
import CanvasDefault from "@antv/f-react";
import {
  withLine,
  withArea,
  withInterval,
  withAxis,
  withLegend,
  withTooltip,
} from "@antv/f2";
import type { ComponentType } from "react";

const Canvas = CanvasDefault as unknown as React.ComponentType<{
  width?: number | string;
  height?: number | string;
  animate?: boolean;
  autoFit?: boolean;
  onError?: (error: unknown) => void;
  children?: React.ReactNode;
}>;

/* ------------------------------------------------------------------ */
/* Contrat de données (task CHART-F2-001)                             */
/* ------------------------------------------------------------------ */

export type MetricPoint = {
  /** ISO 8601 ou date locale normalisée. */
  date: string;
  /** Identifiant stable de la mesure. */
  metric: string;
  value: number;
  unit: string;
  /** Série facultative pour comparaison multi-séries. */
  series?: string;
};

export type F2ChartKind = "line" | "area" | "bar" | "column";

export interface F2ChartAdapterProps {
  /** Données normalisées — la couche métier calcule les agrégats. */
  data: MetricPoint[];
  /** Type de graphique (défaut: "line"). */
  kind?: F2ChartKind;
  /** Titre au-dessus du graphique. */
  title: string;
  /** Description sous-titre / contexte. */
  description?: string;
  /** Libellé de période (ex. "Cette semaine", "Q4 2026"). */
  periodLabel?: string;
  /** Valeur cible / objectif (affichée en texte sous le canvas). */
  targetValue?: number;
  /** Unité affichée (ex. "min", "%", "tâches"). */
  unit?: string;
  /** Couleur de la première série. */
  color?: string;
  /** Hauteur du graphique en px (défaut: 200). */
  height?: number;
  /** Indique si les données sont en cours de chargement. */
  isLoading?: boolean;
  /** Erreur de rendu — affiche un état d'erreur au lieu du canvas. */
  error?: Error | null;
  /** Callback d'erreur de rendu du canvas (pas un throw non-capturé). */
  onCanvasError?: (error: unknown) => void;
}

/* ------------------------------------------------------------------ */
/* Mapping MetricPoint → F2 chart data                                 */
/* ------------------------------------------------------------------ */

function toChartData(data: MetricPoint[]): { label: string; value: number; series?: string }[] {
  return data.map((p) => ({
    label: p.date.length > 10 ? p.date.slice(5, 10) : p.date,
    value: p.value,
    ...(p.series ? { series: p.series } : {}),
  }));
}

/* ------------------------------------------------------------------ */
/* Adaptateur React                                                    */
/* ------------------------------------------------------------------ */

function F2ChartAdapter({
  data,
  kind = "line",
  title,
  description,
  periodLabel,
  targetValue,
  unit,
  color,
  height = 200,
  isLoading = false,
  error = null,
  onCanvasError,
}: F2ChartAdapterProps) {
  const chartData = toChartData(data);
  const hasMultipleSeries = new Set(data.map((d) => d.series)).size > 1;

  /* Sélection du composant de géométrie (F2 5.x pattern JSX) */
  const GeoComponent: ComponentType<Record<string, unknown>> =
    kind === "area"
      ? (withArea(withLegend(withAxis(withTooltip(undefined)))) as unknown as ComponentType<Record<string, unknown>>)
      : kind === "bar" || kind === "column"
        ? (withInterval(withLegend(withAxis(withTooltip(undefined)))) as unknown as ComponentType<Record<string, unknown>>)
        : (withLine(withLegend(withAxis(withTooltip(undefined)))) as unknown as ComponentType<Record<string, unknown>>);

  const geoProps: Record<string, unknown> = {
    data: chartData,
    ...(hasMultipleSeries ? { colorField: "series" } : {}),
  };

  return (
    <div data-slot="f2-chart" className="flex flex-col gap-2">
      {/* En-tête */}
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium">{title}</span>
        {periodLabel && (
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        )}
        {unit && <span className="text-xs text-muted-foreground">({unit})</span>}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Zone graphique */}
      {isLoading ? (
        <div
          className="w-full animate-pulse rounded-md bg-muted"
          style={{ height }}
          role="status"
          aria-label="Chargement du graphique"
        />
      ) : error ? (
        <div
          role="alert"
          className="flex w-full items-center justify-center rounded-md border border-destructive bg-destructive/5 p-3 text-center text-sm text-destructive"
          style={{ height }}
        >
          <div>
            <p className="font-medium">Graphique indisponible</p>
            <p className="mt-1 text-xs">{error.message}</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex w-full items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground"
          style={{ height }}
        >
          Aucune donnée pour cette période
        </div>
      ) : (
        <div style={{ height, width: "100%" }}>
          <Canvas
            width="100%"
            height={height}
            animate={false}
            autoFit
            onError={onCanvasError}
          >
            <GeoComponent {...geoProps} />
          </Canvas>
        </div>
      )}

      {/* Valeur cible en texte (accessibilité : pas uniquement canvas) */}
      {targetValue !== undefined && !isLoading && !error && (
        <p className="font-mono text-xs text-muted-foreground">
          Cible : {targetValue}
          {unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}

export { F2ChartAdapter };
