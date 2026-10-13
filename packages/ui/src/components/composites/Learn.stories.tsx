/**
 * Composites — Learn + Progress stories (cat. 2.9, 2.10).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  LearnView,
  Flashcard,
  QuizQuestionCard,
  type FlashcardData,
  type QuizQuestionData,
  type StudyMode,
  type LearnViewData,
  ProgressView,
  type ProgressViewData,
  type MetricPoint,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Learn+Progress",
  tags: ["autodocs"],
};
export default meta;

/* ------------------------------------------------------------------ */
/* Learn                                                               */
/* ------------------------------------------------------------------ */

const learnData: LearnViewData = {
  title: "React Server Components",
  defaultMode: "flashcards",
  progress: 60,
  remainingMinutes: 24,
  totalLessons: 10,
  completedLessons: 6,
};

const flashcards: FlashcardData[] = [
  {
    id: "f1",
    front: "Qu'est-ce qu'un Server Component ?",
    back: "Un composant React exécuté côté serveur, qui ne génère pas de JS pour le client. Idéal pour l'accès direct aux données et le streaming.",
    category: "RSC · Concepts",
  },
  {
    id: "f2",
    front: "Diff entre use client et use server",
    back: "« use client » marque la racine d'un composant client (interactif). « use server » contraint un composant à ne pas être importé côté client.",
    category: "RSC · Directives",
  },
];

const quiz: QuizQuestionData = {
  id: "q1",
  prompt: "Quel hook ne peut PAS être utilisé dans un Server Component ?",
  options: ["useState", "useEffect", "useContext", "Tous les 3 ci-dessus"],
  correctIndex: 3,
  selected: null,
  explanation:
    "useState, useEffect et useContext sont des hooks d'interactivité client : ils sont interdits dans les Server Components, qui sont des fonctions sans état côté serveur.",
};

export const Learn: Story = {
  render: () => {
    const [mode, setMode] = React.useState<StudyMode>("flashcards");
    const [flashIdx, setFlashIdx] = React.useState(0);
    const [flipped, setFlipped] = React.useState(false);
    const [answered, setAnswered] = React.useState<number | null>(null);

    const current = flashcards[flashIdx];

    const renderWorkspace = () => {
      if (mode === "flashcards" && current) {
        return (
          <Flashcard
            card={current}
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            onMaster={() => setFlashIdx((i) => Math.min(i + 1, flashcards.length - 1))}
            onAgain={() => setFlashIdx((i) => Math.max(i - 1, 0))}
          />
        );
      }
      if (mode === "quiz") {
        return (
          <QuizQuestionCard
            question={{ ...quiz, selected: answered }}
            onAnswer={(i) => setAnswered(i)}
            revealed={answered !== null}
          />
        );
      }
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Le contenu du mode « {mode} » est fourni par le conteneur parent (Étape 4).
            Ce bloc montre le workspace vide.
          </p>
        </div>
      );
    };

    return (
      <div className="mx-auto max-w-2xl">
        <LearnView
          data={learnData}
          mode={mode}
          onModeChange={(m) => {
            setMode(m);
            setFlipped(false);
            setAnswered(null);
          }}
        >
          {renderWorkspace()}
        </LearnView>
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

const series: MetricPoint[] = [
  { date: "2026-10-07", metric: "concentration", value: 42, unit: "min" },
  { date: "2026-10-08", metric: "concentration", value: 58, unit: "min" },
  { date: "2026-10-09", metric: "concentration", value: 51, unit: "min" },
  { date: "2026-10-10", metric: "concentration", value: 73, unit: "min" },
  { date: "2026-10-11", metric: "concentration", value: 66, unit: "min" },
  { date: "2026-10-12", metric: "concentration", value: 81, unit: "min" },
];

const progressData: ProgressViewData = {
  title: "Progression",
  period: "week",
  periodLabel: "Cette semaine",
  kpis: [
    { id: "k1", label: "Score global", value: "72", icon: "chart", tone: "success", deltaLabel: "+8 pts", delta: 8 },
    { id: "k2", label: "Concentration", value: "60", unit: "min/j", icon: "timer", deltaLabel: "+12 min", delta: 12 },
    { id: "k3", label: "Tâches closes", value: "34", icon: "task", deltaLabel: "-4", delta: -4, tone: "warning" },
    { id: "k4", label: "Écart vs objectif", value: "-6", unit: "%", icon: "warning", tone: "danger", deltaLabel: "-2 pts", delta: -2 },
  ],
  chartData: series,
  chartKind: "line",
  metrics: ["concentration", "apprentissage", "productivité"],
  activeMetric: "concentration",
  dataRows: series,
  breakdown: [
    { id: "bd1", label: "Dev", value: 48, pct: 60, color: "#6366f1", previous: 44 },
    { id: "bd2", label: "Réunions", value: 22, pct: 27, color: "#3b82f6", previous: 30 },
    { id: "bd3", label: "Apprentissage", value: 10, pct: 13, color: "#10b981", previous: 4 },
  ],
};

export const Progression: Story = {
  render: () => {
    const [data, setData] = React.useState(progressData);
    return (
      <div className="mx-auto max-w-3xl">
        <ProgressView
          data={data}
          onPeriodChange={(p) => setData((d) => ({ ...d, period: p }))}
          onMetricChange={(m) => setData((d) => ({ ...d, activeMetric: m }))}
          onExport={() => console.log("export")}
        />
      </div>
    );
  },
};

export const ProgressChargement: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <ProgressView
        data={{ ...progressData, chartData: [] }}
        onPeriodChange={() => {}}
        onMetricChange={() => {}}
        chartLoading
      />
    </div>
  ),
};

export const ProgressErreur: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <ProgressView
        data={{ ...progressData, chartData: [] }}
        onPeriodChange={() => {}}
        onMetricChange={() => {}}
        chartError="Le service de métriques est inaccessible"
      />
    </div>
  ),
};
