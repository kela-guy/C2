/**
 * tokens.ts — geometry + token façade for legacy card consumers.
 *
 * The visual palette lives in src/styles/palette.css now. The
 * ELEVATION / SURFACE / CARD_TOKENS exports below emit
 * `var(--surface-N)` / `var(--slate-N)` / `var(--accent-*)` strings
 * so existing inline-style consumers (AccordionSection, CardActions,
 * CardClosure, CardFooterDock, CardSensors, CardTimeline, CardLog,
 * TargetCard) keep compiling without touching their render bodies —
 * the colors just resolve via the cascade at paint time.
 *
 * New code should prefer Tailwind utilities (bg-surface-3, text-slate-12,
 * bg-accent-danger) over reading from these objects.
 */

export const LAYOUT_TOKENS = {
  sidebarWidthPx: 400,
  sidebarMinWidth: 320,
  sidebarMaxWidth: 480,
  sidebarSnapInterval: 40,
  railWidthPx: 32,
  panelWidthPx: 400,
  videoWidthPx: 600,
  topBarHeightPx: 36,
  bottomBarHeightPx: 36,
} as const;

/**
 * Legacy elevation shape. The old mixOverlay() hex math is gone;
 * each level points at the matching surface token. `baseSurface`
 * was hard-coded `#141414` — substrate 2 is the closest analog and
 * is what gridblock.css uses for the panel base today.
 */
const ELEVATION = {
  baseSurface: 'var(--surface-2)',
  overlay: {
    /*
     * Opacities preserved for callers that still want a wash on
     * top of an arbitrary surface (e.g. AccordionSection adds
     * level2 opacity to inset rows). The actual color is now
     * --state-* tokens; these are the alpha values to multiply
     * with --slate-12 when something hand-builds rgba.
     */
    level0: 0,
    level1: 0.04,
    level2: 0.06,
    level3: 0.08,
    level4: 0.12,
  },
  /*
   * Drop-shadow recipe used by the legacy CARD container. Lives
   * here for inline-style consumers; new code should use
   * `shadow-[var(--shadow-N)]` via Tailwind instead.
   */
  shadow: 'var(--shadow-4)',
} as const;

type ElevationLevel = keyof typeof ELEVATION.overlay;

/**
 * Five-level surface ladder backed by the eight-level Surface
 * system. The mapping preserves the prior visual contract — level0
 * was the page background, level4 was the highest-emphasis card
 * surface — so existing CardSensors / CardClosure / CardActions
 * paint at the right depth without changes.
 *
 *   level0 → page background          → --surface-1
 *   level1 → card container           → --surface-2
 *   level2 → row / inset chrome       → --surface-3
 *   level3 → header / pill background → --surface-4
 *   level4 → highest-emphasis surface → --surface-5
 */
const SURFACE: Record<ElevationLevel, string> = {
  level0: 'var(--surface-1)',
  level1: 'var(--surface-2)',
  level2: 'var(--surface-3)',
  level3: 'var(--surface-4)',
  level4: 'var(--surface-5)',
};

export { ELEVATION, SURFACE };

export function surfaceAt(level: ElevationLevel): string {
  return SURFACE[level];
}

/**
 * Translucent foreground wash at the given legacy level. Replaces
 * the hand-built rgba(255,255,255,opacity) strings — now derived
 * from --slate-12 via color-mix so light-mode picks the matching
 * dark wash.
 */
export function overlayAt(level: ElevationLevel): string {
  const opacity = ELEVATION.overlay[level];
  return `color-mix(in oklch, var(--slate-12) ${(opacity * 100).toFixed(0)}%, transparent)`;
}

export const CARD_TOKENS = {
  container: {
    bgColor: SURFACE.level3,
    borderColor: 'transparent',
    borderRadius: 4,
    borderWidth: 0,
    marginBottom: 10,
    completedOpacity: 0.65,
  },
  elevation: ELEVATION,
  surface: SURFACE,
  header: {
    paddingX: 8,
    paddingY: 6,
    hoverBgOpacity: ELEVATION.overlay.level2,
    selectedBgOpacity: ELEVATION.overlay.level2,
    gap: 6,
  },
  selectedRing: {
    ringWidth: 1,
    ringColor: 'var(--surface-1)',
    ringOpacity: 0.15,
  },
  title: {
    fontSize: 13,
    color: 'var(--slate-12)',
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 10,
    color: 'var(--slate-9)',
  },
  iconBox: {
    size: 30,
    borderRadius: 6,
    iconSize: 20,
    defaultBg: SURFACE.level3,
    activeBg: 'var(--accent-danger)',
    activeBgOpacity: 0.2,
  },
  content: {
    bgColor: SURFACE.level4,
    borderColor: SURFACE.level2,
    paddingX: 8,
    paddingY: 6,
  },
  animation: {
    expandDuration: 0.2,
    chevronSize: 18,
  },
  spine: {
    width: 3,
    /*
     * Severity colors for the card spine accent. Map onto the
     * tactical accent palette so a severity tone change is one
     * edit in palette.css.
     */
    colors: {
      idle:        'var(--slate-7)',
      suspicion:   'var(--accent-warning)',
      detection:   'var(--accent-danger-soft)',
      tracking:    'var(--accent-tracking)',
      mitigating:  'var(--accent-danger)',
      active:      'var(--accent-info)',
      resolved:    'var(--accent-success)',
      expired:     'var(--slate-6)',
    },
  },
  timeline: {
    dotSize: 8,
    activeDotSize: 10,
    lineWidth: 2,
    gap: 6,
  },
  actions: {
    gap: 4,
    gridMinCols: 2,
  },
} as const;

export type ThreatAccent = keyof typeof CARD_TOKENS.spine.colors;

/**
 * Legacy hex helper for SVG / Canvas paths that can't read CSS
 * vars. Prefer accentHex() / slateHex() for tactical accents;
 * this stays for one-off hex-string conversions (markerStyles,
 * MapMarker badge fills, etc.).
 */
export function hexToRgba(hex: string, opacity: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
