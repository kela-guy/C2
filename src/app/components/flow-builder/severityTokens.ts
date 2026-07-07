/**
 * Flow Builder — severity -> Tailwind class map.
 *
 * The panel reads urgency exclusively via these class strings (per
 * the plan's "non-negotiable: no inline hex"). Hex tokens live in
 * `urgency.ts` and continue to drive the production card/marker; the
 * builder panel only shows derived-severity chips, so a Tailwind
 * indirection is enough.
 */

import type { Severity } from '@/primitives/urgency';

export interface SeverityTw {
  /** Solid background fill (used by the active stage rail dot). */
  bg: string;
  /** Foreground text color (chip label, sparkline). */
  text: string;
  /** Soft tinted background for the chip pill. */
  chipBg: string;
  /** 1px border that matches the chip tint. */
  chipBorder: string;
}

export const SEVERITY_TW: Record<Severity, SeverityTw> = {
  CRITICAL: {
    bg: 'bg-red-500',
    text: 'text-red-400',
    chipBg: 'bg-red-500/15',
    chipBorder: 'border-red-500/40',
  },
  HIGH: {
    bg: 'bg-red-500',
    text: 'text-red-400',
    chipBg: 'bg-red-500/10',
    chipBorder: 'border-red-500/30',
  },
  MEDIUM: {
    bg: 'bg-orange-400',
    text: 'text-orange-400',
    chipBg: 'bg-orange-400/10',
    chipBorder: 'border-orange-400/30',
  },
  LOW: {
    bg: 'bg-slate-9',
    text: 'text-slate-10',
    chipBg: 'bg-slate-9/10',
    chipBorder: 'border-slate-9/30',
  },
};
