/**
 * `useStrings()` — read the active strings catalog from the
 * direction context.
 *
 * Locale is currently 1:1 with direction (`'rtl'` ⇒ `'he'`,
 * `'ltr'` ⇒ `'en'`), so consumers that already consume
 * `useDirection()` can swap to `useStrings()` without adding a
 * second provider. When the demo route forces direction to LTR via
 * `<DirectionProvider forceDirection="ltr">`, every nested call to
 * `useStrings()` returns the English catalog automatically.
 */

import { useMemo } from 'react';
import { useLocale } from '@/lib/direction';
import { getStrings, type Strings } from './strings';

export function useStrings(): Strings {
  const locale = useLocale();
  // Stable identity per locale change — consumers that pass the
  // returned catalog into useMemo / useCallback dep arrays will only
  // re-derive when the operator actually flips the language.
  return useMemo(() => getStrings(locale), [locale]);
}
