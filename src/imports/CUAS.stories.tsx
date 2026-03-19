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
  AccordionSection,
  TelemetryRow,
  CARD_TOKENS,
  StackedCard,
} from '@/primitives';
import { Crosshair, Radar } from 'lucide-react';
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
  if (target.status === 'suspicion') return <StatusChip label="תח״ש" color="orange" />;
  if (target.status === 'event_neutralized') return <StatusChip label="נוטרל" color="green" />;
  if (target.status === 'event_resolved') return <StatusChip label="הושלם" color="green" />;
  if (target.status === 'expired') return <StatusChip label="פג תוקף" color="gray" />;
  return null;
}

/**
 * Mirrors UnifiedCard from ListOfSystems.tsx exactly — this is the card
 * the CUAS dashboard actually renders.
 */
function CuasCard({
  target,
  defaultOpen = false,
  thinMode = false,
}: {
  target: Detection;
  defaultOpen?: boolean;
  thinMode?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const slots = useCardSlots(target, noopCallbacks, defaultCtx);

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
          status={
            isMission && target.plannedMission
              ? <MissionPhaseChip phase={target.plannedMission.phase} />
              : buildStatusChip(target)
          }
          open={open}
        />
      }
    >
      {slots.media && <CardMedia {...slots.media} />}

      {slots.actions.length > 0 && <CardActions actions={slots.actions} />}

      {!thinMode && slots.timeline.length > 0 && (
        <div className="px-2" style={{ borderBottom: `1px solid ${CARD_TOKENS.surface.level2}` }}>
          <CardTimeline steps={slots.timeline} />
        </div>
      )}

      {showDetails && (
        <CardDetails
          rows={slots.details.rows}
          classification={slots.details.classification}
        />
      )}

      {slots.laserPosition.length > 0 && (
        <AccordionSection title="מיקום יחסי ללייזר" icon={Crosshair}>
          <div className="w-full py-1">
            <div className="grid grid-cols-3 grid-rows-1 gap-0">
              {slots.laserPosition.map((row, idx) => (
                <TelemetryRow key={idx} label={row.label} value={row.value} icon={row.icon} />
              ))}
            </div>
          </div>
        </AccordionSection>
      )}

      {slots.sensors.length > 0 && (
        <AccordionSection title={`חיישנים (${slots.sensors.length})`} icon={Radar}>
          <div className="px-0 pb-2 w-full pt-2">
            <CardSensors
              sensors={slots.sensors}
              label=""
              onSensorHover={noopCallbacks.onSensorHover}
            />
          </div>
        </AccordionSection>
      )}

      {!thinMode && slots.log.length > 0 && (
        <CardLog entries={slots.log} />
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
          status={
            isMission && target.plannedMission
              ? <MissionPhaseChip phase={target.plannedMission.phase} />
              : buildStatusChip(target)
          }
          open={open}
        />
      }
    >
      {slots.actions.length > 0 && <CardActions actions={slots.actions} />}

      {showDetails && (
        <CardDetails
          rows={slots.details.rows}
          classification={slots.details.classification}
        />
      )}

      {slots.sensors.length > 0 && (
        <AccordionSection title={`חיישנים (${slots.sensors.length})`} icon={Radar}>
          <div className="px-0 pb-2 w-full pt-2">
            <CardSensors
              sensors={slots.sensors}
              label=""
              onSensorHover={noopCallbacks.onSensorHover}
            />
          </div>
        </AccordionSection>
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
  render: () => <CuasCard target={cuas_raw} defaultOpen thinMode />,
};

export const Classified: StoryObj = {
  name: 'Lifecycle / Classified Drone',
  render: () => <CuasCard target={cuas_classified} defaultOpen thinMode />,
};

export const ClassifiedBird: StoryObj = {
  name: 'Lifecycle / Classified Bird',
  render: () => <CuasCard target={cuas_classified_bird} defaultOpen thinMode />,
};

export const Mitigating: StoryObj = {
  name: 'Lifecycle / Mitigating',
  render: () => <CuasCard target={cuas_mitigating} defaultOpen thinMode />,
};

export const Mitigated: StoryObj = {
  name: 'Lifecycle / Mitigated (BDA Pending)',
  render: () => <CuasCard target={cuas_mitigated} defaultOpen thinMode />,
};

export const BdaComplete: StoryObj = {
  name: 'Lifecycle / BDA Complete',
  render: () => <CuasCard target={cuas_bda_complete} defaultOpen thinMode />,
};

export const FullLifecycle: StoryObj = {
  name: 'Lifecycle / Full Pipeline',
  render: () => (
    <div className="flex flex-col gap-2">
      {CUAS_LIFECYCLE.map((d) => (
        <CuasCard key={d.id} target={d} thinMode />
      ))}
    </div>
  ),
};

export const FullLifecycleExpanded: StoryObj = {
  name: 'Lifecycle / Full Pipeline (Expanded)',
  render: () => (
    <div className="flex flex-col gap-2">
      {CUAS_LIFECYCLE.map((d) => (
        <CuasCard key={d.id} target={d} defaultOpen thinMode />
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
        thinMode
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
            thinMode
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
