export interface NavChild {
  id: string;
  label: string;
}

export interface NavItem {
  id: string;
  label: string;
  children?: NavChild[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Foundations',
    items: [
      { id: 'icon-library', label: 'Icon Library' },
      { id: 'styling', label: 'Styling' },
    ],
  },
  {
    label: 'Getting Started',
    items: [
      { id: 'quick-start', label: 'Quick Start' },
      { id: 'releases', label: 'Releases' },
    ],
  },
  {
    label: 'Primitives',
    items: [
      { id: 'status-chip', label: 'StatusChip' },
      { id: 'new-updates', label: 'NewUpdatesPill' },
      { id: 'action-button', label: 'ActionButton' },
      { id: 'split-action', label: 'SplitActionButton' },
      { id: 'accordion', label: 'AccordionSection' },
      { id: 'telemetry', label: 'TelemetryRow' },
      { id: 'copy-button', label: 'CopyButton' },
    ],
  },
  {
    label: 'Card building blocks',
    items: [
      { id: 'card-header', label: 'CardHeader' },
      { id: 'card-media', label: 'CardMedia' },
      { id: 'card-actions', label: 'CardActions' },
      { id: 'card-details', label: 'CardDetails' },
      { id: 'card-identity', label: 'CardIdentity' },
      { id: 'card-sensors', label: 'CardSensors' },
      { id: 'card-log', label: 'CardLog' },
      { id: 'card-closure', label: 'CardClosure' },
    ],
  },
  {
    label: 'Cards & lists',
    items: [
      { id: 'card-states', label: 'Card States' },
      { id: 'target-card', label: 'TargetCard' },
      { id: 'filter-bar', label: 'FilterBar' },
    ],
  },
  {
    label: 'Devices',
    items: [
      {
        id: 'device-card',
        label: 'Device Card',
        children: [
          { id: 'device-health', label: 'Health tile' },
          { id: 'device-health-tooltip', label: 'Health tooltip' },
          { id: 'device-detail-grid', label: 'Detail grid' },
          { id: 'device-camera-preview', label: 'Camera preview' },
          { id: 'device-header-cluster', label: 'Header cluster' },
          { id: 'device-row-actions', label: 'Action bar' },
          { id: 'device-interaction-states', label: 'Interaction states' },
          { id: 'device-overflow', label: 'Overflow + notify' },
          { id: 'device-row', label: 'DeviceRow' },
          { id: 'device-card-states', label: 'Edge cases' },
          { id: 'device-elements', label: 'Elements catalog' },
        ],
      },
      {
        id: 'devices-panel',
        label: 'DevicesPanel',
        children: [
          { id: 'devices-empty', label: 'Empty state' },
          { id: 'devices-header', label: 'Header' },
          { id: 'devices-search', label: 'Search & filters' },
          { id: 'devices-rows', label: 'Device rows' },
          { id: 'devices-camera', label: 'Camera device' },
          { id: 'devices-ecm', label: 'ECM device' },
          { id: 'devices-drone', label: 'Drone device' },
          { id: 'devices-speaker', label: 'Speaker device' },
          { id: 'devices-floodlight', label: 'Floodlight device' },
          { id: 'devices-actions', label: 'Action bar' },
          { id: 'devices-track-combobox', label: 'Audio-track combobox' },
        ],
      },
      {
        id: 'device-card-flows',
        label: 'Device Card + Map',
        children: [
          { id: 'flow-hover-device', label: 'Hover Device' },
          { id: 'flow-click-asset', label: 'Click Asset' },
          { id: 'flow-camera-lookat', label: 'Camera Look-At' },
        ],
      },
    ],
  },
  {
    label: 'Interactions',
    items: [
      {
        id: 'target-card-flows',
        label: 'Target Card + Map',
        children: [
          { id: 'flow-hover-card', label: 'Hover Card' },
          { id: 'flow-open-card', label: 'Open Card' },
          { id: 'flow-click-marker', label: 'Click Marker' },
          { id: 'flow-hover-sensor', label: 'Hover Sensor' },
        ],
      },
      {
        id: 'engagement-line-flows',
        label: 'Engagement Line',
        children: [
          { id: 'engagement-anatomy', label: 'Line Anatomy' },
          { id: 'engagement-spec', label: 'Animation Spec' },
        ],
      },
    ],
  },
  {
    label: 'Tactical',
    items: [
      {
        id: 'map-markers',
        label: 'Map Markers',
        children: [
          { id: 'layer-anatomy', label: 'Layer Anatomy' },
          { id: 'state-matrix', label: 'State Matrix' },
          { id: 'severity-matrix', label: 'Severity & Urgency' },
          { id: 'icon-catalog', label: 'Icon Catalog' },
        ],
      },
    ],
  },
  {
    label: 'Video HUD',
    items: [
      { id: 'hud-compass-strip', label: 'Compass Strip' },
      { id: 'hud-device-select', label: 'Device Select' },
      { id: 'hud-angle-toggle', label: 'Angle Toggle' },
      { id: 'hud-setpoint-rail', label: 'Setpoint Rail' },
      { id: 'hud-connectivity', label: 'Connectivity' },
      { id: 'hud-slew-cue', label: 'Slew Cue' },
      { id: 'hud-auto-track', label: 'Auto-Track' },
      { id: 'hud-detections', label: 'Detections' },
      { id: 'hud-day-night', label: 'Day / Night' },
      { id: 'hud-context-menu', label: 'Context Menu' },
    ],
  },
  {
    label: 'Labs',
    items: [{ id: 'onboarding-lab', label: 'Onboarding Auto-Coverage' }],
  },
];

export function findGroupForId(id: string): NavGroup | undefined {
  return NAV.find((g) =>
    g.items.some(
      (item) => item.id === id || item.children?.some((c) => c.id === id),
    ),
  );
}

export function findParentItemForChild(childId: string): NavItem | undefined {
  for (const g of NAV) {
    for (const item of g.items) {
      if (item.children?.some((c) => c.id === childId)) return item;
    }
  }
  return undefined;
}

export interface FlatNavEntry {
  group: string;
  label: string;
  id: string;
  parentId?: string;
}

export function flattenNavForSearch(): FlatNavEntry[] {
  const entries: FlatNavEntry[] = [];
  for (const group of NAV) {
    for (const item of group.items) {
      entries.push({ group: group.label, label: item.label, id: item.id });
      if (item.children) {
        for (const child of item.children) {
          entries.push({
            group: group.label,
            label: child.label,
            id: child.id,
            parentId: item.id,
          });
        }
      }
    }
  }
  return entries;
}
