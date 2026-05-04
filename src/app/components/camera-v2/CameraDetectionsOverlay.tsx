/**
 * Renders labelled bounding boxes over a camera feed.
 *
 * Boxes are normalised (0..1) so they re-anchor when the tile resizes. Pure
 * presentation; the toggle lives in `CameraControlBar` and the data is mocked
 * at the playground level until a real detection backend is wired.
 */

import type { DetectionBox } from './types';

interface CameraDetectionsOverlayProps {
  detections: DetectionBox[];
  visible: boolean;
}

function colorForConfidence(confidence: number): { stroke: string; fill: string; text: string } {
  if (confidence >= 0.85) return { stroke: 'rgba(74,222,128,0.95)', fill: 'rgba(74,222,128,0.12)', text: '#bbf7d0' };
  if (confidence >= 0.6) return { stroke: 'rgba(251,191,36,0.95)', fill: 'rgba(251,191,36,0.12)', text: '#fde68a' };
  return { stroke: 'rgba(248,113,113,0.95)', fill: 'rgba(248,113,113,0.12)', text: '#fecaca' };
}

export function CameraDetectionsOverlay({ detections, visible }: CameraDetectionsOverlayProps) {
  if (!visible || detections.length === 0) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {detections.map((d) => {
          const { stroke, fill } = colorForConfidence(d.confidence);
          const x = d.x * 100;
          const y = d.y * 100;
          const w = d.w * 100;
          const h = d.h * 100;
          return (
            <rect
              key={d.id}
              x={x}
              y={y}
              width={w}
              height={h}
              stroke={stroke}
              strokeWidth={1}
              fill={fill}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {detections.map((d) => {
        const { text } = colorForConfidence(d.confidence);
        const leftPct = `${d.x * 100}%`;
        const topPct = `${Math.max(0, d.y * 100 - 3)}%`;
        return (
          <div
            key={`${d.id}-label`}
            className="absolute font-mono text-[9px] tracking-wide whitespace-nowrap"
            style={{
              left: leftPct,
              top: topPct,
              color: text,
              textShadow: '0 1px 2px rgba(0,0,0,0.85)',
            }}
          >
            {d.label} · {Math.round(d.confidence * 100)}%
          </div>
        );
      })}
    </div>
  );
}
