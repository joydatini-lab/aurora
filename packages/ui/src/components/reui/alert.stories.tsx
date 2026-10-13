/**
 * Alert.stories.tsx
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReuiAlert, ReuiAlertTitle, ReuiAlertDescription } from "src/index";

type Story = StoryObj<typeof ReuiAlert>;

const meta: Meta<typeof ReuiAlert> = {
  title: "Aurora/UI/Alert (@reui)",
  component: ReuiAlert,
  tags: ["autodocs"],
};
export default meta;

export const Defaut: Story = {
  render: () => (
    <ReuiAlert>
      <ReuiAlertTitle>Annulation du plan</ReuiAlertTitle>
      <ReuiAlertDescription>
        Ton abonnement est suspendu mais tes données restent 30 jours.
      </ReuiAlertDescription>
    </ReuiAlert>
  ),
};

export const Destructif: Story = {
  render: () => (
    <ReuiAlert variant="destructive">
      <ReuiAlertTitle>Erreur</ReuiAlertTitle>
      <ReuiAlertDescription>Impossible de connecter à l'API.</ReuiAlertDescription>
    </ReuiAlert>
  ),
};
