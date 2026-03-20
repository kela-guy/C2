import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { CARD_TOKENS } from './tokens';

export type TimelineStepStatus = 'pending' | 'active' | 'complete' | 'error';

export interface TimelineStep {
  label: string;
  status: TimelineStepStatus;
}

export interface CardTimelineProps {
  steps: TimelineStep[];
  compact?: boolean;
  className?: string;
}

export function CardTimeline({ steps, compact, className = '' }: CardTimelineProps) {
  const d = CARD_TOKENS.timeline;

  if (steps.length === 0) return null;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div
              className={`rounded-full shrink-0 transition-colors ${
                step.status === 'complete'
                  ? 'bg-emerald-400'
                  : step.status === 'active'
                    ? 'bg-white animate-pulse'
                    : step.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-zinc-600'
              }`}
              style={{
                width: step.status === 'active' ? d.activeDotSize : d.dotSize,
                height: step.status === 'active' ? d.activeDotSize : d.dotSize,
              }}
              title={step.label}
              role="img"
              aria-label={`${step.label}: ${step.status === 'complete' ? 'הושלם' : step.status === 'active' ? 'פעיל' : step.status === 'error' ? 'שגיאה' : 'ממתין'}`}
            />
            {idx < steps.length - 1 && (
              <div
                className={`h-[1px] flex-1 min-w-[6px] ${
                  step.status === 'complete' ? 'bg-emerald-500/40' : 'bg-zinc-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 py-2 ${className}`} dir="rtl">
      {steps.map((step, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2.5 text-xs font-mono transition-all duration-300 ${
            step.status === 'active'
              ? 'text-white'
              : step.status === 'complete'
                ? 'text-white/50'
                : step.status === 'error'
                  ? 'text-red-400'
                  : 'text-white/50'
          }`}
        >
          {step.status === 'complete' ? (
            <div className="size-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ border: `1px solid ${CARD_TOKENS.surface.level2}` }} aria-hidden="true">
              <Check size={10} className="text-[#12b886]" strokeWidth={2.5} />
            </div>
          ) : step.status === 'active' ? (
            <div className="size-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ border: `1px solid ${CARD_TOKENS.surface.level3}` }} aria-hidden="true">
              <div className="size-2 rounded-full bg-red-500" />
            </div>
          ) : step.status === 'error' ? (
            <div className="size-4 rounded-full flex-shrink-0 shadow-[0_0_0_1px_rgba(239,68,68,0.5)] flex items-center justify-center" aria-hidden="true">
              <Loader2 size={10} className="text-red-400 animate-spin" />
            </div>
          ) : (
            <div className="size-4 rounded-full flex-shrink-0" style={{ boxShadow: `0 0 0 1px ${CARD_TOKENS.surface.level3}` }} aria-hidden="true" />
          )}
          <span>{step.label}</span>
          {step.status === 'active' && (
            <span className="inline-block w-1 h-3 bg-white/60 animate-blink mr-1" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}
