/**
 * Public model for the rebuilt video feature (`camera-v2`).
 *
 * Lives in its own module so the playground (and, later, the dashboard) can
 * import without dragging in the legacy `CameraViewerPanel` types.
 */

export type DayNightMode = 'day' | 'night';

export type FeedDeviceType = 'camera' | 'drone';

export type LinkedDeviceType = 'radar' | 'lidar' | 'drone' | 'camera';

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

/** State of the live-vs-playback split inside a single tile. */
export interface PlaybackState {
  enabled: boolean;
  /** Position in the recorded clip in seconds. 0 = start. */
  positionSec: number;
  /** Total clip length. */
  durationSec: number;
  isPlaying: boolean;
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
}
