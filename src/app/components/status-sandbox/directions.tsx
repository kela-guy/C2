/**
 * `/status-sandbox` — the candidate status-communication designs.
 *
 * Each direction answers the same question two ways — "how does an
 * operator know this asset is working / degraded / gone?" — once as an
 * asset-panel row and once as a map marker. Both render the same
 * simulated entity set (see `statusSim.ts`) so they can be compared
 * side by side in `StatusSandbox.tsx`.
 *
 * The panel half renders the REAL production `DeviceRow` (header map
 * icon, logs channel, tooltips, expand/collapse — the full chrome), so
 * every direction is evaluated against the actual asset card. The
 * direction deltas ride in through the opt-in `statusPresentation`
 * prop; production callers never set it, so the shipped treatment is
 * untouched.
 *
 * Two finalists remain from the original five-direction exploration:
 * the positive confirmation dot and the 2525-inspired shape/texture
 * redundancy treatment.
 */

import { type ReactNode } from 'react';
import { MapMarker } from '@/primitives/MapMarker';
import { resolveAssetMarkerStyle, type MarkerStyle } from '@/primitives/markerStyles';
import {
  HEALTH_DOT_CLASS,
  HealthBadge,
  StatusDot,
  type HealthTone,
} from '@/primitives/HealthStatus';
import { cn } from '@/shared/components/ui/utils';
import { DeviceRow } from '../devices-panel/DeviceRow';
import type { Device, DeviceStatusPresentation, DeviceType } from '../devices-panel/types';
import { MarkerOfflineBadge } from '../devices-panel/OfflineBadge';
import { ASSET_KIND_ICON } from '../assetKindIcons';
import {
  isStale,
  type SimEntity,
  type SimHealth,
  type SimKind,
} from './statusSim';

export interface DirectionCtx {
  now: number;
  /** Per-column expanded row (the real DeviceRow is collapsible). */
  expandedId: string | null;
  toggleExpanded: (id: string) => void;
}

export interface StatusDirection {
  id: string;
  title: string;
  /** One-line design principle shown under the column title. */
  principle: string;
  renderRow: (entity: SimEntity, ctx: DirectionCtx) => ReactNode;
  renderMarker: (entity: SimEntity, ctx: DirectionCtx) => ReactNode;
}

// ---------------------------------------------------------------------------
// Sim entity → real production Device
// ---------------------------------------------------------------------------

const KIND_TO_TYPE: Record<SimKind, DeviceType> = {
  camera: 'camera',
  radar: 'radar',
  sensor: 'ecm',
  lidar: 'lidar',
  gotcha: 'effector',
  launcher: 'launcher',
};

// SimKind names match the canonical registry keys 1:1, so the production
// `ASSET_KIND_ICON` table serves both the Device adapter and the map glyphs.
const KIND_TO_ICON: Record<SimKind, Device['Icon']> = {
  camera: ASSET_KIND_ICON.camera,
  radar: ASSET_KIND_ICON.radar,
  sensor: ASSET_KIND_ICON.sensor,
  lidar: ASSET_KIND_ICON.lidar,
  gotcha: ASSET_KIND_ICON.gotcha,
  launcher: ASSET_KIND_ICON.launcher,
};

/**
 * Adapt a sim entity to the production `Device` shape so `getDeviceHealth`
 * derives the same severity the sim forced: `error` rides in as an open
 * error (which also lights the real red Logs channel), `warning` as a
 * connection warning, `offline` as a disconnect.
 */
function toDevice(e: SimEntity): Device {
  const device: Device = {
    id: e.id,
    name: e.name,
    type: KIND_TO_TYPE[e.kind],
    lat: 32.75 + e.y * 0.1,
    lon: 34.95 + e.x * 0.1,
    status: e.health === 'offline' ? 'offline' : 'available',
    operationalStatus: 'operational',
    connectionState:
      e.health === 'offline' ? 'offline' : e.health === 'warning' ? 'warning' : 'online',
    batteryPct: 82,
    Icon: KIND_TO_ICON[e.kind],
  };
  if (e.kind === 'camera' || e.kind === 'radar') {
    device.fovDeg = e.kind === 'camera' ? 62 : 120;
    device.bearingDeg = Math.round(e.x * 360);
  }
  if (e.kind === 'sensor') device.coverageRadiusM = 2500;
  if (e.health === 'error') {
    device.errors = [{ severity: 'error', message: 'Fault reported — component not responding' }];
  }
  return device;
}

const noop = () => {};

/** One real production row, restyled per direction via `statusPresentation`. */
function RealRow({
  entity,
  ctx,
  presentation,
}: {
  entity: SimEntity;
  ctx: DirectionCtx;
  presentation?: DeviceStatusPresentation;
}) {
  return (
    <DeviceRow
      device={toDevice(entity)}
      isExpanded={ctx.expandedId === entity.id}
      onToggle={ctx.toggleExpanded}
      onHover={noop}
      onFlyTo={noop}
      statusPresentation={presentation}
    />
  );
}

// ---------------------------------------------------------------------------
// Shared building blocks (map half)
// ---------------------------------------------------------------------------

const MARKER_SURFACE = 34;

function KindGlyph({ kind, size = 18, fill = 'white' }: { kind: SimKind; size?: number; fill?: string }) {
  const Icon = KIND_TO_ICON[kind];
  return <Icon size={size} fill={fill} />;
}

/** Marker + overlays wrapper: the map half of a preview cell. */
function BaseMarker({
  entity,
  style,
  overlays,
}: {
  entity: SimEntity;
  style: MarkerStyle;
  overlays?: ReactNode;
}) {
  return (
    <div className="relative">
      <MapMarker
        icon={<KindGlyph kind={entity.kind} size={16} fill={style.glyphColor} />}
        style={style}
        surfaceSize={MARKER_SURFACE}
      />
      {overlays}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Positive confirmation dot
// ---------------------------------------------------------------------------

const POSITIVE_LABELS: Record<SimHealth, string> = {
  ok: 'Online',
  warning: 'Warning',
  error: 'Error',
  offline: 'Offline',
};

/** Corner well carrying a persistent status dot — the map-side "green dot". */
function MarkerDotBadge({ tone }: { tone: HealthTone }) {
  return (
    <div
      className="pointer-events-none absolute z-[6] flex items-center justify-center rounded-full"
      style={{
        width: 14,
        height: 14,
        right: -3,
        top: -3,
        background: 'rgba(10,10,10,0.95)',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.9)',
      }}
    >
      <span className={cn('size-1.5 rounded-full', HEALTH_DOT_CLASS[tone])} />
    </div>
  );
}

/**
 * Corner well on the row's icon tile carrying the same persistent dot as
 * the map marker, so panel and map read through one channel. Same chrome
 * as direction B's shape badge well.
 */
function TileDotBadge({ tone }: { tone: HealthTone }) {
  return (
    <span className="pointer-events-none absolute -end-1 -top-1 flex size-3.5 items-center justify-center rounded-full border border-white/25 bg-[#0f0f11]">
      <span className={cn('size-1.5 rounded-full', HEALTH_DOT_CLASS[tone])} />
    </span>
  );
}

/**
 * The always-on status badge that replaces the offline-chip slot — the
 * production `HealthBadge` chip (tint fill + accent text) with the shared
 * severity dot inside, so healthy gets the same chrome as trouble.
 */
function PositiveStatusSlot({ health }: { health: SimHealth }) {
  return (
    <HealthBadge tone={health} className="me-0.5 gap-1">
      <StatusDot tone={health} />
      {POSITIVE_LABELS[health]}
    </HealthBadge>
  );
}

// ---------------------------------------------------------------------------
// Shape / texture redundancy (MIL-STD-2525-inspired)
// ---------------------------------------------------------------------------

/** Triangle = warning. Shape carries the meaning; the amber is redundant. */
function TriangleGlyph({ size = 10, color = 'var(--accent-warning)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 1.2 11.2 10.6 H0.8 Z" fill={color} />
      <rect x="5.35" y="4.4" width="1.3" height="3.2" fill="#0a0a0a" />
      <rect x="5.35" y="8.3" width="1.3" height="1.3" fill="#0a0a0a" />
    </svg>
  );
}

/** Octagon = error/stop. Distinguishable from the triangle with zero color. */
function OctagonGlyph({ size = 10, color = 'var(--accent-danger)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.8 0.8 H8.2 L11.2 3.8 V8.2 L8.2 11.2 H3.8 L0.8 8.2 V3.8 Z" fill={color} />
      <path d="M4.1 4.1 L7.9 7.9 M7.9 4.1 L4.1 7.9" stroke="#0a0a0a" strokeWidth="1.3" />
    </svg>
  );
}

function ShapeBadgeGlyph({ health }: { health: SimHealth }) {
  if (health === 'warning') return <TriangleGlyph />;
  if (health === 'error') return <OctagonGlyph />;
  return null;
}

/** Corner well riding the marker, same chrome as MarkerOfflineBadge. */
function MarkerShapeBadge({ health }: { health: SimHealth }) {
  if (health !== 'warning' && health !== 'error') return null;
  return (
    <div
      className="pointer-events-none absolute z-[6] flex items-center justify-center rounded-full"
      style={{
        width: 18,
        height: 18,
        right: -4,
        top: -4,
        background: 'rgba(10,10,10,0.95)',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.9)',
      }}
    >
      <ShapeBadgeGlyph health={health} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The directions
// ---------------------------------------------------------------------------

export const STATUS_DIRECTIONS: StatusDirection[] = [
  {
    id: 'positive-dot',
    title: 'A · Positive confirmation dot',
    principle:
      'A persistent per-entity dot confirms every state, including healthy. The icon container stays neutral except for a corner status dot mirroring the map badge.',
    renderRow: (e, ctx) => (
      <RealRow
        entity={e}
        ctx={ctx}
        presentation={{
          neutralTile: true,
          tileBadge: <TileDotBadge tone={e.health} />,
          statusSlot: <PositiveStatusSlot health={e.health} />,
        }}
      />
    ),
    renderMarker: (e) => {
      const style = resolveAssetMarkerStyle(e.health);
      return (
        <BaseMarker
          entity={e}
          style={style}
          overlays={
            <>
              <MarkerDotBadge tone={e.health} />
              {e.health === 'offline' && <MarkerOfflineBadge />}
            </>
          }
        />
      );
    },
  },
  {
    id: 'shape-redundancy',
    title: 'B · Shape & texture redundancy',
    principle:
      '2525-inspired: solid = reporting, dashed = stale, hatch = offline, shape badges for faults. Survives grayscale.',
    renderRow: (e, ctx) => {
      const offline = e.health === 'offline';
      const stale = isStale(e, ctx.now);
      return (
        <RealRow
          entity={e}
          ctx={ctx}
          presentation={{
            tileClassName: cn(
              'border',
              offline
                ? 'border-dashed border-white/25'
                : stale
                  ? 'border-dashed border-white/45'
                  : 'border-solid border-white/25',
            ),
            tileBadge:
              e.health === 'warning' || e.health === 'error' ? (
                <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full border border-white/25 bg-[#0f0f11]">
                  <ShapeBadgeGlyph health={e.health} />
                </span>
              ) : undefined,
            // Offline keeps the shipped chip; stale-but-claiming-ok surfaces
            // the unconfirmed read where the chip would sit.
            statusSlot:
              !offline && stale ? (
                <HealthBadge tone="warning" className="me-0.5">
                  Unconfirmed
                </HealthBadge>
              ) : undefined,
          }}
        />
      );
    },
    renderMarker: (e, ctx) => {
      const stale = isStale(e, ctx.now);
      const base = resolveAssetMarkerStyle(e.health);
      const style: MarkerStyle =
        stale && e.health !== 'offline' ? { ...base, ringDash: 'dashed' } : base;
      return (
        <BaseMarker
          entity={e}
          style={style}
          overlays={
            <>
              <MarkerShapeBadge health={e.health} />
              {e.health === 'offline' && <MarkerOfflineBadge />}
            </>
          }
        />
      );
    },
  },
];
