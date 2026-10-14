import type { Meta, StoryObj } from "@storybook/react-vite";
import { DemoAuiProvider } from "../demo/demo-aui-provider";
import { ThreadList, ThreadListRoot, ThreadListItems, ThreadListItem, ThreadListSearch, ThreadListNew } from "../elements/thread-list.aui";

const meta = {
  title: "Assistant-UI/thread-list",
  component: ThreadList,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Desktop: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 720, margin: "0 auto" }}>
        <ThreadList />
      </div>
    </DemoAuiProvider>
  ),
};

export const Mobile: Story = {
  render: () => (
    <DemoAuiProvider>
      <div style={{ width: 375, margin: "0 auto", padding: 12 }}>
        <ThreadList />
      </div>
    </DemoAuiProvider>
  ),
};
