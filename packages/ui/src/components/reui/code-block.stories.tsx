/**
 * CodeBlock.stories.tsx — Bloc de code @reui (Shiki) pour l'agent / découverte.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeBlock } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/CodeBlock (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

export const TypeScript: Story = {
  render: function CodeBlockTS() {
    return (
      <div className="max-w-xl">
        <CodeBlock
          language="tsx"
          showLineNumbers
          code={`export function useFocus(seconds: number) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return { elapsed, running: elapsed < seconds }
}`}
        />
      </div>
    );
  },
};

export const Diff: Story = {
  render: function CodeBlockDiff() {
    const source = `export function patch(plan: Plan) {
  const old = plan.tasks
  for (const task of old) {
    if (task.progress === 100) {
      markDone(task)
    }
  }
}`;
    return (
      <div className="max-w-xl">
        <CodeBlock
          language="ts"
          showLineNumbers
          code={source}
          diff={{ added: [2, 3], removed: [2, 3] }}
        />
      </div>
    );
  },
};

export const AvecHeader: Story = {
  render: function CodeBlockHeader() {
    return (
      <div className="max-w-xl">
        <CodeBlock
          language="json"
          label="config.json"
          showLineNumbers
          code={`{
  "focus": { "duration": 25, "break": 5 },
  "theme": "aurora"
}`}
        />
      </div>
    );
  },
};
