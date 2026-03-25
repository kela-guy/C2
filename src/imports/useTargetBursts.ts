import { useMemo } from 'react';
import type { Detection } from './ListOfSystems';
import { TYPE_LABELS } from './useTargetFilters';
import { getCreatedAtMs } from './useActivityStatus';

const BURST_WINDOW_MS = 10_000;
const MIN_BURST_SIZE = 4;

export interface TargetBurst {
  kind: 'burst';
  id: string;
  targets: Detection[];
  firstTimestamp: string;
  lastTimestamp: string;
  typeBreakdown: Record<string, number>;
}

export type BurstOrTarget = Detection | TargetBurst;

export function isBurst(item: BurstOrTarget): item is TargetBurst {
  return 'kind' in item && item.kind === 'burst';
}

function buildTypeBreakdown(targets: Detection[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of targets) {
    const type = t.classifiedType ?? t.type ?? 'unknown';
    const label = TYPE_LABELS[type] ?? type;
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}

export function groupIntoBursts(targets: Detection[]): BurstOrTarget[] {
  if (targets.length < MIN_BURST_SIZE) return targets;

  const groups: Detection[][] = [];
  let current: Detection[] = [targets[0]];

  for (let i = 1; i < targets.length; i++) {
    const gap =
      Math.abs(getCreatedAtMs(targets[i]) - getCreatedAtMs(targets[i - 1]));

    if (gap <= BURST_WINDOW_MS) {
      current.push(targets[i]);
    } else {
      groups.push(current);
      current = [targets[i]];
    }
  }
  groups.push(current);

  const result: BurstOrTarget[] = [];
  for (const group of groups) {
    if (group.length < MIN_BURST_SIZE) {
      result.push(...group);
    } else {
      const timestamps = group.map((target) => getCreatedAtMs(target));
      result.push({
        kind: 'burst',
        id: `burst-${group[0].id}`,
        targets: group,
        firstTimestamp: group[timestamps.indexOf(Math.min(...timestamps))].timestamp,
        lastTimestamp: group[timestamps.indexOf(Math.max(...timestamps))].timestamp,
        typeBreakdown: buildTypeBreakdown(group),
      });
    }
  }

  return result;
}

export function useTargetBursts(targets: Detection[]): BurstOrTarget[] {
  return useMemo(() => groupIntoBursts(targets), [targets]);
}
