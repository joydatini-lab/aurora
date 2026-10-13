/**
 * AgentResponseRenderer.stories.tsx — chat Agent (cat. 2.15).
 *
 * Le renderer ne connaît aucun état interne de l'Agent — il consomme
 * des blocs typés (`AgentBlock[]`) validés par la couche conversation
 * (assistant-ui). Le modèle émet les blocs ; ce composant les rend.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AgentResponseRenderer,
  type AgentBlock,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/AgentResponseRenderer",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

const SAMPLE_BLOCKS: AgentBlock[] = [
  { type: "paragraph", content: "Voici un résumé de l'avancement du projet Aurora pour cette semaine." },
  {
    type: "summary",
    title: "Avancement Gantt",
    body: "3 sur 7 jalons atteints. La phase développement est à 45 % ; le jalon QA est prévu le 26 octobre.",
    icon: "chart",
  },
  {
    type: "metric-grid",
    title: "KPIs de la semaine",
    metrics: [
      { label: "Tâches terminées", value: "12", unit: "tâches", period: "Semaine 40" },
      { label: "Temps de focus", value: "8h 30", unit: "min", period: "Semaine 40" },
      { label: "Pomodoros", value: "35", period: "Semaine 40" },
      { label: "Réussite tests", value: "94", unit: "%" },
    ],
  },
  {
    type: "steps",
    title: "Prochaines étapes",
    items: [
      { id: "s1", label: "Revue de code du data-grid", done: true },
      { id: "s2", label: "Migrer le timer vers useTimer v2", done: false },
      { id: "s3", label: "Valider les stories Focus", done: false },
    ],
  },
  {
    type: "citation",
    source: "Aurora docs — Design System v2",
    excerpt: "Le composant Gantt ReUI est utilisé tel quel ; la couche métier passe par le DataGrid pour les rapports.",
    date: "2026-10-12",
    confidence: "high",
  },
  {
    type: "tool-status",
    tool: "Supabase — requête RLS",
    status: "succeeded",
    durationMs: 1830,
    result: "3 policies vérifiées, aucune violation détectée.",
  },
  {
    type: "code",
    language: "ts",
    code: `export function useTimer(initial: number) {\n  const [secs, setSecs] = React.useState(initial);\n  // ... setInterval robust via Date.now()\n  return { secs, start: () => {}, pause: () => {} };\n}`,
  },
  {
    type: "warning",
    level: "warning",
    message: "Le jalon QA est en retard de 2 jours.",
    consequence: "Les tests E2E risquent de se chevaucher avec le déploiement.",
    nextAction: "Replanifier le jalon QA ou déplacer le milestone de 2 jours.",
  },
  {
    type: "approval",
    title: "Publication du rapport Q4",
    effect: "Le rapport sera partagé avec l'équipe via Supabase.",
    dataShared: ["résultats tests", "charge équipe", "jalons"],
    onApprove: () => console.log("approuvé"),
    onRefuse: () => console.log("refusé"),
  },
];

export const ReponseComplete: Story = {
  render: () => (
    <div className="max-w-2xl flex flex-col gap-5">
      <AgentResponseRenderer blocks={SAMPLE_BLOCKS} />
      {/* Suggested actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        {["Planifier une session focus", "Créer une tâche de replanification", "Voir le Gantt complet"].map((a, i) => (
          <button
            key={i}
            type="button"
            className="rounded-full border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  ),
};

export const ReponseMinimale: Story = {
  render: () => (
    <div className="max-w-xl">
      <AgentResponseRenderer
        blocks={[
          { type: "paragraph", content: "J'ai analysé le planning. Le jalon QA est le point de blocage principal." },
          {
            type: "warning",
            level: "error",
            message: "Risque de dépassement budgétaire détecté.",
            consequence: "BAC estimé +15 % si le jalon n'est pas replanifié.",
            nextAction: "Lancer une rétrospective avec le owner du projet.",
          },
        ]}
      />
    </div>
  ),
};
