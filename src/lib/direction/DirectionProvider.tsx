/**
 * DirectionProvider — single source of truth for the app's writing
 * direction (`'rtl' | 'ltr'`) and locale (`'he' | 'en'`).
 *
 * What it does
 * ────────────
 *  1. Owns a React `direction` state and exposes it via `useDirection()`
 *     (re-exported from `./context`).
 *  2. Mirrors the state onto `<html dir>` and `<html lang>` so Tailwind's
 *     custom variants (`rtl:` / `ltr:`) and any descendant CSS that selects
 *     `[dir="rtl"]` re-match instantly without React having to re-render
 *     unrelated subtrees.
 *  3. Persists the choice to `localStorage` (key: `c2hub.direction`) so a
 *     reload preserves the user preference. Default is `'rtl'` (the
 *     product is Hebrew-first).
 *  4. Wraps Radix's `DirectionProvider` so every Radix primitive
 *     (DropdownMenu, ContextMenu, Menubar, Popover, Slider, Tabs,
 *     Toast, ScrollArea, Tooltip, …) inherits the current direction
 *     and flips its internal layout — submenu chevrons, slide-in
 *     transitions, slider/scroll-area orientation — automatically.
 *
 * What it does NOT do
 * ───────────────────
 *  - Translate strings. There's no i18n library yet; this provider only
 *    decides direction + locale tag. String extraction is a separate
 *    workstream.
 *  - Force every descendant to flip. Components that should stay LTR
 *    regardless of locale (instrument HUDs, playback timelines, the
 *    slim icon rail, Latin-only chrome) should wrap themselves in
 *    `<DirIsland direction="ltr">` — see `./DirIsland`.
 *
 * Usage
 * ─────
 *   // wired once in `src/app/App.tsx`:
 *   <DirectionProvider>
 *     <App />
 *   </DirectionProvider>
 *
 *   // anywhere in the tree:
 *   const { direction, setDirection, isRtl, locale } = useDirection();
 *
 * The initial value is read synchronously from `localStorage` (and falls
 * back to the `<html dir>` baked into `index.html`) so we never paint a
 * frame in the wrong direction.
 *
 * Fast-Refresh contract: this file *only* exports the
 * `DirectionProvider` component. Hooks, types, and the context object
 * live in `./context.ts`. Mixing exports here would force Vite to bail
 * out of Fast Refresh and fall back to invalidation, which can leave
 * consumers (the slim-rail toggle, settings panels) holding a stale
 * context value.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction';
import {
  DIRECTION_STORAGE_KEY,
  DirectionContext,
  LOCALE_FOR_DIRECTION,
  type Direction,
  type DirectionContextValue,
} from './context';

/**
 * Read the user's last choice synchronously so SSR/CSR mismatches and
 * first-paint flashes are avoided. Falls back to `<html dir>` (which
 * `index.html` hard-codes to `'rtl'`) and finally to `'rtl'`.
 */
function readInitialDirection(): Direction {
  if (typeof window === 'undefined') return 'rtl';

  try {
    const stored = window.localStorage.getItem(DIRECTION_STORAGE_KEY);
    if (stored === 'rtl' || stored === 'ltr') return stored;
  } catch {
    /* localStorage may be disabled (private mode, embedded contexts). */
  }

  const htmlDir = document.documentElement.getAttribute('dir');
  if (htmlDir === 'rtl' || htmlDir === 'ltr') return htmlDir;

  return 'rtl';
}

interface DirectionProviderProps {
  children: ReactNode;
  /**
   * Force a specific direction and ignore both `localStorage` and the
   * `<html dir>` attribute. Useful for storybook / styleguide previews
   * that need to render a component in a known direction regardless of
   * the visitor's preference.
   */
  forceDirection?: Direction;
}

export function DirectionProvider({ children, forceDirection }: DirectionProviderProps) {
  const [direction, setDirectionState] = useState<Direction>(
    () => forceDirection ?? readInitialDirection(),
  );

  // Mirror onto <html dir> + <html lang>. Done in an effect so that the
  // attribute write happens after React has committed and other CSS
  // engines (e.g. Cesium, Joyride portals appended outside #root) see a
  // consistent state.
  useEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute('dir') !== direction) {
      html.setAttribute('dir', direction);
    }
    const nextLang = LOCALE_FOR_DIRECTION[direction];
    if (html.getAttribute('lang') !== nextLang) {
      html.setAttribute('lang', nextLang);
    }
  }, [direction]);

  const setDirection = useCallback((next: Direction) => {
    setDirectionState(next);
    try {
      window.localStorage.setItem(DIRECTION_STORAGE_KEY, next);
    } catch {
      /* see readInitialDirection — non-fatal. */
    }
  }, []);

  const toggleDirection = useCallback(() => {
    setDirectionState((prev) => {
      const next: Direction = prev === 'rtl' ? 'ltr' : 'rtl';
      try {
        window.localStorage.setItem(DIRECTION_STORAGE_KEY, next);
      } catch {
        /* non-fatal */
      }
      return next;
    });
  }, []);

  // Honour `forceDirection` updates after mount — the styleguide swaps
  // it as the user clicks through previews.
  useEffect(() => {
    if (forceDirection && forceDirection !== direction) {
      setDirectionState(forceDirection);
    }
  }, [forceDirection, direction]);

  const value = useMemo<DirectionContextValue>(
    () => ({
      direction,
      isRtl: direction === 'rtl',
      locale: LOCALE_FOR_DIRECTION[direction],
      setDirection,
      toggleDirection,
    }),
    [direction, setDirection, toggleDirection],
  );

  return (
    <DirectionContext.Provider value={value}>
      <RadixDirectionProvider dir={direction}>{children}</RadixDirectionProvider>
    </DirectionContext.Provider>
  );
}
