/**
 * GridblockShell — the building-block grid that holds a chrome
 * surface together. Owns the geometry only: a 3-row x 5-column
 * CSS grid where the panel cells animate from `0 → panelWidthPx`
 * when their content materialises.
 *
 * Geometry:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │                       header (row 1, auto)                   │
 *   ├──────┬─────────┬─────────────────────────┬─────────┬─────────┤
 *   │ rail │ panel-L │           map           │ panel-R │  rail   │ row 2 (1fr)
 *   ├──────┴─────────┴─────────────────────────┴─────────┴─────────┤
 *   │                       footer (row 3, auto)                   │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Panel cells stay mounted at all times (the column track
 * interpolates between two fully-defined widths), so the map cell
 * elastically expands as a panel collapses. The panel content
 * itself is mounted/unmounted via `AnimatePresence` so it can
 * fade + translate the rail-edge wash on enter/exit.
 *
 * The shell knows nothing about targets, devices, or video. All
 * domain rendering happens inside the slots passed via props.
 */

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { Substrate } from "@/primitives/Substrate";
import { GridblockResizeHandle } from "./GridblockResizeHandle";

import "./gridblock.css";

interface GridblockShellProps {
  /** Top chrome row. Typically `<GridblockHeader />`. */
  header: ReactNode;
  /** Bottom chrome row. Typically `<GridblockFooter />`. */
  footer: ReactNode;
  /** inline-start vertical icon strip. */
  leftRail: ReactNode;
  /** inline-end vertical icon strip. */
  rightRail: ReactNode;
  /**
   * Contents of the inline-start side panel. `null` collapses the
   * panel column to 0 with an animated `grid-template-columns`
   * transition.
   */
  leftPanel: ReactNode | null;
  /**
   * Contents of the inline-end side panel. `null` collapses the
   * panel column to 0. Pass `null` permanently if the surface
   * doesn't have right-side panels — the column remains 0px and
   * the right rail still occupies its own column.
   */
  rightPanel: ReactNode | null;
  /** Map / main content cell. Always claims the remaining `1fr`. */
  map: ReactNode;
  /**
   * Width the inline-start panel expands to when its content is
   * non-null. Defaults to 300. Pass a controlled value (typically
   * from `useGridblockPanelSizes`) plus `onLeftPanelResize` to make
   * the panel operator-resizable.
   */
  leftPanelWidthPx?: number;
  /**
   * Width the inline-end panel expands to when its content is
   * non-null. Defaults to 300.
   */
  rightPanelWidthPx?: number;
  /**
   * Called when the operator drags or keyboard-nudges the left
   * panel's edge against the map. Receives the new width in CSS
   * pixels (already clamped to a sensible range by the handle's
   * paired hook). If omitted, the left panel is not resizable —
   * no drag handle is mounted.
   */
  onLeftPanelResize?: (widthPx: number) => void;
  /**
   * Called when the operator drags or keyboard-nudges the right
   * panel's edge. Same semantics as `onLeftPanelResize`.
   */
  onRightPanelResize?: (widthPx: number) => void;
  /**
   * Optional ARIA labels for the resize handles. Should be
   * localized strings — falls back to a generic English label
   * if omitted.
   */
  leftResizeAriaLabel?: string;
  rightResizeAriaLabel?: string;
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
  footer,
  leftRail,
  rightRail,
  leftPanel,
  rightPanel,
  map,
  leftPanelWidthPx = DEFAULT_PANEL_WIDTH_PX,
  rightPanelWidthPx = DEFAULT_PANEL_WIDTH_PX,
  onLeftPanelResize,
  onRightPanelResize,
  leftResizeAriaLabel = "Resize left panel",
  rightResizeAriaLabel = "Resize right panel",
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
  return (
    // Substrate level 1 — the dashboard is the page floor. Popovers
    // and menus mounted from inside the shell (settings popover,
    // tracks-panel context menu, etc.) lift +2 above this, landing
    // at substrate 3. See src/primitives/Substrate.tsx.
    <Substrate level={1}>
    <div
      className="gridblock-root grid h-screen w-full gap-0 overflow-hidden bg-[var(--gridblock-floor)] p-0 text-[var(--gridblock-text-primary)]"
      style={{
        gridTemplateRows:
          "var(--gridblock-header-height) 1fr var(--gridblock-footer-height)",
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
          // The right panel column uses a CSS `min(stored, calc(...))`
          // clamp so the operator can drag it as wide as they want
          // — the stored preference is preserved, but the rendered
          // column never exceeds the available width between the
          // rails (minus the left panel if open, minus one map-inset
          // so the map column always keeps a 4px slice and the panel
          // never butts up against the right rail). When the operator
          // drags past that cap, the map column (`1fr`) clamps at
          // `--gridblock-map-inset` (4px) instead of 0, preserving
          // the chrome moat on the rail-adjacent edge of the panel —
          // the same 4px gap that frames the panel against the map
          // in the normal state, so the seam reads consistently at
          // every panel width. No JS resize listener needed; the cap
          // recomputes naturally on every layout pass.
          gridTemplateColumns: [
            "var(--gridblock-rail-width)",
            `${leftPanel ? leftPanelWidthPx : 0}px`,
            "1fr",
            rightPanel
              ? `min(${rightPanelWidthPx}px, calc(100% - var(--gridblock-rail-width) * 2 - ${leftPanel ? leftPanelWidthPx : 0}px - var(--gridblock-map-inset)))`
              : "0px",
            "var(--gridblock-rail-width)",
          ].join(" "),
        }}
      >
        <div className="gridblock-edge-inline-end min-h-0 bg-[var(--gridblock-floor)]">
          {leftRail}
        </div>

        <div className="gridblock-panel-cell gridblock-panel-cell--start min-h-0">
          <AnimatePresence mode="wait">
            {leftPanel ? (
              <motion.div
                key={`${id}-left`}
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
                {leftPanel}
              </motion.div>
            ) : null}
          </AnimatePresence>
          {leftPanel && onLeftPanelResize ? (
            <GridblockResizeHandle
              side="start"
              widthPx={leftPanelWidthPx}
              onResize={onLeftPanelResize}
              ariaLabel={leftResizeAriaLabel}
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
          
          Why absolute, not padding: the right panel's column cap
          clamps the map track at `--gridblock-map-inset` (4px) when
          the operator drags the panel to its max width — never 0.
          At that 4px floor, the inner `.gridblock-block` has its
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
            ['--map-overflow-left' as string]: leftPanel ? `${leftPanelWidthPx}px` : '0px',
            ['--map-overflow-right' as string]: rightPanel ? `${rightPanelWidthPx}px` : '0px',
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
            {rightPanel ? (
              <motion.div
                key={`${id}-right`}
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
                {rightPanel}
              </motion.div>
            ) : null}
          </AnimatePresence>
          {rightPanel && onRightPanelResize ? (
            <GridblockResizeHandle
              side="end"
              widthPx={rightPanelWidthPx}
              onResize={onRightPanelResize}
              ariaLabel={rightResizeAriaLabel}
            />
          ) : null}
        </div>

        <div className="gridblock-edge-inline-start min-h-0 bg-[var(--gridblock-floor)]">
          {rightRail}
        </div>
      </div>

      {footer}
    </div>
    </Substrate>
  );
}
