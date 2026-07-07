/**
 * Co-located doc module for the CardSensors block — the detecting-sensors
 * list of a TargetCard. Meta + anatomy live in `registry/manifest.json`.
 */
import { Radar, Camera, Radio } from '@/lib/icons/central';
import { CardSensors, type CardSensor } from '@/primitives';
import cardSensorsSrc from '@/primitives/CardSensors.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const SENSORS: CardSensor[] = [
  { id: 'radar-01', typeLabel: 'מכ״ם', icon: Radar, distanceLabel: '1.2 km', detectedAt: '00:14:10' },
  { id: 'cam-north', typeLabel: 'מצלמה צפונית', icon: Camera, distanceLabel: '0.8 km', detectedAt: '00:14:32' },
  { id: 'rf-02', typeLabel: 'סורק RF', icon: Radio, distanceLabel: '2.1 km', detectedAt: '00:15:01' },
];

export const cardSensorsDoc: ComponentDocModule = {
  id: 'card-sensors',
  source: cardSensorsSrc,
  usage: `import { CardSensors, type CardSensor } from "@/primitives"
import { Radar, Camera } from "@/lib/icons/central"

const sensors: CardSensor[] = [
  { id: "radar-01", typeLabel: "מכ״ם", icon: Radar, distanceLabel: "1.2 km", detectedAt: "00:14:10" },
  { id: "cam-north", typeLabel: "מצלמה צפונית", icon: Camera, distanceLabel: "0.8 km", detectedAt: "00:14:32" },
]

<CardSensors
  sensors={sensors}
  onSensorHover={(id) => highlightOnMap(id)}
  onSensorClick={(id) => flyToSensor(id)}
/>`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'One row per detecting sensor: type glyph, label, then detection time and distance in monospace tabular figures at the row end.',
      code: `<CardSensors sensors={sensors} />`,
      render: () => (
        <div className="w-[320px]">
          <CardSensors sensors={SENSORS} />
        </div>
      ),
    },
    {
      id: 'interactive',
      title: 'Clickable rows',
      description:
        'With onSensorClick each row becomes a real <button> (keyboard + screen readers) — hover highlights, press feedback, and a focus-visible ring. onSensorHover drives map highlighting either way.',
      code: `<CardSensors
  sensors={sensors}
  onSensorHover={(id) => highlightOnMap(id)}
  onSensorClick={(id) => flyToSensor(id)}
/>`,
      render: () => (
        <div className="w-[320px]">
          <CardSensors sensors={SENSORS} onSensorHover={() => {}} onSensorClick={() => {}} />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'minimal',
      label: 'Minimal sensor',
      note: 'distanceLabel and detectedAt are optional — a row with only a type label stays balanced.',
      render: () => (
        <div className="w-[260px]">
          <CardSensors sensors={[{ id: 'rf-x', typeLabel: 'סורק RF', icon: Radio }]} />
        </div>
      ),
    },
    {
      id: 'empty',
      label: 'Empty list',
      note: 'With sensors=[] the block renders nothing at all.',
      render: () => (
        <div className="flex w-[240px] items-center justify-center text-xs text-slate-9">
          <CardSensors sensors={[]} />
          <span>sensors=[] → renders null</span>
        </div>
      ),
    },
  ],
};
