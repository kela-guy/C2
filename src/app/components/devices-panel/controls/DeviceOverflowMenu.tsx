/**
 * Footer 3-dot overflow for the low-signal inspect actions.
 *
 * Holds the actions that should stay tucked away until needed:
 *   - Notifications — a timed toggle that arms a `NOTIFY_WINDOW_S`
 *     attention window (lit bell + countdown + radar sweep). Arming/
 *     disarming fires `ctx.onToggleNotify`; the live countdown comes from
 *     `ctx.notifyRemaining` (owned by the row, so it survives the menu
 *     closing) and is echoed in the header by `NotifyHeaderIndicator`.
 *   - Logs — the error channel. The row goes red with a count when the
 *     device has errors, so there is no separate "Errors" entry.
 */

import { useState } from 'react';
import { EllipsisVertical as IconDotGrid1x3Vertical, List } from '@/lib/icons/central';
import type { DeviceActionContext } from '../deviceActions';
import type { DeviceActionKind } from '../deviceRegistry';
import { NotifyBellIcon, NotifyCountdown } from './notify';

/** Fixed trailing width for the notifications row — fits `00:00:30` + spinner. */
const NOTIFY_TRAILING_W = 'w-[4.75rem]';

interface DeviceOverflowMenuProps {
  kinds: DeviceActionKind[];
  ctx: DeviceActionContext;
}

export function DeviceOverflowMenu({ kinds, ctx }: DeviceOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  if (kinds.length === 0) return null;

  return (
    <div className="relative" onClick={stop} data-handoff-component="device-overflow">
      <TriggerButton open={open} label={ctx.strings.moreActions} onClick={() => setOpen((v) => !v)} />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute end-0 bottom-full z-30 mb-1 flex w-[180px] flex-col gap-0.5 rounded-md border border-white/10 bg-slate-2 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 duration-[var(--motion-fast)] origin-bottom-right rtl:origin-bottom-left motion-reduce:animate-none"
          >
            {kinds.map((kind) => {
              if (kind === 'notifications') return <NotificationsMenuItem key={kind} ctx={ctx} />;
              if (kind === 'logs') return <LogsMenuItem key={kind} ctx={ctx} onClose={() => setOpen(false)} />;
              return null;
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TriggerButton({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex size-6 items-center justify-center rounded text-white/70 transition-colors duration-[var(--motion-fast)] hover:bg-state-hover-overlay hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring [&_svg]:size-3 ${
        open ? 'bg-white/10 text-white' : ''
      }`}
    >
      <IconDotGrid1x3Vertical size={12} />
    </button>
  );
}

/**
 * Notifications as an interactive overflow-menu row. Arming it lights the
 * row and runs the countdown + radar sweep; pressing again (or letting it
 * lapse) disarms it. The armed flag + countdown live on the row, so the
 * header indicator mirrors it and the window keeps running after close.
 */
function NotificationsMenuItem({ ctx }: { ctx: DeviceActionContext }) {
  const on = ctx.isNotifyOn;
  const disabled = ctx.device.connectionState === 'offline';
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={on}
      disabled={disabled}
      data-handoff-component="device-notifications"
      onClick={(e) => {
        e.stopPropagation();
        ctx.onToggleNotify();
      }}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-state-hover-overlay'
      }`}
    >
      <span className={`inline-flex items-center ${on ? 'text-white' : 'text-white/60'}`}>
        <NotifyBellIcon armed={on} />
      </span>
      <span className="min-w-0 flex-1 leading-none">{ctx.strings.notifications}</span>
      <span className={`inline-flex shrink-0 items-center justify-end ${NOTIFY_TRAILING_W}`} aria-hidden={!on}>
        {on ? (
          <NotifyCountdown remaining={ctx.notifyRemaining} />
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
 * Logs — the error channel. Low-signal until something breaks: with an
 * error count the row turns red and grows a count badge, so there is no
 * separate "Errors" entry.
 */
function LogsMenuItem({ ctx, onClose }: { ctx: DeviceActionContext; onClose: () => void }) {
  const count = ctx.errorCount;
  const hasErrors = count > 0;
  const label = hasErrors ? `${ctx.strings.logs} · ${ctx.strings.errors}` : ctx.strings.logs;
  return (
    <button
      type="button"
      role="menuitem"
      data-handoff-component="device-logs"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
        ctx.onOpenLogs();
      }}
      className={`flex items-center gap-2 rounded px-2 py-1.5 text-start text-xs [&_svg]:size-3 ${
        hasErrors ? 'text-red-300 hover:bg-red-500/10' : 'text-white/80 hover:bg-state-hover-overlay'
      }`}
    >
      <span className={`inline-flex items-center ${hasErrors ? 'text-red-300' : 'text-white/60'}`}>
        <List size={12} />
      </span>
      <span className="flex-1 leading-none">{label}</span>
      {hasErrors && (
        <span className="rounded-full bg-red-500/20 px-1.5 text-2xs font-medium text-red-300 tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

function stop(e: React.MouseEvent) {
  e.stopPropagation();
}
