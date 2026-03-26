# C1 CUAS Design System

Single source of truth for all UI primitives, design tokens, composition patterns, and conventions.

Live styleguide: `/styleguide`

---

## Design Tokens

Import: `import { SURFACE, ELEVATION, CARD_TOKENS, surfaceAt, overlayAt, type ThreatAccent } from '@/primitives'`

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

### MissionPhaseChip

Import: `import { MissionPhaseChip } from '@/primitives'`
Styleguide: `/styleguide#mission-phase`

Animated phase indicator with pulse dot for active states.

| Prop | Type | Description |
|---|---|---|
| `phase` | `'planning' \| 'active' \| 'paused' \| 'override' \| 'completed'` | Current mission phase |

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

Import: `import { SplitActionButton } from '@/primitives/SplitActionButton'`
Styleguide: `/styleguide#split-action`

Two-segment button: primary action + dropdown menu. Used for effector controls.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Primary button text |
| `icon` | `React.ElementType` | — | Lucide icon |
| `variant` | `'fill' \| 'ghost' \| 'danger' \| 'warning'` | `'fill'` | Color treatment |
| `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Height scale |
| `dropdownItems` | `SplitDropdownItem[]` | — | Sub-action menu items |
| `disabled` | `boolean` | `false` | Disable both segments |
| `loading` | `boolean` | `false` | Show spinner on primary |
| `dimDisabledShell` | `boolean` | `true` | Reduce opacity when disabled |
| `onClick` | `(e: MouseEvent) => void` | — | Primary click handler |

`SplitDropdownItem`: `{ id, label, icon?, disabled?, onClick }`

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
| `status` | `ReactNode` | — | StatusChip or MissionPhaseChip |
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

`CardAction` fields: `{ id, label, icon?, variant?, size?, onClick, confirm?, disabled?, loading?, className?, group?, dropdownActions?, effectorStatusStrip?, dimSplitWhenDisabled? }`

Groups: `'effector'` (top row, split buttons) and `'investigation'` (bottom grid).

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
4. `CardDetails`
5. Laser position (`AccordionSection` with `TelemetryRow` grid)
6. `CardSensors` (wrapped in `AccordionSection` with count)
7. `CardLog`
8. `CardClosure`

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

Import: `import { DroneCardIcon, MissileCardIcon, JamWaveIcon } from '@/primitives/MapIcons'`

Adapted for card headers. All take a `size` prop and use `currentColor`.

---

## Shared Hooks

### useCardSlots

Import: `import { useCardSlots, type CardCallbacks, type CardContext } from '@/imports/useCardSlots'`

Takes a `Detection` object + callbacks + context, returns all card slot data (`accent`, `header`, `media`, `actions`, `details`, `sensors`, `log`, `closure`, `laserPosition`, `timeline`, `completed`, `closureType`).

### useTargetFilters

Import: `import { useTargetFilters } from '@/imports/useTargetFilters'`

Manages filter/sort state for target lists.

### useActivityStatus

Import: `import { getActivityStatus, useActivityStatus } from '@/imports/useActivityStatus'`

Derives `ActivityStatus` from a `Detection` for status chip display.

---

## shadcn/ui Base Components

Located in `src/app/components/ui/`. Available primitives:

accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

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
