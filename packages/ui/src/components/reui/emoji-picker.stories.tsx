/**
 * EmojiPicker.stories.tsx — Picker @reui pour le chat / la capture / les reactions.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  EmojiPicker,
  EmojiPickerTrigger,
  EmojiPickerContent,
} from "src/index";
import { Smile } from "lucide-react";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/EmojiPicker (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const ChatComposer: Story = {
  render: function EmojiPickerChat() {
    return (
      <div className="flex items-center gap-2 p-4">
        <EmojiPicker>
          <EmojiPickerTrigger>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-transparent hover:bg-muted"
            >
              <Smile className="size-4" />
            </button>
          </EmojiPickerTrigger>
          <EmojiPickerContent align="start" className="w-72" />
        </EmojiPicker>
        <div className="flex-1 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground">
          Écrire un message…
        </div>
      </div>
    );
  },
};

export const IconPage: Story = {
  render: function EmojiPickerIcon() {
    return (
      <div className="p-4">
        <div className="mb-3 text-sm font-medium">Icône de page</div>
        <EmojiPicker>
          <EmojiPickerTrigger>
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center rounded-lg border-2 border-dashed border-input text-2xl"
            >
              📋
            </button>
          </EmojiPickerTrigger>
          <EmojiPickerContent align="start" className="w-72" />
        </EmojiPicker>
      </div>
    );
  },
};
