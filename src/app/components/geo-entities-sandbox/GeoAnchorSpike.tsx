/**
 * Geo Anchor Spike — THROWAWAY prototype for plan 014.
 *
 * Answers the two Step-1 questions of `plans/014-spike-worldspace-geo-anchoring.md`:
 *
 *   1. Draw capture — pointer → geographic coordinates. Every click runs
 *      THREE pickers side by side and logs what each returned:
 *        - `scene.pickPosition`      (depth buffer; works on 3D Tiles + terrain)
 *        - `globe.pick(pickRay)`     (globe surface ray-cast; terrain/ellipsoid)
 *        - `camera.pickEllipsoid`    (bare WGS84 ellipsoid; always "works")
 *
 *   2. Rendering — every committed shape renders TWO ways simultaneously:
 *        (a) native Cesium entity clamped to ground (cyan),
 *        (b) screen-space SVG re-projected via
 *            `SceneTransforms.worldToWindowCoordinates` on `camera.changed`
 *            (orange, dashed).
 *      Instrumentation counts scene renders per second and SVG re-projection
 *      passes per second so the render-mode cost of approach (b) is
 *      observable, not guessed. The viewer runs `requestRenderMode: true`
 *      to match where `CesiumMap.tsx` is heading (see plan 001).
 *
 * Scene presets: flat raster (no token), Ion world terrain, Google
 * Photorealistic 3D Tiles (Ion asset 2275207) — so pick failure modes can
 * be compared across surfaces.
 *
 * DEV-only (route gated by `import.meta.env.DEV` in App.tsx). This file is
 * NOT production code and is expected to be deleted after the findings doc
 * is reviewed.
 */

import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

type ScenePreset = 'flat' | 'terrain' | 'photoreal';
type DrawKind = 'polygon' | 'polyline';

interface SpikeShape {
  id: string;
  kind: DrawKind;
  /** World-space vertices — the single source of truth for both renderers. */
  positions: Cesium.Cartesian3[];
}

interface PickLogEntry {
  id: number;
  text: string;
}

/** Judean-hills AO — real terrain relief so clamping/occlusion is observable. */
const HOME = { lon: 35.18, lat: 31.78, heightM: 6000 };

/** Deterministic demo shapes (same AO) so observation doesn't require hand-drawing. */
const SEED_POLYGON: Array<[number, number]> = [
  [35.16, 31.775],
  [35.185, 31.79],
  [35.2, 31.775],
  [35.185, 31.755],
];
const SEED_POLYLINE: Array<[number, number]> = [
  [35.15, 31.8],
  [35.17, 31.79],
  [35.19, 31.8],
  [35.21, 31.785],
];

function fmtCarto(cart: Cesium.Cartesian3 | undefined): string {
  if (!cart) return 'undefined';
  const c = Cesium.Cartographic.fromCartesian(cart);
  return `${Cesium.Math.toDegrees(c.latitude).toFixed(5)}, ${Cesium.Math.toDegrees(c.longitude).toFixed(5)}, h=${c.height.toFixed(1)}m`;
}

export default function GeoAnchorSpike() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [preset, setPreset] = useState<ScenePreset>('flat');
  const [drawKind, setDrawKind] = useState<DrawKind>('polygon');
  const [shapes, setShapes] = useState<SpikeShape[]>([]);
  // The camera.changed reprojection closure is wired once per viewer and
  // needs the live shape list — sync it into a ref outside render.
  const shapesRef = useRef<SpikeShape[]>([]);
  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);
  const [draftPositions, setDraftPositions] = useState<Cesium.Cartesian3[]>([]);

  const [pickLog, setPickLog] = useState<PickLogEntry[]>([]);
  const logSeq = useRef(0);

  // Screen-space projections of every shape (approach b). Keyed by shape id;
  // null screen point = worldToWindowCoordinates returned undefined.
  const [screenShapes, setScreenShapes] = useState<
    Array<{ id: string; kind: DrawKind; pts: Array<{ x: number; y: number } | null> }>
  >([]);

  // Instrumentation: renders/sec, camera.changed events/sec, SVG passes/sec.
  const renderCountRef = useRef(0);
  const cameraChangedCountRef = useRef(0);
  const svgPassCountRef = useRef(0);
  const [stats, setStats] = useState({ rps: 0, ccps: 0, svgps: 0 });

  const log = (text: string) => {
    setPickLog((prev) => [{ id: ++logSeq.current, text }, ...prev].slice(0, 14));
  };

  // ── Viewer lifecycle (rebuilt per scene preset) ───────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (ION_TOKEN) Cesium.Ion.defaultAccessToken = ION_TOKEN;

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayer: false as unknown as Cesium.ImageryLayer,
      // Match the direction production is taking (plan 001): render on demand.
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    });
    viewerRef.current = viewer;
    viewer.scene.mode = Cesium.SceneMode.SCENE3D;
    // Observation hook for the spike write-up (drive the camera from the
    // devtools console / CDP and read instrumentation). Throwaway.
    (window as unknown as Record<string, unknown>).__spikeViewer = viewer;

    // Fire camera.changed aggressively so the SVG overlay tracks tightly.
    viewer.camera.percentageChanged = 0.001;

    // Imagery / terrain / tiles per preset.
    if (preset === 'flat') {
      viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          maximumLevel: 19,
          credit: '© OpenStreetMap contributors © CARTO',
        }),
      );
      // Ellipsoid terrain (the Viewer default) — deliberately flat.
    } else {
      Cesium.IonImageryProvider.fromAssetId(2)
        .then((p) => {
          if (!viewer.isDestroyed()) viewer.imageryLayers.addImageryProvider(p);
        })
        .catch((err) => log(`ION IMAGERY FAILED: ${err}`));
      Cesium.createWorldTerrainAsync()
        .then((t) => {
          if (!viewer.isDestroyed()) {
            viewer.terrainProvider = t;
            viewer.scene.requestRender();
          }
        })
        .catch((err) => log(`WORLD TERRAIN FAILED: ${err}`));
    }
    if (preset === 'photoreal') {
      Cesium.Cesium3DTileset.fromIonAssetId(2275207)
        .then((tileset) => {
          if (viewer.isDestroyed()) return;
          viewer.scene.primitives.add(tileset);
          viewer.scene.requestRender();
          log('PHOTOREAL TILESET LOADED (Ion asset 2275207)');
        })
        .catch((err) => log(`PHOTOREAL TILESET FAILED: ${err}`));
    }

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(HOME.lon, HOME.lat - 0.06, HOME.heightM),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-40), roll: 0 },
    });

    // ── Instrumentation ──────────────────────────────────────────────────
    const removePostRender = viewer.scene.postRender.addEventListener(() => {
      renderCountRef.current++;
    });

    // ── Approach (b): re-project on camera.changed ───────────────────────
    const reproject = () => {
      cameraChangedCountRef.current++;
      svgPassCountRef.current++;
      const scene = viewer.scene;
      const next = shapesRef.current.map((s) => ({
        id: s.id,
        kind: s.kind,
        pts: s.positions.map((pos) => {
          const win = Cesium.SceneTransforms.worldToWindowCoordinates(scene, pos);
          return win ? { x: win.x, y: win.y } : null;
        }),
      }));
      setScreenShapes(next);
    };
    const removeCameraChanged = viewer.camera.changed.addEventListener(reproject);
    // Also once on mount so seeded shapes appear before any camera move.
    const kick = setTimeout(reproject, 500);

    // ── Draw capture: 3 pickers per click ────────────────────────────────
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const scene = viewer.scene;
      const supported = scene.pickPositionSupported;
      const pickPos = supported ? scene.pickPosition(e.position) : undefined;
      const ray = viewer.camera.getPickRay(e.position);
      const globePick = ray ? (scene.globe.pick(ray, scene) ?? undefined) : undefined;
      const ellipsoidPick =
        viewer.camera.pickEllipsoid(e.position, scene.globe.ellipsoid) ?? undefined;

      log(
        `CLICK @(${e.position.x.toFixed(0)},${e.position.y.toFixed(0)}) ` +
          `pickPosition[supported=${supported}]: ${fmtCarto(pickPos)} | ` +
          `globe.pick: ${fmtCarto(globePick)} | ` +
          `pickEllipsoid: ${fmtCarto(ellipsoidPick)}`,
      );

      const chosen = pickPos ?? globePick ?? ellipsoidPick;
      if (chosen) {
        setDraftPositions((prev) => [...prev, chosen]);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      clearTimeout(kick);
      removePostRender();
      removeCameraChanged();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
    // Rebuild the viewer wholesale on preset change — throwaway prototype.
  }, [preset]);

  // Stats ticker — reads instrumentation refs twice a second.
  useEffect(() => {
    const id = setInterval(() => {
      setStats({
        rps: renderCountRef.current * 2,
        ccps: cameraChangedCountRef.current * 2,
        svgps: svgPassCountRef.current * 2,
      });
      renderCountRef.current = 0;
      cameraChangedCountRef.current = 0;
      svgPassCountRef.current = 0;
    }, 500);
    return () => clearInterval(id);
  }, []);

  // ── Approach (a): native entities, rebuilt when shapes change ────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const added: Cesium.Entity[] = [];
    for (const s of shapes) {
      if (s.kind === 'polygon' && s.positions.length >= 3) {
        added.push(
          viewer.entities.add({
            id: `native-${s.id}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(s.positions),
              // No `height` → GroundPrimitive path → drapes on terrain AND
              // 3D Tiles (classificationType defaults to BOTH).
              material: Cesium.Color.CYAN.withAlpha(0.3),
              outline: false,
            },
          }),
        );
        // Ground-clamped outline (polygon.outline doesn't support ground
        // clamping; a clamped polyline ring is the standard workaround).
        added.push(
          viewer.entities.add({
            id: `native-outline-${s.id}`,
            polyline: {
              positions: [...s.positions, s.positions[0]],
              width: 3,
              material: Cesium.Color.CYAN,
              clampToGround: true,
            },
          }),
        );
      } else if (s.kind === 'polyline' && s.positions.length >= 2) {
        added.push(
          viewer.entities.add({
            id: `native-${s.id}`,
            polyline: {
              positions: s.positions,
              width: 4,
              material: Cesium.Color.CYAN,
              clampToGround: true,
            },
          }),
        );
      }
    }
    viewer.scene.requestRender();
    return () => {
      if (viewer.isDestroyed()) return;
      for (const e of added) viewer.entities.remove(e);
      viewer.scene.requestRender();
    };
  }, [shapes, preset]);

  // Draft preview as a native (non-clamped, cheap) polyline.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || draftPositions.length < 2) return;
    const e = viewer.entities.add({
      polyline: {
        positions: draftPositions,
        width: 2,
        material: Cesium.Color.YELLOW.withAlpha(0.8),
        clampToGround: true,
      },
    });
    viewer.scene.requestRender();
    return () => {
      if (!viewer.isDestroyed()) {
        viewer.entities.remove(e);
        viewer.scene.requestRender();
      }
    };
  }, [draftPositions]);

  const finishDraft = () => {
    const min = drawKind === 'polygon' ? 3 : 2;
    if (draftPositions.length >= min) {
      setShapes((prev) => [
        ...prev,
        {
          id: `${drawKind}-${Date.now().toString(36)}`,
          kind: drawKind,
          positions: draftPositions,
        },
      ]);
    }
    setDraftPositions([]);
  };

  const seedShapes = () => {
    const poly = SEED_POLYGON.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat));
    const line = SEED_POLYLINE.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat));
    setShapes([
      { id: 'seed-polygon', kind: 'polygon', positions: poly },
      { id: 'seed-polyline', kind: 'polyline', positions: line },
    ]);
    log('SEEDED demo polygon + polyline (ellipsoid-height vertices, h=0)');
  };

  const tiltLow = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(HOME.lon, HOME.lat - 0.045, 900),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-8), roll: 0 },
    });
    viewer.scene.requestRender();
  };

  const topDown = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(HOME.lon, HOME.lat - 0.06, HOME.heightM),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-40), roll: 0 },
    });
    viewer.scene.requestRender();
  };

  const btn: React.CSSProperties = {
    padding: '4px 10px',
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #475569',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  };
  const btnActive: React.CSSProperties = { ...btn, background: '#0e7490', borderColor: '#22d3ee' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Approach (b): screen-space SVG overlay, reprojected on camera.changed. */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        data-testid="svg-overlay"
      >
        {screenShapes.map((s) => {
          const visible = s.pts.filter((p): p is { x: number; y: number } => p !== null);
          if (visible.length < 2) return null;
          const d = visible.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return (
            <g key={s.id}>
              <path
                d={s.kind === 'polygon' ? `${d} Z` : d}
                fill={s.kind === 'polygon' ? 'rgba(251,146,60,0.18)' : 'none'}
                stroke="#fb923c"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
              {visible.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill="#fb923c" />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Control strip */}
      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 720 }}>
        {(['flat', 'terrain', 'photoreal'] as const).map((p) => (
          <button key={p} style={preset === p ? btnActive : btn} onClick={() => { setShapes([]); setDraftPositions([]); setScreenShapes([]); setPreset(p); }}>
            scene: {p}
          </button>
        ))}
        {(['polygon', 'polyline'] as const).map((k) => (
          <button key={k} style={drawKind === k ? btnActive : btn} onClick={() => setDrawKind(k)}>
            draw: {k}
          </button>
        ))}
        <button style={btn} onClick={finishDraft}>finish draft ({draftPositions.length} pts)</button>
        <button style={btn} onClick={seedShapes}>seed demo shapes</button>
        <button style={btn} onClick={tiltLow}>tilt low (-8°)</button>
        <button style={btn} onClick={topDown}>reset view (-40°)</button>
      </div>

      {/* Stats + legend */}
      <div
        data-testid="stats"
        style={{ position: 'absolute', top: 44, left: 8, color: '#e2e8f0', fontSize: 12, background: 'rgba(2,6,23,0.75)', padding: '6px 10px', borderRadius: 6 }}
      >
        renders/s: <span data-testid="rps">{stats.rps}</span> · camera.changed/s: <span data-testid="ccps">{stats.ccps}</span> · svg-passes/s: <span data-testid="svgps">{stats.svgps}</span>
        <br />
        <span style={{ color: '#22d3ee' }}>■ native clamped entity</span>{' '}
        <span style={{ color: '#fb923c' }}>■ SVG reprojection (camera.changed)</span>
        <br />
        token: {ION_TOKEN ? 'present' : 'MISSING'} · click map to run all 3 pickers
      </div>

      {/* Pick log */}
      <div
        data-testid="pick-log"
        style={{ position: 'absolute', bottom: 8, left: 8, right: 8, maxHeight: 190, overflow: 'auto', color: '#a5f3fc', fontSize: 11, background: 'rgba(2,6,23,0.8)', padding: '6px 10px', borderRadius: 6, whiteSpace: 'pre-wrap' }}
      >
        {pickLog.length === 0 ? 'pick log — click the map' : pickLog.map((l) => <div key={l.id}>{l.text}</div>)}
      </div>
    </div>
  );
}
