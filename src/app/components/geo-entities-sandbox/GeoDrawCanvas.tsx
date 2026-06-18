/**
 * Geo Drawing Sandbox — interactive map canvas.
 *
 * A compact SVG surface that:
 *   - paints a faint grid + the pre-existing sandbox entities for context,
 *   - renders every persisted {@link GeoShape} from the controller,
 *   - previews the in-progress {@link DraftShape} (rubber-band line for
 *     polygon/polyline, live freehand path),
 *   - hosts the selection bbox + transform handles for the selected shape.
 *
 * The canvas is `aspect-[16/10]` so it stays compact (not full-screen) yet
 * gives enough room for real on-shape editing. All event coordinates are
 * normalized to `[0,1]` via {@link toLocalPoint} before they reach the
 * controller — the rest of the drawing engine never sees pixels.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import { SANDBOX_BOUNDS, SANDBOX_ENTITIES } from './fixtures';
import {
  bbox,
  clampPoint,
  type DraftShape,
  type GeoShape,
  type GeoToolId,
  type HandleId,
  type Vec2,
} from './drawTypes';
import { ShapeTransformHandles } from './ShapeTransformHandles';

export interface GeoDrawCanvasHandle {
  /** Returns the canvas-relative point in normalized [0,1] for a client xy. */
  toLocal: (clientX: number, clientY: number) => Vec2;
  /** Returns the rect of the SVG element (for popover anchoring). */
  getRect: () => DOMRect | null;
}

export interface GeoDrawCanvasProps {
  shapes: GeoShape[];
  draft: DraftShape | null;
  selectedId: string | null;
  activeToolId: GeoToolId;
  showGrid: boolean;
  showEntities: boolean;
  onCanvasPointerDown: (p: Vec2, opts?: { onShapeId?: string }) => void;
  onCanvasPointerMove: (p: Vec2) => void;
  onCanvasPointerUp: (p: Vec2) => void;
  onCanvasDoubleClick: (p: Vec2) => void;
  onHandleDown: (handle: HandleId, shapeId: string, origin: Vec2) => void;
  /** Called whenever the selected shape's screen bbox changes — used to anchor the edit popover. */
  onSelectionRectChange?: (rect: DOMRect | null) => void;
}

function project(lat: number, lng: number): { x: number; y: number } {
  const x = (lng - SANDBOX_BOUNDS.minLng) / (SANDBOX_BOUNDS.maxLng - SANDBOX_BOUNDS.minLng);
  const y = 1 - (lat - SANDBOX_BOUNDS.minLat) / (SANDBOX_BOUNDS.maxLat - SANDBOX_BOUNDS.minLat);
  return { x, y };
}

export const GeoDrawCanvas = forwardRef<GeoDrawCanvasHandle, GeoDrawCanvasProps>(
  function GeoDrawCanvas(
    {
      shapes,
      draft,
      selectedId,
      activeToolId,
      showGrid,
      showEntities,
      onCanvasPointerDown,
      onCanvasPointerMove,
      onCanvasPointerUp,
      onCanvasDoubleClick,
      onHandleDown,
      onSelectionRectChange,
    },
    ref,
  ) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    const toLocal = useCallback((clientX: number, clientY: number): Vec2 => {
      const el = svgRef.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      const x = (clientX - r.left) / Math.max(r.width, 1);
      const y = (clientY - r.top) / Math.max(r.height, 1);
      return clampPoint({ x, y });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        toLocal,
        getRect: () => svgRef.current?.getBoundingClientRect() ?? null,
      }),
      [toLocal],
    );

    // Notify host of the selection rect (in client coords) so it can anchor
    // the edit panel on the actual selection, even after transforms.
    useEffect(() => {
      if (!onSelectionRectChange) return;
      const el = svgRef.current;
      if (!el || !selectedId) {
        onSelectionRectChange(null);
        return;
      }
      const shape = shapes.find((s) => s.id === selectedId);
      if (!shape) {
        onSelectionRectChange(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const b = bbox(shape.points);
      const isPoint = shape.kind === 'point';
      const minX = isPoint ? (shape.points[0]?.x ?? 0.5) - 0.02 : b.minX;
      const maxX = isPoint ? (shape.points[0]?.x ?? 0.5) + 0.02 : b.maxX;
      const minY = isPoint ? (shape.points[0]?.y ?? 0.5) - 0.02 : b.minY;
      const maxY = isPoint ? (shape.points[0]?.y ?? 0.5) + 0.02 : b.maxY;
      const x = r.left + minX * r.width;
      const y = r.top + minY * r.height;
      const w = (maxX - minX) * r.width;
      const h = (maxY - minY) * r.height;
      onSelectionRectChange(new DOMRect(x, y, w, h));
    }, [selectedId, shapes, onSelectionRectChange]);

    const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
      // Hit-test shapes BEFORE forwarding to the controller. `data-shape-id`
      // is set on each rendered shape body. Transform-handle pointerdowns
      // stop propagation in their own handler so we never see them here.
      const target = e.target as SVGElement | null;
      const shapeId = target?.getAttribute('data-shape-id') ?? undefined;
      const local = toLocal(e.clientX, e.clientY);
      // Capture so move/up land on us even if the pointer leaves the element.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      // A shape-click with no in-flight draft drops us into Select mode and
      // selects the shape — even if a draw tool was active. We start a body
      // drag from the SAME gesture so click-and-drag moves the shape, no
      // matter which tool was last chosen.
      const isShapeClick = !!shapeId && !draft;
      onCanvasPointerDown(local, { onShapeId: shapeId });
      if (isShapeClick) {
        onHandleDown('body', shapeId!, local);
      }
    };

    const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
      onCanvasPointerMove(toLocal(e.clientX, e.clientY));
    };

    const handlePointerUp = (e: PointerEvent<SVGSVGElement>) => {
      onCanvasPointerUp(toLocal(e.clientX, e.clientY));
    };

    const handleDoubleClick = (e: PointerEvent<SVGSVGElement>) => {
      onCanvasDoubleClick(toLocal(e.clientX, e.clientY));
    };

    const cursor = useMemo<CSSProperties['cursor']>(() => {
      if (activeToolId === 'select') return 'default';
      if (activeToolId === 'criticalPoint') return 'cell';
      if (activeToolId === 'freeDraw') return 'crosshair';
      return 'crosshair';
    }, [activeToolId]);

    const selected = useMemo(
      () => shapes.find((s) => s.id === selectedId) ?? null,
      [shapes, selectedId],
    );

    return (
      <div className="relative w-full">
        <svg
          ref={svgRef}
          role="application"
          aria-label="Geo drawing canvas"
          viewBox="0 0 1000 625"
          preserveAspectRatio="none"
          className="block aspect-[16/10] w-full select-none rounded-lg border border-border-default bg-[#0b0f14] ring-1 ring-inset ring-border-subtle"
          style={{ cursor, touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => e.preventDefault()}
        >
          {showGrid && (
            <g pointerEvents="none">
              {Array.from({ length: 11 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={(i * 1000) / 10}
                  y1={0}
                  x2={(i * 1000) / 10}
                  y2={625}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: 11 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={(i * 625) / 10}
                  x2={1000}
                  y2={(i * 625) / 10}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
              ))}
            </g>
          )}

          {showEntities && (
            <g pointerEvents="none" opacity={0.55}>
              {SANDBOX_ENTITIES.map((entity) => {
                const { x, y } = project(entity.position.lat, entity.position.lng);
                return (
                  <g key={entity.id} transform={`translate(${x * 1000} ${y * 625})`}>
                    <circle r={4} fill="#94a3b8" />
                    <text
                      x={6}
                      y={3}
                      fontSize={10}
                      fill="rgba(255,255,255,0.5)"
                      style={{ fontFamily: 'system-ui, sans-serif' }}
                    >
                      {entity.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Persisted shapes */}
          {shapes.map((shape) => (
            <ShapeBody
              key={shape.id}
              shape={shape}
              selected={shape.id === selectedId}
            />
          ))}

          {/* Draft preview */}
          {draft && <DraftPreview draft={draft} />}

          {/* Selection chrome + handles */}
          {selected && (
            <ShapeTransformHandles
              shape={selected}
              width={1000}
              height={625}
              onHandleDown={(handle, _e, origin) =>
                onHandleDown(handle, selected.id, origin)
              }
            />
          )}
        </svg>
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Shape rendering
// ---------------------------------------------------------------------------

function ShapeBody({ shape, selected }: { shape: GeoShape; selected: boolean }) {
  const stroke = shape.color;
  const fill = withAlpha(shape.color, shape.fillOpacity);
  const strokeWidth = selected ? 2.5 : 2;
  const haloOpacity = selected ? 0.9 : 0.7;

  if (shape.kind === 'point') {
    const p = shape.points[0] ?? { x: 0.5, y: 0.5 };
    const cx = p.x * 1000;
    const cy = p.y * 625;
    return (
      <g
        data-shape-id={shape.id}
        style={{ cursor: 'pointer' }}
      >
        {selected && (
          <circle cx={cx} cy={cy} r={14} fill="none" stroke={stroke} strokeOpacity={0.4} strokeWidth={1.5} />
        )}
        <circle cx={cx} cy={cy} r={7} fill={stroke} stroke="#0f172a" strokeWidth={1.25} opacity={haloOpacity} />
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill="#0f172a"
          pointerEvents="none"
        />
      </g>
    );
  }

  const d = pathFromPoints(shape.points, shape.kind === 'polygon' || shape.kind === 'freehand');

  return (
    <path
      data-shape-id={shape.id}
      d={d}
      fill={shape.kind === 'polyline' ? 'none' : fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{ cursor: 'pointer' }}
    />
  );
}

function DraftPreview({ draft }: { draft: DraftShape }) {
  if (draft.points.length === 0) return null;

  if (draft.kind === 'point') {
    const p = draft.points[0];
    return (
      <circle cx={p.x * 1000} cy={p.y * 625} r={6} fill="#facc15" opacity={0.8} />
    );
  }

  const cursor = draft.cursor;
  const previewPoints = cursor && draft.kind !== 'freehand' ? [...draft.points, cursor] : draft.points;
  const close = draft.kind === 'polygon';
  const d = pathFromPoints(previewPoints, close);

  return (
    <g pointerEvents="none">
      {/* Path so far */}
      <path
        d={d}
        fill={close ? 'rgba(56,189,248,0.12)' : 'none'}
        stroke="#facc15"
        strokeWidth={2}
        strokeDasharray={draft.kind === 'freehand' ? undefined : '5 4'}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Vertex dots */}
      {draft.points.map((p, i) => (
        <circle
          key={i}
          cx={p.x * 1000}
          cy={p.y * 625}
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
// Path / color helpers
// ---------------------------------------------------------------------------

function pathFromPoints(points: { x: number; y: number }[], close: boolean): string {
  if (points.length === 0) return '';
  const head = `M ${points[0].x * 1000} ${points[0].y * 625}`;
  const rest = points
    .slice(1)
    .map((p) => `L ${p.x * 1000} ${p.y * 625}`)
    .join(' ');
  return `${head} ${rest}${close ? ' Z' : ''}`;
}

function withAlpha(hex: string, alpha: number): string {
  // Accept #rgb / #rrggbb. Fall back to passing the value through if it's not
  // recognized, which keeps us safe against future palette additions.
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
