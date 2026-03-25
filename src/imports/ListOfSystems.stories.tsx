import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './ListOfSystems.spec';
import ListOfSystems from './ListOfSystems';
import type { Detection, RegulusEffector } from './ListOfSystems';
import {
  cuas_raw,
  cuas_classified,
  cuas_classified_bird,
  cuas_mitigating,
  cuas_mitigated,
  cuas_bda_complete,
  burst_targets,
  flow1_suspicion,
  flow2_tracking,
} from '@/test-utils/mockDetections';

const effectors: RegulusEffector[] = [
  { id: 'eff-1', name: 'Regulus-1', lat: 32.09, lon: 34.78, coverageRadiusM: 5000, status: 'available' },
  { id: 'eff-2', name: 'Regulus-2', lat: 32.10, lon: 34.79, coverageRadiusM: 5000, status: 'available' },
];

const meta: Meta<typeof ListOfSystems> = {
  title: 'CUAS/ListOfSystems',
  component: ListOfSystems,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 700, background: '#141414', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { test: 'todo' },
  },
  args: {
    regulusEffectors: effectors,
    onTargetClick: fn(),
    onVerify: fn(),
    onEngage: fn(),
    onDismiss: fn(),
    onSensorHover: fn(),
    onCancelMission: fn(),
    onCompleteMission: fn(),
    onSendDroneVerification: fn(),
    onMitigate: fn(),
    onMitigateAll: fn(),
    onBdaOutcome: fn(),
    onClosureOutcome: fn(),
    onSensorFocus: fn(),
    onTargetFocus: fn(),
    onTargetHover: fn(),
    thinMode: true,
  },
};

export default meta;
type Story = StoryObj<typeof ListOfSystems>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

const CUAS_TARGETS: Detection[] = [
  cuas_classified,
  cuas_mitigating,
  cuas_raw,
  flow1_suspicion,
  cuas_bda_complete,
];

export const WithTargets: Story = {
  name: 'Active Targets',
  args: {
    targets: CUAS_TARGETS,
  },
};

export const WithBurst: Story = {
  name: 'Swarm Burst',
  args: {
    targets: [...burst_targets, cuas_classified],
  },
};

export const MixedLifecycle: Story = {
  name: 'Full Lifecycle Mix',
  args: {
    targets: [
      cuas_raw,
      cuas_classified,
      cuas_classified_bird,
      flow1_suspicion,
      flow2_tracking,
      cuas_mitigating,
      cuas_mitigated,
      cuas_bda_complete,
    ],
  },
};

export const Empty: Story = {
  name: 'No Targets',
  args: {
    targets: [],
  },
};

export const Interactive: Story = {
  name: 'Interactive (click to expand)',
  render: (args) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    return (
      <ListOfSystems
        {...args}
        targets={[cuas_classified, cuas_mitigating, cuas_raw, flow1_suspicion, cuas_bda_complete]}
        activeTargetId={activeId}
        onTargetClick={(t) => setActiveId(prev => prev === t.id ? null : t.id)}
      />
    );
  },
};
