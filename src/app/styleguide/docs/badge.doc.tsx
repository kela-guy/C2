/**
 * Co-located doc module for the generic Badge primitive
 * (`@/shared/components/ui/badge`), wearing the C2 design — translucent
 * colored fills and layered white opacities on the dark control-room surface.
 * Meta lives in `registry/manifest.json`.
 */
import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import badgeSrc from '@/shared/components/ui/badge.tsx?raw';
import type { ComponentDocModule } from '../registry/types';

export const badgeDoc: ComponentDocModule = {
  id: 'badge',
  source: badgeSrc,
  usage: `import { Badge } from "@/components/ui/badge"

<Badge>New</Badge>
<Badge variant="secondary">Beta</Badge>
<Badge variant="destructive">Error</Badge>`,
  examples: [
    {
      id: 'variants',
      title: 'Variants',
      description:
        'Six surface treatments. Destructive uses a translucent red fill so it reads correctly on the dark surface; outline is a layered ring, not a hard border.',
      code: `<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="ghost">Ghost</Badge>
<Badge variant="link">Link</Badge>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="link">Link</Badge>
        </div>
      ),
    },
    {
      id: 'with-icon',
      title: 'With icon',
      description: 'A leading icon sizes to 12px and tucks against the inline-start padding automatically.',
      code: `<Badge variant="secondary">
  <BadgeCheck data-icon="inline-start" />
  Verified
</Badge>`,
      render: () => (
        <div dir="ltr" className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">
            <BadgeCheck data-icon="inline-start" />
            Verified
          </Badge>
          <Badge>
            <BadgeCheck data-icon="inline-start" />
            Active
          </Badge>
        </div>
      ),
    },
  ],
  edgeCases: [
    {
      id: 'long-label',
      label: 'Long label',
      note: 'Constrained by a narrow parent the badge keeps its single line and truncates with an ellipsis rather than overflowing.',
      render: () => (
        <div dir="ltr" className="w-[160px]">
          <Badge className="max-w-full">
            <span className="truncate">A very long status label that overflows</span>
          </Badge>
        </div>
      ),
    },
    {
      id: 'numeric',
      label: 'Numeric / count',
      note: 'Counts use tabular figures (inherited from the grid) so stacked badges stay aligned.',
      render: () => (
        <div dir="ltr" className="flex flex-col items-center gap-2">
          <Badge variant="secondary">128</Badge>
          <Badge variant="secondary">007</Badge>
        </div>
      ),
    },
    {
      id: 'as-link',
      label: 'As link (asChild)',
      note: 'With asChild the styling is applied onto a child anchor via Radix Slot, so a badge can be a real, focusable link.',
      render: () => (
        <div dir="ltr">
          <Badge asChild variant="outline">
            <a href="#badge">Docs ↗</a>
          </Badge>
        </div>
      ),
    },
  ],
};
