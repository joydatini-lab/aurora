/**
 * Cascader.stories.tsx — Sélecteur en cascade @reui pour domaines / régions.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Cascader,
  CascaderTrigger,
  CascaderContent,
} from "src/index";
import type { CascaderNode } from "src/components/reui/cascader/cascader-types";
import { Button } from "src/index";

type Story = StoryObj;

const DOMAINS: CascaderNode[] = [
  {
    value: "sante",
    label: "Santé",
    children: [
      { value: "sante-alimentation", label: "Alimentation" },
      { value: "sante-sommeil", label: "Sommeil" },
    ],
  },
  {
    value: "vie",
    label: "Vie",
    children: [
      { value: "vie-finances", label: "Finances" },
      { value: "vie-relationnel", label: "Relationnel" },
    ],
  },
  {
    value: "esprit",
    label: "État d'esprit",
    children: [
      { value: "esprit-meditation", label: "Méditation" },
      { value: "esprit-apprentissage", label: "Apprentissage" },
    ],
  },
];

const meta: Meta = {
  title: "Aurora/UI/Cascader (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const DomaineHabitude: Story = {
  render: function CascaderDomaine() {
    return (
      <div className="w-64">
        <div className="mb-2 text-sm font-medium">Domaine d'habitude</div>
        <Cascader items={DOMAINS} mode="columns" defaultOpen>
          <CascaderTrigger aria-label="Choisir un domaine">
            <Button variant="outline" className="w-full justify-between">
              Domaine…
            </Button>
          </CascaderTrigger>
          <CascaderContent />
        </Cascader>
      </div>
    );
  },
};

export const ModeTree: Story = {
  render: function CascaderTree() {
    return (
      <div className="w-64">
        <div className="mb-2 text-sm font-medium">Mode arbre</div>
        <Cascader items={DOMAINS} mode="tree" defaultOpen>
          <CascaderTrigger aria-label="Choisir un domaine">
            <Button variant="outline" className="w-full justify-between">
              Domaine…
            </Button>
          </CascaderTrigger>
          <CascaderContent />
        </Cascader>
      </div>
    );
  },
};
