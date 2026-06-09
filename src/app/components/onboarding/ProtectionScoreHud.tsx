/**
 * Persistent protection-score HUD for the onboarding lab.
 *
 * The signature element: a combined headline that ALWAYS sits beside its
 * air/ground sub-scores plus an open-axis ticker. Sub-bars animate via
 * `transform: scaleX` (never width) so the readout reacts live as assets move.
 * A single blended % is never shown alone — that is the false-confidence
 * guardrail from docs/discovery/03 section 6.
 */

import { useStrings } from '@/lib/intl';
import { AlertTriangle, Check } from '@/lib/icons/central';
import { SURFACE } from '@/primitives/tokens';
import { cn } from '../ui/utils';
import type { AxisScore, CoverageResult } from './coverageModel';

function tone(v: number): { text: string; bar: string } {
  if (v >= 0.8) return { text: 'text-emerald-300', bar: 'bg-emerald-400' };
  if (v >= 0.5) return { text: 'text-amber-300', bar: 'bg-amber-400' };
  return { text: 'text-red-400', bar: 'bg-red-500' };
}

function pct(v: number): number {
  return Math.round(v * 100);
}

function SubBar({ label, value }: { label: string; value: number }) {
  const t = tone(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-zinc-400">{label}</span>
        <span className={cn('text-[13px] font-semibold tabular-nums', t.text)}>{pct(value)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={cn(
            'h-full w-full origin-[left_center] rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none',
            t.bar,
          )}
          style={{ transform: `scaleX(${Math.max(0.02, value)})` }}
        />
      </div>
    </div>
  );
}

export interface ProtectionScoreHudProps {
  result: CoverageResult;
  /** Show the open-axis ticker. Deferred until gaps become actionable. */
  showOpenAxis?: boolean;
  className?: string;
}

export function ProtectionScoreHud({ result, showOpenAxis = true, className }: ProtectionScoreHudProps) {
  const t = useStrings();
  const axisLabels = t.onboarding.axes;
  const headline = tone(result.combined);

  const axisName = (a: AxisScore) =>
    axisLabels[a.id as keyof typeof axisLabels] ?? a.id;

  return (
    <div
      data-handoff-component="onboarding-score-hud"
      className={cn(
        'w-[260px] rounded-lg p-3.5 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.45)]',
        className,
      )}
      style={{ backgroundColor: SURFACE.level2 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          {t.onboarding.score.title}
        </span>
        <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
          {t.onboarding.estimateBadge}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className={cn('text-4xl font-semibold leading-none tabular-nums', headline.text)}>
          {pct(result.combined)}
        </span>
        <span className="pb-1 text-lg font-medium text-zinc-500">%</span>
        <span className="ms-auto pb-1 text-[11px] text-zinc-500">{t.onboarding.score.combined}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SubBar label={t.onboarding.score.air} value={result.airScore} />
        <SubBar label={t.onboarding.score.ground} value={result.groundScore} />
      </div>

      {showOpenAxis && (
      <div className="mt-3 border-t border-white/10 pt-2.5">
        {result.openAxes.length === 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
            <Check size={13} className="shrink-0" aria-hidden="true" />
            <span>{t.onboarding.score.openAxisNone}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-400">
            <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {t.onboarding.score.openAxis}:{' '}
              {result.openAxes.map(axisName).join(', ')}
            </span>
          </div>
        )}
      </div>
      )}

      <p className="mt-2 text-[10px] leading-snug text-zinc-500">{t.onboarding.score.estimateNote}</p>
    </div>
  );
}
