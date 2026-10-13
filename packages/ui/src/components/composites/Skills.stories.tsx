/**
 * Composites — Skills + Agent stories (cat. 2.13, 2.14).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  SkillsView,
  type SkillData,
  type SkillDomain,
  type SkillsViewData,
  AgentView,
  type AgentMessage,
  type AgentModel,
  type AgentViewData,
  type MessageCitation,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Skills+Agent",
  tags: ["autodocs"],
};
export default meta;

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */

const skills: SkillData[] = [
  {
    id: "s1",
    name: "React",
    domain: "dev",
    level: 4,
    description: "Hooks, contexte, RSC, Suspense",
    evidence: [
      { id: "e1", label: "Application de production", kind: "project", date: "2026-06-15" },
      { id: "e2", label: "Certif Meta React", kind: "certification", date: "2025-11-01" },
    ],
    practices: [
      { id: "p1", label: "Réécrire le tableau en RSC", durationMin: 60 },
      { id: "p2", label: "Implémenter un optimistic update", durationMin: 45 },
    ],
    icon: "code",
    color: "#61dafb",
  },
  {
    id: "s2",
    name: "UI Design",
    domain: "design",
    level: 2,
    description: "Design system, tokens, accessibilité",
    evidence: [
      { id: "e3", label: "Aurora design system v2", kind: "project", date: "2026-09-01" },
    ],
    practices: [
      { id: "p3", label: "Audit de contraste d'un module", durationMin: 30 },
    ],
    icon: "image",
    color: "#8b5cf6",
  },
  {
    id: "s3",
    name: "SQL / Postgres",
    domain: "data",
    level: 3,
    description: "Requêtes, index, RLS, partitionnement",
    evidence: [
      { id: "e4", label: "Migration Supabase RLS", kind: "project", date: "2026-08-20" },
    ],
    practices: [
      { id: "p4", label: "Optimiser la requête du rapport mensuel", durationMin: 90 },
    ],
    icon: "table",
    color: "#3b82f6",
  },
  {
    id: "s4",
    name: "Gestion de projet",
    domain: "product",
    level: 3,
    description: "Scrum, BAC, rétro, planification",
    evidence: [
      { id: "e5", label: "Sprint 14 (Aurora)", kind: "project", date: "2026-10-13" },
    ],
    practices: [
      { id: "p5", label: "Préparer la rétro sprint 15", durationMin: 40 },
    ],
    icon: "project",
  },
];

export const Competences: Story = {
  render: () => {
    const [data, setData] = React.useState<SkillsViewData>({
      title: "Compétences",
      description: "Cartographie de vos domaines de maîtrise",
      searchQuery: "",
      activeDomain: null,
      skills,
      selectedSkillId: null,
    });
    return (
      <div className="mx-auto max-w-2xl">
        <SkillsView
          data={data}
          onSearch={(q) => setData((d) => ({ ...d, searchQuery: q }))}
          onDomainChange={(dom: SkillDomain | null) =>
            setData((d) => ({ ...d, activeDomain: dom }))
          }
          onSelectSkill={(id) => setData((d) => ({ ...d, selectedSkillId: id }))}
          onCreateSkill={(n, dom) => console.log("create-skill", n, dom)}
        />
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* Agent                                                              */
/* ------------------------------------------------------------------ */

const messages: AgentMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "Peux-tu m'expliquer le modèle de synchronisation offline-first de Powersync ?",
    timestamp: "2026-10-13T09:12:00Z",
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Powersync utilise une replication locale : le client matérialise les tables Postgres dans une base SQLite locale, et synchronise les modifications via un journal de replays. Trois mécanismes sont clés : le snapshot initial (full), l'incremental replay (par cursor), et le conflict resolution (last-write-wins par défaut).",
    status: "complete",
    timestamp: "2026-10-13T09:12:14Z",
    citations: [
      { id: "c1", label: "Powersync Docs — Replication", source: "powersync.com", url: "#" },
      { id: "c2", label: "Blog : Offline sync patterns", source: "dev.to", url: "#" },
    ] as MessageCitation[],
    toolRuns: [
      {
        id: "t1",
        name: "web_search",
        status: "done",
        inputSummary: "query: powersync offline replication",
        outputSummary: "12 résultats, 4 retenus",
      },
    ],
  },
  {
    id: "m3",
    role: "assistant",
    content:
      "Je vais préparer une migration RLS pour la table user_context. Confirmez-vous que je peux exécuter le script ? C'est une action sensible (DDL).",
    status: "requires-action",
    timestamp: "2026-10-13T09:14:02Z",
    toolRuns: [
      {
        id: "t2",
        name: "apply_rls_migration",
        status: "pending",
        inputSummary: "table: user_context, policy: user_isolation",
      },
    ],
  },
];

const models: AgentModel[] = [
  { id: "claude-5", name: "Claude 5 (Fable)", provider: "Anthropic", isDefault: true, description: "Raisonnement approfondi, fidèle aux instructions." },
  { id: "claude-haiku", name: "Claude 4.5 Haiku", provider: "Anthropic", description: "Rapide, pour les tâches courtes." },
  { id: "local", name: "Local (Llama)", provider: "On-prem", description: "Confidentialité maximale, capacité limitée." },
];

export const Conversation: Story = {
  render: () => {
    const [data, setData] = React.useState<AgentViewData>({
      title: "Aide à la migration RLS",
      status: "requires-action",
      messages,
      pendingApprovals: [
        {
          id: "t2",
          name: "apply_rls_migration",
          status: "pending",
          inputSummary: "table: user_context, policy: user_isolation",
        },
      ],
      models,
      activeModelId: "claude-5",
      draft: "",
    });
    return (
      <div className="flex h-[600px] flex-col overflow-hidden rounded-xl border bg-background">
        <AgentView
          data={data}
          onSend={(text) => {
            const m: AgentMessage = {
              id: `u${Date.now()}`,
              role: "user",
              content: text,
              status: "complete",
              timestamp: new Date().toISOString(),
            };
            setData((d) => ({ ...d, messages: [...d.messages, m], draft: "", status: "streaming" }));
          }}
          onModelChange={(id) => setData((d) => ({ ...d, activeModelId: id }))}
          onApproveTool={(_id) =>
            setData((d) => ({
              ...d,
              status: "idle",
              pendingApprovals: [],
            }))
          }
          onRejectTool={(_id) =>
            setData((d) => ({
              ...d,
              status: "idle",
              pendingApprovals: [],
            }))
          }
          onCopyMessage={(id, c) => console.log("copy", id, c)}
          onRegenerate={(id) => console.log("regen", id)}
        />
      </div>
    );
  },
};

export const ConversationChargement: Story = {
  render: () => (
    <div className="flex h-[400px] flex-col overflow-hidden rounded-xl border bg-background">
      <AgentView
        data={{
          title: "Réflexion",
          status: "thinking",
          messages: [],
          models,
          activeModelId: "claude-5",
          draft: "",
        }}
        onSend={() => {}}
        onModelChange={() => {}}
      />
    </div>
  ),
};
