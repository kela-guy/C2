/**
 * Sandbox surface for the next-gen, registry-driven device panel.
 * Promoted into `../devices-panel/` once validated on `/devices-lab`.
 */

export { DevicesPanel } from './DevicesPanel';
export { DeviceRow, type DeviceRowProps } from './DeviceRow';
export { DeviceAction, type DeviceActionProps } from './DeviceAction';
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
  type ResolvedAction,
} from './deviceActions';
export {
  getDeviceHealth,
  getDeviceHealthReason,
  DEVICE_HEALTH_VISUAL,
  type DeviceHealth,
} from './deviceHealth';
export { MOCK_DEVICES } from './mockDevices';
