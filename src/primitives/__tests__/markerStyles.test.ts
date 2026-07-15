/**
 * Locks the marker style resolvers: the interaction-state matrix, the
 * severity-driven target overrides, and the health-driven asset overrides.
 * These are the handoff contract — a developer wiring a new backend should
 * be able to rely on every assertion here.
 */
import { describe, expect, it } from 'vitest';
import {
  resolveMarkerStyle,
  resolveTargetMarkerStyle,
  resolveAssetMarkerStyle,
  targetAffiliation,
  headingToCompass,
  AFFILIATION_PALETTES,
} from '../markerStyles';
import { MARKER_HEX } from '../accentHex';
import { UNKNOWN_GRAY, SEVERITY_COLOR } from '../urgency';

describe('resolveMarkerStyle', () => {
  it('resting friendly marker: near-black ring, white glyph', () => {
    const s = resolveMarkerStyle('default', 'friendly');
    expect(s.ringColor).toBe(MARKER_HEX.ringResting);
    expect(s.glyphColor).toBe(MARKER_HEX.white);
    expect(s.ringWidth).toBe(2);
    expect(s.ringDash).toBe('solid');
    expect(s.innerGlow).toBe(false);
  });

  it('resting hostile marker: black diamond ring, red glyph, static ring', () => {
    const s = resolveMarkerStyle('default', 'hostile');
    // The constant hostile pulse is the MapMarker halo (`pulse` prop), not
    // the standard black resting ring itself.
    expect(s.ringColor).toBe(MARKER_HEX.ringResting);
    expect(s.glyphColor).toBe(MARKER_HEX.hostile);
    expect(s.ringShape).toBe('diamond');
    expect(s.ringPulse).toBe(false);
  });

  it('non-hostile affiliations keep the circle ring', () => {
    expect(resolveMarkerStyle('default', 'friendly').ringShape).toBeUndefined();
    expect(resolveMarkerStyle('default', 'possibleThreat').ringShape).toBeUndefined();
  });

  it('hovered / selected / active flip the ring white and light the glow', () => {
    for (const state of ['hovered', 'selected', 'active'] as const) {
      const s = resolveMarkerStyle(state, 'hostile');
      expect(s.ringColor).toBe(MARKER_HEX.white);
      expect(s.innerGlow).toBe(true);
      expect(s.innerGlowColor).toBe(AFFILIATION_PALETTES.hostile.glyph);
    }
  });

  it('disabled desaturates every channel to the disabled gray', () => {
    const s = resolveMarkerStyle('disabled', 'hostile');
    expect(s.ringColor).toBe(MARKER_HEX.disabledGray);
    expect(s.glyphColor).toBe(MARKER_HEX.disabledGray);
  });

  it('expired reads as a receding dashed gray', () => {
    const s = resolveMarkerStyle('expired', 'hostile');
    expect(s.ringDash).toBe('dashed');
    expect(s.ringWidth).toBe(1);
    expect(s.ringOpacity).toBe(0.4);
    expect(s.glyphOpacity).toBe(0.4);
    expect(s.ringColor).toBe(MARKER_HEX.expiredRing);
  });

  it('applies overrides but ignores explicit undefined values', () => {
    const s = resolveMarkerStyle('default', 'friendly', {
      ringWidth: 5,
      ringColor: undefined,
    });
    expect(s.ringWidth).toBe(5);
    expect(s.ringColor).toBe(MARKER_HEX.ringResting);
  });
});

describe('targetAffiliation', () => {
  it('mirrors the legacy fallback chain', () => {
    expect(targetAffiliation({ classifiedType: 'bird' })).toBe('unknown');
    expect(targetAffiliation({ affiliation: 'neutral' })).toBe('neutral');
    expect(targetAffiliation({ entityStage: 'classified' })).toBe('hostile');
    expect(targetAffiliation({ status: 'detection' })).toBe('hostile');
    expect(targetAffiliation({ status: 'event' })).toBe('hostile');
    expect(targetAffiliation({})).toBe('possibleThreat');
  });
});

describe('resolveTargetMarkerStyle', () => {
  it('renders an unclassified raw blip as a ringless gray dot', () => {
    const s = resolveTargetMarkerStyle({ entityStage: 'raw_detection' });
    expect(s.ringWidth).toBe(0);
    expect(s.ringOpacity).toBe(0);
    expect(s.ringPulse).toBe(false);
    expect(s.glyphColor).toBe(UNKNOWN_GRAY);
    expect(s.innerGlowColor).toBe(UNKNOWN_GRAY);
  });

  it('speaks one severity color across ring, glyph, and glow (non-hostile)', () => {
    // mitigating (possibleThreat fallback) → CRITICAL: red, pulsing, heavier ring.
    const critical = resolveTargetMarkerStyle({ mitigationStatus: 'mitigating' });
    expect(critical.ringColor).toBe(SEVERITY_COLOR.CRITICAL);
    expect(critical.glyphColor).toBe(SEVERITY_COLOR.CRITICAL);
    expect(critical.innerGlowColor).toBe(SEVERITY_COLOR.CRITICAL);
    expect(critical.ringPulse).toBe(true);
    expect(critical.ringWidth).toBe(3);
  });

  it('hostile targets: black diamond ring and red glyph — whatever the severity', () => {
    // The hostile hue is pinned to red on the glyph; the ring stays the
    // standard black resting ring in a diamond. Constant hostile motion is
    // the MapMarker halo (`pulse` prop); severity drives ring weight only.
    const hostile = resolveTargetMarkerStyle({ status: 'detection', severity: 'MEDIUM' });
    expect(hostile.ringShape).toBe('diamond');
    expect(hostile.ringColor).toBe(MARKER_HEX.ringResting);
    expect(hostile.glyphColor).toBe(MARKER_HEX.hostile);
    expect(hostile.innerGlowColor).toBe(MARKER_HEX.hostile);
    expect(hostile.ringPulse).toBe(false);

    // A HIGH hostile ring stays static too; its call site supplies the halo.
    const high = resolveTargetMarkerStyle({ status: 'detection' });
    expect(high.ringPulse).toBe(false);
    expect(high.ringWidth).toBe(2);

    // Non-hostile affiliations keep circle + severity color, severity pulse.
    const possible = resolveTargetMarkerStyle({ affiliation: 'possibleThreat', severity: 'MEDIUM' });
    expect(possible.ringShape).toBe('circle');
    expect(possible.ringColor).toBe(SEVERITY_COLOR.MEDIUM);
    expect(possible.ringPulse).toBe(false);
  });

  it('keeps the severity ring color even while hovered (non-hostile)', () => {
    const s = resolveTargetMarkerStyle({ affiliation: 'possibleThreat', severity: 'HIGH' }, 'hovered');
    expect(s.ringColor).toBe(SEVERITY_COLOR.HIGH);
    expect(s.innerGlow).toBe(true);
  });

  it('lets lifecycle finality win over everything', () => {
    const s = resolveTargetMarkerStyle({ mitigationStatus: 'mitigating' }, 'expired');
    expect(s.ringDash).toBe('dashed');
    expect(s.ringColor).toBe(MARKER_HEX.expiredRing);
    expect(s.ringPulse).toBe(false);
  });
});

describe('resolveAssetMarkerStyle', () => {
  it('ok health is exactly the friendly interaction style', () => {
    expect(resolveAssetMarkerStyle('ok')).toEqual(resolveMarkerStyle('default', 'friendly'));
    expect(resolveAssetMarkerStyle('ok', 'hovered')).toEqual(resolveMarkerStyle('hovered', 'friendly'));
  });

  it('error paints the resting ring red; the glyph stays white', () => {
    const error = resolveAssetMarkerStyle('error');
    expect(error.ringColor).toBe(MARKER_HEX.hostile);
    expect(error.ringDash).toBe('solid');
    expect(error.glyphColor).toBe(MARKER_HEX.white);
    expect(error.ringPulse).toBe(false);
  });

  it('interaction wins the ring, glow rides the error hue', () => {
    const s = resolveAssetMarkerStyle('error', 'hovered');
    expect(s.ringColor).toBe(MARKER_HEX.white);
    expect(s.innerGlowColor).toBe(MARKER_HEX.hostile);
  });
});

describe('headingToCompass', () => {
  it('buckets headings into the 8 compass letters', () => {
    expect(headingToCompass(0)).toBe('N');
    expect(headingToCompass(45)).toBe('NE');
    expect(headingToCompass(90)).toBe('E');
    expect(headingToCompass(180)).toBe('S');
    expect(headingToCompass(270)).toBe('W');
    expect(headingToCompass(337.5)).toBe('N');
    expect(headingToCompass(-90)).toBe('W');
    expect(headingToCompass(720 + 44)).toBe('NE');
  });
});
