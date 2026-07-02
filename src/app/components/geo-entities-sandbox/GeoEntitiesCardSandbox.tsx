/**
 * Geo Entities Card Sandbox — DEV-only surface.
 *
 * Renders 5 candidate designs for the Geo Entities LIST card (the
 * `LayerRow` in {@link import('../map-draw/MapDrawPanel')}) side-by-side
 * in mock panel-width columns so a reviewer can eyeball them against
 * each other before we port a winner into the real panel. Every option
 * is inert (buttons no-op) and self-contained inside this file: mock
 * shapes, helpers, and variant components all live below so touching
 * this sandbox never risks the production panel.
 *
 * Mounted at `/geo-entities-card-sandbox` in DEV; the route is guarded
 * by `import.meta.env.DEV` in {@link import('@/app/App')} so it tree-
 * shakes out of production bundles.
 */

import { Eye, EyeOff, Lock, LockOpen, MapPin, MoreVertical, Trash2 } from '@/lib/icons/central';
import {
  CircleDrawIcon,
  LineDrawIcon,
  PolygonDrawIcon,
} from '../map-draw/icons';
import { ZONE_TYPE_BY_ID } from '../map-draw/zoneTypes';
import type { GeoAreaStatus, GeoShape } from './drawTypes';

// ---------------------------------------------------------------------------
// Mock data — a small mix so each variant demonstrates icon variety, zone
// palettes, and the hidden / locked / status states. Points are canonical
// dummy values; the sandbox never projects them.
// ---------------------------------------------------------------------------

const MOCK_POINTS = [
  { x: 0.2, y: 0.2 },
  { x: 0.6, y: 0.2 },
  { x: 0.6, y: 0.6 },
  { x: 0.2, y: 0.6 },
];

const MOCK_SHAPES: GeoShape[] = [
  {
    id: 'polygon-1',
    tool: 'polygon',
    kind: 'polygon',
    name: 'Polygon 1',
    description: 'North Perimeter',
    color: '#3b82f6',
    strokeColor: '#3b82f6',
    fillOpacity: 0.3,
    strokeOpacity: 1,
    points: MOCK_POINTS,
    zoneType: 'noFly',
    status: 'high',
    strokeWidth: 2,
    lineStyle: 'solid',
  },
  {
    id: 'line-1',
    tool: 'line',
    kind: 'polyline',
    name: 'Virtual Wall 1',
    description: '',
    color: '#a855f7',
    strokeColor: '#a855f7',
    fillOpacity: 0,
    strokeOpacity: 1,
    points: MOCK_POINTS.slice(0, 2),
    zoneType: 'restricted',
    status: 'middle',
    strokeWidth: 2,
    lineStyle: 'solid',
  },
  {
    id: 'circle-1',
    tool: 'circle',
    kind: 'circle',
    name: 'Silent Zone A',
    description: '',
    color: '#eab308',
    strokeColor: '#eab308',
    fillOpacity: 0.3,
    strokeOpacity: 1,
    points: MOCK_POINTS.slice(0, 2),
    zoneType: 'silent',
    hidden: true,
    strokeWidth: 2,
    lineStyle: 'solid',
  },
  {
    id: 'point-1',
    tool: 'point',
    kind: 'point',
    name: 'Alarm Beacon',
    description: '',
    color: '#ef4444',
    strokeColor: '#ef4444',
    fillOpacity: 1,
    strokeOpacity: 1,
    points: MOCK_POINTS.slice(0, 1),
    zoneType: 'alarm',
    locked: true,
    status: 'low',
    strokeWidth: 2,
    lineStyle: 'solid',
  },
];

// ---------------------------------------------------------------------------
// Helpers copied minimally from `MapDrawPanel.tsx` so the sandbox stays
// self-contained and doesn't force exports on the production module.
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: Record<GeoAreaStatus, { label: string; tone: string }> = {
  low: { label: 'Low', tone: '#34d399' },
  middle: { label: 'Middle', tone: '#facc15' },
  high: { label: 'High', tone: '#f43f5e' },
};

function shapeLabel(shape: GeoShape): string {
  const named = (shape.description ?? '').trim();
  return named || shape.name || 'Untitled';
}

function typeLabel(shape: GeoShape): string {
  return shape.zoneType
    ? ZONE_TYPE_BY_ID[shape.zoneType]?.label ?? ZONE_TYPE_BY_ID.noFly.label
    : ZONE_TYPE_BY_ID.noFly.label;
}

function typeColor(shape: GeoShape): string {
  return shape.zoneType
    ? ZONE_TYPE_BY_ID[shape.zoneType]?.color ?? ZONE_TYPE_BY_ID.noFly.color
    : ZONE_TYPE_BY_ID.noFly.color;
}

function ShapeKindIcon({
  kind,
  size = 15,
  className,
}: {
  kind: GeoShape['kind'];
  size?: number;
  className?: string;
}) {
  if (kind === 'circle') return <CircleDrawIcon size={size} className={className} />;
  if (kind === 'point') return <MapPin size={size} className={className} />;
  if (kind === 'polyline') return <LineDrawIcon size={size} className={className} />;
  return <PolygonDrawIcon size={size} className={className} />;
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

const OPTIONS: {
  id: string;
  label: string;
  summary: string;
  Component: (props: { shape: GeoShape }) => JSX.Element;
}[] = [
  {
    id: 'opt1',
    label: 'Opt 1 — Baseline',
    summary: "Today's card, faithful reproduction",
    Component: CardOpt1Baseline,
  },
  {
    id: 'opt2',
    label: 'Opt 2 — Compact single-row',
    summary: 'Inline type suffix, hover actions',
    Component: CardOpt2Compact,
  },
  {
    id: 'opt3',
    label: 'Opt 3 — Zone-color rail',
    summary: 'Leading 3px zone bar',
    Component: CardOpt3Rail,
  },
  {
    id: 'opt4',
    label: 'Opt 4 — Type pill',
    summary: 'Zone as tinted badge',
    Component: CardOpt4Pill,
  },
  {
    id: 'opt5',
    label: 'Opt 5 — Icon tile + kebab',
    summary: 'Tinted glyph tile, actions in kebab',
    Component: CardOpt5Kebab,
  },
  {
    id: 'opt6',
    label: 'Opt 6 — Compact + rail',
    summary: 'Opt 2 layout with Opt 3 zone rail; eye/lock/center/delete',
    Component: CardOpt6CompactRail,
  },
];

export default function GeoEntitiesCardSandbox() {
  return (
    <div
      dir="ltr"
      className="min-h-screen w-full bg-[#0f0f10] px-6 py-8 text-white"
    >
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Geo Entities Card — 5 options</h1>
        <p className="text-[12.5px] text-white/55">
          Standalone review of card designs for the map-draw panel's Layers
          list. Each column is 367px wide (matches the docked panel).
          Buttons are inert.
        </p>
      </header>

      <div className="flex flex-wrap items-start gap-5 pb-6">
        {OPTIONS.map((opt) => {
          const Card = opt.Component;
          return (
            <section
              key={opt.id}
              className="flex w-[367px] shrink-0 flex-col gap-3"
              aria-label={opt.label}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                  {opt.label}
                </span>
                <span className="text-[11px] text-white/40">{opt.summary}</span>
              </div>
              <div className="rounded-md border border-white/5 bg-[#161616] p-3">
                <ul className="space-y-1.5">
                  {MOCK_SHAPES.map((shape) => (
                    <li key={shape.id} className="list-none">
                      <Card shape={shape} />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits used by more than one variant
// ---------------------------------------------------------------------------

function VisibilityToggle({ hidden }: { hidden?: boolean }) {
  return (
    <button
      type="button"
      aria-label={hidden ? 'Show layer' : 'Hide layer'}
      title={hidden ? 'Show layer' : 'Hide layer'}
      className="grid size-6 shrink-0 place-items-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );
}

function LockToggle({
  locked,
  disabled,
}: {
  locked?: boolean;
  /**
   * When true, the button becomes a read-only badge — used by variants
   * (Opt 6) that treat "locked" as a state you can only exit from the
   * detail view. Keeps the glyph visible so the row still conveys
   * "this shape is locked".
   */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={locked ? 'Unlock layer' : 'Lock layer'}
      title={
        disabled && locked
          ? 'Locked — unlock from the detail view'
          : locked
            ? 'Unlock layer'
            : 'Lock layer'
      }
      aria-pressed={!!locked}
      className={`grid size-6 shrink-0 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
        locked ? 'text-white' : 'text-white/45'
      } ${
        disabled
          ? 'cursor-not-allowed opacity-70'
          : 'hover:bg-white/10 hover:text-white'
      }`}
    >
      {locked ? <Lock size={14} /> : <LockOpen size={14} />}
    </button>
  );
}

function CenterButton() {
  return (
    <button
      type="button"
      aria-label="Center on map"
      title="Center on map"
      className="grid size-6 shrink-0 place-items-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      <MapPin size={14} />
    </button>
  );
}

function DeleteButton() {
  return (
    <button
      type="button"
      aria-label="Delete layer"
      title="Delete layer"
      className="grid size-6 shrink-0 place-items-center rounded text-white/45 transition-colors hover:bg-rose-500/20 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      <Trash2 size={14} />
    </button>
  );
}

function StatusDot({ status }: { status?: GeoAreaStatus }) {
  if (!status) return null;
  const meta = STATUS_OPTIONS[status];
  return (
    <span
      className="ms-1 size-2 shrink-0 rounded-full ring-1 ring-inset ring-white/20"
      style={{ background: meta.tone }}
      title={`Status: ${meta.label}`}
      aria-label={`Status: ${meta.label}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Opt 1 — Baseline (faithful reproduction of today's LayerRow)
// ---------------------------------------------------------------------------

function CardOpt1Baseline({ shape }: { shape: GeoShape }) {
  return (
    <div className="group flex cursor-pointer flex-col gap-1.5 rounded-[2px] border border-transparent bg-white/[0.03] px-2.5 py-2 transition-colors hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
      <div className="flex items-center gap-2">
        <span
          className="grid size-5 shrink-0 place-items-center text-white/70"
          aria-hidden
        >
          <ShapeKindIcon kind={shape.kind} size={15} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={`truncate text-[13px] font-medium leading-tight ${
              shape.hidden ? 'text-white/40' : 'text-zinc-100'
            }`}
          >
            {shapeLabel(shape)}
          </span>
          <span className="truncate text-[11px] leading-tight text-white/45">
            {typeLabel(shape)}
          </span>
        </span>
        <CenterButton />
        <DeleteButton />
      </div>
      <div className="flex items-center gap-1">
        <VisibilityToggle hidden={shape.hidden} />
        <LockToggle locked={shape.locked} />
        <StatusDot status={shape.status} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opt 2 — Compact single-row (inline type suffix, hover actions)
// ---------------------------------------------------------------------------

function CardOpt2Compact({ shape }: { shape: GeoShape }) {
  return (
    <div className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-[2px] border border-transparent bg-white/[0.03] px-2.5 py-2 transition-colors hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
      {/* Leading accent — status color when set, otherwise a subtle
          transparent placeholder so all rows stay aligned. */}
      <span
        aria-hidden
        className="absolute inset-y-1 start-0 w-[3px] rounded-full"
        style={{
          background: shape.status ? STATUS_OPTIONS[shape.status].tone : 'transparent',
        }}
      />
      <span
        className="ms-1 grid size-5 shrink-0 place-items-center text-white/70"
        aria-hidden
      >
        <ShapeKindIcon kind={shape.kind} size={15} />
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span
          className={`truncate text-[13px] font-medium leading-tight ${
            shape.hidden ? 'text-white/40' : 'text-zinc-100'
          }`}
        >
          {shapeLabel(shape)}
        </span>
        <span className="truncate text-[11px] leading-tight text-white/45">
          · {typeLabel(shape)}
        </span>
      </span>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <CenterButton />
        <VisibilityToggle hidden={shape.hidden} />
        <LockToggle locked={shape.locked} />
        <DeleteButton />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opt 3 — Zone-color leading rail (single row, always-visible actions)
// ---------------------------------------------------------------------------

function CardOpt3Rail({ shape }: { shape: GeoShape }) {
  return (
    <div className="group flex cursor-pointer items-stretch overflow-hidden rounded-[2px] border border-transparent bg-white/[0.03] transition-colors hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
      <span
        aria-hidden
        className="w-[3px] shrink-0"
        style={{ background: typeColor(shape) }}
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
        <span
          className="grid size-5 shrink-0 place-items-center text-white/70"
          aria-hidden
        >
          <ShapeKindIcon kind={shape.kind} size={15} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`truncate text-[13px] font-medium leading-tight ${
              shape.hidden ? 'text-white/40' : 'text-zinc-100'
            }`}
          >
            {shapeLabel(shape)}
          </span>
          <span className="truncate text-[11px] leading-tight text-white/45">
            {typeLabel(shape)}
          </span>
        </span>
        <div className="flex items-center gap-0.5">
          <CenterButton />
          <VisibilityToggle hidden={shape.hidden} />
          <LockToggle locked={shape.locked} />
          <DeleteButton />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opt 4 — Type-as-pill (badge tinted with zone color + status dot)
// ---------------------------------------------------------------------------

function CardOpt4Pill({ shape }: { shape: GeoShape }) {
  const color = typeColor(shape);
  return (
    <div className="group flex cursor-pointer flex-col gap-1.5 rounded-[2px] border border-transparent bg-white/[0.03] px-2.5 py-2 transition-colors hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
      <div className="flex items-center gap-2">
        <span
          className="grid size-5 shrink-0 place-items-center text-white/70"
          aria-hidden
        >
          <ShapeKindIcon kind={shape.kind} size={15} />
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-[13px] font-medium leading-tight ${
            shape.hidden ? 'text-white/40' : 'text-zinc-100'
          }`}
        >
          {shapeLabel(shape)}
        </span>
        <CenterButton />
        <DeleteButton />
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium leading-none"
          style={{
            background: `${color}1f`,
            borderColor: `${color}66`,
            color: '#ffffffcc',
          }}
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: color }}
          />
          {typeLabel(shape)}
        </span>
        <StatusDot status={shape.status} />
        <div className="ms-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <VisibilityToggle hidden={shape.hidden} />
          <LockToggle locked={shape.locked} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opt 5 — Icon tile + kebab (tinted glyph tile, actions grouped in kebab)
// ---------------------------------------------------------------------------

function CardOpt5Kebab({ shape }: { shape: GeoShape }) {
  const color = typeColor(shape);
  return (
    <div className="group flex cursor-pointer items-center gap-2.5 rounded-[2px] border border-transparent bg-white/[0.03] px-2 py-2 transition-colors hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-[3px] ring-1 ring-inset"
        style={{
          background: `${color}26`,
          color,
          // Using inline style keeps the ring color perfectly in sync with
          // the zone hue at any opacity without hunting for a Tailwind
          // arbitrary value.
          boxShadow: `inset 0 0 0 1px ${color}4d`,
        }}
      >
        <ShapeKindIcon kind={shape.kind} size={15} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`truncate text-[13px] font-medium leading-tight ${
            shape.hidden ? 'text-white/40' : 'text-zinc-100'
          }`}
        >
          {shapeLabel(shape)}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] leading-tight text-white/50">
          <span className="truncate">{typeLabel(shape)}</span>
          {shape.hidden && (
            <span className="inline-flex items-center gap-1 text-white/40">
              <EyeOff size={11} />
              Hidden
            </span>
          )}
          {shape.locked && (
            <span className="inline-flex items-center gap-1 text-white/60">
              <Lock size={11} />
              Locked
            </span>
          )}
          <StatusDot status={shape.status} />
        </span>
      </span>
      {/* Center-on-map surfaces as a quick action so recentering the
          camera never requires opening the kebab; the kebab groups the
          rest (visibility, lock, delete). */}
      <CenterButton />
      <button
        type="button"
        aria-label="More actions"
        title="More actions"
        className="grid size-7 shrink-0 place-items-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        <MoreVertical size={15} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opt 6 — Compact single-row + zone-color rail
//
// Layout borrows from Opt 2 (compact single-row, glyph + name with type as
// muted inline suffix), swapped from the status accent to Opt 3's zone-
// color leading rail.
//
// Interaction model
// -----------------
// The action cluster lives in three fixed slots — Eye · Lock · Center —
// each of which is either PERSISTENT (visible at rest, reflects state)
// or HOVER-REVEALED (fades in on group hover / focus). This keeps the
// icon order stable across states and prevents layout jitter.
//
//   - Default state (not hidden, not locked): all three slots are
//     empty at rest, and reveal on hover in order Eye · Lock · Center.
//   - Hidden: EyeOff stays persistent in the Eye slot (clicking it
//     un-hides). Lock + Center reveal on hover. The whole card also
//     dims via `opacity-55` so the row itself telegraphs "off the map".
//   - Locked: Lock stays persistent in the Lock slot but is disabled —
//     unlocking has to happen from the detail view (guards against a
//     fat-fingered unlock from the list). Eye + Center reveal on hover.
//
// No Trash button — deletion is keyboard-only. The card is `tabIndex=0`
// and its `onKeyDown` handles Delete / Backspace, gated by the lock
// state so a locked shape can never be removed from the list.
// ---------------------------------------------------------------------------

function CardOpt6CompactRail({ shape }: { shape: GeoShape }) {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Open ${shapeLabel(shape)}`}
      onKeyDown={(e) => {
        // Keyboard delete — only allowed when the shape isn't locked.
        // Inert in the sandbox (no store to mutate), but wired so the
        // interaction reads correctly to the reviewer.
        if ((e.key === 'Delete' || e.key === 'Backspace') && !shape.locked) {
          e.preventDefault();
        }
      }}
      className={`group flex cursor-pointer items-stretch overflow-hidden rounded-[2px] border border-transparent bg-white/[0.03] transition-[background,border-color,opacity] hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
        shape.hidden ? 'opacity-55' : ''
      }`}
    >
      <span
        aria-hidden
        className="w-[3px] shrink-0"
        // Rail color reflects the zone type at rest, and neutralizes to
        // grey (#949494) when the layer is hidden — so the row's status
        // reads consistently: dimmed card + grey rail + EyeOff.
        style={{ background: shape.hidden ? '#949494' : typeColor(shape) }}
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
        <span
          className="grid size-5 shrink-0 place-items-center text-white/70"
          aria-hidden
        >
          <ShapeKindIcon kind={shape.kind} size={15} />
        </span>
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span
            className={`truncate text-[13px] font-medium leading-tight ${
              shape.hidden ? 'text-white/60' : 'text-zinc-100'
            }`}
          >
            {shapeLabel(shape)}
          </span>
          <span className="truncate text-[11px] leading-tight text-white/45">
            · {typeLabel(shape)}
          </span>
        </span>
        {/* Three fixed slots: Eye · Lock · Center. Each slot is either
            persistent (reflects state) or hover-revealed. Delete is
            intentionally absent — keyboard Delete/Backspace on a
            focused, unlocked card handles removal. */}
        <div className="flex items-center gap-0.5">
          <span
            className={`transition-opacity ${
              shape.hidden
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
            <VisibilityToggle hidden={shape.hidden} />
          </span>
          <span
            className={`transition-opacity ${
              shape.locked
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
            <LockToggle locked={shape.locked} disabled={shape.locked} />
          </span>
          <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <CenterButton />
          </span>
        </div>
      </div>
    </div>
  );
}
