/**
 * Coverage-gap list for the onboarding panel. Gaps are the hero (insight I4):
 * blind spots and unengaged areas are surfaced explicitly with a focus-on-map
 * affordance. Empty state confirms no significant gaps.
 */

import { useStrings } from '@/lib/intl';
import { AlertTriangle, Check, Eye, MapPin } from '@/lib/icons/central';
import { cn } from '../ui/utils';
import type { CoverageGap } from './coverageModel';

export interface GapListProps {
  gaps: CoverageGap[];
  onFocus: (lat: number, lon: number) => void;
}

export function GapList({ gaps, onFocus }: GapListProps) {
  const t = useStrings();

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs-plus font-semibold uppercase tracking-wider text-slate-11">
          {t.onboarding.gaps.title}
        </span>
        <span className="text-xs-plus tabular-nums text-slate-9">{t.onboarding.gaps.count(gaps.length)}</span>
      </div>

      {gaps.length === 0 ? (
        <div className="flex items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-2 text-xs-plus font-medium text-emerald-300">
          <Check size={13} className="shrink-0" aria-hidden="true" />
          {t.onboarding.gaps.empty}
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {gaps.map((gap) => {
            const blind = gap.kind === 'blind';
            const Icon = blind ? AlertTriangle : Eye;
            return (
              <li key={gap.id}>
                <button
                  type="button"
                  onClick={() => onFocus(gap.lat, gap.lon)}
                  className={cn(
                    'group flex w-full items-center gap-2 rounded-md border border-white/5 bg-white/[0.04] px-2.5 py-1.5 text-start transition-colors duration-150',
                    'hover:bg-state-hover-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                  )}
                >
                  <Icon
                    size={14}
                    className={cn('shrink-0', blind ? 'text-red-400' : 'text-amber-300')}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs-plus font-medium text-slate-11">
                    {blind ? t.onboarding.gaps.blind : t.onboarding.gaps.unengaged}
                  </span>
                  <span className="flex items-center gap-1 text-2xs text-slate-9 opacity-0 transition-opacity group-hover:opacity-100">
                    <MapPin size={12} aria-hidden="true" />
                    {t.onboarding.gaps.fix}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
