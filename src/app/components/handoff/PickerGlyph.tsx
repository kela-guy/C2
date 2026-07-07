/**
 * Picker glyph — the inspector's entry-point button.
 *
 * Two visual variants:
 *   - `rail`     — 24x24 ghost button that fits inside the dashboard's
 *                  right-rail icon stack. Adopts the rail's existing
 *                  language (gray → cyan hover, focus ring, scale on
 *                  press) so it sits next to the other tools without
 *                  visual disruption.
 *   - `floating` — 34x34 docked reticle at the bottom-left. Used as a
 *                  fallback on routes that don't render the rail
 *                  (`/styleguide`, `/fov-test`, `/playground`). The
 *                  floating variant carries its own surface, border,
 *                  and shadow because it lands on top of arbitrary
 *                  content.
 *
 * The armed state ("picking" mode) brightens the icon and persists a
 * subtle inset glow so the affordance reads as clearly "on" while the
 * cursor is hunting for an element to capture.
 */

import { useState, type CSSProperties } from 'react';
import { cn } from '@/shared/components/ui/utils';
import type { InspectorMode } from './useInspector';
import {
  INSPECTOR_BORDER,
  INSPECTOR_RADIUS,
  INSPECTOR_SHADOW,
  INSPECTOR_SURFACE,
  INSPECTOR_TEXT,
  prefersReducedMotion,
} from './theme';

export type PickerGlyphVariant = 'rail' | 'floating';

interface PickerGlyphProps {
  mode: InspectorMode;
  onTogglePicker: () => void;
  variant: PickerGlyphVariant;
}

export function PickerGlyph({ mode, onTogglePicker, variant }: PickerGlyphProps) {
  const active = mode === 'picking';
  const title = active ? 'Exit handoff inspector (Esc)' : 'Pick element to hand off';

  if (variant === 'rail') {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        onClick={onTogglePicker}
        data-handoff-inspector="true"
        className={cn(
          'size-6 rounded flex items-center justify-center',
          'transition-[color,background-color,box-shadow] duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
          'active:scale-[0.97]',
          active
            ? 'text-white bg-cyan-500/15 shadow-[inset_0_0_0_1px_rgba(34,184,207,0.35)]'
            : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10',
        )}
      >
        <ReticleIcon size={16} />
      </button>
    );
  }

  return <FloatingGlyph active={active} title={title} onTogglePicker={onTogglePicker} />;
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

interface FloatingGlyphProps {
  active: boolean;
  title: string;
  onTogglePicker: () => void;
}

function FloatingGlyph({ active, title, onTogglePicker }: FloatingGlyphProps) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

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
  const color = active ? '#ffffff' : INSPECTOR_TEXT.primary;
  const scale = pressed && !prefersReducedMotion() ? 'scale(0.96)' : 'scale(1)';

  const style: CSSProperties = {
    position: 'fixed',
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
      <ReticleIcon size={18} />
    </button>
  );
}

function ReticleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
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
