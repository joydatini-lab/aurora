# Protocole de dérivation des OQ — « ne pas demander, prouver »

> **Ref** : `AI_RULES.md` §1–§2 (chaîne d'autorité) · `docs/ui-libraries.md` §8
> (« Agent Decision Framework — autonomous, no user input ») · AD-13 (design ≠
> code) · AD-15 (SSoT) · `docs/frontend/spec-template-v1.md`.
> **Créé** : 2026-10-26. **Nature** : processus. **Aucun code** (AD-13).
> **Objet** : remplacer « je pose la question au owner » par « je dérive la
> réponse de la preuve, et je marque sa réversibilité ». 374 OQ sont
> consolidées (`docs/design-system/screens/_open-questions.md`), 256 ouvertes.
> Les poser une par une est ce qui nous a fait perdre du temps.

---

## 1. Pourquoi ce protocole existe

`docs/ui-libraries.md` §8 établit déjà le principe pour les composants :
*« When an agent needs a UI component, it follows this decision tree WITHOUT
asking the user »*. Il manquait la même chose pour les **questions ouvertes de
conception**.

Le coût de l'absence est mesuré : 374 OQ consolidées, dont **256 ouvertes**, et
**1 seul écran** sur 44 porte le cadre §15–§19 (`spec-template-v1.md` §7). Une OQ
non tranchée bloque son écran ; un écran bloqué bloque son lot.

**Règle directrice :** une OQ n'est posée au owner que si elle est
**irréversible** ET **sans preuve**. Dans tous les autres cas, l'agent tranche,
écrit la preuve, et marque la réversibilité.

---

## 2. L'échelle de précédence (la source de la réponse)

Toute dérivation part de cette échelle, du plus fort au plus faible. **On
s'arrête au premier niveau qui répond.**

| Rang | Source | Exemple | Force |
|---|---|---|---|
| **P0** | **Code exécutable + test vert** | `packages/domain/src/entities-canvas.ts:13` définit `CanvasSession` | Fait. Prime sur tout. |
| **P1** | **Base live** (schéma, RLS, EF déployées) | 64 tables, 124 politiques (`decisions-d1-d5.md` §0) | Fait mesuré. |
| **P2** | **Invariants gelés** (AD-1…AD-17, ADR v1.7) | AD-9 : vocabulaire d'événements **fermé à 9** | Contrainte dure. Ne se dérive pas, s'applique. |
| **P3** | **Référence produit v1.1** (owner) | §6.2 : 4 états épistémiques ; §10.4 : ordre des lots | Prescriptif owner. |
| **P4** | **Docs d'architecture du dépôt** | `design-space-integration.md` §3 : Design Space = producteur d'`Artifact` | Conception déjà ratifiée. |
| **P5** | **Docs de module** (`docs/<module>/*.md`) | `AFFICHE.md` §4 : Fabric.js `[VALIDÉ]` | Recherche validée. |
| **P6** | **Dérivation par analogie** | un précédent identique dans un module voisin | Faible mais réel. |
| **P7** | **Défaut réversible** | « le plus petit choix qu'on peut défaire » | Dernier recours **assumé**. |

**Ce que l'échelle interdit :** inventer un niveau P8 (« intuition »). S'il n'y a
pas de preuve, on ne devine pas — on applique P7 **et on le dit**.

---

## 3. Taxonomie du verdict (les 5 sorties possibles)

Chaque OQ reçoit **exactement un** verdict :

| Verdict | Sens | Trace exigée |
|---|---|---|
| **`RÉSOLUE`** | Une source P0–P5 répond directement. | Le fichier + la ligne, ou la citation + §. |
| **`DÉRIVÉE`** | Aucune source ne répond *directement*, mais l'échelle contraint la réponse à une seule option. | Le raisonnement **et** les options écartées avec leur motif. |
| **`DÉFAUT-RÉVERSIBLE`** | Aucune preuve. On choisit le plus petit choix défaisable. | Le choix + **comment le défaire** + le coût de sortie. |
| **`ESCALADE`** | Irréversible **et** sans preuve. | La question **et** pourquoi elle est irréversible. |
| **`NON-OQ`** | La question est mal posée, ou déjà tranchée ailleurs. | Le doublon / l'erreur de cadrage. |

**`ESCALADE` est rare par construction.** Elle exige les **deux** conditions.
Une décision réversible ne s'escalade jamais, même sans preuve : on applique P7.

---

## 4. Le test d'irréversibilité (la seule porte vers `ESCALADE`)

Une décision est irréversible si **au moins un** de ces critères est vrai :

| # | Critère | Exemple |
|---|---|---|
| I1 | **Coût de sortie > 1 lot** | changer de moteur d'édition après 3 studios écrits |
| I2 | **Contrat public déjà publié** | un type `packages/domain` consommé par ≥ 2 packages |
| I3 | **Migration de données** | une table peuplée qu'il faudrait transformer |
| I4 | **Dépense ou engagement externe** | un compte payant, une clé tierce, un dépôt distant |
| I5 | **Périmètre produit** (ce qu'on vend) | ajouter/retirer une famille entière de la v1 |

> **I5 est le seul critère fréquent.** Les OQ de *modèle de données*, de
> *topologie de package* et d'*écran* ne sont presque jamais irréversibles : un
> type non consommé se renomme, un package vide se supprime, un écran se
> réordonne.

---

## 5. Ce qu'une dérivation doit produire (format obligatoire)

Chaque OQ tranchée s'écrit dans le doc de son module, sous cette forme :

```
### OQ-N — <question>
- **Verdict** : RÉSOLUE | DÉRIVÉE | DÉFAUT-RÉVERSIBLE | ESCALADE | NON-OQ
- **Réponse** : <la décision, en une phrase impérative>
- **Preuve** : <fichier:ligne | citation § | base live>
- **Options écartées** : <option → motif du rejet> (si DÉRIVÉE)
- **Réversibilité** : <comment défaire + coût> (si DÉFAUT-RÉVERSIBLE)
- **Conséquence** : <ce que ça débloque>
```

Une dérivation **sans** `Preuve` ou **sans** `Réversibilité` (quand applicable)
est **refusée en revue** : c'est une opinion déguisée.

---

## 6. Les 4 pièges vérifiés (à ne pas reproduire)

Ces quatre erreurs ont réellement eu lieu dans ce dépôt. Le protocole existe
pour elles.

| # | Piège | Cas réel | Garde |
|---|---|---|---|
| G1 | **Lire un statut comme un fait** | `docs/integration/` déclaré livré par une mémoire ; **jamais existé** (0 commit) | P0/P1 avant toute affirmation de statut |
| G2 | **Un gate vert pour un travail absent** | 23 steps `ci.yml` gardés par `hashFiles('…')` : un fichier supprimé = step **évaporé sans échec** | vérifier que le fichier de test **existe** avant de lire « vert » |
| G3 | **Créer une racine avant l'audit** | la référence §7.2 l'interdit explicitement | P4 : lire l'audit d'intégration avant de créer un package |
| G4 | **Deux SSoT pour une donnée** | `powersync-schema.ts` dit `title`, PG dit `name` | P2 (AD-6/AD-15) : un seul propriétaire, jamais un doublon |

---

## 7. État d'application

| Domaine | OQ | Traitées | Doc |
|---|---|---|---|
| **Design Space Pro** | 7 (OQ-6…OQ-12) | ✅ **ce lot** | `docs/frontend/design-space-oq-rulings.md` |
| Écrans (vagues 1–5) | 256 ouvertes | ⏳ backlog | `spec-template-v1.md` §7 |
| Autres modules | à inventorier | ⏳ | — |

**Ordre de traitement** : Design Space d'abord — c'est le seul domaine où l'owner
a explicitement demandé de commencer, et ses 7 OQ conditionnent **13 écrans**.
