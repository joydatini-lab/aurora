# Créer une affiche sur demande — architecture et état

État au 2026-10-29, branche `arena/fa2fed09-aurora`.

Ce document décrit le chemin complet entre une demande en langage naturel et une
affiche validée. Il dit aussi, explicitement, ce qui a été **exécuté** et ce qui
ne l'a pas été.

![Affiche produite en mode simulé](rendus/affiche-generee.png)

*Affiche obtenue en écrivant « Une affiche sobre et affirmée : l'accroche doit se
lire à trois mètres. » puis en cliquant **Générer l'affiche**. Mode simulé —
aucune clé. Rendue depuis l'export SVG.*

---

## 1. Le principe : le modèle propose, le moteur dispose

> « L'IA interprète, propose et orchestre ; des moteurs déterministes rendent,
> calculent et valident. » — Référence produit §2.3

Conséquence concrète, et c'est le choix structurant de cette tranche :

**le modèle ne renvoie jamais de calques.** Il renvoie une *intention* :

```jsonc
{
  "brand":     { "name", "sector", "promise", "audience", "personality", "vocabulary" },
  "direction": { "name", "rationale", "styleCategory", "harmonyTemplate",
                 "baseHue", "orientationDeg" },
  "copy":      { "headline", "subhead", "body", "footer" },
  "understanding": "…",   // ce qu'il a compris
  "unknowns": ["…"]       // ce qu'il n'a pas inventé
}
```

La géométrie, la césure, les contrastes, le score et les exports restent
calculés par le moteur. Pourquoi :

| Si le modèle produisait… | Le défaut serait… |
| --- | --- |
| des calques | un décalage de 3 % invisible, et invérifiable sans rendu |
| une palette | des couleurs hors charte, non recalculables |
| un corps de texte | un débordement que personne ne mesure |

Avec une intention, chaque sortie est vérifiable : `baseHue` est un entier
borné, `harmonyTemplate` une valeur d'énumération, `headline` une chaîne dont la
longueur est bornée. **Tout ce qui n'est pas vérifiable n'est pas demandé.**

---

## 2. Le chemin, étape par étape

```
navigateur                    service local              fournisseur
──────────                    ─────────────              ───────────
studio.tsx
  └ generatePoster()
      └ requestDesignPlan()
          │ POST /api/chat ─▶  server.mjs
          │                      ├ mode mock → modèle simulé
          │                      └ mode live ─────────▶  POST {base}/chat/completions
          │                                                  (clé ajoutée ici)
          │ ◀────────────── choix[0].message.content ◀───────┘
          ├ extractJson()          ← tolère Markdown et prose
          ├ parseDesignPlan()      ← valide, borne, répare, SIGNALE
          ├ planToDna()            ← intention → BrandDNA + copy
          ├ buildPoster()          ← 10 calques, corps résolu, césure calculée
          ├ refine()               ← boucle K ≤ 4, verrous respectés
          └ validateLayout()       ← mêmes règles que le moteur déterministe
```

Le validateur final est **le même** que celui du moteur de règles. Une affiche
venue d'un modèle n'est pas jugée avec un barème plus indulgent.

---

## 3. Où vit la clé

Dans `tools/design-api/.env.local`, et nulle part ailleurs.

- `.env.local` est ignoré par git ; seul `.env.example` est versionné.
- Le navigateur n'appelle que `/api/chat`, une route **relative**, relayée par
  le proxy Vite (`vite.config.ts`).
- Aucune variable `VITE_*` ne porte de secret : une variable `VITE_*` est
  inlinée en clair dans le JavaScript servi, donc publique.

Vérifié sur le bundle de production :

```
$ grep -o "agnes[^\"]*" dist/assets/app-*.js
agnes-3.0-flash            ← le nom du modèle, sans conséquence
$ grep -c "API_KEY" dist/assets/app-*.js
0
```

Le nom du modèle est public par nature. Aucune clé n'y figure.

---

## 4. Agnes 3.0 Flash

Le modèle retenu, servi par Sapiens AI en API compatible OpenAI :

| Élément | Valeur |
| --- | --- |
| Base URL | `https://apihub.agnes-ai.com/v1` |
| Route | `POST /v1/chat/completions` |
| Modèle | `agnes-3.0-flash` |
| Contexte | 512 K jetons (mesuré à 524 288 par des tiers) |
| Sortie max | 65 536 jetons |
| Entrée | texte + URL d'image |
| Outils | `tool_calls` pris en charge |

Trois routes coexistent (Chat Completions, Responses, Messages Anthropic) sur la
même base et la même clé. **Chat Completions a été retenu** : c'est la forme la
plus répandue, donc celle qui permet de changer de fournisseur sans réécrire le
client. `readContent()` accepte d'ailleurs les trois formes d'enveloppe.

Réglages par défaut : `temperature 0.7`, `max_tokens 2048`. Une accroche
d'affiche n'a pas besoin d'un contexte de 512 K ; on garde la requête courte
pour que le coût et la latence restent prévisibles.

---

## 5. Démarrer

```bash
# mode simulé — aucune clé, aucun réseau, tout le pipeline fonctionne
pnpm dev:full

# mode réel
cp tools/design-api/.env.example tools/design-api/.env.local
# renseigner AGNES_API_KEY dans ce fichier
pnpm design-api            # terminal 1
pnpm dev                   # terminal 2
```

`GET /api/health` indique toujours le mode courant. L'écran `/studio` affiche
l'état du service dans son en-tête : **« Modèle simulé — aucune clé »**,
**« Modèle réel · agnes-3.0-flash »**, ou **« Service de génération arrêté »**.
Un badge unique « IA » serait un mensonge commode : la valeur d'une affiche
produite n'est pas la même selon ces trois cas.

---

## 6. Ce que le contrat refuse

Le parseur est testé **à l'envers** : trente-cinq tests, dont la moitié
provoquent un échec.

| Réponse du modèle | Traitement | Motif affiché |
| --- | --- | --- |
| JSON nu | accepté | — |
| Bloc ```` ```json ```` | accepté | — |
| JSON entouré de prose | accepté | — |
| Accolade dans une chaîne | accepté (analyseur équilibré) | — |
| Texte libre, sans JSON | **refusé** | « aucun objet JSON dans la réponse » |
| Objet non terminé | **refusé** | « objet JSON non terminé » |
| `copy` manquant | **refusé** | champ obligatoire |
| `headline` vide | **refusé** | trop court pour composer |
| Gabarit inconnu (`fibonacci`) | réparé **et signalé** | remplacé par `analogue` |
| `baseHue: 725` | ramené dans `[0,359]` | valeur listée à l'écran |
| `orientationDeg: 17` | aligné à `15` | valeur listée à l'écran |
| Marque renommée par le modèle | **rejetée**, nom du brief rétabli | `brand.name : … remplacé par …` |

Le point important est la colonne du milieu : **une correction silencieuse est
un mensonge.** Tout ce qui est réparé apparaît à l'écran, dépliable, avec la
valeur d'origine.

---

## 7. Ce qui a été exécuté, et ce qui ne l'a pas été

```bash
cd apps/web
npx --no-install tsc --noEmit                          # 0 erreur
npx --no-install eslint . --max-warnings 0             # 0 avertissement
node --experimental-strip-types --test test/*.test.ts  # 107/107
npx --no-install vite build                            # succès, 3,25 s
```

Dont, pour la partie IA seule : **35/35**, avec un **vrai serveur HTTP** démarré
sur un port éphémère et de **vrais `fetch`** — pas des doublures.

Parcours vérifié dans un DOM (happy-dom, service réel en mode simulé) : **15/15**
— champ de demande, bouton, affiche produite, 10 calques, rapport chiffré,
mention « réponse simulée », aucun avertissement React.

Rastérisation (`sharp`) des affiches générées, puis inspection visuelle. Trois
défauts trouvés ainsi, qu'aucun test n'avait vus :

1. **Accroche = offre recopiée.** Le simulateur répétait l'offre, affichée deux
   fois (titre + sous-titre) sur cinq lignes. Corrigé : accroche courte de 2 à 6
   mots, sans préposition orpheline, distincte du sous-titre.
2. **Titre en pavé.** Rien ne limitait le nombre de lignes : l'ajustement
   remplissait la boîte. Ajout de `maxLines` (3 pour un titre).
3. **Affiche évidée au milieu.** Le corps était ancré en bas, isolé du
   sous-titre par 40 % de vide. Le groupe de texte est désormais distribué dans
   l'espace disponible.

Aucun des trois n'était détectable par le validateur : **un vide n'est pas une
violation**, une accroche trop longue reste dans sa boîte. C'est la raison pour
laquelle la rastérisation reste une étape, et pas un luxe.

**Non vérifié** :

- **Aucun appel réel à Agnes.** Le sandbox n'a pas d'accès sortant vers
  `apihub.agnes-ai.com`, et aucune clé n'y est disponible. Le mode `live` est
  écrit, typé, mais **jamais exercé** : on ne peut donc pas affirmer qu'un vrai
  modèle renverra un plan conforme au contrat. Le parser est testé sur des
  réponses *représentatives*, pas sur des réponses *observées*.
- Aucune spec Playwright exécutée (Chromium non téléchargeable ici).

---

## 8. Suite

1. **Premier appel réel.** Lancer `pnpm design-api` avec une clé et générer une
   affiche. Consigner le taux de réponses conformes du premier coup — c'est la
   seule mesure qui compte du prompt.
2. **Raffinement guidé par modèle.** `critique()` existe dans l'interface du
   provider et n'est pas branché. Le corpus prévoit que le raffineur ne voie que
   le rapport, jamais les pixels : le contrat est déjà celui-là.
3. **Multi-tours.** Aujourd'hui une demande produit une affiche. « Plus
   contrasté », « raccourcis l'accroche » demandent de conserver le plan
   précédent comme contexte.
4. **Coût et latence.** `usage` et `ms` remontent déjà jusqu'à l'écran ; il
   manque un historique pour les suivre.
