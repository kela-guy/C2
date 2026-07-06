/**
 * Shared shape actions for the map-draw flow.
 *
 * Every surface that exposes per-shape commands (the on-map right-click
 * menu, the Layers list right-click, the Layers list "..." overflow
 * dropdown) renders from the SAME descriptor list, so the wording, order
 * and behavior stay in lockstep. Add a new action here and it shows up
 * everywhere automatically.
 */

import type { ComponentType } from 'react';
import { ArrowUp, ArrowDown, type IconProps } from '@/lib/icons/central';
import type { UseGeoDrawResult } from '../geo-entities-sandbox/useGeoDraw';

export interface ShapeAction {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
  /** Optional flag so the host can render destructive items in red. */
  destructive?: boolean;
  /** Hidden / disabled when this returns false (no-op edges of the stack). */
  disabled?: boolean;
  onSelect: () => void;
}

/**
 * Z-order actions for a single shape. Disabled when the shape is already
 * at the corresponding edge of the layer stack so the user can't trigger
 * a no-op reorder.
 */
export function getZOrderActions(
  draw: UseGeoDrawResult,
  id: string,
): ShapeAction[] {
  const index = draw.shapes.findIndex((s) => s.id === id);
  const lastIndex = draw.shapes.length - 1;
  const atFront = index === lastIndex;
  const atBack = index === 0;

  return [
    {
      id: 'bring-to-front',
      label: 'Bring to front',
      Icon: ArrowUp,
      disabled: index < 0 || atFront,
      onSelect: () => draw.bringToFront(id),
    },
    {
      id: 'send-to-back',
      label: 'Send to back',
      Icon: ArrowDown,
      disabled: index < 0 || atBack,
      onSelect: () => draw.sendToBack(id),
    },
  ];
}
