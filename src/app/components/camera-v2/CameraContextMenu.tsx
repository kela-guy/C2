/**
 * Right-click menu for a camera feed tile. Wraps the live <video> + overlays.
 *
 * UI phase: four operator actions in RTL-friendly reading order.
 *   1. Coordinates (read-only) with inline copy button
 *   2. Tracker
 *   3. Look at
 *   4. Create target
 *
 * Tracker / Look at / Create target are intended as single-use modes —
 * the next click on the feed consumes the action and the tile returns
 * to its default state. That wiring is not yet implemented; for now
 * the handlers are stubs.
 */

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
import {
  Copy,
  Crosshair,
  DesignateTarget,
  Eye,
  MapPin,
} from '@/lib/icons/central';
import { Bdi, useDirection } from '@/lib/direction';
import { useStrings } from '@/lib/intl';

interface CameraContextMenuProps {
  children: React.ReactNode;
  /** Mock until right-click → world raycast lands. */
  coordinates?: string;
  onCopyCoordinates?: () => void;
  onTracker?: () => void;
  onLookAt?: () => void;
  onCreateTarget?: () => void;
}

const FALLBACK_COORDINATES = '32.4700, 35.0050';

export function CameraContextMenu({
  children,
  coordinates = FALLBACK_COORDINATES,
  onCopyCoordinates,
  onTracker,
  onLookAt,
  onCreateTarget,
}: CameraContextMenuProps) {
  const t = useStrings().camera.contextMenu;
  const { direction } = useDirection();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        dir={direction}
        className="min-w-[220px] rounded-none backdrop-blur-xl border-none"
      >
        <ContextMenuItem
          onSelect={(e) => e.preventDefault()}
          className="rounded-none gap-2.5 text-xs justify-between"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <MapPin size={14} className="text-slate-12/80" />
            <Bdi as="span" direction="ltr" className="font-mono text-[11px] tabular-nums text-slate-12 truncate">
              {coordinates}
            </Bdi>
          </span>
          <button
            type="button"
            aria-label={t.coordinatesCopyAriaLabel}
            onClick={(e) => {
              e.stopPropagation();
              onCopyCoordinates?.();
            }}
            className="-mx-1 -my-1 ms-1 p-1 rounded text-slate-12/70 hover:text-slate-12 hover:bg-state-hover-strong transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong"
          >
            <Copy size={12} />
          </button>
        </ContextMenuItem>

        <ContextMenuItem onClick={onTracker} className="rounded-none gap-2.5 text-xs">
          <Eye size={14} className="text-slate-12/80" />
          <span className="flex-1">{t.tracker}</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onLookAt} className="rounded-none gap-2.5 text-xs">
          <Crosshair size={14} className="text-slate-12/80" />
          <span className="flex-1">{t.lookAt}</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onCreateTarget} className="rounded-none gap-2.5 text-xs">
          <DesignateTarget size={14} className="text-slate-12/80" />
          <span className="flex-1">{t.createTarget}</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
