import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { DirectiveText } from "../elements/directive-text.aui";

const meta = {
  title: "Assistant-UI/directive-text",
  component: DirectiveText,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;
const demoText = { type: "text" as const, text: "Bonjour", status: { type: "complete" as const, reason: "stop" as const } };

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <DirectiveText {...demoText} />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <DirectiveText {...demoText} />
      </div>
    </DemoAuiProvider>
  ),
};
