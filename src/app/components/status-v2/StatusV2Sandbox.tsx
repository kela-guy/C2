/**
 * `/status-v2` — DEV-only design exploration (round 2 of the status work).
 *
 * Two hypotheses under test, side by side on a faux map tile + a lean
 * asset panel:
 *
 *   1. **Affiliation by shape** — hostile detections drop the circle ring
 *      for a square (or diamond) silhouette, so "mine vs. threat" reads
 *      from geometry before color. Toggle between circle / square /
 *      diamond to feel each.
 *
 *   2. **Two-status model** — collapse today's online / error / offline
 *      trichotomy into online / error, where "offline" becomes one of
 *      several *reasons* inside the error state (fault, low battery,
 *      stale link, offline). Toggle between the current and proposed
 *      models to compare how the same scenario reads.
 *
 * Self-contained: no production module imports anything from here.
 * Guarded by `import.meta.env.DEV` in {@link import('@/app/App')}.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from '@/lib/icons/central';
import { MapMarker } from '@/primitives/MapMarker';
import {
  resolveAssetMarkerStyle,
  resolveMarkerStyle,
  type AssetHealth,
  type MarkerStyle,
} from '@/primitives/markerStyles';
import { HealthBadge, StatusDot, type HealthTone } from '@/primitives/HealthStatus';
import { cn } from '@/shared/components/ui/utils';
import { WifiOffGlyph } from '../devices-panel/OfflineBadge';
import { DroneIcon } from '../tacticalIcons';
import { ASSET_KIND_ICON } from '../assetKindIcons';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/** Everything that isn't "working" is an error WITH a reason. */
export type ErrorReason = 'offline' | 'fault' | 'lowBattery' | 'staleLink';

export type AssetState = { kind: 'online' } | { kind: 'error'; reason: ErrorReason };

const ERROR_REASONS: ErrorReason[] = ['offline', 'fault', 'lowBattery', 'staleLink'];

const REASON_LABELS: Record<ErrorReason, string> = {
  offline: 'Offline',
  fault: 'Fault',
  lowBattery: 'Low battery',
  staleLink: 'Stale link',
};

type AssetKind = 'camera' | 'radar' | 'jammer' | 'lidar' | 'launcher';

// Sandbox `jammer` is the canonical registry's `sensor` (ECM) kind.
const KIND_ICONS: Record<AssetKind, (p: { size?: number; fill?: string }) => ReactNode> = {
  camera: (p) => <ASSET_KIND_ICON.camera {...p} />,
  radar: (p) => <ASSET_KIND_ICON.radar {...p} />,
  jammer: (p) => <ASSET_KIND_ICON.sensor {...p} />,
  lidar: (p) => <ASSET_KIND_ICON.lidar {...p} />,
  launcher: (p) => <ASSET_KIND_ICON.launcher {...p} />,
};

interface SandboxAsset {
  id: string;
  name: string;
  kind: AssetKind;
  state: AssetState;
  x: number;
  y: number;
}

interface SandboxHostile {
  id: string;
  name: string;
  x: number;
  y: number;
}

const INITIAL_ASSETS: SandboxAsset[] = [
  { id: 'cam-north', name: 'North Camera', kind: 'camera', state: { kind: 'online' }, x: 0.22, y: 0.24 },
  { id: 'radar-east', name: 'East Radar', kind: 'radar', state: { kind: 'error', reason: 'fault' }, x: 0.6, y: 0.16 },
  { id: 'jammer-1', name: 'Jammer 1', kind: 'jammer', state: { kind: 'online' }, x: 0.8, y: 0.48 },
  { id: 'lidar-gate', name: 'Gate Lidar', kind: 'lidar', state: { kind: 'error', reason: 'offline' }, x: 0.4, y: 0.52 },
  { id: 'launcher-2', name: 'Launcher 2', kind: 'launcher', state: { kind: 'error', reason: 'lowBattery' }, x: 0.24, y: 0.78 },
];

const HOSTILES: SandboxHostile[] = [
  { id: 'trk-101', name: 'TRK-101', x: 0.52, y: 0.3 },
  { id: 'trk-102', name: 'TRK-102', x: 0.72, y: 0.72 },
  { id: 'trk-103', name: 'TRK-103', x: 0.36, y: 0.12 },
];

// ---------------------------------------------------------------------------
// Model mapping — one scenario, two vocabularies
// ---------------------------------------------------------------------------

type StatusModel = 'current' | 'proposed';
type HostileShape = 'circle' | 'square' | 'diamond';

/**
 * How the asset's state renders under each model.
 *  - current: the shipped 4-tier read — ok / warning (degraded but working:
 *    low battery, stale link) / error (fault) / offline (gray, known-absent).
 *  - proposed: online / error only — every failure is red, the reason rides
 *    as text (panel chip, tooltip) instead of its own color tier.
 */
function assetHealthFor(model: StatusModel, state: AssetState): AssetHealth {
  if (state.kind === 'online') return 'ok';
  if (model === 'current') {
    if (state.reason === 'offline') return 'offline';
    if (state.reason === 'lowBattery' || state.reason === 'staleLink') return 'warning';
    return 'error';
  }
  return 'error';
}

function chipToneFor(model: StatusModel, state: AssetState): HealthTone {
  return assetHealthFor(model, state) as HealthTone;
}

function chipLabelFor(model: StatusModel, state: AssetState): string {
  if (state.kind === 'online') return 'Online';
  if (model === 'current') {
    const health = assetHealthFor(model, state);
    if (health === 'offline') return 'Offline';
    if (health === 'warning') return REASON_LABELS[state.reason];
    return `Error — ${REASON_LABELS[state.reason]}`;
  }
  return `Error — ${REASON_LABELS[state.reason]}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StatusV2Sandbox() {
  const [model, setModel] = useState<StatusModel>('proposed');
  const [hostileShape, setHostileShape] = useState<HostileShape>('square');
  const [grayscale, setGrayscale] = useState(false);
  const [assets, setAssets] = useState<SandboxAsset[]>(INITIAL_ASSETS);

  const setAssetState = (id: string, state: AssetState) =>
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, state } : a)));

  const errorCount = useMemo(
    () => assets.filter((a) => a.state.kind === 'error').length,
    [assets],
  );

  return (
    <div dir="ltr" className="flex h-screen w-screen overflow-hidden bg-[#0b0b0d] font-sans text-white">
      {/* ------------------------------------------------ controls aside */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-e border-white/10 bg-[#0e0e11] px-5 py-5">
        <div>
          <Link
            to="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white"
          >
            <ChevronLeft size={14} />
            Back to dashboard
          </Link>
          <h1 className="text-base font-semibold text-white">Status v2 — shape + 2-status</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            Hypothesis 1: hostile detections read by <em>ring shape</em>, not just red.
            Hypothesis 2: online / error is enough — &quot;offline&quot; is a reason inside
            error, not a third peer status.
          </p>
        </div>

        <Section label="Status model">
          <SegmentedControl
            value={model}
            onChange={setModel}
            options={[
              { value: 'current', label: '3 statuses (today)' },
              { value: 'proposed', label: '2 statuses (proposed)' },
            ]}
          />
          <p className="text-2xs leading-relaxed text-white/40">
            {model === 'current'
              ? 'The shipped tiers: green ok, amber warning (low battery / stale link), red error, gray + dashed offline.'
              : 'Online / Error only — every failure is red with a reason label. Watch what the amber "degraded but working" and gray "known-absent" reads collapse into.'}
          </p>
        </Section>

        <Section label="Hostile ring shape">
          <SegmentedControl
            value={hostileShape}
            onChange={setHostileShape}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'square', label: 'Square' },
              { value: 'diamond', label: 'Diamond' },
            ]}
          />
          <p className="text-2xs leading-relaxed text-white/40">
            Diamond is the MIL-STD-2525 hostile frame — included so square is compared
            against the convention, not only against the circle.
          </p>
        </Section>

        <Section label="Force asset states">
          <div className="flex flex-col gap-1.5">
            {assets.map((asset) => (
              <AssetControlRow key={asset.id} asset={asset} onChange={setAssetState} />
            ))}
          </div>
        </Section>

        <Section label="Stress">
          <ToggleRow label="Grayscale (color-blind / sunlight)" checked={grayscale} onChange={setGrayscale} />
        </Section>
      </aside>

      {/* ------------------------------------------------ preview */}
      <main
        className="flex flex-1 flex-col gap-4 overflow-auto p-6"
        style={grayscale ? { filter: 'grayscale(1)' } : undefined}
      >
        {/* Map tile */}
        <div
          className="relative h-[46%] min-h-[300px] shrink-0 overflow-hidden rounded-[8px] border border-white/10 bg-[#33373d]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        >
          <div className="absolute start-3 top-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-white/35">
            Map
          </div>
          {assets.map((asset) => (
            <MapCell key={asset.id} x={asset.x} y={asset.y}>
              <AssetMarker model={model} asset={asset} />
            </MapCell>
          ))}
          {HOSTILES.map((hostile) => (
            <MapCell key={hostile.id} x={hostile.x} y={hostile.y}>
              <HostileMarker shape={hostileShape} />
            </MapCell>
          ))}
        </div>

        {/* Asset panel */}
        <div className="w-[420px] overflow-hidden rounded-[8px] border border-white/10 bg-[#111114]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2">
            <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-white/35">
              Assets
            </span>
            {errorCount > 0 && (
              <HealthBadge tone="error" className="gap-1">
                <StatusDot tone="error" />
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </HealthBadge>
            )}
          </div>
          {assets.map((asset) => (
            <PanelRow key={asset.id} model={model} asset={asset} />
          ))}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map half
// ---------------------------------------------------------------------------

function MapCell({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="absolute"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%)' }}
    >
      {children}
    </div>
  );
}

function AssetMarker({ model, asset }: { model: StatusModel; asset: SandboxAsset }) {
  const health = assetHealthFor(model, asset.state);
  const style = resolveAssetMarkerStyle(health);
  const offlineBadge =
    asset.state.kind === 'error' && asset.state.reason === 'offline';
  return (
    <div className="relative">
      <MapMarker
        icon={<>{KIND_ICONS[asset.kind]({ size: 16, fill: style.glyphColor })}</>}
        style={style}
        surfaceSize={34}
        label={asset.name}
      />
      {offlineBadge && (
        <div
          className="pointer-events-none absolute z-[6] flex items-center justify-center rounded-full text-slate-11"
          style={{
            width: 16,
            height: 16,
            right: -4,
            top: -4,
            background: 'rgba(10,10,10,0.95)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <WifiOffGlyph size={10} />
        </div>
      )}
    </div>
  );
}

function HostileMarker({ shape }: { shape: HostileShape }) {
  const style: MarkerStyle = {
    ...resolveMarkerStyle('default', 'hostile'),
    ringShape: shape,
  };
  return (
    <MapMarker
      icon={<DroneIcon size={18} color={style.glyphColor} />}
      style={style}
      surfaceSize={34}
    />
  );
}

// ---------------------------------------------------------------------------
// Panel half — a deliberately lean row (not the production DeviceRow)
// ---------------------------------------------------------------------------

function PanelRow({ model, asset }: { model: StatusModel; asset: SandboxAsset }) {
  const health = assetHealthFor(model, asset.state);
  const tone = chipToneFor(model, asset.state);
  const offline = asset.state.kind === 'error' && asset.state.reason === 'offline';

  const tileTint =
    health === 'error'
      ? 'bg-accent-danger-tint'
      : health === 'warning'
        ? 'bg-accent-warning-tint'
        : health === 'offline'
          ? 'bg-white/[0.04]'
          : 'bg-white/[0.06]';

  return (
    <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5 last:border-b-0">
      <div className={cn('relative flex size-8 shrink-0 items-center justify-center rounded', tileTint)}>
        {KIND_ICONS[asset.kind]({
          size: 20,
          fill: health === 'offline' ? 'rgba(255,255,255,0.45)' : 'white',
        })}
        {offline && (
          <span className="absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-full border border-white/20 bg-[#0f0f11] text-slate-11">
            <WifiOffGlyph size={9} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-xs font-medium', health === 'offline' ? 'text-white/50' : 'text-white/90')}>
          {asset.name}
        </div>
        <div className="text-2xs text-white/35 capitalize">{asset.kind}</div>
      </div>
      <HealthBadge tone={tone} className="gap-1">
        <StatusDot tone={tone} />
        {chipLabelFor(model, asset.state)}
      </HealthBadge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aside widgets
// ---------------------------------------------------------------------------

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-2xs font-semibold uppercase tracking-[0.08em] text-white/35">{label}</div>
      {children}
    </section>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-[5px] border border-white/10 bg-white/[0.03] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-[3px] px-1.5 py-1 text-2xs font-medium leading-none transition-colors',
            value === opt.value ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/75',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function AssetControlRow({
  asset,
  onChange,
}: {
  asset: SandboxAsset;
  onChange: (id: string, state: AssetState) => void;
}) {
  const current =
    asset.state.kind === 'online' ? 'online' : asset.state.reason;
  return (
    <div className="flex items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate text-2xs text-white/70">{asset.name}</span>
      <select
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          onChange(
            asset.id,
            v === 'online' ? { kind: 'online' } : { kind: 'error', reason: v as ErrorReason },
          );
        }}
        className="rounded-[4px] border border-white/10 bg-[#141417] px-1.5 py-1 text-2xs text-white/80 outline-none"
      >
        <option value="online">Online</option>
        {ERROR_REASONS.map((r) => (
          <option key={r} value={r}>
            Error — {REASON_LABELS[r]}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-white/[0.03] px-2 py-1.5 text-start transition-colors hover:bg-white/[0.06]"
    >
      <span className="text-2xs text-white/70">{label}</span>
      <span
        className={cn(
          'relative h-3.5 w-6 shrink-0 rounded-full transition-colors',
          checked ? 'bg-white/60' : 'bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-2.5 rounded-full bg-[#0b0b0d] transition-all',
            checked ? 'start-3' : 'start-0.5',
          )}
        />
      </span>
    </button>
  );
}
