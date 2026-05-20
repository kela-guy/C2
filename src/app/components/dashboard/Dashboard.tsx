/**
 * Dashboard — the GridblockShell-based dashboard hosted at `/`
 * (and `/demo`, with `demoMode` tweaks).
 *
 *   - Mounts `GridblockShell` with the production header.
 *   - Owns the start-rail tab state (targets / devices / history) and
 *     the end-rail tab state (cameras). Each tab renders the
 *     corresponding panel host (`<TargetsPanel>`, `<DevicesPanelHost>`,
 *     `<TrackHistoryPanel>`, `<CamerasPanel>`).
 *   - Cameras lives on the end rail (visual right in LTR, left in RTL) so
 *     the video stack opens away from the targets/devices panels and
 *     both can be open at once without overlapping.
 *   - Mounts a single `MapHost` as the central cell. The "history"
 *     experience reuses that same map: when the History tab is
 *     active, `<GridblockFooter />` mounts as the map cell's
 *     `bottomSlot` — a timeline strip scoped between the rails —
 *     and drives a `viewedAt` clock that the dashboard projects
 *     live and recorded tracks through into a unified
 *     `Detection[]` consumed by the map and `TargetsPanel`.
 *     Closing History snaps `viewedAt` back to live; the cameras
 *     panel max width clamps to 720px while History is active.
 *
 * `demoMode` is the marketing-recording toggle. Today it flips the
 * map into a dark monochrome basemap; future demo-only tweaks
 * should hang off the same flag.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  useGridblockPanelSizes,
  PANEL_WIDTH_END_MAX_HISTORY_PX,
  PANEL_WIDTH_END_MAX_PX,
} from "@/app/hooks/useGridblockPanelSizes";
import { useHistoryStore, type HistoryStoreApi } from "@/app/hooks/useHistoryStore";
import { useClosedTrackRecorder } from "@/app/hooks/useClosedTrackRecorder";
import {
  ViewedAtProvider,
  useViewedAt,
  type ViewedAtApi,
} from "@/app/state/ViewedAtContext";
import { unionAtTime } from "@/app/components/track-history/timeMachine";

import { TargetsPanel } from "./TargetsPanel";
import { CamerasPanel } from "./CamerasPanel";
import { DevicesPanelHost } from "./DevicesPanelHost";
import { TrackHistoryPanel } from "@/app/components/track-history/TrackHistoryPanel";
import { MapHost } from "./MapHost";
import type { MapViewMode } from "./mapViewMode";
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

export function Dashboard(props: DashboardProps = {}) {
  return (
    <ViewedAtProvider>
      <DashboardInner {...props} />
    </ViewedAtProvider>
  );
}

function DashboardInner({ demoMode = false }: DashboardProps) {
  const t = useStrings();
  const viewedAt = useViewedAt();

  const tabs = getDashboardLeftTabs({
    targets: t.gridblock.targets,
    devices: t.gridblock.devices,
    history: t.gridblock.history,
  });
  const rightTabs = getDashboardRightTabs({
    cameras: t.gridblock.cameras,
  });

  const [leftTab, setLeftTab] = useState<DashboardLeftTabId | null>(null);
  const [rightTab, setRightTab] = useState<DashboardRightTabId | null>(null);
  const isHistoryActive = leftTab === "history";
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [selectedHistoricalTrackId, setSelectedHistoricalTrackId] = useState<
    string | null
  >(null);
  const [mapFocusRequest, setMapFocusRequest] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [hoveredDevicePanelId, setHoveredDevicePanelId] = useState<
    string | null
  >(null);
  const [hoveredVideoTileId, setHoveredVideoTileId] = useState<string | null>(
    null,
  );
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>(() =>
    demoMode ? "monochromeTerrain" : "current",
  );

  const tactical = useTacticalTargets();
  const effectors = useEffectorWorkflow({
    setTargets: tactical.setTargets,
    targets: tactical.targets,
  });
  const video = useVideoFeeds();
  const devices = useDevicesAndAssets(tactical.friendlyDrones);
  const offlineAssetIds = useMemo(
    () =>
      devices.allDevices
        .filter((d) => d.connectionState === "offline")
        .map((d) => d.id),
    [devices.allDevices],
  );
  const deviceIds = useMemo(
    () => new Set(devices.allDevices.map((d) => d.id)),
    [devices.allDevices],
  );
  const panelSizes = useGridblockPanelSizes();
  const historyStore = useHistoryStore();
  useClosedTrackRecorder({
    liveTargets: tactical.targets,
    appendClosed: historyStore.appendClosed,
  });

  // Time-machine projection — when isLive, returns the live array
  // unchanged so live mode pays zero overhead. When scrubbed, emits
  // synthetic Detections sampled from any historical tracks that
  // had started by viewedAt. Projection clamps to `endedAt` so the
  // bright trail + hostile marker stay frozen on the final frame
  // once the scrubber leaves the track's window; the dim full-path
  // overlay (see below) carries the "this is what happened" read
  // when viewedAt is outside the window entirely.
  const projectedTargets = useMemo(
    () =>
      unionAtTime(
        tactical.targets,
        historyStore.tracks,
        viewedAt.viewedAtMs,
        viewedAt.isLive,
      ),
    [
      tactical.targets,
      historyStore.tracks,
      viewedAt.viewedAtMs,
      viewedAt.isLive,
    ],
  );

  // Esc clears the historical jump-to selection. The tactical-map
  // ESC handler still owns live activeTargetId.
  useEffect(() => {
    if (!selectedHistoricalTrackId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedHistoricalTrackId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedHistoricalTrackId]);

  // Closing the History panel exits time-machine mode. The timeline
  // is the only control surface; leaving it scrubbed with no way back
  // to live would orphan the dashboard in a non-live state. `reset`
  // is stable across renders so transitions on `isHistoryActive`
  // alone trigger this exactly once per close.
  const viewedAtReset = viewedAt.reset;
  const viewedAtIsLive = viewedAt.isLive;
  useEffect(() => {
    if (isHistoryActive) return;
    setSelectedHistoricalTrackId(null);
    if (!viewedAtIsLive) viewedAtReset();
  }, [isHistoryActive, viewedAtIsLive, viewedAtReset]);

  // End panel (cameras) clamps while History is open. The stored
  // value in `panelSizes.endPx` is left untouched — the clamp is a
  // projection, so closing History restores the user's preferred width.
  const effectiveEndPx = isHistoryActive
    ? Math.min(panelSizes.endPx, PANEL_WIDTH_END_MAX_HISTORY_PX)
    : panelSizes.endPx;
  const handleEndPanelResize = (next: number) =>
    panelSizes.setEndPx(
      isHistoryActive
        ? Math.min(next, PANEL_WIDTH_END_MAX_HISTORY_PX)
        : next,
    );

  const handleFlyTo = (lat: number, lon: number) => {
    setMapFocusRequest({ lat, lon });
    setTimeout(() => setMapFocusRequest(null), 100);
  };

  const handleAssetClick = useCallback(
    (assetId: string) => {
      if (!deviceIds.has(assetId)) return;
      setLeftTab("devices");
      devices.setFocusedDeviceId(assetId);
      devices.setSelectedAssetId(assetId);
    },
    [deviceIds, devices],
  );

  const handleContextMenuAction = useCallback(
    (
      action: string,
      elementType: "target" | "effector" | "sensor",
      elementId: string,
    ) => {
      if (elementType === "target") {
        if (
          action === "open-card" ||
          action === "track" ||
          action === "investigate"
        ) {
          setLeftTab("targets");
          setActiveTargetId(elementId);
          return;
        }
        if (!viewedAt.isLive) return;

        switch (action) {
          case "mitigate":
            setLeftTab("targets");
            setActiveTargetId(elementId);
            break;
          case "mitigate-all":
            effectors.handleMitigateAll(elementId);
            setLeftTab("targets");
            setActiveTargetId(elementId);
            break;
          case "dismiss":
            tactical.setTargets((prev) =>
              prev.map((t) =>
                t.id === elementId
                  ? {
                      ...t,
                      status: "expired" as const,
                      activityStatus: "dismissed" as const,
                      weaponPointingStatus: "idle" as const,
                      pointingLauncherId: undefined,
                    }
                  : t,
              ),
            );
            setActiveTargetId((current) =>
              current === elementId ? null : current,
            );
            break;
          default:
            break;
        }
        return;
      }

      if (elementType === "sensor" || elementType === "effector") {
        const openDevice = () => {
          if (!deviceIds.has(elementId)) return;
          setLeftTab("devices");
          devices.setFocusedDeviceId(elementId);
          devices.setSelectedAssetId(elementId);
        };

        switch (action) {
          case "show-video":
          case "view-feed":
            if (!deviceIds.has(elementId)) return;
            setRightTab("cameras");
            video.openDeviceTab(elementId);
            break;
          case "open-tab":
            openDevice();
            break;
          case "activate":
            if (elementType === "effector" && activeTargetId) {
              effectors.handleMitigate(activeTargetId, elementId);
            }
            break;
          case "mute-alerts":
          case "settings":
          case "calibrate":
          case "edit":
            break;
          default:
            break;
        }
      }
    },
    [
      activeTargetId,
      deviceIds,
      devices,
      effectors,
      tactical,
      video,
      viewedAt.isLive,
    ],
  );

  const handleDevicePanelHover = useCallback((id: string | null) => {
    setHoveredDevicePanelId(id);
  }, []);

  const handleVideoTileHover = useCallback((cameraId: string | null) => {
    setHoveredVideoTileId(cameraId);
  }, []);

  const hoveredSensorIdFromCard =
    hoveredDevicePanelId ?? hoveredVideoTileId;

  useEffect(() => {
    if (leftTab !== "devices") setHoveredDevicePanelId(null);
  }, [leftTab]);

  useEffect(() => {
    if (rightTab !== "cameras") setHoveredVideoTileId(null);
  }, [rightTab]);

  useEffect(() => {
    if (!hoveredVideoTileId) return;
    const mounted = new Set(
      video.feeds.map((f) => f.cameraId).filter((id) => id.length > 0),
    );
    if (!mounted.has(hoveredVideoTileId)) setHoveredVideoTileId(null);
  }, [video.feeds, hoveredVideoTileId]);

  const closeStartPanel = () => setLeftTab(null);
  const closeEndPanel = () => setRightTab(null);

  const handleSelectHistoricalTrack = (id: string | null) => {
    setSelectedHistoricalTrackId(id);
    if (id == null) return;
    const track = historyStore.byId(id);
    if (!track) return;
    viewedAt.seekTo(track.startedAt);
    viewedAt.play();
    const first = track.snapshots[0];
    if (first) handleFlyTo(first.position.lat, first.position.lon);
  };

  const scrubberMarkers = useMemo(() => {
    if (!selectedHistoricalTrackId) return [];
    const track = historyStore.byId(selectedHistoricalTrackId);
    if (!track) return [];
    return track.actionLog
      .filter((entry) => entry.pinned)
      .map((entry) => ({
        id: `${track.id}-${entry.tMs}`,
        atMs: track.startedAt + entry.tMs,
        label: entry.label,
        kind: entry.kind,
        trackStartedAtMs: track.startedAt,
      }));
  }, [selectedHistoricalTrackId, historyStore]);

  const selectedTrackSpan = useMemo(() => {
    if (!selectedHistoricalTrackId) return null;
    const track = historyStore.byId(selectedHistoricalTrackId);
    if (!track) return null;
    return { startMs: track.startedAt, endMs: track.endedAt };
  }, [selectedHistoricalTrackId, historyStore]);

  // Dim full-path overlay for the selected closed track. Decoupled
  // from `viewedAtMs` — appears the moment the operator opens the
  // card and stays put until they close it. The bright trail
  // (projectedTargets[].trail) paints over it up to the scrubber
  // position so the two layers read as "what happened" + "where
  // we are in the story."
  const historicalTrackOverlay = useMemo(() => {
    if (!selectedHistoricalTrackId) return null;
    const track = historyStore.byId(selectedHistoricalTrackId);
    if (!track || track.snapshots.length < 2) return null;
    return {
      id: track.id,
      fullPath: track.snapshots.map((s) => ({
        lat: s.position.lat,
        lon: s.position.lon,
      })),
    };
  }, [selectedHistoricalTrackId, historyStore]);

  return (
    <GridblockShell
      header={<GridblockHeader />}
      startPanelWidthPx={panelSizes.startPx}
      onStartPanelResize={panelSizes.setStartPx}
      onStartPanelClose={closeStartPanel}
      startResizeAriaLabel={t.gridblock.resizePanel}
      endPanelWidthPx={effectiveEndPx}
      onEndPanelResize={handleEndPanelResize}
      onEndPanelClose={closeEndPanel}
      endPanelMaxPx={
        isHistoryActive
          ? PANEL_WIDTH_END_MAX_HISTORY_PX
          : PANEL_WIDTH_END_MAX_PX
      }
      endResizeAriaLabel={t.gridblock.resizePanel}
      startRail={
        <GridblockLeftRail
          tabs={tabs}
          value={leftTab}
          onChange={setLeftTab}
          ariaLabel={t.gridblock.startRail}
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
      endRail={
        <GridblockRightRail
          tabs={rightTabs}
          value={rightTab}
          onChange={setRightTab}
          ariaLabel={t.gridblock.endRail}
        />
      }
      startPanel={
        leftTab
          ? renderLeftPanel(leftTab, {
              tactical,
              effectors,
              devices,
              activeTargetId,
              setActiveTargetId,
              onClose: closeStartPanel,
              onFlyTo: handleFlyTo,
              labels: t.gridblock,
              closeAriaLabel: t.gridblock.closePanel,
              historyStore,
              selectedHistoricalTrackId,
              onSelectHistoricalTrack: handleSelectHistoricalTrack,
              projectedTargets,
              viewedAt,
              video,
              onDeviceHover: handleDevicePanelHover,
            })
          : null
      }
      endPanel={
        rightTab
          ? renderRightPanel(rightTab, {
              tactical,
              video,
              devices,
              onClose: closeEndPanel,
              labels: t.gridblock,
              closeAriaLabel: t.gridblock.closePanel,
              onTileHover: handleVideoTileHover,
            })
          : null
      }
      map={
        <MapHost
          mapViewMode={mapViewMode}
          onMapViewModeChange={setMapViewMode}
          targets={projectedTargets}
          activeTargetId={activeTargetId}
          friendlyDrones={viewedAt.isLive ? tactical.friendlyDrones : []}
          offlineAssetIds={offlineAssetIds}
          regulusEffectors={effectors.regulusEffectors}
          launcherEffectors={effectors.launcherEffectors}
          selectedEffectorIds={effectors.selectedEffectorIds}
          selectedLauncherIds={effectors.selectedLauncherIds}
          selectedAssetId={devices.selectedAssetId}
          hoveredSensorIdFromCard={hoveredSensorIdFromCard}
          smoothFocusRequest={mapFocusRequest}
          onMarkerClick={setActiveTargetId}
          onAssetClick={handleAssetClick}
          onContextMenuAction={handleContextMenuAction}
          historicalTrackOverlay={historicalTrackOverlay}
          bottomSlot={
            isHistoryActive ? (
              <GridblockFooter
                markers={scrubberMarkers}
                selectedSpan={selectedTrackSpan}
              />
            ) : null
          }
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
  labels: {
    targets: string;
    cameras: string;
    devices: string;
    history: string;
    closeTooltip: string;
    historyDisabledActions: string;
  };
  closeAriaLabel: string;
  historyStore: HistoryStoreApi;
  selectedHistoricalTrackId: string | null;
  onSelectHistoricalTrack: (id: string | null) => void;
  projectedTargets: ReturnType<typeof unionAtTime>;
  viewedAt: ViewedAtApi;
  video: ReturnType<typeof useVideoFeeds>;
  onDeviceHover: (id: string | null) => void;
}

const noopStr = (_a: string) => {};
const noopStrStr = (_a: string, _b: string) => {};

/**
 * Returns the left-panel ReactNode for the given tab.
 *
 * The Targets panel reads from `projectedTargets` (the time-machine
 * union) so it shows whatever was on the map at `viewedAt`. When
 * not live, destructive action handlers are replaced with no-ops
 * and a one-line "History — actions disabled" banner pins above
 * the list.
 */
function renderLeftPanel(tab: DashboardLeftTabId, deps: LeftPanelDeps) {
  switch (tab) {
    case "targets": {
      const isLive = deps.viewedAt.isLive;
      return (
        <GridblockPanel
          title={deps.labels.targets}
          onClose={deps.onClose}
          closeAriaLabel={deps.closeAriaLabel}
          closeTooltip={deps.labels.closeTooltip}
          testId="dashboard-panel-targets"
          toolbar={
            !isLive ? (
              <div
                className="px-3 py-1.5 text-[11px] font-medium text-slate-11 bg-state-selected"
                role="status"
              >
                {deps.labels.historyDisabledActions}
              </div>
            ) : undefined
          }
        >
          <TargetsPanel
            targets={deps.projectedTargets}
            regulusEffectors={deps.effectors.regulusEffectors}
            launcherEffectors={deps.effectors.launcherEffectors}
            selectedEffectorIds={deps.effectors.selectedEffectorIds}
            selectedLauncherIds={deps.effectors.selectedLauncherIds}
            onMitigate={isLive ? deps.effectors.handleMitigate : noopStrStr}
            onMitigateAll={isLive ? deps.effectors.handleMitigateAll : () => {}}
            onEffectorSelect={
              isLive ? deps.effectors.handleEffectorSelect : noopStrStr
            }
            onPointWeapon={
              isLive ? deps.effectors.handlePointWeapon : noopStrStr
            }
            onLockWeapon={isLive ? deps.effectors.handleLockWeapon : noopStr}
            onDismissLock={
              isLive ? deps.effectors.handleDismissLock : noopStr
            }
            onCompleteMission={
              isLive ? deps.effectors.handleCompleteMission : noopStr
            }
            onLauncherSelect={
              isLive ? deps.effectors.handleLauncherSelect : noopStrStr
            }
            activeTargetId={deps.activeTargetId}
            onActiveTargetChange={deps.setActiveTargetId}
          />
        </GridblockPanel>
      );
    }
    case "devices":
      return (
        <DevicesPanelHost
          devices={deps.devices.allDevices}
          open
          onClose={deps.onClose}
          focusedDeviceId={deps.devices.focusedDeviceId}
          onSelectAsset={deps.devices.setSelectedAssetId}
          onDeviceHover={deps.onDeviceHover}
          onFlyTo={deps.onFlyTo}
          onPinToFeed={deps.video.openDeviceTab}
          onUnpinFromFeed={deps.video.unpinDevice}
          pinnedDeviceIds={deps.video.pinnedDeviceIds}
        />
      );
    case "history":
      return (
        <TrackHistoryPanel
          api={deps.historyStore}
          selectedTrackId={deps.selectedHistoricalTrackId}
          onSelectTrack={deps.onSelectHistoricalTrack}
          onClose={deps.onClose}
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
  onTileHover: (cameraId: string | null) => void;
}

function renderRightPanel(tab: DashboardRightTabId, deps: RightPanelDeps) {
  switch (tab) {
    case "cameras":
      return (
        <CamerasPanel
          title={deps.labels.cameras}
          onClose={deps.onClose}
          closeAriaLabel={deps.closeAriaLabel}
          closeTooltip={deps.labels.closeTooltip}
          tabs={deps.video.tabs}
          activeTabIndex={deps.video.activeTabIndex}
          onActivateTab={deps.video.setActiveTabIndex}
          onCloseTab={deps.video.closeTab}
          feeds={deps.video.feeds}
          onFeedsChange={deps.video.setFeeds}
          layout={deps.video.layout}
          onLayoutChange={deps.video.setLayout}
          activeFeedIndex={deps.video.activeFeedIndex}
          onActiveFeedChange={deps.video.setActiveFeedIndex}
          cameraOwnership={deps.video.cameraOwnership}
          setCameraOwnership={deps.video.setCameraOwnership}
          cameraZoomById={deps.video.cameraZoomById}
          setCameraZoomById={deps.video.setCameraZoomById}
          allDevices={deps.devices.allDevices}
          friendlyDrones={deps.tactical.friendlyDrones}
          pinnedDeviceIds={deps.video.pinnedDeviceIds}
          onOpenDeviceTab={deps.video.openDeviceTab}
          onAddToActiveTab={deps.video.addDeviceToActiveTab}
          onAddToTab={deps.video.addDeviceToTab}
          onMergeTab={deps.video.mergeTabIntoTab}
          onUnpinFeed={deps.video.unpinDevice}
          onTileFocus={deps.video.recordTileFocus}
          onTileHover={deps.onTileHover}
        />
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
