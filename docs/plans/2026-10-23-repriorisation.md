# Aurora — Repriorisation (plan, 2026-10-23)

> **Statut :** plan de décision — NON exécuté. Écrit après un constat d'état réel.
> **Règle de lecture (AI_RULES §1) :** le changelog + le code gagnent sur les docs.
> **But de ce document :** arrêter de se perdre. D'abord rétablir une base **vérifiée**,
> ensuite trancher **ce qu'on construit** (chat : 3 candidats en présence), ensuite exécuter.

---

## 0. À lire en premier (le fait qui change tout)

**Le workspace de la session précédente était VIDE.** Au démarrage de cette session,
`/workspace/project` ne contenait qu'un `.git` sans aucun commit (`your current branch
'master' does not have any commits yet`) et un fichier `.openhands/memory/MEMORY.md`.

Tout le travail décrit dans cette mémoire — `docs/integration/` (6 livrables),
`FINAL_STATUS_REPORT.md`, les milestones M1→M5.2, la branche `integration/librechat`,
les commits `eab561a`, `91fe40d`, `48fd7fa`, `08d35c6`, `963ccef`, `fe45e04` —
**n'existe nulle part** :

| Vérification | Commande / requête | Résultat |
|---|---|---|
| Présent sur le disque ? | `ls docs/integration/` | `No such file or directory` |
| Présent dans l'arbre ? | `ls packages/ui/src/components/chat/` | `No such file or directory` |
| Route `/chat` ? | `grep -rn "path=\"/chat\"" apps/mobile/src/` | 0 hit |
| Sur le remote ? | `GET /repos/joydatini-lab/aurora/branches` | **seule branche : `main`** |
| Ref `integration/librechat` ? | `GET /repos/.../git/ref/heads/integration%2Flibrechat` | **404** |
| Commits cités ? | `GET /repos/.../commits/eab561a` / `fe45e04` | **422 (inconnus)** |

**Cause :** le FS du sandbox est éphémère (déjà noté dans MEMORY : « FS is EPHEMERAL »).
Le travail a été perdu au reset, et il n'avait jamais été poussé.

**Conséquence pour la suite :** la première action, avant toute décision produit, est
d'**installer + gater + pousser**. Sinon on reperdra tout au prochain reset.

---

## 1. Baseline réelle (inspectée, pas supposée)

Dépôt récupéré depuis `https://github.com/joydatini-lab/aurora` (privé-publique : public,
`license = None`, `default_branch = main`).

| Élément | Valeur vérifiée | Source |
|---|---|---|
| HEAD de `main` | `e066292` — *feat(icons): bascule des 39 fichiers apps/mobile vers AURORA_ICONS* | `git log -1` |
| Dernier commit | `2026-10-19 11:03:37 +0100` | `git log -1 --format=%ci` |
| Commits | **390** | `git rev-list --count HEAD` |
| Branches | **`main` seulement** | API `/branches` |
| Tags | **aucun** (`git tag -l` vide) | `git tag -l` |
| Auteurs | `JOY-py-arch` (346) + `Dyad` (44) | `git log --format=%an` |
| Packages | **19** (`packages/*`) | `ls packages/` |
| Apps | **3** (`desktop`, `mobile`, `server`) | `ls apps/` |
| Migrations | **28** fichiers SQL (`0001…0027` + `0200`) | `ls supabase/migrations/*.sql \| wc -l` |
| Edge Functions | **9** dirs (`_shared` + 8 `fn-*`, dont `fn-dev-auth` = DEV-only à supprimer, P6-6) | `ls supabase/functions/` |
| Pages mobile | **26** répertoires | `ls apps/mobile/src/pages/` |
| Fichiers de test | **101** | `find … -name "*.test.ts*"` |
| Workflows CI | **6** (`ci`, `release`, `release-apk`, `chromatic`, `storybook-deploy`, `sync-health`) | `ls .github/workflows/` |
| `node_modules` | **absent** → gates non exécutables en l'état | `ls -d node_modules` |
| Références LibreChat dans le repo | **0** (seul le fichier mémoire en parle) | `grep -ril librechat .` |

**Le gate n'a pas été exécuté dans cette session de planification.** Il faut
`pnpm install` d'abord. Le dernier gate enregistré (`AI_RULES.md` §9) est
« 236 tests pass / 0 fail » — **non re-vérifié depuis**.

---

## 2. Ce qu'Aurora implémente réellement (au 2026-10-19)

Confirmé par lecture directe :

- **Chat :** `apps/mobile/src/pages/agent/index.tsx` (**1722 lignes**) — transcript,
  composer, modes `chat | agent | mirror`, sheet `+`, sélecteur modèle/réflexion,
  4 gestes. `agent/conversations.tsx`, `bibliotheque.tsx`, `capacites.tsx`.
- **Persistance de conversation :** `agent_runs` (migration `0008`) est **le seul
  store**. **Aucune table `conversations` / `messages`** (vérifié : la liste complète
  des `CREATE TABLE` des 28 migrations ne les contient pas). Server-owned, RLS
  per-user, le device **lit** via le client publishable (AD-7), ne poll que pendant
  `running`.
- **Agent :** kernel côté serveur (`fn-agent-run`), device voit seulement
  `AgentRunState` (F-09/AD-3) — aucun stream provider ne traverse le device.
- **Local-first :** PowerSync (`powersync/` : `sync-config.yaml`, `relay.sql`,
  `schema.json`, `test/roundtrip.md`).
- **Design system :** `packages/ui` — tokens, thèmes JSON SSoT (AD-17), 5 renderers
  AD-10, et **`@assistant-ui/react` 0.15.28 vendu : 172 fichiers** sous
  `components/assistant-ui/` (elements + demo provider), **exporté** depuis
  `src/index.ts` (l.1347+).
- **Desktop :** `apps/desktop` = spike Electron Phase-0 (main.cjs / preload.cjs /
  renderer.jsx), PowerSync voie A. Pas de vraie UI.
- **Icônes :** `AURORA_ICONS` (Phosphor) — SSoT `packages/ui/src/icons/`.

---

## 3. LE point à trancher : il y a **3 candidats chat** en présence

C'est la vraie source du « on se perd ». Aujourd'hui il existe :

| # | Candidat | État réel | Emplacement |
|---|---|---|---|
| **A** | **Le chat Aurora existant** | IMPLEMENTED, en prod sur `main` | `apps/mobile/src/pages/agent/index.tsx` (1722 l.) |
| **B** | **`@assistant-ui/react`** | Vendu + exporté, **jamais câblé** (aucun `AssistantRuntimeProvider` hors démo) | `packages/ui/src/components/assistant-ui/` (172 fichiers) |
| **C** | **LibreChat** | **Absent du repo.** Jamais cloné. Licence MIT. | externe — `LibreChat-AI/LibreChat` |
| **D** | **open-webui** | **Fork existant** sur ton compte GitHub, poussé **2026-10-22** (plus récent qu'Aurora) | `joydatini-lab/open-webui` (505 Mo) |

**Le brief maître demande d'intégrer C (LibreChat).** Mais :
- la mémoire de session concluait déjà « **Strategy B — patterns in, code out** »
  (aucune ligne de code LibreChat copiée) ;
- `packages/ui` contient **déjà** une bibliothèque chat complète et dormante (B) ;
- et ton compte porte un **fork open-webui** (D) plus récent que le dernier commit Aurora.

**Ces 4 chemins ne peuvent pas être poursuivis en parallèle.** Il faut en choisir **un**.

### 3.1 Le risque de chaque voie (honnête)

- **A (finir le chat Aurora)** : coût le plus bas, zéro nouvelle dépendance, respecte
  AD-3/F-09 par construction. Mais c'est une UI maison, pas un « produit chat premium »
  clé-en-main — c'est le travail qui reste à faire.
- **B (câbler assistant-ui)** : le plus cohérent avec AD-6 (design system pur) et AD-1.
  Mais 172 fichiers dormants = dette non mesurée ; il faut vérifier qu'ils compilent
  et qu'ils ne violent pas AD-1/AD-6 avant de s'engager.
- **C (LibreChat)** : son client est **fortement couplé** à son backend Node/Express +
  MongoDB (contrats REST/SSE, modèle user/permission). L'adopter = soit remplacer le
  backend Aurora (interdit : AD-7/AD-8/RLS), soit écrire un adaptateur de compatibilité
  substantiel. Coût le plus élevé, risque de doublon de source de vérité maximal.
- **D (open-webui)** : stack Python/Svelte + backend propre, licence `NOASSERTION`
  (à vérifier avant tout réemploi). **Non audité.**

---

## 4. Priorités proposées (dans cet ordre)

### P0 — Ne plus rien perdre (bloquant, 30 min)
- **P0-1** Rétablir l'arbre : `pnpm install` (layout isolé, **ne pas** ajouter `.npmrc`).
- **P0-2** Créer une branche de travail **poussée** (`rebaseline/2026-10-23`) et y
  committer ce plan. **Aucun travail ne reste local.**
- **P0-3** Exécuter le gate complet (`AI_RULES.md` §9) et **enregistrer le résultat réel**
  dans `docs/ci/gate.md` + `IMPLEMENTATION_STATUS`. C'est la seule vérité acceptable.

### P1 — Trancher la direction (décision owner, pas de code)
- **P1-1** Choisir **un** candidat chat (§3) : A, B, C ou D. Documenter le refus des
  autres en 3 lignes (ADR additif).
- **P1-2** Décider du **produit** : Aurora est-elle (i) une suite productivité+learning
  avec un agent, ou (ii) une app chat d'abord ? Aujourd'hui la réponse conditionne tout
  le reste (l'AD-14 « Home = What matters now? » dit (i) ; le brief maître dit (ii)).
- **P1-3** Confirmer la place d'`open-webui` : piste active, ou fork exploratoire mort ?

### P2 — Finir v1.0 sur la base choisie
Reprendre `docs/plans/finalisation-v1.md` — **2 cases cochées sur 34** — en priorisant
les gaps bloquants, pas le polish :

| Gap | Quoi | Bloque |
|---|---|---|
| **G1** | 6 EF non déployées (`create/lock/rename` canvas + wiring dispatcher) | Phase 1 |
| **G2** | Jobs E2E jamais exécutés (dispatch → claim → idempotence) | DoD wave 1 |
| **G3** | PowerSync round-trip jamais exécuté (users de test **créés** le 10-07) | DoD wave 1 |
| **G7** | Polish design-QA sur **toutes** les pages | UX |
| **G8** | Hygiène (doc-lag AI_RULES §3 : « 20 migrations » vs **28** réelles) | Santé repo |
| **P0-3** | **Le tag `v0.1.0` n'existe pas** (`git tag -l` vide) — le plan le prétend faux | Release |
| **P6-6** | Supprimer l'EF DEV `fn-dev-auth` + le bloc `auth-diag` | Sécurité |

### P3 — Ensuite seulement : l'intégration chat (si retenue)
Selon P1-1. Pas avant.

---

## 5. Décisions à confirmer (owner)

1. **Chat : A, B, C ou D ?** (recommandation ci-dessous)
2. **Produit : suite productivité+learning, ou app chat d'abord ?**
3. **`open-webui` : piste active ou fork mort ?**
4. **Périmètre :** re-baseline + v1.0, ou l'intégration chat d'abord ?
5. **`@assistant-ui/react` : on câble, ou on le retire du bundle ?** (dormant = dette)

### Recommandation (à débattre)
**A d'abord, B ensuite, C/D seulement si un besoin produit le justifie.**
Raison : A est déjà implémenté, respecte les invariants gelés par construction, et son
unique manque est du **travail d'UI**, pas de l'**architecture**. B est le seul candidat
de réemploi *compatible AD-6/AD-1* (il vit déjà dans `packages/ui`) et il est **déjà
payé**. C impose un adaptateur lourd et un risque de double source de vérité pour un
gain qui n'est pas démontré. D n'est pas audité.

---

## 6. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| FS sandbox éphémère → travail perdu | Critique (déjà arrivé) | **Pousser après chaque lot** (P0-2) |
| 3 candidats chat en parallèle | Critique (dérive) | Trancher P1-1 |
| Gate jamais re-vérifié depuis le 10-19 | Élevé | P0-3 |
| `assistant-ui` dormant non testé (172 fichiers) | Moyen | Vérifier compile + AD-1/AD-6 avant réemploi |
| open-webui `NOASSERTION` | Moyen (licence) | Vérifier la licence avant tout réemploi |
| Doc-lag (tag, migrations, waves) | Moyen | Re-synchroniser docs après P0-3 |

---

## 7. Hors périmètre de ce plan
- Toute modification de code (ceci est un plan).
- Tout déploiement / push sur `main`.
- Toute copie de code LibreChat/open-webui.
