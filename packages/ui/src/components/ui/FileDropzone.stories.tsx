/**
 * FileDropzone.stories.tsx — Zone de dépôt de fichiers (cat. 2.16, 2.21).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileDropzone } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/FileDropzone",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const ZoneSimple: Story = {
  render: () => (
    <div className="w-96">
      <FileDropzone
        title="Déposer des documents"
        description="Formats acceptés : PDF, DOCX, XLSX — 10 Mo max"
        accept=".pdf,.docx,.xlsx"
        maxFiles={5}
      />
    </div>
  ),
};

export const ImagesSeulement: Story = {
  render: () => (
    <div className="w-96">
      <FileDropzone
        title="Ajouter des images"
        description="PNG, JPG, WebP — 5 Mo par image"
        accept="image/*"
        multiple
        maxFiles={10}
        variant="solid"
      />
    </div>
  ),
};
