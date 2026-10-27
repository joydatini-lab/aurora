import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";

import {
  Combobox,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxSeparator,
  ComboboxEmpty,
} from "./combobox";
import { Button } from "./button";

/**
 * Meta du composant Combobox (Radix Popover + cmdk).
 *
 * Selector avec recherche intégrée. Le trigger peut être un bouton
 * ou tout élément avec `asChild`. Le input recherche filtre les items.
 */
const meta = {
  title: "Aurora/UI/Combobox",
  component: Combobox,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : combobox simple avec liste d'options filtrables.
 * L'utilisateur tape pour rechercher parmi les éléments.
 *
 * @summary combobox de sélection simple
 */
export const Defaut: Story = {
  render: () => (
    <Combobox>
      <ComboboxTrigger asChild>
        <Button variant="outline">Sélectionner un pays</Button>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder="Rechercher…" />
        <ComboboxSeparator />
        <ComboboxItem>France</ComboboxItem>
        <ComboboxItem>Germany</ComboboxItem>
        <ComboboxItem>Japan</ComboboxItem>
        <ComboboxItem>United States</ComboboxItem>
        <ComboboxItem>Brazil</ComboboxItem>
      </ComboboxContent>
    </Combobox>
  ),
};

/**
 * Avec séparateur de groupe et indicateur de sélection.
 *
 * @summary combobox avec séparateur et items
 */
export const AvecSeparateur: Story = {
  render: () => (
    <Combobox>
      <ComboboxTrigger asChild>
        <Button variant="outline">Sélectionner</Button>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder="Filtrer…" />
        <ComboboxSeparator />
        <ComboboxItem>Rouge</ComboboxItem>
        <ComboboxItem>Bleu</ComboboxItem>
        <ComboboxItem>Vert</ComboboxItem>
        <ComboboxSeparator />
        <ComboboxItem>Jaune</ComboboxItem>
        <ComboboxItem>Orange</ComboboxItem>
      </ComboboxContent>
    </Combobox>
  ),
};

/**
 * État vide : lorsqu'aucune option ne correspond à la recherche.
 *
 * @summary état vide (aucune correspondance)
 */
export const EtatVide: Story = {
  render: () => (
    <Combobox>
      <ComboboxTrigger asChild>
        <Button variant="outline">Rechercher</Button>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput defaultValue="XYZ" />
        <ComboboxEmpty>Aucune option trouvée</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  ),
};

/**
 * Test de comportement : ouverture au clic et sélection d'un item.
 *
 * @summary test ouverture et sélection
 */
export const OuvreEtSélectionne: Story = {
  tags: ["!dev", "!autodocs"],
  name: "ouvre au clic et sélectionne un item",
  render: () => (
    <Combobox>
      <ComboboxTrigger asChild>
        <Button variant="outline" aria-label="Sélectionner une option">
          Option
        </Button>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder="Rechercher…" />
        <ComboboxItem>Alfa</ComboboxItem>
        <ComboboxItem>Beta</ComboboxItem>
        <ComboboxItem>Gamma</ComboboxItem>
      </ComboboxContent>
    </Combobox>
  ),
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button");
    await expect(button).toBeInTheDocument();

    await userEvent.click(button!);

    await waitFor(() => {
      const input = canvasElement.querySelector("input");
      expect(input).toBeInTheDocument();
    });

    const item = await new Promise<HTMLElement>((resolve) => {
      const obs = new MutationObserver(() => {
        const i = canvasElement.querySelector('[role="option"]');
        if (i) {
          obs.disconnect();
          resolve(i as HTMLElement);
        }
      });
      obs.observe(canvasElement, { childList: true, subtree: true });
    });

    await userEvent.click(item);
  },
};