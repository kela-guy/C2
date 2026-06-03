/**
 * Pure imperative applier — pushes a `MapSettings` snapshot into a live
 * `Cesium.Viewer`. Designed to be safely re-run on every state change AND
 * after Cesium-internal mutations (scene-mode flips, async terrain landing)
 * stomp values from underneath us.
 *
 * Idempotent: applying the same settings twice is a no-op other than the
 * terrain provider swap, which is internally cached so re-applying never
 * re-fetches a provider already in flight.
 */

import * as Cesium from 'cesium';

import type { MapSettings } from './cesiumPresets';

/**
 * Stable per-viewer caches so re-applies don't re-issue
 * `createWorldTerrainAsync` on every settings change, and so toggling
 * world terrain off and back on swaps to the existing provider instance
 * instead of re-fetching tiles. Keyed by viewer so dev hot-reloads with
 * a fresh viewer get fresh caches.
 */
const worldTerrainCache = new WeakMap<Cesium.Viewer, Cesium.TerrainProvider>();
const worldTerrainPending = new WeakMap<Cesium.Viewer, Promise<Cesium.TerrainProvider>>();
const ellipsoidTerrainCache = new WeakMap<Cesium.Viewer, Cesium.EllipsoidTerrainProvider>();

type Toggleable = { show?: boolean; enabled?: boolean };

const setShow = (obj: Toggleable | undefined, value: boolean) => {
  if (obj) obj.show = value;
};

export function applyCesiumSettings(viewer: Cesium.Viewer, settings: MapSettings): void {
  if (viewer.isDestroyed()) return;
  const scene = viewer.scene;

  applyTerrain(viewer, settings);
  applySky(scene, settings);
  applyFog(scene, settings);
  applyLighting(scene, settings);
  applyImagery(viewer, settings);
  applyCamera(viewer, settings);
  applySpace(viewer, settings);

  scene.requestRender();
}

/**
 * Hook for tests / future probes — exposed because the underlying caches
 * are file-local. Returns true once the world terrain has loaded for this
 * viewer; useful when an external observer needs to know whether a
 * subsequent terrain re-enable will be synchronous.
 */
export function hasResolvedWorldTerrain(viewer: Cesium.Viewer): boolean {
  return worldTerrainCache.has(viewer);
}

function applyTerrain(viewer: Cesium.Viewer, { terrain }: MapSettings): void {
  const scene = viewer.scene;
  scene.globe.maximumScreenSpaceError = terrain.maxScreenSpaceError;
  // verticalExaggeration was a globe property in older Cesium and a
  // scene property in current builds — assign through a loose shim so
  // a type-defs drift can't crash this hot path.
  (scene as unknown as { verticalExaggeration?: number }).verticalExaggeration = terrain.exaggeration;
  (scene as unknown as { verticalExaggerationRelativeHeight?: number }).verticalExaggerationRelativeHeight =
    terrain.relativeHeight;

  if (terrain.enabled) {
    const resolved = worldTerrainCache.get(viewer);
    if (resolved) {
      if (viewer.terrainProvider !== resolved) {
        viewer.terrainProvider = resolved;
      }
      return;
    }
    if (worldTerrainPending.has(viewer)) return;
    const pending = Cesium.createWorldTerrainAsync();
    worldTerrainPending.set(viewer, pending);
    pending
      .then((provider) => {
        worldTerrainCache.set(viewer, provider);
        if (viewer.isDestroyed()) return;
        viewer.terrainProvider = provider;
        viewer.scene.requestRender();
      })
      .catch((err) => {
        worldTerrainPending.delete(viewer);
        console.error('[cesium] terrain provider load failed:', err);
      });
  } else {
    let ellipsoid = ellipsoidTerrainCache.get(viewer);
    if (!ellipsoid) {
      ellipsoid = new Cesium.EllipsoidTerrainProvider();
      ellipsoidTerrainCache.set(viewer, ellipsoid);
    }
    if (viewer.terrainProvider !== ellipsoid) {
      viewer.terrainProvider = ellipsoid;
    }
  }
}

function applySky(scene: Cesium.Scene, { sky }: MapSettings): void {
  setShow(scene.skyAtmosphere as unknown as Toggleable | undefined, sky.atmosphere);
  setShow(scene.sun as unknown as Toggleable | undefined, sky.sun);
  setShow(scene.moon as unknown as Toggleable | undefined, sky.moon);
  scene.globe.showGroundAtmosphere = sky.groundAtmosphere;
  const g = scene.globe as unknown as {
    atmosphereLightIntensity?: number;
    atmosphereHueShift?: number;
    atmosphereSaturationShift?: number;
    atmosphereBrightnessShift?: number;
  };
  g.atmosphereLightIntensity = sky.lightIntensity;
  g.atmosphereHueShift = sky.hueShift;
  g.atmosphereSaturationShift = sky.saturationShift;
  g.atmosphereBrightnessShift = sky.brightnessShift;
}

function applyFog(scene: Cesium.Scene, { fog }: MapSettings): void {
  const f = scene.fog as unknown as
    | (Toggleable & { density?: number; minimumBrightness?: number })
    | undefined;
  if (!f) return;
  f.enabled = fog.enabled;
  f.density = fog.density;
  f.minimumBrightness = fog.minimumBrightness;
}

function applyLighting(scene: Cesium.Scene, { lighting }: MapSettings): void {
  scene.globe.enableLighting = lighting.globeLighting;
  (scene.globe as unknown as { dynamicAtmosphereLighting?: boolean }).dynamicAtmosphereLighting =
    lighting.dynamicAtmosphereLighting;
  const shadow = scene.shadowMap as unknown as
    | { enabled?: boolean; softShadows?: boolean; darkness?: number }
    | undefined;
  if (shadow) {
    shadow.enabled = lighting.shadows;
    shadow.softShadows = lighting.softShadows;
    shadow.darkness = lighting.shadowDarkness;
  }
}

function applyImagery(viewer: Cesium.Viewer, settings: MapSettings): void {
  const imagery = settings.imagery[settings.mapStyle];
  const layer = viewer.imageryLayers.length > 0 ? viewer.imageryLayers.get(0) : null;
  if (layer) {
    layer.brightness = imagery.brightness;
    layer.contrast = imagery.contrast;
    layer.saturation = imagery.saturation;
    layer.gamma = imagery.gamma;
    layer.hue = imagery.hue;
  }
  try {
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(imagery.globeBaseColor);
  } catch {
    // Invalid CSS string mid-edit; keep the previous baseColor.
  }
}

function applyCamera(viewer: Cesium.Viewer, { camera }: MapSettings): void {
  viewer.targetFrameRate = camera.targetFps;
  viewer.resolutionScale = camera.resolutionScale;
  const cam = viewer.scene.screenSpaceCameraController;
  cam.inertiaSpin = camera.inertiaSpin;
  cam.inertiaTranslate = camera.inertiaTranslate;
  cam.inertiaZoom = camera.inertiaZoom;
  viewer.scene.requestRenderMode = camera.requestRenderMode;
}

function applySpace(viewer: Cesium.Viewer, { space, sky }: MapSettings): void {
  const canvas = viewer.canvas;
  if (canvas && canvas.style.backgroundColor !== space.backgroundColor) {
    canvas.style.backgroundColor = space.backgroundColor;
  }
  // With atmosphere off Cesium paints `scene.backgroundColor` behind the
  // globe — without it, zooming out to orbit reads as empty void even
  // though the ellipsoid + imagery are still there.
  if (!sky.atmosphere) {
    try {
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString(space.backgroundColor);
    } catch {
      // invalid css mid-edit
    }
  } else {
    viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
  }
}
