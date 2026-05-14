/**
 * GridblockResizeHandle — drag/keyboard splitter for a side panel.
 *
 * Mounted by GridblockShell on the map-adjacent edge of each open
 * side panel. Pointer-down captures the starting width, claims the
 * pointer via `setPointerCapture`, then routes subsequent
 * `pointermove` / `pointerup` events back to the handle element so
 * the drag survives the cursor leaving the viewport, Cesium's
 * canvas swallowing events, the OS chrome eating a release outside
 * the browser window, or any other scenario where the page would
 * otherwise stop hearing pointer traffic.
 *
 * Safety nets: pointer capture is the primary release mechanism,
 * but we also listen for `window` blur / `visibilitychange` and
 * abort the drag if the app loses focus mid-gesture. That covers
 * alt-tab and OS-level interruptions where the browser will never
 * fire a `pointerup` at all.
 *
 * RTL math: in RTL, grid columns paint right-to-left, which means
 * a positive `clientX` delta visually shrinks the inline-start
 * panel (the first column in source order, mounted on the visual
 * right). We resolve the writing direction from `getComputedStyle`
 * on the handle and flip the sign accordingly so the operator's
 * drag always tracks the cursor.
 *
 * The handle is `role="separator"` with `aria-orientation="vertical"`
 * and `aria-valuenow / -min / -max`, focusable, and supports
 * `ArrowLeft / ArrowRight` to nudge ±16 px (Shift = ±64 px). The
 * keyboard sign is also direction-aware: ArrowLeft on the
 * inline-start handle in LTR shrinks; in RTL it grows.
 *
 * While dragging, the handle sets `data-gridblock-resizing` on the
 * documentElement so the shell can suppress the grid-template-columns
 * transition for the duration of the drag (without that, every
 * pointer-move chases a 240 ms ease and reads as molasses).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { PANEL_WIDTH_MIN_PX } from "@/app/hooks/useGridblockPanelSizes";

interface GridblockResizeHandleProps {
  /**
   * Which panel this handle resizes. `start` is the inline-start
   * side panel; `end` is the inline-end side panel. Used to flip
   * the delta sign so the handle always grows the panel toward
   * itself.
   */
  side: "start" | "end";
  /** Current panel width in CSS pixels. */
  widthPx: number;
  /**
   * Callback invoked on every drag move and keyboard nudge with the
   * new width in CSS pixels. The hook is responsible for clamping.
   */
  onResize: (widthPx: number) => void;
  /** Accessible label, e.g. "Resize targets panel". */
  ariaLabel: string;
}

/**
 * Resolves the inline writing direction for a given DOM node. We
 * walk up via `getComputedStyle` rather than reading `dir` attrs
 * directly because Radix's `<DirectionProvider>` writes `dir` on
 * the host element only — children inherit via CSS.
 */
function getDirSign(node: HTMLElement): 1 | -1 {
  if (typeof window === "undefined") return 1;
  const direction = window.getComputedStyle(node).direction;
  return direction === "rtl" ? -1 : 1;
}

const KEYBOARD_STEP_PX = 16;
const KEYBOARD_STEP_LARGE_PX = 64;

export function GridblockResizeHandle({
  side,
  widthPx,
  onResize,
  ariaLabel,
}: GridblockResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement | null>(null);

  // Track drag state in refs to avoid re-rendering on every move.
  // `isDragging` *is* state because we want the visual hover/active
  // styling to stay applied while the gesture is in flight, even
  // when the cursor wanders off the 8px handle.
  const dragStartRef = useRef<
    | { x: number; widthPx: number; sign: 1 | -1; pointerId: number }
    | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Tear-down used by every drag-exit path (normal release, capture
   * loss, window blur, tab hidden). Centralising it guarantees the
   * data attribute on the documentElement, the React drag-state
   * flag, and the pointer-capture handle all clear together — there
   * is no scenario where we leave the shell with `data-gridblock-
   * resizing` stuck and the column transition wedged off.
   */
  const endDrag = useCallback(() => {
    const node = handleRef.current;
    const start = dragStartRef.current;
    if (node && start && node.hasPointerCapture(start.pointerId)) {
      // Release defensively; in most paths the browser will have
      // already auto-released on `pointerup`, but explicit release
      // is cheap and lets the focus / visibility safety nets bail
      // out cleanly.
      try {
        node.releasePointerCapture(start.pointerId);
      } catch {
        // Capture may have already been auto-released by the
        // browser; silently ignore.
      }
    }
    dragStartRef.current = null;
    setIsDragging(false);
    delete document.documentElement.dataset.gridblockResizing;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return; // Left button only.
      const node = handleRef.current;
      if (!node) return;

      event.preventDefault();
      event.stopPropagation();

      // Sign convention: positive delta should grow the panel.
      //
      //   side=start, LTR  → cursor moves right (+x) → grow → +1
      //   side=start, RTL  → cursor moves left (-x)  → grow → -1
      //   side=end,   LTR  → cursor moves left (-x)  → grow → -1
      //   side=end,   RTL  → cursor moves right (+x) → grow → +1
      //
      // i.e. sign = (start ? +1 : -1) * dirSign
      const dirSign = getDirSign(node);
      const sign: 1 | -1 =
        side === "start"
          ? (dirSign as 1 | -1)
          : ((-dirSign) as 1 | -1);

      // Snapshot the *visible* cell width rather than the controlled
      // `widthPx` prop. When the shell caps the column at the
      // viewport limit (via CSS `min(stored, calc(...))`), the
      // stored value can exceed what the user actually sees. Reading
      // the rendered width here keeps the drag tracking 1:1 with the
      // panel's actual edge so the "stuck at max" state can still be
      // reversed by a normal drag back.
      const cell = node.parentElement;
      const startWidth = cell
        ? cell.getBoundingClientRect().width
        : widthPx;

      // Claim the pointer for this handle. Once captured, the
      // browser routes every subsequent pointer event for this
      // pointer ID to this element — even when the cursor is
      // outside the viewport, over a different window, or hovering
      // a sibling iframe — and guarantees a final `pointerup` /
      // `pointercancel` / `lostpointercapture` fires here as well.
      // That is what closes the "drag stays stuck after leaving
      // the window" hole.
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // Older browsers without pointer-capture support fall back
        // to the safety-net listeners below; we still proceed with
        // the drag.
      }

      dragStartRef.current = {
        x: event.clientX,
        widthPx: startWidth,
        sign,
        pointerId: event.pointerId,
      };
      setIsDragging(true);
      document.documentElement.dataset.gridblockResizing = "";
    },
    [side, widthPx],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start || event.pointerId !== start.pointerId) return;
      const delta = event.clientX - start.x;
      onResize(start.widthPx + delta * start.sign);
    },
    [onResize],
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start || event.pointerId !== start.pointerId) return;
      endDrag();
    },
    [endDrag],
  );

  /**
   * Safety nets for the corner cases pointer capture *cannot*
   * cover:
   *
   *  - `blur` on window — user alt-tabs / cmd-tabs mid-drag. The
   *    browser will never deliver a pointerup in this case because
   *    the release happens to a different OS-level window.
   *  - `visibilitychange` — tab is hidden (switched, minimised).
   *    Same shape as blur but covers Chrome's energy-saver paths
   *    where blur isn't fired.
   *
   * Both abort the drag and clear the documentElement flag so the
   * shell doesn't come back from a tab switch with the column
   * transition still suppressed.
   */
  useEffect(() => {
    if (!isDragging) return;

    const onWindowBlur = () => endDrag();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") endDrag();
    };

    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isDragging, endDrag]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const node = handleRef.current;
      if (!node) return;

      const dirSign = getDirSign(node);
      // ArrowRight visually moves right regardless of direction;
      // map that to "grow the panel that lives on the right".
      // In LTR: right = end side. In RTL: right = start side.
      const arrowSign = event.key === "ArrowRight" ? 1 : -1;
      const sideSign: 1 | -1 = side === "start" ? 1 : -1;
      const sign = (arrowSign * dirSign * sideSign) as 1 | -1;

      const step = event.shiftKey ? KEYBOARD_STEP_LARGE_PX : KEYBOARD_STEP_PX;
      event.preventDefault();
      onResize(widthPx + step * sign);
    },
    [onResize, side, widthPx],
  );

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuenow={widthPx}
      aria-valuemin={PANEL_WIDTH_MIN_PX}
      tabIndex={0}
      data-side={side}
      data-dragging={isDragging || undefined}
      className="gridblock-resize-handle"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      /*
       * `lostpointercapture` fires when the browser revokes capture
       * for any reason (cursor crossed into a frame that asked for
       * its own capture, OS preempted the gesture, etc). Treat it as
       * the canonical drag-end signal so we never leave the shell in
       * a half-dragging state when capture is taken from us.
       */
      onLostPointerCapture={handlePointerEnd}
      onKeyDown={handleKeyDown}
    />
  );
}
