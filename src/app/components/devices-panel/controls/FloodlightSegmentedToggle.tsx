/**
 * Icon-led segmented floodlight control (Power off / glowing Sun on).
 *
 * `FloodlightSegmentedCompact` is the header On/Off for `floodlight` rows
 * in the device card; `FloodlightSegmentedDefault` is the wider variant
 * used in the styleguide. The thumb slides under the active segment and
 * the Sun glyph lights with an amber glow while on.
 */

import type { ReactNode } from 'react';
import { PowerFilled, SunFilled } from '@/lib/icons/central';
import { cn } from '../../ui/utils';

export interface FloodlightSegmentedProps {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

interface Slots {
  track: string;
  trackOn?: string;
  thumb: string;
  thumbOn?: string;
  seg?: string;
  labelOff: ReactNode;
  labelOn: ReactNode;
  colorOff: (active: boolean) => string;
  colorOn: (active: boolean) => string;
}

function SlidingSegmented({ on, onToggle, disabled, slots, className }: FloodlightSegmentedProps & { slots: Slots }) {
  const segBase = cn(
    'relative z-10 inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30',
    'active:scale-[0.98] disabled:cursor-not-allowed',
    slots.seg,
  );

  return (
    <div
      role="group"
      aria-label="Floodlight"
      className={cn(
        'relative isolate grid grid-cols-2 shrink-0',
        slots.track,
        on && slots.trackOn,
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute transition-transform duration-200 ease-out motion-reduce:transition-none',
          slots.thumb,
          on && slots.thumbOn,
          on ? 'translate-x-full [&:dir(rtl)]:-translate-x-full' : 'translate-x-0',
        )}
      />
      <button
        type="button"
        disabled={disabled}
        aria-pressed={!on}
        onClick={(e) => {
          e.stopPropagation();
          if (on) onToggle();
        }}
        className={cn(segBase, slots.colorOff(!on))}
      >
        {slots.labelOff}
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={on}
        onClick={(e) => {
          e.stopPropagation();
          if (!on) onToggle();
        }}
        className={cn(segBase, slots.colorOn(on))}
      >
        {slots.labelOn}
      </button>
    </div>
  );
}

const inactiveText = 'text-white/45 hover:text-white/75';

type IconCfg = { size: number; cls: string };

function iconSlots(
  p: FloodlightSegmentedProps,
  chrome: Pick<Slots, 'track' | 'thumb' | 'seg'> & {
    thumbOn?: string;
    icon?: IconCfg;
    iconOff?: IconCfg;
    iconOn?: IconCfg;
  },
): Slots {
  const base = chrome.icon ?? { size: 12, cls: 'size-3' };
  const off = chrome.iconOff ?? base;
  const on = chrome.iconOn ?? base;
  return {
    track: chrome.track,
    thumb: chrome.thumb,
    thumbOn: chrome.thumbOn ?? 'bg-amber-500/20',
    seg: chrome.seg,
    labelOff: (
      <>
        <PowerFilled size={off.size} className={off.cls} />
        <span>Off</span>
      </>
    ),
    labelOn: (
      <>
        <SunFilled size={on.size} className={cn(on.cls, p.on && 'drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]')} />
        <span>On</span>
      </>
    ),
    colorOff: (active) => (active ? 'text-white' : inactiveText),
    colorOn: (active) => (active ? 'text-amber-300' : inactiveText),
  };
}

/** Default width — styleguide / floodlight study. */
export function FloodlightSegmentedDefault(props: FloodlightSegmentedProps) {
  return (
    <SlidingSegmented
      {...props}
      slots={iconSlots(props, {
        track: 'w-[110px] rounded-none bg-white/[0.08] p-0.5',
        thumb: 'start-0.5 top-0.5 bottom-0.5 w-[calc(50%_-_2px)] rounded-none bg-white/[0.18]',
        seg: 'min-w-0 rounded-none px-1',
        icon: { size: 14, cls: 'size-[14px] shrink-0' },
      })}
    />
  );
}

/** Compact — device-card header for `floodlight` rows. */
export function FloodlightSegmentedCompact(props: FloodlightSegmentedProps) {
  return (
    <SlidingSegmented
      {...props}
      slots={iconSlots(props, {
        track: 'rounded-none bg-white/[0.08] p-px',
        thumb: 'start-px top-px bottom-px w-[calc(50%_-_1px)] rounded-none bg-white/[0.18]',
        seg: 'min-w-0 rounded-none px-2 py-0.5 text-[11px] gap-1',
        icon: { size: 12, cls: 'size-3 shrink-0' },
      })}
    />
  );
}
