# ADR-018 — Direction produit & plateforme (additif, web-first)

> **Statut** : **ACTÉ par le owner, 2026-10-24** (`.agents_tmp/PLAN.md` §3.1, décisions 1–5).
> **Scope** : direction de plateforme, périmètre de la refonte UI, statut des
> candidats chat tiers. **N'abroge aucun AD existant** — voir §5 « doc-lag ».
> **Nature** : ADR **additif**. Il ajoute une décision, il ne réécrit pas les
> AD-1…AD-17 du spine ni l'ADR §23 (`adr-extract.md`).
> **Références** : `AI_RULES.md` §2 (protéger l'existant), AD-13 (Contract Packs),
> AD-15 (SSoT des types), AD-17 (thèmes), `adr-extract.md` §23 (Phase 1 mobile-only),
> `docs/plans/2026-10-24-phase0-rebaseline.md`.

---

## 1. Contexte

Aurora a été spécifiée avec une stratégie **Phase 1 mobile-only** (`adr-extract.md`
§23, l.649 : « La Phase 1 est strictement mobile-only »). Le propriétaire a
**redéfini cette priorité le 2026-10-24** : la refonte de l'interface se fait
**d'abord sur le web**, puis desktop, puis mobile.

Par ailleurs, une piste d'intégration d'un chat tiers (LibreChat) a été explorée
puis **abandonnée**. Une mémoire d'agent affirmait une « intégration LibreChat »
(M1→M5.2, branche `integration/librechat`) : cette affirmation est **réfutée par
les faits**, établis dans `docs/plans/2026-10-23-repriorisation.md` —
la branche `integration/librechat` renvoie **404** sur l'API GitHub, et
`docs/integration/` **n'existe pas** dans le dépôt. Les seules occurrences du mot
« librechat » dans le dépôt sont les documents qui **constatent sa réfutation**.

## 2. Décision

### D-018.1 — Ordre des plateformes : **web → desktop → mobile**

| Phase | Cible | Statut |
|---|---|---|
| **1** | **Web** (desktop web d'abord, puis responsive) | cible de livraison courante |
| **2** | **Desktop** (Electron, spike existant à confirmer) | après web |
| **3** | **Mobile** (Ionic/Capacitor, **conservé**) | après desktop |

**Conséquence** : la Phase 1 du projet **n'est plus mobile-only**. La qualité
mobile reste un objectif, mais elle n'est plus le point d'entrée du travail.

### D-018.2 — `packages/ui` est **conservé** ; les **écrans** sont reconstruits

- La librairie de composants (`components/ui`, `components/reui`,
  `components/composites`, `renderers/`, `themes/`) est **préservée**.
- `components/assistant-ui/elements/` (~138 fichiers) est promu **réserve de
  briques** officielle : conservé, inventorié, réutilisé brique par brique.
- Le travail de refonte porte sur la **composition d'écrans** et le
  **responsive** — pas sur la réécriture de la librairie.
- Livrable : `docs/frontend/ui-brick-inventory.md`.

### D-018.3 — **Ionic React conservé**

`@ionic/react` + Capacitor restent dans la stack. Reste à expliciter (voir §6
OQ-1) si Ionic sert de shell sur les **3** cibles ou **mobile seulement**.

### D-018.4 — **LibreChat abandonné** ; **LobeHub = référence de conception**

- LibreChat : **écarté** (aucune intégration, aucun code, aucun sous-module).
- LobeHub : **app de référence** — inspiration sur les **patterns** d'interface
  et la conception. **Pas de copie de code.**
- **Nuance licence (bloquante)** : « s'inspirer » ne signifie pas « copier ».
  Licences **vérifiées à la source le 2026-10-24** :

  | Projet | Fichier `LICENSE` | Champ `license` du `package.json` | Verdict |
  |---|---|---|---|
  | **LobeHub / LobeChat** | **« LobeHub Community License »** — Apache-2.0 **+ conditions additionnelles** | `MIT` ⚠️ **incohérent** | voir ci-dessous |
  | **LibreChat** | `MIT License` | `ISC` ⚠️ incohérent | sans objet (écarté) |

  La clause déterminante de la licence LobeHub est la **condition 1(b)** :
  > « a commercial license must be obtained from the producer if you want to
  > develop and distribute a derivative work based on LobeChat. »

  **Conséquence opérationnelle** : un **travail dérivé** de LobeChat destiné à
  une distribution commerciale exige une **licence commerciale** obtenue auprès
  de l'éditeur. Le champ `package.json` indiquant `MIT` est **trompeur** : le
  fichier `LICENSE` prévaut et énonce des conditions plus restrictives.
  → **Aucune ligne de code, aucun asset, aucun fichier de configuration
  LobeHub ne sera copié dans Aurora.** LobeHub est utilisé comme **référence de
  conception** (patterns, dispositions, principes d'interaction) et les choix
  d'implémentation sont réécrits à partir de `packages/ui` (D-018.2).
- Interdit : reproduire l'identité visuelle d'un tiers (logos, illustrations,
  noms de produit) pour imiter son apparence.

### D-018.5 — **Backend non refondu dans cette phase**

Séquence actée : **interface responsive d'abord**, backend ensuite. Le backend
actuel (Supabase EF + PowerSync + Agent Kernel) n'est pas modifié par cette ADR.

## 3. Conséquences

### 3.1 Ce qui change
- Priorité de travail : **web d'abord**.
- Un **système responsive** doit être formalisé (absent aujourd'hui — voir
  `docs/frontend/ui-brick-inventory.md` §7).
- La navigation doit être **re-déclinée pour le web** (`docs/mobile/navigation-and-page-composition.md`
  décrit 5 tabs mobiles ; il n'existe pas d'équivalent web).

### 3.2 Ce qui ne change pas
- Les invariants AD-1…AD-17 (isolation vendor, single-writer, RLS, offline-first,
  SSoT des types, thèmes) restent **gelés**.
- `packages/ui` et les 3 apps restent en place.
- Le gate CI (`AI_RULES.md` §9) reste la référence de vérification.

## 4. Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Réemploi du frontend LibreChat complet | abandonné par le owner ; couplage fort à un backend Node/MongoDB non présent |
| Réemploi d'open-webui | copie de code tiers — écarté |
| Réécriture de `packages/ui` depuis zéro | le owner conserve la librairie |
| Copie de code/assets LobeHub | **LobeHub Community License** (Apache-2.0 + condition 1b : licence commerciale requise pour un travail dérivé distribué) — « référence » ≠ « copie » |

## 5. Doc-lag à signaler (pas de résolution silencieuse)

Conformément à `AI_RULES.md` §2, les contradictions suivantes sont **signalées,
non réécrites** :

| Doc | Affirmation | Statut après D-018.1 |
|---|---|---|
| `adr-extract.md` §23 l.649 | « La Phase 1 est strictement mobile-only » | **contredit** par D-018.1 |
| `adr-extract.md` §23 l.652 | « Aucun agent ne doit consacrer du temps à une implémentation desktop pendant cette phase » | **contredit** (desktop = Phase 2) |
| `AI_RULES.md` §7 | « Phase 1 mobile-only : no Electron/… » | **contredit** par D-018.1 |
| `docs/design-system/overview.md` | 44 écrans (05 §4) vs 54 (`_inventory.md` §1) | OQ-1 **ratifiée** = 54 (exécution 44 docs) — sans rapport avec la présente ADR |

**Action requise** : une re-synchronisation de ces pointeurs est nécessaire, mais
elle **ne doit pas** être faite en silence — elle implique l'owner et l'équipe DS.
À traiter comme un lot dédié (`P0-B` du plan Phase 0).

## 6. Questions ouvertes — **ratifiées par le owner le 2026-10-24**

| # | Question | **Décision owner** | Conséquence |
|---|---|---|---|
| OQ-1 | Ionic = shell 3 cibles, ou mobile seulement ? | ✅ **Ionic = MOBILE SEULEMENT.** Web et desktop = **React** (React Router + shadcn/ReUI purs) | `packages/ui` (Radix, 23 paquets) s'exprime pleinement en web ; Ionic reste sur mobile. Shell web = React, sans `ion-*`. |
| OQ-2 | Desktop : Electron, Tauri ou PWA ? | ✅ **Electron confirmé. Tauri écarté.** | Phase 2 = Electron (spike existant `apps/desktop`). |
| OQ-3 | Périmètre de la 1ʳᵉ livraison web ? | ✅ **Les 44 écrans existants + les écrans des features nouvelles** (Design Space Pro, documents, charte, etc.) | Le périmètre **dépasse 44** : Design Space Pro (§6 de la référence) est un module de **première version** sans aucun écran aujourd'hui. |
| OQ-4 | Seuil de bascule 2 panneaux = `lg` (1024 px) ? | ⏳ **proposition, à ratifier** | La référence §4.3 impose des *contrats* responsive (voir `docs/frontend/web-shell-and-responsive.md`) mais pas de valeur de breakpoint. |

### 6.1 Conséquence de OQ-3 : un trou de périmètre vérifié

**Design Space Pro** est acté comme faisant partie de la **première version cible**
(référence §3, décision D-03 ; §6 « spécification fonctionnelle », ~200 lignes ;
`LOGO.md` 680 l ; `AFFICHE.md` 369 l). Or, vérification faite dans le dépôt :

| Artefact attendu | Constat |
|---|---|
| Package `packages/design-space` (ou équivalent) | ❌ **absent** (`ls packages/` : 19 packages, aucun studio) |
| Ligne dans `master-feature-catalog.md` | ❌ **aucune** occurrence de `design space`/`brand`/`logo`/`charte`/`affiche` |
| Écran dans `docs/design-system/screens/` | ❌ **aucun** (pas de `canvas`, `studio`, `logo`, `brand`) |
| Table SQL (`brand_dna`, `design_project`, `logo_variant`…) | ❌ **aucune** |
| Route dans `router.tsx` | ❌ **aucune** |

→ **Design Space Pro est `MISSING` (au sens de la classification AI_RULES) : spécifié
dans la référence produit, zéro implémentation, zéro spécification d'écran.**
C'est le principal écart de périmètre entre la vision ratifiée et le dépôt.
Détail et inventaire d'écrans proposé : `docs/frontend/design-space-scope.md`.

## 7. Écart motivé à la référence produit D-06 (exigence §10.2 item 6)

La référence produit v1.1 retient **Ionic React comme application métier web
responsive** (D-06, §8.7.1, §8.7.3) et **exige** (Phase 0, §10.2 item 6) :
> « proposer la topologie `Next.js site public` + `Ionic React application métier`,
> **ou déposer un ADR motivant une topologie différente** »

La décision owner du 2026-10-24 (OQ-1 : **Ionic = mobile seulement**) est une
topologie différente. Cet ADR est donc la motivation exigée.

### 7.1 Motivation

| # | Argument | Preuve |
|---|---|---|
| 1 | `packages/ui` est bâti sur **Radix + shadcn**, pas sur Ionic | 23 paquets `@radix-ui/*` dans `packages/ui/package.json` ; `packages/ui/components.json` (`"style": "new-york"`, `$schema` shadcn) |
| 2 | Ionic et Radix sont **deux systèmes de composants concurrents** — les mélanger dans un shell unique crée des conflits de style, de focus et d'a11y | Ionic = web components `ion-*` ; Radix = primitives React headless |
| 3 | La porte de validation qu'Ionic s'assigne lui-même n'est **pas prouvée**, et porte précisément sur le besoin de Design Space Pro | référence §8.7.3 : « Navigation, accessibilité, **grands écrans**, petits écrans et **éditeurs** testés » |
| 4 | Design Space Pro exige des **éditeurs plein écran** (canvas, calques, panneaux) — le terrain où un framework mobile-first coûte le plus cher | référence §4.3, §6.7, §10.4 |
| 5 | Séparer les shells laisse `packages/ui` s'exprimer en web **sans modification** (il est conservé — D-018.2) | décision owner §3.1 item 3 |

### 7.2 Coût assumé et mitigation

- **Coût** : deux shells à maintenir (web React / mobile Ionic). Ce risque est
  **signalé par la référence elle-même** en **A-01** (« réutilisation
  insuffisante entre Web, Electron et Capacitor »).
- **Mitigation** : contrats (`packages/domain`, AD-15), tokens (AD-17), data layer
  (PowerSync/repositories) et logique métier restent **partagés**. Seule la
  couche *shell/navigation* diffère. Aucun module métier n'est dupliqué.
- **Réversibilité** : si le coût des deux shells devient prohibitif, la
  réintroduction d'Ionic en web reste possible (l'inverse serait plus coûteux) —
  les écrans seraient à recomposer, pas les données.

### 7.3 Ce que cet ADR ne tranche pas

- **Next.js pour le site public** (D-06) : conservé dans la vision, mais **hors
  périmètre** de la phase courante — `apps/marketing` n'existe pas (OQ-9).
- **`apps/web-app` séparée** : conséquence probable de OQ-1, non encore actée
  (OQ-10, `docs/frontend/design-space-scope.md` §6.3).
- **Topologie de packages** (§8.7.2) : la référence autorise une organisation
  équivalente (§8.7.2 « pas une obligation de noms de répertoires »). On ne crée
  ni `design-system` ni `modules` (déjà couverts par `packages/ui` et les 19
  packages existants).

---

## 8. Rollback

Cette ADR est **documentaire**. Rollback = `git revert <sha>` (1 story = 1 commit,
AD-13). Aucun impact runtime.
