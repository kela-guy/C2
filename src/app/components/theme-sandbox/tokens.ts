/**
 * Theme Sandbox — token engine.
 *
 * Turns a small `ThemeConfig` (mode + background hue/chroma + primary +
 * secondary) into the ~60 CSS variables that `palette.css` and `theme.css`
 * paint the app from. Everything stays in OKLCH so we can mirror the
 * production palette exactly (no hex conversion library needed) and so
 * the "chroma % of hue-max" recipe used for the tactical accents keeps
 * working when the operator drags a slider.
 *
 * Layout matches palette.css:
 *   1. Slate ramp (--slate-1..12)     — swaps hue/chroma; L ladder is fixed
 *   2. Surfaces + shadows             — aliases over the ramp
 *   3. Borders + states               — recipe copied from palette.css
 *   4. Primary + secondary            — user-picked; -foreground/-soft/-tint derived
 *   5. shadcn semantic tokens         — mapped over the tactical layer so
 *                                       Button/Input/etc. respond to the
 *                                       same picks
 *
 * `deriveTokens()` returns a flat `{ '--slate-1': '…', … }` map that the
 * page applies as an inline `style=` on its scoped root; `exportCss()`
 * emits the same map as a copy-pasteable stylesheet.
 */

export type OkLch = {
  l: number; // 0..1
  c: number; // 0..~0.4
  h: number; // 0..360
};

export type Mode = 'dark' | 'light';

export type ThemeConfig = {
  mode: Mode;
  /** Background neutral ramp hue (0-360). Production ships with 256. */
  bgHue: number;
  /** Chroma multiplier applied to the existing per-step chroma ladder. */
  bgChroma: number;
  /** Small lightness nudge applied to every rung of the ramp. */
  bgLightnessOffset: number;
  primary: OkLch;
  secondary: OkLch;
  /** Button border / stroke. Optional — falls back to `DEFAULT_BUTTON_STROKE`. */
  buttonStroke?: OkLch;
  /** Corner radius in rem — drives the shadcn `--radius` token. */
  radius: number;
};

/** Neutral button stroke approximating production's `border-white/10` hairline. */
export const DEFAULT_BUTTON_STROKE: OkLch = { l: 0.42, c: 0.012, h: 256 };

// ── Lightness / chroma ladders copied verbatim from palette.css ────────────
//
// Keeping these as plain arrays (not derived) means the ramp always
// preserves the perceptual step sizes the production palette was tuned
// against, no matter which hue the operator drags to.
//
// Dark ladder — from palette.css :root (`--slate-1..12`).
const DARK_SLATE_L = [
  0.165, 0.205, 0.245, 0.29, 0.345, 0.41, 0.49, 0.58, 0.665, 0.76, 0.87, 0.965,
];
const DARK_SLATE_C = [
  0.005, 0.006, 0.008, 0.01, 0.012, 0.014, 0.016, 0.018, 0.018, 0.018, 0.014,
  0.01,
];

// Light ladder — from palette.css .light block.
const LIGHT_SLATE_L = [
  0.993, 0.982, 0.959, 0.936, 0.914, 0.889, 0.859, 0.811, 0.645, 0.501, 0.378,
  0.205,
];
const LIGHT_SLATE_C = [
  0.002, 0.002, 0.004, 0.006, 0.008, 0.01, 0.012, 0.016, 0.018, 0.018, 0.016,
  0.006,
];

// Shadow recipes — identical to palette.css; independent of hue so they can
// stay as literal strings.
const DARK_SHADOWS = [
  'none',
  '0 1px 2px rgb(0 0 0 / 0.30)',
  '0 2px 4px rgb(0 0 0 / 0.45), 0 1px 2px rgb(0 0 0 / 0.35)',
  '0 4px 8px rgb(0 0 0 / 0.55), 0 2px 4px rgb(0 0 0 / 0.40)',
  '0 8px 16px rgb(0 0 0 / 0.60), 0 4px 8px rgb(0 0 0 / 0.45)',
  '0 12px 24px rgb(0 0 0 / 0.65), 0 6px 12px rgb(0 0 0 / 0.50)',
  '0 16px 32px rgb(0 0 0 / 0.70), 0 8px 16px rgb(0 0 0 / 0.55)',
  '0 24px 48px rgb(0 0 0 / 0.75), 0 12px 24px rgb(0 0 0 / 0.60)',
];

const LIGHT_SHADOWS = [
  'none',
  '0 1px 2px rgb(0 0 0 / 0.06)',
  '0 2px 6px rgb(0 0 0 / 0.10), 0 1px 2px rgb(0 0 0 / 0.06)',
  '0 4px 10px rgb(0 0 0 / 0.12), 0 2px 4px rgb(0 0 0 / 0.08)',
  '0 8px 20px rgb(0 0 0 / 0.14), 0 4px 8px rgb(0 0 0 / 0.10)',
  '0 12px 28px rgb(0 0 0 / 0.16), 0 6px 12px rgb(0 0 0 / 0.10)',
  '0 16px 36px rgb(0 0 0 / 0.18), 0 8px 16px rgb(0 0 0 / 0.12)',
  '0 24px 52px rgb(0 0 0 / 0.20), 0 12px 24px rgb(0 0 0 / 0.12)',
];

// Fixed tactical accents — production keeps its own hue system for danger /
// warning / info signalling regardless of the neutral background, so we
// leave these as-is and only rewire primary + secondary.
const TACTICAL_ACCENTS: Record<string, string> = {
  '--accent-danger': 'oklch(0.660 0.220 27)',
  '--accent-warning': 'oklch(0.770 0.170 70)',
  '--accent-tracking': 'oklch(0.715 0.180 50)',
  '--accent-success': 'oklch(0.790 0.180 145)',
  '--accent-info': 'oklch(0.790 0.140 230)',
  '--accent-historical': 'oklch(0.720 0.160 280)',
  '--accent-cyan': 'oklch(0.790 0.130 200)',
  '--accent-magenta': 'oklch(0.700 0.200 340)',
  '--accent-danger-soft': 'oklch(0.395 0.110 27)',
  '--accent-warning-soft': 'oklch(0.420 0.090 70)',
  '--accent-success-soft': 'oklch(0.430 0.090 145)',
  '--accent-info-soft': 'oklch(0.430 0.070 230)',
  '--accent-historical-soft': 'oklch(0.58 0.19 275)',
  '--accent-success-tint':
    'color-mix(in oklch, var(--accent-success) 11%, transparent)',
  '--accent-danger-tint':
    'color-mix(in oklch, var(--accent-danger) 11%, transparent)',
  '--accent-warning-tint':
    'color-mix(in oklch, var(--accent-warning) 11%, transparent)',
  '--accent-info-tint':
    'color-mix(in oklch, var(--accent-info) 11%, transparent)',
  '--disposition-suspect': 'oklch(0.745 0.180 60)',
  '--disposition-assumed-friend': 'oklch(0.790 0.180 145)',
  '--disposition-neutral': 'oklch(0.700 0.200 340)',
};

// ── OKLCH formatting helpers ───────────────────────────────────────────────

/** Format an OKLCH triple as `oklch(l c h)` with alpha optional. */
export function okStr({ l, c, h }: OkLch, alpha?: number): string {
  const L = clamp(l, 0, 1).toFixed(3);
  const C = clamp(c, 0, 0.4).toFixed(3);
  const H = ((h % 360) + 360) % 360;
  const Hs = H.toFixed(1);
  return alpha === undefined
    ? `oklch(${L} ${C} ${Hs})`
    : `oklch(${L} ${C} ${Hs} / ${alpha})`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Pick a foreground for a given accent. `slate-1` (deepest) if the accent
 * is bright enough that a dark label reads on top of it, otherwise
 * `slate-12` (near-white / near-black depending on mode).
 */
function foregroundVarFor(color: OkLch): string {
  return color.l > 0.65 ? 'var(--slate-1)' : 'var(--slate-12)';
}

/** "Soft" version — pushed toward the background, halved chroma. */
function softOf(color: OkLch, mode: Mode): OkLch {
  return {
    l: mode === 'dark' ? Math.max(0.3, color.l - 0.25) : Math.min(0.85, color.l + 0.2),
    c: color.c * 0.5,
    h: color.h,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Build the flat CSS-variable map for a given ThemeConfig. The keys are the
 * same names `palette.css` and `theme.css` use, so applying this map as an
 * inline `style` on a scoped element repaints every `bg-surface-*`,
 * `text-slate-*`, `border-border-*` and shadcn `bg-primary` inside that
 * subtree without touching the rest of the app.
 */
export function deriveTokens(cfg: ThemeConfig): Record<string, string> {
  const L = cfg.mode === 'dark' ? DARK_SLATE_L : LIGHT_SLATE_L;
  const C = cfg.mode === 'dark' ? DARK_SLATE_C : LIGHT_SLATE_C;
  const shadows = cfg.mode === 'dark' ? DARK_SHADOWS : LIGHT_SHADOWS;

  const out: Record<string, string> = {};

  // 1. Slate ramp — hue and chroma scale, L ladder is fixed per mode plus a
  //    small user nudge.
  for (let i = 0; i < 12; i++) {
    const l = clamp(L[i] + cfg.bgLightnessOffset, 0, 1);
    const c = clamp(C[i] * cfg.bgChroma, 0, 0.4);
    out[`--slate-${i + 1}`] = okStr({ l, c, h: cfg.bgHue });
  }

  // 2. Surfaces + shadows.
  out['--surface-void'] =
    cfg.mode === 'dark' ? 'oklch(0.06 0 0)' : 'oklch(1 0 0)';
  for (let i = 1; i <= 8; i++) {
    out[`--surface-${i}`] = `var(--slate-${i})`;
    out[`--shadow-${i}`] = shadows[i - 1];
  }

  // 3. Borders — same slots the tactical palette carves, expressed in the
  //    active hue/chroma so a tinted neutral doesn't leak grey borders.
  const borderAlpha = cfg.mode === 'dark' ? 0.55 : 0.2;
  const borderStrongAlpha = cfg.mode === 'dark' ? 0.8 : 0.3;
  const borderSubtleAlpha = cfg.mode === 'dark' ? 0.6 : 0.2;
  out['--border-default'] = okStr(
    { l: L[6] + cfg.bgLightnessOffset, c: C[6] * cfg.bgChroma, h: cfg.bgHue },
    borderAlpha,
  );
  out['--border-strong'] = okStr(
    { l: L[7] + cfg.bgLightnessOffset, c: C[7] * cfg.bgChroma, h: cfg.bgHue },
    borderStrongAlpha,
  );
  out['--border-subtle'] = okStr(
    {
      l: cfg.mode === 'dark' ? L[4] + cfg.bgLightnessOffset : L[8] + cfg.bgLightnessOffset,
      c: cfg.mode === 'dark' ? C[4] * cfg.bgChroma : C[8] * cfg.bgChroma,
      h: cfg.bgHue,
    },
    borderSubtleAlpha,
  );

  // 3b. State overlays — palette.css derives these from slate-12 via
  // color-mix, so they scale with mode automatically.
  out['--state-hover'] =
    'color-mix(in oklch, var(--slate-12) 4%, transparent)';
  out['--state-hover-strong'] =
    'color-mix(in oklch, var(--slate-12) 6%, transparent)';
  out['--state-hover-overlay'] =
    'color-mix(in oklch, var(--slate-12) 10%, transparent)';
  out['--state-pressed'] =
    'color-mix(in oklch, var(--slate-12) 8%, transparent)';
  out['--state-selected'] =
    'color-mix(in oklch, var(--slate-12) 12%, transparent)';
  out['--state-focus-ring'] = 'var(--accent-info)';

  // 4. Fixed tactical accents (danger / warning / info / …).
  Object.assign(out, TACTICAL_ACCENTS);

  // 5. Primary & secondary — user picks. Derive foreground / soft / tint.
  const primary = cfg.primary;
  const secondary = cfg.secondary;
  out['--primary-color'] = okStr(primary);
  out['--primary-foreground-color'] = foregroundVarFor(primary);
  out['--primary-soft'] = okStr(softOf(primary, cfg.mode));
  out['--primary-tint'] =
    `color-mix(in oklch, ${okStr(primary)} 12%, transparent)`;
  out['--secondary-color'] = okStr(secondary);
  out['--secondary-foreground-color'] = foregroundVarFor(secondary);
  out['--secondary-soft'] = okStr(softOf(secondary, cfg.mode));
  out['--secondary-tint'] =
    `color-mix(in oklch, ${okStr(secondary)} 12%, transparent)`;

  // 6. shadcn semantic tokens — mapped over the tactical layer so
  // `<Button variant="default">` and `<Input>` respond to the same picks.
  out['--background'] = 'var(--surface-1)';
  out['--foreground'] = 'var(--slate-12)';
  out['--card'] = 'var(--surface-2)';
  out['--card-foreground'] = 'var(--slate-12)';
  out['--popover'] = 'var(--surface-3)';
  out['--popover-foreground'] = 'var(--slate-12)';
  out['--primary'] = 'var(--primary-color)';
  out['--primary-foreground'] = 'var(--primary-foreground-color)';
  out['--secondary'] = 'var(--secondary-color)';
  out['--secondary-foreground'] = 'var(--secondary-foreground-color)';
  out['--muted'] = 'var(--surface-3)';
  out['--muted-foreground'] = 'var(--slate-10)';
  out['--accent'] = 'var(--surface-4)';
  out['--accent-foreground'] = 'var(--slate-12)';
  out['--destructive'] = 'var(--accent-danger)';
  out['--destructive-foreground'] = 'var(--slate-1)';
  out['--border'] = 'var(--border-default)';
  out['--input'] = 'var(--surface-3)';
  out['--input-background'] = 'var(--surface-3)';
  out['--switch-background'] = 'var(--surface-4)';
  out['--ring'] = 'var(--primary-color)';
  out['--sidebar'] = 'var(--surface-2)';
  out['--sidebar-foreground'] = 'var(--slate-12)';
  out['--sidebar-primary'] = 'var(--primary-color)';
  out['--sidebar-primary-foreground'] = 'var(--primary-foreground-color)';
  out['--sidebar-accent'] = 'var(--surface-3)';
  out['--sidebar-accent-foreground'] = 'var(--slate-12)';
  out['--sidebar-border'] = 'var(--border-default)';
  out['--sidebar-ring'] = 'var(--primary-color)';
  out['--color-dot-on'] = 'var(--slate-12)';
  out['--radius'] = `${cfg.radius}rem`;

  // 7. Button stroke — the only customizer-driven button surface. Fill is
  //    intentionally left to the layered white opacities the production
  //    Button primitive paints; the compat.ts rules just remap borders and
  //    the white CTA to the theme.
  out['--button-border'] = okStr(cfg.buttonStroke ?? DEFAULT_BUTTON_STROKE);

  return out;
}

// ── Presets ─────────────────────────────────────────────────────────────────

/** Reset config = production dark palette (hue 256, no chroma multiplier). */
export const PRODUCTION_DEFAULT: ThemeConfig = {
  mode: 'dark',
  bgHue: 256,
  bgChroma: 1,
  bgLightnessOffset: 0,
  primary: { l: 0.75, c: 0.18, h: 55 },
  secondary: { l: 0.68, c: 0.16, h: 40 },
  radius: 0.625,
};

/**
 * Achromatic reset baseline — grey/black surfaces with a near-white accent.
 * `bgChroma: 0` zeroes out the slate ramp's hue channel (every rung is a
 * pure grey with only its L varying), and `primary.c: 0` removes any tint
 * from the accent. Applied by the customizer's Reset button so operators
 * can wipe every pick and start from a neutral B&W canvas.
 */
export const MONO_DEFAULT: ThemeConfig = {
  mode: 'dark',
  bgHue: 0,
  bgChroma: 0,
  bgLightnessOffset: 0,
  primary: { l: 0.9, c: 0, h: 0 },
  secondary: { l: 0.9, c: 0, h: 0 },
  radius: 0.625,
};

/**
 * Curated full-theme combos (like the theme picker on shadcn /create):
 * one click sets background hue + primary + secondary together so the
 * operator can audition coherent directions before fine-tuning.
 */
export const THEME_PRESETS: Array<{
  label: string;
  config: Pick<ThemeConfig, 'bgHue' | 'bgChroma' | 'primary' | 'secondary'>;
}> = [
  {
    label: 'Amber Watch',
    config: {
      bgHue: 60,
      bgChroma: 0.7,
      primary: { l: 0.78, c: 0.16, h: 75 },
      secondary: { l: 0.7, c: 0.12, h: 40 },
    },
  },
  {
    label: 'Crimson',
    config: {
      bgHue: 20,
      bgChroma: 0.9,
      primary: { l: 0.66, c: 0.2, h: 25 },
      secondary: { l: 0.75, c: 0.12, h: 350 },
    },
  },
  {
    label: 'Monochrome',
    config: {
      bgHue: 0,
      bgChroma: 0,
      primary: { l: 0.85, c: 0, h: 0 },
      secondary: { l: 0.55, c: 0, h: 0 },
    },
  },
];

// ── OKLCH → sRGB conversion + contrast (no dependencies) ──────────────────
//
// Standard OKLab pipeline (Björn Ottosson's reference implementation):
// OKLCH → OKLab → LMS' → LMS (cube) → linear sRGB → gamma sRGB.

/** Convert OKLCH to linear sRGB. Channels may fall outside [0,1] (out of gamut). */
function oklchToLinearSrgb({ l, c, h }: OkLch): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  return [
    +4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

function linearToGamma(u: number): number {
  const v = clamp(u, 0, 1);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** OKLCH → #rrggbb (gamut-clamped). */
export function okToHex(color: OkLch): string {
  const [r, g, b] = oklchToLinearSrgb(color).map(linearToGamma);
  const to255 = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

/**
 * Parse a `#rgb`, `#rrggbb`, or `#rrggbbaa` string into OKLCH. Returns
 * `null` when the string can't be parsed — the customizer keeps its
 * current color and (typically) also flags the input as invalid.
 * Alpha is discarded because the customizer only writes opaque accents.
 */
export function hexToOkLch(hex: string): OkLch | null {
  const raw = hex.trim().replace(/^#/, '');
  let r255: number;
  let g255: number;
  let b255: number;
  if (raw.length === 3) {
    if (!/^[0-9a-fA-F]{3}$/.test(raw)) return null;
    r255 = parseInt(raw[0] + raw[0], 16);
    g255 = parseInt(raw[1] + raw[1], 16);
    b255 = parseInt(raw[2] + raw[2], 16);
  } else if (raw.length === 6 || raw.length === 8) {
    if (!/^[0-9a-fA-F]{6,8}$/.test(raw)) return null;
    r255 = parseInt(raw.slice(0, 2), 16);
    g255 = parseInt(raw.slice(2, 4), 16);
    b255 = parseInt(raw.slice(4, 6), 16);
  } else {
    return null;
  }
  const [rl, gl, bl] = [r255, g255, b255].map(gammaToLinear);
  return linearSrgbToOklch(rl, gl, bl);
}

function gammaToLinear(u255: number): number {
  const v = clamp(u255 / 255, 0, 1);
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Inverse of `oklchToLinearSrgb`. */
function linearSrgbToOklch(r: number, g: number, b: number): OkLch {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const c = Math.hypot(a, bb);
  let h = c === 0 ? 0 : (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return {
    l: clamp(L, 0, 1),
    c: clamp(c, 0, 0.4),
    h,
  };
}

/** WCAG relative luminance of an OKLCH color (gamut-clamped). */
function relativeLuminance(color: OkLch): number {
  const [r, g, b] = oklchToLinearSrgb(color).map((v) => clamp(v, 0, 1));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two OKLCH colors (1..21). */
export function contrastRatio(a: OkLch, b: OkLch): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The OKLCH triple the derived `-foreground` resolves to for a given
 * accent + mode. Mirrors `foregroundVarFor`: slate-1 for bright accents,
 * slate-12 otherwise, using the mode's actual ladder values.
 */
export function foregroundColorFor(color: OkLch, cfg: ThemeConfig): OkLch {
  const L = cfg.mode === 'dark' ? DARK_SLATE_L : LIGHT_SLATE_L;
  const C = cfg.mode === 'dark' ? DARK_SLATE_C : LIGHT_SLATE_C;
  const idx = color.l > 0.65 ? 0 : 11;
  return {
    l: clamp(L[idx] + cfg.bgLightnessOffset, 0, 1),
    c: clamp(C[idx] * cfg.bgChroma, 0, 0.4),
    h: cfg.bgHue,
  };
}

/** Slate rung as an OkLch triple for the active config (1-based index). */
export function slateColorFor(rung: number, cfg: ThemeConfig): OkLch {
  const L = cfg.mode === 'dark' ? DARK_SLATE_L : LIGHT_SLATE_L;
  const C = cfg.mode === 'dark' ? DARK_SLATE_C : LIGHT_SLATE_C;
  const i = clamp(rung, 1, 12) - 1;
  return {
    l: clamp(L[i] + cfg.bgLightnessOffset, 0, 1),
    c: clamp(C[i] * cfg.bgChroma, 0, 0.4),
    h: cfg.bgHue,
  };
}

/**
 * Suggested primary/secondary swatches — four canonical directions
 * (Cyan / Orange / Blue / Green) as single picks. Anything between
 * these can still be dialed in with the LCH sliders or the hex input.
 */
export const ACCENT_SWATCHES: Array<{ label: string; color: OkLch }> = [
  { label: 'Cyan', color: { l: 0.75, c: 0.13, h: 200 } },
  { label: 'Orange', color: { l: 0.75, c: 0.18, h: 55 } },
  { label: 'Blue', color: { l: 0.65, c: 0.16, h: 250 } },
  { label: 'Green', color: { l: 0.75, c: 0.17, h: 145 } },
];

/** Background hue presets — the "flavor" of the neutral. */
export const BG_HUE_PRESETS: Array<{ label: string; hue: number }> = [
  { label: 'Slate (prod)', hue: 256 },
  { label: 'Cool blue', hue: 230 },
  { label: 'Neutral', hue: 0 },
  { label: 'Warm', hue: 40 },
  { label: 'Olive', hue: 110 },
  { label: 'Rose', hue: 350 },
];

// ── Export helpers ─────────────────────────────────────────────────────────

/**
 * Emit a copy-pasteable CSS block. Shape mirrors palette.css so the operator
 * can diff the output against the source and drop it in when a candidate
 * wins. `theme.css` block sits below for the shadcn tokens.
 */
export function exportCss(cfg: ThemeConfig): string {
  const tokens = deriveTokens(cfg);

  const paletteKeys = [
    // slate ramp
    '--slate-1', '--slate-2', '--slate-3', '--slate-4', '--slate-5', '--slate-6',
    '--slate-7', '--slate-8', '--slate-9', '--slate-10', '--slate-11', '--slate-12',
    // surfaces + shadows
    '--surface-void',
    '--surface-1', '--surface-2', '--surface-3', '--surface-4',
    '--surface-5', '--surface-6', '--surface-7', '--surface-8',
    '--shadow-1', '--shadow-2', '--shadow-3', '--shadow-4',
    '--shadow-5', '--shadow-6', '--shadow-7', '--shadow-8',
    // borders + states
    '--border-default', '--border-strong', '--border-subtle',
    '--state-hover', '--state-hover-strong', '--state-hover-overlay',
    '--state-pressed', '--state-selected', '--state-focus-ring',
    // primary + secondary
    '--primary-color', '--primary-foreground-color', '--primary-soft', '--primary-tint',
    '--secondary-color', '--secondary-foreground-color', '--secondary-soft', '--secondary-tint',
    // buttons
    '--button-border',
  ];

  const shadcnKeys = [
    '--background', '--foreground',
    '--card', '--card-foreground',
    '--popover', '--popover-foreground',
    '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground',
    '--muted', '--muted-foreground',
    '--accent', '--accent-foreground',
    '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring',
    '--sidebar', '--sidebar-foreground',
    '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring',
  ];

  const rootSel = cfg.mode === 'dark' ? ':root' : ':root';
  const paletteLines = paletteKeys.map((k) => `  ${k}: ${tokens[k]};`).join('\n');
  const shadcnLines = shadcnKeys.map((k) => `  ${k}: ${tokens[k]};`).join('\n');

  return [
    `/* palette.css — ${cfg.mode} */`,
    `${rootSel} {`,
    paletteLines,
    `}`,
    ``,
    `/* theme.css — shadcn semantic tokens */`,
    `${rootSel} {`,
    shadcnLines,
    `}`,
  ].join('\n');
}

// ── Tweakcn palette import ────────────────────────────────────────────────
//
// The sandbox lets operators paste a raw shadcn / tweakcn theme CSS block
// (a `:root { ... }` for light + `.dark { ... }` for dark), extract its
// color tokens, and layer them on top of the derived sandbox tokens so
// the whole platform reskins to the imported palette. The Color section's
// primary/secondary picks re-win over the imported accent, so operators
// can still A/B a hue against the imported neutrals.

/**
 * Which shadcn-style `--foo` variables from a tweakcn block we care about.
 * Everything else (font-*, tracking-*, shadow-*, spacing, radius, shadow-x
 * decomposition, etc.) is intentionally dropped: the plan explicitly
 * ignores font settings, and the sandbox owns its own shadow ladder.
 */
const TWEAKCN_COLOR_VARS: readonly string[] = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
];

const TWEAKCN_COLOR_SET = new Set(TWEAKCN_COLOR_VARS);

/**
 * Parse a tweakcn / shadcn theme CSS block. Extracts the `--foo: value;`
 * pairs from the `:root` (light) or `.dark` (dark) block matching the
 * requested mode. Falls back to whichever block exists when the exact
 * match is missing. Returns `null` when neither block can be parsed —
 * the UI shows that as a red status hint so the operator sees why.
 *
 * Only whitelisted color-related tokens survive; font, shadow, tracking,
 * radius, and spacing declarations are discarded. This keeps the imported
 * palette focused on the reskin the user actually asked for.
 */
export function parseTweakcnCss(
  css: string,
  mode: Mode,
): Record<string, string> | null {
  const dark = extractBlock(css, /\.dark\s*\{([\s\S]*?)\}/);
  const root = extractBlock(css, /:root\s*\{([\s\S]*?)\}/);
  const primary = mode === 'dark' ? dark : root;
  const fallback = mode === 'dark' ? root : dark;
  const body = primary ?? fallback;
  if (!body) return null;

  const out: Record<string, string> = {};
  // Match `--foo: <value>;` — the value can span whitespace between
  // number groups (oklch(...)) but never a semicolon.
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const name = m[1];
    const value = m[2].trim();
    if (!TWEAKCN_COLOR_SET.has(name)) continue;
    out[`--${name}`] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function extractBlock(css: string, re: RegExp): string | null {
  const match = re.exec(css);
  return match ? match[1] : null;
}

/**
 * Parse a color string tweakcn ships in oklch form:
 *   `oklch(L C H)` or `oklch(L C H / A)`.
 * Returns `null` for anything else (hsl / rgb / hex / var()) — the
 * sandbox's Color section only speaks OKLCH, and picking a hex value
 * from the palette is already covered by the manual hex input.
 */
export function parseOklchString(v: string): OkLch | null {
  const m = /oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*[0-9.]+)?\s*\)/i.exec(
    v.trim(),
  );
  if (!m) return null;
  const l = parseFloat(m[1]);
  const c = parseFloat(m[2]);
  const h = parseFloat(m[3]);
  if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) {
    return null;
  }
  return { l: clamp(l, 0, 1), c: clamp(c, 0, 0.4), h: ((h % 360) + 360) % 360 };
}

/**
 * Project a tweakcn variable map onto the sandbox's own token names so
 * `compat.ts` remaps (which key off `--surface-*`, `--slate-*`,
 * `--primary-color`, `--border-default`, …) pick up the imported palette.
 * Missing tweakcn keys just leave their sandbox counterparts alone, so
 * the underlying `deriveTokens` output continues to fill the gaps.
 */
export function projectPaletteToSandbox(
  vars: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};

  const set = (target: string, source: string | undefined) => {
    if (source !== undefined) out[target] = source;
  };

  // Neutral surfaces — hardcoded hexes in the Dashboard remap onto these.
  set('--surface-1', vars['--background']);
  set('--surface-2', vars['--card'] ?? vars['--sidebar']);
  set('--surface-3', vars['--popover'] ?? vars['--muted']);
  set('--surface-4', vars['--accent']);

  // Text tiers. Slate-12 is the dominant "body text" color; slate-11 gets
  // the same value so hover text stays legible. Slate-9/10 both track
  // muted-foreground for secondary labels.
  set('--slate-12', vars['--foreground']);
  set('--slate-11', vars['--foreground']);
  set('--slate-10', vars['--muted-foreground']);
  set('--slate-9', vars['--muted-foreground']);

  // Accent layer.
  set('--primary-color', vars['--primary']);
  set('--primary-foreground-color', vars['--primary-foreground']);
  set('--secondary-color', vars['--secondary']);
  set('--secondary-foreground-color', vars['--secondary-foreground']);

  // Borders — tweakcn only ships one `--border` value; fan it out to the
  // three sandbox border tiers so hairlines/emphasized borders both track.
  set('--border-default', vars['--border']);
  set('--border-strong', vars['--border']);
  set('--border-subtle', vars['--border']);

  // Inputs.
  set('--input-background', vars['--input']);

  // Signalling — only the destructive slot gets remapped, so danger stays
  // aligned with the imported palette. Warning / success / info stay
  // hardcoded so operators can't accidentally reskin critical states.
  set('--accent-danger', vars['--destructive']);

  return out;
}
