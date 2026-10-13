/**
 * IconTile.stories.tsx — Tuiles d'icônes @reui pour modules / habitude / features.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconTile } from "src/index";
import { Target, Calendar, Brain, FileText, Zap, Settings } from "lucide-react";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/IconTile (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const ModuleChips: Story = {
  render: function IconTileModules() {
    // Les 8 modules QuickAccess + Habitudes
    const modules = [
      { icon: Calendar, label: "Calendrier" },
      { icon: Zap, label: "Focus" },
      { icon: Brain, label: "Connaissances" },
      { icon: FileText, label: "Découvertes" },
      { icon: Target, label: "Compétences" },
      { icon: Settings, label: "Intégrations" },
    ];
    return (
      <div className="flex flex-wrap gap-3 p-4">
        {modules.map((m) => (
          <div key={m.label} className="flex items-center gap-2">
            <IconTile variant="outline" size="sm">
              <m.icon className="size-4" />
            </IconTile>
            <span className="text-sm">{m.label}</span>
          </div>
        ))}
      </div>
    );
  },
};

export const Variants: Story = {
  render: function IconTileVariants() {
    return (
      <div className="flex flex-wrap gap-4 p-4">
        <IconTile variant="outline"><Zap /></IconTile>
        <IconTile variant="soft"><Zap /></IconTile>
        <IconTile variant="solid"><Zap /></IconTile>
        <IconTile variant="elevated"><Zap /></IconTile>
      </div>
    );
  },
};

export const Sizes: Story = {
  render: function IconTileSizes() {
    return (
      <div className="flex items-center gap-4 p-4">
        <IconTile variant="outline" size="xs"><Zap className="size-3" /></IconTile>
        <IconTile variant="outline" size="sm"><Zap className="size-4" /></IconTile>
        <IconTile variant="outline" size="default"><Zap className="size-5" /></IconTile>
        <IconTile variant="outline" size="lg"><Zap className="size-6" /></IconTile>
        <IconTile variant="outline" size="xl"><Zap className="size-7" /></IconTile>
      </div>
    );
  },
};
