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
 * Toolbar action callbacks aren't wired yet; the buttons render
 * as no-ops with proper aria-labels until the underlying flows
 * (drop-pin location, ruler, coord search, map settings) land.
 */

import { memo } from "react";
import { CesiumTacticalMap } from "@/app/components/CesiumTacticalMap";
import { CesiumErrorBoundary } from "@/app/components/CesiumErrorBoundary";
import type { CesiumTacticalMapProps } from "@/app/components/CesiumTacticalMap";
import { MapToolbar } from "./MapToolbar";

interface MapHostProps extends CesiumTacticalMapProps {}

function MapHostImpl(props: MapHostProps) {
  return (
    <CesiumErrorBoundary>
      <MapToolbar />
      <div className="relative min-h-0 flex-1">
        <CesiumTacticalMap {...props} />
      </div>
    </CesiumErrorBoundary>
  );
}

// Memoized so unrelated dashboard re-renders (e.g. the right-rail tab
// switching, devices panel state changes) don't force the entire
// Cesium map subtree to reconcile. Sim-driven props (targets,
// friendlyDrones) still flow through normally — when those change the
// memo correctly invalidates and re-renders.
export const MapHost = memo(MapHostImpl);
MapHost.displayName = "MapHost";
