/**
 * Co-located doc module for the TargetCard block. Composes real primitives
 * (CardHeader + CardDetails) inside a TargetCard so the Anatomy story is shown
 * live, not described. Meta + anatomy ids live in `registry/manifest.json`.
 *
 * Craft gate: collapsed / open / completed states are all rendered.
 */
import { useState } from 'react';
import { Crosshair, Navigation, Gauge, Compass } from '@/lib/icons/central';
import {
  TargetCard,
  CardHeader,
  CardDetails,
  StatusChip,
  type DetailRow,
} from '@/primitives';
import targetCardSrc from '@/primitives/TargetCard.tsx?raw';
import cardHeaderSrc from '@/primitives/CardHeader.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const SAMPLE_ROWS: DetailRow[] = [
  { label: 'גובה', value: '120m', icon: Navigation },
  { label: 'מהירות', value: '45 km/h', icon: Gauge },
  { label: 'כיוון', value: '270°', icon: Compass },
];

function DemoCard({
  defaultOpen = true,
  completed = false,
  title = 'DJI Mavic 3',
}: {
  defaultOpen?: boolean;
  completed?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="w-[340px]">
      <TargetCard
        open={open}
        onToggle={() => setOpen((v) => !v)}
        completed={completed}
        header={
          <CardHeader
            icon={Crosshair}
            title={title}
            subtitle="רחפן מסחרי"
            status={<StatusChip label="פעיל" color="green" />}
            open={open}
          />
        }
      >
        <CardDetails rows={SAMPLE_ROWS} defaultOpen title="טלמטריה" />
      </TargetCard>
    </div>
  );
}

export const targetCardDoc: ComponentDocModule = {
  id: 'target-card',
  source: targetCardSrc,
  relatedFiles: [{ file: 'CardHeader.tsx', code: cardHeaderSrc }],
  usage: `import { TargetCard, CardHeader, CardDetails } from "@/primitives"
import { useCardSlots } from "@/imports/useCardSlots"

const slots = useCardSlots(detection, callbacks, ctx)

<TargetCard open={open} onToggle={toggle} header={<CardHeader {...slots.header} status={statusChip} open={open} />}>
  <CardDetails rows={slots.details.rows} />
</TargetCard>`,
  examples: [
    {
      id: 'open',
      title: 'Open',
      description: 'Header tinted, body expands via the collapsible animation. The single most-used block in the app.',
      render: () => <DemoCard defaultOpen />,
    },
    {
      id: 'collapsed',
      title: 'Collapsed',
      description: 'Header only. Hover lightens the surface; the trigger shows a focus ring for keyboard nav.',
      render: () => <DemoCard defaultOpen={false} />,
    },
    {
      id: 'completed',
      title: 'Completed',
      description: 'Resolved cards desaturate and dim so the active list stays scannable.',
      render: () => <DemoCard defaultOpen completed title="טופל — DJI Mavic 3" />,
    },
  ],
};
