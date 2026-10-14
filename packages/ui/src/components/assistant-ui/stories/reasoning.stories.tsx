import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ReasoningRoot, ReasoningText } from "../elements/reasoning.aui";

const meta = {
  title: "Assistant-UI/reasoning",
  component: ReasoningRoot,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;
const demoReasoning = { type: "reasoning" as const, text: "Analyse du problème..." };

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ReasoningRoot><ReasoningText>{demoReasoning.text}</ReasoningText></ReasoningRoot>
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ReasoningRoot><ReasoningText>{demoReasoning.text}</ReasoningText></ReasoningRoot>
      </div>
    </DemoAuiProvider>
  ),
};
