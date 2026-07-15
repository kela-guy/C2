/**
 * `/devices-lab` layout study — the chosen device-card direction.
 *
 * Collapsed rows show the device + always-on primary cluster (Show on map,
 * device On/Off). Expanding reveals telemetry (+ camera hero) and a footer
 * where action secondaries sit inline and low-signal inspect actions
 * (Logs / Notifications) collapse into a 3-dot overflow. Notifications is a
 * timed toggle that arms a 30s attention window from inside the menu; Logs is
 * the error channel: it turns red with a count when the device has errors, so
 * there is no separate "Errors" control.
 *
 * Rows are flat (bottom-border list) to match today's real device rows —
 * no rounded card chrome, no expand chevron; the whole header is the expand
 * affordance. Actions render through `ActionControl` from
 * `presentationRules`. Sandbox-only.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell as IconBell,
  BellOffFilled,
  Camera,
  EllipsisVertical as IconDotGrid1x3Vertical,
} from '@/lib/icons/central';
import { HEALTH_BADGE_CLASS, HEALTH_DOT_CLASS } from '@/primitives/HealthStatus';
import { NotificationIcon, NotificationMutedIcon } from '../../devices-panel/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { DEFAULT_CONNECTION_STATE_LABELS } from '../../devices-panel/constants';
import type { ConnectionState } from '../../devices-panel/types';
import { DEVICE_HEALTH_VISUAL, type DeviceHealth } from '../../devices-panel/deviceHealth';
import { DotmSquare18 } from '@/app/components/ui/dotm-square-18';
import { DotmCircular4 } from '@/app/components/ui/dotm-circular-4';
import {
  ACTION_META,
  ActionControl,
  DEVICE_ACTIONS,
  DeviceCardProvider,
  LAB_DEVICES,
  NOTIFY_WINDOW_S,
  useCardState,
  type ActionId,
  type LabDevice,
} from './presentationRules';
import { splitFooterActions } from '../../devices-panel/footerOverflow';

/**
 * Tile-tooltip tone — the chosen "Titled header + divider" study (option 2 in
 * `TooltipDesigns`): a severity dot + label, an optional count badge for the
 * error tone, and a worst-wins severity title. `ok` never carries a badge.
 */
const HEALTH_TONE: Record<DeviceHealth, { dot: string; badge: string | null; label: string }> = {
  error: { dot: HEALTH_DOT_CLASS.error, badge: HEALTH_BADGE_CLASS.error, label: 'Errors' },
  ok: { dot: HEALTH_DOT_CLASS.ok, badge: null, label: 'Healthy' },
};

// ---------------------------------------------------------------------------
// Shared low-fi card pieces
// ---------------------------------------------------------------------------

/**
 * Health-aware icon tile — the single fast-scan signal, mirroring the real
 * `DeviceRowHeader`: a worst-wins severity tint (`DEVICE_HEALTH_VISUAL`),
 * a connection dot when not online, and a hover tooltip
 * that carries the textual detail (connection chip, error count, reason) so
 * the row name stays uncluttered.
 */
export function DeviceTile({ device }: { device: LabDevice }) {
  const health: DeviceHealth = device.health ?? (device.online ? 'ok' : 'error');
  const connection: ConnectionState = device.connection ?? (device.online ? 'online' : 'offline');
  const visual = DEVICE_HEALTH_VISUAL[health];
  const errorCount = device.errorCount ?? 0;

  const tile = (
    <div
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded transition-[background-color,box-shadow] duration-150 ease-out ${visual.tile}`}
      data-health={health}
    >
      <device.Icon size={20} fill={visual.iconFill} />
    </div>
  );

  const hasTooltip = connection !== 'online' || errorCount > 0 || device.healthReason != null;
  if (!hasTooltip) return tile;

  // "Titled header + divider" tooltip (the chosen `TooltipDesigns` option 2):
  // a worst-wins severity title + dot up top, an optional clamped count badge
  // for trouble tones, and a hairline-fenced reason + connection detail below.
  const tone = HEALTH_TONE[health];
  const showBadge = tone.badge != null && errorCount > 0;
  const badgeLabel = errorCount > 99 ? '99+' : errorCount;
  const connectionLabel =
    connection !== 'online' ? DEFAULT_CONNECTION_STATE_LABELS[connection] : undefined;
  const hasFence = device.healthReason != null || connectionLabel != null;

  return (
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
            {tone.label}
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
            {device.healthReason != null && (
              <div className="max-w-[220px] text-xs text-slate-11">{device.healthReason}</div>
            )}
            {connectionLabel != null && (
              <div className="mt-0.5 text-2xs text-white/50">{connectionLabel}</div>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function NameBlock({ device }: { device: LabDevice }) {
  // Offline rows dim the name — mirrors the shipped `DeviceRowHeader`.
  return (
    <div className="min-w-0 flex-1 text-start">
      <div
        className={`truncate text-sm font-medium ${
          device.online ? 'text-slate-11' : 'text-white/55'
        }`}
      >
        {device.name}
      </div>
    </div>
  );
}

/**
 * Always-visible action cluster at the row's logical end (right in LTR, left
 * in RTL). Show on map always sits at the outer edge; the device's other
 * primary actions sit inboard of it. For the speaker that's the Play/Pause
 * control + the now-playing readout.
 */
function PrimaryCluster({ device }: { device: LabDevice }) {
  const { primary } = DEVICE_ACTIONS[device.kind];
  const card = useCardState();
  const reduceMotion = useReducedMotion();
  // Offline connections keep only Show-on-map (recentering doesn't need a
  // link); interactive
  // controls are hidden — a device you can't reach shouldn't offer to act.
  const offline = !device.online;
  // Show on map is pinned to the outer edge; everything else renders inboard.
  const inboard = offline ? [] : primary.filter((id) => id !== 'showOnMap');
  // Only speakers carry the now-playing readout; the grid wrapper stays mounted
  // on those rows so the chip can animate open *and* closed as Play/Stop toggles.
  const isSpeaker = device.kind === 'ramcall';
  const nowPlaying = isSpeaker && (card?.playing ?? false);
  // The width track lags the chip's unmount: it wipes open on enter, but on
  // exit it stays expanded through the fade and only reclaims the (now-empty)
  // space once the chip has unmounted — so the exit reads as a pure fade with
  // no text-clipping slide.
  const [trackOpen, setTrackOpen] = useState(nowPlaying);
  useEffect(() => {
    if (nowPlaying) setTrackOpen(true);
  }, [nowPlaying]);
  return (
    <div className="flex shrink-0 items-center gap-0.5" onClick={stop}>
      {/* Now-playing reveals to the left of the Play/Pause control so the
          button never shifts — the readout grows into the name via a grid
          0fr→1fr wipe on enter. The chip itself springs in from the right —
          opacity + scale + blur (origin-right), no slide — and
          it exits with a quick opacity fade only (the track stays open until
          the chip unmounts, then collapses empty space invisibly).
          `dir="ltr"` keeps the [≋ track] reading order even in RTL. */}
      {isSpeaker && (
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
                  aria-label={card ? `Now playing — ${card.label}` : undefined}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, x: 2, filter: 'blur(3px)' }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.1, ease: 'easeOut' } }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34, mass: 0.7 }}
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
                  <span className="max-w-[120px] truncate">{card?.label}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </span>
      )}
      {inboard.map((id) => (
        <ActionControl key={id} id={id} device={device} iconOnly />
      ))}
      {/* Armed-notifications echo: timer then bell, so the bell lands directly
          beside the Show-on-map glyph and the HH:MM:SS timer sits to its left. */}
      {!offline && <NotifyHeaderIndicator />}
      {primary.includes('showOnMap') && (
        <ActionControl id="showOnMap" device={device} iconOnly />
      )}
    </div>
  );
}

export function Telemetry({ device }: { device: LabDevice }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
      {device.stats.map((s) => (
        <div key={s.label} className="flex flex-col items-start gap-1">
          <span className="text-xs text-white/60">{s.label}</span>
          <span className={`font-sans text-xs tabular-nums ${s.color ?? 'text-white'}`}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Camera preview placeholder — matches the production `DeviceRowDetails` hero. */
export function CameraHero() {
  return (
    <div className="relative h-[200px] w-full overflow-hidden bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
      <div className="absolute inset-0 flex items-center justify-center">
        <Camera size={24} className="text-white/20" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <div className="absolute top-1.5 end-1.5 flex items-center gap-1 rounded-sm bg-black/80 px-1.5 py-0.5">
        <span className="size-1.5 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none" />
        <span className="text-xs font-medium uppercase tracking-wide text-white/90">Live</span>
      </div>
    </div>
  );
}

/**
 * Flat, collapsible row — mirrors today's `DeviceRow`: full-bleed, a
 * bottom hairline between rows, no rounded card, no chevron. The header is
 * the click target.
 */
export function CardShell({
  open,
  onToggle,
  header,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  header: ReactNode;
  children?: ReactNode;
}) {
  return (
    <DeviceCardProvider>
      <div className="border-b border-white/[0.06]">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
          className={`relative flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-state-focus-ring ${
            open ? 'bg-white/[0.04]' : 'hover:bg-state-hover active:bg-state-pressed'
          }`}
        >
          {header}
        </div>
        {open && children && (
          <div className="animate-in fade-in-0 duration-200 overflow-visible bg-white/[0.03] motion-reduce:animate-none">
            {children}
          </div>
        )}
      </div>
    </DeviceCardProvider>
  );
}

/** Bottom action bar shared by the variants. */
export function FooterBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex w-full flex-nowrap items-center gap-2 overflow-visible border-t border-white/[0.06] px-2 py-1.5"
      onClick={stop}
    >
      {children}
    </div>
  );
}

function useExpand(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, toggle: () => setOpen((v) => !v) };
}

function stop(e: React.MouseEvent) {
  e.stopPropagation();
}

// ---------------------------------------------------------------------------
// Device card row — primary inline + 3-dot overflow for inspect actions
// ---------------------------------------------------------------------------

/** Formats a remaining-seconds count as zero-padded HH:MM:SS. */
function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/**
 * Armed-notifications countdown for the overflow-menu row: an HH:MM:SS timer +
 * the radar-sweep spinner. Both inherit `currentColor` (no `colorPreset`) so
 * they always render in one shared color — white by default.
 */
/** Fixed trailing width for the notifications row — fits `00:00:30` + spinner. */
const NOTIFY_TRAILING_W = 'w-[4.75rem]';

/** 12px bell slot — both glyphs come from the same Central filled set. */
function NotifyBellIcon({ armed }: { armed: boolean }) {
  return (
    <span className="inline-flex size-3 shrink-0 items-center justify-center [&_svg]:size-3 [&_svg]:shrink-0">
      {armed ? <BellOffFilled size={12} /> : <IconBell size={12} />}
    </span>
  );
}

function NotifyCountdown({ remaining }: { remaining: number }) {
  return (
    <span
      className="inline-flex items-center justify-end gap-1.5 text-white"
      aria-label={`${formatHMS(remaining)} left`}
    >
      <span className="min-w-[3.25rem] tabular-nums text-2xs leading-none text-end">
        {formatHMS(remaining)}
      </span>
      <span className="inline-flex size-3.5 shrink-0 items-center justify-center">
        <DotmCircular4
          size={14}
          dotSize={2}
          speed={0.5}
          pattern="full"
          animated
          opacityBase={0}
          opacityMid={0.05}
          opacityPeak={1}
          ariaLabel="Notifications active"
        />
      </span>
    </span>
  );
}

/**
 * Header echo of the armed notifications window. Lives in the primary cluster
 * right beside the Show-on-map glyph: the bell sits next to the map icon and
 * the HH:MM:SS timer sits to the bell's left. Reads shared card state so it
 * stays visible (and counting) even when the menu is closed / row collapsed,
 * and renders nothing while disarmed.
 */
function NotifyHeaderIndicator() {
  const card = useCardState();
  if (!card?.notifyOn) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-white"
      aria-label={`Notifications armed — ${formatHMS(card.notifyRemaining)} left`}
    >
      <span className="tabular-nums text-xs leading-none">
        {formatHMS(card.notifyRemaining)}
      </span>
      <NotifyBellIcon armed />
    </span>
  );
}

/**
 * Notifications as an interactive overflow-menu row. Arming it lights the row
 * and runs a 30s countdown + radar sweep (DotmCircular4); pressing again — or
 * letting it lapse — disarms it. The armed flag + countdown live in the shared
 * card state, so the header indicator mirrors it and the window keeps running
 * after the menu closes. The bell swaps to the bold filled glyph while armed.
 */
function NotificationsMenuItem({ device }: { device: LabDevice }) {
  const card = useCardState();
  const on = card?.notifyOn ?? false;
  const remaining = card?.notifyRemaining ?? NOTIFY_WINDOW_S;
  const disabled = !device.online;

  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={on}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        card?.setNotifyOn(!on);
      }}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-state-hover-overlay'
      }`}
    >
      <span className={`inline-flex items-center ${on ? 'text-white' : 'text-white/60'}`}>
        <NotifyBellIcon armed={on} />
      </span>
      <span className="min-w-0 flex-1 leading-none">Notifications</span>
      <span className={`inline-flex shrink-0 items-center justify-end ${NOTIFY_TRAILING_W}`} aria-hidden={!on}>
        {on ? (
          <NotifyCountdown remaining={remaining} />
        ) : (
          <span className="inline-flex items-center justify-end gap-1.5 opacity-0" aria-hidden>
            <span className="min-w-[3.25rem] tabular-nums text-2xs leading-none">00:00:30</span>
            <span className="size-3.5 shrink-0" />
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Mute as an interactive overflow-menu row. Reads the shared card `muted`
 * state so the bell ↔ slashed-bell glyph and label stay in sync, and keeps the
 * menu open on toggle (it's a checkable item, not a navigate-away entry).
 */
function MuteMenuItem({ device }: { device: LabDevice }) {
  const card = useCardState();
  const muted = card?.muted ?? false;
  const disabled = !device.online;

  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={muted}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        card?.setMuted(!muted);
      }}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
        muted ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-state-hover-overlay'
      }`}
    >
      <span
        className={`inline-flex items-center [&_svg]:size-3 ${muted ? 'text-white' : 'text-white/60'}`}
      >
        {muted ? <NotificationMutedIcon size={12} /> : <NotificationIcon size={12} />}
      </span>
      <span className="min-w-0 flex-1 leading-none">{muted ? 'Muted' : 'Mute'}</span>
    </button>
  );
}

function OverflowMenu({ device, ids }: { device: LabDevice; ids: ActionId[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={stop}>
      <ActionControlButton open={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute end-0 bottom-full z-30 mb-1 flex w-[180px] flex-col gap-0.5 rounded-md border border-white/10 bg-slate-2 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            {ids.map((id) => {
              // Notifications is an interactive timed toggle, not a navigate-away
              // entry — render its own armable row that keeps the menu open.
              if (id === 'notifications') {
                return <NotificationsMenuItem key={id} device={device} />;
              }
              // Mute is an interactive toggle row, not a navigate-away entry.
              if (id === 'mute') {
                return <MuteMenuItem key={id} device={device} />;
              }
              const m = ACTION_META[id];
              // Logs carries the error signal — the row goes red with a count
              // instead of there being a separate "Errors" entry.
              const count = id === 'logs' ? device.errorCount ?? 0 : 0;
              const hasErrors = count > 0;
              const label = hasErrors && id === 'logs' ? 'Logs · errors' : m.label;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    console.info(`[layout-lab] open ${id}`, device.id);
                  }}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 text-start text-xs [&_svg]:size-3 ${
                    hasErrors
                      ? 'text-red-300 hover:bg-red-500/10'
                      : 'text-white/80 hover:bg-state-hover-overlay'
                  }`}
                >
                  <span className={`inline-flex items-center ${hasErrors ? 'text-red-300' : 'text-white/60'}`}>
                    {m.icon}
                  </span>
                  <span className="flex-1 leading-none">{label}</span>
                  {hasErrors && (
                    <span className="rounded-full bg-red-500/20 px-1.5 text-2xs font-medium text-red-300">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ActionControlButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="More actions"
      onClick={onClick}
      className={`inline-flex size-6 items-center justify-center rounded text-white/70 transition-colors duration-150 hover:bg-state-hover-overlay hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring [&_svg]:size-3 ${
        open ? 'bg-white/10 text-white' : ''
      }`}
    >
      <IconDotGrid1x3Vertical size={12} />
    </button>
  );
}

function DeviceCardRow({ device }: { device: LabDevice }) {
  // Drone + floodlight start expanded in the lab: drone shows the full footer
  // stack; floodlight is the lone-overflow row (Logs lives in the 3-dot menu).
  const { open, toggle } = useExpand(
    device.kind === 'drone' || device.kind === 'lightProjector',
  );
  const { secondary } = DEVICE_ACTIONS[device.kind];

  const { inline: inlineActions, overflow: overflowActions, hasOverflow } =
    splitFooterActions(secondary);
  const hasFooter = inlineActions.length > 0 || overflowActions.length > 0;

  return (
    <CardShell
      open={open}
      onToggle={toggle}
      header={
        <>
          <DeviceTile device={device} />
          <NameBlock device={device} />
          <PrimaryCluster device={device} />
        </>
      }
    >
      {device.cameraPreview && <CameraHero />}
      <Telemetry device={device} />
      {hasFooter && (
        <FooterBar>
          <div className="flex w-full flex-wrap items-center gap-2">
            {inlineActions.map((id) => (
              <ActionControl key={id} id={id} device={device} />
            ))}
          </div>
          {hasOverflow && (
            <div className="flex w-fit justify-end">
              <OverflowMenu device={device} ids={overflowActions} />
            </div>
          )}
        </FooterBar>
      )}
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Lab surface
// ---------------------------------------------------------------------------

export function CardLayoutLab() {
  return (
    <section>
      <div className="w-full max-w-[380px] overflow-visible rounded-md border border-white/[0.06] bg-surface-2">
        {LAB_DEVICES.map((device) => (
          <DeviceCardRow key={device.id} device={device} />
        ))}
      </div>
    </section>
  );
}
