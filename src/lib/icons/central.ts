/**
 * Central Icons wrapper.
 *
 * The codebase historically imported every icon from `lucide-react`. We have
 * since adopted Central Icons (https://iconists.co/central) as the project's
 * canonical icon family. This module re-exports the icons we use under the
 * lucide-compatible names that consumers expect, so the migration was a
 * find-and-replace from `lucide-react` -> `@/lib/icons/central`.
 *
 * ---------------------------------------------------------------------------
 * Import policy (enforced by `no-restricted-imports` in eslint.config.js):
 *
 *   - Generic UI icon  -> import from `@/lib/icons/central` (this file).
 *   - Brand / domain glyph (drone markers, C2 logo, jam waves, tactical
 *     map symbols) -> the relevant first-party module: `@/primitives/
 *     ProductIcons`, `@/primitives/MapIcons`, `@/app/components/TacticalMap`,
 *     or `@/app/components/devices-panel/icons`.
 *
 * The ONLY modules allowed to import `lucide-react` directly are this wrapper,
 * `src/lib/iconRegistry.ts` (styleguide catalogue), the styleguide tooling
 * under `src/app/components/styleguide/*`, and the shadcn primitives under
 * `src/app/components/ui/*`. Everything else must route through here.
 *
 * Missing in Central — candidates to request from the iconists
 * (hello@iconists.co): a proper crosshair/reticle, a neutral overflow
 * ellipsis, a plain line-scan, a drone/UAV `Bird`, and a `Mountain` /
 * altitude glyph. Most former lucide pass-throughs now map to the closest
 * Central glyph (bucket 3); only `Bird` and `Mountain` still fall back to
 * lucide (bucket 4), because Central's nearest options (a laptop-bird and a
 * bicycle) would mislead.
 * ---------------------------------------------------------------------------
 *
 * Variant choice (locked):
 *   - Primary (filled, no radius): @central-icons-react/round-filled-radius-0-stroke-2
 *   - Filled (paired):  @central-icons-react/round-filled-radius-1-stroke-1.5
 *   - Bold filled (square): @central-icons-react/square-filled-radius-0-stroke-2
 *
 * Four buckets live in this file:
 *
 *   1. Direct Central mappings - the bulk. Each Central icon is imported
 *      from its own subpath (`/IconName/`) so Vite/Rollup can tree-shake at
 *      the icon level (the variant package ships ~2k icons).
 *
 *   2. Paired filled twins - icons that have an off/on visual where "on"
 *      should be the filled variant (currently just `Pin`/`PinFilled` for
 *      the DevicesPanel pinned-to-feed toggle).
 *
 *   3. Former lucide pass-throughs, now mapped to the closest Central glyph
 *      (accepting minor visual/semantic drift). Each is annotated with the
 *      chosen icon's aria label.
 *
 *   4. Remaining lucide hold-outs - only `Bird` and `Mountain`, where the
 *      nearest Central glyph (laptop-bird / bicycle) would mislead. These
 *      stay on lucide until an iconist request lands.
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

import { createElement } from 'react';
import type { ComponentType, SVGAttributes } from 'react';

import IconCamera1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconCamera1';
import IconBellRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconBell';
import IconBellOffRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconBellOff';
import IconPinRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconPin';
import IconBatteryFullRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconBatteryFull';
import IconBatteryLowRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconBatteryLow';
import IconRadarRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconRadar';
import IconLayoutWindowRaw from '@central-icons-react/square-filled-radius-0-stroke-2/IconLayoutWindow';
import IconAgentsRaw from '@central-icons-react/square-filled-radius-0-stroke-2/IconAgents';
import IconRadioRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconRadio';
import IconVideoRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconVideo';
import IconSignalTowerRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSignalTower';
import IconMapRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconMap';
import IconMapPinRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconMapPin';
import IconCompassRoundRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconCompassRound';
// Sensor-direction glyph for Gotcha sector child rows — a progress arc reads
// as a directional sector. Intentionally the OUTLINED (line) variant: the open
// arc conveys "direction / sweep" better than a solid wedge, so this is a
// deliberate exception to the prefer-filled icon rule (requested at the call
// site). This pulls in the `square-outlined-radius-0-stroke-2` family.
import IconProgressArcRaw from '@central-icons-react/square-outlined-radius-0-stroke-2/IconProgressArc';
import IconHomeRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconHome';
import IconTargetRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconTarget';
import IconChevronBottomRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconChevronBottom';
import IconChevronTopRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconChevronTop';
import IconChevronLeftRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconChevronLeft';
import IconChevronRightRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconChevronRight';
import IconChevronDoubleLeftRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconChevronDoubleLeft';
import IconChevronDoubleRightRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconChevronDoubleRight';
import IconArrowUpRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconArrowUp';
import IconArrowUpRightRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconArrowUpRight';
import IconArrowRightRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconArrowRight';
import IconArrowDownRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconArrowDown';
import IconArrowBottomTopRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconArrowBottomTop';
import IconCrossMediumRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconCrossMedium';
import IconPlusMediumRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconPlusMedium';
import IconCheckmark1MediumRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconCheckmark1Medium';
import IconCheckCircle2Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconCheckCircle2';
import IconMagnifyingGlassRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconMagnifyingGlass';
import IconLockRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconLock';
import IconUnlockedRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconUnlocked';
import IconHand5FingerRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconHand5Finger';
import IconBlockRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconBlock';
import IconTrashCanSimpleRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconTrashCanSimple';
import IconEditSmall1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconEditSmall1';
import IconSendRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSend';
import IconPhoneRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconPhone';
import IconBookSimpleRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconBookSimple';
import IconTagRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconTag';
import IconArrowRotateCCRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconArrowRotateCounterClockwise';
import IconEyeOpenRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconEyeOpen';
import IconEyeClosedRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconEyeClosed';
import IconPlayRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconPlay';
import IconPauseRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconPause';
import IconFullscreen1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconFullscreen1';
import IconFullscreen2Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconFullscreen2';
import IconSplitRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSplit';
import IconSunRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSun';
import IconMoonRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconMoon';
import IconEscRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconEsc';
import IconSettingsGear1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSettingsGear1';
import IconColorPaletteRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconColorPalette';
import IconSettingsSliderHorRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSettingsSliderHor';
import IconSparkles3BoldRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSparkles3Bold';
import IconListBulletsRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconListBullets';
import IconHistoryRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconHistory';
import IconStopwatchRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconStopwatch';
import IconGaugeRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconGauge';
import IconClockRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconClock';
import IconAirplaneRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconAirplane';
import IconShipRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconShip';
import IconRulerRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconRuler';
import IconWarningSignRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconWarningSign';
import IconExclamationTriangleRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconExclamationTriangle';
import IconExclamationTriangleSquareRaw from '@central-icons-react/square-filled-radius-0-stroke-2/IconExclamationTriangle';
import IconShieldRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconShield';
import IconInfoSimpleRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconInfoSimple';
import IconLightningBoltRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconLightningBolt';
import IconSquareArrowOutTopLeftRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSquareArrowOutTopLeft';
import IconStopRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconStop';
import IconDropRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconDrop';
import IconChevronGrabberVerticalRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconChevronGrabberVertical';
import IconCircleRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconCircle';
import IconCircleQuestionmarkRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconCircleQuestionmark';
import IconSquareBehindSquare1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconSquareBehindSquare1';
import IconChatBubble7Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconChatBubble7';
import IconPinFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconPin';
import IconStopFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconStop';
import IconSunFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconSun';
import IconMoonFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconMoon';
import IconEscFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconEsc';
import IconSparkles3BoldFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconSparkles3Bold';
import IconArrowRotateCCFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconArrowRotateCounterClockwise';
import IconGaugeFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconGauge';
import IconLightningBoltFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconLightningBolt';
import IconSettingsSliderHorFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconSettingsSliderHor';
import IconSettingsGear1FilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconSettingsGear1';
import IconUnlockedFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconUnlocked';
import IconMagnifyingGlassFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconMagnifyingGlass';
import IconSpeakerFilledRaw from '@central-icons-react/round-filled-radius-1-stroke-1.5/IconSpeaker';
// Bolder filled variant (radius-0 / stroke-2) — used only for the
// notifications "armed" state in the devices lab, where the heavier weight
// reads as a lit/active bell against the row tint. Intentional second filled
// variant; the rest of the app stays on the locked radius-1 / stroke-1.5 set.
import IconBellOffFilledRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconBellOff';
// Square / filled / radius-0 / stroke-2 chevron — used for the Day/Night
// view-mode select trigger, where the heavier solid glyph matches the filled
// mode icons in that lab. Intentional one-off variant outside the locked set.
import IconChevronDownMediumFilledRaw from '@central-icons-react/square-filled-radius-0-stroke-2/IconChevronDownMedium';
// Square / filled / radius-0 / stroke-2 half-filled circle — the chosen
// Day/Night view-mode "Auto" glyph (half day / half night reads as automatic).
import IconCircleHalfFillRaw from '@central-icons-react/square-filled-radius-0-stroke-2/IconCircleHalfFill';

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

// =====================================================================
// 1. Direct Central mappings (outlined / line variant)
// =====================================================================

// --- Devices & status ---
export const Camera = asIcon(IconCamera1Raw);
export const Bell = asIcon(IconBellRaw);
export const BellOff = asIcon(IconBellOffRaw);
export const Pin = asIcon(IconPinRaw);
export const Battery = asIcon(IconBatteryFullRaw);
export const BatteryLow = asIcon(IconBatteryLowRaw);
export const Radar = asIcon(IconRadarRaw);
// `Devices` is the dashboard rail's device-panel launcher glyph. Uses Central's
// `IconLayoutWindow` (square / filled / radius-0 / stroke-2) — a windowed panel
// that reads as the devices surface.
export const Devices = asIcon(IconLayoutWindowRaw);
// `Agents` is the dashboard rail's CUAS/simulations launcher glyph. Uses
// Central's `IconAgents` (square / filled / radius-0 / stroke-2).
export const Agents = asIcon(IconAgentsRaw);
export const Radio = asIcon(IconRadioRaw);
export const Video = asIcon(IconVideoRaw);
export const SignalHigh = asIcon(IconSignalTowerRaw);
// Central has no SignalLow variant; we re-use the same tower icon. The
// drone HUD already differentiates by colour + numeric bars, so the icon
// shape stays constant.
export const SignalLow = asIcon(IconSignalTowerRaw);

// --- Map & geo ---
export const Map = asIcon(IconMapRaw);
export const MapPin = asIcon(IconMapPinRaw);
export const Compass = asIcon(IconCompassRoundRaw);
// Directional sector arc — rotate via `transform: rotate(${bearingDeg}deg)`.
export const ProgressArc = asIcon(IconProgressArcRaw);
export const Home = asIcon(IconHomeRaw);
export const Target = asIcon(IconTargetRaw);

// --- Navigation: chevrons & arrows ---
export const ChevronDown = asIcon(IconChevronBottomRaw);
export const ChevronUp = asIcon(IconChevronTopRaw);
export const ChevronLeft = asIcon(IconChevronLeftRaw);
export const ChevronRight = asIcon(IconChevronRightRaw);
export const ChevronsLeft = asIcon(IconChevronDoubleLeftRaw);
export const ChevronsRight = asIcon(IconChevronDoubleRightRaw);
// Vertical double-chevron used by combobox / select triggers (lucide's
// `ChevronsUpDown`). Central's grabber-vertical glyph is the up/down pair.
export const ChevronsUpDown = asIcon(IconChevronGrabberVerticalRaw);
// SkipBack / SkipForward in lucide are double-chevron-with-bar glyphs. Closest
// Central match is the plain double chevron; the visual difference is the
// trailing vertical bar, which is acceptable in a playback strip.
export const SkipBack = asIcon(IconChevronDoubleLeftRaw);
export const SkipForward = asIcon(IconChevronDoubleRightRaw);
export const ArrowUp = asIcon(IconArrowUpRaw);
export const ArrowUpRight = asIcon(IconArrowUpRightRaw);
export const ArrowRight = asIcon(IconArrowRightRaw);
export const ArrowDown = asIcon(IconArrowDownRaw);
export const ArrowUpDown = asIcon(IconArrowBottomTopRaw);

// --- Actions & form controls ---
// `X` is the canonical CLOSE glyph used by panel/dialog close buttons
// across the app. Central's `IconX` is the *brand* "X" logo, not a
// close cross, so the export is intentionally wired to `IconCrossMedium`.
// `Close` is an alias for new code that wants the semantic name.
export const X = asIcon(IconCrossMediumRaw);
export const Close = X;
export const Plus = asIcon(IconPlusMediumRaw);
export const Check = asIcon(IconCheckmark1MediumRaw);
export const CheckCircle2 = asIcon(IconCheckCircle2Raw);
export const Search = asIcon(IconMagnifyingGlassRaw);
export const Lock = asIcon(IconLockRaw);
export const LockOpen = asIcon(IconUnlockedRaw);
export const LockOpenFilled = asIcon(IconUnlockedFilledRaw);
export const Hand = asIcon(IconHand5FingerRaw);
export const Ban = asIcon(IconBlockRaw);
export const Trash2 = asIcon(IconTrashCanSimpleRaw);
export const Pencil = asIcon(IconEditSmall1Raw);
export const Send = asIcon(IconSendRaw);
export const Phone = asIcon(IconPhoneRaw);
export const BookOpen = asIcon(IconBookSimpleRaw);
export const Tag = asIcon(IconTagRaw);
export const RotateCcw = asIcon(IconArrowRotateCCRaw);
// Copy: Central's `IconSquareBehindSquare1` is the two-overlapping-squares
// duplicate glyph (lucide's `Copy` equivalent).
export const Copy = asIcon(IconSquareBehindSquare1Raw);
// HelpCircle: Central ships a question-mark-in-circle glyph.
export const HelpCircle = asIcon(IconCircleQuestionmarkRaw);
// MessageSquare: chat bubble (lucide's `MessageSquare` equivalent).
export const MessageSquare = asIcon(IconChatBubble7Raw);

// --- Eyes / visibility ---
export const Eye = asIcon(IconEyeOpenRaw);
export const EyeOff = asIcon(IconEyeClosedRaw);

// --- Media playback ---
export const Play = asIcon(IconPlayRaw);
export const Pause = asIcon(IconPauseRaw);
// `Square` is used as the STOP glyph on speaker/playback controls (lucide
// exposes a bare square for this). Central ships a purpose-drawn stop icon.
export const Square = asIcon(IconStopRaw);
export const Maximize2 = asIcon(IconFullscreen1Raw);
export const Minimize2 = asIcon(IconFullscreen2Raw);
export const SplitSquareHorizontal = asIcon(IconSplitRaw);

// --- Theme / settings ---
export const Sun = asIcon(IconSunRaw);
export const Moon = asIcon(IconMoonRaw);
// Power: Central's `IconEsc` is the universal power/standby glyph (a circle
// broken by a top stroke; its aria-label is "esc, power").
export const Power = asIcon(IconEscRaw);
export const Settings = asIcon(IconSettingsGear1Raw);
export const SettingsFilled = asIcon(IconSettingsGear1FilledRaw);
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
// The canonical exclamation-in-a-triangle warning glyph (⚠). Distinct from
// `AlertTriangle`, which maps to Central's striped `WarningSign`.
export const WarningTriangle = asIcon(IconExclamationTriangleRaw);
// Bold, square-cut twin of `WarningTriangle` for dense status badges where the
// rounded glyph reads as a dot at small sizes (square-filled-radius-0-stroke-2).
export const WarningTriangleSquare = asIcon(IconExclamationTriangleSquareRaw);
export const Shield = asIcon(IconShieldRaw);
// ShieldAlert in lucide is a shield with a "!" inside. Central has no
// matching combo glyph; the plain shield is the closest visual.
export const ShieldAlert = asIcon(IconShieldRaw);
export const Info = asIcon(IconInfoSimpleRaw);
export const Zap = asIcon(IconLightningBoltRaw);

// --- Shapes ---
export const Circle = asIcon(IconCircleRaw);

// --- Devices / environment ---
// `Droplets` drives the floodlight / water control on device cards.
export const Droplets = asIcon(IconDropRaw);

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

// `BellOff` (line) <-> `BellOffFilled` for the notifications armed toggle.
// The filled twin comes from the bolder radius-0 / stroke-2 variant.
export const BellOffFilled = asIcon(IconBellOffFilledRaw);

// `Square` (line) <-> `SquareFilled` for the drone emergency-stop button in
// the video HUD chrome, where the solid glyph reads as a more emphatic stop.
export const SquareFilled = asIcon(IconStopFilledRaw);

// `Sun`/`Power` (line) <-> filled twins for the floodlight segmented toggle,
// where the solid glyphs read as more emphatic on/off states.
export const SunFilled = asIcon(IconSunFilledRaw);
export const MoonFilled = asIcon(IconMoonFilledRaw);
export const PowerFilled = asIcon(IconEscFilledRaw);

// Filled twins for the Day/Night view-mode lab's Auto-icon study, where the
// solid glyphs are compared against the line set in context.
export const SparklesFilled = asIcon(IconSparkles3BoldFilledRaw);
export const RotateCcwFilled = asIcon(IconArrowRotateCCFilledRaw);
export const GaugeFilled = asIcon(IconGaugeFilledRaw);
export const ZapFilled = asIcon(IconLightningBoltFilledRaw);
export const SlidersHorizontalFilled = asIcon(IconSettingsSliderHorFilledRaw);
export const ChevronDownFilled = asIcon(IconChevronDownMediumFilledRaw);
export const CircleHalfFill = asIcon(IconCircleHalfFillRaw);

// Filled speaker for the gotcha/counter-air card's "Play audio" broadcast
// action — the solid glyph reads as an emphatic, active PA control.
export const SpeakerFilled = asIcon(IconSpeakerFilledRaw);

// =====================================================================
// 3. Former lucide pass-throughs, now mapped to Central glyphs
// =====================================================================

// These previously fell back to lucide because no exact Central match
// existed. Per the Central-only directive we now map each to the closest
// glyph in the locked round-outlined / stroke-1.5 set, accepting minor
// visual/semantic drift (the chosen Central icon's aria label is noted).
import IconTarget1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconTarget1';
import IconLoadingCircleRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconLoadingCircle';
import IconScanCodeRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconScanCode';
import IconScanTextSparkleRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconScanTextSparkle';
import IconArScanCube1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconArScanCube1';
import IconMaintenanceRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconMaintenance';
import IconImportRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconImport';
import IconLocationRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconLocation';
import IconLiveActivityRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconLiveActivity';
import IconUnpinRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconUnpin';
import IconImages1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconImages1';
import IconClockSnoozeRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconClockSnooze';
import IconMapEditFlatRaw from '@central-icons-react/round-filled-radius-0-stroke-2/IconMapEditFlat';
import IconCircleDotsCenter1Raw from '@central-icons-react/round-filled-radius-0-stroke-2/IconCircleDotsCenter1';

// Crosshair → IconTarget1 (aria: "target-1, zoom, crosshair").
export const Crosshair = asIcon(IconTarget1Raw);

// Loader2 → IconLoadingCircle (aria: "loading-circle, quarter, spinner");
// the quarter arc still reads as motion under `animate-spin`.
export const Loader2 = asIcon(IconLoadingCircleRaw);

// Scan family → nearest Central scan glyphs (Central has no plain line-scan):
//   Scan       → IconArScanCube1   (survey/detect frame)
//   ScanLine   → IconScanCode      (line/barcode-style scan)
//   ScanSearch → IconScanTextSparkle (AI "smart detect", carries the sparkle)
export const Scan = asIcon(IconArScanCube1Raw);
export const ScanLine = asIcon(IconScanCodeRaw);
export const ScanSearch = asIcon(IconScanTextSparkleRaw);

// Wrench → IconMaintenance (aria: "maintenance, service, tweak").
export const Wrench = asIcon(IconMaintenanceRaw);

// Download → IconImport (aria: "import, download, save").
export const Download = asIcon(IconImportRaw);

// Navigation → IconLocation (aria: "location, explore, compass"); used on
// heading / altitude telemetry rows.
export const Navigation = asIcon(IconLocationRaw);

// Activity → IconLiveActivity (aria: "live-activity") — generic activity pulse.
export const Activity = asIcon(IconLiveActivityRaw);

// PinOff → IconUnpin.
export const PinOff = asIcon(IconUnpinRaw);

// Image → IconImages1 (aria: "images-1, photos, pictures").
export const Image = asIcon(IconImages1Raw);

// TimerReset → IconClockSnooze (aria: "clock-snooze, timer"); used for the
// clear/reset-filters affordance.
export const TimerReset = asIcon(IconClockSnoozeRaw);

// Route → IconMapEditFlat (aria: "map-edit-flat, route, plan").
export const Route = asIcon(IconMapEditFlatRaw);

// MoreVertical / MoreHorizontal → IconCircleDotsCenter1 (aria: "menu").
// Central ships no plain three-dot ellipsis; the dots-in-circle is the
// nearest overflow affordance.
export const MoreVertical = asIcon(IconCircleDotsCenter1Raw);
export const MoreHorizontal = asIcon(IconCircleDotsCenter1Raw);

// =====================================================================
// 4. Remaining lucide hold-outs (no acceptable Central glyph yet)
// =====================================================================
// Bird:     Central only ships `IconVibeCodingBird` — a bird with a laptop.
// Mountain: Central only ships `IconMountainBike` — a bicycle.
// Both would actively mislead in the tactical UI, so they stay on lucide
// pending a product decision / an iconist request.
import { Bird as BirdRaw, Mountain as MountainRaw } from 'lucide-react';
export const Bird = asIcon(BirdRaw);
export const Mountain = asIcon(MountainRaw);

// =====================================================================
// Custom glyphs (no Central equivalent) — used by the video HUD sandbox.
// =====================================================================

const TAKE_CONTROL_PATH =
  'M12 2C9.23858 2 7 4.23858 7 7V9H4V22H20V9H17V7C17 4.23858 14.7614 2 12 2ZM15 9V7C15 5.34315 13.6569 4 12 4C10.3431 4 9 5.34315 9 7V9H15ZM13 13V18H11V13H13Z';

const IconTakeControlCustom = ({ size = 24, ...props }: SVGAttributes<SVGSVGElement> & { size?: number | string }) =>
  createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', width: size, height: size, ...props },
    createElement('path', {
      fillRule: 'evenodd',
      clipRule: 'evenodd',
      d: TAKE_CONTROL_PATH,
      fill: 'currentColor',
    }),
  );

const ZOOM_CIRCLE_PATH =
  'M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z';
const ZOOM_HANDLE_PATH = 'M20 20L16.05 16.05';

const IconZoomCustom = ({ size = 24, ...props }: SVGAttributes<SVGSVGElement> & { size?: number | string }) =>
  createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', width: size, height: size, ...props },
    createElement('path', {
      d: ZOOM_CIRCLE_PATH,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'square',
    }),
    createElement('path', {
      d: ZOOM_HANDLE_PATH,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'square',
    }),
  );

export const TakeControl = asIcon(IconTakeControlCustom);
export const Zoom = asIcon(IconZoomCustom);
export const ZoomFilled = asIcon(IconMagnifyingGlassFilledRaw);
