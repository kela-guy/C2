/**
 * DockedPanel — the shared inline-docked side panel shell.
 *
 * The queue, Devices, Simulations, and Flow Builder all dock the same
 * way: an `<aside>` pinned to one inline edge, sliding off-screen on
 * that edge when closed, with a header (title + close) and a scrollable
 * body. This component is that shell, so the individual panels only own
 * their content.
 *
 * It is NOT the modal `ui/sheet.tsx` (no backdrop, no focus trap): these
 * are persistent tactical panels that sit beside the map, not dialogs.
 *
 * Direction-aware: `side` is logical (`start`/`end`), so the panel docks
 * correctly in both RTL (Hebrew, the source language) and LTR. The
 * closed-state translate flips with `rtl:` so the panel always slides
 * toward its own edge.
 */

import { Close } from '@/lib/icons/central';
import { LAYOUT_TOKENS } from '@/primitives/tokens';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

export interface DockedPanelProps {
  open: boolean;
  onClose: () => void;
  /** Header title. ReactNode so callers can render a multi-line title. */
  title: React.ReactNode;
  closeAriaLabel: string;
  /** Logical docking edge. `start` = right in RTL / left in LTR. */
  side?: 'start' | 'end';
  /** Panel width in px. Defaults to the standard sidebar width. */
  width?: number;
  /** Skip the slide transition (used during cross-panel switches). */
  noTransition?: boolean;
  /** Optional trailing header content (badges, status, shortcuts). */
  headerExtra?: React.ReactNode;
  /** Optional sticky footer slot (e.g. a primary action button). */
  footer?: React.ReactNode;
  /** Forwarded to `data-handoff-component` for design handoff tooling. */
  dataHandoff?: string;
  /** Extra classes for the scrollable body wrapper. */
  bodyClassName?: string;
  /** Extra classes merged onto the root `<aside>` (e.g. to raise z-index). */
  className?: string;
  /** Close on Escape (ignored while typing in inputs/textareas). */
  closeOnEsc?: boolean;
  /** When true, the header close control is inert (unsaved shape in editor). */
  closeDisabled?: boolean;
  /** Tooltip/title when `closeDisabled` — explains why close is blocked. */
  closeDisabledHint?: string;
  children: React.ReactNode;
}

export function DockedPanel({
  open,
  onClose,
  title,
  closeAriaLabel,
  side = 'start',
  width,
  noTransition,
  headerExtra,
  footer,
  dataHandoff,
  bodyClassName,
  className,
  closeOnEsc,
  closeDisabled = false,
  closeDisabledHint,
  children,
}: DockedPanelProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!closeOnEsc || closeDisabled || e.key !== 'Escape') return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    // Don't hijack Escape while the user is editing a field — Radix
    // selects and inputs use it to dismiss their own popups/values.
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
    e.stopPropagation();
    onClose();
  };

  const dockClass = side === 'start' ? 'start-0 border-e' : 'end-0 border-s';
  // Closed translate slides the panel toward its own docked edge. The
  // axis flips in RTL because the physical edge of `start`/`end` swaps.
  const closedTranslate =
    side === 'start'
      ? '-translate-x-full rtl:translate-x-full'
      : 'translate-x-full rtl:-translate-x-full';

  return (
    <aside
      data-handoff-component={dataHandoff}
      className={cn(
        'absolute top-0 bottom-0 z-10 flex flex-col font-sans text-white border-white/10',
        dockClass,
        noTransition
          ? ''
          : 'transition-transform duration-[var(--motion-slow)] ease-out motion-reduce:transition-none',
        open ? 'translate-x-0' : `${closedTranslate} pointer-events-none`,
        className,
      )}
      style={{
        width: width ?? LAYOUT_TOKENS.sidebarWidthPx,
        backgroundColor: 'var(--surface-2)',
      }}
      aria-hidden={!open}
      onKeyDown={closeOnEsc ? handleKeyDown : undefined}
    >
      <header className="shrink-0 flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-white/10">
        <div className="min-w-0 flex items-center gap-2">{title}</div>
        <div className="shrink-0 flex items-center gap-1">
          {headerExtra}
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            title={closeDisabled ? closeDisabledHint : undefined}
            className="p-2 -m-1 rounded text-slate-9 hover:text-slate-11 hover:bg-state-hover-overlay transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring disabled:cursor-not-allowed disabled:text-slate-8 disabled:hover:bg-transparent disabled:hover:text-slate-8"
            aria-label={closeAriaLabel}
          >
            <Close size={14} />
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0" viewportClassName={bodyClassName}>
        {children}
      </ScrollArea>

      {footer && (
        <footer className="shrink-0 border-t border-white/10 bg-slate-1/40">
          {footer}
        </footer>
      )}
    </aside>
  );
}
