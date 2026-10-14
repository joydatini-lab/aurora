import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ComposerTriggerPopover } from "../elements/composer-trigger-popover.aui";

const meta = {
  title: "Assistant-UI/composer-trigger-popover",
  component: ComposerTriggerPopover,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;
const demoDirective = { char: "/", directive: { onInserted: () => undefined } };

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ComposerTriggerPopover {...demoDirective} />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ComposerTriggerPopover {...demoDirective} />
      </div>
    </DemoAuiProvider>
  ),
};
