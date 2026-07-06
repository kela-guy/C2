import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GeoDrawCanvas, type GeoDrawCanvasHandle } from './GeoDrawCanvas';
import { ShapeEditPanel } from './ShapeEditPanel';
import { useGeoDraw } from './useGeoDraw';
import { TOOLBAR_VARIANTS, type ToolbarActionId, type ToolbarVariantId } from './toolbars';
import type { GeoToolId } from './drawTypes';
import { toolById } from './drawTools';

/**
 * Geo Entities Sandbox — interactive drawing surface.
 *
 * Hosts:
 *   - the shared {@link useGeoDraw} controller (state machine + transforms),
 *   - one of 7 switchable toolbar design variants ({@link TOOLBAR_VARIANTS}),
 *     defaulting to the "For Cursor" geometry picker,
 *   - the {@link GeoDrawCanvas} compact SVG map with on-shape transform
 *     handles,
 *   - the {@link ShapeEditPanel} popover anchored to the selected shape for
 *     name/description/fill color/coordinates.
 *
 * The page stays inside `import.meta.env.DEV` (gated at the route level in
 * `App.tsx`) so it tree-shakes out of the production bundle. Open it directly
 * at `/geo-entities-sandbox`.
 */

export default function GeoEntitiesSandbox() {
  const draw = useGeoDraw();
  const [variantId, setVariantId] = useState<ToolbarVariantId>('forCursor');
  const [showGrid, setShowGrid] = useState(true);
  const [showEntities, setShowEntities] = useState(true);
  const [showEditPanel, setShowEditPanel] = useState(true);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  // Timestamp of the last "Save" action — drives a transient confirmation
  // chip in the header so the user sees that Save did something even
  // though shapes were already in-memory.
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const canvasRef = useRef<GeoDrawCanvasHandle | null>(null);

  const variant = TOOLBAR_VARIANTS.find((v) => v.id === variantId) ?? TOOLBAR_VARIANTS[0];
  const ToolbarVariant = variant.Component;

  // ----- keyboard shortcuts -------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't hijack typing inside inputs / textareas.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Escape') {
        if (draw.draft) {
          draw.cancelDraft();
        } else if (draw.selectedId) {
          draw.setSelectedId(null);
        } else if (draw.activeToolId !== 'select') {
          draw.setActiveTool('select');
        }
      } else if (e.key === 'Enter') {
        if (draw.draft) {
          e.preventDefault();
          draw.finishDraft();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (draw.selectedId) {
          e.preventDefault();
          draw.deleteShape(draw.selectedId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [draw]);

  // Auto-clear the transient "Saved" confirmation after ~1.5s.
  useEffect(() => {
    if (savedAt === null) return;
    const id = window.setTimeout(() => setSavedAt(null), 1500);
    return () => window.clearTimeout(id);
  }, [savedAt]);

  // ----- toolbar callbacks --------------------------------------------------

  const handleSelectTool = useCallback(
    (id: GeoToolId) => {
      // Switching tool while a draft is in progress: discard the draft.
      if (draw.draft) draw.cancelDraft();
      draw.setActiveTool(id);
      // Switching to a draw tool clears the current selection so the user
      // isn't dragging the previous shape's bbox into the new sketch.
      if (id !== 'select') draw.setSelectedId(null);
    },
    [draw],
  );

  const handleAction = useCallback(
    (action: ToolbarActionId) => {
      if (!draw.selectedId) return;
      switch (action) {
        case 'delete':
          draw.deleteShape(draw.selectedId);
          break;
        case 'save':
          // Commit any pending draft and close the editor surface — the
          // shape is already persisted in `useGeoDraw`, so "save" here is
          // a UX gesture: drop selection, hide the popover and flash a
          // confirmation in the header.
          draw.finishDraft();
          draw.setSelectedId(null);
          setShowEditPanel(true);
          setSavedAt(Date.now());
          break;
        case 'move':
          // Drop back into Select mode if a draw tool was lingering, so a
          // click-and-drag on the shape body moves it. The on-shape body
          // hit-area already drives the actual translation.
          draw.setActiveTool('select');
          setShowEditPanel(true);
          break;
        case 'rotate':
        case 'scale':
          // Surfaced via the on-shape handles — flash the edit panel so the
          // affordance hint is visible.
          draw.setActiveTool('select');
          setShowEditPanel(true);
          break;
        case 'rename':
        case 'description':
        case 'color':
        case 'coords':
          // Open the edit panel; the field receives focus inside the panel.
          setShowEditPanel(true);
          if (typeof window !== 'undefined') {
            window.setTimeout(() => {
              const sel =
                action === 'rename'
                  ? 'input[data-slot="input"]'
                  : action === 'description'
                    ? 'textarea[data-slot="textarea"]'
                    : null;
              if (sel) {
                const el = document.querySelector(sel) as HTMLElement | null;
                el?.focus();
              }
            }, 0);
          }
          break;
      }
    },
    [draw],
  );

  // ----- render -------------------------------------------------------------

  const variantSwitcher = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border-default bg-surface-2 p-1">
        {TOOLBAR_VARIANTS.map((v) => {
          const active = v.id === variantId;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={active}
              onClick={() => setVariantId(v.id)}
              className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-state-hover-strong text-slate-12'
                  : 'text-slate-10 hover:bg-state-hover-strong hover:text-slate-12'
              }`}
              title={v.blurb}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    ),
    [variantId],
  );

  return (
    <div className="min-h-screen w-full bg-surface-1 text-slate-12 flex flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-4 py-2.5 text-[12px] shrink-0">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-9">
          Geo Drawing Sandbox
        </span>
        <span className="hidden md:inline text-slate-9">·</span>
        <span className="hidden md:inline text-slate-10">Toolbar variant</span>
        {variantSwitcher}
        <div className="ms-auto flex flex-wrap items-center gap-3">
          {savedAt !== null && (
            <span
              role="status"
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300"
            >
              Saved
            </span>
          )}
          <span className="hidden md:inline text-slate-9">
            {draw.shapes.length} shape{draw.shapes.length === 1 ? '' : 's'}
          </span>
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded border-border-default"
            />
            Grid
          </label>
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={showEntities}
              onChange={(e) => setShowEntities(e.target.checked)}
              className="rounded border-border-default"
            />
            Entities
          </label>
          <label className="flex items-center gap-1.5 text-slate-10 cursor-pointer">
            <input
              type="checkbox"
              checked={showEditPanel}
              onChange={(e) => setShowEditPanel(e.target.checked)}
              className="rounded border-border-default"
            />
            Edit panel
          </label>
          <button
            type="button"
            onClick={() => draw.clearAll()}
            className="rounded border border-border-default bg-surface-2 px-2 py-1 text-[11px] font-medium text-slate-11 transition-colors hover:border-border-strong hover:text-slate-12"
          >
            Clear all
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center gap-4 px-6 py-6 overflow-auto">
        <div className="w-full max-w-5xl">
          <ToolbarVariant
            activeToolId={draw.activeToolId}
            onSelectTool={handleSelectTool}
            selectedShape={draw.selectedShape}
            onAction={handleAction}
            className="mb-3"
          />

          <div className="relative">
            <GeoDrawCanvas
              ref={canvasRef}
              shapes={draw.shapes}
              draft={draw.draft}
              selectedId={draw.selectedId}
              activeToolId={draw.activeToolId}
              showGrid={showGrid}
              showEntities={showEntities}
              onCanvasPointerDown={draw.onCanvasPointerDown}
              onCanvasPointerMove={draw.onCanvasPointerMove}
              onCanvasPointerUp={draw.onCanvasPointerUp}
              onCanvasDoubleClick={draw.onCanvasDoubleClick}
              onHandleDown={draw.beginHandleDrag}
              onSelectionRectChange={setSelectionRect}
            />
          </div>
        </div>

        {/* Footer summary list — small inventory of drawn shapes for quick navigation. */}
        <div className="w-full max-w-5xl">
          {draw.shapes.length > 0 ? (
            <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
              {draw.shapes.map((s) => {
                const meta = toolById(s.tool);
                const active = s.id === draw.selectedId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        draw.setActiveTool('select');
                        draw.setSelectedId(s.id);
                      }}
                      className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-start text-[12px] transition-colors ${
                        active
                          ? 'border-border-strong bg-state-hover-strong text-slate-12'
                          : 'border-border-default text-slate-11 hover:border-border-strong hover:bg-state-hover-strong'
                      }`}
                    >
                      <span
                        aria-hidden
                        className="grid size-5 place-items-center rounded"
                        style={{ background: `${s.color}33`, color: s.color }}
                      >
                        <meta.Icon size={12} />
                      </span>
                      <span className="truncate">{s.name}</span>
                      <span className="ms-auto font-mono text-[10px] text-slate-9">
                        {s.points.length} pt{s.points.length === 1 ? '' : 's'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center text-[12px] text-slate-9">
              No shapes yet — pick a tool above and click on the canvas to start drawing.
            </p>
          )}
        </div>
      </main>

      {/* Anchored edit panel — separate layer, fixed-positioned next to the selection. */}
      {showEditPanel && draw.selectedShape && (
        <ShapeEditPanel
          shape={draw.selectedShape}
          anchorRect={selectionRect}
          onPatch={(patch) => draw.updateShape(draw.selectedShape!.id, patch)}
          onDelete={() => draw.deleteShape(draw.selectedShape!.id)}
          onClose={() => draw.setSelectedId(null)}
        />
      )}
    </div>
  );
}
