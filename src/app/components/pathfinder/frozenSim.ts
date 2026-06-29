/**
 * Frozen Pathfinder sim snapshots — a `PathfinderSim` posed in a fixed state
 * with no-op controls, for side-by-side "state gallery" displays where nothing
 * should auto-advance. Mirrors the helper used by `/pathfinder-sandbox`.
 */

import {
  PREPARE_STEPS,
  TAKEOFF_STEPS,
  RETURN_STEPS,
  type LaunchPhase,
  type LaunchStep,
  type StepStatus,
} from './launchSequence';
import type { PathfinderSim, RunState } from './usePathfinderLaunchSim';

const noop = () => {};

/** Build a status map: everything before `activeIndex` done, the rest pending. */
export function buildStatuses(
  steps: LaunchStep[],
  activeIndex: number,
  opts?: { error?: boolean; allDone?: boolean },
): Record<string, StepStatus> {
  const m: Record<string, StepStatus> = {};
  steps.forEach((s, i) => {
    if (opts?.allDone) m[s.id] = 'done';
    else if (i < activeIndex) m[s.id] = 'done';
    else if (i === activeIndex) m[s.id] = opts?.error ? 'error' : 'active';
    else m[s.id] = 'pending';
  });
  return m;
}

export function frozenSim(opts: {
  phase: LaunchPhase;
  steps: LaunchStep[];
  statuses: Record<string, StepStatus>;
  activeId: string | null;
  runState: RunState;
}): PathfinderSim {
  const total = opts.steps.length;
  const completed = opts.steps.filter((s) => opts.statuses[s.id] === 'done').length;
  return {
    phase: opts.phase,
    runState: opts.runState,
    paused: true,
    steps: opts.steps,
    statuses: opts.statuses,
    activeId: opts.activeId,
    completed,
    total,
    progress: total ? completed / total : 0,
    play: noop,
    pause: noop,
    restart: noop,
    takeoff: noop,
    returnToBase: noop,
    retry: noop,
    abort: noop,
    stepForward: noop,
  };
}

export interface PathfinderGalleryItem {
  title: string;
  note: string;
  sim: PathfinderSim;
}

/** Every key launch state, frozen for side-by-side review. */
export const PATHFINDER_GALLERY: PathfinderGalleryItem[] = [
  {
    title: 'Prepare · gate check',
    note: 'Auto-running through a verification gate.',
    sim: frozenSim({
      phase: 'prepare',
      steps: PREPARE_STEPS,
      statuses: buildStatuses(PREPARE_STEPS, 3),
      activeId: PREPARE_STEPS[3].id,
      runState: 'running',
    }),
  },
  {
    title: 'Halted · fault',
    note: 'A gate failed; operator can retry.',
    sim: frozenSim({
      phase: 'prepare',
      steps: PREPARE_STEPS,
      statuses: buildStatuses(PREPARE_STEPS, 7, { error: true }),
      activeId: PREPARE_STEPS[7].id,
      runState: 'error',
    }),
  },
  {
    title: 'Ready · takeoff CTA',
    note: 'Prepare complete, waiting for operator.',
    sim: frozenSim({
      phase: 'prepare',
      steps: PREPARE_STEPS,
      statuses: buildStatuses(PREPARE_STEPS, PREPARE_STEPS.length, { allDone: true }),
      activeId: null,
      runState: 'awaiting-takeoff',
    }),
  },
  {
    title: 'Takeoff · executing',
    note: 'Deploy + departure sequence running.',
    sim: frozenSim({
      phase: 'takeoff',
      steps: TAKEOFF_STEPS,
      statuses: buildStatuses(TAKEOFF_STEPS, 3),
      activeId: TAKEOFF_STEPS[3].id,
      runState: 'running',
    }),
  },
  {
    title: 'On station · loiter',
    note: 'Open-ended loiter; waiting for RTB.',
    sim: frozenSim({
      phase: 'takeoff',
      steps: TAKEOFF_STEPS,
      statuses: buildStatuses(TAKEOFF_STEPS, TAKEOFF_STEPS.length - 1),
      activeId: TAKEOFF_STEPS[TAKEOFF_STEPS.length - 1].id,
      runState: 'loiter',
    }),
  },
  {
    title: 'Aborted',
    note: 'Operator called off the launch.',
    sim: frozenSim({
      phase: 'prepare',
      steps: PREPARE_STEPS,
      statuses: buildStatuses(PREPARE_STEPS, 5),
      activeId: null,
      runState: 'aborted',
    }),
  },
  {
    title: 'Docked',
    note: 'Returned to station and secured.',
    sim: frozenSim({
      phase: 'return',
      steps: RETURN_STEPS,
      statuses: buildStatuses(RETURN_STEPS, RETURN_STEPS.length, { allDone: true }),
      activeId: null,
      runState: 'done',
    }),
  },
];
