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
  StackedCard,
} from '@/primitives';
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
import {
  cuas_raw,
  cuas_classified,
  cuas_classified_bird,
  cuas_mitigating,
  cuas_mitigated,
  cuas_bda_complete,
  CUAS_LIFECYCLE,
  burst_targets,
  flow1_suspicion,
  flow2_tracking,
} from '@/test-utils/mockDetections';
import ListOfSystems from './ListOfSystems';
import type { Detection, RegulusEffector } from './ListOfSystems';
import type { TargetBurst } from './useTargetBursts';
import { DevicesPanel } from '@/app/components/DevicesPanel';

const noop = () => {};
const noopCallbacks: CardCallbacks = {
  onVerify: noop, onEngage: noop, onDismiss: noop,
  onCancelMission: noop, onCompleteMission: noop, onSendDroneVerification: noop,
  onSensorHover: noop, onCameraLookAt: noop, onTakeControl: noop,
  onReleaseControl: noop, onSensorModeChange: noop, onPlaybookSelect: noop,
  onClosureOutcome: noop, onAdvanceFlowPhase: noop, onEscalateCreatePOI: noop,
  onEscalateSendDrone: noop, onDroneSelect: noop, onDroneOverride: noop,
  onDroneResume: noop, onDroneRTB: noop, onMissionActivate: noop,
  onMissionPause: noop, onMissionResume: noop, onMissionOverride: noop,
  onMissionCancel: noop, onMitigate: noop, onMitigateAll: noop,
  onBdaOutcome: noop, onSensorFocus: noop,
};

const defaultCtx: CardContext = {
  regulusEffectors: [
    { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
    { id: 'eff-2', name: 'Regulus-2', lat: 32.10, lon: 34.79, coverageRadiusM: 5000, status: 'available' },
  ],
};

function buildStatusChip(target: Detection) {
  if (target.entityStage === 'raw_detection') return <StatusChip label="לא ידוע" color="gray" />;
  if (target.status === 'detection') return <StatusChip label="איתור" color="red" />;
  if (target.status === 'tracking') return <StatusChip label="מעקב" color="orange" />;
  if (target.status === 'event') return <StatusChip label="מטרה" color="green" />;
  if (target.status === 'event_neutralized') return <StatusChip label="נוטרל" color="green" />;
  if (target.status === 'event_resolved') return <StatusChip label="הושלם" color="green" />;
  return null;
}

function CuasCard({
  target,
  defaultOpen = false,
}: {
  target: Detection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const slots = useCardSlots(target, noopCallbacks, defaultCtx);

  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';

  return (
    <TargetCard
      accent={slots.accent}
      completed={slots.completed}
      open={open}
      onToggle={() => setOpen(!open)}
      header={
        <CardHeader
          {...slots.header}
          status={buildStatusChip(target)}
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

      {!isSuccess && !isExpired && (
        <CardDetails
          rows={slots.details.rows}
          classification={slots.details.classification}
        />
      )}

      {slots.sensors.length > 0 && (
        <div className="px-2 pb-2">
          <CardSensors
            sensors={slots.sensors}
            onSensorHover={noop}
            onSensorClick={noop}
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

// -- Burst / Stacked Card helpers --

function InnerCard({ target, isActive }: { target: Detection; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const slots = useCardSlots(target, noopCallbacks, defaultCtx);

  return (
    <TargetCard
      accent={slots.accent}
      completed={slots.completed}
      open={open}
      onToggle={() => setOpen(!open)}
      header={
        <CardHeader
          {...slots.header}
          status={buildStatusChip(target)}
          open={open}
        />
      }
    >
      {slots.actions.length > 0 && <CardActions actions={slots.actions} />}
      {slots.timeline.length > 0 && (
        <div className="px-2 border-b border-white/5">
          <CardTimeline steps={slots.timeline} />
        </div>
      )}
      {!isActive && (
        <CardDetails
          rows={slots.details.rows}
          classification={slots.details.classification}
        />
      )}
    </TargetCard>
  );
}

const swarmBurst: TargetBurst = {
  kind: 'burst',
  id: 'burst-cuas',
  targets: burst_targets,
  firstTimestamp: '00:15:00',
  lastTimestamp: '00:15:04',
  typeBreakdown: { 'רחפן': 4, 'ציפור': 1 },
};

// ============================================================
// Stories
// ============================================================

const meta: Meta = {
  title: 'CUAS',
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

// --- Lifecycle ---

export const RawDetection: StoryObj = {
  name: 'Lifecycle / Raw Detection',
  render: () => <CuasCard target={cuas_raw} defaultOpen />,
};

export const Classified: StoryObj = {
  name: 'Lifecycle / Classified Drone',
  render: () => <CuasCard target={cuas_classified} defaultOpen />,
};

export const ClassifiedBird: StoryObj = {
  name: 'Lifecycle / Classified Bird',
  render: () => <CuasCard target={cuas_classified_bird} defaultOpen />,
};

export const Mitigating: StoryObj = {
  name: 'Lifecycle / Mitigating',
  render: () => <CuasCard target={cuas_mitigating} defaultOpen />,
};

export const Mitigated: StoryObj = {
  name: 'Lifecycle / Mitigated (BDA Pending)',
  render: () => <CuasCard target={cuas_mitigated} defaultOpen />,
};

export const BdaComplete: StoryObj = {
  name: 'Lifecycle / BDA Complete',
  render: () => <CuasCard target={cuas_bda_complete} defaultOpen />,
};

export const FullLifecycle: StoryObj = {
  name: 'Lifecycle / Full Pipeline',
  render: () => (
    <div className="flex flex-col gap-2">
      {CUAS_LIFECYCLE.map((d) => (
        <CuasCard key={d.id} target={d} />
      ))}
    </div>
  ),
};

export const FullLifecycleExpanded: StoryObj = {
  name: 'Lifecycle / Full Pipeline (Expanded)',
  render: () => (
    <div className="flex flex-col gap-2">
      {CUAS_LIFECYCLE.map((d) => (
        <CuasCard key={d.id} target={d} defaultOpen />
      ))}
    </div>
  ),
};

// --- Burst / Swarm ---

export const SwarmCollapsed: StoryObj = {
  name: 'Swarm / Collapsed',
  render: () => {
    const [expanded, setExpanded] = useState(false);
    return (
      <StackedCard
        burst={swarmBurst}
        expanded={expanded}
        onToggleExpanded={() => setExpanded(!expanded)}
        activeTargetId={null}
        onTargetClick={noop}
        buildCallbacks={() => noopCallbacks}
        buildCtx={() => defaultCtx}
        renderCard={(target, isActive) => (
          <InnerCard target={target} isActive={isActive} />
        )}
        onBulkMitigate={noop}
      />
    );
  },
};

export const SwarmExpanded: StoryObj = {
  name: 'Swarm / Expanded with Bulk Actions',
  render: () => {
    const [expanded, setExpanded] = useState(true);
    return (
      <StackedCard
        burst={swarmBurst}
        expanded={expanded}
        onToggleExpanded={() => setExpanded(!expanded)}
        activeTargetId={null}
        onTargetClick={noop}
        buildCallbacks={() => noopCallbacks}
        buildCtx={() => defaultCtx}
        renderCard={(target, isActive) => (
          <InnerCard target={target} isActive={isActive} />
        )}
        onBulkMitigate={noop}
      />
    );
  },
};

export const SwarmNoBulk: StoryObj = {
  name: 'Swarm / Without Bulk Actions',
  render: () => {
    const [expanded, setExpanded] = useState(true);
    return (
      <StackedCard
        burst={swarmBurst}
        expanded={expanded}
        onToggleExpanded={() => setExpanded(!expanded)}
        activeTargetId={null}
        onTargetClick={noop}
        buildCallbacks={() => noopCallbacks}
        buildCtx={() => defaultCtx}
        renderCard={(target, isActive) => (
          <InnerCard target={target} isActive={isActive} />
        )}
      />
    );
  },
};

// --- Dashboard Composition ---

const dashboardEffectors: RegulusEffector[] = [
  { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
  { id: 'eff-2', name: 'Regulus-2', lat: 32.10, lon: 34.79, coverageRadiusM: 5000, status: 'available' },
];

const dashboardTargets: Detection[] = [
  cuas_classified,
  cuas_mitigating,
  cuas_raw,
  flow1_suspicion,
  flow2_tracking,
  cuas_bda_complete,
];

export const DashboardSidebar: StoryObj = {
  name: 'Dashboard / Sidebar with Targets',
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 700, overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
  render: () => {
    const [activeId, setActiveId] = useState<string | null>(null);
    return (
      <ListOfSystems
        targets={dashboardTargets}
        activeTargetId={activeId}
        onTargetClick={(t) => setActiveId(prev => prev === t.id ? null : t.id)}
        regulusEffectors={dashboardEffectors}
      />
    );
  },
};

export const DashboardDevices: StoryObj = {
  name: 'Dashboard / Devices Panel',
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 400, height: 700, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <DevicesPanel
      open
      onClose={noop}
      onFlyTo={noop}
      onDeviceHover={noop}
      onJamActivate={noop}
      noTransition
    />
  ),
};

export const DashboardSideByIdSide: StoryObj = {
  name: 'Dashboard / Sidebar + Devices Side by Side',
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', gap: 16, height: 700, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
  render: () => {
    const [activeId, setActiveId] = useState<string | null>(null);
    return (
      <>
        <div style={{ width: 400, overflow: 'auto', background: '#141414', borderRadius: 8 }}>
          <ListOfSystems
            targets={dashboardTargets}
            activeTargetId={activeId}
            onTargetClick={(t) => setActiveId(prev => prev === t.id ? null : t.id)}
            regulusEffectors={dashboardEffectors}
          />
        </div>
        <div style={{ position: 'relative', width: 400, overflow: 'hidden', borderRadius: 8 }}>
          <DevicesPanel
            open
            onClose={noop}
            onFlyTo={noop}
            onDeviceHover={noop}
            onJamActivate={noop}
            noTransition
          />
        </div>
      </>
    );
  },
};
