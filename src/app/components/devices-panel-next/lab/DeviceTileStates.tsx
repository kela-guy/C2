/**
 * `/devices-lab` icon-tile study — every visual state of the device health
 * tile (the 32px glyph square that leads each device row), laid out so we can
 * stress the worst-wins severity treatment before it folds into
 * `DeviceRowHeader`.
 *
 * The tile carries one signal: the health tone, conveyed entirely by the tile
 * tint + icon fill (critical adds a ping). No corner dot — the background
 * colour is enough, so connection isn't drawn separately.
 *
 * This gallery shows the tones on their own and the same tone across device
 * glyphs to check legibility. Sandbox-only; the tile render mirrors
 * `CardLayoutLab`'s `DeviceTile`.
 */

import type { FC } from 'react';
import {
  CameraIcon,
  SensorIcon,
  SpeakerIcon,
  FloodlightIcon,
  RadarIcon,
  LidarIcon,
  LauncherIcon,
  DroneHiveIcon,
} from '../../tacticalIcons';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';

type TileIcon = FC<{ size?: number; fill?: string; active?: boolean }>;

/**
 * Lab tone set. Extends the four shared `DeviceHealth` tones with an `error`
 * tone — the same red tint as `critical` but static (no ping): critical means
 * "needs attention now" (pulses), error means "broken, already known" (still).
 */
type Tone = 'ok' | 'warning' | 'error' | 'critical' | 'offline';

/**
 * Tile background — a subtle severity-tinted fill only, no ring/border
 * (matches `CardLayoutLab`, cleaner than the shared `DEVICE_HEALTH_VISUAL`).
 * Critical adds the ping overlay below. Applied inline rather than via Tailwind
 * so the chosen arbitrary OKLCH tints render reliably. Picked from the audition:
 * warning = hue 75 step 9 at 30% tint, error/critical = hue 25 step 5 solid.
 */
const TONE_BG: Record<Tone, string> = {
  ok: 'rgba(255,255,255,0.1)',
  warning: 'oklch(0.733 0.194 75 / 0.3)',
  error: 'oklch(0.384 0.13 25)',
  critical: 'oklch(0.384 0.13 25)',
  offline: 'rgba(255,255,255,0.04)',
};

/** Critical-only pulse overlay — a brighter red so the ring reads as it expands over the solid tile. */
const CRITICAL_PING = 'oklch(0.591 0.192 25 / 0.55)';

/** Glyph fill — offline desaturates; every other tone keeps it legible. */
const TONE_FILL: Record<Tone, string> = {
  ok: 'white',
  warning: 'white',
  error: 'white',
  critical: 'white',
  offline: 'rgba(255,255,255,0.4)',
};

const TONE_ORDER: Tone[] = ['ok', 'warning', 'error', 'critical', 'offline'];

/**
 * The health tile, mirroring `CardLayoutLab`'s `DeviceTile` chrome: a
 * worst-wins tint, a critical-only ping, and the device glyph (desaturated
 * when offline). Health reads from the tint alone — no corner dot.
 */
function Tile({ tone, Icon }: { tone: Tone; Icon: TileIcon }) {
  return (
    <div
      data-health={tone}
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors duration-150 ease-out"
      style={{ backgroundColor: TONE_BG[tone] }}
    >
      {tone === 'critical' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded animate-ping motion-reduce:hidden"
          style={{ backgroundColor: CRITICAL_PING }}
        />
      )}
      <Icon size={20} fill={TONE_FILL[tone]} />
    </div>
  );
}

function Cell({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-[10px] leading-tight text-white/45">{caption}</span>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-white/80">{title}</div>
        {note && <div className="mt-0.5 text-[11px] leading-snug text-white/40">{note}</div>}
      </div>
      <div className="rounded-md border border-white/[0.06] bg-[#141414] p-4">{children}</div>
    </div>
  );
}

const GLYPHS: { label: string; Icon: TileIcon }[] = [
  { label: 'Camera', Icon: CameraIcon },
  { label: 'Drone', Icon: DroneDeviceIcon },
  { label: 'Drone hive', Icon: DroneHiveIcon },
  { label: 'Radar', Icon: RadarIcon },
  { label: 'Lidar', Icon: LidarIcon },
  { label: 'Sensor', Icon: SensorIcon },
  { label: 'Speaker', Icon: SpeakerIcon },
  { label: 'Floodlight', Icon: FloodlightIcon },
  { label: 'Launcher', Icon: LauncherIcon },
];

export function DeviceTileStates() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-semibold text-white/90">Device icon tile — states</h2>
        <p className="mt-1 text-xs text-white/45">
          Every device glyph rendered clean (no black stroke — the outline is map-marker only), then the
          worst-wins severity tones on the colored tile + white icon treatment.
        </p>
      </div>

      <Group
        title="Device glyphs — clean (no map outline)"
        note="The full device-type set on the neutral tile. Tiles drop the black stroke that map markers keep; the glyph is fill-only."
      >
        <div className="flex flex-wrap gap-8">
          {GLYPHS.map(({ label, Icon }) => (
            <Cell key={label} caption={label}>
              <Tile tone="ok" Icon={Icon} />
            </Cell>
          ))}
        </div>
      </Group>

      <Group
        title="Health tone"
        note="Conveyed entirely by the tile tint + icon fill. Critical pulses; error is the same red but static; offline desaturates the glyph."
      >
        <div className="flex flex-wrap gap-8">
          {TONE_ORDER.map((tone) => (
            <Cell key={tone} caption={tone}>
              <Tile tone={tone} Icon={CameraIcon} />
            </Cell>
          ))}
        </div>
      </Group>

    </section>
  );
}
