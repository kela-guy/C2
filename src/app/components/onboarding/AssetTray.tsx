/**
 * Draggable asset palette for the onboarding refine step. Chips are dragged
 * onto the map (react-dnd, HTML5 backend already mounted in App.tsx); the map
 * is the drop target that converts the drop point to lat/lon and places it.
 * Recommended gap-fillers are highlighted.
 */

import { useDrag } from 'react-dnd';
import { useStrings } from '@/lib/intl';
import { cn } from '../ui/utils';
import { ASSET_VISUAL } from './assetCatalog';
import type { AssetKind } from './coverageModel';
import { ONBOARDING_DND_TYPE, type OnboardingDragItem } from './dnd';
import { TRAY_ITEMS } from './suggestLayout';

function TrayChip({ kind, recommended }: { kind: AssetKind; recommended: boolean }) {
  const t = useStrings();
  const visual = ASSET_VISUAL[kind];
  const Icon = visual.icon;
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
      data-handoff-component="onboarding-tray-chip"
      className={cn(
        'group relative flex cursor-grab select-none flex-col items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.06] px-2 py-2.5 text-center transition-[background-color,box-shadow,transform] duration-150 ease-out',
        'hover:bg-state-hover-overlay active:scale-[0.97] active:cursor-grabbing',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring',
        recommended && 'shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]',
        isDragging && 'opacity-40',
      )}
      tabIndex={0}
      role="button"
      aria-label={t.onboarding.assetKinds[kind]}
    >
      {recommended && (
        <span className="absolute -top-1.5 start-1/2 -translate-x-1/2 rounded-full bg-emerald-400/20 px-1.5 py-px text-3xs font-semibold uppercase tracking-wide text-emerald-300 rtl:translate-x-1/2">
          {t.onboarding.tray.recommended}
        </span>
      )}
      <Icon size={18} className={cn('shrink-0', visual.textClass)} aria-hidden="true" />
      <span className="text-xs-plus font-medium text-slate-11">{t.onboarding.assetKinds[kind]}</span>
    </div>
  );
}

export function AssetTray({ className }: { className?: string }) {
  const t = useStrings();
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs-plus font-semibold uppercase tracking-wider text-slate-11">
          {t.onboarding.tray.title}
        </span>
        <span className="text-2xs text-slate-9">{t.onboarding.tray.hint}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {TRAY_ITEMS.map((item) => (
          <TrayChip key={item.id} kind={item.kind} recommended={item.recommended} />
        ))}
      </div>
    </div>
  );
}
