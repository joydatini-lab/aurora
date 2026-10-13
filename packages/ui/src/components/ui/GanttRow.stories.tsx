import type { Meta, StoryObj } from "@storybook/react-vite";

import { GanttRow } from "./GanttRow";
import type { GanttRowProps } from "../../renderers/contracts";

const base: GanttRowProps = {
  title: "Relire le rapport Q3",
  status: "in-progress",
  start: 0.25,
  end: 0.75,
  completionPct: 60,
  axisLabels: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
};

/**
 * Meta du composant GanttRow (contrat AD-10 §3.6.4).
 *
 * Une tâche = une ligne (Gantt mobile-first, axe de dates partagé).
 * La position de la barre est dérivée de `start`/`end` (0..1 sur l'axe
 * partagé) ; la couleur est pilotée par le `status` (in-progress =
 * primary / done = success / todo = border-strong / blocked = warning)
 * — pas un état sémantique (05 §5.1 blocking rule : le status est
 * un état de progression, pas un signal success/warning/danger).
 *
 * `completionPct` (optionnel) dessine le bicolore (fondu avant/après)
 * à l'intérieur de la barre de durée (redesign premium, image de
 * référence manager.go). `isMilestone` remplace la barre par une
 * lozange (45°) — un jalons n'a pas de durée.
 */
const meta = {
  title: "Aurora/UI/GanttRow",
  component: GanttRow,
  tags: ["autodocs"],
  argTypes: {
    isMilestone: { control: "boolean" },
  },
} satisfies Meta<typeof GanttRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Défaut : tâche en cours (60% completée, barre `primary`, axe 5
 * jours). La barre de remplissage (`completionPct`) apparaît à
 * l'intérieur de la barre de durée.
 *
 * @summary tâche en cours
 */
export const Defaut: Story = {
  args: base,
};

/**
 * Tâche terminée : barre `success` (complétion). `completionPct` =
 * 100 (la barre de remplissage couvre toute la durée).
 *
 * @summary tâche terminée
 */
export const Terminee: Story = {
  args: { ...base, status: "done", completionPct: 100 },
};

/**
 * Tâche à faire : barre `border-strong` (pas encore démarrée).
 * `completionPct` absent = pas de remplissage interne.
 *
 * @summary tâche à faire
 */
export const Afaire: Story = {
  name: "À faire",
  args: { ...base, status: "todo", completionPct: undefined },
};

/**
 * Tâche bloquée : barre `warning` (dépendance non résolue).
 *
 * @summary tâche bloquée
 */
export const Bloquee: Story = {
  args: { ...base, status: "blocked", completionPct: 30 },
};

/**
 * Jalon (`isMilestone`) : la barre est remplacée par une lozange
 * (45°, accent `punctual`) centrée sur `start`. Le `title` passe à
 * droite de la lozange (image de référence : les jalons sont marqués
 * à droite du point). `end` et `completionPct` sont ignorés.
 *
 * @summary jalons (durée nulle)
 */
export const Jalons: Story = {
  args: {
    ...base,
    isMilestone: true,
    start: 0.5,
    completionPct: undefined,
  },
};

/**
 * État erreur : le callout `danger` + bouton retry remplace la ligne
 * de Gantt (le dataset last-synced n'est pas affiché, car une ligne
 * Gantt isolée n'a pas de sens sans le contexte de l'axe).
 *
 * @summary état erreur
 */
export const Erreur: Story = {
  args: {
    ...base,
    errorMessage: "Impossible de charger les échéances",
    onRetry: () => {},
  },
};

/**
 * Aperçu du graphe complet (image de référence manager.go) : 4 lignes
 * (2 tâches + 1 jalon + 1 tâche bloquée) empilées, axe de temps
 * partagé en bas. C'est ce que l'app monte en `retro` / `dashboard`.
 *
 * Tags `!dev`/`!autodocs` : story d'aperçu de composition, pas un
 * test de comportement — absente du panel Interactions.
 */
export const GrapheComplet: Story = {
  tags: ["!dev", "!autodocs"],
  name: "graphe Gantt complet (4 tâches + 1 jalon, axe partagé)",
  args: base,
  render: () => (
    <div className="w-96 rounded-lg border bg-card p-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-wide text-muted-foreground">
        Projet X
      </p>
      <div className="space-y-3">
        <GanttRow
          title="Tâche 1"
          status="in-progress"
          start={0.05}
          end={0.35}
          completionPct={60}
        />
        <GanttRow
          title="Tâche 2"
          status="done"
          start={0.3}
          end={0.6}
          completionPct={100}
        />
        <GanttRow
          title="Validation"
          status="in-progress"
          start={0.45}
          end={0.45}
          isMilestone
        />
        <GanttRow
          title="Tâche 4"
          status="blocked"
          start={0.6}
          end={0.95}
          completionPct={20}
        />
        <GanttRow
          title=""
          status="todo"
          start={0}
          end={1}
          axisLabels={["Sem. 1", "Sem. 2", "Sem. 3", "Sem. 4", "Sem. 5"]}
        />
      </div>
    </div>
  ),
};
