/**
 * Defaults and lookup tables for the Devices Panel.
 *
 * Kept separate from the React tree so consumers (i18n catalogs,
 * styleguide demos, tests) can import them without dragging the rest
 * of the component graph.
 */

import type {
  ConnectionState,
  DeviceType,
  DevicesPanelStrings,
  SpeakerTrack,
} from './types';

/**
 * react-dnd item type for camera rows. Mirrored by every drop target
 * (CameraViewerPanel, CameraFeedTile, VideoPanel) — single-source it
 * here so the contract can't drift.
 */
export const DEVICE_CAMERA_DRAG_TYPE = 'DEVICE_CAMERA';

/** Display order for type groups. Drives both the group rendering and the type-filter list. */
export const TYPE_ORDER: DeviceType[] = [
  'camera',
  'radar',
  'dock',
  'drone',
  'ecm',
  'launcher',
  'lidar',
  'weapon_system',
  'floodlight',
  'speaker',
];

/**
 * Within a type group, surface offline devices first so operators see
 * trouble before idle inventory.
 */
export const STATUS_SORT: Record<string, number> = {
  offline: 0,
  active: 1,
  available: 2,
};

/** English type-group labels. Override via `typeLabels` prop. */
export const DEFAULT_TYPE_LABELS: Record<DeviceType, string> = {
  camera: 'Cameras',
  radar: 'Radars',
  dock: 'Docks',
  drone: 'Drones',
  ecm: 'ECM',
  launcher: 'Launchers',
  lidar: 'LIDAR',
  weapon_system: 'Weapon systems',
  floodlight: 'Floodlights',
  speaker: 'Speakers',
};

/** Built-in audio tracks the speaker combobox offers when no override is supplied. */
export const DEFAULT_SPEAKER_TRACKS: SpeakerTrack[] = [
  { id: 'air-raid', label: 'Air Raid' },
  { id: 'all-clear', label: 'All Clear' },
  { id: 'evacuate', label: 'Evacuate' },
  { id: 'lockdown', label: 'Lockdown' },
  { id: 'test-tone', label: 'Test Tone' },
];

/** English connection-state labels. Override via `connectionStateLabels` prop. */
export const DEFAULT_CONNECTION_STATE_LABELS: Record<ConnectionState, string> = {
  online: 'Online',
  offline: 'Offline',
  error: 'Error',
  warning: 'Warning',
};

export const DEFAULT_DEVICE_PANEL_STRINGS: DevicesPanelStrings = {
  searchPlaceholder: 'Search…',
  clearSearch: 'Clear search',
  resetFilters: 'Reset filters',
  resetFiltersLabel: 'Clear',
  typeFilterLabel: 'Devices',
  noMatches: 'No matching devices',
  location: 'Location',
  bearing: 'Bearing',
  fieldOfView: 'Field of view',
  coverage: 'Coverage',
  altitude: 'Altitude',
  health: 'Health',
  healthOk: 'OK',
  healthMalfunction: 'Malfunction',
  battery: 'Battery',
  jam: 'Jam',
  jamActive: 'Jam active',
  jamDisabledOffline: 'Device offline',
  jamDisabledMalfunction: 'Device malfunction',
  jamDisabledAlreadyActive: 'Already jamming',
  jammingAll: 'JAMMING ALL',
  jamThisJammer: 'Jam this jammer',
  jamAllJammers: 'Jam all jammers',
  jamPromptOne: 'Jam?',
  jamPromptAll: 'Jam all?',
  jamConfirm: 'Confirm',
  jamCancel: 'Cancel',
  jamMoreOptions: 'More jam options',
  centerOnMap: 'Center on map',
  mute: 'Mute',
  unmute: 'Unmute',
  muted: 'Muted',
  wipers: 'Wipers',
  wipersAriaLabel: 'Wipers',
  calibrate: 'Calibrate',
  calibrating: 'Calibrating…',
  calibrated: 'Done',
  calibrateAriaLabel: 'Calibrate',
  floodlightOn: 'On',
  floodlightOff: 'Off',
  floodlightToggleAriaLabel: 'Toggle floodlight',
  floodlightTurnOn: 'Turn on',
  floodlightTurnOff: 'Turn off',
  speakerPlay: 'Play',
  speakerStop: 'Stop',
  speakerPlaying: 'Playing',
  speakerDisabledOffline: 'Speaker offline',
  audioTrack: 'Track',
  audioTrackAriaLabel: 'Audio track',
  audioTrackSearchPlaceholder: 'Search…',
  audioTrackNoMatches: 'No matches',
  pinToFeed: 'Watch live',
  pinToFeedAriaLabel: 'Watch live video from this device',
  unpinFromFeed: 'Stop watching',
  unpinFromFeedAriaLabel: 'Stop watching this device feed',
  pinToFeedTooltip: 'Watch live',
  pinnedToFeedTooltip: 'Watching live',
  showOnMap: 'Show on map',
  logs: 'Logs',
  errors: 'errors',
  notifications: 'Notifications',
  moreActions: 'More actions',
  notificationsArmedAriaLabel: 'Notifications armed',
  nowPlayingAriaLabel: 'Now playing',
  healthCritical: 'Critical',
  healthWarning: 'Warning',
  healthOffline: 'Offline',
  healthHealthy: 'Healthy',
};

/** Per-state dot colour used for the small status indicator in the row icon. */
export const CONNECTION_STATE_COLORS: Record<ConnectionState, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-zinc-500',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
};

/** Per-state chip palette used for the inline `StatusChip` next to the device name. */
export const CONNECTION_STATE_CHIP_COLORS: Record<
  ConnectionState,
  'green' | 'gray' | 'red' | 'orange'
> = {
  online: 'green',
  offline: 'gray',
  error: 'red',
  warning: 'orange',
};

/** Mute timer length — the same 30 minutes the prototype has shipped with. */
export const MUTE_DURATION_MS = 30 * 60 * 1000;

/** How long a single armed notifications window lasts before auto-disarming. */
export const NOTIFY_WINDOW_S = 30;
