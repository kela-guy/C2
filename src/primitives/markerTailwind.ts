/**
 * markerTailwind — developer-handoff helper that expresses each MapMarker
 * layer as an equivalent Tailwind class string.
 *
 * `MapMarker` itself paints with inline styles (the values are computed at
 * runtime from a resolved {@link MarkerStyle}), which makes it hard for a
 * developer re-implementing a marker elsewhere to copy the recipe. This
 * module generates, for any resolved style, the Tailwind arbitrary-value
 * classes that reproduce each layer — the styleguide's Layer Anatomy section
 * renders them next to the live marker with a copy button.
 *
 * Pure string generation: no DOM, no React — unit-testable.
 */

import type { MarkerStyle } from './markerStyles';
import { hexToRgba } from './tokens';

export type MarkerLayerName = 'surface' | 'ring' | 'glyph' | 'innerGlow' | 'overlays';

/**
 * Layer metadata in styleguide order. `layer` matches the numbering the
 * `MapMarker.highlightLayer` prop understands (1=Surface, 2=Ring, 3=Glyph,
 * 4=Inner Glow, 5=Overlays), so a doc UI can drive both the live dimming
 * and the class list from one array.
 */
export const MARKER_LAYERS: Array<{
  layer: number;
  key: MarkerLayerName;
  title: string;
  description: string;
}> = [
  {
    layer: 1,
    key: 'surface',
    title: 'Surface',
    description: 'Frosted disc behind the glyph — affiliation surface fill at low opacity plus a subtle backdrop blur.',
  },
  {
    layer: 2,
    key: 'ring',
    title: 'Ring',
    description: 'The urgency channel — color, width, dash, and pulse all come from severity / health / interaction.',
  },
  {
    layer: 3,
    key: 'glyph',
    title: 'Glyph',
    description: 'Entity identity icon. Painted in style.glyphColor (severity hue for targets, white for friendly assets).',
  },
  {
    layer: 4,
    key: 'innerGlow',
    title: 'Inner Glow',
    description: 'Interaction emphasis — lights up on hover / selected / active, riding the same hue as the ring.',
  },
  {
    layer: 5,
    key: 'overlays',
    title: 'Overlays',
    description: 'Floating label, status chip, and corner badges — chrome pinned around the marker, not part of its body.',
  },
];

export interface MarkerLayerClassOptions {
  /** Surface diameter in px. Matches `MapMarkerProps.surfaceSize`. Default 42. */
  surfaceSize?: number;
  /** Ring diameter in px. Matches `MapMarkerProps.ringSize`. Defaults to `surfaceSize`. */
  ringSize?: number;
}

/** Trim trailing zeros so `0.40` renders as `0.4` and `1.00` as `1`. */
const num = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
};

const px = (n: number): string => `${Math.round(n)}px`;

/**
 * Generate the per-layer Tailwind class strings for a resolved marker style.
 *
 * Layers that the style disables (`ring` at `ringWidth: 0`, `innerGlow`
 * when off) return an empty string — mirrors `MapMarker`, which does not
 * mount those nodes at all.
 */
export function markerLayerClasses(
  style: MarkerStyle,
  options: MarkerLayerClassOptions = {},
): Record<MarkerLayerName, string> {
  const surfaceSize = options.surfaceSize ?? 42;
  const ringSize = options.ringSize ?? surfaceSize;

  // Affiliation-shape channel — same geometry math as MapMarker.
  const shape = style.ringShape ?? 'circle';
  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-[15%]';
  const shapeScale = shape === 'diamond' ? 0.82 : shape === 'square' ? 0.94 : 1;
  const center = 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';
  const rotate = shape === 'diamond' ? ' rotate-45' : '';

  const surface = [
    center + rotate,
    `size-[${px(surfaceSize * shapeScale)}]`,
    radiusClass,
    `bg-[${hexToRgba(style.surfaceFill, style.surfaceOpacity)}]`,
    style.surfaceBlur > 0 ? `backdrop-blur-[${px(style.surfaceBlur)}]` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const ring =
    style.ringWidth > 0
      ? [
          center + rotate,
          'pointer-events-none z-[1]',
          `size-[${px(ringSize * shapeScale)}]`,
          radiusClass,
          `border-[${px(style.ringWidth)}]`,
          style.ringDash === 'dashed' ? 'border-dashed' : 'border-solid',
          `border-[${hexToRgba(style.ringColor, style.ringOpacity)}]`,
          style.ringPulse ? 'animate-pulse' : null,
        ]
          .filter(Boolean)
          .join(' ')
      : '';

  const glyph = [
    'relative z-[3] flex items-center justify-center',
    `text-[${style.glyphColor}]`,
    style.glyphOpacity < 1 ? `opacity-[${num(style.glyphOpacity)}]` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const innerGlow = style.innerGlow
    ? [
        center,
        'pointer-events-none z-[2] rounded-full',
        `size-[${px(ringSize * 0.6)}]`,
        `bg-[${hexToRgba(style.innerGlowColor, style.innerGlowOpacity || 0.4)}]`,
      ].join(' ')
    : '';

  // Overlay chrome is state-independent — the label pill MapMarker floats
  // at the marker's top-right corner.
  const overlays =
    'absolute z-[7] whitespace-nowrap rounded bg-black/60 px-2 py-[3px] text-xs font-medium text-white backdrop-blur-[12px] shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.4)]';

  return { surface, ring, glyph, innerGlow, overlays };
}
