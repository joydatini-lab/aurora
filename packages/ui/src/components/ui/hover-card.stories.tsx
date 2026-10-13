import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./hover-card";
import { Button } from "./button";

/**
 * Meta du composant HoverCard (Radix Portal).
 *
 * Contenu monté sur `document.body` (portail). `layout: "fullscreen"`.
 *
 * Le HoverCard s'affiche **au survol** (pas au clic) : il est réservé
 * à du contenu éphémère et riche (profil, préview, carte de détail).
 * Pour un contenu cliquable ou actionnable, utiliser un `Popover`
 * (s'ouvre au clic, reste ouvert au survol).
 */
const meta = {
  title: "Aurora/UI/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : carte au survol (exemple : préview d'un collaborateur).
 *
 * @summary préview au survol
 */
export const Defaut: Story = {
  render: () => (
    <div className="flex justify-center p-12">
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link">@joyda</Button>
        </HoverCardTrigger>
        <HoverCardContent className="w-72">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">@joyda</p>
            <p className="text-xs text-muted-foreground">
              Archi UI · focus sur le design system
            </p>
            <p className="text-xs text-muted-foreground">
              14 tâches actives · dernière activité : il y a 2 h
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
};
