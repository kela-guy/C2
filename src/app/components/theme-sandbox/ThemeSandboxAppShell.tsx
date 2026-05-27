/**
 * Sandbox host that mounts the real `C2AppShell` with a small but
 * representative composition — three left tabs, two right tabs, and
 * a main canvas with surface-laddered panels so every substrate
 * level paints in the picked theme.
 *
 * Strings are hardcoded English. This route is DEV-only (it ships
 * out of production via the `import.meta.env.DEV` gate in
 * `src/app/App.tsx`), so the cost of wiring it through `useStrings`
 * would buy nothing.
 */

import {
  Radar,
  Radio,
  Camera,
  History,
  AlertTriangle,
  Gauge,
  Activity,
} from "@/lib/icons/central";

import { C2AppShell } from "@/app/components/gridblock";

export function ThemeSandboxAppShell() {
  return (
    <C2AppShell
      main={<MainCanvas />}
      leftTabs={[
        {
          id: "overview",
          label: "Overview",
          icon: <Radar size={16} />,
          panel: <OverviewPanel />,
        },
        {
          id: "devices",
          label: "Devices",
          icon: <Radio size={16} />,
          panel: <DevicesPanel />,
        },
        {
          id: "history",
          label: "History",
          icon: <History size={16} />,
          panel: <HistoryPanel />,
        },
      ]}
      rightTabs={[
        {
          id: "cameras",
          label: "Cameras",
          icon: <Camera size={16} />,
          panel: <CamerasPanel />,
        },
        {
          id: "alerts",
          label: "Alerts",
          icon: <AlertTriangle size={16} />,
          panel: <AlertsPanel />,
        },
      ]}
      defaultLeftTab="overview"
      defaultRightTab="cameras"
    />
  );
}

function MainCanvas() {
  return (
    <div className="relative flex flex-1 min-h-0 flex-col gap-3 overflow-hidden bg-surface-1 p-6">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Active tracks" value="24" trend="+3" tone="info" />
        <KpiCard label="Alerts" value="7" trend="+2" tone="warning" />
        <KpiCard label="Mitigations" value="12" trend="0" tone="success" />
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-3 gap-3">
        <div className="col-span-2 flex flex-col gap-3 rounded-md bg-surface-2 p-4 shadow-[var(--shadow-3)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-12">
              Sector overview
            </h2>
            <span className="text-[11px] font-mono text-slate-9">N32.12 / E34.78</span>
          </div>
          <div className="flex-1 rounded bg-surface-void/60" />
          <div className="flex items-center gap-2 text-[11px] text-slate-10">
            <Gauge size={12} className="text-accent-info" />
            <span>Substrate ladder painted over surface-void well.</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md bg-surface-2 p-4 shadow-[var(--shadow-3)]">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-12">
            Telemetry
          </h2>
          <TelemetryRow label="Altitude" value="1,240 m" />
          <TelemetryRow label="Heading" value="216°" />
          <TelemetryRow label="Speed" value="42 m/s" />
          <TelemetryRow label="Confidence" value="0.87" />
          <div className="mt-auto flex items-center gap-2 rounded bg-accent-info-tint px-3 py-2 text-[11px] text-slate-12">
            <Activity size={12} className="text-accent-info" />
            <span>Track held for 14 m 22 s.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: "info" | "warning" | "success";
}) {
  const trendClass = {
    info: "text-accent-info",
    warning: "text-accent-warning",
    success: "text-accent-success",
  }[tone];
  return (
    <div className="rounded-md bg-surface-2 p-4 shadow-[var(--shadow-2)]">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-9">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tabular-nums text-slate-12">
          {value}
        </span>
        <span className={`text-[12px] font-mono ${trendClass}`}>{trend}</span>
      </div>
    </div>
  );
}

function TelemetryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle pb-1.5 text-[12px] last:border-b-0">
      <span className="text-slate-10">{label}</span>
      <span className="font-mono tabular-nums text-slate-12">{value}</span>
    </div>
  );
}

function OverviewPanel() {
  return (
    <div className="space-y-2 p-3 text-[12px]">
      <Section title="Active engagement">
        <p className="text-slate-11">
          Three drones inbound from sector 2. Two ECM tracks engaged, one
          confirmed mitigated at 11:42 UTC.
        </p>
      </Section>
      <Section title="Recent events">
        <ul className="space-y-1 text-slate-10">
          {[
            "11:42 — Mitigation confirmed",
            "11:39 — ECM engaged on T-203",
            "11:36 — Detection at sector 2",
            "11:31 — Operator handover from Bravo",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-info" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function DevicesPanel() {
  const rows = [
    { name: "PTZ Camera 01", status: "online", tone: "success" as const },
    { name: "PixelSight 02", status: "warning", tone: "warning" as const },
    { name: "X-Band Radar", status: "online", tone: "success" as const },
    { name: "Regulus N. ECM", status: "active", tone: "info" as const },
    { name: "Floodlight 01", status: "offline", tone: "danger" as const },
  ];
  return (
    <div className="space-y-1 p-3 text-[12px]">
      {rows.map((row) => (
        <div
          key={row.name}
          className="flex items-center justify-between rounded px-2 py-2 hover:bg-state-hover"
        >
          <span className="text-slate-12">{row.name}</span>
          <Chip tone={row.tone} label={row.status} />
        </div>
      ))}
    </div>
  );
}

function HistoryPanel() {
  return (
    <div className="space-y-2 p-3 text-[12px]">
      <Section title="Past 24 hours">
        <p className="text-slate-11">
          18 detections, 11 classifications, 4 mitigations.
        </p>
      </Section>
      <Section title="Top hours">
        <div className="space-y-1.5">
          {[
            ["11:00", 0.6],
            ["12:00", 0.85],
            ["13:00", 0.45],
            ["14:00", 0.3],
            ["15:00", 0.7],
          ].map(([hour, w]) => (
            <div key={String(hour)} className="flex items-center gap-2">
              <span className="w-10 font-mono text-slate-10">{hour}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-state-hover">
                <div
                  className="h-full rounded-full bg-accent-info"
                  style={{ width: `${(Number(w) * 100).toFixed(0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function CamerasPanel() {
  return (
    <div className="space-y-2 p-3 text-[12px]">
      <Section title="Pinned to feed">
        <div className="rounded bg-surface-void aspect-video" />
        <p className="mt-2 text-slate-10">PTZ-01 · sector 2 north</p>
      </Section>
      <Section title="Available">
        <div className="grid grid-cols-2 gap-2">
          {["PTZ-02", "PTZ-03", "Fixed-04", "Fixed-05"].map((name) => (
            <div
              key={name}
              className="flex flex-col gap-1 rounded bg-surface-3 p-2 shadow-[var(--shadow-2)]"
            >
              <div className="aspect-video rounded bg-surface-void/70" />
              <span className="text-[11px] text-slate-11">{name}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function AlertsPanel() {
  const items = [
    { label: "T-203 inbound", level: "warning" as const, time: "−2 m" },
    { label: "Sensor degraded", level: "warning" as const, time: "−8 m" },
    { label: "Auth timeout", level: "danger" as const, time: "−14 m" },
    { label: "ECM nominal", level: "success" as const, time: "−21 m" },
  ];
  return (
    <div className="space-y-1 p-3 text-[12px]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded border border-border-subtle bg-surface-3 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Chip tone={item.level} label={item.level} />
            <span className="text-slate-12">{item.label}</span>
          </div>
          <span className="font-mono text-slate-9">{item.time}</span>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded bg-surface-3 p-3 shadow-[var(--shadow-2)]">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-9">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Chip({
  tone,
  label,
}: {
  tone: "info" | "warning" | "success" | "danger";
  label: string;
}) {
  const cls = {
    info: "bg-accent-info-tint text-accent-info",
    warning: "bg-accent-warning-tint text-accent-warning",
    success: "bg-accent-success-tint text-accent-success",
    danger: "bg-accent-danger-tint text-accent-danger",
  }[tone];
  return (
    <span
      className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
