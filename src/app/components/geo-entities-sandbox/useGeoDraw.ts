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
  type GeoShapeKind,
  type GeoToolId,
  type HandleId,
  type Vec2,
} from './drawTypes';
import type { GeoBounds } from './types';
import { toolById } from './drawTools';
import {
  DEFAULT_ZONE_TYPE,
  getZoneColor,
} from '../map-draw/zoneTypes';

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
  /**
   * Move a shape to the END of the `shapes` array. Because the overlay
   * paints shapes in array order, the last entry sits visually on top of
   * every other shape (= "Bring to front").
   */
  bringToFront: (id: string) => void;
  /**
   * Move a shape to the START of the `shapes` array — painted first, so
   * every other shape sits on top of it (= "Send to back").
   */
  sendToBack: (id: string) => void;
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

  /**
   * Tell the engine whether Shift is currently held. Drives "snap to a
   * perfect circle" behaviour for circle drafts and circle resize handles.
   */
  setShiftKey: (shift: boolean) => void;
  /**
   * Report the drawing surface's on-screen aspect ratio (`width /
   * height` in CSS pixels). Needed so the Shift "perfect circle" snap
   * produces a shape that reads as round *on screen* — the normalized
   * coordinate space is stretched to a non-square container, so equal
   * normalized radii would otherwise render as an oval.
   */
  setCanvasAspect: (aspect: number) => void;

  /** Undo the last shape mutation (commit, edit, delete, z-order, …). */
  undo: () => void;
  /** Redo the last undone mutation. Cleared whenever a fresh edit lands. */
  redo: () => void;

  /**
   * Id of the shape that was just committed via `commitDraft`. The panel
   * consumes this to auto-focus the matching LayerRow's name input (so
   * the user can start typing a name as soon as the shape is drawn).
   * Reset via {@link clearLastCommittedId}.
   */
  lastCommittedId: string | null;
  clearLastCommittedId: () => void;

  /**
   * Id of the shape currently being staged. Set on `commitDraft` and
   * cleared by `savePending` / `cancelPending`. While set the panel
   * lives in its "Draft detail" view (with Save / Cancel buttons in
   * the footer); once cleared the panel falls back to the default
   * Layers view.
   *
   * Decoupled from `selectedId` so we can keep "this shape is what the
   * user is finalizing" as a distinct state from generic selection —
   * selecting a previously-saved layer mustn't open the draft footer.
   */
  pendingShapeId: string | null;
  /**
   * `true` when the pending shape was just drawn (and thus a brand-new
   * draft that Cancel should hard-delete); `false` when the pending
   * shape is a previously-saved entity reopened for editing via
   * {@link beginEditShape} (in which case Cancel just closes the
   * editor without touching the shape).
   */
  pendingIsNew: boolean;
  /** Finalize the pending shape — clears the staging flag, keeps the shape. */
  savePending: () => void;
  /** Discard the pending shape entirely and clear the staging flag. */
  cancelPending: () => void;
  /**
   * True while the panel's Save action is live — a brand-new shape awaiting
   * its first save, or an existing shape with unsaved edits. The floating
   * draw strip stays blocked until this clears (Save / Cancel).
   */
  requiresSaveBeforeDraw: boolean;
  /**
   * True while the docked panel must stay open — an in-flight draft on the
   * map, or a pending shape with unsaved work. Close / rail-toggle / panel
   * switches are blocked until the user Save or Cancel.
   */
  blocksPanelClose: boolean;
  /**
   * Reopen a previously-saved shape in the panel's Draft-detail view
   * (Name / Type / Coordinates / Color editor + Save / Cancel footer).
   * Unlike a fresh draft, Cancel here is non-destructive: it only
   * closes the editor — the shape stays in `shapes` with whatever
   * field edits the user applied during the session (edits land live
   * through `updateShape`).
   */
  beginEditShape: (id: string) => void;

  /**
   * Push a fully-formed shape into the layer stack from an external
   * source (KML/GeoJSON upload, paste, API). Points must already be
   * projected into the engine's normalized `[0, 1]` space. When
   * `stage` is `true` (default), the shape enters the Draft-detail
   * Save/Cancel flow just like a freshly drawn shape; otherwise it
   * lands directly as a committed layer. Returns the new shape id.
   */
  importShape: (params: {
    tool: GeoToolId;
    kind: GeoShapeKind;
    points: Vec2[];
    name?: string;
    stage?: boolean;
    sourceBounds?: GeoBounds;
  }) => string;

  /**
   * Latest focus request emitted by `requestFocus`. The panel's "center
   * on map" action bumps this; a Dashboard-mounted bridge watches it
   * and forwards the shape's projected centroid to the Cesium camera.
   *
   * The wrapping `id`/`shapeId` pair makes the request idempotent —
   * consumers key off `id` so the same shape can be re-centered by
   * clicking twice in a row, and stale renders don't accidentally
   * re-fire it.
   */
  focusRequest: { id: number; shapeId: string; point?: Vec2 } | null;
  /**
   * Ask the map to center on the given shape (see {@link focusRequest}).
   * Pass an optional normalized `point` to center on a specific
   * coordinate (e.g. a single vertex) instead of the shape's centroid —
   * used by the panel's per-coordinate "show on map" affordance.
   */
  requestFocus: (shapeId: string, point?: Vec2) => void;

  /**
   * Coalesce a sequence of edits into a single undo entry. Used by live
   * drags (vertex chips, transform handles) so one Cmd+Z rewinds the whole
   * gesture instead of one pointermove frame at a time. Must be paired
   * with `endEditTransaction`.
   */
  beginEditTransaction: () => void;
  endEditTransaction: () => void;
}

export function useGeoDraw(initial: GeoShape[] = []): UseGeoDrawResult {
  const [shapes, setShapes] = useState<GeoShape[]>(initial);
  const [activeToolId, setActiveToolId] = useState<GeoToolId>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftShape | null>(null);
  // One-shot signal: set on `commitDraft`, cleared once the consumer
  // (the panel's LayerRow) has used it to enter rename mode.
  const [lastCommittedId, setLastCommittedId] = useState<string | null>(null);
  // Two-phase commit: `commitDraft` adds the shape to `shapes` AND
  // sets this flag. The panel then renders its Draft-detail view with
  // Save / Cancel buttons. `savePending()` keeps the shape and clears
  // the flag; `cancelPending()` deletes the shape and clears the flag.
  const [pendingShapeId, setPendingShapeId] = useState<string | null>(null);
  // Distinguishes a brand-new draft (Cancel hard-deletes) from a
  // previously-saved shape reopened for edit via `beginEditShape`
  // (Cancel just closes the editor). Always kept in sync with
  // `pendingShapeId`.
  const [pendingIsNew, setPendingIsNew] = useState(false);
  // Tracks unsaved edits on a reopened existing shape (`pendingIsNew ===
  // false`). Brand-new draws always require save via `pendingIsNew`; this
  // flag mirrors the panel's dirty / Save-enabled state for layer edits.
  const [pendingDirty, setPendingDirty] = useState(false);
  const pendingShapeIdRef = useRef<string | null>(null);
  pendingShapeIdRef.current = pendingShapeId;
  // Focus request bus — the panel's "center on map" action bumps this
  // and a Dashboard-mounted bridge forwards it to Cesium. Using an id
  // instead of just a shape id makes repeated requests idempotent: a
  // consumer effect keys off `id`, so clicking the action twice on the
  // same shape re-triggers the fly-to.
  const [focusRequest, setFocusRequest] = useState<
    { id: number; shapeId: string; point?: Vec2 } | null
  >(null);
  const focusRequestSeqRef = useRef(0);
  const requestFocus = useCallback((shapeId: string, point?: Vec2) => {
    focusRequestSeqRef.current += 1;
    setFocusRequest({ id: focusRequestSeqRef.current, shapeId, point });
  }, []);
  const dragRef = useRef<Drag>({ kind: 'idle' });
  const [draggingTick, setDraggingTick] = useState(0);
  // Stack of recently deleted shapes (LIFO) so `restoreLastDeleted` can
  // walk back through accidental deletes. We hang on to the original
  // index so a restore drops the shape back into its old slot in the
  // layers list instead of always appending to the end.
  const deletedStackRef = useRef<{ shape: GeoShape; index: number }[]>([]);

  // Snapshots of the `shapes` array for undo/redo. We snapshot BEFORE
  // every mutation through `mutate()` so undo always rewinds to a
  // known-good state. The redo stack is wiped whenever a new edit lands.
  const undoStackRef = useRef<GeoShape[][]>([]);
  const redoStackRef = useRef<GeoShape[][]>([]);
  const UNDO_LIMIT = 100;
  // Per-frame mutations during a live drag should NOT each push an undo
  // entry — that would make a single Cmd+Z rewind one pixel at a time.
  // Drag handlers wrap the drag in `beginEditTransaction`/`endEdit-
  // Transaction`, which snapshots once at the start and suppresses
  // further snapshots until the transaction ends.
  const txDepthRef = useRef(0);

  /** Wraps a `setShapes` call with an undo-stack snapshot. */
  const mutate = useCallback(
    (updater: (prev: GeoShape[]) => GeoShape[]) => {
      setShapes((prev) => {
        const next = updater(prev);
        if (next === prev) return prev;
        if (txDepthRef.current === 0) {
          undoStackRef.current.push(prev);
          if (undoStackRef.current.length > UNDO_LIMIT) {
            undoStackRef.current.shift();
          }
          redoStackRef.current = [];
        }
        return next;
      });
    },
    [],
  );

  const beginEditTransaction = useCallback(() => {
    if (txDepthRef.current === 0) {
      // Snapshot the current state once at the start of the transaction.
      setShapes((prev) => {
        undoStackRef.current.push(prev);
        if (undoStackRef.current.length > UNDO_LIMIT) {
          undoStackRef.current.shift();
        }
        redoStackRef.current = [];
        return prev;
      });
    }
    txDepthRef.current += 1;
  }, []);

  const endEditTransaction = useCallback(() => {
    if (txDepthRef.current > 0) txDepthRef.current -= 1;
  }, []);

  // Live Shift-key state. Used by the circle draft/resize paths to
  // snap the ellipse to a perfect circle. A ref (not state) keeps
  // pointer-move hot path allocation-free.
  const shiftRef = useRef(false);
  const setShiftKey = useCallback((shift: boolean) => {
    shiftRef.current = shift;
  }, []);

  // On-screen aspect ratio (width / height) of the drawing surface.
  // Defaults to 1 (square) until the overlay reports its real size. The
  // circle Shift-snap divides the two axes by this so a "perfect circle"
  // is round in CSS pixels, not in the (stretched) normalized space.
  const canvasAspectRef = useRef(1);
  const setCanvasAspect = useCallback((aspect: number) => {
    if (Number.isFinite(aspect) && aspect > 0) canvasAspectRef.current = aspect;
  }, []);

  const selectedShape = useMemo(
    () => shapes.find((s) => s.id === selectedId) ?? null,
    [shapes, selectedId],
  );

  // ----- shape mutations -----------------------------------------------------

  const updateShape = useCallback(
    (id: string, patch: Partial<GeoShape>) => {
      mutate((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      if (pendingShapeIdRef.current === id) setPendingDirty(true);
    },
    [mutate],
  );

  const deleteShape = useCallback(
    (id: string) => {
      mutate((prev) => {
        const index = prev.findIndex((s) => s.id === id);
        if (index < 0) return prev;
        // Snapshot the deleted shape so `restoreLastDeleted` can put it
        // back in the exact same layer position.
        deletedStackRef.current.push({ shape: { ...prev[index] }, index });
        return prev.filter((s) => s.id !== id);
      });
      if (selectedId === id) setSelectedId(null);
    },
    [mutate, selectedId],
  );

  const restoreLastDeleted = useCallback((): string | null => {
    const entry = deletedStackRef.current.pop();
    if (!entry) return null;
    mutate((prev) => {
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
  }, [mutate]);

  const bringToFront = useCallback(
    (id: string) => {
      mutate((prev) => {
        const i = prev.findIndex((s) => s.id === id);
        if (i < 0 || i === prev.length - 1) return prev;
        const next = prev.slice();
        const [shape] = next.splice(i, 1);
        next.push(shape);
        return next;
      });
    },
    [mutate],
  );

  const sendToBack = useCallback(
    (id: string) => {
      mutate((prev) => {
        const i = prev.findIndex((s) => s.id === id);
        if (i <= 0) return prev;
        const next = prev.slice();
        const [shape] = next.splice(i, 1);
        next.unshift(shape);
        return next;
      });
    },
    [mutate],
  );

  const clearAll = useCallback(() => {
    mutate(() => []);
    setSelectedId(null);
    setDraft(null);
    // Bulk clears reset the undo history too — restoring a single shape
    // after a `clearAll` would feel confusing.
    deletedStackRef.current = [];
  }, [mutate]);

  // --- undo / redo -----------------------------------------------------------

  const undo = useCallback(() => {
    const prevSnapshot = undoStackRef.current.pop();
    if (!prevSnapshot) return;
    setShapes((current) => {
      redoStackRef.current.push(current);
      // If the currently selected shape no longer exists in the restored
      // snapshot (e.g. we just undid its creation), drop the selection.
      if (selectedId && !prevSnapshot.some((s) => s.id === selectedId)) {
        setSelectedId(null);
      }
      return prevSnapshot;
    });
    setDraft(null);
  }, [selectedId]);

  const redo = useCallback(() => {
    const nextSnapshot = redoStackRef.current.pop();
    if (!nextSnapshot) return;
    setShapes((current) => {
      undoStackRef.current.push(current);
      if (selectedId && !nextSnapshot.some((s) => s.id === selectedId)) {
        setSelectedId(null);
      }
      return nextSnapshot;
    });
    setDraft(null);
  }, [selectedId]);

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
      const id = makeShapeId(d.tool);
      // Freehand records a dense pencil stroke (dozens of points). Thin it
      // out on commit so the finished curve carries a handful of editable
      // coordinate vertices instead of an unusable cloud of dots.
      const committedPoints =
        d.kind === 'freehand'
          ? simplifyPath(d.points, 0.025).map(clampPoint)
          : d.points.map(clampPoint);
      // Default type is "No fly zone". Its signature color drives BOTH
      // the fill and the stroke on commit so the shape reads as its
      // type from the moment it's drawn. Users can still override the
      // colors independently via the Color section; changing the Type
      // re-stamps both colors to the new type's signature.
      const defaultTypeColor = getZoneColor(DEFAULT_ZONE_TYPE);
      const shape: GeoShape = {
        id,
        tool: d.tool,
        kind: d.kind,
        name: defaultName(d.tool),
        description: '',
        color: defaultTypeColor,
        strokeColor: defaultTypeColor,
        // Fill starts at 30% so the shape's interior reads as a tint
        // rather than covering the map underneath; the outline stays
        // fully opaque so the boundary is unambiguous. The user can
        // dial either channel from the inline % input on each
        // ColorChip.
        fillOpacity: 0.3,
        strokeOpacity: 1,
        points: committedPoints,
        // Default outline weight of 2 px — reads as a clear, confident
        // boundary out of the box. The slider in the Color section lets
        // the user thin or thicken it (clamped to 0.5–8 px, dashed at
        // 4 px max).
        strokeWidth: 2,
        lineStyle: 'solid',
        zoneType: DEFAULT_ZONE_TYPE,
      };
      mutate((prev) => [...prev, shape]);
      setSelectedId(id);
      setDraft(null);
      setActiveToolId('select');
      // Flag the just-committed shape so the panel can auto-focus its
      // name input (the "Add name" inline editor with a visible caret).
      setLastCommittedId(id);
      // Enter the two-phase Save / Cancel staging flow — the panel
      // will keep this shape in its "Draft detail" view until the user
      // explicitly saves or cancels. Brand-new drafts are marked
      // `pendingIsNew` so Cancel hard-deletes them.
      setPendingShapeId(id);
      setPendingIsNew(true);
      setPendingDirty(false);
    },
    [defaultName, mutate],
  );

  /**
   * Import a fully-formed shape from an external source (KML / GeoJSON
   * upload, paste, API). The shape's points must already be in the
   * engine's normalized `[0, 1]` space over the sandbox bounds — the
   * caller (parser) is responsible for projecting from lat/lng.
   *
   * Behaves like `commitDraft` in every other respect: default color /
   * type / stroke are stamped from the current default zone, the shape
   * is pushed into `shapes`, and (when `stage: true`) the two-phase
   * Save/Cancel gate is entered so the user has to confirm the import.
   * With `stage: false` the shape lands directly in the committed list
   * (used for multi-feature imports where only the first goes into
   * Draft-detail).
   *
   * Returns the new shape's id.
   */
  const importShape = useCallback(
    (params: {
      tool: GeoToolId;
      kind: GeoShapeKind;
      points: Vec2[];
      /** Optional label from the imported file — falls back to the
       *  engine's default `${tool.label} ${n}` name when omitted. */
      name?: string;
      /** When `true` (default), enter the Draft-detail Save/Cancel gate. */
      stage?: boolean;
      /** Lat/lng bounds the caller projected `points` against. Stored
       *  on the shape so the panel's Coordinates section un-projects
       *  against the same bounds and shows the file's true lat/lng. */
      sourceBounds?: GeoBounds;
    }): string => {
      const stage = params.stage !== false;
      const id = makeShapeId(params.tool);
      const defaultTypeColor = getZoneColor(DEFAULT_ZONE_TYPE);
      const shape: GeoShape = {
        id,
        tool: params.tool,
        kind: params.kind,
        name: params.name?.trim() || defaultName(params.tool),
        description: '',
        color: defaultTypeColor,
        strokeColor: defaultTypeColor,
        fillOpacity: 0.3,
        strokeOpacity: 1,
        points: params.points.map(clampPoint),
        strokeWidth: 2,
        lineStyle: 'solid',
        zoneType: DEFAULT_ZONE_TYPE,
        ...(params.sourceBounds ? { sourceBounds: params.sourceBounds } : {}),
      };
      mutate((prev) => [...prev, shape]);
      setSelectedId(id);
      setDraft(null);
      setActiveToolId('select');
      setLastCommittedId(id);
      if (stage) {
        setPendingShapeId(id);
        setPendingIsNew(true);
        setPendingDirty(false);
      }
      return id;
    },
    [defaultName, mutate],
  );

  const savePending = useCallback(() => {
    // No-op on the underlying shape — Save just dismisses the staging
    // flag so the panel falls back to the Layers view. The shape is
    // already in `shapes`.
    setPendingShapeId(null);
    setPendingIsNew(false);
    setPendingDirty(false);
  }, []);

  const cancelPending = useCallback(() => {
    setPendingShapeId((id) => {
      if (!id) return null;
      // For brand-new drafts (just-drawn shapes), Cancel hard-deletes:
      // "as if this draft never happened", straight through `mutate`
      // (snapshots undo, no toast, no `deletedStackRef` entry — the
      // user shouldn't be able to "undo a cancel").
      //
      // For reopened existing shapes (`pendingIsNew === false`), Cancel
      // is non-destructive: the shape stays in `shapes` and we only
      // close the editor. Field edits made during the session are kept
      // because they were already applied live via `updateShape`.
      if (pendingIsNew) {
        mutate((prev) => prev.filter((s) => s.id !== id));
      }
      // Always drop the selection on close, regardless of pendingIsNew.
      // Otherwise `selectedId` stays pinned to the just-edited shape and
      // keeps the map overlay in `interactive` mode — which (with the
      // new "click shape on map opens detail" flow) makes a subsequent
      // click on a different layer row feel broken because the map
      // overlay still owns pointer capture for the previous shape.
      setSelectedId((selected) => (selected === id ? null : selected));
      return null;
    });
    setPendingIsNew(false);
    setPendingDirty(false);
  }, [mutate, pendingIsNew]);

  const beginEditShape = useCallback((id: string) => {
    // Reopen an existing shape in the Draft-detail view. `pendingIsNew`
    // stays false so Cancel won't delete the shape — the editor is a
    // read/write window onto the live shape, not a staging buffer.
    setPendingShapeId(id);
    setPendingIsNew(false);
    setPendingDirty(false);
    setSelectedId(id);
  }, []);

  const clearLastCommittedId = useCallback(() => setLastCommittedId(null), []);

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
      // Select tool: clicking a shape opens its Draft-detail editor
      // (same flow as the pencil icon on a layer row), clicking empty
      // space clears the current selection. We route through
      // `beginEditShape` here instead of just `setSelectedId` so the
      // panel transitions to the editor for the clicked shape — the
      // user's "click on a shape goes to the editor, not the layers
      // list" requirement.
      if (tool === 'select') {
        if (opts?.onShapeId) {
          beginEditShape(opts.onShapeId);
        } else {
          setSelectedId(null);
        }
        return;
      }
      // A drawing tool is active → keep drawing, even when the click lands
      // on top of an existing shape. (Selecting an existing shape happens
      // via the Layers list, a right-click, or the select tool — so a tool
      // being armed never blocks drawing a new, overlapping shape.)
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
    [activeToolId, beginEditShape, commitDraft, draft],
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
            ? {
                ...s,
                // Circles are always kept as perfect circles — the
                // Shift modifier used to gate this, but ovals were
                // confusing and off-brand, so we enforce equal pixel
                // radii on every resize. Pass the surface aspect ratio
                // so the snap reads round on screen (not in normalized
                // space, which is stretched to fit the canvas).
                points: applyHandle(drag, point, {
                  equalAspect: s.kind === 'circle',
                  aspect: canvasAspectRef.current,
                }),
              }
            : s,
        ),
      );
      // Force a re-render even if shape ref shape didn't actually change ref.
      setDraggingTick((t) => t + 1);
      return;
    }

    // Polygon/polyline / circle draft: track the cursor for the
    // rubber-band preview. Circles are always constrained to a perfect
    // circle — the previous Shift-only snap has been retired since ovals
    // were confusing users.
    setDraft((prev) => {
      if (!prev) return prev;
      if (drag.kind === 'circle') {
        const center = prev.points[0];
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        // Snap in *pixel* space so the preview is round on screen. The
        // normalized X axis is `aspect`× wider in pixels than the Y
        // axis, so scale dx up before comparing, then scale the chosen
        // magnitude back down for the X radius.
        const aspect = canvasAspectRef.current;
        const pxDx = Math.abs(dx) * aspect;
        const pxDy = Math.abs(dy);
        const m = Math.max(pxDx, pxDy);
        const snapped = {
          x: center.x + (dx >= 0 ? m : -m) / aspect,
          y: center.y + (dy >= 0 ? m : -m),
        };
        return { ...prev, cursor: snapped };
      }
      return { ...prev, cursor: point };
    });
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
          let rx = Math.abs(edge.x - center.x);
          let ry = Math.abs(edge.y - center.y);
          if (Math.max(rx, ry) < MIN_CIRCLE_RADIUS) return null;
          // Every commit is forced to a perfect circle — equalize in
          // pixel space (via the surface aspect ratio) so the stored
          // ellipse renders as a round circle on screen. The old Shift-
          // only gate has been removed: circles are never ovals.
          {
            const aspect = canvasAspectRef.current;
            const m = Math.max(rx * aspect, ry);
            rx = m / aspect;
            ry = m;
          }
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
        // Snapshot once for the whole drag (move events run raw, without
        // pushing per-frame undo entries). This way a single Cmd+Z rolls
        // back the entire transform instead of jittering vertex-by-vertex.
        undoStackRef.current.push(prev);
        if (undoStackRef.current.length > UNDO_LIMIT) {
          undoStackRef.current.shift();
        }
        redoStackRef.current = [];
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

  const requiresSaveBeforeDraw = useMemo(() => {
    if (!pendingShapeId) return false;
    if (pendingIsNew) return true;
    const shape = shapes.find((s) => s.id === pendingShapeId);
    if (!shape || shape.locked) return false;
    return pendingDirty;
  }, [pendingShapeId, pendingIsNew, pendingDirty, shapes]);

  const blocksPanelClose = !!draft || requiresSaveBeforeDraw;

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
    bringToFront,
    sendToBack,
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

    setShiftKey,
    setCanvasAspect,
    undo,
    redo,
    beginEditTransaction,
    endEditTransaction,

    lastCommittedId,
    clearLastCommittedId,

    pendingShapeId,
    pendingIsNew,
    requiresSaveBeforeDraw,
    blocksPanelClose,
    savePending,
    cancelPending,
    beginEditShape,
    importShape,

    focusRequest,
    requestFocus,
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
 * Thin a dense path by distance: keep the first point, then only points
 * that are at least `minGap` (normalized units) from the last kept one,
 * always keeping the final point. Cheap enough to run on commit; good
 * enough to turn a freehand scribble into a few editable vertices.
 */
function simplifyPath(points: Vec2[], minGap: number): Vec2[] {
  if (points.length <= 2) return points.slice();
  const out: Vec2[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (distance(points[i], out[out.length - 1]) >= minGap) {
      out.push(points[i]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Compute the new point set for the active drag based on the current pointer
 * position. `applyHandle` always works from the drag's `original` snapshot, so
 * each move call is idempotent relative to the start of the drag.
 */
function applyHandle(
  drag: Extract<Drag, { kind: 'transform' }>,
  pointer: Vec2,
  opts: { equalAspect?: boolean; aspect?: number } = {},
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
  // Circle equal-aspect: make the resulting bbox square in *pixel*
  // space so the rendered ellipse is a true circle on screen. The
  // normalized X extent is `aspect`× wider in pixels, so we compare in
  // pixel half-extents and drive both back to a common value.
  //
  // Corner handles fold both axes together via `max` so grabbing a
  // corner still lets the user grow OR shrink freely. Edge handles
  // only touch one axis (the perpendicular one is locked at scale=1),
  // so `max` would pin the untouched axis and block shrinking — we
  // instead mirror the dragged axis's pixel scale onto the other one.
  if (opts.equalAspect) {
    const aspect = opts.aspect ?? 1;
    const pxX = Math.abs(sx) * width * aspect;
    const pxY = Math.abs(sy) * height;
    let m: number;
    if (handle === 'n' || handle === 's') {
      m = pxY;
    } else if (handle === 'e' || handle === 'w') {
      m = pxX;
    } else {
      m = Math.max(pxX, pxY);
    }
    sx = (sx < 0 ? -1 : 1) * (m / (width * aspect));
    sy = (sy < 0 ? -1 : 1) * (m / height);
  }
  return scalePoints(original, anchor, sx, sy);
}
