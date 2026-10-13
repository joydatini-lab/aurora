/**
 * SignaturePad.stories.tsx — Signature @reui pour la validation / attestation.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  SignaturePad,
  SignaturePadArea,
  SignaturePadGuide,
  SignaturePadPlaceholder,
  SignaturePadControls,
  SignaturePadClear,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/SignaturePad (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const Attestation: Story = {
  render: function SignaturePadAttestation() {
    return (
      <div className="w-96 rounded-lg border border-border p-4">
        <div className="mb-2 text-sm font-medium">Signature du coach</div>
        <SignaturePad format="svg">
          <SignaturePadArea className="h-32">
            <SignaturePadGuide />
            <SignaturePadPlaceholder>Déposer votre signature ici</SignaturePadPlaceholder>
          </SignaturePadArea>
          <SignaturePadControls>
            <SignaturePadClear />
          </SignaturePadControls>
        </SignaturePad>
      </div>
    );
  },
};
