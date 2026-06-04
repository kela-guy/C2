/**
 * Shared chrome for "this control is disabled because…" tooltips.
 *
 * Wraps a disabled control in a `Tooltip` whose content is the reason
 * string. When `reason` is null/empty, the wrapper is a no-op so
 * enabled controls don't pay the tooltip cost.
 *
 * The wrapping `<span>` carries `onClick` stop-propagation because the
 * row container is itself a button — without it, clicking the
 * disabled control would expand/collapse the row.
 */

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';

interface ReasonTooltipProps {
  reason: string | null | undefined;
  children: React.ReactNode;
}

export function ReasonTooltip({ reason, children }: ReasonTooltipProps) {
  if (!reason) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="whitespace-nowrap">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}
