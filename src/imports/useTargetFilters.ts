import { useState, useMemo, useCallback } from 'react';
import type { Detection } from './ListOfSystems';

export interface FilterState {
  query: string;
  confidence: [number, number];
  active: 'all' | 'active' | 'inactive';
  domain: 'all' | 'ground' | 'air';
  investigated: 'all' | 'investigated' | 'not_investigated';
  sensorIds: string[];
  lastSeenWithin: number | null;
  types: string[];
  signatureTypes: string[];
  sortBy: 'time' | 'confidence' | 'distance';
}

export const DEFAULT_FILTERS: FilterState = {
  query: '',
  confidence: [0, 100],
  active: 'all',
  domain: 'all',
  investigated: 'all',
  sensorIds: [],
  lastSeenWithin: null,
  types: [],
  signatureTypes: [],
  sortBy: 'time',
};

export type FilterKey = Exclude<keyof FilterState, 'sortBy'>;

export interface ActiveFilter {
  key: FilterKey;
  label: string;
  valueLabel: string;
}

const FILTER_LABELS: Record<FilterKey, string> = {
  confidence: 'ביטחון',
  active: 'סטטוס',
  domain: 'תחום',
  investigated: 'חקירה',
  sensorIds: 'חיישנים',
  lastSeenWithin: 'נראה לאחרונה',
  types: 'סוג',
  signatureTypes: 'חתימה',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
};

const DOMAIN_LABELS: Record<string, string> = {
  air: 'אויר',
  ground: 'קרקע',
};

const INVESTIGATED_LABELS: Record<string, string> = {
  investigated: 'נחקר',
  not_investigated: 'לא נחקר',
};

const LAST_SEEN_LABELS: Record<number, string> = {
  60: '< 1 דק\'',
  300: '< 5 דק\'',
  1800: '< 30 דק\'',
  3600: '< 1 שעה',
};

export const TYPE_LABELS: Record<string, string> = {
  drone: 'רחפן',
  bird: 'ציפור',
  unknown: 'לא ידוע',
  uav: 'רחפן',
  missile: 'טיל',
  aircraft: 'מטוס',
  vehicle: 'רכב',
  person: 'אדם',
};

export const SIGNATURE_LABELS: Record<string, string> = {
  acoustic: 'אקוסטי',
  sigint: 'סיגינט',
  visual: 'חזותי',
  radar: 'מכ"מ',
};

export function useTargetFilters(targets: Detection[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const availableSensors = useMemo(() => {
    const map = new Map<string, string>();
    targets.forEach(t => {
      t.detectedBySensors?.forEach(s => map.set(s.id, s.typeLabel));
      t.contributingSensors?.forEach(s => map.set(s.sensorId, s.sensorType));
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [targets]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    const seenLabels = new Set<string>();
    targets.forEach(t => {
      if (t.classifiedType) set.add(t.classifiedType);
      if (t.type) set.add(t.type);
    });
    return Array.from(set).filter(type => {
      const label = TYPE_LABELS[type] ?? type;
      if (seenLabels.has(label)) return false;
      seenLabels.add(label);
      return true;
    });
  }, [targets]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.confidence[0] > 0 || filters.confidence[1] < 100) count++;
    if (filters.active !== 'all') count++;
    if (filters.domain !== 'all') count++;
    if (filters.investigated !== 'all') count++;
    if (filters.sensorIds.length > 0) count++;
    if (filters.lastSeenWithin !== null) count++;
    if (filters.types.length > 0) count++;
    if (filters.signatureTypes.length > 0) count++;
    return count;
  }, [filters]);

  const getActiveFilters = useCallback((): ActiveFilter[] => {
    const active: ActiveFilter[] = [];

    if (filters.confidence[0] > 0 || filters.confidence[1] < 100) {
      active.push({
        key: 'confidence',
        label: FILTER_LABELS.confidence,
        valueLabel: `${filters.confidence[0]}–${filters.confidence[1]}%`,
      });
    }
    if (filters.active !== 'all') {
      active.push({
        key: 'active',
        label: FILTER_LABELS.active,
        valueLabel: STATUS_LABELS[filters.active] ?? filters.active,
      });
    }
    if (filters.domain !== 'all') {
      active.push({
        key: 'domain',
        label: FILTER_LABELS.domain,
        valueLabel: DOMAIN_LABELS[filters.domain] ?? filters.domain,
      });
    }
    if (filters.investigated !== 'all') {
      active.push({
        key: 'investigated',
        label: FILTER_LABELS.investigated,
        valueLabel: INVESTIGATED_LABELS[filters.investigated] ?? filters.investigated,
      });
    }
    if (filters.sensorIds.length > 0) {
      const sensorLabels = filters.sensorIds.map(id => {
        const found = availableSensors.find(s => s.id === id);
        return found?.label ?? id;
      });
      active.push({
        key: 'sensorIds',
        label: FILTER_LABELS.sensorIds,
        valueLabel: sensorLabels.join(', '),
      });
    }
    if (filters.lastSeenWithin !== null) {
      active.push({
        key: 'lastSeenWithin',
        label: FILTER_LABELS.lastSeenWithin,
        valueLabel: LAST_SEEN_LABELS[filters.lastSeenWithin] ?? `${filters.lastSeenWithin}s`,
      });
    }
    if (filters.types.length > 0) {
      active.push({
        key: 'types',
        label: FILTER_LABELS.types,
        valueLabel: filters.types.map(t => TYPE_LABELS[t] ?? t).join(', '),
      });
    }
    if (filters.signatureTypes.length > 0) {
      active.push({
        key: 'signatureTypes',
        label: FILTER_LABELS.signatureTypes,
        valueLabel: filters.signatureTypes.map(s => SIGNATURE_LABELS[s] ?? s).join(', '),
      });
    }

    return active;
  }, [filters, availableSensors]);

  const applyFilters = useCallback((list: Detection[]): Detection[] => {
    let result = list;

    if (filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.classifiedType && TYPE_LABELS[t.classifiedType]?.toLowerCase().includes(q)) ||
        (t.type && TYPE_LABELS[t.type]?.toLowerCase().includes(q))
      );
    }

    if (filters.confidence[0] > 0 || filters.confidence[1] < 100) {
      result = result.filter(t => {
        const c = (t.confidence ?? 0) * 100;
        return c >= filters.confidence[0] && c <= filters.confidence[1];
      });
    }

    if (filters.active === 'active') {
      result = result.filter(t => ['detection', 'tracking', 'event', 'suspicion'].includes(t.status));
    } else if (filters.active === 'inactive') {
      result = result.filter(t => ['event_neutralized', 'event_resolved', 'expired'].includes(t.status));
    }

    if (filters.domain === 'air') {
      result = result.filter(t => t.type === 'uav' || t.type === 'missile' || t.type === 'aircraft' || t.classifiedType === 'drone' || t.classifiedType === 'bird');
    } else if (filters.domain === 'ground') {
      result = result.filter(t => t.type === 'unknown' || t.type === 'vehicle' || t.type === 'person');
    }

    if (filters.investigated === 'investigated') {
      result = result.filter(t => t.entityStage === 'classified' || t.flowPhase === 'investigate' || t.flowPhase === 'decide');
    } else if (filters.investigated === 'not_investigated') {
      result = result.filter(t => t.entityStage === 'raw_detection' || !t.entityStage);
    }

    if (filters.sensorIds.length > 0) {
      result = result.filter(t => {
        const sensorIds = [
          ...(t.detectedBySensors?.map(s => s.id) ?? []),
          ...(t.contributingSensors?.map(s => s.sensorId) ?? []),
        ];
        return filters.sensorIds.some(id => sensorIds.includes(id));
      });
    }

    if (filters.types.length > 0) {
      const selectedLabels = new Set(filters.types.map(t => TYPE_LABELS[t] ?? t));
      result = result.filter(t => {
        const classifiedLabel = TYPE_LABELS[t.classifiedType ?? ''] ?? t.classifiedType ?? '';
        const typeLabel = TYPE_LABELS[t.type] ?? t.type;
        return selectedLabels.has(classifiedLabel) || selectedLabels.has(typeLabel);
      });
    }

    if (filters.signatureTypes.length > 0) {
      result = result.filter(t => {
        const sensorTypes = [
          ...(t.detectedBySensors?.map(s => s.typeLabel.toLowerCase()) ?? []),
          ...(t.contributingSensors?.map(s => s.sensorType.toLowerCase()) ?? []),
        ];
        return filters.signatureTypes.some(sig =>
          sensorTypes.some(st => st.includes(sig))
        );
      });
    }

    const sortFn = (a: Detection, b: Detection) => {
      if (filters.sortBy === 'confidence') return (b.confidence ?? 0) - (a.confidence ?? 0);
      return 0;
    };
    result = [...result].sort(sortFn);

    return result;
  }, [filters]);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = useCallback((key: FilterKey) => {
    setFilters(prev => ({ ...prev, [key]: DEFAULT_FILTERS[key] }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const toggleSensorId = useCallback((id: string) => {
    setFilters(prev => ({
      ...prev,
      sensorIds: prev.sensorIds.includes(id)
        ? prev.sensorIds.filter(s => s !== id)
        : [...prev.sensorIds, id],
    }));
  }, []);

  const toggleType = useCallback((type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  const toggleSignature = useCallback((sig: string) => {
    setFilters(prev => ({
      ...prev,
      signatureTypes: prev.signatureTypes.includes(sig)
        ? prev.signatureTypes.filter(s => s !== sig)
        : [...prev.signatureTypes, sig],
    }));
  }, []);

  return {
    filters,
    activeFilterCount,
    availableSensors,
    availableTypes,
    getActiveFilters,
    applyFilters,
    updateFilter,
    removeFilter,
    resetFilters,
    toggleSensorId,
    toggleType,
    toggleSignature,
  };
}
