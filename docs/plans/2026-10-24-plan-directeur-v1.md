# Plan directeur v1 — périmètre A–M ratifié

> **Statut :** plan d'exécution. Remplace la séquence proposée par
> `2026-10-24-redefinition-priorites.md` §4 (qui présupposait D1 = « socle »).
> **Owner a tranché D1 = périmètre complet A–M** — donc Design Space Pro (L) est
> dans la v1, pas en Phase 1B conditionnelle.
> **Règle de lecture (`AI_RULES.md` §1) :** le code et la base live gagnent sur
> les docs. Chaque fait ci-dessous porte un fichier, une commande ou une requête.
> **Créé :** 2026-10-24. **Nature :** plan. Le code de cette session est dans
> `c8367fa` (T1a) et `7221f20` (bundling EF).

---

## 0. Ce qui a changé depuis le dernier plan

| Fait | Avant | Maintenant | Preuve |
|---|---|---|---|
| Dispatcher démarre | ❌ 2 imports morts | ✅ `check-ef-imports` OK, 70 symboles | `node scripts/check-ef-imports.mjs` |
| FSRS planifie | ❌ intervalle négatif → 1 min | ✅ 9–10 j réels | `packages/learning/test/jobs.test.ts` |
| EF déployables | ❌ imports `packages/*` bruts | ✅ 8/8 bundlées, 0 `require(` | `node scripts/check-ef-bundles.mjs` |
| `config.toml` | ❌ 5 sections mortes (underscores) | ✅ slugs réels + `entrypoint` | `supabase/config.toml` |
| Dispatcher déployé | ❌ absent | ❌ **absent** | `list_edge_functions` → 5 EF |

**Ce qui n'a pas changé : le dispatcher n'est toujours pas déployé, et surtout
il ne peut toujours pas être réveillé.** C'est le blocage n°1, et il est
structurel (§2).

---

## 1. Diagnostic en une page

Aurora a **64 tables live**, **19 packages**, **3 apps**, **28 migrations**,
**124 politiques RLS** — et un **gate vert**. Ce n'est pas un projet vide.

Mais trois chaînes sont **coupées**, et elles bloquent **6 familles sur 11** :

1. **La chaîne des jobs** — le dispatcher n'a jamais tourné. 34 jobs
   `pending` depuis le **2026-10-08** (16 jours), `job_logs` = **0 ligne**.
2. **La chaîne de déploiement** — le job CI `deploy` est `if: false` depuis
   avant l'écriture de 3 EF. La base et le dépôt ont divergé sans que personne
   ne le voie (3 fonctions live-only, 1 migration non tracée).
3. **La chaîne de réveil** — aucun mécanisme ne peut appeler le dispatcher
   (§2.3). Même déployé, il ne tournerait jamais.

Tout le reste — productivité, learning, knowledge, progress, discovery, agent,
canvas, design system — est `IMPLEMENTED` ou `PARTIALLY IMPLEMENTED` et
**réutilisable tel quel**.

---

## 2. La chaîne de blocage (T1), démontée pièce par pièce

### 2.1 Le dispatcher démarre maintenant — mais ne route que la moitié

`buildLearningHandlers()` (`fn-job-dispatcher/index.ts:236`) construit bien les
2 handlers Learning, avec de **vrais** ports REST (`fetch` vers
`${SUPABASE_URL}/rest/v1/...`), pas des no-op. Vérifié :

```
packages/learning/src/jobs.ts:134  buildFsrsTickHandler    jobKind 'fsrs-tick'
packages/learning/src/jobs.ts:187  buildCourseImportHandler jobKind 'course_import'
```

**Mais `skill_recompute` (17 des 34 jobs) n'a aucun handler enregistré :**

```
packages/progress/src/jobs.ts:114  export const PROGRESS_JOB_HANDLERS: readonly RegisteredHandler[] = [];
```

Or `buildSkillRecomputeHandler` **existe** (ligne 47) et est **testé**
(`progress.test.ts:265`). Il n'est simplement **jamais appelé** — il manque la
fabrique qui injecte ses `RecomputeContext` (comme `buildLearningHandlers` le
fait pour Learning). Le dispatcher le `skip` silencieusement
(`index.ts:632`, `handler === null → skipped += 1`), donc les jobs restent
`pending` pour toujours.

### 2.2 Le payload du cron est incompatible avec le handler — **CORRIGÉ**

Même une fois le handler câblé, il ne consommait pas les jobs du cron. Le
cron `aurora_skill_recompute` insère `payload = '{}'::jsonb` (vérifié dans
`cron.job`), et le handler exigeait un `skillId` non vide :

```
packages/progress/src/jobs.ts:57  if (typeof skillId !== 'string' || skillId === '')
packages/progress/src/jobs.ts:58    return { ok: false, error: 'progress/missing_skill_id' }
```

Les 17 jobs `skill_recompute` seraient passés `pending` → `failed` avec
`missing_skill_id`. **C'était un défaut de conception, et l'arbitrage est
revenu au handler** : 0014 documente l'intention du kind comme « Re-derives
skill_states from evidence » (un balayage), et le cron n'a structurellement
aucun moyen de savoir quels skills sont dus — il ne lit aucune table de skills,
il insère une ligne par utilisateur avec `'{}'::jsonb`.

Le handler balaie donc tous les skills de l'utilisateur (`listSkillIds` lit
`progress_evidences`, la connaissance réelle), et `payload.skillId` reste
accepté comme filtre pour la voie événementielle (un insert d'evidence connaît
son skill). Un payload vide n'est plus une erreur.

**Troisième défaut trouvé en corrigeant celui-ci** : le handler **ne persistait
rien**. Il calculait un `SkillState`, le renvoyait comme résultat de job, et
n'écrivait jamais `skill_states` — un run « réussi » ne changeait donc rien.
Le port `saveSkillState` a été ajouté (AD-7 : Progress est le seul écrivain).

### 2.3 Le réveil est structurellement impossible — **CORRIGÉ (migration 0028)**

```
cron.job #3  schedule '*/5 * * * *'
             command  SELECT pg_notify('aurora_job_dispatcher', 'cron-sweep')
```

Un Edge Function HTTP **ne peut pas** tenir un `LISTEN` : `pg_notify` n'a aucun
consommateur possible. Ce cron a tourné 241+ fois, « succeeded » à chaque fois,
et n'a jamais réveillé personne. Le `pg_notify` du trigger
`trg_job_queue_notify` (0010) avait le même consommateur absent.

**Résolu par `0028_job_dispatch_wakeup.sql`** — `pg_net` installé (0.20.4), le
cron 3 remplacé par un `net.http_post` réel vers `fn-job-dispatcher`. Le choix
`pg_net` vs GitHub Actions est **tranché** : `pg_net` est dans la base, ne
dépend d'aucun secret CI, et la voie était déjà ouverte (extension disponible).

**Le réveil est prouvé fonctionnel, live** (`select public.wake_job_dispatcher()`
→ `net._http_response.id = 1` → **HTTP 404** `Requested function was not
found`). L'appel HTTP part, atteint la plateforme, et la plateforme elle-même
répond que la fonction n'existe pas. C'est la démonstration la plus directe que
le réveil marche *et* que le blocage restant est bien le déploiement (§2.4).

**Sécurité appairée** : `fn-job-dispatcher` n'avait **aucune** garde d'auth —
n'importe quel appelant atteignant l'URL pouvait déclencher un balayage sur
*tous* les utilisateurs (service_role). Ajouter un réveil non authentifié aurait
transformé un trou latent en trou actif. Le dispatcher est désormais
**fail-closed** : header `x-aurora-internal` (la convention déjà utilisée par
`fn-canvas` et `_shared/fn-agent-bootstrap.ts:409`), comparaison en temps
constant, 401 sinon — y compris quand `INTERNAL_FN_SECRET` est absent
(« autoriser parce que non configuré » est exactement ce qui vide une garde de
son sens).

### 2.4 Le déploiement ne part pas — **LE blocage restant, prouvé**

`.github/workflows/release.yml:164` — le job `deploy` est `if: false` (gate
OQ-03). Les 5 EF live ont été déployées **à la main** entre le 2026-09-30 et le
2026-10-07. Les 3 manquantes (`fn-canvas` 2026-10-06, `fn-integrations`
2026-10-03, `fn-job-dispatcher` 2026-09-23) sont postérieures ou jamais
redéployées.

**Preuve la plus directe** (2026-10-24) : le réveil `pg_net` appelle
`/functions/v1/fn-job-dispatcher` et reçoit
`{"code":"NOT_FOUND","message":"Requested function was not found"}` (HTTP 404).
La fonction n'est pas déployée. Tant qu'elle ne l'est pas, **les 34 jobs
restent `pending`**, quel que soit le reste.

**Correction d'une erreur de ma part :** j'ai d'abord écrit que ces 3 EF ne
pouvaient pas se déployer parce qu'elles importent `packages/*`. C'est faux en
partie — `fn-canvas` importe **0** package workspace et manque quand même, et le
CLI moderne documente que les fichiers monorepo hors workdir *peuvent* être
déployés (`apps/cli/src/shared/functions/deploy.ts:2244`). La cause première est
que **le déploiement s'est arrêté**. Le bundling reste la bonne durcissement,
mais ce n'est pas le diagnostic.

---

## 3. Ce qui est fait et vérifié (cette session)

| Lot | Livrable | Preuve |
|---|---|---|
| T1a | Dispatcher démarre (2 imports morts retirés) | `check-ef-imports` OK |
| T1a | **Bug FSRS réel corrigé** : intervalle négatif → 1 min, la répétition espacée était inerte | formule canonique + `FSRS_DECAY`, test non-régression |
| T1a | `packages/learning/src/jobs.ts` (2 handlers) + tests | `learning` 31/31 |
| T1b | `scripts/build-ef.mjs` — 8/8 EF bundlées, dispatcher 1329→202 KB | `check-ef-bundles` OK |
| T1b | `scripts/check-ef-bundles.mjs` + câblage CI | détecte 3 défauts, accepte 2 cas sains |
| T1b | `config.toml` : slugs corrigés + `entrypoint` | 7 sections ↔ 7 dossiers |
| T1b | `release.yml` : bundle avant deploy | `if: false` conservé (OQ-03) |
| T1c | **`skill_recompute` câblé** : `buildProgressHandlers()` + balayage + persistance | `progress` 20/20, 17 jobs routables |
| T1c | **Réveil réel** : `0028` — `pg_net` installé, cron `pg_notify` → `net.http_post` | live : `net._http_response` id 1 |
| T1c | **Garde d'auth fail-closed** du dispatcher (`x-aurora-internal`, 401) | `isAuthorized()` + temps constant |
| T1c | **Garde-fou de routage** : tout `JobKind` a un handler (ou un motif) | `tests/jobs/routing-coverage.test.ts`, 5/5, contrôles négatifs |

**Gate complet :** TYPECHECK 0 · LINT 0 · TEST 0 (676 node) · BUILD 0 ·
EF-IMPORTS 0 · EF-BUNDLES 0 · ROUTING 0 · BOUNDARIES 0 · RLS-STATIC 0 ·
VIEW-JOINS 0 · SPINE 0.

---

## 4. Nouveaux défauts trouvés cette session

| # | Défaut | Statut |
|---|---|---|
| N1 | `PROGRESS_JOB_HANDLERS` vide alors que `buildSkillRecomputeHandler` existe et est testé | **CORRIGÉ** (4eae07c) |
| N2 | Le cron `skill_recompute` envoie `payload={}`, le handler exige `skillId` | **CORRIGÉ** (4eae07c) — balayage |
| N3 | `pg_net` non installé ; le cron fait `pg_notify` sans consommateur possible | **CORRIGÉ** (0028) — prouvé live |
| N4 | `fn-canvas` absente alors qu'elle n'importe aucun package | **OUVERT** — le déploiement, pas le bundling |
| N5 | Le handler `skill_recompute` ne persistait rien (résultat jeté) | **CORRIGÉ** (4eae07c) — port `saveSkillState` |
| N6 | `fn-job-dispatcher` n'avait **aucune** garde d'auth | **CORRIGÉ** (0028) — fail-closed |
| N7 | Le dispatcher n'est pas déployé (404 prouvé) | **OUVERT — le seul blocage restant** |
| N8 | **`config.toml` ne déclare `verify_jwt` pour AUCUNE EF** → un redéploiement via le CLI applique le défaut `true` et casse silencieusement toutes les EF internes (le réveil serait rejeté par la plateforme *avant* d'atteindre la garde) | **CORRIGÉ** — les 7 EF déclarées explicitement, garde-fou de test |
| N9 | `fn-dev-auth` (porte dérobée dev : `list-users`, reset mot de passe, `CORS *`, `verify_jwt=false`) est **toujours déployée live** alors que son propre en-tête dit « SUPPRIMER AVANT v1.0 » | **OUVERT** — à supprimer avant le tag |
| N10 | 3 fonctions live-only, `SECURITY DEFINER` exécutables par `anon` | reset base = perte ; surface d'attaque | advisors (WARN ×3) |
| N11 | Protection mots de passe compromis désactivée | sécurité auth | advisors (WARN) |
| N12 | `vector` dans `public` ; 2 fonctions `search_path` mutable ; `keep_alive` RLS sans politique | hygiène | advisors (WARN/INFO) |

N1–N3, N5, N6, N8 sont corrigés et vérifiés. N4 et N7 sont le **même** blocage —
le déploiement des EF — et c'est le seul qui empêche les 34 jobs de drainer.
N9–N12 sont de l'hygiène à traiter en tranche 4.

---

## 5. Le plan — 6 tranches, dans cet ordre

> Principe : **une tranche se termine** (gate vert + livrable écrit + poussé)
> avant d'ouvrir la suivante. Aucune exception.

### Tranche 1 — Rendre la chaîne de jobs réelle *(T1, le blocage n°1)*

| Lot | Contenu | Statut |
|---|---|---|
| 1.1 | Câbler `skill_recompute` : `buildProgressHandlers()` (miroir de `buildLearningHandlers`) + table non vide | **FAIT** (4eae07c) |
| 1.2 | Trancher N2 : balayage côté handler (`listSkillIds`) + persistance (`saveSkillState`) | **FAIT** (4eae07c) |
| 1.3 | Trancher N3 et implémenter le réveil (`pg_net` + `net.http_post`) + garde d'auth fail-closed | **FAIT** (0028), prouvé live |
| 1.4 | Déployer les 8 EF (bundle d'abord) | **DÉBLOQUÉ CÔTÉ CODE** (d869c9f) — reste le gate OQ-03 |
| 1.4b | **Le job `deploy` ne déployait RIEN** : 4 `echo`, `link` sur une URL (faux), CLI jamais installé → le « flip `if: false` » aurait produit un job VERT et 5 EF inchangées (même classe de no-op silencieux que le cron `pg_notify`) | **CORRIGÉ** (d869c9f) + garde-fou testé (78e3098) |
| 1.5 | Purger/requeue les jobs morts et **prouver** le traitement | **BLOQUÉ par 1.4** |

**Porte T1 :** un job produit par cron est consommé de bout en bout, et
`job_logs` n'est plus vide. **Débloque :** B.1, B.3, E.1, F, H, I.4, K.

**État au 2026-10-24 :** 1.1–1.3 et 1.4b sont faits, testés et vérifiés live.
La porte T1 reste **fermée** sur un unique point, le déploiement (1.4), qui est
une décision d'opérateur (OQ-03) et non un travail de code. Le réveil est
prouvé fonctionnel : il reçoit un 404 qui *nomme* le blocage.

**Le blocage 1.4 est désormais un seul flag.** Avant d869c9f, lever le gate
n'aurait rien déployé ; désormais le job fait `build-ef.mjs` → `link
--project-ref` → les 7 `functions deploy` → `functions list` (assertion
d'observabilité), avec un pré-vol qui **échoue** si `INTERNAL_FN_SECRET` n'est
pas posé — sans lui, la garde fail-closed de 0028 renverrait 401 pour toujours.

**Ce qui reste à faire, dans l'ordre :**
1. poser `INTERNAL_FN_SECRET` (`supabase secrets set`) **et** le miroir vault
   de 0028 avec la **même** valeur ;
2. poser les secrets du registry (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_URL_DEV`,
   `SUPABASE_PROJECT_REF` optionnel) ;
3. lever `if: false` (ligne ~164) — la ratification OQ-03 ;
4. lancer le workflow (`workflow_dispatch` désormais possible **sans** couper
   de tag) ;
5. vérifier `job_logs` non vide et la file vidée.

**La file croît, elle ne stagne pas :** 34 lignes le 2026-10-24, **38** le
lendemain (les crons quotidiens `aurora_fsrs_tick` 02:00 et
`aurora_skill_recompute` 03:00 insèrent 1 job/utilisateur/jour, sans borne).
Le coût du blocage augmente donc chaque jour. Toutes les tables de données
lues par les handlers sont **vides** (`flashcards` 0, `progress_evidences` 0,
`skill_states` 0) : activer le correctif est un **no-op vérifié et sans
risque** pour les 4 utilisateurs réels.

### Tranche 2 — Aligner base ↔ dépôt *(la cause racine de la dérive)*

| Lot | Contenu |
|---|---|
| 2.1 | Versionner les 3 fonctions live-only (N5) dans une migration |
| 2.2 | Trancher le sort de `auto_confirm_*` : intentionnel (décision owner 10-07) mais à révoquer ou passer en `INVOKER` |
| 2.3 | Migration 28 non tracée → réconcilier `schema_migrations` |
| 2.4 | Réactiver le job `deploy` (OQ-03) ou le remplacer par un déploiement vérifié |

**Porte T2 :** `git` et la base racontent la même histoire ; un reset serait
rejouable.

### Tranche 3 — Les propriétaires de tables manquants

| Lot | Contenu | Débloque |
|---|---|---|
| 3.1 | `packages/knowledge` — propriétaire des 10 tables existantes, **0 table neuve** | C.1, C.2 |
| 3.2 | `packages/artifact` — propriétaire des 2 tables existantes | H, puis L |

**Porte T3 :** chaque table a un module propriétaire ; `OWNER_MODULE_BY_ENTITY`
(`packages/data/src/commands.ts:180`) ne nomme plus de module absent.

### Tranche 4 — Hygiène et ponctuelles

N6 (mots de passe compromis) · N7 (`vector` schema, `search_path`,
`keep_alive`) · A.7 `name`/`title` (AD-15) · A.9 bilan périodique · C.3 OCR ·
H prévisualisation · B.6 valider Mirror · round-trip PowerSync (`BLOCKED` relay).

### Tranche 5 — Design Space Pro (L, 11 capacités)

Dépend de T3.2 (Artifact) et du Canvas. Ordre §10.4 : brief → Brand DNA →
logo → charte → affiche → éditeur → validateur → documents → export.
**0 package, 0 table, 0 route aujourd'hui** — c'est un chantier neuf, à ne pas
sous-estimer.

### Tranche 6 — Plateformes

`apps/web-app` (React pur, `OQ-1` a écarté Ionic du web) → Electron → Capacitor
(`apps/mobile` conservé, cible Phase 4). Décision D2 non tranchée (§7).

---

## 6. Ce qu'on ne fait pas

| Non-objectif | Motif |
|---|---|
| Un chat tiers (LibreChat / open-webui / LobeHub) | L'histoire « intégration LibreChat » est **réfutée** (branche 404, `docs/integration/` inexistant, 15 commits cités inexistants). LobeHub = référence de conception seulement. |
| Un nouveau design system | `packages/ui` conservé, 272 briques inventoriées |
| Réécrire les 26 pages mobile | Le web les **réutilise** via les contrats |
| Réinitialiser la base live | 4 utilisateurs réels + 3 fonctions non versionnées ; irrattrapable |
| Câbler `@assistant-ui/react` en v1 | Réserve de briques dormante (D-018.2) |

---

## 7. Décisions restantes

| # | Question | Statut |
|---|---|---|
| **T1-N3** | Le réveil des jobs ? | **TRANCHÉ (0028)** : (a) `pg_net` + `net.http_post` depuis `pg_cron`. Installé et prouvé live (404 = la fonction n'existe pas, pas le réveil). |
| **T1-N2** | `skill_recompute` ? | **TRANCHÉ** : (b) le handler balaie tous les skills de l'utilisateur (`listSkillIds`), avec `payload.skillId` conservé comme filtre optionnel pour la voie événementielle. 0014 documente l'intention comme « Re-derives skill_states from evidence » → c'est un balayage, et le cron n'a aucun moyen de connaître les skills dus. |
| **T2-OQ03** | Réactiver le job `deploy` ? | **OUVERT — le seul blocage restant.** Le réveil reçoit un 404 prouvé. (a) oui, avec les secrets · (b) déploiement manuel vérifié documenté |
| **D2** | Coquille web ? | (a) créer `apps/web-app` maintenant · (b) rendre `apps/mobile` responsive d'abord |

**Recommandation :** T1-N3 (a) — fait · T1-N2 (b) — fait, avec la nuance que
le handler ne « devine » rien : il lit `progress_evidences` pour savoir quels
skills existent, ce que le cron ne peut pas faire · T2-OQ03 (a) · D2 (a).

**Note sur T1-N2 :** la recommandation initiale était (a) « le cron sait quels
skills sont dus ». C'est inexact — le cron (0014) insère une ligne par
utilisateur avec `'{}'::jsonb`, il ne consulte aucune table de skills. La
connaissance vit dans `progress_evidences`, que seul le handler peut lire sans
dupliquer la logique du module dans le SQL du cron. (b) est donc le bon choix,
et le payload vide n'est plus une erreur.

---

## 8. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| FS sandbox éphémère | Critique (déjà arrivé) | Pousser après **chaque** lot |
| Supabase free tier auto-pause (7 j) | Élevé | Réveiller avant chaque lot live |
| Design Space sous-estimé | Élevé | POC outils avant engagement (item 9) |
| Dérive reprise (base ↔ dépôt) | Élevé | T2 est dédié ; `check-ef-imports` + `rls-live-check.sh` en garde-fous |
| `main` reste en arrière (39 commits) | Moyen | Ouvrir une PR (seul déclencheur de `ci-gate`) |
