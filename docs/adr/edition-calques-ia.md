# ADR — Édition d'affiche par l'IA : intention vérifiable sur le JSON de calques

**Date :** 2026-10-29
**Statut :** Proposé (spécifié, non implémenté)
**Décideur :** à ratifier
**Spécification :** `docs/design-system/edition-ia.md`

## Contexte

La tranche « créer une affiche sur demande » a livré un chemin complet : un brief
et une demande en langage naturel produisent une affiche en calques, validée par
le même moteur déterministe que le chemin par règles
(`docs/design-system/generation-ia.md`). Elle a laissé ouverte la demande
suivante : **éditer** une affiche par l'IA (« plus contrasté », « raccourcis
l'accroche », « déplace le logo »).

Deux lectures de « éditer par l'IA » s'opposent :

| Lecture | Ce qu'elle produit | Ce qu'elle casse |
|---|---|---|
| **Modèle d'image (diffusion)** | un PNG | l'éditabilité : on ne peut plus bouger un calque, recalculer un contraste, ni exporter un SVG net |
| **Édition du JSON de calques** | une structure modifiée | rien d'irréversible, à condition que l'édition soit bornée et vérifiable |

Le corpus d'ingénierie `AFFICHE.md` tranche : §7.4 « génération d'images
pixelisées : hors périmètre », §2.8 « l'éditabilité est l'une des 4 exigences ».
Une affiche dans Aurora **est** un JSON de calques
(`apps/web/src/design/types.ts:215`, schéma `AFFICHE` §5.1).

Le risque de l'édition par un modèle est le même qu'en création : un décalage de
3 % est invisible et invérifiable sans rendu ; une teinte hors bornes ne l'est
pas. La règle éprouvée de la création — **« le modèle propose une intention, le
moteur dispose »** — doit donc être étendue à l'édition.

## Décision

1. **L'édition par l'IA modifie le JSON de calques, jamais des pixels.** Aucun
   modèle de diffusion, aucune image générée. L'IA comprend l'intention ; le
   moteur applique une modification bornée.

2. **Le modèle renvoie une *intention d'édition*, pas des calques.** Une cible
   (`copy.headline`, `l-logo`) et des changements exprimés dans un **vocabulaire
   fermé** (`move` par ancre, `resize` par facteur, `set_text`, `set_style`,
   `reorder`). Le modèle **ne fournit jamais** de coordonnées `x/y/w/h`
   numériques : une ancre est bornée et reproductible, une coordonnée ne l'est
   pas.

3. **Le patch est appliqué par un moteur déterministe**, `applyEdit`, qui refuse
   toute opération sur un attribut verrouillé (`M`) et re-dérive ce qui est
   dérivable (césure, corps, contraste) avec les fonctions existantes.

4. **Le même validateur juge l'affiche éditée.** Aucun barème plus indulgent.
   Deux codes sont ajoutés : `LOCK_VIOLATION` (erreur — une promesse d'immuabilité
   rompue) et `EMPTY_REGION` (avertissement — le défaut n°1 de la rastérisation,
   non couvert par le corpus).

5. **La boucle reste plafonnée** (K≤4, arrêt sur plateau) et **une seule requête
   de modèle par édition** : pas de relance automatique.

6. **La clé ne quitte jamais le serveur local** (règle inchangée, AD-3/F-09) :
   le navigateur n'appelle que `/api/chat`, relatif.

## Conséquences

**Positives**
- L'affiche éditée reste **éditable, exportable, mesurable** (mêmes invariants que
  la création).
- L'édition est **testable à l'envers** : chaque refus (cible verrouillée, op
  inconnue, coordonnée numérique) est un test.
- Aucun nouveau moteur : `buildPoster`, `refine`, `validateLayout`, `fitText`,
  `posterToSvg` sont réutilisés tels quels.

**Coûts / contraintes**
- Un **contrat d'édition** à écrire (`contract-edit.ts`) avant tout écran — le
  contrat précède l'UI (leçon de la tranche précédente).
- Le **délai du service** doit passer de 60 s à 240 s : un plan réel mesuré met
  14–90 s, et le délai actuel fait échouer un appel réel.
- Le **contexte multi-tours** augmente l'entrée (~1 500 jetons/appel) et le coût.
- Un champ de contrat est **ajouté** : `direction.backgroundTone`, seul moyen de
  cibler « rends le fond plus sombre » (mesuré : sans lui, la consigne est
  ignorée).

**Non décidé (OQ ouvertes — chacune porte une recommandation dans
`edition-ia.md` §15, applicable en l'absence de ratification)**
- Édition **sémantique** seule (v1) ou **spatiale** aussi (v1.1) — OQ-ED-1
  → *recommandé : sémantique en v1*.
- Édition **par calque** (sélection) ou de l'affiche entière — OQ-ED-2
  → *recommandé : affiche entière en v1*.
- Seuil d'`EMPTY_REGION` — OQ-ED-3 → *recommandé : calibrer par rastérisation,
  départ à 25 % de hauteur connexe*.
- Le modèle doit-il aussi **critiquer** (langage naturel) ou seulement **patcher** —
  OQ-ED-4 → *recommandé : patcher en v1*.

## Alternatives écartées

| Alternative | Pourquoi écartée |
|---|---|
| **Modèle de diffusion → PNG** | casse l'éditabilité, l'export SVG et le recalcul de contraste ; exclu par `AFFICHE.md` §7.4 |
| **Le modèle renvoie des calques complets** | décalage invisible et invérifiable ; impossible à valider sans rendu (`generation-ia.md` §1) |
| **Le modèle renvoie des coordonnées numériques** | non borné, non reproductible ; préférer les ancres (paradigme de masque, `AFFICHE.md` §2.3) |
| **Un VLM juge la géométrie** | faux négatifs documentés (`AFFICHE.md` §7.10) ; la géométrie est déterministe, seul l'esthétique peut être confiée à un modèle |

## Références

- `AFFICHE.md` §2.3, §2.8, §3.2, §5.1, §6.5–6.6, §7.1, §7.4, §7.10
- `docs/design-system/edition-ia.md` (spécification complète)
- `docs/design-system/generation-ia.md` (chemin de création, contrat de référence)
- `apps/web/src/design/types.ts:205-234` (`Layer`, `LayerLocks`)
