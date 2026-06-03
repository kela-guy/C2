/**
 * Vertical angular-depression bar — the camera-pitch counterpart to
 * {@link CameraCompassStrip}. The strip scrolls vertically as the
 * depression angle changes; the fixed center marker represents the
 * camera's current pitch (0 = horizon, negative = looking down).
 */

import { useId } from 'react';
import { accentHex } from '@/primitives/accentHex';

const HUD_HEADING = accentHex('warning');

interface CameraDepressionBarProps {
  pitchDeg: number;
  /** Total visible angular range in degrees. Default 60. */
  rangeDeg?: number;
  /** Strip height in CSS pixels. Default 220. */
  height?: number;
  className?: string;
}

interface CameraDepressionBarLayout {
  width: number;
  axisX: number;
  cy: number;
}

const LAYOUT: CameraDepressionBarLayout = { width: 64, axisX: 44, cy: 0 };

export function CameraDepressionBar({
  pitchDeg,
  rangeDeg = 60,
  height = 220,
  className,
}: CameraDepressionBarProps) {
  const id = useId();
  const half = rangeDeg / 2;
  const pxPerDeg = height / rangeDeg;
  const cy = height / 2;
  const axisX = LAYOUT.axisX;

  const tickStep = 5;
  const ticks: { y: number; major: boolean; value: number }[] = [];
  for (let d = -half - tickStep; d <= half + tickStep; d += tickStep) {
    const value = pitchDeg + d;
    const major = Math.abs(((value % 10) + 10) % 10) < 0.001;
    ticks.push({ y: cy - d * pxPerDeg, major, value: Math.round(value) });
  }

  return (
    <div className={className} style={{ width: LAYOUT.width }}>
      <svg
        width={LAYOUT.width}
        height={height}
        viewBox={`0 0 ${LAYOUT.width} ${height}`}
        className="block"
        role="img"
        aria-labelledby={id}
      >
        <title id={id}>{`Camera depression ${Math.round(pitchDeg)} degrees`}</title>

        <line
          x1={axisX}
          y1={0}
          x2={axisX}
          y2={height}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={0.5}
        />

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={axisX}
              y1={t.y}
              x2={t.major ? axisX - 7 : axisX - 4}
              y2={t.y}
              stroke={
                t.major ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)'
              }
              strokeWidth={1}
            />
            {t.major && t.y > 8 && t.y < height - 8 && (
              <text
                x={axisX - 11}
                y={t.y + 3}
                textAnchor="end"
                fontSize={8.5}
                fontWeight={500}
                fill="rgba(255,255,255,0.75)"
                style={{ letterSpacing: '0.04em' }}
              >
                {t.value}
              </text>
            )}
          </g>
        ))}

        <line
          x1={axisX - 5}
          y1={cy}
          x2={LAYOUT.width}
          y2={cy}
          stroke={HUD_HEADING}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <polygon
          points={`${LAYOUT.width},${cy - 4} ${LAYOUT.width},${cy + 4} ${LAYOUT.width - 5},${cy}`}
          fill={HUD_HEADING}
        />
      </svg>

      <div
        className="text-center font-mono text-[16px] leading-none tracking-tight tabular-nums mt-0.5"
        style={{ color: HUD_HEADING, textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
        aria-live="polite"
      >
        {`${Math.round(pitchDeg)}\u00b0`}
      </div>
    </div>
  );
}
