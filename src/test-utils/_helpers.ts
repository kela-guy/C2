export const noop = () => {};
export const noopMouse = (_e: React.MouseEvent) => {};

export const MOCK_CAMERAS = [
  { id: 'cam-1', typeLabel: 'Pixelsight', latitude: 32.09, longitude: 34.78 },
  { id: 'cam-2', typeLabel: 'PTZ-North', latitude: 32.10, longitude: 34.79 },
];

export const MOCK_HIVES = [
  { id: 'hive-1', name: 'כוורת צפון', lat: 32.085, lon: 34.78 },
  { id: 'hive-2', name: 'כוורת דרום', lat: 31.98, lon: 34.75 },
];

export const MOCK_EFFECTORS = [
  { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' as const },
  { id: 'eff-2', name: 'Regulus-2', lat: 32.10, lon: 34.80, coverageRadiusM: 3000, status: 'active' as const, activeTargetId: 't-011' },
];

export const expandedNoopCallbacks = {
  onVerify: noop,
  onEngage: noop,
  onDismiss: noop,
  onCancelMission: noop,
  onCompleteMission: noop,
  onSendDroneVerification: noop,
  onSensorHover: noop,
  onCameraLookAt: noop,
  onTakeControl: noop,
  onReleaseControl: noop,
  onSensorModeChange: noop,
  onPlaybookSelect: noop,
  onClosureOutcome: noop,
  onAdvanceFlowPhase: noop,
  onEscalateCreatePOI: noop,
  onEscalateSendDrone: noop,
  onDroneSelect: noop,
  onDroneOverride: noop,
  onDroneResume: noop,
  onDroneRTB: noop,
  onMissionActivate: noop,
  onMissionPause: noop,
  onMissionResume: noop,
  onMissionOverride: noop,
  onMissionCancel: noop,
  onMitigate: noop,
  onMitigateAll: noop,
  onBdaOutcome: noop,
  onSensorFocus: noop,
  onPlanningRemoveWaypoint: noop,
  onPlanningToggleLoop: noop,
  onPlanningFinalize: noop,
  onPlanningUpdateWaypoint: noop,
  onPlanningSetRepetitions: noop,
  onPlanningSetDwellTime: noop,
  onPlanningSetScanCenter: noop,
  onPlanningSetScanWidth: noop,
  onPlanningSetScanSteps: noop,
  onPlanningSelectCamera: noop,
  onPlanningZoomCameras: noop,
};
