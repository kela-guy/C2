/**
 * Co-located doc module for the Textarea primitive
 * (`@/shared/components/ui/textarea`) — the multi-line sibling of Input,
 * sharing its surface grammar. Meta lives in `registry/manifest.json`.
 */
import { Textarea } from '@/shared/components/ui/textarea';
import textareaSrc from '@/shared/components/ui/textarea.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const textareaDoc: ComponentDocModule = {
  id: 'textarea',
  source: textareaSrc,
  usage: `import { Textarea } from "@/shared/components/ui/textarea"

<Textarea placeholder="הערות מבצעיות…" rows={3} />`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description:
        'Same translucent fill and focus ring as Input, with a min-height and free vertical resize for longer notes.',
      code: `<Textarea placeholder="הערות מבצעיות…" />`,
      render: () => (
        <div className="w-72">
          <Textarea placeholder="הערות מבצעיות…" />
        </div>
      ),
    },
    {
      id: 'prefilled',
      title: 'Report draft',
      description: 'A typical closure-report field — rows sets the initial height, content scrolls past it.',
      code: `<Textarea
  rows={4}
  defaultValue="18:42 — זוהה רחפן בגזרה הצפונית. הופעל ג׳אמר RF, המטרה נחתה מחוץ לשטח המוגן."
/>`,
      render: () => (
        <div className="w-72">
          <Textarea
            rows={4}
            defaultValue="18:42 — זוהה רחפן בגזרה הצפונית. הופעל ג׳אמר RF, המטרה נחתה מחוץ לשטח המוגן."
          />
        </div>
      ),
    },
    {
      id: 'states',
      title: 'Invalid & disabled',
      description: 'aria-invalid swaps to the destructive ring; disabled dims and locks the field.',
      code: `<Textarea aria-invalid placeholder="שדה חובה" rows={2} />
<Textarea disabled placeholder="נעול לעריכה" rows={2} />`,
      render: () => (
        <div className="flex w-72 flex-col gap-3">
          <Textarea aria-invalid placeholder="שדה חובה" rows={2} />
          <Textarea disabled placeholder="נעול לעריכה" rows={2} />
        </div>
      ),
    },
  ],
};
