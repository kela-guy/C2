/**
 * State machine + pointer wiring for the Handoff Inspector.
 *
 * States:
 *   - `idle`     — only the floating glyph is rendered. No listeners attached.
 *   - `picking`  — pointer-tracking listeners on; outline follows cursor;
 *                  click commits the hover target to a pin.
 *   - `pinned`   — single pin live, pick popover anchored to the click.
 *                  Picker can re-enter to replace it.
 *
 * Single pin only. Replacing the pin is the only way to capture a new
 * element. Matches the Cursor-inspired interaction model.
 *
 * Three independent axes during `picking`:
 *   - `depth` — z-stack cursor at one pixel (Alt cycles through stacked elements).
 *   - `lift`  — DOM ancestor walk from the deepest element at the cursor
 *               (Arrow Up walks up, Arrow Down walks back down). Soft-capped
 *               at the nearest `data-handoff-component` / `data-slot`
 *               boundary; `Shift + Arrow Up` crosses one boundary at a time.
 *   - `baseElement` — the leaf at `(x, y, depth)`, used for sticky-reset:
 *               `lift` persists while the cursor stays over the same leaf,
 *               and resets to 0 when the cursor lands on a different one.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  captureElement,
  hintFor,
  isComponentBoundary,
  type CapturedElement,
} from './captureElement';

export type InspectorMode = 'idle' | 'picking' | 'pinned';

export interface HoverTarget {
  element: Element;
  rect: { x: number; y: number; width: number; height: number };
  /** Index into `elementsFromPoint` when Alt-traversing the stack. */
  depth: number;
  /** Total depth available at the cursor position. */
  stackSize: number;
  /** How many ancestors above the base leaf the resolver landed on. */
  lift: number;
  /**
   * How many more ancestor steps the user could take before the next
   * boundary cap (or `<body>`). Without `Shift`, the resolver refuses
   * to advance once `lift === liftMax`.
   */
  liftMax: number;
  /** Current element has a `data-handoff-component` / `data-slot` stamp. */
  atBoundary: boolean;
  /**
   * Breadcrumb of labels from the base leaf up to the current lift,
   * inclusive. Each entry is the element's component hint when stamped,
   * otherwise its lowercase tag name. Last entry is the current lift.
   */
  chain: string[];
}

export interface PopoverAnchor {
  /** Pinned element's full rect — drives the dashed pin overlay. */
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * Viewport coordinates of the click that committed this pin. The
   * popover places itself relative to this point so it always lands
   * next to the cursor, even when the pinned element is huge (a nav
   * bar would otherwise push the popover far from the click).
   */
  pointerX: number;
  pointerY: number;
}

/**
 * One-shot confirmation notice fired by sub-components (e.g. PickPopover
 * after a successful copy). The `id` is the only thing the toast watches
 * for change-edge — `message` is the body text.
 */
export interface InspectorNotice {
  id: number;
  message: string;
}

export interface UseInspectorReturn {
  mode: InspectorMode;
  hover: HoverTarget | null;
  pin: CapturedElement | null;
  /** Presence implies the pick popover is open. */
  popoverAnchor: PopoverAnchor | null;
  /**
   * Increments each time `Arrow Up` is refused by the boundary cap.
   * The overlay watches this to fire a one-shot pulse animation —
   * the value itself is meaningless past the change-detection.
   */
  boundaryPulseKey: number;
  /** Latest one-shot confirmation; the toast self-dismisses after a beat. */
  notice: InspectorNotice | null;
  showNotice: (message: string) => void;
  enterPicking: () => void;
  exit: () => void;
  clearPin: () => void;
  /** Dismiss the pick popover and restore focus to the pre-pick element. */
  closePopover: () => void;
}

/** Skip the inspector's own portal subtree when picking. */
function isInspectorNode(el: Element | null): boolean {
  if (!el) return false;
  return Boolean(el.closest('[data-handoff-inspector]'));
}

/** Label an element for the breadcrumb: hint when stamped, else tag. */
function labelFor(el: Element): string {
  return hintFor(el) ?? el.tagName.toLowerCase();
}

interface ResolveOutcome {
  hover: HoverTarget;
  /** The lift-0 leaf at `(x, y, depth)` — used for sticky-reset detection. */
  base: Element;
}

/**
 * Single source of truth for "what element are we pointing at?"
 *
 * - `lift` is honoured up to the first boundary unless `shiftOverride` is true.
 * - Walking past `document.body` / `document.documentElement` is never allowed.
 * - The return shape carries enough metadata for the overlay to render the
 *   breadcrumb, the boundary state, and the remaining lift capacity without
 *   re-walking the tree.
 */
function resolveTarget(
  x: number,
  y: number,
  depth: number,
  lift: number,
  shiftOverride: boolean,
): ResolveOutcome | null {
  if (typeof document === 'undefined') return null;
  const stack = document.elementsFromPoint(x, y).filter((el) => !isInspectorNode(el));
  if (stack.length === 0) return null;
  const baseIdx = Math.min(depth, stack.length - 1);
  const base = stack[baseIdx];

  let current: Element = base;
  let actualLift = 0;
  const chain: string[] = [labelFor(base)];

  for (let step = 0; step < lift; step += 1) {
    // Don't advance past an element that itself carries a boundary
    // stamp — landing ON the boundary is fine (filter-bar IS a useful
    // pick target), but bubbling past it without shift is the trap
    // we're guarding against.
    if (isComponentBoundary(current) && !shiftOverride) break;
    const parent = current.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) break;
    current = parent;
    actualLift += 1;
    chain.push(labelFor(current));
  }

  // How many more steps could the user take from `current` before
  // the next cap? Useful for showing "at the cap" state.
  let liftMax = actualLift;
  let probe: Element = current;
  while (true) {
    if (isComponentBoundary(probe) && !shiftOverride) break;
    const parent = probe.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) break;
    probe = parent;
    liftMax += 1;
  }

  const rect = current.getBoundingClientRect();
  return {
    hover: {
      element: current,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      depth: baseIdx,
      stackSize: stack.length,
      lift: actualLift,
      liftMax,
      atBoundary: isComponentBoundary(current),
      chain,
    },
    base,
  };
}

interface PointerState {
  x: number;
  y: number;
  depth: number;
  lift: number;
  baseElement: Element | null;
}

const INITIAL_POINTER: PointerState = { x: 0, y: 0, depth: 0, lift: 0, baseElement: null };

/** Restore focus to the element that owned it when picking began. */
function restoreFocus(prev: Element | null) {
  if (prev instanceof HTMLElement) {
    try { prev.focus({ preventScroll: true }); } catch { /* noop */ }
  }
}

export function useInspector(): UseInspectorReturn {
  const [mode, setMode] = useState<InspectorMode>('idle');
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const [pin, setPin] = useState<CapturedElement | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<PopoverAnchor | null>(null);
  const [boundaryPulseKey, setBoundaryPulseKey] = useState(0);
  const [notice, setNotice] = useState<InspectorNotice | null>(null);

  // Pointer / keyboard state we keep outside React.
  const pointerRef = useRef<PointerState>({ ...INITIAL_POINTER });
  const previouslyFocusedRef = useRef<Element | null>(null);
  const rafRef = useRef<number | null>(null);
  const noticeIdRef = useRef(0);

  const showNotice = useCallback((message: string) => {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, message });
  }, []);

  const scheduleHover = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pointerRef.current;
      const probe = resolveTarget(p.x, p.y, p.depth, p.lift, false);
      if (!probe) {
        setHover(null);
        pointerRef.current = { ...p, baseElement: null };
        return;
      }
      // Sticky-reset: if the cursor moved to a different base leaf,
      // drop the lift offset before publishing the hover. Re-resolve
      // at lift 0 so the chain/atBoundary reflect the new base.
      if (probe.base !== p.baseElement && p.lift > 0) {
        const fresh = resolveTarget(p.x, p.y, p.depth, 0, false);
        if (fresh) {
          pointerRef.current = { ...p, lift: 0, baseElement: fresh.base };
          setHover(fresh.hover);
        }
        return;
      }
      pointerRef.current = { ...p, baseElement: probe.base, lift: probe.hover.lift };
      setHover(probe.hover);
    });
  }, []);

  const commitPin = useCallback((el: Element, clientX: number, clientY: number) => {
    const captured = captureElement(el);
    setPin(captured);
    setMode('pinned');
    setHover(null);
    setPopoverAnchor({
      x: captured.rect.x,
      y: captured.rect.y,
      width: captured.rect.width,
      height: captured.rect.height,
      pointerX: clientX,
      pointerY: clientY,
    });
  }, []);

  const enterPicking = useCallback(() => {
    if (typeof document === 'undefined') return;
    previouslyFocusedRef.current = document.activeElement;
    // Re-pick wipes the stale popover so a new click can re-open it cleanly.
    setPopoverAnchor(null);
    setMode('picking');
  }, []);

  const closePopover = useCallback(() => {
    setPopoverAnchor(null);
    restoreFocus(previouslyFocusedRef.current);
  }, []);

  const exit = useCallback(() => {
    setMode((prev) => (prev === 'idle' ? prev : pin ? 'pinned' : 'idle'));
    setHover(null);
  }, [pin]);

  const clearPin = useCallback(() => {
    setPin(null);
    setPopoverAnchor(null);
    setMode('idle');
  }, []);

  // Pointer + keyboard listeners — attached only while picking.
  useEffect(() => {
    if (mode !== 'picking' || typeof document === 'undefined') return;

    const controller = new AbortController();
    const { signal } = controller;
    const body = document.body;
    const prevCursor = body.style.cursor;
    body.style.cursor = 'crosshair';

    function isInspectorEvent(e: Event): boolean {
      // Clicks on the picker glyph must still reach their React
      // handler — the inspector's own UI is the off-switch.
      const composed = e as Event & { composedPath?: () => EventTarget[] };
      const path = typeof composed.composedPath === 'function' ? composed.composedPath() : [];
      for (const node of path) {
        if (node instanceof Element && isInspectorNode(node)) return true;
      }
      return false;
    }

    function suppress(e: Event) {
      // Capture-phase preventDefault neutralizes underlying buttons,
      // DnD sources, and Radix triggers. `stopImmediatePropagation`
      // removes sibling capture-phase listeners (react-dnd attaches in
      // capture).
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    function onPointerMove(e: PointerEvent) {
      pointerRef.current = {
        ...pointerRef.current,
        x: e.clientX,
        y: e.clientY,
      };
      scheduleHover();
    }

    function onPointerDownish(e: PointerEvent | MouseEvent) {
      if (e.button !== 0) return;
      if (isInspectorEvent(e)) return;
      suppress(e);
    }

    /** Resolve the element to commit at the current pointer state. */
    function commitTargetAt(clientX: number, clientY: number, shiftOverride: boolean): Element | null {
      const probe = resolveTarget(
        clientX,
        clientY,
        pointerRef.current.depth,
        pointerRef.current.lift,
        shiftOverride,
      );
      return probe?.hover.element ?? null;
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0) return;
      if (isInspectorEvent(e)) return;
      suppress(e);
      const target = commitTargetAt(e.clientX, e.clientY, e.shiftKey);
      if (target) commitPin(target, e.clientX, e.clientY);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        controller.abort();
        setMode(pin ? 'pinned' : 'idle');
        setHover(null);
        return;
      }
      if (e.key === 'Alt') {
        pointerRef.current = { ...pointerRef.current, depth: pointerRef.current.depth + 1 };
        scheduleHover();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Peek where lift+1 would land. If the resolver caps us
        // (returns the same lift we already had), fire the pulse and
        // don't update state — the developer sees "you hit a boundary".
        const next = resolveTarget(
          pointerRef.current.x,
          pointerRef.current.y,
          pointerRef.current.depth,
          pointerRef.current.lift + 1,
          e.shiftKey,
        );
        if (!next || next.hover.lift <= pointerRef.current.lift) {
          setBoundaryPulseKey((k) => k + 1);
          return;
        }
        pointerRef.current = { ...pointerRef.current, lift: next.hover.lift };
        scheduleHover();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (pointerRef.current.lift === 0) return;
        pointerRef.current = { ...pointerRef.current, lift: pointerRef.current.lift - 1 };
        scheduleHover();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        // Reuse the last-hovered pointer coords so keyboard pins
        // behave the same as mouse pins.
        const { x, y } = pointerRef.current;
        const target = commitTargetAt(x, y, e.shiftKey);
        if (target) commitPin(target, x, y);
      }
    }

    function onAltKeyUp(e: KeyboardEvent) {
      if (e.key === 'Alt') {
        pointerRef.current = { ...pointerRef.current, depth: 0 };
        scheduleHover();
      }
    }

    document.addEventListener('pointermove', onPointerMove, { signal, capture: true });
    document.addEventListener('pointerdown', onPointerDownish, { signal, capture: true });
    document.addEventListener('mousedown', onPointerDownish, { signal, capture: true });
    document.addEventListener('click', onClick, { signal, capture: true });
    document.addEventListener('keydown', onKeyDown, { signal, capture: true });
    document.addEventListener('keyup', onAltKeyUp, { signal, capture: true });
    document.addEventListener('scroll', scheduleHover, { signal, capture: true, passive: true });
    window.addEventListener('resize', scheduleHover, { signal });

    return () => {
      controller.abort();
      body.style.cursor = prevCursor;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pointerRef.current = { ...INITIAL_POINTER };
      restoreFocus(previouslyFocusedRef.current);
    };
  }, [mode, scheduleHover, commitPin, pin]);

  // Route changes — exit picker but keep the pin (developer might want
  // to copy after navigating). The popover's coords would lie about
  // their source after a route change, so close it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onPop() {
      setMode((prev) => (prev === 'picking' ? (pin ? 'pinned' : 'idle') : prev));
      setHover(null);
      setPopoverAnchor(null);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [pin]);

  return useMemo(
    () => ({
      mode,
      hover,
      pin,
      popoverAnchor,
      boundaryPulseKey,
      notice,
      showNotice,
      enterPicking,
      exit,
      clearPin,
      closePopover,
    }),
    [
      mode,
      hover,
      pin,
      popoverAnchor,
      boundaryPulseKey,
      notice,
      showNotice,
      enterPicking,
      exit,
      clearPin,
      closePopover,
    ],
  );
}
