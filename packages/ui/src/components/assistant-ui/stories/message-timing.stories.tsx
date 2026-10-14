import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { MessageTiming } from "../elements/message-timing.aui";

const meta = {
  title: "Assistant-UI/message-timing",
  component: MessageTiming,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <MessageTiming />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <MessageTiming />
      </div>
    </DemoAuiProvider>
  ),
};
