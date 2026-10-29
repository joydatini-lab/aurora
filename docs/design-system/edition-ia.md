# Éditer une affiche par l'IA — spécification

> **Statut** : spécification, **avant code**. Ce document décrit ce qui doit être
> construit, pas ce qui est construit. Les sections marquées *[mesuré]* sont
> adossées à une commande exécutée le 2026-10-29 sur la branche
> `arena/fa2fed09-aurora` (base `70130e6`).
> **Gabarit** : §M1–§M6 (`docs/features/specs/productivity.tasks.md`) étendu d'un
> volet corpus (AFFICHE) et d'un volet preuve d'exécution.
> **Amont** : `AFFICHE.md` (méthode), `docs/design-system/generation-ia.md` (chemin
> de CRÉATION, déjà livré), `docs/design-system/design-space.md` (état du studio).
> **Avale** : ADR `docs/adr/edition-calques-ia.md`.

---

## §1 Objet : créer n'est pas éditer

La tranche précédente a livré **créer une affiche sur demande** : un brief et une
phrase de demande produisent une affiche complète. Elle a laissé ouverte la
question suivante, qui est l'objet de ce document :

> **Éditer une affiche par l'IA** — « rends le fond plus sombre », « raccourcis
> l'accroche », « déplace le logo en bas à gauche », « plus contrasté ».

Le malentendu à lever d'abord : il ne s'agit **pas** de générer une image PNG par
un modèle de diffusion. Le corpus `AFFICHE.md` §2.1 et §7.4 l'exclut explicitement
(« génération d'images pixelisées pour les posters : hors périmètre » ;
« l'éditabilité est l'une des 4 exigences »). Une affiche dans Aurora est un
**JSON de calques** (`apps/web/src/design/types.ts:215`, schéma `AFFICHE` §5.1) :

```jsonc
{ "id": "l-titre", "a_sem": {…}, "a_geo": { "x","y","w","h",… },
  "a_sty": {…}, "o": 6, "M": { "lock_x", … }, "detail": "…" }
```

Éditer, c'est **modifier ce JSON** — et le seul endroit où l'IA apporte de la
valeur, c'est de **comprendre l'intention** (« plus contrasté ») et de la traduire
en une **modification bornée et vérifiable** de la structure. Le rendu, la
géométrie, les contrastes et le score restent calculés par des moteurs
déterministes (`docs/design-system/design-space.md` §2 : « le modèle propose, le
moteur dispose »).

**Conséquence de méthode.** Un décalage de 3 % est invisible et invérifiable
sans rendu ; une teinte hors bornes ne l'est pas. Donc, comme pour la création,
**le modèle ne renvoie jamais de calques** : il renvoie une **intention d'édition**
et le moteur l'applique sous contrainte.

---

## §2 État mesuré du dépôt (ce sur quoi on construit)

| Brique | Fichier | État | Preuve |
|---|---|---|---|
| Modèle de calques + verrous `M` | `apps/web/src/design/types.ts:205-234` | présent | `Layer`, `LayerLocks` |
| Composition 10 calques | `apps/web/src/design/layout.ts:278` | présent | `buildPoster` |
| Boucle de raffinement K≤4 | `apps/web/src/design/pipeline.ts:42` | présent | `refine`, arrêt anticipé |
| Validateur déterministe (11 codes) | `apps/web/src/design/validate.ts` | présent | testé à l'envers (`design.test.ts:270-…`) |
| Export SVG | `apps/web/src/design/render.ts:105` | présent | `posterToSvg` |
| Contrat de CRÉATION (intention) | `apps/web/src/design/ai/contract.ts:32` | présent | `DesignPlan`, `parseDesignPlan` |
| Client Chat Completions | `apps/web/src/design/ai/client.ts:82` | présent | `requestDesignPlan` |
| Service local (clé + relais) | `tools/design-api/server.mjs` | présent | `POST /api/chat` |
| Écran studio | `apps/web/src/pages/studio.tsx` | présent | 827 lignes |

### Ce qui manque, précisément

| # | Manque | Preuve du manque |
|---|---|---|
| **E1** | **Aucun contrat d'édition.** Le contrat ne décrit que la création d'un plan complet. | `contract.ts` n'a ni `DesignPatch` ni instruction d'édition |
| **E2** | **Aucun contexte multi-tours.** Le client n'envoie que `[system, user]`. | `client.ts:97-100` |
| **E3** | **Le studio n'a pas de champ d'édition.** Un seul bouton « Générer l'affiche ». | `studio.tsx:164` ; aucun second champ de saisie |
| **E4** | **Les verrous `M` ne sont pas respectés par le modèle** — seulement par le réparateur déterministe. | `pipeline.ts:104-151` (le modèle n'intervient pas dans `refine`) |
| **E5** | **Aucun contrôle de vide / d'occupation.** Le validateur raisonne sur des boîtes ; un trou de 40 % ne déclenche rien. | constaté `design-space.md` §5 |
| **E6** | **Le champ de fond n'est pas exposé.** « Rends le fond plus sombre » n'a pas de cible dans le contrat. | mesuré §11.3 : la consigne a été ignorée |
| **E7** | **Le délai du service (60 s) est trop court.** Un plan réel met 14–90 s. | mesuré §11.1 (premier appel : 502 « aborted » à 60 s) |

---

## §3 Le contrat d'édition (à construire)

### §3.1 Principe : une intention d'édition, pas des calques

Le corpus impose la **séparation plan / code** (`AFFICHE.md` §3.2, §7.1 :
« ne jamais mélanger plan et code dans le même appel » ; le one-shot échoue car le
modèle rationalise *a posteriori*). On applique la même règle à l'édition :
**le modèle dit QUOI changer, le moteur décide COMMENT**.

Deux formes d'intention, par ordre de préférence :

**(a) Édition sémantique** — la plus sûre, celle qui couvre 80 % des demandes :

```jsonc
{
  "edit": {
    "targets": ["copy.headline"],          // chemins d'intention, PAS des calques
    "changes": { "copy.headline": "Café. Semaine. Lyon." },
    "direction": { "styleCategory": "Bold" },   // optionnel
    "rationale": "accourcir l'accroche, renforcer le contraste",
    "understanding": "…", "unknowns": ["…"]
  }
}
```

**(b) Édition spatiale contrainte** — pour « déplace », « agrandis », « aligne » :

```jsonc
{
  "edit": {
    "targets": ["l-logo"],
    "ops": [
      { "op": "move", "anchor": "bottom-left" },
      { "op": "resize", "scale": 1.15 }
    ],
    "rationale": "…"
  }
}
```

Les `ops` sont un **vocabulaire fermé** (`move` par ancre, `resize` par facteur,
`align` par bord, `reorder`, `set_style`, `set_text`). Le modèle **ne fournit
jamais** de `x`/`y`/`w`/`h` numériques : une ancre (`top`, `bottom-left`, `center`)
est bornée et reproductible ; une coordonnée « 0,73 » ne l'est pas. C'est
exactement le paradigme de masque du corpus (`AFFICHE.md` §2.3, iPoster) : on
verrouille, on n'écrit pas.

### §3.2 Le patch est appliqué par le moteur, sous contrainte

`applyEdit(layout, dna, intent) → { layout, dna, applied[], rejected[] }` :

1. résout les `targets` (id de calque ou chemin d'intention) ;
2. **refuse** toute opération sur un attribut verrouillé (`M`) — la liste des
   refus est affichée, jamais silencieuse ;
3. traduit les `ops` en deltas de `a_geo`/`a_sty` **bornés** (dans `[0,1]`, dans
   la grille, dans la palette) ;
4. re-dérive ce qui est dérivable (césure, corps, contraste) via les fonctions
   existantes (`fitText`, `resolvedLines`, `pickForeground`) ;
5. rend la main au **même** validateur que la création.

### §3.3 Enumération des intentions supportées (v1)

| Intention utilisateur | Chemin | Nature |
|---|---|---|
| « raccourcis / allonge l'accroche » | `copy.headline` | sémantique |
| « change le texte du sous-titre » | `copy.subhead` | sémantique |
| « plus / moins contrasté » | `direction.styleCategory` + `baseHue` | sémantique |
| « palette vers le bleu » | `direction.baseHue` | sémantique |
| « déplace le logo en bas à gauche » | `l-logo` + `move:bottom-left` | spatiale |
| « agrandis le titre » | `l-titre` + `resize` | spatiale |
| « rends le fond plus sombre » | **nouveau** `direction.backgroundTone` | sémantique **(E6)** |
| « mets le pied en majuscules » | `l-mention` + `set_style` | spatiale |

`direction.backgroundTone` (`'deep' | 'dominant' | 'light' | 'accent'`) est le
seul **ajout de contrat** nécessaire ; il n'existe pas aujourd'hui (E6). Il se
traduit dans `buildPoster` par le choix du `fill` du calque `l-fond`.

---

## §4 Ce que le corpus `AFFICHE.md` impose (non négociable)

Chaque contrainte ci-dessous devient un critère de test (§13).

| # | Règle du corpus | Où | Application à l'édition |
|---|---|---|---|
| C1 | **Plan puis code, jamais one-shot** | §3.2, §7.1 | l'intention d'édition est un tour séparé ; le patch est appliqué après |
| C2 | **Verrous par attribut (masque `M`)** | §2.3, §6.6 | une op sur attribut verrouillé est **refusée et listée** |
| C3 | **Validateur déterministe, jamais le VLM, pour la géométrie** | §3.3, §7.10 | l'édition repasse le même `validateLayout` ; un VLM ne juge que l'esthétique |
| C4 | **Boucle plafonnée K≤4, arrêt sur plateau** | §3.1, §7.11 | l'édition ne relance pas indéfiniment |
| C5 | **Non-chevauchement (GIoU) + z-order sémantique** | §6.6 | une op `move`/`resize` est rejetée si elle crée un `TEXT_OVERLAP` |
| C6 | **Lisibilité par patch (contraste local)** | §6.5 | après édition de texte, le contraste est recalculé localement |
| C7 | **Césure calculée, une ligne par calque** | §6.3 | éditer un texte re-calcule la césure, jamais la laisse au moteur de rendu |
| C8 | **Sous-couche strictement sous son texte** | §6.2 | une op ne peut pas inverser un underlay et son texte |
| C9 | **Fidélité au prompt = critère de qualité** | §6.4 | l'édition doit produire l'effet demandé, ou le dire |

**Ajout hors corpus assumé (comme `TEXT_OVERFLOW` en création)** : un contrôle
**d'occupation / de vide** (E5). Le corpus ne le donne pas ; la rastérisation a
montré qu'un trou de 40 % est le défaut le plus visible et le moins détecté. On
l'ajoute comme **indicateur** (`uti` existe déjà ; on ajoute une alerte de vide
quand `uti` chute sous un seuil **et** qu'un vide connexe dépasse X % de la
hauteur). Seuil à ratifier — voir OQ-ED-3.

---

## §5 Le prompt d'édition (à construire)

Différence avec le prompt de création : on ajoute **trois** choses au message.

1. **Le plan précédent**, sérialisé en JSON, dans un tour `assistant`. C'est ce
   que le modèle vient de produire ; il doit le *modifier*, pas le réinventer.
2. **L'état courant des calques** (id, rôle, boîte, verrous) — compact, sans
   géométrie complète : le modèle n'a pas besoin des `x/y/w/h` exacts pour dire
   « déplace le logo », mais il a besoin de savoir **quels calques existent** et
   **lesquels sont verrouillés**.
3. **L'instruction d'édition**, en dernier, seule et explicite.

Forme de la conversation (3+ tours) :

```
[system]  rôle + contrat d'édition + vocabulaire fermé des ops + verrous
[user]    brief + demande initiale
[assistant] plan précédent (JSON)
[user]    ÉTAT COURANT : <liste calques + verrous>
          MODIFICATION DEMANDÉE : « raccourcis l'accroche à trois mots »
```

Deux invariants :
- **le modèle ne voit jamais de pixels** (C3, `AFFICHE.md` §3.3) ;
- **les verrous sont dans le prompt ET appliqués par le moteur** : les annoncer ne
  dispense pas de refuser. Le prompt guide, le moteur garantit.

### §5.1 Ce que le prompt doit interdire

- inventer un `id` de calque ;
- produire des coordonnées numériques ;
- renommer la marque (déjà géré en création, `contract.ts:359`) ;
- modifier un attribut verrouillé ;
- changer plus de champs que demandé (« garde tout le reste identique » doit être
  respecté — mesuré §11.3 : le modèle y arrive).

---

## §6 La boucle d'édition

```
instruction ─▶ prompt d'édition (contexte = plan précédent + état calques)
            ─▶ modèle ─▶ parseEditIntent()  ← valide, borne, répare, SIGNALE
            ─▶ applyEdit(layout, dna, intent) ← refus des verrous, bornes
            ─▶ refine(layout, dna)            ← boucle K≤4 DÉJÀ existante
            ─▶ validateLayout()               ← MÊME validateur que la création
            ─▶ rasterisation de contrôle      ← le seul œil sur le vide (E5)
            ─▶ écran : affiche + rapport + refus + corrections
```

Règles :
- **une seule requête de modèle par édition** (pas de relance en boucle : un
  modèle relancé masque un prompt défaillant et multiplie la facture, cf.
  `remote.ts:102`) ;
- **le validateur ne change pas de barème** parce que l'affiche a été éditée ;
- **les refus sont affichés** : « logo verrouillé — déplacement ignoré ».

---

## §7 Le validateur, ce que l'édition doit lui ajouter

Le validateur existant (`validate.ts`, 11 codes) reste la référence. Deux ajouts,
strictement nécessaires à l'édition :

| Ajout | Déclencheur | Pourquoi l'édition l'exige |
|---|---|---|
| **LOCK_VIOLATION** | une op d'édition a touché un attribut verrouillé | sans lui, un refus serait un comportement non testable ; avec lui, il devient une violation typée |
| **EMPTY_REGION** (avertissement) | un vide connexe > seuil de la hauteur, et `uti` bas | le défaut n°1 de la rastérisation, non couvert (E5) |

`LOCK_VIOLATION` a une **sévérité `error`** (une promesse d'immuabilité rompue).
`EMPTY_REGION` est un **avertissement** (un vide n'est pas une faute, c'est un
signal — cohérent avec la leçon « un vide n'est pas une violation »,
`design-space.md` §5).

---

## §8 La surface : un bouton, pas une API

L'exigence de la tranche : « créer une affiche sur demande » est un **bouton**.
Éditer doit l'être aussi.

| Élément | Rôle | Test |
|---|---|---|
| Champ « Modifier l'affiche » | saisir l'instruction d'édition en français | `data-testid="edit-request"` |
| Bouton « Appliquer la modification » | déclenche l'édition | `data-testid="edit-apply"` |
| Historique des tours | lister les modifications appliquées (repliables) | visible, pas un JSON brut |
| Bandeau de refus | afficher « logo verrouillé — ignoré » | `role="status"` |
| Bandeau de corrections | afficher les coercitions du contrat | repliable |
| Badge de mode | « Modèle simulé » / « Modèle réel · agnes-3.0-flash » / « arrêté » | déjà présent (`studio.tsx:431`) |

La surface réutilise les composants ReUI (règle `AGENTS.md`), l'état d'édition
réutilise `GenerateResult` étendu d'un champ `applied`/`rejected`.

---

## §9 Hors-ligne, coût, latence

### §9.1 Hors-ligne

L'édition par IA **exige le réseau** : le modèle vit côté serveur (même
raisonnement que `docs/design-system/design-space.md` §2 et la règle F-09 : pas de
clé sur l'appareil). Sans service, l'écran doit le **dire** et proposer le repli
déterministe : édition manuelle des champs (`a_geo` éditable, `design-space.md`
§7.4). Aucun spinner infini.

**Classe offline** : `online-required` pour l'édition par IA ;
`offline-capable` pour l'édition manuelle et l'export.

### §9.2 Latence *[mesuré]*

| Appel | Jetons sortie | Latence |
|---|---|---|
| plan complet (création, Maison Kora) | 382 | **58,0 s** |
| plan complet (tech) | 473 | **89,9 s** |
| plan complet (festival) | 409 | 22,3 s |
| plan complet (EN) | 412 | 14,6 s |
| édition « accourcir + contraste » (a) | 285 | **65,0 s** |
| édition « accourcir + contraste » (b) | 351 | **76,9 s** |
| édition « fond + sous-titre » | — | 29,6 s |
| édition « palette bleue » | — | 17,6 s |

Conséquences **obligatoires** :
- `AGNES_TIMEOUT_MS` par défaut **240000** (le 60000 actuel fait échouer un plan
  réel — mesuré §11.1) ;
- l'UI doit montrer une **attente longue** (pas un spinner muet) ;
- **ne pas** boucler : à ~60 s et ~1 200 jetons l'appel, une relance automatique
  double le coût et la latence.

### §9.3 Coût

~1 200 jetons d'entrée, ~300–500 de sortie par appel. Le contexte multi-tours
**augmente** l'entrée (le plan précédent + l'état des calques) : prévoir ~1 500
jetons d'entrée par édition. À mesurer par appel réel, pas à estimer.

---

## §10 Sécurité — où vit la clé

Inchangé depuis la création, et re-vérifié *[mesuré]* :

- la clé vit dans `tools/design-api/.env.local` (ignoré par git :
  `git check-ignore` → `.gitignore:109`) ;
- le navigateur n'appelle que `/api/chat`, **relatif**, relayé par Vite ;
- **aucune** variable `VITE_*` ne porte de secret.

Vérification sur le bundle de production *[mesuré]* :

```
$ grep -rc "sk-yavfm" dist/assets/*.js        → 0 fichier
$ grep -rho "API_KEY" dist/assets/*.js | wc -l → 0
$ grep -rho "agnes-3.0-flash" dist/assets/*.js | wc -l → 1   (nom public)
```

Le nom du modèle est public par nature. Aucune clé n'y figure.

> **Règle opérationnelle** : la clé fournie pour cette session n'est **jamais**
> écrite dans un fichier versionné, un test, un exemple ou un log. Elle ne vit
> que dans `.env.local`. Un test qui aurait besoin d'une clé doit être *skippé*
> en son absence, pas la contenir.

---

## §11 Preuves exécutées le 2026-10-29 *[mesuré]*

### §11.1 Premier appel réel (la lacune de la tranche précédente)

Le mode `live` était écrit mais **jamais exercé**. Il l'est désormais.

```sh
node tools/design-api/server.mjs         # mode LIVE, clé présente, agnes-3.0-flash
curl -s localhost:8787/api/health        # mode=live, hasKey=true
```

| Tentative | Résultat |
|---|---|
| 1er appel, délai service 60 s | **échec** — `upstream_unreachable`, « aborted » à 60 s |
| appel minimal direct (6 jetons) | **200** en 32,1 s |
| plan complet via le pipeline, délai 240 s | **200**, 58,0 s, `usage {792,382,1174}` |

Le premier échec n'est pas un défaut du modèle : c'est **E7** (délai trop court).
Après relève à 240 s, le pipeline complet rend une affiche **score 9,7, 0
violation, arrêt `clean` dès la ronde 0, 0 correction**.

### §11.2 Taux de conformité du premier coup

| Cas | Résultat | Corrections |
|---|---|---|
| « Maison Kora » (café, FR) | conforme | **0** |
| « Vectra » (SaaS, FR) | conforme | **0** |
| « Nuit Blanche » (festival, FR) | conforme | **0** |
| « Northwind Coffee » (EN) | conforme | **0** |

**4/4 conformes du premier coup**, en français et en anglais, sans coercition de
contrat. C'est la mesure qui manquait au prompt.

### §11.3 Édition multi-tours (la fonctionnalité à spécifier)

Trois éditions, contexte = plan précédent + instruction :

| # | Instruction | Résultat | Effet observé |
|---|---|---|---|
| 1 | « raccourcis l'accroche à 3 mots + plus contrasté » | conforme | accroche → « Café. Semaine. Lyon. » ; `Minimal` → `Bold` ; reste identique |
| 2 | « fond plus sombre + sous-titre plus long » | conforme | sous-titre allongé ; **fond inchangé** — pas de champ (E6) |
| 3 | « palette vers le bleu » | conforme | `baseHue` 25 → 220 ; texte identique |

**Conclusion** : le modèle **sait** éditer un plan en conservant le reste. Le
contrat actuel ne lui **donne pas** de cible pour le fond (E6). L'édition
multi-tours est donc **faisable dès aujourd'hui** pour les champs existants.

### §11.4 Non-régression

```sh
cd apps/web
npx --no-install tsc --noEmit                        # 0 erreur
npx --no-install eslint … --max-warnings 0           # 0 avertissement
node --experimental-strip-types --test test/*.test.ts # 107/107
npx --no-install vite build                          # succès, 2,28 s
```

---

## §12 Non vérifié / limites (à ne pas confondre avec « fait »)

1. **Aucune édition n'a encore traversé le code de l'application.** Les 3
   éditions de §11.3 ont été faites par un script de mesure qui appelle le service
   et parse la réponse — **pas** par `generatePoster`/le studio. Le chemin d'édition
   (E1–E4) n'existe pas dans le code.
2. **Le délai réel est très variable** (14–90 s). Une seule mesure ne fait pas une
   distribution : il faut un échantillon par cas avant de fixer un SLA.
3. **Aucune spec Playwright exécutée** (Chromium de l'app non installé) ;
   `e2e/07-studio.spec.ts` compile, n'a pas tourné.
4. **Le harnais DOM « 15/15 » décrit dans `design-space.md` §6 n'est PAS présent
   dans l'arbre** de cette branche : `apps/web/test/` ne contient que des tests
   Node (`ai`, `color`, `design`, `extract`, `presets`). La ligne « parcours
   vérifié dans un DOM » **n'est pas reproductible ici** — à corriger ou à
   reconstruire (voir OQ-ED-6).
5. **`EMPTY_REGION` n'existe pas** : la rastérisation reste, pour l'instant, un
   contrôle manuel. Automatiser le contrôle de vide est un lot (§14, L2).
6. **Aucun appel avec image** : le corpus (`AFFICHE.md` §3.2, §7.1) exige
   d'injecter le contenu de l'image dans le prompt du plan ; la v1 d'édition
   décrite ici est **textuelle**. Éditer « à partir de cette photo » est hors
   périmètre v1.

---

## §13 Definition of Done (l'édition est « faite » quand…)

| # | Critère | Mesure |
|---|---|---|
| D1 | Contrat d'édition écrit et testé à l'envers | `parseEditIntent` rejette : op inconnue, id de calque inconnu, coordonnée numérique, cible verrouillée |
| D2 | `applyEdit` respecte les verrous | une op sur `M.lock_*` est **refusée et listée** ; test dédié |
| D3 | Même validateur | l'affiche éditée passe `validateLayout` ; `LOCK_VIOLATION` (error) et `EMPTY_REGION` (warning) existent et sont provoqués |
| D4 | Multi-tours | le plan précédent est dans le contexte ; « garde le reste identique » est respecté (test avec réponse figée + test d'intégration) |
| D5 | Boucle bornée | K≤4, arrêt sur plateau (réutilise `refine`) |
| D6 | Surface | champ + bouton + bandeaux refus/corrections ; parcours DOM prouvé |
| D7 | Zéro secret | clé absente du bundle (grep) ; `.env.local` ignoré |
| D8 | Délai | `AGNES_TIMEOUT_MS=240000` par défaut ; attente longue affichée |
| D9 | Hors-ligne honnête | service absent → message + repli manuel, pas de spinner infini |
| D10 | Gate vert | `tsc` 0, `eslint` 0, tests existants + nouveaux, build OK |
| D11 | Preuve réelle | au moins **un** aller-retour réel consigné (conformité + latence + `usage`) |

---

## §14 Découpage en lots (1 lot = 1 commit = 1 rollback)

| Lot | Périmètre | Dépend de |
|---|---|---|
| **L0** | Contrat d'édition `contract-edit.ts` + `parseEditIntent` + tests « à l'envers » | — |
| **L1** | `applyEdit` (résolution cibles, refus verrous, bornes, re-dérivation) + `LOCK_VIOLATION` | L0 |
| **L2** | `EMPTY_REGION` + rastérisation de contrôle automatisée | L1 |
| **L3** | Prompt d'édition + `requestDesignEdit` (multi-tours) + `direction.backgroundTone` (E6) | L1 |
| **L4** | Écran : champ + bouton + bandeaux + historique | L3 |
| **L5** | Délai 240 s, attente longue, repli hors-ligne honnête | L3 |
| **L6** | Passe réelle de bout en bout + consignation du taux de conformité | L4, L5 |

**Ordre imposé** : le contrat (L0) précède toujours l'écran (L4). Un écran branché
avant le contrat afficherait une édition non validée — exactement l'erreur que la
tranche précédente a évitée en écrivant le contrat de création d'abord.

---

## §15 Questions ouvertes (chacune avec une recommandation à ratifier)

> Le mandat propriétaire est « arrête de me demander » : chaque question porte donc
> une **recommandation par défaut**. En l'absence de ratification, c'est la
> recommandation qui s'applique.

| # | Question | Recommandation | Motif |
|---|---|---|---|
| **OQ-ED-1** | Édition **sémantique** seule (v1) ou **spatiale** aussi ? | **sémantique en v1, spatiale en v1.1** | la sémantique couvre 80 % des demandes et se valide sans rendu ; la spatiale exige le contrôle de vide (L2) pour être sûre |
| **OQ-ED-2** | Édition d'un **calque isolé** ou de l'affiche entière ? | **affiche entière en v1**, calque isolé ensuite | le corpus raisonne par calque, mais l'UI n'a pas encore de sélection ; ne pas coupler deux chantiers |
| **OQ-ED-3** | Seuil d'`EMPTY_REGION` | **calibrer par rastérisation**, pas deviner : poser 25 % de hauteur connexe comme valeur de départ, à ajuster sur 5 affiches | un seuil inventé produirait des faux positifs ; la rastérisation existe déjà |
| **OQ-ED-4** | Le modèle **critique** ou seulement **patche** ? | **patcher en v1**, critique ensuite | le patch est vérifiable ; la critique est un texte libre, donc non validable |
| **OQ-ED-5** | **Verrouiller par défaut** les calques structurants à l'édition ? | **oui** — fond, pied, logo restent verrouillés | ils le sont déjà dans `buildPoster` ; en faire la politique d'édition évite qu'un « rends le fond plus sombre » déplace le fond (il doit changer `backgroundTone`, pas la géométrie) |
| **OQ-ED-6** | Le harnais DOM « 15/15 » est-il perdu ou non commité ? | **reconstruire** un test de parcours DOM | `design-space.md` §6 l'affirme ; absent de l'arbre (§12.4) — une affirmation non reproductible doit être rendue vraie ou retirée |
| **OQ-ED-7** | **Aperçu avant/après** (diff de calques) ? | **oui, en v1.1** | c'est la contrepartie visible des refus (« logo verrouillé — ignoré ») ; sans lui, l'utilisateur ne sait pas ce qui a changé |

**Ce qui bloque l'implémentation** : seule **OQ-ED-1** est structurante (elle
décide si le contrat L0 porte des `ops` spatiales). La recommandation (sémantique
d'abord) permet de démarrer L0 sans attendre.

---

## §16 Références

| Source | Usage |
|---|---|
| `AFFICHE.md` §2.3, §3.1–3.2, §5.1, §5.3, §6.2, §6.5–6.6, §7.1, §7.4 | méthode, contrat de calques, verrous, règles de validation |
| `docs/design-system/generation-ia.md` | chemin de création déjà livré (contrat, clé, modes) |
| `docs/design-system/design-space.md` §2, §5, §7 | état du studio, leçon de la rastérisation |
| `apps/web/src/design/{types,layout,pipeline,validate,render}.ts` | moteurs déterministes réutilisés tels quels |
| `apps/web/src/design/ai/{contract,client,remote,prompt}.ts` | contrat de création à étendre |
| `tools/design-api/server.mjs` | service local (clé, modes, relais) |
| `docs/features/specs/productivity.tasks.md` | gabarit §M1–§M6 |
