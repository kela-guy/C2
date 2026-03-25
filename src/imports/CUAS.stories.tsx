import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  TargetCard,
  CardHeader,
  CardActions,
  CardDetails,
  CardSensors,
  CardMedia,
  CardClosure,
  StatusChip,
  MissionPhaseChip,
  AccordionSection,
  TelemetryRow,
} from '@/primitives';
import { Crosshair, Radar } from 'lucide-react';
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
import {
  cuas_raw,
  cuas_classified,
  cuas_mitigating,
  cuas_bda_complete,
  flow1_suspicion,
  flow2_tracking,
} from '@/test-utils/mockDetections';
import ListOfSystems from './ListOfSystems';
import type { Detection, RegulusEffector } from './ListOfSystems';
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
      <div style={{ padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

// --- Interactive Flow ---

function InteractiveCuasFlow() {
  const [target, setTarget] = useState<Detection>({ ...cuas_classified });
  const [effectors, setEffectors] = useState<RegulusEffector[]>([
    { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
    { id: 'eff-2', name: 'Regulus-2', lat: 32.10, lon: 34.79, coverageRadiusM: 5000, status: 'available' },
  ]);

  const appendLog = useCallback((label: string) => {
    const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTarget(prev => ({ ...prev, actionLog: [...(prev.actionLog || []), { time, label }] }));
  }, []);

  const callbacks: CardCallbacks = {
    ...noopCallbacks,
    onMitigate: (effectorId) => {
      appendLog(`שיבוש — ${effectorId}`);
      setTarget(prev => ({ ...prev, mitigationStatus: 'mitigating', mitigatingEffectorId: effectorId }));
      setEffectors(prev => prev.map(r =>
        r.id === effectorId ? { ...r, status: 'active' as const } : r
      ));
      setTimeout(() => {
        setTarget(prev => ({
          ...prev,
          mitigationStatus: 'mitigated',
          missionType: 'jamming',
          missionStatus: 'waiting_confirmation',
          actionLog: [...(prev.actionLog || []), {
            time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            label: 'שיבוש הושלם — ממתין לאימות',
          }],
        }));
        setEffectors(prev => prev.map(r => ({ ...r, status: 'available' as const })));
      }, 3000);
    },
    onMitigateAll: () => {
      appendLog('שיבוש כללי');
      setTarget(prev => ({ ...prev, mitigationStatus: 'mitigating', mitigatingEffectorId: 'ALL' }));
      setTimeout(() => {
        setTarget(prev => ({
          ...prev,
          mitigationStatus: 'mitigated',
          missionType: 'jamming',
          missionStatus: 'waiting_confirmation',
          actionLog: [...(prev.actionLog || []), {
            time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            label: 'שיבוש כללי הושלם — ממתין לאימות',
          }],
        }));
      }, 3000);
    },
    onBdaCamera: () => {
      appendLog('מפנה מצלמה לאימות');
    },
    onCompleteMission: () => {
      appendLog('משימה הושלמה');
      setTarget(prev => ({ ...prev, status: 'event_neutralized', missionStatus: 'complete' }));
    },
  };

  const ctx: CardContext = { regulusEffectors: effectors };

  const slots = useCardSlots(target, callbacks, ctx);
  const isMission = target.flowType === 4;
  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';
  const showDetails = !isSuccess && !isExpired && target.flowType !== 4;

  const reset = () => {
    setTarget({ ...cuas_classified });
    setEffectors([
      { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
      { id: 'eff-2', name: 'Regulus-2', lat: 32.10, lon: 34.79, coverageRadiusM: 5000, status: 'available' },
    ]);
  };

  return (
    <div className="flex flex-col gap-3">
      <TargetCard
        accent={slots.accent}
        completed={slots.completed}
        open
        onToggle={noop}
        header={
          <CardHeader
            {...slots.header}
            status={
              isMission && target.plannedMission
                ? <MissionPhaseChip phase={target.plannedMission.phase} />
                : buildStatusChip(target)
            }
            open
          />
        }
      >
        {slots.media && <CardMedia {...slots.media} />}
        {slots.actions.length > 0 && <CardActions actions={slots.actions} />}
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
              <CardSensors sensors={slots.sensors} label="" onSensorHover={noop} />
            </div>
          </AccordionSection>
        )}
        {slots.closure && (
          <CardClosure outcomes={slots.closure.outcomes} onSelect={slots.closure.onSelect} />
        )}
      </TargetCard>

      <button
        onClick={reset}
        className="px-3 py-1.5 rounded text-xs bg-white/10 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors self-start"
      >
        איפוס ↻
      </button>
    </div>
  );
}

export const InteractiveFlow: StoryObj = {
  name: 'Interactive / Jam → BDA Flow',
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
  render: () => <InteractiveCuasFlow />,
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
    <DndProvider backend={HTML5Backend}>
      <DevicesPanel
        open
        onClose={noop}
        onFlyTo={noop}
        onDeviceHover={noop}
        onJamActivate={noop}
        noTransition
      />
    </DndProvider>
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
          <DndProvider backend={HTML5Backend}>
            <DevicesPanel
              open
              onClose={noop}
              onFlyTo={noop}
              onDeviceHover={noop}
              onJamActivate={noop}
              noTransition
            />
          </DndProvider>
        </div>
      </>
    );
  },
};
