/**
 * Right-click menu for a camera feed tile. Wraps the live <video> + overlays.
 *
 * Items disable when the camera is locked by another operator. The "Pin to
 * grid" item is a stub on the playground - we'll wire it to the future
 * dashboard grid when promoting.
 */

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
import {
  Crosshair,
  Lock,
  LockOpen,
  Moon,
  Pin,
  RotateCcw,
  ScanSearch,
  Settings,
  Sun,
} from 'lucide-react';
import type { CameraStatus, DayNightMode } from './types';

interface CameraContextMenuProps {
  children: React.ReactNode;
  mode: DayNightMode;
  status: CameraStatus;
  detectionsOn: boolean;
  designateMode: boolean;
  onTakeRelease: () => void;
  onModeToggle: () => void;
  onDetectionsToggle: () => void;
  onDesignateModeToggle: () => void;
  onResetView: () => void;
  onOpenSettings: () => void;
  onPinToGrid?: () => void;
}

export function CameraContextMenu({
  children,
  mode,
  status,
  detectionsOn,
  designateMode,
  onTakeRelease,
  onModeToggle,
  onDetectionsToggle,
  onDesignateModeToggle,
  onResetView,
  onOpenSettings,
  onPinToGrid,
}: CameraContextMenuProps) {
  const ownsControl = status.controlOwner === 'self';
  const lockedByOther = status.controlOwner === 'other';
  const writeDisabled = lockedByOther;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className="min-w-[220px] rounded-none bg-[#1a1a1a]/95 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)] border-none"
      >
        <ContextMenuItem
          onClick={onTakeRelease}
          disabled={lockedByOther || status.controlRequestPending}
          className="rounded-none gap-2.5 text-xs"
        >
          {ownsControl ? (
            <LockOpen size={14} className="text-emerald-300" />
          ) : (
            <Lock size={14} className={lockedByOther ? 'text-zinc-400' : 'text-white/80'} />
          )}
          <span className="flex-1">
            {ownsControl
              ? 'שחרר שליטה'
              : lockedByOther
                ? `נעול ע״י ${status.controlOwnerName ?? 'מפעיל אחר'}`
                : 'קח שליטה'}
          </span>
          <ContextMenuShortcut>T</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onModeToggle} disabled={writeDisabled} className="rounded-none gap-2.5 text-xs">
          {mode === 'day' ? <Moon size={14} className="text-sky-300" /> : <Sun size={14} className="text-amber-300" />}
          <span className="flex-1">{mode === 'day' ? 'מצב לילה (IR)' : 'מצב יום'}</span>
          <ContextMenuShortcut>D</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem onClick={onDetectionsToggle} className="rounded-none gap-2.5 text-xs">
          <ScanSearch size={14} className={detectionsOn ? 'text-emerald-300' : 'text-white/80'} />
          <span className="flex-1">{detectionsOn ? 'הסתר זיהוי AI' : 'הצג זיהוי AI'}</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onDesignateModeToggle} className="rounded-none gap-2.5 text-xs">
          <Crosshair size={14} className={designateMode ? 'text-amber-300' : 'text-white/80'} />
          <span className="flex-1">{designateMode ? 'בטל סימון יעד' : 'סמן יעד'}</span>
          <ContextMenuShortcut>X</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onResetView} className="rounded-none gap-2.5 text-xs">
          <RotateCcw size={14} className="text-white/80" />
          <span className="flex-1">אפס תצוגה</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onOpenSettings} className="rounded-none gap-2.5 text-xs">
          <Settings size={14} className="text-white/80" />
          <span className="flex-1">הגדרות</span>
          <ContextMenuShortcut>S</ContextMenuShortcut>
        </ContextMenuItem>

        {onPinToGrid && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onPinToGrid} className="rounded-none gap-2.5 text-xs">
              <Pin size={14} className="text-white/80" />
              <span className="flex-1">נעץ לגריד</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
