import type { Detection } from '@/imports/ListOfSystems';
import {
  resolveTargetSeverity,
  isUnclassifiedUnknown,
  UNKNOWN_GRAY,
  SEVERITY_COLOR,
  SEVERITY_PULSE,
} from './urgency';
import { MARKER_HEX } from './accentHex';

export type Affiliation = 'friendly' | 'hostile' | 'possibleThreat' | 'neutral' | 'unknown';

// NOTE: `alert`, `weaponPointing`, and `weaponLocked` are legacy states that
// were only exercised by the Mapbox `TacticalMap.tsx` renderer (deleted in
// cesium-parity Phase 9). The production Cesium
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
    glyph: MARKER_HEX.white,
    surface: MARKER_HEX.white,
    surfaceOpacity: 0.1,
    ring: MARKER_HEX.ringResting,
    ringOpacity: 1,
  },
  hostile: {
    glyph: MARKER_HEX.hostile,
    surface: MARKER_HEX.white,
    surfaceOpacity: 0.1,
    ring: MARKER_HEX.hostile,
    ringOpacity: 1,
  },
  possibleThreat: {
    glyph: MARKER_HEX.possibleThreat,
    surface: MARKER_HEX.white,
    surfaceOpacity: 0.1,
    ring: MARKER_HEX.possibleThreat,
    ringOpacity: 1,
  },
  neutral: {
    glyph: MARKER_HEX.friendly,
    surface: MARKER_HEX.white,
    surfaceOpacity: 0.1,
    ring: MARKER_HEX.ringResting,
    ringOpacity: 1,
  },
  unknown: {
    glyph: MARKER_HEX.unknownYellow,
    surface: MARKER_HEX.white,
    surfaceOpacity: 0.1,
    ring: MARKER_HEX.ringResting,
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
    ringColor: MARKER_HEX.white,
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
    ringColor: MARKER_HEX.white,
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
    ringColor: MARKER_HEX.white,
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
    innerGlowColor: MARKER_HEX.disabledGray,
    innerGlowOpacity: 0,
    ringColor: MARKER_HEX.disabledGray,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: MARKER_HEX.disabledGray,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  expired: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: Math.max(p.surfaceOpacity - 0.05, 0),
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowColor: MARKER_HEX.expiredGlyph,
    innerGlowOpacity: 0,
    ringColor: MARKER_HEX.expiredRing,
    ringWidth: 1,
    ringOpacity: 0.4,
    ringDash: 'dashed',
    ringPulse: false,
    glyphColor: MARKER_HEX.expiredGlyph,
    glyphOpacity: 0.4,
    markerScale: 1,
  }),
  alert: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowColor: MARKER_HEX.white,
    innerGlowOpacity: 0,
    ringColor: MARKER_HEX.hostile,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: MARKER_HEX.white,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  jammer: (p) => ({
    surfaceFill: p.surface,
    surfaceOpacity: p.surfaceOpacity,
    surfaceBlur: 1,
    innerGlow: false,
    innerGlowColor: MARKER_HEX.friendly,
    innerGlowOpacity: 0,
    ringColor: MARKER_HEX.friendly,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: MARKER_HEX.friendly,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  weaponPointing: () => ({
    surfaceFill: MARKER_HEX.white,
    surfaceOpacity: 0.1,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowColor: MARKER_HEX.weaponWarning,
    innerGlowOpacity: 0.4,
    ringColor: MARKER_HEX.weaponWarning,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: true,
    glyphColor: MARKER_HEX.weaponWarning,
    glyphOpacity: 1,
    markerScale: 1,
  }),
  weaponLocked: () => ({
    surfaceFill: MARKER_HEX.white,
    surfaceOpacity: 0.1,
    surfaceBlur: 1,
    innerGlow: true,
    innerGlowColor: MARKER_HEX.hostile,
    innerGlowOpacity: 0.4,
    ringColor: MARKER_HEX.hostile,
    ringWidth: 2,
    ringOpacity: 1,
    ringDash: 'solid',
    ringPulse: false,
    glyphColor: MARKER_HEX.hostile,
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

/**
 * Friendly-asset health — mirrors the devices panel's `DeviceHealth`
 * (`deviceHealth.ts`) so the map marker and the panel tile always tell the
 * same story about the same asset.
 */
export type AssetHealth = 'ok' | 'warning' | 'error' | 'offline';

export const ASSET_HEALTHS: AssetHealth[] = ['ok', 'warning', 'error', 'offline'];

export const ASSET_HEALTH_LABELS: Record<AssetHealth, string> = {
  ok: 'OK',
  warning: 'Warning',
  error: 'Error',
  offline: 'Offline',
};

/**
 * Ring color per health tier. `ok` keeps the friendly palette's black ring;
 * trouble tiers recolor the ring only — the glyph stays white so identity
 * never changes, only the urgency channel.
 *
 *   warning  → amber (same family as the panel's warning tile / amber-400 dot)
 *   error    → red (same red the target severity system speaks in `urgency.ts`)
 *   offline  → desaturated gray, dashed — "known-absent", not alarmist
 */
export const ASSET_HEALTH_RING_COLOR: Record<AssetHealth, string> = {
  ok: MARKER_HEX.ringResting,
  warning: MARKER_HEX.weaponWarning,
  error: MARKER_HEX.hostile,
  offline: MARKER_HEX.disabledGray,
};

/** Interaction subset a friendly asset marker actually drives today. */
export type AssetMarkerInteraction = 'default' | 'hovered' | 'selected' | 'active';

/**
 * Resolve a friendly-asset marker style under the health model. Health owns
 * the ring at rest; the glyph stays white. Interaction wins the ring:
 * hovered / selected / active flip it white (the standard friendly cue) and
 * the health color returns on mouse-out — the glow emphasis still rides the
 * health hue so the tier stays readable while interacted with.
 *
 * `offline` replaces the old all-gray `disabled` look: a dashed black ring
 * (standard interaction colors), gray glyph at full opacity, and a nearly
 * invisible surface — clearly absent without hiding what the asset is. (The
 * map pairs this with the wifi-off corner badge; see `MarkerOfflineBadge`.)
 */
export function resolveAssetMarkerStyle(
  health: AssetHealth = 'ok',
  interaction: AssetMarkerInteraction = 'default',
): MarkerStyle {
  // The base interaction matrix already speaks the interaction ring language
  // (black at rest, white while hovered/selected/active) — health only
  // recolors the resting ring.
  const base = resolveMarkerStyle(interaction, 'friendly');
  if (health === 'ok') return base;

  const ringColor = ASSET_HEALTH_RING_COLOR[health];
  const interacting = interaction !== 'default';

  if (health === 'offline') {
    return {
      ...base,
      // Ring speaks the standard interaction language (black at rest, white
      // while hovered/selected) — only the dash pattern and the gray glyph
      // mark the marker as offline.
      ringDash: 'dashed',
      ringPulse: false,
      surfaceOpacity: 0.04,
      innerGlowColor: ringColor,
      glyphColor: ringColor,
    };
  }

  return {
    ...base,
    ringColor: interacting ? base.ringColor : ringColor,
    // Glow emphasis (hover/selected) rides the health hue so the marker keeps
    // reading as one tier while the ring itself flips white.
    innerGlowColor: ringColor,
    glyphColor: MARKER_HEX.white,
  };
}

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function headingToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_DIRECTIONS[index];
}
