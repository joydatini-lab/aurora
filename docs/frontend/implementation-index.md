# Index d'implémentation — file de travail unique

> **Ref** : `docs/frontend/derivation-protocol.md` (le protocole de décision) ·
> `docs/frontend/design-space-oq-rulings.md` (OQ Design Space tranchées) ·
> `docs/frontend/spec-template-v1.md` (le cadre §15–§19) ·
> `docs/architecture/status-register.md` (statuts mesurés) ·
> `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §10 (roadmap).
> **Créé** : 2026-10-26. **Nature** : pilotage. **Aucun code** (AD-13).
> **Objet** : **un seul** fichier qui répond à « qu'est-ce qu'on construit, dans
> quel ordre, avec quelle spec, et qu'est-ce qui bloque ». Il remplace la
> navigation entre 5 documents de planification.

---

## 0. Pourquoi cet index existe

Le dépôt portait **cinq** documents de planification récents
(`redefinition-priorites`, `decisions-d1-d5`, `plan-directeur-v1`,
`phase0-rebaseline`, `spec-template-v1`) dont **deux se contredisaient** sur la
question racine (périmètre v1). Résultat mesuré : 44 écrans dont **1** spécifié
au cadre v1, 256 OQ ouvertes, et un gate CI qui n'avait jamais tourné.

Cet index est la **vue unique**. Il ne remplace pas les documents sources : il dit
**lequel fait autorité pour quoi**, et **dans quel ordre on exécute**.

---

## 1. Les 3 faits qui commandent tout le reste

| # | Fait mesuré | Preuve | Conséquence |
|---|---|---|---|
| **F1** | Le **socle** est `IMPLEMENTED` ; Design Space est `MISSING` | `status-register.md` §1 : 14/19 packages `IMPLEMENTED` ; 0 table design | Le socle se **branche**, Design Space se **construit** |
| **F2** | **Le chemin de jobs est mort** — `fn-job-dispatcher` importe 2 symboles inexistants, l'EF n'est pas déployée, 34 jobs en attente depuis 16 jours | `decisions-d1-d5.md` §1, vérifié par `scripts/check-ef-imports.mjs` | « Finir la v1 » = **réparer le dispatcher**, pas de la cosmétique |
| **F3** | **La coquille web n'existe pas** — 1 seule app web (`apps/mobile`, Ionic), or OQ-1 a écarté Ionic du web | `decisions-d1-d5.md` §3 (D2) | `apps/web-app` est le **chemin critique** des deux options de périmètre |

> **F2 est corrigé** (T1, commit `4eae07c` : migration `0028` `pg_net` + sweep des
> handlers). Le fait est conservé ici comme **motif de l'ordre** : on ne bâtit pas
> une 4ᵉ surface sur un socle dont le chemin asynchrone vient d'être réparé.

---

## 2. Ce qui a été tranché (et n'est plus une question)

| Décision | Verdict | Doc |
|---|---|---|
| Périmètre v1 | **Socle d'abord**, Design Space séquencé après | `decisions-d1-d5.md` §3 (D1/D3), mesuré |
| Coquille web | **`apps/web-app`** (React + ReUI, sans `ion-*`) | `design-space-oq-rulings.md` OQ-10 |
| OQ-7 Brand DNA | Type `packages/domain` rattaché au `Project` | `design-space-oq-rulings.md` OQ-7 |
| OQ-8 package moteurs | **1** package `design-engines`, créé **avec** le 1ᵉʳ moteur | `design-space-oq-rulings.md` OQ-8 |
| OQ-9 calques vs `blocks` | Calques dans l'`ArtifactFile` ; `blocks` reste `md` | `design-space-oq-rulings.md` OQ-9 |
| OQ-12 moteur d'édition | **Fabric.js** (`[VALIDÉ]`, MIT), confiné derrière un contrat | `design-space-oq-rulings.md` OQ-12 |
| Inventaire écrans | 44 → **57** (13 Design Space) | `design-space-oq-rulings.md` OQ-6 |
| LibreChat | **Abandonné** | `adr-018` §D-018.4 |
| `apps/mobile` / `assistant-ui` | **Conservés** (Phase 4 / réserve) | `decisions-d1-d5.md` §3 (D4) |

---

## 3. La file de travail (l'ordre, avec la porte de sortie de chaque lot)

Chaque lot suit : **spec → implémentation → gate → 1 commit**. Un lot ne commence
que si le précédent est vert.

| # | Lot | Livrable | Porte de sortie | Bloqué par |
|---|---|---|---|---|
| **L0** | **Gate CI réellement exécutable** | ✅ **fait** (`5aa15bf`) | `ci-gate` vert en CI | — |
| **L1** | **Référentiel de décision** | ✅ **fait** — protocole + 7 arbitrages + cet index | 0 OQ Design Space ouverte | — |
| **L2** | **Contrat Brand DNA** | ✅ **fait** (`8046ba4`) | 16 tests verts, 0 table neuve | — |
| **L2b** | **Garde de dérive domaine↔schéma** | ✅ **fait** — `tests/db/domain-schema-drift.test.ts`, câblé au CI | 8/8 verts, non-vacuité prouvée par mutation | — |
| **L3** | **Coquille `apps/web-app`** | ✅ **fait** (`b92c722`) — app React, tokens `packages/ui`, 9 sections §4.2 + Agent, 3 paliers responsive | 17 tests web-app + 4 ui, live 3 paliers, `build` vert | — |
| **L4** | **Socle branché sur la coquille** | 5 écrans primaires (`home`, `taches-liste`, `cours-liste`, `progress-dashboard`, `agent-chat`) dans `web-app` | S1–S11 de `spec-template-v1.md` §4 | L3 |
| **L5** | **Design Space — projet + brief** (D1) | `design-space`, `design-brief` sur `Project` existant | parcours brief → Brand DNA | L3 |
| **L6** | **Design Space — moteur LOGO** (D3) | `packages/design-engines` **créé ici** + moteur SVG + `logo-studio` | SVG canonique, calques, diff avant/après | L5, OQ-8 |
| **L7** | **Design Space — charte + affiche** (D4–D5) | `charte`, `affiche-studio`, adaptateur Fabric.js | JSON de calques éditable, export SVG | L6 |
| **L8** | **Design Space — validateur + documents + export** (D7–D9) | `design-validator`, `document-studio`, `design-exports` | validateur déterministe, source ≠ distribution | L7 |
| **L9** | **Design Space — versions + impact** (D10) | `design-versions`, `brand-impact` | retour arrière, propagation **proposée** jamais silencieuse | L8 |

**Pourquoi L3 avant L4/L5** : `apps/web-app` est le chemin critique — il sert le
socle **et** Design Space. Bâtir L4 dans la coquille Ionic qu'on démontera est le
coût déjà identifié (`web-shell-and-responsive.md`).

**Pourquoi L5 avant L6** : corrigé par dérivation (OQ-11) — le « projet Design
Space » n'est pas un objet neuf (c'est un `Project`), donc le seul objet neuf est
le Brand DNA, déjà livré (L2).

---

## 4. Couverture des specs (l'état réel, sans complaisance)

| Périmètre | Écrans | Spec au cadre v1 | Reste |
|---|---|---|---|
| Écrans existants | **44** | **1** (`taches-liste`) | **43** à compléter (§15–§19) |
| Écrans Design Space | **13** | **0** | **13** à écrire (format 14 sections + §15–§19) |
| **Total** | **57** | **1** | **56** |

**Règle** : un écran sans spec au cadre v1 est `NOT_READY`
(`spec-template-v1.md` §3) et **ne peut pas entrer dans un lot**. C'est ce qui
rend la file exécutable sans question : la spec *est* la réponse.

**Ordre de rédaction des specs** (celui de `spec-template-v1.md` §7, étendu) :
1. les **5 écrans primaires** (vague 1) — ce sont les points d'entrée ;
2. les **13 écrans Design Space** — ils sont neufs, donc sans dette de rétrofit ;
3. les **39 écrans restants**, vague par vague.

---

## 5. Les 8 pièges vérifiés (à ne pas reproduire)

| # | Piège | Cas réel mesuré | Garde |
|---|---|---|---|
| G1 | **Lire un statut comme un fait** | `docs/integration/` déclaré livré par une mémoire : **0 commit**, branche 404, 15 SHA inexistants | P0/P1 avant tout statut |
| G2 | **Gate vert pour un travail absent** | 23 steps `ci.yml` gardés par `hashFiles('…')` : un fichier supprimé = step **évaporé sans échec** (cas `product-modes.test.ts`) | vérifier l'existence du fichier de test |
| G3 | **Créer une racine avant l'audit** | 3 packages `engineering-*` en `export {}` — stubs vides `SCAFFOLDED` | lire l'audit (§7.2) avant de créer |
| G4 | **Deux SSoT pour une donnée** | `powersync-schema.ts` dit `title`, PG dit `name` | AD-6/AD-15 : un propriétaire |
| G5 | **Le gate n'a jamais tourné** | `ci-gate` structurellement inatteignable sur ce fork (0 run sur 14 commits + PR) | `workflow_dispatch` + condition |
| G6 | **Changelog ≠ arbre** | changelog revendique « product modes » ; `ef48cb5` les a supprimés | le changelog est un **journal**, pas un état |
| G7 | **Un plan contredit l'autre** | `redefinition-priorites` (socle) vs `plan-directeur` (périmètre complet), même jour | **cet index** est la vue unique |
| G8 | **Une variable CSS que personne ne lit** | `resolveThemeCSSVars` émettait `--aurora-accent.primary` (point) ; tout le dépôt lit `--aurora-accent-primary` (tiret) → `--primary`/`--accent` vides, état actif invisible. Masqué sur mobile par les replis `tokens.css`, exposé par `web-app` | `packages/ui/test/theme-css-vars-naming.test.ts` (`b92c722`) |

**Leçon G8 (à généraliser)** : un nom de variable CSS est une **interface entre
deux fichiers**. Quand l'émetteur et le lecteur divergent, aucune erreur n'est
levée — la valeur est simplement vide, et le symptôme (« ça a l'air transparent »)
n'apparaît que si on MESURE le rendu. Ne jamais conclure d'un nom lu dans le code :
lire la variable calculée dans le navigateur (`getPropertyValue`).

### 5.1 Instances de G4 vérifiées le 2026-10-26

| # | Dérive | Domaine (SSoT) | Base (`supabase/migrations/`) | Statut |
|---|---|---|---|---|
| **D1** | `Project.title` vs `projects.name` | `entities-productivity.ts:13` → `title` | `0002_productivity.sql:14` → `name` ; `powersync-schema.ts` → `name` | **Renommage DÉLIBÉRÉ** — traduit par les writers (`goals-projects.ts:184`), pas un défaut. Idem `Task.title`→`subject`, `deadline`→`end_date`, `timeSpentSec`→`actual_minutes`. |
| **D2** | `Artifact.kind` accepte `csv`/`text`/`code` | `entities-artifact.ts:14–26` → 13 valeurs | `0007_artifact.sql:11` → 10 valeurs | ✅ **CORRIGÉ** (`fb608c1`, migration 0032) — contrainte élargie à 13 valeurs |

**D1 n'est pas un défaut** : le writer traduit le nom (`title` → `name`), donc rien
n'est perdu. Ce qui serait un défaut, c'est un mapper qui lirait `row.title` — et le
garde le détecte (il exige une entrée `RENAMES` explicite pour chaque paire).

### 5.2 D3 — colonnes fantômes : ✅ CORRIGÉ (`fb608c1`, migration 0032)

**Mesuré et confirmé contre la base live le 2026-10-26, puis corrigé.** Trois colonnes
étaient émises par des writers et n'existaient **dans aucun** schéma — ni la base live,
ni `powersync-schema.ts`, ni le DDL SQLite généré.

| Colonne écrite | Par | Preuve | Effet mesuré |
|---|---|---|---|
| `tasks.tags` | `createTask` | `packages/productivity/src/tasks.ts:83` | Les tags s'affichaient localement, **jamais persistés** |
| `tasks.recurrence_rule` | `createTask` | `packages/productivity/src/tasks.ts:97` | La règle de récurrence était perdue au premier PATCH |
| `projects.view_mode` | `createProject` + `updateProject` | `goals-projects.ts:164` / `:183` | La vue choisie ne survivait pas au serveur |

**Pourquoi c'était silencieux — la chaîne, vérifiée :**
1. `EngineLocalStoreBridge.upsert` est une **Map** indexée par nom de colonne
   (`local-store-bridge.ts:67`) : une clé inconnue est **acceptée**.
2. L'écran lit la Map → **tout s'affichait correctement**.
3. Le PATCH part vers PostgREST → la colonne n'existe pas → échec **traité comme
   une écriture en file d'attente**, pas comme un crash.
4. L'utilisateur voyait ses tags ; le serveur ne les a jamais eus.

**Correctif appliqué** — migration `0032_fix_phantom_columns.sql`, additive et
idempotente : `tasks.tags jsonb NOT NULL DEFAULT '[]'` (précédent symétrique :
`tasks.dependencies`, `0002:75`), `tasks.recurrence_rule text` (nullable),
`projects.view_mode text` + CHECK sur l'union fermée `ProjectView`, et
`artifacts_kind_check` élargie à 13 valeurs (D2). Trois déclarations clientes
alignées dans le même commit, sinon la migration aurait créé une **nouvelle**
dérive : `powersync-schema.ts`, `sqlite-schema.ts`, et le garde.

**Preuve indépendante** (vrai Postgres, `supabase/postgres:15.8.1.085`, 33
migrations appliquées) — les écritures qui échouaient passent, et le contrôle
négatif prouve que la contrainte élargie **mord encore** :
```
WRITE OK tasks: tags=[{"c":"x","v":"a","ts":1}] rule=FREQ=DAILY
WRITE OK projects: view_mode=kanban
WRITE OK artifacts: kinds=csv,text,code
NEGATIVE CONTROL OK: bogus kind rejected
```

**Non fait, délibérément** : les vues `v_productivity_scope` (0015 + `relay.sql`)
ne reçoivent pas ces colonnes. Ce sont déjà des projections à dénominateur commun
(UNION ALL tasks/projects/goals) qui omettent `parent_recurrence_key`, `energy`,
`work_context` et `actual_minutes` ; `view_mode` est propre à `projects`. Le
runtime ne les lit pas — `sync-config.yaml` déclare des flux **per-table**
précisément pour éviter « la perte de colonnes hétérogènes d'une UNION ALL ».

**Le garde** : `tests/db/domain-schema-drift.test.ts` **appelle les vrais writers**
et vérifie chaque clé de patch contre les migrations. Il porte une liste
`KNOWN_DEFECTS` **à tripwire** — désormais **vide**, puisque les quatre entrées
sont corrigées. Le tripwire garantit qu'une entrée ne peut pas survivre à son
défaut. Non-vacuité prouvée par mutation : masquer 0032 fait échouer le garde avec
`createTask writes tasks.tags — no such column`.

---

## 6. Ce qui n'est PAS dans le périmètre v1 (pour éviter la dérive)

| Non-objectif | Motif |
|---|---|
| Studios **3D / Vidéo / Musique / Web avancé / Data Viz** | référence §6.1 : *« ne sont pas réputés inclus simplement parce qu'ils apparaissent dans la vision cible »* |
| `packages/contracts`, `packages/design-system`, `packages/modules` | §8.7.2 autorise l'équivalence ; `packages/ui` porte les tokens (AD-17) |
| Chat tiers (LibreChat / open-webui) | `adr-018` §D-018.4 : abandonné |
| Copie de code LobeHub | licence Community (condition 1b) — **référence de conception seulement** |
| Fonctions entreprise (orgs, SSO, RBAC, audit) | évolution produit future ; ne pas complexifier la v1 |

---

## 7. Comment cet index se maintient

- **Une décision nouvelle** → ajoutée au §2 avec sa preuve, jamais en prose.
- **Un lot terminé** → la ligne passe à ✅ avec le SHA du commit.
- **Un fait mesuré qui change** → §1 mis à jour avec la nouvelle preuve.
- **Une question non tranchable** → `derivation-protocol.md` §3 (`ESCALADE`),
  **et seulement alors** posée au owner.

**Règle d'or** : si une information n'est pas ici ou dans un doc du §2, elle n'est
pas une décision — c'est une opinion. Le protocole existe pour la transformer en
preuve, pas pour la contourner.
