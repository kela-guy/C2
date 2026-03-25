import React, { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ArrowUpDown, Check, ChevronDown, Radio, Search, SlidersHorizontal, TimerReset, X } from 'lucide-react';
import type { ActivityStatus } from '@/imports/ListOfSystems';
import { ACTIVITY_STATUS_LABELS, type FilterState } from '@/imports/useTargetFilters';

interface FilterBarProps {
  filters: FilterState;
  activeFilterCount: number;
  availableSensors: { id: string; label: string }[];
  onUpdate: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onToggleActivity: (status: ActivityStatus) => void;
  onToggleSensor: (id: string) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: ActivityStatus[] = [
  'active',
  'recently_active',
  'timeout',
  'dismissed',
  'mitigated',
];

const SORT_LABELS: Record<FilterState['sortBy'], string> = {
  priority: 'עדיפות',
  time: 'זמן',
  confidence: 'ביטחון',
};

const NEXT_SORT: Record<FilterState['sortBy'], FilterState['sortBy']> = {
  priority: 'time',
  time: 'confidence',
  confidence: 'priority',
};

export function FilterBar({
  filters,
  activeFilterCount,
  availableSensors,
  onUpdate,
  onToggleActivity,
  onToggleSensor,
  onReset,
}: FilterBarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [sensorOpen, setSensorOpen] = useState(false);

  const statusSummary = useMemo(() => {
    if (filters.activityStatus.length === 0) return 'הכל';
    if (filters.activityStatus.length === 1) return ACTIVITY_STATUS_LABELS[filters.activityStatus[0]];
    if (filters.activityStatus.length === 2 && filters.activityStatus.includes('active') && filters.activityStatus.includes('recently_active')) {
      return 'פעילים';
    }
    return `${filters.activityStatus.length} נבחרו`;
  }, [filters.activityStatus]);

  const sensorSummary = useMemo(() => {
    if (filters.detectedByDeviceIds.length === 0) return 'כל המזהים';
    if (filters.detectedByDeviceIds.length === 1) {
      return availableSensors.find((sensor) => sensor.id === filters.detectedByDeviceIds[0])?.label ?? '1 נבחר';
    }
    return `${filters.detectedByDeviceIds.length} מזהים`;
  }, [availableSensors, filters.detectedByDeviceIds]);

  return (
    <div className="border-b border-white/5 px-2 py-1.5" dir="rtl">
      <div className="relative w-full">
        <Search size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          value={filters.query}
          onChange={(event) => onUpdate('query', event.target.value)}
          placeholder="חיפוש יעד, מזהה או סוג..."
          aria-label="חיפוש מטרות"
          className="h-7 w-full rounded-md bg-white/[0.04] pr-7 pl-7 text-[11px] text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.07)] placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/40 focus-visible:shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => onUpdate('query', '')}
            className="absolute left-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-zinc-500 transition-colors duration-150 hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            aria-label="נקה חיפוש"
          >
            <X size={10} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        <FilterPopoverButton
          open={statusOpen}
          onOpenChange={setStatusOpen}
          icon={SlidersHorizontal}
          label="סטטוס"
          value={statusSummary}
          active={filters.activityStatus.length > 0}
        >
          <MultiSelectList
            items={STATUS_OPTIONS.map((status) => ({
              id: status,
              label: ACTIVITY_STATUS_LABELS[status],
            }))}
            selected={filters.activityStatus}
            onToggle={(id) => onToggleActivity(id as ActivityStatus)}
          />
        </FilterPopoverButton>

        <FilterPopoverButton
          open={sensorOpen}
          onOpenChange={setSensorOpen}
          icon={Radio}
          label="מזהה"
          value={sensorSummary}
          active={filters.detectedByDeviceIds.length > 0}
        >
          <MultiSelectList
            items={availableSensors}
            selected={filters.detectedByDeviceIds}
            onToggle={onToggleSensor}
            emptyLabel="אין מזהים זמינים"
          />
        </FilterPopoverButton>

        <button
          type="button"
          onClick={() => onUpdate('sortBy', NEXT_SORT[filters.sortBy])}
          className="inline-flex h-7 w-fit items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-medium text-white bg-transparent transition-colors duration-150 hover:bg-white/[0.10] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.97]"
          title={`מיון לפי ${SORT_LABELS[filters.sortBy]}`}
          aria-label={`מיון לפי ${SORT_LABELS[filters.sortBy]}`}
        >
          <ArrowUpDown size={11} aria-hidden="true" />
          <span>{SORT_LABELS[filters.sortBy]}</span>
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-7 w-full items-center justify-center gap-1.5 rounded px-2 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.97]"
            aria-label="איפוס פילטרים"
          >
            <TimerReset size={11} aria-hidden="true" />
            <span>איפוס</span>
            <span className="rounded-full bg-sky-500/15 px-1 py-px text-[9px] font-mono tabular-nums text-sky-300">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function FilterPopoverButton({
  open,
  onOpenChange,
  icon: Icon,
  label,
  value,
  active,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: React.ElementType;
  label: string;
  value: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-flex h-7 w-full items-center justify-center gap-1 rounded px-2 text-xs font-medium text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.97] ${
            active || open
              ? 'bg-sky-500/[0.12]'
              : 'bg-white/[0.06] hover:bg-white/[0.10]'
          }`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label}
        >
          <Icon size={11} className="shrink-0 opacity-80" aria-hidden="true" />
          <span className="shrink-0">{label}</span>
          <span className="truncate text-right text-zinc-400 flex-1">{value}</span>
          <ChevronDown size={10} className={`shrink-0 opacity-50 ml-auto transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50 w-64 overflow-hidden rounded-lg bg-[#17171a]/95 p-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div className="overflow-y-auto p-0.5">{children}</div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MultiSelectList({
  items,
  selected,
  onToggle,
  emptyLabel = 'אין אפשרויות',
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-[10px] text-zinc-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`flex h-7 items-center gap-2.5 rounded-md px-2.5 text-right text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
              active
                ? 'text-sky-100'
                : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
            }`}
            aria-pressed={active}
          >
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors duration-150 ${
              active
                ? 'border-sky-400/40 bg-sky-500/20 text-sky-200'
                : 'border-white/10 bg-transparent text-transparent'
            }`}>
              <Check size={9} strokeWidth={2.6} aria-hidden="true" />
            </span>
            <span className="flex-1 truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
