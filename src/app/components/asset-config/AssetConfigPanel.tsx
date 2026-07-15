/**
 * Asset-count configuration popover, launched from the slim nav rail.
 *
 * One slider row per entity kind (see `assetConfig.ts`): 0 … seed max,
 * cap-only. Dashboard owns the counts state; this component is a controlled
 * view over it. The trigger matches the rail's `size-6` button language and
 * ships its own Tooltip (the rail wraps every control in one).
 */

import { useMemo } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Slider } from '../ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { SlidersHorizontalFilled } from '@/lib/icons/central';
import {
  ASSET_KIND_META,
  ASSET_KIND_ORDER,
  DEFAULT_ASSET_COUNTS,
  assetKindMax,
  type AssetCounts,
} from './assetConfig';

const PANEL_TITLE = 'Displayed Assets';

export interface AssetConfigPanelProps {
  counts: AssetCounts;
  onChange: (counts: AssetCounts) => void;
  /** Physical side the popover + tooltip fly toward (rail is edge-docked). */
  side: 'left' | 'right';
}

export function AssetConfigPanel({ counts, onChange, side }: AssetConfigPanelProps) {
  const totalVisible = useMemo(
    () => ASSET_KIND_ORDER.reduce((sum, kind) => sum + counts[kind], 0),
    [counts],
  );
  const totalMax = useMemo(
    () => ASSET_KIND_ORDER.reduce((sum, kind) => sum + assetKindMax(kind), 0),
    [],
  );
  const isDefault = totalVisible === totalMax;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={PANEL_TITLE}
              className="size-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-state-hover-overlay data-[state=open]:bg-white/[0.08] data-[state=open]:text-white active:scale-[0.97] transition-[color,background-color] focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none"
            >
              <SlidersHorizontalFilled size={18} />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side={side} sideOffset={8}>{PANEL_TITLE}</TooltipContent>
      </Tooltip>
      <PopoverContent side={side} align="end" sideOffset={10} className="w-72 p-0" dir="ltr">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
          <div>
            <div className="text-sm font-semibold text-white">{PANEL_TITLE}</div>
            <div className="text-xs text-gray-400 tabular-nums">
              {totalVisible} / {totalMax} assets shown
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_ASSET_COUNTS })}
            disabled={isDefault}
            className="text-xs rounded px-2 py-1 text-gray-400 hover:text-white hover:bg-state-hover-overlay disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none"
          >
            Reset all
          </button>
        </div>
        <div className="px-4 py-3 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {ASSET_KIND_ORDER.map((kind) => {
            const meta = ASSET_KIND_META[kind];
            const max = assetKindMax(kind);
            const value = counts[kind];
            return (
              <div key={kind} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${value === 0 ? 'text-gray-500' : 'text-gray-300'}`}>
                    {meta.label}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-gray-400">
                    {value} / {max}
                  </span>
                </div>
                <Slider
                  value={[value]}
                  min={0}
                  max={max}
                  step={1}
                  onValueChange={([v]) => onChange({ ...counts, [kind]: v })}
                  aria-label={meta.label}
                />
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
