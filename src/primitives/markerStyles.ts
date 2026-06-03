import type { Detection } from '@/imports/ListOfSystems';
import {
  resolveTargetSeverity,
  isUnclassifiedUnknown,
  UNKNOWN_GRAY,
  SEVERITY_COLOR,
  SEVERITY_PULSE,
} from './urgency';

export type Affiliation = 'friendly' | 'hostile' | 'possibleThreat' | 'neutral' | 'unknown';

// NOTE: `alert`, `weaponPointing`, and `weaponLocked` are legacy states only
// exercised by the Mapbox `TacticalMap.tsx` renderer. The production Cesium
// path (`CesiumTacticalMap.tsx`) does not drive them today — it uses
// `default | hovered | selected | active | disabled | expired | jammer`. They
// remain in the matrix so the styleguide can document the full design intent.
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
    glyph: '#ffffff',
    surface: '#ffffff',
    surfaceOpacity: 0.1,
    ring: '#222222',
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
    ring: '#222222',
    ringOpacity: 1,
  },
  unknown: {
    glyph: '#facc15',
    surface: '#ffffff',
    surfaceOpacity: 0.1,
    ring: '#222222',
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
    ringColor: '#ffffff',
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
    ringColor: '#ffffff',
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
    ringColor: '#ffffff',
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
    innerGlowColor: '#8c8c8c',
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
    innerGlowColor: '#52525b',
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
    innerGlowColor: '#ffffff',
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
    innerGlowColor: '#4ade80',
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
  weaponPointing: () => ({
    surfaceFill: '#ffffff',
    surfaceOpacity: 0.1,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowColor: '#f59e0b',
    innerGlowOpacity: 0.4,
    ringColor: '#f59e0b',
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: '#f59e0b',
    glyphOpacity: 1,
    markerScale: 1,
  }),
  weaponLocked: () => ({
    surfaceFill: '#ffffff',
    surfaceOpacity: 0.1,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowColor: '#ef4444',
    innerGlowOpacity: 0.4,
    ringColor: '#ef4444',
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: '#ef4444',
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

/**
 * Interaction subset that applies to a target marker. Tactical states
 * like `alert` / `jammer` / `weaponPointing` are deliberately omitted —
 * a target's "tactical urgency" now lives in its severity, not in the
 * marker's interaction state.
 */
export type TargetMarkerInteraction =
  | 'default'
  | 'hovered'
  | 'selected'
  | 'active'
  | 'disabled'
  | 'expired';

/**
 * Affiliation chooser for a target marker. Identity (the glyph fill)
 * derives from the target's classification + IFF, not from urgency.
 * This mirrors the existing TacticalMap fallback logic so the visual
 * stays the same for callers that haven't migrated to richer IFF data.
 */
function targetAffiliation(target: Detection): Affiliation {
  if (target.classifiedType === 'bird') return 'unknown';
  if (target.affiliation) return target.affiliation;
  if (target.entityStage === 'classified') return 'hostile';
  if (target.status === 'detection' || target.status === 'event') return 'hostile';
  return 'possibleThreat';
}

/**
 * Resolve a marker style for a Detection under the unified urgency
 * model. The marker speaks ONE urgency color — ring and glyph both
 * carry the same hue, so the operator never has to translate between
 * a "ring red" and a "glyph red" that mean different things.
 *
 *   - **Severity** (`resolveTargetSeverity`) drives the urgency channel:
 *     ring color, ring pulse, ring opacity, ring width, **glyph color**,
 *     inner-glow color. Same source the card spine reads from.
 *   - **Interaction** (`hovered` / `selected` / `active`) drives the
 *     inner-glow opacity + surface emphasis. Never overrides color.
 *   - **Affiliation** is still resolved (so the underlying state matrix
 *     picks the right surface palette), but no longer colors the glyph
 *     — identity will surface through a separate channel in a later phase.
 *
 * Lifecycle finality (`expired` / `disabled`) wins over everything —
 * the marker desaturates to gray and reads "no longer engaged"
 * regardless of upstream signals.
 */
export function resolveTargetMarkerStyle(
  target: Detection,
  interaction: TargetMarkerInteraction = 'default',
): MarkerStyle {
  const affiliation = targetAffiliation(target);

  if (interaction === 'expired' || interaction === 'disabled') {
    return resolveMarkerStyle(interaction, affiliation);
  }

  // Unclassified raw blip — render as a plain gray dot: gray glyph, no
  // ring, no pulse. It carries no urgency color until a camera classifies
  // it (see `isUnclassifiedUnknown`). Interaction glow still applies via
  // the base style so hover/select feedback survives.
  if (isUnclassifiedUnknown(target)) {
    const base = resolveMarkerStyle(interaction, 'unknown');
    return {
      ...base,
      ringColor: UNKNOWN_GRAY,
      ringWidth: 0,
      ringOpacity: 0,
      ringPulse: false,
      glyphColor: UNKNOWN_GRAY,
      innerGlowColor: UNKNOWN_GRAY,
    };
  }

  const severity = resolveTargetSeverity(target);
  const base = resolveMarkerStyle(interaction, affiliation);
  const severityColor = SEVERITY_COLOR[severity];

  return {
    ...base,
    ringColor: severityColor,
    ringPulse: SEVERITY_PULSE[severity],
    ringOpacity: 1,
    // CRITICAL gets a slightly heavier ring — visual parallel of the
    // card's higher icon-surface opacity at the same tier.
    ringWidth: severity === 'CRITICAL' ? 3 : 2,
    // Glyph + inner glow ride the same severity color as the ring so
    // the marker reads as one tier, not two. Keeps the underlying glow
    // toggle from the interaction state (only hovered/selected/active
    // light it up); severity only picks the *color* that gets glowed.
    glyphColor: severityColor,
    innerGlowColor: severityColor,
  };
}

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function headingToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_DIRECTIONS[index];
}
