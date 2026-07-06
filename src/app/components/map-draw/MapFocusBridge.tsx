/**
 * MapFocusBridge — glue between the geo-drawing engine's `focusRequest`
 * bus and the Cesium camera focus API on Dashboard.
 *
 * The panel's "Center on map" action calls `draw.requestFocus(shapeId)`
 * which bumps `focusRequest`. This component watches that bus, projects
 * the shape's centroid to lat/lng using the same sandbox bounds
 * mapping the rest of the drawing feature uses, and forwards it to the
 * Dashboard's `mapFocusRequest` state (which in turn feeds Cesium's
 * `smoothFocusRequest` prop).
 *
 * Kept in its own component so it can live INSIDE `<MapDrawProvider>`
 * (needed to call `useMapDraw`) while Dashboard's other state (like
 * `setMapFocusRequest`) stays at the top level and is passed in as a
 * callback.
 */

import { useEffect } from 'react';
import { bbox } from '../geo-entities-sandbox/drawTypes';
import { unproject } from '../geo-entities-sandbox/drawTypes';
import { SANDBOX_BOUNDS } from '../geo-entities-sandbox/fixtures';
import { useMapDraw } from './MapDrawProvider';

export interface MapFocusBridgeProps {
  /**
   * Push a new focus target at the given geographic coordinates. The
   * Dashboard's `mapFocusRequest` state accepts a `{ lat, lon }` pair
   * and forwards it to Cesium; passing `null` clears the request so a
   * subsequent identical request re-fires the fly-to.
   */
  onFocus: (coords: { lat: number; lon: number }) => void;
}

export function MapFocusBridge({ onFocus }: MapFocusBridgeProps) {
  const { draw } = useMapDraw();
  const focusRequest = draw.focusRequest;

  useEffect(() => {
    if (!focusRequest) return;
    const shape = draw.shapes.find((s) => s.id === focusRequest.shapeId);
    if (!shape || shape.points.length === 0) return;
    // If the request carries a specific point (a single vertex the user
    // clicked in the panel's Coordinates list), fly straight to it.
    // Otherwise fall back to the shape centroid = center of the bounding
    // box. Both matches what the on-map name / type chips anchor to.
    let target = focusRequest.point;
    if (!target) {
      const b = bbox(shape.points);
      target = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    }
    const { lat, lng } = unproject(target, SANDBOX_BOUNDS);
    onFocus({ lat, lon: lng });
    // Dependencies: `focusRequest.id` is the version bumped by
    // `requestFocus` so re-clicking on the same shape still fires;
    // `shapes` is included so we always read the shape's latest
    // geometry, not a stale snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.id]);

  return null;
}
