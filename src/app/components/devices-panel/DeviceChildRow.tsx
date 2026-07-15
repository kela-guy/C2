/**
 * Compact child row for a composite device (e.g. a Gotcha effector's
 * sensors + camera). Rendered inside the parent `DeviceRow`'s expansion,
 * never standalone.
 *
 * It deliberately reuses the same health vocabulary as the parent —
 * `getDeviceHealth` + `DEVICE_HEALTH_VISUAL` for the tile — so a degraded child
 * reads identically to a degraded top-level device. The row body selects the
 * child (hover highlights the matching map sector, click drives
 * `selectedAssetId` and flies the map to the unit); an unhealthy child also
 * carries a trailing Logs button that opens the errors modal scoped to it.
 */

import { memo } from 'react';
import { List } from '@/lib/icons/central';
import {
  DEVICE_HEALTH_VISUAL,
  getDeviceErrorCount,
  getDeviceHealth,
  getDeviceHealthReason,
  type DeviceHealth,
} from './deviceHealth';
import { DEFAULT_CONNECTION_STATE_LABELS } from './constants';
import type { ConnectionState, Device, DevicesPanelStrings } from './types';

function healthLabel(health: DeviceHealth, strings: DevicesPanelStrings): string {
  return {
    error: strings.healthError,
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
  /** Open the errors/logs modal for this child. When omitted, no logs button renders. */
  onOpenErrors?: () => void;
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
  onOpenErrors,
  onFlyTo,
}: DeviceChildRowProps) {
  const health = getDeviceHealth(device);
  const visual = DEVICE_HEALTH_VISUAL[health];
  const reason = getDeviceHealthReason(device, strings, connectionStateLabels);
  const label = healthLabel(health, strings);
  const errorCount = getDeviceErrorCount(device);
  // Mirror the parent header's Logs button tone — the error red.
  const logsToneClass = 'text-red-300 hover:bg-red-500/10 focus-visible:ring-red-300/40';

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
      className={`group relative flex min-h-[40px] items-center gap-2.5 py-2 text-end cursor-pointer transition-[background-color] duration-[var(--motion-fast)] ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-focus-ring focus-visible:ring-inset ${
        inset ? 'px-2 rounded' : 'ps-4 pe-4 border-b border-white/[0.04]'
      } ${selected ? 'bg-white/[0.07]' : 'hover:bg-state-hover active:bg-state-pressed'}`}
    >
      <div
        className={`relative w-6 h-6 rounded flex items-center justify-center shrink-0 ${visual.tile}`}
        {...(reason ? { role: 'status', 'aria-label': reason } : {})}
      >
        <device.Icon size={15} fill={visual.iconFill} />
      </div>

      <div className="flex-1 min-w-0 text-start">
        <span className="text-xs font-medium truncate block text-slate-11">
          {device.name}
        </span>
      </div>

      {health !== 'ok' && onOpenErrors && (
        <button
          type="button"
          data-handoff-component="device-child-logs-error"
          aria-label={reason ? `${strings.logs} — ${reason}` : strings.logs}
          title={reason ?? label}
          onClick={(e) => {
            e.stopPropagation();
            onOpenErrors();
          }}
          className={`inline-flex h-5 shrink-0 items-center gap-1 rounded px-1.5 text-2xs font-medium transition-[background-color,transform] duration-[var(--motion-fast)] ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 [&_svg]:size-3 ${logsToneClass}`}
        >
          <List size={11} aria-hidden="true" />
          {errorCount > 0 && (
            <span className="tabular-nums">{errorCount > 99 ? '99+' : errorCount}</span>
          )}
        </button>
      )}
    </div>
  );
});
