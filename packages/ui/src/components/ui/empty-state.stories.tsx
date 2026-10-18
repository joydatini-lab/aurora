import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Button } from "./button";
import { EmptyState } from "./empty-state";

/**
 * Meta du composant EmptyState.
 *
 * État vide riche : icône, titre, description et action (règle ReUI "empty state
 * with an action"). Composant composé — sous-composants `Header`, `Content`,
 * `Title`, `Description`, `Footer`, `AvatarRow`, `AvatarRadius`.
 */
const meta = {
  title: "Aurora/UI/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Démos d'avatars (data-URI SVG, zéro appel réseau)                    */
/* ------------------------------------------------------------------ */

const avatar1 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='16' fill='%236366f1'/%3E%3C/svg%3E";
const avatar2 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='16' fill='%2310b981'/%3E%3C/svg%3E";
const avatar3 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='16' fill='%23f59e0b'/%3E%3C/svg%3E";
const avatar4 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='16' fill='%23ef4444'/%3E%3C/svg%3E";

/* ------------------------------------------------------------------ */
/* Stories existants                                                */
/* ------------------------------------------------------------------ */

/**
 * Défaut : icône + titre + description + action principale.
 *
 * @summary état vide avec action
 */
export const Defaut: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="task" tone="muted" />
      <EmptyState.Content>
        <EmptyState.Title>Aucune tâche</EmptyState.Title>
        <EmptyState.Description>
          Créez votre première tâche pour organiser votre journée.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button size="sm">Créer une tâche</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Créer une tâche" })).toBeInTheDocument();
    await expect(canvas.getByText("Aucune tâche")).toBeInTheDocument();
  },
};

/**
 * Sans icône : titre + description + action secondaire (reset).
 *
 * @summary état vide minimal
 */
export const SansIcone: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Content>
        <EmptyState.Title>Recherche sans résultat</EmptyState.Title>
        <EmptyState.Description>
          Essayez d'autres mots-clés ou réinitialisez les filtres.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button variant="outline" size="sm">Réinitialiser</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Réinitialiser" })).toBeInTheDocument();
    await expect(canvas.getByText("Recherche sans résultat")).toBeInTheDocument();
  },
};

/**
 * Taille `sm` : icône et typographie réduites, pour un panneau compact.
 *
 * @summary variante compacte
 */
export const Petite: Story = {
  render: () => (
    <EmptyState size="sm">
      <EmptyState.Header icon="file" />
      <EmptyState.Content>
        <EmptyState.Title>Aucun document</EmptyState.Title>
        <EmptyState.Description>
          Les fichiers ajoutés apparaîtront ici.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button variant="outline" size="sm">Importer</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Importer" })).toBeInTheDocument();
    await expect(canvas.getByText("Aucun document")).toBeInTheDocument();
  },
};

/**
 * Taille `lg` : icône et typographie agrandies, pour un état vide principal.
 *
 * @summary variante grande
 */
export const Grande: Story = {
  render: () => (
    <EmptyState size="lg">
      <EmptyState.Header icon="project" tone="muted" />
      <EmptyState.Content>
        <EmptyState.Title>Aucun projet</EmptyState.Title>
        <EmptyState.Description>
          Créez votre premier projet pour commencer.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button size="sm">Créer un projet</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Créer un projet" })).toBeInTheDocument();
    await expect(canvas.getByText("Aucun projet")).toBeInTheDocument();
  },
};

/**
 * Ton `success` : état de succès (ex. opération complétée).
 *
 * @summary état de succès
 */
export const Success: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="success" tone="success" />
      <EmptyState.Content>
        <EmptyState.Title>Complété</EmptyState.Title>
        <EmptyState.Description>
          Toutes les tâches ont été terminées.
        </EmptyState.Description>
      </EmptyState.Content>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Complété")).toBeInTheDocument();
    await expect(canvas.getByText("Toutes les tâches ont été terminées.")).toBeInTheDocument();
  },
};

/**
 * Ton `warning` : état d'avertissement (ex. configuration requise).
 *
 * @summary état d'avertissement
 */
export const Warning: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="warning" tone="warning" />
      <EmptyState.Content>
        <EmptyState.Title>Attention</EmptyState.Title>
        <EmptyState.Description>
          Une configuration est requise avant de continuer.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button variant="outline" size="sm">Annuler</Button>
        <Button size="sm">Configurer</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Attention")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Configurer" })).toBeInTheDocument();
  },
};

/**
 * Ton `danger` : état d'erreur (ex. suppression réussie).
 *
 * @summary état d'erreur
 */
export const Danger: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="error" tone="danger" />
      <EmptyState.Content>
        <EmptyState.Title>Supprimé</EmptyState.Title>
        <EmptyState.Description>
          L'élément a été supprimé avec succès.
        </EmptyState.Description>
      </EmptyState.Content>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Supprimé")).toBeInTheDocument();
    await expect(canvas.getByText("L'élément a été supprimé avec succès.")).toBeInTheDocument();
  },
};

/**
 * Ton `danger` : état vierge avec bouton supprimer.
 *
 * @summary état de suppression
 */
export const DeleteConfirmed: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="info" tone="danger" />
      <EmptyState.Content>
        <EmptyState.Title>Supression complète</EmptyState.Title>
        <EmptyState.Description>
          Ce projet et tous ses fichiers seront définitivement supprimés.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button variant="outline" size="sm">Annuler</Button>
        <Button color="destructive" size="sm">
          Supprimer définitivement
        </Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Supression complète")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  },
};

/* ------------------------------------------------------------------ */
/* Stories AvatarRow                                                 */
/* ------------------------------------------------------------------ */

/**
 * AvatarRow : plusieurs avatars visibles (max 3 par défaut).
 *
 * @summary ligne d'avatars
 */
export const AvecAvatarRow: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="task" tone="muted" />
      <EmptyState.Content>
        <EmptyState.Title>Aucune tâche</EmptyState.Title>
        <EmptyState.Description>
          Créez votre première tâche pour organiser votre journée.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button size="sm">Créer une tâche</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Créer une tâche" })).toBeInTheDocument();
  },
};

/**
 * AvatarRow avec avatars spécifiés.
 *
 * @summary avec avatairs multiples
 */
export const AvecAvatars: Story = {
  render: () => (
    <EmptyState size="md">
      <EmptyState.Header icon="folders" tone="muted">
        <EmptyState.AvatarRow avatars={[{ src: avatar1, alt: "Alex Chen" }, { src: avatar2, alt: "Maria García" }, { src: avatar3, alt: "James Wilson" }, { src: avatar4, alt: "Priya Sharma" }]} maxVisible={3} />
      </EmptyState.Header>
      <EmptyState.Content>
        <EmptyState.Title>Documents partagés</EmptyState.Title>
        <EmptyState.Description>
          Aucun document partagé avec vous.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button size="sm">Explorer les documents</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Documents partagés")).toBeInTheDocument();
  },
};

/**
 * AvatarRow avec plus de 3 avatars (affiche +N).
 *
 * @summary avec masquage d'avatars
 */
export const AvecMasquageAvatars: Story = {
  render: () => (
    <EmptyState size="md">
      <EmptyState.Header icon="team" tone="muted">
        <EmptyState.AvatarRow avatars={[{ src: avatar1, alt: "Alex Chen" }, { src: avatar2, alt: "Maria García" }, { src: avatar3, alt: "James Wilson" }, { src: avatar4, alt: "Priya Sharma" }]} maxVisible={3} />
      </EmptyState.Header>
      <EmptyState.Content>
        <EmptyState.Title>Participants</EmptyState.Title>
        <EmptyState.Description>
          Aucun participant n'a encore rejoint ce projet.
        </EmptyState.Description>
      </EmptyState.Content>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Participants")).toBeInTheDocument();
  },
};

/* ------------------------------------------------------------------ */
/* Stories avec actions secondaires                                    */
/* ------------------------------------------------------------------ */

/**
 * Avec action secondaire : bouton texte + bouton principal.
 *
 * @summary état avec action secondaire
 */
export const AvecActionSecondaire: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="info" tone="muted" />
      <EmptyState.Content>
        <EmptyState.Title>Personnalisation nécessaire</EmptyState.Title>
        <EmptyState.Description>
          Configurez les paramètres pour continuer.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Annuler</Button>
          <Button size="sm">Configurer</Button>
        </div>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Configurer" })).toBeInTheDocument();
  },
};

/**
 * Description avec lien cliquable.
 *
 * @summary état avec description interactive
 */
export const AvecLienDansDescription: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="download" tone="muted" />
      <EmptyState.Content>
        <EmptyState.Title>Aucun fichier</EmptyState.Title>
        <EmptyState.Description>
          Consultez la{" "}
          <a href="/docs" className="underline hover:text-primary">
            documentation
          </a>{" "}
          pour plus d'informations.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button size="sm">Explorer les templates</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Aucun fichier")).toBeInTheDocument();
    const link = canvas.getByText("documentation");
    await expect(link).toHaveAttribute("href", "/docs");
  },
};

/**
 * Message d'erreur avec action de récupération.
 *
 * @summary état d'erreur avec récupération
 */
export const ErreurAvecRecuperation: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="alert-circle" tone="danger" />
      <EmptyState.Content>
        <EmptyState.Title>Échec du chargement</EmptyState.Title>
        <EmptyState.Description>
          Impossible de charger les données. Vérifiez votre connexion.
        </EmptyState.Description>
      </EmptyState.Content>
      <EmptyState.Footer>
        <Button variant="outline" size="sm">Annuler</Button>
        <Button size="sm">Réessayer</Button>
      </EmptyState.Footer>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Échec du chargement")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  },
};

/**
 * État de chargement initial (placeholder).
 *
 * @summary état chargement
 */
export const EnChargement: Story = {
  render: () => (
    <EmptyState>
      <EmptyState.Header icon="rotate-cw" tone="muted" />
      <EmptyState.Content>
        <EmptyState.Title>Chargement...</EmptyState.Title>
        <EmptyState.Description>
          Veuillez patienter pendant que nous analysons vos données.
        </EmptyState.Description>
      </EmptyState.Content>
    </EmptyState>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Chargement...")).toBeInTheDocument();
  },
};