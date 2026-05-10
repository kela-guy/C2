/**
 * DirectionProvider — single source of truth for the app's writing direction.
 *
 * The product is bilingual: Hebrew (RTL) is the production locale, English
 * (LTR) is required for marketing recordings, partner demos, and any
 * place we want the dashboard rendered as Latin-script. Tailwind variants
 * (`rtl:*` / `ltr:*`) and Radix popper alignment both read direction from
 * the closest `[dir]` ancestor, so the cleanest plumbing is to:
 *
 *   1. Own a `'rtl' | 'ltr'` state in React.
 *   2. Mirror it onto `<html dir>` and `<html lang>` so every descendant
 *      Tailwind variant resolves correctly without per-component plumbing.
 *   3. Wrap Radix's own `DirectionProvider` so every Radix primitive
 *      (DropdownMenu, Popover, Tooltip, ContextMenu, …) — including ones
 *      that mount through portals outside our JSX subtree — inherits the
 *      same direction without each consumer setting `dir` manually.
 *   4. Persist the choice to `localStorage` so a refresh keeps the user
 *      on whichever direction they last picked.
 *
 * `forceDirection` is the escape hatch for the marketing `/demo` route:
 * when set, the provider locks itself to that value, ignoring (but not
 * mutating) the persisted preference. Leaving the route restores the
 * stored direction on unmount.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction';

export type Direction = 'rtl' | 'ltr';

/**
 * Locale shorthand derived from direction. `'he'` for RTL, `'en'` for LTR.
 * The product only ships these two, so a one-to-one mapping is fine; if a
 * third locale lands later we'll widen this and decouple it from direction.
 */
export type Locale = 'he' | 'en';

interface DirectionContextValue {
  direction: Direction;
  /** Mutually exclusive with the controlled `forceDirection` mode — only available when not forced. */
  setDirection: (next: Direction) => void;
  /** Convenience flip. No-op while `forceDirection` is active. */
  toggleDirection: () => void;
  /** True when the parent set `forceDirection` — consumers can hide / disable toggles in this case. */
  isForced: boolean;
}

const DirectionContext = createContext<DirectionContextValue | null>(null);

const STORAGE_KEY = 'c2hub.direction';
const DEFAULT_DIRECTION: Direction = 'rtl';

/**
 * Read the persisted direction, falling back to the document's current
 * `<html dir>` (set in `index.html`) and finally to the product default.
 * Synchronous so we don't flash the wrong direction during hydration.
 */
function getInitialDirection(): Direction {
  if (typeof window === 'undefined') return DEFAULT_DIRECTION;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'rtl' || stored === 'ltr') return stored;
  } catch {
    // localStorage can throw in private mode / cross-origin iframes —
    // swallow and fall back rather than crashing on first render.
  }
  const docDir = document.documentElement.getAttribute('dir');
  if (docDir === 'rtl' || docDir === 'ltr') return docDir;
  return DEFAULT_DIRECTION;
}

interface DirectionProviderProps {
  children: ReactNode;
  /**
   * Pin the direction to a fixed value, ignoring the persisted preference
   * and disabling `setDirection` / `toggleDirection`. Used by the marketing
   * `/demo` route to force English/LTR without disturbing the user's saved
   * Hebrew/RTL preference (which is restored on unmount).
   */
  forceDirection?: Direction;
}

export function DirectionProvider({ children, forceDirection }: DirectionProviderProps) {
  const [stored, setStored] = useState<Direction>(getInitialDirection);
  const direction: Direction = forceDirection ?? stored;
  const isForced = forceDirection != null;

  // Mirror direction onto `<html dir>` + `<html lang>` synchronously.
  // `useLayoutEffect` (not `useEffect`) so we update the DOM before the
  // browser paints — otherwise the first frame after a toggle flashes the
  // old direction's logical-property layout.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', direction);
    root.setAttribute('lang', direction === 'rtl' ? 'he' : 'en');
  }, [direction]);

  // Persist user-driven changes only. `forceDirection` is recording-time
  // chrome — we explicitly do NOT write it to storage so leaving `/demo`
  // returns the user to whatever they had before.
  useEffect(() => {
    if (isForced) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, stored);
    } catch {
      // Same swallow rationale as `getInitialDirection`.
    }
  }, [stored, isForced]);

  const setDirection = useCallback((next: Direction) => {
    if (forceDirection != null) return;
    setStored(next);
  }, [forceDirection]);

  const toggleDirection = useCallback(() => {
    if (forceDirection != null) return;
    setStored((prev) => (prev === 'rtl' ? 'ltr' : 'rtl'));
  }, [forceDirection]);

  const value = useMemo<DirectionContextValue>(
    () => ({ direction, setDirection, toggleDirection, isForced }),
    [direction, setDirection, toggleDirection, isForced],
  );

  return (
    <DirectionContext.Provider value={value}>
      <RadixDirectionProvider dir={direction}>{children}</RadixDirectionProvider>
    </DirectionContext.Provider>
  );
}

/** Read full direction context. Throws if called outside a {@link DirectionProvider}. */
export function useDirection(): DirectionContextValue {
  const ctx = useContext(DirectionContext);
  if (!ctx) {
    throw new Error('useDirection must be used inside <DirectionProvider>');
  }
  return ctx;
}

/** Boolean-only convenience for the common case (icon flips, transform mirroring). */
export function useIsRtl(): boolean {
  return useDirection().direction === 'rtl';
}

/**
 * Locale shorthand derived from direction. Lives in this module (rather
 * than a separate `@/lib/intl`) so call sites that just need a string
 * code (e.g. `Intl.DateTimeFormat(useLocale())`) don't have to import a
 * second module.
 */
export function useLocale(): Locale {
  return useDirection().direction === 'rtl' ? 'he' : 'en';
}
