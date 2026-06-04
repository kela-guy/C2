import { useId } from 'react';
import type { DetectionBox } from '@/app/components/camera-v2/types';

export interface AiDetectionTrianglesProps {
  detections: DetectionBox[];
}

/** Fixed marker size in px (square), independent of the detection box size. */
const MARKER_SIZE = 32;

/** Triangle vertices in a square 0..100 viewBox (apex pointing down). */
const TRI = '10,22 90,22 50,86';

export function AiDetectionTriangles({ detections }: AiDetectionTrianglesProps) {
  const filterId = useId();
  const gradId = useId();

  if (detections.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <style>{ENTRANCE_KEYFRAMES}</style>
      <svg className="absolute size-0 overflow-visible" width="0" height="0" aria-hidden>
        <defs>
          <filter
            id={filterId}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="1.2" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent-cyan)" stopOpacity={0.42} />
            <stop offset="1" stopColor="var(--accent-cyan)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
      </svg>
      {detections.map((d) => (
        <TriangleMarker key={d.id} detection={d} filterId={filterId} gradId={gradId} />
      ))}
    </div>
  );
}

const ENTRANCE_KEYFRAMES = `
@keyframes ai-detection-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.86); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.ai-detection-marker {
  animation: ai-detection-in 200ms ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .ai-detection-marker {
    animation: none;
  }
}
`;

function TriangleMarker({
  detection,
  filterId,
  gradId,
}: {
  detection: DetectionBox;
  filterId: string;
  gradId: string;
}) {
  return (
    <div
      className="ai-detection-marker absolute"
      style={{
        // Centre the fixed-size marker on the detection.
        left: `${(detection.x + detection.w / 2) * 100}%`,
        top: `${(detection.y + detection.h / 2) * 100}%`,
        width: MARKER_SIZE,
        height: MARKER_SIZE,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <svg viewBox="0 0 100 100" className="size-full overflow-visible" aria-hidden>
        <polygon points={TRI} fill={`url(#${gradId})`} />
        <polygon
          points={TRI}
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
}
