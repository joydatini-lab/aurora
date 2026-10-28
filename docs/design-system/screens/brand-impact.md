# Écran — Impact de marque (`brand-impact`)

Module : **Design Space Pro** · Route : `/design/:projectId/impact` · Statut : **neuf** ·
SSoT écran : `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §6.8 (« Une modification de logo, de palette ou de typographie doit déclencher une analyse des conséquences possibles »),
§11.1 étape 12 (« la modification ultérieure de la marque déclenche un aperçu des livrables potentiellement concernés, mais pas de réécriture silencieuse »),
§6.3 étape 10 · SSoT périmètre : `docs/frontend/design-space-scope.md` §3 (écran 13) · SSoT arbitrages : `docs/frontend/design-space-oq-rulings.md` OQ-7 ·
SSoT types : `packages/domain/src/entities-design.ts` (`diffBrandDna`, `BrandDnaChange`, `BrandDnaProvenance.changeSummary`) · Gabarit : **Liste** (`web-shell-and-responsive.md` §2.3) · Cadre : `docs/frontend/spec-template-v1.md` §15–§19.

---

## §1 Psychologie du designer

| Dimension | Valeur |
|---|---|
| Objectif utilisateur | Voir **quels livrables** sont potentiellement affectés par un changement de marque, et décider de les **réviser** ou non. |
| Contexte (appareil/moment/réseau) | Web/desktop. L'analyse est **locale** (AD-7) : elle compare la version de Brand DNA référencée par chaque livrable. |
| Fréquence | À chaque changement de marque (logo, palette, typographie). |
| État émotionnel cible | **Prévenu, jamais surpris.** Le créatif voit l'ampleur d'un changement **avant** qu'il ne se propage ; rien n'est réécrit dans son dos. |
| Erreur la plus probable | **Réécriture silencieuse** — qu'un document approuvé change sans accord. C'est l'erreur que §6.8/§11.1 interdisent explicitement. |
| Ce que l'écran RÉSOUT | La question « si je change ceci, qu'est-ce qui bouge, et que dois-je réviser ? » — liste des livrables affectés + décision par livrable. |
| Invariant | **§6.8 / §11.1 / AD-6** : l'analyse **identifie** et **propose** ; elle ne réécrit **jamais** un fichier approuvé. Chaque livrable référence la version de Brand DNA qu'il utilise (`BrandDna.version`) ; le diff se calcule via `diffBrandDna` (`entities-design.ts:256`). |

---

## §2 Zones de l'écran

| Zone | Contenu | SSoT |
|---|---|---|
| TopBar | Nom de la marque + versions comparées (avant → après) | §6.8 |
| Bandeau de changement | Résumé du changement (`changeSummary`) : quels blocs ont bougé | `BrandDnaProvenance` |
| Liste des livrables affectés | Chaque livrable : nom, type, version de Brand DNA utilisée, statut (approuvé/brouillon) | §6.8 |
| Détail (panneau droit) | Raison de l'impact : quels champs sont touchés, quelles règles héritées changent | §6.5 brand kit |
| Barre d'action | « Réviser » (par livrable) · « Marquer comme non concerné » · « Tout réviser » (confirmé) | §6.8 |

---

## §3 Éléments de l'écran (table 100 % de la zone)

| Élément | Composant DS | Lib (`ui-libraries.md` §1) | Tokens (AD-17) | Variante responsive | Source SSoT |
|---|---|---|---|---|---|
| TopBar marque | TopBar | shadcn (pattern header) | `text.xl`, `color.neutral.900/100` | même | §6.8 |
| Versions comparées | Chip avant/après | shadcn Badge | `font.mono`, `text.sm` | même | §6.8 |
| **Bandeau de changement** | Callout info | shadcn Alert | `color.info` + `-surface` | bandeau sous TopBar | `diffBrandDna` |
| Liste des livrables | `ListItem` + Badge statut | shadcn List + Badge | `row.min-height=56`, `text.sm`, `border` | liste < `lg`, détail overlay | §6.8 |
| Badge type de livrable | Badge tonal | shadcn Badge | logo→`accent-primary` · affiche→`info` · charte→`success` · document→`text-muted` | même | §6.6 |
| Badge « approuvé » | Badge success | shadcn Badge | `color.success`, `color.success-surface` | même | §12.2 |
| Badge « non concerné » | Badge tonal | shadcn Badge | `text-muted` | même | §6.8 |
| Référence de version | Chip + lien | shadcn Badge + Button ghost | `color.info` | sous le livrable | §6.8 |
| Détail de l'impact | `KeyValueList` | shadcn Card | `text.muted` (clés), `text-primary` (valeurs) | repliable | §6.5 |
| Bouton « Réviser » | Button secondary | shadcn Button | `color.brand.primary` | sticky bas | §6.8 |
| Bouton « Marquer comme non concerné » | Button ghost | shadcn Button | `text-secondary` | sticky bas | §6.8 |
| Bouton « Tout réviser » | Button **primary** (**seul** CTA, **confirmé**) | shadcn Button | `color.brand.primary`, `touch.target=48` | sticky bas | §6.8 |
| État `loading` | Skeleton (forme de la liste) | shadcn Skeleton | `color.skeleton`, pulse | même | §4 |

> **AD-14 (par analogie)** : « Tout réviser » est la **seule** action primaire, et
> elle est **confirmée** (aperçu de l'ampleur). Réviser un livrable est `secondary`.

---

## §4 États de l'écran (6 états S6 + états §6.1)

| État | Déclencheur | Rendu | CTA |
|---|---|---|---|
| `loading` | analyse de l'impact locale | Skeleton de la liste | aucun |
| `empty` | aucun livrable affecté | EmptyState : « Aucun livrable affecté par ce changement. » | retour au studio |
| `success` | livrables affectés listés | liste + détail + raisons | « Réviser » / « Tout réviser » |
| `error` | analyse impossible | Callout danger + « Réessayer » | Réessayer |
| `offline` | réseau coupé | **analyse locale** pleinement active (AD-7) ; badge « Hors-ligne » informatif | Réviser (marquage local) actif |
| `killed` | app tuée puis relancée | Skeleton + re-sync | Reprendre |
| `404` | marque inexistante ou non autorisée | pattern 404 global (**jamais** un 404 brut) | Retour |
| `en-cours` | révision d'un livrable en cours | progression ; **hors du cycle bloquant** (§4.3 C7) | Annuler |
| `échec` | révision échouée | Callout danger + motif ; **aucun** livrable réécrit | Réessayer |
| `terminé` | révisions appliquées | Toast 3 s + liste mise à jour | — |

> **Point dur** : « réviser » **ne réécrit pas** le fichier. L'action ouvre le
> studio du livrable avec le nouveau contexte de marque ; la nouvelle version est
> créée **par le studio**, avec accord — jamais en silence (§6.8, §11.1 étape 12).

---

## §5 Micro-interactions (GPU-only, 150–250 ms, smooth)

| Interaction | Effet | Durée |
|---|---|---|
| Sélection d'un livrable | mise à jour du détail d'impact | 180 ms |
| Marquage « non concerné » | bascule du badge + atténuation | 150 ms |
| Lancement d'une révision | transition vers le studio | 200 ms |
| Révision en lot | progression + liste mise à jour | 200 ms |

`reduced-motion` : transitions remplacées par un changement d'état instantané.

---

## §6 Modals / BottomSheets

| Modal | Déclencheur | Contenu |
|---|---|---|
| Détail d'un impact | tap sur un livrable | champs touchés, règles héritées modifiées, version utilisée (§6.5) |
| Confirmation de révision en lot | « Tout réviser » | liste des livrables + avertissement « les fichiers approuvés ne sont pas réécrits en silence » |
| Raison du « non concerné » | « Marquer comme non concerné » | motif (optionnel) — la décision est enregistrée, pas oubliée |

---

## §7 Formulaires

Pas de saisie de contenu. L'écran expose des **décisions** : réviser, marquer
comme non concerné. Chaque décision est **enregistrée** avec son motif. Aucune
action ne modifie un fichier approuvé sans passer par le studio du livrable.

---

## §8 Pagination / Tri / Filtres

- **Tri** : par sévérité d'impact (logo > palette > typographie), puis par type de livrable.
- **Filtres** : « seulement les livrables approuvés », « seulement les non traités », par type.
- **Pagination** : scroll natif jusqu'à ~50 livrables, puis pagination shadcn (S8).

---

## §9 Transitions entre écrans

- entrée depuis `brand-dna`, `charte`, `design-assets` (après un changement de marque) ;
- sortie vers le studio du livrable concerné (`logo-studio`, `affiche-studio`,
  `document-studio`, `charte`) avec le nouveau contexte de marque ;
- retour arrière : conserve la sélection et le filtre (C5).

---

## §10 Thèmes (10 + 3 presets, par couche — AD-17)

Les couleurs **de sévérité** utilisent les tokens sémantiques (`danger`,
`warning`, `info`, `success`), **figés** quel que soit le thème (règle bloquante
`overview.md` §5.1). Les panneaux utilisent les tokens `packages/ui`.

---

## §11 Accessibilité (WCAG AA)

- chaque livrable est focusable avec un `aria-label` (nom + type + statut) ;
- le statut « non concerné » porte un **texte**, pas seulement une atténuation visuelle ;
- la confirmation de révision en lot est un dialogue accessible (focus trap) ;
- cibles ≥ 44 px, focus visible, `reduced-motion` respecté.

---

## §12 Offline (classe = `offline-capable`)

| Capacité | Offline |
|---|---|
| Analyser l'impact d'un changement | ✅ local (comparaison de versions, AD-7) |
| Marquer un livrable « non concerné » | ✅ local |
| **Réviser** un livrable | ⚠️ ouvre le studio (local) ; l'export/regénération suit la règle du studio |
| Propager vers des livrables distants | ❌ `online-required` — file d'attente ; jamais silencieux |

---

## §13 Occurrences du logo (S9)

Le logo **Aurora** apparaît dans la TopBar selon la matrice S9. L'écran manipule
le **logo de marque** comme un des objets d'impact possibles (un changement de
logo affecte les livrables qui l'utilisent) — sans jamais altérer le logo Aurora.

---

## §14 Questions ouvertes (OQ)

| # | Question | Verdict |
|---|---|---|
| OQ-7 | L'analyse s'appuie-t-elle sur une entité neuve ? | **TRANCHÉE** : non — sur `BrandDna.version` référencée par les livrables + `diffBrandDna` (OQ-7) |
| OQ-64 | Un livrable **non approuvé** est-il listé ? | **DÉRIVÉE** : oui, mais distingué — le risque principal (§6.8) est la réécriture d'un livrable **approuvé** ; les brouillons sont listés à part |
| OQ-65 | « Réviser » réécrit-il le livrable, ou l'ouvre-t-il ? | **DÉRIVÉE** : il l'**ouvre** dans son studio — la réécriture est une décision du studio, jamais une propagation automatique (§6.8) |
| OQ-66 | L'analyse couvre-t-elle les exports déjà distribués ? | **À TRANCHER** au lot L13 — un export de distribution est figé ; sa révision relève de la politique de distribution (§6.9) |

---

## §15 Responsive (cadre v1 — `docs/frontend/spec-template-v1.md`)

Gabarit : **Liste** (`web-shell-and-responsive.md` §2.3) — avec détail en panneau
au-delà de `lg`.

| Breakpoint | Layout | Navigation | Notes |
|---|---|---|---|
| base → `md` (< 768 px) | 1 colonne (liste) ; détail en **overlay `O`** | tab bar basse | décisions ponctuelles (Phase 4) |
| `md` → `lg` (768–1023 px) | 1 colonne + détail en overlay | rail latéral | — |
| **`lg+` (≥ 1024 px)** | **2 panneaux** : livrables \| détail d'impact ; `xl`+ ajoute l'inspecteur | panneau latéral | cible web/desktop |

**Règle** (§2.3 règle 2) : le détail est un **overlay sous `lg`**, un **panneau à
`lg`+**.

> **OQ-4** : le seuil de bascule overlay→panneau (`lg` proposé) n'est pas ratifié globalement.

---

## §16 Critères de readiness (avant de coder)

| # | Critère | État | Preuve |
|---|---|---|---|
| R1 | Owner identifié | ✅ | Design Space Pro (famille **Artifacts**) |
| R2 | Ligne de catalogue | ⏳ à ajouter : `design.brand-impact` (lot L13) |
| R3 | Types SSoT déclarés | ✅ | `diffBrandDna`, `BrandDnaChange`, `BrandDnaProvenance` (`entities-design.ts:256`/`:235`/`:107`) ; `Artifact` pour les livrables |
| R4 | Spec §1–§14 complète | ✅ | ce document |
| R5 | 6 états S6 couverts | ✅ | §4 |
| R6 | États §6.1 couverts | ✅ | §4 (`en-cours`, `échec`, `terminé`, `404`) |
| R7 | Classe offline déclarée | ✅ | `offline-capable` (§12) |
| R8 | Événements | **aucun** émis par l'écran (l'analyse est une lecture ; AD-9 fermé à 9) |
| R9 | Permissions | aucune |
| R10 | Entrée de nav déclarée | ✅ | depuis `brand-dna`/`charte`/`design-assets` |
| R11 | Tokens identifiés | ✅ | §3 (aucune valeur brute) |
| R12 | Contrat de données | ✅ | lecture locale AD-7 ; l'écran ne réécrit aucun livrable (AD-6) |
| R13 | OQ bloquantes fermées | ✅ | OQ-7/64/65 tranchées ; OQ-66 (exports distribués) **non bloquante** |

**Verdict readiness** : `READY` (après l'ajout de la ligne catalogue R2 ; OQ-66 hors écran).

---

## §17 Critères de succès (pour déclarer « fait »)

| # | Critère | Mesure |
|---|---|---|
| S1 | Données réelles | l'impact est **calculé** sur les versions référencées ; aucune liste codée en dur |
| S2 | 6 états prouvés | §4 — 1 story + 1 test par état |
| S3 | 404/feature-disabled | §4 — pattern global, jamais un 404 brut |
| S4 | Offline vérifié | analyse + marquage locaux |
| S5 | Retour arrière | tuer/relancer → décisions conservées |
| S6 | Isolation utilisateur | un autre utilisateur ne lit pas la marque/livrables (RLS) |
| S7 | Tokens-only | 0 valeur brute |
| S8 | A11y AA | livrables focusables, statut par texte, dialogue accessible, 44 px |
| S9 | Responsive | 3 paliers conformes à §15 |
| S10 | Gate vert | typecheck + lint + tests |
| S11 | Aucune régression | suites existantes vertes |
| S12 | **Pas de réécriture silencieuse** | un changement de marque ne modifie **aucun** livrable approuvé sans accord (test) |
| S13 | **Traçabilité de la décision** | chaque « non concerné » est enregistré avec son motif |

---

## §18 Critères de QA (9 classes — `docs/testing/matrix.md` §1)

| Classe | Question | Preuve attendue |
|---|---|---|
| Unitaire (domaine) | `diffBrandDna` détecte correctement l'impact ? | ✅ **déjà livré** — `packages/domain/test/brand-dna.test.ts` |
| Intégration | les décisions se relisent-elles après coupure ? | test PowerSync |
| Contrat | aucun événement émis (AD-9) | test d'absence |
| E2E | « changer la marque → voir l'impact → réviser » | Playwright |
| Failure | révision échouée → aucun livrable réécrit | test failure |
| Permission | n/a | — |
| Offline | analyse locale OK | test offline |
| Recovery | relance froide → décisions conservées | test recovery |
| Plateforme | n/a (web) | — |

---

## §19 Couverture de tests exigée (seuils + DoD)

| Périmètre | Seuil |
|---|---|
| `packages/domain` (diff de marque) | **≥ 80 %** — ✅ tests existants |
| `design.brand-impact` | ≥ 1 test par classe applicable (§18) |
| Région « livrables affectés » | **6 tests d'état S6** + états §6.1 applicables |
| Écran `brand-impact` | ≥ 1 story (`Defaut`+`vide`+`chargement`+`erreur`) + ≥ 1 test `play` |
| Non-régression | ≥ 1 test : aucun livrable approuvé réécrit sans accord (§6.8) |

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
| OQ-67 | L'écran fait-il aussi l'analyse inverse (livrable → marque) ? | **DÉRIVÉE** : non — cet écran est **marque → livrables** (§6.8) ; l'analyse inverse (un livrable donné, quelles règles de marque il utilise) vit dans `design-versions`/le studio |
| OQ-68 | Un changement de **Brief** (pas de Brand DNA) déclenche-t-il une analyse d'impact ? | **DÉRIVÉE** : non — §6.8 nomme « logo, palette ou typographie » (l'identité **visuelle**) ; un changement de brief alimente le DNA, dont l'impact se calcule ensuite ici |
