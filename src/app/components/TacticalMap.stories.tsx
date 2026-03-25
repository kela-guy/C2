import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpecDocs } from '@/specs/SpecDocs';
import { spec } from './TacticalMap.spec';
import { TacticalMap } from './TacticalMap';
import {
  flow1_suspicion,
  flow2_tracking,
  flow2_mitigating,
  flow3_flying,
  flow4_mission,
} from '@/test-utils/mockDetections';
import type { Detection } from '@/imports/ListOfSystems';

const meta = {
  title: 'Composition/TacticalMap',
  component: TacticalMap,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TacticalMap>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Spec: StoryObj = {
  render: () => <SpecDocs spec={spec} />,
  parameters: { controls: { disable: true }, actions: { disable: true }, layout: 'fullscreen', a11y: { test: 'todo' }, specDocs: true },
};

const noop = () => {};

const BASE_TARGETS: Detection[] = [
  {
    ...flow1_suspicion,
    detectedBySensors: [
      { id: 'cam-north-1', typeLabel: 'Pixelsight', latitude: 31.212, longitude: 34.66 },
      { id: 'cam-north-2', typeLabel: 'PTZ-North', latitude: 31.21, longitude: 34.668 },
    ],
  },
  {
    ...flow2_tracking,
    coordinates: '31.2150° N, 34.6700° E',
    detectedBySensors: [
      { id: 'cam-north-1', typeLabel: 'Pixelsight', latitude: 31.212, longitude: 34.66 },
    ],
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ width: '100%', height: '80vh', borderRadius: 8, overflow: 'hidden' }}>
      <TacticalMap targets={BASE_TARGETS} onMarkerClick={noop} />
    </div>
  ),
};

export const WithActiveTarget: Story = {
  render: () => {
    const [activeId, setActiveId] = useState<string | null>('t-001');
    return (
      <div style={{ width: '100%', height: '80vh', borderRadius: 8, overflow: 'hidden' }}>
        <TacticalMap
          targets={BASE_TARGETS}
          activeTargetId={activeId}
          onMarkerClick={(id) => setActiveId(id === activeId ? null : id)}
          focusCoords={{ lat: 31.212, lon: 34.66 }}
        />
      </div>
    );
  },
};

export const DroneDeployment: Story = {
  render: () => (
    <div style={{ width: '100%', height: '80vh', borderRadius: 8, overflow: 'hidden' }}>
      <TacticalMap
        targets={[flow3_flying]}
        activeTargetId="t-020"
        activeDrone={{
          currentLat: 31.21,
          currentLon: 34.67,
          hiveLat: 31.205,
          hiveLon: 34.66,
          targetLat: 31.215,
          targetLon: 34.675,
          phase: 'flying',
          headingDeg: 45,
          trail: [
            [34.66, 31.205],
            [34.665, 31.2075],
            [34.67, 31.21],
          ],
        }}
        onMarkerClick={noop}
      />
    </div>
  ),
};

export const MissionRoute: Story = {
  render: () => (
    <div style={{ width: '100%', height: '80vh', borderRadius: 8, overflow: 'hidden' }}>
      <TacticalMap
        targets={[flow4_mission]}
        activeTargetId="t-030"
        missionRoute={{
          waypoints: [
            { lat: 31.208, lon: 34.665, label: 'WP1' },
            { lat: 31.212, lon: 34.67, label: 'WP2' },
            { lat: 31.21, lon: 34.675, label: 'WP3' },
          ],
          droneLat: 31.21,
          droneLon: 34.67,
          headingDeg: 90,
          currentSegment: 1,
          phase: 'active',
          trail: [
            [34.665, 31.208],
            [34.6675, 31.21],
            [34.67, 31.212],
          ],
          loop: false,
        }}
        onMarkerClick={noop}
      />
    </div>
  ),
};

export const MitigationActive: Story = {
  render: () => (
    <div style={{ width: '100%', height: '80vh', borderRadius: 8, overflow: 'hidden' }}>
      <TacticalMap targets={[flow2_mitigating]} activeTargetId="t-011" onMarkerClick={noop} />
    </div>
  ),
};

export const PlanningMode: Story = {
  render: () => {
    const [waypoints, setWaypoints] = useState<{ lat: number; lon: number }[]>([]);
    return (
      <div
        style={{
          width: '100%',
          height: '80vh',
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <TacticalMap
          targets={[]}
          planningMode={true}
          onMapClick={(lat, lon) => setWaypoints((w) => [...w, { lat, lon }])}
          onMarkerClick={noop}
        />
        {waypoints.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur rounded px-3 py-2 text-[10px] text-zinc-300 font-mono">
            {waypoints.length} waypoints placed
          </div>
        )}
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <div style={{ width: '100%', height: '80vh', borderRadius: 8, overflow: 'hidden' }}>
      <TacticalMap targets={[]} onMarkerClick={noop} />
    </div>
  ),
};
