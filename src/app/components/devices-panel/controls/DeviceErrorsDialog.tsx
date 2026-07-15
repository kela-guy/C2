/**
 * Errors modal for a single device.
 *
 * Opened from the collapsed-row error button (`ctx.onOpenErrors`). Lists
 * the device's open errors — each row a red severity glyph plus the cause
 * in white text. There is no severity filter: every open issue is an
 * error, so the list is the whole story.
 *
 * Layout (top -> bottom): a fixed header, then the scrolling list. The
 * header sits outside the scroll region so it stays pinned (and seam-free)
 * while only the list scrolls; the list is capped so a busy log (dozens of
 * entries) never grows the modal. Falls back to an empty-state line when
 * the count is known but the structured list isn't.
 */

import { useMemo } from 'react';
import { WarningTriangle } from '@/lib/icons/central';
import { CopyButton } from '@/primitives/CopyButton';
import { HEALTH_TEXT_CLASS } from '@/primitives/HealthStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import type { Device, DevicesPanelStrings } from '../types';

interface DeviceErrorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  strings: DevicesPanelStrings;
}

export function DeviceErrorsDialog({ open, onOpenChange, device, strings }: DeviceErrorsDialogProps) {
  const errors = useMemo(() => device.errors ?? [], [device.errors]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-handoff-component="device-errors-modal"
        className="flex max-w-md flex-col gap-0 overflow-hidden border-white/10 bg-slate-2 p-0 text-slate-11"
      >
        <DialogHeader className="shrink-0 border-b border-white/10 px-4 py-3 pe-10 text-start">
          <DialogTitle className="truncate text-sm font-semibold text-slate-12">
            {strings.errorsModalTitle} · {device.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {strings.errorsModalTitle} — {device.name}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 ? (
          <ul className="max-h-48 min-h-0 flex-1 divide-y divide-white/[0.06] overflow-y-auto overscroll-contain">
            {errors.map((err, i) => (
              <li
                key={`${i}-${err.message}`}
                className="group/copy flex items-start gap-2.5 px-4 py-2.5 transition-colors duration-[var(--motion-fast)] hover:bg-state-hover"
              >
                <WarningTriangle
                  size={16}
                  className={`mt-0.5 shrink-0 ${HEALTH_TEXT_CLASS.error}`}
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
          <div className="px-4 py-6 text-center text-sm text-white/50">
            {strings.errorsModalEmpty}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
