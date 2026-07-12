/**
 * `/status-sandbox` — mock entity set + tick-driven simulator.
 *
 * Self-contained data layer for the entity-status design exploration.
 * A small sim clock (500ms ticks) drives per-entity "reports": every
 * reporting entity refreshes its `lastSeenMs` on its own interval, so
 * recency-based designs (heartbeat / staleness decay) have real data to
 * visualize. Health can be forced per entity, an entity can be *muted*
 * (stops reporting without changing its declared health — the silent
 * failure case the exploration exists for), and a scripted degradation
 * timeline walks one entity through ok → stale → warning → error →
 * offline → recovered on loop.
 *
 * No production module imports anything from here.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type SimHealth = 'ok' | 'warning' | 'error' | 'offline';
export type SimKind = 'camera' | 'radar' | 'sensor' | 'lidar' | 'gotcha' | 'launcher';

export interface SimEntity {
  id: string;
  name: string;
  kind: SimKind;
  health: SimHealth;
  /** Sim-clock ms of the last received report. Frozen while offline/muted. */
  lastSeenMs: number;
  /** How often the entity reports while it is alive. */
  reportIntervalMs: number;
  /** Reports suppressed WITHOUT changing health — the "silently stale" case. */
  muted: boolean;
  /** Position on the mini map tile, 0..1 fractions. */
  x: number;
  y: number;
}

export const SIM_TICK_MS = 500;

/** An entity that hasn't reported for this long reads as "stale". */
export const STALE_AFTER_MS = 6000;

export const SIM_HEALTHS: SimHealth[] = ['ok', 'warning', 'error', 'offline'];

export const KIND_LABELS: Record<SimKind, string> = {
  camera: 'Camera',
  radar: 'Radar',
  sensor: 'Jammer',
  lidar: 'Lidar',
  gotcha: 'Gotcha',
  launcher: 'Launcher',
};

/** The 6 hand-placed entities the aside controls operate on. */
const BASE_COUNT = 6;

function makeBaseEntities(): SimEntity[] {
  const base: Array<Pick<SimEntity, 'id' | 'name' | 'kind' | 'x' | 'y'>> = [
    { id: 'cam-north', name: 'North Camera', kind: 'camera', x: 0.24, y: 0.26 },
    { id: 'radar-east', name: 'East Radar', kind: 'radar', x: 0.66, y: 0.18 },
    { id: 'jammer-1', name: 'Jammer 1', kind: 'sensor', x: 0.82, y: 0.52 },
    { id: 'lidar-gate', name: 'Gate Lidar', kind: 'lidar', x: 0.44, y: 0.5 },
    { id: 'gotcha-west', name: 'Gotcha West', kind: 'gotcha', x: 0.22, y: 0.74 },
    { id: 'launcher-2', name: 'Launcher 2', kind: 'launcher', x: 0.66, y: 0.82 },
  ];
  return base.map((e, i) => ({
    ...e,
    health: 'ok',
    // Stagger initial reports so heartbeat blips never fire in sync.
    lastSeenMs: -Math.round(i * 730) % 2500,
    reportIntervalMs: 2000 + (i % 3) * 700,
    muted: false,
  }));
}

/** Deterministic pseudo-random for the high-density extras. */
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 48271) % 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const DENSITY_EXTRA_COUNT = 18;

function makeDensityExtras(): SimEntity[] {
  const rand = lcg(1337);
  const kinds: SimKind[] = ['camera', 'radar', 'sensor', 'lidar', 'gotcha', 'launcher'];
  const out: SimEntity[] = [];
  for (let i = 0; i < DENSITY_EXTRA_COUNT; i++) {
    // A couple of fixed faults so the density stress isn't all-green.
    const health: SimHealth = i === 5 ? 'warning' : i === 11 ? 'offline' : 'ok';
    out.push({
      id: `extra-${i}`,
      name: `Asset ${i + BASE_COUNT + 1}`,
      kind: kinds[i % kinds.length],
      health,
      lastSeenMs: -Math.round(rand() * 2500),
      reportIntervalMs: 2000 + Math.round(rand() * 1800),
      muted: false,
      x: 0.06 + rand() * 0.88,
      y: 0.08 + rand() * 0.84,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** True when the entity claims to be alive but hasn't reported recently. */
export function isStale(entity: SimEntity, now: number): boolean {
  return entity.health !== 'offline' && now - entity.lastSeenMs > STALE_AFTER_MS;
}

export function secondsSinceReport(entity: SimEntity, now: number): number {
  return Math.max(0, Math.round((now - entity.lastSeenMs) / 1000));
}

// ---------------------------------------------------------------------------
// Degradation timeline — a scripted loop applied to the first base entity.
// ---------------------------------------------------------------------------

interface TimelineStep {
  untilMs: number;
  health: SimHealth;
  muted: boolean;
  label: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { untilMs: 4000, health: 'ok', muted: false, label: 'Nominal — reporting' },
  { untilMs: 10000, health: 'ok', muted: true, label: 'Silently stops reporting (health still "ok")' },
  { untilMs: 16000, health: 'warning', muted: false, label: 'Degrades to warning' },
  { untilMs: 22000, health: 'error', muted: false, label: 'Fault — error' },
  { untilMs: 28000, health: 'offline', muted: false, label: 'Link lost — offline' },
  { untilMs: 32000, health: 'ok', muted: false, label: 'Recovers — reporting again' },
];

const TIMELINE_CYCLE_MS = TIMELINE_STEPS[TIMELINE_STEPS.length - 1].untilMs;

export const TIMELINE_TARGET_ID = 'cam-north';

function timelineStepAt(elapsedMs: number): TimelineStep {
  const t = elapsedMs % TIMELINE_CYCLE_MS;
  return TIMELINE_STEPS.find((s) => t < s.untilMs) ?? TIMELINE_STEPS[0];
}

// ---------------------------------------------------------------------------
// The simulator hook
// ---------------------------------------------------------------------------

export interface StatusSim {
  /** Sim-clock ms since mount. */
  now: number;
  /** Entities to render (6, or 24 in high-density mode). */
  entities: SimEntity[];
  /** The 6 base entities the aside controls operate on. */
  controllable: SimEntity[];
  setHealth: (id: string, health: SimHealth) => void;
  setAllHealth: (health: SimHealth) => void;
  toggleMuted: (id: string) => void;
  timeline: {
    playing: boolean;
    toggle: () => void;
    /** Label of the current scripted step, null while not playing. */
    stepLabel: string | null;
  };
}

export function useStatusSim(highDensity: boolean): StatusSim {
  const [now, setNow] = useState(0);
  const [entities, setEntities] = useState<SimEntity[]>(() => [
    ...makeBaseEntities(),
    ...makeDensityExtras(),
  ]);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [timelineStepLabel, setTimelineStepLabel] = useState<string | null>(null);
  const timelineStartRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + SIM_TICK_MS), SIM_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Advance reports (and the timeline script) on every tick.
  useEffect(() => {
    const step = timelinePlaying ? timelineStepAt(now - timelineStartRef.current) : null;
    setTimelineStepLabel(step ? step.label : null);

    setEntities((prev) => {
      let changed = false;
      const next = prev.map((e) => {
        let entity = e;
        if (step && entity.id === TIMELINE_TARGET_ID) {
          if (entity.health !== step.health || entity.muted !== step.muted) {
            entity = { ...entity, health: step.health, muted: step.muted };
            changed = true;
          }
        }
        const reporting = entity.health !== 'offline' && !entity.muted;
        if (reporting && now - entity.lastSeenMs >= entity.reportIntervalMs) {
          entity = { ...entity, lastSeenMs: now };
          changed = true;
        }
        return entity;
      });
      return changed ? next : prev;
    });
  }, [now, timelinePlaying]);

  const setHealth = useCallback((id: string, health: SimHealth) => {
    setEntities((prev) => prev.map((e) => (e.id === id ? { ...e, health, muted: false } : e)));
  }, []);

  const setAllHealth = useCallback((health: SimHealth) => {
    setEntities((prev) => prev.map((e) => ({ ...e, health, muted: false })));
  }, []);

  const toggleMuted = useCallback((id: string) => {
    setEntities((prev) => prev.map((e) => (e.id === id ? { ...e, muted: !e.muted } : e)));
  }, []);

  const toggleTimeline = useCallback(() => {
    setTimelinePlaying((playing) => {
      if (!playing) {
        timelineStartRef.current = 0;
      } else {
        // Stopping mid-script: return the target to nominal so it doesn't
        // stay stuck in whatever step happened to be active.
        setEntities((prev) =>
          prev.map((e) =>
            e.id === TIMELINE_TARGET_ID ? { ...e, health: 'ok', muted: false } : e,
          ),
        );
      }
      return !playing;
    });
  }, []);

  // Reset the timeline origin when playback starts so the script begins at step 1.
  useEffect(() => {
    if (timelinePlaying && timelineStartRef.current === 0) {
      timelineStartRef.current = now;
    }
    if (!timelinePlaying) timelineStartRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelinePlaying]);

  const visible = highDensity ? entities : entities.slice(0, BASE_COUNT);

  return {
    now,
    entities: visible,
    controllable: entities.slice(0, BASE_COUNT),
    setHealth,
    setAllHealth,
    toggleMuted,
    timeline: {
      playing: timelinePlaying,
      toggle: toggleTimeline,
      stepLabel: timelineStepLabel,
    },
  };
}
