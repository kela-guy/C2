import { useState, useMemo, useCallback, useEffect } from 'react';
import { CAMERA_ASSETS, LIDAR_ASSETS, RADAR_ASSETS } from '@/app/components/TacticalMap';
import type { ActivityStatus, Detection } from './ListOfSystems';
import { compareTargetsByPriority, getActivityStatus, getCreatedAtMs } from './useActivityStatus';

export interface FilterState {
  query: string;
  activityStatus: ActivityStatus[];
  detectedByDeviceIds: string[];
  sortBy: 'priority' | 'time';
}

export type FilterScope = 'active' | 'completed';
export type FilterKey = 'activityStatus' | 'detectedByDeviceIds';

export interface ActiveFilter {
  key: FilterKey;
  label: string;
  valueLabel: string;
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  active: 'פעיל',
  recently_active: 'פעיל לאחרונה',
  timeout: 'פג תוקף',
  dismissed: 'נדחה',
  mitigated: 'טופל',
};

export const TYPE_LABELS: Record<string, string> = {
  drone: 'רחפן',
  bird: 'ציפור',
  unknown: 'לא ידוע',
  uav: 'רחפן',
  missile: 'טיל',
  aircraft: 'מטוס',
  naval: 'כלי שיט',
};

function getDefaultActivityStatuses(scope: FilterScope): ActivityStatus[] {
  return scope === 'active'
    ? ['active', 'recently_active']
    : ['timeout', 'dismissed', 'mitigated'];
}

export function useTargetFilters(targets: Detection[], scope: FilterScope) {
  const [filters, setFilters] = useState<FilterState>(() => ({
    query: '',
    activityStatus: getDefaultActivityStatuses(scope),
    detectedByDeviceIds: [],
    sortBy: 'priority',
  }));

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      activityStatus: getDefaultActivityStatuses(scope),
    }));
  }, [scope]);

  const availableSensors = useMemo(() => {
    const map = new Map<string, string>();

    [...CAMERA_ASSETS, ...RADAR_ASSETS, ...LIDAR_ASSETS].forEach((asset) => {
      map.set(asset.id, asset.typeLabel);
    });

    targets.forEach((target) => {
      target.detectedBySensors?.forEach((sensor) => map.set(sensor.id, sensor.typeLabel));
      target.contributingSensors?.forEach((sensor) => map.set(sensor.sensorId, sensor.sensorType));
    });

    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [targets]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    const defaultStatuses = getDefaultActivityStatuses(scope);

    if (
      filters.activityStatus.length !== defaultStatuses.length ||
      filters.activityStatus.some((status) => !defaultStatuses.includes(status))
    ) {
      count++;
    }

    if (filters.detectedByDeviceIds.length > 0) count++;

    return count;
  }, [filters.activityStatus, filters.detectedByDeviceIds, scope]);

  const getActiveFilters = useCallback((): ActiveFilter[] => {
    const active: ActiveFilter[] = [];
    const defaultStatuses = getDefaultActivityStatuses(scope);

    if (
      filters.activityStatus.length !== defaultStatuses.length ||
      filters.activityStatus.some((status) => !defaultStatuses.includes(status))
    ) {
      active.push({
        key: 'activityStatus',
        label: 'סטטוס',
        valueLabel: filters.activityStatus.map((status) => ACTIVITY_STATUS_LABELS[status]).join(', '),
      });
    }

    if (filters.detectedByDeviceIds.length > 0) {
      const deviceLabels = filters.detectedByDeviceIds.map((id) => {
        const found = availableSensors.find((sensor) => sensor.id === id);
        return found?.label ?? id;
      });

      active.push({
        key: 'detectedByDeviceIds',
        label: 'מזהה',
        valueLabel: deviceLabels.join(', '),
      });
    }

    return active;
  }, [availableSensors, filters.activityStatus, filters.detectedByDeviceIds, scope]);

  const applyFilters = useCallback((list: Detection[]): Detection[] => {
    let result = list;
    const nowMs = Date.now();

    if (filters.query.trim()) {
      const query = filters.query.trim().toLowerCase();
      result = result.filter((target) =>
        target.name.toLowerCase().includes(query) ||
        target.id.toLowerCase().includes(query) ||
        (target.classifiedType && (TYPE_LABELS[target.classifiedType] ?? target.classifiedType).toLowerCase().includes(query)) ||
        (target.type && (TYPE_LABELS[target.type] ?? target.type).toLowerCase().includes(query))
      );
    }

    if (filters.activityStatus.length > 0) {
      const selected = new Set(filters.activityStatus);
      result = result.filter((target) => selected.has(getActivityStatus(target, nowMs)));
    }

    if (filters.detectedByDeviceIds.length > 0) {
      result = result.filter((target) => {
        const sensorIds = [
          ...(target.detectedBySensors?.map((sensor) => sensor.id) ?? []),
          ...(target.contributingSensors?.map((sensor) => sensor.sensorId) ?? []),
        ];

        return filters.detectedByDeviceIds.some((id) => sensorIds.includes(id));
      });
    }

    result = [...result].sort((a, b) => {
      if (filters.sortBy === 'time') {
        return getCreatedAtMs(b) - getCreatedAtMs(a);
      }

      return compareTargetsByPriority(a, b, nowMs);
    });

    return result;
  }, [filters]);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = useCallback((key: FilterKey) => {
    if (key === 'activityStatus') {
      setFilters((prev) => ({ ...prev, activityStatus: getDefaultActivityStatuses(scope) }));
      return;
    }

    setFilters((prev) => ({ ...prev, detectedByDeviceIds: [] }));
  }, [scope]);

  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      activityStatus: getDefaultActivityStatuses(scope),
      detectedByDeviceIds: [],
      sortBy: 'priority',
    });
  }, [scope]);

  const toggleSensorId = useCallback((id: string) => {
    setFilters((prev) => ({
      ...prev,
      detectedByDeviceIds: prev.detectedByDeviceIds.includes(id)
        ? prev.detectedByDeviceIds.filter((sensorId) => sensorId !== id)
        : [...prev.detectedByDeviceIds, id],
    }));
  }, []);

  const toggleActivityStatus = useCallback((status: ActivityStatus) => {
    setFilters((prev) => ({
      ...prev,
      activityStatus: prev.activityStatus.includes(status)
        ? prev.activityStatus.filter((value) => value !== status)
        : [...prev.activityStatus, status],
    }));
  }, []);

  return {
    filters,
    activeFilterCount,
    availableSensors,
    getActiveFilters,
    applyFilters,
    updateFilter,
    removeFilter,
    resetFilters,
    toggleSensorId,
    toggleActivityStatus,
  };
}
