/**
 * Bottom-center telemetry strip. Hover-revealed, drone-only.
 *
 * Drones get a compact altitude + velocity readout. Cameras don't render
 * the strip at all - their controllable telemetry (zoom, day/night, AI
 * scan, designate, etc.) lives on the control bar instead.
 *
 * Numerics use `tabular-nums` / `font-mono` so they don't visually jitter.
 */

import { DirIsland } from '@/lib/direction';
import type { CameraStatus } from './types';

interface CameraTelemetryStripProps {
  visible: boolean;
  status: CameraStatus;
}

export function CameraTelemetryStrip({ visible, status }: CameraTelemetryStripProps) {
  if (status.deviceType !== 'drone') return null;

  return (
    <div
      className={`absolute z-20 left-1/2 -translate-x-1/2 bottom-12 transition-opacity duration-200 ease-out
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!visible}
    >
      {/*
        Telemetry readings stay LTR-Latin even in an RTL app — units like
        "m" and "m/s" combined with Latin numerals reorder badly under RTL
        bidi. The outer wrapper above stays direction-symmetric (centered
        with `left-1/2`) so the strip doesn't drift across the feed.
      */}
      <DirIsland
        direction="ltr"
        className="flex items-center gap-3 bg-black/55 backdrop-blur-sm ring-1 ring-inset ring-white/10 px-2.5 py-1.5"
      >
        <Stat label="ALT" value={`${(status.altitudeM ?? 0).toFixed(0)}m`} />
        <Divider />
        <Stat label="VEL" value={`${(status.velocityMps ?? 0).toFixed(1)}m/s`} />
      </DirIsland>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-medium text-white/55 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-white/95">{value}</span>
    </div>
  );
}

function Divider() {
  return <span className="w-px h-3 bg-white/15" aria-hidden="true" />;
}
