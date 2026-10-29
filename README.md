# Aurora — design system & coquille web

**État au 2026-10-29 : le dépôt a été purgé puis reconstruit.** Il ne reste que trois paquets, et
le seul écran livré est la documentation vivante du design system : le **design space**.

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

---

## Ce qui existe

| Chemin | Rôle |
|---|---|
| `apps/web` | Coquille web : React 18 + Vite 5 + Tailwind v4 + primitives Radix. Contient le **design space** et les composants du design system |
| `packages/domain` | Types du domaine, purs. Aucune dépendance, aucun rendu |
| `packages/data` | Accès données : Supabase + PowerSync. **Conservé**, mais pas encore importé par `apps/web` |

Le design space se visite à l'écran : `/` (principes) · `/couleurs` · `/typographie` · `/espacement`
· `/mouvement` · `/composants`.

## Ce qui a été supprimé, et pourquoi

La purge du 2026-10-28 a retiré **1 141 fichiers** : `apps/mobile`, `apps/desktop`, `apps/server`,
le dossier `tests/` et **16 packages** (`ui`, `agent`, `ascent`, `discovery`, `engineering-*`,
`focus`, `goal-engine`, `integrations`, `learning`, `platform`, `productivity`, `progress`,
`scientific-engine`, `workflows`).

Deux défauts motivaient cette décision :

1. **L'ancien moteur de thème** produisait un rendu qui ne correspondait à aucune des décisions
   de DA voulues — et il était plus coûteux à contourner qu'à remplacer.
2. **Un couplage invisible** : un constructeur lisait `process.env` au chargement d'un module,
   ce qui levait un `ReferenceError` en ESM navigateur et **empêchait le montage de
   l'application**. Résultat : une page blanche, sans message.

Le second point a laissé une règle permanente : **une page blanche est un défaut**. Toute panne
d'amorçage doit s'afficher. C'est le rôle de `apps/web/src/boot/fatal.ts` (voir plus bas).

## Design system « Encre & Lumière »

Les tokens vivent dans **un seul fichier** : `apps/web/src/styles/globals.css`.

- **OKLCH** partout — deux teintes de même palier ont la même luminosité perçue, ce que HSL ne
  garantit pas.
- **Un accent unique** : violet `oklch(0.48 0.2 295)`. Le cyan n'existe que dans le dégradé de
  marque, jamais dans la sémantique.
- **Quatre statuts, pas cinq** : `success`, `warning`, `info`, `destructive`.
- **Deux thèmes réglés à la main** (clair et sombre). Le sombre n'est pas une inversion.
- **Échelle typographique** 1.25, tracking négatif au-delà de 30 px.
- **Espacement sur une base de 4 px**, quatre élévations, une courbe (`ease-out-quint`),
  trois durées.

Règle de dépendance : les composants consomment les **tokens sémantiques**
(`bg-primary`, `text-muted-foreground`), jamais une couleur en dur ni une primitive. C'est ce qui
rend le thème sombre gratuit.

### Fondations de code

| Fichier | Rôle |
|---|---|
| `src/components/ui/*` | Les primitives, point d'entrée unique `@/components/ui` |
| `src/shell/Shell.tsx` | Navigation du design space (rail desktop, panneau mobile) |
| `src/shell/theme.tsx` | Thème : préférence enregistrée > système > clair. Persiste le choix explicite |
| `src/boot/fatal.ts` | Filets d'amorçage : `error`, `unhandledrejection`, chien de garde |
| `src/components/design/page.tsx` | Primitives de **documentation** (Section, Swatch, Rule…). Hors du système produit |

## Amorçage : pourquoi `main.tsx` importe dynamiquement

Un `import` statique est évalué **avant** le corps du module. Si l'un d'eux lève, rien de ce qui
suit ne s'exécute — pas même le code censé afficher l'erreur. D'où l'ordre :

1. `installFatalHandlers()` — filets posés en premier, dans un module sans dépendance ;
2. `import()` dynamique de `./app` — une panne ici devient un `catch` affichable ;
3. chien de garde de 12 s : si aucun nœud `[data-aurora-app]` n'existe, l'écran de diagnostic
   s'affiche au lieu d'une page vide.

## Commandes

```bash
pnpm dev                # design space (Vite)
pnpm build              # build de production
pnpm typecheck          # tsc --noEmit (apps/web)
pnpm lint               # eslint --max-warnings 0
pnpm check:boundaries   # secrets, process.env côté client, identités en dur
pnpm -F @aurora/web e2e # 5 parcours Playwright (desktop + mobile)
```

Les cinq parcours E2E couvrent : le montage et l'absence de panneau fatal, la navigation et le
fallback SPA, le thème (bascule + persistance + préférence système), l'accessibilité de base
(repères, lien d'évitement, focus visible, onglets au clavier), et l'absence d'erreur console ou
de débordement horizontal.

## Ce qui n'est pas encore là

Les écrans métier. Ils reviendront composés **à partir** de ces briques, et non l'inverse. Un
composant n'entre dans le système que lorsqu'un écran réel en a besoin : anticiper produit des
abstractions que personne n'utilise et qu'il faut maintenir quand même.
