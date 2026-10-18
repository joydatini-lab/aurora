import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "./field";
import { Input } from "./input";

/**
 * Meta du composant Field.
 *
 * Champ de formulaire : libellé (`FieldLabel`), contenu (`FieldContent`),
 * description (`FieldDescription`) et erreur (`FieldError`, `role="alert"`).
 * Orientation `vertical` (défaut), `horizontal` ou `responsive`.
 */
const meta = {
  title: "Aurora/UI/Field",
  component: Field,
  tags: ["autodocs"],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : libellé + champ + description (orientation verticale).
 *
 * @summary champ vertical
 */
export const Defaut: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
      <FieldContent>
        <Input id="email" placeholder="olivia@exemple.com" />
        <FieldDescription>Nous ne partageons jamais votre e-mail.</FieldDescription>
      </FieldContent>
    </Field>
  ),
};

/**
 * Orientation horizontale : libellé à gauche, contrôle à droite.
 *
 * @summary champ horizontal
 */
export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="max-w-md">
      <FieldLabel htmlFor="site">Site web</FieldLabel>
      <FieldContent>
        <Input id="site" placeholder="www.exemple.com" />
      </FieldContent>
    </Field>
  ),
};

/**
 * État d'erreur : libellé et description, message via `FieldError`.
 *
 * @summary état d'erreur
 */
export const AvecErreur: Story = {
  render: () => (
    <Field className="max-w-sm" data-invalid="true">
      <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
      <FieldContent>
        <Input id="password" type="password" aria-invalid="true" />
        <FieldDescription>8 caractères minimum.</FieldDescription>
        <FieldError errors={[{ message: "Le mot de passe est trop court." }]} />
      </FieldContent>
    </Field>
  ),
};

/**
 * Test d'accessibilité : libellé lié au champ + message d'erreur annoncé.
 *
 * @summary accessible (label + alert)
 */
export const Accessible: Story = {
  tags: ["!dev", "!autodocs"],
  name: "expose un libellé lié et un rôle alert en erreur",
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
      <FieldContent>
        <Input id="email" placeholder="olivia@exemple.com" />
        <FieldError errors={[{ message: "Format invalide." }]} />
      </FieldContent>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Adresse e-mail")).toBeInTheDocument();
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
  },
};
