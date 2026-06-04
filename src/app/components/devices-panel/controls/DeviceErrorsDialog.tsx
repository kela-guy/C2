/**
 * Errors modal for a single device.
 *
 * Opened from the collapsed-row error button (`ctx.onOpenErrors`). Lists
 * the device's open errors — each row a severity glyph (red for `error`,
 * amber for `warning`) plus the message in white text.
 *
 * Layout (top -> bottom): a fixed header, a fixed severity-filter bar, then
 * the scrolling list. The header + filters sit outside the scroll region so
 * they stay pinned (and seam-free) while only the list scrolls; the list is
 * capped so a busy log (dozens of entries) never grows the modal. Falls back
 * to an empty-state line when the count is known but the structured list
 * isn't, or when a filter matches nothing.
 */

import { useMemo, useState } from 'react';
import { WarningTriangle } from '@/lib/icons/central';
import { CopyButton } from '@/primitives/CopyButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import type { Device, DeviceError, DevicesPanelStrings } from '../types';

interface DeviceErrorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  strings: DevicesPanelStrings;
}

type SeverityFilter = 'all' | DeviceError['severity'];

const SEVERITY_COLOR: Record<DeviceError['severity'], string> = {
  error: 'text-red-400',
  warning: 'text-amber-400',
};

/**
 * Filter badge — a count-carrying pill. Active state borrows the severity's
 * own hue (red / amber) so the selected lens reads at a glance; "all" stays
 * neutral. Counts are tabular so the pill width never jitters between values.
 */
function FilterBadge({
  active,
  tone,
  label,
  count,
  onClick,
}: {
  active: boolean;
  tone: SeverityFilter;
  label: string;
  count: number;
  onClick: () => void;
}) {
  const activeClass =
    tone === 'error'
      ? 'bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-400/30'
      : tone === 'warning'
        ? 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-400/30'
        : 'bg-white/15 text-white';
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 motion-reduce:transition-none motion-reduce:active:scale-100 ${
        active ? activeClass : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80'
      }`}
    >
      <span>{label}</span>
      <span
        className={`tabular-nums ${active ? 'opacity-90' : 'text-white/40'}`}
      >
        {count}
      </span>
    </button>
  );
}

export function DeviceErrorsDialog({ open, onOpenChange, device, strings }: DeviceErrorsDialogProps) {
  const errors = useMemo(() => device.errors ?? [], [device.errors]);
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const counts = useMemo(() => {
    let error = 0;
    let warning = 0;
    for (const e of errors) {
      if (e.severity === 'error') error += 1;
      else warning += 1;
    }
    return { all: errors.length, error, warning };
  }, [errors]);

  const visible = useMemo(
    () => (filter === 'all' ? errors : errors.filter((e) => e.severity === filter)),
    [errors, filter],
  );

  // Reset to "all" each time the modal reopens so a stale lens never hides
  // entries on the next device.
  const handleOpenChange = (next: boolean) => {
    if (!next) setFilter('all');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-handoff-component="device-errors-modal"
        className="flex max-w-md flex-col gap-0 overflow-hidden border-white/10 bg-zinc-900 p-0 text-zinc-200"
      >
        <DialogHeader className="shrink-0 border-b border-white/10 px-4 py-3 pe-10 text-start">
          <DialogTitle className="truncate text-sm font-semibold text-zinc-100">
            {strings.errorsModalTitle} · {device.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {strings.errorsModalTitle} — {device.name}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 ? (
          <>
            <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-white/10 px-4 py-2.5">
              <FilterBadge
                active={filter === 'all'}
                tone="all"
                label={strings.errorsFilterAll}
                count={counts.all}
                onClick={() => setFilter('all')}
              />
              <FilterBadge
                active={filter === 'error'}
                tone="error"
                label={strings.errorsFilterErrors}
                count={counts.error}
                onClick={() => setFilter('error')}
              />
              <FilterBadge
                active={filter === 'warning'}
                tone="warning"
                label={strings.errorsFilterWarnings}
                count={counts.warning}
                onClick={() => setFilter('warning')}
              />
            </div>

            {visible.length > 0 ? (
              <ul className="max-h-48 min-h-0 flex-1 divide-y divide-white/[0.06] overflow-y-auto overscroll-contain">
                {visible.map((err, i) => (
                  <li
                    key={`${err.severity}-${i}-${err.message}`}
                    className="group/copy flex items-start gap-2.5 px-4 py-2.5 transition-colors duration-100 hover:bg-white/[0.03]"
                  >
                    <WarningTriangle
                      size={16}
                      className={`mt-0.5 shrink-0 ${SEVERITY_COLOR[err.severity]}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 text-sm leading-snug text-white">{err.message}</span>
                    <CopyButton
                      value={err.message}
                      copyLabel={strings.errorCopy}
                      copiedLabel={strings.errorCopied}
                      size="sm"
                      className="-me-1 -mt-0.5"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-white/45">
                {strings.errorsFilterNoMatch}
              </div>
            )}
          </>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-white/50">
            {strings.errorsModalEmpty}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
