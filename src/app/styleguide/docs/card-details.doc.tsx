/**
 * Co-located doc module for the CardDetails block — the collapsible
 * telemetry section of a TargetCard. Meta + anatomy live in
 * `registry/manifest.json`.
 */
import { Navigation, Gauge, Compass, MapPin } from '@/lib/icons/central';
import { CardDetails, type DetailRow } from '@/primitives';
import cardDetailsSrc from '@/primitives/CardDetails.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const ROWS: DetailRow[] = [
  { label: 'גובה', value: '120m', icon: Navigation },
  { label: 'מהירות', value: '45 km/h', icon: Gauge },
  { label: 'כיוון', value: '270°', icon: Compass },
  { label: 'מרחק', value: '1.2 km', icon: MapPin },
];

export const cardDetailsDoc: ComponentDocModule = {
  id: 'card-details',
  source: cardDetailsSrc,
  usage: `import { CardDetails, type DetailRow } from "@/primitives"
import { Navigation, Gauge, Compass } from "@/lib/icons/central"

const rows: DetailRow[] = [
  { label: "גובה", value: "120m", icon: Navigation },
  { label: "מהירות", value: "45 km/h", icon: Gauge },
  { label: "כיוון", value: "270°", icon: Compass },
]

<CardDetails rows={rows} title="טלמטריה" defaultOpen />`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'An AccordionSection wrapping TelemetryRows in a fixed 2-col grid — wide enough for coordinate pairs to breathe without wrapping.',
      code: `<CardDetails rows={rows} title="טלמטריה" defaultOpen />`,
      render: () => (
        <div className="w-[320px]">
          <CardDetails rows={ROWS} title="טלמטריה" defaultOpen />
        </div>
      ),
    },
    {
      id: 'collapsed',
      title: 'Collapsed',
      description: 'defaultOpen={false} is the resting state inside a card — telemetry is one tap away without dominating the card body.',
      code: `<CardDetails rows={rows} title="טלמטריה" />`,
      render: () => (
        <div className="w-[320px]">
          <CardDetails rows={ROWS} title="טלמטריה" />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'coordinates',
      label: 'Coordinate pair',
      note: 'The 2-col grid gives long values like a lat/lon pair room; the value truncates rather than breaking the grid.',
      render: () => (
        <div className="w-[300px]">
          <CardDetails
            rows={[
              { label: 'קואורדינטות', value: '32.46356, 35.00042', icon: MapPin },
              { label: 'גובה', value: '120m', icon: Navigation },
            ]}
            title="טלמטריה"
            defaultOpen
          />
        </div>
      ),
    },
    {
      id: 'empty',
      label: 'Empty rows',
      note: 'With rows=[] the component renders nothing at all — no empty accordion shell.',
      render: () => (
        <div className="flex w-[240px] items-center justify-center text-xs text-slate-9">
          <CardDetails rows={[]} title="טלמטריה" />
          <span>rows=[] → renders null</span>
        </div>
      ),
    },
  ],
};
