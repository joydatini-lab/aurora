/**
 * NumberField.stories.tsx — Champ numérique @reui pour la config Focus / routines.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
  NumberFieldDecrement,
  NumberFieldIncrement,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/NumberField (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const DureePomodoro: Story = {
  render: function NumberFieldPomodoro() {
    return (
      <div className="w-56">
        <div className="mb-2 text-sm font-medium">Durée de focus (min)</div>
        <NumberField defaultValue={25} min={5} max={120} step={5}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>
    );
  },
};

export const IntervalleRepos: Story = {
  render: function NumberFieldRepos() {
    return (
      <div className="w-56">
        <div className="mb-2 text-sm font-medium">Repos entre sessions (min)</div>
        <NumberField defaultValue={5} min={0} max={30} step={1}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>
    );
  },
};
