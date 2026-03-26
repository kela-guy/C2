import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
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
  title = 'סגירת אירוע — בחר סיבה',
  outcomes,
  onSelect,
  className = '',
}: CardClosureProps) {
  if (outcomes.length === 0) return null;

  return (
    <div className={`p-3 space-y-2 ${className}`} style={{ boxShadow: `inset 0 1px 0 0 ${CARD_TOKENS.surface.level2}` }}>
      <div className="flex items-center gap-2">
        <CheckCircle2 size={14} className="text-zinc-400" aria-hidden="true" />
        <span className="text-xs font-bold text-zinc-300">{title}</span>
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
              className="h-auto min-h-0 w-full justify-start px-2.5 py-2 rounded text-zinc-300 transition-colors text-[11px] font-medium text-right gap-1.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 hover:bg-white/[0.08]"
              style={{ backgroundColor: CARD_TOKENS.surface.level3, boxShadow: `0 0 0 1px ${CARD_TOKENS.surface.level3}` }}
            >
              {OutcomeIcon && <OutcomeIcon size={12} className="shrink-0 text-zinc-500" aria-hidden="true" />}
              {outcome.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
