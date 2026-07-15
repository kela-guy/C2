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
    // MARKER_HEX.ringResting (#1e2124) at full opacity — the hostile read is
    // geometry + glyph red; the ring stays black and static. Constant hostile
    // motion comes from MapMarker's expanding halo.
    expect(hostile.ring).toContain('border-[2px]');
    expect(hostile.ring).toContain('border-solid');
    expect(hostile.ring).toContain('border-[rgba(30,33,36,1)]');
    expect(hostile.ring).not.toContain('animate-pulse');

    const expired = markerLayerClasses(resolveMarkerStyle('expired', 'hostile'));
    expect(expired.ring).toContain('border-dashed');
    expect(expired.ring).toContain('border-[1px]');
    // Lifecycle-final rings remain static too.
    expect(expired.ring).not.toContain('animate-pulse');
  });

  it('keeps the surface circular even when the ring is a diamond', () => {
    const classes = markerLayerClasses(resolveMarkerStyle('default', 'hostile'), {
      surfaceSize: 42,
    });
    expect(classes.surface).toContain('rounded-full');
    expect(classes.surface).toContain('size-[42px]');
    expect(classes.surface).not.toContain('rotate-45');
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

  it('renders the hostile diamond on the ring only (rotation + scale + sharp corners)', () => {
    // Hostile affiliation carries ringShape: 'diamond' by default.
    const classes = markerLayerClasses(resolveMarkerStyle('default', 'hostile'), {
      surfaceSize: 42,
    });
    expect(classes.ring).toContain('rotate-45');
    expect(classes.ring).toContain('rounded-none');
    // 42 × 0.82 ≈ 34px.
    expect(classes.ring).toContain('size-[34px]');
  });

  it('defaults ringSize to surfaceSize', () => {
    const classes = markerLayerClasses(resolveMarkerStyle('default', 'friendly'), {
      surfaceSize: 36,
    });
    expect(classes.ring).toContain('size-[36px]');
  });
});
