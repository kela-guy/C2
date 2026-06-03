/**
 * Per-row timed "Notifications" attention window.
 *
 * Arming starts a `NOTIFY_WINDOW_S` countdown that keeps ticking after the
 * overflow menu closes or the row collapses, and auto-disarms when it
 * lapses. The armed flag + live `remaining` are read by both the overflow
 * toggle and the always-visible header indicator. Each arm/disarm reports
 * to the optional `onArm` callback (the only thing wired to the consumer);
 * the countdown itself is in-memory, matching `useMutedDevices`.
 */

import { useCallback, useEffect, useState } from 'react';
import { NOTIFY_WINDOW_S } from './constants';

export interface UseDeviceNotifyReturn {
  armed: boolean;
  /** Remaining window in seconds (whole), valid while `armed`. */
  remaining: number;
  /** Arm if disarmed, disarm if armed. */
  toggle: () => void;
}

export function useDeviceNotify(
  deviceId: string,
  online: boolean,
  onArm?: (deviceId: string, armed: boolean) => void,
): UseDeviceNotifyReturn {
  const [armed, setArmed] = useState(false);
  const [remaining, setRemaining] = useState(NOTIFY_WINDOW_S);

  // The countdown lives here (not in the menu row) so it survives the menu
  // closing and the row collapsing; it auto-disarms when the window lapses.
  useEffect(() => {
    if (!armed) return;
    setRemaining(NOTIFY_WINDOW_S);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const left = NOTIFY_WINDOW_S - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) setArmed(false);
      else setRemaining(left);
    }, 250);
    return () => window.clearInterval(tick);
  }, [armed]);

  // Going offline forces the window closed.
  useEffect(() => {
    if (!online) setArmed(false);
  }, [online]);

  const toggle = useCallback(() => {
    setArmed((prev) => {
      const next = !prev;
      onArm?.(deviceId, next);
      return next;
    });
  }, [deviceId, onArm]);

  return { armed, remaining, toggle };
}
