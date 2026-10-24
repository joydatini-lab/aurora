import type { Meta, StoryObj } from "@storybook/react-vite";

import { WobbleCard, Marquee, NumberTick } from "./premium";

/**
 * Meta du module `premium` (effets de mise en valeur, §2 step 3).
 *
 * Le module regroupe les composants d'impact visuel (WobbleCard,
 * Marquee, NumberTick, InteractiveCard, Beam, ShineEffect,
 * BlurredSpotlight) — tous construits pour le GPU (transform/opacity)
 * et tous respectant le registre d'animation calmed (05 §2.6 :
 * durées fast/normal/slow, pas de bounce).
 *
 * Ce sont des **effets d'application**, pas des primitives du design
 * system : à réserver aux écrans d'impact (objectif, bilan, ticker),
 * pas au flux utilitaire.
 */
const meta = {
  title: "Aurora/UI/Premium",
  tags: ["autodocs"],
} satisfies Meta<never>;

export default meta;
type Story = StoryObj;

/**
 * WobbleCard : carte interactive (wobble sur le survol, GPU
 * `rotateX/rotateY`). À utiliser pour les GoalProject cards — pas
 * pour les cartes de données (celles-ci restent en `Card` standard).
 *
 * @summary carte interactive
 */
export const Wobble: Story = {
  render: () => (
    <div className="w-72 p-4">
      <WobbleCard className="rounded-lg border bg-card p-5">
        <h3 className="text-base font-semibold">Objectif du trimestre</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Atteindre 20 h de focus hebdomadaires.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Survolez la carte : le wobble est en `transform` (GPU), pas
          de reflow.
        </p>
      </WobbleCard>
    </div>
  ),
};

/**
 * Marquee : ticker à défilement continu (notifications, flux de
 * mentions). La boucle est CSS `translateX` (GPU) — `paused` au
 * survol (pas de surprise).
 *
 * @summary ticker de notifications
 */
export const Ticker: Story = {
  render: () => (
    <Marquee
      className="w-full max-w-md rounded-lg border bg-card py-3 [--duration:30s]"
      pauseOnHover
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="px-4 text-sm text-muted-foreground">
          Notification {i + 1}
        </span>
      ))}
    </Marquee>
  ),
};

/**
 * NumberTick : compteur qui s'incrémente jusqu'à la valeur cible
 * (KPI, bilan). La durée est `normal` (250 ms, 05 §2.6) — pas un
 * effet « wow » à 2 s.
 *
 * @summary compteur KPI
 */
export const Compteur: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-1">
      <NumberTick value={1284} className="font-mono text-3xl font-bold tabular-nums" />
      <span className="text-xs text-muted-foreground">tâches complétées</span>
    </div>
  ),
};
