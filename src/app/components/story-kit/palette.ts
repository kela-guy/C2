/**
 * Story-kit palette — the two "moods" of the handoff scrollytelling surface.
 *
 * The reference (devouringdetails) is a warm near-white editorial page; the
 * default here is the C2-Hub dark tactical recolor. Every kit component reads
 * its colours from `--story-*` CSS variables so a single root toggle (`Mood`)
 * repaints the whole story without prop drilling.
 */

import type { CSSProperties } from 'react';

export type Mood = 'dark' | 'light';

export interface Palette {
  /** Page canvas. */
  bg: string;
  /** Active prose ink (dimmed per-paragraph via opacity, not colour). */
  ink: string;
  /** Eyebrow labels, captions, secondary text. */
  muted: string;
  /** Tinted band behind highlighted code lines. */
  band: string;
  /** Hairlines, dashed ghost frames, chip borders. */
  border: string;
  /** Handwritten annotation colour. */
  annot: string;
  /** Chip / pill fills. */
  surface: string;
  /** Dot-grid stage texture. */
  dot: string;
  /** The single brand accent (footer dot, progress bar). */
  accent: string;
  /** Sticky right-column stage panel — a subtle contrast against `bg`. */
  panel: string;
  /** Code block surface (brighter/more elevated than the page). */
  codeBg: string;
  /** Tinted band behind highlighted code lines (warm, accent-derived). */
  codeBand: string;
  /** String literal colour in code. */
  codeString: string;
}

export const PALETTES: Record<Mood, Palette> = {
  dark: {
    bg: '#0c0c0e',
    ink: 'rgba(255,255,255,0.92)',
    muted: 'rgba(255,255,255,0.46)',
    band: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
    annot: 'rgba(255,255,255,0.62)',
    surface: 'rgba(255,255,255,0.04)',
    dot: 'rgba(255,255,255,0.05)',
    accent: '#fb923c',
    panel: 'rgba(255,255,255,0.028)',
    codeBg: '#16161a',
    codeBand: 'rgba(251,146,60,0.10)',
    codeString: '#5cb7a8',
  },
  light: {
    bg: '#fcfcfc',
    ink: '#171717',
    muted: '#6f6f6f',
    band: '#f1f1f1',
    border: '#e3e3e3',
    annot: '#262626',
    surface: 'rgba(0,0,0,0.03)',
    dot: 'rgba(0,0,0,0.06)',
    accent: '#fb6a1f',
    panel: '#f5f5f4',
    codeBg: '#ffffff',
    codeBand: 'rgba(251,106,31,0.07)',
    codeString: '#067a6e',
  },
};

/** Map a palette onto the `--story-*` custom properties for a root element. */
export function paletteVars(p: Palette): CSSProperties {
  return {
    '--story-bg': p.bg,
    '--story-ink': p.ink,
    '--story-muted': p.muted,
    '--story-band': p.band,
    '--story-border': p.border,
    '--story-annot': p.annot,
    '--story-surface': p.surface,
    '--story-dot': p.dot,
    '--story-accent': p.accent,
    '--story-panel': p.panel,
    '--story-code-bg': p.codeBg,
    '--story-code-band': p.codeBand,
    '--story-code-string': p.codeString,
  } as CSSProperties;
}
