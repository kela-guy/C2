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

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Search,
  Trash2,
  Plus,
  Download,
  MapPin,
} from '@/lib/icons/central';
import {
  CircleDrawIcon,
  LineDrawIcon,
  PolygonDrawIcon,
} from './icons';
import { useStrings } from '@/lib/intl';
import { DockedPanel } from '@/app/components/DockedPanel';
import { DirIsland } from '@/lib/direction/DirIsland';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/app/components/ui/context-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
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
import {
  useMapDraw,
  type MapDrawContextValue,
  type MapDrawTool,
} from './MapDrawProvider';
import type { UseGeoDrawResult } from '../geo-entities-sandbox/useGeoDraw';
import { getZOrderActions, type ShapeAction } from './shapeActions';

// Type scale kept in step with the sibling docked panels (Simulations /
// Flow Builder): Heebo only, no mono / uppercase / letter-tracking.
const TYPE_GROUP_TITLE = 'text-[11px] font-semibold text-zinc-400';

const STATUS_OPTIONS: { id: GeoAreaStatus; label: string; tone: string }[] = [
  { id: 'low', label: 'Low', tone: '#34d399' },
  { id: 'middle', label: 'Middle', tone: '#facc15' },
  { id: 'high', label: 'High', tone: '#f43f5e' },
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

interface VariantConfig {
  layersDefaultOpen: boolean;
}

// Tool-picker fields used to live here too, but with tools moved into the
// floating `MapDrawToolbar` only the Layers default-open state still varies
// between lab variants. The variant prop and switcher are kept for the lab
// route so reviewers can keep comparing the historical designs side by
// side; in production they all collapse to the same panel chrome.
const VARIANT_CONFIG: Record<MapDrawPanelVariant, VariantConfig> = {
  original: { layersDefaultOpen: false },
  opt2: { layersDefaultOpen: true },
  opt3: { layersDefaultOpen: true },
  opt5: { layersDefaultOpen: true },
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
  // `draw.selectedShape` is no longer read here: the new view machine
  // is driven entirely by `pendingShapeId` so a regular click-select
  // never opens the editor — only a freshly-drawn (staged) shape does.

  // In lab mode the variant is user-controlled (via the switcher); in
  // production it's a fixed prop. We re-seed local state whenever the
  // prop changes so the parent can still force a variant.
  const [variant, setVariant] = useState<MapDrawPanelVariant>(variantProp);
  useEffect(() => setVariant(variantProp), [variantProp]);
  // VARIANT_CONFIG only carried `layersDefaultOpen`, which is no longer
  // consulted since the search input is now always visible and the
  // Geo Entities list is always expanded. Kept around as the live
  // variant string so the lab switcher still has something to drive.
  void VARIANT_CONFIG[variant];

  // Type-panel lab state. Only consulted when `typeLab` is on; we still
  // hold it unconditionally so the hook order is stable across renders.
  const [typeVariant, setTypeVariant] = useState<TypePanelVariant>('opt1');
  // Mock shape that backs the always-visible Type preview block — lets
  // reviewers compare the 5 layouts (and pick a zone) before drawing
  // anything. Independent of `draw.shapes` so it survives a reset.
  const [previewShape, setPreviewShape] = useState<GeoShape>(() =>
    makePreviewShape(),
  );

  // Two-view state machine driven by `pendingShapeId`:
  //
  //   pendingShapeId !== null  -> view B (Draft detail + Save / Cancel
  //                                footer; Layers list hidden)
  //   pendingShapeId === null  -> view A (Layers list / empty state +
  //                                "Pick a tool" CTA footer)
  //
  // The pending shape is the only "inspected" shape in view B. Once
  // the user Saves or Cancels we drop back into view A.
  const pendingShape = draw.pendingShapeId
    ? (draw.shapes.find((s) => s.id === draw.pendingShapeId) ?? null)
    : null;
  const inspected = pendingShape;

  // Removed: the previous version auto-armed Polygon when the panel
  // opened. The new flow forces the user to deliberately pick a tool
  // via the in-panel "Pick a tool" CTA, so we leave the tool null.

  return (
    <DockedPanel
      open={open}
      onClose={onClose}
      side="start"
      width={width}
      noTransition={noTransition}
      dataHandoff="map-draw-panel"
      title={
        <DirIsland as="span" direction="ltr" className="block">
          {inspected ? (
            // Detail view — render a back arrow on the LEFT so the user
            // can return to the Geo Entities list without having to use
            // the footer Cancel button. Tapping it calls `cancelPending`,
            // which for a brand-new draft hard-deletes the shape and for
            // an existing-shape edit (`pendingIsNew === false`) just
            // closes the editor.
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => draw.cancelPending()}
                aria-label="Back to Geo Entities"
                title="Back to Geo Entities"
                className="-ms-1 grid size-6 shrink-0 place-items-center rounded text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="truncate text-sm font-semibold">Geo Entities</h2>
            </span>
          ) : (
            <h2 className="text-sm font-semibold truncate">Geo Entities</h2>
          )}
        </DirIsland>
      }
      closeAriaLabel={closeLabel}
      bodyClassName="px-4 py-3"
      // Raise above the screen-space drawing overlay (z-20) so the panel
      // and its tool buttons stay clickable and aren't covered by shapes.
      className="z-30"
    >
      {/* All copy in the panel is English-only (section titles, field
          labels, layer names typed by users). Pin the entire body to LTR
          via `DirIsland` so the headings read in their natural order and
          logical CSS utilities (`ms-*`, `text-start`) anchor on the left
          regardless of the app's global Hebrew direction.

          A full-height flex column lets the active branch (LayersView /
          DraftDetailView / DraftControls) expand to fill the body, which
          in turn lets the in-branch CTA / Save-Cancel footer pin against
          the actual bottom of the panel rather than floating mid-body
          when the list above it is short. */}
      <DirIsland direction="ltr" className="flex h-full flex-col gap-5">
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

      {/* Three render branches, gated on the draw state machine:
          1. `draw.draft` in flight   -> DraftControls only (Finish / Reset)
          2. `pendingShape` staged   -> view B: full editor + Save/Cancel
          3. otherwise                -> view A: Geo Entities list + Pick-a-tool CTA

          The wrapper is `flex flex-1 min-h-0 flex-col` so each branch
          owns the panel's full vertical space — that's what lets the
          footers in views A / B pin to the panel bottom on a short list. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {draw.draft ? (
          <DraftControls draw={draw} />
        ) : inspected ? (
          <DraftDetailView
            shape={inspected}
            draw={draw}
            typeLab={typeLab}
            typeVariant={typeVariant}
          />
        ) : (
          <LayersView
            draw={draw}
            drawTool={drawTool}
            setDrawTool={setDrawTool}
          />
        )}
      </div>
      </DirIsland>
    </DockedPanel>
  );
}

// ---------------------------------------------------------------------------
// View B: Draft detail
//
// Shown while a shape is staged (`pendingShapeId` set on the draw
// engine). Hosts the per-shape editor stack — Name, Type, Coordinates,
// Color — and a sticky Save / Cancel footer. Save is gated on
// `description.trim()` being non-empty so the user always commits a
// named shape; Cancel discards the shape entirely (no undo toast).
// The Layers list is intentionally not rendered here: the user is in
// "finish this shape" mode, not "review the project" mode.
// ---------------------------------------------------------------------------

function DraftDetailView({
  shape,
  draw,
  typeLab,
  typeVariant,
}: {
  shape: GeoShape;
  draw: UseGeoDrawResult;
  typeLab: boolean;
  typeVariant: TypePanelVariant;
}) {
  const canSave = shape.description.trim().length > 0;
  return (
    // Full-height flex column — scrollable editor stack on top, pinned
    // Save / Cancel footer at the bottom. The parent (panel body) hands
    // us the full vertical space so the footer always sits flush
    // against the panel's bottom edge.
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-1 min-h-0 flex-col gap-5 overflow-y-auto pb-3">
        <NameField
          key={`name-${shape.id}`}
          shape={shape}
          onPatch={(patch) => draw.updateShape(shape.id, patch)}
          autoFocus={draw.lastCommittedId === shape.id}
          onAutoFocusConsumed={draw.clearLastCommittedId}
        />
        <TypeField
          shape={shape}
          onPatch={(patch) => draw.updateShape(shape.id, patch)}
          variant={typeLab ? typeVariant : undefined}
          chrome="plain"
        />
        <CoordinatesSection
          shape={shape}
          onPatch={(patch) => draw.updateShape(shape.id, patch)}
        />
        <hr className="border-t border-white/10" />
        <ColorSection
          shape={shape}
          onPatch={(patch) => draw.updateShape(shape.id, patch)}
        />
      </div>

      {/* Save / Cancel footer pinned to the panel bottom via the flex
          layout above (not `sticky`). Save is disabled when the shape
          has no name — empty names slip through the project too
          easily otherwise. */}
      <div className="-mx-4 -mb-3 shrink-0 flex items-center justify-end gap-2 border-t border-white/10 bg-[#161616]/95 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => draw.cancelPending()}
          className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => draw.savePending()}
          title={canSave ? 'Save shape' : 'Name is required'}
          className="rounded-md border border-transparent bg-white px-3 py-1.5 text-[12px] font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View A: Layers + Pick-a-tool
//
// The default panel view. Renders the project-wide Layers list (or a
// centered empty-state callout when there are none) and a sticky
// "Pick a tool" footer that arms the drawing engine. The four tools
// surfaced in the popover are Polygon, Line, Circle, and Point —
// matching the canonical drawing primitives. Selecting a tool kicks
// the user straight into draw mode; the panel then transitions to
// view B once the geometry is complete.
// ---------------------------------------------------------------------------

/**
 * Tool entries surfaced in the "Pick a tool" popover. The icon column
 * mirrors the leading-glyph treatment on each Geo Entities row so the
 * user reads "pick this shape" -> "row carries the same icon" without
 * a translation step.
 */
const PICK_TOOL_OPTIONS: {
  id: MapDrawTool;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'polygon', label: 'Polygon', Icon: PolygonDrawIcon },
  { id: 'line', label: 'Line', Icon: LineDrawIcon },
  { id: 'circle', label: 'Circle', Icon: CircleDrawIcon },
  { id: 'point', label: 'Point', Icon: MapPin },
];

function LayersView({
  draw,
  drawTool,
  setDrawTool,
}: {
  draw: UseGeoDrawResult;
  drawTool: MapDrawTool | null;
  setDrawTool: (tool: MapDrawTool | null) => void;
}) {
  const [pickOpen, setPickOpen] = useState(false);
  // Search query lives here (lifted out of LayersSection) so the input
  // can render unconditionally at the top of the view — the reference
  // shows it as an always-visible field rather than a magnifier toggle.
  const [query, setQuery] = useState('');
  const hasLayers = draw.shapes.length > 0;
  return (
    // Full-height flex column so the CTA footer pins to the panel
    // bottom regardless of how short the list above it is. The list
    // region takes the remaining space and scrolls internally.
    <div className="flex h-full min-h-0 flex-col">
      {/* Always-visible search input — promoted out of the inner
          Layers subheader and into the view header. Disabled when
          there are no entities to filter so the placeholder still
          reads as the "look here to search" affordance once the user
          starts adding shapes. */}
      {hasLayers && (
        <div className="mb-3 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-white/45"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or entity"
              aria-label="Search geo entities by name or entity"
              className="w-full rounded-md border border-white/10 bg-white/[0.04] py-1.5 ps-8 pe-2.5 text-[12.5px] text-white placeholder:text-white/40 outline-none focus:border-white/30 focus:bg-white/[0.08]"
            />
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto pb-3">
        {hasLayers ? (
          <LayersSection draw={draw} query={query} />
        ) : (
          // Centered empty-state callout — fills the list region so the
          // copy sits in the visual middle of the panel rather than
          // collapsing against the section header.
          <div className="flex h-full items-center justify-center px-2 text-center">
            <p className="max-w-[28ch] text-[12.5px] leading-relaxed text-zinc-400">
              Pick a tool from the bottom of this panel, then click to start
              drawing. The shape&apos;s details show up here once it&apos;s placed.
            </p>
          </div>
        )}
      </div>

      {/* Footer hosting the "Pick a tool" Popover. Pinned to the panel
          bottom via the flex layout above (not `sticky`, since the
          parent column gives us a real bottom edge). Styled as a solid
          primary CTA — full-width accent fill, centered label,
          chevron-down — matching the product reference's primary CTA. */}
      <div className="-mx-4 -mb-3 shrink-0 border-t border-white/10 bg-[#161616]/95 px-4 py-3 backdrop-blur-md">
        <Popover open={pickOpen} onOpenChange={setPickOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-info px-3 py-2.5 text-[12.5px] font-semibold text-slate-1 shadow-sm transition-colors hover:bg-accent-info/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info/50"
            >
              <span>
                {drawTool
                  ? `Drawing: ${
                      PICK_TOOL_OPTIONS.find((t) => t.id === drawTool)?.label ??
                      drawTool
                    }`
                  : 'Add a Geo Entity'}
              </span>
              <ChevronDown size={15} className="text-slate-1/80" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            className="w-[var(--radix-popover-trigger-width)] border-white/10 bg-[#1a1a1a]/95 p-1 text-white backdrop-blur-xl"
          >
            <ul role="listbox" aria-label="Geo entity tool">
              {PICK_TOOL_OPTIONS.map((opt) => {
                const isActive = drawTool === opt.id;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setDrawTool(opt.id);
                        setPickOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12.5px] transition-colors focus-visible:outline-none ${
                        isActive
                          ? 'bg-white/[0.10] text-white'
                          : 'text-zinc-200 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <opt.Icon size={15} className="text-white/75" />
                        <span>{opt.label}</span>
                      </span>
                      {isActive && <Check size={14} className="text-white" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </div>
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
// Geo Entities — searchable list of every drawn shape
// ---------------------------------------------------------------------------

function shapeLabel(shape: GeoShape): string {
  const named = (shape.description ?? '').trim();
  return named || shape.name || 'Untitled';
}

/**
 * Shape-kind glyph — surfaced both on each Geo Entities row (to make the
 * list scannable at a glance: triangle for polygon, slash for line,
 * etc.) and in the "Pick a tool" popover (one glyph per tool option).
 *
 * `tool` is consulted as a fallback because `polyline` covers BOTH the
 * straight-line and arrow tools at the engine level — without it the
 * arrow tool's rows would still read as a plain line glyph. Returning
 * `LineDrawIcon` for arrows is intentional: the arrow's directional cue
 * lives on the shape itself, not on the row icon.
 */
function ShapeKindIcon({
  kind,
  tool,
  size = 15,
  className,
}: {
  kind: GeoShape['kind'];
  tool?: GeoShape['tool'];
  size?: number;
  className?: string;
}) {
  if (kind === 'circle') return <CircleDrawIcon size={size} className={className} />;
  if (kind === 'point') return <MapPin size={size} className={className} />;
  if (kind === 'polyline') return <LineDrawIcon size={size} className={className} />;
  // polygon | freehand — both render as the polygon glyph (freehand is a
  // closed irregular polygon at the engine level).
  void tool;
  return <PolygonDrawIcon size={size} className={className} />;
}

function LayersSection({
  draw,
  query = '',
}: {
  draw: MapDrawContextValue['draw'];
  /**
   * Filter substring driven by the always-visible search input in the
   * parent `LayersView`. Empty string means "no filter".
   */
  query?: string;
}) {
  if (draw.shapes.length === 0) return null;

  const q = query.trim().toLowerCase();
  const matches = draw.shapes.filter((s) =>
    q === '' ? true : shapeLabel(s).toLowerCase().includes(q),
  );

  return (
    // Subheader and magnifier toggle removed — the panel-level title
    // already says "Geo Entities" and the search input now lives at
    // the top of `LayersView` as an always-visible field. This
    // section is just the list now.
    <ul className="space-y-1.5">
      {matches.length === 0 ? (
        <li className="px-1 py-2 text-[12px] text-zinc-500">
          No entities match “{query}”.
        </li>
      ) : (
        matches.map((s) => (
          <LayerRow
            key={s.id}
            shape={s}
            zOrderActions={getZOrderActions(draw, s.id)}
            onToggleHidden={() => draw.updateShape(s.id, { hidden: !s.hidden })}
            onToggleLocked={() => draw.updateShape(s.id, { locked: !s.locked })}
            onDelete={() => deleteShapeWithUndo(draw, s.id)}
            onEdit={() => draw.beginEditShape(s.id)}
          />
        ))
      )}
    </ul>
  );
}

function LayerRow({
  shape,
  zOrderActions,
  onToggleHidden,
  onToggleLocked,
  onDelete,
  onEdit,
}: {
  shape: GeoShape;
  zOrderActions: ShapeAction[];
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onDelete: () => void;
  /** Open the Draft-detail editor for this shape. */
  onEdit: () => void;
}) {
  const status = STATUS_OPTIONS.find((o) => o.id === shape.status);
  // Bridge the row hover state to the shared map-draw context so the
  // overlay can paint a highlight halo on the matching shape. Keyboard
  // focus is also surfaced so tab-through the list highlights too.
  // Also *read* the hover state so the row brightens whenever its
  // shape is hovered on the map — symmetric with hovering the row.
  const { hoveredShapeId, setHoveredShapeId } = useMapDraw();
  const hovered = hoveredShapeId === shape.id;
  // Open the detail editor for this row's shape and proactively drop
  // the hovered marker from the context. The row unmounts on transition
  // and React doesn't reliably fire `pointerleave` on an unmounting
  // node, so without this the map-side fill overlay can stick around
  // on the freshly-edited shape.
  const openDetail = useCallback(() => {
    setHoveredShapeId(null);
    onEdit();
  }, [onEdit, setHoveredShapeId]);
  // Keep Eye / Lock / Trash from also triggering the card's `openDetail`
  // — the bottom-row toggles are local actions, not navigation.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          onClick={openDetail}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openDetail();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`Open ${shapeLabel(shape)}`}
          onMouseEnter={() => setHoveredShapeId(shape.id)}
          onMouseLeave={() => setHoveredShapeId(null)}
          onFocus={() => setHoveredShapeId(shape.id)}
          onBlur={() => setHoveredShapeId(null)}
          className={`group flex cursor-pointer flex-col gap-1.5 rounded-md border px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
            hovered
              ? 'border-white/15 bg-white/[0.08]'
              : 'border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'
          }`}
        >
          {/* Top row — shape-kind glyph + name + Trash. The whole row
              opens the detail editor on click; Trash stops propagation
              so the delete action doesn't double-fire as "open then
              delete". The name renders as a span (not an input) — the
              user edits it inside the detail panel where the name
              field is the canonical home. */}
          <div className="flex items-center gap-2">
            <span
              className="grid size-5 shrink-0 place-items-center text-white/70"
              aria-hidden
            >
              <ShapeKindIcon kind={shape.kind} tool={shape.tool} size={15} />
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-[13px] font-medium ${
                shape.hidden ? 'text-white/40' : 'text-zinc-100'
              }`}
            >
              {shapeLabel(shape)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onDelete();
              }}
              aria-label="Delete layer"
              title="Delete layer"
              className="grid size-6 shrink-0 place-items-center rounded text-white/45 transition-colors hover:bg-rose-500/20 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Bottom row — Eye + Lock toggles + status dot. Always
              visible so the user can flip visibility / lock state from
              the card without opening the detail editor. Each button
              stops the click from bubbling to the card-level handler. */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onToggleHidden();
              }}
              aria-label={shape.hidden ? 'Show layer' : 'Hide layer'}
              title={shape.hidden ? 'Show layer' : 'Hide layer'}
              className="grid size-6 shrink-0 place-items-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              {shape.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onToggleLocked();
              }}
              aria-label={shape.locked ? 'Unlock layer' : 'Lock layer'}
              title={shape.locked ? 'Unlock layer' : 'Lock layer'}
              aria-pressed={!!shape.locked}
              className={`grid size-6 shrink-0 place-items-center rounded transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                shape.locked ? 'text-white' : 'text-white/45'
              }`}
            >
              {shape.locked ? <Lock size={14} /> : <LockOpen size={14} />}
            </button>
            {status && (
              <span
                className="ms-1 size-2 shrink-0 rounded-full ring-1 ring-inset ring-white/20"
                style={{ background: status.tone }}
                title={`Status: ${status.label}`}
                aria-label={`Status: ${status.label}`}
              />
            )}
          </div>
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
// Name field — first row of the inspector. Auto-focuses + selects its
// input the moment a fresh shape is committed (driven by
// `draw.lastCommittedId`) so the user can start typing the shape's name
// without an extra click. Acts as the canonical home for the shape name;
// the Layers row no longer pops into rename mode on commit.
// ---------------------------------------------------------------------------

function NameField({
  shape,
  onPatch,
  autoFocus,
  onAutoFocusConsumed,
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
  /** Focus + select the input on mount (and on transitions to true). */
  autoFocus: boolean;
  /** Called once the auto-focus has been handled so the parent can clear it. */
  onAutoFocusConsumed?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  // "Needs attention" — true the moment this field is auto-focused after
  // a draw commit, and stays true until the user starts typing or hits
  // Enter. While true, the input wears an orange ring so it reads as
  // "this is the next thing to do". The state is local (not derived
  // from props) because we want it to survive past the one-tick
  // `autoFocus` signal that triggers it.
  const [needsAttention, setNeedsAttention] = useState(autoFocus);

  // Live commit: every keystroke patches the shape directly. The user
  // asked for the Save button to light up the moment they start typing
  // (rather than requiring an Enter / blur first). Save is gated on
  // `shape.description.trim().length > 0` in the parent, so binding the
  // input straight to `shape.description` and patching on each change
  // gives Save its real-time-enabled behavior.
  const stored = shape.description ?? '';

  // Pop the caret into the input whenever the auto-focus marker fires.
  // Runs in an effect (not at render time) so we can call back to clear
  // the signal in the same tick — otherwise the next render would try to
  // re-steal focus from anything the user has tabbed into.
  useEffect(() => {
    if (!autoFocus) return;
    const el = inputRef.current;
    if (!el) return;
    setNeedsAttention(true);
    // Defer one frame so the focus call lands after the panel's open
    // transition settles; otherwise the browser may swallow the caret
    // when the surrounding panel is still animating in.
    const id = window.requestAnimationFrame(() => {
      el.focus();
      el.select();
    });
    onAutoFocusConsumed?.();
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // Borderless, transparent name field — reads as "the title is right
  // there, just click and type". The user explicitly didn't want a
  // bordered input box around the name; the caret + spell-check is the
  // only chrome we keep. The attention treatment still draws a hairline
  // orange ring so a freshly-committed shape calls itself out, but the
  // base state is pure text-on-panel.
  const baseClass =
    'w-full rounded-md border border-transparent bg-transparent px-0 py-1 text-[15px] font-medium text-white placeholder:text-white/35 outline-none transition-colors';
  const attentionClass = needsAttention
    ? 'ring-[0.5px] ring-orange-400/80 focus:ring-orange-400/80'
    : 'focus:bg-white/[0.04]';

  return (
    <section className="space-y-2">
      <span className={`${TYPE_GROUP_TITLE} block`}>Name</span>
      <input
        ref={inputRef}
        type="text"
        value={stored}
        onChange={(e) => {
          // Live commit — patches the shape on every keystroke so Save
          // lights up the moment the first character is typed.
          if (needsAttention) setNeedsAttention(false);
          onPatch({ description: e.target.value });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Already committed live; Enter just dismisses the caret
            // and clears the attention ring.
            e.preventDefault();
            setNeedsAttention(false);
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        placeholder="Add name"
        aria-label="Shape name"
        spellCheck={false}
        className={`${baseClass} ${attentionClass}`}
      />
    </section>
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

// Display format for a single coordinate value — fixed to 5 decimal
// places so each row reads as e.g. "33.36742°, -118.40625°", matching
// the reference. Lower precision than the on-map vertex chips on
// purpose: those are pixel-anchored and need more sig-figs, the panel
// row is a textual readout.
const COORD_DECIMALS = 5;

const formatPair = (lat: number, lng: number) =>
  `${lat.toFixed(COORD_DECIMALS)}°, ${lng.toFixed(COORD_DECIMALS)}°`;

// Accept "lat, lng" with optional degree symbols, signs, and whitespace.
// Anything else (NaN, extra tokens, missing comma) is rejected and the
// row reverts to its formatted display value on blur / Enter.
const COORD_PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*°?\s*,\s*(-?\d+(?:\.\d+)?)\s*°?\s*$/;

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
  const display = formatPair(lat, lng);

  // Local draft so half-typed strings don't round-trip through
  // project/unproject and clobber the user's keystrokes. We only push to
  // the parent on a successful parse at commit time (Enter / blur).
  const [draft, setDraft] = useState(display);
  const [focused, setFocused] = useState(false);

  // Keep the draft in sync with the shape's authoritative value whenever
  // the input isn't actively being edited — covers the case where the
  // user drags a vertex chip on the map and we want the row to reflect
  // the new coordinates immediately.
  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  const commit = () => {
    const match = COORD_PAIR.exec(draft);
    if (!match) {
      setDraft(display);
      return;
    }
    const nextLat = parseFloat(match[1]);
    const nextLng = parseFloat(match[2]);
    if (
      Number.isNaN(nextLat) ||
      Number.isNaN(nextLng) ||
      nextLat < -90 ||
      nextLat > 90 ||
      nextLng < -180 ||
      nextLng > 180
    ) {
      setDraft(display);
      return;
    }
    onChange(project({ lat: nextLat, lng: nextLng }, SANDBOX_BOUNDS));
  };

  return (
    <li className="group flex items-center gap-1.5">
      <span
        aria-hidden
        title="Drag to reorder"
        className="grid size-5 shrink-0 cursor-grab place-items-center text-white/35 transition-colors group-hover:text-white/60 active:cursor-grabbing"
      >
        <GripDotsIcon size={14} />
      </span>
      <input
        type="text"
        value={draft}
        inputMode="decimal"
        spellCheck={false}
        aria-label={`Coordinates ${label}`}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(display);
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] tabular-nums text-zinc-100 outline-none transition-colors focus:border-white/30 focus:bg-white/[0.08]"
      />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove point ${label}`}
          title="Remove point"
          className="grid size-7 shrink-0 place-items-center rounded text-white/45 transition-colors hover:bg-rose-500/15 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <Trash2 size={14} />
        </button>
      ) : (
        // Reserve trash slot so single-point rows (circle Center, polylines
        // at min-length) stay aligned with their multi-point siblings.
        <span aria-hidden className="size-7 shrink-0" />
      )}
    </li>
  );
}

// 6-dot drag handle — Central Icons doesn't ship a `GripVertical`
// equivalent, and the project's `no-restricted-imports` lock keeps
// lucide-react out of feature files, so we inline the SVG locally.
function GripDotsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="6" cy="3.25" r="1.1" />
      <circle cx="10" cy="3.25" r="1.1" />
      <circle cx="6" cy="8" r="1.1" />
      <circle cx="10" cy="8" r="1.1" />
      <circle cx="6" cy="12.75" r="1.1" />
      <circle cx="10" cy="12.75" r="1.1" />
    </svg>
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
  // Type pick ONLY records the semantic zone type — never re-colors
  // the shape and never moves focus. The previous Name -> Type and
  // Type -> Color auto-focus hand-offs were removed: type now defaults
  // to "General" and changing it is a manual, opt-in step.
  const pick = (id: GeoZoneType, _color: string) => {
    onPatch({ zoneType: id });
  };

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

  // Required indicator now lives INSIDE the dropdown trigger (see
  // TypeVariantDropdown), so the section heading reads clean — just
  // "Type" without an extra pill competing with the field below.
  if (chrome === 'plain') {
    return (
      <section className="space-y-2">
        <span className={`${TYPE_GROUP_TITLE} block`}>Type</span>
        {body}
      </section>
    );
  }

  return (
    <CollapsibleSection title="Type" defaultOpen>
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
  // "General" is the implicit default — it's a real, valid type so we
  // never treat it as "missing"; missing only means the shape carries
  // no zoneType at all (legacy shapes from before this change).
  const isMissing = !active;
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
        {/* Color swatch removed — types no longer surface their signature
            color in the trigger; the label alone is the identity. */}
        {active ? (
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white">
            {active.label}
          </span>
        ) : (
          // Empty state: grey placeholder that turns white the moment
          // the user engages the trigger (hover / focus / open). The
          // chevron stays visible while `isMissing` (see below) so the
          // mandatory affordance still reads without a "Required" word.
          <span
            className={`min-w-0 flex-1 truncate text-[12px] font-medium transition-colors ${
              open
                ? 'text-white'
                : 'text-zinc-500 group-hover:text-white group-focus-within:text-white'
            }`}
          >
            Choose a zone type
          </span>
        )}
        <ChevronRight
          size={14}
          className={`shrink-0 text-zinc-400 transition-[opacity,transform] ${
            // Keep the chevron visible when the field still needs an
            // answer so the affordance reads from the start; once a
            // type is set, fall back to the hover-only reveal.
            isMissing
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          } ${open ? 'rotate-90 opacity-100' : ''}`}
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
                  {/* Per-option color swatch removed for the same reason as
                      the trigger swatch above. */}
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Section with a chevron header that collapses its contents — the shared
 * dropdown pattern used by Coordinates / Type / Layers.
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

// ---------------------------------------------------------------------------
// Color section — two independent chips: Fill (mutates only `color` +
// `fillMode`) and Outline (mutates only `strokeColor` + `lineStyle`).
//
// Why this matters: the visible line stroke falls back to `color` when
// `strokeColor` is undefined (see `MapDrawOverlay`'s `ShapeBody`). To keep
// fill and outline truly independent, we always write `strokeColor`
// explicitly on commit and on each Outline-pick, and we never touch
// `strokeColor` from the Fill chip. Picking a Type (`zoneType`) likewise
// leaves both colors untouched — the user picks colors themselves.
// ---------------------------------------------------------------------------

// Stroke-width clamps. Dashed strokes are capped lower so the dash
// rhythm stays legible — bumping a dashed line past ~4 px reads as
// uneven blobs rather than a proper dash. Minimum is 0.5 px (hairline)
// to match the default white outline new shapes ship with.
const STROKE_MIN = 0.5;
const STROKE_MAX = 8;
const STROKE_DASHED_MAX = 4;
const STROKE_STEP = 0.5;
const STROKE_DEFAULT = 0.5;

// "None" intentionally NOT in this list. Hiding the outline is still
// reachable from the Outline ColorChip's "Transparent" button, which
// also enforces the "fill OR outline must stay visible" guard. Keeping
// it on the line-style picker would offer a second path to invisible
// shapes that bypasses that guard.
const LINE_STYLES: { id: GeoLineStyle; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
];

function ColorSection({
  shape,
  onPatch,
  fillTriggerRef,
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
  /** Forwarded ref to the Fill chip's trigger button so a parent can
   * focus it after the user picks a Type — mirrors Name -> Type hand-off. */
  fillTriggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const fillMode: GeoFillMode = shape.fillMode ?? 'fill';
  const lineStyle: GeoLineStyle = shape.lineStyle ?? 'solid';
  const fillColor = fillMode === 'none' ? null : shape.color;
  const outlineColor = lineStyle === 'none' ? null : (shape.strokeColor ?? shape.color);

  // Slider state — disabled when there's no visible line at all, and
  // clamped to the dashed cap when the current style is `dashed` so a
  // previously over-thick line doesn't sneak past the cap visually.
  const disabled = lineStyle === 'none';
  const maxWeight = lineStyle === 'dashed' ? STROKE_DASHED_MAX : STROKE_MAX;
  const weight = Math.min(shape.strokeWidth ?? STROKE_DEFAULT, maxWeight);

  return (
    <section className="space-y-3">
      <span className={`${TYPE_GROUP_TITLE} block`}>Color</span>

      {/* Row 1 — Fill / Outline chips. Each writes ONLY its own field
          (see comments below) so Fill / Outline stay independent. The
          renderer-side fix in `MapDrawOverlay` (fill derived from
          `shape.color`, not from stroke) closes the loop.

          GUARD: at least one of fill / outline must stay visible —
          otherwise the shape paints nothing at all. We surface this by
          disabling the OTHER chip's "Transparent" option whenever the
          current chip is already transparent. */}
      <div className="grid grid-cols-2 gap-2">
        <ColorChip
          label="Fill"
          color={fillColor}
          triggerRef={fillTriggerRef}
          // Fill can only become Transparent if the outline still
          // paints something — otherwise the shape would be invisible.
          transparentAllowed={lineStyle !== 'none'}
          onPick={(value) => {
            if (value === null) {
              onPatch({ fillMode: 'none' });
              return;
            }
            onPatch({ color: value, fillMode: 'fill' });
          }}
        />
        <ColorChip
          label="Outline"
          color={outlineColor}
          // Mirror image: outline can only go Transparent if the fill
          // is still being painted.
          transparentAllowed={fillMode !== 'none'}
          onPick={(value) => {
            if (value === null) {
              onPatch({ lineStyle: 'none' });
              return;
            }
            // Picking an outline color implies the shape should have a
            // stroke — flip back to solid if it was None.
            onPatch({
              strokeColor: value,
              ...(lineStyle === 'none' ? { lineStyle: 'solid' } : null),
            });
          }}
        />
      </div>

      {/* Divider between the color chips and the line controls. */}
      <hr className="border-t border-white/10" />

      {/* Row 2 — line style picker (Solid · Dashed · None). */}
      <SegmentedControl>
        {LINE_STYLES.map((mode) => (
          <SegmentButton
            key={mode.id}
            active={lineStyle === mode.id}
            onClick={() =>
              // Switching to dashed clamps an over-thick line back to the cap
              // so the dash rhythm stays legible after the swap.
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

      {/* Row 3 — thickness slider. */}
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

/**
 * Named swatch + hex label that opens a color picker popover. The
 * popover renders through Radix's `Popover` (shadcn wrapper), which
 * portals to `document.body` and bypasses the `DockedPanel`'s
 * `overflow-y-auto` scroll container — the previous hand-rolled
 * `position: absolute` popover was getting clipped/trapped by that
 * container and read as "I can't grab on it".
 *
 * Picker contents: Transparent button -> palette grid -> native color
 * input + hex text input. `color === null` renders the crossed-out
 * circle treatment (the "none" / transparent state).
 */
function ColorChip({
  label,
  color,
  onPick,
  triggerRef,
  transparentAllowed = true,
}: {
  label: string;
  color: string | null;
  onPick: (color: string | null) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  /**
   * When false, the popover's "Transparent" option is disabled — used
   * by the Color section to enforce the "fill OR outline must stay
   * visible" rule (a shape that's transparent on both sides has
   * nothing to paint).
   */
  transparentAllowed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Hex draft kept local so half-typed hex values don't fire onPick on
  // every keystroke. Synced from the prop whenever the popover is
  // closed so the next open shows the up-to-date value.
  const [hex, setHex] = useState(color ?? '#ffffff');
  useEffect(() => {
    if (!open) setHex(color ?? '#ffffff');
  }, [color, open]);

  const commitHex = (raw: string) => {
    const cleaned = raw.trim().replace(/^#?/, '#');
    setHex(cleaned);
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) onPick(cleaned.toLowerCase());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          {color === null ? (
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
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        // Override shadcn's default w-72 / bg-popover with our dark
        // sheet styling so it matches the rest of the draw panel.
        className="w-[232px] border-white/10 bg-[#1c1c1c] p-2 text-white shadow-xl shadow-black/40"
      >
        {(() => {
          // Disable Transparent only when (a) we're not already
          // transparent (no point disabling the "on" state) AND (b)
          // the parent says it's not allowed (the other side is also
          // transparent). Already-transparent stays clickable so it
          // reads as an interactive option in its active state.
          const blockTransparent = transparentAllowed === false && color !== null;
          return (
            <button
              type="button"
              onClick={() => {
                if (blockTransparent) return;
                onPick(null);
              }}
              disabled={blockTransparent}
              title={
                blockTransparent
                  ? 'A shape must have either a fill or an outline'
                  : undefined
              }
              aria-disabled={blockTransparent}
              className={`mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                blockTransparent
                  ? 'cursor-not-allowed text-white/30'
                  : `hover:bg-white/[0.08] ${color === null ? 'bg-white/[0.08] text-white' : 'text-white/75'}`
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
          );
        })()}

        <div className="grid grid-cols-5 gap-1.5">
          {COLOR_PALETTE.map((sw) => {
            const active = color?.toLowerCase() === sw.value.toLowerCase();
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
      </PopoverContent>
    </Popover>
  );
}
