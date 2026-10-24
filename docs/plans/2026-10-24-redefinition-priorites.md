# Aurora — Redéfinition des priorités et du périmètre (plan, 2026-10-24)

> **Statut :** plan de **décision** — NON exécuté. Aucun code.
> **Pourquoi ce document :** le owner constate une dérive (« on se perd »). Ce document
> ne propose pas *plus* de travail : il **ferme des options** et **force des choix**.
> **Règle de lecture :** `AI_RULES.md` §1 — le code et le changelog gagnent sur les docs.
> Tout fait ci-dessous est vérifié dans l'arbre, avec la commande ou le fichier.

---

## 0. Le diagnostic en une phrase

Aurora a **beaucoup construit** et **autant spécifié**, mais elle n'a **jamais tranché
entre deux produits** : (i) une suite productivité+apprentissage avec un agent, et
(ii) un studio de création professionnelle (Design Space Pro). Les deux sont dans la
référence v1.1 ; seul (i) est dans le code. Tant que ce choix n'est pas fait, chaque
lot ajoute de la surface au lieu de réduire l'écart.

---

## 1. État réel vérifié (pas la mémoire, l'arbre)

### 1.1 Le dépôt

| Élément | Valeur vérifiée | Commande |
|---|---|---|
| Branche de travail | `rebaseline/2026-10-23`, **25 commits d'avance** sur `main` | `git rev-list --count main..HEAD` |
| `main` | `07d70a6` (« Add files via upload ») — **n'a pas bougé** | API `/commits/main` |
| PR ouvertes | **0** | API `/pulls?state=open` |
| Packages / apps | **19** / **3** (`desktop`, `mobile`, `server`) | `ls` |
| Migrations / EF | **28** / **9** dirs | `ls` |
| Pages mobile | **26** | `find apps/mobile/src/pages -name index.tsx` |
| Docs | **~120** `.md` sous `docs/` | `find` |
| Gate | **VERT** (vérifié sans `dist/`, CI `ci-base` verte) | `docs/ci/gate.md` |

### 1.2 Les livrables de la Phase 0 : ce qui existe, ce qui manque

| Livrable attendu (plan Phase 0 / ADR-018) | Existe ? |
|---|---|
| `docs/plans/2026-10-23-repriorisation.md` | ✅ |
| `docs/plans/2026-10-24-phase0-rebaseline.md` | ✅ |
| `docs/adr/adr-018-direction-plateforme-web-first.md` | ✅ |
| `docs/frontend/ui-brick-inventory.md` | ✅ (241 l.) |
| `docs/frontend/web-shell-and-responsive.md` | ✅ (336 l.) |
| `docs/frontend/design-space-scope.md` | ✅ (247 l.) |
| `docs/frontend/feature-registry.md` · `page-contracts.md` | ✅ (18 · 26 lignes de tableau) |
| `docs/ci/gate.md` | ✅ (mesuré + vérifié CI) |
| **`docs/architecture/status-register.md`** | ❌ **ABSENT** (travaux §10.2 items 1–3) |
| **`docs/architecture/navigation-mapping.md`** | ❌ **ABSENT** (item 10) |
| **`docs/architecture/design-space-integration.md`** | ❌ **ABSENT** (item 11) |
| **`docs/adr/ADR-INT-002-web-first.md`** | ❌ **ABSENT** (remplacé par `adr-018`, non renommé) |
| **POC PowerSync Web bout-en-bout** | ❌ **NON EXÉCUTÉ** (item 8) |
| **POC outils Design Space** | ❌ **NON EXÉCUTÉ** (item 9) |
| **Migration de données** | ❌ **NON DÉFINIE** (item 12) |

**Lecture :** la Phase 0 a produit **les décisions et la doctrine** (ADR, doctrine
responsive, inventaire de briques, périmètre Design Space) mais **aucune preuve
d'exécution** (les deux POC), et **le registre de statut — la porte de sortie §10.2 —
n'existe pas.** On a écrit la carte, pas vérifié le terrain.

### 1.3 L'écart vision ↔ code (le vrai chiffre)

| Domaine | Spécifié (réf. v1.1) | Dans le code | Verdict |
|---|---|---|---|
| Socle productivité (tâches, projets, objectifs, habitudes, focus, revues, calendrier) | §5.1, 11 modules | ✅ 19 packages + 26 pages | **IMPLEMENTED** |
| Learning (import, FSRS, coach, miroir) | §5.2 | ✅ `packages/learning`, `progress` | **IMPLEMENTED** |
| Knowledge / Discovery / Progress / Agent / Scientific | §5 | ✅ packages dédiés | **IMPLEMENTED** |
| **Design Space Pro** (Brand DNA, logo, charte, affiche, document) | §10.4, ~200 l. + `LOGO.md` + `AFFICHE.md` | ❌ **0 package, 0 table, 0 écran, 0 route** | **MISSING** |
| Studios 3D / Vidéo / Musique / Web | §10.7 (Phase 3) | ❌ | **PLANNED (Phase 3)** |
| **Shell Web responsive** | §4.3, `docs/frontend/web-shell-and-responsive.md` | ❌ **`apps/web-app` n'existe pas** (3 apps : desktop, mobile, server) | **SCAFFOLDED (docs only)** |
| PowerSync bout-en-bout (connecteur, conflits, reprise) | §8.5 | ⚠️ config + rules ; **round-trip jamais exécuté** | **PARTIAL** |

**Le chiffre qui compte :** la référence v1.1 ratifie **Design Space Pro dans le
premier périmètre** (§10.1 : « le premier périmètre comprend l'ensemble des modules
antérieurs **et Design Space Pro** »). Ce module représente **~13 écrans neufs**, un
moteur d'édition, un validateur déterministe et une chaîne d'export — et il n'existe
**aucune ligne** de code, de schéma ou de route. C'est **le** trou de périmètre.

---

## 2. Les 3 causes structurelles de la dérive

### C1 — Deux produits dans un seul backlog
`docs/frontend/design-space-scope.md` le documente : la référence ratifie Design Space
Pro en v1, mais il n'a ni package, ni table, ni écran. Tant qu'il figure au même niveau
que « finir les tâches », il **dilue** l'effort sur le socle sans jamais le livrer.

### C2 — Trois surfaces, un seul périmètre acté
La décision `D-018.1` (web → desktop → mobile) est prise, mais **`apps/web-app` n'existe
pas** : la seule UI réelle est `apps/mobile` (Ionic). Or `OQ-1` dit **Ionic = mobile
seulement**, web/desktop = React pur. Donc aujourd'hui : **la cible web n'a pas de
coquille**, et tout le travail d'UI existant est dans la coquille qui n'est plus la
cible. C'est le nœud technique de la dérive.

### C3 — Une Phase 0 sans porte de sortie
La référence §10.2 exige un **registre de statut fiable** comme porte de sortie. Il
n'existe pas. Sans lui, « où en est-on ? » se répond par la mémoire — et la mémoire
s'est déjà trompée une fois (l'épisode « intégration LibreChat », réfuté :
branche 404, `docs/integration/` inexistant).

---

## 3. Les décisions à trancher (owner) — bloquantes

Chaque question ci-dessous **conditionne tout le reste**. Tant qu'elles restent
ouvertes, chaque lot est un pari.

### D1 — Quel est LE produit de la v1 ? (la question racine)
- **(a) Suite productivité + apprentissage, avec un agent.** C'est ce qui est construit
  (19 packages, 26 pages). Le travail restant est de la **finition + une coquille web**.
- **(b) Suite + Design Space Pro** (référence v1.1 §10.1). Ajoute ~13 écrans neufs, un
  moteur d'édition et une chaîne d'export → **la v1 s'éloigne**.
- **(c) Studio créatif d'abord** (Design Space Pro comme produit d'appel). Le socle
  existant devient support.
→ **Recommandation : (a) pour la v1**, Design Space Pro en **Phase 1B** (§10.4 le prévoit
déjà ainsi) — c'est-à-dire **après** un socle web utilisable. Motif : le socle est
`IMPLEMENTED`, Design Space est `MISSING` ; livrer ce qui existe avant d'ouvrir un
chantier neuf réduit l'écart au lieu de l'augmenter.

### D2 — Quelle coquille pour le web ?
`apps/web-app` (React pur, shadcn/ReUI, sans `ion-*`) — c'est la conséquence actée de
`OQ-1`. **À confirmer :** on la crée maintenant (et `apps/mobile` reste la cible Phase 4),
ou on rend `apps/mobile` responsive d'abord (moins propre, mais pas de 4ᵉ app) ?
→ **Recommandation : créer `apps/web-app` maintenant.** Motif : `OQ-1` a déjà écarté
Ionic du web ; retarder la coquille signifie construire des écrans web dans un shell
Ionic qu'il faudra ensuite démonter (le coût est déjà identifié : `docs/frontend/web-shell-and-responsive.md`).

### D3 — Le périmètre de la prochaine livraison
- **(a) Fermer la Phase 0** (registre de statut + 2 POC + cartographie) — 0 feature neuve.
- **(b) Ouvrir la Phase 1 P0** (coquille web + auth + états + recherche + agent) — la
  fondation utilisable.
- **(c) Design Space Pro d'abord.**
→ **Recommandation : (a) puis (b).** La Phase 0 n'est pas un luxe : sa porte de sortie
(le registre) est ce qui empêche de se reperdre.

### D4 — Le sort de `apps/mobile` et d'`assistant-ui`
- `apps/mobile` : **conservé**, cible Phase 4 (acté `D-018.3`, `OQ-1`).
- `@assistant-ui/react` (172 fichiers, exporté, jamais câblé) : **réserve de briques**
  officielle (`D-018.2`) — donc **gardé**, pas supprimé. À confirmer qu'il n'est pas
  câblé en v1 (sinon c'est un 4ᵉ chantier chat).

### D5 — `open-webui` (fork `joydatini-lab/open-webui`, 505 Mo, poussé 2026-10-22)
Piste active ou fork exploratoire mort ? Aucun document owner ne le mentionne
(0 occurrence dans les 5 docs). → **Recommandation : archiver / déclarer hors périmètre.**

---

## 4. Priorités proposées (une seule échelle, pas trois)

> Principe : **on ne travaille qu'à un niveau à la fois.** Un lot se termine (gate vert
> + livrable écrit + poussé) avant d'ouvrir le suivant.

### Niveau 0 — Ne plus perdre de travail *(fait)*
✅ Gate vert, CI opérant (`ci-base` verte en CI réelle), branche poussée, mémoire à jour.

### Niveau 1 — Fermer la Phase 0 (décision D3-a) — **3 lots, aucune feature**
| Lot | Livrable | Preuve de fin |
|---|---|---|
| **1.1** | `docs/architecture/status-register.md` — les 19 packages + 3 apps + 28 migrations + 9 EF classés `IMPLEMENTED / PARTIAL / SCAFFOLDED / PLANNED / MISSING / BROKEN` avec preuve par ligne | chaque ligne porte un fichier ou une commande |
| **1.2** | **POC PowerSync Web** bout-en-bout (auth → rules → SQLite local → offline → upsync → reprise → RLS + changement de compte) | rapport + log d'exécution ; ⚠️ **bloque sur un Supabase live + users de test** |
| **1.3** | `docs/architecture/navigation-mapping.md` — 26 pages actuelles ↔ 9 sections §4.2 ↔ 5 personas | table complète, 0 ligne « à définir » |

**Porte de sortie §10.2 atteinte** = le registre existe et les 2 POC sont exécutés (ou
déclarés bloqués avec la raison exacte).

### Niveau 2 — Socle Web (décision D2 + D3-b) — Phase 1 P0
`apps/web-app` (React pur) : shell + 2 panneaux responsive, auth, contexte, états
d'interface, recherche globale, Agent Kernel via contrats. **Réutilise `packages/ui`**
(272 briques inventoriées) — **ne réécrit rien du design system**.

### Niveau 3 — Couverture métier Web (Phase 1 P1)
Les 9 domaines §10.3 accessibles depuis le web, selon leurs contrats. Ici on
**transporte** l'existant (déjà implémenté), on n'invente pas.

### Niveau 4 — Design Space Pro (Phase 1B)
Uniquement **après** un socle web utilisable. Ordre déjà écrit en §10.4 (brief → Brand
DNA → logo → charte → affiche → éditeur → validateur → documents → export).

### Niveau 5+ — Phase 1C qualité · Phase 2 Desktop · Phase 3 Studios · Phase 4 Mobile
Hors périmètre immédiat. Ne pas y toucher tant que 1–4 ne sont pas clos.

---

## 5. Ce qu'on ne construit PAS (la liste qui évite la dérive)

| Non-objectif | Pourquoi |
|---|---|
| Un chat tiers (LibreChat / open-webui / LobeHub) | 0 mention dans les 5 docs owner ; LobeHub = référence de **conception** seulement (licence : condition 1(b) → licence commerciale requise pour un travail dérivé). |
| Un nouveau design system | `packages/ui` conservé (`D-018.2`), 272 briques inventoriées. |
| La réécriture des 26 pages mobile | Elles restent ; le web les **réutilise** via les contrats. |
| Les studios 3D / Vidéo / Musique / Web | Phase 3 (§10.7). |
| L'entreprise (multi-tenant, SSO, RBAC) | Évolution future ; ne pas complexifier la v1. |
| Le polish design-QA sur toutes les pages maintenant | Après le socle web (sinon on polit une coquille qu'on remplace). |

---

## 6. Ordre d'exécution et portes

```
N0 ✅ (fait)
   │
   ▼
N1  Phase 0 : 1.1 registre ──┬─> 1.3 cartographie
                             └─> 1.2 POC PowerSync (⚠️ Supabase live requis)
   │  PORTE : registre + POC exécutés (ou bloqués motivés)
   ▼
N2  Socle Web (apps/web-app : shell + auth + états + recherche + agent)
   │  PORTE : une page web réelle tourne, gate vert, RLS vérifiée
   ▼
N3  Couverture métier Web (9 domaines §10.3)
   │  PORTE : parcours persona exécutable
   ▼
N4  Design Space Pro (Phase 1B)
   ▼
N5  Phase 1C qualité → Phase 2 Desktop → Phase 3 → Phase 4
```

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| FS sandbox éphémère → travail perdu | **Critique** (déjà arrivé) | Pousser après **chaque** lot ; la branche est poussée |
| Décision D1 non prise → backlog à 2 produits | **Critique** | Ce document existe pour ça |
| Supabase auto-pausé (free tier 7 j) → POC bloqué | Élevé | Réveiller le projet avant le lot 1.2 ; sinon déclarer bloqué |
| Créer `apps/web-app` sans figer le périmètre → 4ᵉ surface | Élevé | D2 tranché avant N2 ; `apps/mobile` gelé en Phase 4 |
| Design Space Pro sous-estimé | Moyen | POC outils (§10.2 item 9) avant engagement |
| Docs normatifs contradictoires (mobile-only vs web-first) | Moyen | `adr-018` §5 liste les pointeurs à re-synchroniser (lot dédié) |
| `main` reste à `07d70a6` → 25 commits invisibles | Moyen | Ouvrir une PR (seul déclencheur de `ci-gate`) |

---

## 8. Décisions demandées (réponse attendue : 5 lettres)

| # | Question | Options |
|---|---|---|
| **D1** | Le produit de la v1 ? | (a) socle productivité+learning · (b) socle + Design Space Pro · (c) studio créatif d'abord |
| **D2** | La coquille web ? | (a) créer `apps/web-app` (React pur) maintenant · (b) rendre `apps/mobile` responsive d'abord |
| **D3** | La prochaine livraison ? | (a) fermer la Phase 0 · (b) ouvrir le socle Web · (c) Design Space Pro |
| **D4** | `assistant-ui` en v1 ? | (a) réserve dormante (non câblé) · (b) on le câble |
| **D5** | `open-webui` ? | (a) hors périmètre · (b) piste active |

**Ma recommandation, en une ligne :** `D1(a) · D2(a) · D3(a) puis (b) · D4(a) · D5(a)` —
c'est-à-dire **fermer la Phase 0 par sa porte de sortie (le registre de statut), puis
ouvrir une coquille web React qui réutilise `packages/ui`, en gardant Design Space Pro
pour la Phase 1B.**

---

## 9. Hors périmètre de ce document
- Toute modification de code (c'est un plan).
- Tout push sur `main` / toute PR (le owner décide).
- Toute copie de code tiers.
