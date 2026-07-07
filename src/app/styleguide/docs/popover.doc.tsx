/**
 * Co-located doc module for the Popover primitive
 * (`@/shared/components/ui/popover`) — the Radix anchored, non-modal floating
 * panel. Meta lives in `registry/manifest.json`.
 */
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Slider } from '@/shared/components/ui/slider';
import { Switch } from '@/shared/components/ui/switch';
import popoverSrc from '@/shared/components/ui/popover.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const popoverDoc: ComponentDocModule = {
  id: 'popover',
  source: popoverSrc,
  usage: `import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">הגדרות שכבה</Button>
  </PopoverTrigger>
  <PopoverContent className="w-64">…</PopoverContent>
</Popover>`,
  examples: [
    {
      id: 'default',
      title: 'Inline settings panel',
      description:
        'Unlike Dialog, a popover is non-modal — the app stays interactive behind it. Outside click or Esc dismisses. Ideal for per-control settings that should not steal the whole screen.',
      render: () => (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">הגדרות שכבה</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="pop-visible">הצג שכבה</Label>
                <Switch id="pop-visible" defaultChecked />
              </div>
              <div className="flex flex-col gap-2">
                <Label>שקיפות</Label>
                <Slider defaultValue={[70]} />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ),
    },
    {
      id: 'side',
      title: 'Anchor side & alignment',
      description: 'side / align on PopoverContent choose where the panel floats relative to its trigger.',
      code: `<PopoverContent side="top" align="start">…</PopoverContent>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">מעל</Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-44 text-xs text-slate-10">
              נפתח מעל העוגן
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">בצד</Button>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-44 text-xs text-slate-10">
              נפתח לצד העוגן
            </PopoverContent>
          </Popover>
        </div>
      ),
    },
  ],
};
