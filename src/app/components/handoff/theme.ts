/**
 * Shared chrome palette for the Handoff Inspector.
 *
 * Sourced from the project's JS `SURFACE` tokens so the inspector reads
 * as a sibling of `PerfHud` and the rest of the dashboard's dev chrome.
 *
 * Why a JS module rather than CSS vars:
 * - `--color-n-*` lives in `src/index.css`, which `main.tsx` does NOT
 *   import at runtime. Inline-style `var(--color-n-9)` would resolve to
 *   nothing.
 * - `SURFACE.level0..4` is plain hex from `src/primitives/tokens.ts`
 *   and resolves at JS runtime — always.
 *
 * One accent rule: the picking marquee is the only place a transient
 * tint is allowed, and even that is a near-white neutral so we don't
 * compete with the app's tactical-red brand.
 */

import { SURFACE, hexToRgba } from '@/primitives/tokens';

/** Background surfaces. 0.92–0.96 alpha keeps the dev chrome "floating". */
export const INSPECTOR_SURFACE = {
  /** Picker glyph idle + popover shell. */
  glyph: hexToRgba(SURFACE.level2, 0.92),
  /** Picker armed (mode === 'picking'). Brighter neutral surface. */
  activeBg: hexToRgba(SURFACE.level4, 0.95),
  /** Tiny additive overlay for hover feedback on idle chrome. */
  hoverBump: 'rgba(255, 255, 255, 0.04)',
} as const;

/** Border tones — all `rgba(255, 255, 255, x)` for theme-agnostic adaptation. */
export const INSPECTOR_BORDER = {
  /** Default chrome border. Matches `ELEVATION.overlay.level2` (0.08). */
  subtle: 'rgba(255, 255, 255, 0.08)',
  /** One step up — emphasized buttons and active states. */
  default: 'rgba(255, 255, 255, 0.12)',
  /** Strongest neutral border — armed glyph and the primary Copy button. */
  strong: 'rgba(255, 255, 255, 0.18)',
} as const;

/** Text tones layered on the surfaces above. Three steps, no hues. */
export const INSPECTOR_TEXT = {
  /** Primary copy and headings. Matches `PerfHud` (`#e6edf3`). */
  primary: '#e6edf3',
  /** Section titles, metadata, secondary labels. */
  muted: 'rgba(255, 255, 255, 0.55)',
  /** Tertiary info — dot separators, the muted "→ section" hint. */
  faint: 'rgba(255, 255, 255, 0.35)',
} as const;

/**
 * Semantic colour tokens. Retained because colour carries meaning in
 * these spots (success / failure / warning). All three are desaturated
 * to sit calmly against neutral chrome.
 */
export const INSPECTOR_SEMANTIC = {
  success: { bg: 'rgba(34, 197, 94, 0.16)', fg: '#bbf7d0' },
  error: { bg: 'rgba(248, 113, 113, 0.16)', fg: '#fecaca' },
  /** Picker stack-depth badge ("2 of 5"). */
  warn: { fg: '#fde68a' },
} as const;

/**
 * Picking-mode overlay. White marquee + dark inner shadow so the
 * outline stays legible on both light (map controls) and dark (device
 * panel) app surfaces, without introducing a second brand colour.
 */
export const INSPECTOR_OVERLAY = {
  hoverOutline: 'rgba(255, 255, 255, 0.95)',
  hoverFill: 'rgba(255, 255, 255, 0.10)',
  /** Inset dark ring keeps the white outline visible on light backgrounds. */
  hoverContrast: 'inset 0 0 0 1px rgba(0, 0, 0, 0.55)',
  pinOutline: 'rgba(255, 255, 255, 0.55)',
  pinFill: 'rgba(255, 255, 255, 0.04)',
} as const;

/** Layered shadow — inset highlight + ambient drop, single light source. */
export const INSPECTOR_SHADOW = {
  dock: '0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 6px 18px rgba(0, 0, 0, 0.45)',
} as const;

/** Concentric radii — outer 10, inner 6 (= 10 − 4 padding). */
export const INSPECTOR_RADIUS = {
  dock: 10,
  control: 6,
} as const;

/** Detect `prefers-reduced-motion` at call time, not import time. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
