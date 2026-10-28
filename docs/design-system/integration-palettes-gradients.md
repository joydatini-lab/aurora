# Intégration multi-palettes / multi-thèmes / multi-gradients — plan d'intégration

Statut : `PLAN` (audit factuel + terrain préparatoire). Aucune couleur inventée :
toute valeur manquante est écrite `A_FOURNIR_PAR_L_OPERATEUR`.

Portée : préparer l'accueil de palettes nommées et de gradients supplémentaires
SANS casser les 13 entrées de thème existantes. Ce document ne livre pas de
couleur — il livre le TERRAIN (schéma, impact code, non-régression, tests).

Sources citées : `chemin:ligne` uniquement, plus les sorties de commandes
collées en §6.

---

## §0 · Interdits de cette mission

- **Aucune nouvelle valeur hexadécimale.** Les palettes et gradients sont fournis
  par l'opérateur. Emplacement réservé : `A_FOURNIR_PAR_L_OPERATEUR`.
- **Aucune édition** de `supabase/migrations/*`, `packages/domain/src/**`,
  `powersync/sync-config.yaml`, `docs/frontend/implementation-index.md`.
- Ce document est **le seul livrable** ; il ne modifie aucun fichier de thème.

---

## §1 · Cartographie du système existant (chemin réel, `chemin:ligne`)

### 1.1 Le catalogue (SSoT = JSON, AD-15)

- 13 fichiers JSON dans `packages/ui/src/themes/` — **vérifié : 13** (§6.1) :
  10 thèmes expressifs (`aurora, lagoon, boreal, sakura, vesper, solara, terra,
  verdant, citrus, cosmos`) + 3 presets (`slate`, `nocturne`, `high-contrast`).
- Le catalogue est assemblé dans `packages/ui/src/themes/index.ts` :
  - `THEMES` (10 thèmes expressifs) → `index.ts:32-43`
  - `PRESETS` (3 presets) → `index.ts:46-50`
  - `THEME_CATALOG` = `{...THEMES, ...PRESETS}` → `index.ts:53-56`
- Chaque JSON est importé statiquement (`index.ts:17-29`). Ajouter un thème =
  ajouter un fichier + une ligne d'import + une ligne dans `THEMES`/`PRESETS`
  (`index.ts:5-6`, `types.ts:19-21`).

### 1.2 La résolution (JSON → `--aurora-*`)

`packages/ui/src/themes/resolve.ts` :

| Fonction | Ligne | Rôle |
|---|---|---|
| `gradientCSS(g)` | `resolve.ts:40-46` | rend `{angle?, stops[]}` → `linear-gradient(Ndeg, …)` ; `""` si < 2 stops (jamais de fallback faux, AD-13) |
| `hexLuminance(hex)` | `resolve.ts:72-83` | luminance relative WCAG 2.x |
| `contrastRatio(a,b)` | `resolve.ts:85-90` | ratio WCAG 1–21 |
| `accentInk(bg, ink, opp)` | `resolve.ts:99-104` | choisit l'encre la plus lisible sur un fond accent |
| `accentColorsFor(theme, style)` | `resolve.ts:110-116` | bascule `colors` ↔ `colorsDark` selon le style neutre |
| `resolveToken(theme, style, key, preset?)` | `resolve.ts:121-215` | résout UN token |
|  `resolveThemeCSSVars(theme, style, preset?)` | `resolve.ts:218-263` | produit le record plat `--aurora-*` |
| `toShadcnVars(cssVars)` | `resolve.ts:271-297` | mappe `--aurora-*` → alias shadcn (`--primary`, `--accent`, …) |

Points précis :

- `resolveToken` résout `theme.gradient` → valeur CSS (`resolve.ts:199-200`) via
  `gradientCSS(theme.gradient)` calculé en `resolve.ts:167`.
- `resolveThemeCSSVars` construit la liste de clés (`resolve.ts:224-233`), et
  mappe la clé `theme.gradient` **spécifiquement** vers le nom de variable
  `--aurora-theme-gradient` (`resolve.ts:237-238`) ; toutes les autres clés
  prennent la forme `--aurora-<clé avec points remplacés par des tirets>`
  (`resolve.ts:239-248`).
- Le nommage TIRET (et non POINT) est un contrat verrouillé par test :
  `packages/ui/test/theme-css-vars-naming.test.ts:28-47`.

### 1.3 L'injection (provider → DOM)

`packages/ui/src/theme/provider.tsx` :

- `AuroraThemeProvider` appelle `resolveThemeCSSVars(theme, style, preset)`
  puis `toShadcnVars(cssVars)` et fusionne le tout (`provider.tsx:88-89`).
- Écrit chaque variable sur `document.documentElement` en inline
  (`provider.tsx:99-133`, écriture `el.style.setProperty(k, v)` à `:132`).
- Cas particulier : si un thème image est actif
  (`data-aurora-image-theme`), les surfaces shadcn `--card`/`--popover`/
  `--background` sont **sautées** (`provider.tsx:124-131`) pour laisser le CSS
  piloter le lissage.

Consommateurs du provider :

- `apps/mobile/src/ux/theme-adapter.tsx:91` — `FocusThemeAdapter` enveloppe le
  provider (Layer-3, OQ-15).
- `apps/mobile/src/main.tsx:146-155` — `themeName = auroraTheme === 'auto' ?
  'aurora' : auroraTheme`, passé à `FocusThemeAdapter`.
- `apps/web-app/src/main.tsx:21-23` — provider par défaut (sans thème explicite).
- `packages/ui/.storybook/preview.tsx:34-39` — provider Storybook.

### 1.4 Les deux formes de variables côté Tailwind (v3)

- `packages/ui/tailwind.config.ts:18-77` mappe les couleurs sur des **triplets
  HSL** (`hsl(var(--aurora-*-h) / 1)`). Ces triplets `-h` sont écrits en
  statique dans `packages/ui/src/styles/aurora.css:20-48` (`:root`) et
  `:53-76` (`.dark`). Le provider **n'émet pas** ces `-h` (vérifié : aucune
  correspondance `-h` dans `resolve.ts`/`provider.tsx`, §6.5).
- `apps/mobile/tailwind.config.js:33-88` et `apps/web-app/tailwind.config.ts:49-89`
  mappent les couleurs sur des **valeurs pleines** (`var(--primary)`,
  `var(--background)`, …). C'est la forme qui **fonctionne** avec le provider
  (justification écrite : `apps/web-app/tailwind.config.ts:9-22`).
- Tailwind = **v3.4.19** (`packages/ui/package.json:163`,
  `apps/mobile/package.json:58`, lock `pnpm-lock.yaml:8192`). La syntaxe v4 est
  neutralisée par `packages/ui/postcss.config.cjs` (plugins `tailwindcss` v3 +
  autoprefixer).

---

## §2 · Réponses factuelles aux questions

### Q1 — `--aurora-theme-gradient` est-il RÉELLEMENT consommé dans l'UI ?

**NON. C'est un token émis et testé, mais jamais lu par aucune vue.**

Preuves :

1. Le token est **émis** : `resolve.ts:237-238` (nom), `resolve.ts:199-200`
   (valeur) ; et posé en fallback statique `:root` dans
   `apps/mobile/src/styles/tokens.css:109`.
2. La recherche d'une **lecture** échoue :
   `grep -rn "var(--aurora-theme-gradient" .` → **exit 1, zéro occurrence**
   (§6.2). Personne ne fait `background: var(--aurora-theme-gradient)`.
3. Le seul rendu de gradient de thème dans l'UI passe par un **appel JS direct**
   à `gradientCSS()`, pas par la variable CSS :
   `apps/mobile/src/pages/settings/index.tsx:41` (import) et
   `:114` (`const gradient = gradientCSS(theme.gradient)`), utilisé par
   `swatchBackground()` (`:87`) pour la vignette de `/settings`
   (`:315`).
4. Les seules autres occurrences sont des **tests** et de la **documentation** :
   `packages/ui/test/theme-gradient.test.ts` (tout le fichier) et
   `packages/ui/test/tokens-css-drift.test.ts:213-217`.

**Constat majeur :** `--aurora-theme-gradient` est un **token mort côté UI**. Il
est émis, il est verrouillé par 2 fichiers de test, il est déclaré en fallback
dans `tokens.css` — mais **aucun style, aucun composant, aucune page ne le
consomme**. La vignette de thème lit directement le JSON. Toute nouvelle
intégration de gradient doit décider explicitement : soit on **consomme** enfin
ce token (le brancher sur les surfaces décoratives), soit on **le retire** — mais
on ne doit pas empiler une 2ᵉ génération de gradients morts.

### Q2 — Peut-on avoir PLUSIEURS gradients par thème ?

**Non, pas aujourd'hui. Le modèle en porte exactement UN par thème.**

- Le JSON ne porte qu'**une** clé `gradient` : objet `{ angle?, stops[] }`
  (`types.ts:117-122`). Vérifié : les 10 thèmes expressifs ont `"gradient"` = 1
  occurrence, les 3 presets = 0 (§6.4).
- `AuroraTheme["gradient"]` est **singulier** (`types.ts:117`).
- `gradientCSS()` prend un seul `g` et rend une seule chaîne (`resolve.ts:40-46`).
- `resolveToken` ne gère que la clé scalaire `theme.gradient` (`resolve.ts:66`,
  `:199-200`).
- `resolveThemeCSSVars` émet une seule variable `--aurora-theme-gradient`
  (`resolve.ts:237-238`).
- Le champ pluriel `gradients` **existe** dans le JSON (ex. `aurora.json:24`
  `"gradients": "cyan → blue → violet"`) mais c'est une **chaîne descriptive**,
  jamais parsée par le code (vérifié : `grep -rn "\.gradients"` → **exit 1**,
  §6.6 ; commentaire explicite `types.ts:123-124` « descriptive »).

**Conséquence pour la mission :** pour supporter N gradients par thème, il faut
un **changement de schéma** (nouvelle clé structurée) — voir §3.

### Q3 — Comment ajouter des palettes nommées sans casser les 13 thèmes ?

Trois leviers, tous **additifs** (aucune clé existante n'est renommée ni
supprimée) :

1. **Étendre le JSON d'un thème** avec une clé optionnelle (ex. `palettes`),
   comme l'a été `gradient` (déjà optionnel : `types.ts:117` `gradient?:`).
   Un thème sans la clé garde son comportement actuel.
2. **Émettre des variables supplémentaires** depuis `resolveThemeCSSVars`
   (nouvelles clés `--aurora-palette-<nom>-<slot>`), sans toucher aux clés
   existantes (`resolve.ts:224-248`). `toShadcnVars` (`resolve.ts:271-297`) mappe
   un **ensemble fixe** d'alias : ajouter des palettes ne le modifie pas, donc
   les alias shadcn restent stables.
3. **Ne pas toucher `AuroraPreset`** : un preset reste « accent-only »
   (`types.ts:142-153`, `resolve.ts:153-160`). Les palettes nommées vivent sur
   le thème expressif, pas sur le preset.

Contraintes de non-régression à respecter (toutes déjà verrouillées par test —
voir §4).

### Q4 — Quelles contraintes d'accessibilité sont DÉJÀ outillées ?

Trois primitives, exportées publiquement (`packages/ui/src/index.ts:30-33`) :

| Primitive | Ligne | Garantie |
|---|---|---|
| `hexLuminance(hex)` | `resolve.ts:72-83` | luminance relative sRGB (formule WCAG 2.x) |
| `contrastRatio(a, b)` | `resolve.ts:85-90` | ratio de contraste 1–21 |
| `accentInk(bg, ink, opp)` | `resolve.ts:99-104` | encre lisible maximisant le ratio |

Usages déjà en place :

- `resolveToken` choisit `accent.on-primary` via `accentInk(...)`
  (`resolve.ts:171-176`) — l'encre n'est **jamais** écrite en dur dans le JSON.
- `apps/mobile/src/ux/image-theme.tsx:107` réutilise `accentInk(...)` pour
  l'ancre chromatique du thème image (`--aurora-accent-on-primary`).
- Tests : `packages/ui/test/theme-dark.test.ts:79-92` vérifie que `accentInk`
  retient l'encre de meilleur contraste et que le ratio retenu ≥ 4.5.

Règles additionnelles déjà outillées (le nouveau doit s'y conformer) :

- **Chaque thème expressif doit fournir `colorsDark`** et sa `surface` dark doit
  avoir une luminance < 0.55 : `theme-dark.test.ts:33-50`.
- **États sémantiques immuables** : un thème ne redéfinit jamais
  `success/warning/danger/info` (règle bloquante 05 §5.1) ; testé
  `theme-dark.test.ts:53-59`.
- **Tous les stops de gradient sont des hex `#RRGGBB`** et ≥ 2 stops :
  `theme-gradient.test.ts:19-28`.
- **Gradients tous distincts** (aucune collision entre thèmes) :
  `theme-gradient.test.ts:60-70`.
- Cible WCAG AA par couple `thème × style neutre` (`docs/design-system/overview.md:92`).

**Exigence pour la nouvelle intégration :** toute palette nommée fournie par
l'opérateur devra (a) fournir un `colorsDark` OU documenter explicitement son
absence, (b) passer `contrastRatio ≥ 4.5` sur l'encre calculée, (c) ne pas
toucher aux tokens sémantiques.

---

## §3 · Schéma JSON proposé (CLÉS SEULEMENT — aucune valeur)

> Principe : **100 % additif**. Toutes les clés ci-dessous sont **optionnelles**.
> Un thème qui ne les déclare pas reste strictement identique à aujourd'hui.
> Aucune valeur n'est écrite ici : l'opérateur les fournit.

### 3.1 Palettes nommées (sur un thème expressif)

```jsonc
{
  // … clés existantes (name, colors, colorsDark, gradient, …) inchangées …

  "palettes": {
    "<nom-de-palette>": {                 // ex. "brand", "data", "accent-alt"
      "label": "<libellé affiché>",        // string, humain (facultatif)
      "role": "<rôle sémantique>",         // string, doc (facultatif)
      "colors": {                          // A_FOURNIR_PAR_L_OPERATEUR
        "primary":   "A_FOURNIR_PAR_L_OPERATEUR",
        "secondary": "A_FOURNIR_PAR_L_OPERATEUR",
        "accent":    "A_FOURNIR_PAR_L_OPERATEUR",
        "surface":   "A_FOURNIR_PAR_L_OPERATEUR"
      },
      "colorsDark": {                      // facultatif (cf. Q4)
        "primary":   "A_FOURNIR_PAR_L_OPERATEUR",
        "secondary": "A_FOURNIR_PAR_L_OPERATEUR",
        "accent":    "A_FOURNIR_PAR_L_OPERATEUR",
        "surface":   "A_FOURNIR_PAR_L_OPERATEUR"
      }
    }
  }
}
```

Émission attendue (dérivée, pas écrite en dur) :
`--aurora-palette-<nom>-primary`, `-secondary`, `-accent`, `-surface`,
`-on-primary` (cette dernière calculée par `accentInk`, jamais fournie).

### 3.2 Gradients multiples (remplace/étend la clé `gradient` singulière)

Deux options possibles — **à trancher par l'opérateur** :

**Option A (recommandée, additive)** — conserver `gradient` (rôle = gradient
principal, déjà consommé par la vignette) ET ajouter une collection :

```jsonc
{
  "gradient": { "angle": 0, "stops": ["A_FOURNIR_PAR_L_OPERATEUR", "A_FOURNIR_PAR_L_OPERATEUR"] },

  "gradientsExtra": {
    "<nom-de-gradient>": {                // ex. "hero", "card", "focus"
      "label": "<libellé>",               // facultatif
      "angle": 0,                          // nombre, facultatif (défaut 120)
      "stops": [                           // 2+ stops, A_FOURNIR_PAR_L_OPERATEUR
        "A_FOURNIR_PAR_L_OPERATEUR",
        "A_FOURNIR_PAR_L_OPERATEUR"
      ]
    }
  }
}
```

Émission attendue : `--aurora-gradient-<nom>` (en plus de
`--aurora-theme-gradient` conservé pour compatibilité).

**Option B (migration)** — transformer `gradient` en collection et garder
`theme.gradient` pointant sur la clé « default ». Plus invasive : casse
`gradientCSS(theme.gradient)` (`resolve.ts:167`) et le test
`theme-gradient.test.ts` (lecture de `THEMES[name].gradient`). **Non
recommandée** pour une première étape.

### 3.3 Emplacements réservés pour l'opérateur

Toute valeur couleur manquante = `A_FOURNIR_PAR_L_OPERATEUR`. Aucune
proposition, aucune conversion, aucune valeur par défaut inventée.

---

## §4 · Impact sur `types.ts` / `resolve.ts` / `toShadcnVars`

### 4.1 `packages/ui/src/themes/types.ts`

- Ajouter à `AuroraTheme` (interface, `types.ts:78-136`) :
  - `palettes?: Record<string, AuroraPalette>` — nouveau type `AuroraPalette`
    calqué sur le sous-ensemble couleur de `AuroraTheme` (voir §3.1).
  - `gradientsExtra?: Record<string, { angle?: number; stops: string[]; label?: string }>`.
- **Aucune** clé existante n'est modifiée → `THEMES`/`PRESETS` (`types.ts:174-184`)
  inchangés.
- Optionnel : ajouter un type `ThemePaletteName` si on veut fermer l'ensemble des
  noms de palette (AD-9 analogie), sinon `Record<string, …>` ouvert.

### 4.2 `packages/ui/src/themes/resolve.ts`

- `resolveThemeCSSVars` (`resolve.ts:218-263`) : après la boucle existante,
  itérer sur `theme.palettes` / `theme.gradientsExtra` (si présents) et ajouter
  les variables `--aurora-palette-*` / `--aurora-gradient-*`.
  - Réutiliser `accentColorsFor(theme, neutralStyle)` pour le choix light/dark
    (`resolve.ts:110-116`).
  - Réutiliser `gradientCSS()` (`resolve.ts:40-46`) pour rendre chaque gradient.
  - Réutiliser `accentInk()` (`resolve.ts:99-104`) pour `*-on-primary`.
- `resolveToken` (`resolve.ts:121-215`) : n'a **pas** besoin de changer si les
  palettes ne sont pas exposées comme tokens scalaires ; sinon, ajouter une
  branche lisible de type `palette.<nom>.<slot>` (forme tiret à l'émission,
  cf. contrat `theme-css-vars-naming.test.ts`).
- `gradientCSS` : **inchangée** en Option A.
- `toShadcnVars` (`resolve.ts:271-297`) : **inchangée**. Elle mappe un ensemble
  fixe d'alias ; les nouvelles variables ne sont pas des alias shadcn. (Un alias
  shadcn ne doit être ajouté que si un composant shadcn doit pointer sur une
  palette nommée — décision explicite, pas automatique.)

### 4.3 `packages/ui/src/theme/provider.tsx`

- **Aucun changement de structure** : le provider itère déjà sur
  `Object.entries(value.cssVars)` (`provider.tsx:125`) et écrit tout. Les
  nouvelles variables seront posées automatiquement.
- Vérifier le bloc image-theme (`provider.tsx:124-131`) : n'exclut que
  `--card`/`--popover`/`--background`, donc les nouvelles variables ne sont pas
  concernées (comportement voulu).

### 4.4 Tailwind / CSS statique

- `apps/mobile/tailwind.config.js` et `apps/web-app/tailwind.config.ts` :
  ajouter des entrées **uniquement si** on veut exposer les palettes comme
  classes utilitaires (`bg-palette-brand`, …). Sinon, aucun changement — les
  variables restent lisibles via `var(--aurora-palette-*)` en CSS.
- `packages/ui/tailwind.config.ts` (forme triplet HSL) : **ne pas toucher** —
  les palettes sont émises en valeurs pleines par le provider, pas en triplet.

---

## §5 · Stratégie de non-régression des 13 thèmes

### 5.1 Invariants à ne pas casser (chacun est déjà testé)

| Invariant | Test qui le garde |
|---|---|
| Noms de variables en TIRET, jamais en POINT | `theme-css-vars-naming.test.ts:28-47` |
| Aliases shadcn non vides pour tout thème | `theme-css-vars-naming.test.ts:49-69` |
| Light/dark émettent les **mêmes noms** de variables | `theme-css-vars-naming.test.ts:72-77` |
| Chaque thème expressif : gradient ≥ 2 stops hex | `theme-gradient.test.ts:19-28` |
| Presets : aucun gradient | `theme-gradient.test.ts:30-34` |
| Gradients tous distincts | `theme-gradient.test.ts:60-70` |
| Chaque thème : `colorsDark` présent, surface dark < 0.55 | `theme-dark.test.ts:33-50` |
| Sémantiques identiques entre thèmes | `theme-dark.test.ts:53-59` |
| `:root` de `tokens.css` non dérivé du SSoT | `tokens-css-drift.test.ts` (tout le fichier) |

### 5.2 Règles d'implémentation

1. **Additif strict** : nouvelles clés optionnelles ; aucune clé retirée/renommée.
2. **Défaut = comportement actuel** : un thème sans `palettes`/`gradientsExtra`
   doit produire **exactement** le même record de variables qu'aujourd'hui
   (comparaison octet à octet recommandée dans un test).
3. **Émission triée/stable** : l'ordre des nouvelles variables ne doit pas
   affecter les clés existantes.
4. **Pas de nouvelle variable sans consommateur** : cf. Q1 — avant d'émettre un
   gradient supplémentaire, décider qui le consomme (sinon token mort, comme
   `--aurora-theme-gradient` aujourd'hui).
5. **`tokens.css` fallback** : si un nouveau token est ajouté, décider s'il doit
   avoir un fallback `:root` dans `apps/mobile/src/styles/tokens.css` (sinon
   vide avant hydratation — cf. leçon `theme-css-vars-naming.test.ts:13-18`).
   `apps/web-app` n'a **aucun** fallback `:root` (`apps/web-app/src/styles/` ne
   contient que `tw.css`).

### 5.3 Incohérence pré-existante à signaler (non bloquante)

`apps/mobile/src/pages/settings/index.tsx:73-75` déclare
`GRADIENT_FAMILY = [aurora, lagoon, cosmos, vesper, solara]` (5 thèmes affichés
sous « Dégradés »), alors que **les 10 thèmes expressifs déclarent un
`gradient`** dans leur JSON (§6.4). La section « Couleurs unies »
(`settings/index.tsx:266-293`) liste donc 5 thèmes (boreal, sakura, terra,
verdant, citrus) qui **ont pourtant** un gradient déclaré. C'est une
catégorisation **d'affichage** (commentaire `settings/index.tsx:69-70` :
« DISPLAY-ONLY categorization »), pas un bug de données — mais toute refonte
multi-gradient devra clarifier cette règle d'affichage.

---

## §6 · Tests à ajouter

À placer dans `packages/ui/test/` (vitest, projet `@aurora/ui`).

1. **`theme-palettes.test.ts`** (nouveau)
   - Un thème avec `palettes` émet `--aurora-palette-<nom>-primary|secondary|accent|surface`.
   - `*-on-primary` est calculé par `accentInk` (jamais lu du JSON) et son ratio
     `contrastRatio ≥ 4.5`.
   - Un thème **sans** `palettes` n'émet **aucune** variable `--aurora-palette-*`
     (non-régression).
   - Si `palettes[x].colorsDark` est fourni, le style dark l'utilise ; sinon
     repli sur `palettes[x].colors` (calqué sur `accentColorsFor`).
2. **`theme-gradients-extra.test.ts`** (nouveau)
   - Un thème avec `gradientsExtra` émet `--aurora-gradient-<nom>` rendu par
     `gradientCSS` (angle par défaut 120, `""` si < 2 stops).
   - Les stops sont des hex `#RRGGBB` (réutiliser le motif de
     `theme-gradient.test.ts:25`).
   - Les gradients supplémentaires sont distincts deux à deux.
   - `--aurora-theme-gradient` reste **inchangé** (compatibilité).
3. **`theme-nonregression.test.ts`** (nouveau)
   - Pour chaque `Object.keys(THEMES)`, le record `resolveThemeCSSVars(name,
     "light")` est **identique** à une référence figée (snapshot) — prouve que
     l'ajout additif n'a rien changé.
   - Light/dark émettent les mêmes noms de variables (étendre
     `theme-css-vars-naming.test.ts:72-77` aux nouveaux tokens).
4. **Étendre `theme-css-vars-naming.test.ts`** : vérifier qu'aucun nouveau nom
   ne contient de POINT.
5. **Test d'intégration provider** (optionnel) : monter `AuroraThemeProvider`
   avec un thème à palettes et vérifier que les variables sont écrites sur le
   `target` (même mécanisme que `provider.tsx:125-132`).

---

## §7 · Étapes d'exécution (vérifiables, ordonnées)

| # | Étape | Preuve attendue |
|---|---|---|
| 1 | Trancher Option A/B pour les gradients (§3.2) | décision écrite dans ce doc |
| 2 | Recevoir les couleurs de l'opérateur (§8) | listes complètes, `A_FOURNIR_PAR_L_OPERATEUR` = 0 |
| 3 | Ajouter les types optionnels dans `types.ts` | `pnpm --filter @aurora/ui typecheck` = 0 erreur |
| 4 | Étendre `resolveThemeCSSVars` (palettes + gradients) | tests §6.1/§6.2 verts |
| 5 | Ajouter le test de non-régression (§6.3) | snapshot identique pour les 13 entrées |
| 6 | Décider des consommateurs UI (Q1) | au moins 1 usage `var(--aurora-palette-*)` OU décision « token exposé pour consommateurs externes » |
| 7 | (Si retenu) fallback `:root` dans `tokens.css` | `tokens-css-drift.test.ts` mis à jour + vert |
| 8 | Gates | `packages/ui/test/*` verts, `pnpm --filter @aurora/ui typecheck` = 0 |

---

## §8 · Ce qu'il me faut de l'opérateur

> **Aucune couleur n'est proposée ici.** Chaque entrée manquante est
> `A_FOURNIR_PAR_L_OPERATEUR`.

### 8.1 Pour chaque palette nommée à ajouter

- **Nom technique** de la palette (slug, `kebab-case`).
- **Libellé** affiché + **rôle** (documentation).
- **Thème(s) cible(s)** : palette globale, ou rattachée à un/des thème(s)
  expressif(s) précis ?
- **4 couleurs light** : `primary`, `secondary`, `accent`, `surface`
  → `A_FOURNIR_PAR_L_OPERATEUR` ×4.
- **4 couleurs dark** (`colorsDark`) : idem → `A_FOURNIR_PAR_L_OPERATEUR` ×4,
  OU décision explicite « repli sur light ».
- Contrainte : `contrastRatio` de chaque couleur avec son encre ≥ 4.5 (§Q4).

### 8.2 Pour chaque gradient à ajouter

- **Nom technique** du gradient (slug).
- **Thème(s) cible(s)**.
- **Angle** (degrés CSS ; défaut 120 si omis).
- **Stops** : liste ordonnée de 2+ hex `#RRGGBB`
  → `A_FOURNIR_PAR_L_OPERATEUR`.
- Décision : ce gradient **remplace**-t-il le gradient principal du thème, ou
  s'ajoute-t-il à côté (`--aurora-gradient-<nom>`) ?

### 8.3 Décisions transverses

- **Option A vs B** pour le schéma des gradients (§3.2).
- **Qui consomme** les nouveaux gradients ? (sinon on reconduit le token mort
  constaté en Q1). Ex. : surfaces décoratives, en-têtes de vue, vignettes
  `/settings`, cartes `aurora-card`.
- **Palettes exposées en classes Tailwind** (utilitaires) ou **uniquement en
  variables CSS** ?
- **Fallback `:root`** dans `apps/mobile/src/styles/tokens.css` : oui/non ?
- **`apps/web-app`** (aucun fallback `:root` aujourd'hui) : faut-il le doter de
  fallbacks avant d'émettre de nouveaux tokens ?

---

## §9 · Sorties de vérification (collées, telles qu'exécutées)

### 9.1 `ls packages/ui/src/themes/*.json | wc -l` → `13`

```
$ ls packages/ui/src/themes/*.json | wc -l
13
```

### 9.2 `grep -rn "aurora-theme-gradient" --include="*.ts" --include="*.tsx" --include="*.css" packages apps | grep -v node_modules`

```
packages/ui/src/themes/resolve.ts:35: * the CONSUMABLE version of the palette: `--aurora-theme-gradient`.
packages/ui/src/themes/resolve.ts:38: * usable gradient gets no `--aurora-theme-gradient` at all.
packages/ui/src/themes/resolve.ts:162:  // `--aurora-theme-gradient` by the swatch preview + decorative
packages/ui/src/themes/resolve.ts:238:        ? "--aurora-theme-gradient"
packages/ui/src/themes/types.ts:112:   * `resolveThemeCSSVars` to emit `--aurora-theme-gradient`, the swatch
packages/ui/test/tokens-css-drift.test.ts:213:  it("`--aurora-theme-gradient` :root = gradientCSS(THEMES.aurora.gradient)", () => {
packages/ui/test/tokens-css-drift.test.ts:217:    expect(cssVal?.toLowerCase(), `:root --aurora-theme-gradient drift: "${cssVal}" ≠ "${expected}"`).toBe(expected.toLowerCase());
packages/ui/test/theme-gradient.test.ts:2: * theme-gradient.test.ts — the theme-owned `--aurora-theme-gradient`
packages/ui/test/theme-gradient.test.ts:45:  it("resolveThemeCSSVars() emits --aurora-theme-gradient for a theme, '' for a preset", () => {
packages/ui/test/theme-gradient.test.ts:47:    const key = "--aurora-theme-gradient";
packages/ui/test/theme-gradient.test.ts:49:    expect(themeVars["--aurora-theme-gradient"]).toContain(THEMES.aurora.gradient!.stops[0]);
packages/ui/test/theme-gradient.test.ts:56:      expect(presetVars["--aurora-theme-gradient"]).toMatch(/^linear-gradient\(/);
packages/ui/test/theme-gradient.test.ts:63:      const g = resolveThemeCSSVars(name, "light")["--aurora-theme-gradient"]!;
apps/mobile/src/styles/tokens.css:109:  --aurora-theme-gradient: linear-gradient(120deg, #22c7d6, #3678f6, #7b61ff);
```

Lecture : 3 déclarations de code (`resolve.ts`), 1 fallback CSS (`tokens.css`),
de la doc (`types.ts`), et **uniquement des tests**. **Aucune** lecture `var(...)`.

### 9.3 `grep -n "version" packages/ui/package.json | grep -i tailwind`

```
$ grep -n "version" packages/ui/package.json | grep -i tailwind
(exit 1 — aucune ligne ne contient à la fois « version » et « tailwind »)
```

Précision : la version de Tailwind n'est pas sur une ligne portant le mot
`version`. Elle se lit sur la ligne de dépendance :

```
$ grep -n "tailwind" packages/ui/package.json
133:    "tailwind-merge": "^3.7.0",
147:    "@tailwindcss/postcss": "^4.3.3",
163:    "tailwindcss": "^3.4.19",
```

→ **Tailwind v3.4.19** (`packages/ui/package.json:163`, confirmé
`apps/mobile/package.json:58`, lock `pnpm-lock.yaml:8192`
`tailwindcss@3.4.19:`). `@tailwindcss/postcss` ^4.3.3 est présent mais la
syntaxe v4 est neutralisée par `packages/ui/postcss.config.cjs`.

### 9.4 Vérification : clé `gradient` par fichier JSON

```
$ for f in packages/ui/src/themes/*.json; do n=$(basename $f); g=$(grep -c '"gradient"' $f); gs=$(grep -c '"gradients"' $f); echo "$n gradient=$g gradients=$gs"; done
aurora.json gradient=1 gradients=1
boreal.json gradient=1 gradients=1
citrus.json gradient=1 gradients=1
cosmos.json gradient=1 gradients=1
high-contrast.json gradient=0 gradients=0
lagoon.json gradient=1 gradients=1
nocturne.json gradient=0 gradients=0
sakura.json gradient=1 gradients=1
slate.json gradient=0 gradients=0
solara.json gradient=1 gradients=1
terra.json gradient=1 gradients=1
verdant.json gradient=1 gradients=1
vesper.json gradient=1 gradients=1
```

### 9.5 Vérification : le provider n'émet pas de triplet `-h`

```
$ grep -n '\-h"' packages/ui/src/themes/resolve.ts packages/ui/src/theme/provider.tsx
(exit 1 — aucune correspondance)
```

### 9.6 Vérification : le pluriel `gradients` n'est jamais lu par le code

```
$ grep -rn "\.gradients" . --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v "\.git/"
(exit 1 — aucune correspondance)
```

### 9.7 Vérification : aucune lecture `var(--aurora-theme-gradient)`

```
$ grep -rn "var(--aurora-theme-gradient" . 2>/dev/null | grep -v "\.git/"
(exit 1 — aucune correspondance)
```
