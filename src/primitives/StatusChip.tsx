import React from "react";
import { cn } from "@/shared/components/ui/utils";

export const STATUS_CHIP_COLORS = {
  green: {
    bg: 'bg-emerald-400/15',
    text: 'text-emerald-400',
    dot: '#34d399',
    usage: 'Active, resolved, handled',
  },
  red: {
    bg: 'bg-red-400/15',
    text: 'text-red-400',
    dot: '#f87171',
    usage: 'Threat, alert, critical',
  },
  orange: {
    bg: 'bg-orange-300/15',
    text: 'text-orange-300',
    dot: '#fdba74',
    usage: 'Warning, recently active',
  },
  gray: {
    bg: 'bg-white/15',
    text: 'text-white',
    dot: '#a1a1aa',
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
