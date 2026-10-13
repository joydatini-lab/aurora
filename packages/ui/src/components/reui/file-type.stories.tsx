/**
 * FileType.stories.tsx — Icônes de type de fichier @reui (99 formats).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileType, getFileType } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/FileType (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const Bibliotheque: Story = {
  render: function FileTypeBiblio() {
    const files = [
      { name: "RAPPORT_Q3.pdf", type: "pdf" },
      { name: "DATA.csv", type: "csv" },
      { name: "MODELE.fig", type: "fig" },
      { name: "PRESENT.pptx", type: "pptx" },
      { name: "BUDGET.xlsx", type: "xlsx" },
      { name: "NOTES.md", type: "md" },
    ];
    return (
      <div className="flex flex-wrap items-center gap-6 p-6">
        {files.map((f) => (
          <div key={f.name} className="flex flex-col items-center gap-2">
            <FileType type={f.type} size="lg" />
            <span className="text-xs text-muted-foreground">{f.name}</span>
          </div>
        ))}
      </div>
    );
  },
};

export const Resolution: Story = {
  render: function FileTypeResolution() {
    const names = ["invoice.pdf", "archive.zip", "photo.png", "clip.mp4", "README"];
    return (
      <div className="flex flex-wrap gap-4 p-6">
        {names.map((n) => {
          const t = getFileType(n);
          return (
            <FileType key={n} type={t ?? "empty"} size="default" label={n} />
          );
        })}
      </div>
    );
  },
};

export const Variants: Story = {
  render: function FileTypeVariants() {
    return (
      <div className="flex items-end gap-6 p-6">
        <div className="flex flex-col items-center gap-2">
          <FileType type="pdf" variant="outline" size="default" />
          <span className="text-xs">outline</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <FileType type="pdf" variant="solid" size="default" />
          <span className="text-xs">solid</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <FileType type="pdf" variant="light" size="default" />
          <span className="text-xs">light</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <FileType type="pdf" variant="mono" size="default" />
          <span className="text-xs">mono</span>
        </div>
      </div>
    );
  },
};
