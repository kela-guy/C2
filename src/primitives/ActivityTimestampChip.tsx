import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/components/ui/utils';
import { STATUS_CHIP_COLORS, type StatusChipColor } from './StatusChip';

/**
 * Combined activity + timestamp element for the card-header status slot.
 *
 * Merges the (previously redundant) timestamp subtitle and the textual
 * activity StatusChip ("פעיל לאחרונה" etc.) into a single, scannable element:
 * a small status-colored dot followed by the timestamp text. The activity
 * status is conveyed by the dot color; the status word stays available to
 * sighted users (hover tooltip) and assistive tech (`aria-label`) so color is
 * never the only carrier of meaning. On hover the tooltip surfaces the relative
 * "time since detection" (e.g. "לפני פחות מדקה") when `hoverLabel` is provided.
 */
export interface ActivityTimestampChipProps {
  /** Timestamp text to display (e.g. "00:14:10"). Falls back to the status label when absent. */
  timestamp?: string;
  /** Semantic color mapping to the activity status. */
  color: StatusChipColor;
  /** Localized status word (e.g. "פעיל לאחרונה") surfaced via aria-label. */
  statusLabel: string;
  /**
   * Optional hover/tooltip text. When provided, the tooltip shows this instead
   * of the status word — used to surface the relative "time since detection"
   * (e.g. "לפני פחות מדקה"). The status word is retained in the aria-label.
   */
  hoverLabel?: string;
  className?: string;
}

export function ActivityTimestampChip({
  timestamp,
  color,
  statusLabel,
  hoverLabel,
  className,
}: ActivityTimestampChipProps) {
  const c = STATUS_CHIP_COLORS[color];
  const text = timestamp && timestamp.length > 0 ? timestamp : statusLabel;
  const tooltipText = hoverLabel ?? statusLabel;
  const ariaLabel = hoverLabel ? `${statusLabel}, ${hoverLabel}` : statusLabel;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          data-handoff-component="activity-timestamp-chip"
          aria-label={ariaLabel}
          className={cn('inline-flex items-center gap-1.5 shrink-0', className)}
        >
          <span
            className="size-1.5 rounded-full shrink-0"
            style={{ backgroundColor: c.dot }}
            aria-hidden="true"
          />
          <span className="text-xs font-mono font-medium text-white whitespace-nowrap">{text}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="whitespace-nowrap">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
