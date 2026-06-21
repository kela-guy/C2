/**
 * Map-draw panel — inline-START docked panel that hosts the polygon /
 * line / curve tool picker and the inspector for the currently selected
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

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, LockOpen, RotateCcw, ChevronDown, Search, Trash2 } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import { DockedPanel } from '@/app/components/DockedPanel';
import { Toggle } from '@/shared/components/ui/toggle';
import {
  formatLatLng,
  type GeoAreaStatus,
  type GeoFillMode,
  type GeoLineStyle,
  type GeoShape,
} from '../geo-entities-sandbox/drawTypes';
import { SANDBOX_BOUNDS } from '../geo-entities-sandbox/fixtures';
import { deleteShapeWithUndo } from './deleteWithUndo';
import { CircleDrawIcon, CurveDrawIcon, LineDrawIcon, PolygonDrawIcon } from './icons';
import { useMapDraw, type MapDrawTool, type MapDrawContextValue } from './MapDrawProvider';

// Type scale kept in step with the sibling docked panels (Simulations /
// Flow Builder): Heebo only, no mono / uppercase / letter-tracking.
const TYPE_GROUP_TITLE = 'text-[11px] font-semibold text-zinc-400';

const STATUS_OPTIONS: { id: GeoAreaStatus; label: string; tone: string }[] = [
  { id: 'low', label: 'Low', tone: '#34d399' },
  { id: 'middle', label: 'Middle', tone: '#facc15' },
  { id: 'high', label: 'High', tone: '#f43f5e' },
];

const FILL_MODES: { id: GeoFillMode; label: string }[] = [
  { id: 'fill', label: 'Fill' },
  { id: 'transparent', label: 'Transparent' },
  { id: 'none', label: 'No fill' },
];

const LINE_STYLES: { id: GeoLineStyle; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'none', label: 'None' },
];

/** Single-row palette of accent hues (no black / white / grey). */
const PALETTE: string[] = [
  '#ef4444',
  '#fb923c',
  '#facc15',
  '#34d399',
  '#22d3ee',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
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
    toolsCollapsible: true,
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
}

export function MapDrawPanel({
  open,
  onClose,
  width,
  noTransition,
  variant: variantProp = 'original',
  lab = false,
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

      {toolsNode}

      <LayersSection draw={draw} defaultOpen={cfg.layersDefaultOpen} />

      {draw.draft ? (
        <DraftControls draw={draw} />
      ) : inspected ? (
        <ShapeInspector
          shape={inspected}
          onPatch={(patch) => draw.updateShape(inspected.id, patch)}
        />
      ) : null}
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
// Layers — searchable list of every drawn shape
// ---------------------------------------------------------------------------

function shapeLabel(shape: GeoShape): string {
  const named = (shape.description ?? '').trim();
  return named || shape.name || 'Untitled';
}

function LayersSection({
  draw,
  defaultOpen = false,
}: {
  draw: MapDrawContextValue['draw'];
  defaultOpen?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(defaultOpen);
  // Variant flips can change the default-open intent at runtime (lab
  // mode); honour the new default whenever it changes so flipping a
  // variant flips the section state.
  useEffect(() => setOpen(defaultOpen), [defaultOpen]);

  if (draw.shapes.length === 0) return null;

  const q = query.trim().toLowerCase();
  const matches = draw.shapes.filter((s) =>
    q === '' ? true : shapeLabel(s).toLowerCase().includes(q),
  );

  return (
    <section className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none"
      >
        <span className={`${TYPE_GROUP_TITLE} flex min-w-0 items-center`}>
          <span className="truncate">Layers</span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search layers by name"
              className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 pl-8 pr-2.5 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-white/30"
            />
          </div>

          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {matches.length === 0 ? (
              <li className="px-1 py-2 text-[12px] text-zinc-500">No layers match “{query}”.</li>
            ) : (
              matches.map((s) => (
                <LayerRow
                  key={s.id}
                  shape={s}
                  active={s.id === draw.selectedId}
                  onSelect={() => draw.setSelectedId(s.id)}
                  onRename={(name) => draw.updateShape(s.id, { description: name })}
                  onToggleHidden={() => draw.updateShape(s.id, { hidden: !s.hidden })}
                  onToggleLocked={() => draw.updateShape(s.id, { locked: !s.locked })}
                  onDelete={() => deleteShapeWithUndo(draw, s.id)}
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
  onSelect,
  onRename,
  onToggleHidden,
  onToggleLocked,
  onDelete,
}: {
  shape: GeoShape;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_OPTIONS.find((o) => o.id === shape.status);
  const [editing, setEditing] = useState(false);
  return (
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
  { id: 'curve', label: 'Curve', Icon: CurveDrawIcon },
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
      <StatusField shape={shape} onPatch={onPatch} />
      <CoordinatesSection shape={shape} />
      <FillSection shape={shape} fillMode={fillMode} onPatch={onPatchGuarded} />
      <LineSection
        lineStyle={lineStyle}
        color={shape.strokeColor ?? shape.color}
        onPatch={onPatchGuarded}
      />
    </div>
  );
}

function CoordinatesSection({ shape }: { shape: GeoShape }) {
  const [open, setOpen] = useState(false);

  // Circles are located by their center; everything else lists vertices.
  const rows: { label: string; value: string }[] =
    shape.kind === 'circle'
      ? (() => {
          const a = shape.points[0] ?? { x: 0.5, y: 0.5 };
          const b = shape.points[1] ?? a;
          const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return [{ label: 'Center', value: formatLatLng(center, SANDBOX_BOUNDS) }];
        })()
      : shape.points.map((p, i) => ({
          label: String(i + 1),
          value: formatLatLng(p, SANDBOX_BOUNDS),
        }));

  return (
    <section className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none"
      >
        <span className={TYPE_GROUP_TITLE}>Coordinates</span>
        <ChevronDown
          size={14}
          className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="space-y-1 rounded-lg bg-white/[0.03] p-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="tabular-nums text-zinc-500">{r.label}</span>
              <span className="tabular-nums text-zinc-200">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusField({
  shape,
  onPatch,
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  return (
    <CollapsibleSection title="Area status">
      <SegmentedControl>
        {STATUS_OPTIONS.map((opt) => {
          const active = shape.status === opt.id;
          return (
            <SegmentButton
              key={opt.id}
              active={active}
              // Click the active option again to clear the status.
              onClick={() => onPatch({ status: active ? undefined : opt.id })}
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: opt.tone }}
              />
              {opt.label}
            </SegmentButton>
          );
        })}
      </SegmentedControl>
    </CollapsibleSection>
  );
}

function FillSection({
  shape,
  fillMode,
  onPatch,
}: {
  shape: GeoShape;
  fillMode: GeoFillMode;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  return (
    <CollapsibleSection title="Color">
      <SegmentedControl>
        {FILL_MODES.map((mode) => (
          <SegmentButton
            key={mode.id}
            active={fillMode === mode.id}
            onClick={() => onPatch({ fillMode: mode.id })}
          >
            {mode.label}
          </SegmentButton>
        ))}
      </SegmentedControl>

      <div className="flex items-center gap-1">
        {PALETTE.map((hex) => {
          const active = shape.color.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              aria-pressed={active}
              onClick={() => onPatch({ color: hex })}
              className={`size-6 rounded-full transition-[box-shadow,transform] active:scale-[0.94] focus-visible:outline-none ${
                active
                  ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1c1c1c]'
                  : 'ring-1 ring-inset ring-white/15 hover:ring-white/40'
              }`}
              style={{ background: hex }}
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

function LineSection({
  lineStyle,
  color,
  onPatch,
}: {
  lineStyle: GeoLineStyle;
  color: string;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  return (
    <CollapsibleSection title="Line">
      <SegmentedControl>
        {LINE_STYLES.map((mode) => (
          <SegmentButton
            key={mode.id}
            active={lineStyle === mode.id}
            onClick={() => onPatch({ lineStyle: mode.id })}
          >
            <LineGlyph style={mode.id} />
            {mode.label}
          </SegmentButton>
        ))}
      </SegmentedControl>

      <div className="flex items-center gap-1">
        {PALETTE.map((hex) => {
          const active = color.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              aria-label={`Line ${hex}`}
              aria-pressed={active}
              onClick={() => onPatch({ strokeColor: hex })}
              className={`size-6 rounded-full transition-[box-shadow,transform] active:scale-[0.94] focus-visible:outline-none ${
                active
                  ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1c1c1c]'
                  : 'ring-1 ring-inset ring-white/15 hover:ring-white/40'
              }`}
              style={{ background: hex }}
            />
          );
        })}
      </div>
    </CollapsibleSection>
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
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none"
      >
        <span className={TYPE_GROUP_TITLE}>{title}</span>
        <ChevronDown
          size={14}
          className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
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

