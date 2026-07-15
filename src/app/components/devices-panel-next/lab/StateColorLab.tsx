/**
 * `/devices-lab` state-color study — the shipped binary health model,
 * spread out so both states are visible at once.
 *
 * Decisions locked and MERGED into production:
 *   1. Health is binary: ok or error. Offline, stale links, low battery, and
 *      malfunctions are error reasons, not separate color tiers.
 *   2. The resting ring is the map error signal: black when ok, red on
 *      error. Interaction (hover/selected) still flips it white.
 *   3. Panel tiles use the neutral OK surface or the red error surface.
 *
 * The shared logic lives in `src/primitives/markerStyles.ts`
 * (`resolveAssetMarkerStyle`) — this page is its visual regression sheet.
 */

import { useState, type FC, type ReactNode } from 'react';
import { MapMarker } from '@/primitives/MapMarker';
import {
  ASSET_HEALTH_ERROR_COLOR,
  ASSET_HEALTH_LABELS,
  resolveAssetMarkerStyle,
  type AssetHealth,
  type AssetMarkerInteraction,
} from '@/primitives/markerStyles';
import { CameraIcon, RadarIcon, SensorIcon, SpeakerIcon } from '../../tacticalIcons';

type TileIcon = FC<{ size?: number; fill?: string; outlined?: boolean }>;

const LAB_HEALTHS: AssetHealth[] = ['ok', 'error'];

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
 * One marker under the binary health model. The body remains neutral and
 * errors add the shared corner-dot primitive.
 */
function HealthMarker({
  health,
  interaction,
  Icon = CameraIcon,
}: {
  health: AssetHealth;
  interaction: AssetMarkerInteraction;
  Icon?: TileIcon;
}) {
  const style = resolveAssetMarkerStyle(health, interaction);
  return (
    <MapMarker
      icon={<Icon outlined fill={style.glyphColor} />}
      style={style}
      surfaceSize={42}
      ringSize={42}
      pulse={interaction === 'selected' || interaction === 'active'}
    />
  );
}

/**
 * Live marker — real hover/click, not a frozen matrix cell. Mouse-over flips
 * the ring white (the locked decision) with the glow spring; click toggles
 * selected. This is the same state machine the production map will drive.
 */
function LiveMarker({
  health,
}: {
  health: AssetHealth;
}) {
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const interaction: AssetMarkerInteraction = hovered ? 'hovered' : selected ? 'selected' : 'default';
  const style = resolveAssetMarkerStyle(health, interaction);
  return (
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

/* ------------------------------------------------------------------ */
/* Cross-check strip — panel tile vs map marker per health             */
/* ------------------------------------------------------------------ */

/** Panel tile tints — mirrors `DEVICE_HEALTH_VISUAL` (kept inline like `DeviceTileStates`). */
const TILE_BG: Record<AssetHealth, string> = {
  ok: 'rgba(255,255,255,0.1)',
  error: 'oklch(0.384 0.13 25)',
};

const TILE_FILL: Record<AssetHealth, string> = {
  ok: 'white',
  error: 'white',
};

/* ------------------------------------------------------------------ */

export function StateColorLab() {
  return (
    <section className="flex flex-col gap-10">
      <div>
        <h2 className="text-sm font-semibold text-white/90">State colors — binary asset health</h2>
        <p className="mt-1 max-w-[760px] text-xs text-white/45">
          Errors paint the resting ring red on the map and the tile red in the panel; offline,
          malfunction, low battery, and stale link remain text reasons inside error.
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
        title="Marker matrix — health owns the resting ring"
        note="Error paints the resting ring red; hover and selected flip it white (interaction wins) and the red returns on mouse-out."
      >
        <div className="flex flex-col gap-6">
          {LAB_HEALTHS.map((health) => (
            <div key={health} className="flex items-center gap-6">
              <div className="w-20 shrink-0">
                <div className="text-xs font-medium text-white/70">{ASSET_HEALTH_LABELS[health]}</div>
                <div className="mt-0.5 font-mono text-2xs text-white/35">
                  {health === 'error' ? ASSET_HEALTH_ERROR_COLOR : 'neutral marker'}
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
        title="Cross-check — panel tile vs map marker, same health"
        note="The panel uses a red error tile while the map paints the marker's resting ring red — one hue, two surfaces."
      >
        <div className="flex flex-wrap gap-8">
          {LAB_HEALTHS.map((health) => (
            <div key={health} className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-4">
                <TileFrame style={{ backgroundColor: TILE_BG[health] }}>
                  <CameraIcon size={20} fill={TILE_FILL[health]} />
                </TileFrame>
                <HealthMarker health={health} interaction="default" />
              </div>
              <span className="text-2xs text-white/45">{ASSET_HEALTH_LABELS[health]}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group
        title="Error signal across device types"
        note="Sanity check that the red error ring reads consistently across the device glyph set."
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
              <HealthMarker health="error" interaction="default" Icon={Icon} />
            </MapCell>
          ))}
        </div>
      </Group>
    </section>
  );
}
