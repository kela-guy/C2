export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.4.0',
    date: 'Jun 2, 2026',
    highlights: [
      '`DevicesPanel`: the collapsed row is no longer info-only. It now carries an always-visible **primary cluster** at the inline-end — Show-on-map pinned to the outer edge, the per-type On/Off inboard (speaker Play/Pause, floodlight `FloodlightSegmentedCompact`), the speaker **now-playing** readout (`DotmSquare18` + track name, grows in with no layout shift), and the armed-notifications countdown echo.',
      '`DEVICE_REGISTRY`: actions split into three placement slots — `headerActions` (icon-only ghost), `footerActions` (solid pill), and `overflowActions` (3-dot). `resolveDeviceAction(kind, ctx, placement)` is now placement-aware. New kinds: `watchVideo` (reuses pin-to-feed), `audio`, `logs`, `notifications`.',
      '`DeviceOverflowMenu`: new footer 3-dot overflow for the low-signal inspect actions — a timed **Notifications** toggle (`NOTIFY_WINDOW_S` 30s countdown + radar sweep, mirrored in the header) and the red **Logs** error channel that lights with `device.errorCount` and a count badge.',
      'Health tile: replaced the plain status tooltip with a **titled** tooltip — a severity dot + label, a clamped `errorCount` badge, and a hairline-fenced reason / connection detail.',
      'Real wiring: new `onArmNotifications(id, armed)` / `onOpenLogs(id)` panel callbacks + optional `Device.errorCount`, threaded through `DevicesPanelImpl`, `Dashboard`, and the Playground. New strings: `showOnMap`, `logs`, `errors`, `notifications`, `moreActions`, `nowPlayingAriaLabel`, the four `health*` severity titles.',
      'Styleguide: Device Card page re-synced — new **Header cluster** and **Overflow + notify** galleries, the titled-tooltip + count-badge edge case, the registry table grew Header / Footer / Overflow columns, and the picker now deep-links `device-overflow` / `device-logs` / `device-notifications` / the header cluster controls to their exact sections.',
    ],
  },
  {
    version: '1.3.0',
    date: 'Jun 2, 2026',
    highlights: [
      '`DevicesPanel`: promoted the registry-driven device card to production. The collapsed row is now purely informational — a single worst-wins **health tile** (`getDeviceHealth` + `DEVICE_HEALTH_VISUAL`) replaces the old malfunction icon + status dot + chip + inline controls. Every control (jam, floodlight, speaker, pin) now lives in the **expanded footer**.',
      '`DeviceAction`: new single control primitive behind every footer action — one source of truth for sizing, focus rings, press feedback, loading-vs-disabled, and disabled-reason tooltips, with four semantic tones (`neutral` / `engaged` / `caution` / `danger`).',
      '`DEVICE_REGISTRY`: the row no longer branches on `device.type`. Capabilities, ordered stat fields, and ordered footer actions are declared per type; `resolveDeviceAction` maps them into `DeviceAction`s. Retired the per-control files (`JamButton`, `SpeakerPlayButton`, `PinToFeed*`, `FloodlightToggle`, `DroneControls`, `DeviceRowActions`).',
      'Styleguide: new **Device Card** page documenting the card primitive-by-primitive (DeviceAction, health tile, detail grid, camera preview, action bar) up to the full row, with exact spacing tokens, the registry table, and a MOCK_DEVICES-style edge-case gallery.',
      'Handoff picker: every device `data-handoff-component` hint now deep-links to its exact section (e.g. the jam button → `#device-action`, the health tile → `#device-health`), so picking any sub-part of a card lands on the right doc instead of the generic panel section.',
    ],
  },
  {
    version: '1.2.0',
    date: 'May 18, 2026',
    highlights: [
      '`CardIdentity`: value wrapper switched to `w-fit` so the copy icon rides immediately after the text instead of being pinned to the row\'s far end. Each row\'s `relative w-fit` container also has `text-end` on the `Bdi` so Latin tokens inside RTL rows are visually right-aligned without forcing direction.',
      '`CardIdentity`: gradient fade-bg now follows `SURFACE.level2` (the real AccordionSection content surface — base sidebar + `rgba(255,255,255,0.08)` overlay) instead of `ELEVATION.baseSurface`. Eliminates the dark wash that used to ring the copy icon.',
      '`CardIdentity`: overlay narrowed from 56px → 40px (`ps-4`) with a sharper 50% gradient stop (was 60%), so most of the overlay is solid behind the icon and only the inner edge fades.',
      '`CardIdentity`: fixed a bug where the copy icon stayed visible after a mouse click. Overlay reveal now uses `has-[:focus-visible]` (keyboard-only) instead of `focus-within` (which also matched mouse-induced focus and pinned the overlay open).',
      '`CopyButton`: success-state presence lift — Check glyph is ~2px larger than Copy (16/18px vs 14/16px), stroke 3 vs 2, color `text-zinc-50` vs `text-zinc-200`, and the entry animation uses overshoot keyframes (`0.85 → 1.06 → 1`, 0.22s, custom easing) so the confirmation lands instead of fading in flat. Still neutral — no green. `cursor-pointer` added. `prefers-reduced-motion` collapses motion to a hard swap while the size/stroke/color lifts still apply.',
      '`CardDetails`: removed the non-functional copy-all button (no success feedback, no error handling, no aria-live). Grid locked to `grid-cols-2` — the previous `grid-cols-3` consistently left a trailing empty cell and squeezed long values like `32.46356, 35.00042`. Per-field copy lives on `CardIdentity`. `copyLabel` prop and `los.telemetryCopy` i18n keys (he + en) removed.',
      'Styleguide: `CopyButton` preview rewritten to mirror the production `CardIdentity` composition (w-fit value wrapper, absolute gradient overlay, keyboard-only focus reveal). `CardIdentity` preview surface bumped from `SURFACE.level0` to `SURFACE.level1` so the gradient lands on the realistic backdrop. `CardDetails` props table grew to document `title`, `classification`, and `className`.',
    ],
  },
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
