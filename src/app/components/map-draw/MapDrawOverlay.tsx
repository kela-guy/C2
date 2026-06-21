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
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  bbox,
  clampPoint,
  type DraftShape,
  type GeoFillMode,
  type GeoLineStyle,
  type GeoShape,
  type Vec2,
} from '../geo-entities-sandbox/drawTypes';
import { ShapeTransformHandles } from '../geo-entities-sandbox/ShapeTransformHandles';
import { deleteShapeWithUndo } from './deleteWithUndo';
import { useMapDraw } from './MapDrawProvider';

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
  const { draw, drawTool } = useMapDraw();
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Notify the host when the selection changes so it can open the panel
  // when a shape is clicked. Kept in a ref so the effect only depends on
  // the id, not the callback identity.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    onSelectRef.current?.(draw.selectedId);
  }, [draw.selectedId]);

  // ---- keyboard: Escape cancels draft / deselects; Enter finishes; -----
  // ---- Delete removes the selected shape. ------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
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
    const isShapeClick = !!shapeId && !draw.draft;
    draw.onCanvasPointerDown(local, { onShapeId: shapeId });
    // Every map-draw shape is pinned to its location: polygons, lines and
    // curves can't be moved, scaled or rotated; circles can be resized
    // (via handles) but not moved. So we never start a body-move gesture.
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    draw.onCanvasPointerMove(toLocal(e.clientX, e.clientY));
  };
  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    draw.onCanvasPointerUp(toLocal(e.clientX, e.clientY));
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
          editable: s.id === draw.selectedId,
          left: r.left + cx * r.width,
          top: r.top + cy * r.height,
        };
      });
    // shapes drives the re-anchor so labels follow live during transforms.
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
          handleSurfaceMouseDown(e);
          handlePointerDown(e);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
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
  const stroke = shape.strokeColor ?? shape.color;
  const lineStyle: GeoLineStyle = shape.lineStyle ?? 'solid';
  const fillMode: GeoFillMode = shape.fillMode ?? 'fill';
  const strokeWidth = shape.strokeWidth ?? (selected ? 2.5 : 2);
  const strokeOpacity = lineStyle === 'none' ? 0 : 1;
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
    const p = shape.points[0] ?? { x: 0.5, y: 0.5 };
    const cx = p.x * VIEWBOX_W;
    const cy = p.y * VIEWBOX_H;
    return (
      <g
        data-shape-id={shape.id}
        style={{ cursor: 'pointer', pointerEvents: interactive ? 'auto' : 'all' }}
      >
        <circle cx={cx} cy={cy} r={7} fill={stroke} stroke="#0f172a" strokeWidth={1.25} />
        {selected && (
          <circle cx={cx} cy={cy} r={14} fill="none" stroke={stroke} strokeOpacity={0.4} />
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
        {selected && (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="#ffffff"
            strokeWidth={strokeWidth + 5}
            strokeOpacity={0.55}
            style={{ pointerEvents: 'none' }}
          />
        )}
        <ellipse
          data-shape-id={shape.id}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
          strokeDasharray={dasharray}
          style={{ cursor: 'pointer', pointerEvents: 'all' }}
        />
      </g>
    );
  }

  const d = pathFromPoints(shape.points, shape.kind === 'polygon' || shape.kind === 'freehand');

  return (
    <g>
      {selected && (
        <path
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeWidth={strokeWidth + 5}
          strokeOpacity={0.55}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      )}
      <path
        data-shape-id={shape.id}
        d={d}
        fill={shape.kind === 'polyline' ? 'none' : fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        strokeDasharray={dasharray}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      />
    </g>
  );
}

function DraftPreview({ draft }: { draft: DraftShape }) {
  if (draft.points.length === 0) return null;

  if (draft.kind === 'point') {
    const p = draft.points[0];
    return (
      <circle cx={p.x * VIEWBOX_W} cy={p.y * VIEWBOX_H} r={6} fill="#facc15" opacity={0.8} />
    );
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
          fill="rgba(56,189,248,0.10)"
          stroke="#facc15"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
        <circle cx={center.x * VIEWBOX_W} cy={center.y * VIEWBOX_H} r={4} fill="#facc15" />
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
        fill={close ? 'rgba(56,189,248,0.10)' : 'none'}
        stroke="#facc15"
        strokeWidth={2}
        strokeDasharray={draft.kind === 'freehand' ? undefined : '5 4'}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {draft.points.map((p, i) => (
        <circle
          key={i}
          cx={p.x * VIEWBOX_W}
          cy={p.y * VIEWBOX_H}
          r={i === 0 ? 5 : 3}
          fill={i === 0 ? '#facc15' : '#fff'}
          stroke="#0f172a"
          strokeWidth={1}
        />
      ))}
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
