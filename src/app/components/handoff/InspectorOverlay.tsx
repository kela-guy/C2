/**
 * Hover outline + floating tag + chrome chips for picker mode.
 * Pointer-events: none so the overlay never intercepts the gesture;
 * positioning is `fixed` so it coexists with any portal stacking the
 * app uses.
 *
 * One transient accent only: a white marquee with a dark inner ring for
 * contrast on both light (map controls, styleguide) and dark (devices)
 * app surfaces. No cyan / blue / red — the app's tactical-red brand is
 * the only real accent in the system.
 *
 * Three ancestor-walk affordances live here:
 *   - When the developer is parked above the base leaf (`lift > 0`) or
 *     on a stamped component boundary, the tag grows a breadcrumb line
 *     reading leaf-first to the current pick.
 *   - When `Arrow Up` is refused by the boundary cap, the parent fires
 *     a one-shot `boundaryPulseKey` change; we run a brief WAAPI flash
 *     on the outline so the developer sees the bonk without an error
 *     dialog. Web Animations API over CSS keyframes keeps animation
 *     co-located with the component.
 *   - A bottom-center "shortcuts" chip spells out every gesture with
 *     real keycaps so the developer never has to guess what `↑` does.
 *
 * After a successful copy the parent surfaces an `InspectorToast` at
 * the top of the viewport so the confirmation reads as a system gesture
 * — separate from the popover's inline state.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { HoverTarget, InspectorNotice } from './useInspector';
import { prefersReducedMotion } from './theme';
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
  /**
   * Increments when the user tries to walk past the boundary cap. The
   * overlay watches the change-edge to fire a one-shot flash; the
   * absolute value is meaningless.
   */
  boundaryPulseKey?: number;
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

export function InspectorOverlay({ hover, pinRect, boundaryPulseKey = 0 }: InspectorOverlayProps) {
  const outlineRef = useRef<HTMLDivElement | null>(null);

  // Boundary refusal pulse. Skipping the very first render avoids
  // firing on mount; the change-edge of `boundaryPulseKey` is what
  // matters. The hold pattern (snap-in → 30% hold → ease-out) is
  // deliberate — a symmetric fade was too easy to miss in the previous
  // 160 ms version. WAAPI composes additively with the inline
  // `transform: translate3d(...)` that follows the cursor, so we can
  // animate outline + box-shadow without disturbing positioning.
  const lastPulseRef = useRef(boundaryPulseKey);
  useEffect(() => {
    if (boundaryPulseKey === lastPulseRef.current) return;
    lastPulseRef.current = boundaryPulseKey;
    const el = outlineRef.current;
    if (!el || prefersReducedMotion()) return;
    const restShadow = INSPECTOR_OVERLAY.hoverContrast;
    const pulseShadow = `${restShadow}, ${INSPECTOR_OVERLAY.boundaryGlow}`;
    const anim = el.animate(
      [
        {
          outlineColor: INSPECTOR_OVERLAY.hoverOutline,
          outlineWidth: '1px',
          outlineOffset: '0px',
          boxShadow: restShadow,
          offset: 0,
        },
        {
          outlineColor: INSPECTOR_OVERLAY.boundaryStroke,
          outlineWidth: '3px',
          outlineOffset: '1px',
          boxShadow: pulseShadow,
          offset: 0.15,
        },
        {
          outlineColor: INSPECTOR_OVERLAY.boundaryStroke,
          outlineWidth: '3px',
          outlineOffset: '1px',
          boxShadow: pulseShadow,
          offset: 0.45,
        },
        {
          outlineColor: INSPECTOR_OVERLAY.hoverOutline,
          outlineWidth: '1px',
          outlineOffset: '0px',
          boxShadow: restShadow,
          offset: 1,
        },
      ],
      { duration: 360, easing: 'ease-out' },
    );
    return () => anim.cancel();
  }, [boundaryPulseKey]);

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
            ref={outlineRef}
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
  const showCrumb = hover.lift > 0 || hover.atBoundary;

  // Pin the tag to just below-or-above the target so it doesn't clip.
  // The breadcrumb adds a second line — reserve a bit more vertical
  // room when flipping above so we don't clip into the target.
  const tagHeight = showCrumb ? 38 : 22;
  const labelTop = hover.rect.y + hover.rect.height + 6;
  const labelBelow = labelTop + tagHeight < window.innerHeight;
  const top = labelBelow ? labelTop : Math.max(0, hover.rect.y - tagHeight);
  const left = Math.max(8, Math.min(hover.rect.x, window.innerWidth - 280));

  return (
    <div
      className="text-xs"
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
        padding: showCrumb ? '3px 8px 4px' : '3px 8px',
        fontWeight: 500,
        lineHeight: 1.4,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        whiteSpace: 'nowrap',
        boxShadow: INSPECTOR_SHADOW.dock,
        direction: 'ltr',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      dir="ltr"
    >
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
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
      {showCrumb && <Breadcrumb chain={hover.chain} atBoundary={hover.atBoundary} />}
    </div>
  );
}

function Breadcrumb({ chain, atBoundary }: { chain: string[]; atBoundary: boolean }) {
  const last = chain.length - 1;
  return (
    <div
      className="text-xs"
      style={{
        marginTop: 2,
        fontWeight: 500,
        lineHeight: 1.3,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: INSPECTOR_TEXT.faint,
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
      }}
    >
      {chain.map((label, i) => {
        const isCurrent = i === last;
        return (
          <span key={`${i}-${label}`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
            {i > 0 && <span style={{ color: INSPECTOR_TEXT.faint }}>›</span>}
            <span
              style={{
                color: isCurrent ? INSPECTOR_TEXT.primary : INSPECTOR_TEXT.muted,
                fontWeight: isCurrent ? 600 : 500,
              }}
            >
              {isCurrent && atBoundary ? `‹${label}›` : label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

const dotStyle: CSSProperties = {
  color: INSPECTOR_TEXT.faint,
  margin: '0 6px',
};

/**
 * Floating shortcut bar that fades in when the picker arms. Inspired
 * by Paper Snapshot's quick-start bar — every gesture spelled out with
 * a real `<kbd>` keycap so newcomers never have to guess what `↑`
 * does. Stays mounted across mode transitions so the opacity fade is a
 * single CSS transition (no mount/unmount snap). `pointer-events: none`
 * keeps the click-through usable even when the chip overlaps the
 * cursor target.
 */
export function InspectorHintChip({ visible }: { visible: boolean }) {
  const isMac = useIsMac();
  const altLabel = isMac ? '⌥' : 'Alt';
  const shiftLabel = isMac ? '⇧' : 'Shift';
  return (
    <div
      data-handoff-inspector="true"
      aria-hidden
      dir="ltr"
      className="text-xs"
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: TAG_Z,
        pointerEvents: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: INSPECTOR_SURFACE.glyph,
        color: INSPECTOR_TEXT.primary,
        border: `1px solid ${INSPECTOR_BORDER.subtle}`,
        borderRadius: INSPECTOR_RADIUS.dock,
        padding: '6px 10px',
        fontWeight: 500,
        lineHeight: 1,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        whiteSpace: 'nowrap',
        boxShadow: INSPECTOR_SHADOW.dock,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 180ms ease-out',
      }}
    >
      <HintLabel>Click or</HintLabel>
      <Kbd>↵</Kbd>
      <HintLabel>to pick</HintLabel>
      <HintSeparator />
      <Kbd>↑</Kbd>
      <Kbd>↓</Kbd>
      <HintLabel>to fine-tune</HintLabel>
      <HintSeparator />
      <Kbd wide>{shiftLabel}</Kbd>
      <Kbd>↑</Kbd>
      <HintLabel>to cross boundary</HintLabel>
      <HintSeparator />
      <Kbd wide={!isMac}>{altLabel}</Kbd>
      <HintLabel>to cycle stack</HintLabel>
      <HintSeparator />
      <Kbd wide>Esc</Kbd>
      <HintLabel>to cancel</HintLabel>
    </div>
  );
}

/**
 * One-shot confirmation toast — top-center, fades in/out, auto-
 * dismisses ~2.2 s after each new notice id. Renders a green-tinted
 * check icon so the success state reads at a glance.
 *
 * The component keeps a local `active` notice so the body text stays
 * stable through the fade-out. Without it, switching to `null` would
 * blank the text mid-animation.
 */
export function InspectorToast({ notice }: { notice: InspectorNotice | null }) {
  const [active, setActive] = useState<InspectorNotice | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notice) return;
    setActive(notice);
    setVisible(true);
    const hideTimer = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(hideTimer);
  }, [notice?.id]);

  if (!active) return null;

  return (
    <div
      data-handoff-inspector="true"
      role="status"
      aria-live="polite"
      dir="ltr"
      className="text-xs"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, -6px)',
        zIndex: TAG_Z + 1,
        pointerEvents: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: INSPECTOR_SURFACE.glyph,
        color: INSPECTOR_TEXT.primary,
        border: `1px solid ${INSPECTOR_BORDER.subtle}`,
        borderRadius: INSPECTOR_RADIUS.dock,
        padding: '7px 12px 7px 10px',
        fontWeight: 500,
        lineHeight: 1,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        whiteSpace: 'nowrap',
        boxShadow: INSPECTOR_SHADOW.dock,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 180ms ease-out, transform 180ms ease-out',
      }}
    >
      <ToastCheckIcon />
      <span>{active.message}</span>
    </div>
  );
}

// ── Keycap primitives ────────────────────────────────────────────────

interface KbdProps {
  children: ReactNode;
  /** Auto-width keycap for word-length labels like `Shift` or `Esc`. */
  wide?: boolean;
}

const KBD_HEIGHT = 18;

function Kbd({ children, wide = false }: KbdProps) {
  return (
    <kbd
      className="text-xs"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: wide ? undefined : KBD_HEIGHT,
        height: KBD_HEIGHT,
        padding: wide ? '0 6px' : '0 4px',
        // The 1.5px bottom border (rounded down to 2) gives the keycap
        // its physical "key" feel without us actually shadowing.
        border: `1px solid ${INSPECTOR_BORDER.strong}`,
        borderBottomWidth: 2,
        borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.07)',
        color: INSPECTOR_TEXT.primary,
        fontWeight: 500,
        lineHeight: 1,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        flex: '0 0 auto',
      }}
    >
      {children}
    </kbd>
  );
}

function HintLabel({ children }: { children: ReactNode }) {
  return (
    <span style={{ color: INSPECTOR_TEXT.muted, marginInline: 2 }}>{children}</span>
  );
}

function HintSeparator() {
  return (
    <span style={{ color: INSPECTOR_TEXT.faint, marginInline: 4 }} aria-hidden>
      ·
    </span>
  );
}

function ToastCheckIcon() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: INSPECTOR_SEMANTIC.success.bg,
        color: INSPECTOR_SEMANTIC.success.fg,
        flex: '0 0 auto',
      }}
    >
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Memoised platform read — `navigator` is stable across re-renders. */
function useIsMac(): boolean {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const platform = (navigator.platform || navigator.userAgent || '').toLowerCase();
    return /mac|iphone|ipad|ipod/.test(platform);
  }, []);
}
