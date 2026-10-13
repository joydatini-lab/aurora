/**
 * Gantt.stories.tsx — Moteur @reui pour les frises de projet Aurora.
 * Frise : phases, tâches, jalons, baseline.
 * Viewport = desktop (largeur libre).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Gantt } from "src/index";
import type { GanttResource, GanttEvent } from "src/components/reui/gantt/gantt-types";

type Story = StoryObj<typeof Gantt>;

const meta: Meta<typeof Gantt> = {
  title: "Aurora/UI/Gantt (@reui)",
  component: Gantt,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

const PHASES: GanttResource[] = [
  { id: "ph1", title: "Phase 1 — Analyse" },
  { id: "ph2", title: "Phase 2 — Conception" },
  { id: "ph3", title: "Phase 3 — Développement" },
  { id: "ph4", title: "Phase 4 — Tests" },
  { id: "ph5", title: "Phase 5 — Déploiement" },
];

const EVENTS: GanttEvent[] = [
  { id: "t1", resourceId: "ph1", title: "Cadrage", start: new Date("2026-09-01"), end: new Date("2026-09-14"), progress: 100 },
  { id: "t2", resourceId: "ph1", title: "Recettes", start: new Date("2026-09-08"), end: new Date("2026-09-20"), progress: 100 },
  { id: "j1", resourceId: "ph1", title: "Jalon — Go/No-Go", start: new Date("2026-09-21"), end: new Date("2026-09-21") },
  { id: "t3", resourceId: "ph2", title: "Architecture", start: new Date("2026-09-21"), end: new Date("2026-10-05"), progress: 80 },
  { id: "t4", resourceId: "ph2", title: "Maquettes UI", start: new Date("2026-09-28"), end: new Date("2026-10-12"), progress: 45 },
  { id: "t5", resourceId: "ph3", title: "Sprint 1 — Backend", start: new Date("2026-10-05"), end: new Date("2026-10-19"), progress: 30 },
  { id: "t6", resourceId: "ph3", title: "Sprint 2 — Frontend", start: new Date("2026-10-12"), end: new Date("2026-10-26"), progress: 10 },
  { id: "j2", resourceId: "ph4", title: "Jalon — QA", start: new Date("2026-10-26"), end: new Date("2026-10-26") },
  { id: "t7", resourceId: "ph4", title: "Tests E2E", start: new Date("2026-10-26"), end: new Date("2026-11-09") },
  { id: "t8", resourceId: "ph5", title: "Mise en prod", start: new Date("2026-11-09"), end: new Date("2026-11-16") },
  { id: "j3", resourceId: "ph5", title: "Jalon — Livraison", start: new Date("2026-11-16"), end: new Date("2026-11-16") },
];

export const FriseProjet: Story = {
  render: function GanttFrise() {
    return (
      <div className="h-[560px] w-full overflow-hidden rounded-lg border border-border">
        <Gantt resources={PHASES} defaultEvents={EVENTS} scale="month" />
      </div>
    );
  },
};

export const Semaines: Story = {
  render: function GanttSemaines() {
    return (
      <div className="h-[560px] w-full overflow-hidden rounded-lg border border-border">
        <Gantt resources={PHASES} defaultEvents={EVENTS} scale="week" />
      </div>
    );
  },
};

export const Baseline: Story = {
  render: function GanttBaseline() {
    const baselineEvents: GanttEvent[] = [
      { id: "b1", resourceId: "ph1", title: "Planifié", start: new Date("2026-09-01"), end: new Date("2026-09-20"), baselineStart: new Date("2026-09-01"), baselineEnd: new Date("2026-09-25") },
      { id: "b2", resourceId: "ph2", title: "Réel", start: new Date("2026-09-21"), end: new Date("2026-10-12"), baselineStart: new Date("2026-09-25"), baselineEnd: new Date("2026-10-15") },
    ];
    return (
      <div className="h-[560px] w-full overflow-hidden rounded-lg border border-border">
        <Gantt
          resources={[
            { id: "ph1", title: "Phase 1 — Analyse" },
            { id: "ph2", title: "Phase 2 — Conception" },
          ]}
          defaultEvents={baselineEvents}
          scale="month"
        />
      </div>
    );
  },
};
