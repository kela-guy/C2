import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Triangle,
} from 'lucide-react';

import { GridblockPanel } from '@/app/components/gridblock';
import type { Detection } from '@/imports/ListOfSystems';

import {
  DISPOSITION_ORDER,
  DISPOSITIONS,
  dispositionForTarget,
  statusTimeForTarget,
  typeLabelForTarget,
  type DispositionDef,
  type DispositionKey,
} from './dispositions';

export interface TracksPanelProps {
  targets: Detection[];
  activeTargetId: string | null;
  onTargetClick: (target: Detection) => void;
  onClose: () => void;
}

const COLLAPSED_INITIAL: Record<DispositionKey, boolean> = {
  suspect: false,
  assumedFriend: false,
  neutral: false,
};

export default function TracksPanel({
  targets,
  activeTargetId,
  onTargetClick,
  onClose,
}: TracksPanelProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] =
    useState<Record<DispositionKey, boolean>>(COLLAPSED_INITIAL);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return targets;
    return targets.filter(t => t.name.toLowerCase().includes(needle));
  }, [targets, search]);

  const grouped = useMemo(() => {
    const buckets: Record<DispositionKey, Detection[]> = {
      suspect: [],
      assumedFriend: [],
      neutral: [],
    };
    for (const t of filtered) buckets[dispositionForTarget(t)].push(t);
    return buckets;
  }, [filtered]);

  const toggleGroup = (key: DispositionKey) =>
    setCollapsed(c => ({ ...c, [key]: !c[key] }));

  return (
    <GridblockPanel
      title="Tracks"
      onClose={onClose}
      closeAriaLabel="Close tracks panel"
      testId="tracks-panel"
      toolbar={
        <>
          <TracksFilterBar value={search} onChange={setSearch} />
          <TracksToolbar count={filtered.length} />
        </>
      }
    >
      {DISPOSITION_ORDER.map(key => {
        const group = grouped[key];
        if (group.length === 0) return null;
        return (
          <TracksGroup
            key={key}
            disposition={DISPOSITIONS[key]}
            count={group.length}
            collapsed={collapsed[key]}
            onToggle={() => toggleGroup(key)}
          >
            {!collapsed[key] &&
              group.map(target => (
                <TrackCard
                  key={target.id}
                  target={target}
                  disposition={DISPOSITIONS[key]}
                  active={target.id === activeTargetId}
                  onClick={() => onTargetClick(target)}
                />
              ))}
          </TracksGroup>
        );
      })}
    </GridblockPanel>
  );
}

function TracksFilterBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="px-2 pt-2 pb-0 shrink-0">
      <div className="flex items-center h-8 bg-surface-3">
        <Search size={14} className="ms-2 text-slate-12 shrink-0" strokeWidth={1.75} />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Search by name, entity id…"
          className="flex-1 bg-transparent border-0 px-2 py-1.5 text-xs/4 text-slate-12 placeholder:text-slate-10 focus:outline-none min-w-0"
        />
        <button
          type="button"
          // Mock: filters dropdown not wired up yet.
          className="inline-flex items-center h-8 px-1 rounded-xs text-slate-10 hover:text-slate-12 focus:outline-none shrink-0"
        >
          <SlidersHorizontal size={20} strokeWidth={1.75} />
          <span className="px-1 text-xs/4 font-semibold">Filters</span>
        </button>
      </div>
    </div>
  );
}

function TracksToolbar({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-[1fr_2fr] items-center px-2 py-2 shrink-0 bg-surface-2">
      <div className="text-xs/4 font-semibold text-slate-10">{count} results</div>
      <div className="flex justify-end overflow-clip">
        <button
          type="button"
          // Mock: sort selector not wired up yet.
          className="inline-flex items-center h-6 max-w-full rounded-xs ps-1 pe-2 py-1 text-slate-10 hover:text-slate-12 focus:outline-none"
        >
          {/*
            Sort glyph: small bars decreasing in length next to an arrow.
            Lucide doesn't ship the exact icon from the Paper design, so
            we render an inline SVG that mirrors the original geometry
            instead of swapping in a near-miss lucide icon.
          */}
          <svg
            viewBox="0 0 20 20"
            width={16}
            height={16}
            fill="currentColor"
            aria-hidden
            className="shrink-0"
          >
            <path d="m2 13.687 2.979 2.979 2.98-2.979H5.855V4h-1.75v9.687H2Zm7-.437V15h3v-1.75H9ZM9 5v1.75h9V5H9Zm0 4.125v1.75h6v-1.75H9Z" />
          </svg>
          <span className="px-1 text-xs/4 font-semibold line-clamp-1">
            Name, Disposition
          </span>
        </button>
      </div>
    </div>
  );
}

function TracksGroup({
  disposition,
  count,
  collapsed,
  onToggle,
  children,
}: {
  disposition: DispositionDef;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const Chevron = collapsed ? ChevronDown : ChevronUp;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full p-2 focus:outline-none"
        aria-expanded={!collapsed}
      >
        <span
          className="text-xs/4 font-semibold"
          style={{ color: disposition.color }}
        >
          {disposition.label}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[10px]/3 font-semibold text-slate-10">{count}</span>
          <Chevron size={16} className="text-slate-12" strokeWidth={1.75} />
        </span>
      </button>
      {!collapsed && children}
    </div>
  );
}

function TrackCard({
  target,
  disposition,
  active,
  onClick,
}: {
  target: Detection;
  disposition: DispositionDef;
  active: boolean;
  onClick: () => void;
}) {
  const typeLabel = typeLabelForTarget(target);
  const statusTime = statusTimeForTarget(target);
  // Slightly lift the card surface when the row is the dashboard's active
  // target so selection reads at a glance. Active = surface-5,
  // inactive = surface-4, matching the substrate ladder convention.
  const cardBg = active ? 'var(--surface-5)' : 'var(--surface-4)';

  return (
    <div className="px-2.5 py-1">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className="group relative w-full text-start cursor-pointer overflow-clip focus:outline-none"
        style={{ backgroundColor: cardBg }}
      >
        <div className="flex flex-col gap-1 p-2">
          {/* Top block: marker icon column (32px reserved via ps-8) +
              type label / title / disposition selector. */}
          <div className="ps-8 flex flex-col gap-1 relative">
            {/* Marker icon, absolute-positioned at the start of the card. */}
            <div
              className="absolute top-0 start-0 size-6 inline-flex items-center justify-center"
              aria-hidden
            >
              <Triangle
                size={14}
                fill={disposition.color}
                stroke={disposition.color}
                strokeWidth={1.5}
              />
            </div>

            <div
              className="text-[10px]/3 font-semibold text-slate-10 line-clamp-1"
              style={{ letterSpacing: '0.04em' }}
            >
              {typeLabel}
            </div>

            <div className="flex items-center gap-1.5 break-all">
              <span className="text-xs/4 font-semibold text-slate-12">{target.name}</span>
              {/* All Dashboard targets are sim-driven, so the Simulated
                  badge always shows. Replace with a real flag if/when
                  Detection grows one. */}
              <span className="inline-flex items-center h-6 rounded-xs px-1 py-0.5 text-xs leading-none font-semibold bg-accent-success-tint text-accent-success">
                Simulated
              </span>
            </div>

            <button
              type="button"
              onClick={e => {
                // Mock: opening a disposition picker is out of scope.
                // Stop the card-level click so changing the chip
                // doesn't flip the active selection.
                e.stopPropagation();
              }}
              className="inline-flex items-center self-start h-6 rounded-xs px-1 focus:outline-none"
              style={{ color: disposition.color }}
            >
              <span className="px-1 text-xs/4 font-semibold line-clamp-1">
                {disposition.label}
              </span>
              <ChevronDown size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Status row, indented to line up with the title column. */}
          <div className="ps-8 flex items-end justify-between gap-1">
            <span className="text-[10px]/3 text-slate-10">{statusTime} - Live</span>
          </div>
        </div>

        {/* Hover action strip — visible on row hover only, mirrors the
            geo / view / favorite affordances from the Paper design.
            Wiring is a follow-up; the buttons render but no-op. */}
        <div
          className="absolute end-2 top-2 flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
          aria-hidden
        >
          <HoverActionButton icon={MapPin} label="Locate" />
          <HoverActionButton icon={Eye} label="View" />
          <HoverActionButton icon={Star} label="Favorite" />
        </div>
      </div>
    </div>
  );
}

function HoverActionButton({
  icon: Icon,
  label,
}: {
  icon: typeof MapPin;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={e => e.stopPropagation()}
      aria-label={label}
      className="inline-flex items-center justify-center size-6 rounded-xs text-slate-9 hover:text-slate-12 focus:outline-none"
    >
      <Icon size={16} strokeWidth={1.75} />
    </button>
  );
}
