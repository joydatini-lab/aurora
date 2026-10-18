# ADR — Contrat Miroir : détections typées, reformulation, lien Progress (F-07)

**Date :** 2026-10-18
**Statut :** Accepté
**Décideur :** Lead Aurora (plan v2 Veille + Chat agentique, S6 M-61)

## Contexte

Le mode Miroir (`learning.mirror`, job `mirror-analysis`) a un contrat fигé entre trois couches :

| Couche | Rôle SSoT |
|---|---|
| `packages/learning/src/mirror-cognitive.ts` | Détecteur : `MirrorFinding { kind: 'gap' \| 'contradiction' \| 'error', nodeId?, claimText, resolution, confidence }` (doc `learning/overview.md` §21, G-L3 closed 2026-09-22, `01-backend` §4.2) |
| `packages/agent` (kernel) | Outil `mirror_analyze` (job `agent_run`, AD-8) — le kernel n'écrit JAMAIS `progress_evidences` (AD-7) |
| `packages/progress` (`evidence.ts`) | **Seul** producteur de `ProgressEvidence` + événement `ProgressEvidenceCreated` (F-07 / AD-2) |

Deux écarts de vocabulaire coexistaient avant ce figement :

- **Briefing v2 §5.2 / plan M-62** : étiquettes de détection « Manquant / Fragile »
  (héritées de la maquette Stitch `agent_mode_miroir_fraunces` : badges ambre
  `MANQUANT` / `FRAGILE`).
- **Doc SSoT** (`learning/overview.md` §21 + `mirror-cognitive.ts` +
  `design-system/screens/mirror-cognitive.md` §11) : détections typées
  `gap` (lacune) / `contradiction` / `error` (erreur factuelle), chacune avec
  une provenance corpus (AD-11 / ADR §17).

Règle du plan S6 : en conflit, le doc SSoT l'emporte sur le briefing.

## Décision

Le contrat Miroir est **figé** sur le SSoT du module Learning :

1. **Détections typées** : `kind ∈ { 'gap', 'contradiction', 'error' }`
   (labels FR : Lacune / Contradiction / Erreur). Le briefing « Manquant /
   Fragile » est une PROPOSITION de la maquette, non la SSoT : la carte du
   chat affiche les `kind` du SSoT, jamais les labels du briefing.
   Chaque détection porte `claimText` (formulation de l'étudiante,
   corpus-dominant AD-11), `resolution` (correction/complétion,
   labelisée IA ADR §17) et `confidence` (0..1).

2. **Reformulation** : le retour structuré du Miroir dans le chat est
   le bloc « **Ce que j'ai compris** » (reformulation fidèle,
   corpus-dominant — jamais de réécriture créative du corpus, AD-11)
   + le bloc « **Lacunes détectées** » (findings typés + provenance)
   + le bloc « **Question pour vous** » (relance ciblée).
   Structure des 3 blocs = Stitch `agent_mode_miroir_fraunces`
   (AuroraEvaluationCard) ; vocabulaire des findings = SSoT Learning
   (les 3 `kind` ci-dessus, pas les 2 labels du briefing).

3. **Lien Progress (F-07, chemin critique du sprint S6)** :
   - **Jusqu'à validation utilisateur** : une détection Miroir n'écrit
     AUCUNE `ProgressEvidence` ni AUCUN événement `ProgressEvidenceCreated`.
     L'agent **propose** ; il n'écrit rien (AD-7, kernel = thin emitter).
   - **À la validation** (« Valider » dans la carte du chat) : le kernel
     émet la commande typée `progress.evidence_create` (thin command,
     AD-7) — `requiresConfirmation: true` (briefing §12 : valider une
     preuve = confirmation utilisateur OUI). C'est le **module Progress**
     qui qualifie la détection validée en `ProgressEvidence`
     (type `personal-explanation`, SSoT `packages/progress/src/evidence.ts`
     `EVIDENCE_TYPES`) et **seul Progress** émet `ProgressEvidenceCreated`.
   - **Provenance AD-11 conservée** : le `sourceEventId` / `context`
     de la preuve référence la détection Miroir (finding + corpus source),
     jamais une écriture directe Learning → `progress_evidences`.

4. **Aucune migration PowerSync** : les tables `progress_evidences`
   existent déjà (relais Aurora `6ab1612f`) ; l'événement
   `ProgressEvidenceCreated` est dans le vocabulaire fermé AD-9
   (`packages/domain/src/events.ts`). Ce contrat est **additif**
   (nouvelle commande kernel + qualifieur Progress), rien n'est exposé
   de nouveau au relais.

## Conséquences

- `packages/agent` : le kernel n'obtient PAS de write scope `progress:write`
  — il émet `progress.evidence_create` (thin, confirmation requise) ;
  le module Progress applique la mutation (AD-7 single-writer).
- `packages/progress` : un qualifieur `evidenceFromMirrorValidation`
  (type `personal-explanation`, provenance AD-11 dans `context`) complète
  les qualifieurs existants (`evidenceFromTaskCompleted`,
  `evidenceFromFlashcardReviewed`).
- `apps/mobile` (M-62) : la carte du chat `MirrorFindingsCard` affiche
  les 3 blocs structuré (reformulation / findings typés SSoT / question)
  + les actions « Planifier un Focus » / « Créer une veille » (commandes
  kernel, pas d'écriture directe) ; le bouton « Valider » émet
  `progress.evidence_create` avec confirmation.
- Le vocabulaire du briefing « Manquant / Fragile » est **signalé en écart**
  dans le rapport S6 (M-61) : le code suit le doc SSoT (`gap` /
  `contradiction` / `error`), le label ambre de la maquette est réservé
  au styling de la puce, jamais au `kind` du SSoT.
- `docs/learning/overview.md` §21 (G-L3) reste le SSoT du détecteur ;
  cet ADR ne le modifie pas — il le **fige** pour le chat agentique.
