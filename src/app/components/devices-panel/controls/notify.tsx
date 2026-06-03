/**
 * Shared UI for the timed "Notifications" attention window.
 *
 * Arming Notifications (from the footer 3-dot overflow) starts a fixed
 * `NOTIFY_WINDOW_S` countdown that keeps running after the menu closes or
 * the row collapses. The same countdown is echoed two places, so the
 * formatting + glyphs are single-sourced here:
 *   - `NotifyHeaderIndicator` — the always-visible header echo (timer + bell)
 *   - `NotifyCountdown`        — the overflow menu-row trailing readout
 */

import { Bell, BellOffFilled } from '@/lib/icons/central';
import { DotmCircular4 } from '@/app/components/ui/dotm-circular-4';

/** Formats a remaining-seconds count as zero-padded HH:MM:SS. */
export function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** 12px bell slot — swaps to the bold slashed glyph while armed. */
export function NotifyBellIcon({ armed }: { armed: boolean }) {
  return (
    <span className="inline-flex size-3 shrink-0 items-center justify-center [&_svg]:size-3 [&_svg]:shrink-0">
      {armed ? <BellOffFilled size={12} /> : <Bell size={12} />}
    </span>
  );
}

/** Overflow menu-row countdown: HH:MM:SS timer + radar-sweep spinner. */
export function NotifyCountdown({ remaining }: { remaining: number }) {
  return (
    <span
      className="inline-flex items-center justify-end gap-1.5 text-white"
      aria-label={`${formatHMS(remaining)} left`}
    >
      <span className="min-w-[3.25rem] tabular-nums text-[10px] leading-none text-end">
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
 * Always-visible header echo of the armed notifications window. Lives in
 * the primary cluster beside Show-on-map: the bell sits at the edge and
 * the HH:MM:SS timer sits inboard of it. Renders nothing while disarmed.
 */
export function NotifyHeaderIndicator({
  armed,
  remaining,
  ariaLabelPrefix,
}: {
  armed: boolean;
  remaining: number;
  ariaLabelPrefix: string;
}) {
  if (!armed) return null;
  return (
    <span
      data-handoff-component="device-notify-indicator"
      className="inline-flex items-center gap-1.5 text-white"
      aria-label={`${ariaLabelPrefix} — ${formatHMS(remaining)} left`}
    >
      <span className="tabular-nums text-[12px] leading-none">{formatHMS(remaining)}</span>
      <NotifyBellIcon armed />
    </span>
  );
}
