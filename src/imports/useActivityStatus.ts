import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityStatus, Detection } from './ListOfSystems';

const ACTIVE_WINDOW_MS = 10_000;
const RECENT_WINDOW_MS = 5 * 60_000;
const TIMEOUT_WINDOW_MS = 30 * 60_000;
const REFRESH_INTERVAL_MS = 5_000;

function parseDisplayTimestamp(timestamp?: string): number {
  if (!timestamp) return Date.now();

  const direct = Date.parse(timestamp);
  if (!Number.isNaN(direct)) return direct;

  const parts = timestamp.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!parts) return Date.now();

  const now = new Date();
  const parsed = new Date(now);
  parsed.setHours(Number(parts[1]), Number(parts[2]), Number(parts[3] ?? '0'), 0);

  // If the display time looks slightly ahead of "now", assume it belonged to the previous day.
  if (parsed.getTime() > now.getTime() + 60_000) {
    parsed.setDate(parsed.getDate() - 1);
  }

  return parsed.getTime();
}

export function getCreatedAtMs(target: Pick<Detection, 'createdAtMs' | 'timestamp'>): number {
  return target.createdAtMs ?? parseDisplayTimestamp(target.timestamp);
}

/**
 * Human-readable "time since detection" phrase (Hebrew, the app's default
 * locale). Bucketed into coarse "less than / more than" tiers rather than an
 * exact duration — the card surfaces *recency at a glance*, not a stopwatch.
 * Used for the activity chip hover tooltip (see ActivityTimestampChip).
 */
export function formatTimeSince(createdAtMs: number, nowMs = Date.now()): string {
  const totalSec = Math.max(0, Math.floor((nowMs - createdAtMs) / 1000));

  if (totalSec < 10) return 'לפני פחות מ-10 שניות';
  if (totalSec < 60) return 'לפני פחות מדקה';

  const min = Math.floor(totalSec / 60);
  if (min < 60) return min === 1 ? 'לפני יותר מדקה' : `לפני יותר מ-${min} דקות`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? 'לפני יותר משעה' : `לפני יותר מ-${hr} שעות`;

  const days = Math.floor(hr / 24);
  return days === 1 ? 'לפני יותר מיום' : `לפני יותר מ-${days} ימים`;
}

export function getPriorityBaseline(
  target: Pick<Detection, 'status' | 'entityStage' | 'flowType'>,
): number {
  if (target.entityStage === 'raw_detection') return 20;
  if (target.flowType === 4) return 55;

  switch (target.status) {
    case 'event':
      return 100;
    case 'tracking':
      return 80;
    case 'detection':
      return 60;
    case 'suspicion':
      return 40;
    case 'event_neutralized':
    case 'event_resolved':
    case 'expired':
    default:
      return 0;
  }
}

function getAlarmZoneWeight(alarmZone?: Detection['alarmZone']): number {
  switch (alarmZone) {
    case 'red':
      return 2_000;
    case 'yellow':
      return 1_000;
    default:
      return 0;
  }
}

export function getActivityStatus(target: Detection, nowMs = Date.now()): ActivityStatus {
  if (target.activityStatus) return target.activityStatus;

  if (target.dismissReason) return 'dismissed';
  if (target.status === 'event_neutralized') return 'mitigated';
  if (target.status === 'event_resolved') return 'mitigated';
  if (target.status === 'expired') return 'timeout';

  const ageMs = Math.max(0, nowMs - getCreatedAtMs(target));

  if (ageMs < ACTIVE_WINDOW_MS) return 'active';
  if (ageMs < RECENT_WINDOW_MS) return 'recently_active';
  if (ageMs > TIMEOUT_WINDOW_MS) return 'timeout';
  return 'recently_active';
}

export function getLifecycleSortRank(status: ActivityStatus): number {
  switch (status) {
    case 'active':
      return 4;
    case 'recently_active':
      return 3;
    case 'timeout':
      return 2;
    case 'dismissed':
      return 1;
    case 'mitigated':
      return 0;
    default:
      return 0;
  }
}

export function getEffectivePriority(target: Detection, nowMs = Date.now()): number {
  const scenarioPriority = target.priority ?? 0;
  const baselinePriority = getPriorityBaseline(target);
  const lifecycleStatus = getActivityStatus(target, nowMs);

  return (
    getAlarmZoneWeight(target.alarmZone) +
    Math.max(scenarioPriority, baselinePriority) +
    getLifecycleSortRank(lifecycleStatus) * 100
  );
}

export function isCompletedActivityStatus(status: ActivityStatus): boolean {
  return status === 'dismissed' || status === 'mitigated' || status === 'timeout';
}

export function compareTargetsByPriority(a: Detection, b: Detection, nowMs = Date.now()): number {
  const priorityDelta = getEffectivePriority(b, nowMs) - getEffectivePriority(a, nowMs);
  if (priorityDelta !== 0) return priorityDelta;

  const lifecycleDelta =
    getLifecycleSortRank(getActivityStatus(b, nowMs)) -
    getLifecycleSortRank(getActivityStatus(a, nowMs));
  if (lifecycleDelta !== 0) return lifecycleDelta;

  return getCreatedAtMs(b) - getCreatedAtMs(a);
}

export function useActivityStatus(targets: Detection[]) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Holds the last emitted map so we can return the same reference when the
  // 5 s refresh tick produces identical statuses — otherwise every tick hands
  // consumers a brand-new Map and forces the whole target list to re-render.
  const prevRef = useRef<Map<string, ActivityStatus> | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return useMemo(() => {
    const next = new Map<string, ActivityStatus>();
    targets.forEach((target) => {
      next.set(target.id, getActivityStatus(target, nowMs));
    });

    const prev = prevRef.current;
    if (prev && prev.size === next.size) {
      let identical = true;
      for (const [id, status] of next) {
        if (prev.get(id) !== status) {
          identical = false;
          break;
        }
      }
      if (identical) return prev;
    }

    prevRef.current = next;
    return next;
  }, [nowMs, targets]);
}
