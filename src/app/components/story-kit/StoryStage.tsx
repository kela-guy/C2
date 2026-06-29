/**
 * The right-hand stage. Every chapter's demo is mounted at once and crossfaded
 * by opacity (only the active one is visible/interactive), so demo state — a
 * running sim, a dragged badge — persists as you scroll between chapters instead
 * of resetting on each swap. It fills its (sticky, contrast-panel) parent.
 */

import type { StoryChapter } from './types';

export function StoryStage({
  chapters,
  activeId,
}: {
  chapters: StoryChapter[];
  activeId: string | null;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {chapters.map((ch) => {
        const active = ch.id === activeId;
        return (
          <div
            key={ch.id}
            aria-hidden={!active}
            className="absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-300 ease-out"
            style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
          >
            {ch.stage}
          </div>
        );
      })}
    </div>
  );
}
