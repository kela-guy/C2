/**
 * Floodlight on/off control rendered in the expanded row's action footer.
 *
 * Built on the shadcn `Toggle` primitive (button-style press toggle) and
 * skinned to match the other footer actions (Center-on-map / Mute): a
 * compact pill that turns amber while lit. Replaces the old collapsed-row
 * `Switch`. Click propagation is stopped so pressing it never toggles the
 * row's expand/collapse.
 */

import { Sun } from '@/lib/icons/central';
import { Toggle } from '../../ui/toggle';
import type { Device, DevicesPanelStrings } from '../types';

interface FloodlightToggleProps {
  device: Device;
  isOn: boolean;
  isOffline: boolean;
  strings: DevicesPanelStrings;
  onToggle?: (floodlightId: string, next: boolean) => void;
}

export function FloodlightToggle({ device, isOn, isOffline, strings, onToggle }: FloodlightToggleProps) {
  return (
    <Toggle
      pressed={isOn}
      onPressedChange={(next) => onToggle?.(device.id, next)}
      onClick={(e) => e.stopPropagation()}
      disabled={isOffline}
      aria-label={strings.floodlightToggleAriaLabel}
      data-handoff-component="device-floodlight-toggle"
      className="h-auto min-w-0 gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90 data-[state=on]:bg-amber-500/15 data-[state=on]:text-amber-400 data-[state=on]:hover:bg-amber-500/25 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Sun size={12} className="size-3" />
      {isOn ? strings.floodlightOn : strings.floodlightOff}
    </Toggle>
  );
}
