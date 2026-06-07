/**
 * Gotcha effector data model.
 *
 * A Gotcha is a single counter-drone (anti-aircraft) effector that the
 * backend exposes as four independent radar integrations. The frontend
 * aggregates them into ONE composite entity: a parent `GotchaUnit` with
 * four 120-degree sensor children (covering the full 360-degree ring) plus
 * an optional camera/net sub-device.
 *
 * Health intentionally reuses the device panel's `DeviceHealth` vocabulary
 * (`ok | warning | error | critical | offline`) so the marker, the sidebar
 * tile, and the roll-up all speak ONE health language — see
 * `devices-panel/deviceHealth.ts`. There is no second `operational/degraded`
 * vocabulary.
 */

import type { DeviceHealth } from '../devices-panel/deviceHealth';

/** Per-sector / per-child health — same worst-wins vocabulary as devices. */
export type SectorHealth = DeviceHealth;

/** Threat classes a Gotcha is configured to engage. Extensible beyond drones. */
export type GotchaTargetClass = 'drone' | 'aircraft' | 'uav';

/**
 * One of the four directional radar sensors. `bearingDeg` is the centre
 * of the sector (0 = north, 90 = east); `fovDeg` is the full sector width
 * (120 for the standard 4-up mounting). `latencyMs` feeds the latency
 * monitor; `health` is the worst-wins per-sector status.
 */
export interface GotchaSensor {
  id: string;
  name: string;
  bearingDeg: number;
  fovDeg: number;
  rangeM: number;
  /**
   * Worst-wins sector status. There is deliberately NO dedicated
   * calibration UI: if the unit can't confirm north/orientation, that
   * uncertainty is folded into this health (`warning` / `error`) so it reads
   * as "something not OK on this sector" — the same channel as every other
   * fault.
   */
  health: SectorHealth;
  /** Detection-to-display latency in milliseconds. Drives the latency monitor. */
  latencyMs?: number;
}

/** The Gotcha's camera / net sub-device. Surfaced in the takeover alert. */
export interface GotchaCamera {
  id: string;
  name: string;
  health: SectorHealth;
  /** Snapshot still shown in the critical alert. */
  snapshotUrl?: string;
  /** Live video stream shown in the critical alert when available. */
  streamUrl?: string;
}

/**
 * Composite effector entity. Map + sidebar each expand this into the
 * parent marker/row + the four sector children + camera.
 */
export interface GotchaUnit {
  id: string;
  name: string;
  lat: number;
  lon: number;
  targetClasses: GotchaTargetClass[];
  sensors: GotchaSensor[];
  camera?: GotchaCamera;
}
