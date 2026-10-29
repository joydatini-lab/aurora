# Personnalisation — thèmes, dégradés, accent dynamique

> Note d'exécution. Tout ce qui suit a été **mesuré**, pas supposé. Les points
> qui n'ont pas pu être vérifiés sont marqués « non vérifié ».

## 1. Sources demandées : ce qui répond, ce qui ne répond pas

| Source demandée | Commande de test | Résultat réel |
|---|---|---|
| `tweakcn.com` (registre shadcn) | `curl -m 6 https://tweakcn.com/r/themes/default.json` | **HTTP 000 — injoignable** |
| `colorswitchcn.heywinit.me` | `curl -m 6 …/r/colorswitchcn.json` | **HTTP 000 — injoignable** |
| `webgradients.com` | `curl -m 6 https://webgradients.com` | **HTTP 000 — injoignable** |
| `uigradients.com` | `curl -m 6 https://uigradients.com` | **HTTP 000 — injoignable** |
| `registry.npmjs.org` | `npm view …` | **accessible** |

L'environnement d'exécution n'a d'accès sortant que vers npm, PyPI et GitHub.
Aucune des quatre sources web ne peut donc être utilisée directement, et
`npx shadcn@latest add https://tweakcn.com/...` échoue par construction.

## 2. Alternatives retenues (paquets npm existants, licence MIT)

Aucune couleur n'a été inventée : les deux jeux de données sont des **copies
conformes** de bibliothèques existantes.

### Thèmes — `@madooei/shadcn-theme-presets` écarté

Testé en premier, conformément à la consigne. Deux incompatibilités rédhibitoires :

- `peerDependencies: react >=19.0.0` — le projet est en **React 18.3.1** ;
- peer `@madooei/shadcn-all-in-one` : installe une **seconde bibliothèque de
  composants**, exactement ce que la purge de l'ancien design system visait à
  éliminer.

### Thèmes — `@mahmood-khalil57/uno-tweakcn@0.1.0` (MIT)

Contient les presets tweakcn complets, en OKLCH, clair **et** sombre.
44 thèmes disponibles ; **10 installés**, choisis pour couvrir les familles :

| Famille | Presets |
|---|---|
| neutre | `modern-minimal`, `mono` |
| sombre | `catppuccin`, `cosmic-night`, `darkmatter` |
| coloré | `amethyst-haze`, `ocean-breeze`, `sunset-horizon`, `tangerine` |
| radical | `neo-brutalism` |

Plus le thème maison « Encre & Lumière », qui reste **écrit en CSS** et n'est
pas un objet de preset : c'est ce qui permet d'y revenir sans le dupliquer.

Ce qui est repris : les **24 couleurs** et `radius`.
Ce qui est ignoré volontairement : `font-*`, `spacing`, `tracking-*`,
`shadow-*` — un thème change la couleur, pas le squelette typographique.

### Dégradés — `tailwindcss-webgradients@1.0.2` (MIT)

Portage officiel de webgradients.com : **179 dégradés**, `src/gradients.js`.
**12 extraits**, recopiés caractère par caractère (couleurs, angles, arrêts
inchangés) : `warm-flame`, `night-fade`, `young-passion`, `sunny-morning`,
`winter-neva`, `ripe-malinka`, `malibu-beach`, `new-life`, `true-sunset`,
`plum-plate`, `aqua-splash`, `midnight-bloom`.

Chaque dégradé existe sous deux formes : variable `--gradient-<nom>` et classe
`.bg-webgradient-<nom>`.

### Sélecteur de thème

Les deux composants proposés sont indisponibles : `colorswitchcn` (injoignable)
et `@madooei/shadcn-theme-presets` (React 19 + seconde UI). Le sélecteur est
donc écrit ici — **c'est la seule partie non « prête à l'emploi »**, et elle se
limite à ~40 lignes : une grille de boutons qui appellent `setPresetId`.

Le `ThemeProvider` existant a été **étendu**, pas doublé (consigne respectée) :
il porte désormais mode + preset + accent + fond.

## 3. Accent dynamique depuis l'image de fond

Chaîne : `File` → `createObjectURL` → `Image` → canvas **48×48** →
`getImageData` → quantification en seaux 16³ → 3 teintes → variables CSS.

- `--primary` et `--ring` : teinte dominante chromatique ;
- `--accent` : seconde teinte à écart de teinte ≥ 40° ;
- `--tint` : teinte moyenne sombre, utilisée par le voile des cartes ;
- `--primary-foreground` / `--accent-foreground` : **noir ou blanc par calcul
  de contraste WCAG**, jamais par choix esthétique.

Aucune bibliothèque pour cela : `colorthief@3.5.0` est compatible (ESM, export
navigateur, types fournis) mais n'apporte rien ici, `node-vibrant@4.0.4` expose
un point d'entrée `throw` hors Node et pèse plus lourd que le besoin. Le canvas
natif est explicitement autorisé par la spécification.

Cas limites traités : image entièrement transparente → gris neutre (aucune
couleur inventée) ; image trop lourde pour `localStorage` → fond non persisté,
palette conservée, avertissement affiché.

## 4. Fondu de 0,8 s

`@property --<token> { syntax: '<color>' }` pour 19 variables, puis
`transition: --primary 0.8s …` sur `html`. Sans l'enregistrement `@property`,
une variable personnalisée est une **chaîne** : elle change instantanément.
`prefers-reduced-motion` annule le fondu.

## 5. Contraste : ce que la mesure dit

Sur les 20 paires texte/fond des 10 presets (clair + sombre) :

- **toutes** les paires `background/foreground` tiennent AA (minimum mesuré :
  7,06:1) ;
- **10 paires** `primary/primary-foreground` passent **sous 4,5:1**, la pire à
  **2,28:1** (`ocean-breeze` / clair).

Les couleurs des presets n'ont **pas** été modifiées (consigne : « ne modifie
pas leurs couleurs »). À la place :

1. chaque carte de preset affiche son ratio mesuré (« AA » ou « 2.3:1 ») ;
2. `test/presets.test.ts` fige l'inventaire exact de ces 10 paires — si les
   données changent, le test le signale ;
3. la page Couleurs précise que son badge « AA vérifié » concerne le thème
   maison, et non les presets importés.

## 6. Commandes exécutées et résultats

```bash
curl -m 6 https://tweakcn.com/r/themes/default.json      # 000 (injoignable)
npm view @madooei/shadcn-theme-presets                 # 0.2.1, peer react >=19 (incompatible)
npm view @mahmood-khalil57/uno-tweakcn                 # 0.1.0, MIT, 44 thèmes
npm pack tailwindcss-webgradients@1.0.2                # 179 dégradés, MIT
node --experimental-strip-types --test test/*.test.ts  # 24/24
pnpm -F @aurora/web typecheck                          # 0 erreur
pnpm -F @aurora/web lint                               # 0 warning
npx vite build                                         # 1 650 modules, dist produit
```

## 7. Non vérifié

- Le **rendu visuel** réel (dégradé, flou d'arrière-plan, fondu) : aucun
  navigateur n'est disponible dans cet environnement. La chaîne est vérifiée
  par lecture du DOM et des variables, pas par capture d'écran.
- L'**extraction depuis une vraie photo** : la fonction pure est testée sur des
  images synthétiques ; le passage `Image → canvas` n'a pas été exécuté ici.
- Les parcours Playwright (`e2e/06-themes.spec.ts`) : écrits, non exécutés
  faute de navigateur téléchargeable — ils tournent en CI.
