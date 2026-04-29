import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import Map, { Marker, NavigationControl, Source, Layer, type MapRef } from 'react-map-gl';
import type mapboxgl from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';
import { Crosshair, AlertTriangle, ShieldAlert, Camera, CheckCircle2, Radio, Search, Eye, MapPin, X, Compass, Circle, Video, Info, Settings, BellOff, Wrench, ExternalLink, Maximize2, Plane } from 'lucide-react';
import { JamWaveIcon, DRONE_PATH, MISSILE_PATH, CarIcon } from '@/primitives/MapIcons';
import { MapMarker } from '@/primitives/MapMarker';
import { type Affiliation, type InteractionState, resolveMarkerStyle } from '@/primitives/markerStyles';
import { OFFLINE_VISIBILITY_VARIANT } from '@/app/config/offlineVisibility';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '@/shared/components/ui/context-menu';
import type { Detection, RegulusEffector, LauncherEffector } from '@/imports/ListOfSystems';
import { useEngagementLine, type EngagementPairGeo } from './useEngagementLine';
import { JAM_FLOW, WEAPON_FLOW } from '@/imports/engagementFlows';
import {
  haversineDistanceM,
  bearingDegrees,
  fovPolygon,
  pointInPolygon,
  FOV_RADIUS_M,
  DRONE_FOV_RADIUS_M,
  DRONE_FOV_DEG,
} from '@/app/lib/mapGeo';
import { MAPBOX_TOKEN, getMapInstance, tryMapOp, logMapError } from '@/app/lib/mapUtils';

// Re-export geo helpers for external callers (Dashboard imports them from here).
export { haversineDistanceM, bearingDegrees, FOV_RADIUS_M };

const MISSILE_FLIGHT_DURATION_MS = 22000; // slower, more visible flight
const LABEL_PREFIXES = ['poi-label', 'road-label', 'place-label', 'transit-label', 'natural-point-label', 'waterway-label', 'natural-line-label', 'road-number-shield', 'road-exit-shield'];

/** Slight pulse/surge on top of linear progress (0..1) for more realistic motion. */
function pulsedProgress(linearProgress: number): number {
  const surge = 0.018 * Math.sin(linearProgress * 35);
  return Math.min(1, Math.max(0, linearProgress + surge));
}

export type MapAssetType = 'sensor' | 'camera' | 'radar';

export interface MapAsset {
  id: string;
  latitude: number;
  longitude: number;
  typeLabel: string;
  fovDeg: number;
  bearingDeg: number;
  Icon: React.FC;
}

export interface MissileLaunchRequest {
  id: string;
  targetId: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

interface MissileSim extends MissileLaunchRequest {
  launchedAt: number;
  durationMs: number;
  progress: number;
}

export const SensorIcon = ({ size = 28, fill = "white" }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.3164 1.68018L23.1152 2.52979C27.6277 7.33379 27.6281 14.8319 23.1162 19.6362L22.3174 20.4868L22.1465 20.6694L21.9639 20.4985L20.2627 18.9009L20.0811 18.73L20.252 18.5474L21.0508 17.6968C24.5387 13.9829 24.5382 8.18391 21.0498 4.47021L20.251 3.61963L20.0801 3.43799L20.2627 3.26611L21.9629 1.66846L22.1455 1.49756L22.3164 1.68018Z" fill={fill} stroke="black" strokeWidth="1"/>
    <path d="M6.02637 1.67676L7.72949 3.27246L7.91113 3.44336L7.74023 3.62598L6.94238 4.47754C3.46137 8.19154 3.46372 13.985 6.94922 17.6963L7.74805 18.5469L7.91895 18.7295L7.7373 18.9004L6.03613 20.498L5.85352 20.6689L5.68262 20.4863L4.88379 19.6367C0.374552 14.8356 0.372449 7.34459 4.87598 2.54004L5.67383 1.68848L5.84473 1.50586L6.02637 1.67676Z" fill={fill} stroke="black" strokeWidth="1"/>
    <path d="M9.05371 5.16504L10.8516 6.65137L11.0449 6.81055L10.8857 7.00391L10.1416 7.90234C8.61968 9.74292 8.61989 12.423 10.1416 14.2637L10.8857 15.1631L11.0449 15.3555L10.8516 15.5146L9.05371 17.002L8.86133 17.1611L8.70215 16.9688L7.95801 16.0693C5.56993 13.181 5.57 8.98603 7.95801 6.09766L8.70215 5.19824L8.86133 5.00586L9.05371 5.16504Z" fill={fill} stroke="black" strokeWidth="1"/>
    <path d="M19.2988 5.19824L20.042 6.09766C22.4301 8.98606 22.4302 13.181 20.042 16.0693L19.2988 16.9688L19.1396 17.1611L18.9463 17.002L17.1484 15.5146L16.9561 15.3555L17.1152 15.1631L17.8584 14.2637C19.3802 12.423 19.3803 9.74295 17.8584 7.90234L17.1152 7.00391L16.9561 6.81055L17.1484 6.65137L18.9463 5.16504L19.1387 5.00586L19.2988 5.19824Z" fill={fill} stroke="black" strokeWidth="1"/>
    <path d="M14 7.9165C15.7488 7.91655 17.167 9.33462 17.167 11.0835C17.1669 11.9135 16.8438 12.6665 16.3213 13.231L20.3838 25.147L20.4648 25.3833L20.2275 25.4644L18.0195 26.2173L17.7832 26.2974L17.7021 26.061L16.46 22.4165H11.54L10.2979 26.061L10.2168 26.2974L9.98047 26.2173L7.77148 25.4644L7.53516 25.3833L7.61621 25.147L11.6777 13.231C11.1555 12.6665 10.8331 11.9133 10.833 11.0835C10.833 9.3346 12.2511 7.9165 14 7.9165ZM12.5059 19.5835H15.4941L14 15.1997L12.5059 19.5835Z" fill={fill} stroke="black" strokeWidth="1"/>
  </svg>
);

export const CameraIcon = ({ size = 28, fill = "white" }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.5 4.4165C18.2823 4.41668 18.916 5.05121 18.916 5.8335V9.37354L23.8662 6.89893C24.3052 6.67953 24.8266 6.70345 25.2441 6.96143C25.6618 7.21954 25.916 7.67549 25.916 8.1665V19.8335C25.9159 20.3244 25.6616 20.7804 25.2441 21.0386C24.8265 21.2965 24.3052 21.3196 23.8662 21.1001L18.916 18.6245V22.1665C18.916 22.9488 18.2823 23.5833 17.5 23.5835H3.5C2.71761 23.5835 2.08301 22.9489 2.08301 22.1665V5.8335C2.08301 5.0511 2.7176 4.4165 3.5 4.4165H17.5Z" fill={fill} stroke="black" strokeWidth="1"/>
  </svg>
);

export const RadarIcon = ({ size = 28, fill = "white" }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2.5835C20.305 2.58367 25.416 7.69534 25.416 14.0005V14.9165H23.583V14.0005C23.583 8.70787 19.2926 4.41668 14 4.4165H13.083V2.5835H14Z" fill={fill} stroke="black" strokeWidth="1"/>
    <path d="M13.416 13.2871L13.5928 13.1104L15.166 11.5361L16.4619 12.833L14.8896 14.4062L14.7129 14.583L22.167 22.0371L21.4141 22.6816C16.9279 26.5207 10.1721 26.3184 5.92676 22.0732C1.68145 17.8279 1.4782 11.0712 5.31738 6.58496L5.96094 5.83203L13.416 13.2871Z" fill={fill} stroke="black" strokeWidth="1"/>
    <path d="M14 6.0835C18.3721 6.08367 21.916 9.62835 21.916 14.0005V14.9165H20.083V14.0005C20.083 10.6409 17.3596 7.91668 14 7.9165H13.083V6.0835H14Z" fill={fill} stroke="black" strokeWidth="1"/>
  </svg>
);

export const MissileIcon = ({ rotationDeg = 0, fill = '#15FFF6' }: { rotationDeg?: number; fill?: string }) => (
  <svg
    width="42"
    height="30"
    viewBox="0 0 42 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: `rotate(${rotationDeg}deg)` }}
  >
    <path d={MISSILE_PATH} fill={fill} stroke="black"/>
  </svg>
);

/** rotationDeg: 0 = nose to right (east). disabled = jammed state (greyed out). */
export const DroneIcon = ({ rotationDeg = 0, disabled = false, color }: { rotationDeg?: number; disabled?: boolean; color?: string }) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-lg transition-transform duration-150 ${disabled ? 'opacity-70' : ''}`}
    style={{ transform: `rotate(${rotationDeg}deg)` }}
  >
    <path
      d={DRONE_PATH}
      fill={disabled ? '#6b7280' : color || '#15FFF6'}
      stroke="#0a0a0a"
      strokeWidth="1"
    />
  </svg>
);

export const DroneHiveIcon = ({ size = 28, fill = "white" }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 21.0654L2.5 6.93457L13.0986 14L2.5 21.0654ZM14 13.3984L3.65137 6.5L24.3486 6.5L14 13.3984ZM3.65137 21.5L14 14.6006L24.3486 21.5L3.65137 21.5ZM25.5 21.0654L14.9014 14L25.5 6.93457L25.5 21.0654Z" fill={fill} stroke="black"/>
  </svg>
);

export const LidarIcon = ({ size = 28, fill = "white" }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 4.5C17.1326 4.5 17.2597 4.55273 17.3535 4.64648C17.4473 4.74025 17.5 4.86739 17.5 5V9.99902C17.5 10.2752 17.2761 10.499 17 10.499H13.4502V13.1904L20.3877 21.6836C20.5096 21.833 20.5346 22.0396 20.4521 22.2139C20.3694 22.3884 20.1931 22.5 20 22.5H18C17.8571 22.5 17.7209 22.4389 17.626 22.332L13.4502 17.6201V21.9922C13.4502 22.2683 13.2263 22.4922 12.9502 22.4922H10.9502C10.6757 22.4921 10.4524 22.2706 10.4502 21.9961L10.4141 17.6377L6.37891 22.3262C6.28392 22.4365 6.14559 22.5 6 22.5H4C3.80746 22.5 3.63191 22.3895 3.54883 22.2158C3.46579 22.042 3.49029 21.8354 3.61133 21.6855L10.4502 13.2188V10.499L7 10.5C6.86741 10.5 6.74025 10.4473 6.64648 10.3535C6.55272 10.2597 6.5 10.1326 6.5 10V5.00098C6.5 4.72485 6.72388 4.501 7 4.50098L17 4.5ZM22.7227 2.58398C22.8761 2.48171 23.0738 2.47259 23.2363 2.55957C23.3986 2.64666 23.5 2.81578 23.5 3V7.66602C23.5 7.82024 23.4284 7.96584 23.3066 8.06055L20.3066 10.3945C20.1559 10.5117 19.9518 10.5331 19.7803 10.4492C19.6087 10.3653 19.5 10.191 19.5 10V5.00098C19.5 4.83384 19.5836 4.6777 19.7227 4.58496L22.7227 2.58398ZM4.5 10C4.5 10.191 4.39126 10.3653 4.21973 10.4492C4.04823 10.5331 3.84407 10.5117 3.69336 10.3945L0.693359 8.06055C0.571632 7.96584 0.500033 7.82024 0.5 7.66602V3L0.504883 2.93164C0.526526 2.77469 0.621703 2.63575 0.763672 2.55957C0.926245 2.47259 1.12393 2.48171 1.27734 2.58398L4.27734 4.58496C4.41639 4.6777 4.5 4.83384 4.5 5.00098V10Z" fill={fill} stroke="black" strokeLinejoin="round"/>
  </svg>
);

export const LauncherIcon = ({ size = 24, fill = "white" }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.042 8.75977C23.2375 8.77623 23.4049 8.90599 23.4707 9.09082C23.5365 9.27575 23.488 9.48191 23.3467 9.61816L22.2334 10.6924C22.1826 10.7413 22.122 10.7788 22.0557 10.8027L12.042 14.3994L12.6738 15.5977L15.1904 19.7402C15.2842 19.8946 15.2868 20.0877 15.1982 20.2451C15.1097 20.4024 14.9433 20.5 14.7627 20.5H4.31445C4.03831 20.5 3.81445 20.2761 3.81445 20V17.3555L3.37012 17.5156C3.2415 17.5618 3.09879 17.5533 2.97656 17.4922C2.85465 17.4311 2.7628 17.3227 2.72266 17.1924L2.35156 15.9834C2.27343 15.7286 2.4086 15.4569 2.65918 15.3662L21.2217 8.6543L21.3252 8.62793C21.3607 8.6232 21.3967 8.623 21.4326 8.62598L23.042 8.75977ZM22.0742 6.23145C22.2698 6.2478 22.4381 6.37757 22.5039 6.5625C22.5696 6.74731 22.521 6.95363 22.3799 7.08984L21.2656 8.16406C21.2148 8.213 21.1543 8.25055 21.0879 8.27441L2.40234 14.9873C2.27376 15.0335 2.13197 15.025 2.00977 14.9639C1.88761 14.9027 1.79505 14.7946 1.75488 14.6641L1.38379 13.4551C1.30573 13.2003 1.44176 12.9285 1.69238 12.8379L20.2539 6.12598L20.3584 6.10059C20.3938 6.09591 20.43 6.09467 20.4658 6.09766L22.0742 6.23145ZM21.2119 3.63574C21.4076 3.65207 21.5758 3.78185 21.6416 3.9668C21.7073 4.15168 21.6588 4.35792 21.5176 4.49414L20.4043 5.56836C20.3534 5.61741 20.2921 5.65482 20.2256 5.67871L1.54004 12.3916C1.41147 12.4377 1.26962 12.4293 1.14746 12.3682C1.02542 12.3071 0.933759 12.1988 0.893555 12.0684L0.522461 10.8594C0.444234 10.6045 0.579375 10.3329 0.830078 10.2422L1.33301 10.0596L1.02051 9.12598C0.933486 8.86551 1.07316 8.58317 1.33301 8.49414L3.68457 7.68848L3.75586 7.66992C3.82891 7.65652 3.90427 7.66014 3.97656 7.67969L6.22852 8.28906L19.3916 3.53027C19.4593 3.50579 19.5318 3.49597 19.6035 3.50195L21.2119 3.63574Z" fill={fill} stroke="black" strokeLinejoin="round"/>
  </svg>
);

export const CAMERA_ASSETS: MapAsset[] = [
  { id: 'CAM-NVT-PTZ-N', latitude: 32.4746, longitude: 34.9983, typeLabel: 'PTZ Camera (North)', fovDeg: 90, bearingDeg: 350, Icon: CameraIcon },
  { id: 'CAM-NVT-PIXELSIGHT', latitude: 32.4616, longitude: 35.0063, typeLabel: 'PixelSight', fovDeg: 360, bearingDeg: 0, Icon: CameraIcon },
];

export const RADAR_ASSETS: MapAsset[] = [
  { id: 'SENS-NVT-MAGOS-N', latitude: 32.4761, longitude: 34.9943, typeLabel: 'Magos (North)', fovDeg: 180, bearingDeg: 0, Icon: RadarIcon },
  { id: 'SENS-NVT-MAGOS-S', latitude: 32.4531, longitude: 35.0083, typeLabel: 'Magos (South)', fovDeg: 180, bearingDeg: 180, Icon: RadarIcon },
  { id: 'RAD-NVT-RADA', latitude: 32.4686, longitude: 34.9863, typeLabel: 'RADA ieMHR', fovDeg: 360, bearingDeg: 0, Icon: RadarIcon },
  { id: 'RAD-NVT-ELTA', latitude: 32.4596, longitude: 35.0213, typeLabel: 'Elta MHR', fovDeg: 360, bearingDeg: 0, Icon: RadarIcon },
];

export const DRONE_HIVE_ASSETS: MapAsset[] = [
  { id: 'HIVE-NVT-MAIN', latitude: 32.4666, longitude: 35.0013, typeLabel: 'Drone Hive', fovDeg: 0, bearingDeg: 0, Icon: DroneHiveIcon },
];

export const LIDAR_ASSETS: MapAsset[] = [
  { id: 'LIDAR-NVT-01', latitude: 32.4706, longitude: 35.0103, typeLabel: 'LiDAR North', fovDeg: 360, bearingDeg: 0, Icon: LidarIcon },
];

export const WEAPON_SYSTEM_ASSETS: MapAsset[] = [
  { id: 'WPN-NVT-01', latitude: 32.4586, longitude: 34.9923, typeLabel: 'Iron Dome', fovDeg: 0, bearingDeg: 0, Icon: LauncherIcon },
];

// Regulus effector icon
export const RegulusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M10 2 L10 5 M10 15 L10 18 M2 10 L5 10 M15 10 L18 10" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="3" fill="currentColor" />
  </svg>
);

export const REGULUS_EFFECTORS: RegulusEffector[] = [
  { id: 'REG-NVT-NORTH', name: 'Regulus North', lat: 32.4776, lon: 34.9913, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-EAST', name: 'Regulus East', lat: 32.4646, lon: 35.0213, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-SOUTH', name: 'Regulus South', lat: 32.4526, lon: 35.0013, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-WEST', name: 'Regulus West', lat: 32.4666, lon: 34.9763, coverageRadiusM: 2500, status: 'available' },
];

const ALL_MAP_ASSETS = [...CAMERA_ASSETS, ...RADAR_ASSETS, ...LIDAR_ASSETS];
const ALL_RENDERABLE_ASSETS = [...ALL_MAP_ASSETS, ...DRONE_HIVE_ASSETS, ...WEAPON_SYSTEM_ASSETS];

export const LAUNCHER_ASSETS = [
  { id: 'LCHR-NVT-ALPHA', latitude: 32.4626, longitude: 34.9963 },
  { id: 'LCHR-NVT-BRAVO', latitude: 32.4756, longitude: 35.0113 },
  { id: 'LCHR-NVT-GAMMA', latitude: 32.4506, longitude: 35.0243 },
];

/** Find all map assets whose FOV covers the given lat/lon. */
export function findDetectingSensors(lat: number, lon: number): MapAsset[] {
  const result: MapAsset[] = [];
  const targetLon = lon;
  const targetLat = lat;

  for (const asset of ALL_MAP_ASSETS) {
    const ring = fovPolygon(asset.latitude, asset.longitude, asset.fovDeg, asset.bearingDeg, FOV_RADIUS_M);
    if (pointInPolygon(targetLon, targetLat, ring)) {
      result.push(asset);
    }
  }

  // Fallback: if nothing strictly in FOV, return the nearest sensor/radar/camera
  if (result.length === 0 && ALL_MAP_ASSETS.length > 0) {
    let closest: MapAsset | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;
    for (const asset of ALL_MAP_ASSETS) {
      const dLat = asset.latitude - lat;
      const dLon = asset.longitude - lon;
      const distSq = dLat * dLat + dLon * dLon;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        closest = asset;
      }
    }
    if (closest) result.push(closest);
  }

  return result;
}

export type ClosestAssetForTarget = { id: string; typeLabel: string; actionLabel: string; distanceM: number };

/** Closest assets to a point with mock action labels for card "אמצעים זמינים". */
export function getClosestAssetsForTarget(lat: number, lon: number, limit: number = 5): ClosestAssetForTarget[] {
  const withDist = ALL_MAP_ASSETS.map(a => {
    const distanceM = haversineDistanceM(lat, lon, a.latitude, a.longitude);
    const actionLabel =
      a.typeLabel === 'Camera' ? 'הפנה מצלמה לאימות' :
      a.typeLabel === 'Radar' ? 'פעיל מכ"ם' :
      'מעקב חיישן';
    return { id: a.id, typeLabel: a.typeLabel, actionLabel, distanceM };
  });
  const sorted = withDist.sort((a, b) => a.distanceM - b.distanceM).slice(0, limit);
  const droneMock: ClosestAssetForTarget = { id: 'DRONE-MOCK', typeLabel: 'רחפן', actionLabel: 'שלח רחפן לחקירה', distanceM: 0 };
  return [droneMock, ...sorted];
}

export type MissilePhase = 'launched' | 'en_route' | 'impact';

export interface TacticalMapProps {
  focusCoords?: { lat: number; lon: number } | null;
  targets?: Detection[];
  activeTargetId?: string | null;
  onMarkerClick?: (targetId: string) => void;
  missileLaunchRequest?: MissileLaunchRequest | null;
  highlightedSensorIds?: string[];
  onMissilePhaseChange?: (payload: { targetId: string; missileId: string; phase: MissilePhase }) => void;
  hoveredSensorIdFromCard?: string | null;
  jammingTargetId?: string | null;
  jammingJammerAssetId?: string | null;
  jammingVerification?: { targetId: string; method: 'camera' | 'drone' } | null;
  onJammingVerificationComplete?: () => void;
  /** Camera look-at: animate a camera FOV cone to face a target. fovOverrideDeg widens/narrows the cone. */
  cameraLookAtRequest?: { cameraId: string; targetLat: number; targetLon: number; fovOverrideDeg?: number } | null;
  /** Show "You have control" indicator on the map. */
  controlIndicator?: boolean;
  /** Fit map to show all these points */
  fitBoundsPoints?: { lat: number; lon: number }[] | null;
  /** Mission route for Flow 4 */
  missionRoute?: {
    waypoints: { lat: number; lon: number; label: string }[];
    droneLat: number; droneLon: number; headingDeg: number;
    currentSegment: number; phase: string; trail: [number, number][];
    loop: boolean;
  } | null;
  /** Active drone deployment for Flow 3 */
  activeDrone?: {
    currentLat: number;
    currentLon: number;
    hiveLat: number;
    hiveLon: number;
    targetLat: number;
    targetLon: number;
    phase: string;
    headingDeg: number;
    trail: [number, number][];
  } | null;
  /** Whether mission planning mode is active (click-to-add waypoints) */
  planningMode?: boolean;
  /** @deprecated kept for compatibility */
  planningMissionType?: 'drone' | 'ptz';
  /** Camera scan visualization during planning */
  planningScanViz?: { cameraLat: number; cameraLon: number; bearings: number[] } | null;
  /** Asset ID currently selected for mission planning */
  selectedAssetId?: string | null;
  /** Map click handler for placing waypoints */
  onMapClick?: (lat: number, lon: number) => void;
  /** Regulus effectors state for CUAS */
  regulusEffectors?: RegulusEffector[];
  /** Sensor ID to flyTo and flicker (from card click) */
  sensorFocusId?: string | null;
  /** Context menu action callbacks */
  onContextMenuAction?: (action: string, elementType: 'target' | 'effector' | 'sensor', elementId: string) => void;
  /** Friendly drones shown as cyan markers with tooltip only */
  friendlyDrones?: { id: string; name: string; lat: number; lon: number; altitude: string; headingDeg?: number; fovDeg?: number; trail?: [number, number][] }[];
  /** Smooth pan to a target without zoom change */
  smoothFocusRequest?: { lat: number; lon: number } | null;
  /** Target ID hovered from card sidebar — highlight on map */
  hoveredTargetIdFromCard?: string | null;
  /** Click on a sensor/effector/launcher icon to open its device card */
  onAssetClick?: (assetId: string) => void;
  /** Asset IDs that are offline — show a gray badge on the map */
  offlineAssetIds?: string[];
  /** User-overridden effector selection per target (targetId -> effectorId) */
  selectedEffectorIds?: Map<string, string>;
  /** Launcher effectors for weapon pointing flow */
  launcherEffectors?: LauncherEffector[];
  /** User-overridden launcher selection per target (targetId -> launcherId) */
  selectedLauncherIds?: Map<string, string>;
  /** Connect a Starling drone to PathFinder */
  onPathFinderConnect?: (droneId: string) => void;
  /** Currently connected PathFinder drone ID */
  pathFinderConnectedId?: string | null;
}

const JAM_VERIFICATION_DURATION_MS = 4500;
const JAM_VERIFICATION_DRONE_DURATION_MS = 4000;

const TOOLTIP_BASE = 'bg-black/60 backdrop-blur-md rounded px-2 py-1 text-xs font-medium text-white whitespace-nowrap pointer-events-none';
const TOOLTIP_SHADOW = 'shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.4)]';
const TOOLTIP_SHADOW_CYAN = 'shadow-[0_0_0_1px_rgba(34,211,238,0.4),0_4px_12px_rgba(0,0,0,0.4)]';
const TOOLTIP_POS_ABOVE = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5';
const TOOLTIP_HOVER = `${TOOLTIP_BASE} ${TOOLTIP_SHADOW} ${TOOLTIP_POS_ABOVE} z-50`;
const TOOLTIP_HOVER_CYAN = `${TOOLTIP_BASE} ${TOOLTIP_SHADOW_CYAN} ${TOOLTIP_POS_ABOVE} z-50`;
const OFFLINE_FOV_DIMMING_ENABLED = OFFLINE_VISIBILITY_VARIANT === 'B';

// Module-scope paint constants — reuse across all layers.
const TRAIL_CASING_PAINT = {
  'line-color': '#000000',
  'line-width': 7,
  'line-opacity': 1,
} as const;

const TRAIL_LINE_PAINT = {
  'line-color': '#ffffff',
  'line-width': 3,
  'line-opacity': 1,
} as const;

const FRIENDLY_TRAIL_CASING_PAINT = {
  'line-color': '#000000',
  'line-width': 5,
} as const;

const FRIENDLY_TRAIL_LINE_PAINT = {
  'line-color': '#ffffff',
  'line-width': 2,
} as const;

const FRIENDLY_FOV_FILL_PAINT = {
  'fill-color': 'rgba(34, 211, 238, 0.40)',
  'fill-outline-color': 'rgba(34, 211, 238, 1.0)',
} as const;

const FRIENDLY_FOV_LINE_PAINT = {
  'line-color': 'rgba(34, 211, 238, 1.0)',
  'line-width': 2.5,
} as const;

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as any[] };

/**
 * Module-scope FOV paint config. Previously declared inside the component body so it
 * allocated a new object every render and — worse — was captured by an empty-deps
 * useCallback in `ensureFovSource`, making the "latest" paint stale forever.
 * Hoisting is safe because it depends only on a module-scope constant.
 */
const FOV_PAINT = {
  fill: {
    'fill-color': OFFLINE_FOV_DIMMING_ENABLED
      ? ['case', ['==', ['get', 'offline'], 1], 'rgba(113, 113, 122, 0.22)', 'rgba(34, 211, 238, 0.40)']
      : 'rgba(34, 211, 238, 0.40)',
    'fill-outline-color': OFFLINE_FOV_DIMMING_ENABLED
      ? ['case', ['==', ['get', 'offline'], 1], 'rgba(161, 161, 170, 0.7)', 'rgba(34, 211, 238, 1.0)']
      : 'rgba(34, 211, 238, 1.0)',
  },
  line: {
    'line-color': OFFLINE_FOV_DIMMING_ENABLED
      ? ['case', ['==', ['get', 'offline'], 1], 'rgba(161, 161, 170, 0.7)', 'rgba(34, 211, 238, 1.0)']
      : 'rgba(34, 211, 238, 1.0)',
    'line-width': OFFLINE_FOV_DIMMING_ENABLED
      ? ['case', ['==', ['get', 'offline'], 1], 1.5, 2.5]
      : 2.5,
  },
} as const;

const TARGET_CARD_BASE = 'bg-black/60 backdrop-blur-md rounded px-2 py-1 text-xs font-medium text-white whitespace-nowrap';
const TARGET_SHADOW_THREAT = 'shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_4px_12px_rgba(0,0,0,0.4)]';
const TARGET_SHADOW_BIRD = 'shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_4px_12px_rgba(0,0,0,0.4)]';
const TARGET_SHADOW_MITIGATED = 'shadow-[0_0_0_1px_rgba(113,113,122,0.3),0_4px_12px_rgba(0,0,0,0.4)]';
const TARGET_SHADOW_HOVERED = 'shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.4)]';

const TELEMETRY_BASE = 'bg-black/60 backdrop-blur-md rounded px-2 py-1 font-mono text-xs tabular-nums whitespace-nowrap pointer-events-none select-none';
const TELEMETRY_SHADOW_CYAN = 'shadow-[0_0_0_1px_rgba(34,211,238,0.4),0_4px_12px_rgba(0,0,0,0.4)]';
const TELEMETRY_SHADOW_ZINC = 'shadow-[0_0_0_1px_rgba(113,113,122,0.4),0_4px_12px_rgba(0,0,0,0.4)]';
const TELEMETRY_SHADOW_GREEN = 'shadow-[0_0_0_1px_rgba(18,184,134,0.4),0_4px_12px_rgba(0,0,0,0.4)]';
const TELEMETRY_SHADOW_RED = 'shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_4px_12px_rgba(0,0,0,0.4)]';

export const TacticalMap = ({ 
  focusCoords, 
  targets = [], 
  activeTargetId, 
  onMarkerClick,
  missileLaunchRequest,
  highlightedSensorIds = [],
  onMissilePhaseChange,
  hoveredSensorIdFromCard,
  jammingTargetId,
  jammingJammerAssetId,
  jammingVerification,
  onJammingVerificationComplete,
  cameraLookAtRequest,
  controlIndicator,
  fitBoundsPoints,
  activeDrone,
  missionRoute,
  planningMode,
  planningMissionType,
  planningScanViz,
  selectedAssetId,
  onMapClick,
  regulusEffectors = REGULUS_EFFECTORS,
  sensorFocusId,
  onContextMenuAction,
  friendlyDrones = [],
  smoothFocusRequest,
  hoveredTargetIdFromCard,
  onAssetClick,
  offlineAssetIds = [],
  selectedEffectorIds,
  launcherEffectors = [],
  selectedLauncherIds,
  onPathFinderConnect,
  pathFinderConnectedId,
}: TacticalMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  /** Defer Map mount until container has real size (RO + flex parent must expose height — see dashboard `h-0 flex-1`). */
  const [mapMountReady, setMapMountReady] = useState(false);

  const getInnerMap = (): mapboxgl.Map | null => getMapInstance(mapRef);

  const resizeMap = () => {
    tryMapOp('resizeMap', () => {
      getInnerMap()?.resize();
    });
  };

  const repaintMap = () => {
    resizeMap();
    tryMapOp('repaintMap', () => {
      getInnerMap()?.triggerRepaint();
    });
  };

  useLayoutEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') {
      setMapMountReady(true);
      return;
    }
    const consider = (width: number, height: number) => {
      const w = Math.floor(width);
      const h = Math.floor(height);
      if (w > 8 && h > 8) setMapMountReady(true);
      repaintMap();
    };
    const r0 = el.getBoundingClientRect();
    consider(r0.width, r0.height);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        let { width, height } = e.contentRect;
        if (width <= 8 || height <= 8) {
          const r = el.getBoundingClientRect();
          width = r.width;
          height = r.height;
        }
        consider(width, height);
      }
    });
    ro.observe(el);
    let attempts = 0;
    let raf = 0;
    let cancelled = false;
    const bootstrap = () => {
      if (cancelled) return;
      attempts += 1;
      const r = el.getBoundingClientRect();
      consider(r.width, r.height);
      if (!cancelled && attempts < 64) {
        raf = requestAnimationFrame(bootstrap);
      } else if (!cancelled) {
        setMapMountReady(true);
      }
    };
    raf = requestAnimationFrame(bootstrap);
    return () => {
      cancelled = true;
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onResize = () => repaintMap();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        repaintMap();
      } else {
        // Pause any in-progress animations to free CPU when tab is hidden
        tryMapOp('visibility.stop', () => getInnerMap()?.stop());
      }
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!mapMountReady) return;
    const timers = [150, 500, 1500].map(ms =>
      setTimeout(repaintMap, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [mapMountReady]);

  const [viewState, setViewState] = useState({
    latitude: 32.4666,
    longitude: 35.0013,
    zoom: 13.5,
    pitch: 0,
    bearing: 0,
    transitionDuration: 0,
  });

  useEffect(() => {
    if (!focusCoords) return;
    const map = mapRef.current;
    if (map) {
      try {
        map.stop();
        map.flyTo({ center: [focusCoords.lon, focusCoords.lat], zoom: 15, duration: 1500, essential: true });
      } catch {
        setViewState(prev => ({ ...prev, latitude: focusCoords.lat, longitude: focusCoords.lon, zoom: 15, transitionDuration: 0 }));
      }
    } else {
      setViewState(prev => ({ ...prev, latitude: focusCoords.lat, longitude: focusCoords.lon, zoom: 15, transitionDuration: 0 }));
    }
  }, [focusCoords?.lat, focusCoords?.lon]);

  useEffect(() => {
    if (!smoothFocusRequest) return;
    const map = mapRef.current;
    if (!map) return;
    try {
      map.flyTo({
        center: [smoothFocusRequest.lon, smoothFocusRequest.lat],
        duration: 2000,
        essential: true,
      });
    } catch {}
  }, [smoothFocusRequest?.lat, smoothFocusRequest?.lon]);

  useEffect(() => {
    if (!fitBoundsPoints || fitBoundsPoints.length < 2) return;
    const map = mapRef.current;
    if (!map) return;
    const lats = fitBoundsPoints.map(p => p.lat);
    const lons = fitBoundsPoints.map(p => p.lon);
    const pad = 0.02;
    map.fitBounds(
      [[Math.min(...lons) - pad, Math.min(...lats) - pad], [Math.max(...lons) + pad, Math.max(...lats) + pad]],
      { padding: { top: 80, bottom: 80, left: 80, right: 420 }, duration: 2500, essential: true }
    );
  }, [fitBoundsPoints]);

  // Dedup and exclude dismissed/cleared targets (keep CUAS expired for "last seen")
  const uniqueTargets = useMemo(() => {
      const seen = new Set<string>();
      return targets.filter(t => {
          if (t.status === 'event_neutralized' || t.status === 'event_resolved') return false;
          if (t.status === 'expired' && !t.entityStage) return false;
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
      });
  }, [targets]);

  const jamPair = useMemo<(EngagementPairGeo & { phase: string }) | null>(() => {
    if (!activeTargetId) return null;
    const target = targets.find(t => t.id === activeTargetId);
    if (!target) return null;
    if (target.entityStage !== 'classified' || !JAM_FLOW.matchTarget(target)) return null;
    if (target.mitigationStatus === 'mitigated') return null;
    if (target.status === 'expired' || target.status === 'event_neutralized' || target.status === 'event_resolved') return null;
    if (target.id === jammingTargetId) return null;
    if (target.mitigatingEffectorId === 'ALL') return null;

    const [tLat, tLon] = target.coordinates.split(',').map(s => parseFloat(s.trim()));
    if (isNaN(tLat) || isNaN(tLon)) return null;

    const phase = JAM_FLOW.getPhase(target);

    if (phase === 'mitigating' && target.mitigatingEffectorId) {
      const eff = regulusEffectors.find(r => r.id === target.mitigatingEffectorId);
      if (eff) {
        const distM = haversineDistanceM(tLat, tLon, eff.lat, eff.lon);
        return { toLat: tLat, toLon: tLon, fromLat: eff.lat, fromLon: eff.lon, assetId: eff.id, distanceM: distM, phase };
      }
    }

    const hoverEff = hoveredSensorIdFromCard ? regulusEffectors.find(r => r.id === hoveredSensorIdFromCard) : null;
    if (hoverEff) {
      const distM = haversineDistanceM(tLat, tLon, hoverEff.lat, hoverEff.lon);
      return { toLat: tLat, toLon: tLon, fromLat: hoverEff.lat, fromLon: hoverEff.lon, assetId: hoverEff.id, distanceM: distM, phase };
    }

    const overrideId = selectedEffectorIds?.get(activeTargetId);
    const sorted = regulusEffectors
      .filter(r => r.status === 'available')
      .map(r => ({ eff: r, dist: haversineDistanceM(tLat, tLon, r.lat, r.lon) }))
      .sort((a, b) => a.dist - b.dist);

    const overridden = overrideId ? sorted.find(e => e.eff.id === overrideId) : null;
    const active = overridden ?? sorted[0] ?? null;
    if (!active) return null;

    return { toLat: tLat, toLon: tLon, fromLat: active.eff.lat, fromLon: active.eff.lon, assetId: active.eff.id, distanceM: active.dist, phase };
  }, [activeTargetId, targets, regulusEffectors, selectedEffectorIds, jammingTargetId, hoveredSensorIdFromCard]);

  const { particleGeoJson: jamParticleGeoJson } = useEngagementLine({ id: 'jam', pair: jamPair, mapRef });

  const weaponPair = useMemo<(EngagementPairGeo & { phase: string }) | null>(() => {
    if (!activeTargetId) return null;
    const target = targets.find(t => t.id === activeTargetId);
    if (!target) return null;
    if (target.entityStage !== 'classified' || !WEAPON_FLOW.matchTarget(target)) return null;
    if (target.status === 'expired' || target.status === 'event_neutralized' || target.status === 'event_resolved') return null;

    const [tLat, tLon] = target.coordinates.split(',').map(s => parseFloat(s.trim()));
    if (isNaN(tLat) || isNaN(tLon)) return null;

    const phase = WEAPON_FLOW.getPhase(target);

    if (target.pointingLauncherId) {
      const launcher = launcherEffectors.find(l => l.id === target.pointingLauncherId);
      if (launcher) {
        const distM = haversineDistanceM(tLat, tLon, launcher.lat, launcher.lon);
        return { toLat: tLat, toLon: tLon, fromLat: launcher.lat, fromLon: launcher.lon, assetId: launcher.id, distanceM: distM, phase };
      }
    }

    const hoverLauncher = hoveredSensorIdFromCard ? launcherEffectors.find(l => l.id === hoveredSensorIdFromCard) : null;
    if (hoverLauncher) {
      const distM = haversineDistanceM(tLat, tLon, hoverLauncher.lat, hoverLauncher.lon);
      return { toLat: tLat, toLon: tLon, fromLat: hoverLauncher.lat, fromLon: hoverLauncher.lon, assetId: hoverLauncher.id, distanceM: distM, phase };
    }

    const overrideId = selectedLauncherIds?.get(activeTargetId);
    const sorted = launcherEffectors
      .filter(l => l.status === 'available' || l.status === 'pointing')
      .map(l => ({ launcher: l, dist: haversineDistanceM(tLat, tLon, l.lat, l.lon) }))
      .sort((a, b) => a.dist - b.dist);

    const overridden = overrideId ? sorted.find(e => e.launcher.id === overrideId) : null;
    const active = overridden ?? sorted[0] ?? null;
    if (!active) return null;

    return { toLat: tLat, toLon: tLon, fromLat: active.launcher.lat, fromLon: active.launcher.lon, assetId: active.launcher.id, distanceM: active.dist, phase };
  }, [activeTargetId, targets, launcherEffectors, selectedLauncherIds, hoveredSensorIdFromCard]);

  const { particleGeoJson: weaponParticleGeoJson } = useEngagementLine({ id: 'weapon', pair: weaponPair, mapRef });

  const [mapStyleId, setMapStyleId] = useState<'dark' | 'satellite'>('satellite');
  const [flickeringSensorId, setFlickeringSensorId] = useState<string | null>(null);

  const hideMapLabels = useCallback((map: mapboxgl.Map) => {
    tryMapOp('hideMapLabels', () => {
      const style = map.getStyle?.();
      if (!style?.layers) return;
      for (const layer of style.layers) {
        if (LABEL_PREFIXES.some(p => layer.id.startsWith(p))) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!sensorFocusId) return;
    const allAssets = [...ALL_MAP_ASSETS, ...regulusEffectors.map(r => ({ id: r.id, latitude: r.lat, longitude: r.lon }))];
    const asset = allAssets.find(a => a.id === sensorFocusId);
    if (!asset) return;
    const map = mapRef.current;
    if (map) {
      map.stop();
      map.flyTo({ center: [asset.longitude, asset.latitude], zoom: 15, duration: 800, essential: true });
    }
    setFlickeringSensorId(sensorFocusId);
    const timer = setTimeout(() => setFlickeringSensorId(null), 2000);
    return () => clearTimeout(timer);
  }, [sensorFocusId]);

  const [hoveredAsset, setHoveredAsset] = useState<MapAsset | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const ensureFovSource = useCallback((map: mapboxgl.Map, sourceId: string) => {
    if (map.getSource(sourceId)) return;
    map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: `${sourceId}-fill`, type: 'fill', source: sourceId, paint: FOV_PAINT.fill as mapboxgl.FillPaint });
    map.addLayer({ id: `${sourceId}-line`, type: 'line', source: sourceId, paint: FOV_PAINT.line as mapboxgl.LinePaint });
  }, []);

  const pushFovToMap = useCallback((sourceId: string, data: { type: 'FeatureCollection'; features: any[] }) => {
    tryMapOp('pushFovToMap', () => {
      const map = getMapInstance(mapRef);
      if (!map) return;
      ensureFovSource(map, sourceId);
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined)?.setData(data);
      map.triggerRepaint();
    });
  }, [ensureFovSource]);

  const handleAssetMouseEnter = useCallback((asset: MapAsset) => {
    clearTimeout(hoverTimeoutRef.current);
    setHoveredAsset(asset);
    const ring = fovPolygon(asset.latitude, asset.longitude, asset.fovDeg, asset.bearingDeg, FOV_RADIUS_M);
    const isOffline = offlineAssetIds.includes(asset.id);
    pushFovToMap('hover-fov', {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
        properties: { offline: isOffline ? 1 : 0 },
      }],
    });
  }, [pushFovToMap, offlineAssetIds]);

  const handleAssetMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredAsset(null);
      pushFovToMap('hover-fov', { type: 'FeatureCollection' as const, features: [] });
    }, 150);
  }, [pushFovToMap]);

  useEffect(() => {
    return () => clearTimeout(hoverTimeoutRef.current);
  }, []);

  const [activeMissiles, setActiveMissiles] = useState<MissileSim[]>([]);
  const [hoveredMissileId, setHoveredMissileId] = useState<string | null>(null);
  const [hoveredLauncherId, setHoveredLauncherId] = useState<string | null>(null);
  const [hoveredRegulusId, setHoveredRegulusId] = useState<string | null>(null);
  const [hoveredFriendlyDroneId, setHoveredFriendlyDroneId] = useState<string | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Moving drone + trail for jamming target
  const [jammingDroneState, setJammingDroneState] = useState<{ lat: number; lon: number; trail: [number, number][] } | null>(null);
  const jammingTargetCoords = useMemo(() => {
    const t = targets.find(x => x.id === jammingTargetId);
    if (!t || !jammingTargetId) return null;
    const [lat, lon] = t.coordinates.split(',').map(c => parseFloat(c.trim()));
    return isNaN(lat) || isNaN(lon) ? null : { lat, lon };
  }, [targets, jammingTargetId]);
  useEffect(() => {
    if (!jammingTargetCoords) {
      setJammingDroneState(null);
      return;
    }
    const { lat, lon } = jammingTargetCoords;
    setJammingDroneState({ lat, lon, trail: [[lat, lon]] });
    const RADIUS = 0.00012;
    const STEP_MS = 120;
    let t = 0;
    const interval = setInterval(() => {
      t += (STEP_MS / 1000) * 0.8;
      setJammingDroneState(prev => {
        if (!prev) return null;
        const newLat = lat + RADIUS * Math.sin(t);
        const newLon = lon + RADIUS * Math.cos(t * 0.7);
        const newTrail = [...prev.trail, [newLat, newLon]].slice(-40);
        return { lat: newLat, lon: newLon, trail: newTrail };
      });
    }, STEP_MS);
    return () => clearInterval(interval);
  }, [jammingTargetCoords?.lat, jammingTargetCoords?.lon]);

  /** Drone icon rotation: 0 = east (right). From trail velocity, atan2(dlat, dlon) = angle from east. */
  const jammingDroneHeadingDeg = useMemo(() => {
    if (!jammingDroneState || jammingDroneState.trail.length < 2) return 0;
    const t = jammingDroneState.trail;
    const [lat0, lon0] = t[t.length - 2];
    const [lat1, lon1] = t[t.length - 1];
    const dlat = lat1 - lat0;
    const dlon = lon1 - lon0;
    if (Math.abs(dlat) < 1e-9 && Math.abs(dlon) < 1e-9) return 0;
    return (Math.atan2(dlat, dlon) * 180) / Math.PI;
  }, [jammingDroneState?.lat, jammingDroneState?.lon, jammingDroneState?.trail?.length]);

  // --- Post-jam verification (camera or drone) ---
  const verificationTargetCoords = useMemo(() => {
    if (!jammingVerification) return null;
    const t = targets.find(x => x.id === jammingVerification.targetId);
    if (!t) return null;
    const [lat, lon] = t.coordinates.split(',').map(c => parseFloat(c.trim()));
    return isNaN(lat) || isNaN(lon) ? null : { lat, lon };
  }, [jammingVerification, targets]);

  const verificationCameraAsset = useMemo(() => {
    if (!verificationTargetCoords || !jammingVerification) return null;
    let best: MapAsset | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;
    for (const a of CAMERA_ASSETS) {
      const dLat = a.latitude - verificationTargetCoords.lat;
      const dLon = a.longitude - verificationTargetCoords.lon;
      const distSq = dLat * dLat + dLon * dLon;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = a;
      }
    }
    return best;
  }, [verificationTargetCoords, jammingVerification]);

  const verificationFovGeoJSON = useMemo(() => {
    if (!verificationCameraAsset || !verificationTargetCoords) return null;
    const bearing = bearingDegrees(
      verificationCameraAsset.latitude,
      verificationCameraAsset.longitude,
      verificationTargetCoords.lat,
      verificationTargetCoords.lon
    );
    const ring = fovPolygon(
      verificationCameraAsset.latitude,
      verificationCameraAsset.longitude,
      50,
      bearing,
      haversineDistanceM(
        verificationCameraAsset.latitude,
        verificationCameraAsset.longitude,
        verificationTargetCoords.lat,
        verificationTargetCoords.lon
      ) + 100
    );
    return {
      type: 'FeatureCollection' as const,
      features: [{ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [ring] }, properties: {} }],
    };
  }, [verificationCameraAsset, verificationTargetCoords]);

  const [verificationDroneProgress, setVerificationDroneProgress] = useState(0);
  const [verificationDroneStart, setVerificationDroneStart] = useState<{ startLat: number; startLon: number } | null>(null);

  // Keep the callback in a ref so parent re-renders don't tear down our rAF loop.
  const onJammingVerificationCompleteRef = useRef(onJammingVerificationComplete);
  onJammingVerificationCompleteRef.current = onJammingVerificationComplete;

  useEffect(() => {
    if (!jammingVerification || !verificationTargetCoords) {
      setVerificationDroneProgress(0);
      setVerificationDroneStart(null);
      return;
    }
    if (jammingVerification.method === 'camera') {
      const t = setTimeout(() => onJammingVerificationCompleteRef.current?.(), JAM_VERIFICATION_DURATION_MS);
      return () => clearTimeout(t);
    }
    if (jammingVerification.method === 'drone') {
      const nearestHive = DRONE_HIVE_ASSETS.reduce((best, hive) => {
        const d = haversineDistanceM(hive.latitude, hive.longitude, verificationTargetCoords.lat, verificationTargetCoords.lon);
        return (!best || d < best.dist) ? { hive, dist: d } : best;
      }, null as { hive: MapAsset; dist: number } | null);

      const start = nearestHive
        ? { startLat: nearestHive.hive.latitude, startLon: nearestHive.hive.longitude }
        : { startLat: verificationTargetCoords.lat - 0.008, startLon: verificationTargetCoords.lon };
      setVerificationDroneStart(start);
      setVerificationDroneProgress(0);
      const startTime = performance.now();
      let frame: number;
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1, elapsed / JAM_VERIFICATION_DRONE_DURATION_MS);
        setVerificationDroneProgress(p);
        if (p < 1) {
          frame = requestAnimationFrame(animate);
        } else {
          setTimeout(() => onJammingVerificationCompleteRef.current?.(), 1500);
        }
      };
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }
  }, [jammingVerification?.targetId, jammingVerification?.method, verificationTargetCoords?.lat, verificationTargetCoords?.lon]);

  // --- Camera Look-At: animate a camera's FOV to rotate toward a target ---
  const [cameraLookAtBearing, setCameraLookAtBearing] = useState<{ cameraId: string; bearing: number } | null>(null);
  const cameraLookAtBearingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cameraLookAtRequest) {
      setCameraLookAtBearing(null);
      cameraLookAtBearingRef.current = null;
      return;
    }
    const cam = CAMERA_ASSETS.find(c => c.id === cameraLookAtRequest.cameraId);
    if (!cam) return;
    const targetBearing = bearingDegrees(cam.latitude, cam.longitude, cameraLookAtRequest.targetLat, cameraLookAtRequest.targetLon);
    const startBearing = cameraLookAtBearingRef.current ?? cam.bearingDeg;
    let diff = targetBearing - startBearing;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    // Small change → snap directly (continuous tracking); large change → animate
    if (Math.abs(diff) < 5) {
      const b = ((targetBearing % 360) + 360) % 360;
      setCameraLookAtBearing({ cameraId: cam.id, bearing: b });
      cameraLookAtBearingRef.current = b;
      return;
    }
    const startTime = performance.now();
    const duration = 800;
    let frame: number;
    const animate = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const current = startBearing + diff * eased;
      const b = ((current % 360) + 360) % 360;
      setCameraLookAtBearing({ cameraId: cam.id, bearing: b });
      cameraLookAtBearingRef.current = b;
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [cameraLookAtRequest?.cameraId, cameraLookAtRequest?.targetLat, cameraLookAtRequest?.targetLon]);

  const cameraLookAtFovGeoJSON = useMemo(() => {
    if (!cameraLookAtBearing) return null;
    const cam = CAMERA_ASSETS.find(c => c.id === cameraLookAtBearing.cameraId);
    if (!cam) return null;
    const radius = cameraLookAtRequest 
      ? haversineDistanceM(cam.latitude, cam.longitude, cameraLookAtRequest.targetLat, cameraLookAtRequest.targetLon) + 100
      : FOV_RADIUS_M;
    const fov = cameraLookAtRequest?.fovOverrideDeg ?? cam.fovDeg;
    const ring = fovPolygon(cam.latitude, cam.longitude, fov, cameraLookAtBearing.bearing, radius);
    return {
      type: 'FeatureCollection' as const,
      features: [{ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [ring] }, properties: {} }],
    };
  }, [cameraLookAtBearing, cameraLookAtRequest]);

  // EMPTY_FC is now module-scope (single allocation, not per-render).

  const highlightedFovGeoJSON = useMemo(() => {
    if (!hoveredSensorIdFromCard) return EMPTY_FC;
    const asset = ALL_MAP_ASSETS.find(a => a.id === hoveredSensorIdFromCard && a.id !== cameraLookAtBearing?.cameraId);
    if (!asset) return EMPTY_FC;
    const ring = fovPolygon(asset.latitude, asset.longitude, asset.fovDeg, asset.bearingDeg, FOV_RADIUS_M);
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
        properties: { offline: offlineAssetIds.includes(asset.id) ? 1 : 0 },
      }],
    };
  }, [hoveredSensorIdFromCard, cameraLookAtBearing?.cameraId, offlineAssetIds]);

  const highlightedAssets = useMemo(() => {
    return ALL_MAP_ASSETS.filter(a =>
      a.id === hoveredSensorIdFromCard
      && a.id !== cameraLookAtBearing?.cameraId
    );
  }, [hoveredSensorIdFromCard, cameraLookAtBearing?.cameraId]);

  // Refs to sync missile phases with parent (timeline)
  const launchedSentRef = useRef<Set<string>>(new Set());
  const enRouteSentRef = useRef<Set<string>>(new Set());
  const impactPendingRef = useRef<Array<{ targetId: string; missileId: string }>>([]);

  // Register new missile launch requests from parent
  useEffect(() => {
    if (!missileLaunchRequest) return;
    setActiveMissiles(prev => {
      if (prev.some(m => m.id === missileLaunchRequest.id)) return prev;
      return [
        ...prev,
        {
          ...missileLaunchRequest,
          launchedAt: performance.now(),
          durationMs: MISSILE_FLIGHT_DURATION_MS,
          progress: 0,
        },
      ];
    });
  }, [missileLaunchRequest]);

  // Animate missiles over time; queue 'impact' for missiles that just reached target
  useEffect(() => {
    if (activeMissiles.length === 0) return;

    let frame: number;
    const animate = () => {
      setActiveMissiles(prev => {
        if (prev.length === 0) return prev;
        const now = performance.now();
        const next: MissileSim[] = [];
        for (const m of prev) {
          const t = Math.min(1, (now - m.launchedAt) / m.durationMs);
          if (t < 1) {
            next.push({ ...m, progress: t });
          } else {
            impactPendingRef.current.push({ targetId: m.targetId, missileId: m.id });
          }
        }
        return next;
      });
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [activeMissiles.length]);

  // Report launched / en_route / impact so parent timeline stays in sync with the map
  useEffect(() => {
    for (const m of activeMissiles) {
      if (m.progress === 0 && !launchedSentRef.current.has(m.id)) {
        launchedSentRef.current.add(m.id);
        onMissilePhaseChange?.({ targetId: m.targetId, missileId: m.id, phase: 'launched' });
      }
      if (m.progress > 0 && !enRouteSentRef.current.has(m.id)) {
        enRouteSentRef.current.add(m.id);
        onMissilePhaseChange?.({ targetId: m.targetId, missileId: m.id, phase: 'en_route' });
      }
    }
    const impacted = impactPendingRef.current;
    impactPendingRef.current = [];
    for (const { targetId, missileId } of impacted) {
      onMissilePhaseChange?.({ targetId, missileId, phase: 'impact' });
    }
  }, [activeMissiles, onMissilePhaseChange]);

  const selectedAsset = useMemo(() =>
    selectedAssetId ? ALL_RENDERABLE_ASSETS.find(a => a.id === selectedAssetId) ?? null : null,
  [selectedAssetId]);

  const hoverFovGeoJSON = useMemo(() => {
    if (!hoveredAsset) return EMPTY_FC;
    if (hoveredAsset.id === cameraLookAtBearing?.cameraId) return EMPTY_FC;
    if (hoveredAsset.id === selectedAssetId) return EMPTY_FC;
    const ring = fovPolygon(
      hoveredAsset.latitude, hoveredAsset.longitude,
      hoveredAsset.fovDeg, hoveredAsset.bearingDeg,
      FOV_RADIUS_M
    );
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
        properties: { offline: offlineAssetIds.includes(hoveredAsset.id) ? 1 : 0 },
      }],
    };
  }, [hoveredAsset, selectedAssetId, cameraLookAtBearing?.cameraId, offlineAssetIds]);

  const selectedFovGeoJSON = useMemo(() => {
    if (!selectedAsset) return EMPTY_FC;
    if (selectedAsset.id === cameraLookAtBearing?.cameraId) return EMPTY_FC;
    const ring = fovPolygon(
      selectedAsset.latitude, selectedAsset.longitude,
      selectedAsset.fovDeg, selectedAsset.bearingDeg,
      FOV_RADIUS_M
    );
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
        properties: { offline: offlineAssetIds.includes(selectedAsset.id) ? 1 : 0 },
      }],
    };
  }, [selectedAsset, cameraLookAtBearing?.cameraId, offlineAssetIds]);

  useEffect(() => {
    pushFovToMap('hover-fov', hoverFovGeoJSON);
  }, [hoverFovGeoJSON, pushFovToMap]);

  useEffect(() => {
    pushFovToMap('selected-fov', selectedFovGeoJSON);
  }, [selectedFovGeoJSON, pushFovToMap]);

  useEffect(() => {
    pushFovToMap('card-hover-fov', highlightedFovGeoJSON);
  }, [highlightedFovGeoJSON, pushFovToMap]);

  // ── Aggregated FeatureCollections for per-entity overlays ──────────────
  // Previously each target/drone had its own <Source>, which caused Mapbox
  // to add/remove sources on join/leave (expensive flicker). Now we batch
  // them into one FeatureCollection per category.

  const targetTrailsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: uniqueTargets
      .filter(t => t.entityStage === 'classified' && t.trail && t.trail.length >= 2)
      .map(t => ({
        type: 'Feature' as const,
        properties: { id: t.id },
        geometry: { type: 'LineString' as const, coordinates: t.trail!.map(p => [p.lon, p.lat]) },
      })),
  }), [uniqueTargets]);

  const friendlyTrailsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: friendlyDrones
      .filter(d => d.trail && d.trail.length >= 2)
      .map(d => ({
        type: 'Feature' as const,
        properties: { id: d.id },
        geometry: { type: 'LineString' as const, coordinates: d.trail!.map(([lat, lon]) => [lon, lat]) },
      })),
  }), [friendlyDrones]);

  const friendlyFovGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: friendlyDrones
      .filter(d =>
        d.headingDeg != null &&
        !offlineAssetIds.includes(d.id) &&
        (d.id === hoveredFriendlyDroneId || d.id === selectedAssetId || d.id === hoveredSensorIdFromCard)
      )
      .map(d => {
        const ring = fovPolygon(d.lat, d.lon, d.fovDeg ?? DRONE_FOV_DEG, d.headingDeg!, DRONE_FOV_RADIUS_M);
        return {
          type: 'Feature' as const,
          properties: { id: d.id },
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
        };
      }),
  }), [friendlyDrones, offlineAssetIds, hoveredFriendlyDroneId, selectedAssetId, hoveredSensorIdFromCard]);

  return (
    <div ref={mapContainerRef} className={`absolute inset-0 min-h-0 min-w-0 bg-[#0a0a0a] overflow-hidden z-0 ${planningMode ? 'cursor-crosshair' : ''}`}>

      {/* Planning mode overlay banner */}
      {planningMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-violet-500/15 shadow-[0_0_0_1px_rgba(139,92,246,0.3),0_10px_15px_-3px_rgba(0,0,0,0.3)] backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[12px] font-medium text-violet-200">לחץ על המפה להוספת נקודות ציון</span>
          </div>
        </div>
      )}

      {mapMountReady ? (
      <Map
        ref={mapRef}
        {...viewState}
        onLoad={(e) => {
          const map = e.target;
          map.resize();
          map.once('idle', () => {
            map.resize();
            map.triggerRepaint?.();
            hideMapLabels(map);
          });
          map.on('styledata', () => {
            hideMapLabels(map);
            ensureFovSource(map, 'hover-fov');
            ensureFovSource(map, 'card-hover-fov');
          });
          ensureFovSource(map, 'hover-fov');
          ensureFovSource(map, 'card-hover-fov');
        }}
        onMove={evt => setViewState(prev => ({ ...evt.viewState, transitionDuration: 0 }))}
        onClick={(evt) => {
          if (planningMode && onMapClick) {
            onMapClick(evt.lngLat.lat, evt.lngLat.lng);
          }
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        mapStyle={mapStyleId === 'satellite' ? 'mapbox://styles/mapbox/satellite-v9' : 'mapbox://styles/mapbox/dark-v11'}
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        cursor={planningMode ? 'crosshair' : undefined}
        reuseMaps
        antialias={false}
        renderWorldCopies={false}
        maxTileCacheSize={50}
      >
        {/* Navigation Control (Zoom/Compass) */}
        <div className="absolute top-24 left-4">
             <NavigationControl position="top-left" showCompass={true} showZoom={true} visualizer="dark" />
        </div>

        {/* Map style toggle */}
        <div className="absolute top-4 left-4 z-10">
          <div className="flex rounded overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.1)] text-[10px] font-medium">
            <button
              onClick={() => setMapStyleId('dark')}
              className={`px-2.5 py-1.5 transition-colors ${mapStyleId === 'dark' ? 'bg-white/15 text-white' : 'bg-black/60 text-zinc-400 hover:text-zinc-200'}`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyleId('satellite')}
              className={`px-2.5 py-1.5 transition-colors border-l border-white/10 ${mapStyleId === 'satellite' ? 'bg-white/15 text-white' : 'bg-black/60 text-zinc-400 hover:text-zinc-200'}`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* hover-fov and card-hover-fov sources/layers are managed imperatively via ensureFovSource + pushFovToMap */}

        {/* Post-jam verification: camera FOV cone pointing at target (hidden when camera look-at is active to avoid duplicates) */}
        {verificationFovGeoJSON && jammingVerification?.method === 'camera' && !cameraLookAtBearing && (
          <Source id="jam-verification-fov" type="geojson" data={verificationFovGeoJSON}>
            <Layer
              id="jam-verification-fov-fill"
              type="fill"
              paint={{
                'fill-color': 'rgba(34, 197, 94, 0.35)',
                'fill-outline-color': 'rgba(34, 197, 94, 1.0)',
              }}
            />
            <Layer
              id="jam-verification-fov-line"
              type="line"
              paint={{
                'line-color': 'rgba(34, 197, 94, 0.9)',
                'line-width': 2,
              }}
            />
          </Source>
        )}

        {/* Camera Look-At FOV cone (animated rotation) */}
        {cameraLookAtFovGeoJSON && (
          <Source id="camera-lookat-fov" type="geojson" data={cameraLookAtFovGeoJSON}>
            <Layer
              id="camera-lookat-fov-fill"
              type="fill"
              paint={{
                'fill-color': 'rgba(6, 182, 212, 0.32)',
                'fill-outline-color': 'rgba(6, 182, 212, 1.0)',
              }}
            />
            <Layer
              id="camera-lookat-fov-line"
              type="line"
              paint={{
                'line-color': 'rgba(6, 182, 212, 0.9)',
                'line-width': 2,
              }}
            />
          </Source>
        )}

        {/* Missile paths (stronger, always on while in flight) + distance & ETA label */}
        {activeMissiles.map(missile => {
          const p = pulsedProgress(missile.progress);
          const currentLat = missile.startLat + (missile.endLat - missile.startLat) * p;
          const currentLon = missile.startLon + (missile.endLon - missile.startLon) * p;
          const pathGeoJSON = {
            type: 'FeatureCollection' as const,
            features: [
              {
                type: 'Feature' as const,
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [currentLon, currentLat],
                    [missile.endLon, missile.endLat],
                  ],
                },
                properties: {},
              },
            ],
          };
          const distanceM = haversineDistanceM(currentLat, currentLon, missile.endLat, missile.endLon);
          const distanceKm = distanceM / 1000;
          const secondsToHit = Math.max(0, (1 - missile.progress) * (missile.durationMs / 1000));
          const midLat = (currentLat + missile.endLat) / 2;
          const midLon = (currentLon + missile.endLon) / 2;
          return (
            <React.Fragment key={`missile-path-wrap-${missile.id}`}>
              <Source key={`missile-path-${missile.id}`} id={`missile-path-${missile.id}`} type="geojson" data={pathGeoJSON}>
                <Layer
                  id={`missile-line-${missile.id}`}
                  type="line"
                  paint={{
                    'line-color': '#15FFF6',
                    'line-width': 3,
                  }}
                />
              </Source>
              <Marker latitude={midLat} longitude={midLon} anchor="center">
                <div className={`${TELEMETRY_BASE} ${TELEMETRY_SHADOW_CYAN} text-cyan-200`}>
                  <span>{distanceKm.toFixed(1)} km</span>
                  <span className="text-white/70 mx-1">·</span>
                  <span>{secondsToHit.toFixed(1)}s</span>
                </div>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Jamming: trail line + moving drone marker (replaces static target marker for jamming target) */}
        {jammingDroneState && jammingDroneState.trail.length >= 2 && (
          <Source
            id="jamming-drone-trail"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: jammingDroneState.trail.map(([lat, lon]) => [lon, lat]),
              },
            }}
          >
            <Layer
              id="jamming-drone-trail-line"
              type="line"
              paint={{
                'line-color': 'rgba(107, 114, 128, 0.7)',
                'line-width': 2,
                'line-dasharray': [2, 1],
              }}
            />
          </Source>
        )}
        {jammingDroneState && (
          <Marker
            key="jamming-drone-marker"
            latitude={jammingDroneState.lat}
            longitude={jammingDroneState.lon}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              if (jammingTargetId) onMarkerClick?.(jammingTargetId);
            }}
          >
            <div className="relative cursor-pointer scale-125 z-50" style={{ transformOrigin: 'center center' }}>
              {/* Jammed state: greyed-out ring and disabled drone icon pointing in direction of movement */}
              <div className="absolute inset-0 w-full h-full rounded-full bg-gray-500/40 border-2 border-dashed border-gray-400 scale-150" style={{ transformOrigin: 'center center' }} />
              <DroneIcon
                rotationDeg={jammingDroneHeadingDeg}
                disabled
              />
            </div>
          </Marker>
        )}

        {/* Post-jam verification: camera scan at target */}
        {verificationTargetCoords && jammingVerification?.method === 'camera' && (
          <Marker
            latitude={verificationTargetCoords.lat}
            longitude={verificationTargetCoords.lon}
            anchor="center"
          >
            <div className="flex flex-col items-center gap-1 pointer-events-none">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 border-2 border-emerald-400 animate-ping scale-150" style={{ animationDuration: '1.5s' }} />
              <div className="relative flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 backdrop-blur-md shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_4px_12px_rgba(0,0,0,0.4)]">
                <Camera size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-200 whitespace-nowrap">מצלמה מפנה לאימות</span>
              </div>
            </div>
          </Marker>
        )}

        {/* Post-jam verification: drone en route to target + verified badge when arrived */}
        {verificationTargetCoords && jammingVerification?.method === 'drone' && verificationDroneStart && (
          <>
            <Source
              id="jam-verification-drone-path"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [verificationDroneStart.startLon, verificationDroneStart.startLat],
                    [verificationTargetCoords.lon, verificationTargetCoords.lat],
                  ],
                },
              }}
            >
              <Layer
                id="jam-verification-drone-path-line"
                type="line"
                paint={{
                  'line-color': 'rgba(251, 191, 36, 0.7)',
                  'line-width': 2,
                  'line-dasharray': [2, 1],
                }}
              />
            </Source>
            <Marker
              latitude={
                verificationDroneStart.startLat +
                (verificationTargetCoords.lat - verificationDroneStart.startLat) * verificationDroneProgress
              }
              longitude={
                verificationDroneStart.startLon +
                (verificationTargetCoords.lon - verificationDroneStart.startLon) * verificationDroneProgress
              }
              anchor="center"
            >
              <div className="relative scale-110 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                <DroneIcon
                  rotationDeg={bearingDegrees(
                    verificationDroneStart.startLat, verificationDroneStart.startLon,
                    verificationTargetCoords.lat, verificationTargetCoords.lon
                  ) - 90}
                  disabled={false}
                />
              </div>
            </Marker>
            {verificationDroneProgress >= 1 && (
              <Marker latitude={verificationTargetCoords.lat} longitude={verificationTargetCoords.lon} anchor="center">
                <div className="flex flex-col items-center gap-1 pointer-events-none animate-in fade-in duration-300">
                  <div className="rounded-full bg-amber-500/20 border-2 border-amber-400 p-1.5">
                    <CheckCircle2 size={20} className="text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-amber-200 whitespace-nowrap px-2 py-1 rounded bg-black/60 backdrop-blur-md shadow-[0_0_0_1px_rgba(245,158,11,0.4),0_4px_12px_rgba(0,0,0,0.4)]">אומת שיבוש</span>
                </div>
              </Marker>
            )}
          </>
        )}

        {/* Engagement lines — driven by flow config */}
        {[
          { flow: JAM_FLOW, pair: jamPair, particles: jamParticleGeoJson },
          { flow: WEAPON_FLOW, pair: weaponPair, particles: weaponParticleGeoJson },
        ].map(({ flow, pair, particles }) => {
          if (!pair) return null;
          const lineColor = flow.lineColor(pair.phase);
          const textColor = flow.badgeTextColor(pair.phase);
          const prefix = `${flow.id}-engagement`;
          return (
            <React.Fragment key={flow.id}>
              <Source id={`${prefix}-line`} type="geojson" data={{
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [pair.fromLon, pair.fromLat],
                    [pair.toLon, pair.toLat],
                  ],
                },
              }}>
                <Layer
                  id={`${flow.id}-engagement-line-dash`}
                  type="line"
                  paint={{ 'line-color': lineColor, 'line-width': 2, 'line-dasharray': [4, 4] }}
                />
              </Source>
              <Source id={`${prefix}-particles`} type="geojson" data={particles}>
                <Layer
                  id={`${prefix}-particle-glow`}
                  type="circle"
                  paint={{ 'circle-radius': 14, 'circle-color': lineColor, 'circle-opacity': 0.225, 'circle-blur': 1 }}
                />
                <Layer
                  id={`${prefix}-particle-core`}
                  type="circle"
                  paint={{ 'circle-radius': 4, 'circle-color': lineColor, 'circle-opacity': 0.9 }}
                />
              </Source>
              <Marker
                latitude={(pair.toLat + pair.fromLat) / 2}
                longitude={(pair.toLon + pair.fromLon) / 2}
                anchor="center"
              >
                <div
                  className="rounded px-2 py-1 font-mono text-xs tabular-nums whitespace-nowrap pointer-events-none select-none shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  style={{ backgroundColor: lineColor, color: textColor }}
                >
                  {pair.distanceM < 1000 ? `${Math.round(pair.distanceM)}m` : `${(pair.distanceM / 1000).toFixed(1)} km`}
                </div>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Dynamic Target Markers */}
        {/* Aggregated target trail lines for classified entities (single Source) */}
        {targetTrailsGeoJSON.features.length > 0 && (
          <Source id="target-trails" type="geojson" data={targetTrailsGeoJSON}>
            <Layer id="target-trails-casing" type="line" paint={TRAIL_CASING_PAINT} />
            <Layer id="target-trails-line" type="line" paint={TRAIL_LINE_PAINT} />
          </Source>
        )}

        {uniqueTargets.map(target => {
            const [lat, lon] = target.coordinates.split(',').map(c => parseFloat(c.trim()));
            if (isNaN(lat) || isNaN(lon)) return null;
            if (target.id === jammingTargetId) return null;
            if (target.flowType === 4) return null;

            const isActive = target.id === activeTargetId;
            const isHoveredFromCard = target.id === hoveredTargetIdFromCard;
            const isHoveredTarget = target.id === hoveredTargetId;
            const stage = target.entityStage;
            const isCritical = target.status === 'detection' || target.status === 'event';
            const isClassified = stage === 'classified';
            const isBird = target.classifiedType === 'bird';
            const isDrone = target.classifiedType === 'drone';
            const isMitigating = target.mitigationStatus === 'mitigating';
            const isMitigated = target.mitigationStatus === 'mitigated';
            const isExpiredCuas = target.status === 'expired' && !!target.entityStage;

            const showPulse = !isExpiredCuas && (isMitigating || (stage === 'raw_detection' && !isClassified));
            const pulseColor = isMitigating ? 'bg-red-500' : 'bg-amber-500';

            let droneHeadingDeg = 0;
            if (isDrone && target.trail && target.trail.length >= 2) {
              const t = target.trail;
              const p0 = t[t.length - 2];
              const p1 = t[t.length - 1];
              droneHeadingDeg = bearingDegrees(p0.lat, p0.lon, p1.lat, p1.lon);
            }

            const targetAffiliation: Affiliation =
              isBird ? 'unknown' :
              isClassified || isCritical ? 'hostile' :
              'possibleThreat';

            const targetState: InteractionState =
              isExpiredCuas ? 'expired' :
              isMitigated ? 'disabled' :
              isMitigating ? 'active' :
              isActive || isHoveredFromCard ? 'selected' :
              isHoveredTarget ? 'hovered' :
              'default';

            const targetStyle = resolveMarkerStyle(targetState, targetAffiliation);

            const isCar = target.classifiedType === 'car';
            const targetGlyph = isClassified && isDrone
              ? <DroneIcon rotationDeg={droneHeadingDeg - 90} color={targetStyle.glyphColor} disabled={isMitigated} />
              : isClassified && isCar
              ? <CarIcon color={targetStyle.glyphColor} size={26} />
              : <div className="w-2.5 h-2.5 rounded-full" style={{ background: targetStyle.glyphColor }} />;

            const targetSurfaceSize = isExpiredCuas ? 24 : isClassified ? 32 : 28;
            const targetRingSize = isExpiredCuas ? 20 : isClassified ? 26 : 22;

            return (
                <Marker
                    key={target.id}
                    longitude={lon}
                    latitude={lat}
                    anchor="center"
                    onClick={(e) => {
                        e.originalEvent.stopPropagation();
                        onMarkerClick?.(target.id);
                    }}
                >
                    <ContextMenu>
                    <ContextMenuTrigger asChild>
                    <div
                      className={`relative group cursor-pointer transition-all duration-200 ${isActive || isHoveredFromCard ? 'z-50' : 'z-10'}`}
                    >
                        {showPulse && (
                            <div className={`absolute -inset-3 rounded-full opacity-40 animate-ping ${pulseColor}`} />
                        )}

                        <MapMarker
                          icon={targetGlyph}
                          style={targetStyle}
                          surfaceSize={targetSurfaceSize}
                          ringSize={targetRingSize}
                          pulse={isActive}
                          label={target.name || target.id}
                          showLabel={!isActive && isHoveredTarget}
                          onMouseEnter={() => setHoveredTargetId(target.id)}
                          onMouseLeave={() => setHoveredTargetId(null)}
                        />

                        {/* Map Info Card — only shown when card is open */}
                        {isClassified ? (
                          <div className={`
                            absolute top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-150 z-[9999]
                            ${isActive ? 'opacity-100' : 'opacity-0'}
                          `}
                            style={{ left: isDrone ? '34px' : '24px' }}
                          >
                            <div className={`
                              ${TARGET_CARD_BASE}
                              ${TOOLTIP_SHADOW}
                            `}>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold truncate max-w-[120px]">{target.name}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`
                            absolute top-1/2 -translate-y-1/2
                            ${TARGET_CARD_BASE} ${TOOLTIP_SHADOW}
                            transition-opacity duration-150 pointer-events-none flex items-center gap-1 z-[9999]
                            ${isActive ? 'opacity-100' : 'opacity-0'}
                          `} style={{ left: '20px' }}>
                            {isExpiredCuas ? (
                              <span className="text-zinc-300">נצפה לאחרונה — {target.lastSeenAt || target.timestamp}</span>
                            ) : stage === 'raw_detection' ? (
                              <span className="text-zinc-300">זיהוי לא ידוע</span>
                            ) : (
                              <>
                                {isCritical ? <ShieldAlert size={12} className="text-red-500" /> : <AlertTriangle size={12} className="text-amber-500" />}
                                <span className="font-mono">{target.name || target.id}</span>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="min-w-[200px]">
                      {target.classifiedType !== 'bird' && target.mitigationStatus !== 'mitigated' && (
                        <>
                          <ContextMenuItem onSelect={() => onContextMenuAction?.('mitigate', 'target', target.id)}>
                            <JamWaveIcon size={16} />
                            שיבוש
                          </ContextMenuItem>
                          <ContextMenuItem onSelect={() => onContextMenuAction?.('mitigate-all', 'target', target.id)}>
                            <Radio className="size-4" />
                            שיבוש כללי
                          </ContextMenuItem>
                        </>
                      )}
                      {target.mitigationStatus === 'mitigated' && (
                        <ContextMenuItem onSelect={() => onContextMenuAction?.('investigate', 'target', target.id)}>
                          <Search className="size-4" />
                          תחקור
                        </ContextMenuItem>
                      )}
                      <ContextMenuItem onSelect={() => onContextMenuAction?.('track', 'target', target.id)}>
                        <Eye className="size-4" />
                        מעקב
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => onContextMenuAction?.('open-card', 'target', target.id)}>
                        <Maximize2 className="size-4" />
                        פתח כרטיס
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onSelect={() => {
                        navigator.clipboard.writeText(target.coordinates);
                      }}>
                        <MapPin className="size-4" />
                        העתק מיקום
                      </ContextMenuItem>
                      <ContextMenuItem variant="destructive" onSelect={() => onContextMenuAction?.('dismiss', 'target', target.id)}>
                        <X className="size-4" />
                        ביטול
                      </ContextMenuItem>
                    </ContextMenuContent>
                    </ContextMenu>
                </Marker>
            );
        })}

        {/* Unified coverage rings for all engagement flow assets */}
        {(() => {
          type CoverageRing = { key: string; lat: number; lon: number; radiusM: number; fovDeg: number; bearing: number; fillColor: string; fillOpacity: number; lineColor: string; lineWidth: number; lineDash: number[]; lineOpacity: number };
          const rings: CoverageRing[] = [];
          const WEAPON_FOV_DEG = 135;

          const launchersToRender = launcherEffectors.length > 0
            ? launcherEffectors
            : LAUNCHER_ASSETS.map(a => ({ id: a.id, name: 'משגר טילים', lat: a.latitude, lon: a.longitude, status: 'available' as const }));
          for (const launcher of launchersToRender) {
            const isHovered = hoveredLauncherId === launcher.id;
            const isHoveredFromCard = launcher.id === hoveredSensorIdFromCard;
            const isSelected = launcher.id === selectedAssetId;
            const isEngaged = weaponPair?.assetId === launcher.id;
            const isPointing = launcher.status === 'pointing';
            const isLocked = launcher.status === 'locked';
            if (!isHovered && !isHoveredFromCard && !isSelected && !isEngaged && !isPointing && !isLocked) continue;
            const isActive = isPointing || isLocked;
            const color = isLocked ? '#ef4444' : WEAPON_FLOW.coverageColor;
            const targetBearing = (isActive || isEngaged) && weaponPair
              ? bearingDegrees(launcher.lat, launcher.lon, weaponPair.toLat, weaponPair.toLon)
              : 0;
            rings.push({
              key: `launcher-${launcher.id}`, lat: launcher.lat, lon: launcher.lon, radiusM: FOV_RADIUS_M,
              fovDeg: isActive ? WEAPON_FOV_DEG : 360,
              bearing: targetBearing,
              fillColor: color, fillOpacity: isActive ? 0.3 : 0.15,
              lineColor: color, lineWidth: isActive ? 1.5 : 2, lineDash: isActive ? [1, 0] : [4, 4], lineOpacity: 1,
            });
          }

          for (const reg of regulusEffectors) {
            const isHovered = hoveredRegulusId === reg.id;
            const isActive = reg.status === 'active';
            const isHoveredFromCard = reg.id === hoveredSensorIdFromCard;
            const isEngaged = jamPair?.assetId === reg.id;
            const isSelected = reg.id === selectedAssetId;
            const isOffline = offlineAssetIds.includes(reg.id);
            const dim = OFFLINE_FOV_DIMMING_ENABLED && isOffline;
            if (!isHovered && !isActive && !isHoveredFromCard && !isEngaged && !isSelected) continue;
            const color = dim ? '#a1a1aa' : isActive ? '#4ade80' : JAM_FLOW.coverageColor;
            rings.push({
              key: `reg-${reg.id}`, lat: reg.lat, lon: reg.lon, radiusM: reg.coverageRadiusM,
              fovDeg: 360, bearing: 0,
              fillColor: color, fillOpacity: dim ? 0.08 : (isActive ? 0.4 : 0.2),
              lineColor: color, lineWidth: dim ? 1 : (isActive ? 1.5 : 2), lineDash: isActive ? [1, 0] : [4, 4], lineOpacity: dim ? 0.3 : 1,
            });
          }

          return rings.map(r => {
            const ring = fovPolygon(r.lat, r.lon, r.fovDeg, r.bearing, r.radiusM);
            return (
              <Source key={`coverage-${r.key}`} id={`coverage-${r.key}`} type="geojson" data={{
                type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] },
              }}>
                <Layer id={`coverage-fill-${r.key}`} type="fill" paint={{ 'fill-color': r.fillColor, 'fill-opacity': r.fillOpacity }} />
                <Layer id={`coverage-line-${r.key}`} type="line" paint={{
                  'line-color': r.lineColor, 'line-width': r.lineWidth, 'line-dasharray': r.lineDash, 'line-opacity': r.lineOpacity,
                }} />
              </Source>
            );
          });
        })()}

        {/* Missile launcher markers — use dynamic launcherEffectors when provided, fallback to static */}
        {(launcherEffectors.length > 0 ? launcherEffectors : LAUNCHER_ASSETS.map(a => ({ id: a.id, name: 'משגר טילים', lat: a.latitude, lon: a.longitude, status: 'available' as const }))).map(launcher => {
          const isHoveredFromCard = launcher.id === hoveredSensorIdFromCard;
          const isHovered = hoveredLauncherId === launcher.id;
          const isOffline = offlineAssetIds.includes(launcher.id) || launcher.status === 'inactive';
          const isSelected = launcher.id === selectedAssetId;
          const isPointing = launcher.status === 'pointing';
          const isLocked = launcher.status === 'locked';
          const isEngaged = weaponPair?.assetId === launcher.id;
          const launcherBearing = isEngaged && weaponPair
            ? bearingDegrees(launcher.lat, launcher.lon, weaponPair.toLat, weaponPair.toLon)
            : launcher.bearingDeg;
          const markerState: InteractionState =
            isOffline ? 'disabled' :
            isLocked ? 'weaponLocked' :
            isPointing ? 'weaponPointing' :
            isSelected || isEngaged ? 'selected' :
            isHovered || isHoveredFromCard ? 'hovered' :
            'default';
          const style = resolveMarkerStyle(markerState, 'friendly');
          const label = isOffline ? `${launcher.name} — לא מקוון`
            : isLocked ? `${launcher.name} — נעול`
            : isPointing ? `${launcher.name} — מכוון`
            : launcher.name;
          return (
            <Marker
              key={launcher.id}
              longitude={launcher.lon}
              latitude={launcher.lat}
              anchor="bottom"
            >
              <div
                onMouseEnter={() => setHoveredLauncherId(launcher.id)}
                onMouseLeave={() => setHoveredLauncherId(null)}
                onClick={(e) => { e.stopPropagation(); onAssetClick?.(launcher.id); }}
              >
                <MapMarker
                  icon={<LauncherIcon fill={style.glyphColor} />}
                  style={style}
                  surfaceSize={36}
                  ringSize={28}
                  pulse={isSelected || isPointing || isEngaged}
                  heading={launcherBearing}
                  label={label}
                  showLabel={isHovered || isSelected || isHoveredFromCard || isPointing || isLocked || isEngaged}
                />
              </div>
            </Marker>
          );
        })}

        {/* Regulus effector markers — same visual as sensor assets */}
        {regulusEffectors.map(reg => {
          const isHovered = hoveredRegulusId === reg.id;
          const isActive = reg.status === 'active';
          const isHoveredFromCard = reg.id === hoveredSensorIdFromCard;
          const isEngaged = jamPair?.assetId === reg.id;
          const isOffline = offlineAssetIds.includes(reg.id);
          const isSelected = reg.id === selectedAssetId;
          return (
            <Marker key={reg.id} longitude={reg.lon} latitude={reg.lat} anchor="bottom">
              <ContextMenu>
              <ContextMenuTrigger asChild>
              <div
                onMouseEnter={() => setHoveredRegulusId(reg.id)}
                onMouseLeave={() => setHoveredRegulusId(null)}
                onClick={(e) => { e.stopPropagation(); onAssetClick?.(reg.id); }}
              >
                {(() => {
                  const markerState: InteractionState =
                    isOffline ? 'disabled' :
                    isActive ? 'jammer' :
                    isSelected || isEngaged ? 'selected' :
                    isHovered || isHoveredFromCard ? 'hovered' :
                    'default';
                  const style = resolveMarkerStyle(markerState, 'friendly');
                  const showTooltip = (isHovered || isSelected || isActive || isHoveredFromCard || isEngaged) && !isOffline;
                  return (
                    <MapMarker
                      icon={<SensorIcon fill={style.glyphColor} />}
                      style={style}
                      surfaceSize={36}
                      ringSize={28}
                      pulse={isSelected || isEngaged}
                      label={showTooltip ? (isActive ? `${reg.name} — פעיל` : reg.name) : isOffline ? `${reg.name} — לא מקוון` : undefined}
                      showLabel={showTooltip || (isOffline && (isHovered || isSelected))}
                    />
                  );
                })()}
              </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[200px]">
                <ContextMenuLabel>{reg.name}</ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => {
                  if (mapRef.current) { mapRef.current.stop(); mapRef.current.flyTo({ center: [reg.lon, reg.lat], zoom: 16, duration: 800 }); }
                }}>
                  <Compass className="size-4" />
                  הצג במפה
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => {
                  setHoveredRegulusId(prev => prev === reg.id ? null : reg.id);
                }}>
                  <Circle className="size-4" />
                  הצג כיסוי
                </ContextMenuItem>
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('activate', 'effector', reg.id)}>
                  <JamWaveIcon size={16} />
                  הפעל שיבוש
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('mute-alerts', 'effector', reg.id)}>
                  <BellOff className="size-4" />
                  השתקת התראות
                </ContextMenuItem>
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('settings', 'effector', reg.id)}>
                  <Settings className="size-4" />
                  הגדרות מתקדמות
                </ContextMenuItem>
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('calibrate', 'effector', reg.id)}>
                  <Wrench className="size-4" />
                  כיול
                </ContextMenuItem>
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('edit', 'effector', reg.id)}>
                  <ExternalLink className="size-4" />
                  עריכת מערכת
                </ContextMenuItem>
              </ContextMenuContent>
              </ContextMenu>
            </Marker>
          );
        })}

        {/* Map assets (sensors, cameras, radar, drone hives) with hover + detection highlighting + card hover */}
        {ALL_RENDERABLE_ASSETS.map(asset => {
          const Icon = asset.Icon;
          const isHovered = hoveredAsset?.id === asset.id;
          const isHighlighted = highlightedSensorIds.includes(asset.id) || asset.id === hoveredSensorIdFromCard;
          const isHoveredFromCard = asset.id === hoveredSensorIdFromCard;
          const isJammerActive = asset.id === jammingJammerAssetId;
          const isSelected = asset.id === selectedAssetId;
          const isFlickering = asset.id === flickeringSensorId;
          const isCamera = asset.typeLabel === 'Camera';
          const isInUse = asset.id === cameraLookAtBearing?.cameraId || asset.id === jammingJammerAssetId || (asset.id === verificationCameraAsset?.id && !!jammingVerification);
          const isOffline = offlineAssetIds.includes(asset.id);
          return (
            <Marker
              key={asset.id}
              longitude={asset.longitude}
              latitude={asset.latitude}
              anchor="bottom"
            >
              <ContextMenu>
              <ContextMenuTrigger asChild>
              <div
                onMouseEnter={() => handleAssetMouseEnter(asset)}
                onMouseLeave={handleAssetMouseLeave}
                onClick={(e) => { e.stopPropagation(); onAssetClick?.(asset.id); }}
              >
                {(() => {
                  const markerState: InteractionState =
                    isOffline ? 'disabled' :
                    isJammerActive ? 'jammer' :
                    isFlickering ? 'alert' :
                    isSelected ? 'selected' :
                    isHovered || isHighlighted || isHoveredFromCard ? 'hovered' :
                    'default';
                  const style = resolveMarkerStyle(markerState, 'friendly');
                  return (
                    <MapMarker
                      icon={<Icon fill={style.glyphColor} />}
                      style={style}
                      surfaceSize={36}
                      ringSize={28}
                      pulse={isSelected}
                      label={isOffline ? `${asset.typeLabel} — לא מקוון` : asset.typeLabel}
                      showLabel={isHovered || isSelected || isHighlighted || isInUse || (isOffline && (isHovered || isSelected || isHighlighted))}
                    />
                  );
                })()}
              </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[200px]">
                <ContextMenuLabel>{asset.typeLabel} — {asset.id}</ContextMenuLabel>
                <ContextMenuSeparator />
                {isCamera && (
                  <>
                    <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('show-video', 'sensor', asset.id)}>
                      <Maximize2 className="size-4" />
                      הצג שידור
                    </ContextMenuItem>
                    <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('view-feed', 'sensor', asset.id)}>
                      <Video className="size-4" />
                      צפייה בפאנל מצלמות
                    </ContextMenuItem>
                  </>
                )}
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('open-tab', 'sensor', asset.id)}>
                  <ExternalLink className="size-4" />
                  צפייה בכרטיסייה חדשה
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => {
                  if (mapRef.current) { mapRef.current.stop(); mapRef.current.flyTo({ center: [asset.longitude, asset.latitude], zoom: 16, duration: 800 }); }
                }}>
                  <Compass className="size-4" />
                  הצג במפה
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => {
                  setHoveredAsset(prev => prev?.id === asset.id ? null : asset);
                }}>
                  <Circle className="size-4" />
                  הצג כיסוי
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('mute-alerts', 'sensor', asset.id)}>
                  <BellOff className="size-4" />
                  השתקת התראות
                </ContextMenuItem>
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('settings', 'sensor', asset.id)}>
                  <Settings className="size-4" />
                  הגדרות מתקדמות
                </ContextMenuItem>
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('calibrate', 'sensor', asset.id)}>
                  <Wrench className="size-4" />
                  כיול
                </ContextMenuItem>
                <ContextMenuItem disabled={isOffline} onSelect={() => onContextMenuAction?.('edit', 'sensor', asset.id)}>
                  <ExternalLink className="size-4" />
                  עריכת מערכת
                </ContextMenuItem>
              </ContextMenuContent>
              </ContextMenu>
            </Marker>
          );
        })}

        {/* Missile icons (live position with pulse, hover for info) */}
        {activeMissiles.map(missile => {
          const p = pulsedProgress(missile.progress);
          const lat = missile.startLat + (missile.endLat - missile.startLat) * p;
          const lon = missile.startLon + (missile.endLon - missile.startLon) * p;
          const isHovered = hoveredMissileId === missile.id;
          const missileBearing = bearingDegrees(missile.startLat, missile.startLon, missile.endLat, missile.endLon);
          return (
            <Marker
              key={`missile-marker-${missile.id}`}
              latitude={lat}
              longitude={lon}
              anchor="center"
            >
              <div
                className={`relative cursor-pointer rounded-full p-1 transition-all duration-150 ${isHovered ? 'bg-white/[0.08]' : ''}`}
                onMouseEnter={() => setHoveredMissileId(missile.id)}
                onMouseLeave={() => setHoveredMissileId(null)}
              >
                {isHovered && (
                  <div className={TOOLTIP_HOVER_CYAN}>
                    <div>טיל לאיתור {missile.targetId}</div>
                    <div className="text-xs text-white/70 mt-0.5">
                      התקדמות {(missile.progress * 100).toFixed(0)}%
                    </div>
                  </div>
                )}
                <div className="drop-shadow-[0_0_10px_rgba(21,255,246,0.9)] animate-missile-pulse">
                  <MissileIcon rotationDeg={missileBearing + 90} />
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Flow 4: Mission route rendering */}
        {missionRoute && (
          <>
            {/* Full route polyline */}
            {missionRoute.waypoints.length >= 2 && (
            <Source
              id="flow4-route"
              type="geojson"
              data={{
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    ...missionRoute.waypoints.map(w => [w.lon, w.lat]),
                    ...(missionRoute.loop && missionRoute.waypoints.length > 0 ? [[missionRoute.waypoints[0].lon, missionRoute.waypoints[0].lat]] : []),
                  ],
                },
              }}
            >
              <Layer
                id="flow4-route-line"
                type="line"
                paint={{
                  'line-color': missionRoute.phase === 'planning' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(167, 139, 250, 0.35)',
                  'line-width': 2,
                  'line-dasharray': missionRoute.phase === 'planning' ? [4, 3] : [1, 0],
                }}
              />
            </Source>
            )}

            {/* Trail */}
            {missionRoute.trail.length >= 2 && (
              <Source
                id="flow4-trail"
                type="geojson"
                data={{
                  type: 'Feature' as const,
                  properties: {},
                  geometry: {
                    type: 'LineString' as const,
                    coordinates: missionRoute.trail,
                  },
                }}
              >
                <Layer
                  id="flow4-trail-line"
                  type="line"
                  paint={{
                    'line-color': 'rgba(167, 139, 250, 0.15)',
                    'line-width': 1.5,
                  }}
                />
              </Source>
            )}

            {/* Waypoint markers */}
            {missionRoute.waypoints.map((wp, idx) => {
              const isActive = missionRoute.phase !== 'planning' && idx === missionRoute.currentSegment;
              const isVisited = missionRoute.phase !== 'planning' && idx < missionRoute.currentSegment;
              return (
                <Marker key={`wp-${idx}`} latitude={wp.lat} longitude={wp.lon} anchor="center">
                  <div className="relative group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all ${
                      isActive ? 'border-violet-400 bg-violet-500/30 text-white scale-125' :
                      isVisited ? 'border-violet-400/40 bg-violet-500/10 text-violet-300/60' :
                      'border-violet-400/60 bg-black/70 text-violet-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className={`${TOOLTIP_BASE} shadow-[0_0_0_1px_rgba(167,139,250,0.3),0_4px_12px_rgba(0,0,0,0.4)] ${TOOLTIP_POS_ABOVE} font-mono text-violet-200 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      {wp.label}
                    </div>
                  </div>
                </Marker>
              );
            })}

            {/* Drone marker (when active) */}
            {missionRoute.phase !== 'planning' && (
              <Marker latitude={missionRoute.droneLat} longitude={missionRoute.droneLon} anchor="center">
                <div className={`relative ${missionRoute.phase === 'paused' || missionRoute.phase === 'override' ? 'opacity-60' : ''}`}
                     style={{ filter: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.5))' }}>
                  <DroneIcon rotationDeg={missionRoute.headingDeg - 90} disabled={missionRoute.phase === 'paused'} />
                </div>
              </Marker>
            )}
          </>
        )}

        {/* Camera scan bearing lines during planning */}
        {planningScanViz && planningScanViz.bearings.length > 0 && (
          <Source
            id="camera-scan-lines"
            type="geojson"
            data={{
              type: 'FeatureCollection' as const,
              features: planningScanViz.bearings.map((bearing, idx) => {
                const distKm = 0.4;
                const bearingRad = (bearing * Math.PI) / 180;
                const endLat = planningScanViz.cameraLat + (distKm / 111.32) * Math.cos(bearingRad);
                const endLon = planningScanViz.cameraLon + (distKm / (111.32 * Math.cos(planningScanViz.cameraLat * Math.PI / 180))) * Math.sin(bearingRad);
                return {
                  type: 'Feature' as const,
                  properties: { idx },
                  geometry: {
                    type: 'LineString' as const,
                    coordinates: [
                      [planningScanViz.cameraLon, planningScanViz.cameraLat],
                      [endLon, endLat],
                    ],
                  },
                };
              }),
            }}
          >
            <Layer
              id="camera-scan-lines-layer"
              type="line"
              paint={{
                'line-color': 'rgba(167, 139, 250, 0.5)',
                'line-width': 1.5,
                'line-dasharray': [4, 3],
              }}
            />
          </Source>
        )}

        {/* Flow 3: Active drone deployment */}
        {activeDrone && (
          <>
            <Source
              id="flow3-drone-path"
              type="geojson"
              data={{
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: activeDrone.phase === 'rtb'
                    ? [[activeDrone.currentLon, activeDrone.currentLat], [activeDrone.hiveLon, activeDrone.hiveLat]]
                    : [[activeDrone.hiveLon, activeDrone.hiveLat], [activeDrone.targetLon, activeDrone.targetLat]],
                },
              }}
            >
              <Layer
                id="flow3-drone-path-line"
                type="line"
                paint={{
                  'line-color': activeDrone.phase === 'rtb' ? 'rgba(161, 161, 170, 0.5)' : 'rgba(6, 182, 212, 0.5)',
                  'line-width': 1.5,
                  'line-dasharray': [4, 3],
                }}
              />
            </Source>

            {activeDrone.trail.length > 1 && (
              <Source
                id="flow3-drone-trail"
                type="geojson"
                data={{
                  type: 'Feature' as const,
                  properties: {},
                  geometry: { type: 'LineString', coordinates: activeDrone.trail },
                }}
              >
                <Layer
                  id="flow3-drone-trail-line"
                  type="line"
                  paint={{
                    'line-color': 'rgba(6, 182, 212, 0.25)',
                    'line-width': 1,
                  }}
                />
              </Source>
            )}

            {(activeDrone.phase === 'on_station' || activeDrone.phase === 'low_battery') && (
              <Source
                id="flow3-loiter-circle"
                type="geojson"
                data={{
                  type: 'Feature' as const,
                  properties: {},
                  geometry: {
                    type: 'Polygon',
                    coordinates: [(() => {
                      const pts: [number, number][] = [];
                      for (let i = 0; i <= 64; i++) {
                        const ang = (i / 64) * Math.PI * 2;
                        pts.push(destination(activeDrone.targetLat, activeDrone.targetLon, 80, (ang * 180) / Math.PI));
                      }
                      return pts;
                    })()],
                  },
                }}
              >
                <Layer
                  id="flow3-loiter-circle-line"
                  type="line"
                  paint={{
                    'line-color': activeDrone.phase === 'low_battery' ? 'rgba(251, 146, 60, 0.5)' : 'rgba(6, 182, 212, 0.3)',
                    'line-width': 1,
                    'line-dasharray': [3, 2],
                  }}
                />
              </Source>
            )}

            <Marker latitude={activeDrone.currentLat} longitude={activeDrone.currentLon} anchor="center">
              <div className={`relative scale-110 ${activeDrone.phase === 'low_battery' ? 'drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]' : 'drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]'}`}>
                <DroneIcon rotationDeg={activeDrone.headingDeg - 90} disabled={activeDrone.phase === 'rtb'} />
              </div>
            </Marker>

            {/* Telemetry label on trajectory */}
            {(activeDrone.phase === 'flying' || activeDrone.phase === 'rtb') && (() => {
              const destLat = activeDrone.phase === 'rtb' ? activeDrone.hiveLat : activeDrone.targetLat;
              const destLon = activeDrone.phase === 'rtb' ? activeDrone.hiveLon : activeDrone.targetLon;
              const distM = haversineDistanceM(activeDrone.currentLat, activeDrone.currentLon, destLat, destLon);
              const distKm = distM / 1000;
              const speedMps = 25;
              const etaSec = Math.max(0, distM / speedMps);
              const midLat = (activeDrone.currentLat + destLat) / 2;
              const midLon = (activeDrone.currentLon + destLon) / 2;
              return (
                <Marker latitude={midLat} longitude={midLon} anchor="center">
                  <div className={`${TELEMETRY_BASE} ${
                    activeDrone.phase === 'rtb'
                      ? `${TELEMETRY_SHADOW_ZINC} text-zinc-300`
                      : `${TELEMETRY_SHADOW_CYAN} text-cyan-200`
                  }`}>
                    <span>{distKm < 1 ? `${Math.round(distM)}m` : `${distKm.toFixed(1)}km`}</span>
                    <span className="text-white/70 mx-1">·</span>
                    <span>{etaSec < 60 ? `${Math.round(etaSec)}s` : `${Math.floor(etaSec / 60)}m${Math.round(etaSec % 60)}s`}</span>
                  </div>
                </Marker>
              );
            })()}

            {activeDrone.phase !== 'rtb' && activeDrone.phase !== 'landed' && (
              <Marker latitude={activeDrone.targetLat} longitude={activeDrone.targetLon} anchor="center">
                <div className="w-5 h-5 rounded-full border-2 border-cyan-400/60 bg-cyan-400/10 animate-ping" style={{ animationDuration: '2s' }} />
              </Marker>
            )}
          </>
        )}

        {/* Aggregated friendly drone trail lines (single Source) */}
        {friendlyTrailsGeoJSON.features.length > 0 && (
          <Source id="friendly-trails" type="geojson" data={friendlyTrailsGeoJSON}>
            <Layer id="friendly-trails-casing" type="line" paint={FRIENDLY_TRAIL_CASING_PAINT} />
            <Layer id="friendly-trails-line" type="line" paint={FRIENDLY_TRAIL_LINE_PAINT} />
          </Source>
        )}

        {/* Aggregated friendly drone FOV cones (single Source, filtered upstream) */}
        {friendlyFovGeoJSON.features.length > 0 && (
          <Source id="friendly-fov" type="geojson" data={friendlyFovGeoJSON}>
            <Layer id="friendly-fov-fill" type="fill" paint={FRIENDLY_FOV_FILL_PAINT} />
            <Layer id="friendly-fov-line" type="line" paint={FRIENDLY_FOV_LINE_PAINT} />
          </Source>
        )}

        {/* Friendly drone markers (cyan, highlight on device card hover) */}
        {friendlyDrones.map(drone => {
          const isHoveredFromCard = drone.id === hoveredSensorIdFromCard;
          const isHovered = drone.id === hoveredFriendlyDroneId;
          const isOffline = offlineAssetIds.includes(drone.id);
          const isSelected = drone.id === selectedAssetId;
          const isDroneStarling = drone.id.startsWith('STARLING-');
          const isConnectedToPathFinder = pathFinderConnectedId === drone.id;

          const markerContent = (() => {
            const droneState: InteractionState =
              isOffline ? 'disabled' :
              isSelected || isHoveredFromCard ? 'selected' :
              isHovered ? 'hovered' :
              'default';
            const droneStyle = resolveMarkerStyle(droneState, 'friendly');
            return (
              <MapMarker
                icon={<DroneIcon color={droneStyle.glyphColor} rotationDeg={(drone.headingDeg ?? 0) - 90} />}
                style={droneStyle}
                surfaceSize={36}
                ringSize={28}
                pulse={isSelected || isConnectedToPathFinder}
                label={`${drone.name}${isConnectedToPathFinder ? ' — PathFinder' : ''}${isOffline ? ' — לא מקוון' : ''}`}
                showLabel={isSelected || isHoveredFromCard || isHovered || isConnectedToPathFinder}
                onMouseEnter={() => setHoveredFriendlyDroneId(drone.id)}
                onMouseLeave={() => setHoveredFriendlyDroneId(null)}
              />
            );
          })();

          if (isDroneStarling && onPathFinderConnect) {
            return (
              <Marker key={drone.id} longitude={drone.lon} latitude={drone.lat} anchor="center">
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div onClick={(e) => { e.stopPropagation(); onAssetClick?.(drone.id); }}>
                      {markerContent}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-[180px]">
                    <ContextMenuItem
                      disabled={isOffline || isConnectedToPathFinder || (pathFinderConnectedId != null)}
                      onSelect={() => onPathFinderConnect(drone.id)}
                    >
                      <Plane className="size-4" />
                      {isConnectedToPathFinder ? 'PathFinder Active' : 'Connect PathFinder'}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => onAssetClick?.(drone.id)}>
                      <Maximize2 className="size-4" />
                      Open Device Card
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </Marker>
            );
          }

          return (
            <Marker key={drone.id} longitude={drone.lon} latitude={drone.lat} anchor="center">
              <div onClick={(e) => { e.stopPropagation(); onAssetClick?.(drone.id); }}>
                {markerContent}
              </div>
            </Marker>
          );
        })}

      </Map>
      ) : null}

      {/* --- Tactical Overlays (Pointer Events None) --- */}

      {/* Grid Background Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Large Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '200px 200px'
        }}
      />

      {/* Decorative Map Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] shadow-[0_0_0_1px_rgba(255,255,255,0.05)] rounded-3xl opacity-20 pointer-events-none flex items-center justify-center">
         <div className="w-full h-full border-x border-white/5" />
      </div>


      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
         <Crosshair size={32} strokeWidth={1} />
      </div>

      {controlIndicator && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900/90 backdrop-blur-md shadow-[0_0_0_1px_rgba(52,211,153,0.6),0_10px_15px_-3px_rgba(0,0,0,0.3),0_0_20px_rgba(52,211,153,0.2)] animate-pulse" style={{ animationDuration: '3s' }}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-sm font-bold text-emerald-200">אתה בשליטה</span>
          </div>
        </div>
      )}

    </div>
  );
};
