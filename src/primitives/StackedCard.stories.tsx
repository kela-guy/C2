import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { useState } from 'react';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './StackedCard.spec';
import { StackedCard } from './StackedCard';
import {
  TargetCard,
  CardHeader,
  CardActions,
  CardTimeline,
  CardDetails,
  StatusChip,
} from '@/primitives';
import { useCardSlots, type CardCallbacks, type CardContext } from '../imports/useCardSlots';
import { burst_targets } from '@/test-utils/mockDetections';
import type { Detection } from '../imports/ListOfSystems';
import type { TargetBurst } from '../imports/useTargetBursts';

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
  ],
};

const mockBurst: TargetBurst = {
  kind: 'burst',
  id: 'burst-0',
  targets: burst_targets,
  firstTimestamp: '00:15:00',
  lastTimestamp: '00:15:04',
  typeBreakdown: { 'רחפן': 4, 'ציפור': 1 },
};

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
          status={<StatusChip label="איתור" color="red" />}
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

function StackedCardDemo({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <StackedCard
      burst={mockBurst}
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
}

const meta: Meta = {
  title: 'CUAS/Primitives/StackedCard',
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

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

export const Collapsed: StoryObj = {
  name: 'Collapsed',
  render: () => <StackedCardDemo />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: /איתורים/ });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('tabindex', '0');
  },
};

export const Expanded: StoryObj = {
  name: 'Expanded',
  render: () => <StackedCardDemo defaultExpanded />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: /איתורים/ });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  },
};

export const KeyboardToggle: StoryObj = {
  name: 'Keyboard — Enter Toggle',
  render: () => <StackedCardDemo />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: /איתורים/ });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard(' ');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

export const SmallBurst: StoryObj = {
  name: 'Small Burst (2 items)',
  render: () => {
    const smallBurst: TargetBurst = {
      kind: 'burst',
      id: 'burst-small',
      targets: burst_targets.slice(0, 2),
      firstTimestamp: '00:15:00',
      lastTimestamp: '00:15:01',
      typeBreakdown: { 'רחפן': 2 },
    };

    const [expanded, setExpanded] = useState(false);

    return (
      <StackedCard
        burst={smallBurst}
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
