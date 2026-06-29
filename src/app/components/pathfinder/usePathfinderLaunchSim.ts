/**
 * Drives the Pathfinder takeoff lifecycle.
 *
 * Mirrors the real control flow without any backend: prepare steps auto-run and
 * then gate on an operator "Takeoff" click; takeoff steps auto-run to an
 * open-ended loiter that waits for a return-to-base command; an optional
 * injected fault halts the sequence on a chosen step until retried. The same
 * hook powers the production launch toast and the `/pathfinder-sandbox` surface.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PREPARE_STEPS,
  TAKEOFF_STEPS,
  RETURN_STEPS,
  LOITER_STEP_ID,
  type LaunchPhase,
  type LaunchStep,
  type StepStatus,
} from './launchSequence';

export type RunState =
  | 'running'
  | 'awaiting-takeoff'
  | 'loiter'
  | 'error'
  | 'aborted'
  | 'done';

interface SimState {
  phase: LaunchPhase;
  /** Index into the current phase's step list; -1 = nothing active. */
  activeIndex: number;
  statuses: Record<string, StepStatus>;
  runState: RunState;
  paused: boolean;
}

export interface SimConfig {
  /** Milliseconds each step dwells before resolving. */
  speedMs: number;
  /** Step id that should fail once (cleared on retry). null = no fault. */
  failStepId: string | null;
}

function stepsForPhase(phase: LaunchPhase): LaunchStep[] {
  switch (phase) {
    case 'prepare':
      return PREPARE_STEPS;
    case 'takeoff':
      return TAKEOFF_STEPS;
    case 'return':
      return RETURN_STEPS;
  }
}

function pendingStatuses(steps: LaunchStep[]): Record<string, StepStatus> {
  return Object.fromEntries(steps.map((s) => [s.id, 'pending' as StepStatus]));
}

function initialState(): SimState {
  return {
    phase: 'prepare',
    activeIndex: -1,
    statuses: pendingStatuses(PREPARE_STEPS),
    runState: 'running',
    paused: false,
  };
}

export interface PathfinderSim {
  phase: LaunchPhase;
  runState: RunState;
  paused: boolean;
  steps: LaunchStep[];
  statuses: Record<string, StepStatus>;
  activeId: string | null;
  /** Completed steps in the current phase. */
  completed: number;
  total: number;
  /** 0..1 progress within the current phase. */
  progress: number;
  play: () => void;
  pause: () => void;
  restart: () => void;
  takeoff: () => void;
  returnToBase: () => void;
  retry: () => void;
  abort: () => void;
  stepForward: () => void;
}

export function usePathfinderLaunchSim(config: SimConfig): PathfinderSim {
  const [state, setState] = useState<SimState>(initialState);
  // Steps that already consumed their injected fault — they pass on retry.
  const retriedRef = useRef<Set<string>>(new Set());
  // Always-fresh mirror of `config` for the advance() closure, kept current via
  // an effect so we never write a ref during render.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  /** Advance the sequence by exactly one beat. Pure w.r.t. the prev snapshot. */
  const advance = useCallback((prev: SimState): SimState => {
    if (prev.runState !== 'running') return prev;
    const list = stepsForPhase(prev.phase);

    // Kick off the first step of a freshly entered phase.
    if (prev.activeIndex < 0) {
      const first = list[0];
      return {
        ...prev,
        activeIndex: 0,
        statuses: { ...prev.statuses, [first.id]: 'active' },
      };
    }

    const active = list[prev.activeIndex];
    const { failStepId } = configRef.current;

    // Injected fault: halt on this step until retried.
    if (failStepId === active.id && !retriedRef.current.has(active.id)) {
      return {
        ...prev,
        statuses: { ...prev.statuses, [active.id]: 'error' },
        runState: 'error',
      };
    }

    const statuses = { ...prev.statuses, [active.id]: 'done' as StepStatus };
    const nextIndex = prev.activeIndex + 1;

    // Reached the end of this phase's list.
    if (nextIndex >= list.length) {
      if (prev.phase === 'prepare') {
        return { ...prev, statuses, activeIndex: -1, runState: 'awaiting-takeoff' };
      }
      // 'return' phase complete → docked.
      return { ...prev, statuses, activeIndex: -1, runState: 'done' };
    }

    const next = list[nextIndex];
    statuses[next.id] = 'active';
    // The loiter step is open-ended: become active and wait for RTB.
    const runState: RunState = next.id === LOITER_STEP_ID ? 'loiter' : 'running';
    return { ...prev, statuses, activeIndex: nextIndex, runState };
  }, []);

  // Auto-advance timer.
  useEffect(() => {
    if (state.paused || state.runState !== 'running') return;
    const id = setInterval(() => setState((prev) => advance(prev)), config.speedMs);
    return () => clearInterval(id);
  }, [state.paused, state.runState, state.phase, config.speedMs, advance]);

  const play = useCallback(() => setState((s) => ({ ...s, paused: false })), []);
  const pause = useCallback(() => setState((s) => ({ ...s, paused: true })), []);

  const restart = useCallback(() => {
    retriedRef.current = new Set();
    setState(initialState());
  }, []);

  const takeoff = useCallback(() => {
    setState((s) => {
      if (s.runState !== 'awaiting-takeoff') return s;
      return {
        phase: 'takeoff',
        activeIndex: -1,
        statuses: pendingStatuses(TAKEOFF_STEPS),
        runState: 'running',
        paused: false,
      };
    });
  }, []);

  const returnToBase = useCallback(() => {
    setState((s) => {
      if (s.runState !== 'loiter') return s;
      return {
        phase: 'return',
        activeIndex: -1,
        statuses: {
          ...pendingStatuses(RETURN_STEPS),
        },
        runState: 'running',
        paused: false,
      };
    });
  }, []);

  const retry = useCallback(() => {
    setState((s) => {
      if (s.runState !== 'error') return s;
      const list = stepsForPhase(s.phase);
      const active = list[s.activeIndex];
      if (!active) return s;
      retriedRef.current.add(active.id);
      return {
        ...s,
        statuses: { ...s.statuses, [active.id]: 'active' },
        runState: 'running',
      };
    });
  }, []);

  // Operator-commanded cancel. Freezes the current step and parks the sequence
  // in a terminal `aborted` state; `restart` re-arms from the top.
  const abort = useCallback(() => {
    setState((s) => {
      if (s.runState === 'done' || s.runState === 'aborted') return s;
      const list = stepsForPhase(s.phase);
      const active = list[s.activeIndex];
      const statuses = active
        ? { ...s.statuses, [active.id]: 'pending' as StepStatus }
        : s.statuses;
      return { ...s, statuses, activeIndex: -1, runState: 'aborted', paused: true };
    });
  }, []);

  const stepForward = useCallback(() => setState((prev) => advance(prev)), [advance]);

  const steps = useMemo(() => stepsForPhase(state.phase), [state.phase]);
  const completed = useMemo(
    () => steps.filter((s) => state.statuses[s.id] === 'done').length,
    [steps, state.statuses],
  );
  const activeId = state.activeIndex >= 0 ? steps[state.activeIndex]?.id ?? null : null;

  return {
    phase: state.phase,
    runState: state.runState,
    paused: state.paused,
    steps,
    statuses: state.statuses,
    activeId,
    completed,
    total: steps.length,
    progress: steps.length ? completed / steps.length : 0,
    play,
    pause,
    restart,
    takeoff,
    returnToBase,
    retry,
    abort,
    stepForward,
  };
}
