import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ThreadFollowupSuggestions } from "../elements/follow-up-suggestions.aui";

const meta = {
  title: "Assistant-UI/follow-up-suggestions",
  component: ThreadFollowupSuggestions,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ThreadFollowupSuggestions />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ThreadFollowupSuggestions />
      </div>
    </DemoAuiProvider>
  ),
};
