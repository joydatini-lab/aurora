/**
 * Badge.stories.tsx — Pastilles @reui pour statuts / drapeaux priorité / chips.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReuiBadge } from "src/index";

type Story = StoryObj<typeof ReuiBadge>;

const meta: Meta<typeof ReuiBadge> = {
  title: "Aurora/UI/Badge (@reui)",
  component: ReuiBadge,
  tags: ["autodocs"],
};
export default meta;

export const Statuts: Story = {
  render: function BadgeStatuts() {
    return (
      <div className="flex flex-wrap gap-2 p-4">
        <ReuiBadge variant="success-light">Terminé</ReuiBadge>
        <ReuiBadge variant="info-light">En cours</ReuiBadge>
        <ReuiBadge variant="warning-light">À risque</ReuiBadge>
        <ReuiBadge variant="destructive-light">Échoué</ReuiBadge>
      </div>
    );
  },
};

export const Priorite: Story = {
  render: function BadgePriorite() {
    // 4 drapeaux priorité (rouge / vert / jaune / gris) — SSoT task.priority
    return (
      <div className="flex flex-wrap gap-2 p-4">
        <ReuiBadge variant="destructive" size="sm">Haute</ReuiBadge>
        <ReuiBadge variant="warning" size="sm">Moyenne</ReuiBadge>
        <ReuiBadge variant="success" size="sm">Basse</ReuiBadge>
        <ReuiBadge variant="outline" size="sm">Sans priorité</ReuiBadge>
      </div>
    );
  },
};

export const Dense: Story = {
  render: function BadgeDense() {
    return (
      <div className="flex flex-wrap gap-1.5 p-4">
        <ReuiBadge size="xs">xs</ReuiBadge>
        <ReuiBadge size="sm">sm</ReuiBadge>
        <ReuiBadge size="default">default</ReuiBadge>
        <ReuiBadge size="lg">lg</ReuiBadge>
        <ReuiBadge size="xl">xl</ReuiBadge>
      </div>
    );
  },
};

export const Pill: Story = {
  render: function BadgePill() {
    return (
      <div className="flex flex-wrap gap-2 p-4">
        <ReuiBadge variant="primary-light" radius="full">Module Focus</ReuiBadge>
        <ReuiBadge variant="success-light" radius="full">Actif</ReuiBadge>
        <ReuiBadge variant="outline" radius="full">Archivé</ReuiBadge>
      </div>
    );
  },
};
