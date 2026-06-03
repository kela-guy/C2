import type { ComponentType } from 'react';
import { DirIsland } from '@/lib/direction';
import {
  CameraIcon,
  SensorIcon,
  RadarIcon,
  LidarIcon,
} from '@/app/components/tacticalIcons';
import { accentHex } from '@/primitives/accentHex';

type LinkStatus = 'online' | 'degraded' | 'offline';

type SourceKind = 'camera' | 'sensor' | 'radar' | 'lidar';

interface SourceDevice {
  id: string;
  short: string;
  name: string;
  role: string;
  kind: SourceKind;
  signalPct: number;
  status: LinkStatus;
}

const MOCK_SOURCE: SourceDevice = {
  id: 'CAM-01',
  short: 'EO/IR',
  name: 'CAM-01',
  role: 'EO/IR Camera',
  kind: 'camera',
  signalPct: 88,
  status: 'online',
};

type AssetIconComponent = ComponentType<{ size?: number; fill?: string }>;

const SOURCE_ICON: Record<SourceKind, AssetIconComponent> = {
  camera: CameraIcon,
  sensor: SensorIcon,
  radar: RadarIcon,
  lidar: LidarIcon,
};

const STATUS_DOT: Record<LinkStatus, string> = {
  online: 'bg-accent-success',
  degraded: 'bg-accent-warning',
  offline: 'bg-accent-danger',
};

// Tactical asset icons paint via the SVG `fill` attribute, so status tint
// routes through accentHex — an allowed exception per no-inline-hex-colors.mdc.
const STATUS_FILL: Record<LinkStatus, string> = {
  online: accentHex('success'),
  degraded: accentHex('warning'),
  offline: accentHex('danger'),
};

const STATUS_LABEL: Record<LinkStatus, string> = {
  online: 'Online',
  degraded: 'Degraded',
  offline: 'Offline',
};

export interface DeviceConnectivityBadgeProps {
  source?: SourceDevice;
  /** Operator released control — chip dot turns amber and reads "Manual". */
  manual?: boolean;
  className?: string;
}

export function DeviceConnectivityBadge({
  source = MOCK_SOURCE,
  manual = false,
  className,
}: DeviceConnectivityBadgeProps) {
  const ariaText = manual
    ? `${source.role} ${source.name}, Manual`
    : `Connectivity: ${STATUS_LABEL[source.status]}, ${source.role} ${source.name}`;

  return (
    <div
      className={`pointer-events-none absolute right-3 top-3 z-30 ${className ?? ''}`}
    >
      <DirIsland direction="ltr">
        <div className="flex items-center gap-1.5 rounded-none border border-border-default bg-surface-1/75 px-2 py-1 backdrop-blur-sm">
          <SourceChip source={source} manual={manual} />
          <span className="sr-only">{ariaText}</span>
        </div>
      </DirIsland>
    </div>
  );
}

function SourceChip({ source, manual }: { source: SourceDevice; manual: boolean }) {
  const Icon = SOURCE_ICON[source.kind];
  const dotClass = manual ? 'bg-accent-warning' : STATUS_DOT[source.status];
  const iconFill = manual ? accentHex('warning') : STATUS_FILL[source.status];
  return (
    <span
      className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-12"
      aria-hidden
    >
      <Icon size={11} fill={iconFill} />
      <span>{source.short}</span>
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      {manual && <span className="text-accent-warning">Manual</span>}
    </span>
  );
}
