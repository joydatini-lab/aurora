/**
 * Message.stories.tsx — Bulles de conversation Agent (cat. 2.15).
 * Utilisateur à droite, assistant à gauche, système en fond.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Message } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Message",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

export const FilDeConversation: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-4">
      <Message variant="user" timestamp="14:30">
        Peux-tu résumer l'avancement du projet Aurora ?
      </Message>

      <Message
        variant="assistant"
        title="Aurora Agent"
        timestamp="14:31"
        onCopy={() => console.log("copied")}
      >
        Le design system v2 est prêt. Les composants ReUI sont installés et les
        28 stories passent le typecheck. Prochaine étape : l'assemblage des
        écrans.
      </Message>

      <Message
        variant="assistant"
        title="Aurora Agent"
        attachments={[
          { id: "1", name: "rapport_q3.pdf", size: "1.2 Mo" },
          { id: "2", name: "planning.xlsx", size: "340 Ko" },
        ]}
      >
        Voici les deux documents du rapport. Le planning est à jour.
      </Message>

      <Message variant="system">Session enregistrée automatiquement.</Message>
    </div>
  ),
};
