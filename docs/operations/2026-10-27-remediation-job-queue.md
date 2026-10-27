# Runbook — Remédiation `job_queue` (40 jobs bloqués)

**Date** : 2026-10-27 · **Branche** : `rebaseline/2026-10-23` · **Owner** : Foundation (AD-16d)
**Périmètre** : projet Supabase Aurora DEV (`opagfyspdbhxthlxvlrk`) — cf. `supabase/manual-secrets-checklist.md:8`.
**Statut** : audit + runbook. **Aucun déploiement, aucun secret n'est modifié par ce document.**

---

## 0. Résumé exécutable

Un opérateur peut reproduire l'audit et appliquer le fix sans lire le reste :

```sh
# A. AUDIT (lecture seule) — le dépôt contient 8 EF, le projet en héberge 5.
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_PROJECT_REF=opagfyspdbhxthlxvlrk \
  sh scripts/check-ef-deployed.sh        # exit 1 + liste des 3 EF manquantes

# B. FIX (opérateur — 3 étapes, §4) : secret vault, deploy ×3, vérif post-fix.
# C. PREUVE que la file draine (§4.4) : 40 pending -> 0 pending / 40 done.
```

---

## 1. Symptôme

`public.job_queue` contient **40 jobs bloqués en `pending`** depuis le **2026-10-08**, avec
`attempts = 0` (jamais tentés) :

| `kind` | nombre | producteur | état |
|---|---|---|---|
| `fsrs-tick` | 20 | cron `aurora_fsrs_tick` (`0 2 * * *`) | `pending`, `attempts = 0` |
| `skill_recompute` | 20 | cron `aurora_skill_recompute` (`0 3 * * *`) | `pending`, `attempts = 0` |
| **total** | **40** | | **bloqués** |

> Ces chiffres proviennent de la mesure live fournie dans le contexte de la mission
> (2026-10-08, 40 jobs) ; ils sont cohérents avec l'état live du 2026-10-24 documenté
> dans `scripts/build-ef.mjs:12` (« 5 EFs ACTIVE, 3 missing ») et
> `supabase/migrations/0028_job_dispatch_wakeup.sql:179-186`. La **re-mesure** de ces
> 40 lignes par l'opérateur est donnée en §4.0 et §4.4 — voir §7 « à confirmer ».

`attempts = 0` est le symptôme discriminant : le dispatcher **n'a jamais réclamé** ces jobs
(le `claim` incrémente `attempts`, `fn-job-dispatcher/index.ts:743`). Ce n'est donc **pas**
un échec de worker, c'est un **dispatcher jamais atteint**.

---

## 2. Cause racine (deux défauts indépendants, cumulés)

### 2.1 L'Edge Function `fn-job-dispatcher` n'est pas déployée

Le dépôt contient **8** dossiers d'EF sous `supabase/functions/` (inventaire §3). Le projet
live n'en héberge que **5**. Preuve dans le dépôt lui-même —
`scripts/build-ef.mjs:12-22` :

```
 * Measured on the live project (sflsupabase, 2026-10-24): 5 EFs are ACTIVE
 * and 3 are missing entirely.
 *   ACTIVE   fn-agent-run … fn-dev-auth
 *   MISSING  fn-canvas           workspace imports: 0
 *   MISSING  fn-integrations     workspace imports: 2
 *   MISSING  fn-job-dispatcher   workspace imports: 10
```

Le seul réveil HTTP de la file est le cron `aurora_event_dispatch` (`*/5 * * * *`, jobid 10)
qui appelle `public.wake_job_dispatcher()` (migration `0028`), laquelle fait un POST `pg_net`
vers `/functions/v1/fn-job-dispatcher` (`0028_job_dispatch_wakeup.sql:119-129`). La fonction
n'existant pas, `net._http_response` renvoie **404 « Requested function was not found »**.

### 2.2 Le secret `INTERNAL_FN_SECRET` est absent du vault

`wake_job_dispatcher()` lit `INTERNAL_FN_SECRET` dans `vault.decrypted_secrets`
(`0028_job_dispatch_wakeup.sql:95-103`) et **`RAISE WARNING` + `RETURN NULL`** si le secret
manque. Le vault ne contient aujourd'hui que `SUPABASE_PROJECT_URL` (créé par la
vérification live du 2026-10-24, `0028:186`) — **pas** `INTERNAL_FN_SECRET` (`0028:183-185`).
Donc même si la fonction était déployée, le réveil **n'enverrait rien**.

Le déployeur est lui-même garde-fou : le step `Deploy Edge Functions` refuse de déployer si
`INTERNAL_FN_SECRET` n'est pas posé sur le projet (`release.yml:246-251`), car le dispatcher
est **fail-closed 401** sans lui (`fn-job-dispatcher/index.ts:804-807`).

### 2.3 Pourquoi la dérive n'a pas été vue par le gate

- `supabase/functions/**` n'est dans **aucun** `tsconfig` → `pnpm -r typecheck` ne le lit pas
  (commenté dans `scripts/check-ef-imports.mjs:5-7` et `tests/jobs/routing-coverage.test.ts:14-15`).
- `check-ef-imports.mjs` prouve que les imports **résolvent** (code compilable).
- `check-ef-bundles.mjs` prouve que le **bundle** est self-contained (déployable).
- **Aucun** gate ne compare au **projet réellement déployé** → `scripts/check-ef-deployed.sh`
  (ce lot) ferme ce trou.

### 2.4 Facteur aggravant (historique, corrigé)

`fn-job-dispatcher` importait deux symboles inexistants
(`PROGRESS_FSRS_TICK_HANDLER`, `PROGRESS_COURSE_IMPORT_HANDLER`) — il **ne pouvait pas booter**
même déployé. Corrigé : les handlers viennent désormais de
`packages/learning/src/jobs.ts` (`buildFsrsTickHandler`, `buildCourseImportHandler`,
`fn-job-dispatcher/index.ts:30-33`). Détail : `scripts/check-ef-imports.mjs:8-11`.

---

## 3. Inventaire vérifiable des Edge Functions

### 3.1 Dépôt (`supabase/functions/`)

Commande : `for d in supabase/functions/fn-*/; do echo "$(basename $d) $(test -f $d/index.ts && echo has-entrypoint)"; done`

| EF (dépôt) | point d'entrée | imports `_shared` / workspace | rôle (lu dans le code) |
|---|---|---|---|
| `fn-agent-run` | `fn-agent-run/index.ts` | `_shared/envelope.ts` | enfile un job `agent_run`, crée la ligne `agent_runs` (`status='running'`), renvoie `{agentRunId, jobId}` — `index.ts:1-40` |
| `fn-canvas` | `fn-canvas/index.ts` | `_shared/envelope.ts` | single-writer AD-7 des tables `canvas_*` ; verbes `create`/`lock`/`rename`/`read`/`write`/`comment` ; dual-path (JWT device **ou** `x-aurora-internal`) — `index.ts:1-81` |
| `fn-dev-auth` | `fn-dev-auth/index.ts` | `https://deno.land/std…` (aucun `_shared`) | **DEV-ONLY** (« SUPPRIMER AVANT v1.0 ») : list-users / set-password / test-signin via admin API — `index.ts:1-17` |
| `fn-import-course` | `fn-import-course/index.ts` | `_shared/envelope.ts` | stub : `{courseId, fileRefs[]}` → 202 `{jobId}` — `index.ts:1-6` |
| `fn-integrations` | `fn-integrations/index.ts` | `_shared/envelope.ts` + `packages/integrations` (2) | seam Composio + verb `materialize_due_automations` (M-42) — `index.ts:40-59` |
| `fn-job-dispatcher` | `fn-job-dispatcher/index.ts` | `_shared/envelope.ts`, `_shared/fn-agent-bootstrap.ts` + **11** imports workspace | **le seul dispatcher** (01 §5.2) : `dispatchDue → claim → route(kind,module) → reportResult` ; guard `x-aurora-internal` — `index.ts:18-75`, `:786-807` |
| `fn-notifications` | `fn-notifications/index.ts` | `_shared/envelope.ts` | trigger event → OneSignal REST v2 — `index.ts:19` |
| `fn-skills` | `fn-skills/index.ts` | `_shared/envelope.ts` | seam Skills Marketplace (verbes `list_catalog`/`activate_skill`/…) — `index.ts:30` |

Fichiers partagés (pas des EF) : `_shared/envelope.ts`, `_shared/fn-agent-bootstrap.ts`.

Comptage des imports workspace (métrique de `scripts/build-ef.mjs:149`, regex `from "../../../packages/`) :

```sh
for f in fn-agent-run fn-canvas fn-dev-auth fn-import-course fn-integrations fn-job-dispatcher fn-notifications fn-skills; do
  printf '%s: %s\n' "$f" "$(grep -oE 'from[[:space:]]+"\.\./\.\./\.\./packages/' supabase/functions/$f/index.ts | wc -l)";
done
# fn-job-dispatcher: 11   fn-integrations: 2   (les 6 autres : 0)
```

### 3.2 Déployées sur le projet (état de référence)

**5** : `fn-agent-run`, `fn-import-course`, `fn-notifications`, `fn-skills`, `fn-dev-auth`.

### 3.3 Écart → EF manquantes

| EF manquante | rôle | conséquence opérationnelle |
|---|---|---|
| **`fn-job-dispatcher`** | le seul dispatcher (01 §5.2) | **cause directe** : aucun job ne draine → 40 `pending` |
| `fn-canvas` | single-writer canvas (AD-7) | l'agent ne peut pas écrire/lire le canvas ; 404 sur les commandes `canvas.*` |
| `fn-integrations` | Composio + `materialize_due_automations` | veilles planifiées jamais matérialisées ; connexions tierces indisponibles |

---

## 4. Runbook opérateur (3 étapes requises)

> Pré-requis : CLI Supabase (`npx supabase@latest`), `SUPABASE_ACCESS_TOKEN`, le project ref
> `opagfyspdbhxthlxvlrk`. **Aucune valeur de secret ne doit être écrite dans le dépôt (AD-3).**

### 4.0 Re-mesurer le symptôme (lecture seule)

```sql
-- 40 pending, attempts = 0
select kind, status, count(*), min(created_at) as oldest
  from public.job_queue
 where status = 'pending'
 group by kind, status
 order by 3 desc;

-- le réveil échoue bien en 404 ?
select id, status_code, content
  from net._http_response
 order by created desc
 limit 5;
```

### 4.1 Étape 1 — poser le secret `INTERNAL_FN_SECRET` (vault **et** project secrets)

Le **même** secret doit exister des deux côtés : côté projet (env des EF, `Deno.env.get`)
**et** côté vault (lu par `wake_job_dispatcher()`). `0028:157-160` :

```sql
select vault.create_secret('<valeur>', 'INTERNAL_FN_SECRET');
```

Et côté projet (dashboard → Edge Functions → secrets, ou CLI) :

```sh
supabase secrets set INTERNAL_FN_SECRET="$(openssl rand -hex 32)"
```

> Le vault contient déjà `SUPABASE_PROJECT_URL` (`0028:186`) — **rien à faire** de ce côté.
> Valeur : chaîne aléatoire ~32+ chars (`openssl rand -hex 32`) ; **jamais** dans le dépôt.

### 4.2 Étape 2 — déployer les 3 EF manquantes

`0028:170-171` donne la commande ; elle doit passer par le **bundle** (le bundle inline les
imports workspace, sinon l'upload échoue sur la résolution — `config.toml:45-50`) :

```sh
node scripts/build-ef.mjs
supabase functions deploy fn-canvas
supabase functions deploy fn-integrations
supabase functions deploy fn-job-dispatcher
```

> `config.toml` déclare `entrypoint = "functions/<slug>/dist/index.ts"` et
> `verify_jwt = false` pour ces trois fonctions (`config.toml:53-99`) — indispensable :
> le défaut CLI `verify_jwt=true` ferait rejeter le réveil `pg_cron` (sans JWT utilisateur)
> **avant** que le guard interne ne s'exécute.

### 4.3 Étape 3 — vérifier le déploiement

```sh
SUPABASE_ACCESS_TOKEN=<token> SUPABASE_PROJECT_REF=opagfyspdbhxthlxvlrk \
  sh scripts/check-ef-deployed.sh     # doit sortir exit 0
```

Puis forcer un réveil manuel et vérifier la réponse HTTP :

```sql
select public.wake_job_dispatcher();   -- doit renvoyer un id de requête (plus NULL)
-- puis, quelques secondes après :
select status_code, content from net._http_response order by created desc limit 3;
-- attendu : 200, plus de 404
```

### 4.4 Preuve que les 40 jobs drainent (`pending` → `done`)

```sql
-- Avant : 40 pending. Après réveil, le dispatcher claim + reporte.
select kind, status, count(*)
  from public.job_queue
 group by kind, status
 order by 1, 2;

-- Commande de vérification « 40 pending -> 0 pending » :
select count(*) filter (where status = 'pending') as still_pending,
       count(*) filter (where status = 'done')    as done,
       count(*) filter (where status = 'running') as running,
       count(*) filter (where status = 'failed')  as failed
  from public.job_queue
 where kind in ('fsrs-tick', 'skill_recompute');

-- Traces d'exécution par job :
select job_id, level, message, ts
  from public.job_logs
 where job_id in (select id from public.job_queue where kind in ('fsrs-tick','skill_recompute'))
 order by ts desc
 limit 20;
```

**Attendu** : `still_pending = 0`, `done = 40` (statuts autorisés : `0010_jobs.sql:15`), et des
lignes `job_logs`. Le réveil se répète toutes les 5 min (`0028:144-148`), donc un seul cycle
suffit ; si des jobs restent `pending` avec `attempts > 0`, le problème n'est plus le réveil
mais un handler (voir `tests/jobs/routing-coverage.test.ts`).

---

## 5. Citation de `0028_job_dispatch_wakeup.sql` — APPLICATION STATUS (l.151-177)

Le bloc déclare **trois** étapes opérateur. État de chacune, tel que prouvé par le dépôt :

> **« 1. The internal secret (once per environment) … `select vault.create_secret('<value>', 'INTERNAL_FN_SECRET');` »** (l.157-160)
> **NON FAITE.** `0028:183-185` : le vault « holds no `INTERNAL_FN_SECRET` yet ». Le secret
> n'existe ni dans le vault ni (a fortiori) posé côté projet — c'est la cause 2.2.
>
> **« 2. The project URL (once per environment) … `select vault.create_secret('https://<project-ref>.supabase.co', 'SUPABASE_PROJECT_URL');` »** (l.162-164)
> **FAITE.** `0028:186` : « `SUPABASE_PROJECT_URL` was created in vault as part of this check ».
> Cohérent avec l'énoncé de mission (« seul `SUPABASE_PROJECT_URL` est présent »).
>
> **« 3. `node scripts/build-ef.mjs && supabase functions deploy fn-job-dispatcher` … Currently blocked: the CI deploy job is `if: false` pending OQ-03. »** (l.170-174)
> **NON FAITE.** `release.yml:169` porte toujours `if: false` ; `build-ef.mjs:20-22` liste
> `fn-job-dispatcher` en `MISSING`. C'est la cause 2.1.

Récapitulatif : **1/3 faite** (URL), **2/3 non faites** (secret, deploy). La migration a
aussi appliqué ses effets propres (`0028:179-182` : `pg_net` installé, cron jobid 10 réécrit
en `SELECT public.wake_job_dispatcher();`).

---

## 6. Garde-fous à conserver (ne pas régresser)

- **OQ-03 reste fermée** : ce runbook ne ratifie pas la décision de release. Le job CI
  `deploy` reste `if: false` (`release.yml:169`) ; le déploiement ici est **manuel et
  opérateur**.
- **Ne pas retirer le guard** `isAuthorized` du dispatcher (`fn-job-dispatcher/index.ts:800-807`) :
  sans lui, l'URL de réveil devient un vecteur de DoS / vol de jobs (service_role, tous users).
- **`verify_jwt = false`** sur les 3 fonctions est **requis** (caller = `pg_cron`, sans JWT
  utilisateur) — ne pas « corriger » en `true`.
- **Un seul chemin de réveil** : `wake_job_dispatcher()` (AD-8 : le dispatcher est le seul
  acteur) ; ne rien ajouter qui exécute du travail dans le cron.

---

## 7. Ce qui reste à confirmer par l'opérateur (non prouvable hors ligne)

| Affirmation | Statut | Comment confirmer |
|---|---|---|
| 40 jobs `pending`, `attempts=0`, depuis 2026-10-08 | **fourni par la mission**, à re-mesurer | §4.0 (SQL) |
| `net._http_response` = 404 « Requested function was not found » | **fourni par la mission**, à re-mesurer | §4.0 (SQL) |
| vault sans `INTERNAL_FN_SECRET` | **fourni + corroboré** par `0028:183-185` | `select * from vault.decrypted_secrets;` (masquer la valeur) |
| 5 EF déployées (vs 8 au dépôt) | **corroboré** par `build-ef.mjs:12-22` | §4.3 (`check-ef-deployed.sh`) |
| post-fix : `done = 40` | **à exécuter** | §4.4 (SQL) |
