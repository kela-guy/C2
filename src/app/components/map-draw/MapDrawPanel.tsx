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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  MapPin,
  X,
} from '@/lib/icons/central';
import {
  CircleDrawIcon,
  LineDrawIcon,
  PolygonDrawIcon,
  UploadIcon,
} from './icons';
import { useStrings } from '@/lib/intl';
import { DockedPanel } from '@/app/components/DockedPanel';
import { DirIsland } from '@/lib/direction/DirIsland';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Slider } from '@/app/components/ui/slider';
import {
  project,
  unproject,
  type GeoFillMode,
  type GeoLineStyle,
  type GeoShape,
  type GeoZoneType,
  type Vec2,
} from '../geo-entities-sandbox/drawTypes';
import type { GeoBounds } from '../geo-entities-sandbox/types';
import { SANDBOX_BOUNDS } from '../geo-entities-sandbox/fixtures';
import { parseImportFile, type ImportResult } from './imports';
import {
  DEFAULT_ZONE_TYPE,
  getZoneColor,
  ZONE_TYPES,
  ZONE_TYPE_BY_ID,
} from './zoneTypes';
import { deleteShapeWithUndo } from './deleteWithUndo';
import {
  useMapDraw,
  type MapDrawContextValue,
} from './MapDrawProvider';
import type { UseGeoDrawResult } from '../geo-entities-sandbox/useGeoDraw';
import { getZOrderActions, type ShapeAction } from './shapeActions';

// Type scale kept in step with the sibling docked panels (Simulations /
// Flow Builder): Heebo only, no mono / uppercase / letter-tracking.
const TYPE_GROUP_TITLE = 'text-[11px] font-semibold text-zinc-400';

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

  const { draw } = useMapDraw();
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

  // Three-view state machine driven by (`draft`, `pendingShapeId`):
  //
  //   draft !== null && pendingShapeId === null
  //     -> view D (drafting): the user is mid-draw. Same editor stack
  //        as view B, but backed by a SYNTHETIC shape whose points
  //        come from the live draft. Meta edits (name/type/color) are
  //        buffered in `draftMeta` and flushed onto the real shape at
  //        commit-time. Save is disabled until the draft finishes.
  //   pendingShapeId !== null
  //     -> view B (Draft detail + Save / Cancel footer; Layers hidden)
  //   otherwise
  //     -> view A (Layers list)
  const pendingShape = draw.pendingShapeId
    ? (draw.shapes.find((s) => s.id === draw.pendingShapeId) ?? null)
    : null;
  const inspected = pendingShape;

  const drafting = !!draw.draft && !draw.pendingShapeId;

  // Meta buffer for edits made while the shape is still being drawn.
  // Points are intentionally NOT stored here — the draft's geometry is
  // owned by the drawing engine. Everything else (name/type/colors) is
  // flushed onto the committed shape via a `pendingShapeId` transition
  // effect below.
  const [draftMeta, setDraftMeta] = useState<Partial<GeoShape>>({});

  // Synthetic "shape" that lets us reuse the DraftDetailView editor
  // during drafting. Type/colors default to the same values `commitDraft`
  // would stamp on, so what the user sees in the panel matches what the
  // shape will look like the instant it commits.
  const draftShape: GeoShape | null =
    drafting && draw.draft
      ? {
          id: '__draft__',
          tool: draw.draft.tool,
          kind: draw.draft.kind,
          name: '',
          description: '',
          color: getZoneColor(DEFAULT_ZONE_TYPE),
          strokeColor: getZoneColor(DEFAULT_ZONE_TYPE),
          fillOpacity: 0.3,
          strokeOpacity: 1,
          strokeWidth: 2,
          lineStyle: 'solid',
          zoneType: DEFAULT_ZONE_TYPE,
          points: draw.draft.points,
          ...draftMeta,
        }
      : null;

  // Flush buffered meta onto the committed shape as soon as it exists.
  // Runs exactly once per commit — the ref guards against re-applying
  // the same buffer if a downstream update triggers a re-render, and
  // the buffer is cleared afterward so a subsequent standalone edit of
  // the same shape (via the Layers list) won't get the old draft
  // values folded back in.
  const flushTargetRef = useRef<string | null>(null);
  const draftMetaRef = useRef(draftMeta);
  draftMetaRef.current = draftMeta;
  useEffect(() => {
    const id = draw.pendingShapeId;
    if (!id) {
      flushTargetRef.current = null;
      return;
    }
    if (flushTargetRef.current === id) return;
    flushTargetRef.current = id;
    const buffered = draftMetaRef.current;
    if (Object.keys(buffered).length > 0) {
      draw.updateShape(id, buffered);
    }
    setDraftMeta({});
  }, [draw.pendingShapeId, draw.updateShape]);

  // When the panel is opened from the left rail with nothing drawn
  // yet, the LayersView branch renders an empty state ("No geo
  // entities on the map yet") so the user gets a clear signal that
  // the click was received. We deliberately do NOT early-return
  // here anymore — the panel is a first-class navigation target and
  // has to show up whenever it's asked to.

  // Removed: the previous version auto-armed Polygon when the panel
  // opened. The new flow forces the user to deliberately pick a tool
  // via the in-panel "Pick a tool" CTA, so we leave the tool null.

  const blocksPanelClose = draw.blocksPanelClose;
  const handleClose = () => {
    if (blocksPanelClose) return;
    onClose();
  };

  return (
    <DockedPanel
      open={open}
      onClose={handleClose}
      closeDisabled={blocksPanelClose}
      closeDisabledHint="Save or cancel your changes first"
      side="start"
      width={width}
      noTransition={noTransition}
      dataHandoff="map-draw-panel"
      title={
        <DirIsland as="span" direction="ltr" className="block">
          {inspected && !draw.pendingIsNew ? (
            // Detail view for an EXISTING shape — render a back arrow on
            // the LEFT so the user can return to the Geo Entities list
            // without touching the footer. Tapping it calls
            // `cancelPending`, which for an existing-shape edit just
            // closes the editor (no shape is destroyed).
            //
            // For a brand-new pending shape (`pendingIsNew === true`)
            // we deliberately DON'T render a back arrow. The freshly
            // drawn shape isn't committed yet, and a stray back tap
            // would silently discard it — Save (commits) and Cancel
            // (discards) in the footer are the only exits so the
            // intent is always explicit.
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (draw.blocksPanelClose) return;
                  draw.cancelPending();
                }}
                disabled={draw.blocksPanelClose}
                aria-label="Back to Geo Entities"
                title={
                  draw.blocksPanelClose
                    ? 'Save or cancel your changes first'
                    : 'Back to Geo Entities'
                }
                className="-ms-1 grid size-6 shrink-0 place-items-center rounded text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 disabled:cursor-not-allowed disabled:text-zinc-600 disabled:hover:bg-transparent disabled:hover:text-zinc-600"
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
      // `[&>div]:h-full` stretches the Radix ScrollArea's injected
      // content wrapper (a `display: table` div with auto height) to
      // the viewport's full height. Without it every `h-full` below
      // collapses to content height, so the Layers empty state can't
      // vertically center itself. `display: table` treats `height` as
      // a minimum, so tall content still overflows and scrolls.
      bodyClassName="px-4 py-3 [&>div]:h-full"
      // Raise above the screen-space drawing overlay (z-20) so the panel
      // and its tool buttons stay clickable and aren't covered by shapes.
      className="z-30"
      // Panel actions live in the DockedPanel footer slot — a real
      // `<footer>` below the scroll area — instead of faux footers
      // inside the scrollable body. Which actions depends on the view:
      // Save / Cancel while a shape editor is open (drafting or
      // staged), the Upload-file affordance on the Layers view.
      footer={
        <DirIsland direction="ltr" className="block">
          {(drafting && draftShape) || inspected ? (
            <DraftDetailFooter
              shape={(drafting ? draftShape : inspected)!}
              draw={draw}
              drafting={drafting}
            />
          ) : (
            <div className="px-4 py-3">
              <UploadFileButton />
            </div>
          )}
        </DirIsland>
      }
    >
      {/* All copy in the panel is English-only (section titles, field
          labels, layer names typed by users). Pin the entire body to LTR
          via `DirIsland` so the headings read in their natural order and
          logical CSS utilities (`ms-*`, `text-start`) anchor on the left
          regardless of the app's global Hebrew direction.

          A full-height flex column lets the active branch (LayersView /
          DraftDetailView) expand to fill the body, which
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
          1. drafting (`draw.draft` in flight, not committed)
                                     -> full editor backed by a synthetic
                                        draft shape; Save disabled until
                                        the shape is finished, Cancel
                                        aborts the draft outright.
          2. `pendingShape` staged   -> view B: full editor + Save/Cancel
          3. otherwise                -> view A: Geo Entities list + Pick-a-tool CTA

          The wrapper is `flex flex-1 min-h-0 flex-col` so each branch
          owns the panel's full vertical space — that's what lets the
          footers in views A / B pin to the panel bottom on a short list. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {drafting && draftShape ? (
          <DraftDetailView
            shape={draftShape}
            draw={draw}
            typeLab={typeLab}
            typeVariant={typeVariant}
            drafting
            onDraftPatch={(patch) =>
              setDraftMeta((m) => ({ ...m, ...patch }))
            }
          />
        ) : inspected ? (
          <DraftDetailView
            shape={inspected}
            draw={draw}
            typeLab={typeLab}
            typeVariant={typeVariant}
          />
        ) : (
          <LayersView draw={draw} />
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
// Color. The Save / Cancel actions live in `DraftDetailFooter`, which
// MapDrawPanel renders into the DockedPanel `footer` slot (below the
// scroll area) whenever this view is active. Cancel discards the shape
// entirely (no undo toast). The Layers list is intentionally not
// rendered here: the user is in "finish this shape" mode, not "review
// the project" mode.
// ---------------------------------------------------------------------------

function DraftDetailView({
  shape,
  draw,
  typeLab,
  typeVariant,
  drafting = false,
  onDraftPatch,
}: {
  shape: GeoShape;
  draw: UseGeoDrawResult;
  typeLab: boolean;
  typeVariant: TypePanelVariant;
  /** True while the underlying geometry is still being drawn. Routes
   *  metadata edits into the parent's `draftMeta` buffer and disables
   *  Save until the shape is finished. */
  drafting?: boolean;
  /** Required when `drafting` is true; writes into the buffer. */
  onDraftPatch?: (patch: Partial<GeoShape>) => void;
}) {
  // Locked shapes open in a read-only detail view: users can inspect
  // every field but not change anything (the whole editor is dimmed
  // and its pointer events are suppressed). Drafting is inherently
  // a "new shape" flow, so the lock check only applies to committed
  // shapes.
  const isLocked = !drafting && !!shape.locked;

  // Route every child's onPatch either to the live shape (post-commit)
  // or the parent's draftMeta buffer (during draft). Swallowed while
  // locked so a mis-rendered interactive control can never mutate the
  // shape from this view.
  const patch = (p: Partial<GeoShape>) => {
    if (isLocked) return;
    if (drafting) onDraftPatch?.(p);
    else draw.updateShape(shape.id, p);
  };
  return (
    // Full-height flex column for the scrollable editor stack. The
    // Save / Cancel actions render separately in the DockedPanel
    // footer slot (see `DraftDetailFooter`), so this view only owns
    // the editor fields.
    <div className="flex h-full min-h-0 flex-col">
      {isLocked && (
        // Locked banner: reads as a small at-a-glance status chip so
        // the user immediately understands why every field below is
        // greyed out. Message matches the Layers list tooltip so the
        // two surfaces speak with one voice.
        <div
          role="status"
          className="mb-3 flex shrink-0 items-center gap-2 rounded-[2px] border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[12px] text-white/75"
        >
          <Lock size={14} className="shrink-0 text-white/85" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white">Locked layer</span>
            <span className="block text-[11px] text-white/55">
              Requires approval to edit.
            </span>
          </span>
        </div>
      )}
      <div
        // Dim + interaction-block the entire editor stack when the
        // shape is locked. `pointer-events-none` neutralizes mouse
        // events; `aria-disabled` and `tabIndex={-1}` communicate the
        // state to keyboard/assistive tech. Cancel/back navigation
        // stays fully live because it lives outside this container.
        className={`flex flex-1 min-h-0 flex-col gap-5 overflow-y-auto pb-3 transition-opacity ${
          isLocked ? 'pointer-events-none select-none opacity-55' : ''
        }`}
        aria-disabled={isLocked || undefined}
        tabIndex={isLocked ? -1 : undefined}
      >
        {/* Field order: Type, Name, Color / Line / Line Thickness,
            Coordinates. Type comes first (mandatory, default No-Fly-Zone)
            so users pick it before naming; Name is fully optional; the
            color/line block sits above Coordinates so styling happens
            before the fine-grained vertex list — Coordinates is the
            "detail" section that only some users edit. `ColorSection`
            renders Color / Line style / Line Thickness internally so
            those three items stay grouped visually. */}
        <TypeField
          shape={shape}
          onPatch={patch}
          variant={typeLab ? typeVariant : 'select'}
          chrome="plain"
        />
        <NameField
          key={`name-${shape.id}`}
          shape={shape}
          onPatch={patch}
          autoFocus={false}
        />
        <ColorSection shape={shape} onPatch={patch} />
        <CoordinatesSection
          shape={shape}
          onPatch={patch}
          drafting={drafting}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft detail footer — Save / Cancel
//
// Rendered by MapDrawPanel into the DockedPanel `footer` slot (a real
// `<footer>` element below the scroll area) so the actions live in the
// panel's chrome rather than a faux footer inside the scrollable body.
// While drafting, Save is disabled and Cancel drops the whole draft
// (`cancelDraft`) rather than touching a committed pending shape. When
// the layer is locked BOTH buttons are disabled — the only exit is the
// back arrow next to the "Geo Entities" title (rendered because
// `pendingIsNew === false` for an existing locked shape). That keeps
// the destructive `cancelPending` off the footer for something the
// user isn't allowed to mutate.
// ---------------------------------------------------------------------------

function DraftDetailFooter({
  shape,
  draw,
  drafting = false,
}: {
  shape: GeoShape;
  draw: UseGeoDrawResult;
  drafting?: boolean;
}) {
  // Snapshot the shape as it looked when this editor opened (keyed by
  // id so re-opening a different shape re-captures). Edits are applied
  // live via `updateShape`, so we compare the current shape against the
  // snapshot to know whether anything actually changed this session.
  //
  // While drafting, the synthetic shape's id is stable (`__draft__`)
  // but its `points` update on every click. We ignore dirtiness here
  // because Save is force-disabled in the drafting branch anyway.
  const snapshotRef = useRef<{ id: string; json: string } | null>(null);
  const currentJson = JSON.stringify(shape);
  if (!snapshotRef.current || snapshotRef.current.id !== shape.id) {
    snapshotRef.current = { id: shape.id, json: currentJson };
  }
  const dirty = snapshotRef.current.json !== currentJson;
  // Save is enabled the moment the shape is finished. While drafting,
  // Save stays disabled until the user closes the polygon / lifts the
  // pointer on the circle. Once committed as a brand-new pending shape
  // it goes active immediately (no need to type a name first) — the
  // user just finished drawing and Save is the next action. Reopened
  // existing shapes fall back to the "enabled only when dirty" rule.
  const isFreshDraw = draw.pendingShapeId === shape.id && draw.pendingIsNew;
  const isLocked = !drafting && !!shape.locked;
  const canSave = drafting || isLocked ? false : isFreshDraw || dirty;
  // Cancel mirrors Save's activation window, plus stays live during the
  // in-progress draft so the user can always bail out of a half-drawn
  // shape. For a re-opened committed shape, Cancel starts DISABLED and
  // only lights up once the user actually edits something — matches
  // Save so both footer actions appear in step: nothing to save →
  // nothing to cancel.
  const canCancel = !isLocked && (drafting || isFreshDraw || dirty);

  return (
    <div className="flex items-center justify-end gap-2 px-4 py-3">
      <button
        type="button"
        disabled={!canCancel}
        onClick={() => (drafting ? draw.cancelDraft() : draw.cancelPending())}
        title={
          isLocked
            ? 'Locked — requires approval to edit'
            : canCancel
              ? 'Discard changes'
              : 'No changes to cancel'
        }
        className="min-w-[72px] rounded-[2px] border border-white/10 bg-transparent px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/40 disabled:hover:bg-transparent disabled:hover:text-white/40"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={!canSave}
        onClick={() => draw.savePending()}
        title={
          isLocked
            ? 'Locked — requires approval to edit'
            : drafting
              ? 'Finish the shape first (double-click to close)'
              : canSave
                ? 'Save shape'
                : 'No changes to save'
        }
        className="min-w-[72px] rounded-[2px] border border-transparent bg-white px-3 py-1.5 text-[12px] font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-transparent disabled:text-white/40 disabled:hover:bg-transparent"
      >
        Save
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload file button
//
// Small self-contained "Upload file — KML or GeoJSON" button used in
// two places today:
//   1. Pinned to the footer of the Layers view (default behavior):
//      importing a file creates a fresh shape via `draw.importShape`,
//      the first shape stages into the Draft-detail Save/Cancel gate.
//   2. Inside the Coordinates section of the shape inspector: the
//      caller passes `onImport` to intercept the parsed result and
//      merge it into the shape already being edited — replacing its
//      points instead of creating a duplicate.
//
// The button owns the full flow: file picking, parsing, safe-area
// projection (measured from the DOM at import time), and inline
// success/error feedback.
// ---------------------------------------------------------------------------

interface UploadFileButtonProps {
  /**
   * When provided, the parsed {@link ImportResult} is handed off to
   * this callback instead of being turned into a new shape via
   * `draw.importShape`. Use this when the caller wants to merge the
   * imported geometry into a shape that already exists (e.g. from
   * the Coordinates section while editing).
   *
   * Throw a plain `Error` inside the callback to reject the import —
   * the message surfaces in the button's inline error strip just
   * like a parser error would.
   */
  onImport?: (result: ImportResult) => void;
}

function UploadFileButton({ onImport }: UploadFileButtonProps = {}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { draw } = useMapDraw();
  // Local feedback surface: parse errors / soft warnings render inline
  // under the button until the user picks another file or clears them.
  // There's no toast system in this sandbox, and swallowing errors on
  // upload would leave the user staring at an unresponsive button.
  const [feedback, setFeedback] = useState<
    | { kind: 'error'; message: string }
    | { kind: 'success'; imported: number; warnings: string[]; filename: string }
    | null
  >(null);

  const handleFile = useCallback(
    async (file: File) => {
      setFeedback(null);
      try {
        // Measure the docked panel against the map overlay so the
        // parser can carve out a "safe area" for the imported shape —
        // otherwise a file whose bbox happens to project near the
        // inline-start edge would land under the panel's clip-path
        // (visible in the DOM but hidden from the user, with vertex
        // handles trapped behind the panel and unclickable). The
        // overlay is `position: absolute; inset: 0` inside the map
        // container, so its bounding rect IS the map's dimensions;
        // the docked panel floats above it (never resizes the map)
        // at the current `sidebarWidth`.
        const overlay = document.querySelector(
          '[data-map-draw-overlay="true"]',
        );
        const panelEl = document.querySelector(
          '[data-handoff-component="map-draw-panel"]',
        );
        const mapWidth = overlay?.getBoundingClientRect().width ?? 0;
        const panelWidth = panelEl?.getBoundingClientRect().width ?? 0;
        const isRtl =
          typeof document !== 'undefined' &&
          document.documentElement.getAttribute('dir') === 'rtl';
        const panelInsetFraction =
          mapWidth > 0
            ? Math.min(0.5, Math.max(0, panelWidth / mapWidth))
            : 0;

        const result = await parseImportFile(file, {
          panelInsetFraction,
          isRtl,
        });
        if (result.shapes.length === 0) {
          setFeedback({
            kind: 'error',
            message:
              result.warnings[0] ??
              'No supported geometry found in this file.',
          });
          return;
        }
        if (onImport) {
          // Replace-mode: the caller (typically the Coordinates
          // section while editing an existing shape) owns the merge.
          // Only the first shape from a multi-feature file gets
          // applied — the caller edits ONE shape, and silently
          // dropping extras would be confusing, so we surface the
          // count via a warning in the success chip.
          // Callers can throw a plain Error inside `onImport` to
          // reject the import — the message surfaces in the feedback
          // area just like a parser error would.
          onImport(result);
          const extras = result.shapes.length - 1;
          setFeedback({
            kind: 'success',
            imported: 1,
            warnings:
              extras > 0
                ? [
                    ...result.warnings,
                    `Only the first shape was applied; ${extras} extra shape${extras === 1 ? '' : 's'} ignored.`,
                  ]
                : result.warnings,
            filename: file.name,
          });
        } else {
          // Default: create new shape(s). Multi-feature files
          // only put the FIRST shape into the Draft-detail Save/
          // Cancel gate — that keeps the "just click Save" UX intact
          // for the common single-polygon case. Any extra shapes
          // land as regular committed layers the user can review
          // afterwards from the Layers list. All shapes share the
          // same `sourceBounds` — the parser picked one projection
          // window for the whole file so multi-feature imports stay
          // coplanar.
          result.shapes.forEach((s, i) => {
            draw.importShape({
              tool: s.tool,
              kind: s.kind,
              points: s.points,
              name: s.name,
              stage: i === 0,
              sourceBounds: result.bounds,
            });
          });
          setFeedback({
            kind: 'success',
            imported: result.shapes.length,
            warnings: result.warnings,
            filename: file.name,
          });
        }
      } catch (err) {
        setFeedback({
          kind: 'error',
          message:
            (err as Error).message || 'Failed to read file.',
        });
      }
    },
    [draw, onImport],
  );

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        // `h-8` pins the button to exactly 32px so the sub-pixel line-height
        // wobble from `text-[12.5px]` doesn't drift the footer height.
        className="flex h-8 w-full items-center justify-center gap-2 rounded-[2px] border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        <UploadIcon size={14} />
        <span>Upload file</span>
        <span className="text-[11px] font-normal text-white/50">
          KML or GeoJSON
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".kml,.geojson,.json,application/geo+json,application/vnd.google-earth.kml+xml"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          // Reset the input so re-picking the same file still fires
          // `change`. The captured `file` is what we operate on.
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      {feedback?.kind === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-500/25 bg-red-500/[0.08] px-2 py-1 text-[11.5px] text-red-200"
        >
          <span className="min-w-0 flex-1 break-words">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss import error"
            title="Dismiss"
            className="grid size-5 shrink-0 place-items-center rounded text-red-200/70 transition-colors hover:bg-red-500/15 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <X size={11} />
          </button>
        </div>
      )}
      {feedback?.kind === 'success' && (
        <div
          role="status"
          className="space-y-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11.5px] text-white/80"
        >
          <div className="flex items-center gap-2">
            <UploadIcon size={12} className="shrink-0 text-emerald-300" />
            <span className="truncate" title={feedback.filename}>
              {feedback.imported === 1
                ? `Imported from ${feedback.filename}`
                : `Imported ${feedback.imported} shapes from ${feedback.filename}`}
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss import status"
              title="Dismiss"
              className="ms-auto grid size-5 shrink-0 place-items-center rounded text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <X size={11} />
            </button>
          </div>
          {feedback.warnings.length > 0 && (
            <ul className="ps-4 text-[11px] text-white/55 list-disc">
              {feedback.warnings.slice(0, 3).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {feedback.warnings.length > 3 && (
                <li>and {feedback.warnings.length - 3} more…</li>
              )}
            </ul>
          )}
        </div>
      )}
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

function LayersView({ draw }: { draw: UseGeoDrawResult }) {
  // Search query lives here (lifted out of LayersSection) so the input
  // can render unconditionally at the top of the view — the reference
  // shows it as an always-visible field rather than a magnifier toggle.
  const [query, setQuery] = useState('');
  return (
    // Full-height flex column so the list expands to fill the panel.
    // The Upload affordance lives in the DockedPanel footer slot (see
    // MapDrawPanel), so this view only owns the search input and the
    // scrolling layers list. The tool row that used to pin here has
    // been retired — the floating map control is now the sole entry
    // point for arming a drawing tool, so the panel is a pure Layers
    // view.
    <div className="flex h-full min-h-0 flex-col">
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
            className="w-full rounded-[2px] border border-white/10 bg-white/[0.04] py-1.5 ps-8 pe-2.5 text-[12.5px] text-white placeholder:text-white/40 outline-none focus:border-white/30 focus:bg-white/[0.08]"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto pb-3">
        <LayersSection draw={draw} query={query} />
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
  // Rapid-fire keyboard delete: pressing Delete on a focused row removes
  // it and slides focus onto the NEXT row so a stream of Delete presses
  // clears the list one entry at a time. We drive the hand-off by shape
  // id (not DOM-sibling walking): the row's handler stashes the id of
  // the row that should inherit focus, and the layout effect below
  // re-focuses it AFTER React has committed the deletion — so the target
  // node is guaranteed to be in the DOM. This is what makes consecutive
  // deletes work; the previous `nextElementSibling` + rAF approach let
  // focus fall back to <body> after the first delete, which is why a
  // second Delete press did nothing.
  const ulRef = useRef<HTMLUListElement | null>(null);
  const refocusIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const id = refocusIdRef.current;
    if (!id) return;
    refocusIdRef.current = null;
    const el = ulRef.current?.querySelector<HTMLElement>(
      `[data-layer-row="${CSS.escape(id)}"]`,
    );
    el?.focus();
    // Re-runs whenever the shape list changes — a delete mutates the
    // array identity, so the effect fires right after the row unmounts
    // and the surviving rows are committed.
  }, [draw.shapes]);

  if (draw.shapes.length === 0) {
    // Empty-state — surfaced when the user opens the panel from the
    // rail before drawing anything. Reads as a passive hint rather
    // than an error, and points them at the top-right polygon tool
    // as the next step.
    return (
      <div className="grid h-full place-items-center px-4 py-8 text-center">
        <p className="max-w-[220px] text-[12px] leading-relaxed text-zinc-500">
          No geo entities on the map yet.
        </p>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = draw.shapes.filter((s) =>
    q === '' ? true : shapeLabel(s).toLowerCase().includes(q),
  );

  // Delete a row and line up the next VISIBLE row (falling back to the
  // previous one when the last row is removed) to inherit keyboard
  // focus. Skips locked rows when picking the successor so focus never
  // parks on a row the user can't act on. Computed against `matches`,
  // not `draw.shapes`, so an active search filter is respected.
  const handleDelete = (id: string) => {
    const idx = matches.findIndex((s) => s.id === id);
    const successor =
      matches.slice(idx + 1).find((s) => !s.locked) ??
      matches
        .slice(0, Math.max(idx, 0))
        .reverse()
        .find((s) => !s.locked) ??
      null;
    refocusIdRef.current = successor ? successor.id : null;
    deleteShapeWithUndo(draw, id);
  };

  return (
    // Subheader and magnifier toggle removed — the panel-level title
    // already says "Geo Entities" and the search input now lives at
    // the top of `LayersView` as an always-visible field. This
    // section is just the list now.
    <ul ref={ulRef} className="space-y-1.5">
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
            onDelete={() => handleDelete(s.id)}
            onEdit={() => draw.beginEditShape(s.id)}
            onCenter={() => draw.requestFocus(s.id)}
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
  onCenter,
}: {
  shape: GeoShape;
  zOrderActions: ShapeAction[];
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onDelete: () => void;
  /** Open the Draft-detail editor for this shape. */
  onEdit: () => void;
  /** Ask the map to fly to this shape's centroid. */
  onCenter: () => void;
}) {
  // Type label shown as a muted inline suffix after the name. New shapes
  // always ship with the default `noFly` type, but legacy shapes drawn
  // before that migration may not carry a type — fall back to the
  // default label so the card always names a type rather than leaving a
  // blank.
  const typeLabel = shape.zoneType
    ? ZONE_TYPE_BY_ID[shape.zoneType]?.label ?? ZONE_TYPE_BY_ID.noFly.label
    : ZONE_TYPE_BY_ID.noFly.label;
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
  // Keep Eye / Lock / Center from also triggering the card's `openDetail`
  // — the action buttons are local, not navigation.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          data-layer-row={shape.id}
          onClick={openDetail}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openDetail();
              return;
            }
            // Keyboard delete — Delete / Backspace on a focused row
            // removes it, but only when the layer is unlocked. Locked
            // shapes must be unlocked from the detail view first, which
            // guards against a stray key press wiping a protected layer.
            //
            // The parent `LayersSection` owns focus hand-off: `onDelete`
            // lines up the next row's id and a layout effect re-focuses
            // it once React has committed the removal. That's what lets
            // a stream of Delete presses clear the list one row at a
            // time instead of dropping focus after the first delete.
            if ((e.key === 'Delete' || e.key === 'Backspace') && !shape.locked) {
              e.preventDefault();
              onDelete();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`Open ${shapeLabel(shape)}`}
          onMouseEnter={() => setHoveredShapeId(shape.id)}
          onMouseLeave={() => setHoveredShapeId(null)}
          onFocus={() => setHoveredShapeId(shape.id)}
          onBlur={() => setHoveredShapeId(null)}
          className={`group flex cursor-pointer items-stretch overflow-hidden rounded-[2px] border transition-[background,border-color,opacity] duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
            // Standard white hover — subtle border + fill that reads as
            // "this is the row you're pointing at / hovering on the map"
            // without shouting. Idle rows have a near-invisible fill;
            // hover and map-hover both promote to the same white-tinted
            // state so pointing at a shape on either surface highlights
            // the SAME visual pair.
            hovered
              ? 'border-white/20 bg-white/[0.10]'
              : 'border-transparent bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.07]'
          } ${
            // Whole-card dim mirrors the "off the map" state. Icons and
            // text inherit this via `opacity` compounding so the row
            // reads uniformly muted while still legible.
            shape.hidden ? 'opacity-55' : ''
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
            <span
              className="grid size-5 shrink-0 place-items-center text-white/70"
              aria-hidden
            >
              <ShapeKindIcon kind={shape.kind} tool={shape.tool} size={15} />
            </span>
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
              {/* Type is now the primary label — it's the mandatory,
                  meaningful classification (No-Fly-Zone, Restricted, …).
                  The shape's optional custom name follows as a muted
                  suffix so lists remain scannable by zone type first. */}
              <span
                className={`truncate text-[13px] font-medium leading-tight ${
                  shape.hidden ? 'text-white/60' : 'text-zinc-100'
                }`}
              >
                {typeLabel}
              </span>
              <span className="truncate text-[11px] leading-tight text-white/45">
                · {shapeLabel(shape)}
              </span>
            </span>
            {/* Three fixed action slots: Eye · Lock · Center. Each slot
                is either PERSISTENT (reflects state — Eye when hidden,
                Lock when locked) or HOVER-REVEALED (fades in on group
                hover / focus). Order is stable so the layout never
                shifts between states. Deletion is keyboard-only: pressing
                Delete/Backspace removes the shape highlighted here (the
                row under the pointer or with keyboard focus), handled by
                the global map-draw key handler and gated on
                `!shape.locked`. */}
            <div className="flex items-center gap-0.5">
              <span
                className={`transition-opacity ${
                  shape.hidden
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`}
              >
                <button
                  type="button"
                  // Locked layers freeze every list-level action, not
                  // just the lock toggle: the eye button is still
                  // painted so the state reads, but it's non-interactive
                  // until the shape is unlocked from the detail view.
                  disabled={shape.locked}
                  onClick={(e) => {
                    stop(e);
                    if (shape.locked) return;
                    onToggleHidden();
                  }}
                  aria-label={shape.hidden ? 'Show layer' : 'Hide layer'}
                  title={shape.hidden ? 'Show layer' : 'Hide layer'}
                  className={`grid size-6 shrink-0 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                    shape.locked
                      ? 'cursor-default text-white/55 opacity-70'
                      : 'text-white/55 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {shape.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </span>
              <span
                className={`transition-opacity ${
                  shape.locked
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`}
              >
                {/* Lock is a plain toggle: click to lock, click again to
                    unlock. No approval gate — this is a simulation, so a
                    layer locked by accident can always be freed straight
                    from the list. While locked we still surface the Radix
                    tooltip beneath the icon so the state reads at a glance;
                    the message just makes clear the lock is undoable. */}
                {shape.locked ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          stop(e);
                          onToggleLocked();
                        }}
                        aria-label="Unlock layer"
                        aria-pressed
                        className="grid size-6 shrink-0 place-items-center rounded text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                      >
                        <Lock size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      sideOffset={6}
                      className="text-[11px]"
                    >
                      Requires approval
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      stop(e);
                      onToggleLocked();
                    }}
                    aria-label="Lock layer"
                    title="Lock layer"
                    aria-pressed={false}
                    className="grid size-6 shrink-0 place-items-center rounded text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                  >
                    <LockOpen size={14} />
                  </button>
                )}
              </span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  disabled={shape.locked}
                  onClick={(e) => {
                    stop(e);
                    if (shape.locked) return;
                    onCenter();
                  }}
                  aria-label="Center on map"
                  title="Center on map"
                  className={`grid size-6 shrink-0 place-items-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                    shape.locked
                      ? 'cursor-default text-white/55 opacity-70'
                      : 'text-white/55 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <MapPin size={14} />
                </button>
              </span>
            </div>
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
// Name field — the naming row of the inspector and the canonical home for
// the shape name. Naming is now fully optional: finishing a shape no
// longer steals focus into this field (the caret stays put and Save is
// already active), so the user names the shape only if they choose to.
// The `autoFocus` prop is retained for callers that still want it.
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

  // Bordered field — same chrome and title-to-control rhythm as the
  // Type select above (`space-y-2` + h-8 box).
  const baseClass =
    'h-8 w-full rounded-[2px] border border-white/10 bg-white/[0.04] px-2.5 text-[12px] font-medium text-white placeholder:text-white/50 outline-none transition-colors hover:bg-white/[0.08] focus:border-white/30 focus:bg-white/[0.08]';
  const attentionClass = '';

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
        placeholder={shape.name || 'Add name'}
        aria-label="Shape name"
        spellCheck={false}
        className={`${baseClass} ${attentionClass}`}
      />
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
  drafting = false,
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
  /** True while the underlying geometry is still being drawn. Rows
   *  become read-only and the add/upload affordances disappear —
   *  points are owned by the drawing engine until the user finishes
   *  the shape. */
  drafting?: boolean;
}) {
  // The section is always open now — no collapsible chrome. Mirror an
  // "always true" open state into the shared context so the map overlay
  // keeps rendering the numbered vertex chips whenever a shape is
  // selected (they used to be gated on this bit).
  const { setCoordinatesOpen, focusedVertex, setFocusedVertex } = useMapDraw();
  useEffect(() => {
    setCoordinatesOpen(true);
    return () => setCoordinatesOpen(false);
  }, [setCoordinatesOpen]);

  // Clear any active-vertex highlight when the section switches to a
  // different shape or unmounts, so a stale highlight doesn't linger
  // after the user moves on.
  useEffect(() => {
    return () => setFocusedVertex(null);
  }, [shape.id, setFocusedVertex]);

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
    <section className="space-y-2">
      <span className={`${TYPE_GROUP_TITLE} block`}>Coordinates</span>

      {/* Upload / status stubs. Suppressed while drafting — the user
          is still placing points; import / edit affordances only make
          sense after the shape is committed. Here (inside the shape
          inspector) uploading REPLACES the current shape's points
          instead of creating a duplicate — the user is editing this
          shape, so a coord file is understood as "these are the
          coordinates for this shape". */}
      {!drafting && (
        <UploadFileButton
          onImport={(result) => {
            const first = result.shapes[0];
            if (!first) return;
            // Kind mismatch is refused: dropping a Polygon's ring
            // onto a Polyline (or vice versa) would render as an
            // open path with duplicated endpoints; imported points
            // into a Circle would ignore all but the first two
            // corners. The user should cancel and re-import as a
            // new shape via the Layers footer button instead.
            if (first.kind !== shape.kind) {
              throw new Error(
                `File contains a ${first.kind} but you're editing a ${shape.kind}. ` +
                  `Cancel and use Upload from the Layers list to import as a new shape.`,
              );
            }
            onPatch({
              points: first.points,
              sourceBounds: result.bounds,
            });
          }}
        />
      )}

      <ul className="space-y-1.5">
        {rows.map((row) => (
          <CoordinateRow
            key={row.index}
            label={row.label}
            point={row.point}
            // Imported shapes carry the file's own lat/lng bounds so
            // the displayed coordinates match what the user uploaded.
            // Shapes drawn on the map have no `sourceBounds` and fall
            // back to the sandbox AO for both display and re-projection.
            bounds={shape.sourceBounds ?? SANDBOX_BOUNDS}
            onChange={drafting ? () => {} : row.onChange}
            readOnly={drafting}
            active={
              focusedVertex?.shapeId === shape.id &&
              focusedVertex.index === row.index
            }
            onSelect={() =>
              setFocusedVertex({ shapeId: shape.id, index: row.index })
            }
            onRemove={
              !drafting && !isCircle && shape.points.length > 2
                ? () => removePoint(row.index)
                : undefined
            }
          />
        ))}
      </ul>

      {!drafting && canAddPoint && (
        <button
          type="button"
          onClick={addPoint}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[2px] border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <Plus size={14} />
          Add coordinates
        </button>
      )}
    </section>
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
  bounds,
  onChange,
  onRemove,
  active = false,
  readOnly = false,
  onSelect,
}: {
  label: string;
  point: Vec2;
  /** Lat/lng bounds the point's normalized components map back to. Owner
   *  by the parent shape (imported shapes carry their file's bbox;
   *  drawn shapes default to `SANDBOX_BOUNDS`). */
  bounds: GeoBounds;
  onChange: (next: Vec2) => void;
  onRemove?: () => void;
  /** True when the matching vertex dot on the map has been clicked —
   *  the row lights up and scrolls into view so the user can see which
   *  coordinate that map dot corresponds to. */
  active?: boolean;
  /** When true, the input is a read-only readout (used while the
   *  shape is still being drafted — geometry is owned by the engine). */
  readOnly?: boolean;
  /** Called when the row is clicked or its input receives focus — the
   *  parent uses this to promote this row to the "active" vertex so the
   *  matching dot on the map lights up (the reverse of the map -> row
   *  highlight; makes the coordinate list a bidirectional locator). */
  onSelect?: () => void;
}) {
  const { lat, lng } = unproject(point, bounds);
  const display = formatPair(lat, lng);

  // Local draft so half-typed strings don't round-trip through
  // project/unproject and clobber the user's keystrokes. We only push to
  // the parent on a successful parse at commit time (Enter / blur).
  const [draft, setDraft] = useState(display);
  const [focused, setFocused] = useState(false);
  const rowRef = useRef<HTMLLIElement | null>(null);

  // Keep the draft in sync with the shape's authoritative value whenever
  // the input isn't actively being edited — covers the case where the
  // user drags a vertex chip on the map and we want the row to reflect
  // the new coordinates immediately.
  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  // When this row becomes the active one (its vertex dot was clicked on
  // the map), scroll it into view so the user immediately sees which
  // coordinate the dot maps to.
  useEffect(() => {
    if (active) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

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
    onChange(project({ lat: nextLat, lng: nextLng }, bounds));
  };

  return (
    <li
      ref={rowRef}
      onMouseDown={onSelect}
      className="group relative flex items-center rounded-[2px] transition-colors"
    >
      <input
        type="text"
        value={readOnly ? display : draft}
        inputMode="decimal"
        spellCheck={false}
        readOnly={readOnly}
        aria-label={`Coordinates ${label}`}
        onChange={readOnly ? undefined : (e) => setDraft(e.target.value)}
        onFocus={(e) => {
          // Whether editable or not, focusing a row lights up the
          // matching vertex dot on the map — the row -> dot direction of
          // the coordinate locator.
          onSelect?.();
          if (readOnly) return;
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={
          readOnly
            ? undefined
            : () => {
                setFocused(false);
                commit();
              }
        }
        onKeyDown={
          readOnly
            ? undefined
            : (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                  (e.currentTarget as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setDraft(display);
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }
        }
        // Full-width so the row lines up flush with the "Upload file"
        // button above; the remove affordance now lives INSIDE the
        // input (absolutely positioned x on the inline-end), so we
        // reserve trailing padding for it only when it's present.
        // Borderless: matches the panel's segmented-control chrome — just
        // the subtle fill, no stroke. The active-vertex highlight keeps a
        // ring (not a border) so a map-clicked dot still reads clearly.
        className={`w-full rounded-[2px] bg-white/[0.04] py-1.5 ps-2.5 text-[12px] tabular-nums text-zinc-100 outline-none transition-colors ${
          onRemove ? 'pe-8' : 'pe-2.5'
        } ${
          active ? 'bg-sky-400/10 ring-1 ring-inset ring-sky-400/40' : ''
        } ${
          readOnly ? 'cursor-default' : 'focus:bg-white/[0.08]'
        }`}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove point ${label}`}
          title="Remove point"
          className="absolute end-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-[2px] text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <X size={13} />
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

export type TypePanelVariant =
  | 'opt1'
  | 'opt2'
  | 'opt3'
  | 'opt4'
  | 'opt5'
  // Plain shadcn `Select` component — the production variant per the
  // latest spec. The old `opt1..opt5` layouts stay around for the
  // `/geo-entities-type-sandbox` lab.
  | 'select';

function TypeField({
  shape,
  onPatch,
  variant = 'select',
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
  // Picking a Type re-stamps BOTH the fill and the stroke color to the
  // type's signature hue so the shape reads as its type from the moment
  // it's picked. Users who want a custom color can override the color
  // chips afterwards — changing the Type again will re-stamp back to
  // the new type's color.
  const pick = (id: GeoZoneType, color: string) => {
    onPatch({ zoneType: id, color, strokeColor: color });
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
      {variant === 'select' && (
        <TypeVariantSelect activeType={activeType} onPick={pick} />
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
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-400">
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

// ----- shadcn Select variant (production) --------------------------------
//
// Plain radix-backed `<Select>` from `@/app/components/ui/select`. Each
// option carries a small color dot so the picker still communicates the
// signature palette while keeping the interaction identical to every
// other Select in the app.
function TypeVariantSelect({
  activeType,
  onPick,
}: {
  activeType: GeoZoneType | undefined;
  onPick: (id: GeoZoneType, color: string) => void;
}) {
  const active = activeType ? ZONE_TYPE_BY_ID[activeType] : null;
  return (
    <Select
      value={active?.id}
      onValueChange={(id) => {
        const meta = ZONE_TYPE_BY_ID[id as GeoZoneType];
        if (!meta) return;
        onPick(meta.id, meta.color);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label="Zone type"
        className="w-full rounded-[2px] border-white/10 bg-white/[0.04] text-[12px] text-white hover:bg-white/[0.08] focus-visible:ring-white/25"
      >
        <SelectValue placeholder="Choose a zone type">
          {active && (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ background: active.color }}
              />
              <span className="truncate">{active.label}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-[#1a1a1a]/95 text-white backdrop-blur-xl">
        {ZONE_TYPES.map((t) => (
          <SelectItem key={t.id} value={t.id} className="text-[12px]">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-full ring-1 ring-inset ring-white/20"
                style={{ background: t.color }}
              />
              <span>{t.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

// Stroke-width clamps. One shared slider range for Solid and Dashed so
// the thumb position and readout stay stable when switching line style.
// Minimum is 0.5 px (hairline) to match the default white outline new
// shapes ship with.
const STROKE_MIN = 0.5;
const STROKE_MAX = 8;
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

  // Slider — disabled when there's no visible line at all. Same range
  // for Solid and Dashed so switching style doesn't move the thumb.
  const disabled = lineStyle === 'none';
  const weight = shape.strokeWidth ?? STROKE_DEFAULT;

  return (
    // Three uniform titled groups (Color, Line, Line Thickness) stacked
    // with the SAME `gap-5` the parent editor uses between its own
    // sections — so this "one section" reads as three siblings in the
    // outer rhythm, and every title-to-content gap (`space-y-2`) matches
    // Type / Name / Coordinates exactly.
    <section className="flex flex-col gap-5">
      {/* Group 1 — Color: title + Fill / Outline chips. Each chip writes
          ONLY its own field (see comments below) so Fill / Outline stay
          independent. The renderer-side fix in `MapDrawOverlay` (fill
          derived from `shape.color`, not from stroke) closes the loop.

          GUARD: at least one of fill / outline must stay visible —
          otherwise the shape paints nothing at all. We surface this by
          disabling the OTHER chip's "Transparent" option whenever the
          current chip is already transparent. */}
      <div className="space-y-2">
        <span className={`${TYPE_GROUP_TITLE} block`}>Color</span>
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
      </div>

      {/* Group 2 — Line: style picker (Solid · Dashed). */}
      <div className="space-y-2">
        <span className={`${TYPE_GROUP_TITLE} block`}>Line</span>
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
      </div>

      {/* Group 3 — Line Thickness: title + live weight readout + slider. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={TYPE_GROUP_TITLE}>Line Thickness</span>
          <span
            className={`text-[11px] tabular-nums ${
              disabled ? 'text-zinc-600' : 'text-zinc-400'
            }`}
          >
            {weight.toFixed(1)}
          </span>
        </div>
        <Slider
          aria-label="Line Thickness"
          value={[weight]}
          min={STROKE_MIN}
          max={STROKE_MAX}
          step={STROKE_STEP}
          disabled={disabled}
          onValueChange={(v) => onPatch({ strokeWidth: v[0] })}
          className="w-full"
        />
      </div>
    </section>
  );
}

function SegmentedControl({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-[2px] bg-white/[0.04] p-[3px]">
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
      className={`flex flex-1 items-center justify-center gap-2 rounded-[2px] px-2 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
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
 * rectangle swatches with 2 px corners (the "none" / transparent state
 * keeps the diagonal-slash glyph inside the same rect frame).
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
  // every keystroke. Synced from the prop whenever the committed color
  // changes — including while the popover is open — so picking a swatch
  // (or any external color change) updates the hex field live. We skip
  // the write when the draft already represents the same color so we
  // don't flip case or clobber a value the user is mid-typing (a
  // half-typed hex never changes `color`, so this effect won't fire).
  const [hex, setHex] = useState(color ?? '#ffffff');
  useEffect(() => {
    const next = color ?? '#ffffff';
    setHex((cur) => (cur.toLowerCase() === next.toLowerCase() ? cur : next));
  }, [color]);

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
          className="flex h-10 w-full items-center gap-2 rounded-[2px] border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          {color === null ? (
            <span className="grid size-5 shrink-0 place-items-center rounded-[2px] ring-1 ring-inset ring-white/30 text-zinc-300">
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <line x1="3.6" y1="12.4" x2="12.4" y2="3.6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
          ) : (
            <span
              aria-hidden
              className="size-5 shrink-0 rounded-[2px] ring-1 ring-inset ring-white/15"
              style={{ background: color }}
            />
          )}
          <span className="min-w-0 flex-1 truncate">
            <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
              {label}
            </span>
            <span className="block text-[10px] font-medium text-[#949494] truncate">
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
              <span className="grid size-5 place-items-center rounded-[2px] ring-1 ring-inset ring-white/30 text-zinc-300">
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
                className={`size-7 rounded-[2px] transition-[box-shadow,transform] active:scale-[0.94] focus-visible:outline-none ${
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
            className="relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-[2px] ring-1 ring-inset ring-white/15 hover:ring-white/40"
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
