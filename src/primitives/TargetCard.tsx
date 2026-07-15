import React, { useEffect, useId, useRef } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/components/ui/utils';
import { CARD_TOKENS, type ThreatAccent } from './tokens';
import { type Severity } from './urgency';

export interface TargetCardProps {
  header: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  /**
   * Unified urgency tier. Accepted for API compatibility — urgency on
   * the card is communicated through the header icon glyph + icon
   * surface color (see `useCardSlots`), not a spine. The card itself
   * renders no urgency chrome.
   */
  severity?: Severity;
  /**
   * @deprecated Lifecycle accent. Accepted for API compatibility only;
   * the card renders no spine.
   */
  accent?: ThreatAccent;
  completed?: boolean;
  className?: string;
  onFocus?: () => void;
}

export function TargetCard({
  header,
  children,
  footer,
  open,
  onToggle,
  completed,
  className = '',
  onFocus,
}: TargetCardProps) {
  const d = CARD_TOKENS;
  const cardRef = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(open);
  const contentId = useId();
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (open && !prevOpen.current && cardRef.current) {
      const container = cardRef.current.closest('.overflow-y-auto');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const cardRect = cardRef.current.getBoundingClientRect();
        const isNearBottom = cardRect.top > containerRect.bottom - 200;
        cardRef.current.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: isNearBottom ? 'start' : 'nearest',
        });
      } else {
        cardRef.current.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'nearest',
        });
      }
    }
    prevOpen.current = open;
  }, [open]);

  const boxShadow = d.elevation.shadow;

  return (
    <div
      ref={cardRef}
      className={cn('w-full', className)}
      style={{ marginBottom: `${d.container.marginBottom + 2}px` }}
    >
      <Collapsible
        open={open}
        onOpenChange={(next) => {
          if (next && !open && onFocus) onFocus();
          if (next !== open) onToggle();
        }}
      >
        <Card
          className="group/card relative w-full gap-0 overflow-hidden border-0 bg-transparent p-0 text-white shadow-none transition-colors rounded-none"
          style={{
            backgroundColor: d.container.bgColor,
            borderRadius: `${d.container.borderRadius}px`,
            filter: completed ? 'saturate(0.4) brightness(0.85)' : undefined,
            boxShadow,
          }}
        >
          <CollapsibleTrigger asChild>
            <div
              className="transition-colors cursor-pointer hover:bg-state-hover-overlay focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none"
              style={{
                padding: `${d.header.paddingY}px ${d.header.paddingX}px`,
                backgroundColor: open
                  ? `rgba(255,255,255,${d.header.selectedBgOpacity})`
                  : undefined,
                borderTopLeftRadius: `${d.container.borderRadius}px`,
                borderTopRightRadius: `${d.container.borderRadius}px`,
              }}
              aria-controls={children != null ? contentId : undefined}
            >
              {header}
            </div>
          </CollapsibleTrigger>

          {(children != null || footer != null) && (
            <CollapsibleContent
              id={contentId}
              className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down data-[state=open]:[animation-duration:var(--motion-moderate)] data-[state=closed]:[animation-duration:var(--motion-moderate-exit)]"
            >
              {children != null && (
                <div
                  className="flex flex-col gap-px"
                  style={{
                    backgroundColor: d.content.bgColor,
                    boxShadow: `inset 0 1px 0 0 ${d.content.borderColor}`,
                  }}
                >
                  {children}
                </div>
              )}
              {footer}
            </CollapsibleContent>
          )}
        </Card>
      </Collapsible>
    </div>
  );
}
