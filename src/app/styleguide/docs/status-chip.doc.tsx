/**
 * Co-located doc module for the StatusChip primitive. Meta lives in
 * `registry/manifest.json`.
 */
import { StatusChip } from '@/primitives';
import statusChipSrc from '@/primitives/StatusChip.tsx?raw';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import type { ComponentDocModule } from '../registry/types';

const LONG_LABEL = 'זוהה כלי טיס בלתי מאויש חשוד';

export const statusChipDoc: ComponentDocModule = {
  id: 'status-chip',
  source: statusChipSrc,
  usage: `import { StatusChip } from "@/primitives"

<StatusChip label="פעיל" color="green" />`,
  examples: [
    {
      id: 'colors',
      title: 'Colors',
      description: 'Color carries meaning: green = active/resolved, red = threat, orange = warning, gray = inactive.',
      code: `<StatusChip label="פעיל" color="green" />
<StatusChip label="איום" color="red" />
<StatusChip label="אזהרה" color="orange" />
<StatusChip label="פג תוקף" color="gray" />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip label="פעיל" color="green" />
          <StatusChip label="איום" color="red" />
          <StatusChip label="אזהרה" color="orange" />
          <StatusChip label="פג תוקף" color="gray" />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-label',
      label: 'Long label',
      note: 'Constrained by a narrow parent, the label truncates with an ellipsis instead of overflowing. Hover (or focus) to reveal the full text in a tooltip.',
      render: () => (
        <div className="w-[160px] rounded p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="flex max-w-full cursor-default rounded outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <StatusChip label={LONG_LABEL} color="red" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{LONG_LABEL}</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
    {
      id: 'single-char',
      label: 'Single character',
      note: 'Minimum content. Stays centered with the same padding so it reads as a chip, not a dot.',
      render: () => <StatusChip label="3" color="orange" />,
    },
    {
      id: 'numeric',
      label: 'Numeric label',
      note: 'Latin/numeric content uses tabular figures so counts stay aligned across stacked chips.',
      render: () => (
        <div className="flex flex-col items-center gap-2">
          <StatusChip label="128 BPM" color="green" />
          <StatusChip label="007 BPM" color="green" />
        </div>
      ),
    },
    {
      id: 'mixed-bidi',
      label: 'Mixed RTL / LTR',
      note: 'Hebrew status with an embedded Latin callsign. The label keeps natural reading order within the RTL chip.',
      render: () => <StatusChip label="DJI-114 פעיל" color="green" />,
    },
  ],
};
