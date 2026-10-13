/**
 * Composites — Inbox + Canvas stories (cat. 2.15, 2.16).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  InboxView,
  type InboxViewData,
  type CaptureData,
  type CaptureStatus,
  CanvasView,
  type CanvasViewData,
  type CanvasDocView,
  type CanvasVersion,
  type OutlineItem,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Inbox+Canvas",
  tags: ["autodocs"],
};
export default meta;

/* ------------------------------------------------------------------ */
/* Inbox                                                               */
/* ------------------------------------------------------------------ */

const captures: CaptureData[] = [
  {
    id: "cap1",
    type: "idea",
    title: "Ajouter un mode hors-ligne au lecteur",
    content: "Prévisualisation : cache local des extraits via SQLite.",
    status: "captured",
    createdAt: "2026-10-13T08:00:00Z",
    tags: ["offline", "lecteur"],
    source: "user",
  },
  {
    id: "cap2",
    type: "task",
    title: "Réécrire le scheduler de focus",
    content: "Le cron interne est trop rigide, passer à un event-driven.",
    status: "triaged",
    createdAt: "2026-10-12T14:30:00Z",
    source: "user",
  },
  {
    id: "cap3",
    type: "link",
    title: "Article sur les Web Components AOM",
    url: "https://example.com/web-components-aom",
    status: "captured",
    createdAt: "2026-10-12T10:00:00Z",
    source: "agent",
  },
  {
    id: "cap4",
    type: "event",
    title: "Demo du board le 20/10",
    status: "converted",
    convertedToRef: "evt-2026-10-20-demo",
    createdAt: "2026-10-10T09:00:00Z",
  },
  {
    id: "cap5",
    type: "note",
    title: "Notes de la rétro sprint 14",
    status: "archived",
    createdAt: "2026-10-09T17:00:00Z",
  },
];

const INITIAL_CAPTURES = captures;

export const Boite: Story = {
  render: () => {
    const [captures, setCatches] = React.useState<CaptureData[]>(INITIAL_CAPTURES);
    const [selected, setSelected] = React.useState<string[] | undefined>([]);
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [statusFilter, setStatusFilter] = React.useState<CaptureStatus | "all">("all");

    const data: InboxViewData = {
      captures,
      activeStatus: statusFilter,
      selectedIds: selected ?? [],
    };

    return (
      <div className="flex flex-col gap-3">
        {/* Filtre de statut */}
        <div className="flex items-center gap-1.5">
          {(["all", "captured", "triaged", "converted", "archived", "ignored"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s as CaptureStatus | "all")}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (statusFilter === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {s === "all" ? "Toutes" : s}
            </button>
          ))}
        </div>
        <InboxView
          data={data}
          onCapture={(c) =>
            setCatches((prev) => [
              { ...c, id: `cap-${Date.now()}`, status: "captured", createdAt: new Date().toISOString() } as CaptureData,
              ...prev,
            ])
          }
          onTriage={(id, to) => {
            setCatches((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, type: to, status: "triaged" } : c
              )
            );
          }}
          onIgnore={(id) =>
            setCatches((prev) =>
              prev.map((c) => (c.id === id ? { ...c, status: "ignored" } : c))
            )
          }
          onArchive={(id) =>
            setCatches((prev) =>
              prev.map((c) => (c.id === id ? { ...c, status: "archived" } : c))
            )
          }
          onSelect={(id) => setActiveId(id)}
          onToggleSelect={(id) =>
            setSelected((prev) => {
              const list = prev ?? [];
              return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
            })
          }
          onClearSelection={() => setSelected([])}
          onBulkTriage={(ids, to) => {
            setCatches((prev) =>
              prev.map((c) =>
                ids.includes(c.id) ? { ...c, type: to, status: "triaged" } : c
              )
            );
            setSelected([]);
          }}
          onBulkIgnore={(ids) => {
            setCatches((prev) =>
              prev.map((c) => (ids.includes(c.id) ? { ...c, status: "ignored" } : c))
            );
            setSelected([]);
          }}
          activeCaptureId={activeId}
        />
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

const outline: OutlineItem[] = [
  { id: "o1", level: 1, text: "Introduction" },
  { id: "o2", level: 2, text: "Le problème" },
  { id: "o3", level: 2, text: "L'approche retenue" },
  { id: "o4", level: 1, text: "Implémentation" },
  { id: "o5", level: 2, text: "Modèle de données" },
  { id: "o6", level: 1, text: "Suivants" },
];

const versions: CanvasVersion[] = [
  {
    id: "v3",
    label: "Relecture finale",
    author: "Maya",
    createdAt: "2026-10-13T10:00:00Z",
    isCurrent: true,
  },
  {
    id: "v2",
    label: "Ajout section implémentation",
    author: "Lucas",
    createdAt: "2026-10-12T16:30:00Z",
  },
  {
    id: "v1",
    label: "Premier brouillon",
    author: "Maya",
    createdAt: "2026-10-10T09:00:00Z",
  },
];

export const CanvasDocument: Story = {
  render: () => {
    const [view, setView] = React.useState<CanvasDocView>("editor");
    const [content, setContent] = React.useState(
      "# Introduction\n\nCe document décrit l'architecture de synchronisation hors-ligne de l'app Aurora.\n\n## Le problème\n\nL'app mobile doit rester utilisable sans réseau. La stratégie retenue est une base locale SQLite alimentée par un journal de replay Postgres."
    );
    const [data, setData] = React.useState<CanvasViewData>({
      title: "Architecture sync offline",
      syncState: "synced",
      activeView: view,
      content,
      versions,
      outline,
      lastSavedAt: "2026-10-13T10:00:00Z",
    });

    return (
      <div className="flex h-[500px] flex-col overflow-hidden rounded-xl border bg-background">
        <CanvasView
          data={{ ...data, activeView: view, content }}
          onViewChange={(v) => setView(v)}
          onContentChange={(c) => {
            setContent(c);
            setData((d) => ({ ...d, content: c, syncState: "unsaved" }));
          }}
          onSave={() =>
            setData((d) => ({ ...d, syncState: "synced", lastSavedAt: new Date().toISOString() }))
          }
          onRestoreVersion={(id) => console.log("restore", id)}
          onTitleChange={(t) => setData((d) => ({ ...d, title: t }))}
        />
      </div>
    );
  },
};

export const CanvasMarkdown: Story = {
  render: () => {
    const [content, setContent] = React.useState(
      "# Titre\n\n- liste\n- items\n\n> citation\n\n```\ncode block\n```"
    );
    return (
      <div className="flex h-[400px] flex-col overflow-hidden rounded-xl border bg-background">
        <CanvasView
          data={{
            title: "Source",
            syncState: "unsaved",
            activeView: "markdown",
            content,
            versions: [],
            outline: [],
          }}
          onViewChange={() => {}}
          onContentChange={setContent}
        />
      </div>
    );
  },
};
