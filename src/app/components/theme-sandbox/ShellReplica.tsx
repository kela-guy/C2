import { useCallback, useRef, useState } from 'react';
import {
  Bell,
  Layers,
  List,
  MapPin,
  Palette,
  Sparkles,
  Video,
} from '@/lib/icons/central';
import ListOfSystems, {
  type Detection,
  type RegulusEffector,
} from '@/imports/ListOfSystems';
import {
  cuas_classified,
  cuas_mitigating,
  cuas_possible_threat,
  drone_friendly,
  drone_hostile,
  drone_unknown,
  flow1_suspicion,
  flow2_mitigated,
  flow2_tracking,
} from '@/test-utils/mockDetections';
import { useStrings } from '@/lib/intl';
import { LAYOUT_TOKENS } from '@/primitives/tokens';
import { useIsRtl } from '@/lib/direction';
import { DevicesPanel } from '../devices-panel';
import { MOCK_DEVICES } from '../devices-panel-next/mockDevices';
import { MapDrawProvider } from '../map-draw/MapDrawProvider';
import { FloatingGeoEntitiesControl } from '../map-draw/FloatingGeoEntitiesControl';

/**
 * Real-component shell for the Theme Sandbox.
 *
 * Mounts the ACTUAL production pieces — `ListOfSystems` with the real
 * `TargetCard`s (fed by the shared mock detections), and the real
 * `DevicesPanel` (fed by the devices-lab mock registry) — inside a
 * lightweight rail + map-chrome frame. No Cesium, no video panel, no
 * Dashboard hooks; the heavy bits stay out of the bundle. The map
 * itself is intentionally blank so the token palette shows through as
 * an unadorned surface — the sandbox is a color audition surface.
 *
 * Colors: the production components paint from hardcoded values, so the
 * sandbox applies the `compat.ts` override stylesheet (scoped by
 * `data-theme-sandbox-scope` on the page root) to remap their surfaces,
 * text tiers, and interactive accents onto the live theme tokens.
 */

// Noop stubs matching Dashboard's signatures so every TargetCard button
// has a defined callback and renders/behaves the same as on `/` — the
// sandbox just doesn't mutate mock data on click.
const noop = () => {};
const noopStr = (_a?: string) => {};
const noopStrStr = (_a?: string, _b?: string) => {};
const EMPTY_ARRAY: never[] = [];
const EMPTY_MAP: Map<string, string> = new Map();
const EMPTY_RECORD: Record<string, never[]> = {};
const EMPTY_SELECTED: Record<string, Map<string, string>> = {};

// Same effector fixture the styleguide uses so mitigation cards render
// their jamming UI (see StyleguidePage's `styleguideEffectors`).
const SANDBOX_EFFECTORS: RegulusEffector[] = [
  { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
];

// A spread of lifecycle states: suspicion, tracking, classified, possible
// threat, mitigating, affiliation trio, plus one completed target so the
// "completed" tab has content.
const SANDBOX_TARGETS: Detection[] = [
  cuas_classified,
  cuas_mitigating,
  flow2_tracking,
  cuas_possible_threat,
  flow1_suspicion,
  drone_hostile,
  drone_friendly,
  drone_unknown,
  flow2_mitigated,
];

export function ShellReplica() {
  const t = useStrings();
  const isRtl = useIsRtl();
  const asideRef = useRef<HTMLElement>(null);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(LAYOUT_TOKENS.sidebarWidthPx);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [floodlightOnIds, setFloodlightOnIds] = useState<Set<string>>(new Set());
  const [speakerPlayingIds, setSpeakerPlayingIds] = useState<Set<string>>(new Set());
  const [pinnedDeviceIds, setPinnedDeviceIds] = useState<Set<string>>(new Set());

  const toggleId = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, next?: boolean) => {
      setter((prev: Set<string>) => {
        const updated = new Set(prev);
        const shouldHave = next ?? !updated.has(id);
        if (shouldHave) updated.add(id);
        else updated.delete(id);
        return updated;
      });
    },
    [],
  );

  const handleTargetClick = useCallback((target: Detection) => {
    setActiveTargetId((prev: string | null) => (prev === target.id ? null : target.id));
  }, []);

  // Sidebar resize handle — direct port of Dashboard's implementation.
  // Uses pointer capture + a fixed-position overlay so the drag survives
  // pointer excursions outside the window / DevTools, and snaps to the
  // sidebar step interval on release.
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      setIsDragging(true);
      setIsSnapping(false);
      document.body.style.userSelect = 'none';

      const overlay = document.createElement('div');
      overlay.id = 'resize-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '9999',
        cursor: 'col-resize',
      });
      document.body.appendChild(overlay);

      const target = e.currentTarget;
      const pointerId = e.pointerId;

      const cleanup = () => {
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', onUp);
        target.removeEventListener('pointercancel', onUp);
        target.removeEventListener('lostpointercapture', onUp);
        document.body.style.userSelect = '';
        const el = document.getElementById('resize-overlay');
        if (el) el.remove();
      };

      const onMove = (ev: PointerEvent) => {
        const aside = asideRef.current;
        if (!aside) return;
        const parent = aside.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const distance = isRtl
          ? rect.right - ev.clientX
          : ev.clientX - rect.left;
        const newWidth = Math.round(
          Math.max(
            LAYOUT_TOKENS.sidebarMinWidth,
            Math.min(LAYOUT_TOKENS.sidebarMaxWidth, distance),
          ),
        );
        setSidebarWidth(newWidth);
      };

      const onUp = () => {
        cleanup();
        setSidebarWidth((prev: number) => {
          const snapped =
            Math.round(prev / LAYOUT_TOKENS.sidebarSnapInterval) *
            LAYOUT_TOKENS.sidebarSnapInterval;
          return Math.max(
            LAYOUT_TOKENS.sidebarMinWidth,
            Math.min(LAYOUT_TOKENS.sidebarMaxWidth, snapped),
          );
        });
        setIsSnapping(true);
        setIsDragging(false);
        setTimeout(() => setIsSnapping(false), 200);
      };

      try {
        target.setPointerCapture(pointerId);
      } catch {
        // setPointerCapture may throw if the pointer is already released;
        // the listeners below still cover the normal completion path.
      }
      target.addEventListener('pointermove', onMove);
      target.addEventListener('pointerup', onUp);
      target.addEventListener('pointercancel', onUp);
      target.addEventListener('lostpointercapture', onUp);
    },
    [isRtl],
  );

  return (
    <MapDrawProvider>
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-surface-1 text-slate-12">
      <IconRail
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v: boolean) => !v)}
        devicesOpen={devicesOpen}
        onToggleDevices={() => setDevicesOpen((v: boolean) => !v)}
      />

      {/* Positioned ancestor for the absolutely-docked DevicesPanel and
          the absolute-positioned target aside, mirroring Dashboard's
          layout region. */}
      <div className="relative flex min-w-0 flex-1">
        {/* Real target sidebar — 1-to-1 copy of Dashboard.tsx:2299-2396:
            absolute-positioned, slide-out via translate-x, draggable
            resize handle on the inline-end edge, white/70 header that
            compat.ts remaps onto the theme's slate ramp. */}
        <aside
          ref={asideRef}
          data-handoff-component="target-list"
          className={`
            absolute top-0 bottom-0 start-0 border-e border-white/10 flex flex-col ${isDragging ? '' : isSnapping ? '' : 'transition-[transform,opacity] duration-300 ease-in-out'} z-30
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}
          `}
          style={{
            width: sidebarWidth,
            backgroundColor: 'var(--surface-2)',
            ...(isDragging ? { transition: 'none', willChange: 'width' } : {}),
            ...(isSnapping ? { transition: 'width 200ms ease-out' } : {}),
          }}
        >
          {sidebarOpen && (
            <div
              onPointerDown={handleResizePointerDown}
              className={`absolute end-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize transition-colors ${isDragging ? 'bg-white/20' : 'bg-transparent hover:bg-state-hover-overlay'}`}
            />
          )}
          <div className="flex items-center px-4 h-9 border-b border-white/10">
            <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
              {t.dashboard.activeSystemsHeading(SANDBOX_TARGETS.length)}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto" data-handoff-component="target-card">
            <ListOfSystems
              className="flex flex-col gap-0"
              targets={SANDBOX_TARGETS}
              activeTargetId={activeTargetId}
              onTargetClick={handleTargetClick}
              onVerify={noop}
              onDismiss={noop}
              onCancelMission={noop}
              onCompleteMission={noop}
              onEngage={noop}
              onBdaCamera={noopStr}
              onSendDroneVerification={noopStr}
              droneVerifyingTargetId={null}
              onSensorHover={noopStr}
              onCameraLookAt={noopStrStr}
              onTakeControl={noopStr}
              onReleaseControl={noopStr}
              onSensorModeChange={noop}
              onPlaybookSelect={noopStrStr}
              onClosureOutcome={noop}
              onAdvanceFlowPhase={noopStr}
              nearbyCameras={EMPTY_ARRAY}
              nearbyHives={EMPTY_ARRAY}
              onEscalateCreatePOI={noopStr}
              onEscalateSendDrone={noopStr}
              onDroneSelect={noopStrStr}
              onDroneOverride={noopStr}
              onDroneResume={noopStr}
              onDroneRTB={noopStr}
              onMissionActivate={noopStr}
              onMissionPause={noopStr}
              onMissionResume={noopStr}
              onMissionOverride={noopStr}
              onMissionCancel={noopStr}
              missionPlanningMode={null}
              onPlanningRemoveWaypoint={noop}
              onPlanningToggleLoop={noopStr}
              onPlanningFinalize={noopStr}
              onPlanningUpdateWaypoint={noop}
              onPlanningSetRepetitions={noop}
              onPlanningSetDwellTime={noop}
              onPlanningSetScanCenter={noop}
              onPlanningSetScanWidth={noop}
              onPlanningSetScanSteps={noop}
              onPlanningSelectCamera={noopStr}
              onPlanningZoomCameras={noopStr}
              onMitigate={noop}
              onMitigateAll={noop}
              onEffectorSelect={noop}
              onEngageGotcha={noop}
              onGotchaSelect={noop}
              regulusEffectors={SANDBOX_EFFECTORS}
              selectedEffectorIds={EMPTY_MAP}
              onPointWeapon={noop}
              onLockWeapon={noop}
              onDismissLock={noop}
              onLauncherSelect={noop}
              launcherEffectors={EMPTY_ARRAY}
              selectedLauncherIds={EMPTY_MAP}
              flowAssets={EMPTY_RECORD}
              flowSelectedIds={EMPTY_SELECTED}
              onBdaOutcome={noop}
              cameraActiveTargetId={null}
              cameraPointingTargetId={null}
              allCamerasBusyForTarget={null}
              controlRequestCountdown={null}
              controlRequestTargetId={null}
              onRequestCameraControl={noopStr}
              onSensorFocus={noopStr}
              onTargetFocus={noopStr}
              onTargetHover={noopStr}
              thinMode
            />
          </div>
        </aside>

        <MainWorkspace />

        {/* Real devices panel — docks over the inline-start edge, same as
            the Dashboard / DevicesLabPage mounts. */}
        {devicesOpen && (
          <DevicesPanel
            devices={MOCK_DEVICES}
            open
            noTransition
            title={t.dashboard.devicesPanelTitle}
            closeAriaLabel={t.dashboard.devicesPanelClose}
            typeLabels={t.devices.typeLabels}
            connectionStateLabels={t.devices.connectionLabels}
            strings={t.devices.strings}
            onClose={() => setDevicesOpen(false)}
            onFlyTo={() => {}}
            onJamActivate={() => {}}
            onFloodlightToggle={(id, next) => toggleId(setFloodlightOnIds, id, next)}
            onSpeakerToggle={(id, next) => toggleId(setSpeakerPlayingIds, id, next)}
            onPinToFeed={(id) => toggleId(setPinnedDeviceIds, id, true)}
            onUnpinFromFeed={(id) => toggleId(setPinnedDeviceIds, id, false)}
            floodlightOnIds={floodlightOnIds}
            speakerPlayingIds={speakerPlayingIds}
            pinnedDeviceIds={pinnedDeviceIds}
          />
        )}
      </div>
    </div>
    </MapDrawProvider>
  );
}

// ── Icon Rail ─────────────────────────────────────────────────────────────

function IconRail({
  sidebarOpen,
  onToggleSidebar,
  devicesOpen,
  onToggleDevices,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  devicesOpen: boolean;
  onToggleDevices: () => void;
}) {
  return (
    <nav className="relative z-10 flex w-8 flex-shrink-0 flex-col items-center justify-start border-e border-border-subtle bg-surface-2">
      <div className="flex h-9 w-full items-center justify-center">
        <div className="size-4 rounded-sm bg-primary" aria-hidden />
      </div>
      <div className="h-px w-full bg-border-subtle" />

      <div className="flex w-fit flex-1 flex-col items-center gap-0.5 py-2">
        <RailButton icon={List} label="Targets" active={sidebarOpen} onClick={onToggleSidebar} />
        <RailButton icon={Layers} label="Devices" active={devicesOpen} onClick={onToggleDevices} />
        <RailButton icon={Video} label="Cameras" />
        <RailButton icon={MapPin} label="Geo" />
      </div>

      <div className="h-px w-full bg-border-subtle" />
      <div className="flex flex-col items-center gap-0.5 py-2">
        <RailButton icon={Sparkles} label="Flow" />
        <RailButton icon={Palette} label="Style" />
        <RailButton icon={Bell} label="Alerts" />
      </div>
    </nav>
  );
}

function RailButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active ? 'true' : undefined}
      onClick={onClick}
      className={
        active
          ? 'flex size-6 items-center justify-center rounded bg-state-selected text-slate-12 ring-1 ring-inset ring-border-strong'
          : 'flex size-6 items-center justify-center rounded text-slate-9 transition-colors hover:bg-state-hover hover:text-slate-12'
      }
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  );
}

// ── Main Workspace (fake map + component strip) ───────────────────────────

function MainWorkspace() {
  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <MapWell />
      <ComponentStrip />
    </main>
  );
}

// Wraps `FloatingGeoEntitiesControl` with a self-contained `panelOpen`
// flag. The sandbox has no docked map-draw panel to mirror, so open/close
// just toggle local state so the control's contract stays satisfied.
function SandboxFloatingGeoEntities() {
  const [panelOpen, setPanelOpen] = useState(false);
  return (
    <FloatingGeoEntitiesControl
      panelOpen={panelOpen}
      onOpenPanel={() => setPanelOpen(true)}
      onClosePanel={() => setPanelOpen(false)}
    />
  );
}

function MapWell() {
  return (
    // Map itself is intentionally blank so the token surface shows
    // through as an unadorned backdrop — the sandbox is a color
    // audition surface. UI chrome (zoom, compass, floating control,
    // coordinate strip) stays on top.
    <div className="relative flex-1 overflow-hidden bg-surface-void">
      {/* Floating map controls — top-left */}
      <div className="absolute start-3 top-3 flex flex-col gap-1 rounded border border-border-default bg-surface-2 p-1 shadow-[var(--shadow-3)]">
        <button
          type="button"
          aria-label="Zoom in"
          className="flex size-6 items-center justify-center rounded text-slate-11 hover:bg-state-hover hover:text-slate-12"
        >
          +
        </button>
        <div className="h-px w-full bg-border-subtle" />
        <button
          type="button"
          aria-label="Zoom out"
          className="flex size-6 items-center justify-center rounded text-slate-11 hover:bg-state-hover hover:text-slate-12"
        >
          −
        </button>
      </div>

      {/* Fake compass — top-right, nudged below the floating Geo Entities
          control so both fit without overlapping. */}
      <div className="absolute end-3 top-12 flex size-10 items-center justify-center rounded-full border border-border-default bg-surface-2 font-mono text-2xs font-semibold text-slate-11 shadow-[var(--shadow-3)]">
        N
      </div>

      {/* Real floating Geo Entities control — same mount as Dashboard's
          top-right entry point. `MapDrawProvider` wraps the whole
          ShellReplica so `useMapDraw()` inside this component resolves. */}
      <SandboxFloatingGeoEntities />

      {/* Bottom coordinate strip */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-border-subtle bg-surface-1/80 px-3 py-1.5 font-mono text-2xs text-slate-10 backdrop-blur-sm">
        <span>32.0853° N · 34.7818° E</span>
        <span>ZOOM 14 · TILT 42°</span>
      </div>
    </div>
  );
}

function ComponentStrip() {
  return (
    <div className="flex flex-col gap-3 border-t border-border-default bg-surface-2 px-4 py-3">
      <div className="flex items-center gap-2 font-mono text-xs-plus uppercase tracking-[0.18em] text-slate-9">
        <span>Component preview</span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DemoButton variant="primary">Engage</DemoButton>
        <DemoButton variant="secondary">Track</DemoButton>
        <DemoButton variant="outline">Details</DemoButton>
        <DemoButton variant="ghost">Cancel</DemoButton>
        <DemoButton variant="destructive">Abort</DemoButton>
        <span className="mx-1 h-5 w-px bg-border-subtle" />
        <DemoBadge variant="primary">Active</DemoBadge>
        <DemoBadge variant="secondary">Queued</DemoBadge>
        <DemoBadge variant="success">Nominal</DemoBadge>
        <DemoBadge variant="warning">Stale</DemoBadge>
        <DemoBadge variant="danger">Alert</DemoBadge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-1 min-w-[180px] flex-col gap-1">
          <span className="text-2xs uppercase tracking-[0.14em] text-slate-10">
            Callsign
          </span>
          <input
            type="text"
            defaultValue="ATLAS-9"
            className="h-8 rounded border border-border-default bg-surface-3 px-2.5 text-xs text-slate-12 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </label>
        <DemoSwitch />
        <DemoTabs />
      </div>
    </div>
  );
}

// ── Demo controls — painted on semantic tokens so pickers repaint them ───

function DemoButton({
  variant,
  size = 'default',
  children,
}: {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm';
  children: React.ReactNode;
}) {
  const base =
    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.98]';
  const sizeCls = size === 'sm' ? 'h-7 px-2.5 text-xs-plus' : 'h-8 px-3 text-xs';
  const variantCls: Record<typeof variant, string> = {
    primary:
      'bg-primary text-primary-foreground hover:opacity-90 active:opacity-100',
    secondary:
      'bg-secondary text-secondary-foreground hover:opacity-90 active:opacity-100',
    outline:
      'border border-border-strong bg-transparent text-slate-12 hover:bg-state-hover',
    ghost: 'bg-transparent text-slate-11 hover:bg-state-hover hover:text-slate-12',
    destructive:
      'bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-100',
  };
  return (
    <button type="button" className={base + ' ' + sizeCls + ' ' + variantCls[variant]}>
      {children}
    </button>
  );
}

function DemoBadge({
  variant,
  children,
}: {
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const base =
    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium uppercase tracking-[0.12em]';
  const variantCls: Record<typeof variant, string> = {
    primary: 'bg-primary-tint text-slate-12 ring-1 ring-inset ring-primary/40',
    secondary:
      'bg-secondary-tint text-slate-12 ring-1 ring-inset ring-secondary/40',
    success: 'bg-accent-success-tint text-accent-success',
    warning: 'bg-accent-warning-tint text-accent-warning',
    danger: 'bg-accent-danger-tint text-accent-danger',
  };
  return <span className={base + ' ' + variantCls[variant]}>{children}</span>;
}

function DemoSwitch() {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-11">
      <span
        aria-hidden
        className="relative inline-flex h-4 w-7 items-center rounded-full bg-primary ring-1 ring-inset ring-border-strong"
      >
        <span className="ms-auto me-0.5 size-3 rounded-full bg-primary-foreground shadow-[var(--shadow-2)]" />
      </span>
      Auto-follow
    </label>
  );
}

function DemoTabs() {
  return (
    <div className="inline-flex overflow-hidden rounded-[var(--radius)] border border-border-default bg-surface-3">
      <button
        type="button"
        className="bg-primary px-2.5 py-1 text-xs-plus font-medium text-primary-foreground"
      >
        Live
      </button>
      <button
        type="button"
        className="px-2.5 py-1 text-xs-plus text-slate-10 hover:bg-state-hover hover:text-slate-12"
      >
        Historical
      </button>
      <button
        type="button"
        className="px-2.5 py-1 text-xs-plus text-slate-10 hover:bg-state-hover hover:text-slate-12"
      >
        Simulation
      </button>
    </div>
  );
}
