import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, Radio, Search, SlidersHorizontal, TimerReset, X } from 'lucide-react';
import type { ActivityStatus } from '@/imports/ListOfSystems';
import { ACTIVITY_STATUS_LABELS, type FilterState } from '@/imports/useTargetFilters';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';

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
};

const NEXT_SORT: Record<FilterState['sortBy'], FilterState['sortBy']> = {
  priority: 'time',
  time: 'priority',
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
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
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

        <button
          type="button"
          onClick={() => onUpdate('sortBy', NEXT_SORT[filters.sortBy])}
          className="inline-flex h-7 min-w-[5rem] shrink-0 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-medium text-white bg-transparent transition-colors duration-150 hover:bg-white/[0.10] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.97]"
          title={`מיון לפי ${SORT_LABELS[filters.sortBy]}`}
          aria-label={`מיון לפי ${SORT_LABELS[filters.sortBy]}`}
        >
          <ArrowUpDown size={11} aria-hidden="true" />
          <span>{SORT_LABELS[filters.sortBy]}</span>
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5 mt-1.5">
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
          onClick={onReset}
          disabled={activeFilterCount === 0}
          className={`inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2 text-xs font-medium text-white bg-white/[0.06] hover:bg-white/[0.10] transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:scale-[0.97] ${
            activeFilterCount === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="איפוס פילטרים"
        >
            <TimerReset size={11} className="shrink-0" aria-hidden="true" />
            <span>איפוס</span>
        </button>
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
    <Popover open={open} onOpenChange={onOpenChange} dir="rtl">
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        className="w-64 overflow-hidden rounded-lg p-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        <div className="overflow-y-auto p-0.5">{children}</div>
      </PopoverContent>
    </Popover>
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
  const listId = React.useId();

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
        const fieldId = `${listId}-${item.id}`;
        return (
          <label
            key={item.id}
            htmlFor={fieldId}
            className={`flex h-7 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-right text-xs transition-colors duration-150 focus-within:bg-white/10 focus-within:outline-none ${
              active
                ? 'text-sky-100'
                : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <Checkbox
              id={fieldId}
              checked={active}
              onCheckedChange={() => onToggle(item.id)}
              className="size-3 shrink-0 rounded-[3px] border-white/10 !bg-transparent !shadow-none data-[state=checked]:!border-sky-400/40 data-[state=checked]:!bg-sky-500/20 data-[state=checked]:!text-sky-200 [&_svg]:size-2 [&_svg]:stroke-[3]"
            />
            <span className="flex-1 truncate">{item.label}</span>
          </label>
        );
      })}
    </div>
  );
}
