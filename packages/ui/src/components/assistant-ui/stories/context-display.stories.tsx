import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ContextDisplayRoot, ContextDisplayText } from "../elements/context-display.aui";

const meta = {
  title: "Assistant-UI/context-display",
  component: ContextDisplayRoot,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ContextDisplayRoot modelContextWindow={200000}><ContextDisplayText modelContextWindow={200000} /></ContextDisplayRoot>
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ContextDisplayRoot modelContextWindow={200000}><ContextDisplayText modelContextWindow={200000} /></ContextDisplayRoot>
      </div>
    </DemoAuiProvider>
  ),
};
