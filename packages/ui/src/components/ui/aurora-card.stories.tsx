import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, TrendingUp } from "lucide-react";

import {
  AuroraCard,
  AuroraCardBadge,
} from "./aurora-card";
import { Button as ShadButton } from "./button";

/**
 * Meta de la famille `AuroraCard` (05 design system, lot 2026-10).
 *
 * La famille remplace les ~40 classes ad-hoc `.xxx-card` :
 * 5 archétypes (`entity` / `object` / `kpi` / `node` / `media`) ×
 * 5 états AD-13 (`idle` / `loading` / `empty` / `error` / `offline`).
 */
const meta = {
  title: "Aurora/UI/AuroraCard",
  component: AuroraCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof AuroraCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Le socle : Z0 (l'enveloppe) + Z2 (le titre) — la carte minimale
 *  (SSoT 05 §3.3 : une carte sans titre est interdite).
 *
 * @summary la carte minimale
 */
export const Minimale: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-3">
      <AuroraCard title="Projet Aurora" subtitle="Objectif : v2.0 d'ici décembre" />
      <AuroraCard
        variant="entity"
        title="Tâche 12"
        subtitle="Rédiger le rapport"
        badges={<AuroraCardBadge label="En cours" tone="accent" />}
      />
    </div>
  ),
};

/** Le C2 `object` — posée, multi-sections (le `.review-card`, le
 *  `.retro-card`, le `.skill-doc-sheet-card`).
 *
 * @summary l'objet multi-sections
 */
export const Objet: Story = {
  render: () => (
    <div className="w-full max-w-sm">
      <AuroraCard
        variant="object"
        icon={<FileText className="h-4 w-4" />}
        iconTone="accent"
        title="Retrospective sprint 4"
        subtitle="28 sept — 2 oct"
        badges={
          <>
            <AuroraCardBadge label="Fermé" tone="success" />
            <AuroraCardBadge label="12 actions" tone="neutral" />
          </>
        }
        footer={
          <div className="flex w-full items-center justify-between">
            <span>3 participants</span>
            <span className="font-mono tabular-nums">98 %</span>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Deux actions bloquantes, une opportunité de process validée par
          l'équipe.
        </p>
      </AuroraCard>
    </div>
  ),
};

/** Le C3 `kpi` — KPI-tile (image #7/#8 du brief : icône + titre +
 *  description, séparateur, grand chiffre mono + %, barre de
 *  progression en bandes, CTA).
 *
 * @summary le KPI-tile
 */
export const Kpi: Story = {
  render: () => (
    <div className="grid w-full max-w-sm grid-cols-2 gap-3">
      <AuroraCard
        variant="kpi"
        icon={<TrendingUp className="h-4 w-4" />}
        iconTone="success"
        title="Maîtrise moyenne"
        subtitle="Toutes les compétences"
        value="64"
        valueUnit="%"
        delta="+4"
        deltaTone="up"
        progress={64}
      />
      <AuroraCard
        variant="kpi"
        title="Révisions faites"
        subtitle="Cette semaine"
        value="1 204"
        delta="-32"
        deltaTone="down"
        progress={80}
      />
    </div>
  ),
};

/** Le C5 `media` — image en tête + overlay + titre / description
 *  au-dessus de l'image + chips + CTA en pied (image #5 du brief :
 *  les cartes projet & discovery).
 *
 * @summary la carte premium (image)
 */
export const Media: Story = {
  render: () => (
    <div className="w-full max-w-sm">
      <AuroraCard
        variant="media"
        imageSrc="https://images.unsplash.com/photo-1519682337018-35b098db4231?w=800&q=60"
        imageAlt="Session de veille"
        title="Veille IA générative"
        subtitle="Suivi des 40 dernières publications des sources A/B"
        badges={
          <AuroraCardBadge label="3 sources" tone="neutral" className="bg-background/80" />
        }
        actions={
          <ShadButton variant="secondary" size="sm" className="w-full">
            Ouvrir le document
          </ShadButton>
        }
      />
    </div>
  ),
};

/** Le C4 `node` — nœud du graphe (le positionnement vit dans le
 *  parent, la carte n'est que le contenu).
 *
 * @summary le nœud spatial
 */
export const Node: Story = {
  render: () => (
    <div className="w-full max-w-xs space-y-2">
      <AuroraCard variant="node" title="Objectif principal" size="sm" />
      <AuroraCard
        variant="node"
        title="Prérequis"
        subtitle="Base théorique"
        size="sm"
        badges={<AuroraCardBadge label="A" tone="info" />}
      />
    </div>
  ),
};

/** Les 5 états AD-13 (le shell reste, le contenu change) — le C2.
 *
 * @summary les états AD-13
 */
export const Etats: Story = {
  render: () => (
    <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
      <AuroraCard title="Idle" variant="entity" subtitle="Contenu normal" />
      <AuroraCard title="Loading" variant="entity" state="loading" />
      <AuroraCard
        title="Vide"
        variant="entity"
        state="empty"
        emptyMessage="Aucun programme de veille."
        emptyAction={
          <ShadButton size="sm" variant="outline">
            Créer
          </ShadButton>
        }
      />
      <AuroraCard
        title="Erreur"
        variant="entity"
        state="error"
        errorMessage="Programmes indisponibles."
        onRetry={() => undefined}
      />
      <AuroraCard title="Hors ligne" variant="entity" state="offline" />
    </div>
  ),
};

/** La carte tap (navigable) — le `href` la rend un `<a>`.
 *
 * @summary la carte navigable
 */
export const Tap: Story = {
  render: () => (
    <AuroraCard
      variant="entity"
      title="Ouvrir /projects"
      subtitle="Tap = navigation (role link)"
      href="/projects"
      badges={<AuroraCardBadge label="→" tone="accent" />}
    />
  ),
};
