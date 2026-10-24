# Cartographie navigation ↔ modules ↔ personas (Phase 0, §10.2 item 10)

> **Ref:** `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §4.2 (9 sections), §3.2–3.6
> (5 personas), §3.7 (matrice personas × capacités) · `docs/architecture/status-register.md`.
> **Créé :** 2026-10-24 · **Commit de référence :** `bfaa298`.
> **Nature :** constat vérifié. La navigation **actuelle** est lue dans
> `apps/mobile/src/router.tsx` (38 routes) et `apps/mobile/src/shell/ShellTabBar.tsx`
> (barre d'onglets). La navigation **cible** est la §4.2 (9 sections).
> **Ce document ne code rien.** Il mesure l'écart et le rend franchissable par lots.

---

## 1. Navigation cible (réf. §4.2) — 9 sections

| # | Section (réf.) | Contenu prescrit |
|---|---|---|
| **A** | Accueil personnalisé | prochaines actions, projets, recommandations de la semaine, raccourcis selon persona |
| **B** | Projets / Workspaces | liste + recherche des initiatives, briefs, artefacts, versions |
| **C** | **Créer** | **entrée vers Design Space Pro**, puis les studios spécialisés |
| **D** | Apprendre | ressources, cours importés, fiches, flashcards, exercices, progression |
| **E** | Découvrir | recherche, dossiers d'exploration, lacunes, scénarios |
| **F** | S'organiser | inbox, tâches, calendrier, objectifs, habitudes, focus, projets, bilans |
| **G** | Connaissances | arborescence sémantique, ressources, sources, recherche |
| **H** | Bibliothèque / Artefacts | livrables, exports, aperçus pris en charge |
| **I** | Paramètres | profil, personnalisation, confidentialité, notifications, intégrations, préférences |

La référence précise elle-même (§4.2, dernier alinéa) : « Le nom final, la barre
latérale, le regroupement éventuel de certaines sections et la navigation compacte
doivent être testés sur des tâches réelles. » → **les noms et le regroupement ne sont
pas gelés**, le **périmètre** l'est.

---

## 2. Navigation actuelle — mesurée

### 2.1 Barre d'onglets (mobile, `ShellTabBar.tsx`)

**4 onglets** : `agent` · `discovery` · `focus` · `plus` (→ `/settings`).

> **Doc-lag vérifié :** `router.tsx` et `docs/mobile/navigation-and-page-composition.md`
> documentent **5 onglets** (`/home · /tasks · /learn · /progress · /agent`). Le code
> en déclare **4**, dont **aucun** n'est `/home`, `/tasks`, `/learn` ou `/progress`.
> La barre a donc divergé du SSoT qu'elle cite. Signalé, non réécrit (`AI_RULES.md` §2).

### 2.2 Les 38 routes (`router.tsx`)

`/` · `/home` · `/tasks` · `/tasks/:id` · `/learn` · `/learn/:id` · `/progress` ·
`/progress/:id` · `/agent` · `/agent/conversations` · `/agent/capacites` ·
`/agent/bibliotheque` · `/canvas/:id` · `/knowledge` · `/knowledge/:nodeId` ·
`/artifacts/:id` · `/inbox` · `/settings` · `/goals` · `/goals/:id` ·
`/goals/:id/features/:fid` · `/goals/:id/ascent` · `/focus` · `/calendar` · `/projects` ·
`/habits` · `/routines` · `/reviews` · `/retro` · `/countdown` · `/discovery` ·
`/discovery/nouveau` · `/discovery/:id` · `/skills` · `/integrations` · `/login` ·
`/onboarding` · `*`

---

## 3. Table de correspondance — route actuelle → section cible

| Route actuelle | Section cible (§4.2) | Module propriétaire | Statut module |
|---|---|---|---|
| `/home` | **A** Accueil | `ui/composites` + `productivity` | IMPLEMENTED |
| `/projects` | **B** Projets | `productivity` (0002) | IMPLEMENTED |
| — | **C** Créer | — | **MISSING** (Design Space Pro) |
| `/learn`, `/learn/:id` | **D** Apprendre | `learning` (0003) | IMPLEMENTED |
| `/skills` | **D** Apprendre | `skill_catalog`/`user_skills` (0019) + `fn-skills` | IMPLEMENTED |
| `/discovery`, `/discovery/nouveau`, `/discovery/:id` | **E** Découvrir | `discovery` (0006, 0025) | IMPLEMENTED |
| `/inbox` | **F** S'organiser | `productivity` | IMPLEMENTED |
| `/tasks`, `/tasks/:id` | **F** S'organiser | `productivity` (0013) | IMPLEMENTED |
| `/calendar` | **F** S'organiser | `productivity` (0002) | IMPLEMENTED |
| `/goals`, `/goals/:id` | **F** S'organiser | `productivity` (0002, 0017) | IMPLEMENTED |
| `/goals/:id/features/:fid` | **F** S'organiser | `workflows` | IMPLEMENTED |
| `/goals/:id/ascent` | **F** S'organiser | `ascent` (0016) | IMPLEMENTED |
| `/habits` | **F** S'organiser | `productivity` (0002) | IMPLEMENTED (drift `name`/`title`) |
| `/routines` | **F** S'organiser | `productivity` (0002) | IMPLEMENTED (drift `name`/`title`) |
| `/focus` | **F** S'organiser | `focus` (0027) | IMPLEMENTED |
| `/reviews` | **F** S'organiser | `progress` (0005) | PARTIAL (`reviews` = entité FSRS) |
| `/retro` | **F** S'organiser | — | **empty honnête** (aucune table de rétrospective) |
| `/countdown` | **F** S'organiser | — | **empty honnête** (aucune table) |
| `/knowledge`, `/knowledge/:nodeId` | **G** Connaissances | (0004) — **pas de package dédié** | PARTIAL |
| `/artifacts/:id` | **H** Bibliothèque | (0007) | PARTIAL |
| `/canvas/:id` | **H** Bibliothèque | `fn-canvas` (0022) | IMPLEMENTED |
| `/settings` | **I** Paramètres | `platform` + `domain/identity` | IMPLEMENTED |
| `/integrations` | **I** Paramètres | `integrations` (0008) + `fn-integrations` | IMPLEMENTED |
| `/agent`, `/agent/conversations`, `/agent/capacites`, `/agent/bibliotheque` | **transversal** (§3.7 : « capacité transversale ») | `agent` (0008) + `fn-agent-run` | IMPLEMENTED |
| `/progress`, `/progress/:id` | **transversal** (Learning + Progress) | `progress` (0005) | IMPLEMENTED |
| `/login`, `/onboarding`, `*` | **hors navigation** (portes) | `platform` | IMPLEMENTED |

**Total : 26 pages pour 9 sections cibles.** Aucune section cible n'est sans route
sauf **C (Créer)** — et c'est précisément l'écart C1 du registre de statut.

---

## 4. Les 5 personas ↔ sections (réf. §3.7)

| Persona (§3.2–3.6) | Sections prioritaires (§3.7) | Sections aujourd'hui servies |
|---|---|---|
| **A — Étudiant** | Productivité (très élevée), Learning (très élevée), Knowledge (élevée), Progress (très élevée) | A · B · D · F · G · transversal — ✅ |
| **B — Entrepreneur** | Productivité (très élevée), Discovery (très élevée), Knowledge (élevée), **Design Space** (marque/supports) | A · B · E · F · G — ⚠️ **C manquant** |
| **C — Autodidacte** | Learning, Knowledge (très élevées), Discovery (très élevée) | A · D · E · G — ✅ |
| **D — Entreprise** | Productivité, Knowledge, Discovery, **Design Space** (charte/production), Intégrations | A · B · E · F · G · I — ⚠️ **C manquant** |
| **E — Particulier** | Productivité (très élevée), **Design Space** (créations personnelles), reste « selon le besoin » | A · B · F — ⚠️ **C manquant** |

**Lecture :** 3 personas sur 5 (B, D, E) ont une section cible qui **n'existe pas**.
La personnalisation (§3.1, §4.2 « raccourcis selon persona ») n'a **aucune
implémentation** aujourd'hui : la barre d'onglets est **statique** (4 onglets fixes,
`TABS` en dur dans `ShellTabBar.tsx`). C'est un écart de **personnalisation**, distinct
de l'écart C1.

---

## 5. Ce que le passage à la navigation cible exige (par lots, sans code ici)

| Exigence §4.2 | Aujourd'hui | Lot pressenti |
|---|---|---|
| Shell web 2 panneaux + navigation compacte | `apps/mobile` Ionic, 4 onglets | **N2** (créer `apps/web-app`) |
| Section **C — Créer** | absente | **N4** (Design Space Pro) |
| Recherche globale + lanceur de commandes (§4.6) | **MISSING** (aucune route, aucun composant) | **N2** |
| Personnalisation par persona (§3.1, §4.2) | barre statique en dur | **N2** (après D5 personas) |
| Regroupement des 9 sections | 38 routes à plat | **N2** (mapping ci-dessus = entrée) |
| Contexte de projet préservé (§4.2) | `?goalId=X` + params de route | à vérifier en web |
| États requis par écran (§4.1 : 5 états) | `UxStates` existe (`packages/ui`) | réutilisé |

**Point d'attention :** la référence §4.2 autorise explicitement à **renommer et
regrouper** les sections. Le seul regroupement **non négociable** est que **C (Créer)**
soit une entrée distincte de **H (Bibliothèque)** — la §8.6 l'exige (« Le gestionnaire
d'artefacts ne se substitue pas au moteur qui édite l'artefact »).

---

## 6. Doc-lag signalé (non réécrit)

| Source | Affirmation | Réel mesuré |
|---|---|---|
| `router.tsx` (en-tête) | « 17-page router », « Primary tabs (max 5) : /home · /tasks · /learn · /progress · /agent » | **38 routes** ; **4 onglets** : `/agent · /discovery · /focus · /settings` |
| `docs/mobile/navigation-and-page-composition.md` | 5 onglets, 17 pages | 4 onglets, 38 routes |
| `docs/design-system/overview.md` | 44 écrans (05 §4) | 26 répertoires de page (mobile) ; `screens/_inventory.md` §1 en compte **54** |
| `AI_RULES.md` §3 | « **24** migrations + **6** EF » | **28** migrations + **8** EF |

→ Ces écarts sont **constatés** ; leur re-synchronisation est un lot dédié (`P0-B` du
plan Phase 0), pas une correction silencieuse.

---

## 7. Porte de sortie de ce lot

- ✅ Les 38 routes sont **toutes** rattachées à une section cible ou à un statut
  « transversal / hors navigation » — **aucune ligne « à définir »**.
- ✅ L'unique section cible sans route est identifiée (**C — Créer**) et recoupe
  l'écart **C1** du registre de statut (Design Space Pro `MISSING`).
- ✅ L'écart de personnalisation par persona est nommé, avec la preuve (`TABS` en dur).
- ✅ Le doc-lag de la barre d'onglets est signalé avec ses deux valeurs (5 documentés /
  4 réels).
