/**
 * Co-located doc module for the NewUpdatesPill primitive. Meta lives in
 * `registry/manifest.json`.
 */
import { NewUpdatesPill } from '@/primitives';
import newUpdatesPillSrc from '@/primitives/NewUpdatesPill.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const newUpdatesDoc: ComponentDocModule = {
  id: 'new-updates',
  source: newUpdatesPillSrc,
  usage: `import { NewUpdatesPill } from "@/primitives"

<NewUpdatesPill count={3} onClick={scrollToTop} />`,
  examples: [
    {
      id: 'default',
      title: 'Default',
      description: 'Floating pill surfacing new incoming detections. Enters with a soft drop; respects reduced motion.',
      code: `<NewUpdatesPill count={3} onClick={scrollToTop} />`,
      render: () => <NewUpdatesPill count={3} onClick={() => {}} />,
    },
    {
      id: 'custom-label',
      title: 'Custom label',
      description: 'Pass a label formatter for locale text.',
      code: `<NewUpdatesPill count={12} label={(n) => \`\${n} עדכונים\`} onClick={scrollToTop} />`,
      render: () => <NewUpdatesPill count={12} label={(n) => `${n} עדכונים`} onClick={() => {}} />,
    },
  ],
  edgeCases: [
    {
      id: 'zero',
      label: 'Zero count',
      note: 'The pill does not self-hide on count={0} — it renders "0 new". Callers must gate rendering on count > 0 (it is normally wrapped in AnimatePresence).',
      render: () => <NewUpdatesPill count={0} onClick={() => {}} />,
    },
    {
      id: 'large-count',
      label: 'Large count',
      note: 'No built-in clamp. Use the label formatter to cap (e.g. 99+) so the pill stays compact.',
      render: () => (
        <div className="flex flex-col items-center gap-2">
          <NewUpdatesPill count={1284} onClick={() => {}} />
          <NewUpdatesPill count={1284} label={(n) => `${n > 99 ? '99+' : n} new`} onClick={() => {}} />
        </div>
      ),
    },
    {
      id: 'singular-plural',
      label: 'Singular vs plural',
      note: 'The default formatter is count-agnostic ("1 new"). Pass a formatter for correct grammar/locale.',
      render: () => (
        <div className="flex flex-col items-center gap-2">
          <NewUpdatesPill count={1} onClick={() => {}} />
          <NewUpdatesPill count={1} label={(n) => (n === 1 ? '1 update' : `${n} updates`)} onClick={() => {}} />
        </div>
      ),
    },
  ],
};
