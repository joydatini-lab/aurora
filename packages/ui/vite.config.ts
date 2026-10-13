import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// NOTE (SB 10.6 install): `autoprefixer` was previously listed here as a
// Vite plugin, but it is a PostCSS plugin — passing it to `plugins[]`
// crashes Storybook's builder-vite with Rollup error
// "Error running plugin hook options for plugin undefined". Tailwind's
// own CSS pipeline already handles vendor prefixes; remove it entirely.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // L'app et les composants importent `src/lib/utils` — Vite résout
      // depuis la racine du monorepo, donc on pointe vers le vrai fichier.
      "src": path.resolve(__dirname, "./src"),
    },
  },
});
