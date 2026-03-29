export type Affiliation = 'friendly' | 'hostile' | 'possibleThreat' | 'neutral' | 'unknown';

export type InteractionState =
  | 'default'
  | 'hovered'
  | 'selected'
  | 'active'
  | 'disabled'
  | 'expired'
  | 'alert'
  | 'jammer'
  | 'missionPlanning';

export const INTERACTION_STATES: InteractionState[] = [
  'default',
  'hovered',
  'selected',
  'active',
  'disabled',
  'expired',
  'alert',
  'jammer',
  'missionPlanning',
];

export const AFFILIATIONS: Affiliation[] = ['friendly', 'hostile', 'possibleThreat', 'neutral', 'unknown'];

export const AFFILIATION_LABELS: Record<Affiliation, string> = {
  friendly: 'Friendly',
  hostile: 'Hostile',
  possibleThreat: 'Possible Threat',
  neutral: 'Neutral',
  unknown: 'Unknown',
};

export const INTERACTION_STATE_LABELS: Record<InteractionState, string> = {
  default: 'Default',
  hovered: 'Hovered',
  selected: 'Selected',
  active: 'Active / Engaged',
  disabled: 'Disabled / Offline',
  expired: 'Expired',
  alert: 'Alert',
  jammer: 'Jammer',
  missionPlanning: 'Mission Planning',
};

export interface MarkerStyle {
  surfaceFill: string;
  surfaceOpacity: number;
  surfaceBlur: number;
  innerGlow: boolean;
  innerGlowOpacity: number;
  ringColor: string;
  ringWidth: number;
  ringOpacity: number;
  ringDash: 'solid' | 'dashed';
  ringPulse: boolean;
  glyphColor: string;
  glyphOpacity: number;
  markerScale: number;
}

interface AffiliationPalette {
  glyph: string;
  surface: string;
  surfaceOpacity: number;
  ring: string;
  ringOpacity: number;
}

export const AFFILIATION_PALETTES: Record<Affiliation, AffiliationPalette> = {
  friendly: {
    glyph: '#ffffff',
    surface: '#ffffff',
    surfaceOpacity: 0.1,
    ring: '#000000',
    ringOpacity: 1,
  },
  hostile: {
    glyph: '#ff3d40',
    surface: '#ffffff',
    surfaceOpacity: 0.1,
    ring: '#ff3d40',
    ringOpacity: 1,
  },
  possibleThreat: {
    glyph: '#ff9e3d',
    surface: '#ffffff',
    surfaceOpacity: 0.1,
    ring: '#ff9e3d',
    ringOpacity: 1,
  },
  neutral: {
    glyph: '#4ade80',
    surface: '#ffffff',
    surfaceOpacity: 0.1,
    ring: '#000000',
    ringOpacity: 1,
  },
  unknown: {
    glyph: '#facc15',
    surface: '#ffffff',
    surfaceOpacity: 0.1,
    ring: '#000000',
    ringOpacity: 1,
  },
};

const STATE_MATRIX: Record<InteractionState, (p: AffiliationPalette) => MarkerStyle> = {
  default: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowOpacity: 0,
    ringColor: p.ring,
    ringWidth: 2,
    ringOpacity: p.ringOpacity,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: p.glyph,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  hovered: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowOpacity: 0.4,
    ringColor: '#ffffff',
    ringWidth: 1.5,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: p.glyph,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  selected: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowOpacity: 0.4,
    ringColor: '#ffffff',
    ringWidth: 1.5,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: p.glyph,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  active: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowOpacity: 0.4,
    ringColor: '#ffffff',
    ringWidth: 1.5,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: p.glyph,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  disabled: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowOpacity: 0,
    ringColor: '#8c8c8c',
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: '#8c8c8c',
    glyphOpacity: 1,
    markerScale: 1,
  }),
  expired: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: Math.max(p.surfaceOpacity - 0.05, 0),
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowOpacity: 0,
    ringColor: '#3f3f46',
    ringWidth: 1,
    ringOpacity: 0.4,
    ringDash: 'dashed',
    ringPulse: false,
    glyphColor: '#52525b',
    glyphOpacity: 0.4,
    markerScale: 1,
  }),
  alert: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowOpacity: 0,
    ringColor: '#ff3d40',
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: '#ffffff',
    glyphOpacity: 1,
    markerScale: 1,
  }),
  jammer: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowOpacity: 0,
    ringColor: '#4ade80',
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: '#4ade80',
    glyphOpacity: 1,
    markerScale: 1,
  }),
  missionPlanning: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowOpacity: 0,
    ringColor: '#a78bfa',
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'dashed',
    ringPulse: false,
    glyphColor: '#a78bfa',
    glyphOpacity: 1,
    markerScale: 1,
  }),
};

export function resolveMarkerStyle(
  state: InteractionState = 'default',
  affiliation: Affiliation = 'friendly',
  overrides?: Partial<MarkerStyle>,
): MarkerStyle {
  const palette = AFFILIATION_PALETTES[affiliation];
  const base = STATE_MATRIX[state](palette);
  if (!overrides) return base;
  const merged = { ...base };
  for (const key of Object.keys(overrides) as (keyof MarkerStyle)[]) {
    if (overrides[key] !== undefined) {
      (merged as Record<string, unknown>)[key] = overrides[key];
    }
  }
  return merged;
}

export function hexToRgba(hex: string, opacity: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function headingToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_DIRECTIONS[index];
}
