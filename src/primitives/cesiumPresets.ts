/**
 * Curated Cesium scene presets — shared between the map sandbox and the
 * production tactical map.
 *
 * `DEFAULT_MAP_SETTINGS` is the baseline look the dashboard renders on
 * boot. `FACTORY_PRESETS` exposes that baseline as three named looks
 * (Aerial / Mono dark / Mono light) keyed by `mapStyle` — the dashboard's
 * style picker resolves the operator's choice into the matching preset
 * and pushes it at `<CesiumMap>`. The sandbox lets the operator tune
 * those values live and copy the resulting block back into this file.
 */

import type { CesiumMapViewMode, CesiumSceneMode } from './CesiumMap';

export interface MapSettings {
  sceneMode: CesiumSceneMode;
  /**
   * Basemap imagery: aerial photography, dark monochrome (Carto), or
   * light monochrome (Carto). Light monochrome reads as a chart-style
   * tactical map; dark is the existing demo look.
   */
  mapStyle: CesiumMapViewMode;
  terrain: TerrainSettings;
  sky: SkySettings;
  fog: FogSettings;
  lighting: LightingSettings;
  /**
   * Per-style imagery tweaks. Selecting a `mapStyle` swaps the active
   * slice; sliders read and write `imagery[mapStyle]` so each basemap
   * keeps its own brightness/contrast/saturation/gamma/hue/baseColor.
   */
  imagery: Record<CesiumMapViewMode, ImagerySettings>;
  camera: CameraSettings;
  space: SpaceSettings;
}

export interface TerrainSettings {
  /** When false, falls back to `EllipsoidTerrainProvider` (flat globe). */
  enabled: boolean;
  /** `scene.verticalExaggeration`. 1 = real terrain heights. */
  exaggeration: number;
  /** `scene.verticalExaggerationRelativeHeight`. Pivot for exaggeration. */
  relativeHeight: number;
  /** `globe.maximumScreenSpaceError`. Lower = sharper terrain, more tiles. */
  maxScreenSpaceError: number;
}

export interface SkySettings {
  /** `scene.skyAtmosphere.show`. The bluish halo around the planet. */
  atmosphere: boolean;
  /** `globe.showGroundAtmosphere`. Soft glow on the ground at the horizon. */
  groundAtmosphere: boolean;
  /** `globe.atmosphereLightIntensity`. Cesium default 10. */
  lightIntensity: number;
  /** `globe.atmosphereHueShift`. -1..1. */
  hueShift: number;
  /** `globe.atmosphereSaturationShift`. -1..1. */
  saturationShift: number;
  /** `globe.atmosphereBrightnessShift`. -1..1. */
  brightnessShift: number;
  /** `scene.sun.show`. */
  sun: boolean;
  /** `scene.moon.show`. */
  moon: boolean;
}

export interface FogSettings {
  /** `scene.fog.enabled`. */
  enabled: boolean;
  /** `scene.fog.density`. Cesium default 2e-4. */
  density: number;
  /** `scene.fog.minimumBrightness`. 0..1. Cesium default 0.03. */
  minimumBrightness: number;
}

export interface LightingSettings {
  /** `globe.enableLighting`. Sun-driven day/night shading on terrain. */
  globeLighting: boolean;
  /** `globe.dynamicAtmosphereLighting`. Atmosphere follows the sun. */
  dynamicAtmosphereLighting: boolean;
  /** `scene.shadowMap.enabled`. */
  shadows: boolean;
  /** `scene.shadowMap.softShadows`. PCSS-style soft penumbra. */
  softShadows: boolean;
  /** `scene.shadowMap.darkness`. 0 = no shadow, 1 = fully black. */
  shadowDarkness: number;
}

export interface ImagerySettings {
  /** `imageryLayers.get(0).brightness`. 1 = neutral. */
  brightness: number;
  /** `imageryLayers.get(0).contrast`. 1 = neutral. */
  contrast: number;
  /** `imageryLayers.get(0).saturation`. 1 = neutral. */
  saturation: number;
  /** `imageryLayers.get(0).gamma`. 1 = neutral. */
  gamma: number;
  /** `imageryLayers.get(0).hue` in radians. 0 = neutral. */
  hue: number;
  /** `globe.baseColor`. CSS color string applied where no imagery loaded. */
  globeBaseColor: string;
}

export interface SpaceSettings {
  /**
   * Canvas backdrop colour visible wherever the scene doesn't paint —
   * i.e. above the horizon when `sky.atmosphere` is off, or the
   * everywhere-outside-the-globe void when looking from orbit.
   * Applied to the viewer's canvas via inline style.
   */
  backgroundColor: string;
}

export interface CameraSettings {
  /** `viewer.targetFrameRate`. */
  targetFps: number;
  /** `viewer.resolutionScale`. Multiplier on the canvas pixel density. */
  resolutionScale: number;
  /** `screenSpaceCameraController.inertiaSpin`. 0 = hard stop, ~0.9 = slippery. */
  inertiaSpin: number;
  /** `screenSpaceCameraController.inertiaTranslate`. */
  inertiaTranslate: number;
  /** `screenSpaceCameraController.inertiaZoom`. */
  inertiaZoom: number;
  /**
   * `scene.requestRenderMode`. When true Cesium only paints on
   * explicit `requestRender()` calls — huge idle-CPU saving but any
   * animation source not wired to `requestRender` will freeze.
   */
  requestRenderMode: boolean;
}

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  sceneMode: '3D',
  mapStyle: 'current',
  terrain: {
    enabled: true,
    exaggeration: 2.7,
    relativeHeight: -1250,
    maxScreenSpaceError: 1,
  },
  sky: {
    atmosphere: true,
    groundAtmosphere: true,
    lightIntensity: 10,
    hueShift: 0,
    saturationShift: 0.09,
    brightnessShift: 0,
    sun: false,
    moon: false,
  },
  fog: {
    enabled: false,
    density: 2e-4,
    minimumBrightness: 0.03,
  },
  lighting: {
    globeLighting: true,
    dynamicAtmosphereLighting: false,
    shadows: false,
    softShadows: true,
    shadowDarkness: 0.12,
  },
  imagery: {
    current: {
      brightness: 1,
      contrast: 1,
      saturation: 1,
      gamma: 1,
      hue: 0,
      globeBaseColor: '#000000',
    },
    monochromeTerrain: {
      brightness: 1.3,
      contrast: 1.04,
      saturation: 0.97,
      gamma: 1.25,
      hue: 0.008407,
      globeBaseColor: '#1a1a1a',
    },
    monochromeLight: {
      brightness: 1.26,
      contrast: 0.84,
      saturation: 0,
      gamma: 0.16,
      hue: 0,
      globeBaseColor: '#f5f5f5',
    },
  },
  camera: {
    targetFps: 30,
    resolutionScale: 1,
    inertiaSpin: 0.5,
    inertiaTranslate: 0.5,
    inertiaZoom: 0.5,
    requestRenderMode: true,
  },
  space: {
    backgroundColor: '#050505',
  },
};

/**
 * A named MapSettings snapshot. Factory presets ship with the bundle and
 * are immutable; user presets are persisted to `localStorage` (sandbox
 * only) and live under the `user-` id prefix.
 */
export interface MapPreset {
  id: string;
  label: string;
  settings: MapSettings;
}

export const FACTORY_PRESET_ID_PREFIX = 'factory-';

/**
 * Built-in presets surfaced in the panel alongside user-saved ones, and
 * resolved by the dashboard's `mapViewMode` picker. Derived from
 * `DEFAULT_MAP_SETTINGS` so the curated values live in exactly one
 * place — only `mapStyle` differs across the three.
 */
export const FACTORY_PRESETS: ReadonlyArray<MapPreset> = [
  {
    id: `${FACTORY_PRESET_ID_PREFIX}aerial`,
    label: 'Aerial',
    settings: { ...DEFAULT_MAP_SETTINGS, mapStyle: 'current' },
  },
  {
    id: `${FACTORY_PRESET_ID_PREFIX}mono-dark`,
    label: 'Mono dark',
    settings: {
      ...DEFAULT_MAP_SETTINGS,
      mapStyle: 'monochromeTerrain',
      sky: {
        ...DEFAULT_MAP_SETTINGS.sky,
        atmosphere: false,
        groundAtmosphere: false,
      },
      space: {
        backgroundColor: '#000000',
      },
      lighting: {
        ...DEFAULT_MAP_SETTINGS.lighting,
        globeLighting: false,
      },
    },
  },
  {
    id: `${FACTORY_PRESET_ID_PREFIX}mono-light`,
    label: 'Mono light',
    settings: { ...DEFAULT_MAP_SETTINGS, mapStyle: 'monochromeLight' },
  },
];

/**
 * Resolve the curated preset settings for a given map style. Falls back
 * to `DEFAULT_MAP_SETTINGS` if no factory preset matches — meaning a
 * future style added to `CesiumMapViewMode` without a preset entry
 * still gets a usable scene.
 */
export function presetForMapStyle(style: CesiumMapViewMode): MapSettings {
  const found = FACTORY_PRESETS.find((p) => p.settings.mapStyle === style);
  return found ? found.settings : DEFAULT_MAP_SETTINGS;
}
