/**
 * useGridblockPanelSizes — persisted widths for the dashboard's
 * inline-start and inline-end side panels.
 *
 * The GridblockShell renders the two side-panel columns at a width
 * chosen by the operator (drag-to-resize, see GridblockResizeHandle).
 * That choice is sticky across reloads so each operator keeps their
 * preferred layout: a target-heavy operator can widen the start
 * panel once and never touch it again; a camera-heavy operator can
 * do the mirror move on the end side.
 *
 * Storage keys are versioned (`.v1`) so future schema bumps (e.g.
 * adding a min-column or remembering a collapsed state) can ship
 * without contaminating in-flight operator state. The current `.v1`
 * keys live under `panelWidth.start` / `panelWidth.end`; legacy
 * `panelWidth.left` / `panelWidth.right` keys are migrated forward
 * once on first read.
 *
 * Live state is loosely clamped to `[0, MAX]` so the elastic
 * resize gesture can render the panel below MIN during a drag.
 * Writes to localStorage tighten that back to `[MIN, MAX]` so the
 * stored preference can never settle in the sub-MIN zone — the
 * resize handle is responsible for snapping back (or closing) on
 * release.
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY_START = "c2.gridblock.panelWidth.start.v1";
const STORAGE_KEY_END = "c2.gridblock.panelWidth.end.v1";
const LEGACY_STORAGE_KEY_START = "c2.gridblock.panelWidth.left.v1";
const LEGACY_STORAGE_KEY_END = "c2.gridblock.panelWidth.right.v1";

/**
 * 300 px is the floor below which list rows truncate the action
 * column. Operators can drag below this during a gesture (the
 * elastic zone), but on release the resize handle snaps back to
 * this value — see `PANEL_WIDTH_CLOSE_THRESHOLD_PX` for the
 * close-vs-snap split.
 */
export const PANEL_WIDTH_MIN_PX = 300;
/**
 * Below this width on drag release, the resize handle closes the
 * panel entirely (the controlling consumer sets its tab state to
 * `null`) instead of snapping back to MIN. The stored width is
 * reset to MIN before close so the next open paints at a usable
 * width regardless of how aggressively the operator dragged.
 */
export const PANEL_WIDTH_CLOSE_THRESHOLD_PX = 120;
/**
 * Upper bound for the inline-start (targets / devices / history)
 * panel. 400 px keeps the panel from dominating the map — list
 * surfaces saturate around this width and any extra is wasted on
 * trailing whitespace.
 */
export const PANEL_WIDTH_MAX_PX = 400;
/**
 * Upper bound for the inline-end (cameras / video) panel. The video
 * stack benefits from extra width — operators routinely want a
 * single hero feed near full-screen — so the cap is intentionally
 * loose. The viewport-aware CSS `min(stored, calc(...))` in
 * `GridblockShell` clips the rendered column to whatever fits next
 * to the rails; this constant just bounds what the *stored*
 * preference can grow to so a corrupted localStorage value can't
 * persist a nonsensical width.
 */
export const PANEL_WIDTH_END_MAX_PX = 2000;
/**
 * Upper bound for the inline-end (cameras / video) panel while the
 * History tab is open on the start side. Wider than the default
 * start-panel cap so operators can keep a usable hero feed without
 * surrendering the full 2000 px end-panel ceiling.
 */
export const PANEL_WIDTH_END_MAX_HISTORY_PX = 720;
/**
 * Matches the legacy `DEFAULT_PANEL_WIDTH_PX = 300` in
 * GridblockShell.tsx so first-paint geometry is unchanged for users
 * who never drag the handle.
 */
export const PANEL_WIDTH_DEFAULT_PX = 300;

/**
 * Tight clamp applied to values that hit localStorage or seed
 * initial state. Out-of-range values from a stale build (e.g. an
 * older 240-MIN preference) snap up to the current floor on first
 * read.
 */
function clampStored(px: number, max: number): number {
  if (!Number.isFinite(px)) return PANEL_WIDTH_DEFAULT_PX;
  if (px < PANEL_WIDTH_MIN_PX) return PANEL_WIDTH_MIN_PX;
  if (px > max) return max;
  return Math.round(px);
}

/**
 * Loose clamp applied to the live setter. Allows the panel to
 * render below MIN (down to 0) during an elastic drag — the
 * resize handle resolves snap-back vs. close on release.
 */
function clampLive(px: number, max: number): number {
  if (!Number.isFinite(px)) return PANEL_WIDTH_DEFAULT_PX;
  if (px < 0) return 0;
  if (px > max) return max;
  return Math.round(px);
}

function readInitial(
  newKey: string,
  legacyKey: string,
  max: number,
): number {
  if (typeof window === "undefined") return PANEL_WIDTH_DEFAULT_PX;
  try {
    let raw = window.localStorage.getItem(newKey);
    if (raw == null) {
      // One-shot forward migration from the pre-rename keys.
      // Subsequent mounts see the new key populated and skip this
      // branch entirely.
      const legacy = window.localStorage.getItem(legacyKey);
      if (legacy != null) {
        window.localStorage.setItem(newKey, legacy);
        window.localStorage.removeItem(legacyKey);
        raw = legacy;
      }
    }
    if (raw == null) return PANEL_WIDTH_DEFAULT_PX;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed)
      ? clampStored(parsed, max)
      : PANEL_WIDTH_DEFAULT_PX;
  } catch {
    return PANEL_WIDTH_DEFAULT_PX;
  }
}

interface UseGridblockPanelSizesResult {
  /** Current width of the inline-start panel in CSS pixels. */
  startPx: number;
  /** Current width of the inline-end panel in CSS pixels. */
  endPx: number;
  /**
   * Imperatively set the inline-start panel width. Clamps loosely
   * to `[0, MAX]` so the elastic resize gesture can render below
   * MIN; persistence to localStorage re-clamps to `[MIN, MAX]`.
   */
  setStartPx: (px: number) => void;
  /**
   * Imperatively set the inline-end panel width. Same semantics as
   * `setStartPx`.
   */
  setEndPx: (px: number) => void;
}

export function useGridblockPanelSizes(): UseGridblockPanelSizesResult {
  const [startPx, setStartState] = useState<number>(() =>
    readInitial(STORAGE_KEY_START, LEGACY_STORAGE_KEY_START, PANEL_WIDTH_MAX_PX),
  );
  const [endPx, setEndState] = useState<number>(() =>
    readInitial(STORAGE_KEY_END, LEGACY_STORAGE_KEY_END, PANEL_WIDTH_END_MAX_PX),
  );

  const setStartPx = useCallback((px: number) => {
    setStartState(clampLive(px, PANEL_WIDTH_MAX_PX));
  }, []);

  const setEndPx = useCallback((px: number) => {
    setEndState(clampLive(px, PANEL_WIDTH_END_MAX_PX));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY_START,
        String(clampStored(startPx, PANEL_WIDTH_MAX_PX)),
      );
    } catch {
      // Storage quota / SecurityError — non-critical, skip silently.
    }
  }, [startPx]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY_END,
        String(clampStored(endPx, PANEL_WIDTH_END_MAX_PX)),
      );
    } catch {
      // Storage quota / SecurityError — non-critical, skip silently.
    }
  }, [endPx]);

  return { startPx, endPx, setStartPx, setEndPx };
}
