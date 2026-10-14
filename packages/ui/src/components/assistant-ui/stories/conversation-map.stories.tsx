import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ConversationMapAui } from "../elements/conversation-map.aui";

const meta = {
  title: "Assistant-UI/conversation-map",
  component: ConversationMapAui,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ConversationMapAui />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ConversationMapAui />
      </div>
    </DemoAuiProvider>
  ),
};
