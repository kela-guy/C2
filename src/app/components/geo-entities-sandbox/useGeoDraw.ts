/**
 * Geo Drawing Sandbox — controller hook.
 *
 * Central state machine for the drawing surface. Holds the persisted
 * `shapes[]`, the in-progress `draft`, the currently active tool, and the
 * selected shape id. All canvas-side handlers (`onCanvasPointerDown`,
 * `onCanvasPointerMove`, …) are returned here so the canvas component is
 * thin presentation, and the toolbar variants only ever call back into
 * `setActiveTool`, `updateShape`, `deleteShape`, etc.
 *
 * Coordinates are normalized (0..1). Pointer events are converted to
 * normalized canvas-space by the canvas' `localPoint` helper before being
 * handed to this hook, so the controller never sees pixels.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  bbox,
  bboxCenter,
  clampPoint,
  makeShapeId,
  rotatePoints,
  scalePoints,
  translatePoints,
  type DraftShape,
  type GeoShape,
  type GeoToolId,
  type HandleId,
  type Vec2,
} from './drawTypes';
import { toolById } from './drawTools';

/**
 * Distance (in normalized units) within which clicking the first vertex of an
 * in-progress polygon/polyline closes the shape. The canvas is normalized to
 * 1.0 across, so 0.02 ≈ 2% of the canvas width.
 */
const CLOSE_THRESHOLD = 0.02;

/** Minimum number of points before a polygon/polyline can be finished. */
const MIN_POLY_POINTS = 2;

/** Minimum freehand path length (in points) to count as a real drawing. */
const MIN_FREEHAND_POINTS = 3;

/** Minimum circle radius (normalized) below which the draw is discarded. */
const MIN_CIRCLE_RADIUS = 0.01;

/** Drag operations the controller can be in the middle of. */
type Drag =
  | { kind: 'idle' }
  | { kind: 'freehand' }
  | { kind: 'circle' }
  | {
      kind: 'transform';
      handle: HandleId;
      shapeId: string;
      /** Original (pre-drag) point set so each move computes from a stable base. */
      original: Vec2[];
      /** Pointer position when the drag started. */
      origin: Vec2;
      /** Anchor used for scale (typically the opposite corner / opposite edge). */
      anchor: Vec2;
      /** Center of the original bbox — used for rotation. */
      center: Vec2;
      /** Initial bbox — used to derive scale factors. */
      width: number;
      height: number;
      /** Initial angle from center -> pointer (rotation handle). */
      startAngle: number;
    };

export interface UseGeoDrawResult {
  shapes: GeoShape[];
  draft: DraftShape | null;
  activeToolId: GeoToolId;
  selectedId: string | null;
  selectedShape: GeoShape | null;

  setActiveTool: (id: GeoToolId) => void;
  setSelectedId: (id: string | null) => void;
  updateShape: (id: string, patch: Partial<GeoShape>) => void;
  deleteShape: (id: string) => void;
  /**
   * Restore the most recently deleted shape back to its original index in
   * the layer stack (most-recent-first). Returns the restored shape's id,
   * or `null` if nothing was available to restore.
   */
  restoreLastDeleted: () => string | null;
  clearAll: () => void;
  cancelDraft: () => void;
  finishDraft: () => void;
  /** Remove the last placed vertex of the in-progress draft (undo step). */
  undoLastPoint: () => void;

  // Canvas-side pointer handlers. The canvas converts events to normalized
  // points before forwarding.
  onCanvasPointerDown: (p: Vec2, opts?: { onShapeId?: string }) => void;
  onCanvasPointerMove: (p: Vec2) => void;
  onCanvasPointerUp: (p: Vec2) => void;
  onCanvasDoubleClick: (p: Vec2) => void;

  // Transform handles drag lifecycle.
  beginHandleDrag: (handle: HandleId, shapeId: string, origin: Vec2) => void;
  isDraggingHandle: boolean;
}

export function useGeoDraw(initial: GeoShape[] = []): UseGeoDrawResult {
  const [shapes, setShapes] = useState<GeoShape[]>(initial);
  const [activeToolId, setActiveToolId] = useState<GeoToolId>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const dragRef = useRef<Drag>({ kind: 'idle' });
  const [draggingTick, setDraggingTick] = useState(0);
  // Stack of recently deleted shapes (LIFO) so `restoreLastDeleted` can
  // walk back through accidental deletes. We hang on to the original
  // index so a restore drops the shape back into its old slot in the
  // layers list instead of always appending to the end.
  const deletedStackRef = useRef<{ shape: GeoShape; index: number }[]>([]);

  const selectedShape = useMemo(
    () => shapes.find((s) => s.id === selectedId) ?? null,
    [shapes, selectedId],
  );

  // ----- shape mutations -----------------------------------------------------

  const updateShape = useCallback((id: string, patch: Partial<GeoShape>) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteShape = useCallback(
    (id: string) => {
      setShapes((prev) => {
        const index = prev.findIndex((s) => s.id === id);
        if (index < 0) return prev;
        // Snapshot the deleted shape so `restoreLastDeleted` can put it
        // back in the exact same layer position.
        deletedStackRef.current.push({ shape: { ...prev[index] }, index });
        return prev.filter((s) => s.id !== id);
      });
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const restoreLastDeleted = useCallback((): string | null => {
    const entry = deletedStackRef.current.pop();
    if (!entry) return null;
    setShapes((prev) => {
      // Bail if the same id has somehow been re-added (e.g. from a future
      // import) — we never want duplicate ids in the layer list.
      if (prev.some((s) => s.id === entry.shape.id)) return prev;
      const insertAt = Math.min(entry.index, prev.length);
      const next = prev.slice();
      next.splice(insertAt, 0, entry.shape);
      return next;
    });
    setSelectedId(entry.shape.id);
    return entry.shape.id;
  }, []);

  const clearAll = useCallback(() => {
    setShapes([]);
    setSelectedId(null);
    setDraft(null);
    // Bulk clears reset the undo history too — restoring a single shape
    // after a `clearAll` would feel confusing.
    deletedStackRef.current = [];
  }, []);

  // ----- draft / draw flow ---------------------------------------------------

  const defaultName = useCallback(
    (tool: GeoToolId) => {
      const meta = toolById(tool);
      const count = shapes.filter((s) => s.tool === tool).length + 1;
      return `${meta.label} ${count}`;
    },
    [shapes],
  );

  const commitDraft = useCallback(
    (d: DraftShape) => {
      const meta = toolById(d.tool);
      const id = makeShapeId(d.tool);
      const shape: GeoShape = {
        id,
        tool: d.tool,
        kind: d.kind,
        name: defaultName(d.tool),
        description: '',
        color: meta.color,
        fillOpacity: meta.fillOpacity,
        points: d.points.map(clampPoint),
      };
      setShapes((prev) => [...prev, shape]);
      setSelectedId(id);
      setDraft(null);
      setActiveToolId('select');
    },
    [defaultName],
  );

  const cancelDraft = useCallback(() => setDraft(null), []);

  const undoLastPoint = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      // Point drafts are committed instantly, so there's nothing to step
      // back through; drop the (degenerate) draft entirely.
      if (prev.kind === 'point') return null;
      const points = prev.points.slice(0, -1);
      // Removing the last remaining vertex ends the draw cleanly.
      if (points.length === 0) return null;
      return { ...prev, points, cursor: prev.cursor };
    });
  }, []);

  const finishDraft = useCallback(() => {
    setDraft((current) => {
      if (!current) return current;
      if (current.kind === 'point') return current;
      // Circles commit on pointer-up (drag-to-size), not via Enter / dbl-click.
      if (current.kind === 'circle') return current;
      if (current.kind === 'polygon' && current.points.length < 3) return null;
      if (current.kind === 'polyline' && current.points.length < MIN_POLY_POINTS)
        return null;
      if (current.kind === 'freehand' && current.points.length < MIN_FREEHAND_POINTS)
        return null;
      commitDraft(current);
      return null;
    });
  }, [commitDraft]);

  // ----- canvas pointer handlers --------------------------------------------

  const onCanvasPointerDown = useCallback(
    (p: Vec2, opts?: { onShapeId?: string }) => {
      const tool = activeToolId;
      // Hitting an existing shape always selects it — even if a drawing tool
      // is active — provided there's no draft mid-flight. This is what makes
      // the "click a shape → see Move / Rotate / Delete" flow possible
      // without an explicit Select cursor in the toolbar.
      if (opts?.onShapeId && !draft) {
        setActiveToolId('select');
        setSelectedId(opts.onShapeId);
        return;
      }
      // Select tool with no shape under cursor: clear selection.
      if (tool === 'select') {
        setSelectedId(opts?.onShapeId ?? null);
        return;
      }
      const meta = toolById(tool);
      const point = clampPoint(p);

      // Point tools commit immediately on click.
      if (meta.kind === 'point') {
        const draftShape: DraftShape = {
          tool,
          kind: 'point',
          points: [point],
          cursor: null,
        };
        commitDraft(draftShape);
        return;
      }

      // Freehand: start a drag-recording session.
      if (meta.kind === 'freehand') {
        dragRef.current = { kind: 'freehand' };
        setDraft({ tool, kind: 'freehand', points: [point], cursor: point });
        return;
      }

      // Circle: press sets the center, drag grows the radius, release
      // commits. The draft keeps the center in `points[0]` and tracks the
      // live edge in `cursor`.
      if (meta.kind === 'circle') {
        dragRef.current = { kind: 'circle' };
        setDraft({ tool, kind: 'circle', points: [point], cursor: point });
        return;
      }

      // Polygon / polyline: vertex-by-vertex.
      if (meta.kind === 'polygon' || meta.kind === 'polyline') {
        setDraft((prev) => {
          if (!prev || prev.tool !== tool) {
            return { tool, kind: meta.kind as 'polygon' | 'polyline', points: [point], cursor: point };
          }
          // Click near the first vertex closes a polygon/polyline.
          if (
            prev.points.length >= MIN_POLY_POINTS &&
            distance(prev.points[0], point) < CLOSE_THRESHOLD
          ) {
            // Defer the commit so we don't setState during a render branch.
            queueMicrotask(() => commitDraft(prev));
            return prev;
          }
          return { ...prev, points: [...prev.points, point], cursor: point };
        });
      }
    },
    [activeToolId, commitDraft, draft],
  );

  const onCanvasPointerMove = useCallback((p: Vec2) => {
    const point = clampPoint(p);
    const drag = dragRef.current;

    // Freehand: append while pressed.
    if (drag.kind === 'freehand') {
      setDraft((prev) =>
        prev
          ? { ...prev, points: [...prev.points, point], cursor: point }
          : prev,
      );
      return;
    }

    // Transform handle drag: update the selected shape live.
    if (drag.kind === 'transform') {
      setShapes((prev) =>
        prev.map((s) =>
          s.id === drag.shapeId
            ? { ...s, points: applyHandle(drag, point) }
            : s,
        ),
      );
      // Force a re-render even if shape ref shape didn't actually change ref.
      setDraggingTick((t) => t + 1);
      return;
    }

    // Polygon/polyline: just track the cursor for the rubber-band preview.
    setDraft((prev) => (prev ? { ...prev, cursor: point } : prev));
  }, []);

  const onCanvasPointerUp = useCallback(
    (p: Vec2) => {
      const drag = dragRef.current;
      if (drag.kind === 'freehand') {
        // Commit the freehand draft on release.
        setDraft((prev) => {
          if (!prev) return prev;
          if (prev.points.length < MIN_FREEHAND_POINTS) return null;
          queueMicrotask(() => commitDraft(prev));
          return prev;
        });
        dragRef.current = { kind: 'idle' };
        return;
      }
      if (drag.kind === 'circle') {
        // Commit the circle as its bbox corners so the bbox/transform
        // helpers can resize it. Discard sub-threshold (accidental) taps.
        setDraft((prev) => {
          if (!prev) return prev;
          const center = prev.points[0];
          const edge = prev.cursor ?? center;
          const rx = Math.abs(edge.x - center.x);
          const ry = Math.abs(edge.y - center.y);
          if (Math.max(rx, ry) < MIN_CIRCLE_RADIUS) return null;
          const corners: Vec2[] = [
            { x: center.x - rx, y: center.y - ry },
            { x: center.x + rx, y: center.y + ry },
          ];
          queueMicrotask(() => commitDraft({ ...prev, points: corners }));
          return prev;
        });
        dragRef.current = { kind: 'idle' };
        return;
      }
      if (drag.kind === 'transform') {
        dragRef.current = { kind: 'idle' };
        setDraggingTick((t) => t + 1);
        return;
      }
      // Point/select have nothing to do on up; pointermove already handled the
      // hover preview. Keep the pointer position for symmetry.
      void p;
    },
    [commitDraft],
  );

  const onCanvasDoubleClick = useCallback(
    (_p: Vec2) => {
      finishDraft();
    },
    [finishDraft],
  );

  // ----- transform handles ---------------------------------------------------

  const beginHandleDrag = useCallback(
    (handle: HandleId, shapeId: string, origin: Vec2) => {
      setShapes((prev) => {
        const target = prev.find((s) => s.id === shapeId);
        if (!target) return prev;
        const b = bbox(target.points);
        const center = bboxCenter(b);
        const width = Math.max(b.maxX - b.minX, 1e-4);
        const height = Math.max(b.maxY - b.minY, 1e-4);
        // Anchor depends on the handle: corner drags anchor at the opposite
        // corner; edge drags anchor at the opposite edge midpoint; rotate &
        // body drags don't use anchor (`center` is enough).
        let anchor: Vec2 = center;
        switch (handle) {
          case 'nw':
            anchor = { x: b.maxX, y: b.maxY };
            break;
          case 'ne':
            anchor = { x: b.minX, y: b.maxY };
            break;
          case 'se':
            anchor = { x: b.minX, y: b.minY };
            break;
          case 'sw':
            anchor = { x: b.maxX, y: b.minY };
            break;
          case 'n':
            anchor = { x: center.x, y: b.maxY };
            break;
          case 'e':
            anchor = { x: b.minX, y: center.y };
            break;
          case 's':
            anchor = { x: center.x, y: b.minY };
            break;
          case 'w':
            anchor = { x: b.maxX, y: center.y };
            break;
          default:
            anchor = center;
        }
        // Circles are pinned to their center: resize from the center so the
        // shape expands/contracts in place and never drifts sideways.
        if (target.kind === 'circle') anchor = center;
        const startAngle = Math.atan2(origin.y - center.y, origin.x - center.x);
        dragRef.current = {
          kind: 'transform',
          handle,
          shapeId,
          original: target.points,
          origin,
          anchor,
          center,
          width,
          height,
          startAngle,
        };
        return prev;
      });
      setSelectedId(shapeId);
      setDraggingTick((t) => t + 1);
    },
    [],
  );

  const isDraggingHandle =
    dragRef.current.kind === 'transform' && draggingTick >= 0;

  return {
    shapes,
    draft,
    activeToolId,
    selectedId,
    selectedShape,

    setActiveTool: setActiveToolId,
    setSelectedId,
    updateShape,
    deleteShape,
    restoreLastDeleted,
    clearAll,
    cancelDraft,
    finishDraft,
    undoLastPoint,

    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onCanvasDoubleClick,

    beginHandleDrag,
    isDraggingHandle,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute the new point set for the active drag based on the current pointer
 * position. `applyHandle` always works from the drag's `original` snapshot, so
 * each move call is idempotent relative to the start of the drag.
 */
function applyHandle(
  drag: Extract<Drag, { kind: 'transform' }>,
  pointer: Vec2,
): Vec2[] {
  const { handle, original, origin, anchor, center, width, height, startAngle } = drag;

  if (handle === 'body') {
    return translatePoints(original, pointer.x - origin.x, pointer.y - origin.y);
  }

  if (handle === 'rotate') {
    const a = Math.atan2(pointer.y - center.y, pointer.x - center.x);
    return rotatePoints(original, center, a - startAngle);
  }

  // Corner / edge scale.
  // For corner handles we scale both axes; edge handles lock the perpendicular
  // axis so the user can stretch one dimension cleanly.
  const dxFromAnchor = pointer.x - anchor.x;
  const dyFromAnchor = pointer.y - anchor.y;
  const startDx = origin.x - anchor.x;
  const startDy = origin.y - anchor.y;

  let sx = 1;
  let sy = 1;
  switch (handle) {
    case 'nw':
    case 'ne':
    case 'se':
    case 'sw':
      sx = startDx === 0 ? 1 : dxFromAnchor / startDx;
      sy = startDy === 0 ? 1 : dyFromAnchor / startDy;
      break;
    case 'n':
    case 's':
      sy = startDy === 0 ? 1 : dyFromAnchor / startDy;
      break;
    case 'e':
    case 'w':
      sx = startDx === 0 ? 1 : dxFromAnchor / startDx;
      break;
  }
  // Don't allow flipping or collapsing — clamp to a small minimum scale.
  const minScale = 0.05 / Math.min(width, height);
  sx = Math.max(minScale, sx);
  sy = Math.max(minScale, sy);
  return scalePoints(original, anchor, sx, sy);
}
