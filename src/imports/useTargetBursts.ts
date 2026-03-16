import { useMemo } from 'react';
import type { Detection } from './ListOfSystems';
import { TYPE_LABELS } from './useTargetFilters';

const BURST_WINDOW_MS = 10_000;
const MIN_BURST_SIZE = 2;

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

function parseTimestamp(ts: string): number {
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.getTime();
  const parts = ts.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (parts) {
    const today = new Date();
    today.setHours(+parts[1], +parts[2], +parts[3], 0);
    return today.getTime();
  }
  return 0;
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

  const sorted = [...targets].sort(
    (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp),
  );

  const groups: Detection[][] = [];
  let current: Detection[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap =
      parseTimestamp(sorted[i].timestamp) -
      parseTimestamp(sorted[i - 1].timestamp);

    if (gap <= BURST_WINDOW_MS) {
      current.push(sorted[i]);
    } else {
      groups.push(current);
      current = [sorted[i]];
    }
  }
  groups.push(current);

  const result: BurstOrTarget[] = [];
  for (const group of groups) {
    if (group.length < MIN_BURST_SIZE) {
      result.push(...group);
    } else {
      const byConfidence = [...group].sort(
        (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
      );
      result.push({
        kind: 'burst',
        id: `burst-${group[0].id}`,
        targets: byConfidence,
        firstTimestamp: group[0].timestamp,
        lastTimestamp: group[group.length - 1].timestamp,
        typeBreakdown: buildTypeBreakdown(group),
      });
    }
  }

  return result;
}

export function useTargetBursts(targets: Detection[]): BurstOrTarget[] {
  return useMemo(() => groupIntoBursts(targets), [targets]);
}
