/**
 * Collapsed header for the device row.
 *
 * The icon tile is the single fast-scan health signal: a unified
 * worst-wins severity (`getDeviceHealth`) drives a faint tile tint.
 * Hovering the tile reveals a "titled" tooltip — a
 * severity dot + label, an optional error-count badge, and a hairline-
 * fenced reason / connection detail.
 *
 * The row's inline-end carries the always-visible primary cluster: the
 * speaker now-playing readout, the per-type On/Off (speaker Play/Pause,
 * floodlight segmented), the armed-notifications countdown echo, and
 * Show-on-map pinned to the outer edge.
 */

import { memo, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { spring, springExit } from '@/lib/springs';
import { List } from '@/lib/icons/central';
import { HEALTH_BADGE_CLASS, HEALTH_DOT_CLASS } from '@/primitives/HealthStatus';
import { DotmSquare18 } from '@/app/components/ui/dotm-square-18';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import type { ConnectionState, Device, DeviceStatusPresentation } from './types';
import { resolveDeviceAction, type DeviceActionContext } from './deviceActions';
import type { DeviceTypeConfig } from './deviceRegistry';
import { DEVICE_HEALTH_VISUAL, getDeviceHealth, getDeviceHealthReason, getEffectiveDeviceHealth, getUnhealthyChildCount, type DeviceHealth } from './deviceHealth';
import { OfflineChip } from './OfflineBadge';
import { NotifyHeaderIndicator } from './controls/notify';

interface DeviceRowHeaderProps {
  device: Device;
  cfg: DeviceTypeConfig;
  ctx: DeviceActionContext;
  connectionStateLabels: Record<ConnectionState, string>;
  /** Design-audition overrides (`/status-sandbox`). Absent in production. */
  statusPresentation?: DeviceStatusPresentation;
}

/**
 * Tile-tooltip tone — severity dot + label, an optional count badge for
 * the error tone. `ok` never carries a badge. Colors come from the shared
 * HealthStatus tone vocabulary (palette.css accents) — no local color
 * decisions.
 */
const HEALTH_TONE: Record<DeviceHealth, { dot: string; badge: string | null }> = {
  error: { dot: HEALTH_DOT_CLASS.error, badge: HEALTH_BADGE_CLASS.error },
  ok: { dot: HEALTH_DOT_CLASS.ok, badge: null },
};

export const DeviceRowHeader = memo(function DeviceRowHeader({ device, cfg, ctx, connectionStateLabels, statusPresentation }: DeviceRowHeaderProps) {
  const { strings } = ctx;
  const nonOnline = device.connectionState !== 'online';

  // Composite parents (Gotcha) roll their worst child up into the tile so the
  // collapsed row reflects the unit's true state without expanding.
  const isComposite = cfg.capabilities.composite === true && (device.children?.length ?? 0) > 0;
  const health = isComposite ? getEffectiveDeviceHealth(device) : getDeviceHealth(device);
  const healthVisual = statusPresentation?.neutralTile
    ? DEVICE_HEALTH_VISUAL.ok
    : DEVICE_HEALTH_VISUAL[health];
  const healthReason = getDeviceHealthReason(device, strings, connectionStateLabels);
  const connectionLabel = connectionStateLabels[device.connectionState];

  const healthLabel = {
    error: strings.healthError,
    ok: strings.healthHealthy,
  }[health];

  const tone = HEALTH_TONE[health];
  const showBadge = tone.badge != null && ctx.errorCount > 0;
  const badgeLabel = ctx.errorCount > 99 ? '99+' : ctx.errorCount;
  // The header reason text only adds value when it says something the
  // title doesn't (battery / malfunction / connection detail).
  const reasonText = healthReason && healthReason !== connectionLabel ? healthReason : null;
  const fenceConnection = nonOnline ? connectionLabel : null;
  const hasFence = reasonText != null || fenceConnection != null;
  const hasTooltip = nonOnline || healthReason != null || ctx.errorCount > 0;

  // Header Logs button: composites roll their failing children into one
  // count; flat devices keep their own open-error count.
  const issueCount = isComposite ? getUnhealthyChildCount(device) : ctx.errorCount;
  const showLogsButton = issueCount > 0 && health === 'error';

  // The offline chip is the textual reason channel for a dropped link —
  // driven by the raw connection state now that health itself is binary.
  const isDisconnected = device.connectionState === 'offline';

  const tile = (
    <div
      className={`relative w-8 h-8 rounded flex items-center justify-center shrink-0 transition-[background-color,box-shadow] duration-[var(--motion-fast)] ease-out ${healthVisual.tile} ${statusPresentation?.tileClassName ?? ''}`}
      data-handoff-component="device-icon"
      data-health={health}
      {...(healthReason ? { role: 'status', 'aria-label': healthReason } : {})}
    >
      <device.Icon
        size={20}
        fill={healthVisual.iconFill}
        active={ctx.isFloodlightOn || ctx.isSpeakerPlaying}
      />
      {/* No offline corner badge here — the OfflineChip in the actions
          cluster already carries the offline cue for the parent row. */}
      {statusPresentation?.tileBadge}
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
              <span className="w-full min-w-0 truncate text-xs font-semibold text-slate-12">
                {healthLabel}
              </span>
              {showBadge && (
                <span
                  className={`h-4 shrink-0 rounded-[2px] px-1.5 align-middle text-2xs font-medium leading-4 tabular-nums ${tone.badge}`}
                >
                  {badgeLabel}
                </span>
              )}
            </div>
            {hasFence && (
              <div className="border-t border-white/10 px-2.5 py-1.5">
                {reasonText != null && (
                  <div className="max-w-[220px] text-xs text-slate-11">{reasonText}</div>
                )}
                {fenceConnection != null && (
                  <div className="mt-0.5 text-2xs text-white/50">{fenceConnection}</div>
                )}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        tile
      )}

      <div className="flex-1 min-w-0 text-start">
        <span className="text-sm font-medium truncate block text-slate-11">
          {device.name}
        </span>
      </div>

      <PrimaryCluster
        cfg={cfg}
        ctx={ctx}
        showLogs={showLogsButton}
        logsCount={issueCount}
        offlineLabel={isDisconnected ? strings.healthOffline : null}
        statusSlot={statusPresentation?.statusSlot}
      />
    </>
  );
});

/**
 * Always-visible action cluster at the row's inline-end. Show-on-map sits
 * at the outer edge; the device's other primary actions (speaker On/Off,
 * floodlight segmented) sit inboard of it, with the speaker now-playing
 * readout and the armed-notifications echo ahead of them.
 */
function PrimaryCluster({
  cfg,
  ctx,
  showLogs,
  logsCount,
  offlineLabel,
  statusSlot,
}: {
  cfg: DeviceTypeConfig;
  ctx: DeviceActionContext;
  showLogs: boolean;
  logsCount: number;
  /** Non-null when the device is offline — renders the chip inline-start of Show-on-map. */
  offlineLabel: string | null;
  /** Audition override: replaces the offline-chip slot, rendered for every state. */
  statusSlot?: ReactNode;
}) {
  // Offline rows keep only the channels that still make sense without a
  // connection: Logs (read history) and Show-on-map (recenter). Interactive
  // controls (floodlight toggle, speaker play, notify echo) are hidden —
  // a device you can't reach shouldn't offer to act.
  const offline = offlineLabel != null;
  const inboard = offline ? [] : cfg.headerActions.filter((id) => id !== 'center');
  const center = cfg.headerActions.includes('center')
    ? resolveDeviceAction('center', ctx, 'header')
    : null;

  return (
    <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {showLogs && (
        <LogsErrorButton
          count={logsCount}
          logsLabel={ctx.strings.logs}
          errorsLabel={ctx.strings.errors}
          onOpenErrors={ctx.onOpenErrors}
        />
      )}
      {!offline && <SpeakerNowPlaying ctx={ctx} />}
      {inboard.map((id) => {
        const resolved = resolveDeviceAction(id, ctx, 'header');
        return resolved ? <span key={resolved.key}>{resolved.node}</span> : null;
      })}
      {!offline && (
        <NotifyHeaderIndicator
          armed={ctx.isNotifyOn}
          remaining={ctx.notifyRemaining}
          ariaLabelPrefix={ctx.strings.notificationsArmedAriaLabel}
        />
      )}
      {/* Offline chip sits just inboard of Show-on-map: left of the icon in
          LTR, right of it in RTL (flex order follows the row direction). */}
      {statusSlot !== undefined ? statusSlot : offlineLabel != null && <OfflineChip label={offlineLabel} />}
      {center?.node}
    </div>
  );
}

/**
 * Header issue channel — mounts when the device (or its children) needs
 * attention. Shows the Logs glyph + count in the error red (no resting
 * surface, just a hover affordance). Clicking opens the errors modal,
 * which lists each open error with its cause.
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
  const toneClass = 'text-red-300 hover:bg-red-500/10 focus-visible:ring-red-300/40';
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
          className={`inline-flex h-6 shrink-0 items-center gap-1 rounded px-1.5 text-xs font-medium transition-[background-color,transform] duration-[var(--motion-fast)] ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 [&_svg]:size-3 ${toneClass}`}
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
      className={`grid ease-[var(--ease-bounce)] transition-[grid-template-columns] motion-reduce:transition-none ${
        trackOpen ? 'grid-cols-[1fr] duration-[var(--motion-moderate)]' : 'grid-cols-[0fr] duration-[var(--motion-fast)]'
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
              exit={{ opacity: 0, transition: reduceMotion ? { duration: 0 } : springExit.fast }}
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
