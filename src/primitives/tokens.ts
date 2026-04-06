export const LAYOUT_TOKENS = {
  sidebarWidthPx: 400,
  sidebarMinWidth: 320,
  sidebarMaxWidth: 480,
  sidebarSnapInterval: 40,
} as const;

const ELEVATION = {
  baseSurface: '#141414',
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

function mixOverlay(base: string, opacity: number): string {
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * opacity);
  return `#${[mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

const SURFACE: Record<ElevationLevel, string> = {
  level0: ELEVATION.baseSurface,
  level1: mixOverlay(ELEVATION.baseSurface, ELEVATION.overlay.level1),
  level2: mixOverlay(ELEVATION.baseSurface, ELEVATION.overlay.level2),
  level3: mixOverlay(ELEVATION.baseSurface, ELEVATION.overlay.level3),
  level4: mixOverlay(ELEVATION.baseSurface, ELEVATION.overlay.level4),
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
    bgColor: SURFACE.level1,
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
    hoverBgOpacity: ELEVATION.overlay.level2,
    selectedBgOpacity: ELEVATION.overlay.level2,
    gap: 6,
  },
  selectedRing: {
    ringWidth: 1,
    ringColor: '#000000',
    ringOpacity: 0.15,
  },
  title: {
    fontSize: 13,
    color: '#dee2e6',
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 10,
    color: '#999999',
  },
  iconBox: {
    size: 30,
    borderRadius: 6,
    iconSize: 20,
    defaultBg: SURFACE.level3,
    activeBg: '#ef4444',
    activeBgOpacity: 0.2,
  },
  content: {
    bgColor: SURFACE.level0,
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
    colors: {
      idle: '#52525b',
      suspicion: '#f59e0b',
      detection: '#fa5252',
      tracking: '#fd7e14',
      mitigating: '#ef4444',
      active: '#74c0fc',
      resolved: '#12b886',
      expired: '#3f3f46',
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

export function hexToRgba(hex: string, opacity: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
