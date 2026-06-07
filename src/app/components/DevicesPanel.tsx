/**
 * Compatibility facade for the Devices Panel.
 *
 * Implementation lives under `./devices-panel/` — this file exists so
 * existing consumers keep working with their current import paths:
 *
 *   import { DevicesPanel, DeviceRow, DevicesIcon, DEVICE_CAMERA_DRAG_TYPE,
 *     DEFAULT_SPEAKER_TRACKS, type Device, type DeviceCameraDragItem }
 *     from '@/shared/components/DevicesPanel';
 *
 * Add new exports to `./devices-panel/index.ts`, not here.
 */

export {
  DevicesPanel,
  DeviceRow,
  DevicesIcon,
  DeviceAction,
  DeviceActionBar,
  DeviceOverflowMenu,
  JamSplitButton,
  SpeakerTrackSelect,
  FloodlightSegmentedCompact,
  FloodlightSegmentedDefault,
  NotifyHeaderIndicator,
  NotifyCountdown,
  formatHMS,
  DEVICE_ACTION_TONES,
  DEVICE_REGISTRY,
  buildDetailRows,
  resolveDeviceAction,
  getDeviceHealth,
  getDeviceHealthReason,
  DEVICE_HEALTH_VISUAL,
  DEVICE_HEALTH_CRITICAL_PING,
  DEVICE_CAMERA_DRAG_TYPE,
  DEFAULT_TYPE_LABELS,
  DEFAULT_CONNECTION_STATE_LABELS,
  DEFAULT_DEVICE_PANEL_STRINGS,
  DEFAULT_SPEAKER_TRACKS,
  NOTIFY_WINDOW_S,
} from './devices-panel';

export type {
  CameraCapability,
  ConnectionState,
  Device,
  DeviceCameraDragItem,
  DeviceError,
  DeviceRowProps,
  DeviceActionProps,
  DeviceActionTone,
  DeviceActionKind,
  DeviceActionContext,
  DeviceActionPlacement,
  DeviceTypeConfig,
  DetailFieldKey,
  ResolvedAction,
  DeviceHealth,
  DeviceType,
  DevicesPanelProps,
  DevicesPanelStrings,
  FloodlightSegmentedProps,
  OperationalStatus,
  SpeakerTrack,
} from './devices-panel';
