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
  type RefObject,
} from 'react';
import {
  bbox,
  clampPoint,
  unproject,
  type DraftShape,
  type GeoFillMode,
  type GeoLineStyle,
  type GeoShape,
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
}

const VIEWBOX_W = 1000;
const VIEWBOX_H = 625;

// Status tones kept in step with the panel's `STATUS_OPTIONS`.
const STATUS_TONE: Record<string, { label: string; tone: string }> = {
  low: { label: 'Low', tone: '#34d399' },
  middle: { label: 'Middle', tone: '#facc15' },
  high: { label: 'High', tone: '#f43f5e' },
};

export function MapDrawOverlay({ className, onSelect }: MapDrawOverlayProps) {
  const { draw, drawTool, coordinatesOpen } = useMapDraw();
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
  const vertexDragRef = useRef<{ shapeId: string; index: number } | null>(null);

  // Notify the host when the selection changes so it can open the panel
  // when a shape is clicked. Kept in a ref so the effect only depends on
  // the id, not the callback identity.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    onSelectRef.current?.(draw.selectedId);
  }, [draw.selectedId]);

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
        if (draw.selectedId) {
          e.preventDefault();
          deleteShapeWithUndo(draw, draw.selectedId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [draw]);

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
    e.currentTarget.setPointerCapture?.(e.pointerId);
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
  };
  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    draw.setShiftKey(e.shiftKey);
    draw.onCanvasPointerUp(toLocal(e.clientX, e.clientY));
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
    vertexDragRef.current = { shapeId, index };
    // Coalesce the per-frame point updates into one undo entry for the
    // whole drag — Cmd+Z then rewinds the entire vertex motion.
    draw.beginEditTransaction();
  };
  const moveVertexDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = vertexDragRef.current;
    if (!drag) return;
    const p = toLocal(e.clientX, e.clientY);
    const shape = draw.shapes.find((s) => s.id === drag.shapeId);
    if (shape) {
      const points = shape.points.map((pt, i) => (i === drag.index ? p : pt));
      draw.updateShape(drag.shapeId, { points });
    }
  };
  const endVertexDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (vertexDragRef.current) {
      vertexDragRef.current = null;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      draw.endEditTransaction();
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

  // Centered name labels, rendered in foreign HTML so the font matches
  // the rest of the UI. A label is shown for EVERY visible shape and
  // persists whether or not the shape is selected — empty ones read
  // "Name" as a placeholder. The selected shape's label is an editable
  // input; the rest are static text.
  const labels = useMemo(() => {
    const el = svgRef.current;
    if (!el) return [];
    const r = el.getBoundingClientRect();
    return draw.shapes
      .filter((s) => !s.hidden && s.kind !== 'point')
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
          left: r.left + cx * r.width,
          top: r.top + cy * r.height,
        };
      });
    // shapes drives the re-anchor so labels follow live during transforms.
  }, [draw.shapes, draw.selectedId]);

  // Numbered badges for each vertex of the SELECTED shape (1, 2, 3, …) so
  // the user can match a map dot to its row in the panel's Coordinates
  // list. Rendered as HTML (like the name labels) to dodge the SVG's
  // non-uniform stretch. Circles are excluded (they use transform handles).
  //
  // Visible ONLY while the panel's Coordinates section is open — selecting
  // a shape no longer auto-shows the dots. Type is the mandatory primary
  // action; coordinate editing is an opt-in mode.
  const vertexLabels = useMemo(() => {
    const el = svgRef.current;
    const s = draw.selectedShape;
    if (
      !el ||
      !s ||
      !coordinatesOpen ||
      s.hidden ||
      s.kind === 'circle' ||
      s.kind === 'point'
    ) {
      return [];
    }
    const r = el.getBoundingClientRect();
    return s.points.map((p, i) => ({
      key: `${s.id}-${i}`,
      shapeId: s.id,
      index: i,
      n: i + 1,
      left: r.left + p.x * r.width,
      top: r.top + p.y * r.height,
    }));
  }, [draw.selectedShape, draw.shapes, coordinatesOpen]);

  // Draft vertex dots — rendered as HTML so they stay perfect circles
  // (the SVG layer uses `preserveAspectRatio="none"` which stretches any
  // `<circle>` into an oval). The first vertex is highlighted; the rest
  // are smaller. Circles get a single center dot.
  const draftDots = useMemo(() => {
    const el = svgRef.current;
    const d = draw.draft;
    if (!el || !d) {
      return [] as { key: string; left: number; top: number; primary: boolean }[];
    }
    const r = el.getBoundingClientRect();
    if (d.kind === 'circle') {
      const c = d.points[0];
      if (!c) return [];
      return [
        {
          key: 'draft-circle-center',
          left: r.left + c.x * r.width,
          top: r.top + c.y * r.height,
          primary: true,
        },
      ];
    }
    // Freehand draws as a continuous pencil stroke — no per-point dots.
    if (d.kind === 'freehand') return [];
    if (d.kind === 'point') return [];
    return d.points.map((p, i) => ({
      key: `draft-${i}`,
      left: r.left + p.x * r.width,
      top: r.top + p.y * r.height,
      primary: i === 0,
    }));
  }, [draw.draft]);

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
          left: r.left + p.x * r.width,
          top: r.top + p.y * r.height,
          selected: s.id === draw.selectedId,
        };
      });
  }, [draw.shapes, draw.selectedId]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 ${className ?? ''}`.trim()}
      data-map-draw-overlay="true"
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
              interactive={interactive}
            />
          ),
        )}

        {draw.draft && <DraftPreview draft={draw.draft} />}

        {/* Only circles expose transform handles (to expand). Polygons /
            lines / curves are fully pinned, so no handles are shown. */}
        {draw.selectedShape &&
          !draw.selectedShape.hidden &&
          !draw.selectedShape.locked &&
          draw.selectedShape.kind === 'circle' && (
          <ShapeTransformHandles
            shape={draw.selectedShape}
            width={VIEWBOX_W}
            height={VIEWBOX_H}
            allowRotate={false}
            onHandleDown={(handle, _e, origin) =>
              draw.beginHandleDrag(handle, draw.selectedShape!.id, origin)
            }
          />
        )}
      </svg>

      {labels.map((l) => (
        <div
          key={l.id}
          className="fixed z-30"
          style={{
            left: l.left,
            top: l.top,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {l.zoneType && ZONE_TYPE_BY_ID[l.zoneType] && (
              <span
                className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
              >
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
            {l.editable ? (
            <input
              value={l.description}
              onChange={(e) => draw.updateShape(l.id, { description: e.target.value })}
              placeholder="Add name"
              aria-label="Shape name"
              spellCheck={false}
              className="pointer-events-auto w-44 bg-transparent text-center text-[13px] font-semibold text-white caret-white outline-none placeholder:text-white/55 [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]"
            />
          ) : (
            <span
              className={`pointer-events-none text-balance text-center text-[13px] font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] ${
                l.description.trim() ? 'text-white' : 'text-white/55'
              }`}
            >
              {l.description.trim() ? l.description : 'Add name'}
            </span>
          )}
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
          className="pointer-events-auto fixed z-30 inline-flex size-5 cursor-grab touch-none items-center justify-center rounded-full bg-black/75 text-[10px] font-semibold leading-none text-white ring-1 ring-white/50 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          style={{
            left: v.left,
            top: v.top,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {v.n}
        </button>
      ))}

      {/* Draft vertex dots — true circles in HTML space (SVG circles would
          be stretched into ovals by the canvas's non-uniform aspect). */}
      {draftDots.map((dot) => (
        <div
          key={dot.key}
          aria-hidden
          className={`pointer-events-none fixed z-30 rounded-full ${
            dot.primary
              ? 'size-2.5 bg-black ring-2 ring-white'
              : 'size-2 bg-white ring-1 ring-black/80'
          }`}
          style={{
            left: dot.left,
            top: dot.top,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Map-pin glyphs for every point shape, anchored tip-down on the
          dropped coordinate. Pointer events are passthrough — selection is
          driven by the SVG hit area in `ShapeBody`. */}
      {pinMarkers.map((m) => (
        <div
          key={m.id}
          className="pointer-events-none fixed z-30"
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

      <CoordsStatusBar svgRef={svgRef} />

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
// CoordsStatusBar — pinned to the bottom-left of the map area, mirrors the
// GeoLibre viewer's "Coords" readout. Uses the same SANDBOX_BOUNDS projection
// as the side-panel coordinate listing, so on-map and in-panel values agree.
// ---------------------------------------------------------------------------
function CoordsStatusBar({
  svgRef,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
}) {
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        setCoord(null);
        return;
      }
      setCoord(unproject({ x, y }, SANDBOX_BOUNDS));
    };
    const handleLeave = () => setCoord(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerleave', handleLeave);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerleave', handleLeave);
    };
  }, [svgRef]);

  return (
    <div
      dir="ltr"
      role="status"
      aria-live="off"
      className="pointer-events-none absolute bottom-2 left-2 z-30 inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[11px] leading-4 tabular-nums text-white/85 shadow-sm backdrop-blur-sm"
    >
      <span className="text-white/55">Coords:</span>
      <span className="min-w-[140px] text-center">
        {coord
          ? `${coord.lng.toFixed(5)}, ${coord.lat.toFixed(5)}`
          : '—, —'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rendering helpers (mirrors GeoDrawCanvas but reads new style fields).
// ---------------------------------------------------------------------------

function ShapeBody({
  shape,
  selected,
  interactive,
}: {
  shape: GeoShape;
  selected: boolean;
  interactive: boolean;
}) {
  // Outline color is independent of fill (set via the Color section's
  // Outline chip). Falls back to the fill color when nothing's set, so
  // shapes without an explicit outline still draw something.
  const stroke = shape.strokeColor ?? shape.color;
  const lineStyle: GeoLineStyle = shape.lineStyle ?? 'solid';
  const fillMode: GeoFillMode = shape.fillMode ?? 'fill';
  const strokeWidth = shape.strokeWidth ?? (selected ? 2.5 : 2);
  // "None" is genuinely without stroke — no painted line and no selection
  // halo. Selection is still legible via the vertex dots (below).
  const noStroke = lineStyle === 'none';
  const dasharray = lineStyle === 'dashed' ? '8 6' : undefined;

  let fill: string;
  if (fillMode === 'none') {
    fill = 'none';
  } else if (fillMode === 'transparent') {
    fill = withAlpha(stroke, 0.05);
  } else {
    fill = withAlpha(stroke, shape.fillOpacity > 0 ? shape.fillOpacity : 0.18);
  }

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
        />
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
        />
      </g>
    );
  }

  const d = pathFromPoints(shape.points, shape.kind === 'polygon' || shape.kind === 'freehand');

  return (
    <g>
      <path
        data-shape-id={shape.id}
        d={d}
        fill={shape.kind === 'polyline' ? 'none' : fill}
        stroke={noStroke ? 'none' : stroke}
        strokeWidth={noStroke ? 0 : strokeWidth}
        strokeDasharray={dasharray}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      />
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
      <g pointerEvents="none">
        <ellipse
          cx={center.x * VIEWBOX_W}
          cy={center.y * VIEWBOX_H}
          rx={rx * VIEWBOX_W}
          ry={ry * VIEWBOX_H}
          fill="rgba(0,0,0,0.10)"
          stroke="#000000"
          strokeWidth={1}
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

  return (
    <g pointerEvents="none">
      <path
        d={d}
        fill={close ? 'rgba(0,0,0,0.10)' : 'none'}
        stroke="#000000"
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Polygon / polyline vertex dots are drawn as HTML circles in the
          parent overlay (see `draftDots`) so they aren't squashed by the
          SVG's non-uniform aspect ratio. Freehand intentionally has no
          per-point dots (the stroke speaks for itself). */}
    </g>
  );
}

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
