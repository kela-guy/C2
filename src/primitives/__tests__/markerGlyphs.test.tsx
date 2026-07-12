/**
 * Routing table tests for `resolveThreatGlyph` — asserts which glyph
 * component each target state resolves to (element identity, no rendering).
 */
import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';
import { resolveThreatGlyph, droneRotationFromHeading } from '../markerGlyphs';
import { CarIcon, TankIcon, TruckIcon, UnknownIcon, DroneIcon, MissileIcon } from '../MapIcons';
import { UNKNOWN_GRAY } from '../urgency';
import { MARKER_HEX } from '../accentHex';

const RED = MARKER_HEX.hostile;

function glyphType(state: Parameters<typeof resolveThreatGlyph>[0]) {
  const el = resolveThreatGlyph(state, RED);
  if (!isValidElement(el)) throw new Error('expected a React element');
  return el.type;
}

describe('resolveThreatGlyph', () => {
  it('renders the gray question mark for an unclassified raw blip', () => {
    const el = resolveThreatGlyph({ entityStage: 'raw_detection' }, RED);
    if (!isValidElement<{ color?: string }>(el)) throw new Error('expected a React element');
    expect(el.type).toBe(UnknownIcon);
    expect(el.props.color).toBe(UNKNOWN_GRAY);
  });

  it('routes classifiedType authoritatively', () => {
    expect(glyphType({ classifiedType: 'car' })).toBe(CarIcon);
    expect(glyphType({ classifiedType: 'tank' })).toBe(TankIcon);
    expect(glyphType({ classifiedType: 'truck' })).toBe(TruckIcon);
    expect(glyphType({ classifiedType: 'drone' })).toBe(DroneIcon);
    expect(glyphType({ classifiedType: 'aircraft' })).toBe(DroneIcon);
    // No bird glyph exists — falls back to the drone silhouette.
    expect(glyphType({ classifiedType: 'bird' })).toBe(DroneIcon);
  });

  it('falls back to the raw sensor type when unclassified', () => {
    expect(glyphType({ classifiedType: 'unknown', type: 'ground_vehicle' })).toBe(CarIcon);
    expect(glyphType({ classifiedType: 'unknown', type: 'missile' })).toBe(MissileIcon);
    expect(glyphType({ classifiedType: 'unknown', type: 'uav' })).toBe(DroneIcon);
    expect(glyphType({ classifiedType: 'unknown' })).toBe(DroneIcon);
  });

  it('rotates the drone nose to match the heading', () => {
    const el = resolveThreatGlyph({ classifiedType: 'drone' }, RED, { headingDeg: 90 });
    if (!isValidElement<{ rotationDeg?: number }>(el)) throw new Error('expected a React element');
    // Compass 90° (east) = SVG rotation 0 (nose drawn pointing east).
    expect(el.props.rotationDeg).toBe(0);
  });
});

describe('droneRotationFromHeading', () => {
  it('offsets compass headings by -90° and defaults null to north', () => {
    expect(droneRotationFromHeading(90)).toBe(0);
    expect(droneRotationFromHeading(0)).toBe(-90);
    expect(droneRotationFromHeading(null)).toBe(-90);
    expect(droneRotationFromHeading(undefined)).toBe(-90);
  });
});
