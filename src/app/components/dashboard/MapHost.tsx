/**
 * MapHost — composes the map cell of `<GridblockShell>`. Stacks
 * the chrome topbar (`<MapToolbar />`) above the Cesium tactical
 * map, both inside a single error boundary so a WebGL/scene
 * crash can't take the whole dashboard down with it.
 *
 * The cell parent is already a `flex flex-col` (see `GridblockShell`),
 * so the toolbar takes its natural 28px height and the map fills
 * the rest with `flex-1 min-h-0`. `min-h-0` is load-bearing —
 * without it the map's intrinsic content height pushes the
 * toolbar off-row in some browser-engine layout passes.
 *
 * `bottomSlot` is the map cell's own footer — used by History to
 * mount the timeline scrubber as a strip between the rails. Kept
 * here (not at shell level) so the timeline is scoped to the map
 * column and rails extend full-height.
 *
 * Map settings (basemap view) are wired via `mapViewMode` /
 * `onMapViewModeChange`. Drop-pin, ruler, and coord search remain
 * stubs until their flows land.
 */

import { memo, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CesiumTacticalMap } from "@/app/components/CesiumTacticalMap";
import { CesiumErrorBoundary } from "@/app/components/CesiumErrorBoundary";
import type { CesiumTacticalMapProps } from "@/app/components/CesiumTacticalMap";
import { useViewedAt } from "@/app/state/ViewedAtContext";
import { useStrings } from "@/lib/intl";
import { MapToolbar } from "./MapToolbar";
import type { MapViewMode } from "./mapViewMode";

// Easing + duration are intentionally identical to the CSS transition
// on `.gridblock-canvas-overflow`'s `bottom` (gridblock.css). The two
// run in lockstep: as the wrapper grows, the canvas extends downward
// by the same amount, keeping Cesium's CSS box invariant. Any drift
// here (different curve, different duration) breathes the canvas
// box mid-animation and triggers per-frame ResizeObserver fires.
const BOTTOM_SLOT_TRANSITION = {
  duration: 0.24,
  ease: [0.65, 0, 0.35, 1] as const,
};

interface MapHostProps extends CesiumTacticalMapProps {
  mapViewMode: MapViewMode;
  onMapViewModeChange: (mode: MapViewMode) => void;
  /**
   * Optional footer slot mounted below the map and above any other
   * sibling chrome inside the map's `.gridblock-block`. Used by the
   * dashboard to host the History timeline; absent in live mode so
   * the map gets the full vertical space.
   *
   * The reveal pairs a `height: 0 -> auto` tween on the wrapper with
   * a synchronized `bottom: 0 -> -footerHeight` CSS transition on
   * `.gridblock-canvas-overflow`. The canvas extends downward by
   * exactly the amount the visible map area loses, so Cesium's CSS
   * box stays invariant — same trick the open-panel reveal uses on
   * the inline axis. Visually: the map content does NOT squeeze;
   * the footer rises into place on top of a stable map.
   */
  bottomSlot?: ReactNode;
}

function MapHostImpl({
  bottomSlot,
  mapViewMode,
  onMapViewModeChange,
  ...mapProps
}: MapHostProps) {
  const prefersReducedMotion = useReducedMotion();
  // `--map-overflow-bottom` drives the `.gridblock-canvas-overflow`
  // wrapper's negative `bottom` so the Cesium canvas keeps its full
  // visible height even after the footer wrapper takes 33px from
  // the cell. Set on the flex-1 wrapper so it inherits down to the
  // canvas-overflow div inside CesiumTacticalMap.
  return (
    <CesiumErrorBoundary>
      <MapToolbar
        mapViewMode={mapViewMode}
        onMapViewModeChange={onMapViewModeChange}
      />
      <div
        className="relative min-h-0 flex-1"
        style={{
          ["--map-overflow-bottom" as string]: bottomSlot
            ? "var(--gridblock-footer-height)"
            : "0px",
        }}
      >
        <CesiumTacticalMap {...mapProps} mapViewMode={mapViewMode} />
        <HistoryModeOverlay />
      </div>
      <AnimatePresence initial={false}>
        {bottomSlot ? (
          <motion.div
            key="map-bottom-slot"
            // `relative` is load-bearing: with the canvas-overflow
            // extending downward into this wrapper's row, the footer
            // needs to paint above the canvas. Both wrapper and the
            // flex-1 above become positioned-auto siblings; document
            // order then puts this wrapper on top.
            className="relative shrink-0 overflow-hidden"
            initial={prefersReducedMotion ? false : { height: 0 }}
            animate={{
              height: "auto",
              transition: prefersReducedMotion
                ? { duration: 0 }
                : BOTTOM_SLOT_TRANSITION,
            }}
            exit={
              prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    height: 0,
                    transition: BOTTOM_SLOT_TRANSITION,
                  }
            }
          >
            {bottomSlot}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </CesiumErrorBoundary>
  );
}

/**
 * Shown whenever the dashboard is scrubbed off the live edge. The
 * `--accent-historical-soft` ring traces the inside of the map
 * content area (its closest positioned ancestor is the `relative`
 * wrapper around the Cesium canvas, so the ring stops above the
 * History timeline footer rather than painting across it) and the
 * pill at center-bottom snaps the clock back to now.
 */
function HistoryModeOverlay() {
  const viewedAt = useViewedAt();
  const t = useStrings();
  return (
    <AnimatePresence>
      {!viewedAt.isLive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none absolute inset-0 z-30"
          aria-hidden
        >
          <div className="absolute inset-0 shadow-[inset_0_0_0_2px_var(--accent-historical-soft)]" />
          <button
            type="button"
            onClick={viewedAt.reset}
            className="pointer-events-auto absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2 py-0.5 bg-[var(--accent-historical-soft)] text-xs font-medium text-slate-12 cursor-pointer transition-colors hover:bg-[color-mix(in_oklch,var(--accent-historical-soft)_88%,white)]"
          >
            {t.gridblock.returnToLive}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Memoized so unrelated dashboard re-renders (e.g. the right-rail tab
// switching, devices panel state changes) don't force the entire
// Cesium map subtree to reconcile. Sim-driven props (targets,
// friendlyDrones) still flow through normally — when those change the
// memo correctly invalidates and re-renders.
export const MapHost = memo(MapHostImpl);
MapHost.displayName = "MapHost";
