import React from "react";
import { cn } from "@/shared/components/ui/utils";
import { accentHex, slateHex } from "@/primitives/accentHex";

/*
 * Status chip semantics — keep this map shallow and aligned with
 * the four accent classes so anywhere a chip is rendered the dot
 * (consumed by SVG / inline-style sites that can't resolve CSS
 * vars) matches its tailwind tint exactly. Don't fork colors here;
 * fork them in palette.css and let this table follow.
 */
export const STATUS_CHIP_COLORS = {
  green: {
    bg: 'bg-accent-success-tint',
    text: 'text-accent-success',
    dot: accentHex('success'),
    usage: 'Active, resolved, handled',
  },
  red: {
    bg: 'bg-accent-danger-tint',
    text: 'text-accent-danger',
    dot: accentHex('danger'),
    usage: 'Threat, alert, critical',
  },
  orange: {
    bg: 'bg-accent-warning-tint',
    text: 'text-accent-warning',
    dot: accentHex('warning'),
    usage: 'Warning, recently active',
  },
  gray: {
    bg: 'bg-state-hover-strong',
    text: 'text-slate-12',
    dot: slateHex(9),
    usage: 'Expired, dismissed, inactive',
  },
} as const;

export type StatusChipColor = keyof typeof STATUS_CHIP_COLORS;

export function StatusChip({ label, color = "green", className }: { label: string; color?: StatusChipColor; className?: string }) {
  const c = STATUS_CHIP_COLORS[color];
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center justify-center rounded border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1',
        c.bg, c.text,
        className,
      )}
    >
      {label}
    </span>
  );
}
