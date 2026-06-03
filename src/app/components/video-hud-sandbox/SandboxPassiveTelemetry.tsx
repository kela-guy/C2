import { DirIsland } from '@/lib/direction';
import type { CameraStatus, FeedDeviceType } from '@/app/components/camera-v2/types';

export type PassiveComposition = 'D' | 'A' | 'B' | 'C' | 'E' | 'F';

export interface SandboxPassiveTelemetryProps {
  status: CameraStatus;
  composition: PassiveComposition;
  deviceType?: FeedDeviceType;
  /** When true, top-right items shift down so they don't collide with
   *  the sandbox `DeviceConnectivityBadge`. */
  topRightOffset?: boolean;
}

export function SandboxPassiveTelemetry({
  status,
  composition,
  deviceType = 'drone',
  topRightOffset = false,
}: SandboxPassiveTelemetryProps) {
  const battery = Math.round(status.batteryPct ?? 0);
  const altitude = Math.round(status.altitudeM ?? 0);
  const home = Math.round(status.distanceFromHomeM ?? 0);
  const rel = bearingDelta(status.bearingDeg, 0);

  if (deviceType === 'camera') {
    return null;
  }

  switch (composition) {
    case 'D':
      return <TopStrip battery={battery} altitude={altitude} home={home} rel={rel} />;
    case 'A':
      return <BottomCenter battery={battery} rel={rel} />;
    case 'B':
      return <TopRightStack battery={battery} home={home} rel={rel} topRightOffset={topRightOffset} />;
    case 'C':
      return null;
    case 'E':
      return <Corners battery={battery} home={home} rel={rel} topRightOffset={topRightOffset} />;
    case 'F':
      return <MinimalCorners battery={battery} rel={rel} topRightOffset={topRightOffset} />;
    default:
      return <TopStrip battery={battery} altitude={altitude} home={home} rel={rel} />;
  }
}

function bearingDelta(from: number, to: number): number {
  return Math.round(((to - from + 540) % 360) - 180);
}

function TopStrip({
  battery,
  altitude,
  home,
  rel,
}: {
  battery: number;
  altitude: number;
  home: number;
  rel: number;
}) {
  return (
    <div className="absolute z-20 top-3 left-1/2 -translate-x-1/2 pointer-events-none">
      <DirIsland
        direction="ltr"
        className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-surface-1/75 backdrop-blur-sm ring-1 ring-inset ring-border-default"
      >
        <StripStat label="BAT" value={`${battery}%`} valueClass="text-accent-success" />
        <Divider />
        <StripStat label="ALT" value={`${altitude}m`} />
        <Divider />
        <StripStat label="HOME" value={`${home}m`} />
        <Divider />
        <StripStat label="REL" value={`${rel >= 0 ? '+' : ''}${rel}°`} valueClass="text-accent-info" />
      </DirIsland>
    </div>
  );
}

function BottomCenter({ battery, rel }: { battery: number; rel: number }) {
  return (
    <div className="absolute z-20 bottom-14 left-1/2 -translate-x-1/2 pointer-events-none">
      <DirIsland
        direction="ltr"
        className="flex items-center gap-4 px-3.5 py-2 rounded-md bg-surface-1/75 backdrop-blur-sm ring-1 ring-inset ring-border-default"
      >
        <StripStat label="BAT" value={`${battery}%`} valueClass="text-accent-success" />
        <Divider />
        <StripStat label="REL" value={`${rel >= 0 ? '+' : ''}${rel}°`} valueClass="text-accent-info" />
      </DirIsland>
    </div>
  );
}

function TopRightStack({
  battery,
  home,
  rel,
  topRightOffset,
}: {
  battery: number;
  home: number;
  rel: number;
  topRightOffset?: boolean;
}) {
  return (
    <div className={`absolute z-20 right-3 pointer-events-none ${topRightOffset ? 'top-12' : 'top-3'}`}>
      <DirIsland
        direction="ltr"
        className="flex flex-col gap-1 px-2 py-1.5 rounded-md bg-surface-1/70 backdrop-blur-sm ring-1 ring-inset ring-border-default"
      >
        <StackRow label="BAT" value={`${battery}%`} valueClass="text-accent-success" bar={battery / 100} />
        <StackRow label="HOME" value={`${home}m`} />
        <StackRow label="REL" value={`${rel >= 0 ? '+' : ''}${rel}°`} valueClass="text-accent-info" accentBar />
      </DirIsland>
    </div>
  );
}

function Corners({
  battery,
  home,
  rel,
  topRightOffset,
}: {
  battery: number;
  home: number;
  rel: number;
  topRightOffset?: boolean;
}) {
  return (
    <>
      <CornerReadout className="left-3 top-3" label="BAT" value={`${battery}%`} valueClass="text-accent-success" />
      <CornerReadout className="left-3 top-12" label="HOME" value={`${home}m`} />
      <CornerReadout
        className={`right-3 ${topRightOffset ? 'top-12' : 'top-3'}`}
        label="REL"
        value={`${rel >= 0 ? '+' : ''}${rel}°`}
        valueClass="text-accent-info"
      />
    </>
  );
}

function MinimalCorners({
  battery,
  rel,
  topRightOffset,
}: {
  battery: number;
  rel: number;
  topRightOffset?: boolean;
}) {
  return (
    <>
      <CornerReadout className="left-2 top-2" label="BAT" value={`${battery}%`} valueClass="text-accent-success" compact />
      <CornerReadout
        className={`right-2 ${topRightOffset ? 'top-11' : 'top-2'}`}
        label="REL"
        value={`${rel >= 0 ? '+' : ''}${rel}°`}
        valueClass="text-accent-info"
        compact
      />
    </>
  );
}

function StripStat({
  label,
  value,
  valueClass = 'text-slate-12',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[8px] font-medium uppercase tracking-[0.12em] text-slate-9">{label}</span>
      <span className={`font-mono text-[11px] tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function StackRow({
  label,
  value,
  valueClass = 'text-slate-12',
  bar,
  sub,
  accentBar,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bar?: number;
  sub?: string;
  accentBar?: boolean;
}) {
  return (
    <div className="flex items-stretch gap-1.5 min-w-[56px]">
      <div className="w-0.5 h-7 rounded-full shrink-0 bg-state-hover-strong overflow-hidden flex flex-col justify-end">
        {bar != null ? (
          <div className="w-full bg-accent-success" style={{ height: `${Math.round(bar * 100)}%` }} />
        ) : (
          <div className={`w-full flex-1 ${accentBar ? 'bg-accent-info' : 'bg-state-hover-strong'}`} />
        )}
      </div>
      <div>
        <div className="text-[8px] font-medium uppercase tracking-[0.12em] text-slate-9">{label}</div>
        <div className={`font-mono text-[16px] tabular-nums leading-none ${valueClass}`}>{value}</div>
        {sub && <div className="text-[7px] text-slate-9/50 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function CornerReadout({
  className,
  label,
  value,
  valueClass = 'text-slate-12',
  compact,
}: {
  className: string;
  label: string;
  value: string;
  valueClass?: string;
  compact?: boolean;
}) {
  return (
    <div className={`absolute z-20 pointer-events-none ${className}`}>
      <DirIsland direction="ltr" className={compact ? '' : 'px-2 py-1 rounded-sm bg-surface-1/60 backdrop-blur-sm'}>
        <span className="text-[8px] text-slate-9">{label} </span>
        <span className={`font-mono tabular-nums ${compact ? 'text-[10px]' : 'text-[11px]'} ${valueClass}`}>{value}</span>
      </DirIsland>
    </div>
  );
}

function Divider() {
  return <span className="w-px h-3 bg-state-selected shrink-0" aria-hidden />;
}
