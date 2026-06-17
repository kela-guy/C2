/**
 * Collapsed header for the device row.
 *
 * The icon tile is the single fast-scan health signal: a unified
 * worst-wins severity (`getDeviceHealth`) drives a faint tile tint (and a
 * critical-only pulse). Hovering the tile reveals a "titled" tooltip — a
 * severity dot + label, an optional error-count badge, and a hairline-
 * fenced reason / connection detail.
 *
 * The row's inline-end carries the always-visible primary cluster: the
 * speaker now-playing readout, the per-type On/Off (speaker Play/Pause,
 * floodlight segmented), the armed-notifications countdown echo, and
 * Show-on-map pinned to the outer edge.
 */

import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { spring } from '@/lib/springs';
import { List, WarningTriangleSquare } from '@/lib/icons/central';
import { DotmSquare18 } from '@/app/components/ui/dotm-square-18';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import type { ConnectionState, Device } from './types';
import { resolveDeviceAction, type DeviceActionContext } from './deviceActions';
import type { DeviceTypeConfig } from './deviceRegistry';
import { DEVICE_HEALTH_VISUAL, DEVICE_HEALTH_CRITICAL_PING, getDeviceHealth, getDeviceHealthReason, getEffectiveDeviceHealth, getUnhealthyChildCount, type DeviceHealth } from './deviceHealth';
import { NotifyHeaderIndicator } from './controls/notify';

interface DeviceRowHeaderProps {
  device: Device;
  cfg: DeviceTypeConfig;
  ctx: DeviceActionContext;
  connectionStateLabels: Record<ConnectionState, string>;
}

/**
 * Tile-tooltip tone — severity dot + label, an optional count badge for
 * the trouble tones, and the worst-wins severity title. `offline` / `ok`
 * never carry a badge.
 */
const HEALTH_TONE: Record<DeviceHealth, { dot: string; badge: string | null }> = {
  critical: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300' },
  error: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300' },
  warning: { dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  offline: { dot: 'bg-zinc-500', badge: null },
  ok: { dot: 'bg-emerald-400', badge: null },
};

export const DeviceRowHeader = memo(function DeviceRowHeader({ device, cfg, ctx, connectionStateLabels }: DeviceRowHeaderProps) {
  const { strings } = ctx;
  const nonOnline = device.connectionState !== 'online';

  // Composite parents (Gotcha) roll their worst child up into the tile so the
  // collapsed row reflects the unit's true state without expanding.
  const isComposite = cfg.capabilities.composite === true && (device.children?.length ?? 0) > 0;
  const health = isComposite ? getEffectiveDeviceHealth(device) : getDeviceHealth(device);
  const unhealthyChildren = isComposite ? getUnhealthyChildCount(device) : 0;
  const healthVisual = DEVICE_HEALTH_VISUAL[health];
  const healthReason = getDeviceHealthReason(device, strings, connectionStateLabels);
  const connectionLabel = connectionStateLabels[device.connectionState];

  const healthLabel = {
    critical: strings.healthCritical,
    error: strings.healthError,
    warning: strings.healthWarning,
    offline: strings.healthOffline,
    ok: strings.healthHealthy,
  }[health];

  const tone = HEALTH_TONE[health];
  // Persistent (non-color) cue on a composite parent: a count + label pill so
  // a degraded/offline child is legible while the row is collapsed, not just a
  // tile tint. Offline has no tone badge, so fall back to a neutral surface.
  const compositeBadgeTone = tone.badge ?? 'bg-white/10 text-zinc-300';
  const showBadge = tone.badge != null && ctx.errorCount > 0;
  const badgeLabel = ctx.errorCount > 99 ? '99+' : ctx.errorCount;
  // The header reason text only adds value when it says something the
  // title doesn't (battery / malfunction / connection detail).
  const reasonText = healthReason && healthReason !== connectionLabel ? healthReason : null;
  const fenceConnection = nonOnline ? connectionLabel : null;
  const hasFence = reasonText != null || fenceConnection != null;
  const hasTooltip = nonOnline || healthReason != null || ctx.errorCount > 0;

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
          className={`absolute inset-0 rounded ${DEVICE_HEALTH_CRITICAL_PING} animate-ping motion-reduce:hidden pointer-events-none`}
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
            className="min-w-[184px] max-w-[260px] overflow-hidden p-0"
          >
            <div className="flex items-center justify-start gap-1.5 px-2.5 py-1.5">
              <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
              <span className="w-full min-w-0 truncate text-xs font-semibold text-zinc-100">
                {healthLabel}
              </span>
              {showBadge && (
                <span
                  className={`h-4 shrink-0 rounded-[2px] px-1.5 align-middle text-[10px] font-medium leading-4 tabular-nums ${tone.badge}`}
                >
                  {badgeLabel}
                </span>
              )}
            </div>
            {hasFence && (
              <div className="border-t border-white/10 px-2.5 py-1.5">
                {reasonText != null && (
                  <div className="max-w-[220px] text-xs text-zinc-200">{reasonText}</div>
                )}
                {fenceConnection != null && (
                  <div className="mt-0.5 text-[10px] text-white/50">{fenceConnection}</div>
                )}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        tile
      )}

      <div className="flex-1 min-w-0 text-start">
        <span className="text-sm font-medium truncate text-zinc-300 block">{device.name}</span>
      </div>

      {unhealthyChildren > 0 && (
        <span
          className={`flex h-5 shrink-0 items-center gap-1 rounded px-1.5 text-[10px] font-semibold tabular-nums ${compositeBadgeTone}`}
          role="status"
          aria-label={`${unhealthyChildren} ${healthLabel}`}
          title={`${unhealthyChildren} ${healthLabel}`}
        >
          <WarningTriangleSquare size={11} aria-hidden="true" />
          {unhealthyChildren}
        </span>
      )}

      <PrimaryCluster cfg={cfg} ctx={ctx} />
    </>
  );
});

/**
 * Always-visible action cluster at the row's inline-end. Show-on-map sits
 * at the outer edge; the device's other primary actions (speaker On/Off,
 * floodlight segmented) sit inboard of it, with the speaker now-playing
 * readout and the armed-notifications echo ahead of them.
 */
function PrimaryCluster({ cfg, ctx }: { cfg: DeviceTypeConfig; ctx: DeviceActionContext }) {
  const inboard = cfg.headerActions.filter((id) => id !== 'center');
  const center = cfg.headerActions.includes('center')
    ? resolveDeviceAction('center', ctx, 'header')
    : null;

  return (
    <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {ctx.errorCount > 0 && (
        <LogsErrorButton
          count={ctx.errorCount}
          logsLabel={ctx.strings.logs}
          errorsLabel={ctx.strings.errors}
          onOpenErrors={ctx.onOpenErrors}
        />
      )}
      <SpeakerNowPlaying ctx={ctx} />
      {inboard.map((id) => {
        const resolved = resolveDeviceAction(id, ctx, 'header');
        return resolved ? <span key={resolved.key}>{resolved.node}</span> : null;
      })}
      <NotifyHeaderIndicator
        armed={ctx.isNotifyOn}
        remaining={ctx.notifyRemaining}
        ariaLabelPrefix={ctx.strings.notificationsArmedAriaLabel}
      />
      {center?.node}
    </div>
  );
}

/**
 * Header error channel — only mounts when the device has open errors. Shows
 * the Logs glyph + count in red (no resting surface, just a hover affordance)
 * so a broken asset surfaces its error count without expanding the row;
 * clicking opens the errors modal listing each open error.
 */
function LogsErrorButton({
  count,
  logsLabel,
  errorsLabel,
  onOpenErrors,
}: {
  count: number;
  logsLabel: string;
  errorsLabel: string;
  onOpenErrors: () => void;
}) {
  const display = count > 99 ? '99+' : count;
  const label = `${logsLabel} · ${count} ${errorsLabel}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-handoff-component="device-logs-error"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onOpenErrors();
          }}
          className="inline-flex h-6 shrink-0 items-center gap-1 rounded px-1.5 text-xs font-medium text-red-300 transition-[background-color,transform] duration-150 ease-out hover:bg-red-500/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40 [&_svg]:size-3"
        >
          <List size={12} />
          <span className="tabular-nums">{display}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="whitespace-nowrap">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Speaker now-playing readout — reveals to the inline-start of the Play
 * control so the button never shifts. The track name grows in via a grid
 * 0fr->1fr wipe + a spring-in chip (opacity/scale/blur, no slide); on
 * exit it fades while the width track stays open until the chip unmounts,
 * then collapses the empty space invisibly.
 */
function SpeakerNowPlaying({ ctx }: { ctx: DeviceActionContext }) {
  const reduceMotion = useReducedMotion();
  const isSpeaker = ctx.device.type === 'speaker';
  const nowPlaying = isSpeaker && ctx.isSpeakerPlaying;
  const track = ctx.speakerTracks.find((t) => t.id === ctx.selectedTrackId);
  const [trackOpen, setTrackOpen] = useState(nowPlaying);

  useEffect(() => {
    if (nowPlaying) setTrackOpen(true);
  }, [nowPlaying]);

  if (!isSpeaker) return null;

  return (
    <span
      className={`grid ease-[cubic-bezier(0.22,1,0.36,1)] transition-[grid-template-columns] motion-reduce:transition-none ${
        trackOpen ? 'grid-cols-[1fr] duration-200' : 'grid-cols-[0fr] duration-150'
      }`}
    >
      <span className="flex min-w-0 overflow-hidden">
        <AnimatePresence initial={false} onExitComplete={() => setTrackOpen(false)}>
          {nowPlaying && (
            <motion.span
              key="now-playing"
              dir="ltr"
              data-handoff-component="device-now-playing"
              aria-label={track ? `${ctx.strings.nowPlayingAriaLabel} — ${track.label}` : undefined}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: 6, filter: 'blur(4px)' }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.1, ease: 'easeOut' } }}
              transition={reduceMotion ? { duration: 0 } : spring.moderate}
              className="me-1 rtl:me-1 rtl:ms-1 inline-flex origin-right items-center gap-1.5 whitespace-nowrap text-xs font-medium text-white"
            >
              <DotmSquare18
                size={16}
                dotSize={2}
                speed={0.8}
                pattern="full"
                colorPreset="solid-theme"
                animated={nowPlaying}
                opacityBase={0.12}
                opacityMid={0.42}
                opacityPeak={1}
                ariaLabel="Broadcasting"
              />
              <span className="max-w-[120px] truncate">{track?.label}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </span>
  );
}
