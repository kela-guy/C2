/**
 * Direction context — types, context object, and consumer hooks.
 *
 * Lives in a `.ts` file (no JSX) so React Fast Refresh treats every
 * export here as plain values. The provider component is split out into
 * `DirectionProvider.tsx` so that file exports a *single* component,
 * which is what Fast Refresh requires to hot-reload cleanly without
 * blowing the React tree away on every edit. See:
 * https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#consistent-components-exports
 */

import { createContext, useContext } from 'react';

export type Direction = 'rtl' | 'ltr';
export type Locale = 'he' | 'en';

/**
 * Direction → locale tag. We deliberately keep this 1:1 for now — when
 * the app gains real i18n we'll lift `locale` out of direction and let
 * each side be set independently (e.g. Arabic = RTL but locale `'ar'`).
 */
export const LOCALE_FOR_DIRECTION: Record<Direction, Locale> = {
  rtl: 'he',
  ltr: 'en',
};

export const DIRECTION_STORAGE_KEY = 'c2hub.direction';

export interface DirectionContextValue {
  direction: Direction;
  /** Convenience flag: `true` when `direction === 'rtl'`. */
  isRtl: boolean;
  /** Locale tag matching the current direction (Hebrew for RTL, English for LTR). */
  locale: Locale;
  /** Update the global direction. Persists to `localStorage` and mirrors onto `<html>`. */
  setDirection: (next: Direction) => void;
  /** Flip between RTL and LTR. */
  toggleDirection: () => void;
}

export const DirectionContext = createContext<DirectionContextValue | null>(null);

/**
 * Read the current direction. Throws (in dev) when used outside the
 * provider — fail loudly so we never silently render in a default that
 * doesn't match the rest of the app.
 */
export function useDirection(): DirectionContextValue {
  const ctx = useContext(DirectionContext);
  if (!ctx) {
    throw new Error('useDirection() must be used inside <DirectionProvider>.');
  }
  return ctx;
}

/**
 * Lightweight selector hook for the very common `isRtl` boolean.
 * Equivalent to `useDirection().isRtl` but cheaper to type at call sites.
 */
export function useIsRtl(): boolean {
  return useDirection().isRtl;
}

/**
 * Read the current locale tag. Equivalent to `useDirection().locale`.
 * Use this for `Intl.*` formatters and any other locale-tagged API.
 */
export function useLocale(): Locale {
  return useDirection().locale;
}

/**
 * Popper `align` at call sites — logical (`start` = inline-start,
 * `end` = inline-end). Floating UI reads `direction` from the trigger
 * and resolves these correctly in both LTR and RTL.
 */
export type LogicalAlign = 'start' | 'center' | 'end';
