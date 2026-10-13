/**
 * F2ChartAdapter.stories.tsx — Progress (task CHART-F2-001).
 *
 * Le `F2ChartAdapter` encapsule `@antv/f2` + `@antv/f-react` (Canvas).
 * Les données sont des `MetricPoint[]` — la couche métier fait les
 * agrégats, le graphique n'en calcule jamais.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  F2ChartAdapter,
  type MetricPoint,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/F2ChartAdapter",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

const WEEKLY_POMODORO: MetricPoint[] = [
  { date: "2026-10-06", metric: "pomodoro_count", value: 4, unit: "sessions" },
  { date: "2026-10-07", metric: "pomodoro_count", value: 6, unit: "sessions" },
  { date: "2026-10-08", metric: "pomodoro_count", value: 5, unit: "sessions" },
  { date: "2026-10-09", metric: "pomodoro_count", value: 8, unit: "sessions" },
  { date: "2026-10-10", metric: "pomodoro_count", value: 3, unit: "sessions" },
  { date: "2026-10-11", metric: "pomodoro_count", value: 7, unit: "sessions" },
];

const MONTHLY_FOCUS: MetricPoint[] = [
  { date: "2026-10-01", metric: "focus_minutes", value: 120, unit: "min" },
  { date: "2026-10-02", metric: "focus_minutes", value: 180, unit: "min" },
  { date: "2026-10-03", metric: "focus_minutes", value: 90,  unit: "min" },
  { date: "2026-10-04", metric: "focus_minutes", value: 240, unit: "min" },
  { date: "2026-10-05", metric: "focus_minutes", value: 150, unit: "min" },
];

const MULTI_SERIES: MetricPoint[] = [
  { date: "2026-10-06", metric: "tasks", value: 12, unit: "", series: "Semaine A" },
  { date: "2026-10-06", metric: "tasks", value: 9,  unit: "", series: "Semaine B" },
  { date: "2026-10-07", metric: "tasks", value: 15, unit: "", series: "Semaine A" },
  { date: "2026-10-07", metric: "tasks", value: 11, unit: "", series: "Semaine B" },
  { date: "2026-10-08", metric: "tasks", value: 8,  unit: "", series: "Semaine A" },
  { date: "2026-10-08", metric: "tasks", value: 14, unit: "", series: "Semaine B" },
];

export const SeriesTemps: Story = {
  render: () => (
    <div className="max-w-md">
      <F2ChartAdapter
        data={WEEKLY_POMODORO}
        kind="line"
        title="Pomodoros cette semaine"
        periodLabel="6 oct – 11 oct"
        unit="sessions"
        targetValue={6}
      />
    </div>
  ),
};

export const Zone: Story = {
  render: () => (
    <div className="max-w-md">
      <F2ChartAdapter
        data={MONTHLY_FOCUS}
        kind="area"
        title="Temps de concentration (min)"
        periodLabel="Octobre"
        unit="min"
      />
    </div>
  ),
};

export const Barres: Story = {
  render: () => (
    <div className="max-w-md">
      <F2ChartAdapter
        data={WEEKLY_POMODORO}
        kind="bar"
        title="Sessions par jour"
        periodLabel="Octobre"
        unit="sessions"
      />
    </div>
  ),
};

export const MultiSeries: Story = {
  render: () => (
    <div className="max-w-md">
      <F2ChartAdapter
        data={MULTI_SERIES}
        kind="line"
        title="Tâches — comparatif A vs B"
        periodLabel="Cette semaine"
      />
    </div>
  ),
};

export const EtatChargement: Story = {
  render: () => (
    <div className="max-w-md">
      <F2ChartAdapter data={WEEKLY_POMODORO} title="Chargement…" isLoading />
    </div>
  ),
};

export const EtatVide: Story = {
  render: () => (
    <div className="max-w-md">
      <F2ChartAdapter data={[]} title="Aucune donnée" />
    </div>
  ),
};
