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

import { Trash2, Save } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';
import { DockedPanel } from '@/app/components/DockedPanel';
import { Toggle } from '@/shared/components/ui/toggle';
import { Slider } from '@/app/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  type GeoAreaStatus,
  type GeoFillMode,
  type GeoLineStyle,
  type GeoShape,
} from '../geo-entities-sandbox/drawTypes';
import { CurveDrawIcon, LineDrawIcon, PolygonDrawIcon } from './icons';
import { useMapDraw, type MapDrawTool } from './MapDrawProvider';

const TYPE_GROUP_TITLE = 'text-[11px] font-semibold text-zinc-400';
const FIELD_LABEL = 'block text-[11px] uppercase tracking-wide text-white/60';

const STATUS_OPTIONS: { id: GeoAreaStatus; label: string; tone: string }[] = [
  { id: 'urgentA', label: 'Urgent A', tone: '#f43f5e' },
  { id: 'secondaryB', label: 'Secondary B', tone: '#fb923c' },
  { id: 'somethingC', label: 'Something C', tone: '#38bdf8' },
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

/**
 * Two-row palette mirroring the Figma reference: vibrant primaries on
 * the top row, soft pastels below. Last pastel slot is the rainbow
 * "custom color" affordance.
 */
const PALETTE_VIBRANT: string[] = [
  '#0a0a0a',
  '#6b7280',
  '#ef4444',
  '#fb923c',
  '#facc15',
  '#34d399',
  '#22d3ee',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
];

const PALETTE_PASTEL: string[] = [
  '#a3a3a3',
  '#d4d4d4',
  '#fecaca',
  '#fed7aa',
  '#fef9c3',
  '#bbf7d0',
  '#cffafe',
  '#bfdbfe',
  '#ddd6fe',
  '#fbcfe8',
  null as unknown as string, // sentinel: rainbow custom-color slot
];

export interface MapDrawPanelProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  noTransition?: boolean;
}

export function MapDrawPanel({ open, onClose, width, noTransition }: MapDrawPanelProps) {
  const tAll = useStrings();
  // Soft fallback strings: this feature predates a localized i18n
  // namespace. Pull from the simulations close label when it exists,
  // otherwise show literals — easy to swap once strings ship.
  const closeLabel = tAll.flowBuilder.simulations.close ?? 'Close';

  const { draw, drawTool, setDrawTool } = useMapDraw();
  const selected = draw.selectedShape;

  const handleSave = () => {
    // Save = commit any in-flight draft AND deselect, mirroring the
    // sandbox toolbar's Save action. With nothing in-flight it acts as
    // a "done with this shape" affordance that drops back to idle.
    if (draw.draft) draw.finishDraft();
    draw.setSelectedId(null);
    setDrawTool(null);
  };

  const handleDelete = () => {
    if (selected) draw.deleteShape(selected.id);
  };

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
      footer={
        selected ? (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-red-300 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        ) : null
      }
    >
      <ToolPicker drawTool={drawTool} onPick={setDrawTool} />

      {selected ? (
        <ShapeInspector
          shape={selected}
          onPatch={(patch) => draw.updateShape(selected.id, patch)}
        />
      ) : (
        <p className="text-[12px] leading-snug text-white/50">
          {drawTool
            ? 'Click on the map to start drawing. Double-click or press Enter to finish.'
            : 'Pick a tool above, then click on the map to draw.'}
        </p>
      )}
    </DockedPanel>
  );
}

// ---------------------------------------------------------------------------
// Tool picker
// ---------------------------------------------------------------------------

function ToolPicker({
  drawTool,
  onPick,
}: {
  drawTool: MapDrawTool | null;
  onPick: (tool: MapDrawTool | null) => void;
}) {
  const tools: { id: MapDrawTool; label: string; Icon: typeof PolygonDrawIcon }[] = [
    { id: 'polygon', label: 'Polygon', Icon: PolygonDrawIcon },
    { id: 'line', label: 'Line', Icon: LineDrawIcon },
    { id: 'curve', label: 'Curve', Icon: CurveDrawIcon },
  ];

  return (
    <section className="space-y-2">
      <h3 className={TYPE_GROUP_TITLE}>Tools</h3>
      <div role="group" aria-label="Drawing tools" className="grid grid-cols-3 gap-2">
        {tools.map((t) => {
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
    </section>
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
  const strokeWidth = shape.strokeWidth ?? 2;

  return (
    <div className="space-y-5">
      <AnnotationField shape={shape} onPatch={onPatch} />
      <StatusField shape={shape} onPatch={onPatch} />
      <FillSection shape={shape} fillMode={fillMode} onPatch={onPatch} />
      <LineSection lineStyle={lineStyle} strokeWidth={strokeWidth} color={shape.color} onPatch={onPatch} />
    </div>
  );
}

function AnnotationField({
  shape,
  onPatch,
}: {
  shape: GeoShape;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  // Treat the engine's auto-generated `${tool.label} N` placeholder as
  // empty so the field reads as blank until the user types something
  // meaningful. Re-keying on `shape.id` resets the local input when the
  // selection moves to a different shape.
  const isAuto = looksAuto(shape.name);
  const value = isAuto ? '' : shape.name;

  return (
    <section className="space-y-1.5">
      <label htmlFor={`annotation-${shape.id}`} className={FIELD_LABEL}>
        Annotation
      </label>
      <input
        id={`annotation-${shape.id}`}
        key={shape.id}
        type="text"
        defaultValue={value}
        placeholder="зона для машин и самолетов"
        onBlur={(e) => {
          const next = e.target.value.trim();
          if (next.length === 0) {
            // Restore the auto-name so the in-shape label stays hidden.
            return;
          }
          if (next !== shape.name) onPatch({ name: next });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-white/30"
      />
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
    <section className="space-y-1.5">
      <label className={FIELD_LABEL}>Area status</label>
      <Select
        value={shape.status ?? ''}
        onValueChange={(v) => onPatch({ status: v as GeoAreaStatus })}
      >
        <SelectTrigger
          size="sm"
          className="w-full bg-white/5 text-white border-white/10 hover:bg-white/10"
        >
          <SelectValue placeholder="Select a status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: opt.tone }}
                />
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
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
    <section className="space-y-2">
      <h3 className={TYPE_GROUP_TITLE}>Fill</h3>
      <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
        {FILL_MODES.map((mode) => {
          const active = fillMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPatch({ fillMode: mode.id })}
              className={`flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors ${
                active
                  ? 'bg-violet-500/30 text-white shadow-inner'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-11 gap-1.5">
        {[...PALETTE_VIBRANT, ...PALETTE_PASTEL].map((hex, i) => {
          if (!hex) {
            return (
              <button
                key={`custom-${i}`}
                type="button"
                aria-label="Custom color"
                onClick={() => {
                  // No native picker mounted in this prototype; the slot
                  // cycles through pastel hues to demonstrate the affordance.
                  const hues = ['#fde68a', '#a7f3d0', '#fbcfe8', '#bae6fd'];
                  const next = hues[Math.floor(Math.random() * hues.length)];
                  onPatch({ color: next });
                }}
                className="size-6 rounded-full border border-white/15"
                style={{
                  background:
                    'conic-gradient(from 0deg, #ef4444, #facc15, #34d399, #22d3ee, #6366f1, #ec4899, #ef4444)',
                }}
              />
            );
          }
          const active = shape.color.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={`${hex}-${i}`}
              type="button"
              aria-label={hex}
              aria-pressed={active}
              onClick={() => onPatch({ color: hex })}
              className={`size-6 rounded-full border transition-shadow ${
                active
                  ? 'border-violet-300 ring-2 ring-violet-400/70'
                  : 'border-white/15 hover:border-white/40'
              }`}
              style={{ background: hex }}
            />
          );
        })}
      </div>
    </section>
  );
}

function LineSection({
  lineStyle,
  strokeWidth,
  color,
  onPatch,
}: {
  lineStyle: GeoLineStyle;
  strokeWidth: number;
  color: string;
  onPatch: (patch: Partial<GeoShape>) => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className={TYPE_GROUP_TITLE}>Line</h3>
      <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
        {LINE_STYLES.map((mode) => {
          const active = lineStyle === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPatch({ lineStyle: mode.id })}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1 text-[12px] font-medium transition-colors ${
                active
                  ? 'bg-violet-500/30 text-white shadow-inner'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <LineGlyph style={mode.id} />
              {mode.label}
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span className="uppercase tracking-wide">Thickness</span>
          <span className="font-mono text-white">{strokeWidth.toFixed(0)} px</span>
        </div>
        <Slider
          value={[strokeWidth]}
          min={1}
          max={12}
          step={1}
          onValueChange={([v]) => onPatch({ strokeWidth: v })}
          className="mt-2"
          aria-label="Line thickness"
          disabled={lineStyle === 'none'}
        />
        <div className="mt-3 flex items-center justify-center rounded-md border border-white/10 bg-black/30 py-3">
          <svg width="160" height="24" viewBox="0 0 160 24">
            <line
              x1={4}
              y1={12}
              x2={156}
              y2={12}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeOpacity={lineStyle === 'none' ? 0.2 : 1}
              strokeDasharray={lineStyle === 'dashed' ? '10 6' : undefined}
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * The drawing engine names freshly committed shapes `${tool.label} N`.
 * We treat anything matching that pattern as "no real annotation yet"
 * so the field reads blank until the user types something.
 */
function looksAuto(name: string | undefined): boolean {
  if (!name) return true;
  return /^(Polygon|Line|Curve|No Fly Zone|Patrol Area|Virtual Wall|Critical Point|Free Drawing) \d+$/.test(
    name,
  );
}
