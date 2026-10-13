/**
 * ColorPicker.stories.tsx — Sélecteur @reui pour le thème / l'ascent / les accents.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ColorPicker,
  ColorPickerTrigger,
  ColorPickerContent,
  ColorPickerPanel,
  ColorPickerSwatch,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/ColorPicker (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const ThemeAccent: Story = {
  render: function ColorPickerAccent() {
    return (
      <div className="p-4">
        <div className="mb-3 text-sm font-medium">Accent du thème</div>
        <ColorPicker defaultValue="#3B82F6">
          <ColorPickerTrigger>
            <ColorPickerSwatch />
          </ColorPickerTrigger>
          <ColorPickerContent>
            <ColorPickerPanel />
          </ColorPickerContent>
        </ColorPicker>
      </div>
    );
  },
};

export const InlinePanel: Story = {
  render: function ColorPickerInline() {
    return (
      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 text-sm font-medium">Panneau inline</div>
        <ColorPicker defaultValue="#22C55E">
          <ColorPickerPanel />
        </ColorPicker>
      </div>
    );
  },
};
