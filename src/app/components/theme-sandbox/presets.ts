/**
 * Tweakcn Orange — the shadcn/tweakcn theme the design team supplied,
 * expressed as the platform's `ThemeConfig` so the token engine
 * (`theme-sandbox/tokens.ts`) can derive the full slate ramp + shadcn
 * semantic layer from it.
 *
 * Source theme (oklch, per mode):
 *   dark  background  oklch(0.2138 0.0019 286.23)  → hue 286, near-zero chroma
 *   dark  primary     oklch(0.6901 0.1589  49.92)  → orange (≈ --accent-tracking)
 *   light background  oklch(1 0 0)                 → pure white
 *   light primary     oklch(0.6940 0.2016  44.08)  → hotter orange
 *   radius            0.2rem
 *
 * Known deltas vs the source theme (engine constraints, not mistakes):
 *   - The source theme is "flat" (card / sidebar == background); our engine
 *     builds surfaces from the slate ramp, so panels sit one rung lighter.
 *   - Source `secondary` is just `muted` (a neutral), not an accent. We map
 *     it to a literal neutral gray per mode. The light-mode value is pulled
 *     down from the source's 0.97 to 0.55 because `foregroundVarFor()`
 *     resolves bright accents to `--slate-1`, which is near-white in light
 *     mode and would leave the label illegible.
 *   - `--chart-*` tokens have no counterpart in the engine and are dropped.
 */

import type { Mode, OkLch, ThemeConfig } from './tokens';

/** Per-mode primary from the source theme. */
export const TWEAKCN_PRIMARY: Record<Mode, OkLch> = {
  dark: { l: 0.69, c: 0.159, h: 50 },
  light: { l: 0.694, c: 0.202, h: 44 },
};

/** Per-mode neutral "secondary" (see header note on the light value). */
export const TWEAKCN_SECONDARY: Record<Mode, OkLch> = {
  dark: { l: 0.269, c: 0, h: 0 },
  light: { l: 0.55, c: 0, h: 0 },
};

// Background mapping: hue 286 from oklch(0.2138 0.0019 286.23).
// Chroma multiplier ≈ 0.0019 / 0.005 (ramp base chroma) ≈ 0.4 — almost gray.
// Lightness offset +0.05 lifts slate-1 (0.165) to ≈ the source's 0.214.
const TWEAKCN_BASE = {
  bgHue: 286,
  bgChroma: 0.4,
  radius: 0.2,
} as const;

export const TWEAKCN_ORANGE_DARK: ThemeConfig = {
  mode: 'dark',
  ...TWEAKCN_BASE,
  bgLightnessOffset: 0.05,
  primary: TWEAKCN_PRIMARY.dark,
  secondary: TWEAKCN_SECONDARY.dark,
};

export const TWEAKCN_ORANGE_LIGHT: ThemeConfig = {
  mode: 'light',
  ...TWEAKCN_BASE,
  // Light slate-1 is 0.993 vs the source's pure-white 1.0 — close enough
  // to leave the ramp untouched.
  bgLightnessOffset: 0,
  primary: TWEAKCN_PRIMARY.light,
  secondary: TWEAKCN_SECONDARY.light,
};

export const TWEAKCN_ORANGE: Record<Mode, ThemeConfig> = {
  dark: TWEAKCN_ORANGE_DARK,
  light: TWEAKCN_ORANGE_LIGHT,
};
