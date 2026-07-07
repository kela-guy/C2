/**
 * Co-located doc module for the Input primitive
 * (`@/shared/components/ui/input`) — the single-line text field every search
 * and form surface builds on. Meta lives in `registry/manifest.json`.
 */
import { Input } from '@/shared/components/ui/input';
import { Search } from '@/lib/icons/central';
import inputSrc from '@/shared/components/ui/input.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const inputDoc: ComponentDocModule = {
  id: 'input',
  source: inputSrc,
  usage: `import { Input } from "@/shared/components/ui/input"

<Input placeholder="חיפוש מטרה…" />
<Input type="number" placeholder="גובה (m)" />
<Input disabled placeholder="לא זמין" />`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'Translucent input-background fill with a subtle border; focus brightens the border and adds the layered ring. Placeholder text stays muted.',
      code: `<Input placeholder="חיפוש מטרה…" />`,
      render: () => (
        <div className="w-64">
          <Input placeholder="חיפוש מטרה…" />
        </div>
      ),
    },
    {
      id: 'with-icon',
      title: 'Search field composition',
      description:
        'The FilterBar pattern: wrap the input and absolutely position a muted leading icon, padding the text out of its way with ps-8 (logical, RTL-safe).',
      code: `<div className="relative w-64">
  <Search
    size={14}
    className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-slate-9"
  />
  <Input placeholder="חיפוש חיישן…" className="ps-8" />
</div>`,
      render: () => (
        <div className="relative w-64">
          <Search
            size={14}
            className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-slate-9"
          />
          <Input placeholder="חיפוש חיישן…" className="ps-8" />
        </div>
      ),
    },
    {
      id: 'states',
      title: 'Invalid & disabled',
      description:
        'aria-invalid swaps the ring/border to the destructive tone; disabled drops to 50% opacity and blocks pointer events.',
      code: `<Input aria-invalid placeholder="תדר לא חוקי" />
<Input disabled placeholder="לא זמין במצב מקוון" />`,
      render: () => (
        <div className="flex w-64 flex-col gap-3">
          <Input aria-invalid placeholder="תדר לא חוקי" />
          <Input disabled placeholder="לא זמין במצב מקוון" />
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-value',
      label: 'Long value',
      note: 'The field keeps a single line — overflow scrolls horizontally with the caret rather than growing the field.',
      render: () => (
        <div className="w-52">
          <Input defaultValue="רחפן לא מזוהה בגזרה הצפונית ליד מאגר המים העליון" />
        </div>
      ),
    },
    {
      id: 'number',
      label: 'Numeric type',
      note: 'type="number" keeps the same surface; spinners follow the native platform.',
      render: () => (
        <div className="w-40">
          <Input type="number" defaultValue={120} />
        </div>
      ),
    },
  ],
};
