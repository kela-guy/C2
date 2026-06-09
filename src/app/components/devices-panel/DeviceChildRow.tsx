/**
 * Compact child row for a composite device (e.g. a Gotcha effector's
 * sensors + camera). Rendered inside the parent `DeviceRow`'s expansion,
 * never standalone.
 *
 * It deliberately reuses the same health vocabulary as the parent —
 * `getDeviceHealth` + `DEVICE_HEALTH_VISUAL` for the tile, and a `HEALTH_TONE`
 * dot/badge mirroring `DeviceRowHeader` — so a degraded child reads identically
 * to a degraded top-level device. Passive sensors carry no per-row actions, so
 * the row is a single button: hover highlights the matching map sector, click
 * selects it (driving `selectedAssetId`) and flies the map to the unit.
 */

import { memo } from 'react';
import {
  DEVICE_HEALTH_VISUAL,
  DEVICE_HEALTH_CRITICAL_PING,
  getDeviceHealth,
  getDeviceHealthReason,
  type DeviceHealth,
} from './deviceHealth';
import { DEFAULT_CONNECTION_STATE_LABELS } from './constants';
import type { ConnectionState, Device, DevicesPanelStrings } from './types';

/** Severity dot + label tone, mirroring `DeviceRowHeader`'s `HEALTH_TONE`. */
const HEALTH_TONE: Record<DeviceHealth, { dot: string; badge: string }> = {
  critical: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300' },
  error: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300' },
  warning: { dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  offline: { dot: 'bg-zinc-500', badge: 'bg-white/10 text-zinc-300' },
  ok: { dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300' },
};

function healthLabel(health: DeviceHealth, strings: DevicesPanelStrings): string {
  return {
    critical: strings.healthCritical,
    error: strings.healthError,
    warning: strings.healthWarning,
    offline: strings.healthOffline,
    ok: strings.healthHealthy,
  }[health];
}

export interface DeviceChildRowProps {
  device: Device;
  strings: DevicesPanelStrings;
  /** True when this child is the currently selected asset. */
  selected?: boolean;
  /**
   * Rendered inside the collapsible "Sensors" inset panel: rounded corners and
   * no full-bleed bottom divider, so rows read as cards stacked on the inset
   * surface rather than a flat ledger. Defaults to the flat list styling.
   */
  inset?: boolean;
  connectionStateLabels?: Record<ConnectionState, string>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onFlyTo?: (lat: number, lon: number) => void;
}

export const DeviceChildRow = memo(function DeviceChildRow({
  device,
  strings,
  selected = false,
  inset = false,
  connectionStateLabels = DEFAULT_CONNECTION_STATE_LABELS,
  onHover,
  onSelect,
  onFlyTo,
}: DeviceChildRowProps) {
  const health = getDeviceHealth(device);
  const visual = DEVICE_HEALTH_VISUAL[health];
  const tone = HEALTH_TONE[health];
  const reason = getDeviceHealthReason(device, strings, connectionStateLabels);
  const label = healthLabel(health, strings);

  const activate = () => {
    onSelect(device.id);
    if (device.lat != null && device.lon != null) onFlyTo?.(device.lat, device.lon);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
      onMouseEnter={() => onHover(device.id)}
      onMouseLeave={() => onHover(null)}
      data-handoff-component="device-child-row"
      data-child-id={device.id}
      data-health={health}
      data-selected={selected || undefined}
      className={`relative flex min-h-[40px] items-center gap-2.5 py-2 text-end cursor-pointer transition-[background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 focus-visible:ring-inset ${
        inset ? 'px-2 rounded' : 'ps-4 pe-4 border-b border-white/[0.04]'
      } ${selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04] active:bg-white/[0.06]'}`}
    >
      <div
        className={`relative w-6 h-6 rounded flex items-center justify-center shrink-0 ${visual.tile}`}
        {...(reason ? { role: 'status', 'aria-label': reason } : {})}
      >
        {health === 'critical' && (
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded ${DEVICE_HEALTH_CRITICAL_PING} animate-ping motion-reduce:hidden pointer-events-none`}
          />
        )}
        <device.Icon size={15} fill={visual.iconFill} />
      </div>

      <div className="flex-1 min-w-0 text-start">
        <span className="text-xs font-medium truncate text-zinc-300 block">{device.name}</span>
        {device.subtitle && (
          <div className="text-start text-[11px] font-mono tabular-nums text-white/45 truncate">
            {device.subtitle}
          </div>
        )}
      </div>

      {health !== 'ok' && (
        <span
          className={`flex shrink-0 items-center gap-1 h-4 rounded-[2px] px-1.5 text-[10px] font-medium leading-4 tabular-nums ${tone.badge}`}
          role="status"
          aria-label={reason ? `${label} — ${reason}` : label}
          title={reason ?? label}
        >
          <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
          {label}
        </span>
      )}
    </div>
  );
});
