# Direction (RTL / LTR) Infrastructure

This folder owns the runtime state, primitives, and conventions for
bidirectional text direction in C2 Hub. The product is Hebrew-first
(RTL) but every screen has to render correctly in LTR too — dev tooling,
external operators using English UI, accessibility, and previewability
in the styleguide.

The infra is intentionally split across **six layers**, each with a
single concern. Read this file before reaching for a `dir="rtl"` literal,
a hardcoded `right-2`, or `Intl.DateTimeFormat('he-IL', …)`.

---

## Layer 1 — Direction context

`DirectionProvider.tsx` owns a single piece of state: `'rtl' | 'ltr'`. It

- mirrors the state onto `<html dir>` + `<html lang>`,
- persists to `localStorage` (`c2hub.direction`),
- wraps Radix's own `DirectionProvider` so every Radix primitive
  (DropdownMenu, ContextMenu, Menubar, Popover, Slider, Tabs, Toast,
  ScrollArea, Tooltip, …) inherits the same direction.

Wired once in `src/app/App.tsx`. Read with `useDirection()`,
`useIsRtl()`, or `useLocale()`.

> Default direction: `'rtl'`. The user can flip it from the styleguide
> page (and eventually a settings panel toggle); the choice survives a
> reload.

---

## Layer 2 — Smart CSS variants

`src/styles/theme.css` defines two Tailwind v4 custom variants:

```css
@custom-variant rtl (&:where([dir="rtl"], [dir="rtl"] *));
@custom-variant ltr (&:where([dir="ltr"], [dir="ltr"] *));
```

Selectors are scoped to the *closest* `[dir]` ancestor. That means:

- `rtl:rotate-180` on a chevron flips it when the page is RTL, stays
  put when the page is LTR.
- A subtree wrapped in `<DirIsland direction="ltr">` (which sets
  `dir="ltr"` on its root) breaks the cascade — every `rtl:*` rule
  inside that island stops matching, so an instrument HUD or playback
  timeline stays LTR even when the app is RTL.

Use `rtl:` / `ltr:` only when a *physical* outcome is required (icon
rotation, mirroring a transform, hiding a glyph in one direction). For
ordinary spacing/positioning prefer Tailwind's logical utilities — see
the `.cursor/rules/rtl-direction.mdc` rule for the table.

---

## Layer 3 — Direction primitives

| Primitive | When to use |
|-----------|-------------|
| `<DirIsland direction="ltr">` | Pin a subtree to a direction. Instrument HUDs, playback timelines, slim icon rail (when rail must not flip), Latin-only chrome. |
| `<Bdi>` | Inline isolate mixed-script content. Wrap callsigns, frequencies, coords, MGRS tokens that appear inside Hebrew sentences. |
| `<ChevronStart>` / `<ChevronEnd>` | Pagination & breadcrumbs. Picks the visually-correct chevron without `isRtl` ternaries at the call site. |
| `<ChevronsStart>` / `<ChevronsEnd>` | Double-chevron variants ("first page", "last page"). |
| `<ArrowStart>` / `<ArrowEnd>` | Direction-aware arrow glyphs (rotates `ArrowUp` because the Central icon set doesn't ship dedicated horizontal arrows). |
| `<DirectionalIcon start={…} end={…} />` | Generic chooser when the start/end pair is custom (Lucide/Central/SVG). |

`<DirIsland>` also wraps Radix's `DirectionProvider` for the subtree, so
every Radix primitive rendered inside picks up the island's direction
automatically (submenu chevrons, toast slide-in side, slider/scroll-area
orientation).

---

## Layer 4 — Intl boundary

`src/lib/intl/format.ts` centralises locale-aware formatting:

- `useNumberFormat`, `useDateTimeFormat`, `useRelativeTimeFormat`,
  `useListFormat` — React hooks bound to `useLocale()`. Memoised per
  options object so a hot loop pays one constructor per option shape.
- `getNumberFormat(locale, …)` etc. — non-React factories. Use from
  selectors, RAF loops, log adapters, anywhere outside React.
- `formatTime`, `formatTimeShort`, `formatDateShort`, `formatLatLon` —
  domain helpers wrapping the common option shapes.

Never construct `Intl.*` inline or call `value.toLocaleString()` —
direction state is in React; bare `toLocaleString()` follows the
browser's `navigator.language`, which won't match the user's UI choice.

---

## Layer 5 — Component migration

The following surfaces have been audited and migrated:

- `src/app/components/ui/*` — every shadcn primitive uses logical CSS
  utilities; `ChevronRightIcon` submenu indicators get `rtl:rotate-180`;
  `Sheet`'s close button uses `end-4`.
- `src/primitives/*` — `CardMedia` wraps video controls in
  `<DirIsland direction="ltr">`; `TelemetryRow` and `NewUpdatesPill`
  bidi-isolate values with `<Bdi>`.
- `src/app/components/camera-v2/*` — `PlaybackTimeline`,
  `CameraTelemetryStrip`, `DroneHud`, and the Live/Playback badges
  wrap their contents in `<DirIsland direction="ltr">` (instrument /
  time-flow convention). The `CameraControlBar` and `CameraSettingsMenu`
  follow app direction.
- `Dashboard`, `DevicesPanel`, `NotificationCenter`, `PlaygroundPage` —
  slim icon rail follows app direction; rail tooltips and dropdowns
  compute `side` from `useIsRtl()`; sliding side sheets that dock
  **adjacent to the rail** (Dashboard sidebar, DevicesPanel) use
  `start-0`, `border-e`, and animate with
  `-translate-x-full rtl:translate-x-full`. The Dashboard resize handle
  sits at `end-0` of the sidebar (the edge facing the map) and the
  resize math switches between `clientX - rect.left` (LTR) and
  `rect.right - clientX` (RTL) so dragging follows the cursor in both
  directions.

---

### Logical alignment for portal-positioned popovers

Radix's popper engine (used by `Popover`, `DropdownMenu`, `HoverCard`,
`Menubar`, `Tooltip`) treats the `align` prop as **physical** — `align="end"`
always means the popover's right edge aligns with the trigger's right edge,
regardless of `dir`. That ships an LTR-style transform-origin and placement
in RTL even with `<RadixDirectionProvider dir="rtl">` in the tree.

Our shadcn shells (`src/app/components/ui/popover.tsx`, `dropdown-menu.tsx`,
`hover-card.tsx`, `menubar.tsx`) flip the `align` prop through
`useLogicalAlign()` so call sites can think in **logical** terms:

| `align=` | LTR placement | RTL placement |
|----------|---------------|---------------|
| `start`  | popover `left` ↔ trigger `left`   | popover `right` ↔ trigger `right`  |
| `end`    | popover `right` ↔ trigger `right` | popover `left` ↔ trigger `left`    |
| `center` | centered                          | centered                           |

That means a panel whose trigger lives near the chrome edge (filter bar in
the Dashboard sidebar, settings popovers in side sheets) should pass
`align="start"` — the popover then anchors to the trigger's inline-start
edge in both directions and grows toward inline-end (away from the chrome
edge), keeping the transform origin near the trigger.

---

## Layer 6 — Guardrails

- `.cursor/rules/rtl-direction.mdc` — auto-applied rule that catches
  physical CSS utilities, hardcoded `dir="rtl"`, and bare `Intl.*`
  constructors during code review.
- This README — the convention reference.

---

## When a flip *would* be wrong

Some surfaces are **intentionally physical** and must NOT flip with
locale. When you keep a physical utility, leave a one-line comment
explaining why. Known exceptions:

- **Map / chart coordinate space** — `MapMarker.tsx`, `CesiumMap.tsx`.
  Markers anchored at world coordinates can't move when locale changes.
- **Symmetric centering** — `left-1/2 -translate-x-1/2` is mathematically
  symmetric and reads identically in both directions.
- **Vertical-slider trick** — `writingMode: 'vertical-lr'; direction: 'rtl'`
  on a vertical zoom slider. The `direction: 'rtl'` is a CSS quirk for
  min/max orientation; it has nothing to do with text direction.
- **Bracket decorations** — `-left-1 -right-1` pairs that bracket an
  element symmetrically on both sides.
- **Time-flow chrome** — playback scrub bars, video controls. Wrap in
  `<DirIsland direction="ltr">` rather than scattering `dir="ltr"`
  literals.

---

## Quick reference

```tsx
// Read direction state
import { useDirection, useIsRtl, useLocale } from '@/lib/direction';

const { direction, setDirection, toggleDirection } = useDirection();
const isRtl = useIsRtl();
const locale = useLocale(); // 'he' | 'en'

// Pin a subtree to a direction
import { DirIsland } from '@/lib/direction';

<DirIsland direction="ltr" className="absolute end-3 top-2">
  <DroneHud … />
</DirIsland>

// Bidi-isolate inline content
import { Bdi } from '@/lib/direction';

<p>קואורדינטות: <Bdi>32.0853° N, 34.7818° E</Bdi></p>

// Direction-aware chevron / arrow
import { ChevronStart, ChevronEnd } from '@/lib/direction';

<button aria-label="Previous"><ChevronStart size={12} /></button>

// Locale-aware formatting (React)
import { useNumberFormat, useDateTimeFormat } from '@/lib/intl';

const fmt = useNumberFormat({ maximumFractionDigits: 1 });
<span>{fmt.format(value)}</span>

// Locale-aware formatting (non-React)
import { formatTime } from '@/lib/intl';

const ts = formatTime(new Date(), locale);
```
