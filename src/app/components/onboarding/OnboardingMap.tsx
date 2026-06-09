/**
 * Cesium map surface for the onboarding lab. Renders the live 3D terrain plus:
 *   - placed assets, drawn with the production friendly marker (MapMarker +
 *     tactical glyph) so the onboarding map matches the real C2 map,
 *   - threat-axis wedges (red) for the axes passed in `axisIds`,
 *   - threat zones (the "why" shown before any assets — sparse red risk markers),
 *   - coverage-gap voids that pulse until covered.
 *
 * Placement is interactive: drag a tray chip onto the map (react-dnd → screen
 * pick → lat/lon), or drag a placed marker to reposition it. Built on the
 * `CesiumMap` primitive's additive `pickerRef` / `onGroundClick` hooks.
 *
 * Note: the Cesium html-marker layer mounts/unmounts content directly, so
 * exit animations are not available — markers animate on entrance only (with a
 * stagger for the suggestion reveal), and threat markers simply unmount when
 * the suggested assets take over.
 */

import { useCallback, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDrop } from 'react-dnd';
import { useStrings } from '@/lib/intl';
import { MapMarker, resolveMarkerStyle } from '@/primitives';
import { WarningTriangle } from '@/lib/icons/central';
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
  type CoverageGap,
  type Placement,
  type ThreatZone,
} from './coverageModel';
import { ONBOARDING_DND_TYPE, type OnboardingDragItem } from './dnd';

const ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

/**
 * Height of the extruded red threat-corridor volumes, in meters. Kept low so
 * from the near-ground camera it reads as a menacing band rising off the
 * terrain rather than a giant wall that blocks the view.
 */
const THREAT_VOLUME_HEIGHT_M = 160;
/** Vertical scale of the protective "shield" dome relative to its radius. */
const COVERAGE_DOME_RATIO = 0.4;

type Picker = ((clientX: number, clientY: number) => { lat: number; lon: number } | null) | null;

interface PlacementMarkerProps {
  placement: Placement;
  selected: boolean;
  draggable: boolean;
  /** Reveal-order index — staggers the suggestion entrance. */
  index: number;
  pickerRef: React.MutableRefObject<Picker>;
  onSelect: (id: string) => void;
  onMove: (id: string, lat: number, lon: number) => void;
}

function PlacementMarker({
  placement,
  selected,
  draggable,
  index,
  pickerRef,
  onSelect,
  onMove,
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
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 28, delay: Math.min(index, 12) * 0.05 }
      }
      className={cn('relative inline-flex', draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')}
    >
      <MapMarker
        icon={<MapIcon outlined />}
        style={style}
        surfaceSize={36}
        ringSize={28}
        label={t.onboarding.assetKinds[placement.kind]}
        showLabel={selected}
        pulse={selected}
      />
    </motion.div>
  );
}

function ThreatZoneMarker({ severity }: { severity: ThreatZone['severity'] }) {
  const prefersReducedMotion = useReducedMotion();
  const high = severity === 'high';
  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
      aria-hidden="true"
    >
      {!prefersReducedMotion && (
        <motion.span
          className={cn('absolute rounded-full', high ? 'bg-red-500/30' : 'bg-amber-400/25')}
          style={{ width: 26, height: 26 }}
          animate={{ scale: [1, 2.3], opacity: [0.55, 0] }}
          transition={{ duration: 1.8, ease: 'easeOut', repeat: Infinity }}
        />
      )}
      <span
        className={cn(
          'relative flex size-6 items-center justify-center rounded-full ring-2',
          high ? 'bg-red-500/90 ring-red-300/50' : 'bg-amber-400/90 ring-amber-200/50',
        )}
      >
        <WarningTriangle size={13} className="text-white" aria-hidden="true" />
      </span>
    </motion.div>
  );
}

function GapDot({ kind }: { kind: CoverageGap['kind'] }) {
  const prefersReducedMotion = useReducedMotion();
  const blind = kind === 'blind';
  return (
    <motion.span
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.5 }}
      animate={
        prefersReducedMotion
          ? { opacity: 1, scale: 1 }
          : { opacity: [0.55, 1, 0.55], scale: 1 }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { opacity: { duration: 2, ease: 'easeInOut', repeat: Infinity }, scale: { duration: 0.25, ease: 'easeOut' } }
      }
      className={cn(
        'block size-3 rounded-full ring-2',
        blind ? 'bg-red-500/70 ring-red-400/40' : 'bg-amber-400/70 ring-amber-300/40',
      )}
      aria-hidden="true"
    />
  );
}

export interface OnboardingMapProps {
  placements: Placement[];
  gaps: CoverageGap[];
  /** Threat-axis ids drawn as red wedges (threats = all, refine/summary = open). */
  axisIds: string[];
  /** Risk markers shown before assets exist (the "why"); empty otherwise. */
  threatZones: ThreatZone[];
  selectedId: string | null;
  draggable: boolean;
  onSelect: (id: string | null) => void;
  onPlace: (kind: AssetKind, lat: number, lon: number) => void;
  onMove: (id: string, lat: number, lon: number) => void;
  flyTo: CesiumMapFlyTo | null;
  /** Cinematic orbit (e.g. during the scan beat). Null releases the camera. */
  orbit: CesiumMapOrbit | null;
}

export function OnboardingMap({
  placements,
  gaps,
  axisIds,
  threatZones,
  selectedId,
  draggable,
  onSelect,
  onPlace,
  onMove,
  flyTo,
  orbit,
}: OnboardingMapProps) {
  const pickerRef = useRef<Picker>(null);

  // The threat reveal is the only moment risk markers exist, so it doubles as
  // the gate for the volumetric menace (extruded wedges + incoming flows).
  const threatsActive = threatZones.length > 0;

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

    // Threat-axis wedges (red). Driven by `axisIds`, decoupled from coverage:
    // the threats step passes every axis (nothing is covered yet); refine and
    // summary pass only the still-open axes.
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
          // Extruded "threat corridor" volume during the reveal; a flatter
          // ground wedge once it's just a lingering open-axis reminder.
          opacity: threatsActive ? 0.22 : 0.16,
          ...(threatsActive ? { extrudedHeightM: THREAT_VOLUME_HEIGHT_M } : {}),
        },
      });
    }

    // Threat zones — the "why", marked before any asset is suggested.
    for (const zone of threatZones) {
      markers.push({
        id: zone.id,
        lat: zone.lat,
        lon: zone.lon,
        zIndex: 18,
        content: <ThreatZoneMarker severity={zone.severity} />,
      });
    }

    // Placed assets, drawn with the production friendly marker. Coverage
    // geometry is shown ONLY for the focused (tapped) asset — never all cones.
    placements.forEach((p, i) => {
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
            index={i}
            pickerRef={pickerRef}
            onSelect={onSelect}
            onMove={onMove}
          />
        ),
      };
      if (isSelected) {
        if (visual.shape === 'cone' && cap.detect) {
          marker.fov = {
            rangeM: cap.detect.rangeM,
            bearingDeg: p.bearingDeg ?? 0,
            widthDeg: cap.detect.fovDeg,
            color: visual.hex,
            opacity: 0.16,
            // Glowing vertical curtain along the cone perimeter so the FOV
            // coverage reads as a 3D volume from the near-ground camera.
            wall: true,
            wallHeightM: 130,
          };
        }
        if (cap.mitigate) {
          marker.coverageRadiusM = cap.mitigate.rangeM;
          marker.coverageColor = visual.hex;
        } else if (visual.shape === 'ring' && cap.detect) {
          marker.coverageRadiusM = cap.detect.rangeM;
          marker.coverageColor = visual.hex;
        }
        if (marker.coverageRadiusM != null) {
          // 3D "shield" dome so the focused asset's protection reads as a
          // volume bubble, not just a flat ground ring.
          marker.coverageDome = true;
          marker.coverageHeightM = marker.coverageRadiusM * COVERAGE_DOME_RATIO;
        }
      }
      markers.push(marker);
    });

    // Coverage-gap voids.
    for (const gap of gaps) {
      markers.push({
        id: gap.id,
        lat: gap.lat,
        lon: gap.lon,
        zIndex: 15,
        content: <GapDot kind={gap.kind} />,
      });
    }

    return markers;
  }, [placements, gaps, axisIds, threatZones, selectedId, draggable, onSelect, onMove, threatsActive]);

  // Incoming approach-flow arrows: a red dashed line per threat axis, running
  // from the AOI perimeter inward to the base so the particles read as an
  // "incoming route". Only during the threat reveal.
  const prefersReducedMotion = useReducedMotion();
  const polylines = useMemo<CesiumPolyline[]>(() => {
    if (!threatsActive) return [];
    return THREAT_AXES.filter((axis) => axisIds.includes(axis.id)).map((axis) => {
      const [periLat, periLon] = destination(SITE.lat, SITE.lon, AOI_RADIUS_M, axis.bearingDeg);
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
  }, [threatsActive, axisIds, prefersReducedMotion]);

  const handleGroundClick = useCallback(() => onSelect(null), [onSelect]);

  return (
    <div ref={dropRef} className="absolute inset-0">
      <CesiumMap
        ionToken={ION_TOKEN}
        darkMonochromeMap={!ION_TOKEN}
        darkImagery={!!ION_TOKEN}
        showOsmBuildings={!!ION_TOKEN}
        sceneMode="3D"
        initialView={{
          lat: SITE.lat,
          lon: SITE.lon,
          heightM: 180,
          pitchDeg: -14,
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
