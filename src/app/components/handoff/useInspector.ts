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
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { captureElement, type CapturedElement } from './captureElement';

export type InspectorMode = 'idle' | 'picking' | 'pinned';

export interface HoverTarget {
  element: Element;
  rect: { x: number; y: number; width: number; height: number };
  /** Index into `elementsFromPoint` when Alt-traversing the stack. */
  depth: number;
  /** Total depth available at the cursor position. */
  stackSize: number;
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

export interface UseInspectorReturn {
  mode: InspectorMode;
  hover: HoverTarget | null;
  pin: CapturedElement | null;
  /** Presence implies the pick popover is open. */
  popoverAnchor: PopoverAnchor | null;
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

function pointToTarget(x: number, y: number, depth: number): HoverTarget | null {
  if (typeof document === 'undefined') return null;
  const stack = document.elementsFromPoint(x, y).filter((el) => !isInspectorNode(el));
  if (stack.length === 0) return null;
  const idx = Math.min(depth, stack.length - 1);
  const element = stack[idx];
  const rect = element.getBoundingClientRect();
  return {
    element,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    depth: idx,
    stackSize: stack.length,
  };
}

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

  // Pointer / keyboard state we keep outside React.
  const pointerRef = useRef<{ x: number; y: number; depth: number }>({ x: 0, y: 0, depth: 0 });
  const previouslyFocusedRef = useRef<Element | null>(null);
  const rafRef = useRef<number | null>(null);

  const scheduleHover = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const { x, y, depth } = pointerRef.current;
      setHover(pointToTarget(x, y, depth));
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
      pointerRef.current = { x: e.clientX, y: e.clientY, depth: pointerRef.current.depth };
      scheduleHover();
    }

    function onPointerDownish(e: PointerEvent | MouseEvent) {
      if (e.button !== 0) return;
      if (isInspectorEvent(e)) return;
      suppress(e);
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0) return;
      if (isInspectorEvent(e)) return;
      suppress(e);
      const stack = document.elementsFromPoint(e.clientX, e.clientY)
        .filter((el) => !isInspectorNode(el));
      const target = stack[Math.min(pointerRef.current.depth, stack.length - 1)];
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
      if (e.key === 'Enter') {
        e.preventDefault();
        // Reuse the last-hovered pointer coords so keyboard pins
        // behave the same as mouse pins.
        const { x, y, depth } = pointerRef.current;
        const stack = document.elementsFromPoint(x, y).filter((el) => !isInspectorNode(el));
        const target = stack[Math.min(depth, stack.length - 1)];
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
      pointerRef.current = { x: 0, y: 0, depth: 0 };
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
    () => ({ mode, hover, pin, popoverAnchor, enterPicking, exit, clearPin, closePopover }),
    [mode, hover, pin, popoverAnchor, enterPicking, exit, clearPin, closePopover],
  );
}
