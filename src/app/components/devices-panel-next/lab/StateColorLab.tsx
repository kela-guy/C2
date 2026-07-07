/**
 * `/devices-lab` state-color study — the health-aware marker ring + the
 * offline redesign, spread out so every state is visible at once.
 *
 * Decisions locked and MERGED into production:
 *   1. Ring carries health: black/ok, amber/warning, red/error. The glyph
 *      stays white. `critical` was dropped — error is the top tier.
 *   2. Hover / selected ALWAYS flips the ring white, regardless of health —
 *      interaction wins; the health color returns on mouse-out.
 *   3. Offline: dashed gray ring + wifi-off corner badge on the map,
 *      dimmed tile + badge + chip in the panel.
 *
 * The shared logic lives in `src/primitives/markerStyles.ts`
 * (`resolveAssetMarkerStyle`) — this page is its visual regression sheet.
 */

import { useState, type FC, type ReactNode } from 'react';
import { MapMarker } from '@/primitives/MapMarker';
import {
  ASSET_HEALTH_LABELS,
  ASSET_HEALTH_RING_COLOR,
  resolveAssetMarkerStyle,
  type AssetHealth,
  type AssetMarkerInteraction,
} from '@/primitives/markerStyles';
import { MarkerOfflineBadge, WifiOffGlyph } from '../../devices-panel/OfflineBadge';
import { MapPinIcon } from '../../devices-panel/icons';
import { CameraIcon, RadarIcon, SensorIcon, SpeakerIcon } from '../../tacticalIcons';

type TileIcon = FC<{ size?: number; fill?: string; outlined?: boolean }>;

const LAB_HEALTHS: AssetHealth[] = ['ok', 'warning', 'error', 'offline'];

const INTERACTIONS: AssetMarkerInteraction[] = ['default', 'hovered', 'selected'];

const INTERACTION_LABELS: Record<AssetMarkerInteraction, string> = {
  default: 'Default',
  hovered: 'Hovered',
  selected: 'Selected',
  active: 'Active',
};

/** Faux-map cell so markers read against the same darkness they ship on. */
function MapCell({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex h-[88px] w-[88px] items-center justify-center rounded-md border border-white/[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 35% 30%, rgba(56,189,248,0.06), transparent 55%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 22px 22px, 22px 22px',
          backgroundColor: '#101014',
        }}
      >
        {children}
      </div>
      <span className="max-w-[96px] text-center text-2xs leading-tight text-white/45">{caption}</span>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-white/80">{title}</div>
        {note && <div className="mt-0.5 max-w-[760px] text-xs-plus leading-snug text-white/40">{note}</div>}
      </div>
      <div className="rounded-md border border-white/[0.06] bg-surface-2 p-4">{children}</div>
    </div>
  );
}

/**
 * One marker under the health model. Hover/selected always flips the ring
 * white (`interactionRing: 'white'` — the locked decision). Offline markers
 * carry the wifi-off badge; `offlineRing` picks between the two finalists.
 */
function HealthMarker({
  health,
  interaction,
  Icon = CameraIcon,
  offlineRing = 'dashed',
}: {
  health: AssetHealth;
  interaction: AssetMarkerInteraction;
  Icon?: TileIcon;
  offlineRing?: 'dashed' | 'solid';
}) {
  const base = resolveAssetMarkerStyle(health, interaction);
  const style = health === 'offline' ? { ...base, ringDash: offlineRing } : base;
  return (
    <div className="relative inline-flex">
      <MapMarker
        icon={<Icon outlined fill={style.glyphColor} />}
        style={style}
        surfaceSize={42}
        ringSize={42}
        pulse={interaction !== 'default'}
      />
      {health === 'offline' && <MarkerOfflineBadge />}
    </div>
  );
}

/**
 * Live marker — real hover/click, not a frozen matrix cell. Mouse-over flips
 * the ring white (the locked decision) with the glow spring; click toggles
 * selected. This is the same state machine the production map will drive.
 */
function LiveMarker({
  health,
  offlineRing = 'dashed',
}: {
  health: AssetHealth;
  offlineRing?: 'dashed' | 'solid';
}) {
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const interaction: AssetMarkerInteraction = hovered ? 'hovered' : selected ? 'selected' : 'default';
  const base = resolveAssetMarkerStyle(health, interaction);
  const style = health === 'offline' ? { ...base, ringDash: offlineRing } : base;
  return (
    <div className="relative inline-flex">
      <MapMarker
        icon={<CameraIcon outlined fill={style.glyphColor} />}
        style={style}
        surfaceSize={42}
        ringSize={42}
        label={`${ASSET_HEALTH_LABELS[health]}${selected ? ' · selected' : ''}`}
        showLabel={hovered || selected}
        pulse={selected}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setSelected((s) => !s)}
      />
      {health === 'offline' && <MarkerOfflineBadge />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Offline audition — panel row candidates                             */
/* ------------------------------------------------------------------ */

/** Minimal device-row chrome (tile + name) so the tile candidates read in context. */
function PanelRow({
  tile,
  name = 'North camera',
  chip,
}: {
  tile: ReactNode;
  name?: string;
  chip?: ReactNode;
}) {
  return (
    <div className="flex w-[240px] items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
      {tile}
      <span className="min-w-0 flex-1 truncate text-start text-sm font-medium text-slate-11">{name}</span>
      {chip}
    </div>
  );
}

function TileFrame({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function TileOfflineBadge() {
  return (
    <span
      className="pointer-events-none absolute flex items-center justify-center rounded-full text-slate-10"
      style={{
        width: 14,
        height: 14,
        right: -4,
        bottom: -4,
        background: 'rgba(24,24,27,0.95)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <WifiOffGlyph size={9} />
    </span>
  );
}

function OfflineChip() {
  return (
    <span className="inline-flex h-4 shrink-0 items-center gap-1 rounded-[2px] bg-white/[0.06] px-1.5 text-2xs font-medium leading-4 text-slate-10">
      <WifiOffGlyph size={9} />
      Offline
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cross-check strip — panel tile vs map marker per health             */
/* ------------------------------------------------------------------ */

/** Panel tile tints — mirrors `DEVICE_HEALTH_VISUAL` (kept inline like `DeviceTileStates`). */
const TILE_BG: Record<AssetHealth, string> = {
  ok: 'rgba(255,255,255,0.1)',
  warning: 'oklch(0.733 0.194 75 / 0.3)',
  error: 'oklch(0.384 0.13 25)',
  offline: 'rgba(255,255,255,0.04)',
};

const TILE_FILL: Record<AssetHealth, string> = {
  ok: 'white',
  warning: 'white',
  error: 'white',
  offline: 'rgba(255,255,255,0.4)',
};

/* ------------------------------------------------------------------ */

export function StateColorLab() {
  return (
    <section className="flex flex-col gap-10">
      <div>
        <h2 className="text-sm font-semibold text-white/90">State colors — health on the map ring</h2>
        <p className="mt-1 max-w-[760px] text-xs text-white/45">
          The marker ring is the health channel: black when OK, amber for warning, red for error
          (no separate critical tier). The glyph stays white. Hover/selected always flips the ring
          white — interaction wins, the health color returns on mouse-out. Offline carries a
          wifi-off badge; two ring finalists below.
        </p>
      </div>

      <Group
        title="Live playground — hover and click the markers"
        note="Real interaction, not frozen cells: mouse-over flips the ring white with the glow; mouse-out returns the health color; click toggles selected (pulse + label)."
      >
        <div
          className="flex flex-wrap items-center justify-around gap-10 rounded-md border border-white/[0.06] px-10 py-12"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, rgba(56,189,248,0.07), transparent 50%), radial-gradient(circle at 75% 75%, rgba(248,113,113,0.05), transparent 45%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 100% 100%, 26px 26px, 26px 26px',
            backgroundColor: '#0d0d11',
          }}
        >
          {LAB_HEALTHS.map((health) => (
            <div key={health} className="flex flex-col items-center gap-3">
              <LiveMarker health={health} />
              <span className="text-2xs text-white/45">{ASSET_HEALTH_LABELS[health]}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group
        title="Marker matrix — hover / selected flips the ring white"
        note="Ring speaks health at rest; the white ring + glow is the interaction cue. Offline shown with the dashed-ring finalist."
      >
        <div className="flex flex-col gap-6">
          {LAB_HEALTHS.map((health) => (
            <div key={health} className="flex items-center gap-6">
              <div className="w-20 shrink-0">
                <div className="text-xs font-medium text-white/70">{ASSET_HEALTH_LABELS[health]}</div>
                <div className="mt-0.5 font-mono text-2xs text-white/35">
                  {ASSET_HEALTH_RING_COLOR[health]}
                </div>
              </div>
              <div className="flex gap-6">
                {INTERACTIONS.map((interaction) => (
                  <MapCell key={interaction} caption={INTERACTION_LABELS[interaction]}>
                    <HealthMarker health={health} interaction={interaction} />
                  </MapCell>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Group>

      <Group
        title="Offline finalists — map marker"
        note="Both carry the wifi-off badge; the only difference is the ring. Pick one."
      >
        <div className="flex flex-wrap gap-6">
          <MapCell caption="A. Dashed gray ring + wifi-off badge">
            <HealthMarker health="offline" interaction="default" offlineRing="dashed" />
          </MapCell>
          <MapCell caption="B. Solid gray ring + wifi-off badge">
            <HealthMarker health="offline" interaction="default" offlineRing="solid" />
          </MapCell>
        </div>
      </Group>

      <Group
        title="Offline panel row — chosen: badge + chip (option C)"
        note="Corner badge on the tile + offline chip in the row. The chip sits inline-start of Show-on-map — left of the icon in LTR, right of it in RTL (flip the page direction toggle to check). This is live in the docked panel on the side."
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col items-center gap-2">
            <PanelRow
              tile={
                <TileFrame style={{ backgroundColor: TILE_BG.offline }}>
                  <CameraIcon size={20} fill={TILE_FILL.offline} />
                  <TileOfflineBadge />
                </TileFrame>
              }
              chip={
                <>
                  <OfflineChip />
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-10">
                    <MapPinIcon size={12} />
                  </span>
                </>
              }
            />
            <span className="text-2xs text-white/45">Chosen — badge + chip, Show-on-map stays</span>
          </div>
        </div>
      </Group>

      <Group
        title="Cross-check — panel tile vs map marker, same health"
        note="The two surfaces should tell the same story per health tier. Offline shown with the dashed-ring finalist + badge on both."
      >
        <div className="flex flex-wrap gap-8">
          {LAB_HEALTHS.map((health) => (
            <div key={health} className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-4">
                <TileFrame style={{ backgroundColor: TILE_BG[health] }}>
                  <CameraIcon size={20} fill={TILE_FILL[health]} />
                  {health === 'offline' && <TileOfflineBadge />}
                </TileFrame>
                <HealthMarker health={health} interaction="default" />
              </div>
              <span className="text-2xs text-white/45">{ASSET_HEALTH_LABELS[health]}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group
        title="Glyph legibility across device types (warning ring)"
        note="Sanity check that the white glyph stays legible inside a colored ring across the device glyph set."
      >
        <div className="flex flex-wrap gap-6">
          {(
            [
              ['Camera', CameraIcon],
              ['Radar', RadarIcon],
              ['Sensor', SensorIcon],
              ['Speaker', SpeakerIcon],
            ] as [string, TileIcon][]
          ).map(([label, Icon]) => (
            <MapCell key={label} caption={label}>
              <HealthMarker health="warning" interaction="default" Icon={Icon} />
            </MapCell>
          ))}
        </div>
      </Group>
    </section>
  );
}
