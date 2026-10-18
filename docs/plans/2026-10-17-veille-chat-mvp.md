# Plan d'implémentation — MVP v2 : Agent (Ask · Agent · Miroir) + Discovery + Focus + Intégrations

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` pour
> exécuter ce plan tâche par tâche. **Exécution recommandée : Subagent-Driven
> (option 1)** — un sous-agent frais par tâche, review entre les tâches.

**Goal :** livrer le MVP v2 du briefing `aurora-discovery-agent-briefing.md`
(2026-10-17) : l'agent conversationnel à 3 modes (Ask · Agent · Miroir) +
capacités (réflexion, recherche, intégrations, skills indexés), le module
**Discovery** (veilles : chat + formulaire, run avec mémoire, rapport lisible
+ sources), le module **Focus** (profils Pomodoro/chronomètre, tâches
minimales), et la page **Intégrations** (Composio, chaque écriture confirmée) —
le tout en respectant les invariants gelés (AD-7, AD-8, AD-1/AD-3, AD-11,
AD-16b, AD-12, F-07, horizont offline, RLS).

**Pourquoi v2 :** le briefing v1 de ce lot (`2026-10-17-veille-chat-mvp.md`,
M1–M8) est resté **Discovery + Chat seul**. Le v2 élargit le périmètre à 4
blocs (15 écrans, 16 user stories) avec un découpage en **13 sprints S0–S7**.
Les tâches fondation M1–M4 du v1 (writer `automations`, run avec mémoire,
rapport + menu sources) sont conservées **inchangées** ici (le socle
Discovery tient dans les deux versions) et réintégrées dans S4 ; les tâches
M5–M8 v1 (création manuelle, navigation, confirmation de créneau, finitions)
ont été RESTRUCTURISÉES pour le v2 (navigation 4 entrées au lieu de 3, blocs
Focus/Miroir/Skills/Intégrations nouveaux, finitions élargies).

**Le S8 est ajoutée par le lot 2026-10-17** : le **self-updater APK** (détection
GitHub Releases + téléchargement + installation via PackageInstaller),
INDÉPENDANT de S0–S7 (aucune dépendance sur les sprints) — l'ordre reste
`S0 → S1 → (S2 ∥ S3) → S4 → (S5 ∥ S6) → S7 → S8` ou S8 peut se faire en
parallèle dès que le projet Android natif est généré.

**Architecture (les invariants du briefing §12) :**
- **AD-7 single-writer** : le run `research` écrit le vault ; le chat lit et
  propose ; **Progress écrit les preuves** de Miroir (F-07 : l'agent ne crée
  jamais une preuve — il *propose*, l'utilisatrice *valide*, Progress commite).
- **Thin emitters G1–G12** : le kernel émet une commande typée
  (`{ ok, command }`) ou un job (`{ ok, jobKind }`) ; le module propriétaire
  applique. Aucune écriture directe depuis l'app ni depuis le kernel.
- **AD-8 jobs persistés** : la recherche ET `mirror-analysis` sont des jobs
  idempotents, jamais bloquants. Le dispatcher ne crée JAMAIS de job.
- **AD-1/AD-3** : les ports (`ResearchProvider`, `IntegrationProvider`) sont
  optionnels ; absence = dégradation (`uncertain` / message clair), pas de
  panne. Aucune clé sur l'appareil (serveur seulement).
- **AD-11 provenance** : chaque affirmation / détection / source garde son
  origine.
- **AD-12 (One Kernel)** : Ask/Agent/Miroir sont un **paramètre du profil de
  tâche** (`taskProfile.agentMode`), pas 3 agents — le routeur IA décide en
  Auto.

**État du socle (audit 2026-10-17, fait, pas hypothèse) :**

| Existante | Chemin |
|---|---|
| Outils G1–G3 + `discovery_vault_read` (thin emitters) | `packages/agent/src/tools.ts` (`KERNEL_TOOLS`) |
| Pipeline veille G9 (`runVeillePipeline`, flag `uncertain` AD-16b) | `packages/discovery/src/veille-pipeline.ts` + `jobs.ts` |
| Writer unique du vault (AD-7) | `supabase/functions/fn-job-dispatcher` + `createVaultStoreRest` |
| Table `automations` (0008) + `discovery_vault` (0025) + `job_queue` (0010) | `supabase/migrations/` |
| Outil `mirror_analyze` (job `agent_run`) + service miroir (`MirrorFinding` gap/contradiction/error + `detectMirrorFindings`) | `packages/agent/src/tools.ts:164` · `packages/learning/src/mirror-cognitive.ts` |
| Focus (Pomodoro + chrono + blocklist, `FocusControllerService`) | `packages/focus/src/` + `apps/mobile/src/pages/focus/index.tsx` (session seule, PAS de profils) |
| Skills (catalogue + user skills + expert, tools `skill_*`) | `apps/mobile/src/pages/skills/index.tsx` (3 onglets) + `packages/agent/src/tools.ts` + migrations 0019/0020/0021 |
| Intégrations (page Composio + client) | `apps/mobile/src/pages/integrations/index.tsx` + `apps/mobile/src/lib/integrations-client.ts` |
| Chat agent (transcript, composer, modes `chat/agent/mirror/ascent`, menu +/sheet, modèle + réflexion) | `apps/mobile/src/pages/agent/index.tsx` |
| Carte de veille + liste + bannière synthèse | `apps/mobile/src/pages/discovery/{index,card}.tsx` |
| Shell à **5** onglets (→ 4 au v2) | `apps/mobile/src/shell/ShellTabBar.tsx` |

**Ce qui MANQUE et que ce plan construit :**

1. **Discovery (S4)** : le **writer du module Integrations** qui applique les
   commandes G1–G3 (`automations` reste vide aujourd'hui — le kernel émet,
   personne n'applique) ; le **matérialiseur** `automation` due → job
   `research` de `job_queue` (pont AD-8 manquant) ; le **run avec mémoire**
   (dédup par le vault + verdict dérivé du delta, gel 14/10) ; le **rapport
   lisible** + **menu des sources** ; la **création manuelle** (form B).
2. **Agent (S1–S2)** : fiabiliser **Ask / Agent / Miroir** comme 3 modes du
   profil de tâche (Q9 : Ask = lecture seule, n'émet AUCUNE écriture) ; le
   menu **+** (mode, recherche, intégrations, skills, fichiers) ; les skills
   **indexés dans le chat** (Q13 : appel `/` + indexation) ; le sélecteur
   **réflexion/modèle** typé (Q12 : paramètre du profil de tâche, jamais des
   mots-clés) ; la page **Skills** (bibliothèque cartes 2/ligne, détail,
   création/modification).
3. **Intégrations (S3)** : page v2 (connectées/disponibles, permissions par
   service, Q6) ; **chaque écriture = confirmation** (§12) ; `IntegrationProvider`
   (Composio, Google Agenda 1ᵉʳ).
4. **Focus (S5)** : **profils de focus** (méthode + durées + tâche assignée,
   Q11) ; page Focus v2 (cartes profils + tâches minimales + lancement) ;
   **sessions locales** (offline).
5. **Miroir (S6)** : écran 3 (explication → détections typées
   `Manquant/Fragile` + provenance → question ciblée) ; **validation** avant
   preuve (Progress = producteur unique F-07) ; le job `mirror-analysis`
   (contrat **`learning/overview.md` §21** à lire avant de coder — Q4) ;
   actions « Planifier un Focus » / « Créer une veille ».
6. **Navigation + visuel (S0/S1)** : **AUCUNE barre sur la page Agent**
   (sortie par le menu latéral) ; barre **4 entrées** (`Agent · Discovery ·
   Focus · Plus`, Intégrations dans « Plus ») sur les autres pages ; fond
   **`#FFFFFF`** + un seul bleu **`#2F5BEA`** (teinte `#EAF0FF`, filets
   `#E4E7EF`) ; messages utilisateur en gris clair, JAMAIS bleus.
7. **Finitions (S7)** : suppression de veille confirmée (G3 destructive) ;
   **push** OneSignal fin de run ; **les 5 états** par écran ; E2E A–D +
   Miroir + Focus ; RLS.

**Tech stack :** pnpm monorepo ; TypeScript strict ; app mobile **Ionic
React + Capacitor** (`apps/mobile`) ; tests **`node --experimental-strip-types
--test`** (packages + app mobile — PAS de vitest/jest ici ; seul
`packages/ui` a du vitest) ; composants UI dans `packages/ui` (Radix, tokens
`--aurora-*`) ; Supabase (Postgres + RLS + Edge Functions) ; PowerSync (miroir) ;
OneSignal (push, serveur) ; Composio (intégrations, via `fn-integrations`).

---

## Trancher AVANT de coder (S0) — à figer avec le lead, pas le sous-agent

| # | Question (briefing §15) | Proposition par défaut |
|---|---|---|
| Q1 | Déclencheur par défaut de la veille | `schedule` d'abord (cohérent maquette + D1 gelé) ; `condition`/`event` en variant (Q6, hors MVP) |
| Q2 | Seuils du verdict de pertinence | `≥0.7 Élevée` / `0.4–0.69 Moyenne` / `<0.4 Incertain` (déjà dans `card.tsx relevanceLabel`) |
| Q3 | Échelle de crédibilité des sources | `haute` / `moyenne` + l'état `uncertain` (flag AD-16b) |
| Q4 | **Contrat Miroir** | **LIRE `docs/learning/overview.md` §21** avant S6 (détections typées, format de reformulation, lien Progress F-07) — à valider au S0 |
| Q5 | Skills (format, stockage, partage, sécurité) | Définir au S0 (traiter comme instructions nommées chargées à la demande) |
| Q6 | Liste réelle des intégrations + portée des permissions | Définir (Google Agenda/Docs 1ᵉʳ, par service au MVP) |
| Q7 | « Un seul bleu fini » | Confirmé : `#2F5BEA` unique (teinte `#EAF0FF`) |
| Q8 | Le chronomètre (absent des docs) | Valider (il est déjà dans `pages/focus/index.tsx` sub-mode Chrono) |
| Q9 | Ask peut-il lire vaults + intégrations | Lecture seule OUI (AD-7 : n'émet AUCUNE écriture) ; à trancher au S0 |
| Q11 | Tâches Focus (modèle minimal + compat `productivity.tasks`) | Définir au S0 (titre, état, profil optionnel) |
| Q12 | Paliers de modèle (Léger/Standard/Avancé) ↔ routeur | Paramètre typé du profil de tâche, soumis à la politique + budget IA (ADR §6) |
| Q13 | Indexation des skills | Définir : indexé = l'agent le choisit seul ; `/nom` = appel manuel |
| Q14 | Police du nom Aurora (Fraunces/Sora/Syne) | En attente (Inter pour l'instant, JetBrains Mono pour les valeurs) |

---

## Dépendances des sprints (le briefing §13)

```
S0 Cadrage (Q1–Q14 tranchées + maquettes + §21 lu)
S1 Chat socle (écrans 1,2,6 · modes Ask+Agent · saisie · menu latéral)
S2 Capacités   (écrans 4,5,5bis–5sexies · skills indexés · réflexion typée · recherche)   ∥
S3 Intégrations (écran 7 · IntegrationProvider · Google Agenda 1ᵉʳ)
S4 Veille      (écrans 12–15 · create_automation · run mémoire · vault · rapport)
S5 Focus       (écrans 8–11 · profils · tâches minimales · lancement · sessions locales)   ∥
S6 Miroir      (écran 3 · job mirror-analysis · actions Focus/veille · validation preuves)
S7 Finitions  (suppression confirmée · push · 5 états · E2E · RLS)
S8 Self-updater APK (indépendant, parallelisable dès le projet Android natif existe)
```
Ordre : `S0 → S1 → (S2 ∥ S3) → S4 → (S5 ∥ S6) → S7 → S8`. Chaque sprint reste
*buildable* et démontrable de bout en bout. S8 est INDÉPENDANT (aucune
dépendance sur S0–S7) et peut se faire en parallèle.

> **TickTick = SSoT du planning** : le lot `Aurora 2 — Veille + Chat agentique
> (MVP)` (projet `6ad3efa68f08e04af3667721`, tag `mvp-veille`) sera mis à jour
> pour refléter ce découpage v2 (le v1 créait S0 + M1–M8 ; on complète, on ne
> supprime JAMAIS). Ne jamais cocher une tâche avant validation de ses
> critères de sortie. Les numéros de tâches ci-dessous (M-xx) y correspondent.

---

## S0 — Cadrage (S)

**M-0 Nettoyage du repo (PRÉREQUIS, avant toute tâche S0+)** : le repo
contient du code mort + des artefacts de build/CI qui gêneraient la phase
suivante. **À éradiquer AVANT de commencer S1** :

- **Artifacts à SUPPRIMER** (git `rm` / `git rm --cached` selon le cas) :
  - `chromatic-logs.txt` (1,3 Mo de JSON 403 du CI — déjà un `chromatic.log`
    en tête de repo, les deux sont des logs de run ; à git-ignorer)
  - `tpc.json` (cache npm `@tiptap/core` dump — 1,4 Mo, artefact d'outillage)
  - `job-build.json` + `jobs.json` (artefacts de jobs, déjà `jobs.json` à la
    racine)
  - `hs_err_pid*.log` + `replay_pid*.log` (crash dumps JVM/Node, multiples)
  - `run-logs.zip`, `build-storybook.log`, `chromatic.log` (logs de build
    storybook/chromatic)
  - `debug-band*.png`, `debug-image-theme-bg.png`, `debug-pixel-*.png`,
    `debug-region*.png`, `debug-test.png` (screenshots debug, multiples)
  - `powersync/service-fetched.yaml` (fetch du service, artefact tooling)
- **À VÉRIFIER / à RATTACHER à un commit du lot en cours** (pas auto-supprimable,
  le contenu est du code de développement actif) :
  - `packages/ui/src/components/ui/{calendar,combobox,empty-state,empty,field,
    input-group,item,spinner}.stories.tsx` (stories non committées — à
    rattacher au lot UI en cours, à commit)
  - `packages/ui/src/components/ui/tiptap-extensions.ts` (fichier source,
    à commit)
  - `.github/workflows/chromatic.yml` (modifié, à commit)
  - `docs/cdd.md` (nouveau doc CDD, à commit)
  - `docs/plans/2026-10-14-canvas-agentique.md` +
    `docs/plans/2026-10-17-veille-chat-mvp.md` (plans, à commit)
  - `stitch_design_system_optimization/` (réf visuelle du v2, à commit)
  - `env.local` (déjà git-ignoré via `.env.local` ? vérifier — le pattern
    `.env.local` du `.gitignore` ne couvre PAS `env.local` sans point ;
    **à git-ignorer** : `env.local`)
  - `pack/PRD_2_Bible.md` (suppression en cours ` D` — **à confirmer** :
    est-ce que la suppression est voulue ? si oui, la commit ; si non,
    `git restore`)
- **assistant-ui** : `packages/ui` dépend déjà de `@assistant-ui/*` (cf.
  `assistant-ui-install-state` memory, 2026-10-14). **Ajout au plan** : la
  **tâche M-12 du S1** (saisie v2) va utiliser les composants `assistant-ui`
  (composer, thread, etc.) de `packages/ui/src/components/assistant-ui/`
  (installés) plutôt que le chat custom actuel — **à confirmer au S0** si on
  migre le chat existant vers `assistant-ui` ou si on garde le chat custom
  et on réserve `assistant-ui` pour les nouveaux écrans (recommandation :
  garder le chat custom pour le socle S1, réserver `assistant-ui` pour les
  écrans v2 S4+ qui ont besoin de ses composants avancés).

**Critère de sortie M-0** : aucun artefact/crash-dump/log debug dans le
repo ; `env.local` dans `.gitignore` ; la suppression de
`pack/PRD_2_Bible.md` confirmée ou restaurée ; `pnpm typecheck` + `pnpm test`
à 0 erreur **avant** tout S1 (la baseline du nettoyage est propre).

**M-01 Trancher les Q (1 seul sous-agent, docs)** : valider Q1 (défaut
`schedule`), Q2 (seuils 0.7/0.4 — déjà dans `card.tsx`), Q3 (échelle
haute/moyenne+uncertain), Q7 (bleu `#2F5BEA`), Q8 (chronomètre OK), Q9 (Ask
lecture seule), Q11 (modèle de tâche minimal), Q12 (paliers typés), Q13
(indexation skills) en **un ADR court** (`docs/adr/`).

**M-02 Lire le contrat Miroir (Q4)** : `docs/learning/overview.md` §21 —
le `mirror-analysis` job, les détections typées, le format de reformulation,
le lien exact avec Progress (F-07). Livrable = le contrat figé (le §5 du
briefing est une PROPOSITION à valider contre ce §).

**M-03 Skills + Intégrations (Q5, Q6)** : figer le format des skills
(indexation, appel `/`, stockage `user_skills`) et la liste des intégrations
v2 + la portée des permissions (Google Agenda/Docs 1ᵉʳ, par service).

Critère de sortie S0 : décisions Q1–Q14 tranchées (celles du MVP), §21 lu +
figé, maquettes validées (dont la navigation 4 entrées + fond blanc).

---

## S1 — Chat (socle) (M) — écrans 1, 2, 6

Les écrans 1/2/6 EXISTENT déjà dans `pages/agent/index.tsx` (transcript,
composer, menu +/sheet, mode tabs, modèle+réflexion). Ce sprint **fiabilise**
les 3 modes + la navigation v2.

**M-11 Modes Ask/Agent (écran 2)** : le mode est un paramètre du profil de
tâche (`taskProfile.agentMode`, AD-12). **Test d'abord**
(`packages/agent/test/router.test.ts` ou `tools.test.ts`) :
- `agentMode:'chat'` (Ask) → le kernel **n'émet AUCUNE commande d'écriture**
  (lecture seule, Q9) : vérifier que seuls les tools READ-ONLY (`*_read`,
  `*_search`, `course_search`, `discovery_vault_read`…) sont résolus ;
- `agentMode:'agent'` → boucle complète (les tools d'écriture sont autorisés,
  les confirmations CONFIRMATION_REQUIRED s'appliquent).
L'implémentation = la résolution du router par `agentMode` (gating des tools
par l'AD-7 des écritures). **Ask n'écrit JAMAIS** (critère §14).

**M-11b Orbe Aurora + état vide du chat (écran 1)** : le composant
`AuroraOrb` (section « Règle de logo / orbe » du plan, à créer dans
`packages/ui` ou `apps/mobile/src/components/`) est à **monter dans l'état
vide du transcript** de `pages/agent/index.tsx` (le bloc `data-state="empty"`
actuellement, cf. `agent.css` `.agent-empty`) — l'orbe (cercle
radial-gradient + 2 yeux pillules) **remplace** l'état vide texte
actuel (« L'agent n'est pas encore disponible »/« Commencez par une
intention »), conformément au `code.html` de
`stitch_design_system_optimization/agent_accueil_fraunces/` (l'orbe est
positionné AU-DESSUS du titre « Que puis-je faire pour vous ? »).
**Couleur dynamique obligatoire** : l'orbe lit
`var(--aurora-accent-primary/secondary/punctual)` (jamais de hex codés
en dur, voir la règle d'orbe du plan) — le test
`aurora-orb-wiring.test.ts` vérifie que le CSS rendu ne contient aucun hex
hardcodé. Les **suggestion pills** (le `code.html` Stitch « quick-actions »)
sont à ajouter sous l'orbe si l'orbe existe sur l'écran d'accueil
(stitch `agent_accueil_fraunces`) — vérifier le `code.html` pour leur
structure exacte avant de les ajouter, ne pas les inventer.

**M-12 Saisie + sélecteur de mode (écran 11.3)** : puce de mode (Ask/Agent/
Miroir) + puce Recherche (interrupteur) + puce Auto (réflexion/modèle) +
envoi/micro, dans la carte de saisie (rayon 28 px). Le mode s'applique à la
conversation en cours ; l'écran d'accueil rappelle le mode actif. (Ajuster
`pages/agent/index.tsx` : le sélecteur vit dans la saisie, PAS en haut de page.)

**M-13 Menu latéral (écran 6) + navigation v2 + logo header** : AUCUNE barre
de navigation sur la page Agent (sortie par le menu latéral : nouvelle
conversation, navigation, conversations récentes). Sur les AUTRES pages
(Discovery, Focus, Intégrations) : barre **4 entrées** `Agent · Discovery ·
Focus · Plus` (Intégrations dans « Plus »). **Le logo officiel de l'app**
(`assets/aurora_logo_icon_d'affichage_l'applicaiton.png`) est à brancher
**dans le header de chaque page** (`IonHeader`/`IonTitle` existants,
`apps/mobile/src/pages/*/index.tsx` + le header global `apps/mobile/src/
shell/Shell.tsx`) — à côté du titre, taille ~24–32 px ; le **motif
monochrome** (`assets/aurora_icon_a_integre_dans_l'applciation.png`) est à
brancher **dans l'état vide de chaque page** (pas encore créé pour les
nouvelles pages S4–S6 : état vide = le motif en arrière-plan discret
opacité ~8–12 %, pas le logo officiel) + le **splash screen** Android
(`android/app/src/main/res/`, S8.0). **Test**
(`apps/mobile/test/shell-tab-bar-wiring.test.ts` + un test du logo à part) :
`TABS` = 4 ; la règle de prefix `/discovery/*`, `/focus/*` active le bon
onglet ; la page Agent n'a PAS de barre (le Shell la masque sur `/agent*`) ;
le composant `AuroraLogoHeader` (nouveau, dans `apps/mobile/src/components/`)
rend le logo officiel à côté du titre ; l'état vide de chaque page rend le
motif monochrome en arrière-plan discret (test de wiring : le composant
`AuroraEmptyBackdrop` monte l'image `assets/aurora_icon_a_integre_dans_l'
applciation.png` avec une opacité ~8–12 %, PAS le logo officiel).

Critère de sortie S1 : Ask lecture-seule testé ; menu latéral + barre 4
entrées ; l'orbe Aurora montée dans l'état vide du chat (couleur dynamique,
test de wiring) ; le logo officiel dans le header de chaque page + le motif
monochrome dans les états vides (tests) ; saisie avec puces de
mode/recherche/auto ; test de wiring vert.

---

## S2 — Capacités (M) — écrans 4, 5, 5bis–5sexies

**M-21 Réflexion + modèle typés (écran 4)** : puce Auto → feuille
« Réflexion et modèle » : 3 niveaux (Rapide/Équilibré par défaut/Approfondi)
+ paliers (Léger/Standard/Avancé, Auto par défaut, Q12). **Contrainte ADR
§6** : le niveau + le palier sont des **paramètres typés du profil de tâche**
(`taskProfile.thinkingLevel`, un nouveau champ `modelTier`), soumis à la
politique + budget IA — JAMAIS des mots-clés dans le prompt. **Test**
(`packages/agent/test/tools.test.ts` ou le test du router) : le routeur
consomme `thinkingLevel` + `modelTier` typés ; en Auto c'est le routeur qui
décide. (La page envoie déjà `thinkingLevel` ; on ajoute `modelTier` + le
mapping des 3 paliers.)

**M-22 Skills indexés dans le chat (écrans 5, 5bis)** : les skills actifs
(`user_skills` activés) sont **indexés** : l'agent choisit le bon selon la
demande, ou l'utilisatrice l'appelle avec `/`. Texte d'aide du composer
invite à taper `/` (11.3). **Test** : un skill installé+activé apparaît dans
l'indexation que le router/`skill_get` utilise ; l'appel `/nom` résout le
skill exact. (Le sous-menu « Skills installés » du menu + : liste,
interrupteur, étiquette *Indexé* ; « Gérer » / « Parcourir ».)

**M-23 Page Skills v2 (écrans 5ter, 5quater, 5quinquies)** : bibliothèque en
**cartes 2 par ligne** (icône, titre gras, description, état
Indexé/Non indexé/Perso) ; le détail (description, « quand l'utiliser » =
l'indexation, instructions, outils, appel `/nom`) ; **Modifier** + **Désinstaller**
post-install ; « + Créer » (nom, quand l'utiliser, instructions, outils
autorisés). C'est la page `pages/skills/index.tsx` existante (3 onglets) à
remonter au design v2 (cartes 2/ligne). **Test du wiring**
(`apps/mobile/test/skills-wiring.test.ts`) : le détail + la création
émettent les commandes de skill (`skill_update`, `skill_create`, `skill_delete`
destructive+confirmation) — JAMAIS une write directe (AD-7).

Critère de sortie S2 : réflexion/modèle typés (pas de mots-clés) ; skills
indexés + appel `/` ; bibliothèque de skills au design v2 ; tests verts.

---

## S3 — Intégrations (L) — écran 7

**Règle logo (gelée S3) : les intégrations s'affichent avec le LOGO de l'app
concernée — jamais d'icône hardcodée.** Source du logo :
- SSoT : la métadonnée du toolkit Composio — le champ `image_url` (ou `logo`)
  du toolkit, lu au runtime via le nouveau verb **`browse_integrations`**
  (voir M-34) : chaque ligne du catalog = `{ app (toolkit_slug), name,
  logoUrl, defaultOn? }`.
- Fallback strict : si `logoUrl` est absent/`null` OU si l'image échoue à
  charger (`onError`), afficher une pastille initiale (les 2 premières
  lettres de `name`, fond `#EAF0FF`, texte `#2F5BEA`) — jamais un
  `lucide` brand icon, jamais un asset local par app.
- **Interdiction** : tout asset `assets/*logo*.png` par app intégration,
  toute table statique `app → icône lucide` hardcodée. Le statique existe
  UNIQUEMENT pour le preset par défaut (noms + `defaultOn`, ci-dessous) —
  les logos viennent TOUJOURS du live catalog.

**M-31 Page Intégrations v2 (écran 7)** :
- **Section « Recommandées » (le preset par défaut, SSoT
  `INTEGRATION_CATALOG` de `pages/integrations/data.ts`)** : TOUT le Google
  Workspace — Gmail, Google Calendar (Agenda, 1ᵉʳ branché M-33), Google
  Docs, Google Drive, Google Sheets, Google Slides — + une courte liste
  prod : Notion, Slack, GitHub (le reste est accessible via M-34,
  jamais par ce preset).
- **Section « Connectées »** : les comptes live `state === 'connected'`
  ( lus `listAccounts()`, AD-3 — jamais depuis l'appareil ) ; chaque ligne
  mène aux PERMISSIONS du service.
- **Section « Parcourir les intégrations » (M-34)** : une recherche
  (input, filtrage live local sur le catalog `browse_integrations` +
  bouton « Recharger » si le client EF est live) sur le CATALOG COMPLET
  Composio ; chaque résultat = `app + name + logoUrl` ; un CTA « Ajouter »
  par app → le verb `connect` (M-32, confirmation d'écriture identique) +
  l'app rejoint le catalog local ajouté par l'utilisateur (persistance
  `@capacitor/preferences`, clé `integrations.userAdded` — le preset par
  défaut reste immuable, seul cet ajout est persistant device-side ;
  AD-3 : aucun secret, jamais de liste de comptes sur l'appareil).
- rappel « chaque écriture demande confirmation » ; AD-3 (aucune clé sur
  l'appareil, auth serveur). C'est la page `pages/integrations/index.tsx`
  existante (Composio, `integrations-client.ts`) à restructurer
  (recommandées / connectées / parcourir + permissions par service, Q6).

**M-32 `IntegrationProvider` + confirmation d'écriture** : le port
`IntegrationProvider` (Composio, `packages/integrations`). **Test**
(`packages/integrations/test/`) : une **écriture** (agenda/docs) porte
`requiresConfirmation: true` (CONFIRMATION_REQUIRED, §12) ; la lecture est
sans confirmation ; une intégration absente dégrade (AD-1), ne plante pas.

**M-33 Google Agenda en 1ᵉʳ service** : le connecteur Google Agenda est le
premier branché (le socle Composio existe — `fn-integrations` +
`integrations-client.ts` ; ici on fiabilise le service + la confirmation
d'écriture). (Là où le budget le permet ; le reste des services est
configurable via M-34.)

**M-34 Verb `browse_integrations` sur `fn-integrations` (S3)** :
- `supabase/functions/fn-integrations/index.ts` : nouveau cas
  `switch (verb)` `browse_integrations` → `GET
  {baseUrl}/toolkits?limit=500` (l'endpoint public v3.1, NON par
  session : le catalog toolkits est global, pas par-utilisateur ; la
  session n'est requise que pour `tools`/`execute`) ; réponse
  `{ toolkits: Array<{ slug, name, image_url?, description? }> }`.
- `packages/integrations/src/composio.ts` : nouveau method
  `listToolkits(opts?: { limit?: number }): Promise<Toolkit[]>` + le type
  `Toolkit { app: string; name: string; logoUrl?: string;
  description?: string }` (le mapping `slug → app`, `name`, `image_url →
  logoUrl` — le champ s'appelle exactement `image_url` dans la réponse
  Composio v3.1 ; le fallback pastille initiale gère le cas absent).
- L'EF retourne le catalog BRUT (pas le parse) quand non configuré :
  `browse_integrations` ne dépend PAS de la session (le `toolkits`
  endpoint est un list global) → il marche même si le preset
  `defaultOn` seul est affiché à l'app quand l'EF est 503 (dégradé
  AD-1 : le SSoT statique du M-31, sans logos, reste l'arrière-plan —
  l'app ne plante jamais sur une liste de catalog).
- **Test** (`packages/integrations/test/composio.test.ts` ou nouveau
  `toolkits.test.ts`) : `listToolkits()` map `image_url → logoUrl`,
  renvoie `[]` quand unconfigured ; le EF verb `browse_integrations`
  retourne 503 quand `COMPOSIO_API_KEY` est absent (pas un crash), et
  retourne le parsed catalog quand configuré (testEF avec un
  `baseUrl` pointant un `http.createServer` mock, comme le testEF
  existant).

Critère de sortie S3 : page v2 (recommandées = Google Workspace entier +
prod, connectées, parcourir/recherche + « Ajouter », permissions) ; **chaque
ligne du catalog porte le LOGO live (pas un asset hardcodé, pastille
initiale seulement en fallback strict)** ; écriture TOUJOURS confirmée,
lecture non ; dégradée proprement si le service est absent ; Google Agenda
branché.

---

## S4 — Veille / Discovery (L) — écrans 12 à 15  ⭐ le cœur du lot

**M-41 (v1 M1) — Writer du module Integrations (G1/G2/G3)**
`packages/integrations/src/automation-writer.ts`
- **Test d'abord** (`packages/integrations/test/automation-writer.test.ts`) :
  `applyAutomationCommand(cmd, writer)` applique sur le writer injecté :
  `integrations.automation_create` → INSERT ; `..._update` → PATCH (verrouiller
  = `enabled:false`, gel G2 réversible) ; `..._delete` → DELETE **+ archiver le
  vault** (gel G2 : le vault est ARCHIVÉ, pas détruit). Zéro write depuis le
  kernel ni l'app.
- **Implémenter** : le port `AutomationWriter` (insert/patch/delete par
  id+userId, borné RLS) + l'application de la commande. **Ce module est le
  SEUL qui écrit `automations`** (AD-7).

**M-42 (v1 M2) — Matérialiseur (AD-8)**
`packages/integrations/src/automation-scheduler.ts` + verb
`materialize_due_automations` dans `fn-integrations` (service_role)
- **Test** (`automation-scheduler.test.ts`) : une `automation` due
  (`trigger:'schedule'`, cron satisfait, non déjà matérialisée cette minute)
  produit UN job `research` de `job_queue` avec le payload EXACT du handler
  (`module:'discovery'`, `op:'multi-source'`, `discoverySheet:true`,
  `vaultDomaine`, `channelId`, `query:{topic,domains}`) → run « avec mémoire ».
  **Idempotence** : `dedupKey = kind|automationId|minute` (déjà exposé par
  `automations.ts`) ; re-dispatch = no-op. Les triggers `event`/`condition`
  ne se matérialisent PAS par le cron (MVP = schedule, D1). Le module EST
  autorisé à enfileter (seul le dispatcher ne le fait pas). Migration additif
  si `last_run_at`/`next_due_at` requises (MCP supabase, bloc par bloc).

**M-43 (v1 M3) — Run avec mémoire + verdict du delta**
`packages/discovery/src/{vault,jobs}.ts`
- **Test** (`vault.test.ts`) : le critère gelé 14/10 — `dedupeAgainstVault`
  ne garde que le delta (scénario Eurocode 7 : run N+1 avec mémoire = 2
  recherches, ~0–10 % doublons ; sans mémoire = 15–20+, 80–100 %). Le
  **verdict** = `fct(delta)` (pas le 1.0/0 figé) ; le flag `uncertain`
  AD-16b n'est **jamais** retiré. Mesuré sur les **10 scénarios** du doc
  gelé.
- **Implémenter** : la dédup par le vault dans `buildVaultRunManifest`
  (remplacer « count all items ») + le verdict dérivé du delta.

**M-44 (v1 M4) — Rapport de veille + menu des sources (écrans 13, 14)**
`apps/mobile/src/pages/discovery/rapport.tsx` (route `/discovery/:id`) +
`components/veille/{rapport-md,sources-sheet}.tsx`
- **Test** (`apps/mobile/test/discovery-rapport-wiring.test.ts`) : la route
  existe ; `parseVaultSections(md)` → sections + renvois `[n]` ;
  `filterSources(sources,'Toutes|Haute|Moyenne|Ce mois-ci')` ; le bouton
  « Sources · N » ouvre la feuille (dialog, 44px, a11y).
- **Implémenter** : le rapport rédigé (chapeau + sections, renvois `[n]`
  **cliquables**, bandeau « lecture seule », bouton « Sources · N ») ; la
  feuille des sources (filtres, crédibilité, ouverture, « Copier les
  références »). Le rendu markdown réutilise le `marked` sécurisé de
  `VaultMdView` (AD-16b : HTML brut neutralisé). **Lecture hors ligne**
  (miroir PowerSync) ; état vide = « 1er run en attente ».

**M-45 (v1 M5) — Création manuelle (écran 15, plan B)**
`apps/mobile/src/pages/discovery/creation.tsx` (route `/discovery/nouveau`)
- **Test** (`discovery-create-wiring.test.ts`) : `buildVeilleCreatePayload(form)`
  → la commande G1 EXACTE (`integrations.automation_create`, trigger
  `schedule`, cron de cadence+heure, `jobKind:'research'`, action=sujet,
  userId) ; le submit valide (Nom + Sujet requis) + **émet la commande**
  (appliquée par le writer M-41) ; retour liste → carte en « 1er run en
  attente ». Variants Réactif/Conditionnel = stub honnête (Q6, lot suivant).
- **Implémenter** : le formulaire (nom, sujet, déclencheur [Planifié par
  défaut Q1], cadence jour/semaine/mois/trimestre, jour+heure, familles de
  sources, push). **L'app n'écrir JAMAIS `automations` elle-même** (AD-7).

**M-46 — Carte de liste (écran 12) au design v2** : en-tête coloré (titre
gras + sous-titre type/cadence) + 3 infos (sources+delta, date dernière
veille, pertinence) + menu 3 pts **dans l'en-tête**. Ajuster
`pages/discovery/card.tsx` (actuellement un `AuroraCard variant object` avec
le menu dans le corps).

Critère de sortie S4 : US-7/US-8 ; une veille créée (chat OU form) tourne,
cherche le **delta** (≤20 % doublons gelé), produit un rapport lisible +
sources ; le run reste single-writer ; chaque affirmation a un `[n]` ; le
flag `uncertain` visible ; 5 états ; **validé sur les 10 scénarios gelés**.

---

## S5 — Focus (M) — écrans 8 à 11

Le focus **session** (minuteur Pomodoro/chrono + blocklist) EXISTE
(`pages/focus/index.tsx` + `packages/focus`). Le v2 ajoute les **profils** +
les **tâches minimales** + le lancement depuis la liste.

**M-51 Profils de focus (écran 9)** : titre, **méthode** (Pomodoro /
chronomètre), durées (travail/pause/sessions), tâche assignée facultative
(Q11 : modèle minimal, titre/état/profil), option « Afficher sur la page
Focus ». **Test** : le profil crée une row (le writer de focus —
`packages/focus` ou `productivity`) ; le lancement démarre le mode focus du
profil (`packages/focus` `FocusControllerService`).

**M-52 Page Focus v2 (écran 8)** : cartes de profils (bouton **Lancer**) +
liste de tâches simples (« + Ajouter », chaque tâche un ▶ qui lance le focus
**sur cette tâche** avec son profil) + assigner une tâche (depuis le profil
OU depuis la tâche « Choisir » un profil) + la tâche en cours affichée dans
le minuteur. **Sessions locales** (offline possible — le minuteur est
déjà local/AD-7).

**M-53 Écrans de minuteurs (10, 11)** : Pomodoro (anneau, « session n sur 4 »,
Pause/Terminer) ; chronomètre (temps écoulé, Tour/Pause/Terminer, Q8 validé).
Revoir le design v2 des écrans de session existants.

**Test** (`apps/mobile/test/focus-wiring.test.ts`) : un profil + une tâche
minimale créés ; le lancement démarre la session ; la tâche s'affiche dans le
minuteur. (Les minuteurs eux-mêmes existent — le test couvre les profils +
l'assignation.)

Critère de sortie S5 : US-11/US-13/US-14 ; un profil + une tâche simple ;
lancement en un geste depuis la page Focus ; sessions locales offline ;
le modèle de tâche reste compatible `productivity.tasks` (Q11).

---

## S6 — Miroir (L) — écran 3

**L'outil `mirror_analyze` (job `agent_run`) + le service
`detectMirrorFindings` EXISTENT** (`packages/learning/src/mirror-cognitive.ts` :
`MirrorFinding { kind: gap|contradiction|error, claimText, resolution,
confidence }`). Ce sprint construit l'**écran + la boucle de validation**.

**M-61 Lire le contrat (déjà au S0/Q4)** : valider §21 (détections typées,
format de reformulation, lien Progress). **M-62 Écran Miroir (écran 3)** :
flux du briefing §5.2 (reprendre dans le chat, PAS un nouvel écran principal) :
1. carte « Expliquez ce que vous avez appris » ; 2. choix du sujet (défaut =
dernier cours / dernière veille, bouton « Changer ») ; 3. explication
(texte/dictée) ; 4. job `mirror-analysis` ; 5. retour structuré :
**Ce que j'ai compris** (reformulation) / **Lacunes détectées** (étiquettes
`Manquant`/`Fragile` + source, AD-11) / **Question pour vous** (relance
ciblée) ; 6. actions « Planifier un Focus » (sur la lacune) / « Créer une
veille » ; 7. **Preuves : ne deviennent des preuves qu'APRÈS validation**
(F-07 : l'agent propose, l'utilisatrice valide, **Progress** est le
producteur unique de `ProgressEvidenceCreated`). **Le chat ne fait QUE
proposer.**

**M-63 Validation → preuve Progress (F-07)** : **Test**
(`packages/agent/test/` ou `packages/progress/test/`) : une détection Miroir
n'écrit AUCUNE preuve tant qu'elle n'est pas validée ; après validation, c'est
**Progress** qui écrit la preuve (pas l'agent, AD-2/F-07). Le flag d'origine
(AD-11) est conservé sur la détection.

Critère de sortie S6 : US-9/US-10 ; le flux Miroir dans le chat ; les
détections typées + provenance ; la validation crée une preuve **via
Progress** (l'agent ne la crée pas) ; les actions Focus/veille s'ouvrent.

---

## S7 — Finitions (M)

**M-71 Suppression de veille confirmée (G3)** : `delete_automation`
(destructive) → confirmation obligatoire (ADR §5) ; après confirmation la row
disparaît **ET le vault est ARCHIVÉ** (gel G2, M-41). Le menu 3 pts de la
carte émet déjà l'intent ; on ajoute l'écran de confirmation destructive.
**Test** : `delete_automation` sans confirmation = rejet ; avec = row
supprimée + vault archivé.

**M-72 Push fin de run** : le `notification_job` produit par
`runVeillePipeline` (M-43) est appliqué par `fn-notifications` (OneSignal
REST v2, serveur). **Test** : le payload porte le flag `uncertain` AD-16b ;
si le secret OneSignal manque → `delivered:false, reason:'onesignal_not_configured'`
(dégradation AD-1, jamais une panne).

**M-73 La carte « À confirmer » du créneau (le S4 de v1, M7)** : quand le
mode Agent propose un créneau de révision (`calendar.schedule` =
`productivity.event_update`, CONFIRMATION_REQUIRED), la page Agent doit
afficher **Confirmer / Modifier / Refuser** et renvoyer `decisions[]` +
`resumeFrom` au kernel (le `fn-agent-run` les supporte ; **l'app ne les
envoie jamais aujourd'hui** — c'est le trou). **Test**
(`apps/mobile/test/agent-confirmation-wiring.test.ts`) : Confirmer renvoie
`{stepId, answer:'confirmed', stepHash}` (stepHash FNV-1a, déjà stampé par le
kernel) ; Modifier/Refuser n'auto-confirment JAMAIS (le kernel re-prompte) ;
l'app ne crée JAMAIS l'event elle-même (AD-7 : le module Productivity
applique). **Le module créneaux = le bloc Intégrations/Focus, pas la page.**

**M-74 Les 5 états par écran** : chargement / vide / succès / erreur /
hors-ligne sur CHAQUE écran (le pattern `UxStates` est déjà utilisé sur
`/discovery` + le chat). Priorités du briefing §16 : chat vide, run en cours,
intégration en erreur.

**M-75 E2E + RLS** : parcours A (créer par le chat), B (créer à la main),
C (lire + confirmer un créneau), D (supprimer confirmée) + le Miroir (valider
une preuve) + Focus (lancer un profil). **RLS live** : user A ne lit PAS les
`automations` / `discovery_vault` de user B (`SET ROLE authenticated` +
claims — le TODO wave 1 de la règle supabase-mcp). **Gates** :
`pnpm typecheck` (0 erreur) + `pnpm test` + `check-rls.sh` +
`check-boundaries.sh all` + `check-view-joins.ts`.

Critère de sortie S7 : US-12 ; G3 destructive confirmée + vault archivé ;
push fin de run (dégradé proprement) ; la carte « À confirmer » ; les 5 états
sur chaque écran ; E2E A–D + Miroir + Focus ; RLS ; le lot A purgée est la
baseline de référence.

---

## S8 — Self-updater APK (M, indépendant) — Mission 2026-10-17 (distrib. hors Play Store)

L'application est distribuée hors Play Store : l'utilisateur télécharge un
APK brut depuis le web, l'installe, puis l'app détecte elle-même les
nouvelles versions sur **GitHub Releases**, les télécharge et les installe.

**Prérequis S8.0 (avant toute tâche)** : le projet Android natif
**N'EXISTE PAS** dans le repo (pas de dossier `apps/mobile/android/`, pas de
`MainActivity`). Générer d'abord :
```
cd apps/mobile
npx cap add android            # crée android/ + MainActivity.java
npx cap sync android          # sync le webDir dist
```
Ensuite, les étapes 1–8 de la mission (manifeste, plugin Java, pont
TypeScript, hook React, GitHub Actions, page de téléchargement) s'exécutent
dans l'ordre listé dans la mission.

**M-81 Étape 1 — Manifeste Android** : `android/app/src/main/AndroidManifest.xml`
— ajouter si absent : `INTERNET` + `REQUEST_INSTALL_PACKAGES` ; receiver
`.InstallResultReceiver` dans `<application>` (exported=false).

**M-82 Étape 2 — Plugin natif Java** :
`android/app/src/main/java/<package>/ApkUpdaterPlugin.java`
+ `InstallResultReceiver.java` + enregistrement dans `MainActivity.java`
(`registerPlugin` AVANT `super.onCreate`). Méthodes `@PluginMethod` :
`canInstall()`, `openInstallSettings()`, `download({url, sha256?})` (thread
séparé, `HttpURLConnection` HTTPS-only, SHA-256 pendant lecture, événement
`downloadProgress`), `install()` (PackageInstaller, sessions,
`setRequireUserAction` API 31+, `setRequestUpdateOwnership` API 34+).

**M-83 Étape 3 — Pont TypeScript** : `apps/mobile/src/updater/apkUpdater.ts`
— `registerPlugin<ApkUpdaterPlugin>('ApkUpdater')` (l'interface exacte de la
mission).

**M-84 Étape 4 — Vérification de version** :
`apps/mobile/src/updater/checkForUpdate.ts` — `fetch` GitHub API
`releases/latest`, header `Accept: application/vnd.github+json`, comparaison
numérique de versions (pas chaîne), asset exact `APK_ASSET_NAME`, SHA-256 de
`digest`, 6 h de cache (`@capacitor/preferences`), `Capacitor.getPlatform()
=== 'android'` seulement, try/catch global (jamais de planter l'app).
Installer `@capacitor/app` + `@capacitor/preferences` si absents.

**M-85 Étape 5 — Hook + interface React** :
`apps/mobile/src/updater/useUpdater.ts` (état `idle|checking|available|
downloading|readyToInstall|error`, `waitingPermission`, progression) ;
`UpdateDialog.tsx` (`IonAlert`/`IonModal` : version + changelog + boutons
« Mettre à jour »/« Plus tard », `IonProgressBar`) ; intégration au
démarrage (après PowerSync/Supabase, sans la bloquer) ; bouton
« Rechercher une mise à jour » dans la page Réglages.

**M-86 Étape 6 — build.gradle** : `versionCode` + `versionName` définis ;
`signingConfigs.release` lisant `KEYSTORE_PATH`/`KEYSTORE_PASSWORD`/
`KEY_ALIAS`/`KEY_PASSWORD` depuis `System.getenv(...)` (valeurs par défaut
vides — le build debug local continue de fonctionner) ; **ne pas modifier
l'applicationId** (`com.aurora.mobile`).

**M-87 Étape 7 — GitHub Actions + secrets** : `.github/workflows/release-apk.yml`
(nouveau workflow, NE PAS toucher `release.yml` existant qui gère le release
pipeline ERYNIS). Trigger push tag `v*`, workflow adapté à pnpm
(`corepack pnpm install` + `pnpm build:web` dans `apps/mobile`), `npx cap
sync android`, decode du keystore, `./gradlew assembleRelease`, upload de
`app-release.apk` à GitHub Releases.

**M-87b Secrets GitHub (CRÉER AVANT le 1ᵉʳ build CI)** : aucun secret n'a été
créé à ce jour pour ce repo (vérification 2026-10-17). Les 4 secrets
requise du workflow `release-apk.yml` doivent être posés via le **CLI
`gh`** (auth requis : `gh auth login` ou un `GH_TOKEN`) — **jamais via le
code, jamais commités** :

```bash
# Générer le keystore localement (une seule fois, hors du repo) :
keytool -genkey -v -keystore release.keystore -alias aurora \
  -keyalg RSA -keysize 2048 -validity 10000

# Poser les 4 secrets sur le dépôt ciblé :
gh secret set KEYSTORE_BASE64   --body-files <(echo $(base64 -w 0 release.keystore))
# (Windows : base64 -b0 release.keystore > release.keystore.b64 puis
#  gh secret set KEYSTORE_BASE64 --body-files release.keystore.b64)
gh secret set KEYSTORE_PASSWORD  "votre-mot-de-passe-keystore"
gh secret set KEY_ALIAS          "aurora"
gh secret set KEY_PASSWORD       "votre-mot-de-passe-alias"

# Vérifier (sans afficher les valeurs) :
gh secret list
```
> Le keystore **n'existe nulle part encore** : à générer (1ᵉʳ étape ci-dessus)
> et à conserver hors du repo (jamais commité, jamais dans `env.local`).
> Le workflow lit les secrets via `secrets.KEYSTORE_BASE64` (decode dans le
> CI, jamais sur la machine de l'utilisateur).

> **État au 2026-10-18** : les 4 secrets `gh secret set` **ne sont PAS
> encore posés** (le workflow `.github/workflows/release-apk.yml` a été
> ajouté au S8 mais le lead n'a pas encore lancé les commandes ci-dessus).
> C'est l'action manuelle 2/2 du checkpoint final du lot (voir le plan
> L765–779 « Règle de déploiement PowerSync » + le checkpoint ci-dessous).

**M-88 Étape 8 — Page de téléchargement** :
`updater/download-page.html` (GitHub Pages, bouton + 3 lignes
d'instructions) — PAS dans `docs/` (qui est le dossier de plans du repo).

**Config S8** : `apps/mobile/src/updater/config.ts`
— `GITHUB_OWNER` / `GITHUB_REPO` : les valeurs réelles du dépôt (à renseigner
au S0, PAS des placeholders dans le code commité) ; `APK_ASSET_NAME =
"app-release.apk"`.

Critère de sortie S8 : le projet compile (web + Android) ; le plugin est
appelable depuis le JS ; au lancement Android, le dialogue n'apparaît que si
une version plus récente existe ; téléchargement avec progression + SHA-256 ;
installation via PackageInstaller (écran de confirmation système) ;
redirection « sources inconnues » si non autorisé, reprise au retour ;
sur web/iOS, le updater ne fait rien et ne génère aucune erreur ; **les 4
secrets GitHub sont posés via `gh secret set` avant le 1ᵉʳ run du
`release-apk.yml`**.

---

## Stratégie de tests (concrétisée par bloc)

- **Outils agent** (modèle `goal-capabilities.test.ts`, `packages/agent/test/`) :
  `automation.test.ts` (G1–G3 + dégradement de jobKind),
  `discovery-vault.test.ts` (G13 READ-ONLY), `tools.test.ts` ; à ajouter :
  le test Ask-lecture-seule (M-11), le test du skill indexé (M-22), le test
  du skill update/delete (M-23), le test Miroir-→-preuve (M-63), le test du
  créneau confirmation (M-73).
- **Run** : `packages/discovery/test/{vault,jobs}.test.ts` (M-43, taux de
  doublons avec/sans mémoire sur les 10 scénarios gelés).
- **Incertitude** : fournisseur absent → `uncertain`, produit intact (AD-1) —
  `packages/discovery` + `packages/integrations/research-provider`.
- **Sources** : chaque affirmation du rapport renvoie à ≥ 1 source (M-44).
- **Événements** : contrat `DiscoveryItemCreated`
  (`discoveryItemId,userId,topic,sources,createdAt`) ; `ProgressEvidenceCreated`
  (Miroir, F-07 : **Progress seul producteur**).
- **E2E Android** : parcours A–D + Miroir + Focus (M-75).
- **Accessibilité** : contraste (`#5B6475` ≥ 4.5:1), cibles 44 px, lecteur
  d'écran sur cartes + feuilles.
- **RLS** : isolation par user (M-75).

## Commandes de vérification (à chaque commit)

```
pnpm typecheck                                   # 0 erreur
pnpm test                                          # pnpm -r test (node:test)
sh scripts/check-rls.sh
sh scripts/check-boundaries.sh all
node --experimental-strip-types scripts/check-view-joins.ts
```
> **Règle Supabase (supabase-mcp.md)** : toute DDL (migration `0026_*`
> éventuelle, M-42/M-51) passe par le MCP `supabase` connecté à l'instance
> Aurora, bloc par bloc, en vérifiant les collisions de noms avant `CREATE`
> (schéma partagé, **additif**). `FORCE ROW LEVEL SECURITY` sur chaque table
> business ; aucune `USING (true)` sans justification `Rationale:`.

## Règle de déploiement PowerSync (à demander au lead avant tout déploiement)

**Si une tâche nécessite le déploiement d'un flux PowerSync sur l'instance
prod (relais PowerSync Cloud, relay.sql, service.yaml), le sous-agent ne le
fait JAMAIS seul** — il s'arrête et **demande la permission au lead** avant
de lancer tout déploiement de relais. Le lead connecte la CLI PowerSync au
compte et effectue le déploiement (l'opération reste un acte humain,
jamais automatisée par un sous-agent non autorisé). Les tâches qui
*peuvent* déclencher ce checkpoint : M-42 (migration `0026_*` éventuelle +
relais), M-44 (si un nouveau stream `discovery_vault` devait être exposé —
vérifier, le flux existe déjà, probablement rien à déployer), M-51 (profil
de focus, si une nouvelle vue de relais est requise — probablement rien à
déployer, les tables existantes sont déjà dans le relais). **Vérifier
toujours avant de planifier un déploiement** : le plus souvent, le flux
existant couvre le besoin (M-42/M-44/M-51 travaillent sur des tables
déjà relayées) ; le checkpoint « demander au lead » n'est déclenché que si
un **nouveau** flux ou une **modification** d'un flux existant est
matériellement nécessaire.

**Processus de reproduction des écrans (dossier `stitch_design_system_optimization/`)**
: pour chaque écran du brief (S1–S7), **consulter d'abord** le dossier
correspondant de `stitch_design_system_optimization/` :

| Écran du brief | Dossier stitch |
|---|---|
| 1. Agent accueil | `agent_accueil_fraunces/` |
| 2. Agent mode Agent | `agent_mode_agent_fraunces/` |
| 3. Agent mode Miroir | `agent_mode_miroir_fraunces/` |
| 4. Réflexion/modèle | `agent_r_flexion_et_mod_le_fraunces/` |
| 5/5bis/5ter/5quater/5quinquies/5sexies | `agent_menu_variante_2_pilules_ditoriales_contexte/` · `agent_skills_install_s_fraunces/` · `skills_biblioth_que_fraunces/` · `skill_d_tail_fraunces/` · `skill_cr_er_modifier_fraunces/` · `agent_r_flexion_et_mod_le_fraunces/` |
| 6. Menu latéral | `agent_menu_lat_ral_fraunces/` |
| 12. Discovery programmes | `discovery_cartes_fiches_ditoriales_a_r_es_statut/` |
| 13. Rapport de veille | `discovery_rapport_de_veille_pr_cision_fraunces/` |
| 14. Menu des sources | `discovery_menu_des_sources_pr_cision_fraunces/` |
| 15. Création manuelle | `veille_cr_ation_manuelle_fraunces/` |
| 8. Focus profils+tâches | `focus_profils_et_t_ches_pr_cision_fraunces/` |
| 9. Nouveau profil | `focus_nouveau_profil_pr_cision_fraunces/` |
| 10. Pomodoro en cours | `focus_pomodoro_en_cours_pr_cision_fraunces/` |
| 11. Chronomètre en cours | `focus_chronom_tre_en_cours_pr_cision_fraunces/` |
| 7. Intégrations | **Aucun dossier stitch dédié** — construire d'après la page existante (`pages/integrations/index.tsx`) + le briefing §8, **pas d'invention de design** |

Chaque dossier contient un `code.html` (code Tailwind CDN source) + un
`screen.png` (rendu visuel de référence). **Protocole strict pour chaque
écran S1–S7** :
1. **Lire le `code.html` correspondant en entier** — c'est la source de
   vérité des classes/layout (pas un design à inventer, à REPRODUIRE).
2. **Ouvrir le `screen.png` correspondant** comme référence visuelle pour
   vérifier le rendu attendu (espacement, typographie, couleurs) avant de
   coder.
3. **Transcrire la structure du HTML en React/Ionic** (`packages/ui` si un
   composant correspond, sinon le JSX de la page mobile) — **ne JAMAIS
   inventer** une variante de layout / une couleur / une icône qui ne
   figure pas dans le `code.html` + le `screen.png` de l'écran concerné.
4. Si le `code.html` utilise une classe/utilitaire qui n'existe pas dans
   le design system de l'app (`--aurora-*`, `@aurora/ui`), le mapper sur le
   composant/utilitaire équivalent existant (ne PAS dupliquer de
   librairie) — signaler l'écart dans le rapport de la tâche, ne le
   combler pas en inventant.
5. Le fichier `technical_calm_monochrome/DESIGN.md` (tokens legacy,
   `primary: #006194`) **est obsolète** par rapport au visuel v2 du
   briefing (`#FFFFFF` + `#2F5BEA`) : ne **pas** s'en inspirer pour les
   couleurs — les couleurs viennent du `code.html` de chaque écran
   (qui utilise la palette v2 du canvas Stitch), la structure/le layout
   viennent du `code.html` (source de vérité pour la structure).

**Règle d'icônes (lucide-react)** : les `code.html` de Stitch utilisent des
SVG inline (icônes 4-points, sliders, etc.). En production, **ne pas
dupliquer ces SVG inline** — les mapper sur les équivalents de
`lucide-react` (déjà utilisé dans `apps/mobile/src`, cf.
`pages/agent/index.tsx`). Quand un SVG de Stitch n'a pas d'équivalent
lucide exact, utiliser le composant `@untitledui/icons` correspondant ou
créer un composant d'icône local dans `packages/ui` — **signaler l'écart
dans le rapport de tâche**, ne pas commiter de SVG ad hoc dans le code de
page. Toutes les icônes : `strokeWidth: 2`, `strokeLinecap: round`,
`strokeLinejoin: round` (la règle du `code.html`), et une taille multiple
de 4 (`size-4`, `size-5`, `size-6` — jamais de taille impaire).

**Règle de logo (le dossier `assets/`, à brancher sur chaque écran)** :
le dossier `assets/` contient 4 fichiers, à utiliser selon leur rôle
précisément (ne pas les mélanger) :

| Fichier | Rôle dans l'app | Où l'utiliser |
|---|---|---|
| `assets/aurora_logo_icon_d'affichage_l'applicaiton.png` | **Le logo officiel de l'app** (l'icône à plat, fond blanc arrondi) | Le **header de page** (à côté du titre, ~24–32 px) et l'icône d'application Android (à copier dans `android/app/src/main/res/`) |
| `assets/aurora_icon_a_integre_dans_l'applciation.png` | **L'icône monochrome intégrée** (le motif seul, sans fond de logo) | Le **splash screen** et les **pages en fond vide** (arrière-plan discret, opacité ~8–12 % — jamais le logo plat officiel ici) |
| `assets/vs_monochrome_en_svg.svg` | Le motif vectoriel (source du PNG monochrome) | À la place du PNG quand une couleur/souffle dynamique est requise — notamment dans le composant `AuroraOrb` ci-dessous |

**Le composant « orbe Aurora » (état vide du chat, Stitch `agent_accueil_fraunces`)** :
le bloc `aurora-orb` du `code.html` Stitch (un cercle radial-gradient avec
deux « yeux » pillules verticales blanches) est **à convertir en composant
React `AuroraOrb`** (`packages/ui/src/components/ui/aurora-orb.tsx` si il
est partagé, sinon `apps/mobile/src/components/AuroraOrb.tsx`) — **ce
n'est PAS un design à ignorer, c'est un composant à reproduire et à
RANGER** :
- **Couleur DYNAMIQUE (jamais codée en dur)** : le `code.html` Stitch
  codé `radial-gradient(circle at 35% 30%, #93c5fd 0%, #3b82f6 45%,
  #2563eb 80%, #1d4ed8 100%)` en dur. **Dans le composant React, ne PAS
  dupliquer ces hex** — l'orbe doit lire les tokens de thème en vigueur :
  ```css
  background: radial-gradient(circle at 35% 30%,
    var(--aurora-accent-secondary) 0%,
    var(--aurora-accent-primary) 60%,
    var(--aurora-accent-punctual) 100%);
  ```
  Les tokens `--aurora-accent-primary` / `--aurora-accent-secondary` /
  `--aurora-accent-punctual` (déjà dans `apps/mobile/src/styles/tokens.css`,
  pilotés par le sélecteur de thème `packages/ui` — AD-17, 10 thèmes + 3
  presets) **changent avec le thème actif** : si l'utilisatrice passe de
  « Aurora » (bleu) à un thème rose, l'orbe suit automatiquement — zéro
  code à modifier. Les deux « yeux » (pillules blanches verticales)
  restent en `var(--aurora-accent-on-primary)` (par défaut `#FFFFFF`).
- **Test** (`packages/ui/test/aurora-orb.test.ts` ou
  `apps/mobile/test/aurora-orb-wiring.test.ts`) : le composant rend le
  `radial-gradient` avec les variables CSS (pas de hex codés en dur —
  vérifier que le CSS rendu ne contient AUCUN `#` de couleur hardcodée,
  uniquement des `var(--aurora-*)`), les deux yeux sont rendus, et le
  composant est mountable dans la page d'accueil du chat (l'état vide
  `data-state="empty"` du transcript, cf. `pages/agent/index.tsx`).

**Règle de test par composant** : chaque tâche qui implémente un écran
ou un sous-élément de `stitch_design_system_optimization` doit **toujours
inclure un test** (wiring React/Ionic dans `apps/mobile/test/`, test du
comportement dans le package concerné) qui couvre le composant concerné —
conforme à la « règle de réalité » (mécanisme + permission + composant +
comportement + limites + tests). Un composant reproduit du HTML Stitch
**sans test = tâche incomplète** (ne pas cocher).

---

## Visuel (le §11.4, à brancher sur les écrans)

Blanc **`#FFFFFF`** (plus de gris de fond) + filets **`#E4E7EF`** ; un seul
bleu **`#2F5BEA`** (boutons/icônes/actifs), teinte `#EAF0FF` (puces actives) ;
messages utilisateur en `#F1F2F4` **jamais bleus** ; texte `#14181F` /
secondaire `#5B6475` ; Inter (+ JetBrains Mono pour les valeurs) ; ambre
`#9A6700` réservé à « incertain / lacune » ; information JAMAIS portée par la
couleur seule ; feuille de style `aurora.css` partagée. (La palette v2 diffère
du canvas actuel — S0 valide ; les tokens passent par `packages/ui`.)

## Critères de qualité globaux (le « terminé » du lot, à respecter sur toute tâche)

Critères **d'acceptation fonctionnelle** (le briefing §14, applicables à
tout le MVP, pas seulement Discovery) :
- La page Agent n'a **aucune** barre de navigation (sortie par le menu
  latéral) ; les autres pages ont la barre 4 entrées.
- Fond `#FFFFFF` partout, un seul bleu `#2F5BEA`.
- Les modes Ask/Agent/Miroir : Ask n'émet AUCUNE écriture ; Agent respecte
  les confirmations ; Miroir ne crée PAS de preuve sans validation
  (F-07).
- Les niveaux de réflexion + paliers de modèle sont des **paramètres
  typés** du profil de tâche (test du routeur), jamais des mots-clés.
- Les capacités sont activables depuis chaque mode ; l'état est conservé.
- Les écritures d'intégrations sont TOUJOURS confirmées ; une
  déconnexion révoque l'accès.
- Les doublons de run avec mémoire ≤ 20 % (gelé 14/10).
- La suppression d'une veille est TOUJOURS confirmée (G3).
- Hors ligne : rapport + focus lisibles ; les actions réseau affichent un
  message clair (pas de crash).
- Accessibilité : contraste (`#5B6475` ≥ 4,5:1), cibles tactiles 44 px,
  lecteur d'écran fonctionnel sur les cartes et les feuilles.

Critères **de qualité technique** (la « règle de réalité » de
`AI_RULES.md`, applicable à chaque tâche M-xx) :
- **Mécanisme** : le code implémenté fonctionne de bout en bout
  (pas un stub qui compile mais ne s'appelle jamais).
- **Permission** : le scope RLS / le registre de capability / le flag
  `requiresConfirmation` correspondant est vérifié (testé) pour la
  mutation concernée — pas seulement le code d'appel.
- **Composant** : le composant UI implémenté est rattaché à une route
  existante ou une route créée dans la même tâche (pas de composant
  orphelin dans `src/`).
- **Comportement** : au moins 1 test unitaire/cas de wiring vérifie le
  comportement attendu (test d'abord, TDD — le test FAIL avant l'implémentation).
- **Limites** : les cas limites (vide, dégradation AD-1, offline,
  fournisseur absent, run sans vault) sont couverts dans le test, pas
  seulement le cas nominal.
- **Tests** : `pnpm typecheck` (0 erreur) + le test du package +
  `pnpm test` passent AVANT le commit ; les 5 états UX (si c'est une
  tâche UI) sont couverts, pas seulement l'état succès.

**Antipattern à signaler** (la tâche ne peut PAS être cochée si) :
- Un composant écrit mais jamais rendu sur une route testable.
- Un test qui passe sans jamais avoir FAILé avant l'implémentation.
- Une mutation de table qui contourne le thin-emitter AD-7 (write
  directe depuis l'app ou le kernel).
- Un cas limite documenté (ex. « provider absent → uncertain ») qui
  n'a aucun test le couvrant.
- Un écart au design de référence `stitch_design_system_optimization/`
  (une variante de layout/couleur inventée) sans qu'il soit signalé dans
  le rapport de la tâche.

## Prochaines actions design (le §16 du briefing)

1. Les **5 états** de chaque écran (priorité : chat vide, run en cours,
   intégration en erreur) → M-74.
2. Détail d'une intégration (permissions par action) + ajout d'un skill →
   M-31 / M-23.
3. Confirmation de suppression d'une veille → M-71.
4. Variants **Réactif** et **Conditionnel** du formulaire (Q6, lot suivant).
5. Version sombre, plus tard.

---

## Annexe — l'ordre d'exécution recommandé (un sprint = un buildable)

Chaque tâche ci-dessus suit le même rythme **TDD 2–5 min** :
*écrire le test → le faire FAIL → implémenter le minimum → le faire PASS →
commit*. Un sous-agent frais par tâche (Subagent-Driven), review entre les
tâches. Les tâches d'un sprint dépendent de l'ordre listé ; S2 et S3
parallélisent ; S5 et S6 parallélisent. Ne JAMAIS cocher une tâche TickTick
avant que ses critères de sortie soient validés (mécanisme + permission +
composant + comportement + limites + tests).
