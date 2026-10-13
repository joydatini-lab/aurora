import type { Meta, StoryObj } from "@storybook/react-vite";

import { KeyValueList, type KeyValueItem } from "./KeyValueList";

const items: KeyValueItem[] = [
  { key: "Matière", value: "Physique — 2e année" },
  { key: "Coefficient", value: 4, mono: true },
  { key: "Évaluation", value: "CC1" },
  { key: "Moyenne cible", value: "14/20", mono: true },
];

/**
 * Meta du composant KeyValueList (contrat AD-10 §3.6.2).
 *
 * Liste clé/valeur au style definition-list (métadonnées d'examen,
 * détails de source, contexte d'item). Les valeurs numériques
 * (`mono: true`) s'affichent en `JetBrains Mono` `tabular-nums`
 * (05 §2.2) — alignées en colonne.
 *
 * Les 5 états AD-13 : idle / loading (skeleton) / empty / error
 * (callout + retry) / offline (last-known). Pilotés par les props
 * `loading` / `emptyMessage` / `errorMessage` / `onRetry`.
 */
const meta = {
  title: "Aurora/UI/KeyValueList",
  component: KeyValueList,
  tags: ["autodocs"],
} satisfies Meta<typeof KeyValueList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : 4 lignes clé/valeur (2 mono). Le `Coefficient` et la
 * `Moyenne cible` sont en monospace (valeurs numériques).
 *
 * @summary métadonnées
 */
export const Defaut: Story = {
  args: { items },
};

/**
 * État vide : le message info s'affiche (pas de liste factice).
 *
 * @summary état vide
 */
export const Vide: Story = {
  args: {
    items: [],
    emptyMessage: "Aucune métadonnée disponible.",
  },
};

/**
 * État erreur : le callout `danger` + bouton retry remplace la liste
 * (le dataset last-known n'est pas affiché, une liste de clés seules
 * n'a pas de sens sans les valeurs).
 *
 * @summary état erreur
 */
export const Erreur: Story = {
  args: {
    items,
    errorMessage: "Impossible de charger les métadonnées",
    onRetry: () => {},
  },
};

/**
 * État chargement : les lignes squelette (pulse) remplacent les
 * données pendant la fetch.
 *
 * @summary état chargement
 */
export const Chargement: Story = {
  args: {
    items,
    loading: true,
  },
};
