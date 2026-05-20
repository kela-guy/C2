import { describe, expect, it } from 'vitest';
import type { Detection } from '@/imports/ListOfSystems';

function isTerminalForHistory(target: Detection): boolean {
  if (target.activityStatus === 'dismissed' || target.activityStatus === 'mitigated' || target.activityStatus === 'timeout') {
    return true;
  }
  if (target.mitigationStatus === 'mitigated') return true;
  return false;
}

describe('closed-track terminal gating', () => {
  it('records mitigated targets when activityStatus was not flipped', () => {
    const target = {
      id: 't1',
      mitigationStatus: 'mitigated',
      activityStatus: 'active',
    } as Detection;
    expect(isTerminalForHistory(target)).toBe(true);
  });

  it('records dismissed targets', () => {
    const target = {
      id: 't2',
      activityStatus: 'dismissed',
    } as Detection;
    expect(isTerminalForHistory(target)).toBe(true);
  });
});
