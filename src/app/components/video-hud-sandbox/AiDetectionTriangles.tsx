import { useId } from 'react';
import type { DetectionBox } from '@/app/components/camera-v2/types';

export interface AiDetectionTrianglesProps {
  detections: DetectionBox[];
}

export function AiDetectionTriangles({ detections }: AiDetectionTrianglesProps) {
  const filterId = useId();

  if (detections.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <style>{ENTRANCE_KEYFRAMES}</style>
      <svg
        className="absolute size-0 overflow-visible"
        width="0"
        height="0"
        aria-hidden
      >
        <defs>
          <filter
            id={filterId}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="1.4" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      {detections.map((d) => (
        <TriangleMarker key={d.id} detection={d} filterId={filterId} />
      ))}
    </div>
  );
}

const ENTRANCE_KEYFRAMES = `
@keyframes ai-detection-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
.ai-detection-marker {
  animation: ai-detection-in 200ms ease-out both;
  transform-origin: center;
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
}: {
  detection: DetectionBox;
  filterId: string;
}) {
  return (
    <div
      className="ai-detection-marker absolute"
      style={{
        left: `${detection.x * 100}%`,
        top: `${detection.y * 100}%`,
        width: `${detection.w * 100}%`,
        height: `${detection.h * 100}%`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="size-full overflow-visible"
        aria-hidden
      >
        <polygon
          points="0,0 100,0 50,100"
          fill="none"
          stroke="var(--accent-info)"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
}
