import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ToolFallback, ToolFallbackRoot, ToolFallbackTrigger, ToolFallbackContent, ToolFallbackArgs, ToolFallbackResult, ToolFallbackError, ToolFallbackApproval } from "../elements/tool-fallback.aui";

const meta = {
  title: "Assistant-UI/tool-fallback",
  component: ToolFallback,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;
const demoToolPart = { type: "tool-call" as const, toolCallId: "1", toolName: "task", args: {}, argsText: "", status: { type: "running" as const }, addResult: () => undefined, resume: () => undefined, respondToApproval: async () => undefined };

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ToolFallback {...demoToolPart} />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ToolFallback {...demoToolPart} />
      </div>
    </DemoAuiProvider>
  ),
};
