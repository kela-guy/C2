/**
 * Top-level Handoff Inspector. Owns the picker glyph, the hover
 * overlay, and the click-anchored popover.
 *
 * The picker has two homes:
 *   1. If the host page declares a slot (`[data-handoff-picker-slot]`)
 *      the picker portals into it as a 24x24 rail-style button. Today
 *      the Dashboard's right-rail icon stack is the only declared slot.
 *   2. Otherwise the picker falls back to a floating 34x34 bottom-left
 *      glyph rendered inside the body portal — used on routes that
 *      don't expose a rail (`/styleguide`, `/fov-test`, `/playground`).
 *
 * Overlay + popover always live in the body portal so they can sit
 * above any stacking context.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useInspector } from './useInspector';
import { InspectorOverlay } from './InspectorOverlay';
import { PickerGlyph } from './PickerGlyph';
import { PickPopover } from './PickPopover';

const RAIL_SLOT_SELECTOR = '[data-handoff-picker-slot="true"]';

export default function HandoffInspector() {
  const inspector = useInspector();
  const bodyPortal = useBodyPortalNode();
  const railSlot = useRailSlot();

  if (!bodyPortal) return null;

  // While the popover is open we feed its anchor rect to the overlay so
  // the dashed pin outline rests on the source element — keeps the
  // popover visually linked to what was clicked.
  const overlayPinRect =
    inspector.mode === 'picking' ? inspector.pin?.rect ?? null : inspector.popoverAnchor;

  const showOverlay = inspector.mode === 'picking' || inspector.popoverAnchor != null;
  const togglePicker = inspector.mode === 'picking' ? inspector.exit : inspector.enterPicking;

  return (
    <>
      {createPortal(
        <>
          {showOverlay && (
            <InspectorOverlay
              hover={inspector.mode === 'picking' ? inspector.hover : null}
              pinRect={overlayPinRect}
            />
          )}
          {!railSlot && (
            <PickerGlyph variant="floating" mode={inspector.mode} onTogglePicker={togglePicker} />
          )}
          {inspector.pin && inspector.popoverAnchor && (
            <PickPopover
              pin={inspector.pin}
              anchorRect={inspector.popoverAnchor}
              onClose={inspector.closePopover}
            />
          )}
        </>,
        bodyPortal,
      )}
      {railSlot &&
        createPortal(
          <PickerGlyph variant="rail" mode={inspector.mode} onTogglePicker={togglePicker} />,
          railSlot,
        )}
    </>
  );
}

/** Lazily create + own the inspector's portal root under `<body>`. */
function useBodyPortalNode(): HTMLElement | null {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector<HTMLElement>('div[data-handoff-inspector-root="true"]');
    if (existing) {
      setNode(existing);
      return;
    }
    const el = document.createElement('div');
    el.setAttribute('data-handoff-inspector-root', 'true');
    el.setAttribute('data-handoff-inspector', 'true');
    el.setAttribute('dir', 'ltr');
    document.body.appendChild(el);
    setNode(el);
    return () => {
      try {
        document.body.removeChild(el);
      } catch {
        /* noop */
      }
    };
  }, []);
  return node;
}

/**
 * Resolve the host page's picker slot, if any. Re-queries on route
 * changes (when a route swap mounts or unmounts the dashboard rail)
 * and on the next frame to give the new tree time to mount.
 */
function useRailSlot(): HTMLElement | null {
  const { pathname } = useLocation();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      const next = document.querySelector<HTMLElement>(RAIL_SLOT_SELECTOR);
      setSlot((prev) => (next === prev ? prev : next));
    };
    sync();
    const raf = requestAnimationFrame(sync);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [pathname]);
  return slot;
}
