/**
 * GridblockShell — the building-block grid that holds a chrome
 * surface together. Owns the geometry only: a 2-row x 5-column
 * CSS grid where the panel cells animate from `0 → panelWidthPx`
 * when their content materialises.
 *
 * Geometry (source order; logical columns flip visually under
 * dir="rtl"):
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │                       header (row 1, auto)                   │
 *   ├──────┬─────────┬─────────────────────────┬─────────┬─────────┤
 *   │ rail │ panel-S │           map           │ panel-E │  rail   │ row 2 (1fr)
 *   │ start│  start  │                         │   end   │  end    │
 *   └──────┴─────────┴─────────────────────────┴─────────┴─────────┘
 *
 * Panel cells stay mounted at all times (the column track
 * interpolates between two fully-defined widths), so the map cell
 * elastically expands as a panel collapses. The panel content
 * itself is mounted/unmounted via `AnimatePresence` so it can
 * fade + translate the rail-edge wash on enter/exit.
 *
 * The shell knows nothing about targets, devices, or video. All
 * domain rendering happens inside the slots passed via props.
 * Mode-specific chrome (e.g. the History timeline) lives inside
 * the relevant slot — the `map` slot owns its own footer when it
 * needs one — so the shell stays a pure geometry contract.
 */

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { Substrate } from "@/primitives/Substrate";
import {
  PANEL_WIDTH_CLOSE_THRESHOLD_PX,
  PANEL_WIDTH_MAX_PX,
  PANEL_WIDTH_MIN_PX,
} from "@/app/hooks/useGridblockPanelSizes";
import { GridblockResizeHandle } from "./GridblockResizeHandle";

import "./gridblock.css";

interface GridblockShellProps {
  /** Top chrome row. Typically `<GridblockHeader />`. */
  header: ReactNode;
  /** inline-start vertical icon strip. */
  startRail: ReactNode;
  /** inline-end vertical icon strip. */
  endRail: ReactNode;
  /**
   * Contents of the inline-start side panel. `null` collapses the
   * panel column to 0 with an animated `grid-template-columns`
   * transition.
   */
  startPanel: ReactNode | null;
  /**
   * Contents of the inline-end side panel. `null` collapses the
   * panel column to 0. Pass `null` permanently if the surface
   * doesn't have inline-end panels — the column remains 0px and
   * the inline-end rail still occupies its own column.
   */
  endPanel: ReactNode | null;
  /** Map / main content cell. Always claims the remaining `1fr`. */
  map: ReactNode;
  /**
   * Width the inline-start panel expands to when its content is
   * non-null. Defaults to 300. Pass a controlled value (typically
   * from `useGridblockPanelSizes`) plus `onStartPanelResize` to
   * make the panel operator-resizable.
   */
  startPanelWidthPx?: number;
  /**
   * Width the inline-end panel expands to when its content is
   * non-null. Defaults to 300.
   */
  endPanelWidthPx?: number;
  /**
   * Called when the operator drags or keyboard-nudges the inline-
   * start panel's edge against the map. Receives the new width in
   * CSS pixels (clamped loosely to `[0, MAX]` by the paired hook so
   * the elastic zone can render below MIN during drag). If omitted,
   * the inline-start panel is not resizable — no drag handle is
   * mounted.
   */
  onStartPanelResize?: (widthPx: number) => void;
  /**
   * Called when the operator drags or keyboard-nudges the inline-
   * end panel's edge. Same semantics as `onStartPanelResize`.
   */
  onEndPanelResize?: (widthPx: number) => void;
  /**
   * Called once when the operator drags the inline-start panel
   * below `PANEL_WIDTH_CLOSE_THRESHOLD_PX` and releases. The shell
   * resets the stored width to MIN before invoking this callback,
   * so consumers only need to clear their open/closed state. Omit
   * to disable drag-to-close on this side.
   */
  onStartPanelClose?: () => void;
  /** Same as `onStartPanelClose` but for the inline-end panel. */
  onEndPanelClose?: () => void;
  /**
   * Upper bound (in CSS pixels) reported by the inline-start panel's
   * resize handle as `aria-valuemax`. Defaults to the shared
   * `PANEL_WIDTH_MAX_PX`. Pass a tighter value when a mode-specific
   * clamp is in effect (e.g. History) so assistive tech reflects
   * the operative ceiling. The actual width clamp lives in the
   * controlling hook — this prop only feeds the handle's a11y
   * surface.
   */
  startPanelMaxPx?: number;
  /**
   * Same as `startPanelMaxPx` but for the inline-end panel. Defaults
   * to `PANEL_WIDTH_MAX_PX` to stay backwards-compatible; consumers
   * that drive the inline-end panel via `useGridblockPanelSizes`
   * should pass `PANEL_WIDTH_END_MAX_PX` (or a History-style
   * override).
   */
  endPanelMaxPx?: number;
  /**
   * Optional ARIA labels for the resize handles. Should be
   * localized strings — falls back to a side-neutral English
   * label if omitted.
   */
  startResizeAriaLabel?: string;
  endResizeAriaLabel?: string;
}

/**
 * Reveal motion shared by both side panels. Content fades and
 * slides ~12px from the rail-adjacent edge into place.
 *
 * Translate is in pixels rather than `%` because the panel cell
 * itself is shrinking to 0 underneath us; a percentage exit
 * would race the column collapse and read as juddery.
 *
 * The X axis follows logical-direction conventions implicitly
 * because translateX in a `dir="rtl"` ancestor still uses screen
 * pixels. Browsers do not automatically flip translateX for RTL
 * — but in our shell the panels themselves are placed in source
 * order, so the inline-start panel's "rail-adjacent edge" still
 * flips with `dir`, leaving the visual effect identical: the
 * panel slides off toward its own rail.
 *
 * For that to hold we drive the inline-start panel with a NEGATIVE
 * `x` and the inline-end panel with a POSITIVE `x`. In RTL the
 * `dir="rtl"` writing mode does not change the viewport's pixel
 * coordinate system; what changes is which rail is on the left
 * vs. right. A negative-x slide of the inline-start panel in RTL
 * therefore moves it *into* the visual area instead of off-screen.
 *
 * To keep the slide direction logical, we read `dir` off the
 * shell's outer element via a CSS custom property
 * (`--gridblock-rtl: 0 | 1`) and flip the X translate sign in
 * Motion via inline style. See the `dirSign` resolution below.
 */
const PANEL_TRANSITION = {
  enter: {
    duration: 0.24,
    ease: [0.32, 0.72, 0, 1] as const,
  },
  exit: {
    duration: 0.18,
    ease: [0.4, 0, 1, 1] as const,
  },
};

const DEFAULT_PANEL_WIDTH_PX = 300;

export function GridblockShell({
  header,
  startRail,
  endRail,
  startPanel,
  endPanel,
  map,
  startPanelWidthPx = DEFAULT_PANEL_WIDTH_PX,
  endPanelWidthPx = DEFAULT_PANEL_WIDTH_PX,
  onStartPanelResize,
  onEndPanelResize,
  onStartPanelClose,
  onEndPanelClose,
  startPanelMaxPx = PANEL_WIDTH_MAX_PX,
  endPanelMaxPx = PANEL_WIDTH_MAX_PX,
  startResizeAriaLabel = "Resize panel",
  endResizeAriaLabel = "Resize panel",
}: GridblockShellProps) {
  // Stable id so panel `motion` keys don't collide if the shell
  // mounts more than once on a page (rare; styleguide etc.).
  const id = useId();

  // Honor `prefers-reduced-motion` directly on the panel slide so we
  // don't depend on the global CSS duration override as a safety net.
  // When reduced, panels still mount/unmount via AnimatePresence (so
  // exit timing matches the column-collapse) but skip the translateX
  // and opacity tween — content snaps in.
  const prefersReducedMotion = useReducedMotion();

  // The inline-end panel column track is `min(stored, calc(viewport-fit))`
  // — the operator can persist a width larger than the viewport
  // allows, but the rendered column clamps to whatever space is
  // left next to the rails / start panel / map-inset. We resolve
  // that clamp once and reuse it in two places: the grid track
  // (so the column actually paints clamped) and `--map-overflow-right`
  // (so the canvas-overflow wrapper extends by the rendered width,
  // not the stored one — keeping the wrapper-width invariant in
  // `gridblock.css` honest when the stored value exceeds the cap).
  const endColumnTrack = endPanel
    ? `min(${endPanelWidthPx}px, calc(100% - var(--gridblock-rail-width) * 2 - ${startPanel ? startPanelWidthPx : 0}px - var(--gridblock-map-inset)))`
    : "0px";
  const endOverflowVar = endPanel
    ? `min(${endPanelWidthPx}px, calc(100vw - var(--gridblock-rail-width) * 2 - ${startPanel ? startPanelWidthPx : 0}px - var(--gridblock-map-inset)))`
    : "0px";

  return (
    // Substrate level 1 — the dashboard is the page floor. Popovers
    // and menus mounted from inside the shell (settings popover,
    // tracks-panel context menu, etc.) lift +2 above this, landing
    // at substrate 3. See src/primitives/Substrate.tsx.
    <Substrate level={1}>
    <div
      className="gridblock-root grid h-screen w-full gap-0 overflow-hidden bg-[var(--gridblock-floor)] p-0 text-[var(--gridblock-text-primary)]"
      style={{
        gridTemplateRows: "var(--gridblock-header-height) 1fr",
      }}
    >
      {header}

      <div
        className="gridblock-grid-cols grid min-h-0 grid-rows-[1fr] gap-0"
        style={{
          // Explicit pixel widths (rather than `auto` + conditional
          // mounting) let the browser transition `grid-template-
          // columns` from 300px → 0px when a panel closes. The map
          // column expands elastically into the freed space in the
          // same paint, which is the moment that gives the layout
          // its "refined" feel — nothing pops, the cells breathe.
          // The inline-end panel column uses a CSS `min(stored, calc(...))`
          // clamp so the operator can drag it as wide as they want
          // — the stored preference is preserved, but the rendered
          // column never exceeds the available width between the
          // rails (minus the start panel if open, minus one map-inset
          // so the map column always keeps a 4px slice and the panel
          // never butts up against the inline-end rail). When the operator
          // drags past that cap, the map column (`1fr`) clamps at
          // `--gridblock-map-inset` (4px) instead of 0, preserving
          // the chrome moat on the rail-adjacent edge of the panel —
          // the same 4px gap that frames the panel against the map
          // in the normal state, so the seam reads consistently at
          // every panel width. No JS resize listener needed; the cap
          // recomputes naturally on every layout pass.
          gridTemplateColumns: [
            "var(--gridblock-rail-width)",
            `${startPanel ? startPanelWidthPx : 0}px`,
            "1fr",
            endColumnTrack,
            "var(--gridblock-rail-width)",
          ].join(" "),
        }}
      >
        <div className="gridblock-edge-inline-end min-h-0 bg-[var(--gridblock-floor)]">
          {startRail}
        </div>

        <div className="gridblock-panel-cell gridblock-panel-cell--start min-h-0">
          <AnimatePresence mode="wait">
            {startPanel ? (
              <motion.div
                key={`${id}-start`}
                initial={prefersReducedMotion ? false : { x: -12, opacity: 0 }}
                animate={
                  prefersReducedMotion
                    ? { x: 0, opacity: 1 }
                    : { x: 0, opacity: 1, transition: PANEL_TRANSITION.enter }
                }
                exit={
                  prefersReducedMotion
                    ? { opacity: 0, transition: { duration: 0 } }
                    : { x: -12, opacity: 0, transition: PANEL_TRANSITION.exit }
                }
                className="gridblock-block h-full"
              >
                {startPanel}
              </motion.div>
            ) : null}
          </AnimatePresence>
          {startPanel && onStartPanelResize ? (
            <GridblockResizeHandle
              side="start"
              widthPx={startPanelWidthPx}
              onResize={onStartPanelResize}
              onClose={onStartPanelClose}
              ariaLabel={startResizeAriaLabel}
              snapMinPx={PANEL_WIDTH_MIN_PX}
              closeThresholdPx={PANEL_WIDTH_CLOSE_THRESHOLD_PX}
              maxPx={startPanelMaxPx}
            />
          ) : null}
        </div>

        {/*
          Map column — 4px page-bg moat around a single floating
          tile. The outer wrapper takes the grid column and paints
          the page background; the inner `.gridblock-block` is
          absolutely positioned with `inset: var(--gridblock-map-inset)`
          so it floats 4px in from every edge of the cell, holding
          the map (plus toolbar/overlays the caller mounts inside
          `map`) as a flex column.
          
          Why absolute, not padding: the inline-end panel's column
          cap clamps the map track at `--gridblock-map-inset` (4px)
          when the operator drags the panel to its max width — never
          0. At that 4px floor, the inner `.gridblock-block` has its
          own `inset: 4px` on all sides, which leaves the absolutely
          positioned content at `4px - 4px - 4px = -4px` width — the
          browser clips it to zero, so the map tile and its 1px
          chrome border vanish, while the 4px outer wrapper keeps
          painting `--gridblock-floor` as the moat between the panel
          and the rail. With the older `padding: 4px` approach the
          inner block would have contributed to the cell's min-content
          and forced an extra ~5px column width, breaking the clean
          single-moat reading. `overflow: hidden` on the outer is
          belt-and-braces in case any inner content tries to escape
          while the absolute rect is collapsing during a drag.
        */}
        <div
          className="relative min-w-0 min-h-0 overflow-hidden bg-[var(--gridblock-floor)]"
          style={{
            // Inherited by `.gridblock-canvas-overflow` inside the map slot
            // so the Cesium canvas can extend laterally into the panel-overlap
            // region by exactly the open panel widths, keeping its CSS box
            // (and Cesium's framebuffer) invariant across panel toggles.
            // The inline-end side uses the same viewport-clamped expression
            // as the grid column so a stored width past the viewport cap
            // doesn't desync the wrapper from what's actually painted.
            ['--map-overflow-left' as string]: startPanel ? `${startPanelWidthPx}px` : '0px',
            ['--map-overflow-right' as string]: endOverflowVar,
          }}
        >
          <div
            className="gridblock-block absolute flex flex-col overflow-hidden bg-[var(--gridblock-panel)]"
            style={{ inset: "var(--gridblock-map-inset)" }}
          >
            {map}
          </div>
        </div>

        <div className="gridblock-panel-cell gridblock-panel-cell--end min-h-0">
          <AnimatePresence mode="wait">
            {endPanel ? (
              <motion.div
                key={`${id}-end`}
                initial={prefersReducedMotion ? false : { x: 12, opacity: 0 }}
                animate={
                  prefersReducedMotion
                    ? { x: 0, opacity: 1 }
                    : { x: 0, opacity: 1, transition: PANEL_TRANSITION.enter }
                }
                exit={
                  prefersReducedMotion
                    ? { opacity: 0, transition: { duration: 0 } }
                    : { x: 12, opacity: 0, transition: PANEL_TRANSITION.exit }
                }
                className="gridblock-block h-full"
              >
                {endPanel}
              </motion.div>
            ) : null}
          </AnimatePresence>
          {endPanel && onEndPanelResize ? (
            <GridblockResizeHandle
              side="end"
              widthPx={endPanelWidthPx}
              onResize={onEndPanelResize}
              onClose={onEndPanelClose}
              ariaLabel={endResizeAriaLabel}
              snapMinPx={PANEL_WIDTH_MIN_PX}
              closeThresholdPx={PANEL_WIDTH_CLOSE_THRESHOLD_PX}
              maxPx={endPanelMaxPx}
            />
          ) : null}
        </div>

        <div className="gridblock-edge-inline-start min-h-0 bg-[var(--gridblock-floor)]">
          {endRail}
        </div>
      </div>
    </div>
    </Substrate>
  );
}
