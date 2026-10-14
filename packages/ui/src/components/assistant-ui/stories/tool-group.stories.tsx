import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ToolGroupRoot, ToolGroupTrigger, ToolGroupContent, ToolGroup } from "../elements/tool-group.aui";

const meta = {
  title: "Assistant-UI/tool-group",
  component: ToolGroupRoot,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ToolGroupRoot />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ToolGroupRoot />
      </div>
    </DemoAuiProvider>
  ),
};
