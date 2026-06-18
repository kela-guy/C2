/**
 * Geo Drawing Sandbox — selection bbox + transform handles.
 *
 * Renders the dashed selection rectangle, the eight scale handles (4 corners +
 * 4 edges), and the rotate handle dangling above the bbox top edge. Every
 * handle is its own `<rect>`/`<circle>` with a `pointer-events: all` hit area;
 * the parent canvas wires `onPointerDown` here to start a transform drag and
 * lets the controller take over via `setPointerCapture`.
 *
 * Coordinates passed in are normalized (0..1). The component multiplies by
 * the actual canvas size received as `width`/`height` to render in pixels.
 */

import type { CSSProperties, PointerEvent } from 'react';
import { bbox, bboxCenter, type GeoShape, type HandleId } from './drawTypes';

const HANDLE_SIZE_PX = 10;
const ROTATE_OFFSET_PX = 22;

export interface ShapeTransformHandlesProps {
  shape: GeoShape;
  width: number;
  height: number;
  /** Called when the user grabs a handle. Origin is normalized canvas space. */
  onHandleDown: (
    handle: HandleId,
    e: PointerEvent<SVGElement>,
    origin: { x: number; y: number },
  ) => void;
}

interface HandleSpec {
  id: HandleId;
  /** Normalized position in [0, 1] across the bbox. */
  cx: number;
  cy: number;
  cursor: CSSProperties['cursor'];
}

export function ShapeTransformHandles({
  shape,
  width,
  height,
  onHandleDown,
}: ShapeTransformHandlesProps) {
  const b = bbox(shape.points);
  const center = bboxCenter(b);
  const px = (n: number) => n * width;
  const py = (n: number) => n * height;

  const x = px(b.minX);
  const y = py(b.minY);
  const w = px(b.maxX - b.minX);
  const h = py(b.maxY - b.minY);

  const handles: HandleSpec[] = [
    { id: 'nw', cx: b.minX, cy: b.minY, cursor: 'nwse-resize' },
    { id: 'n', cx: center.x, cy: b.minY, cursor: 'ns-resize' },
    { id: 'ne', cx: b.maxX, cy: b.minY, cursor: 'nesw-resize' },
    { id: 'e', cx: b.maxX, cy: center.y, cursor: 'ew-resize' },
    { id: 'se', cx: b.maxX, cy: b.maxY, cursor: 'nwse-resize' },
    { id: 's', cx: center.x, cy: b.maxY, cursor: 'ns-resize' },
    { id: 'sw', cx: b.minX, cy: b.maxY, cursor: 'nesw-resize' },
    { id: 'w', cx: b.minX, cy: center.y, cursor: 'ew-resize' },
  ];

  // For point shapes the bbox is degenerate (zero area); skip the dashed rect
  // but still render the rotate / scale handles so the affordances exist.
  const isPoint = shape.kind === 'point';

  return (
    <g pointerEvents="none">
      {!isPoint && (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Rotate handle: line + circle floating above the top edge midpoint. */}
      {!isPoint && (
        <>
          <line
            x1={px(center.x)}
            y1={y}
            x2={px(center.x)}
            y2={y - ROTATE_OFFSET_PX}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={px(center.x)}
            cy={y - ROTATE_OFFSET_PX}
            r={HANDLE_SIZE_PX / 2 + 1}
            fill="#0f172a"
            stroke="white"
            strokeWidth={1.25}
            style={{ cursor: 'grab' }}
            pointerEvents="all"
            onPointerDown={(e) => {
              e.stopPropagation();
              // Capture on the parent SVG so move/up events land there even
              // when the cursor leaves the canvas during a fast drag.
              e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId);
              onHandleDown('rotate', e, {
                x: center.x,
                y: b.minY - ROTATE_OFFSET_PX / Math.max(height, 1),
              });
            }}
          />
        </>
      )}

      {!isPoint &&
        handles.map((handle) => (
          <rect
            key={handle.id}
            x={px(handle.cx) - HANDLE_SIZE_PX / 2}
            y={py(handle.cy) - HANDLE_SIZE_PX / 2}
            width={HANDLE_SIZE_PX}
            height={HANDLE_SIZE_PX}
            fill="#0f172a"
            stroke="white"
            strokeWidth={1.25}
            style={{ cursor: handle.cursor }}
            pointerEvents="all"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId);
              onHandleDown(handle.id, e, { x: handle.cx, y: handle.cy });
            }}
          />
        ))}

      {/* Point shapes: a single ring around the dot to anchor the move drag. */}
      {isPoint && (
        <circle
          cx={px(shape.points[0]?.x ?? 0.5)}
          cy={py(shape.points[0]?.y ?? 0.5)}
          r={14}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
