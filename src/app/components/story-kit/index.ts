/**
 * story-kit — a reusable two-pane "scrollytelling" handoff kit that reproduces
 * the devouringdetails Next.js Dev Tools interaction-teaching format (scrolling
 * narrative + sticky live stage, hand-drawn annotations, exposed debug toggles)
 * recolored to the C2-Hub dark tactical theme.
 *
 * Compose a `StoryChapter[]` and hand it to `<StoryLayout>`.
 */

export { StoryLayout } from './StoryLayout';
export { StorySection } from './StorySection';
export { StoryStage } from './StoryStage';
export { StageFrame } from './StageFrame';
export { Annotation } from './Annotation';
export { GhostFrame } from './GhostFrame';
export { CodeBlock } from './CodeBlock';
export { DebugChips, type DebugChip } from './DebugChips';
export { Fade } from './Fade';
export { InlineDemo } from './InlineDemo';
export { Eyebrow, P, Lead, Mono, Takeaway } from './prose';
export { useActiveSection } from './useActiveSection';
export { useScrollOpacity } from './useScrollOpacity';
export { PALETTES, paletteVars, type Mood, type Palette } from './palette';
export type { StoryChapter } from './types';
