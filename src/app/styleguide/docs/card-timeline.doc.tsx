/**
 * Co-located doc module for the CardTimeline block — engagement progress
 * steps for a TargetCard. Meta lives in `registry/manifest.json`.
 */
import { CardTimeline, type TimelineStep } from '@/primitives';
import cardTimelineSrc from '@/primitives/CardTimeline.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

const STEPS: TimelineStep[] = [
  { label: 'זיהוי', status: 'complete' },
  { label: 'אימות', status: 'complete' },
  { label: 'שיבוש', status: 'active' },
  { label: 'סגירה', status: 'pending' },
];

const HEBREW_STATUS = {
  pending: 'ממתין',
  active: 'פעיל',
  complete: 'הושלם',
  error: 'שגיאה',
} as const;

export const cardTimelineDoc: ComponentDocModule = {
  id: 'card-timeline',
  source: cardTimelineSrc,
  usage: `import { CardTimeline, type TimelineStep } from "@/primitives"

const steps: TimelineStep[] = [
  { label: "זיהוי", status: "complete" },
  { label: "שיבוש", status: "active" },
  { label: "סגירה", status: "pending" },
]

<CardTimeline steps={steps} />
<CardTimeline steps={steps} compact />`,
  examples: [
    {
      id: 'default',
      title: 'Vertical checklist',
      description:
        'One row per step: complete gets a check, active gets the red dot + blinking caret, pending stays an empty ring. Labels are monospace so the column reads as an instrument log.',
      code: `<CardTimeline steps={steps} />`,
      render: () => (
        <div className="w-[260px] rounded bg-surface-2 px-3">
          <CardTimeline steps={STEPS} />
        </div>
      ),
    },
    {
      id: 'compact',
      title: 'Compact dot strip',
      description:
        'compact collapses the checklist to a connected dot strip for collapsed card headers. Each dot carries role="img" with a localized "label: status" aria-label — pass statusLabels for locale.',
      code: `<CardTimeline
  steps={steps}
  compact
  statusLabels={{ pending: "ממתין", active: "פעיל", complete: "הושלם", error: "שגיאה" }}
/>`,
      render: () => (
        <div className="w-[200px]">
          <CardTimeline steps={STEPS} compact statusLabels={HEBREW_STATUS} />
        </div>
      ),
    },
    {
      id: 'error',
      title: 'Error step',
      description: 'An error status renders a red spinner ring in the checklist and a red dot in the compact strip — a failed engagement stays visible instead of silently stalling.',
      code: `<CardTimeline steps={[
  { label: "זיהוי", status: "complete" },
  { label: "שיבוש", status: "error" },
  { label: "סגירה", status: "pending" },
]} />`,
      render: () => (
        <div className="w-[260px] rounded bg-surface-2 px-3">
          <CardTimeline
            steps={[
              { label: 'זיהוי', status: 'complete' },
              { label: 'שיבוש', status: 'error' },
              { label: 'סגירה', status: 'pending' },
            ]}
          />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'single-step',
      label: 'Single step',
      note: 'The compact strip needs at least two steps to draw a connector; a single step renders one dot.',
      render: () => (
        <div className="flex flex-col items-center gap-3">
          <CardTimeline steps={[{ label: 'זיהוי', status: 'active' }]} compact statusLabels={HEBREW_STATUS} />
          <CardTimeline steps={[{ label: 'זיהוי', status: 'active' }]} />
        </div>
      ),
    },
    {
      id: 'empty',
      label: 'Empty steps',
      note: 'With steps=[] the block renders nothing at all.',
      render: () => (
        <div className="flex w-[240px] items-center justify-center text-xs text-slate-9">
          <CardTimeline steps={[]} />
          <span>steps=[] → renders null</span>
        </div>
      ),
    },
  ],
};
