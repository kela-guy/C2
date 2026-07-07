/**
 * Flow Builder — escalation branch diagram.
 *
 * Replaces the old linear stage rail. It tells the PM-facing story the
 * builder is really about: a raw detection comes in "unknown / gray",
 * the camera classifies it into a known entity, and then the track
 * *branches* by affiliation — each branch resolving to a different
 * threat level (and therefore a different marker color on the map).
 *
 * The affiliation branches double as the affiliation picker: clicking a
 * branch selects it. Each branch shows the peak severity it would
 * produce (computed by re-running the shared trajectory helper against a
 * cloned draft), so the *effect* of the choice is visible before saving.
 *
 * Tailwind-only, Heebo, logical direction-aware classes (per the panel
 * guardrail). Colors come exclusively through `SEVERITY_TW`.
 */

import { useMemo } from 'react';
import { useStrings } from '@/lib/intl';
import { type Severity } from '@/primitives/urgency';
import {
  type FlowDef,
  deriveActForEntity,
} from '@/lib/flowBuilder';
import type { Affiliation } from '@/primitives/markerStyles';
import { SEVERITY_TW } from './severityTokens';
import {
  classificationSeverity,
  reachedStages,
  estimateFlowDurationMs,
} from './flowSeverity';

// Ordered to read as an escalation story: threat first, benign last.
const BRANCH_ORDER: Affiliation[] = [
  'hostile',
  'possibleThreat',
  'unknown',
  'neutral',
  'friendly',
];

export interface FlowBranchDiagramProps {
  draft: FlowDef;
  /** Pre-rendered glyph for the selected entity (panel owns the icon map). */
  entityIcon: React.ReactNode;
  onSelectAffiliation: (affiliation: Affiliation) => void;
}

export function FlowBranchDiagram({
  draft,
  entityIcon,
  onSelectAffiliation,
}: FlowBranchDiagramProps) {
  const t = useStrings().flowBuilder;

  // Classification verdict per candidate affiliation — the tier each
  // choice resolves the marker to on the map. NOT the whole-flow peak:
  // the Act stage engages an effector and spikes every affiliation to
  // CRITICAL, which would make all branches identical (see
  // `classificationSeverity`).
  const branchSeverity = useMemo(() => {
    const m = new Map<Affiliation, Severity>();
    for (const aff of BRANCH_ORDER) {
      m.set(aff, classificationSeverity({ ...draft, affiliation: aff }));
    }
    return m;
  }, [draft]);

  const reached = useMemo(() => reachedStages(draft), [draft]);
  const verdict = useMemo(() => classificationSeverity(draft), [draft]);
  const estSeconds = useMemo(
    () => Math.round(estimateFlowDurationMs(draft) / 1000),
    [draft],
  );
  const actLabel = t.acts[deriveActForEntity(draft.entity)];
  const showTail = reached.has('act');

  return (
    <div className="space-y-2.5">
      {/* ── Trunk: raw detection -> classify ─────────────────────── */}
      <div className="flex items-center gap-1.5 text-xs-plus">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 bg-white/[0.03] text-slate-11 shrink-0">
          <span className="inline-block size-2 rounded-full bg-slate-9" aria-hidden />
          {t.branch.rawDetection}
        </span>
        <span className="h-px flex-1 bg-white/15" aria-hidden />
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-white/10 bg-white/[0.03] text-slate-11 min-w-0">
          <span className="shrink-0 inline-flex items-center" aria-hidden>{entityIcon}</span>
          <span className="truncate">{t.branch.classify}</span>
        </span>
      </div>

      {/* ── Branch fan: one row per affiliation outcome ──────────── */}
      <div className="space-y-1">
        <div className="space-y-0.5">
          <p className="text-2xs font-medium text-slate-9">{t.labels.affiliation}</p>
          <p className="text-2xs text-slate-9 leading-snug">{t.labels.affiliationHint}</p>
        </div>
        {BRANCH_ORDER.map((aff) => {
          const sev = branchSeverity.get(aff) ?? 'LOW';
          const tw = SEVERITY_TW[sev];
          const selected = draft.affiliation === aff;
          return (
            <button
              key={aff}
              type="button"
              onClick={() => onSelectAffiliation(aff)}
              aria-pressed={selected}
              className={[
                'w-full flex items-center gap-2 px-2 py-1.5 rounded border text-start transition-colors min-w-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
                selected
                  ? 'border-white/30 bg-white/10'
                  : 'border-white/10 bg-white/[0.03] opacity-70 hover:opacity-100 hover:bg-state-hover-strong',
              ].join(' ')}
            >
              <span className={['inline-block size-2 rounded-full shrink-0', tw.bg].join(' ')} aria-hidden />
              <span className={['flex-1 min-w-0 truncate text-xs-plus', selected ? 'text-white' : 'text-slate-11'].join(' ')}>
                {t.affiliations[aff]}
              </span>
              <span className={['shrink-0 text-2xs font-semibold', tw.text].join(' ')}>
                {t.severityLabels[sev]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Selected branch tail: derived effector -> resolved ────── */}
      {showTail && (
        <div className="flex items-center gap-1.5 text-xs-plus text-slate-11 ps-2">
          <span className="h-px w-3 bg-white/15 shrink-0" aria-hidden />
          <span className="truncate">{actLabel}</span>
          <span className="h-px w-3 bg-white/15 shrink-0" aria-hidden />
          <span className="shrink-0">{t.stages.resolved}</span>
        </div>
      )}

      {/* ── Outcome summary: peak severity + estimated duration ───── */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <SeverityChip severity={verdict} label={t.severityLabels[verdict]} />
        <span className="text-xs-plus text-slate-9 tabular-nums">{t.labels.estDuration(estSeconds)}</span>
      </div>
    </div>
  );
}

function SeverityChip({ severity, label }: { severity: Severity; label: string }) {
  const tw = SEVERITY_TW[severity];
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-2xs font-semibold',
        tw.chipBg,
        tw.chipBorder,
        tw.text,
      ].join(' ')}
    >
      <span className={['inline-block size-1.5 rounded-full', tw.bg].join(' ')} aria-hidden />
      {label}
    </span>
  );
}
