# Design Space Pro — ce qui tourne, ce qui ne tourne pas

État au 2026-10-29, branche `arena/fa2fed09-aurora`.

Ce document décrit **le code livré**, pas l'intention. Chaque affirmation est
adossée soit à une commande exécutée et son résultat, soit à une limitation
nommée. Rien n'est « prévu pour plus tard » sans le dire.

![Affiche A4 générée par le studio](rendus/affiche-a4.png)

*Affiche produite par `/studio` pour le brief d'exemple « Maison Kora », rendue
depuis l'export SVG — pas une maquette.*

---

## 1. Le parcours, tel qu'il fonctionne aujourd'hui

Écran : `/studio` (`apps/web/src/pages/studio.tsx`), 1 500 lignes de moteur
derrière (`apps/web/src/design/`).

1. **Brief.** Nom, secteur, offre, public, personnalité. Pré-rempli pour que
   l'écran ne soit pas vide au premier regard, entièrement modifiable.
2. **Trois directions.** Chacune combine un gabarit d'harmonie différent et une
   orientation différente. Accepter l'une n'efface pas les autres.
3. **Affiche.** Dix calques générés, affichés en lecture directe du JSON.
   Formats : A4 portrait, carré, story 9:16.
4. **Rapport.** Huit indicateurs chiffrés, violations typées, score sur 10.
5. **Identité.** Logo vectoriel en calques + stratégie avec provenance champ
   par champ.
6. **Exports.** Logo SVG, affiche SVG, layout JSON — trois fichiers réels.

Ou **« Générer l'affiche »** : on écrit une demande en français, un modèle
propose une direction et un texte, le moteur compose et valide. Sans clé, le
service répond en mode simulé — et le dit.

---

## 2. Deux producteurs, un seul validateur

L'écran propose **deux chemins**, et ils ne sont pas équivalents :

| Chemin | Entrée | Producteur | État |
| --- | --- | --- | --- |
| Règles | brief structuré | `RuleBasedDesignAi` (`src/design/ai/provider.ts`) | actif, testé |
| Modèle | demande en langage naturel | service local → Agnes 3.0 Flash | branché, **jamais appelé en réel** |

Les deux traversent ensuite le **même** `buildPoster`, `refine` et
`validateLayout`. Une affiche venue d'un modèle n'est pas jugée plus
indulgemment : c'est ce qui rend les deux chemins comparables.

Détail complet du chemin IA, clé comprise : [`generation-ia.md`](generation-ia.md).

`selectProvider()` retombe sur les règles quand aucun modèle n'est configuré :
aucun écran ne dépend d'un service absent pour s'afficher.

Conséquence assumée pour le chemin par règles : le même brief produit toujours
les mêmes directions. C'est ce qui rend la comparaison et le test possibles — et
c'est la limite : **le moteur ne comprend pas le brief**, il applique des règles.
Sur un secteur inconnu, la proposition sera générique, pas fausse.

Le chemin par modèle lève cette limite, mais aucune clé n'est joignable depuis
cet environnement. Le service local démarre donc en **mode simulé** : il répond
avec un modèle factice, de la même forme qu'un vrai, et l'écran l'annonce en
clair (« Modèle simulé — aucune clé »). Renseigner `AGNES_API_KEY` dans
`tools/design-api/.env.local` bascule le mode sans rien changer au code.

---

## 3. Conformité au document de référence

### Respecté

- **Calques** (`AFFICHE.md` §5.1) : `{id, a_sem, a_geo, a_sty, o, M, detail}`,
  coordonnées normalisées **par axe** dans [0,1] — `x`/`w` en fraction de
  largeur, `y`/`h` en fraction de hauteur ; le rapport du support vit dans
  `canvas.ratio`, jamais dans les coordonnées. L'ordre de rendu `o` fait foi,
  jamais la position dans le tableau (`renderOrder`).
- **Boucle de raffinement** (§3.1) : plafond **K = 4**, arrêt anticipé dès que le
  gain devient négligeable, réparations déterministes (contraste, ordre,
  débordement, marge).
- **Verrous `M`** : jamais franchis. Testé, y compris le cas où le verrou empêche
  une réparation légitime — le rapport continue alors d'exposer le défaut.
- **Violations typées** (§5.3) : les neuf codes du corpus sont implémentés, et
  chacun est testé en le **provoquant**.
- **Huit indicateurs** (§5.4) : `val, ove, ali, undl, unds, uti, occ, rea`, tous
  dans [0,1]. Un élément est « valide » au-delà de 0,1 % de l'aire du canevas.
- **Provenance** : chaque champ de stratégie porte `fourni`, `propose` ou
  `inconnu`. Une valeur déduite cite sa règle ; une valeur absente n'est jamais
  maquillée en fait.
- **Logo structuré** (`LOGO.md` §3.1, §5.1) : calques identifiés, description
  sémantique, ordre de rendu explicite, contrôle structurel du SVG produit.

### Écarté, avec la raison

| Point du document | Ce qui est livré | Pourquoi |
| --- | --- | --- |
| Palettes **Matsuda** (7 gabarits à géométrie définie) | **Itten**, six gabarits angulaires, `model: 'itten'` | La géométrie des gabarits Matsuda n'est pas dans le corpus (§6.1 ne donne que secteurs et orientations). L'implémenter de mémoire serait inventer. |
| Lettrage → chemins (LOGO §3.6) | `<text>` dans le SVG | Nécessite des tables de glyphes. **L'export n'est pas indépendant de la police** — c'est affiché, pas caché. |
| Rendu PDF / fond perdu | export SVG + JSON | Aucune bibliothèque PDF installée ; en ajouter une sans pouvoir en ouvrir un ici serait prétendre à une vérification impossible. |
| `CONSTANTIONAL_VIOLATION` (graphie du corpus) | `CONSTITUTIONAL_VIOLATION` | Faute de frappe dans le document. On ne propage pas une faute dans une API publique ; l'écart est noté ici. |

### Deux codes ajoutés hors corpus

| Code | Déclencheur | Pourquoi il a fallu l'ajouter |
| --- | --- | --- |
| `TEXT_OVERFLOW` | le texte dépasse sa propre boîte (largeur ou hauteur) | Les dix codes raisonnent sur des **boîtes**. Un texte qui déborde de sa boîte en restant dans le canevas ne déclenchait rien — et c'était le défaut le plus visible. |
| `MISSING_REQUIRED` | fond, titre ou logo absent | Un layout amputé passait toutes les autres règles sans bruit. |

---

## 4. Le validateur, en détail

C'est la pièce qui autorise ou interdit l'affirmation « c'est validé ». Il est
donc testé à l'envers : chaque règle est cassée volontairement.

| Code | Déclencheur mesuré | Sévérité |
| --- | --- | --- |
| `BOUNDARY_OVERRUN` | aire hors canevas > 0 | erreur |
| `TEXT_OVERLAP` | IoU de deux textes > 0 | erreur |
| `LABEL_DUP` | libellés identiques + intersection | avertissement |
| `WCAG_CONTRAST` | ratio < 4,5:1 (cible 7,0) | erreur |
| `UNDERLAY_MISPLACE` | sous-couche rendue au-dessus d'un texte | erreur |
| `TEXT_OVERFLOW` | mot ou bloc plus large que la boîte | erreur |
| `ZORDER_INVERSION` | rôle sémantique contredit par `o` | avertissement |
| `ROUND_INSTABILITY` | attribut non verrouillé instable entre rondes | avertissement |
| `CONSTITUTIONAL_VIOLATION` | élément hors marge de grille | avertissement |
| `STYLE_MISMATCH` | couleur hors palette, rôle typographique inconnu | avertissement / erreur |
| `MISSING_REQUIRED` | élément obligatoire absent | erreur |

Trois décisions qui ont demandé une correction réelle :

1. **Le contraste est composité.** Prendre le `fill` du calque du dessous donne
   un ratio faux dès qu'un voile à 50 % s'intercale. Le validateur empile donc
   toutes les couches inférieures couvrant le centre, avec leur opacité
   (`resolveBackground`).
2. **Le noir et le blanc purs sont des neutres**, pas des hors-charte : ce sont
   les deux seules valeurs qui garantissent un contraste sur n'importe quel fond.
   Les refuser produisait un faux positif systématique.
3. **`Undl` ne compte que les textes qui ont BESOIN d'une sous-couche.** Compter
   « combien de textes en ont une » punissait une affiche où un seul texte en a
   besoin. Le besoin est *mesuré* : on recalcule le contraste en ignorant les
   sous-couches.

Le score ne contredit jamais les violations : une erreur bloquante le plafonne à
6, quelle que soit la moyenne des indicateurs.

---

## 5. Typographie : ce que la rastérisation a révélé

Le corps n'est pas choisi à la main. Il est **résolu** pour que le texte, après
césure, tienne dans sa boîte (`fitText`, recherche dichotomique).

Trois défauts trouvés en rastérisant l'export — et corrigés :

1. **Un fond deux fois trop haut.** Les coordonnées verticales étaient exprimées
   dans une unité mêlant largeur et hauteur. Le canevas est désormais normalisé
   par axe, avec `canvas.ratio` à part.
2. **Un titre qui débordait du support.** « Maison Kora » sortait du canevas sans
   aucune violation : l'estimateur d'avance (0,62 em) sous-estimait la largeur
   réelle d'une graisse 800, et le validateur utilisait **la même** estimation.
   L'estimateur est maintenant conservateur (0,74 em × 1,04) — un corps trop
   petit se voit et se répare, un débordement est une faute.
3. **Un mot coupé en deux.** La césure découpait « Maison » en « Maiso / n »
   pour satisfaire une contrainte de hauteur sans vérifier la largeur de chaque
   ligne. La césure ne coupe plus aucun mot : si un mot ne tient pas, c'est au
   corps de réduire.

Conséquence directe : les césures sont **calculées par le modèle**, pas par le
moteur de rendu. L'aperçu HTML et l'export SVG affichent les mêmes lignes,
sinon l'aperçu mentirait sur le fichier livré.

---

## 6. Vérifications réellement exécutées

```bash
cd apps/web
npx --no-install tsc --noEmit                        # 0 erreur
npx --no-install eslint . --max-warnings 0           # 0 avertissement
node --experimental-strip-types --test test/*.test.ts  # 69/69 (45 design + 24 thème)
npx --no-install vite build                          # succès, 3,15 s
```

Rendu hors navigateur (happy-dom + `ssrLoadModule`) :

- `/studio` : **20/20** — montage, proposition, acceptation, 10 calques dans le
  cadre, 8 indicateurs, score ≥ 8, changement de format, bascule de correction,
  aucun avertissement React.
- 9 routes : `/`, `/couleurs`, `/typographie`, `/espacement`, `/mouvement`,
  `/composants`, `/apparence`, `/studio`, URL inconnue → 404. Toutes rendent un
  `h1` attendu.
- Les trois formats ont été **rastérisés** (`sharp`) puis inspectés visuellement :
  c'est ainsi qu'ont été trouvés le fond trop haut, le titre débordant et le mot
  coupé.

**Non vérifié** : aucune spec Playwright n'a été exécutée ici — le binaire
Chromium n'est pas téléchargeable dans cet environnement (`playwright install`
échoue en ECONNRESET). `e2e/07-studio.spec.ts` existe, compile, passe le typage ;
il n'a **pas** été lancé. Les comportements ci-dessus viennent du harnais
happy-dom, pas d'un vrai navigateur : les polices, le rendu des `cqw` et le
`backdrop-filter` ne sont donc pas vérifiés visuellement dans l'application.

Un défaut réel trouvé par le build : Tailwind v4 scannait tout le projet et
ramassait le sélecteur Playwright `[data-testid="theme-toggle"]:visible` dans
`e2e/`, produisant une règle CSS invalide (`:is()` vide) qui faisait échouer la
minification. Le scan est désormais explicite (`source(none)` + `@source`).

---

## 7. Ce qu'il reste à faire, dans l'ordre

1. **Brancher un modèle.** `HttpDesignAi` n'attend qu'une URL, une clé et un nom
   de modèle (`VITE_AURORA_AI_URL/_KEY/_MODEL`). Le contrat est déjà celui que
   consomment les écrans : aucune vue à modifier.
2. ~~**Premier appel réel à Agnes.**~~ **Fait le 2026-10-29.** Le mode `live` a
   été exercé : 4/4 briefs conformes du premier coup, plan complet en 58 s,
   affiche score 9,7 / 0 violation. Mesures : `edition-ia.md` §11. Le délai du
   service doit passer à 240 s — un plan réel dépasse les 60 s.
3. **Lettrage vectoriel.** Convertir `<text>` en chemins : c'est la seule façon
   de supprimer l'estimation d'avance et de garantir un export identique sur
   toute machine.
4. **Édition par l'IA.** Déplacer/redimensionner ou réécrire un calque *par la
   demande* (« raccourcis l'accroche », « déplace le logo »), en respectant les
   verrous. **Spécifié** dans [`edition-ia.md`](edition-ia.md) — contrat
   d'intention, `applyEdit`, `LOCK_VIOLATION`/`EMPTY_REGION`, lot L0→L6. Le
   modèle sait déjà éditer (3/3 mesuré) ; le contrat et l'écran manquent.
5. **Versions.** Une nouvelle version ne doit jamais écraser une version
   approuvée (§12.2). Non implémenté : il n'y a pour l'instant qu'une
   composition en mémoire.
6. **Formats d'impression.** PDF avec fond perdu, contrôle des marges réelles.
