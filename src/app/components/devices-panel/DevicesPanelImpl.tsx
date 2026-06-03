/**
 * Panel shell — header + filter bar + grouped device list.
 *
 * Owns the panel-level state (search query, type filter, currently
 * expanded row) and delegates per-row state to small hooks
 * (`useMutedDevices`, `useFocusedDevice`).
 *
 * Filtering, grouping, and the type-filter definition are computed
 * via pure helpers in `./utils.ts` so they're easy to inspect in
 * isolation.
 */

import { useCallback, useMemo, useState } from 'react';
import { X } from '@/lib/icons/central';
import { LAYOUT_TOKENS, SURFACE } from '@/primitives/tokens';
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
import { useMutedDevices } from './useMutedDevices';
import { useFocusedDevice } from './useFocusedDevice';
import { DeviceRow } from './DeviceRow';
import type {
  ConnectionState,
  DevicesPanelProps,
  DevicesPanelStrings,
  DeviceType,
} from './types';

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
  typeLabels: typeLabelsProp,
  connectionStateLabels: connectionStateLabelsProp,
  title = 'Devices',
  closeAriaLabel = 'Close',
  strings: stringsProp,
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

  const muted = useMutedDevices();

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
        noTransition ? '' : 'transition-transform duration-300 ease-out'
      } ${open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full pointer-events-none'}`}
      style={{ width: width ?? LAYOUT_TOKENS.sidebarWidthPx, backgroundColor: SURFACE.level1 }}
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
            className="p-2 -m-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-[color,background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            aria-label={closeAriaLabel}
          >
            <X size={14} />
          </button>
        </div>

        <FilterBar
          query={query}
          onQueryChange={setQuery}
          filters={[typeFilterDef]}
          selections={{ type: selectedTypes }}
          onFilterChange={(_id, next) => setSelectedTypes(next as DeviceType[])}
          onReset={handleReset}
          searchPlaceholder={strings.searchPlaceholder}
          clearSearchAriaLabel={strings.clearSearch}
          resetLabel={strings.resetFiltersLabel}
          resetAriaLabel={strings.resetFilters}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-zinc-600">{strings.noMatches}</div>
        ) : (
          grouped.map((group) => (
            <div key={group.type} data-handoff-component="device-type-group" data-device-type={group.type}>
              <div className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/[0.08]">
                {group.label} ({group.devices.length})
              </div>
              {group.devices.map((device) => (
                <div
                  key={device.id}
                  ref={device.id === focusedDeviceId ? focusedRowRef : undefined}
                >
                  <DeviceRow
                    device={device}
                    isExpanded={expandedId === device.id}
                    onToggle={() => handleRowClick(device.id)}
                    onHover={onDeviceHover ?? noopHover}
                    onJamActivate={onJamActivate}
                    onFloodlightToggle={onFloodlightToggle}
                    onSpeakerToggle={onSpeakerToggle}
                    isFloodlightOn={floodlightOnIds?.has(device.id)}
                    isSpeakerPlaying={speakerPlayingIds?.has(device.id)}
                    speakerTracks={speakerTracks}
                    onFlyTo={onFlyTo}
                    isMuted={muted.isMuted(device.id)}
                    muteRemaining={muted.getRemaining(device.id)}
                    onToggleMute={muted.toggle}
                    onPinToFeed={onPinToFeed}
                    onUnpinFromFeed={onUnpinFromFeed}
                    isPinnedToFeed={pinnedSet.has(device.id)}
                    onOpenLogs={onOpenLogs}
                    onArmNotifications={onArmNotifications}
                    connectionStateLabels={connectionStateLabels}
                    strings={strings}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function noopHover() {
  /* default `onDeviceHover` when the consumer doesn't supply one */
}
