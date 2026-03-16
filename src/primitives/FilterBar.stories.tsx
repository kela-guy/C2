import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { expect } from 'storybook/test';
import { FilterBar } from './FilterBar';
import { DEFAULT_FILTERS, type FilterState, type FilterKey } from '../imports/useTargetFilters';

function FilterBarDemo({ initialFilters }: { initialFilters?: Partial<FilterState> }) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const activeFilterCount = [
    filters.confidence[0] > 0 || filters.confidence[1] < 100,
    filters.active !== 'all',
    filters.domain !== 'all',
    filters.investigated !== 'all',
    filters.sensorIds.length > 0,
    filters.lastSeenWithin !== null,
    filters.types.length > 0,
    filters.signatureTypes.length > 0,
  ].filter(Boolean).length;

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = useCallback((key: FilterKey) => {
    setFilters(prev => ({ ...prev, [key]: DEFAULT_FILTERS[key] }));
  }, []);

  const toggleSensor = useCallback((id: string) => {
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

  return (
    <FilterBar
      filters={filters}
      activeFilters={[]}
      activeFilterCount={activeFilterCount}
      availableSensors={[
        { id: 'pixelsight-1', label: 'Pixelsight צפון' },
        { id: 'regulus-1', label: 'Regulus-1' },
        { id: 'radar-a', label: 'מכ"מ מרכז' },
      ]}
      availableTypes={['drone', 'bird', 'unknown', 'vehicle', 'person']}
      onUpdate={updateFilter}
      onRemove={removeFilter}
      onToggleSensor={toggleSensor}
      onToggleType={toggleType}
      onToggleSignature={toggleSignature}
      onReset={() => setFilters(DEFAULT_FILTERS)}
    />
  );
}

const meta: Meta = {
  title: 'Sidebar/FilterBar',
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 384, background: '#161616', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

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
        active: 'active',
        domain: 'air',
        types: ['drone'],
      }}
    />
  ),
};

export const SortByConfidence: StoryObj = {
  name: 'Sort by Confidence',
  render: () => <FilterBarDemo initialFilters={{ sortBy: 'confidence' }} />,
};
