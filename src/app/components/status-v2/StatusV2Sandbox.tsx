/**
 * `/status-v2` — DEV-only demo of the SHIPPED status design.
 *
 * One scenario on the REAL Cesium map (same imagery + camera the
 * production dashboard uses) + a lean asset panel, rendering the locked
 * decisions:
 *
 *   1. **Hostile = diamond** — hostile detections carry a sharp-cornered
 *      black diamond ring (the ring only; the surface stays a circle) with
 *      a red glyph and constant expanding halo, so "mine vs. threat" reads
 *      from geometry and motion before color.
 *
 *   2. **Two statuses** — an asset is online or it has an error. The
 *      cause (offline, fault, low battery, stale link) is a reason label,
 *      never its own color tier. On the map the error paints the resting
 *      ring red; on the panel it's the red icon tile.
 *
 * Self-contained: no production module imports anything from here.
 * Guarded by `import.meta.env.DEV` in {@link import('@/app/App')}.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from '@/lib/icons/central';
import { CesiumMap, type CesiumHtmlMarker, type CesiumSceneMode } from '@/primitives/CesiumMap';
import { MapMarker } from '@/primitives/MapMarker';
import {
  resolveAssetMarkerStyle,
  resolveMarkerStyle,
  type AssetHealth,
} from '@/primitives/markerStyles';
import { HealthBadge, StatusDot, type HealthTone } from '@/primitives/HealthStatus';
import { cn } from '@/shared/components/ui/utils';
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
  lat: number;
  lon: number;
}

interface SandboxHostile {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

const ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

/**
 * Same opening frame as the production dashboard (`CesiumTacticalMap`'s
 * `DEFAULT_INITIAL_VIEW`) so marker judgments happen over the same ground.
 * In 2D the height is the orthographic frustum extent (≈ visible canvas
 * height in meters).
 */
const INITIAL_VIEW = { lat: 32.4666, lon: 35.0013, heightM: 15_000 };

// Scenario laid out around the dashboard's default camera target, spread
// so everything is on screen at the 15 km opening frame.
const INITIAL_ASSETS: SandboxAsset[] = [
  { id: 'cam-north', name: 'North Camera', kind: 'camera', state: { kind: 'online' }, lat: 32.4796, lon: 34.9789 },
  { id: 'radar-east', name: 'East Radar', kind: 'radar', state: { kind: 'error', reason: 'fault' }, lat: 32.4836, lon: 35.0093 },
  { id: 'jammer-1', name: 'Jammer 1', kind: 'jammer', state: { kind: 'online' }, lat: 32.4676, lon: 35.0253 },
  { id: 'lidar-gate', name: 'Gate Lidar', kind: 'lidar', state: { kind: 'error', reason: 'offline' }, lat: 32.4656, lon: 34.9933 },
  { id: 'launcher-2', name: 'Launcher 2', kind: 'launcher', state: { kind: 'error', reason: 'lowBattery' }, lat: 32.4526, lon: 34.9805 },
];

const HOSTILES: SandboxHostile[] = [
  { id: 'trk-101', name: 'TRK-101', lat: 32.4766, lon: 35.0029 },
  { id: 'trk-102', name: 'TRK-102', lat: 32.4556, lon: 35.0189 },
  { id: 'trk-103', name: 'TRK-103', lat: 32.4856, lon: 34.9901 },
];

// ---------------------------------------------------------------------------
// Shipped model mapping
// ---------------------------------------------------------------------------

function assetHealthFor(state: AssetState): AssetHealth {
  return state.kind === 'online' ? 'ok' : 'error';
}

function chipLabelFor(state: AssetState): string {
  if (state.kind === 'online') return 'Online';
  return `Error — ${REASON_LABELS[state.reason]}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StatusV2Sandbox() {
  const [grayscale, setGrayscale] = useState(false);
  const [sceneMode, setSceneMode] = useState<CesiumSceneMode>('2D');
  const [assets, setAssets] = useState<SandboxAsset[]>(INITIAL_ASSETS);

  const setAssetState = (id: string, state: AssetState) =>
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, state } : a)));

  const errorCount = useMemo(
    () => assets.filter((a) => a.state.kind === 'error').length,
    [assets],
  );

  const htmlMarkers = useMemo<CesiumHtmlMarker[]>(
    () => [
      ...assets.map((asset) => ({
        id: asset.id,
        lat: asset.lat,
        lon: asset.lon,
        zIndex: 10,
        content: <AssetMarker asset={asset} />,
      })),
      ...HOSTILES.map((hostile) => ({
        id: hostile.id,
        lat: hostile.lat,
        lon: hostile.lon,
        zIndex: 20,
        content: <HostileMarker />,
      })),
    ],
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
          <h1 className="text-base font-semibold text-white">Status — shipped design</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-white/55">
            Hostile reads by the black <em>diamond ring</em> + red glyph + expanding halo.
            Friendly assets are online or in error — the reason is text; on the map the
            error paints the ring red, on the panel it&apos;s the red icon tile.
          </p>
        </div>

        <Section label="Force asset states">
          <div className="flex flex-col gap-1.5">
            {assets.map((asset) => (
              <AssetControlRow key={asset.id} asset={asset} onChange={setAssetState} />
            ))}
          </div>
        </Section>

        <Section label="Map">
          <SegmentedControl
            value={sceneMode}
            onChange={setSceneMode}
            options={[
              { value: '2D', label: '2D' },
              { value: '3D', label: '3D' },
            ]}
          />
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
        {/* Real map — same Cesium surface + opening frame as the dashboard.
            Falls back to the dark CARTO basemap when no Ion token is set. */}
        <div className="relative isolate min-h-[300px] flex-1 overflow-hidden rounded-[8px] border border-white/10 bg-[#0b0b0d]">
          <CesiumMap
            ionToken={ION_TOKEN}
            darkMonochromeMap={!ION_TOKEN}
            initialView={INITIAL_VIEW}
            sceneMode={sceneMode}
            htmlMarkers={htmlMarkers}
            className="absolute inset-0"
          />
        </div>

        {/* Asset panel */}
        <div className="w-[420px] shrink-0 overflow-hidden rounded-[8px] border border-white/10 bg-[#111114]">
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
            <PanelRow key={asset.id} asset={asset} />
          ))}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map half
// ---------------------------------------------------------------------------

function AssetMarker({ asset }: { asset: SandboxAsset }) {
  const health = assetHealthFor(asset.state);
  // Error paints the resting ring red; the reason rides the label/panel.
  const style = resolveAssetMarkerStyle(health);
  return (
    <MapMarker
      icon={<>{KIND_ICONS[asset.kind]({ size: 16, fill: style.glyphColor })}</>}
      style={style}
      surfaceSize={34}
      label={asset.name}
    />
  );
}

function HostileMarker() {
  // Hostile affiliation carries the black diamond ring + red glyph; the
  // constant motion is MapMarker's expanding halo, not a pulsing ring.
  const style = resolveMarkerStyle('default', 'hostile');
  return (
    <MapMarker
      icon={<DroneIcon size={18} color={style.glyphColor} />}
      style={style}
      surfaceSize={34}
      pulse
    />
  );
}

// ---------------------------------------------------------------------------
// Panel half — a deliberately lean row (not the production DeviceRow)
// ---------------------------------------------------------------------------

function PanelRow({ asset }: { asset: SandboxAsset }) {
  const health = assetHealthFor(asset.state);
  const tone: HealthTone = health;

  // Same tile treatment as the production devices panel
  // (`DEVICE_HEALTH_VISUAL`): neutral when working, red on error.
  const tileTint = health === 'error' ? 'bg-accent-danger-soft' : 'bg-white/[0.06]';

  return (
    <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5 last:border-b-0">
      <div className={cn('relative flex size-8 shrink-0 items-center justify-center rounded', tileTint)}>
        {KIND_ICONS[asset.kind]({ size: 20, fill: 'white' })}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-white/90">{asset.name}</div>
        <div className="text-2xs text-white/35 capitalize">{asset.kind}</div>
      </div>
      <HealthBadge tone={tone} className="gap-1">
        <StatusDot tone={tone} />
        {chipLabelFor(asset.state)}
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
