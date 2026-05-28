/**
 * Click-anchored quick action popover that pairs with each pin.
 *
 * Mounts the instant a pin commits, docks next to the click pointer
 * (not the pinned rect — a giant element like a nav would otherwise
 * push the popover far from the click), and offers the two highest-
 * value handoff actions:
 *  - `Copy classes` — primary, with success / failure confirmation
 *  - `Open in styleguide` — secondary, deep-links the matching section
 *
 * The persistent dashed outline around the pinned element supplies the
 * visual tie back to the source, so no caret is needed.
 *
 * Dismisses on Esc, outside click, route change, re-pick, or pin clear.
 *
 * Why not a Radix or shadcn `<Popover>`: this is dev chrome that must
 * coexist with arbitrary app portals (Cesium, map overlays, Radix popups)
 * at the very top of the z-stack and must NOT inherit the dashboard's
 * `dir` / theming. Owning the positioning + dismissal locally keeps the
 * inspector free of cross-stack quirks.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import type { CapturedElement } from './captureElement';
import type { PopoverAnchor } from './useInspector';
import { writeToClipboard } from './clipboard';
import { buildStyleguideLink } from './styleguideLink';
import {
  INSPECTOR_BORDER,
  INSPECTOR_RADIUS,
  INSPECTOR_SEMANTIC,
  INSPECTOR_SHADOW,
  INSPECTOR_SURFACE,
  INSPECTOR_TEXT,
  prefersReducedMotion,
} from './theme';

interface PickPopoverProps {
  pin: CapturedElement;
  anchorRect: PopoverAnchor;
  onClose: () => void;
  /**
   * Surface a system-level confirmation toast on successful copy.
   * The popover still flips its own button to a "copied" state — this
   * is the Paper-style global confirmation that reads at a glance from
   * anywhere on the page.
   */
  onCopied?: (message: string) => void;
}

const POPOVER_Z = 2147483050;
const POPOVER_WIDTH = 220;
const POPOVER_HEIGHT_ESTIMATE = 132;
const MARGIN = 8;
/** Offset between the pointer and the popover's nearest corner. */
const POINTER_OFFSET = 12;
const APPROVE_REVERT_MS = 1400;
const TABULAR: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

interface Placement {
  top: number;
  left: number;
}

type CopyState = 'idle' | 'ok' | 'err';

export function PickPopover({ pin, anchorRect, onClose, onCopied }: PickPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // First-frame placement is an estimate — the layout effect overwrites
  // it before paint once we can measure the real popover height.
  const [placement, setPlacement] = useState<Placement>(() =>
    computePlacement(anchorRect, POPOVER_HEIGHT_ESTIMATE),
  );
  const [ready, setReady] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const styleguide = useMemo(
    // The chain lets the link skip past inner primitives without a
    // styleguide section (e.g. `tooltip-trigger`) and land on the
    // nearest owning component (e.g. `target-card`).
    () => buildStyleguideLink(pin.componentHintChain),
    [pin.componentHintChain],
  );
  const reduceMotion = prefersReducedMotion();
  const title = pin.componentHint ?? pin.tag;
  const classCount = pin.classes.length;

  // Re-place against the live popover rect after mount + on resize.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      setPlacement(computePlacement(anchorRect, el.getBoundingClientRect().height));
      setReady(true);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [anchorRect.pointerX, anchorRect.pointerY]);

  // Auto-revert the approve / error state so a second copy is possible
  // without re-picking. The popover stays open through the revert.
  useEffect(() => {
    if (copyState === 'idle') return;
    const t = window.setTimeout(() => setCopyState('idle'), APPROVE_REVERT_MS);
    return () => window.clearTimeout(t);
  }, [copyState]);

  // Outside-click + Esc dismiss. Capture phase so we run before the
  // dashboard sees the gesture.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (!target || target.closest('[data-handoff-inspector="true"]')) return;
      onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  // Auto-focus Copy so Enter copies immediately. The `setTimeout`
  // defers past the picker effect's focus-restoration cleanup — without
  // it the picker would steal focus back on the same tick.
  useEffect(() => {
    const t = window.setTimeout(() => copyButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  const onCopy = useCallback(async () => {
    const ok = await writeToClipboard(pin.className);
    setCopyState(ok ? 'ok' : 'err');
    if (ok) onCopied?.('Copied to clipboard.');
  }, [pin.className, onCopied]);

  const onLink = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      // Let the native anchor open the new tab, then dismiss.
      e.stopPropagation();
      window.setTimeout(onClose, 0);
    },
    [onClose],
  );

  // Cycle Tab between the two controls only. Stops the dashboard from
  // grabbing focus while the popover is up.
  const onRootKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const active = document.activeElement;
    if (!e.shiftKey && active === linkRef.current) {
      e.preventDefault();
      copyButtonRef.current?.focus();
    } else if (e.shiftKey && active === copyButtonRef.current) {
      e.preventDefault();
      linkRef.current?.focus();
    }
  }, []);

  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: placement.top,
    left: placement.left,
    zIndex: POPOVER_Z,
    width: POPOVER_WIDTH,
    padding: 10,
    boxSizing: 'border-box',
    borderRadius: INSPECTOR_RADIUS.dock,
    border: `1px solid ${INSPECTOR_BORDER.subtle}`,
    background: INSPECTOR_SURFACE.glyph,
    boxShadow: INSPECTOR_SHADOW.dock,
    color: INSPECTOR_TEXT.primary,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    direction: 'ltr',
    fontWeight: 500,
    lineHeight: 1.3,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    // Hidden until measured + placed to avoid a one-frame jump.
    opacity: ready ? 1 : 0,
    transform: ready || reduceMotion ? 'translateY(0)' : 'translateY(4px)',
    transition: reduceMotion
      ? 'opacity 0ms linear'
      : 'opacity 140ms ease-out, transform 140ms ease-out',
  };

  return (
    <div
      ref={rootRef}
      data-handoff-inspector="true"
      role="dialog"
      aria-label="Element handoff"
      dir="ltr"
      className="text-xs"
      style={containerStyle}
      onKeyDown={onRootKeyDown}
    >
      <Header title={title} classCount={classCount} />
      <CopyButton
        ref={copyButtonRef}
        state={copyState}
        classCount={classCount}
        reduceMotion={reduceMotion}
        onClick={onCopy}
      />
      <StyleguideButton
        ref={linkRef}
        uri={styleguide.uri}
        section={styleguide.section}
        reduceMotion={reduceMotion}
        onClick={onLink}
      />
    </div>
  );
}

// ---------- Sub-components ----------

function Header({ title, classCount }: { title: string; classCount: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span
        className="text-xs"
        style={{
          color: INSPECTOR_TEXT.primary,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          flex: '1 1 auto',
        }}
      >
        {title}
      </span>
      <span className="text-xs" style={{ color: INSPECTOR_TEXT.faint }}>·</span>
      <span className="text-xs" style={{ color: INSPECTOR_TEXT.muted, flex: '0 0 auto', ...TABULAR }}>
        {classCount} cls
      </span>
    </div>
  );
}

interface CopyButtonProps {
  state: CopyState;
  classCount: number;
  reduceMotion: boolean;
  onClick: () => void;
}

const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  { state, classCount, reduceMotion, onClick },
  ref,
) {
  const { hover, pressed, hoverHandlers } = useHoverPress();

  const bg =
    state === 'ok'
      ? INSPECTOR_SEMANTIC.success.bg
      : state === 'err'
        ? INSPECTOR_SEMANTIC.error.bg
        : hover
          ? 'rgba(255, 255, 255, 0.14)'
          : 'rgba(255, 255, 255, 0.10)';
  const fg =
    state === 'ok'
      ? INSPECTOR_SEMANTIC.success.fg
      : state === 'err'
        ? INSPECTOR_SEMANTIC.error.fg
        : INSPECTOR_TEXT.primary;
  const border = state === 'idle' ? INSPECTOR_BORDER.strong : INSPECTOR_BORDER.subtle;
  const label =
    state === 'ok'
      ? `Copied · ${classCount} ${classCount === 1 ? 'class' : 'classes'}`
      : state === 'err'
        ? 'Failed — copy manually'
        : 'Copy classes';

  return (
    <button
      ref={ref}
      type="button"
      data-handoff-inspector="true"
      onClick={onClick}
      {...hoverHandlers}
      className="text-xs"
      style={{
        appearance: 'none',
        cursor: 'pointer',
        height: 32,
        padding: '0 10px',
        borderRadius: INSPECTOR_RADIUS.control,
        border: `1px solid ${border}`,
        background: bg,
        color: fg,
        fontWeight: 500,
        lineHeight: 1,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transform: pressed && !reduceMotion ? 'scale(0.96)' : 'scale(1)',
        transition: reduceMotion
          ? 'none'
          : 'background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 80ms ease',
      }}
    >
      <IconSlot state={state} reduceMotion={reduceMotion} />
      <span style={TABULAR}>{label}</span>
    </button>
  );
});

interface StyleguideButtonProps {
  uri: string;
  section: string | null;
  reduceMotion: boolean;
  onClick: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
}

const StyleguideButton = forwardRef<HTMLAnchorElement, StyleguideButtonProps>(
  function StyleguideButton({ uri, section, reduceMotion, onClick }, ref) {
    const { hover, pressed, hoverHandlers } = useHoverPress();
    return (
      <a
        ref={ref}
        href={uri}
        target="_blank"
        rel="noreferrer noopener"
        data-handoff-inspector="true"
        onClick={onClick}
        {...hoverHandlers}
        className="text-xs"
        style={{
          appearance: 'none',
          cursor: 'pointer',
          textDecoration: 'none',
          minHeight: 32,
          padding: '6px 10px',
          borderRadius: INSPECTOR_RADIUS.control,
          border: `1px solid ${INSPECTOR_BORDER.default}`,
          background: hover ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.06)',
          color: INSPECTOR_TEXT.primary,
          fontWeight: 500,
          lineHeight: 1.2,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 2,
          transform: pressed && !reduceMotion ? 'scale(0.96)' : 'scale(1)',
          transition: reduceMotion ? 'none' : 'background-color 120ms ease, transform 80ms ease',
        }}
      >
        <span style={{ color: INSPECTOR_TEXT.primary }}>
          {section ? 'Open in styleguide' : 'Browse styleguide'}
        </span>
        {section && (
          <span className="text-xs" style={{ color: INSPECTOR_TEXT.faint, ...TABULAR }}>
            → {section}
          </span>
        )}
      </a>
    );
  },
);

// ---------- Hooks ----------

/** Mouse hover + press state with handlers ready to spread onto an element. */
function useHoverPress() {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  return {
    hover,
    pressed,
    hoverHandlers: {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => {
        setHover(false);
        setPressed(false);
      },
      onMouseDown: () => setPressed(true),
      onMouseUp: () => setPressed(false),
    },
  };
}

// ---------- Icon slot ----------

const ICON_BY_STATE: Record<CopyState, () => ReactNode> = {
  idle: () => <CopyIcon />,
  ok: () => <CheckIcon />,
  err: () => <AlertIcon />,
};

const COPY_STATES: CopyState[] = ['idle', 'ok', 'err'];

function IconSlot({ state, reduceMotion }: { state: CopyState; reduceMotion: boolean }) {
  // Icon transitions use opacity + blur (per ui-craft) so the swap
  // reads as a "develop" rather than a pop.
  const transition = reduceMotion ? 'none' : 'opacity 220ms ease-out, filter 220ms ease-out';
  return (
    <span
      aria-hidden
      style={{ position: 'relative', width: 14, height: 14, display: 'inline-block', flex: '0 0 auto' }}
    >
      {COPY_STATES.map((s) => {
        const visible = state === s;
        return (
          <span
            key={s}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: visible ? 1 : 0,
              filter: visible ? 'blur(0)' : 'blur(4px)',
              transition,
            }}
          >
            {ICON_BY_STATE[s]()}
          </span>
        );
      })}
    </span>
  );
}

// ---------- Placement ----------

/**
 * Place the popover next to the click pointer rather than the pinned
 * element's bounding rect. Large containers (sidebars, navs) would
 * otherwise dock the popover at the rect's edge — visually adrift from
 * where the user actually clicked.
 *
 * Strategy: default to bottom-right of the cursor by `POINTER_OFFSET`,
 * then flip per axis when the preferred quadrant would clip the
 * viewport. Final coords are clamped so the popover always stays fully
 * on-screen with a `MARGIN` gutter.
 */
function computePlacement(anchor: PopoverAnchor, popoverHeight: number): Placement {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;

  // Horizontal: prefer right of cursor; flip left if it would overflow.
  let left = anchor.pointerX + POINTER_OFFSET;
  if (left + POPOVER_WIDTH > vw - MARGIN) {
    left = anchor.pointerX - POINTER_OFFSET - POPOVER_WIDTH;
  }
  left = Math.max(MARGIN, Math.min(left, vw - POPOVER_WIDTH - MARGIN));

  // Vertical: prefer below cursor; flip above if it would overflow.
  let top = anchor.pointerY + POINTER_OFFSET;
  if (top + popoverHeight > vh - MARGIN) {
    top = anchor.pointerY - POINTER_OFFSET - popoverHeight;
  }
  top = Math.max(MARGIN, Math.min(top, vh - popoverHeight - MARGIN));

  return { top, left };
}

// ---------- Icons ----------

function CopyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x={9} y={9} width={11} height={11} rx={2} stroke="currentColor" strokeWidth={1.6} />
      <path d="M5 15V5a1 1 0 0 1 1-1h9" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <circle cx={12} cy={17.5} r={1.2} fill="currentColor" />
    </svg>
  );
}
