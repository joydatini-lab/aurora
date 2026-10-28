// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Aurora ESLint 9 flat config — boundary rules.
 *
 * Layer 1 — TypeScript parser + recommended rules.
 * Layer 2 — boundary invariants via:
 *   - `no-restricted-imports`  (package-level bans)
 *   - `import/no-restricted-paths` (directory-level bans)
 *
 * Rules enforced:
 *   packages/domain       imports NOTHING (AD-1, AD-15 hexagon center)
 *   packages/ui           never imports @aurora/data or @aurora/platform
 *   packages/{domain,ui,agent} + apps/mobile:
 *                          vendor SDKs & AD-10 engines are FORBIDDEN
 *                          (AD-1 vendor isolation, AD-10 frozen engines)
 */

import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/**
 * Vendor SDK patterns that MUST stay inside:
 *   packages/{data,platform,integrations,scientific-engine} and apps/server
 * They are FORBIDDEN in all other packages.
 *
 * EXCEPTION (AD-1, wave 3 ORACLE): `ai` / `@ai-sdk/*` are also allowed in
 * packages/agent — the Agent Kernel's Vercel AI SDK layer is the designated
 * model layer (AD-1 vendor isolation is preserved: `ai` lives ONLY in
 * packages/agent + packages/{data,platform,integrations,scientific-engine}
 * + apps/server, and never in domain / ui / apps/mobile).
 */
const VENDOR_PATTERNS = [
  '@supabase/*',
  'supabase',
  'supabase-*',
  '@cloudflare/*',
  'cloudflare-*',
  '@google/*',
  'ai',
  '@ai-sdk/*',
  'openai',
  'anthropic',
  '@anthropic-ai/*',
  '@composio/*',
  'composio*',
  'onesignal*',
  'powersync*',
  '@powersync/*',
  '@ionic/*',
  'react-native*',
  'electron',
];

/**
 * The AD-10 frozen viz engines. Restricted to packages/ui.
 */
const AD10_ENGINES = [
  '@xyflow/react',
  '@dagrejs/dagre',
  '@antv/infographic',
  '@antv/g2',
  'katex',
  'motion',
];

/**
 * AD-10 en `paths` (EXACT) et non en `patterns`.
 * Pourquoi (bug corrigé le 2026-10-28) : `patterns` matche en gitignore, donc
 * le motif `motion` attrapait l'import RELATIF `export * from './motion'` de
 * `packages/ui/src/index.ts` — c'est-à-dire le SSoT de motion de ui lui-même,
 * qui est précisément le SEUL endroit où le moteur a le droit d'être.
 * `paths` ne matche que le nom de paquet nu : la règle garde son intention
 * (interdire le VENDOR `motion`) sans mordre sur les chemins relatifs.
 */
const AD10_ENGINE_PATHS = AD10_ENGINES.map((name) => ({
  name,
  message: 'AD-10: the 5 frozen viz engines are restricted to packages/ui only.',
}));

export default tseslint.config(// 1. Base: recommended JS rules.
js.configs.recommended, // 2. TypeScript: parser + recommended (non type-checked, no project setup needed).
...tseslint.configs.recommended, // Skeleton: allow unused vars during wave 0 (tsconfig noUnusedLocals covers it
// at typecheck time). We don't want a flood of style noise on stub packages.
{
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': 'off',
    // Allow unused function args (port stubs have signatures, no bodies yet).
    '@typescript-eslint/no-unused-args': 'off',
  },
}, // 3. Import plugin (provides `import/no-restricted-paths`).
{
  plugins: {
    import: importPlugin,
  },
  languageOptions: {
    sourceType: 'module',
  },
}, // ============================================================
// packages/domain — imports NOTHING (AD-1 / AD-15 SSoT)
// ============================================================
{
  files: ['packages/domain/**/*.ts'],
  rules: {
    // no-restricted-imports: ban any BARE (package) import — the group
    // '*' matches only non-relative specifiers, so './x' and '../x' are
    // untouched. Combined with the relative-import whitelist below, this
    // fully seals the hexagon center (zero dependencies).
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['*'],
            message:
              'AD-1/AD-15: packages/domain must not import any external package (hexagon center, zero dependencies).',
          },
        ],
      },
    ],
    // import/no-restricted-paths: ban relative imports that escape the
    // domain package (allow only './…' and '../…' within domain/src).
    'import/no-restricted-paths': [
      'error',
      {
        whitelist: ['\\.\\/.+$', '\\.\\./\\.\\/.+$'],
        zones: [
          {
            from: 'packages/domain/src',
            target: ['../../../../..', '../../../../../..'],
            message:
              'AD-1: packages/domain must not import anything outside its own src directory.',
          },
        ],
      },
    ],
    'import/no-unresolved': 'off', // external libs are banned, not resolved
  },
}, // ============================================================
// packages/ui — AD-10 engines ALLOWED; no data/platform
// ============================================================
{
  files: ['packages/ui/**/*.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@aurora/data', '@aurora/platform'],
            message:
              'AD-6: packages/ui must not import @aurora/data or @aurora/platform. It is the pure design system.',
          },
        ],
      },
    ],
    'import/no-restricted-paths': [
      'error',
      {
        // ui can never reach into data / platform dirs
        zones: [
          {
            from: 'packages/ui',
            target: ['packages/data', 'packages/platform'],
            message:
              'AD-6: packages/ui must not import from packages/data or packages/platform.',
          },
        ],
      },
    ],
  },
}, // ============================================================
// packages/{domain,ui} + apps/mobile —
//   ban vendor SDKs + AD-10 engines (AD-1, AD-10)
// NOTE: packages/agent is EXEMPT for the Vercel AI SDK layer
//   (`ai`, `@ai-sdk/*`) per AD-1 wave 3 (ORACLE) — it is the
//   designated model layer. Agent still bans all OTHER vendors
//   + AD-10 engines (handled by the agent-only block below).
// ============================================================
{
  files: [
    'packages/{domain,ui}/**/*.ts',
    'apps/mobile/**/*.ts',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: AD10_ENGINE_PATHS,
        patterns: [
          {
            group: VENDOR_PATTERNS,
            message:
              'AD-1: vendor SDKs must stay in packages/{data,platform,integrations,scientific-engine,agent} or apps/server.',
          },
          // AD-10 engines are banned in domain / ui / apps/mobile.
          // (In ui they are allowed — the ui block above doesn't ban them.)

        ],
      },
    ],
    'import/no-restricted-paths': [
      'error',
      {
        // mobile feature-slices don't import sibling mobile feature dirs
        zones: [
          {
            from: 'apps/mobile/src/features/([^/]+)',
            target: [
              // any sibling feature dir (not self)
              '../../..**',
            ],
            message:
              'Mobile feature-slice isolation: a feature must not import from a sibling feature. Share code via packages/.',
          },
        ],
      },
    ],
  },
}, // ============================================================
// packages/agent — AD-1 exception: the Vercel AI SDK layer
//   (`ai`, `@ai-sdk/*`) lives here and ONLY here outside
//   data/platform/integrations/scientific-engine + apps/server.
//   All other vendor SDKs + AD-10 engines remain banned.
// ============================================================
{
  files: ['packages/agent/**/*.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: AD10_ENGINE_PATHS,
        patterns: [
          {
            group: [
              ...VENDOR_PATTERNS.filter((p) => p !== 'ai' && p !== '@ai-sdk/*'),
            ],
            message:
              'AD-1: vendor SDKs (except the AI SDK layer) must stay in packages/{data,platform,integrations,scientific-engine} or apps/server.',
          },

        ],
      },
    ],
  },
}, // ============================================================
// React hooks — la couche de correction des hooks.
// ELLE ETAIT ABSENTE : `eslint-plugin-react-hooks` n'etait ni installe ni
// configure, alors que 33 directives `eslint-disable react-hooks/*` existent
// dans le tree. ESLint 9 traite une directive vers une regle inconnue comme
// une ERREUR -> 35 erreurs fantomes, et ZERO lint de hooks reel.
// ============================================================
{
  files: ['**/*.{ts,tsx}'],
  plugins: { 'react-hooks': reactHooks },
  rules: {
    // Corrige les vraies fautes de hooks (ordre, conditions, boucles).
    'react-hooks/rules-of-hooks': 'error',
    // `warn` : signal de justesse sur les dependances. Comme le gate tourne
    // en `--max-warnings 0`, un avertissement est bloquant -> il faut soit
    // corriger, soit justifier par un `eslint-disable ... -- raison`.
    'react-hooks/exhaustive-deps': 'warn',
    // Regles du React Compiler : DECLAREES mais non adoptees (elles
    // signalent des patterns presents dans le code vendorise). Les declarer
    // resout les directives existantes sans imposer une migration.
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/static-components': 'off',
    'react-hooks/incompatible-library': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/refs': 'off',
  },
}, // ============================================================
// CODE VENDORISE (registre `reui` + `assistant-ui`).
// Ce n'est PAS du code Aurora : c'est de l'amont importe (~97 000 lignes).
// On y desactive les regles STYLISTIQUES (any, ts-comment, expressions,
// interfaces vides) — les reecrire casserait la possibilite de re-synchroniser
// avec l'amont, pour zero gain produit.
//
// CE QUI RESTE APPLIQUE (et c'est l'essentiel) : AD-1 (vendor), AD-10 (moteurs
// de viz), AD-15 (SSoT) — les frontieres d'architecture ne sont PAS relachees.
// ============================================================
{
  files: [
    'packages/ui/src/components/reui/**/*.{ts,tsx}',
    'packages/ui/src/components/assistant-ui/**/*.{ts,tsx}',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
}, // ============================================================
// STORIES (dev-only, fixtures) : meme logique que le vendorise.
// ============================================================
{
  files: ['**/*.stories.tsx'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
}, storybook.configs["flat/recommended"]);
