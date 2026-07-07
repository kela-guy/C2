/**
 * Canonical health/status tone vocabulary.
 *
 * ONE place maps the four asset-health tones (ok / warning / error /
 * offline) onto palette.css tokens. Previously this map was re-declared
 * in ≥8 files (DeviceRowHeader, DeviceChildGroup, StatusChip, the
 * devices-lab pages, StyleguidePage, …), each hardcoding
 * `emerald-400`/`red-400`/`amber-400` while `--accent-success/-warning/
 * -danger` sat unused. Every consumer now composes from these records.
 *
 * Tone → token contract:
 *   dot    vivid accent fill (the color IS the signal; tiny area)
 *   text   accent text tier (step-11 analogue, legible at 10–11px)
 *   badge  tint fill + accent text (count chips / summary pills)
 *   ring   vivid accent at 40% (focus/selection rings on toned cards)
 *
 * `offline` deliberately stays neutral (slate + state overlays): a
 * disconnected asset is "known-absent, not alarmist".
 */

import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/components/ui/utils';

export type HealthTone = 'ok' | 'warning' | 'error' | 'offline';

/** Small round status-indicator fill. */
export const HEALTH_DOT_CLASS: Record<HealthTone, string> = {
  error: 'bg-accent-danger',
  warning: 'bg-accent-warning',
  offline: 'bg-slate-8',
  ok: 'bg-accent-success',
};

/** Count-badge / summary-chip surface: tint fill + legible accent text. */
export const HEALTH_BADGE_CLASS: Record<HealthTone, string> = {
  error: 'bg-accent-danger-tint text-accent-danger-text',
  warning: 'bg-accent-warning-tint text-accent-warning-text',
  offline: 'bg-state-hover-overlay text-slate-11',
  ok: 'bg-accent-success-tint text-accent-success-text',
};

/** Standalone toned text (labels, telemetry values). */
export const HEALTH_TEXT_CLASS: Record<HealthTone, string> = {
  error: 'text-accent-danger-text',
  warning: 'text-accent-warning-text',
  offline: 'text-slate-10',
  ok: 'text-accent-success-text',
};

/** Ring tint for toned cards / selected states. */
export const HEALTH_RING_CLASS: Record<HealthTone, string> = {
  error: 'ring-accent-danger/40',
  warning: 'ring-accent-warning/40',
  offline: 'ring-border-default',
  ok: 'ring-accent-success/30',
};

/**
 * The severity dot — the smallest unit of the health language. Pair it
 * with a textual label or aria-label; the signal must never be
 * color-only.
 */
export function StatusDot({
  tone,
  className,
}: {
  tone: HealthTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-1.5 shrink-0 rounded-full', HEALTH_DOT_CLASS[tone], className)}
    />
  );
}

/**
 * Toned count/summary badge (e.g. "3 Errors") — the shadcn {@link Badge}
 * compressed into the devices-panel chip grammar: 16px tall, 2px corner,
 * 10px medium label. The tone fill + text ride on top of `badgeVariants`.
 */
export function HealthBadge({
  tone,
  className,
  children,
}: {
  tone: HealthTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge
      className={cn(
        'h-4 rounded-[2px] border-0 px-1.5 py-0 text-2xs leading-4 tabular-nums',
        HEALTH_BADGE_CLASS[tone],
        className,
      )}
    >
      {children}
    </Badge>
  );
}
