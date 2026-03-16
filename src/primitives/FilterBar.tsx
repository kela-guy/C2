import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, ArrowUpDown, Gauge, Activity, Globe, Search, Radio, Clock, Tag, Fingerprint, SlidersHorizontal, X } from 'lucide-react';
import type { FilterState, FilterKey } from '../imports/useTargetFilters';
import { TYPE_LABELS, SIGNATURE_LABELS } from '../imports/useTargetFilters';

interface FilterBarProps {
  filters: FilterState;
  activeFilters: { key: FilterKey; label: string; valueLabel: string }[];
  activeFilterCount: number;
  availableSensors: { id: string; label: string }[];
  availableTypes: string[];
  onUpdate: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onRemove: (key: FilterKey) => void;
  onToggleSensor: (id: string) => void;
  onToggleType: (type: string) => void;
  onToggleSignature: (sig: string) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'הכל' },
  { value: 'active', label: 'פעיל' },
  { value: 'inactive', label: 'לא פעיל' },
] as const;

const DOMAIN_OPTIONS = [
  { value: 'all', label: 'הכל' },
  { value: 'air', label: 'אויר' },
  { value: 'ground', label: 'קרקע' },
] as const;

const INVESTIGATED_OPTIONS = [
  { value: 'all', label: 'הכל' },
  { value: 'investigated', label: 'נחקר' },
  { value: 'not_investigated', label: 'לא נחקר' },
] as const;

const LAST_SEEN_PRESETS = [
  { value: 0, label: 'הכל' },
  { value: 60, label: '< 1 דק\'' },
  { value: 300, label: '< 5 דק\'' },
  { value: 1800, label: '< 30 דק\'' },
  { value: 3600, label: '< 1 שעה' },
] as const;

const SIGNATURES = ['acoustic', 'sigint', 'visual', 'radar'];

const ADVANCED_SECTIONS: { key: FilterKey; label: string; icon: React.ElementType }[] = [
  { key: 'confidence', label: 'ביטחון', icon: Gauge },
  { key: 'investigated', label: 'חקירה', icon: Search },
  { key: 'sensorIds', label: 'חיישנים', icon: Radio },
  { key: 'lastSeenWithin', label: 'נראה לאחרונה', icon: Clock },
  { key: 'signatureTypes', label: 'חתימה', icon: Fingerprint },
];

export function FilterBar({
  filters,
  activeFilterCount,
  availableSensors,
  availableTypes,
  onUpdate,
  onToggleSensor,
  onToggleType,
  onToggleSignature,
  onReset,
}: FilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const statusLabel = STATUS_OPTIONS.find(o => o.value === filters.active)?.label ?? 'הכל';
  const domainLabel = DOMAIN_OPTIONS.find(o => o.value === filters.domain)?.label ?? 'הכל';
  const typesLabel = filters.types.length > 0
    ? filters.types.length === 1
      ? TYPE_LABELS[filters.types[0]] ?? filters.types[0]
      : `${filters.types.length}`
    : 'הכל';

  const advancedCount = [
    filters.confidence[0] > 0 || filters.confidence[1] < 100,
    filters.investigated !== 'all',
    filters.sensorIds.length > 0,
    filters.lastSeenWithin !== null,
    filters.signatureTypes.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="border-b border-white/5" dir="rtl">
      {/* Row 1: Search + Sort */}
      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-1">
        <div className="relative flex-1">
          <Search size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onUpdate('query', e.target.value)}
            placeholder="חיפוש..."
            aria-label="חיפוש מטרות"
            className="w-full bg-white/5 border border-white/5 rounded-md pr-7 pl-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus:border-white/15 focus:bg-white/[0.07] transition-colors"
          />
          {filters.query && (
            <button
              onClick={() => onUpdate('query', '')}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="נקה חיפוש"
            >
              <X size={11} aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          onClick={() => onUpdate('sortBy', filters.sortBy === 'time' ? 'confidence' : 'time')}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors shrink-0"
          title={filters.sortBy === 'time' ? 'מיון לפי זמן' : 'מיון לפי ביטחון'}
        >
          <ArrowUpDown size={11} />
          <span>{filters.sortBy === 'time' ? 'זמן' : 'ביטחון'}</span>
        </button>
      </div>

      {/* Row 2: Filters */}
      <div className="flex items-center gap-1 px-2 pb-1.5 flex-wrap">
        <InlineSelect
          label="סטטוס"
          value={statusLabel}
          isActive={filters.active !== 'all'}
          icon={Activity}
        >
          {(close) => (
            <SingleSelect
              value={filters.active}
              options={STATUS_OPTIONS as unknown as { value: string; label: string }[]}
              onChange={(v) => { onUpdate('active', v as FilterState['active']); close(); }}
            />
          )}
        </InlineSelect>

        <InlineSelect
          label="תחום"
          value={domainLabel}
          isActive={filters.domain !== 'all'}
          icon={Globe}
        >
          {(close) => (
            <SingleSelect
              value={filters.domain}
              options={DOMAIN_OPTIONS as unknown as { value: string; label: string }[]}
              onChange={(v) => { onUpdate('domain', v as FilterState['domain']); close(); }}
            />
          )}
        </InlineSelect>

        <InlineSelect
          label="סוג"
          value={typesLabel}
          isActive={filters.types.length > 0}
          icon={Tag}
        >
          {() => (
            <MultiSelect
              items={availableTypes.map(t => ({ id: t, label: TYPE_LABELS[t] ?? t }))}
              selected={filters.types}
              onToggle={onToggleType}
            />
          )}
        </InlineSelect>

        <Popover.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <Popover.Trigger asChild>
            <button
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors border shrink-0 ${
                advancedOpen || advancedCount > 0
                  ? 'border-white/15 text-zinc-200 bg-white/5'
                  : 'border-transparent text-zinc-300 hover:text-zinc-100'
              }`}
            >
              <SlidersHorizontal size={11} className="opacity-70" />
              <span>עוד</span>
              {advancedCount > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] flex items-center justify-center font-medium">
                  {advancedCount}
                </span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={4}
              className="z-50 w-64 rounded-lg border border-white/10 bg-[#161819] shadow-xl shadow-black/40 overflow-hidden"
            >
              <AdvancedPanel
                filters={filters}
                availableSensors={availableSensors}
                onUpdate={onUpdate}
                onToggleSensor={onToggleSensor}
                onToggleSignature={onToggleSignature}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="text-[9px] text-zinc-400 hover:text-zinc-200 transition-colors px-1 shrink-0"
          >
            איפוס
          </button>
        )}
      </div>
    </div>
  );
}

function InlineSelect({
  label,
  value,
  isActive,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  isActive: boolean;
  icon: React.ElementType;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors border shrink-0 ${
            isActive
              ? 'border-cyan-500/25 bg-cyan-500/[0.06] text-cyan-300'
              : open
                ? 'border-white/15 text-zinc-200 bg-white/5'
                : 'border-transparent text-zinc-300 hover:text-zinc-100'
          }`}
        >
          <Icon size={11} className="opacity-70" />
          <span>{label}</span>
          {isActive && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-cyan-400 font-medium">{value}</span>
            </>
          )}
          <ChevronDown size={9} className={`opacity-40 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50 rounded-lg border border-white/10 bg-[#161819] shadow-xl shadow-black/40 overflow-hidden"
        >
          <div className="p-1 min-w-[120px]" dir="rtl">
            {children(() => setOpen(false))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SingleSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-colors text-right ${
            value === opt.value
              ? 'bg-white/10 text-white'
              : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            value === opt.value ? 'bg-cyan-400' : 'bg-zinc-700'
          }`} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MultiSelect({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return <span className="text-[9px] text-zinc-600 px-2 py-1">אין אפשרויות</span>;
  }

  return (
    <div className="flex flex-col">
      {items.map(item => {
        const isActive = selected.includes(item.id);
        return (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-colors text-right ${
              isActive
                ? 'bg-cyan-500/10 text-cyan-300'
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
            }`}
          >
            <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
              isActive
                ? 'border-cyan-500/50 bg-cyan-500/20'
                : 'border-white/15 bg-transparent'
            }`}>
              {isActive && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function AdvancedPanel({
  filters,
  availableSensors,
  onUpdate,
  onToggleSensor,
  onToggleSignature,
}: {
  filters: FilterState;
  availableSensors: { id: string; label: string }[];
  onUpdate: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onToggleSensor: (id: string) => void;
  onToggleSignature: (sig: string) => void;
}) {
  return (
    <div className="divide-y divide-white/5" dir="rtl">
      <AdvancedSection
        label="חקירה"
        icon={Search}
        isActive={filters.investigated !== 'all'}
        onClear={() => onUpdate('investigated', 'all')}
      >
        <SingleSelect
          value={filters.investigated}
          options={INVESTIGATED_OPTIONS as unknown as { value: string; label: string }[]}
          onChange={(v) => onUpdate('investigated', v as FilterState['investigated'])}
        />
      </AdvancedSection>

      <AdvancedSection
        label="ביטחון"
        icon={Gauge}
        isActive={filters.confidence[0] > 0 || filters.confidence[1] < 100}
        onClear={() => onUpdate('confidence', [0, 100])}
      >
        <RangeSlider
          min={0}
          max={100}
          value={filters.confidence}
          onChange={(v) => onUpdate('confidence', v)}
        />
      </AdvancedSection>

      <AdvancedSection
        label="חיישנים"
        icon={Radio}
        isActive={filters.sensorIds.length > 0}
        onClear={() => onUpdate('sensorIds', [])}
      >
        <MultiSelect
          items={availableSensors.map(s => ({ id: s.id, label: s.label }))}
          selected={filters.sensorIds}
          onToggle={onToggleSensor}
        />
      </AdvancedSection>

      <AdvancedSection
        label="נראה לאחרונה"
        icon={Clock}
        isActive={filters.lastSeenWithin !== null}
        onClear={() => onUpdate('lastSeenWithin', null)}
      >
        <SingleSelect
          value={filters.lastSeenWithin !== null ? String(filters.lastSeenWithin) : '0'}
          options={LAST_SEEN_PRESETS.map(p => ({ value: String(p.value), label: p.label }))}
          onChange={(v) => onUpdate('lastSeenWithin', Number(v) === 0 ? null : Number(v))}
        />
      </AdvancedSection>

      <AdvancedSection
        label="חתימה"
        icon={Fingerprint}
        isActive={filters.signatureTypes.length > 0}
        onClear={() => onUpdate('signatureTypes', [])}
      >
        <MultiSelect
          items={SIGNATURES.map(s => ({ id: s, label: SIGNATURE_LABELS[s] ?? s }))}
          selected={filters.signatureTypes}
          onToggle={onToggleSignature}
        />
      </AdvancedSection>
    </div>
  );
}

function AdvancedSection({
  label,
  icon: Icon,
  isActive,
  onClear,
  children,
}: {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} className="text-zinc-500 opacity-60" />
        <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
        {isActive && (
          <button
            onClick={onClear}
            className="mr-auto text-zinc-600 hover:text-zinc-400 transition-colors"
            title="נקה"
          >
            <X size={10} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RangeSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const pctLow = ((value[0] - min) / (max - min)) * 100;
  const pctHigh = ((value[1] - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-zinc-500 font-mono tabular-nums w-6 text-center">{value[0]}</span>
      <div className="relative flex-1 h-5 flex items-center">
        <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full" />
        <div
          className="absolute h-1 bg-cyan-500/40 rounded-full"
          style={{ left: `${pctLow}%`, right: `${100 - pctHigh}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[0]}
          aria-label="ביטחון מינימלי"
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v <= value[1]) onChange([v, value[1]]);
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[1]}
          aria-label="ביטחון מקסימלי"
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= value[0]) onChange([value[0], v]);
          }}
          className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow"
        />
      </div>
      <span className="text-[9px] text-zinc-500 font-mono tabular-nums w-6 text-center">{value[1]}</span>
    </div>
  );
}
