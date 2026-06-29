/**
 * Map-draw shared state provider.
 *
 * Owns the single `useGeoDraw()` instance for the Dashboard map-draw flow
 * so both `MapDrawOverlay` (renders shapes / captures pointer gestures on
 * the map) and `MapDrawPanel` (tool picker + inspector + actions) read
 * and mutate the same drawing state.
 *
 * The "user-facing" tool surface (`MapDrawTool`) is the polygon/line/pin/circle
 * set exposed by the rail. Internally the engine still uses its full
 * {@link import('../geo-entities-sandbox/drawTypes').GeoToolId} alphabet,
 * so this provider derives the public tool from `draw.activeToolId` and
 * translates `setDrawTool(null)` into a clean drop into Select mode (with
 * any in-flight draft cancelled).
 *
 * Mounted inside `Dashboard`; both the overlay and the panel consume it
 * via {@link useMapDraw}.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useGeoDraw, type UseGeoDrawResult } from '../geo-entities-sandbox/useGeoDraw';

/**
 * Public tool ids the Dashboard rail / panel exposes. Maps onto the
 * engine's `polygon` / `line` / `point` / `circle` ids one-to-one.
 * `point` drops a pin (single-click commits) instead of a freehand curve.
 */
export type MapDrawTool = 'polygon' | 'line' | 'point' | 'circle';

export interface MapDrawContextValue {
  /** Underlying drawing engine. Same object both consumers share. */
  draw: UseGeoDrawResult;
  /** Active drawing tool from the rail's perspective; `null` = select/idle. */
  drawTool: MapDrawTool | null;
  /** Switch the active tool. `null` parks the engine in Select mode. */
  setDrawTool: (tool: MapDrawTool | null) => void;
  /**
   * Whether the panel's Coordinates section is currently expanded. The
   * map overlay reads this to decide whether to render the numbered,
   * draggable vertex chips — they appear only while the user is in
   * "edit coordinates" mode, not just because a shape is selected.
   */
  coordinatesOpen: boolean;
  setCoordinatesOpen: (open: boolean) => void;
}

const MapDrawContext = createContext<MapDrawContextValue | null>(null);

function isMapDrawTool(id: string): id is MapDrawTool {
  return id === 'polygon' || id === 'line' || id === 'point' || id === 'circle';
}

export function MapDrawProvider({ children }: { children: ReactNode }) {
  const draw = useGeoDraw();
  const [coordinatesOpen, setCoordinatesOpen] = useState(false);

  const drawTool: MapDrawTool | null = isMapDrawTool(draw.activeToolId)
    ? draw.activeToolId
    : null;

  const setDrawTool = (tool: MapDrawTool | null) => {
    if (tool === null) {
      if (draw.draft) draw.cancelDraft();
      draw.setActiveTool('select');
      return;
    }
    if (draw.draft && draw.activeToolId !== tool) draw.cancelDraft();
    draw.setActiveTool(tool);
    draw.setSelectedId(null);
  };

  return (
    <MapDrawContext.Provider
      value={{ draw, drawTool, setDrawTool, coordinatesOpen, setCoordinatesOpen }}
    >
      {children}
    </MapDrawContext.Provider>
  );
}

export function useMapDraw(): MapDrawContextValue {
  const value = useContext(MapDrawContext);
  if (!value) {
    throw new Error('useMapDraw must be used within a <MapDrawProvider>');
  }
  return value;
}
