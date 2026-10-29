/**
 * ESLint — surface réduite au socle (purge 2026-10-28).
 *
 * Ce qui a été retiré avec les packages : les blocs vendor (reui,
 * assistant-ui), le bloc Storybook et ses règles. Ce qui reste :
 *   - TypeScript strict sur tout le code ;
 *   - les règles des Hooks React (elles ont trouvé de vrais bugs) ;
 *   - deux gardes maison : pas de secret dans le code, pas de `process.env`
 *     côté client (bug du 28/10 — `ReferenceError: process is not defined`
 *     qui empêchait la coquille de démarrer).
 */
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/*.d.ts"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Une variable préfixée `_` est volontairement inutilisée.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` reste interdit : c'est un choix, pas un oubli de configuration.
      "@typescript-eslint/no-explicit-any": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
    },
  },

  {
    // Client uniquement : `process` n'existe pas dans un navigateur, et une
    // lecture directe lève AVANT même que React puisse se monter.
    // `process.env.NODE_ENV` est exempté : Vite le remplace à la compilation.
    files: ["apps/web/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            "Pas de `process.env` dans le code client : utiliser import.meta.env (VITE_*). Voir packages/integrations/src/env.ts pour le cas isomorphe.",
        },
      ],
    },
  },

  {
    // Configuration de build : exécutée par Node, pas par le navigateur.
    files: ["**/*.config.{ts,js,mjs}", "scripts/**/*.{ts,js,mjs}"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
);
