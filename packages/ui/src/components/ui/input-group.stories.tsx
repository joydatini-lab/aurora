import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Copy, Mail, Search } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./input-group";

/**
 * Meta du composant InputGroup.
 *
 * Groupe de saisie : addons avant/après (`InputGroupAddon` align
 * `inline-start` / `inline-end` / `block-start` / `block-end`), texte
 * (`InputGroupText`), bouton (`InputGroupButton`) et contrôle
 * (`InputGroupInput` / `InputGroupTextarea`).
 */
const meta = {
  title: "Aurora/UI/InputGroup",
  component: InputGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : préfixe texte (`https://`) avant le champ.
 *
 * @summary champ avec préfixe
 */
export const Defaut: Story = {
  render: () => (
    <div className="max-w-sm">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="votre-domaine.com" />
      </InputGroup>
    </div>
  ),
};

/**
 * Icône avant + bouton d'action après.
 *
 * @summary champ avec icône et action
 */
export const AvecBouton: Story = {
  render: () => (
    <div className="max-w-sm">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <Search className="size-4" aria-hidden />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="Rechercher…" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>Envoyer</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/**
 * Champ désactivé : addon et contrôle grisés.
 *
 * @summary état désactivé
 */
export const Desactive: Story = {
  render: () => (
    <div className="max-w-sm">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <Mail className="size-4" aria-hidden />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="olivia@exemple.com" disabled />
      </InputGroup>
    </div>
  ),
};

/**
 * Champ invalide : bordure et anneau d'erreur (aria-invalid).
 *
 * @summary état d'erreur
 */
export const Invalide: Story = {
  render: () => (
    <div className="max-w-sm">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>€</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="Montant" aria-invalid="true" />
      </InputGroup>
    </div>
  ),
};

/**
 * Variante `textarea` : addons en haut et en bas.
 *
 * @summary zone de texte avec addons
 */
export const AvecTextarea: Story = {
  render: () => (
    <div className="max-w-sm">
      <InputGroup>
        <InputGroupAddon align="block-start">
          <InputGroupText>Message</InputGroupText>
        </InputGroupAddon>
        <InputGroupTextarea placeholder="Votre message…" rows={4} />
        <InputGroupAddon align="block-end">
          <InputGroupButton size="sm">Envoyer</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/**
 * Bouton d'action dans l'addon (copier une valeur).
 *
 * @summary action copier
 */
export const AvecBoutonCopier: Story = {
  render: () => (
    <div className="max-w-sm">
      <InputGroup>
        <InputGroupInput defaultValue="https://aurora.example/invite/abc123" readOnly />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-sm" aria-label="Copier">
            <Copy className="size-4" aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

/**
 * Test d'accessibilité : le groupe est un `role="group"` et le champ est
 * accessible par son libellé.
 *
 * @summary accessible (group + textbox)
 */
export const Accessible: Story = {
  tags: ["!dev", "!autodocs"],
  name: "expose un groupe et un champ accessible",
  render: () => (
    <InputGroup>
      <InputGroupInput placeholder="Rechercher…" aria-label="Recherche" />
    </InputGroup>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group")).toBeInTheDocument();
    await expect(
      canvas.getByRole("textbox", { name: "Recherche" }),
    ).toBeInTheDocument();
  },
};
