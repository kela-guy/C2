/**
 * The launch toast as Sonner renders it.
 *
 * The launch simulation must live *inside* the Sonner-rendered subtree so React
 * re-renders the toast on every step. But two other surfaces — the Pathfinder
 * device card and the live map marker — also need to reflect and command the
 * same sequence. So this component:
 *
 *   1. Owns the single `usePathfinderLaunchSim` instance (locked at 1500 ms).
 *   2. Reports each phase/runState change up via `onSimChange` so the Dashboard
 *      can drive the card's flight state and the map kinematics.
 *   3. Publishes its imperative controls (abort / return-to-base) into
 *      `controlsRef` so the card's Stop / Return-to-dock buttons can command the
 *      sequence that lives in here.
 *
 * `onSimChange` and `controlsRef` must be stable across the toast's life — they
 * are captured once when `toast.custom(() => <SonnerPathfinderToast … />)` fires.
 */

import { useEffect, type MutableRefObject } from 'react';
import { PathfinderLaunchToast } from './PathfinderLaunchToast';
import {
  usePathfinderLaunchSim,
  type PathfinderSim,
} from './usePathfinderLaunchSim';
import {
  PATHFINDER_LAUNCH_SPEED_MS,
  type LaunchPhase,
  type Locale,
} from './launchSequence';

export interface PathfinderSimSnapshot {
  phase: LaunchPhase;
  runState: PathfinderSim['runState'];
}

export interface PathfinderControls {
  abort: () => void;
  returnToBase: () => void;
}

export interface SonnerPathfinderToastProps {
  locale: Locale;
  /** Dismiss the toast from a terminal state (done / aborted). */
  onClose: () => void;
  /** Fires on every phase/runState change so external surfaces stay in sync. */
  onSimChange: (snapshot: PathfinderSimSnapshot) => void;
  /** Receives the live abort / return-to-base controls for this sequence. */
  controlsRef: MutableRefObject<PathfinderControls | null>;
}

export function SonnerPathfinderToast({
  locale,
  onClose,
  onSimChange,
  controlsRef,
}: SonnerPathfinderToastProps) {
  const sim = usePathfinderLaunchSim({
    speedMs: PATHFINDER_LAUNCH_SPEED_MS,
    failStepId: null,
  });

  // Publish controls so the device card (and map) can command this sequence.
  useEffect(() => {
    controlsRef.current = { abort: sim.abort, returnToBase: sim.returnToBase };
    return () => {
      controlsRef.current = null;
    };
  }, [controlsRef, sim.abort, sim.returnToBase]);

  // Report phase/runState transitions outward.
  useEffect(() => {
    onSimChange({ phase: sim.phase, runState: sim.runState });
  }, [onSimChange, sim.phase, sim.runState]);

  return <PathfinderLaunchToast sim={sim} locale={locale} onDismiss={onClose} />;
}
