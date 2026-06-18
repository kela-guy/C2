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
import { useMapDraw } from './MapDrawProvider';

export interface MapDrawOverlayProps {
  className?: string;
}

const VIEWBOX_W = 1000;
const VIEWBOX_H = 625;

export function MapDrawOverlay({ className }: MapDrawOverlayProps) {
  const { draw, drawTool } = useMapDraw();
  const svgRef = useRef<SVGSVGElement | null>(null);

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
          draw.deleteShape(draw.selectedId);
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
    if (isShapeClick) {
      draw.beginHandleDrag('body', shapeId!, local);
    }
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

  // Centered name label rendered in foreign HTML so the font matches the
  // rest of the UI. Only rendered for shapes the user has actually named
  // (i.e. not the auto `${tool.label} N` placeholder).
  const labelInfo = useMemo(() => {
    const shape = draw.selectedShape;
    if (!shape || shape.kind === 'point') return null;
    const el = svgRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = bbox(shape.points);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    return {
      shape,
      left: r.left + cx * r.width,
      top: r.top + cy * r.height,
    };
    // shapes is included so the label re-anchors live during a transform.
  }, [draw.selectedShape, draw.shapes]);

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
        {draw.shapes.map((shape) => (
          <ShapeBody
            key={shape.id}
            shape={shape}
            selected={shape.id === draw.selectedId}
            interactive={interactive}
          />
        ))}

        {draw.draft && <DraftPreview draft={draw.draft} />}

        {draw.selectedShape && (
          <ShapeTransformHandles
            shape={draw.selectedShape}
            width={VIEWBOX_W}
            height={VIEWBOX_H}
            onHandleDown={(handle, _e, origin) =>
              draw.beginHandleDrag(handle, draw.selectedShape!.id, origin)
            }
          />
        )}
      </svg>

      {labelInfo && hasUserName(labelInfo.shape.name) && (
        <div
          className="pointer-events-none fixed z-30"
          style={{
            left: labelInfo.left,
            top: labelInfo.top,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="rounded-md px-3 py-1.5 text-[13px] font-semibold text-white drop-shadow">
            {labelInfo.shape.name}
          </span>
        </div>
      )}
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
  const stroke = shape.color;
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

  const d = pathFromPoints(shape.points, shape.kind === 'polygon' || shape.kind === 'freehand');

  return (
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
 * `useGeoDraw` defaults a shape's name to `${tool.label} N`. Treat any
 * such auto-generated string as "no real name" so the on-shape label
 * stays hidden until the user types a real annotation in the panel.
 */
function hasUserName(name: string | undefined): boolean {
  if (!name || name.trim().length === 0) return false;
  return !/^(Polygon|Line|Curve|No Fly Zone|Patrol Area|Virtual Wall|Critical Point|Free Drawing) \d+$/.test(
    name,
  );
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
