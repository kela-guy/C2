/**
 * Right-click menu for the video HUD sandbox feed.
 *
 * Mirrors the map's point-context menu: a clicked location surfaces its
 * coordinates (copyable), a "look at point" slew action, and a "create
 * target" action. Kept sandbox-local so we can iterate on the production
 * video-feed menu design without touching the shared CameraContextMenu.
 */

import { useCallback, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
import { Copy, Check, Crosshair, Target } from '@/lib/icons/central';

export interface SandboxVideoContextMenuConfig {
  /** Projected ground coordinates of the clicked point, e.g. "688180 / 3593940". */
  coordinates: string;
  /** Altitude / elevation readout, e.g. "45 m". */
  altitude: string;
  /** Label for the slew-to-point action (localised). */
  lookAtLabel: string;
  /** Label for the create-target action (localised). */
  createTargetLabel: string;
}

interface SandboxVideoContextMenuProps extends SandboxVideoContextMenuConfig {
  children: React.ReactNode;
  onLookAt?: () => void;
  onCreateTarget?: () => void;
}

export function SandboxVideoContextMenu({
  children,
  coordinates,
  altitude,
  lookAtLabel,
  createTargetLabel,
  onLookAt,
  onCreateTarget,
}: SandboxVideoContextMenuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = `${coordinates} | ${altitude}`;
    void navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [coordinates, altitude]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent dir="rtl" className="min-w-[220px]">
        {/* Coordinate readout — click to copy "x / y | altitude". */}
        <ContextMenuItem
          onSelect={(e) => {
            // Keep the menu open isn't possible with Radix Item; copy then close.
            handleCopy();
            e.preventDefault();
          }}
          className="gap-2.5 text-[13px] font-mono tabular-nums"
        >
          {copied ? (
            <Check className="text-emerald-300" />
          ) : (
            <Copy />
          )}
          {/* Keep the numeric readout LTR so "x / y | altitude" never reorders in the RTL menu. */}
          <span dir="ltr" className="flex items-center gap-2.5">
            <span className="text-slate-12">{coordinates}</span>
            <span aria-hidden className="h-3.5 w-px shrink-0 bg-white/20" />
            <span className="text-slate-12/60">{altitude}</span>
          </span>
        </ContextMenuItem>

        <ContextMenuItem
          onSelect={() => onLookAt?.()}
          className="gap-2.5 text-[13px]"
        >
          <Crosshair />
          <span className="text-slate-12">{lookAtLabel}</span>
        </ContextMenuItem>

        <ContextMenuItem
          onSelect={() => onCreateTarget?.()}
          className="gap-2.5 text-[13px]"
        >
          <Target />
          <span className="text-slate-12">{createTargetLabel}</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
