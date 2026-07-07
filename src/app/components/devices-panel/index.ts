/**
 * Public surface of the Devices Panel package.
 *
 * Consumers (Dashboard, Playground, Styleguide, camera DnD drop
 * targets, the i18n catalog) should import from
 * `@/shared/components/DevicesPanel`, which re-exports this barrel.
 */

export { DevicesPanel } from './DevicesPanelImpl';
export { DeviceRow } from './DeviceRow';
export { DevicesIcon } from './icons';

// Registry-driven internals — surfaced so the styleguide can document
// the card primitive-by-primitive without reaching into private files.
export { DeviceAction, type DeviceActionProps } from './DeviceAction';
export { DeviceActionBar } from './DeviceActionBar';
export { DeviceOverflowMenu } from './controls/DeviceOverflowMenu';
export { JamSplitButton } from './controls/JamSplitButton';
export { SpeakerTrackSelect } from './controls/SpeakerTrackSelect';
export {
  FloodlightSegmentedCompact,
  FloodlightSegmentedDefault,
  type FloodlightSegmentedProps,
} from './controls/FloodlightSegmentedToggle';
export { NotifyHeaderIndicator, NotifyCountdown, formatHMS } from './controls/notify';
export { DEVICE_ACTION_TONES, type DeviceActionTone } from './deviceActionTones';
export {
  DEVICE_REGISTRY,
  buildDetailRows,
  type DeviceActionKind,
  type DeviceTypeConfig,
  type DetailFieldKey,
} from './deviceRegistry';
export {
  resolveDeviceAction,
  type DeviceActionContext,
  type DeviceActionPlacement,
  type ResolvedAction,
} from './deviceActions';
export {
  getDeviceHealth,
  getDeviceHealthReason,
  getDeviceErrorCount,
  DEVICE_HEALTH_VISUAL,
  type DeviceHealth,
} from './deviceHealth';

export {
  DEVICE_CAMERA_DRAG_TYPE,
  DEFAULT_TYPE_LABELS,
  DEFAULT_CONNECTION_STATE_LABELS,
  DEFAULT_DEVICE_PANEL_STRINGS,
  DEFAULT_SPEAKER_TRACKS,
  NOTIFY_WINDOW_S,
} from './constants';

export type {
  CameraCapability,
  ConnectionState,
  Device,
  DeviceCameraDragItem,
  DeviceError,
  DeviceRowProps,
  DeviceType,
  DevicesPanelProps,
  DevicesPanelStrings,
  OperationalStatus,
  SpeakerTrack,
} from './types';
