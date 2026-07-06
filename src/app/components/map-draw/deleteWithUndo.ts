/**
 * Shared helper: delete a shape and surface an "Undo" toast.
 *
 * Both `MapDrawPanel` (layer-row keyboard Delete) and `MapDrawOverlay`
 * (keyboard Delete / Backspace on the selected shape) route their
 * deletes through this so the user always gets the same undo affordance
 * regardless of how the layer was removed.
 *
 * The DELETE itself is applied immediately, but the TOAST is DEFERRED:
 * we debounce it so it only appears once the stream of deletes has gone
 * quiet (`SHOW_DELAY_MS`). Rapid-fire deletes therefore surface a single
 * toast at the END of the burst rather than one that re-renders on every
 * keypress. That matters because the Layers list hands keyboard focus
 * from row to row on each delete — a toast churning mid-burst can
 * compete with that hand-off and stall consecutive deletes.
 *
 * Rapid-fire deletes AGGREGATE into a single toast: every delete within
 * the batch increments the counter, and the deferred toast reports the
 * final count. A pause of ≥`BATCH_IDLE_MS` after the toast has shown
 * resets the batch, so the next delete starts a fresh toast.
 *
 * Undo replays the whole batch in reverse (LIFO), matching the engine's
 * own deleted-stack order so shapes land back in their original slots
 * with z-order intact.
 */

import { toast } from 'sonner';
import type { UseGeoDrawResult } from '../geo-entities-sandbox/useGeoDraw';

/**
 * Stable id so the (single, deferred) toast replaces any prior one in
 * place (sonner treats `id` as a hard identity — same id = same toast).
 */
const TOAST_ID = 'map-draw:layer-deleted';

/**
 * How long the delete stream must stay quiet before the toast is shown.
 * Long enough to swallow a burst of consecutive keyboard deletes (manual
 * presses land ~150-300ms apart), short enough that a lone delete still
 * gets prompt feedback.
 */
const SHOW_DELAY_MS = 500;

/** Idle window after the toast shows before the batch resets. */
const BATCH_IDLE_MS = 5000;

// ── Batch state (module-scoped) ─────────────────────────────────────────
// Kept outside the helper so keyboard deletes from the Layers list and
// keyboard deletes on the map overlay share the same aggregation window.
let batchCount = 0;
let firstLabel = 'Layer';
/**
 * One restore callback per delete in the current batch. `restoreLastDeleted`
 * pops the engine's own LIFO stack, so we ONLY need to call it N times to
 * replay the batch — but we still capture a closure per delete so the
 * queue length is our source of truth.
 */
let restoreQueue: Array<() => void> = [];
/** Debounce timer that actually surfaces the toast once deletes pause. */
let showTimer: ReturnType<typeof setTimeout> | null = null;
/** Post-show idle timer that resets the batch so later deletes start fresh. */
let resetTimer: ReturnType<typeof setTimeout> | null = null;

function resetBatch() {
  batchCount = 0;
  restoreQueue = [];
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
}

/** Surface (or refresh) the single batch toast. Fired by the debounce. */
function flushToast() {
  showTimer = null;
  if (batchCount === 0) return;

  // Single-shape batches keep the friendly per-shape label; two-or-more
  // switch to the aggregate count so the toast makes sense either way.
  const label =
    batchCount === 1 ? `${firstLabel} deleted` : `${batchCount} entities deleted`;

  toast(label, {
    id: TOAST_ID,
    duration: BATCH_IDLE_MS,
    action: {
      label: 'Undo',
      onClick: () => {
        // Replay in reverse (LIFO): the most-recently deleted shape
        // restores first, matching the engine's `deletedStackRef` order
        // so shapes land back in the right slots.
        while (restoreQueue.length > 0) {
          const restore = restoreQueue.pop();
          restore?.();
        }
        toast.dismiss(TOAST_ID);
        resetBatch();
      },
    },
  });

  // Keep the batch alive only as long as the toast lives; a later,
  // unrelated delete after this window starts a fresh count/toast.
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(resetBatch, BATCH_IDLE_MS);
}

export function deleteShapeWithUndo(
  draw: UseGeoDrawResult,
  id: string,
  options: { label?: string } = {},
) {
  const shape = draw.shapes.find((s) => s.id === id);
  // Silent no-op on missing / locked. Locked layers can only be deleted
  // after being unlocked, so any caller that reaches here with a locked
  // id is a UX-layer miss — we refuse rather than hand the user a "layer
  // deleted" toast for a shape that's still on the map.
  if (!shape || shape.locked) return;

  draw.deleteShape(id);

  if (batchCount === 0) {
    firstLabel = options.label ?? (shape.description?.trim() || shape.name || 'Layer');
  }
  batchCount += 1;
  restoreQueue.push(() => {
    draw.restoreLastDeleted();
  });

  // Debounce the toast: reschedule on every delete so it only fires once
  // the burst has stopped. Cancel any pending post-show reset — while
  // deletes are still flowing the batch must stay open.
  if (showTimer) clearTimeout(showTimer);
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
  showTimer = setTimeout(flushToast, SHOW_DELAY_MS);
}
