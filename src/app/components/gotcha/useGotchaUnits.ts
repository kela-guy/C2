/**
 * React state hook for Gotcha effector units.
 *
 * Seeds from the static `GOTCHA_UNITS` registry and exposes the setter so
 * future websocket / admin wiring can push live health + latency updates
 * without the consumer changing. Static today, like the rest of the
 * dashboard's asset state.
 */

import { useState } from 'react';
import { GOTCHA_UNITS } from './gotchaAssets';
import type { GotchaUnit } from './types';

export interface UseGotchaUnits {
  units: GotchaUnit[];
  setUnits: React.Dispatch<React.SetStateAction<GotchaUnit[]>>;
}

export function useGotchaUnits(): UseGotchaUnits {
  const [units, setUnits] = useState<GotchaUnit[]>(GOTCHA_UNITS);
  return { units, setUnits };
}
