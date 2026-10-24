import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

/**
 * Meta du composant Accordion (Radix Accordion).
 *
 * Liste de sections repliables (FAQ, réglages groupés). Le type de
 * comportement se pilote par la prop `type` du `Accordion` :
 * - `"single"` (par défaut) : un seul item ouvert à la fois.
 * - `"multiple"` : plusieurs items ouverts en même temps.
 * - Collapsable : ajouter `collapsible` en `single` pour pouvoir
 *   refermer l'item ouvert.
 *
 * Pour une navigation entre vues courtes, utiliser `Tabs` — pas un
 * Accordion.
 */
const meta = {
  title: "Aurora/UI/Accordion",
  tags: ["autodocs"],
} satisfies Meta<never>;

export default meta;
type Story = StoryObj;

/**
 * Défaut : accordéon simple (un item ouvert à la fois, pas de
 * collapse).
 *
 * @summary sections repliables
 */
export const Defaut: Story = {
  render: () => (
    <Accordion type="single" className="w-96" defaultValue="item-1">
      <AccordionItem value="item-1">
        <AccordionTrigger>Qu'est-ce que le focus ?</AccordionTrigger>
        <AccordionContent>
          Le focus est la session de travail concentrée sans distraction.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Comment planifier ?</AccordionTrigger>
        <AccordionContent>
          Une tâche, un créneau, une intention. Pas plus.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

/**
 * Multi-ouverture : plusieurs sections restent ouvertes (ex. sections
 * d'un réglage que l'on édite en parallèle).
 *
 * @summary plusieurs sections ouvertes
 */
export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-96" defaultValue={["a", "b"]}>
      <AccordionItem value="a">
        <AccordionTrigger>Profil</AccordionTrigger>
        <AccordionContent>Contenu du profil.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Sécurité</AccordionTrigger>
        <AccordionContent>Contenu de la sécurité.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="c">
        <AccordionTrigger>Notifications</AccordionTrigger>
        <AccordionContent>Contenu des notifications.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
