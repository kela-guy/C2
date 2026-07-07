/**
 * HUD device switcher for `/video-hud-sandbox`.
 *
 * Reuses the dark-glass dropdown chrome (the `ModeSelect` trigger pill + Radix
 * radio menu) chosen in the sandbox toggle studies so the two read as one
 * family. Generic over a device list; selecting a device is what reconfigures
 * the surrounding HUD. Lives in the top-left corner, so the menu opens
 * downward from the start edge.
 */

import type { CSSProperties } from 'react';
import {
  Check,
  ChevronDownFilled,
  type IconComponent,
} from '@/lib/icons/central';
import { cn } from '@/app/components/ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

export interface SandboxDevice {
  id: string;
  label: string;
  sublabel: string;
  Icon: IconComponent;
}

export interface SandboxDeviceSelectProps {
  devices: SandboxDevice[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Glass background opacity, 0..1 (black overlay alpha). Default 0.4. */
  bgOpacity?: number;
  /** Backdrop blur in px. Default 4 (matches `backdrop-blur-sm`). */
  blurPx?: number;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-1 focus-visible:ring-offset-black';

export function glassStyle(bgOpacity: number, blurPx: number): CSSProperties {
  const blur = `blur(${blurPx}px)`;
  return {
    backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
  };
}

export function SandboxDeviceSelect({
  devices,
  value,
  onChange,
  disabled,
  bgOpacity = 0.4,
  blurPx = 4,
}: SandboxDeviceSelectProps) {
  const active = devices.find((d) => d.id === value) ?? devices[0];
  if (!active) return null;
  const TriggerIcon = active.Icon;
  return (
    // Force LTR at the Radix root: the app document is RTL, which otherwise
    // makes the popper compute a top-right transform origin while the menu is
    // left-aligned under the trigger, so the open animation zooms from the
    // wrong corner.
    <DropdownMenu dir="ltr">
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`Device: ${active.label}`}
          disabled={disabled}
          style={glassStyle(bgOpacity, blurPx)}
          className={cn(
            'group inline-flex h-8 items-center gap-1.5 rounded-full border border-border-default/45 ps-2.5 pe-2 text-xs-plus text-slate-12',
            'transition-[filter,box-shadow,transform] duration-150 ease-out hover:brightness-125 hover:ring-1 hover:ring-inset hover:ring-white/10 active:scale-[0.97]',
            'data-[state=open]:brightness-125 data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-white/20',
            FOCUS_RING,
            disabled && 'pointer-events-none opacity-40',
          )}
        >
          <TriggerIcon size={13} aria-hidden className="shrink-0" />
          <span className="text-start font-medium leading-none tracking-wide">
            {active.label}
          </span>
          <ChevronDownFilled
            size={12}
            aria-hidden
            className="shrink-0 text-slate-12/60 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        // Under the RTL document Radix resolves the popper transform origin to
        // the right edge, so the open animation zooms from the wrong corner.
        // The menu is always anchored bottom/start (top-left) here, so pin the
        // origin to the top-left to match.
        style={{ transformOrigin: 'left top' }}
        className="min-w-[11rem] rounded border-none bg-surface-2/95 p-1 text-slate-12 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {devices.map((d) => {
            const Icon = d.Icon;
            const isActive = d.id === value;
            return (
              <DropdownMenuRadioItem
                key={d.id}
                value={d.id}
                className={cn(
                  // Drop the built-in start-side radio dot (first child) and its
                  // reserved padding; the device glyph leads the row instead.
                  'gap-2.5 rounded-md py-1.5 ps-2.5 pe-2.5 text-xs focus:bg-white/10 focus:text-slate-12 [&>span:first-child]:hidden',
                  isActive ? 'text-slate-12' : 'text-slate-12/70',
                )}
              >
                <Icon size={15} aria-hidden />
                <span className="font-medium tracking-wide">{d.label}</span>
                {isActive && (
                  <Check size={14} aria-hidden className="ms-auto text-slate-12" />
                )}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SandboxDeviceSelect;
