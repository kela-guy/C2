/**
 * Central Icons wrapper.
 *
 * The codebase historically imported every icon from `lucide-react`. We have
 * since adopted Central Icons (https://iconists.co/central) as the project's
 * canonical icon family. This module re-exports the icons we use under the
 * lucide-compatible names that consumers expect, so the migration was a
 * find-and-replace from `lucide-react` -> `@/lib/icons/central`.
 *
 * Variant choice (locked):
 *   - Outlined (line):  @central-icons-react/round-outlined-radius-1-stroke-1.5
 *   - Filled (paired):  @central-icons-react/round-filled-radius-1-stroke-1.5
 *
 * Three buckets live in this file:
 *
 *   1. Direct Central mappings - the bulk. Each Central icon is imported
 *      from its own subpath (`/IconName/`) so Vite/Rollup can tree-shake at
 *      the icon level (the variant package ships ~2k icons).
 *
 *   2. Paired filled twins - icons that have an off/on visual where "on"
 *      should be the filled variant (currently just `Pin`/`PinFilled` for
 *      the DevicesPanel pinned-to-feed toggle).
 *
 *   3. lucide pass-throughs - a small set of icons where Central has no
 *      clean equivalent (Crosshair, Wrench, Copy, Download, etc.) or where
 *      the lucide rendering is meaningfully better (Loader2's spinner). Each
 *      of these is annotated with the reason. The hybrid is intentional;
 *      replacing them with weak Central matches would regress the UI.
 *
 * Note for shadcn/ui primitives: the files under `src/app/components/ui/*`
 * keep their original `lucide-react` imports unchanged. Forking each shadcn
 * primitive just to swap a chevron is a high-risk change for very little
 * gain, and the visual surface (popover/dropdown chevrons, dialog X) is so
 * small that the mismatch is invisible in practice.
 *
 * Type re-cast: Central's .d.ts files declare each icon as
 * `React.FC<CentralIconBaseProps>`, where `React.FC` is resolved through
 * the package's own peer-dep chain to `@types/react@19`. Our project runs
 * React 18.3 with `@types/react@19` only available via deeper pnpm
 * resolution, so the resulting `FC` type doesn't unify with the
 * `ElementType` slots Radix/shadcn primitives expect. We re-cast every
 * Central re-export to a project-local `IconComponent` so consumers get a
 * single, JSX-friendly type instead of pulling Central's React 19 chain
 * through their site of use.
 */

import { createElement, type ComponentType, type SVGAttributes } from 'react';

import IconCamera1Raw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCamera1';
import IconBellRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBell';
import IconBellOffRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBellOff';
import IconPinRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPin';
import IconBatteryFullRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBatteryFull';
import IconBatteryLowRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBatteryLow';
import IconRadarRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRadar';
import IconRadioRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRadio';
import IconSignalTowerRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSignalTower';
import IconMapRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMap';
import IconMapPinRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMapPin';
import IconCompassRoundRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCompassRound';
import IconHomeRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconHome';
import IconBulletListRaw from '@central-icons-react/square-filled-radius-0-stroke-2/IconBulletList';
import IconLayoutGrid2Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconLayoutGrid2';
import IconVideo2Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconVideo2';
import IconChevronBottomRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronBottom';
import IconChevronTopRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronTop';
import IconChevronLeftRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronLeft';
import IconChevronRightRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronRight';
import IconChevronDoubleLeftRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronDoubleLeft';
import IconChevronDoubleRightRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronDoubleRight';
import IconArrowUpRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowUp';
import IconArrowBottomTopRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowBottomTop';
import IconCircleXRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleX';
import IconPlusMediumRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlusMedium';
import IconCheckmark1MediumRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCheckmark1Medium';
import IconCheckCircle2Raw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCheckCircle2';
import IconMagnifyingGlassRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMagnifyingGlass';
import IconLockRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLock';
import IconUnlockedRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconUnlocked';
import IconHand5FingerRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconHand5Finger';
import IconBlockRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBlock';
import IconTrashCanSimpleRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconTrashCanSimple';
import IconSendRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSend';
import IconPhoneRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPhone';
import IconBookSimpleRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBookSimple';
import IconTagRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconTag';
import IconArrowRotateCCRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowRotateCounterClockwise';
import IconEyeOpenRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconEyeOpen';
import IconEyeClosedRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconEyeClosed';
import IconPlayRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlay';
import IconPauseRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPause';
import IconFullscreen1Raw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFullscreen1';
import IconFullscreen2Raw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFullscreen2';
import IconSplitRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSplit';
import IconSunRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSun';
import IconMoonRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMoon';
import IconSettingsGear1Raw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSettingsGear1';
// Off-canon variant pulled from the square-filled-radius-0-stroke-2 family.
// Used by GridblockHeader's settings affordance specifically — that header
// asked for a more geometric, heavier-weight chrome icon to anchor the
// inline-end cluster while the rest of the dashboard stays on the
// canonical round-outlined variant. Bucket 1 (direct Central mapping) per
// the file header convention.
import IconSettingsGear4Raw from '@central-icons-react/square-filled-radius-0-stroke-2/IconSettingsGear4';
import IconColorPaletteRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconColorPalette';
import IconSettingsSliderHorRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSettingsSliderHor';
import IconSparkles3BoldRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSparkles3Bold';
import IconListBulletsRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconListBullets';
import IconHistoryRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconHistory';
import IconStopwatchRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconStopwatch';
import IconGaugeRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconGauge';
import IconClockRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconClock';
import IconAirplaneRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconAirplane';
import IconShipRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconShip';
import IconRulerRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRuler';
import IconWarningSignRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconWarningSign';
import IconShieldRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconShield';
import IconInfoSimpleRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconInfoSimple';
import IconLightningBoltRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLightningBolt';
import IconSquareArrowOutTopLeftRaw from '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquareArrowOutTopLeft';
import IconPinFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconPin';

/**
 * Loose icon component shape that consumers can pass as `ElementType` to
 * Radix/shadcn primitives without dragging Central's React 19 type chain
 * along. Mirrors the props we actually pass at call sites.
 */
export type IconProps = SVGAttributes<SVGSVGElement> & {
  size?: number | string;
  ariaHidden?: boolean;
};
export type IconComponent = ComponentType<IconProps>;

const asIcon = (raw: unknown): IconComponent => raw as IconComponent;

const KELA_LOGO_PATH =
  'M3.33333 6.66539L8.3275 11.6586L8.38062 11.7104C9.30423 12.5845 10.7618 12.5691 11.6667 11.6644L11.6782 11.6526L16.6667 6.66539L20 9.99808L10 19.9962L4.33981e-07 9.99808L3.33333 6.66539ZM12.3335 9.66466C12.2641 9.17696 12.0419 8.70685 11.6667 8.33174C10.7462 7.41144 9.25381 7.41144 8.33333 8.33174C7.95815 8.70685 7.73589 9.17696 7.66651 9.66466L4 5.99885L10 0L16 5.99885L12.3335 9.66466Z';

const IconKelaLogo = ({ size = 20, ...props }: SVGAttributes<SVGSVGElement> & { size?: number | string }) =>
  createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'none', width: size, height: size, ...props },
    createElement('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: KELA_LOGO_PATH, fill: 'currentColor' }),
  );

const X_PATH =
  'M4.04289 4.04289C4.43342 3.65237 5.06658 3.65237 5.45711 4.04289L12 10.5858L18.5429 4.04289C18.9334 3.65237 19.5666 3.65237 19.9571 4.04289C20.3476 4.43342 20.3476 5.06658 19.9571 5.45711L13.4142 12L19.9571 18.5429C20.3476 18.9334 20.3476 19.5666 19.9571 19.9571C19.5666 20.3476 18.9334 20.3476 18.5429 19.9571L12 13.4142L5.45711 19.9571C5.06658 20.3476 4.43342 20.3476 4.04289 19.9571C3.65237 19.5666 3.65237 18.9334 4.04289 18.5429L10.5858 12L4.04289 5.45711C3.65237 5.06658 3.65237 4.43342 4.04289 4.04289Z';

const IconXCustom = ({ size = 24, ...props }: SVGAttributes<SVGSVGElement> & { size?: number | string }) =>
  createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', width: size, height: size, ...props },
    createElement('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: X_PATH, fill: 'currentColor' }),
  );

// =====================================================================
// 1. Direct Central mappings (outlined / line variant)
// =====================================================================

// --- Devices & status ---
export const LayoutGrid2 = asIcon(IconLayoutGrid2Raw);
export const Camera = asIcon(IconCamera1Raw);
export const Bell = asIcon(IconBellRaw);
export const BellOff = asIcon(IconBellOffRaw);
export const Pin = asIcon(IconPinRaw);
export const Battery = asIcon(IconBatteryFullRaw);
export const BatteryLow = asIcon(IconBatteryLowRaw);
export const Radar = asIcon(IconRadarRaw);
export const Radio = asIcon(IconRadioRaw);
export const Video = asIcon(IconVideo2Raw);
export const SignalHigh = asIcon(IconSignalTowerRaw);
// Central has no SignalLow variant; we re-use the same tower icon. The
// drone HUD already differentiates by colour + numeric bars, so the icon
// shape stays constant.
export const SignalLow = asIcon(IconSignalTowerRaw);

// --- Map & geo ---
export const Map = asIcon(IconMapRaw);
export const MapPin = asIcon(IconMapPinRaw);
export const Compass = asIcon(IconCompassRoundRaw);
export const Home = asIcon(IconHomeRaw);
export const Target = asIcon(IconBulletListRaw);

// --- Navigation: chevrons & arrows ---
export const ChevronDown = asIcon(IconChevronBottomRaw);
export const ChevronUp = asIcon(IconChevronTopRaw);
export const ChevronLeft = asIcon(IconChevronLeftRaw);
export const ChevronRight = asIcon(IconChevronRightRaw);
export const ChevronsLeft = asIcon(IconChevronDoubleLeftRaw);
export const ChevronsRight = asIcon(IconChevronDoubleRightRaw);
// SkipBack / SkipForward in lucide are double-chevron-with-bar glyphs. Closest
// Central match is the plain double chevron; the visual difference is the
// trailing vertical bar, which is acceptable in a playback strip.
export const SkipBack = asIcon(IconChevronDoubleLeftRaw);
export const SkipForward = asIcon(IconChevronDoubleRightRaw);
export const ArrowUp = asIcon(IconArrowUpRaw);
export const ArrowUpDown = asIcon(IconArrowBottomTopRaw);

// --- Actions & form controls ---
export const X = asIcon(IconXCustom);
export const CircleX = asIcon(IconCircleXRaw);
export const Plus = asIcon(IconPlusMediumRaw);
export const Check = asIcon(IconCheckmark1MediumRaw);
export const CheckCircle2 = asIcon(IconCheckCircle2Raw);
export const Search = asIcon(IconMagnifyingGlassRaw);
export const Lock = asIcon(IconLockRaw);
export const LockOpen = asIcon(IconUnlockedRaw);
export const Hand = asIcon(IconHand5FingerRaw);
export const Ban = asIcon(IconBlockRaw);
export const Trash2 = asIcon(IconTrashCanSimpleRaw);
export const Send = asIcon(IconSendRaw);
export const Phone = asIcon(IconPhoneRaw);
export const BookOpen = asIcon(IconBookSimpleRaw);
export const Tag = asIcon(IconTagRaw);
export const RotateCcw = asIcon(IconArrowRotateCCRaw);

// --- Eyes / visibility ---
export const Eye = asIcon(IconEyeOpenRaw);
export const EyeOff = asIcon(IconEyeClosedRaw);

// --- Media playback ---
export const Play = asIcon(IconPlayRaw);
export const Pause = asIcon(IconPauseRaw);
export const Maximize2 = asIcon(IconFullscreen1Raw);
export const Minimize2 = asIcon(IconFullscreen2Raw);
export const SplitSquareHorizontal = asIcon(IconSplitRaw);

// --- Theme / settings ---
export const Sun = asIcon(IconSunRaw);
export const Moon = asIcon(IconMoonRaw);
export const Settings = asIcon(IconSettingsGear1Raw);
// Variant-suffixed: the canonical `Settings` stays on the round-outlined
// Gear1 (lucide-compatible). `SettingsGear4` is the square-filled variant
// reserved for chrome surfaces that want a heavier, more geometric glyph
// than the default. Mirrors the `LayoutGrid2` precedent — when a Central
// icon ships in multiple visual flavours and we want both available,
// keep the original mapped to its lucide name and expose the alternative
// under its Central identifier.
export const SettingsGear4 = asIcon(IconSettingsGear4Raw);
export const Palette = asIcon(IconColorPaletteRaw);
export const SlidersHorizontal = asIcon(IconSettingsSliderHorRaw);
export const Sparkles = asIcon(IconSparkles3BoldRaw);

// --- Layout / lists ---
export const List = asIcon(IconListBulletsRaw);

// --- Time ---
export const History = asIcon(IconHistoryRaw);
export const Timer = asIcon(IconStopwatchRaw);
export const Gauge = asIcon(IconGaugeRaw);
export const Clock = asIcon(IconClockRaw);

// --- Vehicles / domain glyphs ---
export const Plane = asIcon(IconAirplaneRaw);
export const Ship = asIcon(IconShipRaw);
export const Ruler = asIcon(IconRulerRaw);

// --- Status / alerts ---
export const AlertTriangle = asIcon(IconWarningSignRaw);
export const Shield = asIcon(IconShieldRaw);
// ShieldAlert in lucide is a shield with a "!" inside. Central has no
// matching combo glyph; the plain shield is the closest visual.
export const ShieldAlert = asIcon(IconShieldRaw);
export const Info = asIcon(IconInfoSimpleRaw);
export const Zap = asIcon(IconLightningBoltRaw);

// --- Misc ---
export const ExternalLink = asIcon(IconSquareArrowOutTopLeftRaw);

// =====================================================================
// 2. Paired filled twins (used by toggle / on-off states)
// =====================================================================

// `Pin` (line) <-> `PinFilled` for the DevicesPanel pinned-to-feed toggle.
// The off state uses the line `Pin` exported above; the on state uses
// `PinFilled` below. No more inline `fill="currentColor" strokeWidth={0}`
// hacks needed.
export const PinFilled = asIcon(IconPinFilledRaw);

// =====================================================================
// 3. Lucide pass-throughs (no clean Central equivalent)
// =====================================================================

// Each icon below is intentionally re-exported from lucide-react. The
// trailing comment explains why we did not pick a Central icon. We re-cast
// each through `asIcon` for the same reason as Central icons - to give
// consumers a project-local React type and avoid the same cross-version
// `ElementType` mismatch we get on lucide's `ForwardRefExoticComponent`.
import {
  Crosshair as CrosshairRaw,
  Loader2 as Loader2Raw,
  ScanLine as ScanLineRaw,
  ScanSearch as ScanSearchRaw,
  Wrench as WrenchRaw,
  Copy as CopyRaw,
  Download as DownloadRaw,
  Navigation as NavigationRaw,
  HelpCircle as HelpCircleRaw,
  Activity as ActivityRaw,
  Bird as BirdRaw,
  PinOff as PinOffRaw,
  MessageSquare as MessageSquareRaw,
  Image as ImageRaw,
  TimerReset as TimerResetRaw,
  Scan as ScanRaw,
  Mountain as MountainRaw,
  Route as RouteRaw,
  Square as SquareRaw,
  Rows2 as Rows2Raw,
  Grid2x2 as Grid2x2Raw,
  LayoutPanelTop as LayoutPanelTopRaw,
} from 'lucide-react';

// Crosshair: Central has no aim/target-reticle glyph. IconTarget would be
// too heavy and reads as "bullseye", not "crosshair".
export const Crosshair = asIcon(CrosshairRaw);

// Loader2: lucide's circular spinner is purpose-drawn for `animate-spin`
// (incomplete arc reads as motion). IconLoader is a full circle and looks
// static when spun.
export const Loader2 = asIcon(Loader2Raw);

// ScanLine, ScanSearch: Central has no scanning-overlay variants.
export const ScanLine = asIcon(ScanLineRaw);
export const ScanSearch = asIcon(ScanSearchRaw);

// Wrench: Central only ships IconHammer / IconToolbox; neither matches
// the maintenance-wrench visual we want for "device under service".
export const Wrench = asIcon(WrenchRaw);

// Copy: Central has IconFiles (multi-file) but no two-overlapping-pages
// copy glyph.
export const Copy = asIcon(CopyRaw);

// Download: Central's only download-shaped icon is IconCloudDownload,
// which adds an unwanted cloud connotation.
export const Download = asIcon(DownloadRaw);

// Navigation: lucide's paper-airplane Navigation icon has no Central
// equivalent. IconLocationArrow does not exist.
export const Navigation = asIcon(NavigationRaw);

// HelpCircle: Central has no question-mark-in-circle glyph.
export const HelpCircle = asIcon(HelpCircleRaw);

// Activity: lucide draws a pulse line; Central's IconHeartBeat reads as
// a literal heart, not a generic activity sparkline.
export const Activity = asIcon(ActivityRaw);

// Bird: domain-specific glyph used for hostile UAV cards. No Central
// equivalent.
export const Bird = asIcon(BirdRaw);

// PinOff: Central has no PinOff variant. We use Pin / PinFilled for the
// feed-pin toggle, but the legacy DevicesPanel context-menu "unpin"
// action keeps using lucide's PinOff for now.
export const PinOff = asIcon(PinOffRaw);

// MessageSquare: chat bubble disambiguation between Central's many
// bubble variants would be guesswork; keep lucide.
export const MessageSquare = asIcon(MessageSquareRaw);

// Image: lucide-react's `Image` icon (we alias as `ImageIcon` at the
// call site). Central has IconImageAvatar etc. but nothing as neutral.
export const Image = asIcon(ImageRaw);

// TimerReset: Central has no timer-with-reset arrow combo glyph.
export const TimerReset = asIcon(TimerResetRaw);

// Scan: Central only ships IconScanCode / IconScanTextSparkle / etc.,
// no plain "scan over content" line variant.
export const Scan = asIcon(ScanRaw);

// Mountain: Central ships IconMountainBike (with bike) only.
export const Mountain = asIcon(MountainRaw);

// Route: Central has no route/path-of-travel glyph.
export const Route = asIcon(RouteRaw);

// Layout picker glyphs (Single / Stack / Grid / Hero+filmstrip). Central
// has no purpose-drawn layout-preset family; lucide ships a coherent set
// where each icon clearly schematises the cell arrangement of the layout
// it represents — important since the picker is icon-only.
export const Square = asIcon(SquareRaw);
export const Rows2 = asIcon(Rows2Raw);
export const Grid2x2 = asIcon(Grid2x2Raw);
export const LayoutPanelTop = asIcon(LayoutPanelTopRaw);

// --- Brand / product logos ---
export const KelaLogo = asIcon(IconKelaLogo);
