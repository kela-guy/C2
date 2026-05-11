/**
 * Bottom-center telemetry strip. Hover-revealed.
 *
 * - Camera: Zoom slider (1.0x..30.0x) + FOV indicator.
 * - Drone:  Zoom + Altitude (m) + Velocity (m/s) compact readouts.
 *
 * Numerics use `tabular-nums` / `font-mono` so they don't visually jitter.
 */

import { Minus, Plus } from 'lucide-react';
import type { CameraStatus } from './types';

interface CameraTelemetryStripProps {
  visible: boolean;
  status: CameraStatus;
  disabled?: boolean;
  onZoomChange: (next: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 30;
const ZOOM_STEP = 0.5;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 10) / 10));
}

function fmtZoom(z: number): string {
  return `${z.toFixed(1)}x`;
}

export function CameraTelemetryStrip({ visible, status, disabled, onZoomChange }: CameraTelemetryStripProps) {
  const zoom = status.zoomLevel ?? 1;
  const isDrone = status.deviceType === 'drone';

  return (
    <div
      className={`absolute z-20 left-1/2 -translate-x-1/2 bottom-12 transition-opacity duration-200 ease-out
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!visible}
    >
      <div
        className="flex items-center gap-3 bg-black/55 backdrop-blur-sm ring-1 ring-inset ring-white/10 px-2.5 py-1.5"
        dir="ltr"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-white/55 uppercase tracking-wider">Zoom</span>
          <button
            type="button"
            onClick={() => onZoomChange(clampZoom(zoom - ZOOM_STEP))}
            disabled={disabled || zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
          >
            <Minus size={11} />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={zoom}
            disabled={disabled}
            onChange={(e) => onZoomChange(clampZoom(parseFloat(e.target.value)))}
            aria-label="Zoom level"
            className="w-24 accent-amber-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => onZoomChange(clampZoom(zoom + ZOOM_STEP))}
            disabled={disabled || zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
          >
            <Plus size={11} />
          </button>
          <span className="font-mono text-[11px] tabular-nums text-amber-100 min-w-[40px] text-end">
            {fmtZoom(zoom)}
          </span>
        </div>

        {!isDrone && status.fovDeg > 0 && (
          <>
            <Divider />
            <Stat label="FOV" value={`${Math.round(status.fovDeg)}\u00b0`} />
          </>
        )}

        {isDrone && (
          <>
            <Divider />
            <Stat label="ALT" value={`${(status.altitudeM ?? 0).toFixed(0)}m`} />
            <Divider />
            <Stat label="VEL" value={`${(status.velocityMps ?? 0).toFixed(1)}m/s`} />
          </>
        )}
      </div>
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
