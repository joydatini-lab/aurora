import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";
import { Button } from "./button";

/**
 * Meta du composant Tooltip (Radix Portal).
 *
 * Le `TooltipProvider` est requis globalement — branché dans
 * `.storybook/preview.tsx` (`delayDuration=0` pour l'apparition
 * instantanée dans les stories/tests). Aucune story ne le redéclare.
 *
 * Contenu monté sur `document.body` (portail). `layout: "fullscreen"`.
 */
const meta = {
  title: "Aurora/UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : un tooltip au survol du trigger.
 * Pour les actions critiques, utiliser un `Alert` (contenu persistant),
 * pas un tooltip (contenu éphémère).
 *
 * @summary aide au survol
 */
export const Defaut: Story = {
  render: () => (
    <div className="flex justify-center p-12">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Survoler</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Affiche une aide au survol.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};
