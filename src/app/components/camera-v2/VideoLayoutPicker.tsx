/**
 * Panel-level layout picker for the camera-v2 surface.
 *
 * Four presets, icon-only segmented row, glass background. Mirrors the
 * Apple Finder view-mode segmented control: dense, always visible,
 * pinned to the panel's top inline-end corner. Direction-agnostic (the
 * picker itself is LTR by virtue of being icon-only — only its
 * placement flips with `useIsRtl`, which the parent handles).
 *
 * Disabled rules (computed from `feedCount`):
 *   - `single`         — needs ≥ 1
 *   - `stack-2`        — needs ≥ 2
 *   - `grid-2x2`       — needs ≥ 1 (renders gracefully even with 1 cell)
 *   - `hero-filmstrip` — needs ≥ 2 (otherwise it's just `single`)
 *
 * The picker never auto-corrects an invalid `value`. The parent owns
 * fallback behaviour (see `VideoPanel.resolveLayout`).
 */

import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Grid2x2, LayoutPanelTop, Rows2, Square } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import type { LayoutKind } from './types';

interface VideoLayoutPickerProps {
  value: LayoutKind;
  onChange: (next: LayoutKind) => void;
  feedCount: number;
  className?: string;
}

interface LayoutOption {
  id: LayoutKind;
  label: string;
  Icon: typeof Square;
  minFeeds: number;
}

export function VideoLayoutPicker({
  value,
  onChange,
  feedCount,
  className,
}: VideoLayoutPickerProps) {
  const t = useStrings().camera.layoutPicker;

  const options = useMemo<LayoutOption[]>(
    () => [
      { id: 'single', label: t.single, Icon: Square, minFeeds: 1 },
      { id: 'stack-2', label: t.stack, Icon: Rows2, minFeeds: 2 },
      { id: 'grid-2x2', label: t.grid, Icon: Grid2x2, minFeeds: 1 },
      { id: 'hero-filmstrip', label: t.gallery, Icon: LayoutPanelTop, minFeeds: 2 },
    ],
    [t],
  );

  return (
    <div
      role="radiogroup"
      aria-label={t.label}
      className={`inline-flex items-center bg-black/45 backdrop-blur-sm ring-1 ring-inset ring-white/10 rounded-sm overflow-hidden divide-x divide-white/10 ${className ?? ''}`}
      data-testid="video-layout-picker"
      // The segmented control reads left-to-right regardless of app
      // direction (icons are language-neutral, and RTL would visually
      // mirror the layout-shape glyphs which would be wrong).
      dir="ltr"
    >
      {options.map(({ id, label, Icon, minFeeds }) => {
        const disabled = feedCount < minFeeds;
        const selected = value === id;
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                disabled={disabled}
                onClick={() => {
                  if (!disabled && !selected) onChange(id);
                }}
                className={`flex items-center justify-center h-7 w-7 transition-colors duration-150 ease-out
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40
                  disabled:opacity-30 disabled:cursor-not-allowed
                  ${selected
                    ? 'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]'
                    : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                data-testid={`video-layout-picker-${id}`}
              >
                <Icon size={14} aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6} className="rounded-none text-[10px]">
              {label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
