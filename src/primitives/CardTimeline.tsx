import React from 'react';
import { Check, Loader2 } from '@/lib/icons/central';
import { CARD_TOKENS } from './tokens';

export type TimelineStepStatus = 'pending' | 'active' | 'complete' | 'error';

export interface TimelineStep {
  label: string;
  status: TimelineStepStatus;
}

export const DEFAULT_TIMELINE_STATUS_LABELS: Record<TimelineStepStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  complete: 'Complete',
  error: 'Error',
};

export interface CardTimelineProps {
  steps: TimelineStep[];
  compact?: boolean;
  className?: string;
  /** Override the localized status words used in compact-mode aria-labels. Falls back to English. */
  statusLabels?: Partial<Record<TimelineStepStatus, string>>;
}

export function CardTimeline({ steps, compact, className = '', statusLabels: statusLabelsProp }: CardTimelineProps) {
  const statusLabels: Record<TimelineStepStatus, string> = { ...DEFAULT_TIMELINE_STATUS_LABELS, ...(statusLabelsProp ?? {}) };
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
                  ? 'bg-accent-success'
                  : step.status === 'active'
                    ? 'bg-slate-12 animate-pulse motion-reduce:animate-none'
                    : step.status === 'error'
                      ? 'bg-accent-danger'
                      : 'bg-slate-8'
              }`}
              style={{
                width: step.status === 'active' ? d.activeDotSize : d.dotSize,
                height: step.status === 'active' ? d.activeDotSize : d.dotSize,
              }}
              title={step.label}
              role="img"
              aria-label={`${step.label}: ${statusLabels[step.status]}`}
            />
            {idx < steps.length - 1 && (
              <div
                className={`h-[1px] flex-1 min-w-[6px] ${
                  step.status === 'complete' ? 'bg-accent-success/40' : 'bg-slate-7'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 py-2 ${className}`}>
      {steps.map((step, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2.5 text-xs font-mono transition-colors duration-300 ${
            step.status === 'active'
              ? 'text-slate-12'
              : step.status === 'complete'
                ? 'text-slate-9'
                : step.status === 'error'
                  ? 'text-accent-danger'
                  : 'text-slate-9'
          }`}
        >
          {step.status === 'complete' ? (
            <div className="size-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ border: `1px solid ${CARD_TOKENS.surface.level2}` }} aria-hidden="true">
              <Check size={10} className="text-accent-success" strokeWidth={2.5} />
            </div>
          ) : step.status === 'active' ? (
            <div className="size-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ border: `1px solid ${CARD_TOKENS.surface.level3}` }} aria-hidden="true">
              <div className="size-2 rounded-full bg-accent-danger" />
            </div>
          ) : step.status === 'error' ? (
            <div className="size-4 rounded-full flex-shrink-0 shadow-[0_0_0_1px_color-mix(in_oklch,var(--accent-danger)_50%,transparent)] flex items-center justify-center" aria-hidden="true">
              <Loader2 size={10} className="text-accent-danger animate-spin motion-reduce:animate-none" />
            </div>
          ) : (
            <div className="size-4 rounded-full flex-shrink-0" style={{ boxShadow: `0 0 0 1px ${CARD_TOKENS.surface.level3}` }} aria-hidden="true" />
          )}
          <span>{step.label}</span>
          {step.status === 'active' && (
            <span className="inline-block w-1 h-3 bg-slate-12/60 animate-blink motion-reduce:animate-none me-1" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}
