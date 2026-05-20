/**
 * Public model for the rebuilt video feature (`camera-v2`).
 *
 * Lives in its own module so the playground (and, later, the dashboard) can
 * import without dragging in the legacy `CameraViewerPanel` types.
 */

export type DayNightMode = 'day' | 'night';

export type FeedDeviceType = 'camera' | 'drone';

export type LinkedDeviceType = 'radar' | 'lidar' | 'drone' | 'camera';

/**
 * Layout preset chosen by the operator from the panel-level layout
 * picker. The picker is *manual* — the panel does not auto-pick based
 * on feed count anymore. When the chosen preset cannot fit the current
 * feed count (e.g. grid-2x2 with 3 feeds), the panel falls back
 * deterministically: hero-filmstrip → grid-2x2 → stack-2 → single.
 * Picker disabled state uses the same rules (`isLayoutEnabledForFeedCount`).
 */
export type LayoutKind = 'single' | 'stack-2' | 'grid-2x2' | 'hero-filmstrip';

/** A single feed slot in the video panel. */
export interface CameraFeed {
  cameraId: string;
  mode: DayNightMode;
  showDetections?: boolean;
  /**
   * "Designate target" mode is active for this feed. When true, the
   * pointer becomes a crosshair, a follow-cursor reticle is rendered,
   * and the next click on the feed designates that point as a target.
   */
  designateMode?: boolean;
  playback?: PlaybackState;
}

/**
 * A tabbed workspace in the cameras panel header. Each tab owns its
 * own stream group, layout preset, and focal feed index.
 */
export interface CameraFeedTab {
  id: string;
  feeds: CameraFeed[];
  layout: LayoutKind;
  activeFeedIndex: number;
}

/**
 * Runtime status of the playback `<video>` element. Drives the chrome
 * (spinner, "Replay", error card) inside the playback frame.
 */
export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

/**
 * State of the playback investigation overlay inside a single tile.
 *
 * The surface is intentionally minimal: live keeps the top half, playback
 * occupies the bottom half with a single transport row (play/pause +
 * scrubber + clocks + exit). No PiP, no drawer, no layout chooser, no
 * persisted preferences — everything operator-touchable lives in this
 * runtime object.
 */
export interface PlaybackState {
  enabled: boolean;
  /**
   * Identity of the recording currently being investigated. Used as a
   * stale-state guard: when `cameraId` changes (a different camera is
   * dropped onto the tile), the parent resets `playback` to `undefined`
   * so position / status / errorMessage cannot leak across cameras.
   */
  sourceId?: string;
  /** Position in the recorded clip in seconds. 0 = start. */
  positionSec: number;
  /** Total clip length. Patched by `<video onLoadedMetadata>`. */
  durationSec: number;
  isPlaying: boolean;
  /** Drives the chrome inside the playback frame. */
  status: PlaybackStatus;
  /** True while the operator is dragging the scrubber thumb, so the
   *  media-time sync effect doesn't fight the pointer. */
  isScrubbing?: boolean;
  /** Last error string, surfaced inside the playback chrome. */
  errorMessage?: string;
}

/** Live, per-camera telemetry + ownership state. Read-only from the panel's POV. */
export interface CameraStatus {
  /** 0..360°, true bearing. */
  bearingDeg: number;
  /** Camera horizontal field of view, used by the compass FOV cone. */
  fovDeg: number;
  /** Who currently controls this camera. */
  controlOwner: 'self' | 'other' | 'none';
  /** Display name for the foreign owner (e.g. "Operator B"). */
  controlOwnerName?: string;
  /** Currently-tracked target ID, if any. */
  assignedTargetId?: string | null;
  /** Display label for the assigned target (e.g. "TGT-014 - Drone"). */
  assignedTargetLabel?: string | null;
  /** True iff a take-control request is in-flight for this camera. */
  controlRequestPending?: boolean;
  /** Seconds remaining on a pending take-control request. */
  controlRequestCountdown?: number;

  /** Drives device-specific HUD chrome (drone gets the dedicated overlay). */
  deviceType: FeedDeviceType;

  /** Slewing/orchestration: what device is currently directing this one? */
  linkedFromDeviceId?: string | null;
  linkedFromDeviceLabel?: string | null;
  linkedFromDeviceType?: LinkedDeviceType | null;

  /** Optical zoom factor (e.g. 1.0..30.0). Display only on the playground. */
  zoomLevel?: number;
  /** Drone altitude above home, metres. */
  altitudeM?: number;
  /** Drone ground speed, m/s. */
  velocityMps?: number;
  /** Drone battery 0..100. */
  batteryPct?: number;
  /** Drone signal strength 0..100. */
  signalPct?: number;
  /** Distance from home, metres (drone). */
  distanceFromHomeM?: number;
  /** Optional sub-label for the compass strip (area / city / sector). */
  areaName?: string;
}

/** A single labelled detection box, normalised to the feed's video bounds. */
export interface DetectionBox {
  id: string;
  /** All values are 0..1, anchored to the feed's intrinsic video frame. */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** 0..1 - drives the box opacity / colour ramp. */
  confidence: number;
  /**
   * Wall-clock ms of when this detection was first observed. Optional
   * — when present it lets downstream code (e.g. the tile alert pulse)
   * differentiate "newly arrived" from "still on screen". When absent,
   * the alert hook synthesises this from id-set diffs instead.
   */
  firstSeenAt?: number;
}
