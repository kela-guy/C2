/**
 * `/video-hud-sandbox` — AI analytics triangle marker design lab.
 *
 * Ten visual variants of the AI-detection triangle that highlights detected
 * objects on the live feed. Each tile renders the variant over a faux video
 * panel at two sizes so stroke weight, glow and motion read correctly before a
 * direction is wired into `AiDetectionTriangles`. Sandbox-only — nothing here is
 * imported by production chrome.
 */

import { useId, type ReactNode } from 'react';
import { DirIsland } from '@/lib/direction';

/** AI accent colour token used across every variant. */
const C = 'var(--accent-info)';
/** `color-mix` helper for translucent fills/glows from the accent token. */
const mix = (pct: number) => `color-mix(in srgb, ${C} ${pct}%, transparent)`;

// Triangle vertices in a square 0..100 viewBox (apex pointing down). HTML
// overlays use the same numbers as percentages so dots/labels line up with the
// SVG geometry (square container + preserveAspectRatio meet => 1 unit = 1%).
const VTX = { ax: 10, ay: 22, bx: 90, by: 22, cx: 50, cy: 86 } as const;
const TRI = `${VTX.ax},${VTX.ay} ${VTX.bx},${VTX.by} ${VTX.cx},${VTX.cy}`;
const CENTROID = {
  x: (VTX.ax + VTX.bx + VTX.cx) / 3,
  y: (VTX.ay + VTX.by + VTX.cy) / 3,
};

interface Variant {
  id: number;
  name: string;
  desc: string;
}

const VARIANTS: Variant[] = [
  { id: 1, name: 'Outline', desc: 'Clean stroke + soft glow' },
  { id: 2, name: 'Corner ticks', desc: 'Acquisition-style corner accents' },
  { id: 3, name: 'Glass fill', desc: 'Gradient fill with a crisp edge' },
  { id: 4, name: 'Nested', desc: 'Double outline for depth' },
  { id: 5, name: 'Marching ants', desc: 'Animated dashed stroke' },
  { id: 6, name: 'Radar pulse', desc: 'Expanding ghost echo' },
  { id: 7, name: 'Apex tag', desc: 'Confidence chip at the apex' },
  { id: 8, name: 'Reticle', desc: 'Crosshair + centre lock' },
  { id: 9, name: 'Vertex nodes', desc: 'Glowing graph nodes' },
  { id: 10, name: 'Scan sweep', desc: 'Holographic scanline' },
];

interface Placement {
  /** Centre-left as a % of the tile width. */
  left: number;
  /** Top as a % of the tile height. */
  top: number;
  /** Marker size as a % of the tile width (square). */
  size: number;
  conf: number;
}

const PREVIEW: Placement[] = [
  { left: 18, top: 20, size: 30, conf: 0.92 },
  { left: 60, top: 44, size: 19, conf: 0.74 },
];

/** Linear interpolation of a vertex toward the centroid by `t` (0..1). */
function toward(x: number, y: number, t: number): [number, number] {
  return [x + (CENTROID.x - x) * t, y + (CENTROID.y - y) * t];
}

function VariantMarker({ variant, conf }: { variant: number; conf: number }) {
  const raw = useId();
  const uid = raw.replace(/:/g, '');
  const glow = `g-${uid}`;
  const grad = `lg-${uid}`;

  const glowDef = (
    <filter id={glow} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation="1.3" />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );

  const svg = (children: ReactNode, defs?: ReactNode) => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <defs>
        {glowDef}
        {defs}
      </defs>
      {children}
    </svg>
  );

  const baseOutline = (
    <polygon
      points={TRI}
      fill="none"
      stroke={C}
      strokeWidth={2.5}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      filter={`url(#${glow})`}
    />
  );

  switch (variant) {
    case 1:
      return svg(baseOutline);

    case 2: {
      // Each corner draws a short tick down each adjacent edge (target-lock).
      const edges: Array<[number, number, [number, number][]]> = [
        [VTX.ax, VTX.ay, [[VTX.bx, VTX.by], [VTX.cx, VTX.cy]]],
        [VTX.bx, VTX.by, [[VTX.ax, VTX.ay], [VTX.cx, VTX.cy]]],
        [VTX.cx, VTX.cy, [[VTX.ax, VTX.ay], [VTX.bx, VTX.by]]],
      ];
      return svg(
        edges.map(([x, y, neighbours], i) =>
          neighbours.map(([nx, ny], j) => {
            const [ex, ey] = [x + (nx - x) * 0.3, y + (ny - y) * 0.3];
            return (
              <line
                key={`${i}-${j}`}
                x1={x}
                y1={y}
                x2={ex}
                y2={ey}
                stroke={C}
                strokeWidth={2.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter={`url(#${glow})`}
              />
            );
          }),
        ),
      );
    }

    case 3:
      return svg(
        <>
          <polygon points={TRI} fill={`url(#${grad})`} />
          <polygon
            points={TRI}
            fill="none"
            stroke={C}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            filter={`url(#${glow})`}
          />
        </>,
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C} stopOpacity={0.42} />
          <stop offset="1" stopColor={C} stopOpacity={0.02} />
        </linearGradient>,
      );

    case 4: {
      const [iax, iay] = toward(VTX.ax, VTX.ay, 0.3);
      const [ibx, iby] = toward(VTX.bx, VTX.by, 0.3);
      const [icx, icy] = toward(VTX.cx, VTX.cy, 0.3);
      return svg(
        <>
          {baseOutline}
          <polygon
            points={`${iax},${iay} ${ibx},${iby} ${icx},${icy}`}
            fill="none"
            stroke={C}
            strokeOpacity={0.5}
            strokeWidth={1.25}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </>,
      );
    }

    case 5:
      return svg(
        <polygon
          className="tri-ants"
          points={TRI}
          fill="none"
          stroke={C}
          strokeWidth={2}
          strokeDasharray="7 5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${glow})`}
        />,
      );

    case 6:
      return svg(
        <>
          <polygon
            className="tri-pulse"
            points={TRI}
            fill="none"
            stroke={C}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
          {baseOutline}
        </>,
      );

    case 7:
      return (
        <>
          {svg(baseOutline)}
          <span
            className="absolute -translate-x-1/2 rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] font-semibold leading-none tabular-nums text-surface-void shadow-sm"
            style={{
              left: `${VTX.cx}%`,
              top: `${VTX.cy}%`,
              marginTop: 6,
              backgroundColor: C,
            }}
          >
            {Math.round(conf * 100)}%
          </span>
        </>
      );

    case 8:
      return svg(
        <>
          {baseOutline}
          <line
            x1={CENTROID.x - 8}
            y1={CENTROID.y}
            x2={CENTROID.x + 8}
            y2={CENTROID.y}
            stroke={C}
            strokeWidth={1.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={CENTROID.x}
            y1={CENTROID.y - 8}
            x2={CENTROID.x}
            y2={CENTROID.y + 8}
            stroke={C}
            strokeWidth={1.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={CENTROID.x} cy={CENTROID.y} r={1.8} fill={C} />
        </>,
      );

    case 9:
      return (
        <>
          {svg(
            <polygon
              points={TRI}
              fill="none"
              stroke={C}
              strokeOpacity={0.55}
              strokeWidth={1.25}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />,
          )}
          {[
            [VTX.ax, VTX.ay],
            [VTX.bx, VTX.by],
            [VTX.cx, VTX.cy],
          ].map(([x, y], i) => (
            <span
              key={i}
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                backgroundColor: C,
                boxShadow: `0 0 6px 1px ${mix(70)}`,
              }}
            />
          ))}
        </>
      );

    case 10:
      return (
        <>
          {svg(baseOutline)}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: `polygon(${VTX.ax}% ${VTX.ay}%, ${VTX.bx}% ${VTX.by}%, ${VTX.cx}% ${VTX.cy}%)`,
            }}
          >
            <div
              className="tri-scan absolute inset-x-0"
              style={{
                height: '34%',
                background: `linear-gradient(to bottom, transparent, ${mix(55)}, transparent)`,
              }}
            />
          </div>
        </>
      );

    default:
      return svg(baseOutline);
  }
}

function FauxScene() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,#16242e_0%,#0a0f14_60%,#05080b_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 26px), repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 26px)',
        }}
      />
      <div className="absolute left-[24%] top-[46%] size-24 rounded-full bg-white/[0.04] blur-2xl" />
      <div className="absolute right-[18%] top-[28%] size-16 rounded-full bg-white/[0.03] blur-xl" />
    </>
  );
}

function VariantTile({ variant }: { variant: Variant }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-slate-12">
          <span className="font-mono text-slate-9">{String(variant.id).padStart(2, '0')}</span>{' '}
          {variant.name}
        </span>
        <span className="text-[10px] text-slate-10">{variant.desc}</span>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-md ring-1 ring-inset ring-white/10">
        <FauxScene />
        {PREVIEW.map((p, i) => (
          <div
            key={i}
            className="tri-in absolute"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.size}%`, aspectRatio: '1 / 1' }}
          >
            <VariantMarker variant={variant.id} conf={p.conf} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiTriangleLab() {
  return (
    <DirIsland direction="ltr" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <style>{KEYFRAMES}</style>
      <div>
        <h2 className="text-sm font-semibold text-slate-12">AI analytics triangle — 10 variants</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-11">
          Design studies for the marker that highlights AI-detected objects on the feed. Each tile shows the variant over
          a faux night scene at two sizes. Pick a direction and we&apos;ll wire it into{' '}
          <code className="rounded bg-black/40 px-1 py-px text-[11px] text-slate-12">AiDetectionTriangles</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VARIANTS.map((v) => (
          <VariantTile key={v.id} variant={v} />
        ))}
      </div>
    </DirIsland>
  );
}

const KEYFRAMES = `
@keyframes tri-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.tri-in { animation: tri-in 220ms ease-out both; transform-origin: center; }
@keyframes tri-ants { to { stroke-dashoffset: -24; } }
.tri-ants { animation: tri-ants 700ms linear infinite; }
@keyframes tri-pulse { 0% { opacity: 0.7; transform: scale(0.96); } 100% { opacity: 0; transform: scale(1.5); } }
.tri-pulse { animation: tri-pulse 1.8s ease-out infinite; }
@keyframes tri-scan { 0% { transform: translateY(-120%); } 100% { transform: translateY(360%); } }
.tri-scan { animation: tri-scan 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .tri-in, .tri-ants, .tri-pulse, .tri-scan { animation: none; }
}
`;

export default AiTriangleLab;
