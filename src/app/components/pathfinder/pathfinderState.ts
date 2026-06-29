/**
 * Shared Pathfinder lifecycle mapping + map geometry.
 *
 * The launch sim ({@link usePathfinderLaunchSim}) is the source of truth. Two
 * surfaces derive from its `{ phase, runState }` snapshot:
 *   - the device card's tri-state primary (`docked` / `launching` / `airborne`)
 *   - the live map marker's kinematic phase (adds `returning`)
 * Keeping both derivations here means the toast, card, and map never drift.
 */

import type { PathfinderSimSnapshot } from './SonnerPathfinderToast';

/** The single Pathfinder asset id, shared by the device row and map marker. */
export const PATHFINDER_DEVICE_ID = 'PATHFINDER-01';

/** Dock / home position (lat, lon) — where the asset sits when docked. */
export const PATHFINDER_HOME: [number, number] = [32.477, 35.005];

/** Loiter orbit centre (lat, lon) once airborne. */
export const PATHFINDER_LOITER_CENTER: [number, number] = [32.4845, 35.012];

/** Loiter orbit radius in degrees (~650 m). */
export const PATHFINDER_LOITER_RADIUS = 0.006;

/** Orbit angular step per 250 ms tick (radians) — a lap every ~25 s. */
export const PATHFINDER_ORBIT_SPEED = 0.063;

/** Duration of the return-to-dock glide, matched to the RTB sequence length. */
export const PATHFINDER_RETURN_MS = 3000;

/** Field-of-view cone width for the airborne marker. */
export const PATHFINDER_FOV_DEG = 90;

/** Card primary tri-state derived from the launch snapshot. */
export type PathfinderCardState = 'docked' | 'launching' | 'airborne';

/** Map marker kinematic phase derived from the launch snapshot. */
export type PathfinderMapPhase = 'docked' | 'launching' | 'airborne' | 'returning';

/**
 * Device-card flight state. `airborne` covers both the open-ended loiter and the
 * return leg (the asset is still in the air, so the primary stays Return-to-dock
 * rather than flipping to a Stop). Terminal states park it back at the dock.
 */
export function cardFlightState(s: PathfinderSimSnapshot): PathfinderCardState {
  if (s.runState === 'done' || s.runState === 'aborted') return 'docked';
  if (s.runState === 'loiter') return 'airborne';
  if (s.phase === 'return') return 'airborne';
  return 'launching';
}

/**
 * Map kinematic phase. Distinguishes the return leg (a glide home) from the
 * loiter orbit, which the card doesn't need to.
 */
export function mapPhase(s: PathfinderSimSnapshot): PathfinderMapPhase {
  if (s.runState === 'done' || s.runState === 'aborted') return 'docked';
  if (s.runState === 'loiter') return 'airborne';
  if (s.phase === 'return') return 'returning';
  return 'launching';
}
