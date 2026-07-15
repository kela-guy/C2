/**
 * Panel shell — header + filter bar + grouped device list.
 *
 * Owns the panel-level state (search query, type filter, currently
 * expanded row) and delegates per-row state to small hooks
 * (`useFocusedDevice`).
 *
 * Filtering, grouping, and the type-filter definition are computed
 * via pure helpers in `./utils.ts` so they're easy to inspect in
 * isolation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { X } from '@/lib/icons/central';
import { LAYOUT_TOKENS } from '@/primitives/tokens';
import { useScrollEdges } from '@/lib/scroll/useScrollEdges';
import { ScrollEdgeCue } from '@/lib/scroll/ScrollEdgeCue';
import { FilterBar, type FilterDef } from '@/primitives';
import {
  DEFAULT_CONNECTION_STATE_LABELS,
  DEFAULT_DEVICE_PANEL_STRINGS,
  DEFAULT_TYPE_LABELS,
  TYPE_ORDER,
} from './constants';
import {
  countDevicesByType,
  filterDevices,
  groupDevicesByType,
  normalizePinnedSet,
  pickTypeFilterIcons,
} from './utils';
import { useFocusedDevice } from './useFocusedDevice';
import { DeviceRow } from './DeviceRow';
import type {
  ConnectionState,
  Device,
  DevicesPanelProps,
  DevicesPanelStrings,
  DeviceType,
} from './types';

/** Flattened row model for the virtualized device list. */
type DeviceListRow =
  | { kind: 'header'; key: string; type: DeviceType; label: string; count: number }
  | { kind: 'device'; key: string; device: Device };

export function DevicesPanel({
  devices,
  open,
  onClose,
  onFlyTo,
  onDeviceHover,
  onDeviceSelect,
  onJamActivate,
  onFloodlightToggle,
  onSpeakerToggle,
  floodlightOnIds,
  speakerPlayingIds,
  speakerTracks,
  onPinToFeed,
  onUnpinFromFeed,
  pinnedDeviceIds,
  onOpenLogs,
  onArmNotifications,
  noTransition,
  width,
  focusedDeviceId,
  selectedDeviceId,
  typeLabels: typeLabelsProp,
  connectionStateLabels: connectionStateLabelsProp,
  title = 'Devices',
  closeAriaLabel = 'Close',
  strings: stringsProp,
  pathfinderFlightStates,
  onLaunch,
  onAbort,
  onReturnToBase,
}: DevicesPanelProps) {
  const strings = useMemo<DevicesPanelStrings>(
    () => ({ ...DEFAULT_DEVICE_PANEL_STRINGS, ...(stringsProp ?? {}) }),
    [stringsProp],
  );
  const typeLabels = useMemo(
    () => ({ ...DEFAULT_TYPE_LABELS, ...(typeLabelsProp ?? {}) }) as Record<DeviceType, string>,
    [typeLabelsProp],
  );
  const connectionStateLabels = useMemo(
    () =>
      ({
        ...DEFAULT_CONNECTION_STATE_LABELS,
        ...(connectionStateLabelsProp ?? {}),
      }) as Record<ConnectionState, string>,
    [connectionStateLabelsProp],
  );

  const pinnedSet = useMemo(() => normalizePinnedSet(pinnedDeviceIds), [pinnedDeviceIds]);
  const typeFilterIcons = useMemo(() => pickTypeFilterIcons(devices), [devices]);
  const typeCounts = useMemo(() => countDevicesByType(devices), [devices]);

  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<DeviceType[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const focusedRowRef = useFocusedDevice({
    focusedDeviceId,
    devices,
    setExpandedId,
    setSelectedTypes,
    setQuery,
  });

  const handleReset = useCallback(() => {
    setQuery('');
    setSelectedTypes([]);
  }, []);

  const filtered = useMemo(
    () => filterDevices(devices, query, selectedTypes),
    [devices, query, selectedTypes],
  );

  const grouped = useMemo(
    () => groupDevicesByType(filtered, typeLabels),
    [filtered, typeLabels],
  );

  // Flatten groups + devices into a single row list so the whole panel can
  // be virtualized with one <Virtuoso>. Group headers stay inline (rendered
  // as `header` rows) to preserve the original non-sticky layout.
  const rows = useMemo<DeviceListRow[]>(() => {
    const out: DeviceListRow[] = [];
    for (const group of grouped) {
      out.push({ kind: 'header', key: `header:${group.type}`, type: group.type, label: group.label, count: group.devices.length });
      for (const device of group.devices) out.push({ kind: 'device', key: device.id, device });
    }
    return out;
  }, [grouped]);

  // The scroll container, handed to Virtuoso as its `customScrollParent` so
  // the existing panel chrome (header + filter bar) and height chain are
  // untouched.
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  // Virtuoso owns scrolling via customScrollParent, so observe that element
  // directly and overlay the overflow cues in the relative wrapper.
  const devicesEdges = useScrollEdges({ ref: scrollParentRef, enabled: !!scrollParent });
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Focused device may be off-screen (unmounted) under virtualization, so the
  // ref-based scrollIntoView in `useFocusedDevice` can't always find it.
  // Scroll to its row index via the Virtuoso handle instead. Read `rows`
  // through a ref so this only fires on a fresh focus signal.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => {
    if (!focusedDeviceId) return;
    requestAnimationFrame(() => {
      const index = rowsRef.current.findIndex(
        (r) => r.kind === 'device' && r.device.id === focusedDeviceId,
      );
      if (index >= 0) {
        virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
      }
    });
  }, [focusedDeviceId]);

  const handleRowClick = useCallback(
    (id: string) => {
      const next = expandedId === id ? null : id;
      setExpandedId(next);
      onDeviceSelect?.(next);
    },
    [expandedId, onDeviceSelect],
  );

  const typeFilterDef = useMemo<FilterDef>(
    () => ({
      id: 'type',
      label: strings.typeFilterLabel,
      options: TYPE_ORDER
        .filter((t) => typeCounts[t] > 0)
        .map((t) => ({
          value: t,
          label: typeLabels[t],
          icon: typeFilterIcons[t],
        })),
    }),
    [strings.typeFilterLabel, typeCounts, typeLabels, typeFilterIcons],
  );

  // Stable references for the FilterBar so it (and the rows beneath it)
  // don't see fresh array/object/function props on every panel render.
  const filterDefs = useMemo(() => [typeFilterDef], [typeFilterDef]);
  const filterSelections = useMemo(() => ({ type: selectedTypes }), [selectedTypes]);
  const handleFilterChange = useCallback(
    (_id: string, next: string[]) => setSelectedTypes(next as DeviceType[]),
    [],
  );

  return (
    // Same inline-start docking pattern as the Dashboard sidebar: the
    // panel sits on the inline-start edge (left in LTR, right in
    // RTL), adjacent to the slim rail, and slides off-screen toward
    // that edge in both directions (`-translate-x-full` for LTR,
    // `rtl:translate-x-full` for RTL). Border-end is the divider that
    // faces the map.
    <aside
      data-handoff-component="devices-panel"
      className={`absolute top-0 bottom-0 start-0 border-e border-white/10 flex flex-col z-10 font-sans ${
        noTransition ? '' : 'transition-transform duration-[var(--motion-slow)] ease-out'
      } ${open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full pointer-events-none'}`}
      style={{ width: width ?? LAYOUT_TOKENS.sidebarWidthPx, backgroundColor: 'var(--surface-2)' }}
    >
      <div className="shrink-0">
        <div
          className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10"
          data-handoff-component="devices-panel-header"
        >
          <h2 className="text-xs font-medium text-white uppercase tracking-wider">
            {title} ({devices.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 -m-1 rounded hover:bg-state-hover-overlay text-slate-9 hover:text-slate-11 transition-[color,background-color,transform] duration-[var(--motion-fast)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
            aria-label={closeAriaLabel}
          >
            <X size={14} />
          </button>
        </div>

        <FilterBar
          query={query}
          onQueryChange={setQuery}
          filters={filterDefs}
          selections={filterSelections}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          searchPlaceholder={strings.searchPlaceholder}
          clearSearchAriaLabel={strings.clearSearch}
          resetLabel={strings.resetFiltersLabel}
          resetAriaLabel={strings.resetFilters}
        />
      </div>

      <div className="relative flex-1 min-h-0">
      <div
        ref={(el) => {
          scrollParentRef.current = el;
          setScrollParent(el);
        }}
        className="h-full overflow-y-auto"
      >
        {rows.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-8">{strings.noMatches}</div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={rows}
            customScrollParent={scrollParent ?? undefined}
            computeItemKey={(_, row) => row.key}
            increaseViewportBy={400}
            itemContent={(_, row) =>
              row.kind === 'header' ? (
                <div
                  data-handoff-component="device-type-group"
                  data-device-type={row.type}
                  className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/[0.08]"
                >
                  {row.label} ({row.count})
                </div>
              ) : (
                <div ref={row.device.id === focusedDeviceId ? focusedRowRef : undefined}>
                  <DeviceRow
                    device={row.device}
                    isExpanded={expandedId === row.device.id}
                    onToggle={handleRowClick}
                    onHover={onDeviceHover ?? noopHover}
                    onJamActivate={onJamActivate}
                    onFloodlightToggle={onFloodlightToggle}
                    onSpeakerToggle={onSpeakerToggle}
                    isFloodlightOn={floodlightOnIds?.has(row.device.id)}
                    isSpeakerPlaying={speakerPlayingIds?.has(row.device.id)}
                    speakerTracks={speakerTracks}
                    onFlyTo={onFlyTo}
                    onPinToFeed={onPinToFeed}
                    onUnpinFromFeed={onUnpinFromFeed}
                    isPinnedToFeed={pinnedSet.has(row.device.id)}
                    onOpenLogs={onOpenLogs}
                    onArmNotifications={onArmNotifications}
                    onChildSelect={onDeviceSelect}
                    selectedChildId={selectedDeviceId}
                    pathfinderFlightState={pathfinderFlightStates?.[row.device.id]}
                    onLaunch={onLaunch}
                    onAbort={onAbort}
                    onReturnToBase={onReturnToBase}
                    connectionStateLabels={connectionStateLabels}
                    strings={strings}
                  />
                </div>
              )
            }
          />
        )}
      </div>
        <ScrollEdgeCue edge="top" visible={devicesEdges.top} />
        <ScrollEdgeCue edge="bottom" visible={devicesEdges.bottom} />
      </div>
    </aside>
  );
}

function noopHover() {
  /* default `onDeviceHover` when the consumer doesn't supply one */
}
