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

## 6. Questions ouvertes

| # | Question | Bloque |
|---|---|---|
| OQ-1 | Ionic = shell sur les 3 cibles, ou **mobile seulement** (web = React Router + shadcn/ReUI pur) ? | architecture du shell web |
| OQ-2 | Desktop : **Electron** (spike existant) confirmé, ou Tauri / PWA ? | Phase 2 |
| OQ-3 | Périmètre : les 54 slugs d'écrans + tous les modules, ou un sous-ensemble pour la première livraison web ? | plan de lots |
| OQ-4 | Breakpoints normatifs (web / tablette / mobile) et seuil du passage 2 panneaux → 1 colonne ? | système responsive |

## 7. Rollback

Cette ADR est **documentaire**. Rollback = `git revert <sha>` (1 story = 1 commit,
AD-13). Aucun impact runtime.
