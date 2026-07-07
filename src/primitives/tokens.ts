import { coreTokens, domainTokens } from './tokens.generated';

export const LAYOUT_TOKENS = {
  sidebarWidthPx: 400,
  sidebarMinWidth: 320,
  sidebarMaxWidth: 480,
  sidebarSnapInterval: 40,
} as const;

const ELEVATION = {
  baseSurface: coreTokens.primitive.color.surface[0],
  overlay: {
    level0: 0,
    level1: 0.05,
    level2: 0.08,
    level3: 0.11,
    level4: 0.14,
  },
  shadow: '0 2px 4px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)',
} as const;

type ElevationLevel = keyof typeof ELEVATION.overlay;

/*
 * SURFACE.levelN is the JS-side hex mirror of palette.css --surface-(N+1).
 * The old runtime white-overlay mixer is gone: levels come straight from
 * tokens/core.json, whose surface steps are the palette slate ladder.
 * Prefer `var(--surface-N)` in className/inline styles; use these only
 * where a literal string is required (canvas, hex math via hexToRgba).
 */
const SURFACE: Record<ElevationLevel, string> = {
  level0: coreTokens.primitive.color.surface[0],
  level1: coreTokens.primitive.color.surface[1],
  level2: coreTokens.primitive.color.surface[2],
  level3: coreTokens.primitive.color.surface[3],
  level4: coreTokens.primitive.color.surface[4],
};

export { ELEVATION, SURFACE };

export function surfaceAt(level: ElevationLevel): string {
  return SURFACE[level];
}

export function overlayAt(level: ElevationLevel): string {
  return `rgba(255,255,255,${ELEVATION.overlay[level]})`;
}

export const CARD_TOKENS = {
  container: {
    bgColor: SURFACE.level2,
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 0,
    marginBottom: 10,
    completedOpacity: 0.65,
  },
  elevation: ELEVATION,
  surface: SURFACE,
  header: {
    paddingX: 8,
    paddingY: 6,
    hoverBgOpacity: ELEVATION.overlay.level3,
    selectedBgOpacity: ELEVATION.overlay.level3,
    gap: 6,
  },
  selectedRing: {
    ringWidth: 1,
    ringColor: coreTokens.primitive.color.black,
    ringOpacity: 0.15,
  },
  title: {
    fontSize: 13,
    color: coreTokens.semantic.color.text.default,
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 10,
    color: coreTokens.semantic.color.text.muted,
  },
  iconBox: {
    size: 30,
    borderRadius: 6,
    iconSize: 20,
    defaultBg: SURFACE.level4,
    activeBg: domainTokens.threat.mitigating,
    activeBgOpacity: 0.2,
  },
  content: {
    bgColor: SURFACE.level1,
    borderColor: SURFACE.level3,
    paddingX: 8,
    paddingY: 6,
  },
  animation: {
    expandDuration: 0.2,
    chevronSize: 18,
  },
  spine: {
    width: 3,
    colors: domainTokens.threat,
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

export function hexToRgba(hex: string, opacity: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
