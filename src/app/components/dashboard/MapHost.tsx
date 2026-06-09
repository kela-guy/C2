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
import { CesiumTacticalMap } from "@/app/components/CesiumTacticalMap";
import { CesiumErrorBoundary } from "@/app/components/CesiumErrorBoundary";
import type { CesiumTacticalMapProps } from "@/app/components/CesiumTacticalMap";
import { useViewedAt } from "@/app/state/ViewedAtContext";
import { useStrings } from "@/lib/intl";
import { MapToolbar } from "./MapToolbar";
import { LidarWindow } from "./LidarWindow";
import type { MapViewMode } from "./mapViewMode";

interface MapHostProps extends CesiumTacticalMapProps {
  mapViewMode: MapViewMode;
  onMapViewModeChange: (mode: MapViewMode) => void;
  /** Demo LiDAR point-cloud window, anchored bottom-right over the map. */
  lidarWindowOpen?: boolean;
  onCloseLidarWindow?: () => void;
  lidarWindowCloseLabel?: string;
  /**
   * Optional footer slot mounted below the map and above any other
   * sibling chrome inside the map's `.gridblock-block`. Used by the
   * dashboard to host the History timeline; absent in live mode so
   * the map gets the full vertical space.
   *
   * When mounted, the canvas extends downward by exactly the footer
   * height, so Cesium's CSS box stays invariant instead of squeezing.
   */
  bottomSlot?: ReactNode;
}

function MapHostImpl({
  bottomSlot,
  mapViewMode,
  onMapViewModeChange,
  lidarWindowOpen,
  onCloseLidarWindow,
  lidarWindowCloseLabel = "Close",
  ...mapProps
}: MapHostProps) {
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
        {lidarWindowOpen && onCloseLidarWindow ? (
          <LidarWindow
            onClose={onCloseLidarWindow}
            closeAriaLabel={lidarWindowCloseLabel}
          />
        ) : null}
      </div>
      {bottomSlot ? (
        <div className="relative shrink-0 overflow-hidden">
          {bottomSlot}
        </div>
      ) : null}
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
    !viewedAt.isLive ? (
      <div className="pointer-events-none absolute inset-0 z-30" aria-hidden>
        <div className="absolute inset-0 shadow-[inset_0_0_0_2px_var(--accent-historical-soft)]" />
        <button
          type="button"
          onClick={viewedAt.reset}
          className="pointer-events-auto absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2 py-0.5 bg-[var(--accent-historical-soft)] text-xs font-medium text-slate-12 cursor-pointer transition-colors hover:bg-[color-mix(in_oklch,var(--accent-historical-soft)_88%,white)]"
        >
          {t.gridblock.returnToLive}
        </button>
      </div>
    ) : null
  );
}

// Memoized so unrelated dashboard re-renders (e.g. the right-rail tab
// switching, devices panel state changes) don't force the entire
// Cesium map subtree to reconcile. Sim-driven props (targets,
// friendlyDrones) still flow through normally — when those change the
// memo correctly invalidates and re-renders.
export const MapHost = memo(MapHostImpl);
MapHost.displayName = "MapHost";
