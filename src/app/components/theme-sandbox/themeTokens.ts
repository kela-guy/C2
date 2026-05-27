/**
 * Pure derivation of CSS custom-property overrides from theme state.
 *
 * Why we override both `--*` and `--color-*`
 * ──────────────────────────────────────────
 *
 * Tailwind v4's `@theme` block registers each token via `@property`,
 * which locks the computed value at the declaring scope (`:root`).
 * That means overriding the inner `--surface-3` on a descendant has
 * no effect on `bg-surface-3` (which reads `--color-surface-3`). The
 * card-sandbox proves the workaround: override the outer Tailwind
 * token (`--color-surface-3`) directly. We do that here for every
 * hue-/chroma-affected token, AND mirror to the palette-side `--*`
 * for `var()` consumers (substrate hook, color-mix derivations,
 * inline-style readers).
 *
 * Light vs. dark
 * ──────────────
 *
 * Dark ramp is generated from the base L curve in
 * `src/styles/palette.css` lines 93–104, with the bookends `l1`/`l12`
 * lerping the curve so the user can dial deepest-bg and brightest-fg
 * independently.
 *
 * Light ramp uses the curve from `src/styles/palette.css` lines
 * 229–240 as-is. That curve is non-linear by design (the big gap
 * between L7 and L9 sets up the "background tier" / "text tier"
 * split) and doesn't survive linear stretching, so the sandbox
 * doesn't expose bookend sliders for it.
 */

import type { CSSProperties } from "react";

const DARK_BASE_L = [
  0.165, 0.205, 0.245, 0.29, 0.345, 0.41, 0.49, 0.58, 0.665, 0.76, 0.87, 0.965,
] as const;
const DARK_BASE_C = [
  0.005, 0.006, 0.008, 0.01, 0.012, 0.014, 0.016, 0.018, 0.018, 0.018, 0.014,
  0.01,
] as const;

const LIGHT_BASE_L = [
  0.993, 0.982, 0.959, 0.936, 0.914, 0.889, 0.859, 0.811, 0.645, 0.501, 0.378,
  0.205,
] as const;
const LIGHT_BASE_C = [
  0.002, 0.002, 0.004, 0.006, 0.008, 0.01, 0.012, 0.016, 0.018, 0.018, 0.016,
  0.006,
] as const;

export type EffectiveMode = "dark" | "light";

export interface ThemeTokenInput {
  hue: number;
  chromaScale: number;
  darkL1: number;
  darkL12: number;
  effectiveMode: EffectiveMode;
  /**
   * Light-mode-only knob, 0..1. `0` = use the dark-mode accent recipe
   * unchanged (vivid stays light, soft stays dark). `1` = lerp accents
   * toward a white-substrate-friendly target (vivid → L 0.50, soft →
   * L 0.92). Ignored when `effectiveMode === "dark"`.
   */
  lightAccentTune: number;
}

export interface ThemeTokenOutput {
  slate: string[];
  style: CSSProperties;
  cssBlock: string;
  /**
   * `--gridblock-accent-500-rgb` mirror, as a space-separated sRGB
   * triplet ("R G B"). `palette.css` keeps it as a frozen literal
   * because production never re-themes; the sandbox re-derives it
   * from the live slate-12 so focus-ring shadows
   * (`rgba(var(--gridblock-accent-500-rgb), 0.6)`) harmonize too.
   */
  accentRgb: string;
}

function fmt(value: number, digits = 3): string {
  return Number(value.toFixed(digits)).toString();
}

function oklch(l: number, c: number, h: number, alpha?: number): string {
  const base = `${fmt(l)} ${fmt(c, 4)} ${fmt(h, 2)}`;
  return alpha == null ? `oklch(${base})` : `oklch(${base} / ${fmt(alpha, 2)})`;
}

/**
 * OKLCH (L 0..1, C, h°) → sRGB 0..255 triplet, gamut-clamped.
 * Matrix from Björn Ottosson (https://bottosson.github.io/posts/oklab/).
 */
function oklchToSrgb(L: number, C: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const lLin = l_ ** 3;
  const mLin = m_ ** 3;
  const sLin = s_ ** 3;
  const r = 4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
  const g = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
  const bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin;
  const enc = (x: number) => {
    const cl = Math.max(0, Math.min(1, x));
    return cl <= 0.0031308 ? 12.92 * cl : 1.055 * cl ** (1 / 2.4) - 0.055;
  };
  return [
    Math.round(enc(r) * 255),
    Math.round(enc(g) * 255),
    Math.round(enc(bLin) * 255),
  ];
}

export function buildSlateRamp(input: ThemeTokenInput): string[] {
  if (input.effectiveMode === "light") {
    return LIGHT_BASE_L.map((L, i) =>
      oklch(L, LIGHT_BASE_C[i] * input.chromaScale, input.hue),
    );
  }
  const tMin = DARK_BASE_L[0];
  const tMax = DARK_BASE_L[DARK_BASE_L.length - 1];
  return DARK_BASE_L.map((L, i) => {
    const t = (L - tMin) / (tMax - tMin);
    const newL = input.darkL1 + (input.darkL12 - input.darkL1) * t;
    const newC = DARK_BASE_C[i] * input.chromaScale;
    return oklch(newL, newC, input.hue);
  });
}

/**
 * Semantic accent recipes mirrored from palette.css.
 * Hue stays fixed (red still means danger) — only chroma scales with
 * `slateChromaScale` so a low-chroma theme like Carbon mutes the
 * pills/chips/KPI trends while a high-chroma theme makes them poppy.
 */
const ACCENT_RECIPES = {
  danger: { vivid: [0.66, 0.22, 27], soft: [0.395, 0.11, 27] },
  warning: { vivid: [0.77, 0.17, 70], soft: [0.42, 0.09, 70] },
  tracking: { vivid: [0.715, 0.18, 50], soft: null },
  success: { vivid: [0.79, 0.18, 145], soft: [0.43, 0.09, 145] },
  info: { vivid: [0.79, 0.14, 230], soft: [0.43, 0.07, 230] },
  historical: { vivid: [0.72, 0.16, 280], soft: [0.58, 0.19, 275] },
  cyan: { vivid: [0.79, 0.13, 200], soft: null },
  magenta: { vivid: [0.7, 0.2, 340], soft: null },
} as const;

type AccentName = keyof typeof ACCENT_RECIPES;

const DISPOSITION_RECIPES = {
  suspect: [0.745, 0.18, 60],
  "assumed-friend": [0.79, 0.18, 145],
  neutral: [0.7, 0.2, 340],
} as const;

/**
 * Borders are tinted hairlines — same hue/chroma family as slate but
 * with alpha. Light/dark use different L bases (see palette.css).
 */
function buildBorders(
  hue: number,
  chromaScale: number,
  effectiveMode: EffectiveMode,
): { default: string; strong: string; subtle: string } {
  if (effectiveMode === "light") {
    return {
      default: oklch(0.51, 0.016 * chromaScale, hue, 0.2),
      strong: oklch(0.41, 0.014 * chromaScale, hue, 0.3),
      subtle: oklch(0.66, 0.018 * chromaScale, hue, 0.2),
    };
  }
  return {
    default: oklch(0.49, 0.016 * chromaScale, hue, 0.55),
    strong: oklch(0.58, 0.018 * chromaScale, hue, 0.8),
    subtle: oklch(0.345, 0.012 * chromaScale, hue, 0.6),
  };
}

/**
 * State overlays read from `var(--slate-12)` inside a `color-mix`. We
 * pre-resolve them with a literal `slate12` argument so the override
 * works even when @property has locked `--state-*` at :root.
 */
function buildStateOverlays(slate12: string): {
  hover: string;
  hoverStrong: string;
  hoverOverlay: string;
  pressed: string;
  selected: string;
} {
  const mix = (pct: number) =>
    `color-mix(in oklch, ${slate12} ${pct}%, transparent)`;
  return {
    hover: mix(4),
    hoverStrong: mix(6),
    hoverOverlay: mix(10),
    pressed: mix(8),
    selected: mix(12),
  };
}

/**
 * Optional override for the "primary" semantic accent (`accent-info`,
 * used for focus rings, primary buttons, neutral-blue chrome). When a
 * preset specifies an `accentInfoHue`, we shift the existing accent-info
 * recipe to that hue while keeping its L/C. Other accents
 * (danger/success/warning) keep their semantic hues — a tactical app
 * mustn't drift "red" away from threat.
 */
export interface AccentOverrides {
  infoHue?: number;
}

export function buildOverrideStyle(
  input: ThemeTokenInput,
  accents?: AccentOverrides,
): ThemeTokenOutput {
  const slate = buildSlateRamp(input);
  const borders = buildBorders(input.hue, input.chromaScale, input.effectiveMode);
  const states = buildStateOverlays(slate[11]);

  const slate12LCH = computeSlate12LCH(input);
  const accentRgb = oklchToSrgb(slate12LCH.L, slate12LCH.C, slate12LCH.H).join(
    " ",
  );

  const decl: Record<string, string> = {};

  for (let i = 0; i < 12; i++) {
    decl[`--slate-${i + 1}`] = slate[i];
    decl[`--color-slate-${i + 1}`] = slate[i];
  }
  for (let i = 0; i < 8; i++) {
    decl[`--surface-${i + 1}`] = slate[i];
    decl[`--color-surface-${i + 1}`] = slate[i];
  }

  decl["--border-default"] = borders.default;
  decl["--border-strong"] = borders.strong;
  decl["--border-subtle"] = borders.subtle;
  decl["--color-border-default"] = borders.default;
  decl["--color-border-strong"] = borders.strong;
  decl["--color-border-subtle"] = borders.subtle;

  decl["--state-hover"] = states.hover;
  decl["--state-hover-strong"] = states.hoverStrong;
  decl["--state-hover-overlay"] = states.hoverOverlay;
  decl["--state-pressed"] = states.pressed;
  decl["--state-selected"] = states.selected;
  decl["--color-state-hover"] = states.hover;
  decl["--color-state-hover-strong"] = states.hoverStrong;
  decl["--color-state-hover-overlay"] = states.hoverOverlay;
  decl["--color-state-pressed"] = states.pressed;
  decl["--color-state-selected"] = states.selected;

  decl["--color-ink"] = slate[11];
  decl["--color-muted"] = slate[10];
  decl["--color-faint"] = slate[8];

  const lightTune =
    input.effectiveMode === "light" ? clamp01(input.lightAccentTune) : 0;
  writeAccents(decl, input.chromaScale, lightTune, accents?.infoHue);
  writeDispositions(decl, input.chromaScale, lightTune);

  return {
    slate,
    style: decl as CSSProperties,
    cssBlock: serializeCssBlock(decl, input.effectiveMode),
    accentRgb,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

const LIGHT_VIVID_TARGET = 0.5;
const LIGHT_SOFT_TARGET = 0.92;

function tuneVividL(baseL: number, t: number): number {
  return baseL + (LIGHT_VIVID_TARGET - baseL) * t;
}

function tuneSoftL(baseL: number, t: number): number {
  return baseL + (LIGHT_SOFT_TARGET - baseL) * t;
}

function computeSlate12LCH(input: ThemeTokenInput): {
  L: number;
  C: number;
  H: number;
} {
  if (input.effectiveMode === "light") {
    const i = LIGHT_BASE_L.length - 1;
    return {
      L: LIGHT_BASE_L[i],
      C: LIGHT_BASE_C[i] * input.chromaScale,
      H: input.hue,
    };
  }
  return {
    L: input.darkL12,
    C: DARK_BASE_C[DARK_BASE_C.length - 1] * input.chromaScale,
    H: input.hue,
  };
}

function writeAccents(
  decl: Record<string, string>,
  chromaScale: number,
  lightTune: number,
  infoHueOverride?: number,
) {
  const names = Object.keys(ACCENT_RECIPES) as ReadonlyArray<AccentName>;
  const tintNames: ReadonlyArray<AccentName> = [
    "success",
    "danger",
    "warning",
    "info",
  ];

  for (const name of names) {
    const recipe = ACCENT_RECIPES[name];
    const hue =
      name === "info" && infoHueOverride != null ? infoHueOverride : recipe.vivid[2];
    const vivid = oklch(
      tuneVividL(recipe.vivid[0], lightTune),
      recipe.vivid[1] * chromaScale,
      hue,
    );
    decl[`--accent-${name}`] = vivid;
    decl[`--color-accent-${name}`] = vivid;

    if (recipe.soft) {
      const soft = oklch(
        tuneSoftL(recipe.soft[0], lightTune),
        recipe.soft[1] * chromaScale,
        name === "info" && infoHueOverride != null
          ? infoHueOverride
          : recipe.soft[2],
      );
      decl[`--accent-${name}-soft`] = soft;
      decl[`--color-accent-${name}-soft`] = soft;
    }

    if (tintNames.includes(name)) {
      const tint = `color-mix(in oklch, ${vivid} 11%, transparent)`;
      decl[`--accent-${name}-tint`] = tint;
      decl[`--color-accent-${name}-tint`] = tint;
    }
  }

  // Focus ring tracks the (possibly-overridden) info accent.
  decl["--state-focus-ring"] = decl["--accent-info"];
}

function writeDispositions(
  decl: Record<string, string>,
  chromaScale: number,
  lightTune: number,
) {
  for (const [name, [l, c, h]] of Object.entries(DISPOSITION_RECIPES)) {
    const value = oklch(tuneVividL(l, lightTune), c * chromaScale, h);
    decl[`--disposition-${name}`] = value;
    decl[`--color-disposition-${name}`] = value;
  }
}

function serializeCssBlock(
  decl: Record<string, string>,
  mode: EffectiveMode,
): string {
  const selector = mode === "light" ? ".light" : ":root";
  const lines = Object.entries(decl).map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}
