/**
 * Co-located doc module for the Slider primitive
 * (`@/shared/components/ui/slider`) — the Radix range slider used for zoom,
 * volume, and threshold controls. Meta lives in `registry/manifest.json`.
 */
import { useState } from 'react';
import { Slider } from '@/shared/components/ui/slider';
import sliderSrc from '@/shared/components/ui/slider.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

function ZoomDemo() {
  const [value, setValue] = useState([4]);
  return (
    <div className="flex w-64 flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-10">
        <span>זום מצלמה</span>
        <span className="font-mono tabular-nums text-slate-12">×{value[0]}</span>
      </div>
      <Slider value={value} onValueChange={setValue} min={1} max={30} step={1} />
    </div>
  );
}

export const sliderDoc: ComponentDocModule = {
  id: 'slider',
  source: sliderSrc,
  usage: `import { Slider } from "@/shared/components/ui/slider"

<Slider value={zoom} onValueChange={setZoom} min={1} max={30} step={1} />`,
  examples: [
    {
      id: 'default',
      title: 'Interactive value readout',
      description:
        'Tinted track, accent range fill, and a grabbable thumb. Pair the slider with a monospace readout so the exact value is never guesswork.',
      render: () => <ZoomDemo />,
    },
    {
      id: 'range',
      title: 'Range (two thumbs)',
      description: 'Pass two values for a min/max window — e.g. an altitude band filter.',
      code: `<Slider defaultValue={[50, 300]} min={0} max={500} step={10} />`,
      render: () => (
        <div className="flex w-64 flex-col gap-2">
          <div className="text-xs text-slate-10">רצועת גובה (m)</div>
          <Slider defaultValue={[50, 300]} min={0} max={500} step={10} />
        </div>
      ),
    },
    {
      id: 'disabled',
      title: 'Disabled',
      description: 'The whole control dims and locks.',
      code: `<Slider defaultValue={[40]} disabled />`,
      render: () => (
        <div className="w-64">
          <Slider defaultValue={[40]} disabled />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'extremes',
      label: 'At the extremes',
      note: 'The thumb stays fully visible at min and max — it never clips outside the track.',
      render: () => (
        <div className="flex w-64 flex-col gap-4">
          <Slider defaultValue={[0]} min={0} max={100} />
          <Slider defaultValue={[100]} min={0} max={100} />
        </div>
      ),
    },
  ],
};
