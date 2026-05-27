/**
 * Hover outline + floating tag for picker mode. Pointer-events: none so
 * the overlay never intercepts the gesture; positioning is `fixed` so it
 * coexists with any portal stacking the app uses.
 *
 * One transient accent only: a white marquee with a dark inner ring for
 * contrast on both light (map controls, styleguide) and dark (devices)
 * app surfaces. No cyan / blue / red — the app's tactical-red brand is
 * the only real accent in the system.
 */

import { type CSSProperties } from 'react';
import type { HoverTarget } from './useInspector';
import {
  INSPECTOR_BORDER,
  INSPECTOR_OVERLAY,
  INSPECTOR_RADIUS,
  INSPECTOR_SEMANTIC,
  INSPECTOR_SHADOW,
  INSPECTOR_SURFACE,
  INSPECTOR_TEXT,
} from './theme';

interface InspectorOverlayProps {
  hover: HoverTarget | null;
  /** Already-rendered pin's rect, drawn at lower contrast under the hover. */
  pinRect?: { x: number; y: number; width: number; height: number } | null;
}

const OVERLAY_Z = 2147482000;
const TAG_Z = 2147482500;
const TABULAR: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

const baseBox: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  borderRadius: 2,
  transition: 'transform 16ms linear, width 16ms linear, height 16ms linear',
};

export function InspectorOverlay({ hover, pinRect }: InspectorOverlayProps) {
  return (
    <div data-handoff-inspector="true" aria-hidden>
      {pinRect && (
        <div
          style={{
            ...baseBox,
            left: 0,
            top: 0,
            width: pinRect.width,
            height: pinRect.height,
            transform: `translate3d(${pinRect.x}px, ${pinRect.y}px, 0)`,
            outline: `1px dashed ${INSPECTOR_OVERLAY.pinOutline}`,
            outlineOffset: 0,
            background: INSPECTOR_OVERLAY.pinFill,
            zIndex: OVERLAY_Z,
          }}
        />
      )}
      {hover && (
        <>
          <div
            style={{
              ...baseBox,
              left: 0,
              top: 0,
              width: hover.rect.width,
              height: hover.rect.height,
              transform: `translate3d(${hover.rect.x}px, ${hover.rect.y}px, 0)`,
              outline: `1px solid ${INSPECTOR_OVERLAY.hoverOutline}`,
              outlineOffset: 0,
              background: INSPECTOR_OVERLAY.hoverFill,
              boxShadow: INSPECTOR_OVERLAY.hoverContrast,
              zIndex: OVERLAY_Z + 1,
            }}
          />
          <HoverTag hover={hover} />
        </>
      )}
    </div>
  );
}

function HoverTag({ hover }: { hover: HoverTarget }) {
  const el = hover.element;
  const tag = el.tagName.toLowerCase();
  const slot = (el as HTMLElement).dataset?.slot;
  const classCount = el.classList.length;
  const w = Math.round(hover.rect.width);
  const h = Math.round(hover.rect.height);

  // Pin the tag to just below-or-above the target so it doesn't clip.
  const labelTop = hover.rect.y + hover.rect.height + 6;
  const labelBelow = labelTop + 22 < window.innerHeight;
  const top = labelBelow ? labelTop : Math.max(0, hover.rect.y - 22);
  const left = Math.max(8, Math.min(hover.rect.x, window.innerWidth - 280));

  return (
    <div
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: TAG_Z,
        pointerEvents: 'none',
        background: INSPECTOR_SURFACE.glyph,
        color: INSPECTOR_TEXT.primary,
        border: `1px solid ${INSPECTOR_BORDER.subtle}`,
        borderRadius: INSPECTOR_RADIUS.control,
        padding: '3px 8px',
        font: '500 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
        whiteSpace: 'nowrap',
        boxShadow: INSPECTOR_SHADOW.dock,
        direction: 'ltr',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      dir="ltr"
    >
      <span style={{ color: INSPECTOR_TEXT.primary }}>{tag}</span>
      {slot && (
        <>
          <span style={dotStyle}>·</span>
          <span style={{ color: INSPECTOR_TEXT.muted }}>{slot}</span>
        </>
      )}
      <span style={dotStyle}>·</span>
      <span style={{ color: INSPECTOR_TEXT.primary, ...TABULAR }}>{w}×{h}</span>
      <span style={dotStyle}>·</span>
      <span style={{ color: INSPECTOR_TEXT.muted, ...TABULAR }}>{classCount} cls</span>
      {hover.stackSize > 1 && (
        <>
          <span style={dotStyle}>·</span>
          <span style={{ color: INSPECTOR_SEMANTIC.warn.fg, ...TABULAR }}>
            {hover.depth + 1} of {hover.stackSize}
          </span>
        </>
      )}
    </div>
  );
}

const dotStyle: CSSProperties = {
  color: INSPECTOR_TEXT.faint,
  margin: '0 6px',
};
