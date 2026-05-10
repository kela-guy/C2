export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: 'May 10, 2026',
    highlights: [
      '`DevicesPanel`: new `speaker` and `floodlight` device types with header controls — secondary `Play/Stop` button (custom solid `PlayFilledIcon`) and inline on/off `Switch`.',
      '`DevicesPanel`: speaker-track Combobox (`Popover` + `cmdk` `Command` + search) replaces the previous plain `Select`. Anchored at the start of the footer; transform-origin flips for RTL via `origin-top-left rtl:origin-top-right`.',
      '`DevicesPanel`: filter strip migrated to the `FilterBar` primitive. Multi-select; empty selection shows every type. `searchPlaceholder`, `clearSearchAriaLabel`, `resetLabel`, `resetAriaLabel` are now the i18n entry points.',
      'New `DevicesPanelStrings` keys: `typeFilterLabel`, `audioTrackSearchPlaceholder`, `audioTrackNoMatches`, plus the speaker/floodlight family (`speakerPlay`, `speakerStop`, `speakerPlaying`, `floodlightOn`, `floodlightOff`, `floodlightTurnOn`, `floodlightTurnOff`, `floodlightToggleAriaLabel`).',
      'Cross-app: normalised press feedback to `active:scale-[0.98]` across `Dashboard`, `CameraViewerPanel`, `FilterBar`, `NewUpdatesPill`, and `StyleguidePage` (was a mix of `[0.92]` / `[0.94]` / `[0.95]` / `[0.96]` / `[0.97]`).',
      'Removed the hardcoded `dir="rtl"` from the speaker `Select` — direction now inherits from the document / `DirectionProvider` like every other primitive.',
      'Styleguide: new sub-pages for **Speaker device**, **Floodlight device**, and **Audio-track combobox** under `DevicesPanel`. New **Press feedback** entry in **Styling**.',
    ],
  },
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
