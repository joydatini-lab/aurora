import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  AgentThinkingLoader,
  DEFAULT_THINKING_WORDS,
} from "./AgentThinkingLoader";

/**
 * Meta du composant AgentThinkingLoader (ui-libraries §9.3).
 *
 * L'état « l'agent réfléchit » : un organisme fluide (3 blobs
 * morphing) qui respire derrière une marque papillon statique
 * monochrome. **Pas** le pattern 3-points.
 *
 * Contrats (05 §2.6 + §9.3 + S5 mobile) :
 * - GPU only : `transform`/`opacity` — pas de `layout`, pas de filters.
 * - Couleurs = `--aurora-accent-*` (theme-aware), marque = grayscale.
 * - `prefers-reduced-motion` = STATIQUE (pas de boucle, pas de
 *   rotation de mots).
 * - États : `thinking` (boucle) / `idle` (statique) / `exiting`
 *   (réduction + fondu quand le streaming commence).
 *
 * Le `butterfly` est une PROP (SVG monochrome fourni par l'app),
 * PAS embarqué (AD-1 : @aurora/ui reste sans asset).
 */
const meta = {
  title: "Aurora/UI/AgentThinkingLoader",
  component: AgentThinkingLoader,
  tags: ["autodocs"],
} satisfies Meta<typeof AgentThinkingLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

// Papillon monochrome minimal (substitut de l'asset de l'app).
const BUTTERFLY = (
  <svg viewBox="0 0 24 24" className="h-8 w-8 text-foreground/70" aria-hidden>
    <path
      d="M12 4 C 7 2, 4 6, 5 10 C 3 12, 4 16, 7 17 C 9 18, 11 16, 12 14 C 13 16, 15 18, 17 17 C 20 16, 21 12, 19 10 C 20 6, 17 2, 12 4 Z"
      fill="currentColor"
      opacity="0.8"
    />
  </svg>
);

/**
 * Défaut : état `thinking` — boucle active (organisme + rotation des
 * mots de réflexion). Sur `prefers-reduced-motion`, le rendu est
 * statique (pas de boucle).
 *
 * @summary agent en réflexion
 */
export const Defaut: Story = {
  args: {
    state: "thinking",
    butterfly: BUTTERFLY,
    words: DEFAULT_THINKING_WORDS,
  },
};

/**
 * État `idle` : l'organisme est statique (pas de boucle, pas de
 * rotation de mots). Utilisé entre deux tours de l'agent.
 *
 * @summary agent au repos
 */
export const Repos: Story = {
  args: {
    state: "idle",
    butterfly: BUTTERFLY,
  },
};

/**
 * État `exiting` : l'organisme se réduit + fond (150–250 ms) quand la
 * réponse commence à streamer. C'est l'état de transition, pas un
 * état stable.
 *
 * @summary passage à la réponse
 */
export const Sortie: Story = {
  args: {
    state: "exiting",
    butterfly: BUTTERFLY,
  },
};

/**
 * Chronomètre optionnel (`elapsedSeconds`) : le chip de durée
 * s'affiche à côté des mots de réflexion (pattern « Thought for Ns »).
 *
 * @summary avec durée écoulée
 */
export const AvecDuree: Story = {
  args: {
    state: "thinking",
    butterfly: BUTTERFLY,
    elapsedSeconds: 12,
  },
};
