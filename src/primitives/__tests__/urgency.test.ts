/**
 * Branch table for `resolveTargetSeverity` — locks the derivation order
 * documented in `urgency.ts` (closed-out → engagement → alarm zones →
 * pre-classification → BDA → lifecycle → fallbacks → default) plus the
 * explicit-severity short-circuit of the backend contract.
 */
import { describe, expect, it } from 'vitest';
import {
  resolveTargetSeverity,
  isReceding,
  isUnclassifiedUnknown,
  type TargetStateInput,
} from '../urgency';

describe('resolveTargetSeverity', () => {
  it('short-circuits on an explicit backend severity', () => {
    // status: 'event' would derive CRITICAL — the enriched field wins.
    expect(resolveTargetSeverity({ severity: 'HIGH', status: 'event' })).toBe('HIGH');
    expect(resolveTargetSeverity({ severity: 'LOW', mitigationStatus: 'mitigating' })).toBe('LOW');
  });

  it('collapses closed-out lifecycles to LOW, beating engagement signals', () => {
    expect(resolveTargetSeverity({ status: 'event_resolved' })).toBe('LOW');
    expect(resolveTargetSeverity({ status: 'event_neutralized' })).toBe('LOW');
    expect(resolveTargetSeverity({ status: 'expired' })).toBe('LOW');
    expect(resolveTargetSeverity({ dismissReason: 'operator dismissed' })).toBe('LOW');
    expect(resolveTargetSeverity({ activityStatus: 'dismissed' })).toBe('LOW');
    expect(resolveTargetSeverity({ activityStatus: 'timeout' })).toBe('LOW');
    // Finality outranks an in-flight engagement.
    expect(
      resolveTargetSeverity({ status: 'event_resolved', mitigationStatus: 'mitigating' }),
    ).toBe('LOW');
  });

  it('treats active engagement as CRITICAL', () => {
    expect(resolveTargetSeverity({ mitigationStatus: 'mitigating' })).toBe('CRITICAL');
    for (const phase of ['pointing', 'pointed', 'locking', 'locked'] as const) {
      expect(resolveTargetSeverity({ weaponPointingStatus: phase })).toBe('CRITICAL');
    }
  });

  it('maps alarm zones to CRITICAL / HIGH', () => {
    expect(resolveTargetSeverity({ alarmZone: 'red' })).toBe('CRITICAL');
    expect(resolveTargetSeverity({ alarmZone: 'yellow' })).toBe('HIGH');
  });

  it('gates pre-classification tracks at MEDIUM', () => {
    expect(resolveTargetSeverity({ status: 'suspicion' })).toBe('MEDIUM');
    // raw_detection beats the lifecycle branch even with status: 'detection'.
    expect(
      resolveTargetSeverity({ status: 'detection', entityStage: 'raw_detection' }),
    ).toBe('MEDIUM');
  });

  it('keeps mitigated-with-pending-BDA at HIGH', () => {
    expect(
      resolveTargetSeverity({ mitigationStatus: 'mitigated', bdaStatus: 'looking' }),
    ).toBe('HIGH');
    // BDA complete falls through to the default tier.
    expect(
      resolveTargetSeverity({ mitigationStatus: 'mitigated', bdaStatus: 'complete' }),
    ).toBe('MEDIUM');
  });

  it('derives lifecycle tiers for classified targets', () => {
    expect(resolveTargetSeverity({ status: 'event' })).toBe('CRITICAL');

    expect(resolveTargetSeverity({ status: 'detection' })).toBe('HIGH');
    expect(resolveTargetSeverity({ status: 'detection', classifiedType: 'bird' })).toBe('MEDIUM');
    expect(resolveTargetSeverity({ status: 'detection', affiliation: 'friendly' })).toBe('LOW');
    expect(resolveTargetSeverity({ status: 'detection', affiliation: 'neutral' })).toBe('LOW');
    expect(resolveTargetSeverity({ status: 'detection', affiliation: 'possibleThreat' })).toBe('MEDIUM');
    expect(resolveTargetSeverity({ status: 'detection', affiliation: 'unknown' })).toBe('MEDIUM');
    expect(resolveTargetSeverity({ status: 'detection', affiliation: 'hostile' })).toBe('HIGH');

    expect(resolveTargetSeverity({ status: 'tracking' })).toBe('HIGH');
    expect(resolveTargetSeverity({ status: 'tracking', classifiedType: 'bird' })).toBe('LOW');
    expect(resolveTargetSeverity({ status: 'tracking', affiliation: 'friendly' })).toBe('LOW');
    expect(resolveTargetSeverity({ status: 'tracking', affiliation: 'unknown' })).toBe('MEDIUM');
  });

  it('falls back to LOW for identified non-threats and MEDIUM otherwise', () => {
    expect(resolveTargetSeverity({ classifiedType: 'bird' })).toBe('LOW');
    expect(resolveTargetSeverity({ affiliation: 'friendly' })).toBe('LOW');
    expect(resolveTargetSeverity({ affiliation: 'neutral' })).toBe('LOW');
    expect(resolveTargetSeverity({})).toBe('MEDIUM');
  });
});

describe('isReceding', () => {
  it('is true exactly when severity resolves to LOW', () => {
    expect(isReceding({ status: 'event_resolved' })).toBe(true);
    expect(isReceding({ status: 'event' })).toBe(false);
  });
});

describe('isUnclassifiedUnknown', () => {
  it('requires raw_detection stage AND no classifiedType', () => {
    const raw: TargetStateInput = { entityStage: 'raw_detection' };
    expect(isUnclassifiedUnknown(raw)).toBe(true);
    expect(isUnclassifiedUnknown({ entityStage: 'raw_detection', classifiedType: 'drone' })).toBe(false);
    expect(isUnclassifiedUnknown({ entityStage: 'classified' })).toBe(false);
    expect(isUnclassifiedUnknown({})).toBe(false);
  });
});
