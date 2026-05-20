/**
 * Panel-level layout picker for the camera-v2 surface.
 *
 * Four presets, icon-only segmented row, glass background. Mirrors the
 * Apple Finder view-mode segmented control: dense, always visible,
 * pinned to the panel's top inline-end corner. Direction-agnostic (the
 * picker itself is LTR by virtue of being icon-only — only its
 * placement flips with `useIsRtl`, which the parent handles).
 *
 * Disabled rules (see `isLayoutEnabledForFeedCount`). In short:
 * stack-2 only fits exactly two feeds; grid-2x2 fits 1, 2, or 4 (not
 * the awkward three-up quadrant); hero-filmstrip fits any count ≥ 2.
 *
 * The picker never auto-corrects an invalid `value`. The parent owns
 * fallback behaviour (see `VideoPanel.resolveLayout`).
 */

import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Grid2x2, LayoutPanelTop, Rows2, Square } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import type { LayoutKind } from './types';

export function isLayoutEnabledForFeedCount(
  layout: LayoutKind,
  feedCount: number,
): boolean {
  switch (layout) {
    case 'single':
      return feedCount >= 1;
    case 'stack-2':
      return feedCount === 2;
    case 'grid-2x2':
      return feedCount >= 1 && feedCount <= 4 && feedCount !== 3;
    case 'hero-filmstrip':
      return feedCount >= 2;
    default: {
      const _exhaustive: never = layout;
      return _exhaustive;
    }
  }
}

interface VideoLayoutPickerProps {
  value: LayoutKind;
  onChange: (next: LayoutKind) => void;
  feedCount: number;
  className?: string;
  /**
   * `overlay` (default) — the standalone glass control that floats
   * over the video well in the top inline-end corner.
   * `panelHeader` — flush variant for rendering inside the gridblock
   * panel header next to the close button. Drops the glass
   * background and the rounded ring; the surrounding header paints
   * its own seam.
   */
  variant?: 'overlay' | 'panelHeader';
}

interface LayoutOption {
  id: LayoutKind;
  label: string;
  Icon: typeof Square;
}

export function VideoLayoutPicker({
  value,
  onChange,
  feedCount,
  className,
  variant = 'overlay',
}: VideoLayoutPickerProps) {
  const t = useStrings().camera.layoutPicker;

  const options = useMemo<LayoutOption[]>(
    () => [
      { id: 'single', label: t.single, Icon: Square },
      { id: 'stack-2', label: t.stack, Icon: Rows2 },
      { id: 'grid-2x2', label: t.grid, Icon: Grid2x2 },
      { id: 'hero-filmstrip', label: t.gallery, Icon: LayoutPanelTop },
    ],
    [t],
  );

  const isPanelHeader = variant === 'panelHeader';
  const containerClass = isPanelHeader
    ? 'inline-flex h-full items-center'
    : 'inline-flex items-center bg-black/45 backdrop-blur-sm ring-1 ring-inset ring-border-default rounded-sm overflow-hidden divide-x divide-border-default';

  return (
    <div
      role="radiogroup"
      aria-label={t.label}
      className={`${containerClass} ${className ?? ''}`}
      data-testid="video-layout-picker"
      // The segmented control reads left-to-right regardless of app
      // direction (icons are language-neutral, and RTL would visually
      // mirror the layout-shape glyphs which would be wrong).
      dir="ltr"
    >
      {options.map(({ id, label, Icon }) => {
        const disabled = !isLayoutEnabledForFeedCount(id, feedCount);
        const selected = value === id;
        const buttonClass = isPanelHeader
          ? `flex items-center justify-center h-full w-7 transition-colors duration-150 ease-out
              focus-visible:outline-none focus-visible:bg-state-hover-strong
              disabled:opacity-30 disabled:cursor-not-allowed
              ${
                selected
                  ? 'bg-state-selected text-slate-12'
                  : 'text-slate-10 hover:bg-state-hover hover:text-slate-12'
              }`
          : `flex items-center justify-center h-7 w-7 transition-colors duration-150 ease-out
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-border-strong
              disabled:opacity-30 disabled:cursor-not-allowed
              ${
                selected
                  ? 'bg-state-selected text-slate-12 shadow-[inset_0_0_0_1px_var(--border-default)]'
                  : 'text-slate-12/70 hover:text-slate-12 hover:bg-state-hover-strong'
              }`;
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
                className={buttonClass}
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
