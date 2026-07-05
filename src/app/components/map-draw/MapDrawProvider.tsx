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
 * engine's `polygon` / `line` / `point` / `circle` / `arrow` ids
 * one-to-one. `point` drops a pin (single-click commits). Freehand
 * has been retired from the panel/floating strip; only the four
 * canonical primitives remain in the user-facing surface.
 */
export type MapDrawTool =
  | 'polygon'
  | 'line'
  | 'arrow'
  | 'point'
  | 'circle';

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
  /**
   * Id of the shape the user is currently hovering in the Layers list.
   * The overlay renders a thin highlight halo around the matching
   * shape on the map so the user can see which list row maps to which
   * polygon without having to click. Lightweight UI-only state, never
   * persisted.
   */
  hoveredShapeId: string | null;
  setHoveredShapeId: (id: string | null) => void;
  /**
   * The coordinate vertex the user is currently pointing at from the
   * panel's Coordinates list (via the per-row "show on map" dot). The
   * overlay renders the vertex dots for this shape and highlights the
   * matching dot so the user can see exactly which coordinate they're
   * looking at. `null` when no row is being located. UI-only.
   */
  focusedVertex: { shapeId: string; index: number } | null;
  setFocusedVertex: (v: { shapeId: string; index: number } | null) => void;
}

const MapDrawContext = createContext<MapDrawContextValue | null>(null);

/** Read by Dashboard panel-switch handlers outside React context updates. */
export const mapDrawPanelCloseBlockedRef = { current: false };

function isMapDrawTool(id: string): id is MapDrawTool {
  return (
    id === 'polygon' ||
    id === 'line' ||
    id === 'arrow' ||
    id === 'point' ||
    id === 'circle'
  );
}

export function MapDrawProvider({ children }: { children: ReactNode }) {
  const draw = useGeoDraw();
  // Coordinates section is always open by default now — the panel no
  // longer renders it as a collapsible, so the shared "are the numbered
  // vertex chips on the map visible?" bit defaults to true and matches
  // the panel state at all times.
  const [coordinatesOpen, setCoordinatesOpen] = useState(true);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [focusedVertex, setFocusedVertex] = useState<
    { shapeId: string; index: number } | null
  >(null);

  const drawTool: MapDrawTool | null = isMapDrawTool(draw.activeToolId)
    ? draw.activeToolId
    : null;

  const setDrawTool = (tool: MapDrawTool | null) => {
    if (tool === null) {
      if (draw.draft) draw.cancelDraft();
      draw.setActiveTool('select');
      return;
    }
    // Block arming a fresh tool only while Save is live in the panel —
    // brand-new draws, or existing shapes with unsaved edits. Opening
    // a layer row for read-only inspection keeps tools available.
    if (draw.requiresSaveBeforeDraw) return;
    // Read-only layer inspection (Save inactive) — dismiss the editor
    // before arming a draw tool so the panel doesn't stay on the detail
    // view while the user starts a fresh shape.
    if (draw.pendingShapeId) draw.cancelPending();
    if (draw.draft && draw.activeToolId !== tool) draw.cancelDraft();
    draw.setActiveTool(tool);
    draw.setSelectedId(null);
  };

  mapDrawPanelCloseBlockedRef.current = draw.blocksPanelClose;

  return (
    <MapDrawContext.Provider
      value={{
        draw,
        drawTool,
        setDrawTool,
        coordinatesOpen,
        setCoordinatesOpen,
        hoveredShapeId,
        setHoveredShapeId,
        focusedVertex,
        setFocusedVertex,
      }}
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
