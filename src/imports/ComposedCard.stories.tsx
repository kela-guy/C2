import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  TargetCard,
  CardHeader,
  CardActions,
  CardTimeline,
  CardDetails,
  CardSensors,
  CardMedia,
  CardLog,
  CardClosure,
  StatusChip,
  MissionPhaseChip,
} from '@/primitives';
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
import {
  flow1_suspicion,
  flow1_investigation,
  flow1_decide,
  flow1_act,
  flow2_investigate,
  flow2_tracking,
  flow2_mitigating,
  flow2_mitigated,
  flow3_flying,
  flow3_onStation,
  flow4_mission,
  flow4_complete,
  flow5_mitigated,
  ALL_DETECTIONS,
} from '@/test-utils/mockDetections';
import type { Detection } from './ListOfSystems';

const noop = () => {};
const noopCallbacks: CardCallbacks = {
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
};

const defaultCtx: CardContext = {
  regulusEffectors: [
    { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
  ],
};

function buildStatusChip(target: Detection) {
  if (target.entityStage === 'raw_detection') return <StatusChip label="לא ידוע" color="gray" />;
  if (target.status === 'detection') return <StatusChip label="איתור" color="red" />;
  if (target.status === 'tracking') return <StatusChip label="מעקב" color="orange" />;
  if (target.status === 'event') return <StatusChip label="מטרה" color="green" />;
  if (target.status === 'suspicion') return <StatusChip label="תח״ש" color="orange" />;
  if (target.status === 'event_neutralized') return <StatusChip label="נוטרל" color="green" />;
  if (target.status === 'event_resolved') return <StatusChip label="הושלם" color="green" />;
  if (target.status === 'expired') return <StatusChip label="פג תוקף" color="gray" />;
  return null;
}

function ComposedCard({
  target,
  defaultOpen = false,
  callbacks = noopCallbacks,
  ctx = defaultCtx,
}: {
  target: Detection;
  defaultOpen?: boolean;
  callbacks?: CardCallbacks;
  ctx?: CardContext;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const slots = useCardSlots(target, callbacks, ctx);
  const isMission = target.flowType === 4;

  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';
  const showDetails = !isSuccess && !isExpired && target.flowType !== 4;

  return (
    <TargetCard
      accent={slots.accent}
      completed={slots.completed}
      open={open}
      onToggle={() => setOpen(!open)}
      header={
        <CardHeader
          {...slots.header}
          status={isMission && target.plannedMission ? <MissionPhaseChip phase={target.plannedMission.phase} /> : buildStatusChip(target)}
          open={open}
        />
      }
    >
      {slots.media && <CardMedia {...slots.media} />}

      {slots.actions.length > 0 && <CardActions actions={slots.actions} />}

      {slots.timeline.length > 0 && (
        <div className="px-2 border-b border-white/5">
          <CardTimeline steps={slots.timeline} />
        </div>
      )}

      {showDetails && (
        <CardDetails
          rows={slots.details.rows}
          classification={slots.details.classification}
        />
      )}

      {slots.sensors.length > 0 && (
        <div className="px-2 pb-2">
          <CardSensors
            sensors={slots.sensors}
            onSensorHover={callbacks.onSensorHover}
            onSensorClick={callbacks.onSensorFocus}
          />
        </div>
      )}

      {slots.log.length > 0 && (
        <CardLog entries={slots.log} defaultOpen={isSuccess || isExpired} />
      )}

      {slots.closure && (
        <CardClosure outcomes={slots.closure.outcomes} onSelect={slots.closure.onSelect} />
      )}
    </TargetCard>
  );
}

const meta: Meta = {
  title: 'TargetCard/Flows',
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'todo' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const Flow1_Suspicion: StoryObj = {
  name: 'Flow 1 — Suspicion',
  render: () => <ComposedCard target={flow1_suspicion} defaultOpen />,
};

export const Flow1_Investigation: StoryObj = {
  name: 'Flow 1 — Investigation',
  render: () => <ComposedCard target={flow1_investigation} defaultOpen />,
};

export const Flow1_Decide: StoryObj = {
  name: 'Flow 1 — Decide (Playbooks)',
  render: () => <ComposedCard target={flow1_decide} defaultOpen />,
};

export const Flow1_Act: StoryObj = {
  name: 'Flow 1 — Act (Mission)',
  render: () => <ComposedCard target={flow1_act} defaultOpen />,
};

export const Flow2_Investigate: StoryObj = {
  name: 'Flow 2 — Manual Tracking',
  render: () => <ComposedCard target={flow2_investigate} defaultOpen />,
};

export const Flow2_Tracking: StoryObj = {
  name: 'Flow 2 — Tracking (CUAS)',
  render: () => <ComposedCard target={flow2_tracking} defaultOpen />,
};

export const Flow2_Mitigating: StoryObj = {
  name: 'Flow 2 — Mitigating',
  render: () => <ComposedCard target={flow2_mitigating} defaultOpen />,
};

export const Flow2_Mitigated: StoryObj = {
  name: 'Flow 2 — Mitigated',
  render: () => <ComposedCard target={flow2_mitigated} defaultOpen />,
};

export const Flow3_Flying: StoryObj = {
  name: 'Flow 3 — Drone Flying',
  render: () => <ComposedCard target={flow3_flying} defaultOpen />,
};

export const Flow3_OnStation: StoryObj = {
  name: 'Flow 3 — Drone On Station',
  render: () => <ComposedCard target={flow3_onStation} defaultOpen />,
};

export const Flow4_Mission: StoryObj = {
  name: 'Flow 4 — Mission Executing',
  render: () => <ComposedCard target={flow4_mission} defaultOpen />,
};

export const Flow4_Complete: StoryObj = {
  name: 'Flow 4 — Mission Complete',
  render: () => <ComposedCard target={flow4_complete} defaultOpen />,
};

export const Flow5_Mitigated: StoryObj = {
  name: 'Flow 5 — CUAS Mitigated',
  render: () => <ComposedCard target={flow5_mitigated} defaultOpen />,
};

export const AllFlows: StoryObj = {
  name: 'All Flows',
  render: () => (
    <div className="flex flex-col gap-2">
      {ALL_DETECTIONS.map((d) => (
        <ComposedCard key={d.id} target={d} />
      ))}
    </div>
  ),
};

export const AllFlowsExpanded: StoryObj = {
  name: 'All Flows (Expanded)',
  render: () => (
    <div className="flex flex-col gap-2">
      {ALL_DETECTIONS.map((d) => (
        <ComposedCard key={d.id} target={d} defaultOpen />
      ))}
    </div>
  ),
};
