import type { ReactNode } from 'react';

/** One scroll beat of a story: prose on the left, a live demo on the stage. */
export interface StoryChapter {
  /** Stable id, also used as the scroll anchor (`#id`). */
  id: string;
  /** Mono eyebrow label. */
  label: string;
  /** Left-column narrative (compose with kit prose + CodeBlock + InlineDemo). */
  prose: ReactNode;
  /** Right-column live demo (wrap in StageFrame; overlay Annotation/GhostFrame). */
  stage: ReactNode;
  /** Optional closing takeaway note. */
  takeaway?: ReactNode;
}
