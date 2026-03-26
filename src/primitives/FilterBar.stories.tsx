import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useCallback, useMemo } from 'react';
import { expect } from 'storybook/test';
import { FilterBar } from './FilterBar';
import type { FilterState } from '../imports/useTargetFilters';
import type { ActivityStatus } from '../imports/ListOfSystems';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './FilterBar.spec';

const DEFAULT_FILTERS: FilterState = {
  query: '',
  activityStatus: ['active', 'recently_active'],
  detectedByDeviceIds: [],
  sortBy: 'priority',
};

const MOCK_SENSORS = [
  { id: 'pixelsight-1', label: 'Pixelsight צפון' },
  { id: 'regulus-1', label: 'Regulus-1' },
  { id: 'radar-a', label: 'מכ"מ מרכז' },
];

function FilterBarDemo({ initialFilters }: { initialFilters?: Partial<FilterState> }) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    const defaultStatuses: ActivityStatus[] = ['active', 'recently_active'];
    if (
      filters.activityStatus.length !== defaultStatuses.length ||
      filters.activityStatus.some(s => !defaultStatuses.includes(s))
    ) count++;
    if (filters.detectedByDeviceIds.length > 0) count++;
    return count;
  }, [filters.activityStatus, filters.detectedByDeviceIds]);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleActivity = useCallback((status: ActivityStatus) => {
    setFilters(prev => ({
      ...prev,
      activityStatus: prev.activityStatus.includes(status)
        ? prev.activityStatus.filter(s => s !== status)
        : [...prev.activityStatus, status],
    }));
  }, []);

  const toggleSensor = useCallback((id: string) => {
    setFilters(prev => ({
      ...prev,
      detectedByDeviceIds: prev.detectedByDeviceIds.includes(id)
        ? prev.detectedByDeviceIds.filter(s => s !== id)
        : [...prev.detectedByDeviceIds, id],
    }));
  }, []);

  return (
    <FilterBar
      filters={filters}
      activeFilterCount={activeFilterCount}
      availableSensors={MOCK_SENSORS}
      onUpdate={updateFilter}
      onToggleActivity={toggleActivity}
      onToggleSensor={toggleSensor}
      onReset={() => setFilters(DEFAULT_FILTERS)}
    />
  );
}

const meta: Meta = {
  title: 'Sidebar/FilterBar',
  tags: ['autodocs'],
  decorators: [
    (Story, context) => context.parameters?.specDocs ? (
      <Story />
    ) : (
      <div style={{ maxWidth: 384, background: '#161616', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Default: StoryObj = {
  name: 'Default (Empty)',
  render: () => <FilterBarDemo />,
  play: async ({ canvas }) => {
    const searchInput = canvas.getByLabelText('חיפוש מטרות');
    await expect(searchInput).toBeInTheDocument();
    await expect(searchInput.tagName).toBe('INPUT');
  },
};

export const WithSearch: StoryObj = {
  name: 'With Search Query',
  render: () => <FilterBarDemo initialFilters={{ query: 'רחפן' }} />,
};

export const ActiveFilters: StoryObj = {
  name: 'Active Filters',
  render: () => (
    <FilterBarDemo
      initialFilters={{
        activityStatus: ['active'],
        detectedByDeviceIds: ['pixelsight-1'],
      }}
    />
  ),
};

export const SortByTime: StoryObj = {
  name: 'Sort by Time',
  render: () => <FilterBarDemo initialFilters={{ sortBy: 'time' }} />,
};
