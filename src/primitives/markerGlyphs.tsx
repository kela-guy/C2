/**
 * markerGlyphs — the single threat-glyph routing table for the marker system.
 *
 * Maps a backend-agnostic {@link TargetStateInput} to the SVG glyph rendered
 * inside a `MapMarker`. Extracted from `CesiumTacticalMap.tsx` (where it
 * lived as a private `buildThreatIcon`) so the production map, the flow
 * preview ghost, and the review surfaces all resolve the SAME icon for the
 * same state — adding a new `classifiedType` means editing exactly one file.
 *
 * Resolution priority:
 *
 *   1. Unclassified raw blip (`isUnclassifiedUnknown`) — a bare sensor track
 *      has no identity yet, so it renders the gray question-mark glyph
 *      instead of guessing an entity.
 *   2. `classifiedType` — the operator's confirmed call. Authoritative
 *      whenever set (`car` → vehicle, `drone` / `aircraft` → drone, `bird`
 *      falls back to drone since there is no bird glyph).
 *   3. `type` — the raw sensor classification. `ground_vehicle` → car,
 *      `missile` → missile, everything else (uav / aircraft / naval /
 *      unknown / absent) falls back to drone.
 *
 * Rotating glyphs (drone / missile) are rendered at the heading-derived
 * angle so the nose aligns with motion. `CarIcon` / `TankIcon` / `TruckIcon`
 * are flat SVGs without a rotation prop — vehicles read fine without a
 * heading nose.
 */

import type { ReactNode } from 'react';
import {
  CarIcon,
  TankIcon,
  TruckIcon,
  UnknownIcon,
  DroneIcon,
  MissileIcon,
} from './MapIcons';
import { isUnclassifiedUnknown, UNKNOWN_GRAY, type TargetStateInput } from './urgency';

/**
 * Convert a compass heading (0 = north, clockwise) into the rotation the
 * drone/missile SVGs expect (0 = nose to the right / east).
 */
export const droneRotationFromHeading = (headingDeg: number | null | undefined): number =>
  (headingDeg ?? 0) - 90;

export interface ThreatGlyphOptions {
  /** Compass heading (deg). Rotates the drone/missile nose to match motion. */
  headingDeg?: number | null;
  /** Glyph size in px. Falls back to each icon's own default when omitted. */
  size?: number;
}

/** Resolve the marker glyph for a threat target state. */
export function resolveThreatGlyph(
  state: TargetStateInput,
  glyphColor: string,
  options: ThreatGlyphOptions = {},
): ReactNode {
  const { headingDeg, size } = options;
  const rotationDeg = headingDeg != null ? droneRotationFromHeading(headingDeg) : 0;

  if (isUnclassifiedUnknown(state)) {
    return <UnknownIcon color={UNKNOWN_GRAY} size={size} />;
  }

  const classified = state.classifiedType;
  if (classified === 'car') return <CarIcon color={glyphColor} size={size} />;
  if (classified === 'tank') return <TankIcon color={glyphColor} size={size} />;
  if (classified === 'truck') return <TruckIcon color={glyphColor} size={size} />;
  if (classified === 'drone' || classified === 'aircraft' || classified === 'bird') {
    return <DroneIcon color={glyphColor} rotationDeg={rotationDeg} size={size} />;
  }

  switch (state.type) {
    case 'ground_vehicle':
      return <CarIcon color={glyphColor} size={size} />;
    case 'missile':
      return <MissileIcon fill={glyphColor} rotationDeg={rotationDeg} />;
    default:
      return <DroneIcon color={glyphColor} rotationDeg={rotationDeg} size={size} />;
  }
}
