/**
 * AppIcon.stories.tsx — Wrapper Lucide monochrome (cat. 2.15, §1.3.1).
 * Une seule famille d'icônes ; les composants importent AppIcon, pas lucide.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppIcon, type IconKey } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/AppIcon",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

const KEYS: IconKey[] = [
  "summary", "insight", "source", "citation",
  "warning", "success", "error", "info",
  "task", "project", "calendar", "timer", "habit",
  "chart", "table", "file", "file-pdf", "file-doc",
  "image", "audio", "code", "terminal", "tool",
  "approval", "permission", "copy", "retry", "open",
];

export const ToutesLesClefs: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      {KEYS.map((k) => (
        <div key={k} className="flex flex-col items-center gap-1">
          <AppIcon name={k} size="lg" />
          <span className="text-xs text-muted-foreground">{k}</span>
        </div>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="flex gap-6">
      <AppIcon name="success" size="lg" tone="success" />
      <AppIcon name="warning" size="lg" tone="warning" />
      <AppIcon name="error" size="lg" tone="danger" />
      <AppIcon name="info" size="lg" tone="muted" />
      <AppIcon name="source" size="lg" tone="default" />
    </div>
  ),
};
