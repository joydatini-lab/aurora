import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Calendar } from "./calendar";

/**
 * Meta du composant Calendar (react-day-picker).
 *
 * Sélecteur de date avec navigation mois/année. Supporte
 * la sélection simple, les plages de dates et l'affichage
 * des jours externes.
 */
const meta = {
  title: "Aurora/UI/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : calendrier simple avec navigation mois.
 *
 * @summary calendrier par défaut
 */
export const Defaut: Story = {
  render: () => (
    <div className="p-4">
      <Calendar
        mode="single"
        selected={new Date(2024, 0, 15)}
        onSelect={() => {}}
      />
    </div>
  ),
};

/**
 * Sélection multiple avec plusieurs dates.
 *
 * @summary sélection multiple
 */
export const MultiSelection: Story = {
  render: () => (
    <div className="p-4">
      <Calendar
        mode="multiple"
        selected={[new Date(2024, 0, 15), new Date(2024, 0, 20), new Date(2024, 1, 5)]}
        onSelect={() => {}}
      />
    </div>
  ),
};

/**
 * Sélection de plage de dates.
 *
 * @summary sélection de plage
 */
export const PlageDeDates: Story = {
  render: () => (
    <div className="p-4">
      <Calendar
        mode="range"
        selected={{
          from: new Date(2024, 0, 10),
          to: new Date(2024, 0, 25),
        }}
        onSelect={() => {}}
      />
    </div>
  ),
};

/**
 * Sans les jours externes (mois suivant/précédent).
 *
 * @summary sans jours externes
 */
export const SansJoursExternes: Story = {
  render: () => (
    <div className="p-4">
      <Calendar
        showOutsideDays={false}
        mode="single"
        selected={new Date(2024, 0, 15)}
        onSelect={() => {}}
      />
    </div>
  ),
};

/**
 * Navigation par déroulement (captionLayout="dropdown").
 *
 * @summary navigation par déroulement
 */
export const NavigationParDeroulment: Story = {
  render: () => (
    <div className="p-4">
      <Calendar
        captionLayout="dropdown"
        mode="single"
        selected={new Date(2024, 5, 15)}
        onSelect={() => {}}
      />
    </div>
  ),
};

/**
 * Test de navigation entre les mois.
 *
 * @summary test navigation
 */
export const NavigationMois: Story = {
  tags: ["!dev", "!autodocs"],
  name: "navigue entre les mois",
  render: () => (
    <div className="p-4">
      <Calendar
        mode="single"
        selected={new Date(2024, 0, 15)}
        onSelect={() => {}}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const nextButton = (canvasElement as HTMLElement).querySelector('[aria-label="Go to next month"]');
    const prevButton = (canvasElement as HTMLElement).querySelector('[aria-label="Go to previous month"]');

    await expect(prevButton).toBeInTheDocument();
    await expect(nextButton).toBeInTheDocument();

    await (nextButton as HTMLButtonElement)?.click();
    await (prevButton as HTMLButtonElement)?.click();
  },
};

/**
 * Calendrier dans un état de chargement (avec Skeleton).
 *
 * @summary état de chargement
 */
export const EtatChargement: Story = {
  render: () => (
    <div className="p-4">
      <div className="space-y-4 rounded-md border p-4">
        <div className="h-4 w-32 animate-pulse rounded" />
        <Calendar
          showOutsideDays={false}
          disabled
        />
      </div>
    </div>
  ),
};