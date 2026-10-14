import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { McpConfigDialog } from "../elements/mcp-config.aui";

const meta = {
  title: "Assistant-UI/mcp-config",
  component: McpConfigDialog,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <McpConfigDialog />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <McpConfigDialog />
      </div>
    </DemoAuiProvider>
  ),
};
