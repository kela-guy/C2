/**
 * Icon manifest. Single source of truth for the styleguide Icon Library.
 *
 * Three flavours of entries are catalogued:
 *
 *  1. lucide  - icons we re-export from `lucide-react`. Bulk-imported via the
 *               namespace import to keep this file readable; lucide ships
 *               `"sideEffects": false` so unused icons in *consumers* still
 *               tree-shake. The registry itself only loads when the
 *               styleguide route is opened (via the lazy `IconLibrary`).
 *  2. product - first-party glyphs we own (`ProductIcons`, `MapIcons`,
 *               tactical icons exported from `TacticalMap`).
 *  3. asset   - static SVG files served from `public/icons/`. These are
 *               not React components - the exporter `fetch`es them at
 *               action time.
 *
 * Each entry carries an `importPath` + `importName` so the styleguide
 * detail panel can render the exact `import { X } from '...';` snippet a
 * consumer needs to reproduce it.
 */

import type { ComponentType } from 'react';
import * as Lucide from 'lucide-react';

import {
  CuasIcon,
  C2Logo,
  SplitLeftIcon,
  JamIcon,
  BatteryIcon,
  DroneDeviceIcon,
} from '@/primitives/ProductIcons';
import {
  DroneCardIcon,
  JamWaveIcon,
  MissileCardIcon,
  CarIcon,
  CarCardIcon,
} from '@/primitives/MapIcons';
import {
  CameraIcon as TacticalCameraIcon,
  SensorIcon,
  RadarIcon,
  LidarIcon,
  LauncherIcon,
  DroneHiveIcon,
  DroneIcon,
  MissileIcon,
  RegulusIcon,
} from '@/app/components/TacticalMap';
import { DevicesIcon } from '@/app/components/DevicesPanel';
import { STYLEGUIDE_ICON_ASSETS, iconPublicUrl } from '@/lib/styleguideIconAssets';

export type IconSource = 'lucide' | 'product' | 'tactical' | 'map' | 'asset';

/**
 * Loose prop shape every icon component must accept. lucide ships this exact
 * surface; first-party glyphs accept a subset. The exporter only reads
 * `size`, `strokeWidth`, and `color` — extras are ignored at runtime.
 */
export interface RegistryIconProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  fill?: string;
}

export interface IconEntry {
  /** Stable identifier for keying / search. */
  id: string;
  /** Display name (matches the export name). */
  name: string;
  /** Source bucket for category filtering. */
  source: IconSource;
  /** Human-readable subcategory shown under the name. */
  category: string;
  /** Free-form tags fed into the search index (lower-cased internally). */
  keywords: string[];
  /** React component reference. Optional for `asset` entries. */
  Component?: ComponentType<RegistryIconProps>;
  /** Module the component is exported from — used in the import snippet. */
  importPath?: string;
  /** Exported name (might differ from `name` for default exports / aliases). */
  importName?: string;
  /** Public URL for `asset` entries. */
  assetUrl?: string;
  /**
   * Whether this icon has a closed silhouette that looks correct filled.
   * Lucide is a stroke-first set — only icons whose paths enclose a region
   * (Star, Bell, Heart, Shield, Camera, Play, Pause…) read well when
   * rendered with `fill="currentColor" strokeWidth={0}`. Pure-line icons
   * (arrows, X, Plus, Sliders…) become invisible with that recipe and
   * just look like a thicker outline if we keep the stroke. For those we
   * intentionally ignore the Fill toggle and keep the line render.
   *
   * First-party glyphs (product / tactical / map) are authored as filled
   * shapes, so they're marked fillable by default and accept the `fill`
   * prop natively.
   */
  fillable?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Lucide icons in active use across the codebase. Keep this list sorted
// alphabetically — when adding a new lucide consumer, add the icon here too
// so it shows up in the library.
// ────────────────────────────────────────────────────────────────────────────

interface LucideSpec {
  name: keyof typeof Lucide;
  category: string;
  keywords: string[];
  /**
   * True for icons whose paths enclose a region and read well when rendered
   * with lucide's official fill recipe (`fill="currentColor" strokeWidth={0}`).
   * False for pure-line icons (arrows, chevrons, X, Plus, sliders…) that
   * either become invisible with `strokeWidth={0}` or look like a bloated
   * outline if we leave the stroke on top of a fill — neither is a useful
   * "filled" version.
   */
  fillable: boolean;
}

const LUCIDE_ICONS: LucideSpec[] = [
  { name: 'Activity', category: 'Status', keywords: ['pulse', 'health', 'monitor'], fillable: false },
  { name: 'AlertTriangle', category: 'Status', keywords: ['warning', 'alert', 'danger'], fillable: true },
  { name: 'ArrowLeft', category: 'Navigation', keywords: ['back', 'previous', 'arrow'], fillable: false },
  { name: 'ArrowRight', category: 'Navigation', keywords: ['forward', 'next', 'arrow'], fillable: false },
  { name: 'ArrowUp', category: 'Navigation', keywords: ['top', 'up', 'arrow'], fillable: false },
  { name: 'ArrowUpDown', category: 'Navigation', keywords: ['sort', 'reorder', 'arrows'], fillable: false },
  { name: 'Ban', category: 'Status', keywords: ['block', 'forbidden', 'no'], fillable: false },
  { name: 'Bell', category: 'Notifications', keywords: ['alert', 'notification', 'ring'], fillable: true },
  { name: 'BellOff', category: 'Notifications', keywords: ['mute', 'silent', 'notification'], fillable: true },
  { name: 'Bird', category: 'Tactical', keywords: ['drone', 'flying', 'classify'], fillable: true },
  { name: 'BookOpen', category: 'Documentation', keywords: ['guide', 'manual', 'docs'], fillable: true },
  { name: 'Camera', category: 'Devices', keywords: ['photo', 'capture', 'sensor'], fillable: true },
  { name: 'Check', category: 'Status', keywords: ['done', 'ok', 'tick'], fillable: false },
  { name: 'CheckCircle2', category: 'Status', keywords: ['done', 'ok', 'success', 'mitigated'], fillable: true },
  { name: 'CheckIcon', category: 'Status', keywords: ['done', 'ok', 'tick', 'shadcn'], fillable: false },
  { name: 'ChevronDown', category: 'Navigation', keywords: ['expand', 'more', 'caret'], fillable: false },
  { name: 'ChevronDownIcon', category: 'Navigation', keywords: ['expand', 'caret', 'shadcn'], fillable: false },
  { name: 'ChevronLeft', category: 'Navigation', keywords: ['back', 'caret'], fillable: false },
  { name: 'ChevronLeftIcon', category: 'Navigation', keywords: ['back', 'caret', 'shadcn'], fillable: false },
  { name: 'ChevronRight', category: 'Navigation', keywords: ['forward', 'caret'], fillable: false },
  { name: 'ChevronRightIcon', category: 'Navigation', keywords: ['forward', 'caret', 'shadcn'], fillable: false },
  { name: 'ChevronUpIcon', category: 'Navigation', keywords: ['up', 'caret', 'shadcn'], fillable: false },
  { name: 'Circle', category: 'Shapes', keywords: ['dot', 'point', 'mark'], fillable: true },
  { name: 'CircleIcon', category: 'Shapes', keywords: ['dot', 'shadcn'], fillable: true },
  { name: 'Clock', category: 'Time', keywords: ['duration', 'timer', 'eta'], fillable: true },
  { name: 'Compass', category: 'Navigation', keywords: ['heading', 'bearing', 'azimuth'], fillable: true },
  { name: 'Copy', category: 'Actions', keywords: ['duplicate', 'clipboard'], fillable: true },
  { name: 'Crosshair', category: 'Tactical', keywords: ['target', 'aim', 'designate', 'lock'], fillable: false },
  { name: 'Download', category: 'Actions', keywords: ['save', 'export', 'arrow'], fillable: false },
  { name: 'ExternalLink', category: 'Actions', keywords: ['open', 'new tab', 'arrow'], fillable: false },
  { name: 'Eye', category: 'Visibility', keywords: ['watch', 'observe', 'show'], fillable: true },
  { name: 'EyeOff', category: 'Visibility', keywords: ['hide', 'stealth'], fillable: true },
  { name: 'Gauge', category: 'Telemetry', keywords: ['speed', 'meter', 'velocity'], fillable: false },
  { name: 'GripVerticalIcon', category: 'Layout', keywords: ['drag', 'handle', 'resize'], fillable: true },
  { name: 'Hand', category: 'Actions', keywords: ['manual', 'stop', 'wait'], fillable: true },
  { name: 'HelpCircle', category: 'Documentation', keywords: ['help', 'question', 'tour'], fillable: true },
  { name: 'History', category: 'Actions', keywords: ['log', 'timeline', 'past'], fillable: true },
  { name: 'Home', category: 'Navigation', keywords: ['rtb', 'return', 'base'], fillable: true },
  { name: 'Info', category: 'Status', keywords: ['details', 'about', 'tip'], fillable: true },
  { name: 'List', category: 'Layout', keywords: ['items', 'menu', 'rows'], fillable: false },
  { name: 'Loader2', category: 'Status', keywords: ['spinner', 'loading', 'progress'], fillable: false },
  { name: 'Lock', category: 'Status', keywords: ['secure', 'locked', 'read only'], fillable: true },
  { name: 'Map', category: 'Tactical', keywords: ['cartography', 'plan'], fillable: true },
  { name: 'MapPin', category: 'Tactical', keywords: ['location', 'pin', 'marker'], fillable: true },
  { name: 'Maximize2', category: 'Layout', keywords: ['fullscreen', 'expand'], fillable: false },
  { name: 'MessageSquare', category: 'Communication', keywords: ['chat', 'message', 'comment'], fillable: true },
  { name: 'MinusIcon', category: 'Actions', keywords: ['remove', 'subtract', 'shadcn'], fillable: false },
  { name: 'MoreHorizontal', category: 'Layout', keywords: ['ellipsis', 'menu', 'overflow'], fillable: true },
  { name: 'MoreHorizontalIcon', category: 'Layout', keywords: ['ellipsis', 'shadcn'], fillable: true },
  { name: 'Mountain', category: 'Telemetry', keywords: ['altitude', 'elevation', 'terrain'], fillable: true },
  { name: 'Navigation', category: 'Navigation', keywords: ['compass', 'route', 'arrow'], fillable: true },
  { name: 'Palette', category: 'Theme', keywords: ['color', 'theme', 'design'], fillable: true },
  { name: 'PanelLeftIcon', category: 'Layout', keywords: ['sidebar', 'panel', 'toggle'], fillable: true },
  { name: 'Pause', category: 'Playback', keywords: ['stop', 'hold'], fillable: true },
  { name: 'Plane', category: 'Tactical', keywords: ['aircraft', 'flight', 'drone'], fillable: true },
  { name: 'Play', category: 'Playback', keywords: ['start', 'resume'], fillable: true },
  { name: 'Plus', category: 'Actions', keywords: ['add', 'create', 'new'], fillable: false },
  { name: 'Radar', category: 'Devices', keywords: ['scan', 'detect', 'sweep'], fillable: false },
  { name: 'Radio', category: 'Communication', keywords: ['live', 'signal', 'broadcast'], fillable: false },
  { name: 'Route', category: 'Navigation', keywords: ['waypoint', 'path', 'flight'], fillable: false },
  { name: 'Ruler', category: 'Telemetry', keywords: ['distance', 'measure', 'range'], fillable: true },
  { name: 'Scan', category: 'Tactical', keywords: ['detect', 'survey'], fillable: false },
  { name: 'ScanLine', category: 'Tactical', keywords: ['classify', 'identify', 'scan'], fillable: false },
  { name: 'Search', category: 'Actions', keywords: ['find', 'filter', 'magnify'], fillable: false },
  { name: 'SearchIcon', category: 'Actions', keywords: ['find', 'shadcn'], fillable: false },
  { name: 'Send', category: 'Actions', keywords: ['dispatch', 'transmit', 'submit'], fillable: true },
  { name: 'Settings', category: 'Layout', keywords: ['gear', 'preferences', 'config'], fillable: true },
  { name: 'Shield', category: 'Tactical', keywords: ['defense', 'safe', 'protect'], fillable: true },
  { name: 'ShieldAlert', category: 'Tactical', keywords: ['threat', 'mitigate', 'warning'], fillable: true },
  { name: 'Ship', category: 'Tactical', keywords: ['vessel', 'maritime', 'boat'], fillable: true },
  { name: 'SkipBack', category: 'Playback', keywords: ['previous', 'rewind'], fillable: true },
  { name: 'SkipForward', category: 'Playback', keywords: ['next', 'forward'], fillable: true },
  { name: 'SlidersHorizontal', category: 'Actions', keywords: ['filters', 'tune', 'adjust'], fillable: false },
  { name: 'SplitSquareHorizontal', category: 'Layout', keywords: ['split', 'two pane'], fillable: true },
  { name: 'Tag', category: 'Layout', keywords: ['label', 'category'], fillable: true },
  { name: 'Target', category: 'Tactical', keywords: ['lock', 'designate', 'objective'], fillable: false },
  { name: 'Timer', category: 'Time', keywords: ['countdown', 'eta'], fillable: true },
  { name: 'TimerReset', category: 'Time', keywords: ['reset', 'clear', 'filters'], fillable: true },
  { name: 'Trash2', category: 'Actions', keywords: ['delete', 'remove', 'discard'], fillable: true },
  { name: 'Video', category: 'Devices', keywords: ['camera', 'feed', 'stream'], fillable: true },
  { name: 'Wrench', category: 'Status', keywords: ['malfunction', 'maintenance', 'fix'], fillable: true },
  { name: 'X', category: 'Actions', keywords: ['close', 'dismiss', 'cancel'], fillable: false },
  { name: 'XIcon', category: 'Actions', keywords: ['close', 'shadcn'], fillable: false },
  { name: 'Zap', category: 'Tactical', keywords: ['ecm', 'jam', 'electric'], fillable: true },
];

const lucideEntries: IconEntry[] = LUCIDE_ICONS.map((spec) => ({
  id: `lucide:${spec.name}`,
  name: spec.name,
  source: 'lucide',
  category: spec.category,
  keywords: spec.keywords,
  Component: Lucide[spec.name] as ComponentType<RegistryIconProps>,
  importPath: 'lucide-react',
  importName: spec.name,
  fillable: spec.fillable,
}));

// ────────────────────────────────────────────────────────────────────────────
// First-party React glyphs. `product` covers ProductIcons + DevicesIcon,
// `map` covers the card/list MapIcons set, `tactical` covers the icons
// shipped from TacticalMap.
// ────────────────────────────────────────────────────────────────────────────

const productEntries: IconEntry[] = [
  {
    id: 'product:CuasIcon',
    name: 'CuasIcon',
    source: 'product',
    category: 'Brand',
    keywords: ['logo', 'cuas', 'brand', 'mark'],
    Component: CuasIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/ProductIcons',
    importName: 'CuasIcon',
  },
  {
    id: 'product:C2Logo',
    name: 'C2Logo',
    source: 'product',
    category: 'Brand',
    keywords: ['logo', 'c2', 'wordmark', 'brand'],
    Component: C2Logo as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/ProductIcons',
    importName: 'C2Logo',
  },
  {
    id: 'product:SplitLeftIcon',
    name: 'SplitLeftIcon',
    source: 'product',
    category: 'Layout',
    keywords: ['split', 'panes', 'drop zone', 'layout'],
    Component: SplitLeftIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/ProductIcons',
    importName: 'SplitLeftIcon',
  },
  {
    id: 'product:JamIcon',
    name: 'JamIcon',
    source: 'product',
    category: 'Devices',
    keywords: ['ecm', 'jam', 'wave', 'rf'],
    Component: JamIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/ProductIcons',
    importName: 'JamIcon',
  },
  {
    id: 'product:BatteryIcon',
    name: 'BatteryIcon',
    source: 'product',
    category: 'Telemetry',
    keywords: ['battery', 'charge', 'power'],
    // BatteryIcon requires `pct` — wrap so the registry preview can render it.
    Component: ((props: RegistryIconProps) => BatteryIcon({ pct: 75, ...props })) as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/ProductIcons',
    importName: 'BatteryIcon',
  },
  {
    id: 'product:DroneDeviceIcon',
    name: 'DroneDeviceIcon',
    source: 'product',
    category: 'Devices',
    keywords: ['drone', 'device', 'list', 'arrow'],
    Component: DroneDeviceIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/ProductIcons',
    importName: 'DroneDeviceIcon',
  },
  {
    id: 'product:DevicesIcon',
    name: 'DevicesIcon',
    source: 'product',
    category: 'Layout',
    keywords: ['devices', 'panel', 'grid', 'logo'],
    Component: DevicesIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/DevicesPanel',
    importName: 'DevicesIcon',
  },
];

const mapEntries: IconEntry[] = [
  {
    id: 'map:DroneCardIcon',
    name: 'DroneCardIcon',
    source: 'map',
    category: 'Card',
    keywords: ['drone', 'card', 'list'],
    Component: DroneCardIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/MapIcons',
    importName: 'DroneCardIcon',
  },
  {
    id: 'map:MissileCardIcon',
    name: 'MissileCardIcon',
    source: 'map',
    category: 'Card',
    keywords: ['missile', 'card', 'list'],
    Component: MissileCardIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/MapIcons',
    importName: 'MissileCardIcon',
  },
  {
    id: 'map:CarCardIcon',
    name: 'CarCardIcon',
    source: 'map',
    category: 'Card',
    keywords: ['car', 'vehicle', 'card'],
    Component: CarCardIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/MapIcons',
    importName: 'CarCardIcon',
  },
  {
    id: 'map:JamWaveIcon',
    name: 'JamWaveIcon',
    source: 'map',
    category: 'Card',
    keywords: ['ecm', 'jam', 'wave', 'card'],
    Component: JamWaveIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/MapIcons',
    importName: 'JamWaveIcon',
  },
  {
    id: 'map:CarIcon',
    name: 'CarIcon',
    source: 'map',
    category: 'Map marker',
    keywords: ['car', 'vehicle', 'tactical'],
    Component: CarIcon as ComponentType<RegistryIconProps>,
    importPath: '@/primitives/MapIcons',
    importName: 'CarIcon',
  },
];

const tacticalEntries: IconEntry[] = [
  {
    id: 'tactical:CameraIcon',
    name: 'CameraIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['camera', 'sensor', 'tactical', 'eo', 'ir'],
    Component: TacticalCameraIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'CameraIcon',
  },
  {
    id: 'tactical:SensorIcon',
    name: 'SensorIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['sensor', 'magos', 'detect'],
    Component: SensorIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'SensorIcon',
  },
  {
    id: 'tactical:RadarIcon',
    name: 'RadarIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['radar', 'sweep', 'detect'],
    Component: RadarIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'RadarIcon',
  },
  {
    id: 'tactical:LidarIcon',
    name: 'LidarIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['lidar', 'laser', 'sensor'],
    Component: LidarIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'LidarIcon',
  },
  {
    id: 'tactical:LauncherIcon',
    name: 'LauncherIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['launcher', 'effector', 'kinetic'],
    Component: LauncherIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'LauncherIcon',
  },
  {
    id: 'tactical:DroneHiveIcon',
    name: 'DroneHiveIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['drone', 'hive', 'dock', 'launch'],
    Component: DroneHiveIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'DroneHiveIcon',
  },
  {
    id: 'tactical:DroneIcon',
    name: 'DroneIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['drone', 'aircraft', 'rotated', 'tactical'],
    Component: DroneIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'DroneIcon',
  },
  {
    id: 'tactical:MissileIcon',
    name: 'MissileIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['missile', 'kinetic', 'tactical'],
    Component: MissileIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'MissileIcon',
  },
  {
    id: 'tactical:RegulusIcon',
    name: 'RegulusIcon',
    source: 'tactical',
    category: 'Map marker',
    keywords: ['regulus', 'effector', 'ecm'],
    Component: RegulusIcon as ComponentType<RegistryIconProps>,
    importPath: '@/app/components/TacticalMap',
    importName: 'RegulusIcon',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Static asset entries (public/icons/*.svg). Mirrors STYLEGUIDE_ICON_ASSETS
// so we don't drift from the real on-disk catalogue.
// ────────────────────────────────────────────────────────────────────────────

const assetEntries: IconEntry[] = STYLEGUIDE_ICON_ASSETS.map((asset) => ({
  id: `asset:${asset.subdir}/${asset.fileName}`,
  name: asset.exportName,
  source: 'asset',
  category: asset.subdir === 'tactical' ? 'Tactical asset' : 'Card asset',
  keywords: ['svg', 'asset', asset.subdir, asset.exportName.toLowerCase()],
  assetUrl: iconPublicUrl(asset.subdir, asset.fileName),
}));

export const ICON_REGISTRY: IconEntry[] = [
  ...lucideEntries,
  ...productEntries,
  ...mapEntries,
  ...tacticalEntries,
  ...assetEntries,
];

/** Counts per source — handy for the category chips' badge labels. */
export function getRegistryCounts(): Record<IconSource | 'all', number> {
  const counts: Record<IconSource | 'all', number> = {
    all: ICON_REGISTRY.length,
    lucide: 0,
    product: 0,
    tactical: 0,
    map: 0,
    asset: 0,
  };
  for (const entry of ICON_REGISTRY) counts[entry.source] += 1;
  return counts;
}

/** Lower-cased haystack precomputed once for faster substring search. */
export interface SearchableEntry {
  entry: IconEntry;
  haystack: string;
}

export const SEARCHABLE_REGISTRY: SearchableEntry[] = ICON_REGISTRY.map((entry) => ({
  entry,
  haystack: [entry.name, entry.source, entry.category, ...entry.keywords]
    .join(' ')
    .toLowerCase(),
}));
