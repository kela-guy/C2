# C2 Hub — CUAS Design System

Single source of truth for all UI primitives, design tokens, composition patterns, and conventions.

Live styleguide: [c2-hub-three.vercel.app/styleguide](https://c2-hub-three.vercel.app/styleguide)

---

## Component Registry (CLI)

All generic UI components are available via a **shadcn-compatible registry**. Install individual components into any Vite + React project:

```bash
# One-time setup in your project
npx shadcn@latest init

# Install everything
npx shadcn@latest add https://c2-hub-three.vercel.app/r/all.json

# Or install individual components
npx shadcn@latest add https://c2-hub-three.vercel.app/r/button.json

# Check for updates
npx shadcn@latest add https://c2-hub-three.vercel.app/r/button.json --diff
```

During local development, the registry is served at `http://localhost:5173/r/`.

### Available components

| Component | Install |
|-----------|---------|
| Accordion | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/accordion.json` |
| Alert | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/alert.json` |
| AlertDialog | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/alert-dialog.json` |
| AspectRatio | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/aspect-ratio.json` |
| Avatar | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/avatar.json` |
| Badge | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/badge.json` |
| Breadcrumb | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/breadcrumb.json` |
| Button | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/button.json` |
| Calendar | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/calendar.json` |
| Card | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card.json` |
| Carousel | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/carousel.json` |
| Chart | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/chart.json` |
| Checkbox | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/checkbox.json` |
| Collapsible | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/collapsible.json` |
| Command | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/command.json` |
| ContextMenu | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/context-menu.json` |
| Dialog | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/dialog.json` |
| Drawer | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/drawer.json` |
| DropdownMenu | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/dropdown-menu.json` |
| Form | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/form.json` |
| HoverCard | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/hover-card.json` |
| Input | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/input.json` |
| InputOTP | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/input-otp.json` |
| Label | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/label.json` |
| Menubar | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/menubar.json` |
| Pagination | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/pagination.json` |
| Popover | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/popover.json` |
| Progress | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/progress.json` |
| RadioGroup | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/radio-group.json` |
| Resizable | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/resizable.json` |
| ScrollArea | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/scroll-area.json` |
| Select | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/select.json` |
| Separator | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/separator.json` |
| Sheet | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/sheet.json` |
| Sidebar | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/sidebar.json` |
| Skeleton | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/skeleton.json` |
| Slider | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/slider.json` |
| Sonner | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/sonner.json` |
| Switch | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/switch.json` |
| Table | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/table.json` |
| Tabs | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/tabs.json` |
| Textarea | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/textarea.json` |
| Toggle | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/toggle.json` |
| ToggleGroup | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/toggle-group.json` |
| Tooltip | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/tooltip.json` |

Dependencies (e.g. `utils`, other ui components) are resolved and installed automatically.

### Domain primitives

| Component | Install |
|-----------|---------|
| Tokens | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/tokens.json` |
| MapMarkerStates | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/map-marker-states.json` |
| StatusChip | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/status-chip.json` |
| ActionButton | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/action-button.json` |
| SplitActionButton | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/split-action-button.json` |
| AccordionSection | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/accordion-section.json` |
| TelemetryRow | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/telemetry-row.json` |
| NewUpdatesPill | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/new-updates-pill.json` |
| FilterBar | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/filter-bar.json` |
| CardHeader | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-header.json` |
| CardActions | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-actions.json` |
| CardDetails | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-details.json` |
| CardSensors | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-sensors.json` |
| CardMedia | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-media.json` |
| CardLog | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-log.json` |
| CardClosure | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-closure.json` |
| CardTimeline | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-timeline.json` |
| CardFooterDock | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/card-footer-dock.json` |
| TargetCard | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/target-card.json` |
| MapMarker | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/map-marker.json` |
| MapIcons | `npx shadcn@latest add https://c2-hub-three.vercel.app/r/map-icons.json` |

> **Note:** `FilterBar` imports domain-specific types (`ActivityStatus`, `FilterState`) from `@/imports/`. Consumers will need to provide these types or adapt the imports after installation.

---

### Styleguide map

In-app docs at `/styleguide` are grouped by composition depth (sidebar matches scroll order):

1. **Foundations** — design tokens  
2. **Primitives** — `StatusChip`, `NewUpdatesPill`, `ActionButton`, `SplitActionButton`, `AccordionSection`, `TelemetryRow`  
3. **Card building blocks** — `CardHeader`, `CardMedia`, `CardActions`, `CardDetails`, `CardSensors`, `CardLog`, `CardClosure`, `CardTimeline`, `CardFooterDock`  
4. **Assemblies & list chrome** — `TargetCard` examples, `FilterBar`  
5. **Tactical** — `MapMarker`, `mapMarkerStates`, map icons

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
Styleguide: `/styleguide#status-chip`

Shows activity status of a target. Uses the `Badge` component internally.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Display text |
| `color` | `'green' \| 'gray' \| 'red' \| 'orange'` | `'green'` | Semantic color |
| `className` | `string` | — | Additional classes |

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
Styleguide: `/styleguide#new-updates`

Floating pill for new incoming detections.

| Prop | Type | Description |
|---|---|---|
| `count` | `number` | Number of new updates |
| `onClick` | `() => void` | Scroll-to-top handler |

---

## Actions

### ActionButton

Import: `import { ActionButton } from '@/primitives'`
Styleguide: `/styleguide#action-button`

Primary action trigger. All sizes use `rounded` (4px) border-radius.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Button text |
| `icon` | `React.ElementType` | — | Lucide icon component |
| `variant` | `'fill' \| 'ghost' \| 'danger' \| 'warning'` | `'fill'` | Visual treatment |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Height scale (30px / 32px / 36px) |
| `disabled` | `boolean` | `false` | Disable interaction |
| `loading` | `boolean` | `false` | Show spinner |
| `onClick` | `(e: MouseEvent) => void` | — | Click handler |
| `title` | `string` | — | Enables tooltip on hover |
| `dataTour` | `string` | — | Tour step attribute |

### SplitActionButton

Import: `import { SplitActionButton } from '@/primitives'`
Styleguide: `/styleguide#split-action`

Two-segment button: primary action + dropdown menu. Used for effector controls. Dropdown is RTL with `dir="rtl"`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Primary button text |
| `badge` | `string` | — | Inline chip after the label (e.g. effector name) |
| `subtitle` | `string` | — | Second line below the label (stacked layout) |
| `icon` | `React.ElementType` | — | Lucide icon |
| `variant` | `'fill' \| 'ghost' \| 'danger' \| 'warning'` | `'fill'` | Color treatment |
| `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Height scale |
| `dropdownItems` | `SplitDropdownItem[]` | — | Sub-action menu items |
| `dropdownGroups` | `SplitDropdownGroup[]` | — | Grouped dropdown sections with labels and separators |
| `disabled` | `boolean` | `false` | Disable both segments |
| `loading` | `boolean` | `false` | Show spinner on primary |
| `dimDisabledShell` | `boolean` | `true` | Reduce opacity when disabled |
| `onClick` | `(e: MouseEvent) => void` | — | Primary click handler |
| `onHover` | `(hovering: boolean) => void` | — | Fires on mouseEnter/Leave — highlights effector on map |

`SplitDropdownItem`: `{ id, label, icon?, disabled?, checked?, onClick }`

`SplitDropdownGroup`: `{ label?, items: SplitDropdownItem[] }`

**Effector selection pattern**: Dropdown groups separate effector choices (with `checked` state) from jam mode options. Selecting an effector updates the badge and checked state without triggering the action — only the primary button fires `onMitigate`.

---

## Card Slots

All card slot components are designed to compose inside a `TargetCard`. Import from `@/primitives`.

### CardHeader

Styleguide: `/styleguide#card-header`

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Target display name |
| `subtitle` | `string` | — | Target ID or timestamp |
| `icon` | `React.ElementType` | — | Threat type icon |
| `iconColor` | `string` | — | Icon color override |
| `iconBgActive` | `boolean` | `false` | Use active (red) background |
| `status` | `ReactNode` | — | StatusChip or similar |
| `badge` | `ReactNode` | — | Confidence badge or similar |
| `quickAction` | `ReactNode` | — | Action visible when card is collapsed |
| `open` | `boolean` | — | Controls chevron rotation |

### CardDetails

Styleguide: `/styleguide#card-details`

Collapsible telemetry accordion with copy-all button. Displays rows in a 3-column grid via TelemetryRow.

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `DetailRow[]` | — | `{ label, value, icon? }` |
| `classification` | `CardDetailsClassification` | — | `{ type, typeLabel, confidence?, colorClass? }` |
| `defaultOpen` | `boolean` | `false` | Start expanded |

### CardSensors

Styleguide: `/styleguide#card-sensors`

Lists detecting sensors with type, distance, and timestamp. Typically wrapped in an `AccordionSection`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `sensors` | `CardSensor[]` | — | `{ id, typeLabel, icon?, distanceLabel?, detectedAt? }` |
| `label` | `string` | `'חיישנים'` | Section label |
| `onSensorHover` | `(id \| null) => void` | — | Hover callback for map highlighting |
| `onSensorClick` | `(id) => void` | — | Makes rows clickable buttons |

### CardMedia

Styleguide: `/styleguide#card-media`

Image or video slot for surveillance feed. Supports live badge, playback controls, and lightbox.

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | — | Image or video URL |
| `type` | `'video' \| 'image'` | `'image'` | Media type |
| `badge` | `'threat' \| 'warning' \| 'bird' \| null` | — | Overlay badge |
| `showControls` | `boolean` | `false` | Show video playback controls |
| `trackingLabel` | `string` | — | Bottom-left tracking status label |
| `alt` | `string` | `'תצפית מטרה'` | Image alt text |

### CardLog

Styleguide: `/styleguide#card-log`

Chronological event log accordion. Newest-first with expand-all.

| Prop | Type | Default | Description |
|---|---|---|---|
| `entries` | `LogEntry[]` | — | `{ time, label }` |
| `maxVisible` | `number` | `5` | Entries before "show more" |
| `defaultOpen` | `boolean` | `false` | Start expanded |

### CardClosure

Styleguide: `/styleguide#card-closure`

Outcome selection grid for closing a detection event.

| Prop | Type | Default | Description |
|---|---|---|---|
| `outcomes` | `ClosureOutcome[]` | — | `{ id, label, icon? }` |
| `onSelect` | `(outcomeId) => void` | — | Selection handler |
| `title` | `string` | `'סגירת אירוע — בחר סיבה'` | Section heading |

### CardActions

Styleguide: `/styleguide#card-actions`

Action bar with grouped effector/investigation layout, flat grid, and confirm dialogs.

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `CardAction[]` | — | Action definitions |
| `layout` | `'row' \| 'grid' \| 'stack'` | `'row'` | Fallback layout (no groups) |

`CardAction` fields: `{ id, label, badge?, icon?, variant?, size?, onClick, onHover?, confirm?, disabled?, loading?, className?, group?, dropdownActions?, dropdownGroups?, effectorStatusStrip?, dimSplitWhenDisabled? }`

Groups: `'effector'` (top row, split buttons) and `'investigation'` (bottom grid).

### CardTimeline

Import: `import { CardTimeline } from '@/primitives'`
Styleguide: `/styleguide#card-timeline`

Step-by-step timeline showing detection lifecycle progress. Rendered between CardActions and CardDetails.

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` | `TimelineStep[]` | — | Array of { label, status } |
| `compact` | `boolean` | `false` | Horizontal dot mode instead of vertical list |
| `className` | `string` | — | Additional classes |

`TimelineStepStatus`: `'pending' | 'active' | 'complete' | 'error'`

### CardFooterDock

Import: `import { CardFooterDock } from '@/primitives'`
Styleguide: `/styleguide#card-footer-dock`

Bottom-anchored action bar for cards. Renders equal-width buttons in a tinted dock strip at the card bottom.

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `FooterDockAction[]` | — | Array of { id, label, icon?, onClick?, disabled?, loading? } |
| `className` | `string` | — | Additional classes |

---

## Composed Components

### TargetCard

Import: `import { TargetCard } from '@/primitives'`
Styleguide: `/styleguide#target-card`

The core card shell. Always use `useCardSlots` hook to build slot data from a `Detection` object.

| Prop | Type | Default | Description |
|---|---|---|---|
| `header` | `ReactNode` | — | CardHeader element |
| `children` | `ReactNode` | — | Slot components |
| `open` | `boolean` | — | Expanded state |
| `onToggle` | `() => void` | — | Toggle handler |
| `accent` | `ThreatAccent` | `'idle'` | Spine color key |
| `completed` | `boolean` | — | Desaturate card |
| `onFocus` | `() => void` | — | Focus callback |

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
Styleguide: `/styleguide#filter-bar`

Search, sort, and multi-select filter controls for the target list.

| Prop | Type | Description |
|---|---|---|
| `filters` | `FilterState` | Current filter values |
| `activeFilterCount` | `number` | Controls reset button |
| `availableSensors` | `{ id, label }[]` | Sensor options |
| `onUpdate` | `(key, value) => void` | Generic field update |
| `onToggleActivity` | `(status) => void` | Toggle activity filter |
| `onToggleSensor` | `(id) => void` | Toggle sensor filter |
| `onReset` | `() => void` | Clear all filters |

### AccordionSection

Import: `import { AccordionSection } from '@/primitives'`
Styleguide: `/styleguide#accordion`

Collapsible section with animated expand/collapse. Used inside cards.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `ReactNode` | — | Section heading |
| `icon` | `React.ElementType \| null` | — | Leading icon |
| `defaultOpen` | `boolean` | `false` | Start expanded |
| `headerAction` | `ReactNode` | — | Right-side slot (badge, button) |

---

## Data Display

### TelemetryRow

Import: `import { TelemetryRow } from '@/primitives'`
Styleguide: `/styleguide#telemetry`

Single telemetry metric. Always laid out in a **3-column grid** — rows wrap based on item count.

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | Metric name |
| `value` | `string` | Metric value (monospace, tabular-nums) |
| `icon` | `React.ElementType` | Leading icon |

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
Styleguide: `/styleguide#map-icons`

Used on the map layer. Props vary by icon — most take `size` and `fill`. `DroneIcon` takes `rotationDeg`, `disabled`, `color`. `MissileIcon` takes `rotationDeg`.

### Card Icons (MapIcons.tsx)

Import: `import { DroneCardIcon, MissileCardIcon, JamWaveIcon } from '@/primitives'`

Adapted for card headers. All take a `size` prop and use `currentColor`.

### MapMarker

Import: `import { MapMarker } from '@/primitives'`
Styleguide: `/styleguide#map-markers`

Composable map marker with layered rendering: surface, ring, glyph, inner glow, and overlays. Driven by `resolveMarkerStyle()` from `mapMarkerStates`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `ReactNode` | — | Glyph content (SVG icon) |
| `style` | `MarkerStyle` | — | Visual style from `resolveMarkerStyle()` |
| `surfaceSize` | `number` | `42` | Surface circle diameter |
| `ringSize` | `number` | — | Ring circle diameter |
| `heading` | `number` | — | Rotation in degrees |
| `showBadge` | `boolean` | `false` | Show top-right badge dot |
| `pulse` | `boolean` | `false` | Pulsing animation |
| `label` | `string` | — | Text label below marker |
| `showLabel` | `boolean` | — | Toggle label visibility |
| `highlightLayer` | `number \| null` | — | Dims all layers except the specified one (1–5) |
| `statusBadgeText` | `string` | — | Status badge overlay text |
| `statusBadgeTone` | `'neutral' \| 'danger'` | `'neutral'` | Status badge color |

### mapMarkerStates

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

- **Border radius**: `rounded` (4px) on all buttons, badges, and interactive elements
- **Colors**: Use oklch format for danger/warning. Use design tokens for surfaces. Never hardcode hex outside `tokens.ts`
- **Direction**: RTL (`dir="rtl"`) on all user-facing containers
- **Icons**: Lucide React only. Custom SVG icons live in `MapIcons.tsx` and `TacticalMap.tsx`
- **Typography**: System font stack. Monospace for values/timestamps (`font-mono tabular-nums`)
- **Animation**: Framer Motion (`motion/react`) for layout transitions. `useReducedMotion` respected everywhere
- **Composition**: Use `useCardSlots` to build TargetCard content — never hardcode card slot data
