import React from "react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/components/ui/utils";

/*
 * Chip palette routed through palette.css accents (see HealthStatus.tsx
 * for the canonical tone vocabulary). `dot` stays a CSS color string
 * because ActivityTimestampChip paints it via inline backgroundColor.
 */
export const STATUS_CHIP_COLORS = {
  green: {
    bg: 'bg-accent-success-tint',
    text: 'text-accent-success',
    dot: 'var(--accent-success)',
    usage: 'Active, resolved, handled',
  },
  red: {
    bg: 'bg-accent-danger-tint',
    text: 'text-accent-danger-text',
    dot: 'var(--accent-danger)',
    usage: 'Threat, alert, critical',
  },
  orange: {
    bg: 'bg-accent-warning-tint',
    text: 'text-accent-warning-text',
    dot: 'var(--accent-warning)',
    usage: 'Warning, recently active',
  },
  gray: {
    bg: 'bg-state-selected',
    text: 'text-slate-12',
    dot: 'var(--slate-9)',
    usage: 'Expired, dismissed, inactive',
  },
} as const;

export type StatusChipColor = keyof typeof STATUS_CHIP_COLORS;

/**
 * Target-activity chip — the shadcn {@link Badge} wearing the semantic tone
 * maps above. Geometry/typography come from `badgeVariants`; only the tone
 * fill + text classes are layered on top.
 */
export function StatusChip({ label, color = "green", className }: { label: string; color?: StatusChipColor; className?: string }) {
  const c = STATUS_CHIP_COLORS[color];
  return (
    <Badge
      role="status"
      data-handoff-component="status-chip"
      className={cn('max-w-full', c.bg, c.text, className)}
    >
      <span className="min-w-0 truncate">{label}</span>
    </Badge>
  );
}
