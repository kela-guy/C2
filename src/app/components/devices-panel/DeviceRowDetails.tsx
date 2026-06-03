/**
 * Expanded-card body for the device row: optional camera preview hero
 * (registry capability) + the stat grid built from the registry's
 * `detailFields`.
 */

import { Camera } from '@/lib/icons/central';
import type { Device, DevicesPanelStrings } from './types';
import { buildDetailRows, type DeviceTypeConfig } from './deviceRegistry';

interface DeviceRowDetailsProps {
  device: Device;
  cfg: DeviceTypeConfig;
  strings: DevicesPanelStrings;
}

export function DeviceRowDetails({ device, cfg, strings }: DeviceRowDetailsProps) {
  const rows = buildDetailRows(device, strings, cfg.detailFields);
  return (
    <>
      {cfg.capabilities.cameraPreview && <CameraPreviewPlaceholder />}
      <div
        className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3"
        data-handoff-component="device-detail-grid"
      >
        {rows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} color={row.color} />
        ))}
      </div>
    </>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="w-full flex flex-col justify-center items-start gap-1 text-xs"
      data-handoff-component="device-detail-row"
    >
      <span className="text-white/60 text-xs">{label}</span>
      <span className={`font-sans tabular-nums text-xs ${color ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

/**
 * Empty camera-preview hero shown above the stats grid for camera rows.
 * Marked LIVE and intentionally non-interactive — the real stream lives
 * in the `VideoPanel` once the row is dragged in.
 */
function CameraPreviewPlaceholder() {
  return (
    <div
      className="relative w-full h-[200px] overflow-hidden bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
      data-handoff-component="device-camera-preview"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Camera size={24} className="text-white/20" />
      </div>
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      <div className="absolute top-1.5 end-1.5 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
        <div className="size-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
        <span className="text-xs font-medium text-white/90 uppercase tracking-wide">Live</span>
      </div>
    </div>
  );
}
