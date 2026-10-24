# Specs d'implémentation par feature — cadre v1 (§15–§19)

> **Ref** : `.agents_tmp/PLAN.md` §4 étapes 6–7 · AD-13 (Contract Packs) ·
> AD-15 (SSoT) · `docs/testing/matrix.md` · `docs/cdd.md`.
> **Objet** : ajouter à chaque spec d'écran les **critères de readiness, de succès,
> de QA et la couverture de tests exigée**. **Aucun code ici** (AD-13).

---

## 1. Principe : étendre, jamais réécrire

Les 44 specs de `docs/design-system/screens/` suivent déjà un format homogène de
**14 sections** (`§1 Psychologie` → `§14 Questions ouvertes`) et sont **conformes
à AD-13** (`§4 États` couvre les 6 états S6 + les états sémantiques §6.1 + 404 +
killed — vérifié sur `taches-liste.md` §4(a–d) et `home.md` §4a–4c).

**Règle** : les nouvelles sections s'ajoutent **après `§14`**, pour ne pas décaler
les numéros de ligne cités par les SSoT (`impl-plan.md` cite `05 §4 l.1316`, etc.).

| Section ajoutée | Contenu |
|---|---|
| **§15 Responsive** | comportement par breakpoint (§2 ci-dessous) |
| **§16 Critères de readiness** | ce qui doit être vrai *avant* de coder |
| **§17 Critères de succès** | ce qui doit être vrai pour déclarer « fait » |
| **§18 Critères de QA** | comment on vérifie, par classe de test |
| **§19 Couverture de tests exigée** | seuils chiffrés + DoD |

---

## 2. §15 — Responsive (gabarit normatif)

À déclarer pour chaque écran, en 4 lignes :

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne | tab bar basse (5 onglets) | cible mobile (Phase 3) |
| `md` → `lg` (768–1023 px) | 1 colonne + nav repliable | barre latérale icônes | tablette |
| **`lg+` (≥ 1024 px)** | **selon gabarit** | **panneau latéral** | cible web/desktop (Phase 1–2) |

Le **gabarit** de composition (issu de `docs/frontend/web-shell-and-responsive.md` §4.1) :
`Tableau de bord` · `Liste + détail` · `Calendrier` · `Éditeur` · `Flux` ·
`Session guidée` · `Formulaire` · `État spécial`.

> **OQ-4 ouverte** : le seuil `lg` (1024 px) est une proposition, à ratifier.

---

## 3. §16 — Critères de readiness (avant de coder)

Une feature n'entre en implémentation que si **tous** ces points sont vrais.
C'est l'application d'AD-13 (Contract Pack) au niveau écran.

| # | Critère | Vérification |
|---|---|---|
| R1 | **Owner identifié** | la feature a une famille propriétaire (Productivity / Learning / Knowledge / Discovery / Progress / Agent / Artifacts) dans `master-feature-catalog.md` |
| R2 | **Ligne de catalogue** | la feature figure dans `docs/features/master-feature-catalog.md` (règle d'intégrité du catalogue §0) |
| R3 | **Types SSoT déclarés** | les entités/enveloppes consommées sont dans `packages/domain` (AD-15) — sinon déclarer la projection |
| R4 | **Spec d'écran complète** | `§1`–`§14` renseignés, **aucune** case vide (états = « N/A (raison) », jamais blanc) |
| R5 | **6 états S6 couverts** | `loading` `empty` `success` `error` `offline` `killed` — chacun avec composant + texte + CTA |
| R6 | **États §6.1 couverts** | `en-cours` `terminé` `échec` `succès` `erreur` `404` — applicable ou « N/A (raison) » |
| R7 | **Classe offline déclarée** | `offline-capable` / `online-required` / `PLATFORM_DEPENDENT`, cohérent avec le catalogue |
| R8 | **Événements déclarés** | producteurs/consommateurs AD-9 listés, ou « aucun » |
| R9 | **Permissions déclarées** | permission plateforme (ex. `POST_NOTIFICATIONS`) + moment de la demande (premier usage, jamais au boot) |
| R10 | **Entrée de nav déclarée** | route + points d'entrée (EP/OUT/IN) conformes à `docs/mobile/navigation-and-page-composition.md` §2 |
| R11 | **Tokens identifiés** | chaque couleur/espacement/rayon = token sémantique (AD-17), jamais une valeur brute |
| R12 | **Contrat de données** | lecture locale (AD-7) vs serveur (AD-12) explicité ; single-writer (AD-7) respecté |
| R13 | **OQ bloquantes fermées** | aucune OQ de `§14` qui bloque l'implémentation |

**Verdict readiness** : `READY` si R1–R13 vrais · sinon `NOT_READY` + liste des manques.
**Une feature `NOT_READY` ne peut pas entrer dans un lot.**

---

## 4. §17 — Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | **Données réelles** | l'écran lit le store local (AD-7) ; **aucune** donnée simulée, aucun tableau codé en dur, aucun `state={{status:'empty'}}` figé |
| S2 | **6 états prouvés** | chaque état S6 atteignable et démontré (story + test) |
| S3 | **États §6.1 prouvés** | `404` et `feature-disabled` rendus par le pattern global, jamais un 404 brut |
| S4 | **Offline vérifié** | avec le réseau coupé, les lectures locales fonctionnent ; les opérations serveur sont désactivées **honnêtement** (pas de spinner infini) |
| S5 | **Retour arrière vérifié** | tuer l'app puis relancer → état intact (pas d'écran blanc, pas de reset) |
| S6 | **Isolation utilisateur** | les données d'un autre utilisateur ne sont **jamais** lisibles (RLS) |
| S7 | **Tokens-only** | aucune valeur brute hors token (règle bloquante `overview.md` §2) |
| S8 | **A11y AA** | cibles ≥ 44 px, `aria-label` sur icônes seules, focus visible, `reduced-motion` respecté |
| S9 | **Responsive vérifié** | rendu conforme à `§15` aux 3 paliers |
| S10 | **Gate vert** | le gate du lot est vert (voir §6) |
| S11 | **Aucune régression** | les tests existants passent toujours |

**Verdict succès** : `DONE` si S1–S11 vrais · sinon `INCOMPLETE`.

---

## 5. §18 — Critères de QA (comment on vérifie)

Mappé sur les **9 classes** de `docs/testing/matrix.md` §1 :

| Classe | Question QA | Preuve attendue |
|---|---|---|
| **Unitaire (domaine)** | les fonctions pures sont-elles correctes ? | tests Vitest, ≥ 80 % sur `packages/domain` |
| **Intégration** | la lecture locale + la re-synchronisation tiennent-elles ? | tests PowerSync (vues sans JOIN, re-sync après coupure) |
| **Contrat** | producteur/consommateur d'événements déclarés ? | tests AD-9, interfaces d'adaptateur |
| **E2E** | le parcours utilisateur va-t-il au bout ? | Playwright (web), « créer → compléter » |
| **Failure** | que se passe-t-il quand ça casse ? | job en échec → état `error` + `jobId` retryable |
| **Permission** | demande-t-on la permission au bon moment ? | premier usage, refus géré sans casser l'app |
| **Offline** | l'app reste-t-elle utilisable ? | app utilisable en local, actions cloud désactivées |
| **Recovery** | la reprise après incident fonctionne-t-elle ? | re-sync longue coupure, job bloqué → retry |
| **Plateforme** | les contraintes natives sont-elles tenues ? | budgets perf, cycle de vie, 6 états sur appareil |

---

## 6. §19 — Couverture de tests exigée (seuils + DoD)

### 6.1 Seuils chiffrés (proposition à ratifier)

| Périmètre | Seuil | Justification |
|---|---|---|
| `packages/domain` (fonctions pures) | **≥ 80 %** de lignes | déjà exigé `matrix.md` §1 |
| Chaque feature du catalogue | **≥ 1 test** par classe applicable | « zéro feature sans test associé » (PLAN §5) |
| Chaque région de données | **6 tests d'état** (S6) + états §6.1 applicables | AD-13, `matrix.md` §3 (un état manquant = bloquant) |
| Chaque écran | **≥ 1 story** couvrant `Defaut` + `vide` + `chargement` + `erreur` | `docs/cdd.md` DoD |
| Chaque écran | **≥ 1 test `play`** d'interaction | `docs/cdd.md` DoD §3 |
| Gate de lot | **100 % vert** avant le lot suivant | AD-13 (1 lot = 1 commit = 1 rollback) |

### 6.2 DoD par feature (à cocher dans la spec)

```
[ ] R1–R13 vrais (readiness)
[ ] S1–S11 vrais (succès)
[ ] 6 états S6 testés + états §6.1 applicables
[ ] ≥ 1 story complète (cdd.md) + ≥ 1 test play
[ ] classe offline testée
[ ] permission testée (si applicable)
[ ] responsive testé aux 3 paliers
[ ] a11y AA vérifiée
[ ] gate du lot vert
```

### 6.3 Test bloquant transverse (AD-13, `matrix.md` §3)

Un lot est **bloquant** si :
- un écran omet l'un des 6 états S6 ;
- un moteur AD-10 est importé hors de `packages/ui` ;
- un type de domaine est re-déclaré (AD-15) ;
- un cas d'usage écrit dans plusieurs tables (single-writer AD-7).

---

## 7. État d'application (backlog)

| Lot | Périmètre | État |
|---|---|---|
| **Référence** | `taches-liste.md` — §15–§19 appliqués | ✅ **fait** (spec pilote) |
| **Vague 1** | les 7 écrans des 5 onglets (`home`, `taches-liste`, `learn`/`cours-liste`, `progress-dashboard`, `agent-chat`) | à faire |
| **Vague 2** | familles Productivity restantes (11 écrans) | à faire |
| **Vague 3** | Learning + Knowledge (12 écrans) | à faire |
| **Vague 4** | Discovery + Progress + Artifacts (7 écrans) | à faire |
| **Vague 5** | Écrans spéciaux + transverses (7) | à faire |

**Total : 44 écrans.** Une spec est « à jour » quand elle porte §15–§19.

> **Décision de méthode** : appliquer le cadre **d'abord aux 5 écrans des onglets
> primaires** (vague 1), car ce sont les points d'entrée de la navigation et les
> premiers concernés par le shell web (§`web-shell-and-responsive.md` §3).
> Étendre aux 39 autres ensuite, vague par vague.
