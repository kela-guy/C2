/**
 * `/devices-lab` layout study — the chosen device-card direction.
 *
 * Collapsed rows show the device + always-on primary cluster (Show on map,
 * device On/Off). Expanding reveals telemetry (+ camera hero) and a footer
 * where action secondaries sit inline and low-signal inspect actions
 * (Logs / Notifications) collapse into a 3-dot overflow. Logs is the error
 * channel: it turns red with a count when the device has errors, so there is
 * no separate "Errors" control.
 *
 * Rows are flat (bottom-border list) to match today's real device rows —
 * no rounded card chrome, no expand chevron; the whole header is the expand
 * affordance. Actions render through `ActionControl` from
 * `presentationRules`. Sandbox-only.
 */

import { useState, type ReactNode } from 'react';
import { MoreVertical, AlertTriangle } from 'lucide-react';
import {
  ACTION_META,
  ActionControl,
  DEVICE_ACTIONS,
  DeviceCardProvider,
  LAB_DEVICES,
  type ActionId,
  type LabDevice,
} from './presentationRules';

const INSPECTION: ActionId[] = ['logs', 'notifications'];

// ---------------------------------------------------------------------------
// Shared low-fi card pieces
// ---------------------------------------------------------------------------

function DeviceTile({ device }: { device: LabDevice }) {
  return (
    <div
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded ${
        device.online ? 'bg-white/10' : 'bg-white/[0.04]'
      }`}
    >
      <device.Icon size={20} fill="white" />
    </div>
  );
}

function NameBlock({ device }: { device: LabDevice }) {
  const errorCount = device.errorCount ?? 0;
  return (
    <div className="min-w-0 flex-1 text-start">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium text-zinc-200">{device.name}</span>
        {errorCount > 0 && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-red-300 ring-1 ring-red-500/30"
            title={`${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`}
          >
            <AlertTriangle className="size-2.5" />
            {errorCount}
          </span>
        )}
      </div>
      <div className="truncate font-mono text-xs tabular-nums text-white/45">{device.meta}</div>
    </div>
  );
}

/** Always-visible primary cluster (Show on map + device On/Off), icon-only. */
function PrimaryCluster({ device }: { device: LabDevice }) {
  const { primary } = DEVICE_ACTIONS[device.kind];
  return (
    <div className="flex shrink-0 items-center gap-0.5" onClick={stop}>
      {primary.map((id) => (
        <ActionControl key={id} id={id} device={device} iconOnly />
      ))}
    </div>
  );
}

function Telemetry({ device }: { device: LabDevice }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-4 px-3 py-3">
      {device.stats.map((s) => (
        <div key={s.label} className="flex flex-col items-start gap-1">
          <span className="text-xs text-white/55">{s.label}</span>
          <span className={`font-sans text-xs tabular-nums ${s.color ?? 'text-white'}`}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function CameraHero() {
  return (
    <div className="relative h-24 w-full overflow-hidden bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-sm bg-black/80 px-1.5 py-0.5">
        <span className="size-1.5 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/90">Live</span>
      </div>
    </div>
  );
}

/**
 * Flat, collapsible row — mirrors today's `DeviceRow`: full-bleed, a
 * bottom hairline between rows, no rounded card, no chevron. The header is
 * the click target.
 */
function CardShell({
  open,
  onToggle,
  header,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  header: ReactNode;
  children?: ReactNode;
}) {
  return (
    <DeviceCardProvider>
      <div className="border-b border-white/[0.06]">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
          className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/25 ${
            open ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
          }`}
        >
          {header}
        </div>
        {open && children && (
          <div className="animate-in fade-in-0 duration-200 bg-white/[0.03] motion-reduce:animate-none">
            {children}
          </div>
        )}
      </div>
    </DeviceCardProvider>
  );
}

/** Bottom action bar shared by the variants. */
function FooterBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-3 py-2"
      onClick={stop}
    >
      {children}
    </div>
  );
}

function useExpand(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, toggle: () => setOpen((v) => !v) };
}

function stop(e: React.MouseEvent) {
  e.stopPropagation();
}

// ---------------------------------------------------------------------------
// Device card row — primary inline + 3-dot overflow for inspect actions
// ---------------------------------------------------------------------------

function OverflowMenu({ device, ids }: { device: LabDevice; ids: ActionId[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={stop}>
      <ActionControlButton open={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute end-0 z-20 mt-1 flex min-w-[180px] flex-col gap-0.5 rounded-md border border-white/10 bg-zinc-900 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            {ids.map((id) => {
              const m = ACTION_META[id];
              // Logs carries the error signal — the row goes red with a count
              // instead of there being a separate "Errors" entry.
              const count = id === 'logs' ? device.errorCount ?? 0 : 0;
              const hasErrors = count > 0;
              const label = hasErrors && id === 'logs' ? 'Logs · errors' : m.label;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    console.info(`[layout-lab] open ${id}`, device.id);
                  }}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 text-start text-xs [&_svg]:size-3 ${
                    hasErrors
                      ? 'text-red-300 hover:bg-red-500/10'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <span className={hasErrors ? 'text-red-300' : 'text-white/60'}>{m.icon}</span>
                  <span className="flex-1">{label}</span>
                  {hasErrors && (
                    <span className="rounded-full bg-red-500/20 px-1.5 text-[10px] font-medium text-red-300">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ActionControlButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="More actions"
      onClick={onClick}
      className={`inline-flex size-6 items-center justify-center rounded text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 [&_svg]:size-3 ${
        open ? 'bg-white/10 text-white' : ''
      }`}
    >
      <MoreVertical />
    </button>
  );
}

function DeviceCardRow({ device }: { device: LabDevice }) {
  const { open, toggle } = useExpand(device.kind === 'drone');
  const { secondary } = DEVICE_ACTIONS[device.kind];

  const inlineActions = secondary.filter((id) => !INSPECTION.includes(id));
  const overflowActions = secondary.filter((id) => INSPECTION.includes(id));
  const hasFooter = inlineActions.length > 0 || overflowActions.length > 0;

  return (
    <CardShell
      open={open}
      onToggle={toggle}
      header={
        <>
          <DeviceTile device={device} />
          <NameBlock device={device} />
          <PrimaryCluster device={device} />
        </>
      }
    >
      {device.cameraPreview && <CameraHero />}
      <Telemetry device={device} />
      {hasFooter && (
        <FooterBar>
          {inlineActions.map((id) => (
            <ActionControl key={id} id={id} device={device} />
          ))}
          {overflowActions.length > 0 && (
            <div className="ms-auto flex items-center gap-2">
              {inlineActions.length > 0 && (
                <span className="h-5 w-px bg-white/10" aria-hidden="true" />
              )}
              <OverflowMenu device={device} ids={overflowActions} />
            </div>
          )}
        </FooterBar>
      )}
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Lab surface
// ---------------------------------------------------------------------------

export function CardLayoutLab() {
  return (
    <section>
      <div className="w-full max-w-[380px] overflow-hidden rounded-md border border-white/[0.06] bg-[#141414]">
        {LAB_DEVICES.map((device) => (
          <DeviceCardRow key={device.id} device={device} />
        ))}
      </div>
    </section>
  );
}
