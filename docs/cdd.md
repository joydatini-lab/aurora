# Component-Driven Development — `@aurora/ui`

> Standard Storybook-first pour l'ensemble de `packages/ui`. Objectif : chaque
> composant a une **story complète** (variants, états, a11y) vérifiée par
> Chromatic, au niveau du fichier de référence `src/components/ui/button.stories.tsx`.

## Definition of Done — « story complète »

Une story est **terminée** quand :

1. **Meta** : `title: "Aurora/<Catégorie>/<Composant>"`, `component`,
   `tags: ["autodocs"]`, `argTypes` dérivés des littéraux CVA/type exportés par
   le module (jamais dupliqués), `type Story = StoryObj<typeof meta>`.
2. **États couverts** (selon le composant) :
   - `Defaut` — état de référence ;
   - chaque `variant` / `size` ;
   - `Desactive` — état désactivé (composants interactifs) ;
   - **vide** (avec 1 action), **chargement** (`Skeleton` dans le vrai layout)
     et **erreur** (`Retry`) pour chaque région de données.
3. **≥ 1 test `play`** d'interaction via `storybook/test` (`fn`, `expect`,
   `userEvent`), tags `!dev` / `!autodocs`.
4. **Pas de `console.log`** — les callbacks utilisent `fn()`.
5. **Noms français + `@summary`** dans le JSDoc ; **données plausibles**
   (anti-pattern #20 : pas de « John Doe » ni `$1,000`).
6. **a11y** : `aria-label` sur les boutons icône-seule ; `@storybook/addon-a11y`
   actif (`test: "todo"` en CI).

## Règles ReUI (rappel `AGENTS.md`)

- État de couleur via `Badge`/`Alert` (ReUI) et tokens sémantiques ; jamais de
  palette brute pour un état.
- Espacement `gap-*` sur le parent (jamais `space-y-*`) ; `gap-1`–`gap-2` en
  ligne, `gap-3`–`gap-4` entre groupes.
- Motion : `transition-colors` pour hover/press ; 1 entrée max par vue.
- Jamais de prop/variant inventé : lire l'API du composant avant d'écrire la story.

## Backlog (audit 2026-10-15)

| Tier | Périmètre | État | Action |
|---|---|---|---|
| 0 | `ui/` primitives | 56 stories / 73 fichiers | 17 fichiers sans story (dont helpers à filtrer) + passe qualité |
| 1 | `composites/` | 11 stories groupées / 34 fichiers | upgrader les 11 (console.log → `fn`, états, `play`) + couvrir les vues sans story |
| 2 | `assistant-ui/elements/` | 23 stories / 113 éléments | ~90 éléments sans story |
| 3 | `foundations/featured-icon` | 0 story | story **après réconciliation des tokens** (voir Trouvailles) |
| 4 | `reui/` | 28 stories / 28 composants racine | passe qualité (états + `play`) |
| — | `examples/c-*` | 22 fichiers | hors périmètre (référence shadcn) |

## Trouvailles de l'audit

- `FeaturedIcon` (`foundations/featured-icon`) utilise des **tokens Untitled UI**
  (`bg-brand-secondary`, `text-featured-icon-light-fg-*`, `shadow-xs-skeuomorphic`,
  `bg-tertiary`) **absents de `aurora.css`** → composant visuellement cassé.
  Story à écrire seulement après migration des tokens vers les tokens Aurora.
- Les stories `composites/` utilisent `console.log` et `type Story = StoryObj`
  (non typé) → à upgrader.

## Boucle de vérification

```bash
pnpm --filter @aurora/ui typecheck
pnpm --filter @aurora/ui test:storybook   # exécute les play functions
pnpm --filter @aurora/ui build-storybook  # build statique (Chromatic)
```

Les self-checks ReUI (C1–C4, `.agents/skills/reui/rules/quality.md`) s'appliquent
à chaque fichier modifié.
