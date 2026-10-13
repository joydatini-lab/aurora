/**
 * Composites — Knowledge + Discovery stories (cat. 2.11, 2.12).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  KnowledgeView,
  type KnowledgeViewData,
  type KnowledgeNodeData,
  type KnowledgeEdgeData,
  DiscoveryView,
  type DiscoveryViewData,
  type DiscoveryResult,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Knowledge+Discovery",
  tags: ["autodocs"],
};
export default meta;

/* ------------------------------------------------------------------ */
/* Knowledge                                                           */
/* ------------------------------------------------------------------ */

const nodes: KnowledgeNodeData[] = [
  { id: "n1", label: "React", type: "concept", x: 0.2, y: 0.3, size: 3, color: "#6366f1" },
  { id: "n2", label: "RSC", type: "concept", x: 0.5, y: 0.2, size: 2, color: "#8b5cf6" },
  { id: "n3", label: "Server Actions", type: "concept", x: 0.7, y: 0.3, size: 2, color: "#8b5cf6" },
  { id: "n4", label: "Vercel", type: "organisation", x: 0.4, y: 0.6, size: 2, color: "#10b981" },
  { id: "n5", label: "Dan Abramov", type: "person", x: 0.6, y: 0.7, size: 1 },
  { id: "n6", label: "Next.js", type: "document", x: 0.3, y: 0.5, size: 3, color: "#3b82f6" },
];

const edges: KnowledgeEdgeData[] = [
  { id: "e1", from: "n1", to: "n2", label: "introduit", relation: "concept", directed: true },
  { id: "e2", from: "n1", to: "n3", label: "utilise", directed: true },
  { id: "e3", from: "n4", to: "n6", label: "maintient", directed: true },
  { id: "e4", from: "n5", to: "n2", label: "a conçu", directed: true },
  { id: "e5", from: "n6", to: "n2", label: "implémente", directed: true },
];

export const Graphe: Story = {
  render: () => {
    const [data, setData] = React.useState<KnowledgeViewData>({
      title: "Graphe React",
      description: "Carte des concepts clés",
      nodes,
      edges,
      layout: "force",
      searchQuery: "",
      selectedNodeId: null,
    });
    return (
      <div className="mx-auto max-w-3xl">
        <KnowledgeView
          data={data}
          onSelectNode={(id) => setData((d) => ({ ...d, selectedNodeId: id }))}
          onLayoutChange={(l) => setData((d) => ({ ...d, layout: l }))}
          onSearch={(q) => setData((d) => ({ ...d, searchQuery: q }))}
          onCreateNode={(t) => console.log("create-node", t)}
          onEditNode={(n) => console.log("edit-node", n)}
          onRemoveNode={(id) => console.log("remove-node", id)}
        />
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* Discovery                                                          */
/* ------------------------------------------------------------------ */

const results: DiscoveryResult[] = [
  {
    id: "d1",
    title: "Révise : les Server Components en 10 min",
    snippet: "Une plongée claire dans le modèle mental RSC : ce qui s'exécute où, et pourquoi.",
    sourceKind: "article",
    sourceName: "Aurora Blog",
    reliability: "high",
    publishedAt: "2026-09-28",
    readMinutes: 10,
    isSaved: true,
  },
  {
    id: "d2",
    title: "Pourquoi les hooks ne fonctionnent pas côté serveur",
    snippet: "Le modèle d'exécution des hooks et pourquoi ils sont inaccessibles dans les Server Components.",
    sourceKind: "book",
    sourceName: "RSC in Depth",
    reliability: "medium",
    publishedAt: "2026-08-15",
    readMinutes: 18,
  },
  {
    id: "d3",
    title: "Notes perso : ma liste de migration vers RSC",
    snippet: "Checklist personnelle : audit des useEffect, identification des données server-only.",
    sourceKind: "note",
    sourceName: "Ma bibliothèque",
    reliability: "low",
  },
];

export const Decouverte: Story = {
  render: () => {
    const [active, setActive] = React.useState<string | null>(null);
    const data: DiscoveryViewData = {
      title: "Découverte",
      description: "Recherchez et organisez vos sources d'apprentissage",
      searchQuery: "",
      programs: [
        {
          id: "p1",
          title: "Révolution RSC",
          description: "Maîtriser React Server Components en 5 sources",
          sourceCount: 5,
          estimatedMinutes: 90,
          progress: 40,
          icon: "insight",
          status: "active",
        },
        {
          id: "p2",
          title: "Fondamentaux du Design System",
          sourceCount: 8,
          icon: "chart",
          status: "completed",
          progress: 100,
        },
      ],
      results,
      activeResultId: active,
    };
    return (
      <div className="mx-auto max-w-2xl">
        <DiscoveryView
          data={data}
          onSearch={() => {}}
          onOpenResult={(id) => setActive(id)}
          onOpenProgram={(id) => console.log("open-program", id)}
          onToggleSave={(id) => console.log("toggle-save", id)}
        />
      </div>
    );
  },
};

export const DecouverteVide: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl">
      <DiscoveryView
        data={{ title: "Découverte", searchQuery: "", programs: [], results: [] }}
        onSearch={() => {}}
        onOpenResult={() => {}}
      />
    </div>
  ),
};
