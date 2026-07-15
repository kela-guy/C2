/**
 * Co-located doc module for the Device Card block — the collapsible,
 * registry-driven row (`DeviceRow`) the Devices panel renders per field
 * asset. Meta lives in `registry/manifest.json`; the demo fixtures below are
 * adapted from the devices-lab mock set so every health tier and device
 * family is represented without importing sandbox modules.
 *
 * The hero (like every registry hero) ships with the Figma-dev-mode
 * `SpacingInspector`, so developers can hover/click to read the real padding,
 * gap, and size values straight off the rendered row.
 */
import { useState } from 'react';
import {
  DeviceRow,
  type Device,
} from '@/shared/components/DevicesPanel';
import {
  CameraIcon,
  RadarIcon,
  SensorIcon,
  FloodlightIcon,
  SpeakerIcon,
  DroneHiveIcon,
  LidarIcon,
} from '@/app/components/tacticalIcons';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';
import { GOTCHA_UNITS } from '@/app/components/gotcha/gotchaAssets';
import { gotchaUnitsToDevices } from '@/app/components/gotcha/gotchaUnitsToDevices';
import deviceRowSrc from '@/app/components/devices-panel/DeviceRow.tsx?raw';
import deviceRegistrySrc from '@/app/components/devices-panel/deviceRegistry.ts?raw';
import deviceHealthSrc from '@/app/components/devices-panel/deviceHealth.ts?raw';
import type { ComponentDocModule } from '../registry/types';

const noop = () => {};

// ─── Demo fixtures ───────────────────────────────────────────────────────────
// One device per health tier + one per interesting family. Coordinates are
// non-zero so the Location stat reads like the field. Shared with the
// DevicesPanel doc so both sections describe the same fleet.

const camNominal: Device = {
  id: 'doc-cam-ok', name: 'PTZ North', type: 'camera',
  lat: 32.811, lon: 35.021, status: 'available',
  operationalStatus: 'operational', connectionState: 'online',
  fovDeg: 62, bearingDeg: 145, batteryPct: 82,
  capabilities: ['video', 'photo'], Icon: CameraIcon,
};

const radarWarn: Device = {
  id: 'doc-radar-warn', name: 'Magos N — degraded link', type: 'radar',
  lat: 32.838, lon: 35.017, status: 'available',
  operationalStatus: 'operational', connectionState: 'warning',
  fovDeg: 120, bearingDeg: 210, batteryPct: 76, Icon: RadarIcon,
};

const droneError: Device = {
  id: 'doc-drone-error', name: 'Interceptor — malfunction', type: 'drone',
  lat: 32.0788, lon: 34.79, status: 'active',
  operationalStatus: 'malfunctioning', connectionState: 'error',
  altitude: '120 m', batteryPct: 12,
  errors: [
    { severity: 'error', message: 'Motor 3 current spike — thrust derated' },
    { severity: 'error', message: 'Connection lost to ground station (retrying)' },
    { severity: 'warning', message: 'GPS accuracy reduced — 9 satellites' },
  ],
  Icon: DroneDeviceIcon,
};

const camOffline: Device = {
  id: 'doc-cam-offline', name: 'Gate Cam', type: 'camera',
  lat: 32.802, lon: 35.052, status: 'offline',
  operationalStatus: 'operational', connectionState: 'offline',
  fovDeg: 55, bearingDeg: 90, capabilities: ['video'], Icon: CameraIcon,
};

const speaker: Device = {
  id: 'doc-speaker', name: 'LRAD North', type: 'speaker',
  lat: 32.825, lon: 35.055, status: 'available',
  operationalStatus: 'operational', connectionState: 'online', Icon: SpeakerIcon,
};

const floodlight: Device = {
  id: 'doc-flood', name: 'Perimeter Floodlight', type: 'floodlight',
  lat: 32.792, lon: 35.083, status: 'available',
  operationalStatus: 'operational', connectionState: 'online', Icon: FloodlightIcon,
};

const ecmActive: Device = {
  id: 'doc-ecm', name: 'Regulus — jamming', type: 'ecm',
  lat: 32.087, lon: 34.7805, status: 'active',
  operationalStatus: 'operational', connectionState: 'online',
  coverageRadiusM: 5000, Icon: SensorIcon,
};

const dockLowBattery: Device = {
  id: 'doc-dock-low', name: 'Drone Hive — low battery', type: 'dock',
  lat: 32.781, lon: 35.004, status: 'available',
  operationalStatus: 'operational', connectionState: 'online',
  batteryPct: 18, Icon: DroneHiveIcon,
};

const longName: Device = {
  id: 'doc-long-name',
  name: 'North-East Perimeter Thermal PTZ Camera — Tower 4, Upper Mast (backup unit)',
  type: 'camera', lat: 32.81, lon: 35.02, status: 'available',
  operationalStatus: 'operational', connectionState: 'online',
  fovDeg: 40, bearingDeg: 10, batteryPct: 55, capabilities: ['video'], Icon: CameraIcon,
};

const busyLog: Device = {
  id: 'doc-busy-log', name: 'LIDAR East — open errors', type: 'lidar',
  lat: 32.815, lon: 35.071, status: 'available',
  operationalStatus: 'operational', connectionState: 'warning',
  fovDeg: 360, bearingDeg: 0,
  errors: [
    { severity: 'error', message: 'Point cloud dropout on sector 3' },
    { severity: 'warning', message: 'Window contamination detected' },
    { severity: 'warning', message: 'Spin rate jitter above tolerance' },
    { severity: 'warning', message: 'Returns below expected density' },
  ],
  Icon: LidarIcon,
};

/**
 * The seed Gotcha effector adapted through the production mapper, so the doc
 * renders the exact composite card the app ships (parent + sector children).
 */
const gotchaComposite = gotchaUnitsToDevices(GOTCHA_UNITS)[0];

/** Fleet shared with the DevicesPanel doc — grouped by type there. */
export const DEVICE_DOC_FLEET: Device[] = [
  camNominal, camOffline, radarWarn, droneError, speaker, floodlight, ecmActive, dockLowBattery,
];

// ─── Demo scaffolding ────────────────────────────────────────────────────────

/**
 * Self-contained interactive `DeviceRow`: owns expand + toggle state so each
 * demo behaves like the real thing without wiring a parent panel.
 */
function DemoRow({
  device,
  defaultExpanded = false,
  initialFloodOn = false,
  initialSpeakerOn = false,
}: {
  device: Device;
  defaultExpanded?: boolean;
  initialFloodOn?: boolean;
  initialSpeakerOn?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [floodOn, setFloodOn] = useState(initialFloodOn);
  const [speakerOn, setSpeakerOn] = useState(initialSpeakerOn);
  const [pinned, setPinned] = useState(false);
  return (
    <DeviceRow
      device={device}
      isExpanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      onHover={noop}
      onFlyTo={noop}
      isFloodlightOn={floodOn}
      onFloodlightToggle={() => setFloodOn((v) => !v)}
      isSpeakerPlaying={speakerOn}
      onSpeakerToggle={() => setSpeakerOn((v) => !v)}
      onJamActivate={noop}
      isPinnedToFeed={pinned}
      onPinToFeed={() => setPinned(true)}
      onUnpinFromFeed={() => setPinned(false)}
      onOpenLogs={noop}
      onArmNotifications={noop}
    />
  );
}

/** Panel-surface frame so rows read in their real context. */
function RowFrame({ children, width = 380 }: { children: React.ReactNode; width?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-n-1" style={{ width }} dir="ltr">
      {children}
    </div>
  );
}

function RowStack({ devices }: { devices: Device[] }) {
  return (
    <RowFrame>
      <div className="flex flex-col divide-y divide-white/[0.06]">
        {devices.map((d) => (
          <DemoRow key={d.id} device={d} />
        ))}
      </div>
    </RowFrame>
  );
}

// ─── Doc module ──────────────────────────────────────────────────────────────

export const deviceCardDoc: ComponentDocModule = {
  id: 'device-card',
  source: deviceRowSrc,
  relatedFiles: [
    { file: 'deviceRegistry.ts', code: deviceRegistrySrc },
    { file: 'deviceHealth.ts', code: deviceHealthSrc },
  ],
  usage: `import { DeviceRow, type Device } from "@/shared/components/DevicesPanel"

<DeviceRow
  device={device}
  isExpanded={expanded}
  onToggle={(id) => toggle(id)}
  onHover={(id) => setHovered(id)}
  onFlyTo={(lat, lon) => flyTo(lat, lon)}
/>`,
  examples: [
    {
      id: 'expanded',
      title: 'Expanded',
      // Hero — the registry shell wraps every hero in the spacing inspector.
      render: () => (
        <RowFrame>
          <DemoRow device={camNominal} defaultExpanded />
        </RowFrame>
      ),
    },
    {
      id: 'collapsed',
      title: 'Collapsed',
      render: () => <RowStack devices={[camNominal, speaker, floodlight]} />,
      code: `<DeviceRow device={device} isExpanded={false} onToggle={toggle} onHover={setHovered} onFlyTo={flyTo} />`,
    },
    {
      id: 'health-states',
      title: 'Health states',
      render: () => <RowStack devices={[camNominal, radarWarn, droneError, camOffline]} />,
    },
    {
      id: 'device-types',
      title: 'Per-type controls',
      render: () => (
        <RowFrame>
          <div className="flex flex-col divide-y divide-white/[0.06]">
            <DemoRow device={speaker} initialSpeakerOn />
            <DemoRow device={floodlight} initialFloodOn />
            <DemoRow device={ecmActive} defaultExpanded />
            {gotchaComposite && <DemoRow device={gotchaComposite} defaultExpanded />}
          </div>
        </RowFrame>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-name',
      label: 'Long name',
      note: 'The name truncates; the primary cluster never wraps or shrinks.',
      render: () => (
        <RowFrame width={320}>
          <DemoRow device={longName} />
        </RowFrame>
      ),
    },
    {
      id: 'open-errors',
      label: 'Open errors',
      note: 'Logs channel turns red with a count badge; the tooltip lists the worst severity.',
      render: () => (
        <RowFrame width={320}>
          <DemoRow device={busyLog} defaultExpanded />
        </RowFrame>
      ),
    },
    {
      id: 'low-battery',
      label: 'Low battery',
      note: 'Battery ≤ 40% drives the warning tier even when the link is healthy.',
      render: () => (
        <RowFrame width={320}>
          <DemoRow device={dockLowBattery} defaultExpanded />
        </RowFrame>
      ),
    },
    {
      id: 'offline',
      label: 'Offline',
      note: 'Dim tile + offline chip; actions that need a live link disable with a reason tooltip.',
      render: () => (
        <RowFrame width={320}>
          <DemoRow device={camOffline} defaultExpanded />
        </RowFrame>
      ),
    },
  ],
};
