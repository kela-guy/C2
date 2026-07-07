/**
 * Co-located doc module for the Tooltip primitive
 * (`@/shared/components/ui/tooltip`) — the Radix hover/focus label on the
 * inverted surface. The app mounts one TooltipProvider at the root, so
 * consumers only compose Tooltip + Trigger + Content. Meta lives in
 * `registry/manifest.json`.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Button } from '@/shared/components/ui/button';
import { Radio, Video } from '@/lib/icons/central';
import tooltipSrc from '@/shared/components/ui/tooltip.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const tooltipDoc: ComponentDocModule = {
  id: 'tooltip',
  source: tooltipSrc,
  usage: `import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="שידור חי"><Video /></Button>
  </TooltipTrigger>
  <TooltipContent>שידור חי</TooltipContent>
</Tooltip>`,
  examples: [
    {
      id: 'default',
      title: 'Icon-button labels',
      description:
        'The main use: naming icon-only controls. Hover or focus the trigger — the label floats on the inverted surface with an arrow. Keep an aria-label on the trigger too; the tooltip is a visual aid, not the accessible name.',
      render: () => (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="שידור חי">
                <Video />
              </Button>
            </TooltipTrigger>
            <TooltipContent>שידור חי</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="ערוץ RF">
                <Radio />
              </Button>
            </TooltipTrigger>
            <TooltipContent>ערוץ RF</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
    {
      id: 'side',
      title: 'Anchor side & offset',
      description: 'side / sideOffset on TooltipContent choose where the label floats.',
      code: `<TooltipContent side="bottom" sideOffset={6}>מתחת לעוגן</TooltipContent>`,
      render: () => (
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">מעל</Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              מעל העוגן
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">מתחת</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              מתחת לעוגן
            </TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-content',
      label: 'Long content',
      note: 'Tooltips are for a few words. Longer explanations wrap via text-balance but should move to a Popover.',
      render: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">סטטוס חיישן</Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-48">
            המצלמה התרמית הצפונית מדווחת אות חלש בעשר הדקות האחרונות
          </TooltipContent>
        </Tooltip>
      ),
    },
  ],
};
