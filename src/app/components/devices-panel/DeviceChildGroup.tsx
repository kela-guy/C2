/**
 * Collapsible "Sensors" inset panel for a composite device (the Gotcha
 * effector's sectors + camera).
 *
 * Replaces the old flat `DeviceChildRow` list dumped *below* the footer. The
 * children now live in a contained, collapsible surface between the telemetry
 * grid and the action bar, so the parent ↔ sensor ownership reads as a single
 * grouped unit. Collapsed, the header carries a worst-first health roll-up
 * (summary chips); expanded, the per-row badges carry the specifics, so the
 * signal is never doubled.
 *
 * The open/close uses the grid `0fr → 1fr` track trick: the height eases
 * without the snap of a conditional mount, `overflow-hidden` clips the rows as
 * they collapse, and the content fades in tandem. This is nested *inside* the
 * row's own Radix `Collapsible`, so it has its own local state.
 */

import { memo, useMemo, useState } from 'react';
import { ChevronDownFilled } from '@/lib/icons/central';
import { HEALTH_BADGE_CLASS, HEALTH_DOT_CLASS } from '@/primitives/HealthStatus';
import { getDeviceHealth, type DeviceHealth } from './deviceHealth';
import { DEFAULT_CONNECTION_STATE_LABELS } from './constants';
import { DeviceChildRow } from './DeviceChildRow';
import type { ConnectionState, Device, DevicesPanelStrings } from './types';

/** Severity dot + badge tone from the shared HealthStatus vocabulary. */
const HEALTH_TONE: Record<DeviceHealth, { dot: string; badge: string }> = {
  error: { dot: HEALTH_DOT_CLASS.error, badge: HEALTH_BADGE_CLASS.error },
  warning: { dot: HEALTH_DOT_CLASS.warning, badge: HEALTH_BADGE_CLASS.warning },
  offline: { dot: HEALTH_DOT_CLASS.offline, badge: HEALTH_BADGE_CLASS.offline },
  ok: { dot: HEALTH_DOT_CLASS.ok, badge: HEALTH_BADGE_CLASS.ok },
};

/**
 * Worst-tone-first ordering for the summary chips. `ok` is intentionally
 * omitted: the all-healthy state is the default, so a green "N ok" chip is
 * noise — the header only surfaces buckets that need attention.
 */
const SUMMARY_ORDER: DeviceHealth[] = ['error', 'warning', 'offline'];

function healthLabel(health: DeviceHealth, strings: DevicesPanelStrings): string {
  return {
    error: strings.healthError,
    warning: strings.healthWarning,
    offline: strings.healthOffline,
    ok: strings.healthHealthy,
  }[health];
}

export interface DeviceChildGroupProps {
  /** The composite parent whose `children` (sensors + camera) render here. */
  device: Device;
  strings: DevicesPanelStrings;
  /** Currently selected asset id, so a child row can show a selected state. */
  selectedChildId?: string | null;
  connectionStateLabels?: Record<ConnectionState, string>;
  onHover: (id: string | null) => void;
  onChildSelect?: (id: string) => void;
  /** Open the errors modal scoped to a specific child device. */
  onOpenChildErrors?: (child: Device) => void;
  onFlyTo?: (lat: number, lon: number) => void;
}

export const DeviceChildGroup = memo(function DeviceChildGroup({
  device,
  strings,
  selectedChildId,
  connectionStateLabels = DEFAULT_CONNECTION_STATE_LABELS,
  onHover,
  onChildSelect,
  onOpenChildErrors,
  onFlyTo,
}: DeviceChildGroupProps) {
  const children = device.children ?? [];
  const [open, setOpen] = useState(false);

  const summaryChips = useMemo(() => {
    const counts = children.reduce<Partial<Record<DeviceHealth, number>>>((acc, c) => {
      const h = getDeviceHealth(c);
      acc[h] = (acc[h] ?? 0) + 1;
      return acc;
    }, {});
    return SUMMARY_ORDER.filter((h) => counts[h]).map((h) => ({ health: h, count: counts[h]! }));
  }, [children]);

  if (children.length === 0) return null;

  return (
    <div className="px-3 pb-3" data-handoff-component="device-child-list">
      {/* Nested radii: outer rounded (4px) − p-1 (4px) = inner rounded-sm (2px). */}
      <div className="rounded border border-white/[0.06] bg-white/[0.04] p-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-start transition-colors duration-150 ease-out hover:bg-state-hover active:bg-state-pressed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-state-focus-ring"
        >
          <span className="text-xs-plus font-semibold uppercase tracking-wide text-white/55">
            {strings.sensorsGroupLabel}
          </span>
          <span className="text-xs-plus tabular-nums text-white/35">{children.length}</span>
          <span className="ms-auto flex items-center gap-1.5">
            {/* Summary chips carry the at-a-glance state while collapsed; once
                open the rows below carry the detail, so the chips retire. */}
            {!open && summaryChips.length > 0 && (
              <span className="flex flex-wrap items-center justify-end gap-1">
                {summaryChips.map(({ health, count }) => (
                  <span
                    key={health}
                    className={`inline-flex h-4 items-center rounded-[2px] px-1.5 text-2xs font-medium leading-4 tabular-nums ${HEALTH_TONE[health].badge}`}
                  >
                    {count} {healthLabel(health, strings)}
                  </span>
                ))}
              </span>
            )}
            {/* Collapsed: point toward inline-end (right in LTR, left in RTL).
                The Central icon self-mirrors via scaleX(-1) in RTL, but the
                down-chevron is symmetric so only the rotate sign matters. */}
            <ChevronDownFilled
              size={14}
              className={`shrink-0 text-white/40 transition-transform duration-150 motion-reduce:transition-none ${
                open ? '' : '-rotate-90 rtl:rotate-90'
              }`}
            />
          </span>
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div
              aria-hidden={!open}
              className={`mt-0.5 flex flex-col gap-0.5 transition-opacity duration-150 ease-out motion-reduce:transition-none ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {children.map((child) => (
                <DeviceChildRow
                  key={child.id}
                  device={child}
                  strings={strings}
                  inset
                  selected={selectedChildId === child.id}
                  connectionStateLabels={connectionStateLabels}
                  onHover={onHover}
                  onSelect={(id) => onChildSelect?.(id)}
                  onOpenErrors={onOpenChildErrors ? () => onOpenChildErrors(child) : undefined}
                  onFlyTo={onFlyTo}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
