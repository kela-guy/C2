/**
 * Side-effects that run whenever the parent supplies a
 * `focusedDeviceId`:
 *
 *   1. Auto-expand that device's row.
 *   2. Make sure the type filter doesn't hide it (widen the selection
 *      when the focused device's type isn't already included).
 *   3. Clear the search box so a stale query doesn't filter it out.
 *   4. Scroll the row into view on the next frame so the layout has
 *      a chance to settle from steps 1-3.
 *
 * Returns the ref the caller should attach to the focused row's DOM
 * node so the rAF scroll-into-view actually finds something.
 */

import { useEffect, useRef } from 'react';
import { findDeviceType } from './utils';
import type { Device, DeviceType } from './types';

export interface UseFocusedDeviceParams {
  focusedDeviceId: string | null | undefined;
  devices: Device[];
  setExpandedId: (id: string | null) => void;
  setSelectedTypes: (updater: (prev: DeviceType[]) => DeviceType[]) => void;
  setQuery: (next: string) => void;
}

export function useFocusedDevice({
  focusedDeviceId,
  devices,
  setExpandedId,
  setSelectedTypes,
  setQuery,
}: UseFocusedDeviceParams) {
  const focusedRowRef = useRef<HTMLDivElement | null>(null);

  // Intentionally narrow the dependency list to `focusedDeviceId` so
  // the effect only fires on a fresh focus signal — we don't want to
  // re-scroll the panel every time the upstream `devices` array
  // identity changes.
  useEffect(() => {
    if (!focusedDeviceId) return;
    const type = findDeviceType(devices, focusedDeviceId);
    if (!type) return;
    setExpandedId(focusedDeviceId);
    setSelectedTypes((prev) => {
      if (prev.length === 0 || prev.includes(type)) return prev;
      return [...prev, type];
    });
    setQuery('');
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      focusedRowRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedDeviceId]);

  return focusedRowRef;
}
