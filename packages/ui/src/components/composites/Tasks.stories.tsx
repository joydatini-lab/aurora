/**
 * Composites — Tasks + Kanban + Eisenhower stories (cat. 2.2, 2.4).
 *
 * Standard CDD (docs/cdd.md) : callbacks `fn()` (pas de console.log), états
 * vide couverts, au moins un test `play`.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { expect, fn } from "storybook/test";
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

const meta: Meta = {
  title: "Aurora/Composites/Tasks+Kanban",
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof meta>;

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

/**
 * Cartes tâche par défaut : progression, tags, assignés et action Terminer.
 *
 * @summary liste de cartes tâche
 */
export const CartesTaches: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          data={t}
          variant="default"
          showAssignees
          showProgress
          showTags
          showComplete
          onOpen={fn()}
          onPriorityChange={fn()}
          onComplete={fn()}
          onMenu={fn()}
        />
      ))}
    </div>
  ),
};

/**
 * Test d'interaction : le bouton « Terminer » appelle `onComplete(id)`.
 *
 * @summary clique Terminer → onComplete
 */
const onCompleteMock = fn();

export const TerminerTache: Story = {
  tags: ["!dev", "!autodocs"],
  name: "quand on clique Terminer, appelle onComplete",
  render: () => (
    <TaskCard data={tasks[0]!} onComplete={onCompleteMock} onOpen={fn()} />
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Marquer comme terminée" }),
    );
    await expect(onCompleteMock).toHaveBeenCalledWith("t1");
  },
};

/* ------------------------------------------------------------------ */
/* TaskFilterBar                                                       */
/* ------------------------------------------------------------------ */

/**
 * Barre de filtres actifs : libellés + boutons de suppression + résultat.
 *
 * @summary filtres actifs
 */
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
        onOpenAdvanced={fn()}
      />
    );
  },
};

/**
 * État vide : aucun filtre actif, zéro résultat.
 *
 * @summary aucun filtre
 */
export const FiltresVides: Story = {
  render: () => (
    <TaskFilterBar
      filters={[]}
      onRemoveFilter={fn()}
      onClearAll={fn()}
      resultCount={0}
      onOpenAdvanced={fn()}
    />
  ),
};

/* ------------------------------------------------------------------ */
/* EisenhowerMatrix                                                    */
/* ------------------------------------------------------------------ */

/**
 * Matrice d'Eisenhower remplie (do / schedule / delegate / eliminate).
 *
 * @summary matrice remplie
 */
export const MatriceEisenhower: Story = {
  render: () => {
    const quadrants: Record<QuadrantId, TaskCardData[]> = {
      do: [tasks[1]!],
      schedule: [tasks[0]!],
      delegate: [tasks[2]!],
      eliminate: [],
    };
    return (
      <EisenhowerMatrix
        quadrants={quadrants}
        onMoveTask={fn()}
        onQuickCreate={fn()}
      />
    );
  },
};

/**
 * Matrice vide : les quatre quadrants sans tâche (état vide).
 *
 * @summary matrice vide
 */
export const MatriceVide: Story = {
  render: () => (
    <EisenhowerMatrix
      quadrants={{ do: [], schedule: [], delegate: [], eliminate: [] }}
      onMoveTask={fn()}
      onQuickCreate={fn()}
    />
  ),
};

/* ------------------------------------------------------------------ */
/* CompositeKanbanColumn                                               */
/* ------------------------------------------------------------------ */

/**
 * Colonnes Kanban (todo / doing / done) avec limites WIP et accents.
 *
 * @summary colonnes kanban
 */
export const KanbanColonnes: Story = {
  render: () => {
    const cols: { column: CompositeKanbanColumnData; tasks: TaskCardData[] }[] = [
      {
        column: { id: "todo", title: "À faire", wipLimit: 5, accent: "default" },
        tasks: [
          { ...tasks[3]!, status: "a_faire", progress: 0 },
          { ...tasks[1]!, status: "a_faire" },
        ],
      },
      {
        column: { id: "doing", title: "En cours", wipLimit: 3, accent: "primary" },
        tasks: [
          { ...tasks[0]!, status: "en_cours" },
          { ...tasks[2]!, status: "en_cours" },
        ],
      },
      {
        column: { id: "done", title: "Terminé", wipLimit: undefined, accent: "success" },
        tasks: [{ ...tasks[1]!, status: "termine", progress: 100 }],
      },
    ];
    return (
      <div className="grid grid-cols-3 gap-3">
        {cols.map(({ column, tasks: tks }) => (
          <CompositeKanbanColumn
            key={column.id}
            column={column}
            tasks={tks}
            onQuickCreate={fn()}
            onOpenTask={fn()}
            onDropOnColumn={fn()}
          />
        ))}
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* TodayFocusPanel                                                     */
/* ------------------------------------------------------------------ */

/**
 * Panneau « focus du jour » : tâches du jour, en retard, blocs planifiés.
 *
 * @summary focus du jour
 */
export const FocusJour: Story = {
  render: () => (
    <div className="mx-auto max-w-md">
      <TodayFocusPanel
        focusTasks={[tasks[0]!, tasks[1]!, tasks[2]!]}
        overdueTasks={[
          { ...tasks[3]!, dueDate: "2026-10-01", progress: 0, status: "a_faire" },
        ]}
        todayTasks={[
          tasks[0]!,
          tasks[1]!,
          { ...tasks[1]!, id: "t5", status: "termine", progress: 100 },
        ]}
        scheduledBlocks={[
          { time: "14:00", task: { ...tasks[1]!, id: "b1", status: "a_faire" } },
          { time: "15:00", task: { ...tasks[0]!, id: "b2", status: "a_faire" } },
        ]}
        onCompleteTask={fn()}
        onOpenTask={fn()}
        onQuickCreate={fn()}
      />
    </div>
  ),
};
