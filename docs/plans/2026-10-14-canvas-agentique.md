# Canvas Agentique — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **REV2 (2026-10-14) — corrigé après panneau de 4 juges + vérification factuelle (53 agents).**
> Corrections marquantes : `@tiptap/suggestion` (inexistant) → `@tiptap/starter-kit` ; `minimumReleaseAge 1440h (60j)` bloque @tiptap 2.27.3 (publié 2026-09-04 = 40j) → whitelist `@tiptap/*` requise (T1bis) ; `--frozen-lockfile` → `pnpm install` non gelé (T1) ; chemins de tests vers `src/**` (pattern existant) ; contrat `ArtifactData` étendu (`getBinary`/`signedUrl`) (T4) ; worker pdfjs sandbox (T4) ; reimport mobile (T3bis) ; coquille `CanvasSemanticView` (T7) ; `@tldraw/assets` retiré (T9) ; syntaxe pnpm + `build:web` + PowerShell (validation finale).

**Goal:** Un canvas unique (rich editor + 4 visionneuses + graphe sémantique + dessin libre) réutilisable partout dans l'app (mobile Capacitor + desktop Electron), branché sur l'assistant (assistant-ui).

**Architecture:** Canvas = conteneur de vue (CanvasView) + éditeur TipTap auto-portant (packages/ui, plus d'`editorChildren`) + 4 coquilles de visionneuse branchées sur de vrais moteurs (PDF/DOCX/XLSX/table) + `SemanticTreeRenderer` (React Flow, existant) exposé dans le canvas via une coquille `CanvasSemanticView` (non-breaking) + tldraw en vue de dessin libre optionnelle.

**Tech Stack (versions EXACTES, `--save-exact`, pas de `^` ni `~`, lockfile commité) :**

| Paquet | Version exacte | Licence | Où |
|---|---|---|---|
| `react` | `18.3.1` (résolu) | MIT | tous |
| `vite` | `5.4.21` | MIT | tous |
| TypeScript | `5.9.3` | MIT | racine |
| `@antv/g2` | `5.4.8` | Apache-2.0 | packages/ui (desktop) |
| `@antv/f2` + `@antv/f-react` | `5.14.0` + `1.10.0` | Apache-2.0 | packages/ui (mobile) |
| `@antv/infographic` | `0.2.20` | Apache-2.0 | packages/ui |
| `@xyflow/react` + `@dagrejs/dagre` | `12.11.6` + `3.1.1` | MIT | packages/ui |
| `@tiptap/core` / `@tiptap/pm` | `2.27.3` | MIT | packages/ui (déjà) |
| `marked` | `15.0.12` | MIT | packages/ui (SSoT canvas) |
| `@assistant-ui/react` | `0.15.28` | MIT | assistant-ui |
| `motion` | `13.4.1` | MIT | packages/ui |
| `@tiptap/react` + `@tiptap/starter-kit` + 14 extensions | `2.27.3` | MIT | **→ packages/ui (nouveau)** |
| `pdfjs-dist` | `6.1.200` | Apache-2.0 | packages/ui (nouveau) |
| `mammoth` | `1.12.0` | BSD-2-Clause | packages/ui (nouveau) |
| `dompurify` | `3.4.13` | (MPL-2.0 OR Apache-2.0) | packages/ui (nouveau) |
| `xlsx` (SheetJS) | `0.20.3` (tarball `vendor/xlsx-0.20.3.tgz`, SHA-256) | Apache-2.0 | packages/ui (nouveau) |
| `@tldraw/*` (si dessin libre validé) | `2.0.0-alpha.19` (base Apache-2.0, React 18) | Apache-2.0 | packages/ui (optionnel) |

**Notes versions (vérifiées panneau 2026-10-14) :**
- `pdfjs-dist@6.1.200` publié 2026-06-27 (109 j, OK > 14 j ; Apache-2.0 confirmé). Le flag `isEvalSupported` est à **re-confirmer dans le tarball 6.1.200** avant de l'épingler dans le code (fact infirmée partiellement par le panneau : existe en 6.0, à valider 6.1).
- `mammoth@1.12.0` publié 2026-03-12 (216 j, OK ; BSD-2-Clause).
- `dompurify@3.4.13` publié 2026-08-03 (72 j, OK ; licence dual MPL-2.0 OR Apache-2.0). La 3.4.17 (2026-10-12) est refusée par 60 j.
- `marked@15.0.12` (SSoT direct, publié 2025-05-20) + `marked@18.1.1` (transitif via `@assistant-ui/react-markdown`, chaîne non touchée) : 2 versions dans le lock = OK, la règle 1-paquet-1-version ne s'applique qu'à TipTap/ProseMirror.
- `xlsx@0.20.3` absent du npm public (latest = 0.18.5 vulnérable CVE-2024-23417) ; tarball officiel SheetJS ~2,4 Mo.
- `@tiptap/react@2.27.3` publié 2026-09-04 (**40 j = 960 h < seuil 1440 h**) → bloqué sans whitelist (voir T1bis).

---

## Prérequis & décisions (à valider AVANT le Task 1)

1. **Markdown SSoT = `marked` 15.0.12** (AD-16b, `markdownToHtml` + `commentAnchors`). On ne touche pas aux chaînes `react-markdown` (mobile) ni `@assistant-ui/react-markdown` (assistant). → **Validé.**
2. **Dessin libre tldraw** : inclus comme **option à confirmer** (Task 9). Si non activé, saute le Task 9 (et 10).
3. **Vue nœuds sémantique** = `SemanticTreeRenderer` (React Flow, existant, consommé par mobile Knowledge) — intégrée au canvas via une **coquille `CanvasSemanticView` séparée** (non-breaking, ne rentre pas dans l'union `CanvasDocView`). → **Validé.**
4. **Règle « publiée > 14 j » À LUI SEUL** : mais le workspace impose **`minimumReleaseAge: 1440` h = 60 j** (`pnpm-workspace.yaml:6-9`, seul `@assistant-ui/*` exclu). Toute version du plan doit donc faire **les 2** : `npm view <pkg>@<ver> time` (publiée > 14 j, règle AD) **ET** respecter minimumReleaseAge 60 j (ou être whitelistée, voir T1bis).
5. **Une seule version par paquet** dans le monorepo (TipTap/ProseMirror : 2 versions = bugs).
6. **Contrat `ArtifactData`** : extension requise pour les moteurs DOCX/XLSX (voir T4) — le parent fournit le buffer binaire via `StoragePort.signedUrl`/`getBinary` (packages/domain).

**Commandes de vérification avant installation (à exécuter par l'ingénieur au Task 1) :**
```bash
# Screenshot des versions résolues actuelles (filter en flag global, PAS argument local)
pnpm --filter ./packages/ui list --depth 0 | grep -E "tiptap|marked|antv|xyflow|dagre|motion|assistant"
pnpm --filter ./apps/mobile list --depth 0 | grep -E "tiptap|react-markdown|remark"
# Date de publication de chaque version candidate
npm view pdfjs-dist@6.1.200 time --json | tail -3
npm view mammoth@1.12.0 time --json | tail -3
npm view dompurify@3.4.13 time --json | tail -3
npm view "@tiptap/react@2.27.3" peerDependencies time --json
```

---

## Task 1: Figer les versions existantes (§5.2)

**Files:**
- Modify: `packages/ui/package.json`, `apps/mobile/package.json`, `apps/desktop/package.json` (remplacer les `^` par les versions exactes du lock)
- Test: aucun (changement de metadata uniquement)

**Steps:**
1. Édit les `package.json` : `@antv/g2: "5.4.8"`, `@antv/f2: "5.14.0"`, `@antv/f-react: "1.10.0"`, `@antv/infographic: "0.2.20"`, `@xyflow/react: "12.11.6"`, `@dagrejs/dagre: "3.1.1"`, `marked: "15.0.12"`, `@tiptap/core: "2.27.3"`, `@tiptap/pm: "2.27.3"`, `@assistant-ui/react: "0.15.28"`, `motion: "13.4.1"` (packages/ui) ; `@tiptap/react: "2.27.3"`, `@tiptap/starter-kit: "2.27.3"`, `react-markdown: "9.1.0"` (apps/mobile).
2. **`pnpm install` (NON gelé).** pnpm stocke le `specifier` (`^2.11.0`) dans `pnpm-lock.yaml` ; épingler en exact fait diverger `specifier(package.json)` ≠ `specifier(lockfile)` → `--frozen-lockfile` planterait en `OUTDATED_LOCKFILE`. Vérifier `git diff pnpm-lock.yaml` (le champ `specifier` change uniquement, **pas les versions résolues** — minimumReleaseAge protège du bump), puis committer le lockfile. Seule après ça `--frozen-lockfile` passe.
3. `pnpm --filter ./packages/ui typecheck` + `pnpm --filter ./apps/mobile typecheck`.
4. `git commit -m "chore(canvas): figer versions exactes des dépendances (AD-10/15) + sync lockfile"`.

**Expected :** typecheck 0 erreur, lockfile modifié uniquement sur les champs `specifier`.

---

## Task 1bis: Whitelist `@tiptap/*` dans `minimumReleaseAge` (blocant pour T3)

**Files:**
- Modify: `pnpm-workspace.yaml` (l.6-9)

**Steps:**
1. `pnpm-workspace.yaml` : ajouter `- "@tiptap/*"` à `minimumReleaseAgeExclude`. Raison : `@tiptap/react@2.27.3` publié 2026-09-04 (960 h) < seuil 1440 h → `pnpm add` serait **refusé**. (Alternative lead : (b) attendre 2026-11-03, ou (c) baisser temporairement `minimumReleaseAge`.) **Cette recommandation = whitelist ; le lead peut trancher sinon.**
2. `git commit -m "chore(canvas): whitelist @tiptap/* minimumReleaseAge (2.27.3 à 960h < seuil 1440h)"`.

**Expected :** `pnpm add @tiptap/...` autorisée au Task 3.

---

## Task 2: SSoT markdown — figer `marked` 15.0.12, documenter l'ADR

**Files:**
- Create: `docs/adr/canvas-markdown-ssot.md`
- Test: `packages/ui/src/lib/canvas-utils.test.ts` (**pattern existant** — ce fichier est déjà là ; on y ajoute les cas AD-16b manquants)

**Steps:**
1. Ajoute dans `canvas-utils.test.ts` (TDD) : `markdownToHtml("# T")` → `<h1>T</h1>` ; `markdownToHtml("<script>alert(1)</script>")` neutralise le script (AD-16b) ; `commentAnchors` retourne les offsets `[start,end)` corrects.
2. `pnpm --filter ./packages/ui test -- src/lib/canvas-utils.test.ts` → PASS (la commande `test` globale du package existe ; cibler le fichier avec `--`).
3. Écris l'ADR `docs/adr/canvas-markdown-ssot.md` : `marked` = SSoT canvas ; `react-markdown` mobile = SSoT knowledge/learning ; `@assistant-ui/react-markdown` = assistant uniquement ; **pas de migration entre les trois** (changer le moteur du canvas décalerait `commentAnchors`).
4. `git commit -m "feat(canvas): SSoT markdown = marked 15.0.12 (ADR) + tests AD-16b"`.

**Expected :** tests verts, ADR commité.

---

## Task 3: TipTap auto-portant dans packages/ui + extensions (§5.3)

**Files:**
- Modify: `packages/ui/package.json` (ajout `@tiptap/react` + `@tiptap/starter-kit` + 14 extensions — **`@tiptap/suggestion` n'existe pas, retiré**)
- Modify: `packages/ui/src/components/composites/CanvasView.tsx` (`TipTapEditorSurface` auto-portant : plus d'`editorChildren`)
- Create: `packages/ui/src/components/ui/tiptap-extensions.ts` (builder `buildCanvasExtensions` = StarterKit + underline/link/image/table*4/task-list+item/highlight/mention/typography/character-count)
- Test: `packages/ui/src/components/composites/CanvasView.test.tsx` (**pattern `src/`**)

**Steps:**
1. `pnpm --filter ./packages/ui add --save-exact @tiptap/react@2.27.3 @tiptap/starter-kit@2.27.3 @tiptap/extension-underline@2.27.3 @tiptap/extension-link@2.27.3 @tiptap/extension-image@2.27.3 @tiptap/extension-table@2.27.3 @tiptap/extension-table-row@2.27.3 @tiptap/extension-table-cell@2.27.3 @tiptap/extension-table-header@2.27.3 @tiptap/extension-task-list@2.27.3 @tiptap/extension-task-item@2.27.3 @tiptap/extension-highlight@2.27.3 @tiptap/extension-mention@2.27.3 @tiptap/extension-typography@2.27.3 @tiptap/extension-character-count@2.27.3` (préreq : T1bis whitelist fait, sinon `pnpm` refuse).
2. `tiptap-extensions.ts` : `buildCanvasExtensions()` regroupe `StarterKit` + les 14 extensions. (Le menu slash existant — `SlashCommandMenu` de CanvasView — se branchera sur les extensions `mention`/`character-count` ; il n'y a pas d'extension « slash » officielle 2.x, le slash reste UI-only.)
3. `CanvasView.tsx` : `TipTapEditorSurface` → `useEditor({ extensions: buildCanvasExtensions() })` ; `editorChildren` devient **API de compat** (prop optionnelle, ignorée si `useEditor` actif). Le contenu canonique du canvas = le markdown `data.content` (SSoT AD-16b) ; le buffer ProseMirror est **transitoire** (re-sérialisé vers markdown à la save — adapter `onContentChange`).
4. Test : `CanvasView` monte sans crash, l'éditeur rend un bloc `paragraph`.
5. `pnpm --filter ./packages/ui typecheck` + `pnpm --filter ./packages/ui test -- src/components/composites/CanvasView.test.tsx` + `build`.
6. `git commit -m "feat(canvas): TipTap 2.27.3 auto-portant + starter-kit + 14 extensions (sans suggestion)"`.

**Expected :** 0 erreur typecheck, éditeur sans `editorChildren`.

---

## Task 3bis: Reimport mobile — `@tiptap/react` depuis `@aurora/ui`

**Files:**
- Modify: `packages/ui/src/index.ts` (re-export `useEditor` + `buildCanvasExtensions` + types TipTap publics)
- Modify: `apps/mobile/src/pages/canvas/index.tsx` + `apps/mobile/src/components/vault/VaultMdEditor.tsx` (importer depuis `@aurora/ui`, pas `@tiptap/react`)
- Modify: `apps/mobile/package.json` (retirer `@tiptap/react` + `@tiptap/starter-kit` **après** le basculement du reimport, en gardant la version exacte 2.27.3 résolue)

**Steps:**
1. Re-export dans le barrel `packages/ui` ; réécrire les 2 fichiers mobile pour importer `useEditor`/`StarterKit` depuis `@aurora/ui`.
2. **Seulement ensuite** retirer `@tiptap/react`/`@tiptap/starter-kit` de `apps/mobile/package.json` (sinon le canvas mobile casse). Vérifier `pnpm --filter ./apps/mobile why @tiptap/react` = resolu via `@aurora/ui`, version 2.27.3 unique.
3. `pnpm --filter ./apps/mobile typecheck` + `test`.
4. `git commit -m "refactor(canvas): @tiptap/react dédoublonné — mobile via @aurora/ui (1 version ProseMirror)"`.

**Expected :** 1 seule version `@tiptap/*` dans le lockfile.

---

## Task 4: Moteur PDF (`pdfjs-dist` 6.1.200) + DOMPurify + viewer branché + contrat `ArtifactData`

**Files:**
- Modify: `packages/ui/package.json` (`pdfjs-dist: "6.1.200"`, `dompurify: "3.4.13"`)
- Modify: `packages/ui/src/components/composites/ArtifactsView.tsx` (`ArtifactData` L82-109 : ajouter `getBinary?: () => Promise<ArrayBuffer>` et/ou `signedUrl?: string` ; `PdfArtifactViewer` branché)
- Create: `packages/ui/src/components/ui/pdf-viewer.tsx` (rendu canvas 2D, lazy `import('pdfjs-dist')`)
- Create: `docs/adr/canvas-pdfjs-worker-sandbox.md` (worker pdfjs sous sandbox Electron)
- Test: `packages/ui/src/components/composites/ArtifactsView.test.tsx` (**pattern `src/`**)

**Steps:**
1. `pnpm --filter ./packages/ui add --save-exact pdfjs-dist@6.1.200 dompurify@3.4.13`
2. **Étendre `ArtifactData`** (L82) : `getBinary?: () => Promise<ArrayBuffer>` (ou `signedUrl?: string` résolue parent-side via `StoragePort.signedUrl` de packages/domain). Sans ça pdfjs/mammoth/xlsx sont inbranchables (le contrat ne porte que `previewUrl: string`).
3. `pdf-viewer.tsx` : `useEffect` + `import("pdfjs-dist")` (lazy, hors chunk mobile initial) ; `GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url)` (**même version que la lib**) ; `isEvalSupported: false` (**à re-confirmer dans le tarball 6.1.200** avant d'épingler) ; rendu `<canvas>`.
4. **Sandbox Electron** (`apps/desktop/main.cjs` l.38-40 : `contextIsolation:true, nodeIntegration:false, sandbox:true`) : le worker pdfjs doit être un asset bundlé, pas `require` Node — ADR `canvas-pdfjs-worker-sandbox.md` + smoke test dans le build empaqueté.
5. `ArtifactsView.tsx` : `PdfArtifactViewer` → `<PdfViewer binary={artifact.getBinary ?? (artifact.signedUrl ? () => fetch(artifact.signedUrl).then(r=>r.arrayBuffer()) : undefined)} />` ; si ni buffer ni `previewUrl` → `UnsupportedPreviewState`.
6. Test : rendu d'un PDF mock (ArrayBuffer/data-URL) ne plante pas ; `destroy()` à l'unmount.
7. `pnpm --filter ./packages/ui typecheck` + `test` + `build`.
8. `git commit -m "feat(canvas): moteur PDF pdfjs-dist 6.1.200 (lazy, worker sandbox) + DOMPurify + ArtifactData.getBinary"`.

**Expected :** PDF rendu, pas de pdfjs dans le chunk initial mobile, sandbox Electron OK.

---

## Task 5: Moteur DOCX (`mammoth` 1.12.0) + DOMPurify + viewer branché

**Files:**
- Create: `packages/ui/src/components/ui/docx-viewer.tsx`
- Modify: `packages/ui/src/components/composites/ArtifactsView.tsx` (`DocumentArtifactViewer` branché)
- Test: `packages/ui/src/components/composites/ArtifactsView.test.tsx`

**Steps:**
1. `pnpm --filter ./packages/ui add --save-exact mammoth@1.12.0` (dompurify déjà T4)
2. `docx-viewer.tsx` : `mammoth.convertToHtml({ arrayBuffer })` → `DOMPurify.sanitize(html)` → rendu (lazy `import("mammoth")`). (Vérifié : mammoth a un champ `browser` qui remplace les modules Node buffer/stream → OK en Vite sans polyfill.)
3. `ArtifactsView.tsx` : brancher `DocumentArtifactViewer` sur `artifact.getBinary`.
4. Test : convertit un DOCX mock (ArrayBuffer), le HTML est assaini (pas de `<script>`).
5. `pnpm --filter ./packages/ui typecheck` + `test` + `build`.
6. `git commit -m "feat(canvas): moteur DOCX mammoth 1.12.0 + DOMPurify"`.

---

## Task 6: Moteur XLSX (SheetJS 0.20.3, tarball) + viewer branché

**Files:**
- Create: `vendor/xlsx-0.20.3.tgz` (copie du tarball officiel SheetJS) + `vendor/xlsx-SHA256.txt`
- Create: `packages/ui/src/components/ui/xlsx-viewer.tsx`
- Modify: `packages/ui/package.json` (`xlsx: "file:../../vendor/xlsx-0.20.3.tgz"`)
- Modify: `packages/ui/src/components/composites/ArtifactsView.tsx` (`SpreadsheetArtifactViewer` branché)
- Create: `scripts/check-vendor-integrity.sh` (CI)
- Test: `packages/ui/src/components/composites/ArtifactsView.test.tsx`

**Steps:**
1. Télécharger `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` dans `vendor/` ; `sha256sum vendor/xlsx-0.20.3.tgz > vendor/xlsx-SHA256.txt` (commité). Vérifier que le SHA256 correspond à la release officielle (pas un tarball altéré).
2. `pnpm --filter ./packages/ui add --save-exact "xlsx@file:../../vendor/xlsx-0.20.3.tgz"` (npm 12 bloque les deps par adresse distante → le `file:` local contourne).
3. `xlsx-viewer.tsx` : `import("xlsx")` (lazy) ; `XLSX.read(arrayBuffer)` → grille HTML simple.
4. `ArtifactsView.tsx` : brancher `SpreadsheetArtifactViewer` sur `artifact.getBinary`.
5. `scripts/check-vendor-integrity.sh` : `sha256sum vendor/xlsx-0.20.3.tgz && diff - <(sha256sum -c ...)` ; appelé depuis `.github/workflows/ci.yml` (job boundary) pour verrouiller l'intégrité du tarball.
6. Test : lit un XLSX mock (ArrayBuffer), rend la première feuille.
7. `pnpm --filter ./packages/ui typecheck` + `test` + `build`.
8. `git commit -m "feat(canvas): moteur XLSX SheetJS 0.20.3 (tarball vendor, SHA-256 + CI) + viewer"`.

**Nota :** `PresentationArtifactViewer` = coquille (pas de moteur PPTX au périmètre) — garde `UnsupportedPreviewState`.

---

## Task 7: Stories `CanvasView` + coquille `CanvasSemanticView` + `SemanticTreeRenderer`

**Files:**
- Create: `packages/ui/src/components/composites/Canvas.stories.tsx`
- Create: `packages/ui/src/components/composites/canvas-semantic-view.tsx` (**coquille séparée**, non-breaking — ne rentre PAS dans l'union `CanvasDocView`)
- Create: `packages/ui/src/renderers/SemanticTreeRenderer.stories.tsx`
- Modify: `packages/ui/src/index.ts` (export `CanvasSemanticView`)

**Steps:**
1. `CanvasSemanticView` = wrapper presentationnel qui monte `SemanticTreeRenderer` (React Flow) comme « vue graphe » du canvas (data `nodes`/`edges` en props) — l'union `CanvasDocView` reste `editor|markdown|html|outline` (pas de breaking).
2. `Canvas.stories.tsx` : états `editor`/`markdown`/`html`/`outline`/vide/erreur/conflict + `CanvasSemanticView` comme vue graphe.
3. `SemanticTreeRenderer.stories.tsx` : 5 états de nœuds (mastered/fragile/forgotten/not-yet), bridges, fitView.
4. `pnpm --filter ./packages/ui typecheck` + `test` + vérifier les stories dans le manifest (Storybook 10.6.1 : `pnpm --filter ./packages/ui build-storybook` si dispo, sinon typecheck).
5. `git commit -m "feat(canvas): stories CanvasView + coquille CanvasSemanticView + stories SemanticTreeRenderer"`.

---

## Task 8: Branchement assistant-ui sur le canvas (Phase 2)

**Files:**
- Modify: `packages/ui/src/components/composites/CanvasView.tsx` (prop `artifactId?` + branchement `CanvasSession.artifactId` des entities-canvas — le pont domaine non exploité)
- Create: `packages/ui/src/components/composites/canvas-agent-bridge.ts` (bouton « placer sur le canvas » dans les messages → `canvas_write` du domaine, **DOMPurify sur tout contenu injecté** avant écriture store, anti-XSS round-trip assistant→canvas)
- Modify: `packages/ui/src/components/assistant-ui/elements/canvas-split.tsx` (vérifier compile ; **existant**, grep confirme)

**Steps:**
1. Vérifier `canvas-split.tsx` (existant, shadcn copié) — règle Radix vs Base UI : elle s'applique aux **primitives shadcn sous-jacentes**, pas au composant lui-même (div/button bruts + lucide-react). Vérifier `grep -l '@radix-ui' packages/ui/src/components/ui/{button,dialog,select}.tsx` → prendre la variante correspondante.
2. `canvas-agent-bridge.ts` : `placeOnCanvas(artifactId, content)` → verbe agent `canvas_write` ; **`DOMPurify.sanitize(content)`** avant écriture store.
3. Brancher `CanvasSession.artifactId` (entities-canvas.ts) → `CanvasViewProps.artifactId` (pont domaine → canvas, jusqu'ici inexploité).
4. Test : un message assistant « placer sur le canvas » appelle le bridge ; le contenu est assaini.
5. `pnpm --filter ./packages/ui typecheck` + `test`.
6. `git commit -m "feat(canvas): branchement assistant-ui ↔ canvas (placeOnCanvas + canvas_write + pont artifactId + DOMPurify)"`.

**Nota décision :** variante shadcn Radix vs Base UI à confirmer avec le lead (voir `components.json`).

---

## Task 9 (OPTIONNEL — à confirmer) : Dessin libre tldraw

**Files:**
- Modify: `packages/ui/package.json` (`@tldraw/tldraw` + **7** paquets frères en `2.0.0-alpha.19` — **`@tldraw/assets` RETIRÉ** = outil de build, pas une dep runtime)
- Create: `packages/ui/src/components/ui/drawing-canvas.tsx`

**Prérequis (AVANT ce Task) :**
- Licence tldraw **post-alpha.19 = à clé** (interdite) ; seul `2.0.0-alpha.19` (Apache-2.0, publié 2023-12-12 ≈3 ans, **React 18 only**) est autorisé. Le repo est React 18.3.1 ✅.
- Le fork BigBlueButton (alpha.29) = alternative maintenue, **licence/noms non confirmés** → décision lead requise.
- `@tldraw/*` ABSENT du lockfile (0 occurrence) — à installer proprement, pas de re-résolution.

**Steps :**
1. `pnpm --filter ./packages/ui add --save-exact @tldraw/tldraw@2.0.0-alpha.19 @tldraw/editor@2.0.0-alpha.19 @tldraw/state@2.0.0-alpha.19 @tldraw/store@2.0.0-alpha.19 @tldraw/tlschema@2.0.0-alpha.19 @tldraw/utils@2.0.0-alpha.19 @tldraw/validate@2.0.0-alpha.19` (7 paquets, sans assets).
2. `drawing-canvas.tsx` : `<Tldraw />` dans un `div` isolé (lazy `import("@tldraw/tldraw")`).
3. Intègre au `CanvasView` comme 5ᵉ vue (`activeView === "draw"`).
4. `pnpm --filter ./packages/ui typecheck` + `build`.
5. `git commit -m "feat(canvas): dessin libre tldraw 2.0.0-alpha.19 (Apache-2.0, React 18) — 5ᵉ vue"`.

**Si non confirmé : saute ce Task.**

---

## Task 10 (OPTIONNEL) : Kit agent (contexte de vue, lints, undo par tour)

**Files:**
- Create: `packages/ui/src/components/ui/canvas-agent-kit.ts`

**Steps :**
1. `canvas-agent-kit.ts` : **capture de la vue** pour le kit agent tldraw (dépend du Task 9 — si tldraw absent, ce Task n'existe pas), **lint** de superposition/texte-débordant, **undo par tour** (1 réponse agent = 1 step undo).
2. Test : après une action agent, un lint détecte une superposition ; undo annule 1 tour.
3. `pnpm --filter ./packages/ui typecheck` + `test`.
4. `git commit -m "feat(canvas): kit agent (contexte vue + lints + undo par tour)"`.

**YAGNI : optionnel, dépend du Task 9 ; à faire seulement si le kit agent est requis.**

---

## AD-3 (transversal — vérifier à chaque Task qui touche le contenu)

Aucun artefact du canvas (PDF/DOCX/XLSX fetché, contenu markdown, message agent) ne doit faire transiter `SERVICE_ROLE_KEY` dans le bundle (AD-3 : publishable key only). Vérifier que le fetch de `getBinary`/`signedUrl` passe par le port authentifié mobile/desktop existant, pas par une key en clair. Les moteurs de viewer (pdfjs/mammoth/xlsx) ne reçoivent que des `ArrayBuffer` déja résolus par le parent.

---

## Validation finale (tout le plan)

```powershell
# (Windows / Git Bash → PowerShell pour la mesure de taille ; `du` est inutilisable)
pnpm --filter ./packages/ui typecheck
pnpm --filter ./packages/ui test
pnpm --filter ./packages/ui build
pnpm --filter ./apps/mobile typecheck
pnpm --filter ./apps/mobile test
# build:web (le seul script build du mobile) + vérifier que les moteurs ne sont PAS dans le chunk initial
pnpm --filter ./apps/mobile build:web
Get-ChildItem apps/mobile/dist/assets/*.js | Sort-Object Length -Descending | Select-Object -First 8 Name, @{N='KB';E={[math]::Round($_.Length/1KB)}}
```

**Expected :** typecheck 0 erreur partout, tests verts, `pdfjs-dist`/`mammoth`/`xlsx` (et `@tldraw` si T9) en chunk lazy séparé (pas dans le chunk initial mobile), 1 seule version `@tiptap/*` dans le lockfile.

---

## Hypothèses

1. **Markdown SSoT = `marked` 15.0.12** (pas de migration des 3 chaînes — elles coexistent, chacune dans son périmètre).
2. **tldraw `2.0.0-alpha.19` (Apache-2.0, React 18, publié 2023-12-12)** — repo React 18.3.1 ✅. Fork BigBlueButton (alpha.29) = alternative, licence non confirmée → décision lead. **Aucune version post-alpha.19 (licence à clé).**
3. **Vue nœuds = `SemanticTreeRenderer` existant** (React Flow) via coquille `CanvasSemanticView` (non-breaking) — pas de nouveau moteur de graphe.
4. **4 coquilles de viewer** (PDF/DOCX/XLSX/PPTX) : PPTX reste `UnsupportedPreviewState` (pas de moteur au périmètre).
5. **DOMPurify assainit le HTML de mammoth ET tout contenu injecté via `canvas_write`** — pas de rendu non-sanitized.
6. **`@assistant-ui/elements-canvas-split`** = fichier shadcn déjà copié (vérifié : `canvas-split.tsx` existe) ; variante Radix vs Base UI s'applique aux primitives sous-jacentes, à confirmer lead.
7. **`@tiptap/react` dédoublonné** (T3bis) : déplacé dans packages/ui, retiré de apps/mobile (même version exacte 2.27.3, jamais 2 versions ProseMirror).
8. **`minimumReleaseAge: 1440 h` (60 j) est le vrai seuil** (pas 14 j) — `@tiptap/*` (2.27.3 à 960 h) nécessite la whitelist du T1bis.

## Décisions restantes (lead) — pré-recommandations appliquées

1. **minimumReleaseAge `@tiptap/*`** → whitelist (T1bis) [alternatives : attendre 2026-11-03, ou baisser `minimumReleaseAge` temporairement].
2. **Contrat `ArtifactData`** → `getBinary?: () => Promise<ArrayBuffer>` + `signedUrl?: string` (T4).
3. **Reimport mobile** → `apps/mobile` importe `useEditor`/extensions depuis `@aurora/ui` (T3bis).
4. **`SemanticTreeRenderer`** → coquille `CanvasSemanticView` séparée, non-breaking (T7).
5. **tldraw** → `alpha.19` seul autorisé (Apache-2.0, React 18) ; fork BigBlueButton en attente de confirmation licence (T9).

## À ne pas faire (rappel §5.8)

- ❌ Installer `xlsx` depuis npm public (0.18.5 vulnérable CVE-2024-23417) — toujours le tarball SheetJS 0.20.3.
- ❌ Utiliser un worker pdf.js d'une autre version que `pdfjs-dist@6.1.200`.
- ❌ Mélanger TipTap 3.x et 2.27.3, ou `@tiptap/pm` ≠ `@tiptap/core` (2 versions = bugs ProseMirror).
- ❌ Épingler `@tiptap/suggestion` (paquet inexistant en 2.x — le slash reste UI-only).
- ❌ Installer toute version publiée < 14 j, OU qui viole `minimumReleaseAge: 1440 h` sans whitelist.
- ❌ Laisser un `^` dans un `package.json`.
- ❌ Prendre une version tldraw post-alpha.19 (licence à clé).
- ❌ `--frozen-lockfile` après épinglage exact (OUTDATED_LOCKFILE) — `pnpm install` non gelé + commit du lock.
