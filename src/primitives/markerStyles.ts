import {
  resolveTargetSeverity,
  isUnclassifiedUnknown,
  UNKNOWN_GRAY,
  SEVERITY_COLOR,
  SEVERITY_PULSE,
  type TargetStateInput,
} from './urgency';
import { MARKER_HEX } from './accentHex';

export type Affiliation = 'friendly' | 'hostile' | 'possibleThreat' | 'neutral' | 'unknown';

// The full interaction set the production Cesium path drives. (Legacy
// Mapbox-era states — `alert`, `weaponPointing`, `weaponLocked` — were
// removed with the marker handoff cleanup; weapon urgency now lives in the
// severity model, see `resolveTargetSeverity`.)
export type InteractionState =
  | 'default'
  | 'hovered'
  | 'selected'
  | 'active'
  | 'disabled'
  | 'expired'
  | 'jammer';

export const INTERACTION_STATES: InteractionState[] = [
  'default',
  'hovered',
  'selected',
  'active',
  'disabled',
  'expired',
  'jammer',
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
  jammer: 'Jammer',
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
  /**
   * Ring silhouette. `circle` (default) is the friendly/neutral look;
   * `diamond` is the hostile frame — a sharp-cornered rotated square
   * (MIL-STD-2525-inspired) applied to the ring only, so hostile
   * detections read by geometry before color. Optional so existing style
   * literals stay valid.
   */
  ringShape?: 'circle' | 'diamond';
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
    // The hostile read is glyph red + diamond geometry + constant marker
    // halo; the ring itself stays the standard black resting ring.
    ring: MARKER_HEX.ringResting,
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
};

export function resolveMarkerStyle(
  state: InteractionState = 'default',
  affiliation: Affiliation = 'friendly',
  overrides?: Partial<MarkerStyle>,
): MarkerStyle {
  const palette = AFFILIATION_PALETTES[affiliation];
  const base = STATE_MATRIX[state](palette);
  // Hostile affiliation carries its identity everywhere: a standard black
  // diamond ring + red glyph. The constant hostile pulse is MapMarker's
  // expanding halo (`pulse` prop), driven by call sites rather than the ring.
  if (affiliation === 'hostile') {
    base.ringShape = 'diamond';
  }
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
 * Interaction subset that applies to a target marker. The `jammer`
 * tactical state is deliberately omitted — a target's "tactical urgency"
 * lives in its severity, not in the marker's interaction state.
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
export function targetAffiliation(target: TargetStateInput): Affiliation {
  if (target.classifiedType === 'bird') return 'unknown';
  if (target.affiliation) return target.affiliation;
  if (target.entityStage === 'classified') return 'hostile';
  if (target.status === 'detection' || target.status === 'event') return 'hostile';
  return 'possibleThreat';
}

/**
 * Resolve a marker style for a target state under the unified urgency
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
  target: TargetStateInput,
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

  // Hostile is a fixed identity read: red glyph + BLACK diamond ring
  // (shape applied to the ring only — see MapMarker). Its constant motion
  // comes from MapMarker's halo (`pulse` prop), never from the ring.
  // Severity still drives ring weight, but never the hostile hue — a
  // MEDIUM hostile no longer reads orange.
  const hostile = affiliation === 'hostile';
  const accent = hostile ? MARKER_HEX.hostile : SEVERITY_COLOR[severity];

  return {
    ...base,
    ringColor: hostile ? MARKER_HEX.ringResting : SEVERITY_COLOR[severity],
    ringShape: hostile ? 'diamond' : 'circle',
    ringPulse: hostile ? false : SEVERITY_PULSE[severity],
    ringOpacity: 1,
    // CRITICAL gets a slightly heavier ring — visual parallel of the
    // card's higher icon-surface opacity at the same tier.
    ringWidth: severity === 'CRITICAL' ? 3 : 2,
    // Glyph + inner glow ride the same accent so the marker reads as one
    // tier, not two. Keeps the underlying glow toggle from the interaction
    // state (only hovered/selected/active light it up).
    glyphColor: accent,
    innerGlowColor: accent,
  };
}

/**
 * Friendly-asset health — mirrors the devices panel's `DeviceHealth`
 * (`deviceHealth.ts`) so the map marker and the panel tile always tell the
 * same story about the same asset.
 *
 * Two states only: an asset is working (`ok`) or it isn't (`error`).
 * The *cause* (offline, malfunction, low battery, stale link…) is a reason
 * carried as text — tooltip, panel chip, errors dialog — never its own
 * color tier.
 */
export type AssetHealth = 'ok' | 'error';

export const ASSET_HEALTHS: AssetHealth[] = ['ok', 'error'];

export const ASSET_HEALTH_LABELS: Record<AssetHealth, string> = {
  ok: 'OK',
  error: 'Error',
};

/**
 * The error red the map ring speaks — same red the target severity system
 * uses in `urgency.ts`, so "something is wrong" is one hue everywhere.
 */
export const ASSET_HEALTH_ERROR_COLOR = MARKER_HEX.hostile;

/** Interaction subset a friendly asset marker actually drives today. */
export type AssetMarkerInteraction = 'default' | 'hovered' | 'selected' | 'active';

/**
 * Resolve a friendly-asset marker style under the 2-state health model.
 *
 * Health owns the resting ring: `error` paints it red; `ok` keeps the
 * standard black. Interaction wins the ring — hovered / selected / active
 * flip it white (the standard friendly cue) and the red returns on
 * mouse-out, while the glow emphasis rides the error hue so the tier stays
 * readable during interaction. The glyph stays white so identity never
 * shifts; the *cause* is text on the label/tooltip and the panel row.
 */
export function resolveAssetMarkerStyle(
  health: AssetHealth = 'ok',
  interaction: AssetMarkerInteraction = 'default',
): MarkerStyle {
  const base = resolveMarkerStyle(interaction, 'friendly');
  if (health === 'ok') return base;

  return {
    ...base,
    // Error recolors the resting ring only — interacted rings keep the
    // standard white flip from the interaction matrix.
    ringColor: interaction === 'default' ? ASSET_HEALTH_ERROR_COLOR : base.ringColor,
    // Glow emphasis (hover/selected) rides the error hue so the interacted
    // marker still says "this one needs attention".
    innerGlowColor: ASSET_HEALTH_ERROR_COLOR,
  };
}

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function headingToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_DIRECTIONS[index];
}
