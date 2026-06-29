/**
 * Map-draw panel — inline-START docked panel that hosts the polygon /
 * line / pin tool picker and the inspector for the currently selected
 * shape. Replaces the on-shape popovers (`AreaTextPopover`,
 * `ShapeStylePopover`) and the rail's satellite flyout from the
 * previous iteration.
 *
 * Uses the same `DockedPanel` shell as Simulations / Devices / Flow
 * Builder, and joins the inline-START mutual-exclusion group via
 * `Dashboard`. Reads and mutates state via `useMapDraw()` so the
 * `MapDrawOverlay` and the panel always agree on what's active /
 * selected.
 *
 * The inspector renders only when there is a selected shape; with
 * nothing selected it falls back to a short instruction line so the
 * panel doesn't feel empty between selections.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  RotateCcw,
  ChevronRight,
  Search,
  Trash2,
  X,
  Plus,
  Download,
} from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import { DockedPanel } from '@/app/components/DockedPanel';
import { Toggle } from '@/shared/components/ui/toggle';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/app/components/ui/context-menu';
import { Slider } from '@/app/components/ui/slider';
import {
  project,
  unproject,
  type GeoAreaStatus,
  type GeoFillMode,
  type GeoLineStyle,
  type GeoShape,
  type GeoZoneType,
  type Vec2,
} from '../geo-entities-sandbox/drawTypes';
import { SANDBOX_BOUNDS } from '../geo-entities-sandbox/fixtures';
import { ZONE_TYPES, ZONE_TYPE_BY_ID } from './zoneTypes';
import { deleteShapeWithUndo } from './deleteWithUndo';
import { CircleDrawIcon, LineDrawIcon, PolygonDrawIcon } from './icons';
import { MapPin } from '@/lib/icons/central';
import { useMapDraw, type MapDrawTool, type MapDrawContextValue } from './MapDrawProvider';
import { getZOrderActions, type ShapeAction } from './shapeActions';

// Type scale kept in step with the sibling docked panels (Simulations /
// Flow Builder): Heebo only, no mono / uppercase / letter-tracking.
const TYPE_GROUP_TITLE = 'text-[11px] font-semibold text-zinc-400';

const STATUS_OPTIONS: { id: GeoAreaStatus; label: string; tone: string }[] = [
  { id: 'low', label: 'Low', tone: '#34d399' },
  { id: 'middle', label: 'Middle', tone: '#facc15' },
  { id: 'high', label: 'High', tone: '#f43f5e' },
];

const LINE_STYLES: { id: GeoLineStyle; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'none', label: 'None' },
];

/**
 * Visual variants of the panel — drives tool-button design, Tools-section
 * layout (static heading vs. collapsible dropdown), and Layers default
 * open state. Used by the Geo Entities Layers lab to A/B between
 * candidate designs.
 *
 * `original` reproduces today's production panel exactly. The `opt*`
 * variants share the same "Layers open by default, smaller buttons"
 * baseline and differ in tool-button look and whether Tools is wrapped
 * in a dropdown.
 *
 * `opt5` is a hybrid of {@link opt2} (collapsible Tools dropdown) and
 * {@link opt3} (segmented picker chrome): segmented tools inside a
 * dropdown that's expanded by default — so the connected bar reads as
 * one control while still collapsing on demand.
 */
export type MapDrawPanelVariant = 'original' | 'opt2' | 'opt3' | 'opt5';

type ToolPickerStyle = 'tiles' | 'chips' | 'segmented';

interface VariantConfig {
  layersDefaultOpen: boolean;
  toolsCollapsible: boolean;
  toolsDefaultOpen: boolean;
  picker: ToolPickerStyle;
}

const VARIANT_CONFIG: Record<MapDrawPanelVariant, VariantConfig> = {
  original: {
    layersDefaultOpen: false,
    toolsCollapsible: false,
    toolsDefaultOpen: true,
    picker: 'tiles',
  },
  opt2: {
    layersDefaultOpen: true,
    toolsCollapsible: true,
    toolsDefaultOpen: false,
    picker: 'chips',
  },
  opt3: {
    layersDefaultOpen: true,
    toolsCollapsible: false,
    toolsDefaultOpen: true,
    picker: 'segmented',
  },
  opt5: {
    layersDefaultOpen: true,
    // Production keeps the top of the panel chrome-free — Tools is a
    // plain heading, not a collapsible (no chevron, no expand state).
    toolsCollapsible: false,
    toolsDefaultOpen: true,
    picker: 'segmented',
  },
};

export interface MapDrawPanelProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  noTransition?: boolean;
  /**
   * Visual variant of the panel. Defaults to `'original'` (the production
   * design). The Geo Entities Layers lab sets this to one of the `opt*`
   * variants — or enables `lab` to let the user flip between them live.
   */
  variant?: MapDrawPanelVariant;
  /**
   * Lab mode: shows a segmented variant switcher at the top of the panel
   * body so reviewers can flip between the five designs live. Off in
   * production.
   */
  lab?: boolean;
  /**
   * Type-panel lab: shows a 5-tab switcher (Opt 1..Opt 5) for the Type
   * section's UI design and renders an always-visible Type preview block
   * so reviewers can compare layouts without first drawing a shape. Used
   * by the `/geo-entities-type-sandbox` lab. Off in production.
   */
  typeLab?: boolean;
}

export function MapDrawPanel({
  open,
  onClose,
  width,
  noTransition,
  variant: variantProp = 'original',
  lab = false,
  typeLab = false,
}: MapDrawPanelProps) {
  const tAll = useStrings();
  // Soft fallback strings: this feature predates a localized i18n
  // namespace. Pull from the simulations close label when it exists,
  // otherwise show literals — easy to swap once strings ship.
  const closeLabel = tAll.flowBuilder.simulations.close ?? 'Close';

  const { draw, drawTool, setDrawTool } = useMapDraw();
  const selected = draw.selectedShape;

  // In lab mode the variant is user-controlled (via the switcher); in
  // production it's a fixed prop. We re-seed local state whenever the
  // prop changes so the parent can still force a variant.
  const [variant, setVariant] = useState<MapDrawPanelVariant>(variantProp);
  useEffect(() => setVariant(variantProp), [variantProp]);
  const cfg = VARIANT_CONFIG[variant];

  // Type-panel lab state. Only consulted when `typeLab` is on; we still
  // hold it unconditionally so the hook order is stable across renders.
  const [typeVariant, setTypeVariant] = useState<TypePanelVariant>('opt1');
  // Mock shape that backs the always-visible Type preview block — lets
  // reviewers compare the 5 layouts (and pick a zone) before drawing
  // anything. Independent of `draw.shapes` so it survives a reset.
  const [previewShape, setPreviewShape] = useState<GeoShape>(() =>
    makePreviewShape(),
  );

  // Keep the inspector "sticky": once a shape has been drawn/selected we
  // hold onto its id so the inspector stays open even after the user
  // clicks off the shape (deselects). It only falls back to the empty
  // instruction state when there is no shape to edit at all.
  const [stickyId, setStickyId] = useState<string | null>(null);
  useEffect(() => {
    if (selected) setStickyId(selected.id);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-arm Polygon as soon as the panel opens so the user can start
  // drawing without first picking a tool. Skipped if a tool is already
  // active (e.g. user re-opens mid-flow) or a draft is mid-flight.
  useEffect(() => {
    if (drawTool == null && !draw.draft) setDrawTool('polygon');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inspected =
    selected ?? draw.shapes.find((s) => s.id === stickyId) ?? null;

  const toolsNode = (
    <ToolsSection
      drawTool={drawTool}
      onPick={setDrawTool}
      style={cfg.picker}
      collapsible={cfg.toolsCollapsible}
      defaultOpen={cfg.toolsDefaultOpen}
    />
  );

  return (
    <DockedPanel
      open={open}
      onClose={onClose}
      side="start"
      width={width}
      noTransition={noTransition}
      dataHandoff="map-draw-panel"
      title={<h2 className="text-sm font-semibold truncate">Drawing</h2>}
      closeAriaLabel={closeLabel}
      bodyClassName="px-4 py-3 space-y-5"
      // Raise above the screen-space drawing overlay (z-20) so the panel
      // and its tool buttons stay clickable and aren't covered by shapes.
      className="z-30"
    >
      {lab && <VariantSwitcher variant={variant} onChange={setVariant} />}

      {typeLab && (
        <>
          <TypePanelSwitcher variant={typeVariant} onChange={setTypeVariant} />
          {/* Always-visible Type preview so reviewers can compare all five
              layouts immediately without first drawing a shape. */}
          <section className="space-y-2">
            <span className={`${TYPE_GROUP_TITLE} block`}>Preview</span>
            <TypeField
              shape={previewShape}
              onPatch={(patch) =>
                setPreviewShape((prev) => ({ ...prev, ...patch }))
              }
              variant={typeVariant}
            />
          </section>
        </>
      )}

      {/* While a draft is in flight the panel collapses down to just the
          tool picker + the draft controls — every other section (Type,
          Inspector, Layers) is hidden so the user can focus on placing
          vertices. The full panel reappears the moment the draft is
          committed. */}
      {draw.draft ? (
        <>
          {toolsNode}
          <DraftControls draw={draw} />
        </>
      ) : (
        <>
          {/* Type lives ABOVE Tools — it's the first required choice once
              a shape is drawn / selected. Rendered as a plain section
              (no chevron) so the panel header reads cleanly. */}
          {inspected && (
            <TypeField
              shape={inspected}
              onPatch={(patch) => draw.updateShape(inspected.id, patch)}
              variant={typeLab ? typeVariant : undefined}
              chrome="plain"
            />
          )}

          {toolsNode}

          {inspected && (
            <ShapeInspector
              shape={inspected}
              onPatch={(patch) => draw.updateShape(inspected.id, patch)}
            />
          )}

          {/* Layers always sits at the bottom (Figma-style) so the panel
              reads top-down: what you're working on → how to draw → the
              full project list. */}
          <LayersSection
            draw={draw}
            defaultOpen={cfg.layersDefaultOpen}
            autoEditId={draw.lastCommittedId}
            onAutoEditConsumed={draw.clearLastCommittedId}
          />
        </>
      )}
    </DockedPanel>
  );
}

// ---------------------------------------------------------------------------
// Variant switcher (lab mode only)
// ---------------------------------------------------------------------------

const VARIANT_TABS: { id: MapDrawPanelVariant; label: string }[] = [
  { id: 'opt2', label: 'Opt 2' },
  { id: 'opt3', label: 'Opt 3' },
  { id: 'opt5', label: 'Opt 5' },
  { id: 'original', label: 'Original' },
];

function VariantSwitcher({
  variant,
  onChange,
}: {
  variant: MapDrawPanelVariant;
  onChange: (next: MapDrawPanelVariant) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Panel design variant"
      className="-mt-1 flex items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5"
    >
      {VARIANT_TABS.map((t) => {
        const active = variant === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              active
                ? 'bg-white/[0.14] text-white ring-1 ring-inset ring-white/15'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type-panel switcher (type-lab mode only)
// ---------------------------------------------------------------------------

const TYPE_PANEL_TABS: { id: TypePanelVariant; label: string }[] = [
  { id: 'opt1', label: 'Opt 1' },
  { id: 'opt2', label: 'Opt 2' },
  { id: 'opt3', label: 'Opt 3' },
  { id: 'opt4', label: 'Opt 4' },
  { id: 'opt5', label: 'Opt 5' },
];

function TypePanelSwitcher({
  variant,
  onChange,
}: {
  variant: TypePanelVariant;
  onChange: (next: TypePanelVariant) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Type panel design variant"
      className="-mt-1 flex items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5"
    >
      {TYPE_PANEL_TABS.map((t) => {
        const active = variant === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              active
                ? 'bg-white/[0.14] text-white ring-1 ring-inset ring-white/15'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// A minimal stand-in `GeoShape` used solely by the type-lab preview block.
// It mirrors the defaults of a freshly drawn polygon so the picker behaves
// exactly as it would inside the real inspector.
function makePreviewShape(): GeoShape {
  return {
    id: 'type-preview',
    tool: 'polygon',
    kind: 'polygon',
    name: 'Preview',
    description: '',
    color: '#000000',
    fillOpacity: 0.18,
    points: [
      { x: 0.4, y: 0.4 },
      { x: 0.6, y: 0.4 },
      { x: 0.6, y: 0.6 },
      { x: 0.4, y: 0.6 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Layers — searchable list of every drawn shape
// ---------------------------------------------------------------------------

function shapeLabel(shape: GeoShape): string {
  const named = (shape.description ?? '').trim();
  return named || shape.name || 'Untitled';
}

function LayersSection({
  draw,
  defaultOpen = false,
  autoEditId,
  onAutoEditConsumed,
}: {
  draw: MapDrawContextValue['draw'];
  defaultOpen?: boolean;
  /**
   * Id of a shape that should open in rename mode the moment its row
   * mounts. Used to focus the freshly-drawn shape's name input so the
   * user sees a blinking caret and can start typing immediately.
   */
  autoEditId?: string | null;
  onAutoEditConsumed?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(defaultOpen);
  // Search is hidden behind an icon by default; toggling it reveals the
  // input (and clears the query when collapsed so the list isn't silently
  // filtered while the field is out of sight).
  const [searching, setSearching] = useState(false);
  // Variant flips can change the default-open intent at runtime (lab
  // mode); honour the new default whenever it changes so flipping a
  // variant flips the section state.
  useEffect(() => setOpen(defaultOpen), [defaultOpen]);

  // Pop the section open + clear search whenever a brand-new shape is
  // committed so the auto-focused rename input is actually visible.
  useEffect(() => {
    if (autoEditId) {
      setOpen(true);
      setQuery('');
    }
  }, [autoEditId]);

  if (draw.shapes.length === 0) return null;

  const q = query.trim().toLowerCase();
  const matches = draw.shapes.filter((s) =>
    q === '' ? true : shapeLabel(s).toLowerCase().includes(q),
  );

  return (
    <section className="space-y-2">
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center text-left focus-visible:outline-none"
        >
          <span className={`${TYPE_GROUP_TITLE} flex min-w-0 items-center`}>
            <span className="truncate">Layers</span>
          </span>
        </button>
        <button
          type="button"
          aria-label={searching ? 'Hide search' : 'Search layers'}
          title={searching ? 'Hide search' : 'Search layers'}
          aria-pressed={searching}
          onClick={() => {
            // Opening the section if needed, then toggling the field.
            setOpen(true);
            setSearching((v) => {
              if (v) setQuery('');
              return !v;
            });
          }}
          className={`grid size-5 shrink-0 place-items-center rounded transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
            searching ? 'text-white' : 'text-zinc-500'
          }`}
        >
          <Search size={14} />
        </button>
      </div>

      {open && (
        <>
          {searching && (
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search layers by name"
              className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-white/30"
            />
          )}

          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {matches.length === 0 ? (
              <li className="px-1 py-2 text-[12px] text-zinc-500">No layers match “{query}”.</li>
            ) : (
              matches.map((s) => (
                <LayerRow
                  key={s.id}
                  shape={s}
                  active={s.id === draw.selectedId}
                  zOrderActions={getZOrderActions(draw, s.id)}
                  onSelect={() => draw.setSelectedId(s.id)}
                  onRename={(name) => draw.updateShape(s.id, { description: name })}
                  onToggleHidden={() => draw.updateShape(s.id, { hidden: !s.hidden })}
                  onToggleLocked={() => draw.updateShape(s.id, { locked: !s.locked })}
                  onDelete={() => deleteShapeWithUndo(draw, s.id)}
                  autoEdit={s.id === autoEditId}
                  onAutoEditConsumed={onAutoEditConsumed}
                />
              ))
            )}
          </ul>
        </>
      )}
    </section>
  );
}

function LayerRow({
  shape,
  active,
  zOrderActions,
  onSelect,
  onRename,
  onToggleHidden,
  onToggleLocked,
  onDelete,
  autoEdit = false,
  onAutoEditConsumed,
}: {
  shape: GeoShape;
  active: boolean;
  zOrderActions: ShapeAction[];
  onSelect: () => void;
  onRename: (name: string) => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onDelete: () => void;
  /** Render in rename mode immediately on first mount (auto-focus). */
  autoEdit?: boolean;
  /** Called once `autoEdit` has been handled so the parent can clear it. */
  onAutoEditConsumed?: () => void;
}) {
  const status = STATUS_OPTIONS.find((o) => o.id === shape.status);
  const [editing, setEditing] = useState(autoEdit);
  // Pop into rename mode whenever the parent flags this row as the
  // "just-committed" shape — runs in an effect (not at render time) so
  // we can call back to clear the marker in the same tick.
  useEffect(() => {
    if (autoEdit) {
      setEditing(true);
      onAutoEditConsumed?.();
    }
    // We only react to a fresh `autoEdit === true` signal; subsequent
    // false transitions shouldn't force editing back off (the user may
    // still be typing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit]);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
            active
              ? 'border-white/20 bg-white/[0.10]'
              : 'border-transparent hover:border-white/10 hover:bg-white/[0.05]'
          }`}
        >
          {status && (
            <span
              className="size-2 shrink-0 rounded-full ring-1 ring-inset ring-white/20"
              style={{ background: status.tone }}
              title={`Status: ${status.label}`}
              aria-label={`Status: ${status.label}`}
            />
          )}
          {editing ? (
            <input
              autoFocus
              type="text"
              value={shape.description ?? ''}
              placeholder="Add name"
              aria-label="Layer name"
              onChange={(e) => onRename(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
              className="min-w-0 flex-1 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-white/40"
            />
          ) : (
            <button
              type="button"
              onClick={onSelect}
              onDoubleClick={() => setEditing(true)}
              className={`min-w-0 flex-1 truncate text-left text-[13px] ${
                shape.hidden ? 'text-white/40' : 'text-zinc-100'
              }`}
              title="Click to select · double-click to rename"
            >
              {shapeLabel(shape)}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleLocked}
            aria-label={shape.locked ? 'Unlock layer' : 'Lock layer'}
            title={shape.locked ? 'Unlock layer' : 'Lock layer'}
            aria-pressed={!!shape.locked}
            className={`grid size-6 shrink-0 place-items-center rounded transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              shape.locked ? 'text-white' : 'text-white/45'
            }`}
          >
            {shape.locked ? <Lock size={14} /> : <LockOpen size={14} />}
          </button>
          <button
            type="button"
            onClick={onToggleHidden}
            aria-label={shape.hidden ? 'Show layer' : 'Hide layer'}
            title={shape.hidden ? 'Show layer' : 'Hide layer'}
            className="grid size-6 shrink-0 place-items-center rounded text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            {shape.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete layer"
            title="Delete layer"
            className="grid size-6 shrink-0 place-items-center rounded text-white/45 opacity-0 transition-colors hover:bg-rose-500/20 hover:text-rose-300 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </li>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {zOrderActions.map((a) => (
          <ContextMenuItem
            key={a.id}
            disabled={a.disabled}
            onSelect={() => a.onSelect()}
          >
            <a.Icon size={14} />
            {a.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ---------------------------------------------------------------------------
// Draft controls — undo / finish while a multi-vertex draft is in flight
// ---------------------------------------------------------------------------

function DraftControls({ draw }: { draw: MapDrawContextValue['draw'] }) {
  const count = draw.draft?.points.length ?? 0;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className={TYPE_GROUP_TITLE}>Drawing</h3>
        <span className="text-[11px] tabular-nums text-zinc-500">
          {count} point{count === 1 ? '' : 's'}
        </span>
      </div>
      <button
        type="button"
        onClick={draw.undoLastPoint}
        disabled={count === 0}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        <RotateCcw size={14} />
        Undo
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tools section (variant-aware)
// ---------------------------------------------------------------------------

type ToolEntry = { id: MapDrawTool; label: string; Icon: typeof PolygonDrawIcon };

const TOOL_ENTRIES: ToolEntry[] = [
  { id: 'polygon', label: 'Polygon', Icon: PolygonDrawIcon },
  { id: 'line', label: 'Line', Icon: LineDrawIcon },
  { id: 'point', label: 'Pin', Icon: MapPin },
  { id: 'circle', label: 'Circle', Icon: CircleDrawIcon },
];

function ToolsSection({
  drawTool,
  onPick,
  style,
  collapsible,
  defaultOpen,
}: {
  drawTool: MapDrawTool | null;
  onPick: (tool: MapDrawTool | null) => void;
  style: ToolPickerStyle;
  collapsible: boolean;
  defaultOpen: boolean;
}) {
  const picker = <ToolPicker drawTool={drawTool} onPick={onPick} style={style} />;
  if (collapsible) {
    return (
      <CollapsibleSection title="Tools" defaultOpen={defaultOpen}>
        {picker}
      </CollapsibleSection>
    );
  }
  return (
    <section className="space-y-2">
      <h3 className={TYPE_GROUP_TITLE}>Tools</h3>
      {picker}
    </section>
  );
}

function ToolPicker({
  drawTool,
  onPick,
  style,
}: {
  drawTool: MapDrawTool | null;
  onPick: (tool: MapDrawTool | null) => void;
  style: ToolPickerStyle;
}) {
  // All visual styles share the same Toggle semantics (pressed +
  // onPressedChange) so they all participate in the same active-state
  // bookkeeping; they only differ in layout / chrome.
  if (style === 'tiles') {
    // Original 2x2 large tiles.
    return (
      <div role="group" aria-label="Drawing tools" className="grid grid-cols-2 gap-2">
        {TOOL_ENTRIES.map((t) => {
          const active = drawTool === t.id;
          return (
            <Toggle
              key={t.id}
              size="sm"
              pressed={active}
              onPressedChange={(next) => onPick(next ? t.id : null)}
              aria-label={t.label}
              className="h-auto min-h-16 flex-col gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2.5 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white aria-pressed:bg-white/[0.10] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <t.Icon size={20} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </Toggle>
          );
        })}
      </div>
    );
  }

  if (style === 'chips') {
    // Small wrap-friendly chips: icon + short label.
    return (
      <div role="group" aria-label="Drawing tools" className="flex flex-wrap items-center gap-1.5">
        {TOOL_ENTRIES.map((t) => {
          const active = drawTool === t.id;
          return (
            <Toggle
              key={t.id}
              size="sm"
              pressed={active}
              onPressedChange={(next) => onPick(next ? t.id : null)}
              aria-label={t.label}
              className="h-8 gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white aria-pressed:bg-white/[0.12] aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <t.Icon size={14} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </Toggle>
          );
        })}
      </div>
    );
  }

  // segmented — one connected segmented bar. Icon-only to stay compact.
  // Every adjacent button is separated by the same hairline stroke so
  // the seam between polygon and line reads identically to the seam
  // between curve and circle. `border-s` (logical inline-start) keeps
  // the seam on the correct side in both LTR and RTL — `border-l`
  // would land on the wrong edge once the row is mirrored.
  return (
    <div
      role="group"
      aria-label="Drawing tools"
      className="flex items-stretch overflow-hidden rounded-md border border-white/10 bg-white/[0.04]"
    >
      {TOOL_ENTRIES.map((t, i) => {
        const active = drawTool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            aria-label={t.label}
            title={t.label}
            onClick={() => onPick(active ? null : t.id)}
            className={`flex h-8 flex-1 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
              i > 0 ? 'border-s border-white/20' : ''
            } ${
              active
                ? 'bg-white/[0.14] text-white'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            <t.Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shape inspector
// ---------------------------------------------------------------------------

function ShapeInspector({
  shape,
  onPatch,
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  const fillMode: GeoFillMode = shape.fillMode ?? 'fill';
  const lineStyle: GeoLineStyle = shape.lineStyle ?? 'solid';

  // A shape needs at least one of fill / line to remain visible. If the
  // user turns off whichever is left, we flip the other one back on so a
  // shape can never become fully invisible (= "can't be drawn").
  const onPatchGuarded = (patch: Partial<GeoShape>) => {
    const nextFill = patch.fillMode ?? fillMode;
    const nextLine = patch.lineStyle ?? lineStyle;
    if (nextFill === 'none' && nextLine === 'none') {
      if (patch.fillMode === 'none') {
        onPatch({ ...patch, lineStyle: 'solid' });
        return;
      }
      if (patch.lineStyle === 'none') {
        onPatch({ ...patch, fillMode: 'fill' });
        return;
      }
    }
    onPatch(patch);
  };

  return (
    <div className="space-y-5">
      {/* Type is lifted above Tools (rendered by the panel itself) — it's
          the first required choice after a shape is drawn. */}
      <ParametersSection shape={shape} onPatch={onPatch} />
      <CoordinatesSection shape={shape} onPatch={onPatch} />
      <ColorSection
        shape={shape}
        fillMode={fillMode}
        lineStyle={lineStyle}
        onPatch={onPatchGuarded}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coordinates — editable lat/lng per vertex. Typing a coordinate re-anchors
// the matching dot on the map (the overlay shows a dot per vertex on the
// selected shape). An upload affordance attaches a reference HTML link.
// ---------------------------------------------------------------------------

function CoordinatesSection({
  shape,
  onPatch,
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  // Section open state is owned here so we can mirror it into the shared
  // context — the map overlay reads `coordinatesOpen` to decide whether
  // to render the numbered vertex chips (edit-coordinates mode).
  const { setCoordinatesOpen } = useMapDraw();
  const [open, setOpen] = useState(false);
  // Reset to closed whenever the inspected shape changes so a freshly
  // selected polygon doesn't inherit a stale open state.
  useEffect(() => {
    setOpen(false);
  }, [shape.id]);
  // Mirror open to context; also clear on unmount so the dots disappear
  // when the inspector goes away (deselect, panel close, etc.).
  useEffect(() => {
    setCoordinatesOpen(open);
    return () => setCoordinatesOpen(false);
  }, [open, setCoordinatesOpen]);

  // Circles are stored as two bbox corners; their meaningful coordinate is
  // the center. Everything else exposes each vertex directly.
  const isCircle = shape.kind === 'circle';
  const canAddPoint =
    shape.kind === 'polygon' ||
    shape.kind === 'polyline' ||
    shape.kind === 'freehand';

  const setPoint = (index: number, next: Vec2) => {
    const points = shape.points.map((p, i) => (i === index ? next : p));
    onPatch({ points });
  };

  const setCenter = (next: Vec2) => {
    // Keep the radius (half-extent) fixed; shift both corners by the delta
    // between the old and new center so the circle moves without resizing.
    const a = shape.points[0] ?? { x: 0.5, y: 0.5 };
    const b = shape.points[1] ?? a;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const dx = next.x - cx;
    const dy = next.y - cy;
    onPatch({
      points: [
        { x: a.x + dx, y: a.y + dy },
        { x: b.x + dx, y: b.y + dy },
      ],
    });
  };

  const addPoint = () => {
    // Append a vertex at the centroid so it lands visibly inside the shape;
    // the user then drags its coordinate to the right spot.
    const n = shape.points.length || 1;
    const cx = shape.points.reduce((s, p) => s + p.x, 0) / n;
    const cy = shape.points.reduce((s, p) => s + p.y, 0) / n;
    onPatch({ points: [...shape.points, { x: cx, y: cy }] });
  };

  const removePoint = (index: number) => {
    if (shape.points.length <= 2) return; // keep a drawable minimum
    onPatch({ points: shape.points.filter((_, i) => i !== index) });
  };

  const rows = isCircle
    ? [
        {
          index: 0,
          label: 'Center',
          point: ((): Vec2 => {
            const a = shape.points[0] ?? { x: 0.5, y: 0.5 };
            const b = shape.points[1] ?? a;
            return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          })(),
          onChange: setCenter,
        },
      ]
    : shape.points.map((point, index) => ({
        index,
        label: String(index + 1),
        point,
        onChange: (next: Vec2) => setPoint(index, next),
      }));

  return (
    <CollapsibleSection
      title="Coordinates"
      open={open}
      onOpenChange={setOpen}
      headerAction={
        <button
          type="button"
          aria-label="Add reference link"
          title="Add reference link"
          aria-pressed={linkOpen || !!shape.linkUrl}
          onClick={() => setLinkOpen((v) => !v)}
          className={`grid size-5 place-items-center rounded transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
            shape.linkUrl ? 'text-white' : 'text-zinc-500'
          }`}
        >
          <Download size={12} />
        </button>
      }
    >
      {linkOpen && (
        <input
          type="url"
          value={shape.linkUrl ?? ''}
          placeholder="Paste a reference link (https://…)"
          aria-label="Reference link"
          onChange={(e) => onPatch({ linkUrl: e.target.value })}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/40 outline-none focus:border-white/30"
        />
      )}

      <ul className="space-y-1.5">
        {rows.map((row) => (
          <CoordinateRow
            key={row.index}
            label={row.label}
            point={row.point}
            onChange={row.onChange}
            onRemove={
              !isCircle && shape.points.length > 2
                ? () => removePoint(row.index)
                : undefined
            }
          />
        ))}
      </ul>

      {canAddPoint && (
        <button
          type="button"
          onClick={addPoint}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <Plus size={14} />
          Add coordinates
        </button>
      )}
    </CollapsibleSection>
  );
}

function CoordinateRow({
  label,
  point,
  onChange,
  onRemove,
}: {
  label: string;
  point: Vec2;
  onChange: (next: Vec2) => void;
  onRemove?: () => void;
}) {
  const { lat, lng } = unproject(point, SANDBOX_BOUNDS);

  const commit = (nextLat: number, nextLng: number) => {
    if (Number.isNaN(nextLat) || Number.isNaN(nextLng)) return;
    onChange(project({ lat: nextLat, lng: nextLng }, SANDBOX_BOUNDS));
  };

  return (
    <li className="flex items-center gap-1.5">
      <span className="w-5 shrink-0 text-center text-[11px] tabular-nums text-zinc-500">
        {label}
      </span>
      <input
        type="number"
        step="0.0001"
        inputMode="decimal"
        value={lat.toFixed(4)}
        aria-label={`Latitude ${label}`}
        onChange={(e) => commit(parseFloat(e.target.value), lng)}
        className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[12px] tabular-nums text-zinc-100 outline-none focus:border-white/30"
      />
      <input
        type="number"
        step="0.0001"
        inputMode="decimal"
        value={lng.toFixed(4)}
        aria-label={`Longitude ${label}`}
        onChange={(e) => commit(lat, parseFloat(e.target.value))}
        className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[12px] tabular-nums text-zinc-100 outline-none focus:border-white/30"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove point ${label}`}
          title="Remove point"
          className="grid size-6 shrink-0 place-items-center rounded text-white/45 transition-colors hover:bg-rose-500/20 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <X size={12} />
        </button>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Type — the 4 zone presets. Picking one stamps both the fill color and
// the stroke color so the shape's hue always reads as its zone type.
//
// Five candidate layouts (Opt 1 - Opt 5) are exposed through the
// `variant` prop so the `/geo-entities-type-sandbox` lab can A/B them
// live. Production renders Opt 1.
// ---------------------------------------------------------------------------

export type TypePanelVariant = 'opt1' | 'opt2' | 'opt3' | 'opt4' | 'opt5';

function TypeField({
  shape,
  onPatch,
  variant = 'opt5',
  chrome = 'collapsible',
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
  variant?: TypePanelVariant;
  /**
   * `'collapsible'` (default): wraps the type body in a `CollapsibleSection`
   * — used in the type-lab preview where a chevron is fine.
   *
   * `'plain'`: renders a flat section header with no chevron. Used at the
   * top of the panel body so the always-mandatory Type row reads as a
   * Figma-style heading (no expandable affordance).
   */
  chrome?: 'collapsible' | 'plain';
}) {
  const activeType = shape.zoneType;
  const isMissing = !activeType;
  // Stroke clears so the line always inherits the fill color; there's no
  // separate line-color control any more.
  const pick = (id: GeoZoneType, color: string) =>
    onPatch({ zoneType: id, color, strokeColor: undefined });

  const body = (
    <>
      {variant === 'opt1' && (
        <TypeVariantTiles activeType={activeType} onPick={pick} />
      )}
      {variant === 'opt2' && (
        <TypeVariantRadioList activeType={activeType} onPick={pick} />
      )}
      {variant === 'opt3' && (
        <TypeVariantSegmentedDots activeType={activeType} onPick={pick} />
      )}
      {variant === 'opt4' && (
        <TypeVariantCards activeType={activeType} onPick={pick} />
      )}
      {variant === 'opt5' && (
        <TypeVariantDropdown activeType={activeType} onPick={pick} />
      )}
    </>
  );

  // Only the Required pill is allowed to be red — the title text stays
  // neutral so the section reads as a heading, not an error.
  const requiredPill = isMissing ? (
    <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-inset ring-rose-500/30">
      Required
    </span>
  ) : null;

  if (chrome === 'plain') {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={TYPE_GROUP_TITLE}>Type</span>
          {requiredPill}
        </div>
        {body}
      </section>
    );
  }

  return (
    <CollapsibleSection
      title="Type"
      defaultOpen
      headerAction={requiredPill ?? undefined}
    >
      {body}
    </CollapsibleSection>
  );
}

// ----- Opt 1: Swatch tiles (current production look) ----------------------
function TypeVariantTiles({
  activeType,
  onPick,
}: {
  activeType: GeoZoneType | undefined;
  onPick: (id: GeoZoneType, color: string) => void;
}) {
  return (
    <div role="listbox" className="flex items-stretch gap-1.5">
      {ZONE_TYPES.map((t) => {
        const active = activeType === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={active}
            title={`${t.label} — ${t.description}`}
            onClick={() => onPick(t.id, t.color)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md border px-1.5 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              active
                ? 'border-white/20 bg-white/[0.10]'
                : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]'
            }`}
          >
            <span
              aria-hidden
              className="size-3.5 rounded-full ring-1 ring-inset ring-white/20"
              style={{ background: t.color }}
            />
            <span
              className={`w-full truncate text-[11px] font-medium ${
                active ? 'text-white' : 'text-zinc-300'
              }`}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ----- Opt 2: Vertical radio list with label + description ---------------
function TypeVariantRadioList({
  activeType,
  onPick,
}: {
  activeType: GeoZoneType | undefined;
  onPick: (id: GeoZoneType, color: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Zone type" className="space-y-1">
      {ZONE_TYPES.map((t) => {
        const active = activeType === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(t.id, t.color)}
            className={`flex w-full items-center gap-2.5 rounded-md border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              active
                ? 'border-white/20 bg-white/[0.10]'
                : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]'
            }`}
          >
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full ring-1 ring-inset ring-white/20"
              style={{ background: t.color }}
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-[12px] font-medium ${
                  active ? 'text-white' : 'text-zinc-200'
                }`}
              >
                {t.label}
              </span>
              <span className="block truncate text-[11px] text-zinc-500">
                {t.description}
              </span>
            </span>
            {active && <Check size={14} className="shrink-0 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

// ----- Opt 3: Segmented connected bar of color dots, active label below --
function TypeVariantSegmentedDots({
  activeType,
  onPick,
}: {
  activeType: GeoZoneType | undefined;
  onPick: (id: GeoZoneType, color: string) => void;
}) {
  const active = activeType ? ZONE_TYPE_BY_ID[activeType] : null;
  return (
    <div className="space-y-1.5">
      <div
        role="listbox"
        aria-label="Zone type"
        className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-1"
      >
        {ZONE_TYPES.map((t) => {
          const isActive = activeType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={isActive}
              title={`${t.label} — ${t.description}`}
              onClick={() => onPick(t.id, t.color)}
              className={`grid h-7 flex-1 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                isActive ? 'bg-white/[0.10]' : 'hover:bg-white/[0.06]'
              }`}
            >
              <span
                aria-hidden
                className={`rounded-full transition-[box-shadow,transform] ${
                  isActive
                    ? 'size-4 ring-2 ring-white/80 ring-offset-2 ring-offset-[#1c1c1c]'
                    : 'size-3.5 ring-1 ring-inset ring-white/20'
                }`}
                style={{ background: t.color }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[12px] font-medium text-white">
          {active ? active.label : 'No type selected'}
        </span>
        {active && (
          <span className="truncate text-[11px] text-zinc-500">
            {active.description}
          </span>
        )}
      </div>
    </div>
  );
}

// ----- Opt 4: 2x2 grid of color-bordered cards ---------------------------
function TypeVariantCards({
  activeType,
  onPick,
}: {
  activeType: GeoZoneType | undefined;
  onPick: (id: GeoZoneType, color: string) => void;
}) {
  return (
    <div role="listbox" className="grid grid-cols-2 gap-1.5">
      {ZONE_TYPES.map((t) => {
        const active = activeType === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onPick(t.id, t.color)}
            className={`group flex items-stretch overflow-hidden rounded-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
              active
                ? 'border-white/25 bg-white/[0.10]'
                : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]'
            }`}
          >
            <span
              aria-hidden
              className="w-1 shrink-0"
              style={{ background: t.color }}
            />
            <span className="min-w-0 flex-1 px-2 py-1.5">
              <span
                className={`block truncate text-[12px] font-semibold ${
                  active ? 'text-white' : 'text-zinc-200'
                }`}
              >
                {t.label}
              </span>
              <span className="block truncate text-[10.5px] text-zinc-500">
                {t.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ----- Opt 5: Single dropdown trigger -------------------------------------
function TypeVariantDropdown({
  activeType,
  onPick,
}: {
  activeType: GeoZoneType | undefined;
  onPick: (id: GeoZoneType, color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = activeType ? ZONE_TYPE_BY_ID[activeType] : null;
  return (
    <div className="group relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        // Minimal at rest (no border / bg / chevron); on hover, focus, or
        // when the menu is open the full trigger chrome and chevron appear.
        className="flex w-full items-center gap-2 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-left transition-colors group-hover:border-white/10 group-hover:bg-white/[0.04] group-focus-within:border-white/10 group-focus-within:bg-white/[0.04] aria-expanded:border-white/10 aria-expanded:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        <span
          aria-hidden
          className="size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-white/20"
          style={{ background: active?.color ?? '#52525b' }}
        />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white">
          {active ? active.label : 'Choose a zone type'}
        </span>
        <ChevronRight
          size={14}
          className={`shrink-0 text-zinc-400 opacity-0 transition-[opacity,transform] group-hover:opacity-100 group-focus-within:opacity-100 ${open ? 'rotate-90 opacity-100' : ''}`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Zone type"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-white/10 bg-[#1a1a1a]/95 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_18px_40px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          {ZONE_TYPES.map((t) => {
            const isActive = activeType === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onPick(t.id, t.color);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors focus-visible:outline-none ${
                    isActive
                      ? 'bg-white/[0.10] text-white'
                      : 'text-zinc-200 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full ring-1 ring-inset ring-white/20"
                    style={{ background: t.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium">
                      {t.label}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-500">
                      {t.description}
                    </span>
                  </span>
                  {isActive && (
                    <Check size={14} className="shrink-0 text-white" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parameters — per-type field scaffold. Concrete behavior lands when
// each type's details ship; today the fields are visible but disabled so
// reviewers can see the eventual shape of the form.
// ---------------------------------------------------------------------------

function ParametersSection({
  shape,
  onPatch: _onPatch,
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  if (!shape.zoneType) return null;
  const params = shape.zoneParams ?? {};
  return (
    <CollapsibleSection title="Parameters" defaultOpen>
      {shape.zoneType === 'noFly' && (
        <div className="grid grid-cols-2 gap-2">
          <ParamField label="Min altitude (m)" value={params.altitudeMin} suffix="m" />
          <ParamField label="Max altitude (m)" value={params.altitudeMax} suffix="m" />
        </div>
      )}
      {shape.zoneType === 'alarm' && (
        <div className="grid grid-cols-2 gap-2">
          <ParamField label="Active from" value={params.alarmStart} placeholder="HH:mm" />
          <ParamField label="Active to" value={params.alarmEnd} placeholder="HH:mm" />
        </div>
      )}
      {(shape.zoneType === 'restricted' || shape.zoneType === 'silent') && (
        <p className="rounded-md border border-dashed border-white/10 px-2.5 py-2 text-[11px] text-zinc-500">
          Parameters for this zone type are coming soon.
        </p>
      )}
    </CollapsibleSection>
  );
}

function ParamField({
  label,
  value,
  suffix,
  placeholder,
}: {
  label: string;
  value: number | string | undefined;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[12px] text-zinc-200">
        <input
          type="text"
          disabled
          value={value ?? ''}
          placeholder={placeholder ?? '—'}
          className="min-w-0 flex-1 bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none disabled:cursor-not-allowed"
        />
        {suffix && <span className="text-[10px] text-zinc-500">{suffix}</span>}
      </span>
    </label>
  );
}

const STROKE_MIN = 1;
const STROKE_MAX = 8;
const STROKE_DASHED_MAX = 4;
const STROKE_STEP = 0.5;
const STROKE_DEFAULT = 2;

// Single compact "Color" section that replaces the old Fill / Line
// pair. Two side-by-side chips (Fill / Outline) each open a
// `ColorPopover` — palette + native picker + hex input — and the
// section also owns the line-style picker and thickness slider so
// every visual control for the shape stroke / fill sits together.
function ColorSection({
  shape,
  fillMode,
  lineStyle,
  onPatch,
}: {
  shape: GeoShape;
  fillMode: GeoFillMode;
  lineStyle: GeoLineStyle;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  const fillColor = fillMode === 'none' ? null : shape.color;
  const outlineColor = lineStyle === 'none' ? null : (shape.strokeColor ?? shape.color);

  const disabled = lineStyle === 'none';
  const maxWeight = lineStyle === 'dashed' ? STROKE_DASHED_MAX : STROKE_MAX;
  const weight = Math.min(shape.strokeWidth ?? STROKE_DEFAULT, maxWeight);

  return (
    <CollapsibleSection title="Color" defaultOpen>
      {/* Row 1 — Fill / Outline chips */}
      <div className="grid grid-cols-2 gap-2">
        <ColorChip
          label="Fill"
          color={fillColor}
          onPick={(value) =>
            value === null
              ? onPatch({ fillMode: 'none' })
              : onPatch({ color: value, fillMode: 'fill' })
          }
        />
        <ColorChip
          label="Outline"
          color={outlineColor}
          onPick={(value) =>
            value === null
              ? onPatch({ lineStyle: 'none' })
              : onPatch({
                  strokeColor: value,
                  // Picking an outline color implies the shape should
                  // have a stroke — flip back to solid if it was None.
                  ...(lineStyle === 'none' ? { lineStyle: 'solid' } : null),
                })
          }
        />
      </div>

      {/* Divider — visual break between color chips and line controls
          (also satisfies the "divider above the Line section" ask). */}
      <hr className="border-t border-white/10" />

      {/* Row 2 — line style picker (Solid · Dashed · None) */}
      <SegmentedControl>
        {LINE_STYLES.map((mode) => (
          <SegmentButton
            key={mode.id}
            active={lineStyle === mode.id}
            onClick={() =>
              // Switching to dashed clamps an over-thick line back to the cap.
              onPatch(
                mode.id === 'dashed' && weight > STROKE_DASHED_MAX
                  ? { lineStyle: mode.id, strokeWidth: STROKE_DASHED_MAX }
                  : { lineStyle: mode.id },
              )
            }
          >
            <LineGlyph style={mode.id} />
            {mode.label}
          </SegmentButton>
        ))}
      </SegmentedControl>

      {/* Row 3 — thickness slider */}
      <div className="flex items-center gap-3 px-0.5">
        <Slider
          aria-label="Line thickness"
          value={[weight]}
          min={STROKE_MIN}
          max={maxWeight}
          step={STROKE_STEP}
          disabled={disabled}
          onValueChange={(v) => onPatch({ strokeWidth: v[0] })}
          className="flex-1"
        />
        <span
          className={`w-8 shrink-0 text-right text-[11px] tabular-nums ${
            disabled ? 'text-zinc-600' : 'text-zinc-400'
          }`}
        >
          {weight.toFixed(1)}
        </span>
      </div>
    </CollapsibleSection>
  );
}

// A named swatch with a hex label that opens the color picker popover.
// `color === null` means "transparent / none" and renders the crossed-out
// circle treatment.
function ColorChip({
  label,
  color,
  onPick,
}: {
  label: string;
  color: string | null;
  onPick: (color: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        {color === null ? (
          // Crossed-out circle marks the transparent / none state.
          <span className="grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-inset ring-white/30 text-zinc-300">
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
              <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="3.6" y1="12.4" x2="12.4" y2="3.6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        ) : (
          <span
            aria-hidden
            className="size-5 shrink-0 rounded-full ring-1 ring-inset ring-white/15"
            style={{ background: color }}
          />
        )}
        <span className="min-w-0 flex-1 truncate">
          <span className="block text-[11px] uppercase tracking-wide text-zinc-500">
            {label}
          </span>
          <span className="block text-[12px] font-medium text-white truncate">
            {color === null ? 'None' : color.toUpperCase()}
          </span>
        </span>
      </button>
      {open && (
        <ColorPopover
          value={color}
          onPick={(c) => {
            onPick(c);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

const COLOR_PALETTE: { id: string; label: string; value: string }[] = [
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'black', label: 'Black', value: '#000000' },
  { id: 'red', label: 'Red', value: '#f43f5e' },
  { id: 'orange', label: 'Orange', value: '#f59e0b' },
  { id: 'yellow', label: 'Yellow', value: '#facc15' },
  { id: 'green', label: 'Green', value: '#10b981' },
  { id: 'cyan', label: 'Cyan', value: '#06b6d4' },
  { id: 'blue', label: 'Blue', value: '#3b82f6' },
  { id: 'indigo', label: 'Indigo', value: '#6366f1' },
  { id: 'violet', label: 'Violet', value: '#a78bfa' },
];

// Popover with: Transparent button → palette grid → native color picker
// → hex text input. Closes on outside-click. Anchored under the chip.
function ColorPopover({
  value,
  onPick,
  onClose,
}: {
  value: string | null;
  onPick: (color: string | null) => void;
  onClose: () => void;
}) {
  // Hex input mirrors the popover's current value so the user can paste
  // an arbitrary hex without losing track of it. Live-commits on a valid
  // 6-char hex; otherwise just tracks the input state.
  const initial = value ?? '#ffffff';
  const [hex, setHex] = useState(initial);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocPointer = (e: PointerEvent) => {
      const node = rootRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer to the next tick so the click that opened us doesn't
    // immediately close us.
    const id = window.setTimeout(() => {
      window.addEventListener('pointerdown', onDocPointer);
      window.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pointerdown', onDocPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const commitHex = (raw: string) => {
    const cleaned = raw.trim().replace(/^#?/, '#');
    setHex(cleaned);
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) onPick(cleaned.toLowerCase());
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Pick a color"
      className="absolute z-40 mt-1.5 w-[228px] rounded-lg border border-white/10 bg-[#1c1c1c] p-2 shadow-xl shadow-black/40"
    >
      {/* Transparent / none */}
      <button
        type="button"
        onClick={() => onPick(null)}
        className={`mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
          value === null ? 'bg-white/[0.08] text-white' : 'text-white/75'
        }`}
      >
        <span className="grid size-5 place-items-center rounded-full ring-1 ring-inset ring-white/30 text-zinc-300">
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <line x1="3.6" y1="12.4" x2="12.4" y2="3.6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
        Transparent
      </button>

      {/* Palette grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {COLOR_PALETTE.map((sw) => {
          const active = value?.toLowerCase() === sw.value.toLowerCase();
          return (
            <button
              key={sw.id}
              type="button"
              aria-label={sw.label}
              title={sw.label}
              onClick={() => onPick(sw.value)}
              className={`size-7 rounded-full transition-[box-shadow,transform] active:scale-[0.94] focus-visible:outline-none ${
                active
                  ? 'ring-2 ring-white/85 ring-offset-2 ring-offset-[#1c1c1c]'
                  : 'ring-1 ring-inset ring-white/15 hover:ring-white/40'
              }`}
              style={{ background: sw.value }}
            />
          );
        })}
      </div>

      {/* Custom: native picker + hex input */}
      <div className="mt-3 flex items-center gap-2">
        <label
          className="relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full ring-1 ring-inset ring-white/15 hover:ring-white/40"
          title="Pick a custom color"
          style={{ background: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ffffff' }}
        >
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ffffff'}
            onChange={(e) => commitHex(e.target.value)}
            // Hide the native swatch but keep the input clickable to open
            // the OS color picker UI.
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom color"
          />
        </label>
        <input
          type="text"
          value={hex}
          onChange={(e) => commitHex(e.target.value)}
          spellCheck={false}
          inputMode="text"
          maxLength={7}
          aria-label="Hex color"
          placeholder="#000000"
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[12px] uppercase tracking-wider text-white outline-none placeholder:text-white/40 focus:border-white/30"
        />
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Segmented control matching the platform's neutral accent system (the
 * same white-wash active state the tool toggles and rail buttons use —
 * no off-brand violet). Concentric radius: outer `rounded-lg` (8px) with
 * `p-1` (4px) padding → inner `rounded` (4px).
 */
/**
 * Section with a chevron header that collapses its contents — the shared
 * dropdown pattern used by Coordinates / Color / Line / Layers.
 */
function CollapsibleSection({
  title,
  titleClassName,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  headerAction,
  children,
}: {
  title: string;
  /**
   * Optional override for the title's class — used by sections that
   * want to flag mandatory/required state (e.g. Type in red).
   */
  titleClassName?: string;
  defaultOpen?: boolean;
  /**
   * Controlled open state. When provided, the section becomes fully
   * controlled and `defaultOpen` is ignored — the parent owns the value
   * and must respond to `onOpenChange`.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Optional element rendered next to the chevron — used for inline
   * affordances like a "Clear" reset on a section's current value.
   * Pointer events stop here so a click doesn't toggle the section.
   */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp != null;
  const open = isControlled ? openProp : internalOpen;
  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  return (
    // `group` so the chevron can fade in on header hover/focus. When the
    // section is open we keep it visible (via the open: class) so the
    // user always knows there's a toggle there.
    <section className={`group space-y-2 ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none"
      >
        <span className={titleClassName ?? TYPE_GROUP_TITLE}>{title}</span>
        <span className="flex items-center gap-1.5">
          {headerAction && (
            <span onClick={(e) => e.stopPropagation()}>{headerAction}</span>
          )}
          <ChevronRight
            size={14}
            // Hover-only chevron: hidden at rest, fades in on hover or
            // keyboard focus, and stays visible once the section is open.
            className={`shrink-0 text-zinc-500 transition-[opacity,transform] ${
              open
                ? 'rotate-90 opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          />
        </span>
      </button>
      {open && children}
    </section>
  );
}

function SegmentedControl({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-1">
      {children}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded px-2 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
        active
          ? 'bg-white/[0.12] text-white ring-1 ring-inset ring-white/15'
          : 'text-white/65 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function LineGlyph({ style }: { style: GeoLineStyle }) {
  if (style === 'none') {
    return (
      <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden>
        <circle cx="10" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <line x1="6.5" y1="8.5" x2="13.5" y2="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden>
      <line
        x1="2"
        y1="5"
        x2="18"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={style === 'dashed' ? '3 2' : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

