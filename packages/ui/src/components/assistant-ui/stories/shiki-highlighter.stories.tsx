import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { SyntaxHighlighter } from "../elements/shiki-highlighter.aui";

const meta = {
  title: "Assistant-UI/shiki-highlighter",
  component: SyntaxHighlighter,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <SyntaxHighlighter language="typescript" code="const x = 1" />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <SyntaxHighlighter language="typescript" code="const x = 1" />
      </div>
    </DemoAuiProvider>
  ),
};
