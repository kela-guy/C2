import type { CesiumSceneMode } from "@/primitives/CesiumMap";

export type MapViewMode = "current" | "monochromeTerrain" | "monochromeLight";

export interface PersistedCameraView {
  lat: number;
  lon: number;
  heightM: number;
  /**
   * Camera orientation, all in radians (Cesium's native unit — no
   * conversion drift across the persist round-trip). Optional so
   * pre-orientation payloads still hydrate cleanly with sensible
   * defaults (heading/roll = 0, pitch = straight down).
   */
  headingRad?: number;
  pitchRad?: number;
  rollRad?: number;
}

export function isMonochromeMapView(mode: MapViewMode): boolean {
  return mode === "monochromeTerrain" || mode === "monochromeLight";
}

export function isMapViewMode(value: unknown): value is MapViewMode {
  return (
    value === "current" ||
    value === "monochromeTerrain" ||
    value === "monochromeLight"
  );
}

export function isCesiumSceneMode(value: unknown): value is CesiumSceneMode {
  return value === "2D" || value === "2.5D" || value === "3D";
}

export const MAP_VIEW_MODE_STORAGE_KEY = "c2.dashboard.mapViewMode.v1";
export const SCENE_MODE_STORAGE_KEY = "c2.dashboard.sceneMode.v1";
export const CAMERA_VIEW_STORAGE_KEY = "c2.dashboard.cameraView.v1";

export function readPersistedMapViewMode(): MapViewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MAP_VIEW_MODE_STORAGE_KEY);
    return isMapViewMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistMapViewMode(mode: MapViewMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    /* quota / private mode — non-critical. */
  }
}

export function readPersistedSceneMode(): CesiumSceneMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SCENE_MODE_STORAGE_KEY);
    return isCesiumSceneMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistSceneMode(mode: CesiumSceneMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCENE_MODE_STORAGE_KEY, mode);
  } catch {
    /* quota / private mode — non-critical. */
  }
}

export function readPersistedCameraView(): PersistedCameraView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CAMERA_VIEW_STORAGE_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { lat, lon, heightM, headingRad, pitchRad, rollRad } =
      parsed as Partial<PersistedCameraView>;
    if (
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      typeof heightM !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !Number.isFinite(heightM) ||
      heightM <= 0 ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return null;
    }
    const out: PersistedCameraView = { lat, lon, heightM };
    if (typeof headingRad === "number" && Number.isFinite(headingRad)) {
      out.headingRad = headingRad;
    }
    if (typeof pitchRad === "number" && Number.isFinite(pitchRad)) {
      out.pitchRad = pitchRad;
    }
    if (typeof rollRad === "number" && Number.isFinite(rollRad)) {
      out.rollRad = rollRad;
    }
    return out;
  } catch {
    return null;
  }
}

export function persistCameraView(view: PersistedCameraView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CAMERA_VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    /* quota / private mode — non-critical. */
  }
}
