/**
 * Kanban.stories.tsx — Moteur @reui pour les projets Aurora.
 * Colonnes : À planifier / À faire / En cours / Terminé (4 colonnes du design).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
    KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "src/index";
import { ReuiBadge } from "src/index";
import { Button } from "src/index";
import { Card, CardContent, CardHeader } from "src/index";
import { GripVertical } from "lucide-react";

type Story = StoryObj<typeof Kanban>;

interface Task {
  id: string;
  title: string;
  label: string;
  progress: number;
  avatar?: string;
}

type Columns = Record<string, Task[]>;

const INITIAL: Columns = {
  planifier: [
    { id: "t1", title: "Définir la cible", label: "Plan", progress: 0 },
    { id: "t2", title: "Socle technique", label: "Infra", progress: 0 },
  ],
  afare: [
    { id: "t3", title: "API utilisateurs", label: "Backend", progress: 20 },
    { id: "t4", title: "Design système", label: "UI", progress: 10 },
  ],
  encours: [
    { id: "t5", title: "Auth Supabase", label: "Security", progress: 60 },
  ],
  termine: [
    { id: "t6", title: "Scaffolding monorepo", label: "Setup", progress: 100 },
  ],
};

function TaskCard({ task, asHandle }: { task: Task; asHandle?: boolean }) {
  const body = (
    <Card className="bg-card">
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{task.title}</span>
          <ReuiBadge variant="info-light" size="sm">{task.label}</ReuiBadge>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
  return (
    <KanbanItem value={task.id}>
      {asHandle ? <KanbanItemHandle>{body}</KanbanItemHandle> : body}
    </KanbanItem>
  );
}

export default {
  title: "Aurora/UI/Kanban (@reui)",
  component: Kanban,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Kanban>;

export const Projets: Story = {
  render: function KanbanProjects() {
    const [cols, setCols] = useState<Columns>(INITIAL);
    return (
      <div className="min-h-[520px] p-4">
        <Kanban
          value={cols}
          onValueChange={setCols}
          getItemValue={(item) => item.id}
        >
          <KanbanBoard className="grid auto-rows-fr grid-cols-4 gap-3">
            <KanbanColumn value="planifier">
              <CardHeader className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold">À planifier</span>
                <Button variant="ghost" size="icon-sm" aria-label="Créer une carte">
                  <GripVertical />
                </Button>
              </CardHeader>
              <KanbanColumnContent value="planifier" className="flex flex-col gap-2 p-0.5">
                {cols.planifier?.map((t) => (
                  <TaskCard key={t.id} task={t} asHandle />
                ))}
              </KanbanColumnContent>
            </KanbanColumn>
            <KanbanColumn value="afare">
              <CardHeader className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold">À faire</span>
                <ReuiBadge variant="outline" size="sm">{cols.afare?.length ?? 0}</ReuiBadge>
              </CardHeader>
              <KanbanColumnContent value="afare" className="flex flex-col gap-2 p-0.5">
                {cols.afare?.map((t) => (
                  <TaskCard key={t.id} task={t} asHandle />
                ))}
              </KanbanColumnContent>
            </KanbanColumn>
            <KanbanColumn value="encours">
              <CardHeader className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold">En cours</span>
                <ReuiBadge variant="warning-light" size="sm">{cols.encours?.length ?? 0}</ReuiBadge>
              </CardHeader>
              <KanbanColumnContent value="encours" className="flex flex-col gap-2 p-0.5">
                {cols.encours?.map((t) => (
                  <TaskCard key={t.id} task={t} asHandle />
                ))}
              </KanbanColumnContent>
            </KanbanColumn>
            <KanbanColumn value="termine">
              <CardHeader className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold">Terminé</span>
                <ReuiBadge variant="success-light" size="sm">{cols.termine?.length ?? 0}</ReuiBadge>
              </CardHeader>
              <KanbanColumnContent value="termine" className="flex flex-col gap-2 p-0.5">
                {cols.termine?.map((t) => (
                  <TaskCard key={t.id} task={t} asHandle />
                ))}
              </KanbanColumnContent>
            </KanbanColumn>
          </KanbanBoard>
          <KanbanOverlay className="bg-muted/10 rounded-md border-2 border-dashed" />
        </Kanban>
      </div>
    );
  },
};

export const Vide: Story = {
  render: function KanbanEmpty() {
    const empty: Columns = { planifier: [], afare: [], encours: [], termine: [] };
    return (
      <div className="min-h-[520px] p-4">
        <Kanban value={empty} onValueChange={() => {}} getItemValue={(i) => i.id}>
          <KanbanBoard className="grid auto-rows-fr grid-cols-4 gap-3">
            {Object.keys(empty).map((colId) => (
              <KanbanColumn key={colId} value={colId}>
                <CardHeader className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold">{colId}</span>
                </CardHeader>
                <KanbanColumnContent value={colId} className="p-0.5">
                  <div className="flex flex-col items-center gap-2 py-8 text-xs text-muted-foreground">
                    <span>Aucune tâche</span>
                    <Button variant="outline" size="sm">Ajouter</Button>
                  </div>
                </KanbanColumnContent>
              </KanbanColumn>
            ))}
          </KanbanBoard>
        </Kanban>
      </div>
    );
  },
};
