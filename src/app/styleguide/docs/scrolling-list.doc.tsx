/**
 * Co-located doc module for the Scrolling List foundation — the edge-cue
 * system in `@/lib/scroll`. Meta lives in `registry/manifest.json`.
 *
 * Demos import the real primitives (`ScrollArea`, `useScrollEdges`,
 * `ScrollEdgeCue`) so the styleguide reflects what ships.
 */
import { useRef } from 'react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useScrollEdges } from '@/lib/scroll/useScrollEdges';
import { ScrollEdgeCue } from '@/lib/scroll/ScrollEdgeCue';
import scrollEdgesSrc from '@/lib/scroll/useScrollEdges.ts?raw';
import type { ComponentDocModule } from '../registry/types';

function Rows({ count = 24 }: { count?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-b border-white/[0.06] px-3 py-2 text-xs text-white/70 last:border-b-0"
        >
          Row {i + 1}
        </div>
      ))}
    </div>
  );
}

/** The wrapper: a vertical ScrollArea with cues + restyled scrollbar. */
function WrapperDemo() {
  return (
    <ScrollArea className="h-48 w-64 rounded-lg bg-[var(--surface-1,#1e1e1e)] ring-1 ring-white/10">
      <Rows />
    </ScrollArea>
  );
}

/** The primitives directly: useScrollEdges + ScrollEdgeCue over a native scroller. */
function PrimitivesDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges({ ref });
  return (
    <div className="relative h-48 w-64 overflow-hidden rounded-lg ring-1 ring-white/10">
      <div ref={ref} className="h-full overflow-y-auto">
        <Rows />
      </div>
      <ScrollEdgeCue edge="top" visible={edges.top} size="tight" />
      <ScrollEdgeCue edge="bottom" visible={edges.bottom} size="tight" />
    </div>
  );
}

/** Horizontal overflow — cues + chevrons on the inline edges. */
function HorizontalDemo() {
  return (
    <ScrollArea orientation="horizontal" className="w-72 rounded-lg ring-1 ring-white/10">
      <div className="flex gap-2 p-3">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="flex size-16 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs text-white/70"
          >
            {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export const scrollingListDoc: ComponentDocModule = {
  id: 'scrolling-list',
  source: scrollEdgesSrc,
  usage: `import { ScrollArea } from "@/shared/components/ui/scroll-area"

// Wrapper — cues + restyled overlay scrollbar, native fallback on touch.
<ScrollArea className="h-48" orientation="vertical">
  {rows}
</ScrollArea>

// Primitives — for scrollers you don't own (e.g. react-virtuoso):
const ref = useRef<HTMLDivElement>(null)
const edges = useScrollEdges({ ref })
<div className="relative">
  <div ref={ref} className="overflow-y-auto">{rows}</div>
  <ScrollEdgeCue edge="top" visible={edges.top} />
  <ScrollEdgeCue edge="bottom" visible={edges.bottom} />
</div>`,
  examples: [
    {
      id: 'wrapper',
      title: 'ScrollArea wrapper',
      description:
        'The common case: a surface-aware gradient + chevron appears only on edges that have more content, with a restyled overlay scrollbar. Cues update on scroll, resize, and content change.',
      render: () => <WrapperDemo />,
    },
    {
      id: 'primitives',
      title: 'Primitives (own your scroller)',
      description:
        'useScrollEdges + ScrollEdgeCue over a native/virtualized scroll element you control directly — the same approach the dashboard target rail and devices panel use over react-virtuoso.',
      render: () => <PrimitivesDemo />,
    },
    {
      id: 'horizontal',
      title: 'Horizontal',
      description:
        'Set orientation to track the inline edges; chevrons point left/right and respect RTL via logical positioning.',
      render: () => <HorizontalDemo />,
    },
  ],
  edgeCases: [
    {
      id: 'no-overflow',
      label: 'No overflow',
      note: 'When content fits, no cue renders — the surface looks intentionally finished, not clipped.',
      render: () => (
        <ScrollArea className="h-48 w-64 rounded-lg ring-1 ring-white/10">
          <Rows count={3} />
        </ScrollArea>
      ),
    },
  ],
};
