# Aurora — Phase 0 : Rebaselining produit et technique

> **Statut :** plan d'exécution — créé 2026-10-24, après lecture des 5 documents owner
> uploadés (commit `07d70a6`). **NON exécuté.**
> **Autorité :** `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` §10.2 (Phase 0) +
> registre `A-03` (« état réel du dépôt — phase 0 immédiate »).
> **Règle :** 1 story = 1 commit = 1 rollback (AD-13). Gate vert à chaque lot.

---

## 0. Sources lues (evidence)

| Document | Lignes | Rôle |
|---|---|---|
| `Aurora-Reference-Produit-Fonctionnelle-v1.1.md` | 1622 | **Référence produit maître** — vision, personas, modules, Design Space Pro, stack, roadmap, décisions |
| `LOGO.md` | ~600 | Rapport d'ingénierie — logos vectoriels SVG (7 sources arXiv) |
| `AFFICHE.md` | ~360 | Rapport d'ingénierie — posters/documents en JSON de calques (13 sources) |
| `VIDEO.md` | ~410 | Rapport d'ingénierie — éditeur vidéo par calques (HyperFrames, roadmap Phase 3) |
| `deep-research-report.md` | ~240 | Studio 3D paramétrique (CadQuery/build123d/OpenCascade, roadmap Phase 3) |

Tous récupérés depuis `origin/main` commit `07d70a6` (« Add files via upload », 2026-10-24 01:43:33Z).

---

## 1. Ce que les documents tranchent (fin de l'ambiguïté)

### 1.1 Il n'y a AUCUNE mention de chat tiers

Vérifié par grep sur les 5 fichiers : **`librechat` = 0 hit · `open-webui` = 0 hit ·
`assistant-ui` = 0 hit.**

→ La question que je posais (A/B/C/D : chat maison / assistant-ui / LibreChat / open-webui)
**est close** : aucun document owner ne demande d'intégrer un chat tiers. Le brief maître
initial (LibreChat) est **remplacé** par cette référence v1.1.

### 1.2 Les décisions de cadrage (D-01 → D-08)

| # | Décision | Impact dépôt |
|---|---|---|
| **D-01** | 5 verbes : Créer · Apprendre · Découvrir · S'organiser · Innover | Positionnement |
| **D-02** | **Tous les modules antérieurs conservés** | Aucune suppression ; `packages/*` reste |
| **D-03** | **Design Space Pro** = 1ʳᵉ extension créative (Brand DNA, logo, charte, affiche, document multipages) | **Nouveau périmètre majeur** |
| **D-04** | **Web responsive → Desktop → Mobile** | ⚠️ **Contredit AD-13 (mobile-only)** → ADR requis |
| **D-05** | 5 personas (étudiant, entrepreneur, autodidacte, entreprise, particulier) | Shell + personnalisation |
| **D-06** | Stack : TS, **Ionic React**, Capacitor, Electron, **Next.js**, PowerSync, SQLite, Supabase/PG, **Zod**, Agent Aurora | Ionic React **conservé** |
| **D-07** | PowerSync = moteur de sync ; connecteur/rules/conflits **restent à implémenter** | Travail réel |
| **D-08** | TanStack adopté **par responsabilité** (Form, Query ciblé, Table, Virtual ; alpha/beta isolés) | Inventaire à faire |

### 1.3 Point important : Ionic React est CONSERVÉ

Le document maître §8.7.1 dit explicitement :

> « **Ionic React** fournit les composants et l'expérience de l'application métier Web
> responsive ; il ne remplace pas le modèle métier d'Aurora. »

→ Contrairement à ce que suggérait le plan orphelin `.agents_tmp/PLAN.md` (qui envisageait de
remplacer le shell Ionic), **la référence retient Ionic React** pour l'app métier, avec Next.js
réservé au **site public** (`apps/marketing`). La topologie reste `A-01` (à confirmer au spike),
mais la recommandation est : **séparer les deux** plutôt que cumuler deux routeurs.

### 1.4 Ce qui n'est PAS demandé

- Pas de reconstruction du design system de zéro (Ionic React + `packages/ui` restent).
- Pas de copie de chat tiers.
- Pas de suppression de modules.
- Les studios 3D / Vidéo / Musique / Web avancé = **Phase 3** (roadmap), pas le 1ᵉʳ périmètre.

---

## 2. Contradiction structurante à résoudre (bloquant)

**AD-13 dit « Phase 1 mobile-only »** (`AI_RULES.md` l.189 : *« no Electron/microservices/Event
Sourcing/Yjs/local STT in V1 »*), et le parking lot ADR §23 classe desktop/web en Phase 2.

**D-04 dit « Web responsive → Desktop → Mobile ».**

Ces deux états **ne peuvent pas coexister**. La référence le reconnaît elle-même (§10.9) :

> « Le document `00-overview.md` indique […] release candidate v0.1.0. À l'inverse, le rapport
> `implementation-readiness-report-2026-09-22.md` […] parlent de prérequis de lancement […].
> Ces états ne peuvent pas être considérés simultanément comme une vérité unique sans examen
> du dépôt. »

**Action :** produire un **ADR additif** actant le renversement. Ce n'est pas une décision
implicite de code — `AI_RULES.md` §2 l'interdit (« contredire un doc figé = doc-lag à
signaler, jamais une résolution silencieuse »).

---

## 3. Ce que la Phase 0 demande (12 travaux → 6 lots)

La référence §10.2 liste 12 travaux. Regroupés en lots livrables :

### Lot P0-A — État de référence vérifié (1 story)
- **Travaux 1–3** : état du dépôt + changelog ; inventaire des capacités (implémentée /
  partielle / conçue / à décider) ; liste par plateforme.
- **Livrable** : `docs/architecture/status-register.md` (registre de statut fiable).
- **Méthode** : `pnpm install` → gate complet (`AI_RULES.md` §9) → inventaire des 19 packages
  + 3 apps + 28 migrations + 9 EF, classés avec preuve (fichier/test/commit).
- **Statut actuel** : partiellement fait (cf. §4 ci-dessous) — il manque le gate exécuté.

### Lot P0-B — ADR du renversement de plateforme (1 story)
- **Travaux 4–5** : remplacer la priorité mobile-only par Web → Desktop → Mobile dans les docs
  normatifs ; identifier les décisions liées *uniquement* au mobile.
- **Livrable** : `docs/adr/ADR-INT-002-web-first.md` + mise à jour des pointeurs
  `AI_RULES.md` / `docs/architecture/00-overview.md` / spine.
- **Contenu** : ce qui reste vrai du mobile (Capacitor, DPC, notifications), ce qui devient
  desktop-first, ce qui est reporté (Phase 4).

### Lot P0-C — Topologie des applications (1 story)
- **Travaux 6** : proposer `apps/marketing` (Next.js) + `apps/web-app` (Ionic React), **ou**
  déposer un ADR motivant une autre topologie.
- **Livrable** : ADR `A-01` + décision sur `apps/mobile` (devient-il `apps/web-app` ?).
- **Contrainte** : un seul routeur par shell (ne pas cumuler Next Router + IonReactRouter).

### Lot P0-D — Vérification des versions / licences (1 story)
- **Travaux 7** : vérifier versions + licences + compatibilité de Supabase, PowerSync, SQLite,
  Capacitor, Electron, Zod, paquets TanStack sélectionnés.
- **Livrable** : tableau versions/licences dans le registre de statut.
- **Point d'attention** : `joydatini-lab/open-webui` porte une licence `NOASSERTION` — à ne
  **pas** réutiliser sans vérification (mais il n'est de toute façon plus dans le périmètre).

### Lot P0-E — POC PowerSync Web + POC outils Design Space (2 stories)
- **Travaux 8–9** : POC PowerSync bout-en-bout sur Web (auth → rules → SQLite local → modif
  offline → upsync → reprise réseau → RLS + changement de compte) ; POC des outils de
  formulaire / liste / virtualisation / rendu Design Space Pro.
- **Livrable** : 2 rapports de POC + décisions (`A-11` TanStack DB, `A-02` éditeurs/formats).
- **⚠️ Bloquant externe** : le POC PowerSync nécessite un projet Supabase live + users de test.
  L'ancien plan (`finalisation-v1.md` P1-4) note que 2 users de dev existaient
  (`dev.aurora@joynagassi.dev`) — **à re-vérifier**, l'instance peut avoir auto-pausé (free tier, 7 j).

### Lot P0-F — Cartographie modules ↔ navigation ↔ personas (1 story)
- **Travaux 10–12** : cartographier les modules existants sur la nouvelle navigation (§4.2 de la
  référence : Accueil / Projets / Créer / Apprendre / Découvrir / S'organiser / Connaissances /
  Bibliothèque / Paramètres) et les 5 personas ; définir les exigences minimales d'intégration
  de Design Space Pro ; définir la stratégie de migration des données existantes.
- **Livrable** : `docs/architecture/navigation-mapping.md` + `design-space-integration.md`.
- **Constat** : la navigation actuelle du dépôt est à **17 routes + 4 onglets** (mobile) ;
  la référence en propose **9 sections** (Web). L'écart est substantiel → documenter, pas coder.

**Porte de sortie (§10.2)** : registre de statut fiable · contradictions résolues par décision
explicite · topologie confirmée · POC de synchronisation validé · backlog trié · dépendances connues.

---

## 4. Baseline réelle du dépôt (déjà vérifiée — 2026-10-23/24)

| Élément | Valeur vérifiée | Source |
|---|---|---|
| Remote | `joydatini-lab/aurora` (public, `license=None`) | API GitHub |
| HEAD `main` | `07d70a6` (upload des 5 docs) | `git log` |
| Commit précédent | `e066292` — 2026-10-19 | `git log` |
| Commits | **390** | `git rev-list --count` |
| Branches | `main` seule (+ ma branche de travail locale) | API `/branches` |
| Tags | **aucun** (`git tag -l` vide) | `git tag -l` |
| Packages / apps | **19** / **3** (`desktop`, `mobile`, `server`) | `ls` |
| Migrations | **28** (`0001…0027` + `0200`) | `ls \| wc -l` |
| Edge Functions | **9** dirs (`_shared` + 8 `fn-*`) | `ls` |
| Pages mobile | **26** répertoires | `ls` |
| Fichiers de test | **101** | `find` |
| Workflows CI | **6** | `ls .github/workflows/` |
| `node_modules` | **absent** → gate non exécutable | `ls` |
| `agent_runs` (0008) | **seul** store de conversation ; aucune table `conversations`/`messages` | grep sur 28 migrations |
| `@assistant-ui/react` | vendu (172 fichiers) + exporté, **jamais câblé** | `packages/ui/src/index.ts` l.1347+ |
| `apps/desktop` | spike Electron Phase-0, pas de vraie UI | `ls apps/desktop` |

### Doc-lag constaté (à corriger, Lot P0-A)
- `AI_RULES.md` §3 dit « 20 migrations » → réel = **28**.
- `finalisation-v1.md` P0-3 prétend que le tag `v0.1.0` « existe déjà » → **aucun tag**.
- `docs/architecture/00-overview.md` et `AI_RULES.md` §1 se déclarent « reconciliés waves 0→7 »
  alors que la référence produit v1.1 (§10.9) dit que cet état n'est **pas** fiable.

---

## 5. Ce que la Phase 0 NE fait PAS

- Pas de code de Design Space Pro (c'est Phase 1B).
- Pas de renversement de plateforme *implémenté* (seulement l'ADR + les pointeurs).
- Pas de POC TanStack DB/AI (décisions `A-11`/`A-12` après POC).
- Pas de migration de données réelle.
- Pas de suppression de modules ni de reconstruction d'UI.

---

## 6. Ordre d'exécution proposé

```
P0-A (état vérifié)  ─┬─> P0-B (ADR web-first) ──> P0-C (topologie)
                      ├─> P0-D (versions/licences)
                      └─> P0-F (cartographie)
                                    │
                                    ▼
                            P0-E (POC PowerSync + POC UI)
                                    │
                                    ▼
                        PORTE DE SORTIE PHASE 0
                                    │
                                    ▼
                    Phase 1 — Aurora Web responsive (P0/P1)
```

P0-A est **strictement préalable** (tout le reste s'appuie sur un état vérifié).
P0-B, P0-C, P0-D, P0-F sont parallélisables. P0-E dépend de P0-C (topologie) et d'un
environnement Supabase live.

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| FS sandbox éphémère → travail perdu | **Critique** (déjà arrivé) | Pousser la branche après chaque lot |
| Contradiction AD-13 vs D-04 non résolue | **Élevé** | Lot P0-B (ADR explicite) |
| Supabase auto-pausé (free tier, 7 j) | Élevé (bloque P0-E) | Réveiller le projet avant le POC |
| `pnpm install` + gate non exécutés depuis 10-19 | Élevé | Lot P0-A |
| Périmètre Design Space Pro sous-estimé | Moyen | POC outils (P0-E) avant engagement |
| 5 personas × 9 sections = surface UX large | Moyen | Cartographie (P0-F) avant tout code |

---

## 8. Questions ouvertes (owner)

1. **Ionic React conservé** (référence §8.7.1) ou remplacé par un shell web pur ? La référence
   penche pour **conserver** — confirmer.
2. **`apps/mobile`** devient-il `apps/web-app`, ou un 4ᵉ app est-il créé ?
3. **Next.js** : site public seulement (`apps/marketing`), ou aussi l'app métier ?
4. **Design Space Pro** : premier lot après la Phase 0, ou après la couverture du socle (Phase 1 P1) ?
5. Le **brief maître LibreChat** est-il formellement abandonné (au profit de la référence v1.1) ?
6. **Périmètre de cette session** : exécuter Phase 0 en entier, ou P0-A + P0-B seulement ?
