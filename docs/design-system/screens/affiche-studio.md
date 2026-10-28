# Écran — AFFICHE Studio (`affiche-studio`)

Module : **Design Space Pro** · Route : `/design/:projectId/affiche/:artifactId` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.5 (AFFICHE Studio : pipeline, validation déterministe, brand kit),
§6.7 (édition et interaction), §10.4 étapes 5–7 · SSoT moteur : `AFFICHE.md` §5.1 (JSON de calques), §5.3 (rapport de validation), §6 (règles), §7 (pièges) ·
SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 6) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-9, OQ-12 ·
Gabarit : **Éditeur** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Composer une **affiche éditable** (calques, fonds, sous-couches) à partir de la charte de marque, et corriger les violations objectives. |
| Contexte (appareil/moment/réseau) | Web/desktop, grand écran, session longue. La composition et la validation sont **locales** (moteur déterministe, AD-3) ; la génération d'un layout est `online-required`. |
| Fréquence | Par campagne ou par support — plusieurs fois par marque. |
| État émotionnel cible | **En contrôle de la structure.** Le créatif manipule des calques nommés, pas des pixels ; il voit l'ordre de rendu et les sous-couches de lisibilité. |
| Erreur la plus probable | **Sous-couche mal placée** — un `underlay` au-dessus du texte qu'il soutient détruit la lisibilité (`AFFICHE.md` §7.5). Ou itérer sans fin en espérant un gain (la boucle doit être plafonnée, §7.11). |
| Ce que l'écran RÉSOUT | La question « ma composition est-elle lisible et conforme, et où sont les problèmes objectifs ? » — structure exposée + validateur déterministe intégré. |
| Invariant | **§6.5 / OQ-9 / OQ-12** : la sortie est un **JSON de calques** (coordonnées normalisées 0–1), stocké dans l'`ArtifactFile` — **pas** dans `canvas_sessions.blocks`. Le moteur d'édition est **Fabric.js**, **confiné derrière un contrat** (`packages/design-engines`/adaptateur) — jamais importé dans `packages/domain` (AD-1). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Nom de l'affiche + format (A4, poster 2:3, social 4:5) + version du Brand DNA | §6.5 ; `AFFICHE.md` §5.1 |
| Panneau gauche (calques) | Liste ordonnée (bas → haut), type (text/asset/underlay/deco), verrous `M` | `AFFICHE.md` §5.1 |
| Toile (plein écran) | Rendu Fabric.js de la composition ; sélection/déplacement/redimensionnement | `AFFICHE.md` §1 |
| Panneau droit (inspecteur) | Attributs du calque : `a_sem` / `a_geo` / `a_sty` + verrous | `AFFICHE.md` §5.1 |
| Bandeau du validateur | Violations typées (cliquables → calque fautif) | `AFFICHE.md` §5.3 |
| Barre d'action | « Valider » · « Raffiner » (boucle plafonnée) · « Verrouiller » · « Exporter » | §6.5 étapes 7–11 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar affiche | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même ; panneaux repliés < `lg` | §6.5 |
| Sélecteur de format | Select | shadcn Select | `text.sm`, `border` | même | `AFFICHE.md` §5.1 (coords normalisées) |
| Liste des calques | `ListItem` réordonnable | shadcn List + drag handle | `row.min-height=44`, `text.sm`, `border` | panneau repliable | `AFFICHE.md` §5.1 |
| Badge type de calque | Badge tonal | shadcn Badge | `text`→`info` · `asset`→`accent-primary` · `underlay`→`warning` · `deco`→`text-muted` | même | `AFFICHE.md` §5.1 |
| **Toile Fabric.js** | Canvas éditable | adaptateur `packages/ui` (contrat, OQ-12) | `surface`, `border`, `radius.md` | plein écran dès `md` | `AFFICHE.md` §1 |
| Inspecteur `a_geo` | Champs numériques (x, y, w, h, rotation) | shadcn Input (number) | `font.mono`, `text.sm` | repliable | `AFFICHE.md` §5.1 |
| Inspecteur `a_sty` | Champs style (police, couleur, opacité, alignement) | shadcn Input / Select | `font.mono`, `text.sm` | repliable | `AFFICHE.md` §5.1 |
| **Bascule de verrou `M`** | Toggle par attribut | shadcn Switch | `color.accent-primary` (verrouillé) | même | `AFFICHE.md` §5.1 |
| **Bandeau du validateur** | Callout par type de violation | shadcn Alert + Button | `color.danger`/`warning` + `-surface` | bandeau sous TopBar | `AFFICHE.md` §5.3 |
| Bouton « Valider » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | `AFFICHE.md` §5.3 |
| Bouton « Raffiner » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.5 étape 10 |
| Bouton « Exporter » | Button **primary** (**seul** CTA) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.9 |
| État `loading` | Skeleton (forme de la toile) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

> **AD-14 (par analogie)** : « Exporter » est la **seule** action primaire.
> « Valider » et « Raffiner » sont `secondary` : ce sont des contrôles, pas des décisions.

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | chargement du JSON de calques local | Skeleton de la toile | aucun |
| `empty` | affiche sans calques | EmptyState : « Aucun calque. Générez une composition depuis la charte. » | « Générer une composition » |
| `success` | composition chargée | toile + calques + inspecteur | « Exporter » |
| `error` | lecture locale / rendu impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **composition + validation actives** (moteur local, AD-3) ; « Générer » désactivé avec motif | Exporter en file d'attente |
| `killed` | app tuée puis relancée | Skeleton + re-sync ; modifications non enregistrées **signalées** | Reprendre |
| `404` | livrable inexistant ou non autorisé | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | génération / raffinage en cours | progression par ronde ; **la boucle est plafonnée** (K=4, arrêt si le score ne progresse plus) | Annuler |
| `échec` | génération échouée / calque dégénéré | Callout danger + motif ; **aucun** calque modifié sans accord | Réessayer |
| `terminé` | export prêt | Toast 3 s + entrée dans `design-exports` | — |

> **Point dur** : le raffinage **ne modifie jamais** un attribut verrouillé (`M`,
> §6.5 étape 9 ; `AFFICHE.md` §5.1). Et la boucle s'arrête à K=4 ou dès que le
> score stagne (`AFFICHE.md` §7.11) — jamais d'itération infinie.

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Sélection d'un calque sur la toile | halo + surbrillance dans la liste | 150 ms |
| Déplacement / redimensionnement | transform live (Fabric.js) | — |
| Réordonnancement d'un calque | déplacement + réordonnancement | 200 ms |
| Verrouillage d'un attribut | cadenas + fond `surface-raised` | 150 ms |
| Violation détectée | pulse du bandeau + scroll vers le calque | 250 ms |
| Ronde de raffinage | barre de progression + score | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Détail d'une violation | tap sur une violation | règle violée + source (`AFFICHE.md` §5.3) + calque concerné + « Appliquer la correction » / « Refuser » |
| Confirmation de correction | « Appliquer la correction » | aperçu du delta (jamais une réécriture silencieuse, §6.7) |
| Choix de format | changement de format | avertissement si des calques sortent du canevas (`BOUNDARY_OVERRUN`) |

---

## §7 Formulaires

L'inspecteur édite les attributs d'un calque (`a_sem`, `a_geo`, `a_sty`, `M`).
**Règles** (`AFFICHE.md` §5.1, §6) :
- coordonnées **normalisées 0–1** (indépendantes du format final) ;
- une seule ligne de texte par calque de texte (§6.3) ;
- un `underlay` est toujours **sous** le texte qu'il soutient (§6.2) ;
- le z-order est porté **uniquement** par l'indice `o` (§6.6), jamais par l'ordre du tableau.

---

## §8 Pagination / Tri / Filtres

Pas de pagination (éditeur). **Tri** de la liste = **ordre de rendu** (`o`,
bas → haut). **Filtres** : « seulement les calques verrouillés », « seulement les
calques en violation ».

---

## §9 Transitions entre écrans

- entrée depuis `charte` (le brand kit alimente la composition) ou `design-space` ;
- sortie vers `design-validator` (panneau complet), `design-exports` (export),
  `design-versions` (comparer deux variantes) ;
- retour arrière : conserve la sélection, le zoom et le format (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Les **couleurs de la composition** viennent de la **palette de la charte** (héritage
de marque, `AFFICHE.md` §5.2), pas des tokens Aurora. Les panneaux, contrôles et
le bandeau du validateur utilisent les tokens `packages/ui`. Les couleurs
sémantiques du validateur (`danger`, `warning`) restent figées (§5.1 bloquante).

---

## §11 Accessibilité (WCAG AA)

- chaque calque est focusable et sélectionnable au clavier ;
- le réordonnancement se fait aussi par boutons haut/bas (pas seulement par glisser) ;
- le bandeau du validateur est `aria-live="polite"` ;
- les violations sont **typées** et lisibles (texte, pas seulement couleur) ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `hybrid`)

| Capacité | Offline |
|---|---|
| Ouvrir et éditer la composition (JSON de calques) | ✅ local (moteur déterministe, AD-3) |
| Valider (règles objectives) | ✅ local |
| Verrouiller / déverrouiller un attribut | ✅ local |
| **Générer** une composition depuis le brief | ❌ `online-required` — désactivé avec motif |
| Exporter | ❌ `online-required` — file d'attente ; la source reste locale |

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. Le **logo de
marque** peut être placé comme calque `asset` dans l'affiche (via `brand kit`,
`AFFICHE.md` §5.2) — il provient d'un `Artifact` utilisateur, jamais recréé dans
`src/`. Le logo Aurora n'est **jamais** placé dans l'affiche de l'utilisateur.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-9 | Les calques vivent-ils dans `blocks` ? | **TRANCHÉE** : non — dans l'`ArtifactFile` (OQ-9) |
| OQ-12 | Moteur d'édition ? | **TRANCHÉE** : **Fabric.js** (MIT, `[VALIDÉ]`), confiné derrière un contrat — OQ-12 |
| OQ-34 | Valeur de la borne de boucle K ? | **DÉFAUT-RÉVERSIBLE** : K=4 (`AFFICHE.md` §7.11 : les gains saturent après 3 rondes) |
| OQ-35 | Le score du validateur (0–10) pilote-t-il l'arrêt automatique, ou l'utilisateur décide-t-il ? | **DÉRIVÉE** : le score **propose** l'arrêt ; l'utilisateur peut relancer une ronde (contrôle utilisateur, §6.5 étape 10) |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Éditeur** (`web-shell-and-responsive.md` §2.3) — **plein écran dès `md`**.

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne, **toile `T`** ; calques/inspecteur en `Sheet` | tab bar basse | édition limitée (Phase 4) |
| `md` → `lg` (768–1023 px) | toile `T` + rail de calques | rail latéral | — |
| **`lg+` (≥ 1024 px)** | toile `T` + panneau calques + inspecteur ; `xl`+ ajoute le validateur | panneau latéral | cible web/desktop (Phase 1–2) |

**Règle** (§2.3 règle 3) : l'éditeur est plein écran dès `md`. Les panneaux sont
**repliables**, état persisté (§4.3 C2).

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.affiche` (lot L11) |
| R3 | Types SSoT déclarés | ✅ | `Artifact`/`ArtifactFile` (`entities-artifact.ts:10`/`:50`) ; JSON de calques = `AFFICHE.md` §5.1 ; contrat moteur dans `packages/design-engines` (L11, OQ-8) |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `hybrid` (§12) |
| R8 | Événements | **`ArtifactGenerated`** (`events.ts:125`) pour l'export |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | section **C. Créer** ; depuis `charte`/`design-space` |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | source = `ArtifactFile` (JSON de calques) ; single-writer **Artifact** (AD-7) ; Fabric.js hors `packages/domain` (AD-1) |
| R13 | OQ bloquantes fermées | ✅ | OQ-9/12/34/35 tranchées (§14) |

**Verdict readiness** : `NOT_READY` jusqu'à L11 (dépendance `design-engines` +
adaptateur Fabric.js, planifiée).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | la composition vient du JSON de calques local ; aucun layout codé en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | édition + validation locales ; génération/export désactivés avec motif |
| S5 | Retour arrière | tuer/relancer → composition intacte |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas le livrable (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | calques focusables, réordonnancement clavier, `aria-live`, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Verrous respectés** | aucun attribut `M` modifié par le raffinage (test dédié, §6.5 étape 9) |
| S13 | **Validateur déterministe** | violations typées, reproductibles (pas d'évaluation VLM sur la géométrie, `AFFICHE.md` §7.10) |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | validateur (types de violation) correct ? | Vitest sur `packages/design-engines` (`AFFICHE.md` §5.3) |
| Intégration | la composition se relit-elle après coupure ? | test PowerSync sur `artifacts` |
| Contrat | `ArtifactGenerated` après upload (F-06) ? | test AD-9 |
| E2E | « générer → éditer → valider → exporter » | Playwright |
| Failure | calque dégénéré → rejet visible ; raffinage plafonné | test failure |
| Permission | n/a | — |
| Offline | édition + validation locales OK | test offline |
| Recovery | relance froide → composition intacte | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/design-engines` (validateur AFFICHE) | **≥ 80 %** lignes |
| `design.affiche` | ≥ 1 test par classe applicable (§18) |
| Région « toile » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `affiche-studio` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Validateur | ≥ 1 test par type de violation (`AFFICHE.md` §5.3 : 9 types) |
| Non-régression | ≥ 1 exemple représentatif avec comparaison avant/après (§12.4) |

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
| OQ-36 | La sous-couche de lisibilité (ARO, `AFFICHE.md` §6.5) est-elle insérée automatiquement ou proposée ? | **DÉRIVÉE** : **proposée** — le validateur signale la violation `WCAG_CONTRAST` ; l'insertion du `underlay` est une correction que l'utilisateur applique ou refuse (§6.7) |
| OQ-37 | L'affiche partage-t-elle le `canvas_sessions` de la marque, ou un `Artifact` propre ? | **DÉRIVÉE** : un `Artifact` propre (chaque affiche est un livrable distinct, `entities-artifact.ts:10`) |
