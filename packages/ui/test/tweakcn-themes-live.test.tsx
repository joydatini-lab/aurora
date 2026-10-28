/**
 * tweakcn-themes-live.test.tsx — the imported ready-made themes actually
 * reach the shadcn layer (owner request 2026-10-28: 20+ preset themes).
 *
 * This is NOT a source-grep: it mounts the REAL <AuroraThemeProvider> into
 * jsdom and reads back the CSS variables the provider wrote on
 * `document.documentElement`. Since `apps/mobile/tailwind.config.js` maps
 * `primary` → `var(--primary)` and `accent` → `var(--accent)`, a variable
 * present with the theme's own value proves the shadcn components re-color.
 */
import { afterEach, describe, expect, it } from "vitest";
import * as React from "react";
import { AuroraThemeProvider } from "../src/theme/provider";
import { THEMES } from "../src/themes";
import type { ExpressiveThemeName } from "../src/themes/types";
import { render } from "./render";

/** A sample of the imported tweakcn themes, spanning light/dark/colourful. */
const SAMPLE: ExpressiveThemeName[] = [
  "cosmic-night",
  "cyberpunk",
  "catppuccin",
  "midnight-bloom",
  "mono",
  "northern-lights",
];

describe("ready-made theme catalog", () => {
  it("ships at least 20 expressive themes (owner requirement)", () => {
    expect(Object.keys(THEMES).length).toBeGreaterThanOrEqual(20);
  });

  it("keeps the 10 original Aurora universes alongside the imports", () => {
    for (const n of ["aurora", "lagoon", "boreal", "cosmos"]) {
      expect(THEMES[n as ExpressiveThemeName], `${n} missing`).toBeDefined();
    }
  });
});

describe("a theme change reaches the shadcn variables (live DOM)", () => {
  const mounted: Array<() => void> = [];
  afterEach(() => {
    mounted.forEach((u) => u());
    mounted.length = 0;
    document.documentElement.removeAttribute("style");
  });

  function mount(theme: ExpressiveThemeName, style: "light" | "dark") {
    const { unmount } = render(
      React.createElement(
        AuroraThemeProvider,
        { theme, style },
        React.createElement("div"),
      ),
    );
    mounted.push(unmount);
  }

  for (const name of SAMPLE) {
    it(`${name}: writes its own --primary / --accent on <html> (light)`, () => {
      mount(name, "light");
      const el = document.documentElement;
      const theme = THEMES[name];
      expect(el.getAttribute("data-aurora-theme")).toBe(name);
      expect(el.style.getPropertyValue("--primary")).toBe(theme.colors.primary);
      expect(el.style.getPropertyValue("--accent")).toBeTruthy();
      expect(el.style.getPropertyValue("--background")).toBeTruthy();
    });

    it(`${name}: dark style uses the recalibrated accent`, () => {
      mount(name, "dark");
      const el = document.documentElement;
      const theme = THEMES[name];
      expect(el.style.getPropertyValue("--primary")).toBe(
        theme.colorsDark?.primary ?? theme.colors.primary,
      );
      expect(el.getAttribute("data-aurora-style")).toBe("dark");
    });
  }

  it("two different themes produce two different --primary values", () => {
    mount("cyberpunk", "light");
    const a = document.documentElement.style.getPropertyValue("--primary");
    mounted.pop()?.();
    document.documentElement.removeAttribute("style");
    mount("catppuccin", "light");
    const b = document.documentElement.style.getPropertyValue("--primary");
    expect(a).not.toBe(b);
  });

  it("every imported theme declares colorsDark (dark canvas contract)", () => {
    for (const [name, t] of Object.entries(THEMES)) {
      expect(t.colorsDark, `${name} lacks colorsDark`).toBeDefined();
    }
  });
});
