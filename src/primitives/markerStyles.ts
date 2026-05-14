import { accentHex, slateHex } from '@/primitives/accentHex';

/*
 * Marker styles are consumed by SVG paint and Cesium scene materials
 * — both of which need literal hex/rgba values. Each color below
 * routes through accentHex() / slateHex() so the JS-side palette
 * matches the OKLCH source in palette.css.
 *
 * Mapping:
 *   hostile / weaponLocked → accent-danger     (red)
 *   possibleThreat         → accent-tracking   (warm orange)
 *   weaponPointing         → accent-warning    (yellow-orange)
 *   neutral / jammer       → accent-success    (green)
 *   unknown                → accent-warning    (yellow)
 *   disabled / expired     → slate ramp        (neutral grays)
 *   surface wash           → slate-12          (white-ish)
 *   ring base (default)    → slate-1           (near-black outline)
 */
const COLOR_HOSTILE = accentHex('danger');
const COLOR_POSSIBLE = accentHex('tracking');
const COLOR_NEUTRAL = accentHex('success');
const COLOR_UNKNOWN = accentHex('warning');
const COLOR_WEAPON_POINTING = accentHex('warning');
const COLOR_WEAPON_LOCKED = accentHex('danger');
const COLOR_SURFACE_WASH = slateHex(12);
const COLOR_RING_DARK = slateHex(1);
const COLOR_RING_HOVER = slateHex(12);
const COLOR_DISABLED = slateHex(7);
const COLOR_EXPIRED_GLYPH = slateHex(6);
const COLOR_EXPIRED_RING = slateHex(5);

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
  | 'weaponPointing'
  | 'weaponLocked';

export const INTERACTION_STATES: InteractionState[] = [
  'default',
  'hovered',
  'selected',
  'active',
  'disabled',
  'expired',
  'alert',
  'jammer',
  'weaponPointing',
  'weaponLocked',
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
  weaponPointing: 'Weapon Pointing',
  weaponLocked: 'Weapon Locked',
};

export interface MarkerStyle {
  surfaceFill: string;
  surfaceOpacity: number;
  surfaceBlur: number;
  innerGlow: boolean;
  innerGlowColor: string;
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
    glyph: COLOR_SURFACE_WASH,
    surface: COLOR_SURFACE_WASH,
    surfaceOpacity: 0.1,
    ring: COLOR_RING_DARK,
    ringOpacity: 1,
  },
  hostile: {
    glyph: COLOR_HOSTILE,
    surface: COLOR_SURFACE_WASH,
    surfaceOpacity: 0.1,
    ring: COLOR_HOSTILE,
    ringOpacity: 1,
  },
  possibleThreat: {
    glyph: COLOR_POSSIBLE,
    surface: COLOR_SURFACE_WASH,
    surfaceOpacity: 0.1,
    ring: COLOR_POSSIBLE,
    ringOpacity: 1,
  },
  neutral: {
    glyph: COLOR_NEUTRAL,
    surface: COLOR_SURFACE_WASH,
    surfaceOpacity: 0.1,
    ring: COLOR_RING_DARK,
    ringOpacity: 1,
  },
  unknown: {
    glyph: COLOR_UNKNOWN,
    surface: COLOR_SURFACE_WASH,
    surfaceOpacity: 0.1,
    ring: COLOR_RING_DARK,
    ringOpacity: 1,
  },
};

const STATE_MATRIX: Record<InteractionState, (p: AffiliationPalette) => MarkerStyle> = {
  default: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowColor: p.glyph,
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
    innerGlowColor: p.glyph,
    innerGlowOpacity: 0.4,
    ringColor: COLOR_RING_HOVER,
    ringWidth: 2,
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
    innerGlowColor: p.glyph,
    innerGlowOpacity: 0.4,
    ringColor: COLOR_RING_HOVER,
    ringWidth: 2,
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
    innerGlowColor: p.glyph,
    innerGlowOpacity: 0.4,
    ringColor: COLOR_RING_HOVER,
    ringWidth: 2,
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
    innerGlowColor: COLOR_DISABLED,
    innerGlowOpacity: 0,
    ringColor: COLOR_DISABLED,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: COLOR_DISABLED,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  expired: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: Math.max(p.surfaceOpacity - 0.05, 0),
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowColor: COLOR_EXPIRED_GLYPH,
    innerGlowOpacity: 0,
    ringColor: COLOR_EXPIRED_RING,
    ringWidth: 1,
    ringOpacity: 0.4,
    ringDash: 'dashed',
    ringPulse: false,
    glyphColor: COLOR_EXPIRED_GLYPH,
    glyphOpacity: 0.4,
    markerScale: 1,
  }),
  alert: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowColor: COLOR_SURFACE_WASH,
    innerGlowOpacity: 0,
    ringColor: COLOR_HOSTILE,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: COLOR_SURFACE_WASH,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  jammer: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowColor: COLOR_NEUTRAL,
    innerGlowOpacity: 0,
    ringColor: COLOR_NEUTRAL,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: COLOR_NEUTRAL,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  weaponPointing: () => ({
    surfaceFill: COLOR_SURFACE_WASH,
    surfaceOpacity: 0.1,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowColor: COLOR_WEAPON_POINTING,
    innerGlowOpacity: 0.4,
    ringColor: COLOR_WEAPON_POINTING,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: COLOR_WEAPON_POINTING,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  weaponLocked: () => ({
    surfaceFill: COLOR_SURFACE_WASH,
    surfaceOpacity: 0.1,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowColor: COLOR_WEAPON_LOCKED,
    innerGlowOpacity: 0.4,
    ringColor: COLOR_WEAPON_LOCKED,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: COLOR_WEAPON_LOCKED,
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

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function headingToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_DIRECTIONS[index];
}
