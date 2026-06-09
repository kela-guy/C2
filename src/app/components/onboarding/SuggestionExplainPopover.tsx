/**
 * Per-asset "why placed" explainer (insight I1: trust needs reasons).
 * Rendered inline in the panel when a placement is selected. Shows the asset,
 * its source, the placement reasoning, and accept/move/remove affordances.
 * Repositioning is done by dragging the marker on the map.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useStrings } from '@/lib/intl';
import { Trash2 } from '@/lib/icons/central';
import { Button } from '@/primitives/Button';
import { cn } from '../ui/utils';
import { ASSET_VISUAL } from './assetCatalog';
import type { Placement } from './coverageModel';

export interface SuggestionExplainProps {
  placement: Placement | null;
  onRemove: (id: string) => void;
}

export function SuggestionExplainPopover({ placement, onRemove }: SuggestionExplainProps) {
  const t = useStrings();
  const prefersReducedMotion = useReducedMotion();

  if (!placement) return null;

  const visual = ASSET_VISUAL[placement.kind];
  const Icon = visual.icon;
  const reason =
    placement.reasonKey != null
      ? t.onboarding.reasons[placement.reasonKey as keyof typeof t.onboarding.reasons]
      : undefined;
  const sourceLabel =
    placement.source === 'suggested'
      ? t.onboarding.explain.sourceSuggested
      : t.onboarding.explain.sourceUser;

  return (
    <motion.div
      data-handoff-component="onboarding-explain"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-md border border-white/10 bg-white/[0.04] p-3"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn('flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.08]', visual.textClass)}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-zinc-100">
            {t.onboarding.assetKinds[placement.kind]}
          </div>
          <div className="truncate text-[10px] text-zinc-500">{sourceLabel}</div>
        </div>
      </div>

      {reason && (
        <div className="mt-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {t.onboarding.explain.why}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-300">{reason}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          label={t.onboarding.explain.remove}
          icon={Trash2}
          variant="danger"
          size="sm"
          onClick={() => onRemove(placement.id)}
        />
      </div>
    </motion.div>
  );
}
