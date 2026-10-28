/**
 * Icon registry — the tree-shaking contract (R4, perf budget 02 §9.1).
 *
 * WHY THIS TEST EXISTS. The icons used to be built from a NAMESPACE import
 * (`import * as Phosphor` + `Phosphor[name]`). Rollup cannot prove a dynamic
 * key is never read, so it kept all ~1512 icons: measured, 4539 of the 5733
 * modules in the web-app entry sourcemap came from `@phosphor-icons/react`
 * (79 % of the bundle), 14.5 Mo of entry chunk.
 *
 * The fix is a STATIC literal registry (`PHOSPHOR_COMPONENTS`) plus
 * per-icon subpath imports. The property that makes it work is not visible in
 * a type: a literal object of named imports is shakeable, a namespace is not.
 * A future edit that "simplifies" this back to a namespace would silently
 * restore the 5.6 Mo regression. These assertions fail loudly if that happens.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import {
  PHOSPHOR_COMPONENTS,
  PHOSPHOR_NAME_MAP,
  PHOSPHOR_WEIGHT,
} from "../src/icons/phosphor-mapping";
import { AURORA_ICONS, AURORA_ICONS_FILL } from "../src/icons/phosphor";

describe("icon registry — tree-shaking contract", () => {
  it("exposes a finite, explicit registry (never a namespace)", () => {
    const keys = Object.keys(PHOSPHOR_COMPONENTS);
    // A namespace import would expose ~1512 keys; the mapped set is ~165.
    // The bound is deliberately loose so adding icons does not fail the test,
    // but a namespace regression (1000+) does.
    expect(keys.length).toBeGreaterThan(100);
    expect(keys.length).toBeLessThan(400);
  });

  it("every mapped name resolves to a real component", () => {
    const registry = PHOSPHOR_COMPONENTS as Record<string, unknown>;
    const missing = Object.entries(PHOSPHOR_NAME_MAP)
      .filter(([, phosphorName]) => !registry[phosphorName])
      .map(([lucide, phosphor]) => `${lucide} -> ${phosphor}`);
    expect(missing).toEqual([]);
  });

  it("every registry entry is a component (forwardRef or function)", () => {
    const registry = PHOSPHOR_COMPONENTS as Record<string, unknown>;
    const notComponents = Object.entries(registry)
      .filter(([, v]) => {
        const t = typeof v;
        if (t === 'function') return false;
        // forwardRef / memo produce an object with $$typeof.
        return !(t === 'object' && v !== null && '$$typeof' in (v as object));
      })
      .map(([k]) => k);
    expect(notComponents).toEqual([]);
  });

  it("AURORA_ICONS resolves every mapped Lucide name to a component", () => {
    const icons = AURORA_ICONS as unknown as Record<string, unknown>;
    const holes = Object.keys(PHOSPHOR_NAME_MAP).filter((n) => !icons[n]);
    expect(holes).toEqual([]);
  });

  it("weight overrides win over the family default", () => {
    // `Check` is mapped to 'fill' in PHOSPHOR_WEIGHT. Rendering it through the
    // duotone family must still carry weight="fill" — otherwise the accent
    // icons silently render as duotone.
    const overridden = Object.keys(PHOSPHOR_WEIGHT).filter(
      (n) => PHOSPHOR_WEIGHT[n as keyof typeof PHOSPHOR_WEIGHT] !== undefined,
    );
    expect(overridden.length).toBeGreaterThan(0);
    for (const name of overridden) {
      const Comp = (AURORA_ICONS as unknown as Record<string, React.ComponentType<Record<string, unknown>>>)[name];
      expect(Comp, `${name} must exist in AURORA_ICONS`).toBeTruthy();
      const el = Comp({}) as React.ReactElement<{ weight?: string }>;
      expect(el.props.weight).toBe(
        PHOSPHOR_WEIGHT[name as keyof typeof PHOSPHOR_WEIGHT],
      );
    }
  });

  it("the fill family is a distinct object from the duotone family", () => {
    expect(AURORA_ICONS_FILL).not.toBe(AURORA_ICONS);
    const duotone = AURORA_ICONS as unknown as Record<string, unknown>;
    const fill = AURORA_ICONS_FILL as unknown as Record<string, unknown>;
    // Same keys, different component identities (weight is baked in).
    expect(Object.keys(fill).sort()).toEqual(Object.keys(duotone).sort());
    const shared = Object.keys(duotone).find((k) => duotone[k] !== fill[k]);
    expect(shared, "the families must not share component instances").toBeTruthy();
  });
});
