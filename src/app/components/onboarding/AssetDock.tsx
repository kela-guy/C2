/**
 * Floating asset dock for the onboarding concept-video scene — a glass bar
 * docked bottom-centre over the map. Chips are dragged onto the map
 * (react-dnd, HTML5 backend already mounted in App.tsx); the map is the drop
 * target that converts the drop point to lat/lon and places the asset.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useDrag } from 'react-dnd';
import { useStrings } from '@/lib/intl';
import { MapMarker, resolveMarkerStyle } from '@/primitives';
import { RotateCcwFilled } from '@/lib/icons/central';
import { cn } from '../ui/utils';
import { ASSET_VISUAL } from './assetCatalog';
import type { AssetKind } from './coverageModel';
import { ONBOARDING_DND_TYPE, type OnboardingDragItem } from './dnd';
import { TRAY_ITEMS } from './suggestLayout';

/** Same friendly marker style the placed assets use on the map. */
const CHIP_MARKER_STYLE = resolveMarkerStyle('default', 'friendly');

function DockChip({ kind, recommended }: { kind: AssetKind; recommended: boolean }) {
  const t = useStrings();
  const visual = ASSET_VISUAL[kind];
  const MapIcon = visual.mapIcon;
  const [{ isDragging }, dragRef] = useDrag<OnboardingDragItem, unknown, { isDragging: boolean }>(
    () => ({
      type: ONBOARDING_DND_TYPE,
      item: { kind },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [kind],
  );

  return (
    <div
      ref={dragRef}
      data-handoff-component="onboarding-dock-chip"
      className={cn(
        'group relative flex w-[76px] cursor-grab select-none flex-col items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.05] px-2 py-2.5 text-center transition-[background-color,box-shadow,transform] duration-150 ease-out',
        'hover:-translate-y-0.5 hover:bg-white/[0.1] active:scale-[0.97] active:cursor-grabbing',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
        recommended && 'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]',
        isDragging && 'opacity-40',
      )}
      tabIndex={0}
      role="button"
      aria-label={t.onboarding.assetKinds[kind]}
    >
      {recommended && (
        <span className="absolute -top-1.5 start-1/2 -translate-x-1/2 rounded-full bg-cyan-400/20 px-1.5 py-px text-3xs font-semibold uppercase tracking-wide text-cyan-300 rtl:translate-x-1/2">
          {t.onboarding.tray.recommended}
        </span>
      )}
      {/* Real map marker (same glyph + ring the asset gets once placed). */}
      <span className="pointer-events-none shrink-0" aria-hidden="true">
        <MapMarker icon={<MapIcon outlined />} style={CHIP_MARKER_STYLE} surfaceSize={36} ringSize={28} />
      </span>
      <span className="text-2xs font-medium leading-tight text-slate-11">
        {t.onboarding.assetKinds[kind]}
      </span>
    </div>
  );
}

export interface AssetDockProps {
  /** Show the "clear all" affordance (any placements exist). */
  canClear: boolean;
  onClear: () => void;
  className?: string;
}

export function AssetDock({ canClear, onClear, className }: AssetDockProps) {
  const t = useStrings();
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      data-handoff-component="onboarding-asset-dock"
      className={cn(
        'pointer-events-auto flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3.5 pb-3 pt-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-11">
          {t.onboarding.tray.title}
        </span>
        <span className="text-2xs text-slate-9">{t.onboarding.tray.hint}</span>
        {canClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded text-2xs font-medium text-slate-9 transition-colors hover:text-slate-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
          >
            <RotateCcwFilled size={11} aria-hidden="true" />
            {t.onboarding.video.clear}
          </button>
        )}
      </div>
      <div className="flex items-stretch gap-1.5">
        {TRAY_ITEMS.map((item) => (
          <DockChip key={item.id} kind={item.kind} recommended={item.recommended} />
        ))}
      </div>
    </motion.div>
  );
}
