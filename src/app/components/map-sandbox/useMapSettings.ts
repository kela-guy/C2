/**
 * Picker state for the map sandbox.
 *
 * State is sandbox-local — no Context, no global store. Persists to
 * `localStorage` so a refresh doesn't blow away the operator's tuning.
 * Schema-versioned key so a future settings shape change skips stale data.
 *
 * Mirrors the shape and lifecycle of `theme-sandbox/useThemeState.ts`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CesiumMapViewMode, CesiumSceneMode } from '@/primitives/CesiumMap';
import {
  DEFAULT_MAP_SETTINGS,
  FACTORY_PRESETS,
  FACTORY_PRESET_ID_PREFIX,
  type ImagerySettings,
  type MapPreset,
  type MapSettings,
} from './mapSettingsTypes';

export type { MapPreset } from './mapSettingsTypes';

const MAP_STYLES: ReadonlyArray<CesiumMapViewMode> = [
  'current',
  'monochromeTerrain',
  'monochromeLight',
];

const STORAGE_KEY = 'map-sandbox-v1';
const USER_PRESET_ID_PREFIX = 'user-';
const USER_PRESET_LABEL_MAX = 32;

interface PersistedState {
  settings: MapSettings;
  userPresets: MapPreset[];
  activePresetId: string | null;
}

const INITIAL_STATE: PersistedState = {
  settings: DEFAULT_MAP_SETTINGS,
  userPresets: [],
  activePresetId: null,
};

function sanitizeLabel(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, USER_PRESET_LABEL_MAX);
}

function hydrateSettings(raw: unknown): MapSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_MAP_SETTINGS;
  const r = raw as Partial<MapSettings>;
  return {
    sceneMode: hydrateSceneMode(r.sceneMode),
    mapStyle: hydrateMapStyle(r.mapStyle),
    terrain: { ...DEFAULT_MAP_SETTINGS.terrain, ...(r.terrain ?? {}) },
    sky: { ...DEFAULT_MAP_SETTINGS.sky, ...(r.sky ?? {}) },
    fog: { ...DEFAULT_MAP_SETTINGS.fog, ...(r.fog ?? {}) },
    lighting: { ...DEFAULT_MAP_SETTINGS.lighting, ...(r.lighting ?? {}) },
    imagery: hydrateImagery(r.imagery),
    camera: { ...DEFAULT_MAP_SETTINGS.camera, ...(r.camera ?? {}) },
    space: { ...DEFAULT_MAP_SETTINGS.space, ...(r.space ?? {}) },
  };
}

/**
 * v1 stored a flat `imagery: ImagerySettings`. v2 keys it by `mapStyle`.
 * Old payloads get promoted into `current` so existing user tuning isn't
 * silently dropped on first load after the upgrade.
 */
function hydrateImagery(raw: unknown): MapSettings['imagery'] {
  const defaults = DEFAULT_MAP_SETTINGS.imagery;
  if (!raw || typeof raw !== 'object') return defaults;
  const r = raw as Record<string, unknown>;
  const looksFlat = typeof r.brightness === 'number';
  if (looksFlat) {
    return {
      ...defaults,
      current: { ...defaults.current, ...(r as Partial<ImagerySettings>) },
    };
  }
  const out = { ...defaults };
  for (const style of MAP_STYLES) {
    const slice = r[style];
    if (slice && typeof slice === 'object') {
      out[style] = { ...defaults[style], ...(slice as Partial<ImagerySettings>) };
    }
  }
  return out;
}

function hydrateSceneMode(raw: unknown): CesiumSceneMode {
  if (raw === '2D' || raw === '2.5D' || raw === '3D') return raw;
  return DEFAULT_MAP_SETTINGS.sceneMode;
}

function hydrateMapStyle(raw: unknown): CesiumMapViewMode {
  if (raw === 'current' || raw === 'monochromeTerrain' || raw === 'monochromeLight') return raw;
  return DEFAULT_MAP_SETTINGS.mapStyle;
}

function hydrateUserPresets(raw: unknown): MapPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: MapPreset[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id : '';
    const label = sanitizeLabel(e.label);
    if (!id || !label) continue;
    out.push({ id, label, settings: hydrateSettings(e.settings) });
  }
  return out;
}

function readPersisted(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      settings: hydrateSettings(parsed.settings),
      userPresets: hydrateUserPresets(parsed.userPresets),
      activePresetId:
        typeof parsed.activePresetId === 'string' ? parsed.activePresetId : null,
    };
  } catch {
    return null;
  }
}

function persist(state: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — best-effort.
  }
}

export interface MapSettingsPatch {
  sceneMode?: CesiumSceneMode;
  mapStyle?: CesiumMapViewMode;
  terrain?: Partial<MapSettings['terrain']>;
  sky?: Partial<MapSettings['sky']>;
  fog?: Partial<MapSettings['fog']>;
  lighting?: Partial<MapSettings['lighting']>;
  /**
   * Imagery patches always target the active `mapStyle` slice — the panel
   * never has to think about which style it's editing. If `mapStyle` is
   * also patched in the same call, the imagery patch lands on the new
   * style (i.e. the resolved post-patch one).
   */
  imagery?: Partial<ImagerySettings>;
  camera?: Partial<MapSettings['camera']>;
  space?: Partial<MapSettings['space']>;
}

export interface UseMapSettingsApi {
  settings: MapSettings;
  factoryPresets: ReadonlyArray<MapPreset>;
  userPresets: MapPreset[];
  activePresetId: string | null;
  patch: (patch: MapSettingsPatch) => void;
  reset: () => void;
  saveCurrentAsPreset: (label: string) => MapPreset | null;
  selectPreset: (preset: MapPreset) => void;
  deletePreset: (id: string) => void;
}

export function useMapSettings(): UseMapSettingsApi {
  const [state, setState] = useState<PersistedState>(
    () => readPersisted() ?? INITIAL_STATE,
  );

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    persist(state);
  }, [state]);

  const patch = useCallback((p: MapSettingsPatch) => {
    setState((prev) => {
      const mapStyle = p.mapStyle ?? prev.settings.mapStyle;
      const imagery = p.imagery
        ? {
            ...prev.settings.imagery,
            [mapStyle]: { ...prev.settings.imagery[mapStyle], ...p.imagery },
          }
        : prev.settings.imagery;
      const next: MapSettings = {
        sceneMode: p.sceneMode ?? prev.settings.sceneMode,
        mapStyle,
        terrain: p.terrain ? { ...prev.settings.terrain, ...p.terrain } : prev.settings.terrain,
        sky: p.sky ? { ...prev.settings.sky, ...p.sky } : prev.settings.sky,
        fog: p.fog ? { ...prev.settings.fog, ...p.fog } : prev.settings.fog,
        lighting: p.lighting
          ? { ...prev.settings.lighting, ...p.lighting }
          : prev.settings.lighting,
        imagery,
        camera: p.camera ? { ...prev.settings.camera, ...p.camera } : prev.settings.camera,
        space: p.space ? { ...prev.settings.space, ...p.space } : prev.settings.space,
      };
      return { ...prev, settings: next, activePresetId: null };
    });
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      settings: DEFAULT_MAP_SETTINGS,
      userPresets: prev.userPresets,
      activePresetId: null,
    }));
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;

  const saveCurrentAsPreset = useCallback((rawLabel: string): MapPreset | null => {
    const label = sanitizeLabel(rawLabel);
    if (!label) return null;
    const current = stateRef.current;
    const preset: MapPreset = {
      id: `${USER_PRESET_ID_PREFIX}${randomId()}`,
      label,
      settings: current.settings,
    };
    setState((prev) => ({
      ...prev,
      userPresets: [...prev.userPresets, preset],
      activePresetId: preset.id,
    }));
    return preset;
  }, []);

  const selectPreset = useCallback((preset: MapPreset) => {
    setState((prev) => ({
      ...prev,
      settings: preset.settings,
      activePresetId: preset.id,
    }));
  }, []);

  const deletePreset = useCallback((id: string) => {
    if (id.startsWith(FACTORY_PRESET_ID_PREFIX)) return;
    setState((prev) => ({
      ...prev,
      userPresets: prev.userPresets.filter((p) => p.id !== id),
      activePresetId: prev.activePresetId === id ? null : prev.activePresetId,
    }));
  }, []);

  return useMemo(
    () => ({
      settings: state.settings,
      factoryPresets: FACTORY_PRESETS,
      userPresets: state.userPresets,
      activePresetId: state.activePresetId,
      patch,
      reset,
      saveCurrentAsPreset,
      selectPreset,
      deletePreset,
    }),
    [
      state.settings,
      state.userPresets,
      state.activePresetId,
      patch,
      reset,
      saveCurrentAsPreset,
      selectPreset,
      deletePreset,
    ],
  );
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
