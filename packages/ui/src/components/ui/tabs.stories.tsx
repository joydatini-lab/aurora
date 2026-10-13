import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

/**
 * Meta du composant Tabs (Radix).
 *
 * Les tabs gèrent le focus-trap et le scroll-locking internes (Radix) —
 * aucun provider global requis.
 */
const meta = {
  title: "Aurora/UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: { defaultValue: "profil" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : trois onglets (navigation entre vues courtes).
 * Pour un workflow multi-étapes, utiliser un `Pagination` ou un
 * wizard — pas des tabs.
 *
 * @summary navigation entre vues
 */
export const Defaut: Story = {
  render: () => (
    <div className="w-80">
      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="profil">
          <p className="text-sm text-muted-foreground">
            Contenu de l'onglet Profil.
          </p>
        </TabsContent>
        <TabsContent value="securite">
          <p className="text-sm text-muted-foreground">
            Contenu de l'onglet Sécurité.
          </p>
        </TabsContent>
        <TabsContent value="notifications">
          <p className="text-sm text-muted-foreground">
            Contenu de l'onglet Notifications.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  ),
};
