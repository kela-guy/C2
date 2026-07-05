/**
 * Map-draw overlay — screen-space drawing layer painted on top of the
 * Cesium tactical map.
 *
 * This is the production wrapper around the geo-drawing engine that lives
 * in `geo-entities-sandbox/`. It intentionally treats fingers/mouse in
 * **screen space**: shapes do not reproject when the camera pans or
 * tilts. That keeps the prototype focused on the interaction model the
 * design lab is exploring (annotation chrome, panel-driven inspector)
 * without taking on the cost of Cesium-coupled geometry.
 *
 * The overlay covers the entire map container with `absolute inset-0`
 * and switches its own `pointer-events`:
 *   - `auto` while a draw tool is active so it captures the gesture,
 *   - `none` at rest so the underlying Cesium canvas keeps full pan /
 *     zoom / context-menu interactivity.
 *   - Once a shape is selected, the overlay re-enables pointer events
 *     to host the body / handle drag and click-outside-to-deselect.
 *
 * All shape properties (status, annotation, fill, line, thickness) live
 * in `MapDrawPanel`, not on the shape itself — the overlay only paints
 * shapes and captures gestures. The panel and overlay share state via
 * `<MapDrawProvider>` (see {@link useMapDraw}).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  bbox,
  bboxCenter,
  clampPoint,
  unproject,
  type DraftShape,
  type GeoFillMode,
  type GeoLineStyle,
  type GeoShape,
  type HandleId,
  type Vec2,
} from '../geo-entities-sandbox/drawTypes';
import { SANDBOX_BOUNDS } from '../geo-entities-sandbox/fixtures';
import { ShapeTransformHandles } from '../geo-entities-sandbox/ShapeTransformHandles';
import { MapPin } from '@/lib/icons/central';
import { deleteShapeWithUndo } from './deleteWithUndo';
import { useMapDraw } from './MapDrawProvider';
import { getZOrderActions, type ShapeAction } from './shapeActions';
import { ZONE_TYPE_BY_ID } from './zoneTypes';

export interface MapDrawOverlayProps {
  className?: string;
  /**
   * Fired whenever the selected shape changes. The host uses this to open
   * the drawing panel when the user clicks a shape on the map.
   */
  onSelect?: (id: string | null) => void;
  /**
   * Whether the docked drawing panel is open. When true the overlay is
   * clipped so its SVG contents (and its fixed-positioned labels /
   * chips) never render on top of the panel — drawing feedback stays
   * confined to the visible map area.
   */
  panelOpen?: boolean;
  /**
   * Width in px of the docked panel. Only consulted when
   * {@link panelOpen} is true; used to compute the clip inset.
   */
  panelWidthPx?: number;
  /**
   * Fired while the operator is drafting a shape and the cursor
   * approaches (or leaves) an edge of the visible map area. The
   * velocity is in unitless "screen widths per second" — 0 in each
   * axis means the cursor is safely away from that edge, ±1 means
   * "right at the edge, pan as fast as we can". Dashboard forwards
   * the value to `CesiumTacticalMap.panVelocity`, which drives an
   * rAF camera-slide loop in the primitive.
   *
   * Fires ONLY while `draw.draft` is non-null and only when the
   * velocity actually changes (rounded to 0.1 to dedupe pixel-level
   * churn on pointer moves). Called with `null` on pointer-leave,
   * draft-end and unmount so the host can stop panning cleanly.
   */
  onEdgePan?: (velocity: { vx: number; vy: number } | null) => void;
}

// ── Edge-pan tuning ──────────────────────────────────────────────────────
// Distance from the visible-map edge, in CSS px, at which panning is
// fully engaged. Between 0 and HOT_ZONE_PX the velocity ramps linearly
// from 0 (at HOT_ZONE_PX away) to 1 (right at the edge).
const EDGE_HOT_ZONE_PX = 60;
// Velocity quantum. Rounding to this step makes pointer-move-driven
// updates deduplicate at the React level (the overlay tracks the last
// dispatched value in a ref and skips no-op updates), keeping Dashboard
// re-renders in the low single digits per drag rather than per pixel.
const EDGE_VELOCITY_STEP = 0.1;

/**
 * Compute an edge-pan velocity from a pointer position relative to the
 * SVG rect. The camera is meant to move AWAY from the edge (so new
 * terrain slides in), so a cursor near the LEFT edge produces
 * `vx = -1`.
 *
 * Panel occlusion is folded in by pushing the visible edge on the
 * panel side inward by `panelWidthPx` — the panel edge is treated as
 * a map edge, which is exactly the "finishing point is behind the
 * panel" case the feature exists for.
 *
 * Returns `null` if the cursor is safely outside every hot zone (so
 * the overlay can dispatch a single `null` and shut down the rAF loop
 * cleanly instead of an oscillating `{0, 0}`).
 */
function computeEdgeVelocity(
  rect: DOMRect,
  cursor: { clientX: number; clientY: number },
  panelWidthPx: number,
  isRtl: boolean,
): { vx: number; vy: number } | null {
  // Visible map rect: rect, but with the panel-side edge pushed in.
  const left = rect.left + (isRtl ? 0 : panelWidthPx);
  const right = rect.right - (isRtl ? panelWidthPx : 0);
  const top = rect.top;
  const bottom = rect.bottom;

  const distLeft = cursor.clientX - left;
  const distRight = right - cursor.clientX;
  const distTop = cursor.clientY - top;
  const distBottom = bottom - cursor.clientY;

  const ramp = (d: number) => {
    if (d >= EDGE_HOT_ZONE_PX) return 0;
    if (d <= 0) return 1;
    return 1 - d / EDGE_HOT_ZONE_PX;
  };

  // Camera moves AWAY from the edge. Cursor near LEFT → move camera
  // left → vx < 0.
  let vx = ramp(distRight) - ramp(distLeft);
  let vy = ramp(distTop) - ramp(distBottom);

  vx = Math.max(-1, Math.min(1, vx));
  vy = Math.max(-1, Math.min(1, vy));

  const round = (v: number) => Math.round(v / EDGE_VELOCITY_STEP) * EDGE_VELOCITY_STEP;
  vx = round(vx);
  vy = round(vy);

  if (vx === 0 && vy === 0) return null;
  return { vx, vy };
}

const VIEWBOX_W = 1000;
const VIEWBOX_H = 625;

/**
 * Great-circle distance between two normalized canvas points, in
 * meters. Used by the live draft readout so the user sees a real
 * radius / segment length as they draw — converting normalized -> lat/
 * lng through the sandbox bounds then running the haversine formula.
 */
function metersBetween(a: Vec2, b: Vec2): number {
  const A = unproject(a, SANDBOX_BOUNDS);
  const B = unproject(b, SANDBOX_BOUNDS);
  const R = 6_371_000;
  const dLat = ((B.lat - A.lat) * Math.PI) / 180;
  const dLng = ((B.lng - A.lng) * Math.PI) / 180;
  const lat1 = (A.lat * Math.PI) / 180;
  const lat2 = (B.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Format a meter distance for the draft readout chip. Switches to
 * kilometers above 1 km with two decimals (so a 1.2 km circle reads
 * as `1.20 km`), and drops to one decimal at 10 km+ where the second
 * decimal would just be noise.
 */
function formatMeters(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 2 : 1)} km`;
}

/**
 * Midpoint of the longest segment in a polyline. Used to anchor the
 * persistent length chip on a committed line — the longest segment is
 * the most reliable spot to drop the label so it doesn't overlap a
 * vertex on zig-zag paths.
 */
function midpointOfLongestSegment(points: Vec2[]): Vec2 {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  let bestIdx = 0;
  let bestLen = -1;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = dx * dx + dy * dy;
    if (len > bestLen) {
      bestLen = len;
      bestIdx = i;
    }
  }
  const a = points[bestIdx - 1];
  const b = points[bestIdx];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Status tones kept in step with the panel's `STATUS_OPTIONS`.
const STATUS_TONE: Record<string, { label: string; tone: string }> = {
  low: { label: 'Low', tone: '#34d399' },
  middle: { label: 'Middle', tone: '#facc15' },
  high: { label: 'High', tone: '#f43f5e' },
};

export function MapDrawOverlay({
  className,
  onSelect,
  panelOpen = false,
  panelWidthPx = 0,
  onEdgePan,
}: MapDrawOverlayProps) {
  const {
    draw,
    drawTool,
    coordinatesOpen,
    hoveredShapeId,
    setHoveredShapeId,
    focusedVertex,
    setFocusedVertex,
  } = useMapDraw();
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ---- right-click context menu ---------------------------------------
  // Tracks the viewport-space anchor + which shape the user right-clicked.
  // `null` = menu closed. Opened from the SVG's onContextMenu handler when
  // the event target carries a `data-shape-id`; dismissed by click-away
  // or Escape inside the floating menu.
  const [ctxMenu, setCtxMenu] = useState<
    { x: number; y: number; shapeId: string } | null
  >(null);

  // Active vertex drag (editing a coordinate directly on the map). Holds
  // the shape + vertex index being dragged; `null` when idle.
  const vertexDragRef = useRef<{
    shapeId: string;
    index: number;
    moved: boolean;
  } | null>(null);

  // Notify the host when the selection changes so it can open the panel
  // when a shape is clicked. Kept in a ref so the effect only depends on
  // the id, not the callback identity.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    onSelectRef.current?.(draw.selectedId);
  }, [draw.selectedId]);

  // ---- edge-pan dispatcher ---------------------------------------------
  // Only surface velocity changes to the host — pointer-move fires per
  // pixel, but Dashboard only needs to re-render when the rounded value
  // (see `computeEdgeVelocity`) actually flips. `null` and `{0,0}` are
  // treated as the same "stop" state; the helper never returns `{0,0}`,
  // but this guard covers direct null-out paths (pointer-leave, unmount,
  // draft-end) safely.
  const onEdgePanRef = useRef(onEdgePan);
  onEdgePanRef.current = onEdgePan;
  const lastEdgePanRef = useRef<{ vx: number; vy: number } | null>(null);
  const dispatchEdgePan = useCallback(
    (next: { vx: number; vy: number } | null) => {
      const prev = lastEdgePanRef.current;
      const sameNull = next === null && prev === null;
      const sameVec =
        next !== null && prev !== null && prev.vx === next.vx && prev.vy === next.vy;
      if (sameNull || sameVec) return;
      lastEdgePanRef.current = next;
      onEdgePanRef.current?.(next);
    },
    [],
  );

  // Whenever the draft ends (commit / cancel / tool disarm) or the
  // component unmounts, kill any in-flight pan. The draft dep re-runs
  // this cleanup path on every draft transition, so we always exit
  // through `null` before starting a new session.
  useEffect(() => {
    if (draw.draft) return;
    dispatchEdgePan(null);
  }, [draw.draft, dispatchEdgePan]);
  useEffect(() => {
    return () => {
      onEdgePanRef.current?.(null);
      lastEdgePanRef.current = null;
    };
  }, []);

  // ---- keyboard: Escape cancels draft / deselects; Enter finishes; -----
  // ---- Delete + undo/redo + draft shortcuts ----------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Cmd+Z / Cmd+Shift+Z (and Ctrl+Z / Ctrl+Y on Windows) drive the
      // global undo/redo stack. Skipped when the user is typing in a
      // form field so editor shortcuts keep working in inputs.
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && !inEditable) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) draw.redo();
          else draw.undo();
          return;
        }
        if (key === 'y') {
          // Windows-style redo shortcut.
          e.preventDefault();
          draw.redo();
          return;
        }
      }

      if (inEditable) return;
      if (e.key === 'Escape') {
        if (draw.draft) draw.cancelDraft();
        else if (draw.selectedId) draw.setSelectedId(null);
      } else if (e.key === 'Enter') {
        if (draw.draft) {
          e.preventDefault();
          draw.finishDraft();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // A focused Layers row handles (and preventDefaults) its own
        // Delete via the row's onKeyDown — bail so we don't double-fire
        // on the same shape.
        if (e.defaultPrevented) return;
        // Target the map / right-click selection first, then fall back to
        // the shape currently HIGHLIGHTED in the Layers list (the row
        // under the pointer or with keyboard focus). That's what lets the
        // user open the Layers panel at any time and delete the shape they
        // point at with the Delete key — no need to first "select" it.
        const targetId = draw.selectedId ?? hoveredShapeId;
        if (!targetId) return;
        const target = draw.shapes.find((s) => s.id === targetId);
        // Locked shapes are protected — leave them (and the highlight) be.
        if (!target || target.locked) return;
        e.preventDefault();
        // List-driven delete (no map selection): walk the highlight to the
        // next deletable shape so a stream of Delete presses clears rows
        // one at a time even without moving the mouse.
        if (!draw.selectedId) {
          const list = draw.shapes;
          const idx = list.findIndex((s) => s.id === targetId);
          const successor =
            list.slice(idx + 1).find((s) => !s.locked) ??
            [...list.slice(0, Math.max(idx, 0))].reverse().find((s) => !s.locked) ??
            null;
          setHoveredShapeId(successor ? successor.id : null);
        }
        deleteShapeWithUndo(draw, targetId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [draw, hoveredShapeId, setHoveredShapeId]);

  // ---- pointer geometry helpers --------------------------------------
  const toLocal = useCallback((clientX: number, clientY: number): Vec2 => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left) / Math.max(r.width, 1);
    const y = (clientY - r.top) / Math.max(r.height, 1);
    return clampPoint({ x, y });
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement | null;
    const shapeId = target?.getAttribute('data-shape-id') ?? undefined;
    const local = toLocal(e.clientX, e.clientY);
    // Clicking a committed shape (no draw tool armed) must ALWAYS surface
    // the drawing panel — even when the shape is already the current
    // selection. The `selectedId` effect below only fires on a *change*,
    // so re-clicking a shape whose panel the user had closed would
    // otherwise be a no-op. Notifying the host here closes that gap.
    if (shapeId && !drawTool) {
      onSelectRef.current?.(shapeId);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // Report the surface aspect ratio so the engine's Shift "perfect
    // circle" snap is round on screen (normalized space is stretched to
    // a non-square container). Captured at gesture start — the container
    // won't resize mid-drag.
    const r = e.currentTarget.getBoundingClientRect();
    if (r.height > 0) draw.setCanvasAspect(r.width / r.height);
    // Forward modifier state to the engine — circle draft / resize
    // listens to it for Shift-snap (perfect-circle constraint).
    draw.setShiftKey(e.shiftKey);
    draw.onCanvasPointerDown(local, { onShapeId: shapeId });
    // Every map-draw shape is pinned to its location: polygons, lines and
    // curves can't be moved, scaled or rotated; circles can be resized
    // (via handles) but not moved. So we never start a body-move gesture.
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    draw.setShiftKey(e.shiftKey);
    draw.onCanvasPointerMove(toLocal(e.clientX, e.clientY));
    // Edge-pan only while a draft is actively in progress. Anything else
    // (browsing, hover, transform-handle drag) should leave the map's
    // native pan alone.
    if (draw.draft && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const isRtl =
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute('dir') === 'rtl';
      const effectivePanelPx = panelOpen ? panelWidthPx : 0;
      const v = computeEdgeVelocity(
        rect,
        { clientX: e.clientX, clientY: e.clientY },
        effectivePanelPx,
        isRtl,
      );
      dispatchEdgePan(v);
    }
  };
  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    draw.setShiftKey(e.shiftKey);
    draw.onCanvasPointerUp(toLocal(e.clientX, e.clientY));
  };
  // Cursor leaves the overlay while drafting → stop panning. Without
  // this, dragging past the browser window edge would strand the camera
  // in a permanent slide until the user moved back in.
  const handlePointerLeave = () => {
    dispatchEdgePan(null);
  };

  // ---- on-map vertex editing -----------------------------------------
  // Each vertex is rendered as a numbered HTML chip (no separate dot).
  // The chip itself is the drag handle: pressing it captures the pointer
  // and drags that single vertex to a new map coordinate.
  const beginVertexDrag = (
    e: ReactPointerEvent<HTMLButtonElement>,
    shapeId: string,
    index: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vertexDragRef.current = { shapeId, index, moved: false };
    // Locate this vertex in the panel's Coordinates list immediately, so a
    // plain click (press without drag) still highlights + scrolls to the
    // matching row — the drag itself only kicks in once the pointer moves.
    setFocusedVertex({ shapeId, index });
  };
  const moveVertexDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = vertexDragRef.current;
    if (!drag) return;
    // Defer the undo snapshot until the pointer actually moves: a plain
    // click shouldn't push an empty (no-op) entry onto the undo stack.
    // Once moving, all per-frame updates coalesce into a single undo
    // entry so Cmd+Z rewinds the whole vertex motion at once.
    if (!drag.moved) {
      drag.moved = true;
      draw.beginEditTransaction();
    }
    const p = toLocal(e.clientX, e.clientY);
    const shape = draw.shapes.find((s) => s.id === drag.shapeId);
    if (shape) {
      const points = shape.points.map((pt, i) => (i === drag.index ? p : pt));
      draw.updateShape(drag.shapeId, { points });
    }
  };
  const endVertexDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = vertexDragRef.current;
    if (drag) {
      vertexDragRef.current = null;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      if (drag.moved) draw.endEditTransaction();
    }
  };
  const handleDoubleClick = (e: ReactPointerEvent<SVGSVGElement>) => {
    draw.onCanvasDoubleClick(toLocal(e.clientX, e.clientY));
  };

  // ---- pointer-events policy ------------------------------------------
  // While drawing OR while a shape is selected, we own pointer events
  // (so click-outside deselects). Otherwise the underlying Cesium canvas
  // takes the gesture: we leave the overlay group transparent to clicks
  // but keep the rendered shapes hit-able via their inner `pointerEvents`.
  const interactive = drawTool != null || draw.selectedId != null;
  const surfaceCursor: CSSProperties['cursor'] = drawTool ? 'crosshair' : 'default';

  // Click on bare overlay outside a shape clears selection (and, if no
  // tool is active, releases pointer events back to the map next render).
  const handleSurfaceMouseDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement | null;
    const onShape = target?.getAttribute('data-shape-id');
    const onHandle = target?.getAttribute('data-handle-area');
    if (!onShape && !onHandle && !drawTool) {
      draw.setSelectedId(null);
    }
  };

  // Centered name / type / status labels — rendered in HTML so the
  // font matches the rest of the UI.
  //
  // Visibility rule (per spec): labels are hidden by default and only
  // appear when the user actively engages the shape — on hover or
  // while it's selected. This keeps the map clean when many shapes are
  // present while still surfacing the shape's identity on demand. The
  // selected shape's label is an editable input; hovered-only labels
  // stay read-only.
  const labels = useMemo(() => {
    const el = svgRef.current;
    if (!el) return [];
    const r = el.getBoundingClientRect();
    return draw.shapes
      .filter((s) => !s.hidden && s.kind !== 'point')
      .filter((s) => s.id === draw.selectedId || s.id === hoveredShapeId)
      .map((s) => {
        const b = bbox(s.points);
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        return {
          id: s.id,
          description: s.description ?? '',
          status: s.status,
          zoneType: s.zoneType,
          editable: s.id === draw.selectedId,
          // The zone-type chip is hover-only: it shows while the pointer
          // is over the shape, but disappears for a merely-selected shape
          // so the map stays uncluttered during editing.
          hovered: s.id === hoveredShapeId,
          // Overlay-div-relative (the annotations render as `absolute`
          // children of the `inset-0` overlay, so we drop the viewport
          // origin `r.left`/`r.top`). This keeps them inside the
          // overlay's stacking context + clip-path so they never paint
          // over the docked panel.
          left: cx * r.width,
          top: cy * r.height,
        };
      });
    // shapes drives the re-anchor so labels follow live during transforms.
  }, [draw.shapes, draw.selectedId, hoveredShapeId]);

  // Numbered vertex badges are intentionally never rendered on the map:
  // per the current spec, coordinates live only in the side panel's
  // Coordinates list, and shape metadata (name / type / meters) is
  // hover / selection-only. Kept as an empty memo so downstream code
  // paths (map, key references) stay wired without adding conditionals.
  const vertexLabels = useMemo(
    () =>
      [] as {
        key: string;
        shapeId: string;
        index: number;
        n: number;
        left: number;
        top: number;
      }[],
    [],
  );

  // Draft vertex dots are intentionally never rendered on the map:
  // the user sees each new coordinate appear live in the drawing
  // panel's Coordinates list instead. Kept as an empty memo so the
  // render pipeline stays intact.
  const draftDots = useMemo(
    () =>
      [] as {
        key: string;
        left: number;
        top: number;
        primary: boolean;
        coordText: string;
      }[],
    [],
  );

  // Coordinate vertex dots — clickable markers on each vertex of a
  // shape. Shown for the shape currently open in the panel (the pending
  // / editing shape) so its dots are always available to click, plus any
  // hovered shape. Clicking a dot highlights the matching coordinate row
  // in the panel (via `focusedVertex`) so the user can see where that
  // map point sits in the Coordinates list. Circles expose their center
  // (mirrors the panel's single "Center" row); pins have no vertices.
  const vertexDots = useMemo(() => {
    const out: {
      key: string;
      shapeId: string;
      index: number;
      left: number;
      top: number;
      active: boolean;
      // Polygon / polyline / freehand vertices map 1:1 to a stored point,
      // so they can be dragged to edit that coordinate live. Circles show
      // a synthetic *center* dot (derived from two bbox corners), so their
      // dot stays click-only — resizing is done via the transform handles.
      draggable: boolean;
    }[] = [];
    const el = svgRef.current;
    if (!el) return out;
    const ids = new Set<string>();
    if (hoveredShapeId) ids.add(hoveredShapeId);
    if (focusedVertex) ids.add(focusedVertex.shapeId);
    if (draw.pendingShapeId) ids.add(draw.pendingShapeId);
    const r = el.getBoundingClientRect();
    for (const s of draw.shapes) {
      if (s.hidden || s.kind === 'point' || !ids.has(s.id)) continue;
      const isCircle = s.kind === 'circle';
      const pts =
        isCircle
          ? (() => {
              const a = s.points[0];
              if (!a) return [] as Vec2[];
              const b = s.points[1] ?? a;
              return [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }];
            })()
          : s.points;
      pts.forEach((p, i) => {
        out.push({
          draggable: !isCircle,
          key: `${s.id}-${i}`,
          shapeId: s.id,
          index: i,
          left: p.x * r.width,
          top: p.y * r.height,
          active:
            focusedVertex?.shapeId === s.id && focusedVertex.index === i,
        });
      });
    }

    // In-flight draft — surface a dot for every placed vertex so the user
    // can see the shape's spine take form while they're still drawing.
    // Geometry belongs to the engine during a draft (`draw.draft.points`
    // is the source of truth) so these dots are click-only: they can't be
    // dragged. Circles and points are skipped — circles are a two-corner
    // rubber-band whose "shape" is the growing radius, and points commit
    // instantly. The synthetic `__draft__` id matches the one the panel
    // uses for its editor, so `focusedVertex` bridges the two surfaces.
    const d = draw.draft;
    if (
      d &&
      (d.kind === 'polygon' || d.kind === 'polyline' || d.kind === 'freehand')
    ) {
      d.points.forEach((p, i) => {
        out.push({
          draggable: false,
          key: `__draft__-${i}`,
          shapeId: '__draft__',
          index: i,
          left: p.x * r.width,
          top: p.y * r.height,
          active:
            focusedVertex?.shapeId === '__draft__' && focusedVertex.index === i,
        });
      });
    }

    return out;
  }, [draw.shapes, draw.draft, draw.pendingShapeId, hoveredShapeId, focusedVertex]);

  // Live distance / radius readout for the in-flight draft. Circles
  // show their radius (center -> cursor); polylines / arrows show the
  // current segment length (last placed vertex -> cursor). Rendered
  // as an HTML chip so the text stays crisp under the SVG's
  // non-uniform aspect-ratio stretch.
  const draftMeterChip = useMemo(() => {
    const el = svgRef.current;
    const d = draw.draft;
    if (!el || !d) return null;
    const r = el.getBoundingClientRect();
    const cursor = d.cursor;
    if (!cursor) return null;
    // Circle: cursor sits on the edge; center is the first point.
    if (d.kind === 'circle') {
      const center = d.points[0];
      if (!center) return null;
      return {
        text: `Radius ${formatMeters(metersBetween(center, cursor))}`,
        left: cursor.x * r.width,
        top: cursor.y * r.height,
      };
    }
    // Polyline / arrow: anchor on the last committed vertex; chip
    // floats mid-segment so it follows the cursor as the user moves.
    // Skip rendering when the cursor sits on top of the last vertex
    // (or the user just clicked it and the next vertex hasn't been
    // placed yet) so we don't flash a meaningless "0 m" pill.
    if (d.kind === 'polyline' || d.kind === 'freehand') {
      const last = d.points[d.points.length - 1];
      if (!last) return null;
      const segMeters = metersBetween(last, cursor);
      if (segMeters < 0.5) return null;
      const midX = (last.x + cursor.x) / 2;
      const midY = (last.y + cursor.y) / 2;
      return {
        text: formatMeters(segMeters),
        left: midX * r.width,
        top: midY * r.height,
      };
    }
    return null;
  }, [draw.draft]);

  // Meter chips for committed circles (radius) and polylines (total
  // length). Same visibility rule as the name/type labels: only surface
  // on hover / selection so the map stays clean at rest.
  const shapeMeterChips = useMemo(() => {
    const el = svgRef.current;
    if (!el)
      return [] as { id: string; text: string; left: number; top: number }[];
    const r = el.getBoundingClientRect();
    return draw.shapes.flatMap((s) => {
      if (s.hidden) return [];
      if (s.id !== draw.selectedId && s.id !== hoveredShapeId) return [];
      if (s.kind === 'circle' && s.points.length >= 2) {
        // Circle is stored as bbox corners; reconstruct center + the
        // right-side radius edge so the chip anchors just outside the
        // shape on the east side (clear of the center dot).
        const e = ellipseFromPoints(s.points);
        const edge: Vec2 = { x: e.cx + e.rx, y: e.cy };
        const meters = metersBetween({ x: e.cx, y: e.cy }, edge);
        return [
          {
            id: s.id,
            text: `Radius ${formatMeters(meters)}`,
            left: edge.x * r.width,
            top: edge.y * r.height,
          },
        ];
      }
      if (s.kind === 'polyline' && s.points.length >= 2) {
        // Total length over every segment so a multi-vertex line reads
        // as a single distance figure. Anchored at the midpoint of the
        // longest segment so the chip lands somewhere readable on
        // zig-zag paths instead of overlapping vertices.
        let total = 0;
        for (let i = 1; i < s.points.length; i++) {
          total += metersBetween(s.points[i - 1], s.points[i]);
        }
        const mid = midpointOfLongestSegment(s.points);
        return [
          {
            id: s.id,
            text: formatMeters(total),
            left: mid.x * r.width,
            top: mid.y * r.height,
          },
        ];
      }
      return [];
    });
  }, [draw.shapes, draw.selectedId, hoveredShapeId]);

  // Transform handles for the currently-selected circle, rendered as
  // HTML overlays positioned in screen space. Done in HTML (not SVG)
  // because the underlying SVG uses `preserveAspectRatio="none"` and a
  // raw `<circle>` would render as an ellipse on any non-square viewport
  // — these handles must read as *round* grab points regardless of the
  // map's aspect ratio.
  const transformHandles = useMemo(() => {
    const el = svgRef.current;
    const sel = draw.selectedShape;
    if (
      !el ||
      !sel ||
      sel.hidden ||
      sel.locked ||
      sel.kind !== 'circle'
    ) {
      return [] as {
        id: HandleId;
        left: number;
        top: number;
        cursor: string;
        origin: Vec2;
        shapeId: string;
      }[];
    }
    const r = el.getBoundingClientRect();
    const b = bbox(sel.points);
    const c = bboxCenter(b);
    const positions: { id: HandleId; cx: number; cy: number; cursor: string }[] = [
      { id: 'nw', cx: b.minX, cy: b.minY, cursor: 'nwse-resize' },
      { id: 'n', cx: c.x, cy: b.minY, cursor: 'ns-resize' },
      { id: 'ne', cx: b.maxX, cy: b.minY, cursor: 'nesw-resize' },
      { id: 'e', cx: b.maxX, cy: c.y, cursor: 'ew-resize' },
      { id: 'se', cx: b.maxX, cy: b.maxY, cursor: 'nwse-resize' },
      { id: 's', cx: c.x, cy: b.maxY, cursor: 'ns-resize' },
      { id: 'sw', cx: b.minX, cy: b.maxY, cursor: 'nesw-resize' },
      { id: 'w', cx: b.minX, cy: c.y, cursor: 'ew-resize' },
    ];
    return positions.map((p) => ({
      id: p.id,
      left: p.cx * r.width,
      top: p.cy * r.height,
      cursor: p.cursor,
      origin: { x: p.cx, y: p.cy },
      shapeId: sel.id,
    }));
  }, [draw.selectedShape]);

  // Pin glyphs for every committed point shape. Rendered as HTML so the
  // MapPin icon stays crisp regardless of the SVG's non-uniform stretch.
  // The tip is anchored at the dropped coordinate (translate -50% / -100%).
  const pinMarkers = useMemo(() => {
    const el = svgRef.current;
    if (!el) return [] as { id: string; color: string; left: number; top: number; selected: boolean }[];
    const r = el.getBoundingClientRect();
    return draw.shapes
      .filter((s) => !s.hidden && s.kind === 'point')
      .map((s) => {
        const p = s.points[0] ?? { x: 0.5, y: 0.5 };
        return {
          id: s.id,
          color: s.color,
          left: p.x * r.width,
          top: p.y * r.height,
          selected: s.id === draw.selectedId,
        };
      });
  }, [draw.shapes, draw.selectedId]);

  // Direction-aware clip inset so drawing NEVER paints over the docked
  // panel — the panel occupies the inline-start edge (left in LTR,
  // right in RTL). We compute the physical side at render time from
  // the document direction and use `clip-path: inset(...)`. Because the
  // on-map annotations (labels / dots / meter chips / handles) render as
  // `absolute` children of this overlay div — not `fixed` — the clip AND
  // this element's own `z-20` stacking context both apply to them, so
  // they can never spill over (or above) the panel.
  const clip = (() => {
    if (!panelOpen || !panelWidthPx) return undefined;
    const isRtl =
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('dir') === 'rtl';
    return isRtl
      ? `inset(0 ${panelWidthPx}px 0 0)`
      : `inset(0 0 0 ${panelWidthPx}px)`;
  })();

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 ${className ?? ''}`.trim()}
      data-map-draw-overlay="true"
      style={clip ? { clipPath: clip } : undefined}
    >
      <svg
        ref={svgRef}
        className={`block size-full select-none ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="none"
        style={{ cursor: surfaceCursor, touchAction: drawTool ? 'none' : 'auto' }}
        onPointerDown={(e) => {
          // Right-click is reserved for the context menu — never let it
          // start a draw / select / clear gesture.
          if (e.button === 2) return;
          handleSurfaceMouseDown(e);
          handlePointerDown(e);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          const target = e.target as SVGElement | null;
          const shapeId = target?.getAttribute('data-shape-id');
          if (!shapeId) {
            setCtxMenu(null);
            return;
          }
          // Right-click also selects the shape so the panel + menu agree.
          draw.setSelectedId(shapeId);
          setCtxMenu({ x: e.clientX, y: e.clientY, shapeId });
        }}
      >
        {draw.shapes.map((shape) =>
          shape.hidden ? null : (
            <ShapeBody
              key={shape.id}
              shape={shape}
              selected={shape.id === draw.selectedId}
              hovered={shape.id === hoveredShapeId}
              interactive={interactive}
              onHoverChange={(isHovered) =>
                setHoveredShapeId(isHovered ? shape.id : null)
              }
            />
          ),
        )}

        {draw.draft && <DraftPreview draft={draw.draft} />}

        {/* Only circles expose transform handles (to expand). Polygons /
            lines / curves are fully pinned, so no handles are shown.
            The 8 scale handles are rendered as HTML overlays *below*
            (see `transformHandlesHtml`) so they stay perfect circles
            despite the SVG's non-uniform stretch; only the dashed
            bounding-box rect comes from this component. */}
        {draw.selectedShape &&
          !draw.selectedShape.hidden &&
          !draw.selectedShape.locked &&
          draw.selectedShape.kind === 'circle' && (
          <ShapeTransformHandles
            shape={draw.selectedShape}
            width={VIEWBOX_W}
            height={VIEWBOX_H}
            allowRotate={false}
            renderHandles={false}
            onHandleDown={(handle, _e, origin) =>
              draw.beginHandleDrag(handle, draw.selectedShape!.id, origin)
            }
          />
        )}
      </svg>

      {labels.map((l) => (
        <div
          key={l.id}
          className="absolute z-30"
          style={{
            left: l.left,
            top: l.top,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* On-shape zone-type chip. "General" has been removed as
                a type, so every shape with a `zoneType` gets a chip.
                A small colored swatch mirrors the STATUS chip below —
                the same swatch appears in the panel's Type Select, so
                the two surfaces read consistently. Hover/selection-only
                (the parent label pipeline already gates this). */}
            {l.hovered && l.zoneType && ZONE_TYPE_BY_ID[l.zoneType] && (
              <span className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: ZONE_TYPE_BY_ID[l.zoneType].color }}
                />
                {ZONE_TYPE_BY_ID[l.zoneType].label}
              </span>
            )}
            {l.status && STATUS_TONE[l.status] && (
              <span
                className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: STATUS_TONE[l.status].tone }}
                />
                {STATUS_TONE[l.status].label}
              </span>
            )}
            {/* On-shape name label.
                Visibility rules (per user spec):
                  - Empty description       -> render nothing at all.
                    No "Add name" placeholder, no empty input — the
                    panel's `NameField` is the exclusive surface for
                    first-time naming, and only commits (Enter/blur)
                    push the name onto the shape.
                  - Non-empty + selected    -> editable inline input
                    (live updates `description` per keystroke; this is
                    the on-shape rename surface).
                  - Non-empty + unselected  -> read-only text label. */}
            {l.description.trim() &&
              (l.editable ? (
                <input
                  value={l.description}
                  onChange={(e) =>
                    draw.updateShape(l.id, { description: e.target.value })
                  }
                  aria-label="Shape name"
                  spellCheck={false}
                  className="pointer-events-auto w-44 bg-transparent text-center text-[13px] font-semibold text-white caret-white outline-none [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]"
                />
              ) : (
                <span className="pointer-events-none text-balance text-center text-[13px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
                  {l.description}
                </span>
              ))}
          </div>
        </div>
      ))}

      {vertexLabels.map((v) => (
        <button
          key={v.key}
          type="button"
          aria-label={`Edit point ${v.n}`}
          title={`Drag to move point ${v.n}`}
          onPointerDown={(e) => beginVertexDrag(e, v.shapeId, v.index)}
          onPointerMove={moveVertexDrag}
          onPointerUp={endVertexDrag}
          onPointerCancel={endVertexDrag}
          // Fixed size = true circle (no width drift from variable-width
          // digit content). Numbers ≥10 stay legible at size-5.
          className="pointer-events-auto absolute z-30 inline-flex size-5 cursor-grab touch-none items-center justify-center rounded-full bg-black/75 text-[10px] font-semibold leading-none text-white ring-1 ring-white/50 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          style={{
            left: v.left,
            top: v.top,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {v.n}
        </button>
      ))}

      {/* Coordinate vertex dots — draggable markers on each vertex of the
          shape open in the panel (and any hovered shape). Dragging a dot
          moves that vertex on the map and updates the matching row in the
          panel's Coordinates list live; a plain click just highlights +
          scrolls to that row. Circle dots (a synthetic center) are
          click-only. The active dot (last touched) gets a larger, tinted
          ring and shows a grab cursor when it can be dragged. */}
      {vertexDots.map((dot) => (
        <button
          key={dot.key}
          type="button"
          aria-label={
            dot.draggable
              ? `Drag to move coordinate ${dot.index + 1}`
              : `Show coordinate ${dot.index + 1} in panel`
          }
          title={dot.draggable ? 'Drag to move this point' : 'Show in coordinates list'}
          onPointerDown={
            dot.draggable
              ? (e) => beginVertexDrag(e, dot.shapeId, dot.index)
              : undefined
          }
          onPointerMove={dot.draggable ? moveVertexDrag : undefined}
          onPointerUp={dot.draggable ? endVertexDrag : undefined}
          onPointerCancel={dot.draggable ? endVertexDrag : undefined}
          onClick={
            dot.draggable
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  // Draft dots sit above the SVG and swallow clicks that
                  // would otherwise hit the canvas close threshold. Tapping
                  // the first vertex (polygon close) or the last vertex
                  // (polyline finish) commits the draft immediately.
                  if (dot.shapeId === '__draft__' && draw.draft) {
                    const last = draw.draft.points.length - 1;
                    if (dot.index === 0 || dot.index === last) {
                      draw.finishDraft();
                      return;
                    }
                  }
                  setFocusedVertex({ shapeId: dot.shapeId, index: dot.index });
                }
          }
          className={`pointer-events-auto absolute z-30 grid touch-none place-items-center rounded-full transition-[width,height] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
            dot.draggable ? 'cursor-grab active:cursor-grabbing' : ''
          } ${
            dot.active
              ? 'size-3.5 bg-sky-400 ring-2 ring-sky-200/80 shadow-[0_0_0_2px_rgba(0,0,0,0.55)]'
              : 'size-2.5 bg-white ring-1 ring-black/70 hover:size-3 hover:bg-sky-200'
          }`}
          style={{
            left: dot.left,
            top: dot.top,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Live distance / radius chip — follows the cursor while the
          user is drawing a circle (shows the radius from center) or a
          polyline / arrow (shows the current segment length). Rendered
          as an HTML pill so the text is crisp under the SVG aspect
          stretch, and offset slightly so it sits below-right of the
          cursor instead of directly under it. */}
      {draftMeterChip && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-30 rounded-md border border-white/15 bg-black/75 px-1.5 py-0.5 text-[11px] font-medium leading-tight tabular-nums text-white shadow-sm backdrop-blur-sm"
          style={{
            left: draftMeterChip.left + 12,
            top: draftMeterChip.top + 12,
          }}
        >
          {draftMeterChip.text}
        </div>
      )}

      {/* Persistent meters labels on every committed circle (radius)
          and polyline (total length). Same pill style as the live
          draft chip so the readout stays consistent before and after
          commit. */}
      {shapeMeterChips.map((chip) => (
        <div
          key={chip.id}
          aria-hidden
          className="pointer-events-none absolute z-30 rounded-md border border-white/15 bg-black/75 px-1.5 py-0.5 text-[11px] font-medium leading-tight tabular-nums text-white shadow-sm backdrop-blur-sm"
          style={{
            left: chip.left + 8,
            top: chip.top - 8,
            transform: 'translate(0, -50%)',
          }}
        >
          {chip.text}
        </div>
      ))}

      {/* Draft vertex dots — true circles in HTML space (SVG circles would
          be stretched into ovals by the canvas's non-uniform aspect).
          Each dot carries a small coordinate pill anchored just to its
          bottom-right so the user reads the lat/lng at the exact
          moment they click. The first vertex is subtly highlighted so
          "click here to close the polygon" still reads as an affordance. */}
      {draftDots.map((dot) => (
        <div key={dot.key}>
          <div
            aria-hidden
            className={`pointer-events-none absolute z-30 rounded-full ${
              dot.primary
                ? 'size-2.5 bg-white ring-2 ring-black/70'
                : 'size-2 bg-white ring-1 ring-black/70'
            }`}
            style={{
              left: dot.left,
              top: dot.top,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute z-30 rounded border bg-black/75 px-1 py-[1px] font-mono text-[10px] leading-tight tabular-nums text-white/90 shadow-sm backdrop-blur-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.7)] ${
              dot.primary ? 'border-white/40' : 'border-white/10'
            }`}
            style={{
              left: dot.left + 8,
              top: dot.top + 8,
            }}
          >
            {dot.coordText}
          </div>
        </div>
      ))}

      {/* Transform handles for the selected circle. HTML-rendered so
          they stay perfect circles regardless of the SVG's non-uniform
          stretch — SVG `<circle>` here would render as an ellipse. The
          handle captures the pointer itself and forwards move/up to the
          draw engine via `toLocal` so dragging keeps tracking even when
          the cursor leaves the bounding rect of the original handle. */}
      {transformHandles.map((h) => (
        <div
          key={h.id}
          aria-label={`Resize ${h.id}`}
          role="button"
          className="pointer-events-auto absolute z-30 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)] hover:scale-110 transition-transform"
          style={{
            left: h.left,
            top: h.top,
            cursor: h.cursor,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            const svg = svgRef.current;
            if (svg) {
              const r = svg.getBoundingClientRect();
              if (r.height > 0) draw.setCanvasAspect(r.width / r.height);
            }
            draw.setShiftKey(e.shiftKey);
            draw.beginHandleDrag(h.id, h.shapeId, h.origin);
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
            draw.setShiftKey(e.shiftKey);
            draw.onCanvasPointerMove(toLocal(e.clientX, e.clientY));
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            draw.setShiftKey(e.shiftKey);
            draw.onCanvasPointerUp(toLocal(e.clientX, e.clientY));
          }}
          onPointerCancel={(e) => {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            draw.onCanvasPointerUp(toLocal(e.clientX, e.clientY));
          }}
        />
      ))}

      {/* Map-pin glyphs for every point shape, anchored tip-down on the
          dropped coordinate. Pointer events are passthrough — selection is
          driven by the SVG hit area in `ShapeBody`. */}
      {pinMarkers.map((m) => (
        <div
          key={m.id}
          className="pointer-events-none absolute z-30"
          style={{
            left: m.left,
            top: m.top,
            transform: 'translate(-50%, -100%)',
            color: m.color,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))',
          }}
        >
          <MapPin size={28} />
          {m.selected && (
            <div
              aria-hidden
              className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-white/85 ring-2 ring-black/50"
            />
          )}
        </div>
      ))}

      {ctxMenu && (
        <ShapeContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          actions={getZOrderActions(draw, ctxMenu.shapeId)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShapeContextMenu — lightweight fixed-position menu opened by right-click
// on a shape. Styled to match the Radix ContextMenu primitive used in the
// Layers list so the on-map and in-list menus read as one family. Closes
// on click-away, Escape, or after an action is invoked.
// ---------------------------------------------------------------------------
function ShapeContextMenu({
  x,
  y,
  actions,
  onClose,
}: {
  x: number;
  y: number;
  actions: ShapeAction[];
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onDocPointerDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDocPointerDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      role="menu"
      className="pointer-events-auto fixed z-50 min-w-[10rem] overflow-hidden rounded-lg bg-[#1a1a1a]/95 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      style={{ top: y, left: x }}
    >
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          role="menuitem"
          disabled={a.disabled}
          onClick={() => {
            if (a.disabled) return;
            a.onSelect();
            onClose();
          }}
          className={`flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-xs transition-colors focus:outline-none ${
            a.destructive
              ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:hover:bg-transparent disabled:hover:text-red-400'
              : 'text-zinc-300 hover:bg-white/5 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-300'
          } disabled:cursor-default disabled:opacity-40`}
        >
          <a.Icon
            size={14}
            className={a.destructive ? 'text-red-400/70' : 'text-zinc-500'}
          />
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rendering helpers (mirrors GeoDrawCanvas but reads new style fields).
// ---------------------------------------------------------------------------

function ShapeBody({
  shape,
  // `selected` is intentionally accepted but unused: prior versions
  // bumped the stroke width when selected; we now keep a constant
  // hairline stroke and signal selection via vertex chips + panel
  // chrome instead. Kept on the signature so the call site stays
  // stable for any future per-selection treatment (e.g. selection
  // halo).
  selected: _selected,
  hovered,
  interactive,
  onHoverChange,
}: {
  shape: GeoShape;
  selected: boolean;
  /** Hovered in the Layers list OR on the map — paints a fill highlight. */
  hovered: boolean;
  interactive: boolean;
  /** Forwarded to the SVG hit area so map-hover mirrors list-hover. */
  onHoverChange: (hovered: boolean) => void;
}) {
  // Shared pointer handlers for the SVG hit areas. Hovering a shape on
  // the map mirrors hovering its row in the Geo Entities list — both
  // feed the same `hoveredShapeId` so the visible highlight is
  // identical.
  const hoverProps = {
    onPointerEnter: () => onHoverChange(true),
    onPointerLeave: () => onHoverChange(false),
  };
  // Outline color is independent of fill (set via the Color section's
  // Outline chip). Falls back to the fill color when nothing's set, so
  // shapes without an explicit outline still draw something. Stroke
  // opacity mirrors fill's — an editable 0-100% inline with the
  // outline chip in the panel.
  const strokeBase = shape.strokeColor ?? shape.color;
  const strokeAlpha =
    typeof shape.strokeOpacity === 'number' &&
    Number.isFinite(shape.strokeOpacity)
      ? Math.max(0, Math.min(1, shape.strokeOpacity))
      : 1;
  const stroke = strokeAlpha < 1 ? withAlpha(strokeBase, strokeAlpha) : strokeBase;
  const lineStyle: GeoLineStyle = shape.lineStyle ?? 'solid';
  const fillMode: GeoFillMode = shape.fillMode ?? 'fill';
  // Hairline default to match the on-commit width in `useGeoDraw`.
  // Selected shapes get the same 0.5 px stroke — the selection state
  // is already communicated by the numbered vertex chips and the
  // panel's inspector chrome, so we don't need a thicker outline as a
  // second selection cue.
  const strokeWidth = shape.strokeWidth ?? 0.5;
  // "None" is genuinely without stroke — no painted line and no selection
  // halo. Selection is still legible via the vertex dots (below).
  const noStroke = lineStyle === 'none';
  const dasharray = lineStyle === 'dashed' ? '8 6' : undefined;

  // Fill MUST derive from the explicit fill input (`shape.color`), NOT
  // from `stroke`. Previously the fill was tinted with the stroke
  // color, which meant picking an Outline color visually changed the
  // fill — the user reported this as "fill also changes to line color".
  // Keeping the two derivations separate makes Fill / Outline chips
  // truly independent end-to-end.
  let fill: string;
  if (fillMode === 'none') {
    fill = 'none';
  } else if (fillMode === 'transparent') {
    fill = withAlpha(shape.color, 0.05);
  } else {
    // The Fill chip's inline % input drives fill opacity live. When
    // it's zero, still paint fully transparent rather than snapping
    // back to the default hint. Fallback is 0.3 (matching the commit
    // default) so shapes without an explicit fillOpacity read as a
    // tint over the map instead of a solid block.
    const alpha =
      typeof shape.fillOpacity === 'number' &&
      Number.isFinite(shape.fillOpacity)
        ? Math.max(0, Math.min(1, shape.fillOpacity))
        : 0.3;
    fill = withAlpha(shape.color, alpha);
  }

  // Hover highlight — applied when the user hovers the corresponding
  // row in the Geo Entities list. The user explicitly asked for the
  // whole shape to light up, not just the outline, so we paint:
  //   - closed shapes (polygon / freehand / circle / point hit area):
  //     a translucent white FILL overlay across the entire body.
  //   - open shapes (polyline / arrow): a soft outline glow that does
  //     NOT touch the real stroke width (lines must not appear to
  //     thicken on hover).
  // Both treatments are paint-only (`pointerEvents:none`) and render
  // BEFORE the main body so the real shape sits on top.
  const HOVER_FILL = 'rgba(255,255,255,0.22)';
  const HOVER_OUTLINE = 'rgba(255,255,255,0.55)';
  const HOVER_OUTLINE_WIDTH = 1.5;

  if (shape.kind === 'point') {
    // The visible pin glyph is an HTML overlay (see `pinMarkers` in the
    // parent). Here we only emit an invisible circular hit area so the
    // SVG layer can still capture clicks for selection / context menu.
    const p = shape.points[0] ?? { x: 0.5, y: 0.5 };
    const cx = p.x * VIEWBOX_W;
    const cy = p.y * VIEWBOX_H;
    return (
      <g data-shape-id={shape.id}>
        <circle
          data-shape-id={shape.id}
          cx={cx}
          cy={cy}
          r={14}
          fill="transparent"
          style={{ cursor: 'pointer', pointerEvents: interactive ? 'auto' : 'all' }}
          {...hoverProps}
        />
        {hovered && (
          // Highlight bubble painted AFTER the hit area so it sits on
          // top of the pin glyph (which is an HTML overlay above the
          // SVG) — the bubble bleeds around the icon as a soft halo.
          <circle
            cx={cx}
            cy={cy}
            r={14}
            fill={HOVER_FILL}
            stroke={HOVER_OUTLINE}
            strokeWidth={HOVER_OUTLINE_WIDTH}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </g>
    );
  }

  if (shape.kind === 'circle') {
    const e = ellipseFromPoints(shape.points);
    const cx = e.cx * VIEWBOX_W;
    const cy = e.cy * VIEWBOX_H;
    const rx = e.rx * VIEWBOX_W;
    const ry = e.ry * VIEWBOX_H;
    return (
      <g>
        <ellipse
          data-shape-id={shape.id}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={fill}
          stroke={noStroke ? 'none' : stroke}
          strokeWidth={noStroke ? 0 : strokeWidth}
          strokeDasharray={dasharray}
          style={{ cursor: 'pointer', pointerEvents: 'all' }}
          {...hoverProps}
        />
        {hovered && (
          // Whole-ellipse fill overlay painted ON TOP of the shape's
          // own fill so the entire body brightens uniformly — a thin
          // outline ring alone wasn't reading as "this shape is
          // highlighted".
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={HOVER_FILL}
            stroke={HOVER_OUTLINE}
            strokeWidth={HOVER_OUTLINE_WIDTH}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </g>
    );
  }

  const d = pathFromPoints(shape.points, shape.kind === 'polygon' || shape.kind === 'freehand');
  const isArrow = shape.tool === 'arrow';
  const arrowHead =
    isArrow && shape.points.length >= 2
      ? arrowHeadPath(
          shape.points[shape.points.length - 2],
          shape.points[shape.points.length - 1],
          strokeWidth,
        )
      : null;

  const isPolyline = shape.kind === 'polyline';
  return (
    <g>
      {/* Polyline / arrow hover halo renders UNDER the real line so
          the crisp line on top keeps its exact stroke width and
          color — the user explicitly didn't want lines to thicken on
          hover. A wider, translucent duplicate path reads as a soft
          glow without touching the line itself. */}
      {hovered && isPolyline && (
        <path
          d={d}
          fill="none"
          stroke={HOVER_OUTLINE}
          strokeWidth={Math.max(strokeWidth + 3, 4)}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.4}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <path
        data-shape-id={shape.id}
        d={d}
        fill={isPolyline ? 'none' : fill}
        stroke={noStroke ? 'none' : stroke}
        strokeWidth={noStroke ? 0 : strokeWidth}
        strokeDasharray={dasharray}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        {...hoverProps}
      />
      {arrowHead && (
        <path
          data-shape-id={shape.id}
          d={arrowHead}
          fill={noStroke ? stroke : stroke}
          stroke="none"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Closed shapes (polygon / freehand): translucent white overlay
          ON TOP of the real fill so the entire body brightens
          uniformly. A thin hairline outline anchors the highlight
          shape visually. */}
      {hovered && !isPolyline && (
        <path
          d={d}
          fill={HOVER_FILL}
          stroke={HOVER_OUTLINE}
          strokeWidth={HOVER_OUTLINE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Vertices of the selected shape are drawn as numbered, draggable
          chips in the HTML overlay (see `vertexLabels`) — no SVG dot. */}
    </g>
  );
}

function DraftPreview({ draft }: { draft: DraftShape }) {
  if (draft.points.length === 0) return null;

  if (draft.kind === 'point') {
    // Point tools commit immediately on click — there's no draft preview
    // window to show. Branch kept defensively in case timing ever flips.
    return null;
  }

  if (draft.kind === 'circle') {
    const center = draft.points[0];
    const edge = draft.cursor ?? center;
    const rx = Math.abs(edge.x - center.x);
    const ry = Math.abs(edge.y - center.y);
    return (
      <g pointerEvents="none" style={{ filter: DRAFT_SHADOW }}>
        <ellipse
          cx={center.x * VIEWBOX_W}
          cy={center.y * VIEWBOX_H}
          rx={rx * VIEWBOX_W}
          ry={ry * VIEWBOX_H}
          fill="rgba(255,255,255,0.10)"
          stroke="#ffffff"
          // Match the committed-shape default (0.5 px hairline) so the
          // draft preview reads at the same weight as what you'll get
          // once you finish the shape — no "thick-while-drawing then
          // snaps thin on commit" surprise.
          strokeWidth={0.5}
        />
        {/* Center dot rendered as an HTML circle (see `draftDots`) so it
            stays a true circle under the SVG's non-uniform aspect. */}
      </g>
    );
  }

  const cursor = draft.cursor;
  const previewPoints = cursor && draft.kind !== 'freehand' ? [...draft.points, cursor] : draft.points;
  const close = draft.kind === 'polygon';
  const d = pathFromPoints(previewPoints, close);
  const isArrow = draft.tool === 'arrow';
  // Draft stroke matches the committed default (0.5 px) — see comment
  // on the circle ellipse above for the why. The arrowhead size still
  // scales with this width.
  const draftStrokeWidth = 0.5;
  const arrowHead =
    isArrow && previewPoints.length >= 2
      ? arrowHeadPath(
          previewPoints[previewPoints.length - 2],
          previewPoints[previewPoints.length - 1],
          draftStrokeWidth,
        )
      : null;

  return (
    <g pointerEvents="none" style={{ filter: DRAFT_SHADOW }}>
      <path
        d={d}
        fill={close ? 'rgba(255,255,255,0.10)' : 'none'}
        stroke="#ffffff"
        strokeWidth={draftStrokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {arrowHead && <path d={arrowHead} fill="#ffffff" stroke="none" />}
      {/* Polygon / polyline vertex dots are drawn as HTML circles in the
          parent overlay (see `draftDots`) so they aren't squashed by the
          SVG's non-uniform aspect ratio. Freehand intentionally has no
          per-point dots (the stroke speaks for itself). */}
    </g>
  );
}

// Subtle dark shadow under the white draft preview so the rubber-band line
// stays legible over light basemaps (snow, deserts, paper styles) where a
// pure-white stroke would otherwise disappear.
const DRAFT_SHADOW = 'drop-shadow(0 0 1px rgba(0,0,0,0.55))';

// ---------------------------------------------------------------------------
// Geometry / color helpers (small, local copies — keeps the overlay
// independent of the sandbox's fixtures).
// ---------------------------------------------------------------------------

/**
 * Derive an ellipse (center + radii, all normalized) from a circle's two
 * bbox-corner points. Tolerates the points being in any order.
 */
function ellipseFromPoints(points: { x: number; y: number }[]): {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
} {
  const a = points[0] ?? { x: 0.5, y: 0.5 };
  const b = points[1] ?? a;
  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    rx: Math.abs(b.x - a.x) / 2,
    ry: Math.abs(b.y - a.y) / 2,
  };
}

/**
 * Build an SVG path describing a filled arrowhead triangle anchored at
 * `tip`, pointing along the direction from `from` -> `tip`. The triangle
 * scales with `strokeWidth` so the head reads proportional to the line.
 *
 * Coordinates are normalized; multiplied by VIEWBOX_W/H so the resulting
 * path sits in the same SVG viewBox as the body line. Note: because the
 * parent SVG uses `preserveAspectRatio="none"`, the arrowhead shares the
 * same non-uniform stretch as the line — by anchoring on the line's tip
 * with offsets in viewBox space, the visual still reads as "head at tip".
 */
function arrowHeadPath(
  from: { x: number; y: number },
  tip: { x: number; y: number },
  strokeWidth: number,
): string {
  const tx = tip.x * VIEWBOX_W;
  const ty = tip.y * VIEWBOX_H;
  const fx = from.x * VIEWBOX_W;
  const fy = from.y * VIEWBOX_H;
  const dx = tx - fx;
  const dy = ty - fy;
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) return '';
  // Head size scales with stroke width (with a floor so thin lines still
  // get a readable arrowhead) but is capped so heavy strokes don't blow
  // out into a giant wedge.
  const headLen = Math.max(10, Math.min(28, strokeWidth * 6 + 8));
  const headWidth = headLen * 0.7;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular (normal) unit vector.
  const nx = -uy;
  const ny = ux;
  const baseX = tx - ux * headLen;
  const baseY = ty - uy * headLen;
  const leftX = baseX + nx * (headWidth / 2);
  const leftY = baseY + ny * (headWidth / 2);
  const rightX = baseX - nx * (headWidth / 2);
  const rightY = baseY - ny * (headWidth / 2);
  return `M ${tx} ${ty} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
}

function pathFromPoints(points: { x: number; y: number }[], close: boolean): string {
  if (points.length === 0) return '';
  const head = `M ${points[0].x * VIEWBOX_W} ${points[0].y * VIEWBOX_H}`;
  const rest = points
    .slice(1)
    .map((p) => `L ${p.x * VIEWBOX_W} ${p.y * VIEWBOX_H}`)
    .join(' ');
  return `${head} ${rest}${close ? ' Z' : ''}`;
}

function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let r: number;
  let g: number;
  let b: number;
  if (m[1].length === 3) {
    r = parseInt(m[1][0] + m[1][0], 16);
    g = parseInt(m[1][1] + m[1][1], 16);
    b = parseInt(m[1][2] + m[1][2], 16);
  } else {
    r = parseInt(m[1].slice(0, 2), 16);
    g = parseInt(m[1].slice(2, 4), 16);
    b = parseInt(m[1].slice(4, 6), 16);
  }
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Re-export the public tool id alphabet so callers that previously
 * imported `MapDrawTool` from this module keep working. The canonical
 * definition lives in {@link ./MapDrawProvider}.
 */
export type { MapDrawTool } from './MapDrawProvider';
