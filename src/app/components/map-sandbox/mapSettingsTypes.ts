/**
 * Sandbox-only re-export layer over `src/primitives/cesiumPresets`.
 *
 * Types, defaults, and factory presets are shared with the production
 * tactical map — the curated MapSettings block lives in one place,
 * not duplicated. This file additionally publishes `KNOB_RANGES`,
 * which is panel-UI metadata (slider clamps + display hints) and has
 * no business in the primitive.
 */

export type {
  MapSettings,
  TerrainSettings,
  SkySettings,
  FogSettings,
  LightingSettings,
  ImagerySettings,
  SpaceSettings,
  CameraSettings,
  MapPreset,
} from '@/primitives/cesiumPresets';

export {
  DEFAULT_MAP_SETTINGS,
  FACTORY_PRESETS,
  FACTORY_PRESET_ID_PREFIX,
  presetForMapStyle,
} from '@/primitives/cesiumPresets';

/**
 * Per-knob clamp ranges + display formatting hints for the panel.
 * Centralised so the slider rails and the code-export string both pull
 * from a single source of truth.
 */
export interface KnobRange {
  min: number;
  max: number;
  step: number;
  /** Log-scale slider (e.g. fog density spans 6 orders of magnitude). */
  log?: boolean;
  /** Suffix shown next to the numeric badge. */
  unit?: string;
  /** Number of decimal places in the badge. */
  decimals?: number;
}

export const KNOB_RANGES = {
  'terrain.exaggeration': { min: 0, max: 10, step: 0.1, unit: '×', decimals: 1 },
  'terrain.relativeHeight': { min: -2000, max: 5000, step: 50, unit: 'm', decimals: 0 },
  'terrain.maxScreenSpaceError': { min: 1, max: 16, step: 0.5, decimals: 1 },
  'sky.lightIntensity': { min: 0, max: 50, step: 0.5, decimals: 1 },
  'sky.hueShift': { min: -1, max: 1, step: 0.01, decimals: 2 },
  'sky.saturationShift': { min: -1, max: 1, step: 0.01, decimals: 2 },
  'sky.brightnessShift': { min: -1, max: 1, step: 0.01, decimals: 2 },
  'fog.density': { min: 1e-6, max: 1e-2, step: 0.01, log: true, decimals: 6 },
  'fog.minimumBrightness': { min: 0, max: 1, step: 0.01, decimals: 2 },
  'lighting.shadowDarkness': { min: 0, max: 1, step: 0.01, decimals: 2 },
  'imagery.brightness': { min: 0, max: 2, step: 0.01, decimals: 2 },
  'imagery.contrast': { min: 0, max: 2, step: 0.01, decimals: 2 },
  'imagery.saturation': { min: 0, max: 2, step: 0.01, decimals: 2 },
  'imagery.gamma': { min: 0.1, max: 3, step: 0.01, decimals: 2 },
  'imagery.hue': { min: -Math.PI, max: Math.PI, step: 0.01, decimals: 2 },
  'camera.targetFps': { min: 15, max: 60, step: 1, unit: 'fps', decimals: 0 },
  'camera.resolutionScale': { min: 0.5, max: 2, step: 0.05, unit: '×', decimals: 2 },
  'camera.inertiaSpin': { min: 0, max: 1, step: 0.01, decimals: 2 },
  'camera.inertiaTranslate': { min: 0, max: 1, step: 0.01, decimals: 2 },
  'camera.inertiaZoom': { min: 0, max: 1, step: 0.01, decimals: 2 },
} as const satisfies Record<string, KnobRange>;

export type KnobKey = keyof typeof KNOB_RANGES;
