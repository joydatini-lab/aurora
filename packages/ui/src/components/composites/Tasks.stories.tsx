/**
 * Composites — Tasks + Kanban + Eisenhower stories (cat. 2.2, 2.4).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  TaskCard,
  type TaskCardData,
  TaskFilterBar,
  type TaskFilter,
  EisenhowerMatrix,
  type QuadrantId,
  CompositeKanbanColumn,
  type CompositeKanbanColumnData,
  TodayFocusPanel,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Tasks+Kanban",
  tags: ["autodocs"],
};
export default meta;

/* ------------------------------------------------------------------ */
/* Données partagées                                                    */
/* ------------------------------------------------------------------ */

const tasks: TaskCardData[] = [
  {
    id: "t1",
    title: "Intégrer le moteur EventCalendar",
    description: "Remplacer le FullCalendar mobile par le ReUI event-calendar.",
    priority: 4,
    dueDate: "2026-10-15",
    status: "en_cours",
    progress: 70,
    tags: ["ui", "calendar"],
    assignees: [{ id: "u1", name: "Lucas" }],
  },
  {
    id: "t2",
    title: "Écrire les stories des composites",
    description: "Couvrir les 21 modules en Storybook.",
    priority: 5,
    dueDate: "2026-10-14",
    status: "a_faire",
    progress: 40,
    tags: ["storybook"],
    assignees: [{ id: "u2", name: "Joy" }],
  },
  {
    id: "t3",
    title: "Corriger le RLS sur user_context",
    description: "La policy ne restreint pas encore les reads cross-user.",
    priority: 5,
    dueDate: "2026-10-13",
    status: "a_faire",
    progress: 0,
    tags: ["security", "supabase"],
    isBlocked: true,
  },
  {
    id: "t4",
    title: "Optimiser la requête du rapport mensuel",
    description: "Ajouter un index composite (user_id, period_start).",
    priority: 2,
    dueDate: "2026-10-20",
    status: "a_faire",
    progress: 0,
    tags: ["performance", "database"],
  },
];

/* ------------------------------------------------------------------ */
/* TaskCard                                                            */
/* ------------------------------------------------------------------ */

export const CartesTaches: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-2.5">
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          data={t}
          variant="default"
          showAssignees
          showProgress
          showTags
          onOpen={(id) => console.log("open", id)}
          onPriorityChange={(id, level) => console.log("priority", id, level)}
          onComplete={(id) => console.log("complete", id)}
          showComplete
        />
      ))}
    </div>
  ),
};

/* ------------------------------------------------------------------ */
/* TaskFilterBar                                                       */
/* ------------------------------------------------------------------ */

export const FiltresTaches: Story = {
  render: () => {
    const [filters, setFilters] = React.useState<TaskFilter[]>([
      { key: "statut", label: "En cours", value: "en_cours" },
      { key: "priorite", label: "Priorité critique", value: "5" },
    ]);
    return (
      <TaskFilterBar
        filters={filters}
        onRemoveFilter={(key) => setFilters((f) => f.filter((x) => x.key !== key))}
        onClearAll={() => setFilters([])}
        resultCount={12}
        onOpenAdvanced={() => console.log("advanced")}
      />
    );
  },
};

/* ------------------------------------------------------------------ */
/* EisenhowerMatrix                                                    */
/* ------------------------------------------------------------------ */

export const MatriceEisenhower: Story = {
  render: () => {
    const [, t1, t2, t3] = [tasks[0]!, tasks[1]!, tasks[2]!, tasks[3]!];
    const quadrants: Record<QuadrantId, TaskCardData[]> = {
      do: [t2],
      schedule: [t1],
      delegate: [t3],
      eliminate: [],
    };
    return (
      <EisenhowerMatrix
        quadrants={quadrants}
        onMoveTask={(taskId, from, to) => console.log("move", taskId, from, to)}
        onQuickCreate={(q) => console.log("quick-create", q)}
      />
    );
  },
};

/* ------------------------------------------------------------------ */
/* CompositeKanbanColumn                                               */
/* ------------------------------------------------------------------ */

export const KanbanColonnes: Story = {
  render: () => {
    const [kt0, kt1, kt2, kt3] = [tasks[0]!, tasks[1]!, tasks[2]!, tasks[3]!];
    const cols: { column: CompositeKanbanColumnData; tasks: TaskCardData[] }[] = [
      {
        column: { id: "todo", title: "À faire", wipLimit: 5, accent: "default" },
        tasks: [
          { ...kt3, status: "a_faire", progress: 0 },
          { ...kt1, status: "a_faire" },
        ],
      },
      {
        column: { id: "doing", title: "En cours", wipLimit: 3, accent: "primary" },
        tasks: [
          { ...kt0, status: "en_cours" },
          { ...kt2, status: "en_cours" },
        ],
      },
      {
        column: { id: "done", title: "Terminé", wipLimit: undefined, accent: "success" },
        tasks: [{ ...kt1, status: "termine", progress: 100 }],
      },
    ];
    return (
      <div className="grid grid-cols-3 gap-3">
        {cols.map(({ column, tasks: tks }) => (
          <CompositeKanbanColumn
            key={column.id}
            column={column}
            tasks={tks}
            onQuickCreate={(colId) => console.log("quick-create", colId)}
            onOpenTask={(taskId) => console.log("open", taskId)}
            onDropOnColumn={(colId) => console.log("drop", colId)}
          />
        ))}
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* TodayFocusPanel                                                     */
/* ------------------------------------------------------------------ */

export const FocusJour: Story = {
  render: () => {
    const [tf0, tf1, tf2, tf3] = [tasks[0]!, tasks[1]!, tasks[2]!, tasks[3]!];
    return (
      <div className="mx-auto max-w-md">
        <TodayFocusPanel
          focusTasks={[tf0, tf1, tf2]}
          overdueTasks={[{ ...tf3, dueDate: "2026-10-01", progress: 0, status: "a_faire" }]}
          todayTasks={[tf0, tf1, { ...tf1, id: "t5", status: "termine", progress: 100 }]}
          scheduledBlocks={[
            { time: "14:00", task: { ...tf1, id: "b1", status: "a_faire" } },
            { time: "15:00", task: { ...tf0, id: "b2", status: "a_faire" } },
          ]}
          onCompleteTask={(id) => console.log("complete", id)}
          onOpenTask={(id) => console.log("open", id)}
          onQuickCreate={() => console.log("quick-create")}
        />
      </div>
    );
  },
};
