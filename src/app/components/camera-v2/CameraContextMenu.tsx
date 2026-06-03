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
} from '@/lib/icons/central';
import { Bdi, useDirection } from '@/lib/direction';
import { useStrings } from '@/lib/intl';

export interface CameraContextMenuProps {
  children: React.ReactNode;
  /** Mock until right-click → world raycast lands. */
  coordinates?: string;
  /** Optional altitude readout shown after the coordinates (e.g. "45 m"). */
  altitude?: string;
  /** Show the Tracker action. Defaults to true. */
  showTracker?: boolean;
  /** Override the "Look at" action label. */
  lookAtLabel?: string;
  onCopyCoordinates?: () => void;
  onTracker?: () => void;
  onLookAt?: () => void;
  onCreateTarget?: () => void;
}

const FALLBACK_COORDINATES = '32.4700, 35.0050';

export function CameraContextMenu({
  children,
  coordinates = FALLBACK_COORDINATES,
  altitude,
  showTracker = true,
  lookAtLabel,
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
          onSelect={(e) => {
            e.preventDefault();
            onCopyCoordinates?.();
          }}
          className="rounded-none gap-2.5 text-xs"
        >
          <Copy size={14} className="text-slate-12/80" />
          <Bdi
            as="span"
            direction="ltr"
            className="flex min-w-0 items-center gap-2 font-mono text-[11px] tabular-nums text-slate-12"
          >
            <span className="truncate">{coordinates}</span>
            {altitude && (
              <>
                <span className="text-slate-12/40">|</span>
                <span className="shrink-0">{altitude}</span>
              </>
            )}
          </Bdi>
        </ContextMenuItem>

        {showTracker && (
          <ContextMenuItem onClick={onTracker} className="rounded-none gap-2.5 text-xs">
            <Eye size={14} className="text-slate-12/80" />
            <span className="flex-1">{t.tracker}</span>
          </ContextMenuItem>
        )}

        <ContextMenuItem onClick={onLookAt} className="rounded-none gap-2.5 text-xs">
          <Crosshair size={14} className="text-slate-12/80" />
          <span className="flex-1">{lookAtLabel ?? t.lookAt}</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onCreateTarget} className="rounded-none gap-2.5 text-xs">
          <DesignateTarget size={14} className="text-slate-12/80" />
          <span className="flex-1">{t.createTarget}</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
