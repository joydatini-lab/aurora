/**
 * Composites — Reviews + Retro stories (cat. 2.7, 2.8).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  ReviewView,
  type ReviewViewData,
  RetroView,
  type RetroViewData,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Reviews+Retro",
  tags: ["autodocs"],
};
export default meta;

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

const reviewData: ReviewViewData = {
  period: "week",
  periodLabel: "Cette semaine",
  summary: {
    score: 72,
    trend: "up",
    gapVsTarget: 4,
    balance: { work: 45, rest: 25, learning: 30 },
    topCause: "Réunions excessives",
  },
  rows: [
    { category: "Travail", value: 38, unit: "h", previous: 42, cause: "Réunions excessives" },
    { category: "Apprentissage", value: 12, unit: "h", previous: 8, cause: "Cours React" },
    { category: "Repos", value: 48, unit: "h", previous: 62, cause: "Vacances partielle" },
  ],
  comparison: {
    label: "Semaine précédente",
    score: 64,
    rows: [
      { category: "Travail", value: 42, unit: "h" },
      { category: "Apprentissage", value: 8, unit: "h" },
      { category: "Repos", value: 62, unit: "h" },
    ],
  },
  causes: [
    { id: "c1", label: "Réunions excessives", weight: 55, color: "#ef4444" },
    { id: "c2", label: "Interruptions imprevues", weight: 30, color: "#f59e0b" },
    { id: "c3", label: "Contexte de travail", weight: 15, color: "#3b82f6" },
  ],
  actions: [
    { id: "a1", label: "Bloquer 2 focus days par semaine", status: "in-progress", progress: 40 },
    { id: "a2", label: "Activer le mode ne pas déranger 14h-16h", status: "todo" },
    { id: "a3", label: "Supprimer 2 réunions récurrentes", status: "done", progress: 100 },
  ],
};

export const Revue: Story = {
  render: () => {
    const [data, setData] = React.useState(reviewData);
    return (
      <div className="mx-auto max-w-2xl">
        <ReviewView
          data={data}
          onToggleAction={(id, done) =>
            setData((d) => ({
              ...d,
              actions: d.actions.map((a) =>
                a.id === id
                  ? { ...a, status: done ? "done" : "todo", progress: done ? 100 : a.progress }
                  : a
              ),
            }))
          }
          onPublish={() => console.log("publish")}
          onArchive={() => console.log("archive")}
        />
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* Retro                                                               */
/* ------------------------------------------------------------------ */

const retroData: RetroViewData = {
  periodLabel: "Sprint 14 (2026-10-01 → 2026-10-13)",
  teamLabel: "Équipe Aurora",
  status: "draft",
  milestones: [
    { id: "m1", title: "MVP moteur de rendu", dueDate: "2026-10-10", status: "missed", daysLate: 3, owner: "Lucas" },
    { id: "m2", title: "Intégration Supabase RLS", dueDate: "2026-10-12", status: "at-risk", owner: "Maya" },
    { id: "m3", title: "QA release v0.9", dueDate: "2026-10-08", status: "met" },
  ],
  bacMetrics: [
    { id: "b1", label: "Budget", planned: 180, actual: 194, unit: "h", trend: "up" },
    { id: "b2", label: "Avancement", planned: 80, actual: 68, unit: "%", trend: "down" },
    { id: "b3", label: "Coût", planned: 45000, actual: 51200, unit: "€", trend: "up" },
  ],
  rootCauses: [
    { id: "r1", title: "Scope creep sur le moteur", category: "scope", actionCount: 2 },
    { id: "r2", title: "Panneau RLS bloquant les tests", category: "processus", actionCount: 1 },
  ],
  actions: [
    { id: "ac1", title: "Re-scoping du moteur (split MVP v2)", column: "this-sprint", owner: "Lucas" },
    { id: "ac2", title: "Jeu de tests RLS automatisé", column: "backlog" },
    { id: "ac3", title: "Daily standup 15 min max", column: "done", owner: "Maya" },
  ],
  lessons: [
    { id: "l1", type: "keep", title: "Pair programming sur le code critique" },
    { id: "l2", type: "improve", title: "Estimation trop optimiste des tâches backend" },
    { id: "l3", type: "start", title: "Definition of Done formelle avec critères tests" },
  ],
};

export const Retro: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <RetroView
        data={retroData}
        onToggleMilestone={(id, s) => console.log("toggle-milestone", id, s)}
        onAddRootCause={(c) => console.log("add-cause", c)}
        onMoveAction={(id, col) => console.log("move-action", id, col)}
        onAddLesson={(l) => console.log("add-lesson", l)}
        onPublish={() => console.log("publish-retro")}
      />
    </div>
  ),
};
