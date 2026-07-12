/**
 * markerLayerClasses is the copy-paste artifact of the styleguide's Layer
 * Anatomy handoff section — these tests pin the generated Tailwind strings
 * to the same math MapMarker paints with inline styles.
 */
import { describe, expect, it } from 'vitest';
import { markerLayerClasses } from '../markerTailwind';
import { resolveMarkerStyle } from '../markerStyles';
import { MARKER_HEX } from '../accentHex';

describe('markerLayerClasses', () => {
  it('generates the surface layer recipe (fill, blur, geometry)', () => {
    const classes = markerLayerClasses(resolveMarkerStyle('default', 'hostile'), {
      surfaceSize: 42,
    });
    expect(classes.surface).toContain('size-[42px]');
    expect(classes.surface).toContain('rounded-full');
    expect(classes.surface).toContain('bg-[rgba(255,255,255,0.1)]');
    expect(classes.surface).toContain('backdrop-blur-[1px]');
    expect(classes.surface).toContain('absolute left-1/2 top-1/2');
  });

  it('generates the ring layer from ring width / dash / color / opacity', () => {
    const hostile = markerLayerClasses(resolveMarkerStyle('default', 'hostile'));
    // MARKER_HEX.hostile at full opacity.
    expect(hostile.ring).toContain('border-[2px]');
    expect(hostile.ring).toContain('border-solid');
    expect(hostile.ring).toContain('border-[rgba(252,69,64,1)]');
    expect(hostile.ring).not.toContain('animate-pulse');

    const expired = markerLayerClasses(resolveMarkerStyle('expired', 'hostile'));
    expect(expired.ring).toContain('border-dashed');
    expect(expired.ring).toContain('border-[1px]');
  });

  it('returns an empty string for layers the style disables', () => {
    const noRing = markerLayerClasses(
      resolveMarkerStyle('default', 'unknown', { ringWidth: 0 }),
    );
    expect(noRing.ring).toBe('');

    const noGlow = markerLayerClasses(resolveMarkerStyle('default', 'friendly'));
    expect(noGlow.innerGlow).toBe('');
  });

  it('emits the inner glow only for glow-lit interaction states', () => {
    const hovered = markerLayerClasses(resolveMarkerStyle('hovered', 'hostile'), {
      surfaceSize: 36,
      ringSize: 28,
    });
    expect(hovered.innerGlow).toContain('rounded-full');
    // ringSize 28 × 0.6 ≈ 17px.
    expect(hovered.innerGlow).toContain('size-[17px]');
    expect(hovered.innerGlow).toContain('bg-[rgba(252,69,64,0.4)]');
  });

  it('paints the glyph layer via text color', () => {
    const classes = markerLayerClasses(resolveMarkerStyle('default', 'hostile'));
    expect(classes.glyph).toContain(`text-[${MARKER_HEX.hostile}]`);
    // Full-opacity glyphs skip the redundant opacity utility.
    expect(classes.glyph).not.toContain('opacity-[');

    const expired = markerLayerClasses(resolveMarkerStyle('expired', 'hostile'));
    expect(expired.glyph).toContain('opacity-[0.4]');
  });

  it('handles the diamond affiliation shape (rotation + scale + radius)', () => {
    const classes = markerLayerClasses(
      resolveMarkerStyle('default', 'hostile', { ringShape: 'diamond' }),
      { surfaceSize: 42 },
    );
    expect(classes.surface).toContain('rotate-45');
    expect(classes.surface).toContain('rounded-[15%]');
    // 42 × 0.82 ≈ 34px.
    expect(classes.surface).toContain('size-[34px]');
  });

  it('defaults ringSize to surfaceSize', () => {
    const classes = markerLayerClasses(resolveMarkerStyle('default', 'hostile'), {
      surfaceSize: 36,
    });
    expect(classes.ring).toContain('size-[36px]');
  });
});
