import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ModelSelector } from "../elements/model-selector.aui";

const meta = {
  title: "Assistant-UI/model-selector",
  component: ModelSelector,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;
const demoModels = [{ id: "claude", name: "Claude Sonnet 4.5" }, { id: "gpt", name: "GPT-5" }];

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ModelSelector models={demoModels} />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ModelSelector models={demoModels} />
      </div>
    </DemoAuiProvider>
  ),
};
