export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: 'Apr 2, 2026',
    highlights: [
      'Initial registry release with 45 UI components + 21 domain primitives (68 total).',
      'shadcn CLI distribution via `npx shadcn add @c2/<name>`.',
      'Domain primitives: `StatusChip`, `ActionButton`, `TargetCard`, `CardActions`, `MapMarker`, and more.',
      'Design tokens (`tokens`) and map marker states available as registry items.',
      'CSS-variable-based theming with `theme.css`.',
      'Post-build import path transforms for consumer compatibility.',
    ],
  },
];
