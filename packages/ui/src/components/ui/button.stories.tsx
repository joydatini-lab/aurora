import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import {
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  Button,
  type ButtonProps,
} from "./button";

/**
 * Meta du composant Button.
 *
 * `component` est requis pour la table de props auto ; `argTypes` dérive
 * les options des contrôles CVA depuis les littéraux exportés par le
 * module (source unique, jamais dupliquées ici).
 */
const meta = {
  title: "Aurora/UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: BUTTON_VARIANTS },
    size: { control: "select", options: BUTTON_SIZES },
  },
  args: { children: "Bouton" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : variante `default` + taille `default`, l'état de référence du
 * composant. C'est la story dont le test de comportement dérive.
 *
 * @summary état de référence
 */
export const Defaut: Story = {};

/**
 * Le bouton primaire est l'action principale d'une vue.
 * Il n'y en a qu'un par vue (règle de registre de voix Aurora).
 *
 * @summary action principale d'une vue
 */
export const Primaire: Story = { args: { variant: "default" } };

/**
 * Le bouton destructif est réservé aux actions irréversibles
 * (supprimer, quitter). Jamais au flow principal.
 *
 * @summary action irréversible
 */
export const Destructif: Story = { args: { variant: "destructive" } };

/**
 * Le bouton fantôme (`ghost`) est l'action de faible hiérarchie,
 * sans fond, à réserver aux actions secondaires d'un outil.
 *
 * @summary action secondaire discrète
 */
export const Fantome: Story = { args: { variant: "ghost" } };

/**
 * Le bouton d'icône (`size="icon"`) est un carré 9/9 pour une icône seule,
 * sans texte visible. L'accessibilité est portée par `aria-label`.
 *
 * @summary icône seule, accessible
 */
export const Icone: Story = {
  args: { size: "icon", variant: "ghost", "aria-label": "Réinitialiser" },
  render: (args: ButtonProps) => (
    <Button {...({ ...args, children: undefined })}>
      ↺
    </Button>
  ),
};

/**
 * Un bouton désactivé est grisé et ne répond plus au clic.
 * Le concept « désactivé » s'applique à toutes les variantes.
 *
 * @summary état inactif
 */
export const Desactive: Story = {
  args: { disabled: true },
};

/**
 * Test de comportement : le bouton appelle `onClick` quand il est cliqué.
 *
 * Tags `!dev`/`!autodocs` : story test-only, absente de la page de docs
 * mais exécutée par le panel Interactions et en CI (addon-vitest).
 */
export const Clic: Story = {
  tags: ["!dev", "!autodocs"],
  name: "quand le bouton est cliqué, appelle onClick",
  args: { onClick: fn(), children: "Valider" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(
      canvas.getByRole("button", { name: "Valider" }),
    ).toBeInTheDocument();
  },
};

