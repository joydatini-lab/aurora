/**
 * IconStack.stories.tsx — Piles d'icônes @reui pour états vides / illustrés.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconStack } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/IconStack (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const EtatVide: Story = {
  render: function IconStackVide() {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <IconStack>
          <div className="size-4 rounded bg-primary" />
          <div className="size-4 rounded bg-primary/60" />
          <div className="size-4 rounded bg-primary/30" />
        </IconStack>
        <p className="text-sm text-muted-foreground">Aucune tâche en attente</p>
      </div>
    );
  },
};

export const Personnalise: Story = {
  render: function IconStackPersonnalise() {
    return (
      <div className="p-4">
        <IconStack className="text-primary">
          <div className="size-6 rounded-full bg-primary" />
          <div className="size-6 rounded-full bg-primary/50" />
          <div className="size-6 rounded-full bg-primary/25" />
        </IconStack>
      </div>
    );
  },
};
