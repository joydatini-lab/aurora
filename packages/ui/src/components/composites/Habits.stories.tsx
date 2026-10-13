/**
 * Composites — Habits stories (cat. 2.6).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  HabitsView,
  type HabitItem,
  type HabitDayData,
  type HabitCompletionState,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Habits",
  tags: ["autodocs"],
};
export default meta;

const days: HabitDayData[] = [
  { date: "2026-10-07", dayLabel: "L" },
  { date: "2026-10-08", dayLabel: "M" },
  { date: "2026-10-09", dayLabel: "M" },
  { date: "2026-10-10", dayLabel: "J" },
  { date: "2026-10-11", dayLabel: "V" },
  { date: "2026-10-12", dayLabel: "S" },
  { date: "2026-10-13", dayLabel: "D", isToday: true },
];

const habits: HabitItem[] = [
  {
    id: "h1",
    title: "Méditation matinale",
    icon: "insight",
    color: "#8b5cf6",
    frequency: "daily",
    streak: 12,
    totalCompleted: 48,
    targetLabel: "10 min/jour",
    todayProgress: 100,
  },
  {
    id: "h2",
    title: "Lecture 20 pages",
    icon: "source",
    color: "#3b82f6",
    frequency: "daily",
    streak: 3,
    totalCompleted: 21,
    targetLabel: "20 pages",
    todayProgress: 50,
  },
  {
    id: "h3",
    title: "Étirements",
    icon: "timer",
    color: "#10b981",
    frequency: "weekly",
    streak: 2,
    totalCompleted: 10,
    targetLabel: "3x/semaine",
    todayProgress: 0,
  },
];

const completions: HabitCompletionState[] = [
  // h1 : L M M J V S (pas D car en cours)
  ...days.slice(0, 6).map((d) => ({ habitId: "h1", date: d.date, completed: true })),
  { habitId: "h1", date: "2026-10-13", completed: true },
  // h2 : L M - J V - -
  ...[0, 1, 3, 4].map((i) => ({ habitId: "h2", date: days[i]!.date, completed: true })),
  // h3 : - - M - V - -
  ...[2, 4].map((i) => ({ habitId: "h3", date: days[i]!.date, completed: true })),
];

export const Vue: Story = {
  render: () => {
    const [comps, setComps] = React.useState<HabitCompletionState[]>(completions);
    const toggle = (habitId: string, date: string, completed: boolean) => {
      setComps((prev) => {
        const idx = prev.findIndex((c) => c.habitId === habitId && c.date === date);
        if (idx === -1) return [...prev, { habitId, date, completed }];
        const next = [...prev];
        const existing = next[idx];
        if (!existing) return prev;
        next[idx] = { ...existing, completed };
        return next;
      });
    };
    return (
      <div className="mx-auto max-w-2xl">
        <HabitsView
          data={{ habits, days, completions: comps }}
          onToggle={toggle}
          onAddHabit={() => console.log("add-habit")}
          onEditHabit={(id) => console.log("edit", id)}
        />
      </div>
    );
  },
};

export const Vide: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl">
      <HabitsView
        data={{ habits: [], days, completions: [] }}
        onToggle={() => {}}
        onAddHabit={() => console.log("add-habit")}
      />
    </div>
  ),
};
