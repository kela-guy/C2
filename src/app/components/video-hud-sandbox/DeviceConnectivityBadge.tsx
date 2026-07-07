import type { ComponentType } from 'react';
import { DirIsland } from '@/lib/direction';
import { CameraIcon, RadarIcon } from '@/app/components/tacticalIcons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { glassStyle } from './SandboxDeviceSelect';

/** The project's real asset glyphs paint via `size`/`fill` (default white). */
type AssetGlyph = ComponentType<{ size?: number; fill?: string }>;

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

// Real asset glyphs (same family as the top-left device select); the link
// status is carried by the coloured dot rather than tinting the icon.
const SOURCE_ICON: Record<SourceKind, AssetGlyph> = {
  camera: CameraIcon,
  sensor: RadarIcon,
  radar: RadarIcon,
  lidar: RadarIcon,
};

const STATUS_DOT: Record<LinkStatus, string> = {
  online: 'bg-accent-success',
  degraded: 'bg-accent-warning',
  offline: 'bg-accent-danger',
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
  /** Glass background opacity, 0..1 (black overlay alpha). Default 0.4. */
  bgOpacity?: number;
  /** Backdrop blur in px. Default 4 (matches `backdrop-blur-sm`). */
  blurPx?: number;
}

export function DeviceConnectivityBadge({
  source = MOCK_SOURCE,
  manual = false,
  className,
  bgOpacity = 0.4,
  blurPx = 4,
}: DeviceConnectivityBadgeProps) {
  const ariaText = manual
    ? `${source.role} ${source.name}, Manual`
    : `Connectivity: ${STATUS_LABEL[source.status]}, ${source.role} ${source.name}`;

  // Hover label: amber/manual state reads "Manual"; otherwise the link state
  // (online surfaces as the friendlier "Connected").
  const hoverLabel = manual
    ? 'Manual'
    : source.status === 'online'
      ? 'Connected'
      : STATUS_LABEL[source.status];

  return (
    <div
      className={`pointer-events-none absolute right-3 top-3 z-30 ${className ?? ''}`}
    >
      <DirIsland direction="ltr">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              style={glassStyle(bgOpacity, blurPx)}
              className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-border-default/45 px-2.5 text-xs-plus text-slate-12"
            >
              <SourceChip source={source} manual={manual} />
              <span className="sr-only">{ariaText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {hoverLabel}
          </TooltipContent>
        </Tooltip>
      </DirIsland>
    </div>
  );
}

function SourceChip({ source, manual }: { source: SourceDevice; manual: boolean }) {
  const Icon = SOURCE_ICON[source.kind];
  const dotClass = manual ? 'bg-accent-warning' : STATUS_DOT[source.status];
  return (
    <span className="flex items-center gap-1.5 leading-none" aria-hidden>
      <span className="inline-flex shrink-0">
        <Icon size={15} />
      </span>
      <span className="font-medium tracking-wide">{source.short}</span>
      <span className={`size-1.5 shrink-0 rounded-full ${dotClass}`} />
    </span>
  );
}
