# Spec de module MVP — `agent.kernel`

> **Gabarit** : §M1–§M6 (`docs/plans/2026-10-27-redefinition-priorites-et-specs-mvp.md` §3.3).
> **Nature** : constat **vérifié**. Chaque ligne de §M2/§M6 porte un fichier ou une
> commande. Aucune ligne n'est déduite d'un README (AD-13, `AI_RULES.md` §1).
> **Base mesurée** : `510b47e`, branche `rebaseline/2026-10-23`.
> **Statut du module** : `IMPLEMENTED` (`status-register.md` §1/§5).
> **Priorité** : **V0** — module du chemin vertical (plan §3.4, §5).

---

## §M1 Capacités retenues en v1

| Sous-capacité | En v1 | Preuve |
|---|---|---|
| Boucle complète `Intent → Context → Plan → Retrieve → Tools → Verify → Action → Result → Memory` | ✅ | `AgentKernel.run()` — `packages/agent/src/kernel.ts:168` ; boucle gelée AD-12 |
| Classification d'intention | ✅ | `classifyIntent` — `intent.ts` |
| Routage de modèle (Agnes primaire) | ✅ | `AgnesPrimaryRouter` — `kernel.ts:403` |
| Vérification d'autorisation | ✅ | `isAllowed` — `permission.ts` |
| Confirmation des actions importantes/irréversibles | ✅ | `ConfirmationEngine` — `confirmation.ts` |
| Reprise après interruption (AD-8) | ✅ | `resumeFrom` — `kernel.ts:86` ; plan relu **serveur** |
| Streaming d'événements | ✅ | `KernelEvent` — `kernel.ts:141` (6 types) |
| **Hors v1** : `call.policy` (coach proactif) | ❌ | `NOT_AGENT_ENABLED` — `capability.ts:290` |

**Les 6 types d'événement** (`kernel.ts:141-147`) : `stage` · `confirmation` ·
`tool` · `text` · `done` · `failed`. C'est le **vocabulaire fermé** que tout
adaptateur de transport doit mapper — il n'y en a pas d'autre.

**Le registre de capacités** : 70 entrées enregistrées
(`grep -cE "^\s+id: '" capability.ts`), dont les 8 outils noyau, les capacités
d'objectifs, les outils document et canvas.

---

## §M2 Contrat de données

### Tables serveur (le kernel écrit peu, par conception)

Le kernel **n'écrit jamais** une table de module (AD-7). Ses écritures
propres (`kernel.ts:13-15`) :

| Table | Propriétaire | Migration |
|---|---|---|
| `agent_runs` | kernel | `0008_agent_integrations.sql:8` |
| `job_queue` / `job_logs` | Job system | `0010_jobs.sql:9,36` |
| `expert_skills` | Memory | `0020` |

### `agent_runs` — la seule table que le device lit

`0008_agent_integrations.sql:8` (+ `pending_plan` en `0024`).

| Colonne | Type | Note |
|---|---|---|
| `id` | `uuid PK` | **le device interroge par cet id** (F-09) |
| `user_id` | `uuid NOT NULL` | isolation RLS |
| `intent` | `text NOT NULL` | |
| `status` | `text NOT NULL` | |
| `steps_json` | `jsonb NOT NULL` | l'historique des étapes |
| `budget_snapshot` | `jsonb` | |
| `trace_id` | `text` | **porte l'ULID `agentRunId`** — pas la PK uuid (`agent-client.ts:100-102`) |
| `started_at` / `completed_at` | `timestamptz` | |
| `pending_plan` | `jsonb` | ajoutée `0024` — **relue serveur**, jamais fournie par le client |

### RLS — vérifiée

Boucle générique `0008_agent_integrations.sql:92-110` : `ENABLE` + **`FORCE`**
ROW LEVEL SECURITY, policy `agent_runs_user_isolation`
(`user_id = auth.uid()`), policy `service_role` en `SELECT` borné.

### Single-writer (AD-2 / F-03)

Seuls **`fn-agent-run` et l'exécuteur de job** mutent `agent_runs`. Le device
n'écrit jamais (`agent-client.ts:176-177`).

---

## §M3 Chemin agent — l'entrée

### `fn-agent-run` (l'EF)

`supabase/functions/fn-agent-run/index.ts`.

| Aspect | Valeur | Preuve |
|---|---|---|
| Entrée | `{ intent, contextRefs[], taskProfile }` | `index.ts:2,48-50` |
| Sortie | `202 { ok, data: { agentRunId, jobId } }` | `index.ts:3` |
| Identité | `user_id` **depuis l'en-tête d'auth**, jamais le corps | `index.ts:225` |
| Garde de sécurité | un `pendingPlan` fourni par le client → **400 `agent/plan_not_accepted`** | `index.ts:67,215` |
| Idempotence | `kind + hash(payload) + user_id` | `0010_jobs.sql:20` |
| Job produit | `agent_run` | `packages/domain/src/jobs.ts:19` |

> **La garde `pending_plan` est le point de sécurité le plus important de ce
> chemin** : un plan forgé côté client ne doit **jamais** contourner la
> vérification serveur. Le type `KernelRequest.resumeFrom` ne porte qu'un
> `agentRunId` — il n'existe **pas** de champ `pendingPlan` côté client
> (`kernel.ts:74-97`).

### Le handler de job

`packages/agent/src/jobs.ts` — `jobKind: 'agent_run'` (`jobs.ts:30`), idempotent,
relit le plan côté serveur (`jobs.ts:76`).

---

## §M4 Contrat de surface

| Écran | Route | Statut |
|---|---|---|
| `agent-chat` | `/agent` | spec existante, **pas** au cadre v1 (§15–§19 manquants) |

**Dans la coquille web** : l'onglet primaire **« Agent »** (`agent`) —
`apps/web-app/src/lib/navigation.ts`.

**Le device ne voit que `AgentRunState`** (F-09 / AD-3) :
`packages/domain/src/entities-agent.ts:112` — `stage` (11 valeurs), `status`
(5 valeurs : `running` · `awaiting-confirmation` · `succeeded` · `failed` ·
`cancelled`), `confirmationMessage`, `jobId`.

> **Constat majeur (documenté, non corrigé)** : le client lit `agent_runs` via
> **PostgREST** (`supabase.from('agent_runs')` — `agent-client.ts:313,327`), pas
> via PowerSync : `agent_runs` est **absent** de `powersync/sync-config.yaml`,
> de `powersync-schema.ts` et de `sqlite-schema.ts` (vérifié par `grep`).
>
> **Conséquence** : le commentaire « AD-7 local-first mirror »
> (`agent-client.ts:171`) décrit une intention, pas le comportement. Lire l'état
> d'un run **exige le réseau**. C'est cohérent avec AD-3/F-09 (l'exécution est
> serveur), mais la conséquence offline doit être écrite, pas sous-entendue —
> voir §M5. Décision AD-15 (propriétaire) : soit mirorer `agent_runs`, soit
> corriger le commentaire et assumer l'exigence réseau.

---

## §M5 Offline

| Opération | Sans réseau | Preuve |
|---|---|---|
| Lancer une exécution agent | ❌ **réseau requis** | `fn-agent-run` (EF) + job `agent_run` |
| Lire l'état d'un run | ❌ **réseau requis** | `agent_runs` non synchronisé (`agent-client.ts:313,327`) |
| Lire l'historique des runs | ❌ réseau requis | `list()` — `agent-client.ts:313` |
| Lire/écrire les **données** touchées par l'agent (tâches…) | ✅ | PowerSync (`productivity.tasks` §M5) |

**Classe offline** : `online-required` pour l'exécution ; `hybrid` pour les
données qu'elle produit.

> **La distinction à ne pas effacer** : le résultat d'un agent qui crée une tâche
> devient hors-ligne **parce que la tâche** est synchronisée — pas parce que
> l'agent l'est. Deux chemins distincts.

---

## §M6 Preuve

### Commandes

```sh
pnpm -F @aurora/agent test               # 17 suites
pnpm -r typecheck
sh scripts/check-rls.sh                  # RLS statique (0008 inclus)
sh scripts/check-ef-imports.mjs          # les EF importent-elles des symboles existants ?
sh scripts/check-ef-bundles.mjs          # les EF se bundlent-elles ?
node --experimental-strip-types scripts/check-view-joins.ts
```

### Couverture actuelle (mesurée)

`packages/agent/test/` — **17 suites**. `kernel.test.ts` = **21 tests**, dont :

| Test | Ligne | Ce qu'il prouve |
|---|---|---|
| `Intent: organize_day decomposes into the 4 canonical parts` | 63 | la décomposition |
| `Router: Agnes is PRIMARY (alwaysFirst) when healthy` | 101 | le routage primaire |
| `Router: falls back to workers-ai when Agnes is in 429 cooldown` | 108 | le repli |
| `Permission: destructive without confirmation is blocked` | 123 | AD-12 / §S5 |
| `Confirmation: timeout = safe-cancel (never auto-approve)` | 135 | pas d'auto-approbation |
| `Recovery: budget exhaustion = clean stop (no fallback)` | 186 | arrêt propre |
| `Confirmations: a write step with no decision → nothing executes` | 298 | le point de sécurité |
| `Confirmations: a confirmed write step executes` | 307 | le chemin nominal |

`run-state.test.ts` = **9 tests** (machine d'état).

### Critères de « fait » pour L5

1. une demande à l'agent atteint `fn-agent-run` sous le **JWT de l'utilisateur** ;
2. l'état revient et est **relu** par la coquille (chemin complet) ;
3. une action importante **s'arrête** en attente de confirmation ;
4. une action confirmée **s'exécute** ;
5. une panne réseau produit l'**état honnête** (pas de données feintes).

### Seuils

Référence : `docs/testing/matrix.md`. La garde `check-ef-imports.mjs` est née
d'un défaut réel (`fn-job-dispatcher` importait 2 symboles inexistants —
`implementation-index.md` §1 F2) : elle doit rester dans le gate.

---

## §M7 Questions ouvertes

| # | Question | État |
|---|---|---|
| **AK-1** | Mirorer `agent_runs` pour la lecture hors-ligne, ou assumer l'exigence réseau ? | **ouverte** — décision AD-15, avec un coût et une conséquence offline explicites |
| **AK-2** | Aligner le nom `task.create` (matrice) vs `task.update` (registre) ? | **ouverte** — partagée avec `productivity.tasks` MT-1 |
| **AK-3** | Le streaming `KernelEvent` (6 types) est-il exposé au device, ou seulement l'état pollé ? | **à vérifier en L5** — `agent-client.ts` ne montre que le poll, pas de SSE (F-09) |
