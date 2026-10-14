import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { Sources } from "../elements/sources.aui";

const meta = {
  title: "Assistant-UI/sources",
  component: Sources,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;
const demoSource = { type: "source" as const, sourceType: "url" as const, id: "1", url: "https://assistant-ui.com", status: { type: "complete" as const, reason: "stop" as const } };

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <Sources {...demoSource} />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <Sources {...demoSource} />
      </div>
    </DemoAuiProvider>
  ),
};
