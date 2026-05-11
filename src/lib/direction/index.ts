/**
 * Public surface of the direction infrastructure.
 *
 * Three things live here:
 *
 *  1. `DirectionProvider` + `useDirection` / `useIsRtl` / `useLocale`
 *     — the runtime state for `'rtl' | 'ltr'` and its locale tag.
 *     Wired once at the app root in `src/app/App.tsx`.
 *
 *  2. The `<DirIsland>` primitive — drop a subtree into a fixed
 *     direction regardless of the surrounding app. Used for instrument
 *     HUDs, the slim icon rail, the playback timeline, and any other
 *     chrome where direction-flipping would be wrong.
 *
 *  3. The `<Bdi>` primitive — bidi-isolate inline mixed-script content
 *     (coords, callsigns, freqs, MGRS) so Latin tokens don't visually
 *     reorder when sitting inside Hebrew sentences.
 *
 *  4. The `<DirectionalIcon>` family — `<ChevronStart>` /
 *     `<ChevronEnd>` and friends. Pick the visually-correct glyph for
 *     the current direction without polluting call sites with `isRtl`
 *     ternaries.
 *
 * See `RTL.md` (alongside this folder) for when to reach for which.
 */

export { DirectionProvider } from './DirectionProvider';
export {
  useDirection,
  useIsRtl,
  useLocale,
  type Direction,
  type Locale,
  type DirectionContextValue,
  type LogicalAlign,
} from './context';
export { DirIsland, type DirIslandProps } from './DirIsland';
export { Bdi, type BdiProps } from './Bdi';
export {
  ChevronStart,
  ChevronEnd,
  ChevronsStart,
  ChevronsEnd,
  ArrowStart,
  ArrowEnd,
  DirectionalIcon,
  type DirectionalIconProps,
} from './DirectionalIcon';
