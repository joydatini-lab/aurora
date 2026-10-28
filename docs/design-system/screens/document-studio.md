# Écran — Document Studio (`document-studio`)

Module : **Design Space Pro** · Route : `/design/:projectId/document/:artifactId` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.6 (Document Studio : types de livrables, pipeline documentaire, exigences de contenu),
§6.7 (édition), §6.8 (cohérence de marque), §10.4 étape 8 · SSoT moteur : `AFFICHE.md` §2.6 (banque narrative récursive), §5.2 (JSON de charte), §6.2 (grille) ·
SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 7) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-9, OQ-12 ·
Gabarit : **Éditeur** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Produire une **publication multipages** (charte, dossier, rapport, guide) avec plan, grille et pagination cohérents. |
| Contexte (appareil/moment/réseau) | Web/desktop, session très longue (20–100 pages). L'édition et la mise en page sont **locales** (moteur déterministe, AD-3) ; la génération de contenu est `online-required`. |
| Fréquence | Par livrable structurant — quelques fois par marque, puis des révisions. |
| État émotionnel cible | **Serein sur la structure.** Le créatif voit le plan, la hiérarchie des sections et l'équilibre des pages, sans se perdre dans un long document. |
| Erreur la plus probable | **Inventer des données** (chiffres, politiques) que §6.6 interdit formellement — ou laisser une modification du Brand DNA **réécrire silencieusement** un document approuvé (§6.8). |
| Ce que l'écran RÉSOUT | La question « ce document est-il structuré, cohérent et honnête sur ses sources ? » — plan + grille + pagination + provenance visibles. |
| Invariant | **§6.6 / §6.8 / OQ-9** : la source éditable est un **JSON de pages/calques** dans l'`ArtifactFile` (pas `blocks`) ; une modification de marque **ne réécrit jamais** un document approuvé sans accord (propagation **proposée**, jamais silencieuse). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Nom de la publication + type (charte, dossier, rapport, guide) + version du Brand DNA | §6.6 ; §6.8 |
| Panneau gauche (plan) | **Hiérarchie des sections** (plan, titres, sous-titres) + pagination | §6.6 étapes 1–5 |
| Toile (plein écran) | Page courante + grille (colonnes, marges, gouttières) | `AFFICHE.md` §6.2 |
| Panneau droit (styles) | Styles éditoriaux : titres, corps, listes, tableaux, encadrés, figures, numérotation | §6.6 étape 4 |
| Bandeau de revue | Points non résolus + rapport de revue finale | §6.6 étape 9 |
| Barre d'action | « Vérifier » · « Paginer » · « Exporter » (**seul** CTA) | §6.6 étapes 6–10 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar publication | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même ; panneaux repliés < `lg` | §6.6 |
| Sélecteur de type | Select | shadcn Select | `text.sm`, `border` | même | §6.6 |
| Arbre du plan | Tree + `ListItem` | shadcn Tree | `row.min-height=44`, `text.sm` | panneau repliable | §6.6 étape 1 |
| Numéro de page | Badge mono | shadcn Badge | `font.mono`, `text.muted` | même | §6.6 étape 7 |
| **Toile de page** | Canvas (renderer DS, AD-10) | renderer `packages/ui` | `surface`, `border`, `radius.md` | plein écran dès `md` | §6.6 |
| **Grille** (overlay) | Repères de grille | — | `border-strong` (repères), opacité réduite | même | `AFFICHE.md` §6.2 |
| Panneau styles | Liste de styles éditoriaux | shadcn List | `text.sm`, `border` | repliable | §6.6 étape 4 |
| Bandeau de revue | Callout `warning` **avec action** | shadcn Alert + Button | `color.warning` + `-surface` | bandeau sous TopBar | §6.6 étape 9 |
| Badge de provenance | Chip + lien | shadcn Badge + Button ghost | `color.info` (source présente) / `warning` (hypothèse) | sous le bloc | §6.6 exigences de contenu |
| Bouton « Vérifier » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.6 étape 6 |
| Bouton « Paginer » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.6 étape 7 |
| Bouton « Exporter » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.9 |
| État `loading` | Skeleton (forme de la page) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

> **AD-14 (par analogie)** : « Exporter » est la **seule** action primaire.
> « Vérifier » et « Paginer » sont `secondary` : ce sont des contrôles.

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement de la source locale | Skeleton de la page | aucun |
| `empty` | document sans page | EmptyState : « Aucune page. Construisez un plan. » | « Construire un plan » |
| `success` | document chargé | plan + page + styles | « Exporter » |
| `error` | lecture locale / rendu impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **édition + pagination actives** (moteur local, AD-3) ; génération de contenu désactivée avec motif | Exporter en file d'attente |
| `killed` | app tuée puis relancée | Skeleton + re-sync ; brouillon non enregistré **signalé** | Reprendre |
| `404` | publication inexistante ou non autorisée | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | génération de contenu / pagination en cours | progression page par page ; **travail hors du cycle bloquant** (§4.3 C7) | Annuler |
| `échec` | génération échouée / structure incohérente | Callout danger + motif + points non résolus listés | Réessayer |
| `terminé` | export prêt | Toast 3 s + entrée dans `design-exports` | — |

> **Point dur** : le contenu **non fourni** n'est jamais inventé (§6.6 exigences).
> Une donnée manquante apparaît comme **hypothèse** ou **champ à compléter**,
> jamais comme un fait. C'est le pendant documentaire de la garde du Brand DNA.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Navigation de page | fondu + translation horizontale | 180 ms |
| Sélection d'une section (plan) | scroll vers la section + surbrillance | 200 ms |
| Bascule de la grille | opacité de l'overlay | 150 ms |
| Pagination | re-rendu page par page | 200 ms |
| Revue finale | progression + liste des points non résolus | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Point non résolu | tap sur le bandeau de revue | section + motif + « Corriger » / « Accepter la limite » (§6.6 étape 9) |
| Provenance d'un bloc | tap sur le badge de provenance | source (`SourceRef`, AD-11) ou mention « hypothèse » |
| Impact d'un changement de marque | modification du Brand DNA | liste des documents affectés (→ `brand-impact`) — **jamais** de réécriture silencieuse (§6.8) |

---

## §7 Formulaires

Édition du **plan** (titres, hiérarchie) et des **styles éditoriaux**. **Règles**
(§6.6) :
- ne pas inventer les données de l'entreprise, chiffres, politiques ou décisions
  non fournis ou non vérifiés ;
- distinguer contenus **proposés**, **validés** et **étayés par une source** ;
- maintenir la cohérence des informations répétées entre sections ;
- pour les documents scientifiques/techniques, préserver références et limites
  du résultat (« une belle mise en page ne valide pas la science »).

---

## §8 Pagination / Tri / Filtres

- **Pagination** : c'est le cœur de l'écran (§6.6 étape 7) — vérifier coupures de
  paragraphes, tableaux, images, contrastes et équilibre des pages. Le nombre de
  pages n'est **pas** un indicateur de qualité (§6.6 : « Le nombre de pages ne doit
  pas être utilisé comme indicateur artificiel de qualité »).
- **Navigation** : par plan (arbre) ou par numéro de page.
- **Filtres** : « sections avec points non résolus », « sections sans source ».

---

## §9 Transitions entre écrans

- entrée depuis `charte` (la charte alimente les styles) ou `design-space` ;
- sortie vers `design-validator` (violations), `design-exports` (export),
  `brand-impact` (conséquences d'un changement de marque), `design-versions` ;
- retour arrière : conserve la page courante et le filtre (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Les **styles du document** viennent du **JSON de charte** de la marque
(`AFFICHE.md` §5.2 : palette, typographie, grille), pas des tokens Aurora. Les
panneaux et contrôles de l'éditeur utilisent les tokens `packages/ui` (AD-17).

---

## §11 Accessibilité (WCAG AA)

- l'arbre du plan est navigable au clavier (rôles `tree`/`treeitem`) ;
- la navigation de page est utilisable au clavier ;
- le bandeau de revue est `aria-live="polite"` ;
- les points non résolus portent un **texte**, pas seulement une couleur ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Ouvrir, éditer, paginer la publication | ✅ local (moteur déterministe, AD-3) |
| Vérifier la structure (références internes, titres, renvois) | ✅ local |
| **Générer** du contenu depuis le brief/charte | ❌ `online-required` — désactivé avec motif |
| Exporter (PDF/DOCX) | ❌ `online-required` (job, AD-8) — file d'attente ; la source reste locale |

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. La charte produite
peut contenir le **logo de marque** (calque `asset` issu d'un `Artifact`
utilisateur). Le logo Aurora n'apparaît **jamais** dans la publication de
l'utilisateur.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-9 | Les pages vivent-elles dans `blocks` ? | **TRANCHÉE** : non — JSON de pages/calques dans l'`ArtifactFile` (OQ-9) |
| OQ-12 | Moteur d'édition ? | **TRANCHÉE** : Fabric.js pour la toile, confiné (OQ-12) |
| OQ-38 | Longueur cible : 20–100 pages, ou libre ? | **DÉRIVÉE** : libre, avec 20–100 comme cible de confort (§6.6) — jamais un objectif de qualité |
| OQ-39 | Format d'export PDF/DOCX : à arbitrer ? | **DÉRIVÉE** : à arbitrer au lot L12 (§6.9 : « Les formats définitifs sont à arbitrer ») ; aucun format affiché comme disponible avant test réel |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Éditeur** (`web-shell-and-responsive.md` §2.3) — **plein écran dès `md`**.

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne, **toile `T`** ; plan/styles en `Sheet` | tab bar basse | lecture et corrections mineures (Phase 4) |
| `md` → `lg` (768–1023 px) | toile `T` + rail de plan | rail latéral | — |
| **`lg+` (≥ 1024 px)** | toile `T` + plan + styles ; `xl`+ ajoute la revue/le validateur | panneau latéral | cible web/desktop (Phase 1–2) |

**Règle** (§2.3 règle 3) : l'éditeur est plein écran dès `md`. Les panneaux sont
**repliables**, état persisté (§4.3 C2).

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.document` (lot L12) |
| R3 | Types SSoT déclarés | ✅ | `Artifact`/`ArtifactFile` (`entities-artifact.ts:10`/`:50`) ; contrat moteur dans `packages/design-engines` (L12, OQ-8) |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `hybrid` (§12) |
| R8 | Événements | **`ArtifactGenerated`** (`events.ts:125`) pour l'export ; `JobCompleted` (`events.ts:146`) pour l'export long |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | section **C. Créer** ; depuis `charte`/`design-space` |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | source = `ArtifactFile` ; export = job idempotent (AD-8) ; single-writer **Artifact** (AD-7) |
| R13 | OQ bloquantes fermées | ✅ | OQ-9/12/38/39 tranchées (§14) |

**Verdict readiness** : `NOT_READY` jusqu'à L12 (dépendance `design-engines` +
pipeline d'export, planifiée).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | la publication vient de la source locale ; aucun contenu inventé, aucun exemple codé en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | édition + pagination locales ; génération/export désactivés avec motif |
| S5 | Retour arrière | tuer/relancer → publication intacte |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas le livrable (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | arbre focusable, `aria-live`, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Honnêteté du contenu** | aucune donnée inventée ; contenus proposés/validés/sourcés distingués (§6.6) |
| S13 | **Pas de réécriture silencieuse** | un changement de Brand DNA ne modifie **aucun** document approuvé sans accord (§6.8) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | plan / pagination / vérification de structure corrects ? | Vitest sur `packages/design-engines` |
| Intégration | la publication se relit-elle après coupure ? | test PowerSync sur `artifacts` |
| Contrat | `ArtifactGenerated` après upload (F-06) ; export = job idempotent (AD-8) ? | test AD-9 + idempotence |
| E2E | « plan → contenu → pagination → export » | Playwright |
| Failure | génération échouée → points non résolus listés | test failure |
| Permission | n/a | — |
| Offline | édition + pagination locales OK | test offline |
| Recovery | relance froide → publication intacte ; job d'export bloqué → retry | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/design-engines` (moteur documentaire) | **≥ 80 %** lignes |
| `design.document` | ≥ 1 test par classe applicable (§18) |
| Région « toile de page » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `document-studio` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Idempotence d'export | ≥ 1 test (AD-8, `idempotency_key`) |

```
[ ] R1–R13 vrais (readiness)
[ ] S1–S11 vrais (succès)
[ ] 6 états S6 testés + états §6.1 applicables
[ ] ≥ 1 story complète (cdd.md) + ≥ 1 test play
[ ] classe offline testée
[ ] responsive testé aux 3 paliers (§15)
[ ] a11y AA vérifiée (§11)
[ ] gate du lot vert (AI_RULES §9)
```

---

## §20 Nouvelles questions ouvertes (issues du cadre v1)

| # | Question | Verdict |
|---|---|---|
| OQ-40 | Le contenu du document est-il du markdown (AD-16b) ou un JSON de pages ? | **DÉRIVÉE** : le **contenu éditorial** reste markdown (AD-16b, `Canvas` `kind:'md'`) ; la **géométrie de page** (calques/grille) est dans l'`ArtifactFile` (OQ-9) — deux SSoT pour deux choses différentes |
| OQ-41 | La banque narrative (RNB, `AFFICHE.md` §2.6) est-elle active en v1 ? | **DÉFAUT-RÉVERSIBLE** : oui (continuité éditoriale sans répétition, §6.6 étape 5) ; désactivable si elle dégrade la cohérence |
