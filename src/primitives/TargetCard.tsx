import React, { useEffect, useId, useRef } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import { Card } from '@/app/components/ui/card';
import { cn } from '@/app/components/ui/utils';
import { CARD_TOKENS, type ThreatAccent } from './tokens';

export interface TargetCardProps {
  header: React.ReactNode;
  children?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  accent?: ThreatAccent;
  completed?: boolean;
  className?: string;
  onFocus?: () => void;
}

export function TargetCard({
  header,
  children,
  open,
  onToggle,
  accent = 'idle',
  completed,
  className = '',
  onFocus,
}: TargetCardProps) {
  const d = CARD_TOKENS;
  const cardRef = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(open);
  const contentId = useId();
  const accentColor = d.spine.colors[accent];
  const accentGlow =
    accent !== 'idle' ? `0 0 16px ${accentColor}33` : '';

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

  const boxShadow = [
    open
      ? `0 0 0 ${d.selectedRing.ringWidth}px ${d.selectedRing.ringColor}${Math.round(d.selectedRing.ringOpacity * 255).toString(16).padStart(2, '0')}, ${d.elevation.shadow}`
      : d.elevation.shadow,
    accentGlow,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      ref={cardRef}
      className={cn('w-full', className)}
      style={{ marginBottom: `${d.container.marginBottom + 2}px` }}
      dir="rtl"
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
              className="transition-colors cursor-pointer hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
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

          {children != null && (
            <CollapsibleContent
              id={contentId}
              className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
            >
              <div
                className="flex flex-col gap-px"
                style={{
                  backgroundColor: d.content.bgColor,
                  boxShadow: `inset 0 1px 0 0 ${d.content.borderColor}`,
                }}
              >
                {children}
              </div>
            </CollapsibleContent>
          )}
        </Card>
      </Collapsible>
    </div>
  );
}
