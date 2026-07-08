/**
 * Default flow-draft factory, split out of `FlowBuilderPanel.tsx` so
 * Dashboard can seed its draft state without statically importing the
 * (lazy-loaded) panel module.
 */

import {
  type FlowDef,
  DEFAULT_FLOW_TIMING,
  deriveActForEntity,
} from '@/lib/flowBuilder';

function newDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Build a fresh default flow draft. */
export function defaultFlowDraft(): FlowDef {
  return {
    id: newDraftId(),
    name: '',
    version: 1,
    entity: 'drone',
    affiliation: 'hostile',
    sensorIds: ['RAD-NVT-RADA'],
    location: { kind: 'preset', key: 'sector-north' },
    investigation: { pointCamera: false },
    act: deriveActForEntity('drone'),
    timing: { ...DEFAULT_FLOW_TIMING },
    playback: { mode: 'auto', speed: 1 },
  };
}
