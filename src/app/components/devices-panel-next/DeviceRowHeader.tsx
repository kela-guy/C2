/**
 * Collapsed header for the next-gen device row — purely informational,
 * no controls. Every action lives in the expanded footer
 * (`DeviceActionBar`), so the row stays calm and scannable.
 *
 * The icon tile is the single fast-scan health signal: a unified
 * worst-wins severity (`getDeviceHealth`) drives a faint tile tint (and
 * a critical-only pulse). Hovering the tile reveals the detail — the
 * connection `StatusChip` badge plus any health reason — so the row name
 * stays uncluttered. The trailing cluster shows read-only meta (mute
 * countdown).
 */

import { BellOff } from '@/lib/icons/central';
import { StatusChip } from '@/primitives/StatusChip';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { CONNECTION_STATE_CHIP_COLORS } from '../devices-panel/constants';
import { buildCollapsedMetricLine } from '../devices-panel/utils';
import type { ConnectionState, Device } from '../devices-panel/types';
import type { DeviceActionContext } from './deviceActions';
import { DEVICE_HEALTH_VISUAL, getDeviceHealth, getDeviceHealthReason } from './deviceHealth';

interface DeviceRowHeaderProps {
  device: Device;
  ctx: DeviceActionContext;
  connectionStateLabels: Record<ConnectionState, string>;
}

export function DeviceRowHeader({ device, ctx, connectionStateLabels }: DeviceRowHeaderProps) {
  const nonOnline = device.connectionState !== 'online';
  const metricLine = buildCollapsedMetricLine(device);

  const health = getDeviceHealth(device);
  const healthVisual = DEVICE_HEALTH_VISUAL[health];
  const healthReason = getDeviceHealthReason(device, ctx.strings, connectionStateLabels);

  // The connection badge now lives in the tile tooltip rather than inline
  // next to the name. Keep the health reason as extra text only when it
  // says something the badge label doesn't (battery / malfunction).
  const connectionLabel = connectionStateLabels[device.connectionState];
  const reasonText = healthReason && healthReason !== connectionLabel ? healthReason : null;
  const hasTooltip = nonOnline || healthReason != null;

  const tile = (
    <div
      className={`relative w-8 h-8 rounded flex items-center justify-center shrink-0 transition-[background-color,box-shadow] duration-150 ease-out ${healthVisual.tile}`}
      data-handoff-component="device-icon"
      data-health={health}
      {...(healthReason ? { role: 'status', 'aria-label': healthReason } : {})}
    >
      {health === 'critical' && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded bg-red-500/25 animate-ping motion-reduce:hidden pointer-events-none"
        />
      )}
      <device.Icon
        size={20}
        fill={healthVisual.iconFill}
        active={ctx.isFloodlightOn || ctx.isSpeakerPlaying}
      />
    </div>
  );

  return (
    <>
      {hasTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{tile}</TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={6}
            showArrow={false}
            className="flex flex-col items-stretch gap-1 px-2 py-1.5 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
          >
            {nonOnline && (
              <StatusChip
                label={connectionLabel}
                color={CONNECTION_STATE_CHIP_COLORS[device.connectionState]}
                className="h-5 px-1.5 text-xs leading-none"
              />
            )}
            {reasonText && (
              <span className="text-xs text-zinc-300 whitespace-nowrap">{reasonText}</span>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        tile
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-medium truncate text-zinc-300">{device.name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {ctx.isMuted && ctx.muteRemaining && (
              <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-white">
                <BellOff size={12} className="text-white" />
                {ctx.muteRemaining}
              </span>
            )}
          </div>
        </div>
        {metricLine && (
          <div className="text-start text-xs font-mono tabular-nums text-white/50 truncate">{metricLine}</div>
        )}
      </div>
    </>
  );
}
