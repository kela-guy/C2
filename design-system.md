# C2 Hub — CUAS Design System

Single source of truth for all UI primitives, design tokens, composition patterns, and conventions.

Live styleguide: [c2-hub-three.vercel.app/styleguide](https://c2-hub-three.vercel.app/styleguide)

---

## Component Registry

### Prerequisites

- **React** 18+
- **Vite** (or compatible bundler)
- **Tailwind CSS** v4

### Quick start

Add the `@c2` registry to the consuming project’s `components.json` (mirror [this repo](components.json)):

```bash
npx shadcn@latest init
npx shadcn@latest add @c2/base
npx shadcn@latest add @c2/domain-primitives
```

Already using shadcn:

```bash
npx shadcn@latest add @c2/base
npx shadcn@latest add @c2/domain-primitives
```

Install `@c2/base` before any C2 component or bundle. It bootstraps the C2 registry, dependencies, Tailwind v4 theme partial, generated CSS variables, and the core primitive set that downstream components expect.

C2 is dark by default. The base CSS includes a `.light` opt-in block for preview surfaces; wrap only intentional light-mode previews in `.light` instead of treating light mode as the app default.

Full URL fallback (debugging or older tooling):

```bash
npx shadcn@latest add https://c2-hub-three.vercel.app/r/base.json
npx shadcn@latest add https://c2-hub-three.vercel.app/r/domain-primitives.json
```

Check or refresh a single component:

```bash
npx shadcn@latest add https://c2-hub-three.vercel.app/r/button.json --diff
```

### Bundles

| Bundle | When to use |
|--------|-------------|
| **`core`** | **Brand-agnostic foundation.** `cn()`, design tokens, and the full generic shadcn UI set — no C2 tactical domain. Theme it by swapping token primitives. Start here for a new product. |
| **`domain-primitives`** | **Default for C2.** Tokens, card slots, tactical primitives, map markers/icons (no generic shadcn UI). |
| **`map-kit`** | Map-only: marker states, `MapMarker`, `MapIcons`. |
| **`all`** | Everything: the `core` bundle plus all C2 domain primitives. |
| **À la carte** | `npx shadcn@latest add @c2/<name>` — names match [`registry.json`](registry.json) `items[].name`. |

Items are tagged with `categories` — `core` (brand-agnostic: `cn()`, tokens, generic shadcn UI), `domain` (C2 tactical primitives), `map`, and `bundle`. The split is the contract that lets the core travel to other products while the C2 domain stays here.

`FilterBar` is **not** in bundles (hard `@/imports/` types). Install only when you adapt those types locally:

```bash
npx shadcn@latest add @c2/filter-bar
```

### After install

```tsx
import { StatusChip, ActionButton } from "@/primitives";

export function Smoke() {
  return (
    <div className="flex items-center gap-3 p-4">
      <StatusChip label="active" color="green" />
      <ActionButton label="Test" variant="fill" />
    </div>
  );
}
```

You should see a green chip and a filled button. If imports fail, align `components.json` aliases with [this project](components.json).

### Consumer essentials

- Map `components`, `ui`, `utils`, and `lib` aliases like the reference [`components.json`](components.json).
- **`FilterBar`:** depends on `@/imports/`; treat as a separate install + type shim, not part of default bundles.

### Local development

From this repo: `pnpm registry:build`, then `pnpm dev` — registry JSON is at `http://localhost:5173/r/<name>.json`. Point `@c2` at `http://localhost:5173/r/{name}.json` while testing consumers against a local build.

### Inventory

- **Items:** [`registry.json`](registry.json) (`items[].name`).
- **Advanced registry options** (auth, namespaces): [shadcn registry docs](https://ui.shadcn.com/docs/registry).

---

### Styleguide map

In-app docs at `/styleguide` are grouped by composition depth (sidebar matches scroll order):

1. **Foundations** — design tokens  
2. **Primitives** — `StatusChip`, `NewUpdatesPill`, `ActionButton`, `SplitActionButton`, `AccordionSection`, `TelemetryRow`  
3. **Card building blocks** — `CardHeader`, `CardMedia`, `CardActions`, `CardDetails`, `CardSensors`, `CardLog`, `CardClosure`, `CardTimeline`, `CardFooterDock`  
4. **Assemblies & list chrome** — `TargetCard` examples, `FilterBar`, **Device Card**, `DevicesPanel`  
5. **Tactical** — `MapMarker`, `markerStyles`, map icons

---

## Design Tokens

Import: `import { SURFACE, ELEVATION, CARD_TOKENS, LAYOUT_TOKENS, surfaceAt, overlayAt, type ThreatAccent } from '@/primitives'`

### Surface Levels

| Token | Hex | Usage |
|---|---|---|
| `SURFACE.level0` | `#141414` | Page background, card content area |
| `SURFACE.level1` | `#202020` | Card container, sidebar |
| `SURFACE.level2` | `#272727` | Borders, dividers |
| `SURFACE.level3` | `#2e2e2e` | Icon boxes, closure buttons |
| `SURFACE.level4` | `#353535` | Sensor rows, hover states |

### Elevation

| Token | Value |
|---|---|
| `ELEVATION.baseSurface` | `#141414` |
| `ELEVATION.shadow` | `0 2px 4px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)` |
| `ELEVATION.overlay.level0–4` | `0, 0.05, 0.08, 0.11, 0.14` (white mix ratios) |

### Threat Accent (spine colors)

Type: `ThreatAccent`

| Key | Hex | When |
|---|---|---|
| `idle` | `#52525b` | No activity |
| `suspicion` | `#f59e0b` | Suspected target |
| `detection` | `#fa5252` | Active detection |
| `tracking` | `#fd7e14` | Being tracked |
| `mitigating` | `#ef4444` | Jam in progress |
| `active` | `#74c0fc` | Mission active |
| `resolved` | `#12b886` | Neutralized/resolved |
| `expired` | `#3f3f46` | Timed out |

### Button Colors (oklch)

| Variant | Base | Hover | Active |
|---|---|---|---|
| `fill` | `white/10` | `white/14%` | `white/6%` |
| `ghost` | transparent | `white/5%` | — |
| `danger` | `oklch(0.435 0.151 25)` | `oklch(0.485 0.151 25)` | `oklch(0.385 0.151 25)` |
| `warning` | `oklch(0.501 0.166 75)` | `oklch(0.551 0.166 75)` | `oklch(0.451 0.166 75)` |

---

## Indicators

### StatusChip

Import: `import { StatusChip } from '@/primitives'`

Shows activity status of a target. Uses the `Badge` component internally. **Props and variants:** [Live docs — StatusChip](https://c2-hub-three.vercel.app/styleguide#status-chip)

Real labels used in app:

| Activity Status | Label | Color |
|---|---|---|
| `active` | פעיל | `green` |
| `recently_active` | פעיל לאחרונה | `orange` |
| `timeout` | פג תוקף | `gray` |
| `dismissed` | נדחה | `gray` |
| `mitigated` | טופל | `green` |

### NewUpdatesPill

Import: `import { NewUpdatesPill } from '@/primitives'`

Floating pill for new incoming detections. **Props:** [Live docs — NewUpdatesPill](https://c2-hub-three.vercel.app/styleguide#new-updates)

---

## Actions

### ActionButton

Import: `import { ActionButton } from '@/primitives'`

Primary action trigger. All sizes use `rounded` (4px) border-radius. **Props:** [Live docs — ActionButton](https://c2-hub-three.vercel.app/styleguide#action-button)

### SplitActionButton

Import: `import { SplitActionButton } from '@/primitives'`

Two-segment button: primary action + dropdown menu. Used for effector controls. Dropdown is RTL with `dir="rtl"`. **Props:** [Live docs — SplitActionButton](https://c2-hub-three.vercel.app/styleguide#split-action)

`SplitDropdownItem`: `{ id, label, icon?, disabled?, checked?, onClick }`

`SplitDropdownGroup`: `{ label?, items: SplitDropdownItem[] }`

**Effector selection pattern**: Dropdown groups separate effector choices (with `checked` state) from jam mode options. Selecting an effector updates the badge and checked state without triggering the action — only the primary button fires `onMitigate`.

---

## Card Slots

All card slot components are designed to compose inside a `TargetCard`. Import from `@/primitives`.

### CardHeader

Import: `import { CardHeader } from '@/primitives'`

Target identity row (title, icon, status). **Props:** [Live docs — CardHeader](https://c2-hub-three.vercel.app/styleguide#card-header)

### CardDetails

Import: `import { CardDetails } from '@/primitives'`

Collapsible telemetry accordion with copy-all button. Displays rows in a 3-column grid via TelemetryRow. **Props:** [Live docs — CardDetails](https://c2-hub-three.vercel.app/styleguide#card-details)

### CardSensors

Import: `import { CardSensors } from '@/primitives'`

Lists detecting sensors with type, distance, and timestamp. Typically wrapped in an `AccordionSection`. **Props:** [Live docs — CardSensors](https://c2-hub-three.vercel.app/styleguide#card-sensors)

### CardMedia

Import: `import { CardMedia } from '@/primitives'`

Image or video slot for surveillance feed. Supports live badge, playback controls, and lightbox. **Props:** [Live docs — CardMedia](https://c2-hub-three.vercel.app/styleguide#card-media)

### CardLog

Import: `import { CardLog } from '@/primitives'`

Chronological event log accordion. Newest-first with expand-all. **Props:** [Live docs — CardLog](https://c2-hub-three.vercel.app/styleguide#card-log)

### CardClosure

Import: `import { CardClosure } from '@/primitives'`

Outcome selection grid for closing a detection event. **Props:** [Live docs — CardClosure](https://c2-hub-three.vercel.app/styleguide#card-closure)

### CardActions

Import: `import { CardActions } from '@/primitives'`

Action bar with grouped effector/investigation layout, flat grid, and confirm dialogs. **Props:** [Live docs — CardActions](https://c2-hub-three.vercel.app/styleguide#card-actions)

`CardAction` fields: `{ id, label, badge?, icon?, variant?, size?, onClick, onHover?, confirm?, disabled?, loading?, className?, group?, dropdownActions?, dropdownGroups?, effectorStatusStrip?, dimSplitWhenDisabled? }`

Groups: `'effector'` (top row, split buttons) and `'investigation'` (bottom grid).

### CardTimeline

Import: `import { CardTimeline } from '@/primitives'`

Step-by-step timeline showing detection lifecycle progress. Rendered between CardActions and CardDetails. **Props:** [Live docs — CardTimeline](https://c2-hub-three.vercel.app/styleguide#card-timeline)

`TimelineStepStatus`: `'pending' | 'active' | 'complete' | 'error'`

### CardFooterDock

Import: `import { CardFooterDock } from '@/primitives'`

Bottom-anchored action bar for cards. Renders equal-width buttons in a tinted dock strip at the card bottom. **Props:** [Live docs — CardFooterDock](https://c2-hub-three.vercel.app/styleguide#card-footer-dock)

---

## Composed Components

### TargetCard

Import: `import { TargetCard } from '@/primitives'`

The core card shell. Always use `useCardSlots` hook to build slot data from a `Detection` object. **Props:** [Live docs — TargetCard](https://c2-hub-three.vercel.app/styleguide#target-card)

**Slot ordering** (matches `UnifiedCard` in `ListOfSystems.tsx`):
1. Closure type badge (manual/auto)
2. `CardMedia`
3. `CardActions`
4. `CardTimeline` (when `!thinMode` and steps exist)
5. `CardDetails` (when `showDetails`)
6. Laser position (`AccordionSection` with `TelemetryRow` grid)
7. `CardSensors` (wrapped in `AccordionSection` with count)
8. `CardLog` (when `!thinMode` and entries exist)
9. `CardClosure`

### FilterBar

Import: `import { FilterBar } from '@/primitives'`

Search, sort, and multi-select filter controls for the target list. Not included in `domain-primitives` / `map-kit` because it imports `@/imports/` types — install `@c2/filter-bar` only after providing compatible types. **Props:** [Live docs — FilterBar](https://c2-hub-three.vercel.app/styleguide#filter-bar)

### Device Card

Import: `import { DeviceRow, DeviceAction, DEVICE_REGISTRY, getDeviceHealth } from '@/shared/components/DevicesPanel'`

One collapsible row per field asset, **registry-driven** — nothing branches on `device.type`. `DEVICE_REGISTRY[type]` declares capabilities (drag, pin, camera preview), ordered stat fields, and the three action slots (`headerActions` · `footerActions` · `overflowActions`); `resolveDeviceAction(kind, ctx, placement)` maps those into the unified `DeviceAction` primitive — icon-only ghost in the header, solid pill in the footer. The collapsed header carries a worst-wins **health tile** (`getDeviceHealth` + `DEVICE_HEALTH_VISUAL`) with a titled tooltip, the name, and an always-visible **primary cluster** (Show-on-map + per-type On/Off, speaker now-playing readout, armed-notifications countdown). Secondary controls live in the **expanded footer**, with Logs + Notifications tucked into a 3-dot **overflow**. **Full breakdown:** [Live docs — Device Card](https://c2-hub-three.vercel.app/styleguide#device-card)

- **`DeviceAction`** — the one control primitive. Tones: `neutral` / `engaged` / `caution` / `danger`; `iconOnly`, `ghost`, `pressed`, `loading` (spinner, not dimmed), `disabled` + `disabledReason` tooltip. [#device-action](https://c2-hub-three.vercel.app/styleguide#device-action)
- **Health tile** — `w-8 h-8` icon tile; `getDeviceHealth` rolls malfunction + connection + battery into `critical | warning | offline | ok` (worst wins). Titled tooltip adds a severity dot/label + clamped `errorCount` badge. [#device-health](https://c2-hub-three.vercel.app/styleguide#device-health)
- **Detail grid** — `grid-cols-3 gap-x-4 gap-y-5 px-4 py-3`, rows built from `detailFields`. [#device-detail-grid](https://c2-hub-three.vercel.app/styleguide#device-detail-grid)
- **Header cluster** — `headerActions` resolved icon-only; Show-on-map pinned to the outer edge, per-type On/Off inboard (speaker Play/Pause, `FloodlightSegmentedCompact`). [#device-header-cluster](https://c2-hub-three.vercel.app/styleguide#device-header-cluster)
- **Action bar** — `footerActions` in order; `pushEnd` → inline-end, dividers between groups. [#device-row-actions](https://c2-hub-three.vercel.app/styleguide#device-row-actions)
- **Overflow + notify** — `DeviceOverflowMenu` (3-dot): timed **Notifications** (`NOTIFY_WINDOW_S` countdown, `onArmNotifications`) + the red **Logs** error channel (`device.errorCount`, `onOpenLogs`). [#device-overflow](https://c2-hub-three.vercel.app/styleguide#device-overflow)

Every part carries a `data-handoff-component` stamp, so the handoff picker (`⌘/Ctrl ⇧ P`) deep-links each sub-part to its exact styleguide section.

### DevicesPanel

Import: `import { DevicesPanel } from '@/shared/components/DevicesPanel'`

The right-hand sidebar that hosts Device Cards — search + `FilterBar` type isolation, offline-first grouping by type, empty state, and camera drag-to-feed. **Props:** [Live docs — DevicesPanel](https://c2-hub-three.vercel.app/styleguide#devices-panel)

### AccordionSection

Import: `import { AccordionSection } from '@/primitives'`

Collapsible section with animated expand/collapse. Used inside cards. **Props:** [Live docs — AccordionSection](https://c2-hub-three.vercel.app/styleguide#accordion)

---

## Data Display

### TelemetryRow

Import: `import { TelemetryRow } from '@/primitives'`

Single telemetry metric. Always laid out in a **3-column grid** — rows wrap based on item count. **Props:** [Live docs — TelemetryRow](https://c2-hub-three.vercel.app/styleguide#telemetry)

Usage pattern:
```tsx
<div className="grid grid-cols-3 gap-x-4 gap-y-2">
  <TelemetryRow label="גובה" value="120m" icon={Navigation} />
  <TelemetryRow label="מהירות" value="45 km/h" icon={Gauge} />
  <TelemetryRow label="כיוון" value="270°" icon={Compass} />
</div>
```

---

## Icons

### Map Icons (TacticalMap.tsx)

Import: `import { CameraIcon, SensorIcon, RadarIcon, DroneIcon, DroneHiveIcon, LidarIcon, LauncherIcon, MissileIcon } from '@/app/components/TacticalMap'`

Used on the map layer. Props vary by icon — most take `size` and `fill`. `DroneIcon` takes `rotationDeg`, `disabled`, `color`. `MissileIcon` takes `rotationDeg`. **Reference:** [Live docs — map icons](https://c2-hub-three.vercel.app/styleguide#map-icons)

### Card Icons (MapIcons.tsx)

Import: `import { DroneCardIcon, MissileCardIcon, JamWaveIcon } from '@/primitives'`

Adapted for card headers. All take a `size` prop and use `currentColor`.

### MapMarker

Import: `import { MapMarker } from '@/primitives'`

Composable map marker with layered rendering: surface, ring, glyph, inner glow, and overlays. Driven by `resolveMarkerStyle()` from `markerStyles`. **Props:** [Live docs — MapMarker](https://c2-hub-three.vercel.app/styleguide#map-markers)

### markerStyles

Import: `import { resolveMarkerStyle, AFFILIATIONS, INTERACTION_STATES, AFFILIATION_LABELS, AFFILIATION_PALETTES, type Affiliation, type InteractionState, type MarkerStyle } from '@/primitives'`

Resolves visual styles for map markers based on affiliation and interaction state.

- `resolveMarkerStyle(affiliation, state)` → `MarkerStyle` — returns surface fill/opacity, ring color/width, glow, badge, and pulse config
- `AFFILIATIONS` — `['friendly', 'hostile', 'possibleThreat', 'neutral', 'unknown']`
- `INTERACTION_STATES` — `['default', 'hovered', 'selected', 'active', 'disabled', 'expired', 'alert', 'jammer']`
- `AFFILIATION_PALETTES` — color definitions per affiliation

---

## Shared Hooks

### useCardSlots

Import: `import { useCardSlots, type CardCallbacks, type CardContext } from '@/imports/useCardSlots'`

Takes a `Detection` object + callbacks + context, returns all card slot data (`accent`, `header`, `media`, `actions`, `details`, `sensors`, `log`, `closure`, `laserPosition`, `timeline`, `completed`, `closureType`).

Key callbacks: `onMitigate(effectorId)` fires the jam action, `onEffectorSelect(effectorId)` switches the selected effector without triggering, `onSensorHover(id | null)` highlights assets on map.

`CardContext.selectedEffectorId` overrides the auto-selected nearest effector for a target's jam button.

### useTargetFilters

Import: `import { useTargetFilters } from '@/imports/useTargetFilters'`

Manages filter/sort state for target lists.

### useActivityStatus

Import: `import { getActivityStatus, useActivityStatus } from '@/imports/useActivityStatus'`

Derives `ActivityStatus` from a `Detection` for status chip display.

---

## shadcn/ui Base Components

Located in `src/app/components/ui/`. Available primitives:

accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

Utility: `import { cn } from '@/app/components/ui/utils'`

---

## Conventions

These conventions are also encoded as machine-enforceable data in [`governance/rules.json`](governance/rules.json) (id, severity, target, enforcement, replacement) and surfaced for agents in [`public/DESIGN_CONTEXT.md`](public/DESIGN_CONTEXT.md). `pnpm design:check` is the single gate.

- **Border radius**: `rounded` (4px) on all buttons, badges, and interactive elements (`--c2-radius-interactive`)
- **Colors**: Defined only in [`tokens/core.json`](tokens/core.json) (brand-agnostic) and [`tokens/c2-domain.json`](tokens/c2-domain.json) (tactical accents). Consume the generated CSS vars (`--c2-color-*`, `--c2-threat-*`) or `@/primitives` exports — never hardcode hex/rgb in app code. Danger/warning are authored in oklch. Run `pnpm tokens:build` after editing token JSON.
- **Direction**: RTL (`dir="rtl"`) on all user-facing containers; prefer logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`)
- **Icons**: Import from `@/lib/icons/central` only — never `lucide-react` or `@central-icons-react/*` directly (the wrapper is the sole module that knows the icon library). Prefer the filled variant when a twin exists. Custom SVG icons live in `MapIcons.tsx` and `TacticalMap.tsx`
- **Typography**: System font stack. Monospace for values/timestamps (`font-mono tabular-nums`)
- **Animation**: Framer Motion (`motion/react`) for layout transitions. `useReducedMotion` respected everywhere
- **Composition**: Use `useCardSlots` to build TargetCard content — never hardcode card slot data
