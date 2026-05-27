/**
 * Floating picker glyph — the inspector's sole always-on UI.
 *
 * Renders a single 34x34 reticle button docked at the bottom-left of
 * the viewport. Idle and armed are the only visual states; the armed
 * state lifts the surface, border, icon colour, and shadow together
 * so it reads as clearly "on" from across the screen.
 *
 * Chrome palette comes from `theme.ts` — neutral `SURFACE` levels with
 * white overlay alphas, mirroring `PerfHud`'s look.
 */

import { useState, type CSSProperties } from 'react';
import type { InspectorMode } from './useInspector';
import {
  INSPECTOR_BORDER,
  INSPECTOR_RADIUS,
  INSPECTOR_SHADOW,
  INSPECTOR_SURFACE,
  INSPECTOR_TEXT,
  prefersReducedMotion,
} from './theme';

interface PickerGlyphProps {
  mode: InspectorMode;
  onTogglePicker: () => void;
}

const DOCK_Z = 2147483000;

/** Stacked `linear-gradient` of a single white at `alpha` — overlay on a base colour. */
function whiteWash(alpha: number): string {
  return `linear-gradient(0deg, rgba(255, 255, 255, ${alpha}), rgba(255, 255, 255, ${alpha}))`;
}

/** Soft 2px outer ring + stronger inset highlight when armed. */
const ACTIVE_SHADOW = [
  '0 0 0 1px rgba(255, 255, 255, 0.10) inset',
  '0 1px 0 rgba(255, 255, 255, 0.18) inset',
  '0 0 0 2px rgba(255, 255, 255, 0.10)',
  '0 6px 18px rgba(0, 0, 0, 0.45)',
].join(', ');

export function PickerGlyph({ mode, onTogglePicker }: PickerGlyphProps) {
  const active = mode === 'picking';
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const title = active ? 'Exit handoff inspector (Esc)' : 'Pick element to hand off';

  // Background: layer a white wash on top of the base surface so the
  // active state visibly brightens — bumps again on hover so re-hovering
  // an armed glyph still gives feedback.
  let background: string;
  if (active) {
    background = `${whiteWash(hover ? 0.16 : 0.12)}, ${INSPECTOR_SURFACE.activeBg}`;
  } else if (hover) {
    background = `${whiteWash(0.04)}, ${INSPECTOR_SURFACE.glyph}`;
  } else {
    background = INSPECTOR_SURFACE.glyph;
  }

  const border = active
    ? INSPECTOR_BORDER.strong
    : hover
      ? INSPECTOR_BORDER.default
      : INSPECTOR_BORDER.subtle;
  // Pure white icon when armed reads as fully "on"; idle stays at the
  // shared primary tone so the glyph doesn't shout when not engaged.
  const color = active ? '#ffffff' : INSPECTOR_TEXT.primary;
  const scale = pressed && !prefersReducedMotion() ? 'scale(0.96)' : 'scale(1)';

  const style: CSSProperties = {
    position: 'fixed',
    // Bottom-left slot keeps us clear of the dialkit dial (bottom-right).
    left: 16,
    bottom: 16,
    zIndex: DOCK_Z,
    appearance: 'none',
    cursor: 'pointer',
    width: 34,
    height: 34,
    borderRadius: INSPECTOR_RADIUS.dock,
    border: `1px solid ${border}`,
    background,
    color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: active ? ACTIVE_SHADOW : INSPECTOR_SHADOW.dock,
    transform: scale,
    transition:
      'background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 160ms ease, transform 80ms ease',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    direction: 'ltr',
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onTogglePicker}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      data-handoff-inspector="true"
      style={style}
    >
      <ReticleIcon />
    </button>
  );
}

function ReticleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx={12} cy={12} r={5} stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={12} cy={12} r={1.2} fill="currentColor" />
    </svg>
  );
}
