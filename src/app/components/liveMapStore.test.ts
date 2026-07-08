import { describe, it, expect, vi } from 'vitest';
import { createLiveMapStore, type LiveMapSnapshot } from './liveMapStore';
import type { FriendlyDrone } from './Dashboard';

function makeInitial(): LiveMapSnapshot {
  return {
    friendlyDrones: [],
    hoveredSensorId: null,
    hoveredTargetId: null,
  };
}

describe('createLiveMapStore', () => {
  it('getSnapshot returns the initial snapshot', () => {
    const initial = makeInitial();
    const store = createLiveMapStore(initial);
    expect(store.getSnapshot()).toBe(initial);
  });

  it('setFriendlyDrones replaces the array and notifies subscribers exactly once', () => {
    const store = createLiveMapStore(makeInitial());
    const onChange = vi.fn();
    store.subscribe(onChange);

    const drones = [{ id: 'drone-1' }] as unknown as FriendlyDrone[];
    store.setFriendlyDrones(drones);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().friendlyDrones).toBe(drones);
  });

  it('setHoveredSensorId dedupes when the id is unchanged', () => {
    const store = createLiveMapStore(makeInitial());
    const onChange = vi.fn();
    store.subscribe(onChange);

    store.setHoveredSensorId(null); // same as initial → no notify
    expect(onChange).not.toHaveBeenCalled();

    store.setHoveredSensorId('sensor-1');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().hoveredSensorId).toBe('sensor-1');

    store.setHoveredSensorId('sensor-1'); // repeat → deduped
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('setHoveredTargetId dedupes when the id is unchanged', () => {
    const store = createLiveMapStore(makeInitial());
    const onChange = vi.fn();
    store.subscribe(onChange);

    store.setHoveredTargetId('target-1');
    store.setHoveredTargetId('target-1');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().hoveredTargetId).toBe('target-1');
  });

  it('subscribe returns an unsubscribe function that stops notifications', () => {
    const store = createLiveMapStore(makeInitial());
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);

    store.setHoveredSensorId('sensor-1');
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setHoveredSensorId('sensor-2');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
