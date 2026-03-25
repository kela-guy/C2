import type { ComponentSpec } from '@/specs/types';

export const spec: ComponentSpec = {
  name: 'TacticalMap',
  filePath: 'src/app/components/TacticalMap.tsx',
  purpose: 'Full-screen Mapbox GL tactical map displaying detection targets, sensor FOV cones, drone deployments, mission routes, missile flights, ECM jamming visualizations, and context-menu actions.',
  location: 'Composition',
  status: 'prototype',

  props: [
    { name: 'targets', type: 'Detection[]', required: false, description: 'Array of detection targets to render as map markers' },
    { name: 'activeTargetId', type: 'string | null', required: false, description: 'Currently selected target — shown with pulsing ring and popup' },
    { name: 'focusCoords', type: '{ lat: number; lon: number } | null', required: false, description: 'Fly-to coordinates for centering the map' },
    { name: 'onMarkerClick', type: '(targetId: string) => void', required: false, description: 'Called when a target marker is clicked' },
    { name: 'missileLaunchRequest', type: 'MissileLaunchRequest | null', required: false, description: 'Triggers animated missile flight on the map' },
    { name: 'highlightedSensorIds', type: 'string[]', required: false, description: 'Sensor IDs to visually highlight on the map' },
    { name: 'onMissilePhaseChange', type: '(payload) => void', required: false, description: 'Callback for missile flight phase transitions' },
    { name: 'hoveredSensorIdFromCard', type: 'string | null', required: false, description: 'Sensor hovered in sidebar — highlighted on map' },
    { name: 'jammingTargetId', type: 'string | null', required: false, description: 'Target being jammed — triggers jamming wave animation' },
    { name: 'jammingJammerAssetId', type: 'string | null', required: false, description: 'Jammer asset performing the jamming' },
    { name: 'cameraLookAtRequest', type: '{ cameraId, targetLat, targetLon, fovOverrideDeg } | null', required: false, description: 'Animate camera FOV cone to face a target' },
    { name: 'controlIndicator', type: 'boolean', required: false, description: 'Show "You have control" indicator overlay' },
    { name: 'planningMode', type: 'boolean', required: false, description: 'Enable click-to-add waypoints mode' },
    { name: 'onMapClick', type: '(lat: number, lon: number) => void', required: false, description: 'Map click handler for placing waypoints' },
    { name: 'missionRoute', type: 'object | null', required: false, description: 'Drone mission route with waypoints, trail, and progress' },
    { name: 'activeDrone', type: 'object | null', required: false, description: 'Active drone deployment with position, heading, and trail' },
    { name: 'regulusEffectors', type: 'RegulusEffector[]', required: false, description: 'ECM effector positions and coverage radii' },
    { name: 'sensorFocusId', type: 'string | null', required: false, description: 'Sensor ID to fly-to and flicker highlight' },
    { name: 'friendlyDrones', type: 'array', required: false, description: 'Friendly drone markers with name, position, altitude' },
    { name: 'smoothFocusRequest', type: '{ lat, lon } | null', required: false, description: 'Smooth pan to target without zoom change' },
    { name: 'hoveredTargetIdFromCard', type: 'string | null', required: false, description: 'Target hovered in sidebar — highlight ring on map' },
    { name: 'onContextMenuAction', type: '(action, elementType, elementId) => void', required: false, description: 'Context menu action handler for targets/sensors/effectors' },
  ],

  states: [
    {
      name: 'default',
      trigger: 'Component mounts with targets array',
      description: 'Map loads with sensor FOV cones, target markers grouped by status/type, navigation controls visible',
      implementedInPrototype: true,
    },
    {
      name: 'target selected',
      trigger: 'User clicks a target marker or activeTargetId prop changes',
      description: 'Selected target gets pulsing ring animation and info popup',
      implementedInPrototype: true,
    },
    {
      name: 'drone deployment active',
      trigger: 'activeDrone prop is provided',
      description: 'Animated drone icon with heading, flight trail polyline, and hive-to-target line',
      implementedInPrototype: true,
    },
    {
      name: 'mission route active',
      trigger: 'missionRoute prop is provided',
      description: 'Waypoint markers, route polyline, progress indicator, and drone position',
      implementedInPrototype: true,
    },
    {
      name: 'missile in flight',
      trigger: 'missileLaunchRequest prop is provided',
      description: 'Animated missile icon flying from launcher to target with trail and explosion',
      implementedInPrototype: true,
    },
    {
      name: 'jamming active',
      trigger: 'jammingTargetId and jammingJammerAssetId are set',
      description: 'Wave animation from jammer to target, target drone greys out',
      implementedInPrototype: true,
    },
    {
      name: 'planning mode',
      trigger: 'planningMode=true',
      description: 'Map clicks place waypoints, crosshair cursor, click handler active',
      implementedInPrototype: true,
    },
    {
      name: 'empty map',
      trigger: 'targets=[] and no active overlays',
      description: 'Map shows only base satellite/terrain tiles with sensor FOV cones',
      implementedInPrototype: true,
    },
    {
      name: 'loading',
      trigger: 'Map tiles or target data still loading',
      description: 'Loading indicator while Mapbox tiles or data loads',
      implementedInPrototype: false,
      visualNotes: 'Skeleton overlay or spinner centered on map',
    },
    {
      name: 'error',
      trigger: 'Mapbox token invalid or network failure',
      description: 'Error state with message when map fails to load',
      implementedInPrototype: false,
    },
    {
      name: 'disabled',
      trigger: 'Map interactions disabled during critical operations',
      description: 'Pointer events disabled, dimmed overlay',
      implementedInPrototype: false,
    },
  ],

  interactions: [
    {
      trigger: 'click',
      element: 'Target marker',
      result: 'Calls onMarkerClick, marker gets selected state with pulsing ring',
    },
    {
      trigger: 'click',
      element: 'Map background (planning mode)',
      result: 'Calls onMapClick with lat/lon to add waypoint',
    },
    {
      trigger: 'right-click',
      element: 'Target/sensor/effector marker',
      result: 'Opens context menu with actions (center, info, look-at, jam)',
    },
    {
      trigger: 'hover',
      element: 'Sensor FOV cone',
      result: 'Cone highlights with increased opacity',
      animation: { property: 'opacity', from: '0.15', to: '0.35', duration: '150ms', easing: 'ease-out' },
    },
    {
      trigger: 'scroll',
      element: 'Map canvas',
      result: 'Zoom in/out via Mapbox GL controls',
    },
    {
      trigger: 'drag',
      element: 'Map canvas',
      result: 'Pan the map view',
    },
  ],

  tokens: {
    colors: [
      { name: 'target-detection', value: '#ef4444', usage: 'Red marker for detection/event targets' },
      { name: 'target-tracking', value: '#f97316', usage: 'Orange marker for tracking targets' },
      { name: 'target-suspicion', value: '#eab308', usage: 'Yellow marker for suspicion targets' },
      { name: 'target-resolved', value: '#22c55e', usage: 'Green marker for resolved targets' },
      { name: 'drone-friendly', value: '#15FFF6', usage: 'Cyan for friendly drones and drone icons' },
      { name: 'sensor-fov', value: 'rgba(59,130,246,0.15)', usage: 'FOV cone fill opacity' },
      { name: 'map-token-key', value: 'Mapbox GL access token', usage: 'Required for map tile rendering' },
    ],
    typography: [
      { name: 'marker-label', fontFamily: 'Heebo', fontSize: '11px', fontWeight: '500', lineHeight: '1', usage: 'Target marker popup text' },
    ],
    spacing: [
      { name: 'marker-size', value: '28px', usage: 'Default marker icon size' },
      { name: 'fov-radius', value: '1200m', usage: 'Default FOV cone radius (FOV_RADIUS_M)' },
    ],
  },

  flows: [
    {
      name: 'Target detection to engagement',
      type: 'happy',
      steps: [
        { actor: 'system', action: 'New target appears in targets array', result: 'Animated marker appears on map' },
        { actor: 'user', action: 'Clicks target marker', result: 'Popup shows target info, onMarkerClick fires' },
        { actor: 'user', action: 'Initiates missile launch from sidebar', result: 'Missile animation flies from launcher to target' },
        { actor: 'system', action: 'Missile reaches target', result: 'Explosion animation, onMissilePhaseChange fires with "exploded"' },
      ],
    },
  ],

  accessibility: {
    role: 'application',
    ariaAttributes: ['aria-label on context menu items'],
    keyboardNav: ['Mapbox GL default keyboard controls for pan/zoom', 'Tab to navigation controls'],
    focusManagement: 'Map canvas is focusable for keyboard navigation',
    screenReaderNotes: 'Map content is primarily visual; screen reader users need alternative tabular target list (ListOfSystems).',
  },

  tasks: [
    {
      id: 'TM-1',
      title: 'Extract Mapbox token to environment variable',
      priority: 'P0',
      estimate: 'S',
      description: 'The Mapbox access token is hardcoded in the file. Move to VITE_MAPBOX_TOKEN env var.',
      files: [
        { path: 'src/app/components/TacticalMap.tsx', action: 'modify', description: 'Read token from import.meta.env.VITE_MAPBOX_TOKEN' },
      ],
      acceptanceCriteria: [
        'Token is read from environment variable',
        'Fallback error shown if token is missing',
      ],
    },
    {
      id: 'TM-2',
      title: 'Add map loading/error states',
      priority: 'P1',
      estimate: 'M',
      description: 'Show loading spinner during tile load and error state if Mapbox fails.',
      files: [
        { path: 'src/app/components/TacticalMap.tsx', action: 'modify', description: 'Add onLoad/onError handlers to Map component' },
      ],
      acceptanceCriteria: [
        'Loading spinner shown during initial tile load',
        'Error message displayed if map fails to initialize',
        'Retry button available on error',
      ],
    },
    {
      id: 'TM-3',
      title: 'Extract sensor/camera assets to shared data layer',
      priority: 'P0',
      estimate: 'L',
      description: 'CAMERA_ASSETS, RADAR_ASSETS, DRONE_HIVE_ASSETS etc. are hardcoded. Move to a shared data source.',
      files: [
        { path: 'src/app/components/TacticalMap.tsx', action: 'modify', description: 'Import assets from shared data hook or API' },
      ],
      acceptanceCriteria: [
        'All asset arrays come from a shared data source',
        'Map reflects real-time asset positions',
        'DevicesPanel and TacticalMap share the same data',
      ],
    },
    {
      id: 'TM-4',
      title: 'Add keyboard accessibility for markers',
      priority: 'P2',
      estimate: 'M',
      description: 'Target markers need keyboard focus and activation support.',
      files: [
        { path: 'src/app/components/TacticalMap.tsx', action: 'modify', description: 'Add tabIndex and onKeyDown to marker elements' },
      ],
      acceptanceCriteria: [
        'Markers can be reached via Tab key',
        'Enter/Space triggers onMarkerClick',
        'Focus ring visible on focused marker',
      ],
    },
  ],

  hardcodedData: [
    { current: 'Mapbox access token (pk.eyJ1...)', replaceWith: 'import.meta.env.VITE_MAPBOX_TOKEN', location: 'TacticalMap.tsx line 17' },
    { current: 'CAMERA_ASSETS array', replaceWith: 'Shared data hook or API', location: 'TacticalMap.tsx lines 207-210' },
    { current: 'RADAR_ASSETS array', replaceWith: 'Shared data hook or API', location: 'TacticalMap.tsx lines 212-217' },
    { current: 'DRONE_HIVE_ASSETS array', replaceWith: 'Shared data hook or API', location: 'TacticalMap.tsx lines 219+' },
    { current: 'REGULUS_EFFECTORS array', replaceWith: 'Shared data hook or API', location: 'TacticalMap.tsx' },
    { current: 'LAUNCHER_ASSETS, LIDAR_ASSETS, WEAPON_SYSTEM_ASSETS', replaceWith: 'Shared data hook or API', location: 'TacticalMap.tsx' },
  ],

  notes: [
    'File is extremely large (~2100 lines) — strong candidate for decomposition into sub-components (MarkerLayer, FOVLayer, MissileLayer, etc.).',
    'Uses requestAnimationFrame loop for missile flight simulation with pulsed progress.',
    'Haversine distance and bearing functions are exported for reuse.',
    'Context menu uses Radix ContextMenu primitives.',
    'Map style is "mapbox://styles/mapbox/satellite-streets-v12".',
  ],
};
