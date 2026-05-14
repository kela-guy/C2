/**
 * Dashboard — the GridblockShell-based dashboard hosted at `/`
 * (and `/demo`, with `demoMode` tweaks).
 *
 *   - Mounts `GridblockShell` with the production header / footer.
 *   - Owns the left-rail tab state (targets / devices) and the
 *     right-rail tab state (cameras). Each tab renders the
 *     corresponding panel host (`<TargetsPanel>`,
 *     `<DevicesPanelHost>`, `<CamerasPanel>`).
 *   - Cameras lives on the right rail (visual left in RTL) so the
 *     video stack opens away from the targets/devices panels and
 *     both can be open at once without overlapping.
 *   - Mounts `MapHost` as the central cell, driven by the same
 *     hooks every panel consumes.
 *
 * `demoMode` is the marketing-recording toggle. Today it flips the
 * map into a dark monochrome basemap; future demo-only tweaks
 * should hang off the same flag.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  GridblockShell,
  GridblockHeader,
  GridblockFooter,
  GridblockLeftRail,
  GridblockRightRail,
  GridblockPanel,
} from "@/app/components/gridblock";
import { Play, Palette } from "@/lib/icons/central";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { useStrings } from "@/lib/intl";

import { useTacticalTargets } from "@/app/hooks/useTacticalTargets";
import { useEffectorWorkflow } from "@/app/hooks/useEffectorWorkflow";
import { useVideoFeeds } from "@/app/hooks/useVideoFeeds";
import { useDevicesAndAssets } from "@/app/hooks/useDevicesAndAssets";
import { useGridblockPanelSizes } from "@/app/hooks/useGridblockPanelSizes";

import { MapHost } from "./MapHost";
import { TargetsPanel } from "./TargetsPanel";
import { CamerasPanel } from "./CamerasPanel";
import { DevicesPanelHost } from "./DevicesPanelHost";
import {
  assertNeverDashboardTab,
  assertNeverDashboardRightTab,
  getDashboardLeftTabs,
  getDashboardRightTabs,
  type DashboardLeftTabId,
  type DashboardRightTabId,
} from "./LeftRailTabs";

interface DashboardProps {
  /**
   * Marketing-demo flag. Currently only flips `<CesiumTacticalMap>`
   * into the dark monochrome basemap so the recorded background
   * reads as moody chrome rather than satellite imagery.
   */
  demoMode?: boolean;
}

export function Dashboard({ demoMode = false }: DashboardProps = {}) {
  const t = useStrings();

  const tabs = getDashboardLeftTabs({
    targets: t.gridblock.targets,
    devices: t.gridblock.devices,
  });
  const rightTabs = getDashboardRightTabs({
    cameras: t.gridblock.cameras,
  });

  const [leftTab, setLeftTab] = useState<DashboardLeftTabId | null>(null);
  const [rightTab, setRightTab] = useState<DashboardRightTabId | null>(null);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [mapFocusRequest, setMapFocusRequest] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const tactical = useTacticalTargets();
  const effectors = useEffectorWorkflow({
    setTargets: tactical.setTargets,
    targets: tactical.targets,
  });
  const video = useVideoFeeds();
  const devices = useDevicesAndAssets();
  const panelSizes = useGridblockPanelSizes();

  // One-shot pulse pattern: setMapFocusRequest then null on the
  // next tick so `<CesiumTacticalMap smoothFocusRequest>` re-runs
  // its `useEffect` even if the operator clicks the same row twice.
  const handleFlyTo = (lat: number, lon: number) => {
    setMapFocusRequest({ lat, lon });
    setTimeout(() => setMapFocusRequest(null), 100);
  };

  const closeLeftPanel = () => setLeftTab(null);
  const closeRightPanel = () => setRightTab(null);

  return (
    <GridblockShell
      header={<GridblockHeader />}
      footer={<GridblockFooter />}
      // Left panel (targets / devices) ships at a fixed default
      // width — not resizable for now. Omit `onLeftPanelResize` so
      // the shell skips mounting the drag handle on that side.
      // Only the right panel (cameras) is operator-resizable, and
      // its width can grow up to the full available space between
      // the left panel and the right rail (hiding the map entirely).
      rightPanelWidthPx={panelSizes.rightPx}
      onRightPanelResize={panelSizes.setRightPx}
      rightResizeAriaLabel={t.gridblock.resizeRightPanel}
      leftRail={
        <GridblockLeftRail
          tabs={tabs}
          value={leftTab}
          onChange={setLeftTab}
          ariaLabel={t.gridblock.leftRail}
          bottomSlot={
            <HeaderActions
              labels={t.gridblock}
              onSingle={tactical.runSingleScenario}
              onFull={tactical.runFullScenario}
              onSwarm={tactical.runSwarmScenario}
            />
          }
        />
      }
      rightRail={
        <GridblockRightRail
          tabs={rightTabs}
          value={rightTab}
          onChange={setRightTab}
          ariaLabel={t.gridblock.rightRail}
        />
      }
      leftPanel={
        leftTab
          ? renderLeftPanel(leftTab, {
              tactical,
              effectors,
              devices,
              activeTargetId,
              setActiveTargetId,
              onClose: closeLeftPanel,
              onFlyTo: handleFlyTo,
              labels: t.gridblock,
              closeAriaLabel: t.gridblock.closePanel,
            })
          : null
      }
      rightPanel={
        rightTab
          ? renderRightPanel(rightTab, {
              tactical,
              video,
              devices,
              onClose: closeRightPanel,
              labels: t.gridblock,
              closeAriaLabel: t.gridblock.closePanel,
            })
          : null
      }
      map={
        <MapHost
          targets={tactical.targets}
          activeTargetId={activeTargetId}
          friendlyDrones={tactical.friendlyDrones}
          regulusEffectors={effectors.regulusEffectors}
          launcherEffectors={effectors.launcherEffectors}
          selectedEffectorIds={effectors.selectedEffectorIds}
          selectedLauncherIds={effectors.selectedLauncherIds}
          selectedAssetId={devices.selectedAssetId}
          smoothFocusRequest={mapFocusRequest}
          onMarkerClick={setActiveTargetId}
          darkMonochromeMap={demoMode}
        />
      }
    />
  );
}

interface LeftPanelDeps {
  tactical: ReturnType<typeof useTacticalTargets>;
  effectors: ReturnType<typeof useEffectorWorkflow>;
  devices: ReturnType<typeof useDevicesAndAssets>;
  activeTargetId: string | null;
  setActiveTargetId: (id: string | null) => void;
  onClose: () => void;
  onFlyTo: (lat: number, lon: number) => void;
  labels: { targets: string; cameras: string; devices: string; closeTooltip: string };
  closeAriaLabel: string;
}

/**
 * Returns the left-panel ReactNode for the given tab. All rail panels
 * share `<GridblockPanel>` chrome (header + close button, optional
 * sticky toolbar, scroll body). Targets and Cameras wrap directly;
 * Devices self-wraps inside `<DevicesPanel>` so the host can keep
 * passing its existing labels + handlers through unchanged.
 */
function renderLeftPanel(tab: DashboardLeftTabId, deps: LeftPanelDeps) {
  switch (tab) {
    case "targets":
      return (
        <GridblockPanel
          title={deps.labels.targets}
          onClose={deps.onClose}
          closeAriaLabel={deps.closeAriaLabel}
          closeTooltip={deps.labels.closeTooltip}
          testId="dashboard-panel-targets"
        >
          <TargetsPanel
            targets={deps.tactical.targets}
            regulusEffectors={deps.effectors.regulusEffectors}
            launcherEffectors={deps.effectors.launcherEffectors}
            selectedEffectorIds={deps.effectors.selectedEffectorIds}
            selectedLauncherIds={deps.effectors.selectedLauncherIds}
            onMitigate={deps.effectors.handleMitigate}
            onMitigateAll={deps.effectors.handleMitigateAll}
            onEffectorSelect={deps.effectors.handleEffectorSelect}
            onPointWeapon={deps.effectors.handlePointWeapon}
            onLockWeapon={deps.effectors.handleLockWeapon}
            onDismissLock={deps.effectors.handleDismissLock}
            onCompleteMission={deps.effectors.handleCompleteMission}
            onLauncherSelect={deps.effectors.handleLauncherSelect}
            activeTargetId={deps.activeTargetId}
            onActiveTargetChange={deps.setActiveTargetId}
          />
        </GridblockPanel>
      );
    case "devices":
      return (
        <DevicesPanelHost
          devices={deps.devices.allDevices}
          open
          onClose={deps.onClose}
          focusedDeviceId={deps.devices.focusedDeviceId}
          onSelectAsset={deps.devices.setSelectedAssetId}
          onFlyTo={deps.onFlyTo}
        />
      );
    default:
      return assertNeverDashboardTab(tab);
  }
}

interface RightPanelDeps {
  tactical: ReturnType<typeof useTacticalTargets>;
  video: ReturnType<typeof useVideoFeeds>;
  devices: ReturnType<typeof useDevicesAndAssets>;
  onClose: () => void;
  labels: { cameras: string; closeTooltip: string };
  closeAriaLabel: string;
}

/**
 * Returns the right-panel ReactNode for the given tab. Cameras lives
 * here so the video stack slides in from the visual-left edge, away
 * from the targets/devices panels on the visual-right rail.
 */
function renderRightPanel(tab: DashboardRightTabId, deps: RightPanelDeps) {
  switch (tab) {
    case "cameras":
      return (
        <GridblockPanel
          title={deps.labels.cameras}
          onClose={deps.onClose}
          closeAriaLabel={deps.closeAriaLabel}
          closeTooltip={deps.labels.closeTooltip}
          testId="dashboard-panel-cameras"
        >
          <CamerasPanel
            feeds={deps.video.feeds}
            onFeedsChange={deps.video.setFeeds}
            layout={deps.video.layout}
            onLayoutChange={deps.video.setLayout}
            heroIndex={deps.video.heroIndex}
            onHeroChange={deps.video.setHeroIndex}
            cameraOwnership={deps.video.cameraOwnership}
            setCameraOwnership={deps.video.setCameraOwnership}
            cameraZoomById={deps.video.cameraZoomById}
            setCameraZoomById={deps.video.setCameraZoomById}
            allDevices={deps.devices.allDevices}
            friendlyDrones={deps.tactical.friendlyDrones}
          />
        </GridblockPanel>
      );
    default:
      return assertNeverDashboardRightTab(tab);
  }
}

interface HeaderActionsProps {
  labels: {
    cuasScenarios: string;
    cuasScenariosAriaLabel: string;
    scenarioSingle: string;
    scenarioFull: string;
    scenarioSwarm: string;
    styleGuide: string;
  };
  onSingle: () => void;
  onFull: () => void;
  onSwarm: () => void;
}

function HeaderActions({ labels, onSingle, onFull, onSwarm }: HeaderActionsProps) {
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="gridblock-rail-btn"
            aria-label={labels.cuasScenariosAriaLabel}
            title={labels.cuasScenariosAriaLabel}
          >
            <Play size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={6}
          className="w-56 p-1 text-slate-12"
        >
          <div className="flex flex-col">
            <ScenarioItem label={labels.scenarioSingle} onClick={onSingle} />
            <ScenarioItem label={labels.scenarioFull} onClick={onFull} />
            <ScenarioItem label={labels.scenarioSwarm} onClick={onSwarm} />
          </div>
        </PopoverContent>
      </Popover>

      <Link
        to="/styleguide"
        className="gridblock-rail-btn"
        aria-label={labels.styleGuide}
        title={labels.styleGuide}
      >
        <Palette size={16} />
      </Link>
    </>
  );
}

function ScenarioItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex items-center rounded px-2 py-1.5 text-start text-[12px] text-slate-12 transition-colors hover:bg-state-hover-strong"
    >
      {label}
    </button>
  );
}
