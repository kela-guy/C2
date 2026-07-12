/**
 * Cesium map surface for the onboarding concept-video scene. Renders Google
 * Photorealistic 3D Tiles (falling back to the dark raster map without a
 * token) plus:
 *   - placed assets, drawn with the production friendly marker (MapMarker +
 *     tactical glyph) with a "deployed" drop-in moment (ground ripple +
 *     rising light beacon),
 *   - an always-on animated coverage volume per asset: a glowing 3D energy
 *     wall along the coverage perimeter (cyan), a rotating PPI sweep for
 *     radars, and an edge-glow FOV curtain for directional cameras,
 *   - threat-axis wedges (red) for the axes passed in `axisIds`, with an
 *     extruded "threat corridor" treatment + incoming particle flows while
 *     `threatEmphasis` is set (the cinematic intro).
 *
 * Placement is interactive: drag a dock chip onto the map (react-dnd →
 * screen pick → lat/lon), or drag a placed marker to reposition it. Built on
 * the `CesiumMap` primitive's additive `pickerRef` / `onGroundClick` hooks.
 */

import { useCallback, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDrop } from 'react-dnd';
import { useStrings } from '@/lib/intl';
import { MapMarker, resolveMarkerStyle } from '@/primitives';
import { MARKER_HEX } from '@/primitives/accentHex';
import { X } from '@/lib/icons/central';
import { destination } from '@/app/lib/mapGeo';
import {
  CesiumMap,
  type CesiumHtmlMarker,
  type CesiumMapFlyTo,
  type CesiumMapOrbit,
  type CesiumPolyline,
} from '@/primitives/CesiumMap';
import { cn } from '../ui/utils';
import { ASSET_VISUAL } from './assetCatalog';
import {
  AOI_RADIUS_M,
  CAPABILITIES,
  SITE,
  SITE_HERO_HEADING_DEG,
  THREAT_AXES,
  type AssetKind,
  type Placement,
} from './coverageModel';
import { ONBOARDING_DND_TYPE, type OnboardingDragItem } from './dnd';

const ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

/**
 * Single restrained coverage colour for every friendly asset — the walls
 * should read as ONE fused shield, not a rainbow. Red stays reserved for
 * threat wedges.
 */
const COVERAGE_HEX = MARKER_HEX.coverageCyan;

/** Duration of the energy-wall rise animation on placement. */
const WALL_RISE_MS = 700;

/**
 * Height of the extruded red threat-corridor volumes, in meters. Kept low so
 * from the near-ground camera it reads as a menacing band rising off the
 * terrain rather than a giant wall that blocks the view.
 */
const THREAT_VOLUME_HEIGHT_M = 160;

/**
 * Energy-wall height for a coverage ring of the given radius. Proportional so
 * small rings read as intimate bubbles and the big effector rings still feel
 * like distant ramparts, clamped so nothing dwarfs the low hero camera.
 */
function wallHeightFor(radiusM: number): number {
  return Math.min(220, Math.max(80, radiusM * 0.12));
}

type Picker = ((clientX: number, clientY: number) => { lat: number; lon: number } | null) | null;

interface PlacementMarkerProps {
  placement: Placement;
  selected: boolean;
  draggable: boolean;
  pickerRef: React.MutableRefObject<Picker>;
  onSelect: (id: string) => void;
  onMove: (id: string, lat: number, lon: number) => void;
  onRemove: (id: string) => void;
}

function PlacementMarker({
  placement,
  selected,
  draggable,
  pickerRef,
  onSelect,
  onMove,
  onRemove,
}: PlacementMarkerProps) {
  const t = useStrings();
  const visual = ASSET_VISUAL[placement.kind];
  const MapIcon = visual.mapIcon;
  const prefersReducedMotion = useReducedMotion();
  const draggingRef = useRef(false);
  const rafRef = useRef<number | undefined>(undefined);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    onSelect(placement.id);
    if (!draggable) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    pendingRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = undefined;
        const p = pendingRef.current;
        if (!p) return;
        const ll = pickerRef.current?.(p.x, p.y);
        if (ll) onMove(placement.id, ll.lat, ll.lon);
      });
    }
  };

  const endDrag = () => {
    draggingRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  };

  const style = resolveMarkerStyle(selected ? 'selected' : 'default', 'friendly');

  return (
    <motion.div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 26 }
      }
      className={cn(
        'relative inline-flex',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
      )}
    >
      {/* "Deployed" feedback — plays once on mount. A thin ground ripple
          expands outward while a brief vertical light beacon rises and fades.
          Professional confirmation, not a bouncing cartoon. */}
      {!prefersReducedMotion && (
        <>
          <motion.span
            className="pointer-events-none absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/70"
            initial={{ scale: 0.4, opacity: 0.8 }}
            animate={{ scale: 3.4, opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            aria-hidden="true"
          />
          <motion.span
            className="pointer-events-none absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/50"
            initial={{ scale: 0.4, opacity: 0.6 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.22, ease: 'easeOut' }}
            aria-hidden="true"
          />
          <motion.span
            className="pointer-events-none absolute bottom-1/2 left-1/2 h-20 w-[3px] origin-bottom -translate-x-1/2 rounded-full"
            style={{
              background:
                'linear-gradient(to top, rgba(103,232,249,0.9), rgba(103,232,249,0))',
              filter: 'drop-shadow(0 0 6px rgba(103,232,249,0.8))',
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: [0, 1, 1], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.0, ease: 'easeOut', times: [0, 0.35, 1] }}
            aria-hidden="true"
          />
        </>
      )}
      <MapMarker
        icon={<MapIcon outlined />}
        style={style}
        surfaceSize={36}
        ringSize={28}
        label={t.onboarding.assetKinds[placement.kind]}
        showLabel={selected}
        pulse={selected}
      />
      {selected && draggable && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(placement.id);
          }}
          aria-label={t.onboarding.explain.remove}
          className="absolute -end-2 -top-2 z-10 flex size-5 items-center justify-center rounded-full bg-slate-900/90 text-slate-300 ring-1 ring-white/25 transition-colors hover:bg-red-500/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring"
        >
          <X size={11} aria-hidden="true" />
        </button>
      )}
    </motion.div>
  );
}

export interface OnboardingMapProps {
  placements: Placement[];
  /** Threat-axis ids drawn as red wedges (open approaches). */
  axisIds: string[];
  /**
   * Cinematic threat treatment: extruded corridor volumes + incoming particle
   * flows on the wedge axes. On for the intro beat, off while building.
   */
  threatEmphasis: boolean;
  selectedId: string | null;
  draggable: boolean;
  onSelect: (id: string | null) => void;
  onPlace: (kind: AssetKind, lat: number, lon: number) => void;
  onMove: (id: string, lat: number, lon: number) => void;
  onRemove: (id: string) => void;
  flyTo: CesiumMapFlyTo | null;
  /** Cinematic orbit (the intro beat). Null releases the camera. */
  orbit: CesiumMapOrbit | null;
}

export function OnboardingMap({
  placements,
  axisIds,
  threatEmphasis,
  selectedId,
  draggable,
  onSelect,
  onPlace,
  onMove,
  onRemove,
  flyTo,
  orbit,
}: OnboardingMapProps) {
  const pickerRef = useRef<Picker>(null);

  const [, dropRef] = useDrop<OnboardingDragItem, unknown, unknown>(
    () => ({
      accept: ONBOARDING_DND_TYPE,
      drop: (item, monitor) => {
        const offset = monitor.getClientOffset();
        if (!offset) return;
        const ll = pickerRef.current?.(offset.x, offset.y);
        if (ll) onPlace(item.kind, ll.lat, ll.lon);
      },
    }),
    [onPlace],
  );

  const htmlMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    const markers: CesiumHtmlMarker[] = [];

    // Base-centre anchor — the one element always present; orients the view.
    markers.push({
      id: 'base-center',
      lat: SITE.lat,
      lon: SITE.lon,
      zIndex: 5,
      content: (
        <span className="block size-2.5 rounded-full bg-white/90 ring-4 ring-white/15" aria-hidden="true" />
      ),
    });

    // Threat-axis wedges (red) for the still-open approaches. With
    // `threatEmphasis`, the wedges extrude into low corridor volumes.
    for (const axis of THREAT_AXES) {
      if (!axisIds.includes(axis.id)) continue;
      markers.push({
        id: `axis-${axis.id}`,
        lat: SITE.lat,
        lon: SITE.lon,
        zIndex: 1,
        content: <span className="block size-0" aria-hidden="true" />,
        fov: {
          rangeM: AOI_RADIUS_M,
          bearingDeg: axis.bearingDeg,
          widthDeg: 14,
          color: '#ef4444',
          opacity: threatEmphasis ? 0.22 : 0.14,
          ...(threatEmphasis ? { extrudedHeightM: THREAT_VOLUME_HEIGHT_M } : {}),
        },
      });
    }

    // Placed assets, drawn with the production friendly marker. Every asset
    // carries its coverage volume ALWAYS — the walls are the point.
    for (const p of placements) {
      const cap = CAPABILITIES[p.kind];
      const visual = ASSET_VISUAL[p.kind];
      const isSelected = selectedId === p.id;
      const marker: CesiumHtmlMarker = {
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        zIndex: isSelected ? 40 : 20,
        content: (
          <PlacementMarker
            placement={p}
            selected={isSelected}
            draggable={draggable}
            pickerRef={pickerRef}
            onSelect={onSelect}
            onMove={onMove}
            onRemove={onRemove}
          />
        ),
      };

      // Directional cameras keep the FOV cone + edge-glow curtain; every
      // omnidirectional / effector asset gets the circular energy wall at its
      // effective range. Radars additionally spin a PPI sweep.
      const isDirectional =
        visual.shape === 'cone' && !!cap.detect && cap.detect.fovDeg < 360;
      if (isDirectional && cap.detect) {
        marker.fov = {
          rangeM: cap.detect.rangeM,
          bearingDeg: p.bearingDeg ?? 0,
          widthDeg: cap.detect.fovDeg,
          color: COVERAGE_HEX,
          opacity: isSelected ? 0.14 : 0.08,
          wall: true,
          wallHeightM: wallHeightFor(cap.detect.rangeM),
          wallRiseMs: WALL_RISE_MS,
        };
      } else {
        const radiusM = cap.mitigate?.rangeM ?? cap.detect?.rangeM;
        if (radiusM != null) {
          marker.coverageWall = {
            radiusM,
            heightM: wallHeightFor(radiusM),
            color: COVERAGE_HEX,
            riseMs: WALL_RISE_MS,
          };
          // Ground footprint ring only for the focused asset — keeps the
          // base map clean while making the tapped asset's reach unambiguous.
          if (isSelected) {
            marker.coverageRadiusM = radiusM;
            marker.coverageColor = COVERAGE_HEX;
          }
        }
        if (p.kind === 'radar' && cap.detect) {
          marker.radarSweep = { rangeM: cap.detect.rangeM, color: COVERAGE_HEX, periodSec: 4 };
        }
      }

      markers.push(marker);
    }

    return markers;
  }, [placements, axisIds, threatEmphasis, selectedId, draggable, onSelect, onMove, onRemove]);

  // Incoming approach-flow arrows during the intro: a red dashed line per
  // open axis, running from the AOI perimeter inward so the particles read
  // as an "incoming route".
  const prefersReducedMotion = useReducedMotion();
  const polylines = useMemo<CesiumPolyline[]>(() => {
    if (!threatEmphasis) return [];
    return THREAT_AXES.filter((axis) => axisIds.includes(axis.id)).map((axis) => {
      const [periLon, periLat] = destination(SITE.lat, SITE.lon, AOI_RADIUS_M, axis.bearingDeg);
      return {
        id: `flow-${axis.id}`,
        // Perimeter -> SITE so particles flow toward the base.
        points: [
          { lat: periLat, lon: periLon },
          { lat: SITE.lat, lon: SITE.lon },
        ],
        color: '#ef4444',
        width: 2,
        dashed: true,
        zIndex: 2,
        ...(prefersReducedMotion ? {} : { particles: { count: 4, speed: 0.35 } }),
      };
    });
  }, [threatEmphasis, axisIds, prefersReducedMotion]);

  const handleGroundClick = useCallback(() => onSelect(null), [onSelect]);

  return (
    <div ref={dropRef} className="absolute inset-0">
      <CesiumMap
        ionToken={ION_TOKEN}
        photorealisticTiles={!!ION_TOKEN}
        darkMonochromeMap={!ION_TOKEN}
        sceneMode="3D"
        initialView={{
          lat: SITE.lat,
          lon: SITE.lon,
          heightM: 700,
          pitchDeg: -30,
          headingDeg: SITE_HERO_HEADING_DEG,
          terrainRelative: true,
        }}
        htmlMarkers={htmlMarkers}
        polylines={polylines}
        flyTo={flyTo}
        orbit={orbit}
        onGroundClick={draggable ? handleGroundClick : undefined}
        pickerRef={pickerRef}
        className="h-full w-full"
      />
    </div>
  );
}
