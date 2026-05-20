import { memo, useState, useCallback } from "react";
import ListOfSystems from "@/imports/ListOfSystems";
import type {
  Detection,
  RegulusEffector,
  LauncherEffector,
} from "@/imports/ListOfSystems";

interface TargetsPanelProps {
  targets: Detection[];

  regulusEffectors: RegulusEffector[];
  launcherEffectors: LauncherEffector[];
  selectedEffectorIds: Map<string, string>;
  selectedLauncherIds: Map<string, string>;

  onMitigate: (targetId: string, effectorId: string) => void;
  onMitigateAll: (targetId?: string) => void;
  onEffectorSelect: (targetId: string, effectorId: string) => void;
  onPointWeapon: (targetId: string, launcherId: string) => void;
  onLockWeapon: (targetId: string) => void;
  onDismissLock: (targetId: string) => void;
  onCompleteMission: (targetId: string) => void;
  onLauncherSelect: (targetId: string, launcherId: string) => void;

  activeTargetId: string | null;
  onActiveTargetChange: (id: string | null) => void;
}

const noopStr = (_id: string) => {};
const noopStrStr = (_a: string, _b: string) => {};
const noop = () => {};

function TargetsPanelImpl({
  targets,
  regulusEffectors,
  launcherEffectors,
  selectedEffectorIds,
  selectedLauncherIds,
  onMitigate,
  onMitigateAll,
  onEffectorSelect,
  onPointWeapon,
  onLockWeapon,
  onDismissLock,
  onCompleteMission,
  onLauncherSelect,
  activeTargetId,
  onActiveTargetChange,
}: TargetsPanelProps) {
  const [, setHoveredSensorId] = useState<string | null>(null);
  const [, setHoveredTargetId] = useState<string | null>(null);

  const handleTargetClick = useCallback(
    (target: Detection) => {
      onActiveTargetChange(target.id === activeTargetId ? null : target.id);
    },
    [activeTargetId, onActiveTargetChange],
  );

  const handleDismiss = useCallback(
    (_targetId: string, _reason?: string) => {
      if (activeTargetId) onActiveTargetChange(null);
    },
    [activeTargetId, onActiveTargetChange],
  );

  return (
    <div className="relative flex-1 overflow-y-auto">
      <ListOfSystems
        className="flex flex-col gap-0"
        targets={targets}
          activeTargetId={activeTargetId}
          onTargetClick={handleTargetClick}
          onVerify={() => {}}
          onDismiss={handleDismiss}
          onCancelMission={() => {}}
          onCompleteMission={onCompleteMission}
          onEngage={() => {}}
          onBdaCamera={noopStr}
          onSendDroneVerification={noopStr}
          droneVerifyingTargetId={null}
          onSensorHover={setHoveredSensorId}
          onCameraLookAt={noopStrStr}
          onTakeControl={noopStr}
          onReleaseControl={noopStr}
          onSensorModeChange={() => {}}
          onPlaybookSelect={noopStrStr}
          onClosureOutcome={() => {}}
          onAdvanceFlowPhase={noopStr}
          nearbyCameras={[]}
          nearbyHives={[]}
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
          onPlanningRemoveWaypoint={() => {}}
          onPlanningToggleLoop={noopStr}
          onPlanningFinalize={noopStr}
          onPlanningUpdateWaypoint={() => {}}
          onPlanningSetRepetitions={() => {}}
          onPlanningSetDwellTime={() => {}}
          onPlanningSetScanCenter={() => {}}
          onPlanningSetScanWidth={() => {}}
          onPlanningSetScanSteps={() => {}}
          onPlanningSelectCamera={noopStr}
          onPlanningZoomCameras={noopStr}
          onMitigate={onMitigate}
          onMitigateAll={onMitigateAll}
          onEffectorSelect={onEffectorSelect}
          regulusEffectors={regulusEffectors}
          selectedEffectorIds={selectedEffectorIds}
          onPointWeapon={onPointWeapon}
          onLockWeapon={onLockWeapon}
          onDismissLock={onDismissLock}
          onLauncherSelect={onLauncherSelect}
          launcherEffectors={launcherEffectors}
          selectedLauncherIds={selectedLauncherIds}
          flowAssets={{ regulusEffectors, launcherEffectors }}
          flowSelectedIds={{
            regulusEffectors: selectedEffectorIds,
            launcherEffectors: selectedLauncherIds,
          }}
          onBdaOutcome={noop}
          cameraActiveTargetId={null}
          cameraPointingTargetId={null}
          allCamerasBusyForTarget={null}
          controlRequestCountdown={null}
          controlRequestTargetId={null}
          onRequestCameraControl={noopStr}
          onSensorFocus={noopStr}
          onTargetFocus={noopStr}
          onTargetHover={setHoveredTargetId}
          thinMode
        />
    </div>
  );
}

export const TargetsPanel = memo(TargetsPanelImpl);
TargetsPanel.displayName = "TargetsPanel";
