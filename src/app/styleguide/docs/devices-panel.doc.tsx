/**
 * Co-located doc module for the DevicesPanel assembly — the right-hand
 * sidebar that lists connected field devices grouped by type, with search and
 * type-filter isolation. Meta lives in `registry/manifest.json`. Fixtures are
 * shared with the Device Card doc (`DEVICE_DOC_FLEET`) so both sections
 * describe the same fleet.
 */
import { useState } from 'react';
import { DevicesPanel, type Device } from '@/shared/components/DevicesPanel';
import { LAYOUT_TOKENS } from '@/primitives';
import devicesPanelImplSrc from '@/app/components/devices-panel/DevicesPanelImpl.tsx?raw';
import { DEVICE_DOC_FLEET } from './device-card.doc';
import type { ComponentDocModule } from '../registry/types';

const noop = () => {};

/**
 * Self-contained interactive panel: owns the floodlight/speaker toggle sets
 * so the demo behaves like the production wiring in Dashboard.
 */
function PanelDemo({ devices, height = 520 }: { devices: Device[]; height?: number }) {
  const [floodlightOnIds, setFloodlightOnIds] = useState<Set<string>>(new Set());
  const [speakerPlayingIds, setSpeakerPlayingIds] = useState<Set<string>>(new Set());
  const toggleIn = (set: Set<string>, id: string, next: boolean) => {
    const out = new Set(set);
    if (next) out.add(id);
    else out.delete(id);
    return out;
  };
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-lg border border-white/10"
      style={{ width: LAYOUT_TOKENS.sidebarWidthPx, height }}
      dir="ltr"
    >
      <DevicesPanel
        devices={devices}
        open
        onClose={noop}
        onFlyTo={noop}
        onDeviceHover={noop}
        onDeviceSelect={noop}
        onJamActivate={noop}
        onFloodlightToggle={(id, next) => setFloodlightOnIds((s) => toggleIn(s, id, next))}
        onSpeakerToggle={(id, next) => setSpeakerPlayingIds((s) => toggleIn(s, id, next))}
        floodlightOnIds={floodlightOnIds}
        speakerPlayingIds={speakerPlayingIds}
        noTransition
      />
    </div>
  );
}

export const devicesPanelDoc: ComponentDocModule = {
  id: 'devices-panel',
  source: devicesPanelImplSrc,
  usage: `import { DevicesPanel } from "@/shared/components/DevicesPanel"

<DevicesPanel
  devices={devices}
  open={panelOpen}
  onClose={() => setPanelOpen(false)}
  onFlyTo={(lat, lon) => flyTo(lat, lon)}
  onJamActivate={activateJam}
  floodlightOnIds={floodlightOnIds}
  onFloodlightToggle={toggleFloodlight}
  speakerPlayingIds={speakerPlayingIds}
  onSpeakerToggle={toggleSpeaker}
/>`,
  examples: [
    {
      id: 'panel',
      title: 'Panel',
      render: () => <PanelDemo devices={DEVICE_DOC_FLEET} />,
    },
    {
      id: 'empty',
      title: 'Empty state',
      render: () => <PanelDemo devices={[]} height={260} />,
      code: `<DevicesPanel devices={[]} open onClose={close} onFlyTo={flyTo} />`,
    },
  ],
};
