/**
 * AgentThinkingLoader.stories.tsx — état « l'agent réfléchit / répond ».
 * Fondé sur le modèle de thinking d'assistant-ui (`MessageStatus`),
 * rendu piloté par la prop `status` (composant muet — Étape 2).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AgentThinkingLoader,
  DEFAULT_THINKING_WORDS,
} from "./AgentThinkingLoader";

/**
 * Meta du composant AgentThinkingLoader (ui-libraries §9.3).
 *
 * Miroir de `MessageStatus` assistant-ui :
 *   - `thinking`        → 3 points + verbe de thinking (rotation Claude).
 *   - `streaming`       → pastille de flux « En cours d'écriture… ».
 *   - `requires-action` → « Approbation requise » (outil en attente).
 *   - `error`           → ligne d'échec + bouton Réessayer.
 *   - `complete`        → ne rend rien.
 *
 * Le composant ne lit PAS le runtime assistant-ui (Étape 2) : la page
 * (conteneur, Étape 4) lit le statut de la dernière message et le passe.
 */
const meta = {
  title: "Aurora/UI/AgentThinkingLoader",
  component: AgentThinkingLoader,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof AgentThinkingLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Reflexion: Story = {
  args: {
    status: "thinking",
    words: DEFAULT_THINKING_WORDS,
  },
};

export const Streamage: Story = {
  args: {
    status: "streaming",
  },
};

export const ApprobationRequise: Story = {
  args: {
    status: "requires-action",
    requiresActionLabel: "Outil en attente : approbation requise",
  },
};

export const Erreur: Story = {
  args: {
    status: "error",
    errorLabel: "La réponse n'a pas pu aboutir.",
    onRetry: () => console.log("retry"),
  },
};

export const AvecDuree: Story = {
  args: {
    status: "thinking",
    elapsedSeconds: 12,
  },
};

export const Reduit: Story = {
  // `prefers-reduced-motion` = statique : 05 §2.6 rule 2 (pas de boucle)
  args: {
    status: "thinking",
    words: ["Réfléchit…"],
  },
};
