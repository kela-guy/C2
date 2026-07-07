/**
 * `/devices-lab` offline-emphasis study — the chosen treatment.
 *
 * Five variants were auditioned; the winner is the hatched surface (opt 4)
 * paired with the loud uppercase chip (opt 2's badge), with the edge bar
 * dropped after review. It shipped into `DeviceRow` (hatch),
 * `DeviceRowHeader` (dimmed name), and `OfflineChip` — this gallery keeps a
 * live reference render of the combination on a mixed 5-row list.
 */

import type { FC, ReactNode } from 'react';
import { CameraIcon, SensorIcon, SpeakerIcon, FloodlightIcon } from '../../tacticalIcons';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';
import { MapPinIcon } from '../../devices-panel/icons';
import { OfflineChip, OfflineHatch } from '../../devices-panel/OfflineBadge';

type TileIcon = FC<{ size?: number; fill?: string; active?: boolean }>;

interface LabRow {
  id: string;
  name: string;
  Icon: TileIcon;
  offline: boolean;
}

const ROWS: LabRow[] = [
  { id: 'cam', name: 'PTZ North', Icon: CameraIcon, offline: false },
  { id: 'drone', name: 'Patrol-3', Icon: DroneDeviceIcon, offline: true },
  { id: 'spk', name: 'LRAD North', Icon: SpeakerIcon, offline: false },
  { id: 'ecm', name: 'Regulus North', Icon: SensorIcon, offline: true },
  { id: 'fld', name: 'Perimeter Floodlight', Icon: FloodlightIcon, offline: false },
];

/** 32px health tile — the shipped online/offline tints from `DEVICE_HEALTH_VISUAL`. */
function Tile({ Icon, offline }: { Icon: TileIcon; offline: boolean }) {
  return (
    <div
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded ${
        offline ? 'bg-white/[0.04]' : 'bg-white/10'
      }`}
      data-health={offline ? 'offline' : 'ok'}
    >
      <Icon size={20} fill={offline ? 'rgba(255,255,255,0.4)' : 'white'} />
    </div>
  );
}

function ShowOnMap() {
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded text-white/70"
      aria-label="Show on map"
    >
      <MapPinIcon size={16} />
    </span>
  );
}

function Row({ row }: { row: LabRow }) {
  return (
    <div className="relative flex w-full items-center gap-2.5 border-b border-white/[0.06] px-4 py-2.5">
      {row.offline && <OfflineHatch />}
      <Tile Icon={row.Icon} offline={row.offline} />
      <span
        className={`min-w-0 flex-1 truncate text-start text-sm font-medium ${
          row.offline ? 'text-white/55' : 'text-slate-11'
        }`}
      >
        {row.name}
      </span>
      {row.offline && <OfflineChip label="Offline" />}
      <ShowOnMap />
    </div>
  );
}

function PanelFrame({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[380px] overflow-hidden rounded-md border border-white/[0.06] bg-surface-2">
      {children}
    </div>
  );
}

export function OfflineEmphasisLab() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-white/90">Offline emphasis — chosen treatment</h2>
        <p className="mt-1 max-w-[760px] text-xs text-white/45">
          Hatched row surface + dimmed name + the loud uppercase chip. Shipped
          into <code>DeviceRow</code> / <code>DeviceRowHeader</code> / <code>OfflineChip</code>;
          this is a live reference render on a mixed list (2 offline).
        </p>
      </div>

      <PanelFrame>
        {ROWS.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </PanelFrame>
    </section>
  );
}
