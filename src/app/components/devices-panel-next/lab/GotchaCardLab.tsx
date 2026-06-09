/**
 * `/devices-lab` → "Gotcha card" tab — sandbox studies for the Gotcha
 * (effector) device-card hierarchy.
 *
 * The Gotcha is a composite device: four directional sectors + a camera/net
 * "sit on top of it." In production today those children render as a flat
 * `DeviceChildRow` list dumped *below* the footer (see `DeviceRow`), so the
 * parent ↔ sensor ownership reads weakly. The two variations here each promote
 * that hierarchy with a different layout idea, while keeping the telemetry
 * grid and footer bar intact. Sandbox-only — nothing here ships; the winning
 * direction gets folded back into `DeviceRow`.
 *
 * Both studies reuse the production health vocabulary
 * (`DEVICE_HEALTH_VISUAL` / `getDeviceHealth` / `getEffectiveDeviceHealth`)
 * and are driven by the real seed unit via `gotchaUnitsToDevices`, so the
 * states on screen (3 sectors OK, Sector E warning, camera OK) are real.
 */

import { useState, type ReactNode } from 'react';
import { Bell, ChevronDownFilled, List, MoreVertical } from '@/lib/icons/central';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import {
  DEVICE_HEALTH_CRITICAL_PING,
  DEVICE_HEALTH_VISUAL,
  getDeviceHealth,
  getEffectiveDeviceHealth,
  getUnhealthyChildCount,
  type DeviceHealth,
} from '../../devices-panel/deviceHealth';
import type { Device } from '../../devices-panel/types';
import { splitFooterActions } from '../../devices-panel/footerOverflow';
import { GOTCHA_UNITS } from '../../gotcha/gotchaAssets';
import { gotchaUnitsToDevices } from '../../gotcha/gotchaUnitsToDevices';

// ---------------------------------------------------------------------------
// Shared health vocabulary (mirrors DeviceChildRow / DeviceRowHeader tones)
// ---------------------------------------------------------------------------

const HEALTH_TONE: Record<
  DeviceHealth,
  { dot: string; badge: string; ring: string; text: string; label: string }
> = {
  critical: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300', ring: 'ring-red-500/40', text: 'text-red-300', label: 'Critical' },
  error: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300', ring: 'ring-red-500/40', text: 'text-red-300', label: 'Errors' },
  warning: { dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300', ring: 'ring-amber-500/40', text: 'text-amber-300', label: 'Warning' },
  offline: { dot: 'bg-zinc-500', badge: 'bg-white/10 text-zinc-300', ring: 'ring-white/15', text: 'text-zinc-300', label: 'Offline' },
  ok: { dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300', ring: 'ring-emerald-500/30', text: 'text-emerald-300', label: 'Healthy' },
};

/** Worst-tone-first ordering for the inset summary chips (V3). */
const SUMMARY_ORDER: DeviceHealth[] = ['critical', 'error', 'warning', 'offline', 'ok'];

// ---------------------------------------------------------------------------
// Seed data — the real effector, adapted through the production mapper
// ---------------------------------------------------------------------------

const GOTCHA_DEVICE = gotchaUnitsToDevices(GOTCHA_UNITS)[0];

function getSensors(device: Device): Device[] {
  return (device.children ?? []).filter((c) => c.type !== 'camera');
}
function getCamera(device: Device): Device | undefined {
  return (device.children ?? []).find((c) => c.type === 'camera');
}

interface Stat {
  label: string;
  value: string;
  color?: string;
}

function deviceStats(device: Device): Stat[] {
  const health = getEffectiveDeviceHealth(device);
  return [
    { label: 'Location', value: `${device.lat.toFixed(3)}, ${device.lon.toFixed(3)}` },
    { label: 'Coverage', value: '360° ring' },
    { label: 'Health', value: HEALTH_TONE[health].label, color: HEALTH_TONE[health].text },
  ];
}

// ---------------------------------------------------------------------------
// Shared low-fi card pieces
// ---------------------------------------------------------------------------

/**
 * Health-aware icon tile — mirrors the production `DeviceRowHeader` tile.
 * Hovering surfaces the health state (worst-wins, with an affected count for
 * composite units) in a tooltip, so the surrounding chrome doesn't need to
 * repeat a severity badge.
 */
function HealthTile({ device, size = 'md' }: { device: Device; size?: 'sm' | 'md' | 'lg' }) {
  const composite = !!device.children?.length;
  const health = composite ? getEffectiveDeviceHealth(device) : getDeviceHealth(device);
  const visual = DEVICE_HEALTH_VISUAL[health];
  const tone = HEALTH_TONE[health];
  const dims = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const icon = size === 'lg' ? 20 : size === 'sm' ? 13 : 15;
  const unhealthy = composite ? getUnhealthyChildCount(device) : 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative flex ${dims} shrink-0 items-center justify-center rounded ${visual.tile}`}
          data-health={health}
        >
          {health === 'critical' && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded ${DEVICE_HEALTH_CRITICAL_PING} animate-ping motion-reduce:hidden`}
            />
          )}
          <device.Icon size={icon} fill={visual.iconFill} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        <span className="inline-flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
          <span>
            {tone.label}
            {composite && unhealthy > 0 ? (
              <span className="tabular-nums"> · {unhealthy} affected</span>
            ) : null}
          </span>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/** Dot + label severity badge — hidden when healthy. */
function HealthBadge({ health }: { health: DeviceHealth }) {
  if (health === 'ok') return null;
  const tone = HEALTH_TONE[health];
  return (
    <span
      className={`inline-flex h-4 shrink-0 items-center gap-1 rounded-[2px] px-1.5 text-[10px] font-medium leading-4 tabular-nums ${tone.badge}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
      {tone.label}
    </span>
  );
}

/**
 * Collapsed-style parent header, shown expanded across every study. The
 * unit-level health roll-up now lives on the tile's hover tooltip, so the
 * header no longer repeats a worst-wins severity badge.
 */
function ParentHeader({ device }: { device: Device }) {
  return (
    <div className="flex w-full items-center gap-2.5 bg-white/[0.04] px-4 py-2.5">
      <HealthTile device={device} size="lg" />
      <div className="min-w-0 flex-1 text-start">
        <div className="truncate text-sm font-medium text-zinc-300">{device.name}</div>
      </div>
      <ChevronDownFilled size={16} className="shrink-0 text-white/40" />
    </div>
  );
}

/** The telemetry grid — kept in every variation. */
function Telemetry({ device }: { device: Device }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3" data-handoff-component="device-detail-grid">
      {deviceStats(device).map((s) => (
        <div key={s.label} className="flex flex-col items-start gap-1">
          <span className="text-xs text-white/60">{s.label}</span>
          <span className={`text-xs tabular-nums ${s.color ?? 'text-white'}`}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

function GhostButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
        active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className={active ? 'text-white' : 'text-white/60'}>{icon}</span>
      {label}
    </button>
  );
}

interface FooterAction {
  key: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * The footer action bar — kept in every variation (effector: inspect actions).
 * Positional overflow: the first 3 actions stay inline; once the list grows
 * past that, the 4th+ collapse into the 3-dot menu, which only appears when
 * there is something to tuck away.
 */
function FooterBar({ actions }: { actions?: FooterAction[] }) {
  const [notify, setNotify] = useState(false);
  const items: FooterAction[] = actions ?? [
    { key: 'logs', icon: <List size={13} />, label: 'Logs' },
    {
      key: 'notifications',
      icon: <Bell size={13} />,
      label: 'Notifications',
      active: notify,
      onClick: () => setNotify((v) => !v),
    },
  ];
  const { inline, overflow, hasOverflow } = splitFooterActions(items);

  return (
    <div className="flex w-full items-center gap-1 border-t border-white/[0.06] px-2 py-1.5">
      {inline.map((a) => (
        <GhostButton key={a.key} icon={a.icon} label={a.label} active={a.active} onClick={a.onClick} />
      ))}
      {hasOverflow && <FooterOverflowMenu actions={overflow} />}
    </div>
  );
}

/** Real 3-dot dropdown for the footer overflow tail (4th action onward). */
function FooterOverflowMenu({ actions }: { actions: FooterAction[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative ms-auto">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex size-6 cursor-pointer items-center justify-center rounded text-white/60 transition-[background-color,color,transform] duration-150 ease-out active:scale-95 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
          open ? 'bg-white/10 text-white' : ''
        }`}
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute end-0 bottom-full z-30 mb-1 flex w-[180px] flex-col gap-0.5 rounded-md border border-white/10 bg-zinc-900 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                role="menuitem"
                aria-pressed={a.onClick ? !!a.active : undefined}
                onClick={() => {
                  a.onClick?.();
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-start text-xs transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98] [&_svg]:size-3 ${
                  a.active ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <span className={`inline-flex items-center ${a.active ? 'text-white' : 'text-white/60'}`}>
                  {a.icon}
                </span>
                <span className="flex-1 leading-none">{a.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Compact, selectable sensor row (reused by the spine + inset studies). */
function SensorRow({
  device,
  selected,
  rounded,
  onHover,
  onSelect,
}: {
  device: Device;
  selected?: boolean;
  rounded?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}) {
  const health = getDeviceHealth(device);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      data-selected={selected || undefined}
      onClick={() => onSelect?.(device.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(device.id);
        }
      }}
      onMouseEnter={() => onHover?.(device.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`flex min-h-[40px] cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/25 ${
        rounded ? 'rounded' : ''
      } ${selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04] active:bg-white/[0.06]'}`}
    >
      <HealthTile device={device} size="sm" />
      <div className="min-w-0 flex-1 text-start">
        <div className="truncate text-xs font-medium text-zinc-300">{device.name}</div>
      </div>
      <HealthBadge health={health} />
    </div>
  );
}

/** Labeled comparison frame around each study. */
function VariationFrame({
  index,
  title,
  rationale,
  children,
}: {
  index: number;
  title: string;
  rationale: string;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full max-w-[360px] flex-col gap-3">
      <header className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-white/40">V{index}</span>
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        </div>
        <p className="text-xs leading-snug text-white/50">{rationale}</p>
      </header>
      <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#141414] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// V2 — Nested spine (tree)
// ---------------------------------------------------------------------------

function V2Spine({ device }: { device: Device }) {
  const sensors = getSensors(device);
  const camera = getCamera(device);
  const children = camera ? [...sensors, camera] : sensors;
  const [sel, setSel] = useState<string | null>(null);

  return (
    <>
      <ParentHeader device={device} />
      <div className="bg-white/[0.03]">
        {/*
          Group label only — no roll-up badge. The unit's worst-wins state is
          already shown once in the parent header above; repeating it here (and
          again on the offending row) was the triple-badge duplication. Now the
          signal flows cleanly: unit summary (header) → the specific sensor(s)
          that carry it (the per-row badges below).
        */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Sensors</span>
          <span className="text-[11px] tabular-nums text-white/35">{children.length}</span>
        </div>
        <div className="ps-4 pe-2 pb-2">
          {children.map((child, i) => {
            const last = i === children.length - 1;
            return (
              <div key={child.id} className="flex items-stretch">
                <div className="relative w-5 shrink-0" aria-hidden="true">
                  <span className={`absolute start-2 w-px bg-white/10 ${last ? 'top-0 h-1/2' : 'inset-y-0'}`} />
                  <span className="absolute start-2 top-1/2 h-px w-2.5 bg-white/10" />
                </div>
                <div className="min-w-0 flex-1">
                  <SensorRow device={child} rounded selected={sel === child.id} onHover={setSel} onSelect={setSel} />
                </div>
              </div>
            );
          })}
        </div>
        <Telemetry device={device} />
        <FooterBar />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// V3 — Grouped inset panel (collapsible)
// ---------------------------------------------------------------------------

function V3Inset({ device }: { device: Device }) {
  const sensors = getSensors(device);
  const camera = getCamera(device);
  const children = camera ? [...sensors, camera] : sensors;
  const counts = children.reduce<Record<string, number>>((acc, c) => {
    const h = getDeviceHealth(c);
    acc[h] = (acc[h] ?? 0) + 1;
    return acc;
  }, {});
  const summaryChips = SUMMARY_ORDER.filter((h) => counts[h]);
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  return (
    <>
      <ParentHeader device={device} />
      <div className="bg-white/[0.03]">
        <Telemetry device={device} />
        <div className="px-3 pb-3">
          {/* Nested radii: outer rounded (4px) − p-1 (4px) = inner rounded-sm (2px). */}
          <div className="rounded border border-white/[0.06] bg-white/[0.04] p-1">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-start transition-colors duration-150 ease-out hover:bg-white/[0.04] active:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/25"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Sensors</span>
              <span className="text-[11px] tabular-nums text-white/35">{children.length}</span>
              <span className="ms-auto flex items-center gap-1.5">
                {/* Summary chips carry the at-a-glance state while collapsed;
                    once open the rows below carry the detail, so the chips
                    retire to avoid doubling up. */}
                {!open && summaryChips.length > 0 && (
                  <span className="flex flex-wrap items-center justify-end gap-1">
                    {summaryChips.map((h) => (
                      <span
                        key={h}
                        className={`inline-flex h-4 items-center gap-1 rounded-[2px] px-1.5 text-[10px] font-medium leading-4 tabular-nums ${HEALTH_TONE[h].badge}`}
                      >
                        <span className={`size-1.5 rounded-full ${HEALTH_TONE[h].dot}`} aria-hidden="true" />
                        {counts[h]} {HEALTH_TONE[h].label}
                      </span>
                    ))}
                  </span>
                )}
                <ChevronDownFilled
                  size={14}
                  className={`shrink-0 text-white/40 transition-transform duration-150 motion-reduce:transition-none ${
                    open ? '' : 'rotate-90 rtl:-rotate-90'
                  }`}
                />
              </span>
            </button>
            {/*
              Smooth collapse via the grid 0fr→1fr track trick: the height
              eases without the snap of a conditional mount, and content fades
              in tandem. `overflow-hidden` on the track child clips the rows
              (and zeroes its min-height) so the row fully closes.
            */}
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
                  {children.map((c) => (
                    <SensorRow key={c.id} device={c} rounded selected={sel === c.id} onHover={setSel} onSelect={setSel} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <FooterBar />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// V4 — Collapsible nested spine (tree + toggle)
// ---------------------------------------------------------------------------

/**
 * Fuses V2's connector-rail tree with V3's collapse interaction: the ownership
 * reads as an explicit spine, but the whole branch tucks away behind a toggle.
 * Collapsed, the group header carries the health roll-up chips (like V3);
 * expanded, the rail + per-row badges carry the detail (like V2). The rail
 * lives *inside* the collapsing track so it grows and clips with the rows.
 */
function V4SpineCollapse({ device }: { device: Device }) {
  const sensors = getSensors(device);
  const camera = getCamera(device);
  const children = camera ? [...sensors, camera] : sensors;
  const counts = children.reduce<Record<string, number>>((acc, c) => {
    const h = getDeviceHealth(c);
    acc[h] = (acc[h] ?? 0) + 1;
    return acc;
  }, {});
  const summaryChips = SUMMARY_ORDER.filter((h) => counts[h]);
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  return (
    <>
      <ParentHeader device={device} />
      <div className="bg-white/[0.03]">
        {/*
          The group label becomes the toggle. Collapsed, the summary chips stand
          in for the hidden rows; open, they retire so the rail + per-row badges
          carry the specifics — same single-source-of-signal discipline as V3.
        */}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-2 px-4 pt-3 pb-1 text-start transition-colors duration-150 ease-out hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/25"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Sensors</span>
          <span className="text-[11px] tabular-nums text-white/35">{children.length}</span>
          <span className="ms-auto flex items-center gap-1.5">
            {!open && summaryChips.length > 0 && (
              <span className="flex flex-wrap items-center justify-end gap-1">
                {summaryChips.map((h) => (
                  <span
                    key={h}
                    className={`inline-flex h-4 items-center gap-1 rounded-[2px] px-1.5 text-[10px] font-medium leading-4 tabular-nums ${HEALTH_TONE[h].badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${HEALTH_TONE[h].dot}`} aria-hidden="true" />
                    {counts[h]} {HEALTH_TONE[h].label}
                  </span>
                ))}
              </span>
            )}
            <ChevronDownFilled
              size={14}
              className={`shrink-0 text-white/40 transition-transform duration-150 motion-reduce:transition-none ${
                open ? '' : 'rotate-90 rtl:-rotate-90'
              }`}
            />
          </span>
        </button>
        {/* Same grid 0fr→1fr collapse track as V3; the spine rail rides inside it. */}
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div
              aria-hidden={!open}
              className={`ps-4 pe-2 pb-2 transition-opacity duration-150 ease-out motion-reduce:transition-none ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {children.map((child, i) => {
                const last = i === children.length - 1;
                return (
                  <div key={child.id} className="flex items-stretch">
                    <div className="relative w-5 shrink-0" aria-hidden="true">
                      <span className={`absolute start-2 w-px bg-white/10 ${last ? 'top-0 h-1/2' : 'inset-y-0'}`} />
                      <span className="absolute start-2 top-1/2 h-px w-2.5 bg-white/10" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <SensorRow device={child} rounded selected={sel === child.id} onHover={setSel} onSelect={setSel} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <Telemetry device={device} />
        <FooterBar />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Lab surface
// ---------------------------------------------------------------------------

export function GotchaCardLab() {
  if (!GOTCHA_DEVICE) return null;
  const device = GOTCHA_DEVICE;

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-[640px] text-xs leading-relaxed text-white/55">
        The Gotcha is a composite effector — four directional sectors plus a camera/net sit on top of one unit. Today
        those children render as a flat list dumped below the footer, so the parent ↔ sensor hierarchy reads weakly.
        The directions below promote that hierarchy while keeping the telemetry grid and footer bar intact. Hover
        or focus a sensor to see its states; in V3 and V4, toggle the sensors group open/closed.
      </p>

      <div className="flex flex-wrap gap-x-10 gap-y-12">
        <VariationFrame
          index={2}
          title="Nested spine"
          rationale="Sensors branch off the parent on a connector rail — an explicit tree that names the ownership. One unit roll-up in the header; per-row badges for the specifics."
        >
          <V2Spine device={device} />
        </VariationFrame>

        <VariationFrame
          index={3}
          title="Grouped inset panel"
          rationale="Containment communicates belonging: a collapsible inset surface. Collapsed, its header shows the health roll-up; expanded, the rows carry the detail."
        >
          <V3Inset device={device} />
        </VariationFrame>

        <VariationFrame
          index={4}
          title="Collapsible nested spine"
          rationale="The tree spine from V2 wired to V3's toggle: ownership reads explicitly on the connector rail, but the whole branch tucks away. Collapsed, chips carry the roll-up; expanded, the rail + per-row badges carry the detail."
        >
          <V4SpineCollapse device={device} />
        </VariationFrame>
      </div>
    </div>
  );
}
