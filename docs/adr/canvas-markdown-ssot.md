# ADR — SSoT Markdown du Canvas : `marked` 15.0.12 (AD-16b)

**Date :** 2026-10-14
**Statut :** Accepté
**Décideur :** Lead Aurora (tranché lors du plan canvas-agentique)

## Contexte

Trois chaînes de rendu markdown coexistent dans le monorepo :

| Chaîne | Version | Usage | Package |
|---|---|---|---|
| `marked` | `15.0.12` | Rendu canvas (SSoT) | `packages/ui` (direct) |
| `marked` (transitif) | `18.1.1` | Via `@assistant-ui/react-markdown` | `packages/ui` (indirect) |
| `react-markdown` | `9.1.0` | Rendu lecture mobile (knowledge/learning) | `apps/mobile` |
| `@assistant-ui/react-markdown` | `0.14.22` | Rendu des messages assistant | `packages/ui` (assistant-ui) |

Le canvas d'édition (`CanvasView`) et ses ancres de commentaires (`commentAnchors`,
`canvas-utils.ts`) reposent sur `marked` 15.0.12 avec un `Renderer` sécurisé
(AD-16b) qui neutralise `<script>`, `<iframe>`, et les handlers inline.

## Décision

**`marked` 15.0.12 reste la source de vérité (SSoT) du canvas.**

Raisons :
1. `markdownToHtml` et `commentAnchors` (les 2 primitives du canvas) en dépendent
   directement ; changer de moteur risquerait de décaler les offsets des ancres
   de commentaires (0022, AD-16b).
2. La règle « 1-paquet-1-version » s'applique à TipTap/ProseMirror (2 versions =
   bugs) mais **pas** à `marked` : le lockfile contient déjà `marked@15.0.12`
   (direct, SSoT canvas) et `marked@18.1.1` (transitif via `@assistant-ui/react-markdown`,
   chaîne assistant non touchée) — c'est acceptable, les deux versions servent des
   périmètres distincts.
3. `react-markdown` (mobile) et `@assistant-ui/react-markdown` (assistant) ont leurs
   propres SSoT dans leur périmètre ; aucune migration entre les trois chaînes.

## Conséquences

- Toute extension du canvas (nouveau moteur, nouveau bloc) doit s'appuyer sur
  `marked` 15.0.12, pas sur `react-markdown` ou le rendu assistant-ui.
- Le figement de `marked: "15.0.12"` dans `packages/ui/package.json` (sans `^`)
  est obligatoire (règle §5.1 du plan canvas-agentique).
- La version transitive `marked@18.1.1` (via `@assistant-ui/react-markdown`) reste
  dans le lockfile ; elle n'est pas concernée par le SSoT canvas.
- Le `Renderer` sécurisé de `canvas-utils.ts` (AD-16b) est le point de contrôle :
  tout HTML injecté dans le canvas passe par lui, jamais par `dangerouslySetInnerHTML`
  direct.
