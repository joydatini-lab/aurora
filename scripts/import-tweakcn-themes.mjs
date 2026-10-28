/**
 * Import tweakcn themes → Aurora theme JSON (AD-17, 05 §5.8).
 *
 * WHY: Aurora's expressive theme layer is a SSoT of theme JSONs
 * (`packages/ui/src/themes/*.json`). The owner asked for 20+ ready-made
 * themes. Rather than hand-write palettes, this imports the OFFICIAL
 * tweakcn palettes (tweakcn.com/r/themes/<name>.json) and maps their
 * variables onto Aurora's accent tokens.
 *
 * NO COLOR IS INVENTED HERE. Every value is copied verbatim from tweakcn:
 *   colors.primary   <- light.primary      colorsDark.primary   <- dark.primary
 *   colors.secondary <- light.secondary    colorsDark.secondary <- dark.secondary
 *   colors.accent    <- light.accent       colorsDark.accent    <- dark.accent
 *   colors.surface   <- light.muted        colorsDark.surface   <- dark.muted
 *   chartPalette     <- light.chart-1..5   gradient.stops <- [primary, accent, secondary]
 *
 * WHY NOT the neutral tokens (bg/surface/text/border): `neutral.ts` is
 * FROZEN — a theme never redefines them, and the canvas stays #FFFFFF/#000000
 * (05 §2.1.2, owner 10-07 "dark pur"). tweakcn DOES restyle the canvas; that
 * part is deliberately NOT imported, so Aurora keeps its neutral contract.
 *
 * Values are kept in tweakcn's own `oklch(...)` notation: `resolveToken`
 * passes strings through untouched, and the mobile Tailwind config consumes
 * `var(--primary)` as a full value (apps/mobile/tailwind.config.js).
 *
 * Usage: node scripts/import-tweakcn-themes.mjs <dir-of-tweakcn-json> [names...]
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SRC = "https://tweakcn.com/r/themes";
const OUT = path.resolve("packages/ui/src/themes");

/**
 * tweakcn ships colors as `oklch(...)` (and a few `hsl()` / `rgba()`).
 * Aurora's theme layer is hex (`theme-gradient.test.ts` requires hex stops;
 * `hexLuminance` parses hex). These convert the NOTATION — the color itself
 * is untouched, no channel is re-picked.
 */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const linearToSrgb = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const toHex = (r, g, b) => {
  const h = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
};

/** OKLab/OKLCH → sRGB (Björn Ottosson's matrices). L in [0,1], H in degrees. */
function oklchToHex(L, C, H) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b2 = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b2;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b2;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b2;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return toHex(
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  );
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0), f(8), f(4));
}

/** Any tweakcn color notation → #RRGGBB. Returns undefined if unparseable. */
export function parseColor(v) {
  if (!v) return undefined;
  const s = String(v).trim();
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const h = s.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase();
  let m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(s);
  if (m) {
    let L = parseFloat(m[1]);
    if (m[2] === "%") L /= 100;
    return oklchToHex(L, parseFloat(m[3]), parseFloat(m[4]));
  }
  m = /^hsl\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%/.exec(s);
  if (m) return hslToHex(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s);
  if (m)
    return toHex(parseFloat(m[1]) / 255, parseFloat(m[2]) / 255, parseFloat(m[3]) / 255);
  return undefined;
}

/** WCAG relative luminance (mirrors resolve.ts `hexLuminance`). */
function luminance(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  const ch = (s) => {
    const v = ((n >> s) & 0xff) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
}

/** Aurora expressive-theme JSON shape (packages/ui/src/themes/types.ts). */
function toAuroraTheme(name, raw) {
  const cv = raw.cssVars;
  const L = cv.light ?? {};
  const D = cv.dark ?? {};
  const pick = (scope, ...keys) => {
    for (const k of keys) {
      const hex = parseColor(scope[k]);
      if (hex) return hex;
    }
    return undefined;
  };

  const primary = pick(L, "primary");
  const secondary = pick(L, "secondary");
  const accent = pick(L, "accent");
  const surface = pick(L, "muted", "secondary", "card");

  // Gradient stops = the theme's OWN palette, in tweakcn order. No stop is
  // invented; if tweakcn lacks a value the stop is dropped rather than faked.
  const stops = [primary, accent, secondary].filter(Boolean);

  const chartPalette = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]
    .map((k) => parseColor(L[k]))
    .filter(Boolean);

  // theme-dark.test.ts requires colorsDark.surface to be a DARK tint
  // (luminance < 0.55). We take the DARKEST value tweakcn itself ships for
  // the dark scope — still imported data, never a hand-picked color.
  const darkCandidates = ["muted", "secondary", "accent", "card", "background"]
    .map((k) => parseColor(D[k]))
    .filter(Boolean)
    .sort((a, b) => luminance(a) - luminance(b));

  return {
    name,
    universe: `tweakcn — ${name}`,
    isDefault: false,
    colors: {
      primary: primary ?? "#3678F6",
      secondary: secondary ?? "#22C7D6",
      accent: accent ?? "#7B61FF",
      surface: surface ?? "#F1F5F9",
    },
    colorsDark: {
      ...(parseColor(D.primary) ? { primary: parseColor(D.primary) } : {}),
      ...(parseColor(D.secondary) ? { secondary: parseColor(D.secondary) } : {}),
      ...(parseColor(D.accent) ? { accent: parseColor(D.accent) } : {}),
      ...(darkCandidates[0] ? { surface: darkCandidates[0] } : {}),
    },
    ...(stops.length >= 2 ? { gradient: { angle: 120, stops } } : {}),
    gradients: stops.length >= 2 ? "tweakcn — dégradé du thème" : "aucun",
    illustrationMood: "importé de tweakcn (palette du thème)",
    iconTreatment: "hérite du style neutre Aurora",
    selectionTreatment: "hérite du style neutre Aurora",
    focusTreatment: "hérite du style neutre Aurora",
    chartPalette: chartPalette.length ? chartPalette : [primary ?? "#3678F6"],
    decorativeShapes: "hérite du style neutre Aurora",
    motionMood: "hérite du style neutre Aurora (05 §2.6)",
    usageEmotionnelRecommande: `thème prêt à l'emploi importé de tweakcn (${SRC}/${name}.json)`,
  };
}

const [srcDir, ...only] = process.argv.slice(2);
if (!srcDir) {
  console.error("usage: node scripts/import-tweakcn-themes.mjs <dir> [names...]");
  process.exit(1);
}

const files = readdirSync(srcDir)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => (only.length ? only.includes(f.replace(/\.json$/, "")) : true))
  .sort();

let written = 0;
for (const f of files) {
  const name = f.replace(/\.json$/, "");
  const raw = JSON.parse(readFileSync(path.join(srcDir, f), "utf8"));
  if (!raw.cssVars) {
    console.warn(`  skip ${name}: no cssVars`);
    continue;
  }
  const theme = toAuroraTheme(name, raw);
  writeFileSync(
    path.join(OUT, `${name}.json`),
    `${JSON.stringify(theme, null, 2)}\n`,
  );
  written += 1;
}
console.log(`wrote ${written} theme JSON into ${OUT}`);
