# Brief de décision D1–D5 (owner) — avec l'état live mesuré

> **Ref** : `docs/plans/2026-10-24-redefinition-priorites.md` §3 ·
> `docs/architecture/status-register.md` · `docs/ci/gate.md` §5.1.
> **Créé** : 2026-10-24. **Objet** : donner au owner, pour chaque décision, **les
> faits mesurés** et une recommandation — **pas** un avis.
> **Nouveauté** : ce brief s'appuie sur la **base live** (MCP Supabase), pas
> seulement sur l'arbre Git. C'est la première fois qu'on compare les deux.

---

## 0. Ce que la base live révèle (et que l'arbre ne disait pas)

| Mesure | Valeur | Source |
|---|---|---|
| Tables `public` | **64** | `list_tables` |
| Tables ≠ migration du dépôt | **0** | requête catalogue |
| Fonctions `public` non-extension | **5** | `pg_proc` + `pg_depend` |
| dont **absentes du dépôt** | **3** | `grep` dépôt → 0 résultat |
| Politiques RLS | **124** | `pg_policies` |
| Vues | **15** | `pg_class relkind='v'` |
| Utilisateurs `auth.users` | **4** | `auth.users` |
| Migrations **tracées** | **27** | `supabase_migrations.schema_migrations` |
| Migrations **dans le dépôt** | **28** | `ls supabase/migrations/` |
| Edge Functions **live** | **5** | `list_edge_functions` |
| Edge Functions **dans le dépôt** | **8** | `ls supabase/functions/` |
| Skills builtin | **18** (607 lignes au total) | `skill_catalog` |
| Jobs `pending` | **34** (17 `fsrs-tick` + 17 `skill_recompute`) | `job_queue` |
| Plus vieux job en attente | **2026-10-08** → **16 jours** | `job_queue.due_at` |
| Lignes `job_logs` | **0** | `job_logs` |
| Événements | **0** | `events_history` |
| `agent_runs` | **0** | `agent_runs` |

**Lecture :** la base est **jeune et vide de données métier** (0 tâche, 0
objectif, 0 agent_run), mais elle **contient du schéma que le dépôt n'a pas** et
**il lui manque du code que le dépôt a**.

---

## 1. Le défaut le plus grave : le dispatcher n'a jamais tourné

**Fait prouvé :** `supabase/functions/fn-job-dispatcher/index.ts` importe
`PROGRESS_FSRS_TICK_HANDLER` et `PROGRESS_COURSE_IMPORT_HANDLER` depuis
`packages/progress/src/jobs.ts`. **Ces deux symboles n'existent nulle part** :

```
$ node scripts/check-ef-imports.mjs
[check-ef-imports] ECHEC — 2 import(s) mort(s) dans supabase/functions/ :
  supabase/functions/fn-job-dispatcher/index.ts
    importe { PROGRESS_FSRS_TICK_HANDLER } depuis "../../../packages/progress/src/jobs.ts"
    -> non exporte par packages/progress/src/jobs.ts
  ... (idem PROGRESS_COURSE_IMPORT_HANDLER)
```

`packages/progress/src/jobs.ts` exporte `buildSkillRecomputeHandler`,
`buildProgressResearchHandler`, `PROGRESS_JOB_HANDLERS`, `PROGRESS_JOB_KINDS` —
**pas** les deux noms importés.

**Conséquences en chaîne, toutes vérifiées :**
1. Le module ne se charge pas → l'EF **ne peut pas démarrer**.
2. Elle n'est **pas déployée** (`list_edge_functions` → 5 EF, dispatcher absent).
3. Les jobs produits par le cron **s'accumulent** : 34 `pending`, `attempts = 0`,
   le plus vieux du **2026-10-08**.
4. `job_logs` = **0 ligne** → le dispatcher n'a **jamais** écrit un log.
5. Le `pg_notify('aurora_job_dispatcher')` du cron 0014 est **structurellement
   inutile** : un Edge Function HTTP ne peut pas tenir un `LISTEN`. Et **`pg_net`
   n'est pas installé** (extensions live : `pg_cron`, `pgcrypto`, `vector`) —
   donc le réveil par base **ne peut pas** appeler l'EF.

**Pourquoi le gate ne l'a pas vu :** `supabase/functions/**` n'apparaît dans
**aucun** `tsconfig` (`grep -rln "supabase/functions" --include=tsconfig*.json`
→ vide). `pnpm -r typecheck` ne le lit **jamais**. C'était le **seul** trou du
gate, et c'est précisément là qu'était le bug.

**Fait aggravant :** `PROGRESS_FSRS_TICK_HANDLER` n'a **pas de constructeur**.
`buildSkillRecomputeHandler` existe ; un handler `fsrs-tick` n'existe **nulle
part**. Les jobs `fsrs-tick` seraient **non routables** même si l'EF démarrait.

---

## 2. La dérive dans l'autre sens : 3 fonctions live-only

Trois fonctions existent **en base** et **pas dans le dépôt** :

| Fonction | Rôle | Nature | Trigger |
|---|---|---|---|
| `auto_confirm_new_user()` | confirme l'email à la création | `SECURITY DEFINER`, **appelable par `anon`** | `trg` sur `auth.users` |
| `auto_confirm_email_identity()` | marque l'identité email vérifiée | `SECURITY DEFINER`, **appelable par `anon`** | `trg` sur `auth.identities` |
| `rls_auto_enable()` | active RLS sur toute nouvelle table | `SECURITY DEFINER`, **appelable par `anon`** | event trigger |

`auto_confirm_new_user` porte le commentaire « décision owner 10-07 : usage
personnel, pas de confirmation email » — donc c'est **intentionnel**, mais **non
versionné**. Une remise à zéro les **supprimerait**.

**Avertissements de sécurité Supabase sur ces 3 fonctions** (advisors, sévérité
WARN) : « can be executed by the `anon` role as a `SECURITY DEFINER` function via
`/rest/v1/rpc/...` ». Recommandation de la plateforme : révoquer `EXECUTE` ou
passer en `SECURITY INVOKER`. **À traiter**, mais ce n'est pas un blocage.

Autres avis : `keep_alive` a RLS sans politique (INFO) ; `vector` dans `public`
(WARN) ; 2 fonctions au `search_path` modifiable (WARN) ; protection contre les
mots de passe compromis désactivée (WARN).

---

## 3. Ce que cela change pour les décisions

### D1 — Quel est LE produit de la v1 ?

**Ce que la base dit :** 64 tables couvrent productivité, learning, knowledge,
progress, discovery, agent, artifacts, canvas. **Design Space : 0 table, 0
fonction.** Le produit **réellement construit et déployé** est le **socle
productivité + apprentissage + agent**.

**Recommandation : (a)** — le socle. Design Space en Phase 1B, comme §10.4 le
prévoit déjà. Motif mesuré : le socle est `IMPLEMENTED` (64 tables, 119
fonctions), Design Space est `MISSING` (0). Livrer l'existant réduit l'écart.

**Réserve à connaître :** le socle n'est **pas fonctionnel de bout en bout** —
le dispatcher est mort (§1). « Finir la v1 » inclut donc **réparer le chemin de
jobs**, ce qui n'est pas de la cosmétique.

### D2 — Quelle coquille pour le web ?

`apps/web-app` **n'existe pas** (3 apps : desktop, mobile, server). Le travail
d'UI existant est dans `apps/mobile` (Ionic), or `OQ-1` a écarté Ionic du web.

**Recommandation : créer `apps/web-app` maintenant** (React + ReUI, sans `ion-*`).
Motif : construire des écrans web dans une coquille Ionic qu'on démontera ensuite
est le coût déjà identifié dans `docs/frontend/web-shell-and-responsive.md`.

### D3 — Périmètre de la prochaine livraison

**Recommandation : (a) fermer la Phase 0, puis (b) socle web.** La Phase 0 est
**désormais fermée par la preuve** (voir §4). La suite immédiate n'est pas
Design Space : c'est **rendre le socle réellement exécutable** (dispatcher +
déploiement reproductible) avant d'ouvrir une 4ᵉ surface.

### D4 — Sort de `apps/mobile` et d'`assistant-ui`

**Recommandation : conserver les deux** (déjà acté D-018.3 / D-018.2).
`apps/mobile` = cible Phase 4. `@assistant-ui/react` = réserve de briques, non
supprimée. **Aucun fait nouveau** ne change cette recommandation.

### D5 — `open-webui` (fork 505 Mo)

**Hors du périmètre de cette analyse** : rien dans la base ni dans l'arbre ne
dépend de lui. **Recommandation : décision séparée**, non bloquante.

---

## 4. La Phase 0 est fermée — par la preuve, pas par la décision

| Livrable (§10.2) | État | Preuve |
|---|---|---|
| Registre de statut | ✅ | `docs/architecture/status-register.md` |
| Cartographie navigation (item 10) | ✅ | `docs/architecture/navigation-mapping.md` |
| Intégration Design Space (item 11) | ✅ | `docs/architecture/design-space-integration.md` |
| ADR web-first | ✅ | `ADR-INT-002` → pointeur vers `adr-018` |
| Item 8, moitié serveur | ✅ **exécuté** | `scripts/rls-live-check.sh` : 28 migrations, 58 tables, 0 pénétration, contrôle négatif |
| Item 8, moitié device | ⛔ **bloqué** | relay non provisionné (externe) |
| Item 9, POC Design Space | ⛔ **conditionné** | dépend d'OQ-8 (moteur d'édition) |
| Item 12, migration de données | ❌ **non définie** | — |

**Trois défauts réels ont été trouvés en exécutant** (et corrigés) : `0019`
(19 valeurs en guillemets doubles), `0025` (apostrophe non échappée),
`tests/rls-penetration.sql` (liste figée, jamais exécuté).

---

## 5. Sur « reprendre à zéro » : ce que je recommande et ce que je refuse

**Ce que « zéro » résoudrait vraiment :** la dérive **dépôt ↔ live** (§2) et le
dispatcher mort (§1) sont **exactement** des symptômes d'absence de **chaîne de
déploiement vérifiée**. On a un dépôt et une base qui ont divergé sans que
personne ne puisse le voir.

**Ce que je recommande (dans cet ordre) :**

1. **Rendre la dérive visible et bloquante** — fait : `scripts/check-ef-imports.mjs`
   (2 erreurs réelles, 0 faux positif) + `scripts/rls-live-check.sh`.
2. **Réparer le dispatcher** : soit implémenter les 2 handlers manquants, soit
   retirer les imports morts. **C'est un choix de conception**, pas un simple fix.
3. **Rendre le réveil des jobs réel** : installer `pg_net` **ou** passer à un
   cron qui appelle l'EF par HTTP. Aujourd'hui, **aucun** mécanisme ne peut
   réveiller le dispatcher.
4. **Aligner live ↔ dépôt** : versionner les 3 fonctions live-only, purger les
   34 jobs morts, déployer les 8 EF.
5. **Alors** ouvrir `apps/web-app`.

**Ce que je refuse de faire sans ton accord explicite :** **réinitialiser la base
live**. Elle contient 4 utilisateurs réels et 3 fonctions non versionnées ;
un `reset` les détruirait et **ne serait pas rattrapable** (pas de sauvegarde
vérifiée). « Repartir de zéro » doit passer par **versionner puis rejouer**, pas
par effacer.

---

## 6. Ce qu'il me faut de toi (2 réponses suffisent pour démarrer)

1. **D1** : (a) socle, (b) socle + Design Space, (c) Design Space d'abord ?
2. **Dispatcher** : (i) implémenter `fsrs-tick` + `course_import` pour de vrai,
   ou (ii) retirer les imports morts et n'enregistrer que ce qui existe ?

Avec ces deux réponses, j'enchaîne sur un lot unique, vérifié, qui **rend le
socle exécutable** — et je laisse `apps/web-app` pour le lot suivant.
