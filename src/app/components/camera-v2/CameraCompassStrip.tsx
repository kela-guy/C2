/**
 * Horizontal heading strip inspired by Call of Duty: Warzone's HUD.
 *
 * Anatomy (top to bottom):
 *   - Cardinals + intercardinals (N NE E SE S SW W NW) with tick marks.
 *   - Big yellow degrees number (dynamic, integer).
 *
 * The strip "scrolls" horizontally as the bearing changes. The center
 * marker stays fixed and represents the camera's current heading.
 */

import { useId } from 'react';

interface CameraCompassStripProps {
  bearingDeg: number;
  /** Total visible angular range in degrees. Default 120. */
  rangeDeg?: number;
  /** Total strip width in CSS pixels. Default 280. */
  width?: number;
  className?: string;
}

const CARDINALS: { label: string; deg: number; major: boolean }[] = [
  { label: 'N', deg: 0, major: true },
  { label: 'NE', deg: 45, major: false },
  { label: 'E', deg: 90, major: true },
  { label: 'SE', deg: 135, major: false },
  { label: 'S', deg: 180, major: true },
  { label: 'SW', deg: 225, major: false },
  { label: 'W', deg: 270, major: true },
  { label: 'NW', deg: 315, major: false },
];

function normalise(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Shortest signed angle from `from` to `to`, in degrees, in [-180, 180]. */
function shortestDelta(from: number, to: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return diff;
}

export function CameraCompassStrip({
  bearingDeg,
  rangeDeg = 120,
  width = 280,
  className,
}: CameraCompassStripProps) {
  const id = useId();
  const heading = normalise(bearingDeg);
  const half = rangeDeg / 2;

  // Pixel-per-degree for laying out ticks.
  const pxPerDeg = width / rangeDeg;
  const cx = width / 2;

  // Build tick marks every 5 degrees, but only render those inside the
  // visible window. We scan a wider window (rangeDeg * 2) and let the SVG
  // viewBox clip the rest.
  const tickStep = 5;
  const ticks: { x: number; major: boolean }[] = [];
  for (let d = -half - tickStep; d <= half + tickStep; d += tickStep) {
    const absDeg = heading + d;
    const major = Math.abs(((absDeg % 10) + 10) % 10) < 0.001;
    ticks.push({ x: cx + d * pxPerDeg, major });
  }

  // Cardinal labels: only render those inside (or near) the visible window.
  const cardinals = CARDINALS.flatMap(({ label, deg, major }) => {
    // Render at multiple offsets so wraparound (e.g., bearing 350 -> N at +10)
    // works seamlessly.
    const offsets = [-360, 0, 360];
    return offsets
      .map((o) => {
        const delta = shortestDelta(heading, deg + o);
        if (Math.abs(delta) > half + 6) return null;
        return { label, x: cx + delta * pxPerDeg, major };
      })
      .filter((x): x is { label: string; x: number; major: boolean } => !!x);
  });

  const stripHeight = 28;

  return (
    <div className={className} style={{ width }}>
      <svg
        width={width}
        height={stripHeight}
        viewBox={`0 0 ${width} ${stripHeight}`}
        className="block"
        role="img"
        aria-labelledby={id}
      >
        <title id={id}>{`Camera bearing ${Math.round(heading)} degrees`}</title>

        <line x1={0} y1={4} x2={width} y2={4} stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />

        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x}
            y1={4}
            x2={t.x}
            y2={t.major ? 11 : 8}
            stroke={t.major ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)'}
            strokeWidth={1}
          />
        ))}

        {cardinals.map((c, i) => (
          <text
            key={i}
            x={c.x}
            y={22}
            textAnchor="middle"
            fontSize={c.major ? 10 : 8.5}
            fontWeight={c.major ? 700 : 500}
            fill={c.label === 'N' ? '#fca5a5' : 'rgba(255,255,255,0.75)'}
            style={{ letterSpacing: '0.04em' }}
          >
            {c.label}
          </text>
        ))}

        <line
          x1={cx}
          y1={1}
          x2={cx}
          y2={stripHeight - 4}
          stroke="#fde047"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <polygon points={`${cx - 4},0 ${cx + 4},0 ${cx},5`} fill="#fde047" />
      </svg>

      <div
        className="text-center font-mono text-[20px] leading-none tracking-tight tabular-nums mt-0.5"
        style={{ color: '#fde047', textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
        aria-live="polite"
      >
        {Math.round(heading).toString().padStart(3, '0')}
      </div>
    </div>
  );
}
