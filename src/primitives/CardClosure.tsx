import React from 'react';
import { CheckCircle2 } from '@/lib/icons/central';
import { Button } from '@/shared/components/ui/button';
import { CARD_TOKENS } from './tokens';

export interface ClosureOutcome {
  id: string;
  label: string;
  icon?: React.ElementType;
}

export interface CardClosureProps {
  title?: string;
  outcomes: ClosureOutcome[];
  onSelect: (outcomeId: string) => void;
  className?: string;
}

export function CardClosure({
  title = 'Close — pick a reason',
  outcomes,
  onSelect,
  className = '',
}: CardClosureProps) {
  if (outcomes.length === 0) return null;

  return (
    <div className={`p-3 space-y-2 ${className}`} style={{ boxShadow: `inset 0 1px 0 0 ${CARD_TOKENS.surface.level2}` }}>
      <div className="flex items-center gap-2">
        <CheckCircle2 size={14} className="text-slate-10" aria-hidden="true" />
        <span className="text-xs font-bold text-slate-11">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {outcomes.map((outcome) => {
          const OutcomeIcon = outcome.icon;
          return (
            <Button
              key={outcome.id}
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(outcome.id);
              }}
              className="h-auto min-h-0 w-full justify-start px-2.5 py-2 rounded text-slate-11 transition-colors text-[11px] font-medium text-end gap-1.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong hover:bg-state-pressed"
              style={{ backgroundColor: CARD_TOKENS.surface.level3, boxShadow: `0 0 0 1px ${CARD_TOKENS.surface.level3}` }}
            >
              {OutcomeIcon && <OutcomeIcon size={12} className="shrink-0 text-slate-9" aria-hidden="true" />}
              {outcome.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
