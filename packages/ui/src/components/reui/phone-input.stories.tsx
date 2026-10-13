/**
 * PhoneInput.stories.tsx — Champ @reui pour intégrations / contacts.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PhoneInput } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/PhoneInput (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const Defaut: Story = {
  render: () => (
    <div className="w-72">
      <div className="mb-2 text-sm font-medium">Numéro de téléphone</div>
      <PhoneInput
        placeholder="Choisir le pays et taper le numéro"
        defaultCountry="FR"
      />
    </div>
  ),
};

export const Compacte: Story = {
  render: () => (
    <div className="w-72">
      <div className="mb-2 text-sm font-medium">Variant sm</div>
      <PhoneInput variant="sm" defaultCountry="FR" />
    </div>
  ),
};
