/**
 * Shared helper: delete a shape and surface an "Undo" toast.
 *
 * Both `MapDrawPanel` (layer-row trash button) and `MapDrawOverlay`
 * (keyboard Delete / Backspace) route their deletes through this so the
 * user always gets the same undo affordance regardless of how the layer
 * was removed.
 */

import { toast } from 'sonner';
import type { UseGeoDrawResult } from '../geo-entities-sandbox/useGeoDraw';

/**
 * Stable id for the delete-undo toast so rapid-fire deletes replace each
 * other in place rather than stacking. Each new delete still snapshots
 * its own shape on the engine-side undo stack — only the surfaced toast
 * collapses.
 */
const TOAST_ID = 'map-draw:layer-deleted';

export function deleteShapeWithUndo(
  draw: UseGeoDrawResult,
  id: string,
  options: { label?: string } = {},
) {
  const shape = draw.shapes.find((s) => s.id === id);
  if (!shape) return;
  draw.deleteShape(id);

  const label =
    options.label ?? (shape.description?.trim() || shape.name || 'Layer');

  toast(`${label} deleted`, {
    id: TOAST_ID,
    duration: 5000,
    action: {
      label: 'Undo',
      onClick: () => {
        draw.restoreLastDeleted();
        toast.dismiss(TOAST_ID);
      },
    },
  });
}
