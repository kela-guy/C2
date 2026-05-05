/**
 * Icon size + stroke tokens. Opt-in: existing call sites can keep their
 * literal numbers; new code (and the styleguide preview) reads from here so
 * sizing stays consistent and re-tunable from one place.
 *
 * Keep these aligned with Tailwind's text size scale — 14/16/20 give us a
 * comfortable optical match against `text-[12px]`/`text-sm`/`text-base`.
 */

export const ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export type IconSizeToken = keyof typeof ICON_SIZE;

export const ICON_STROKE = {
  /** Default stroke for product UI — a hair lighter than lucide's default. */
  regular: 1.75,
  /** Used inside small badges where the regular weight reads as fragile. */
  bold: 2,
} as const;

export type IconStrokeToken = keyof typeof ICON_STROKE;

/** Common preview sizes for the styleguide icon library size toggle. */
export const ICON_PREVIEW_SIZES = [16, 20, 24] as const;
export type IconPreviewSize = (typeof ICON_PREVIEW_SIZES)[number];
