/**
 * Top-level Handoff Inspector. Mounts a single portal under
 * `document.body` containing the picker glyph, the hover overlay, and
 * the click-anchored popover.
 *
 * Dev-only — the consumer in `src/app/App.tsx` lazy-imports this
 * module behind `import.meta.env.DEV`. A second runtime guard inside
 * this component returns `null` in production so a stray import can't
 * still mount the inspector.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInspector } from './useInspector';
import { InspectorOverlay } from './InspectorOverlay';
import { PickerGlyph } from './PickerGlyph';
import { PickPopover } from './PickPopover';

export default function HandoffInspector() {
  // Build-time constant — Vite's `define` substitutes `false` in
  // production, so this component compiles to `() => null` and the rest
  // of the file tree-shakes away. Keep the guard ABOVE every hook so
  // the hook order stays stable for the one mode that actually renders.
  if (!import.meta.env.DEV) return null;
  return <HandoffInspectorImpl />;
}

function HandoffInspectorImpl() {
  const inspector = useInspector();
  const portal = usePortalNode();

  if (!portal) return null;

  // While the popover is open we feed its anchor rect to the overlay so
  // the dashed pin outline rests on the source element — keeps the
  // popover visually linked to what was clicked.
  const overlayPinRect =
    inspector.mode === 'picking' ? inspector.pin?.rect ?? null : inspector.popoverAnchor;

  const showOverlay = inspector.mode === 'picking' || inspector.popoverAnchor != null;

  return createPortal(
    <>
      {showOverlay && (
        <InspectorOverlay
          hover={inspector.mode === 'picking' ? inspector.hover : null}
          pinRect={overlayPinRect}
        />
      )}
      <PickerGlyph
        mode={inspector.mode}
        onTogglePicker={inspector.mode === 'picking' ? inspector.exit : inspector.enterPicking}
      />
      {inspector.pin && inspector.popoverAnchor && (
        <PickPopover
          pin={inspector.pin}
          anchorRect={inspector.popoverAnchor}
          onClose={inspector.closePopover}
        />
      )}
    </>,
    portal,
  );
}

/** Lazily create + own the inspector's portal root under `<body>`. */
function usePortalNode(): HTMLElement | null {
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
