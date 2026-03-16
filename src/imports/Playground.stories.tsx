import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback, useMemo } from 'react';
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
  type ThreatAccent,
} from '@/primitives';
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
import { ALL_DETECTIONS } from '@/test-utils/mockDetections';
import type { Detection } from './ListOfSystems';

const ACCENT_OPTIONS: ThreatAccent[] = [
  'idle', 'suspicion', 'detection', 'tracking', 'mitigating', 'active', 'resolved', 'expired',
];

const SLOT_LABELS: Record<string, string> = {
  media: 'Media Feed',
  actions: 'Actions',
  timeline: 'Timeline',
  details: 'Details',
  sensors: 'Sensors',
  log: 'Activity Log',
  closure: 'Closure',
};

type SlotKey = keyof typeof SLOT_LABELS;

function ToggleChip({
  label,
  active,
  onToggle,
  hasData,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  hasData: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium
        ${active
          ? 'bg-white/10 border-white/20 text-white'
          : 'bg-transparent border-white/5 text-zinc-600 line-through'
        }
        ${!hasData ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:border-white/30'}
      `}
      disabled={!hasData}
    >
      {label}
      {!hasData && ' ∅'}
    </button>
  );
}

function AccentDot({ accent, active, onClick }: { accent: ThreatAccent; active: boolean; onClick: () => void }) {
  const colorMap: Record<ThreatAccent, string> = {
    idle: '#52525b',
    suspicion: '#f59e0b',
    detection: '#fa5252',
    tracking: '#fd7e14',
    mitigating: '#ef4444',
    active: '#74c0fc',
    resolved: '#12b886',
    expired: '#3f3f46',
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-5 h-5 rounded-full border-2 transition-all cursor-pointer
        ${active ? 'border-white scale-125' : 'border-transparent hover:scale-110'}
      `}
      style={{ backgroundColor: colorMap[accent] }}
      title={accent}
    />
  );
}

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

const FLOW_LABELS: Record<number, string> = {
  1: 'Ground Suspicion',
  2: 'CUAS',
  3: 'Drone Verification',
  4: 'Mission',
  5: 'Post-Mitigation',
};

function Playground() {
  const [selectedIdx, setSelectedIdx] = useState(3);
  const target = ALL_DETECTIONS[selectedIdx];
  const [open, setOpen] = useState(true);
  const [accentOverride, setAccentOverride] = useState<ThreatAccent | null>(null);

  const slots = useCardSlots(target, noopCallbacks, defaultCtx);

  const slotAvailability = useMemo<Record<SlotKey, boolean>>(() => ({
    media: slots.media !== null,
    actions: slots.actions.length > 0,
    timeline: slots.timeline.length > 0,
    details: slots.details.rows.length > 0,
    sensors: slots.sensors.length > 0,
    log: slots.log.length > 0,
    closure: slots.closure !== null,
  }), [slots]);

  const [enabledSlots, setEnabledSlots] = useState<Record<SlotKey, boolean>>({
    media: true,
    actions: true,
    timeline: true,
    details: true,
    sensors: true,
    log: true,
    closure: true,
  });

  const toggleSlot = useCallback((key: SlotKey) => {
    setEnabledSlots(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const accent = accentOverride ?? slots.accent;
  const isMission = target.flowType === 4;
  const isSuccess = target.status === 'event_resolved' || target.status === 'event_neutralized';
  const isExpired = target.status === 'expired';
  const showDetails = !isSuccess && !isExpired && target.flowType !== 4;

  const enabledCount = Object.entries(enabledSlots).filter(([k, v]) => v && slotAvailability[k as SlotKey]).length;
  const totalAvailable = Object.values(slotAvailability).filter(Boolean).length;

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Controls Panel */}
      <div className="w-[260px] shrink-0 space-y-5">
        {/* Detection Picker */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
            Detection
          </label>
          <div className="space-y-1">
            {ALL_DETECTIONS.map((d, i) => (
              <button
                key={d.id}
                onClick={() => { setSelectedIdx(i); setAccentOverride(null); }}
                className={`
                  w-full text-right px-2.5 py-1.5 rounded-md text-[11px] transition-all cursor-pointer
                  ${i === selectedIdx
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <div className="font-medium truncate">{d.name}</div>
                <div className="text-[9px] text-zinc-600 mt-0.5">
                  Flow {d.flowType} — {FLOW_LABELS[d.flowType ?? 0] ?? 'Unknown'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent Override */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              Accent
            </label>
            {accentOverride && (
              <button
                onClick={() => setAccentOverride(null)}
                className="text-[9px] text-zinc-600 hover:text-zinc-400 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {ACCENT_OPTIONS.map((a) => (
              <AccentDot
                key={a}
                accent={a}
                active={accent === a}
                onClick={() => setAccentOverride(a === accentOverride ? null : a)}
              />
            ))}
          </div>
          <div className="text-[9px] text-zinc-600 mt-1.5">
            {accentOverride ? `Override: ${accentOverride}` : `Auto: ${slots.accent}`}
          </div>
        </div>

        {/* Slot Toggles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              Slots ({enabledCount}/{totalAvailable})
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => setEnabledSlots(Object.fromEntries(Object.keys(SLOT_LABELS).map(k => [k, true])) as Record<SlotKey, boolean>)}
                className="text-[9px] text-zinc-600 hover:text-zinc-400 cursor-pointer"
              >
                All
              </button>
              <span className="text-zinc-700 text-[9px]">·</span>
              <button
                onClick={() => setEnabledSlots(Object.fromEntries(Object.keys(SLOT_LABELS).map(k => [k, false])) as Record<SlotKey, boolean>)}
                className="text-[9px] text-zinc-600 hover:text-zinc-400 cursor-pointer"
              >
                None
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SLOT_LABELS) as SlotKey[]).map((key) => (
              <ToggleChip
                key={key}
                label={SLOT_LABELS[key]}
                active={enabledSlots[key]}
                onToggle={() => toggleSlot(key)}
                hasData={slotAvailability[key]}
              />
            ))}
          </div>
        </div>

        {/* State Toggle */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
            Card State
          </label>
          <button
            onClick={() => setOpen(!open)}
            className={`
              text-[11px] px-3 py-1.5 rounded-md border transition-all cursor-pointer
              ${open
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-transparent border-white/10 text-zinc-500'
              }
            `}
          >
            {open ? 'Expanded' : 'Collapsed'}
          </button>
        </div>

        {/* Data Inspector */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
            Detection Data
          </label>
          <div className="text-[10px] font-mono text-zinc-600 space-y-0.5 bg-white/[0.02] rounded-md p-2 border border-white/5">
            <div>id: <span className="text-zinc-400">{target.id}</span></div>
            <div>flow: <span className="text-zinc-400">{target.flowType}</span></div>
            <div>status: <span className="text-zinc-400">{target.status}</span></div>
            <div>phase: <span className="text-zinc-400">{target.flowPhase ?? '—'}</span></div>
            <div>type: <span className="text-zinc-400">{target.type}</span></div>
            <div>entity: <span className="text-zinc-400">{target.entityStage ?? '—'}</span></div>
            <div>mitigation: <span className="text-zinc-400">{target.mitigationStatus ?? '—'}</span></div>
          </div>
        </div>
      </div>

      {/* Card Preview */}
      <div className="flex-1 flex items-start justify-center pt-4">
        <div className="w-[380px]">
          <TargetCard
            accent={accent}
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
            {enabledSlots.media && slots.media && <CardMedia {...slots.media} />}

            {enabledSlots.actions && slots.actions.length > 0 && (
              <CardActions actions={slots.actions} />
            )}

            {enabledSlots.timeline && slots.timeline.length > 0 && (
              <div className="px-2 border-b border-white/5">
                <CardTimeline steps={slots.timeline} />
              </div>
            )}

            {enabledSlots.details && showDetails && (
              <CardDetails
                rows={slots.details.rows}
                classification={slots.details.classification}
              />
            )}

            {enabledSlots.sensors && slots.sensors.length > 0 && (
              <div className="px-2 pb-2">
                <CardSensors
                  sensors={slots.sensors}
                  onSensorHover={noopCallbacks.onSensorHover}
                  onSensorClick={noopCallbacks.onSensorFocus}
                />
              </div>
            )}

            {enabledSlots.log && slots.log.length > 0 && (
              <CardLog entries={slots.log} defaultOpen={isSuccess || isExpired} />
            )}

            {enabledSlots.closure && slots.closure && (
              <CardClosure outcomes={slots.closure.outcomes} onSelect={slots.closure.onSelect} />
            )}
          </TargetCard>
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'TargetCard/Playground',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ padding: 24, minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const Interactive: StoryObj = {
  name: 'Playground',
  render: () => <Playground />,
};
