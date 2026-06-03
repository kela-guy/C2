/**
 * Public types for the Devices Panel.
 *
 * Exposed via the `DevicesPanel.tsx` facade — keep names and shapes
 * stable, consumers (Dashboard, Playground, Styleguide, camera DnD
 * drop targets) import from there.
 */

import type React from 'react';

export type DeviceType =
  | 'camera'
  | 'radar'
  | 'dock'
  | 'drone'
  | 'ecm'
  | 'launcher'
  | 'lidar'
  | 'weapon_system'
  | 'floodlight'
  | 'speaker';

export type ConnectionState = 'online' | 'offline' | 'error' | 'warning';
export type OperationalStatus = 'operational' | 'malfunctioning';
export type CameraCapability = 'video' | 'photo';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  lat: number;
  lon: number;
  status: 'available' | 'active' | 'offline';
  operationalStatus: OperationalStatus;
  connectionState: ConnectionState;
  fovDeg?: number;
  bearingDeg?: number;
  coverageRadiusM?: number;
  batteryPct?: number;
  capabilities?: CameraCapability[];
  altitude?: string;
  /**
   * Open error count for this device. Drives the Logs error channel (the
   * Logs control turns red with a count badge) and the count badge in the
   * health tile tooltip. Absent / 0 means no errors.
   */
  errorCount?: number;
  /**
   * Icons may opt into an `active` prop to render their lit/playing
   * variant (floodlight, speaker). Other icons ignore it.
   */
  Icon: React.FC<{ size?: number; fill?: string; active?: boolean }>;
}

/**
 * react-dnd item shape for camera rows. Mirrored by every drop target
 * (CameraViewerPanel, CameraFeedTile, VideoPanel) so the contract is
 * single-sourced here.
 */
export interface DeviceCameraDragItem {
  cameraId: string;
  label: string;
}

export interface SpeakerTrack {
  id: string;
  label: string;
}

/**
 * Strings consumed inside `DevicesPanel` + `DeviceRow`. All defaults
 * are English; pass overrides via the `strings` prop.
 */
export interface DevicesPanelStrings {
  searchPlaceholder: string;
  clearSearch: string;
  resetFilters: string;
  resetFiltersLabel: string;
  /** Trigger label for the Type filter popover. */
  typeFilterLabel: string;
  noMatches: string;
  /** Stat-row labels in the expanded device card. */
  location: string;
  bearing: string;
  fieldOfView: string;
  coverage: string;
  altitude: string;
  health: string;
  healthOk: string;
  healthMalfunction: string;
  battery: string;
  /** ECM/jam controls. */
  jam: string;
  jamActive: string;
  jamDisabledOffline: string;
  jamDisabledMalfunction: string;
  jamDisabledAlreadyActive: string;
  /** ECM jam destructive split-button: scope menu, confirm step, active state. */
  jammingAll: string;
  jamThisJammer: string;
  jamAllJammers: string;
  jamPromptOne: string;
  jamPromptAll: string;
  jamConfirm: string;
  jamCancel: string;
  jamMoreOptions: string;
  /** Camera controls. */
  centerOnMap: string;
  mute: string;
  unmute: string;
  /** Pressed-state label for the mute toggle (mirrors the lab's state-label toggle). */
  muted: string;
  wipers: string;
  wipersAriaLabel: string;
  calibrate: string;
  calibrating: string;
  calibrated: string;
  calibrateAriaLabel: string;
  /** Floodlight + speaker controls. */
  floodlightOn: string;
  floodlightOff: string;
  floodlightToggleAriaLabel: string;
  /** Hover-action copy ("Turn on" / "Turn off"). */
  floodlightTurnOn: string;
  floodlightTurnOff: string;
  speakerPlay: string;
  speakerStop: string;
  speakerPlaying: string;
  speakerDisabledOffline: string;
  audioTrack: string;
  audioTrackAriaLabel: string;
  audioTrackSearchPlaceholder: string;
  audioTrackNoMatches: string;
  /** Pin / unpin a camera or drone to a video feed slot in the playground. */
  pinToFeed: string;
  pinToFeedAriaLabel: string;
  unpinFromFeed: string;
  unpinFromFeedAriaLabel: string;
  /** Tooltip on the small collapsed-row pin toggle, in its off (not-pinned) state. */
  pinToFeedTooltip: string;
  /** Tooltip on the small collapsed-row pin toggle, in its on (pinned) state. */
  pinnedToFeedTooltip: string;
  /** Show-on-map header glyph (icon-only). */
  showOnMap: string;
  /** Overflow-menu inspect actions. */
  logs: string;
  /** Suffix appended after the error count in the Logs label/tooltip. */
  errors: string;
  notifications: string;
  /** More-actions (3-dot) overflow trigger aria-label. */
  moreActions: string;
  /** Aria-label prefix for the armed-notifications header countdown. */
  notificationsArmedAriaLabel: string;
  /** Aria-label prefix for the speaker now-playing header readout. */
  nowPlayingAriaLabel: string;
  /** Worst-wins severity titles shown in the health-tile tooltip. */
  healthCritical: string;
  healthWarning: string;
  healthOffline: string;
  healthHealthy: string;
}

export interface DevicesPanelProps {
  /** All devices to render. Group by `type` is computed from this list. */
  devices: Device[];
  open: boolean;
  onClose: () => void;
  onFlyTo: (lat: number, lon: number) => void;
  onDeviceHover?: (id: string | null) => void;
  onDeviceSelect?: (id: string | null) => void;
  onJamActivate?: (jammerId: string) => void;
  /** Toggle a floodlight on/off. Renders the header-row Switch + footer Switch when provided. */
  onFloodlightToggle?: (floodlightId: string, next: boolean) => void;
  /** Toggle a speaker between play/stop. Renders the header-row Play/Stop button when provided. */
  onSpeakerToggle?: (speakerId: string, next: boolean) => void;
  /** Set of floodlight device IDs currently lit. Drives the active icon variant + Switch state. */
  floodlightOnIds?: Set<string>;
  /** Set of speaker device IDs currently playing. Drives the active icon variant + Play/Stop state. */
  speakerPlayingIds?: Set<string>;
  /** Override audio tracks rendered in the speaker combobox. Defaults to `DEFAULT_SPEAKER_TRACKS`. */
  speakerTracks?: SpeakerTrack[];
  /** Pin a camera/drone to a video feed slot. Visible on camera + drone cards only. */
  onPinToFeed?: (deviceId: string) => void;
  /** Unpin a camera/drone from its video feed slot. Visible on camera + drone cards only. */
  onUnpinFromFeed?: (deviceId: string) => void;
  /**
   * Set / list of device ids currently pinned to a feed. Drives the
   * Pin/Unpin toggle state. Accepts either a Set (cheap O(1) lookup,
   * what PlaygroundPage uses) or a plain array (cheaper to build for
   * callers without state).
   */
  pinnedDeviceIds?: ReadonlySet<string> | readonly string[];
  /** Open the device's log / event channel (the overflow "Logs" entry). */
  onOpenLogs?: (deviceId: string) => void;
  /**
   * Arm / disarm the device's timed notifications window (the overflow
   * "Notifications" toggle). `armed` is the next state.
   */
  onArmNotifications?: (deviceId: string, armed: boolean) => void;
  noTransition?: boolean;
  width?: number;
  focusedDeviceId?: string | null;
  /** Override per-type group labels. Falls back to `DEFAULT_TYPE_LABELS` (English). */
  typeLabels?: Partial<Record<DeviceType, string>>;
  /** Override per-state connection labels. Falls back to `DEFAULT_CONNECTION_STATE_LABELS` (English). */
  connectionStateLabels?: Partial<Record<ConnectionState, string>>;
  /** Header title above the device list. Defaults to 'Devices'. */
  title?: string;
  /** Close-button aria-label. Defaults to 'Close'. */
  closeAriaLabel?: string;
  /** Override any of the internal labels. Falls back to `DEFAULT_DEVICE_PANEL_STRINGS` (English). */
  strings?: Partial<DevicesPanelStrings>;
}

/** Props consumed by the colocated `DeviceRow` (also exported for the styleguide). */
export interface DeviceRowProps {
  device: Device;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
  onJamActivate?: (jammerId: string) => void;
  onFloodlightToggle?: (floodlightId: string, next: boolean) => void;
  onSpeakerToggle?: (speakerId: string, next: boolean) => void;
  isFloodlightOn?: boolean;
  isSpeakerPlaying?: boolean;
  speakerTracks?: SpeakerTrack[];
  onFlyTo: (lat: number, lon: number) => void;
  isMuted: boolean;
  muteRemaining: string | null;
  onToggleMute: (deviceId: string) => void;
  /** Pin a camera/drone into the next available video feed slot. */
  onPinToFeed?: (deviceId: string) => void;
  /** Unpin a camera/drone from its video feed slot. */
  onUnpinFromFeed?: (deviceId: string) => void;
  /** Whether this device is currently pinned to a feed. Drives the toggle visual + label. */
  isPinnedToFeed?: boolean;
  /** Open the device's log / event channel (overflow "Logs" entry). */
  onOpenLogs?: (deviceId: string) => void;
  /** Arm / disarm the timed notifications window (overflow "Notifications" toggle). */
  onArmNotifications?: (deviceId: string, armed: boolean) => void;
  connectionStateLabels?: Record<ConnectionState, string>;
  strings?: DevicesPanelStrings;
}
