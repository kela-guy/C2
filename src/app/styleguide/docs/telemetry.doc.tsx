/**
 * Co-located doc module for the TelemetryRow primitive. Meta lives in
 * `registry/manifest.json`.
 */
import { Navigation, Gauge, Compass, MapPin } from '@/lib/icons/central';
import { TelemetryRow } from '@/primitives';
import telemetryRowSrc from '@/primitives/TelemetryRow.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const telemetryDoc: ComponentDocModule = {
  id: 'telemetry',
  source: telemetryRowSrc,
  usage: `import { TelemetryRow } from "@/primitives"

<div className="grid grid-cols-3 gap-x-4 gap-y-2">
  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
</div>`,
  examples: [
    {
      id: 'grid',
      title: '3-column grid',
      description: 'Values use tabular-nums and stay LTR inside an RTL row via <Bdi>. Rows wrap by item count.',
      render: () => (
        <div className="grid w-[360px] grid-cols-3 gap-x-4 gap-y-3">
          <TelemetryRow label="גובה" value="120m" icon={Navigation} />
          <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
          <TelemetryRow label="כיוון" value="270°" icon={Compass} />
          <TelemetryRow label="מרחק" value="1.2 km" icon={MapPin} />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-value',
      label: 'Long value (truncation)',
      note: 'The value has truncate, so an over-long token is clipped with an ellipsis inside the column rather than breaking the grid.',
      render: () => (
        <div className="w-[120px]">
          <TelemetryRow label="קואורדינטות" value="32.463561, 35.000427" icon={MapPin} />
        </div>
      ),
    },
    {
      id: 'no-icon',
      label: 'No icon',
      note: 'The icon is optional; without it the label aligns to the column start with no leading glyph.',
      render: () => (
        <div className="w-[120px]">
          <TelemetryRow label="מהירות" value="45 km/h" />
        </div>
      ),
    },
    {
      id: 'long-label',
      label: 'Long label',
      note: 'The label is not truncated — a long label wraps above the value. Keep labels short or the row grows taller than its neighbours.',
      render: () => (
        <div className="w-[120px]">
          <TelemetryRow label="מרחק מהמשגר הקרוב" value="1.2 km" icon={MapPin} />
        </div>
      ),
    },
    {
      id: 'extreme-numbers',
      label: 'Extreme numbers',
      note: 'tabular-nums keeps digits in fixed-width columns so values stay vertically aligned regardless of magnitude.',
      render: () => (
        <div className="flex w-[140px] flex-col gap-1">
          <TelemetryRow label="גובה" value="9m" icon={Navigation} />
          <TelemetryRow label="גובה" value="1,284m" icon={Navigation} />
          <TelemetryRow label="גובה" value="42,991m" icon={Navigation} />
        </div>
      ),
    },
    {
      id: 'empty-value',
      label: 'Empty value',
      note: 'An empty value renders nothing under the label. Supply a placeholder (e.g. "—") upstream so the row never reads as broken.',
      render: () => (
        <div className="flex w-[140px] flex-col gap-1">
          <TelemetryRow label="כיוון" value="" icon={Compass} />
          <TelemetryRow label="כיוון" value="—" icon={Compass} />
        </div>
      ),
    },
  ],
};
