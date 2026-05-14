/**
 * useGridblockPanelSizes — persisted widths for the dashboard's
 * inline-start and inline-end side panels.
 *
 * The GridblockShell renders the two side-panel columns at a width
 * chosen by the operator (drag-to-resize, see GridblockResizeHandle).
 * That choice is sticky across reloads so each operator keeps their
 * preferred layout: a target-heavy operator can widen the left panel
 * once and never touch it again; a camera-heavy operator can do the
 * mirror move on the right.
 *
 * Storage keys are versioned (`.v1`) so future schema bumps (e.g.
 * adding a min-column or remembering a collapsed state) can ship
 * without contaminating in-flight operator state.
 *
 * Writes are clamped to [MIN_PX, MAX_PX] before they hit storage so
 * an out-of-range value from a stale build can never wedge the
 * layout into an unusable state on the next mount.
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY_LEFT = "c2.gridblock.panelWidth.left.v1";
const STORAGE_KEY_RIGHT = "c2.gridblock.panelWidth.right.v1";

/**
 * 240 px just covers a typical entity-list row with name + status
 * chip + trailing actions; below that the row truncates aggressively
 * and the panel loses information value.
 */
export const PANEL_WIDTH_MIN_PX = 240;
/**
 * Matches the legacy `DEFAULT_PANEL_WIDTH_PX = 300` in
 * GridblockShell.tsx so first-paint geometry is unchanged for users
 * who never drag the handle.
 */
export const PANEL_WIDTH_DEFAULT_PX = 300;

/**
 * No hardcoded max. The right panel can grow up to "full width
 * minus rails minus left panel", which depends on the live viewport
 * size and whether the left panel is open. That cap is applied at
 * render time in GridblockShell via a CSS `min(stored, calc(100% -
 * ...))` so the column never overflows the viewport, while the
 * stored preference stays as-is and rescales when the viewport
 * grows back.
 */
function clamp(px: number): number {
  if (!Number.isFinite(px)) return PANEL_WIDTH_DEFAULT_PX;
  if (px < PANEL_WIDTH_MIN_PX) return PANEL_WIDTH_MIN_PX;
  return Math.round(px);
}

function readInitial(key: string): number {
  if (typeof window === "undefined") return PANEL_WIDTH_DEFAULT_PX;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return PANEL_WIDTH_DEFAULT_PX;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? clamp(parsed) : PANEL_WIDTH_DEFAULT_PX;
  } catch {
    return PANEL_WIDTH_DEFAULT_PX;
  }
}

interface UseGridblockPanelSizesResult {
  /** Current width of the inline-start panel in CSS pixels. */
  leftPx: number;
  /** Current width of the inline-end panel in CSS pixels. */
  rightPx: number;
  /**
   * Imperatively set the inline-start panel width. Clamps to
   * [MIN, MAX] internally and persists to localStorage.
   */
  setLeftPx: (px: number) => void;
  /**
   * Imperatively set the inline-end panel width. Clamps to
   * [MIN, MAX] internally and persists to localStorage.
   */
  setRightPx: (px: number) => void;
}

export function useGridblockPanelSizes(): UseGridblockPanelSizesResult {
  const [leftPx, setLeftState] = useState<number>(() =>
    readInitial(STORAGE_KEY_LEFT),
  );
  const [rightPx, setRightState] = useState<number>(() =>
    readInitial(STORAGE_KEY_RIGHT),
  );

  const setLeftPx = useCallback((px: number) => {
    setLeftState(clamp(px));
  }, []);

  const setRightPx = useCallback((px: number) => {
    setRightState(clamp(px));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY_LEFT, String(leftPx));
    } catch {
      // Storage quota / SecurityError — non-critical, skip silently.
    }
  }, [leftPx]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY_RIGHT, String(rightPx));
    } catch {
      // Storage quota / SecurityError — non-critical, skip silently.
    }
  }, [rightPx]);

  return { leftPx, rightPx, setLeftPx, setRightPx };
}
