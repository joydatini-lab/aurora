import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { QuoteBlock } from "../elements/quote.aui";

const meta = {
  title: "Assistant-UI/Quote",
  component: QuoteBlock,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;
// QuoteBlock se branche sur MessagePrimitive.Quote — démo du layout vide

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <div data-demo="QuoteBlock (MessagePrimitive.Quote)" />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <div data-demo="QuoteBlock (MessagePrimitive.Quote)" />
      </div>
    </DemoAuiProvider>
  ),
};
