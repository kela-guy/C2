import React, { useState, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, NavigationControl, Source, Layer, type MapRef } from 'react-map-gl';
import type { FillLayer } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Crosshair, Map as MapIcon, AlertTriangle, ShieldAlert, Camera, CheckCircle2, Zap, Radio, Search, Eye, MapPin, X, Compass, Circle, Video, Info, Settings, BellOff, Wrench, ExternalLink, Maximize2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '@/app/components/ui/context-menu';
import type { Detection, RegulusEffector } from '@/imports/ListOfSystems';

const TOKEN = 'pk.eyJ1IjoiZ3V5c2hhIiwiYSI6ImNtZ3htODN0dTE2dGMybXFrYWRlZmN5MGMifQ.dIQzO3kIdQaES0pfedlRvA';

const EARTH_RADIUS_M = 6371000;
export const FOV_RADIUS_M = 1200;
const MISSILE_FLIGHT_DURATION_MS = 22000; // slower, more visible flight

/** Haversine distance in metres between two lat/lon points. */
export function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/** Slight pulse/surge on top of linear progress (0..1) for more realistic motion. */
function pulsedProgress(linearProgress: number): number {
  const surge = 0.018 * Math.sin(linearProgress * 35);
  return Math.min(1, Math.max(0, linearProgress + surge));
}

/** Bearing in degrees from (lat1, lon1) to (lat2, lon2). 0 = north, 90 = east. */
export function bearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Destination point from (lat, lon) given distance in meters and bearing in degrees (0 = north). */
function destination(lat: number, lon: number, distM: number, bearingDeg: number): [number, number] {
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distM / EARTH_RADIUS_M;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/** GeoJSON Polygon coordinates [lon, lat][] for FOV cone (or full circle if fovDeg === 360). */
function fovPolygon(lat: number, lon: number, fovDeg: number, bearingDeg: number, radiusM: number): [number, number][] {
  const center: [number, number] = [lon, lat];
  if (fovDeg >= 360) {
    const points: [number, number][] = [center];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * 360;
      points.push(destination(lat, lon, radiusM, angle));
    }
    points.push(center);
    return points;
  }
  const startAngle = bearingDeg - fovDeg / 2;
  const steps = Math.max(8, Math.floor((fovDeg / 360) * 32));
  const points: [number, number][] = [center];
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (fovDeg * i) / steps;
    points.push(destination(lat, lon, radiusM, angle));
  }
  points.push(center);
  return points;
}

/** Simple point-in-polygon check using ray-casting algorithm. Expects ring as [lon, lat][]. */
function pointInPolygon(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
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

const MissileIcon = ({ rotationDeg = 0 }: { rotationDeg?: number }) => (
  <svg
    width="42"
    height="30"
    viewBox="0 0 42 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: `rotate(${rotationDeg}deg)` }}
  >
    <path d="M35.7881 8.51465L33.9658 14.873L33.9268 15.0107L33.9658 15.1484L35.7793 21.4941L34.5547 21.4873C32.4701 19.9119 30.3741 18.3513 28.2656 16.8076L28.1338 16.7119L27.9707 16.7109C26.6359 16.7083 23.6595 16.7249 21.0195 16.7422C19.699 16.7508 18.4618 16.7599 17.5547 16.7666C17.1013 16.7699 16.7303 16.7725 16.4727 16.7744C16.3439 16.7754 16.2431 16.7768 16.1748 16.7773C16.1407 16.7776 16.1142 16.7772 16.0967 16.7773C16.0881 16.7774 16.0816 16.7783 16.0771 16.7783H16.0703L15.5225 16.7822L15.5762 17.3271L15.7178 18.7539L13.7783 17.0059L13.6299 16.8721L13.4307 16.8779H13.4189C10.0969 16.9674 7.22056 17.026 4.76758 15.0088C7.26362 13.0467 10.1759 13.0243 13.4678 13.1396L13.6748 13.1475L13.8252 13.0068L15.7217 11.249L15.5762 12.7812L15.5244 13.3291H28.1211L28.25 13.2402C30.3251 11.8056 32.595 10.0053 34.6641 8.50195L35.7881 8.51465Z" fill="#15FFF6" stroke="black"/>
  </svg>
);

/** rotationDeg: 0 = nose to right (east). disabled = jammed state (greyed out). */
const DroneIcon = ({ rotationDeg = 0, disabled = false, color }: { rotationDeg?: number; disabled?: boolean; color?: string }) => (
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
      d="M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z"
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

const LauncherIcon = () => (
  <svg width="34" height="35" viewBox="0 0 26 27" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.9444 13.5L18.5 13L18 4L9.13333 13.5H17.9444Z" fill="white"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M9.13333 13.5H7V15.7857V21V23H22.5V13.5H17.9444H9.13333ZM11 17H9V20H11V17ZM13.5 20V17H15.5V20H13.5ZM18 20V17H20V20H18Z" fill="white"/>
    <path d="M7 15.7857L4 19L7 21V15.7857Z" fill="white"/>
    <path d="M9 17H11V20H9V17Z" fill="black"/>
    <path d="M13.5 17V20H15.5V17H13.5Z" fill="black"/>
    <path d="M18 17V20H20V17H18Z" fill="black"/>
    <path d="M17.9444 13.5L18.5 13L18 4L9.13333 13.5M17.9444 13.5H22.5V23H7V21M17.9444 13.5H9.13333M9.13333 13.5H7V15.7857M7 15.7857L4 19L7 21M7 15.7857V21M9 17H11V20H9V17ZM13.5 17V20H15.5V17H13.5ZM18 17V20H20V17H18Z" stroke="black"/>
  </svg>
);

// Nevatim area sensors
const SENSOR_ASSETS: MapAsset[] = [
  { id: 'SENS-NVT-MAGOS-N', latitude: 31.2195, longitude: 34.6580, typeLabel: 'Magos (North)', fovDeg: 180, bearingDeg: 0, Icon: SensorIcon },
  { id: 'SENS-NVT-MAGOS-S', latitude: 31.1965, longitude: 34.6720, typeLabel: 'Magos (South)', fovDeg: 180, bearingDeg: 180, Icon: SensorIcon },
];

export const CAMERA_ASSETS: MapAsset[] = [
  { id: 'CAM-NVT-PTZ-N', latitude: 31.2180, longitude: 34.6620, typeLabel: 'PTZ Camera (North)', fovDeg: 90, bearingDeg: 350, Icon: CameraIcon },
  { id: 'CAM-NVT-PIXELSIGHT', latitude: 31.2050, longitude: 34.6700, typeLabel: 'PixelSight', fovDeg: 360, bearingDeg: 0, Icon: CameraIcon },
];

const RADAR_ASSETS: MapAsset[] = [
  { id: 'RAD-NVT-RADA', latitude: 31.2120, longitude: 34.6500, typeLabel: 'RADA ieMHR', fovDeg: 360, bearingDeg: 0, Icon: RadarIcon },
  { id: 'RAD-NVT-ELTA', latitude: 31.2030, longitude: 34.6850, typeLabel: 'Elta MHR', fovDeg: 360, bearingDeg: 0, Icon: RadarIcon },
];

export const DRONE_HIVE_ASSETS: MapAsset[] = [
  { id: 'HIVE-NVT-MAIN', latitude: 31.2100, longitude: 34.6650, typeLabel: 'Drone Hive', fovDeg: 0, bearingDeg: 0, Icon: DroneHiveIcon },
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
  { id: 'REG-NVT-NORTH', name: 'Regulus North', lat: 31.2210, lon: 34.6550, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-EAST', name: 'Regulus East', lat: 31.2080, lon: 34.6850, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-SOUTH', name: 'Regulus South', lat: 31.1960, lon: 34.6650, coverageRadiusM: 2500, status: 'available' },
  { id: 'REG-NVT-WEST', name: 'Regulus West', lat: 31.2100, lon: 34.6400, coverageRadiusM: 2500, status: 'available' },
];

const ALL_MAP_ASSETS = [...SENSOR_ASSETS, ...CAMERA_ASSETS, ...RADAR_ASSETS];
const ALL_RENDERABLE_ASSETS = [...ALL_MAP_ASSETS, ...DRONE_HIVE_ASSETS];

export const LAUNCHER_ASSETS = [
  {
    id: 'LCHR-NVT',
    latitude: 31.2060,
    longitude: 34.6600,
  },
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

interface TacticalMapProps {
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
  /** Camera look-at: animate a camera FOV cone to face a target. */
  cameraLookAtRequest?: { cameraId: string; targetLat: number; targetLon: number } | null;
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
}

const JAM_VERIFICATION_DURATION_MS = 4500;
const JAM_VERIFICATION_DRONE_DURATION_MS = 4000;

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
}: TacticalMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    latitude: 31.2080,
    longitude: 34.6650,
    zoom: 13.5,
    pitch: 45,
    bearing: -17.6,
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

  const [mapStyleId, setMapStyleId] = useState<'dark' | 'satellite'>('dark');
  const [flickeringSensorId, setFlickeringSensorId] = useState<string | null>(null);

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
  const [activeMissiles, setActiveMissiles] = useState<MissileSim[]>([]);
  const [hoveredMissileId, setHoveredMissileId] = useState<string | null>(null);
  const [hoveredLauncherId, setHoveredLauncherId] = useState<string | null>(null);
  const [hoveredRegulusId, setHoveredRegulusId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!jammingVerification || !verificationTargetCoords) {
      setVerificationDroneProgress(0);
      setVerificationDroneStart(null);
      return;
    }
    if (jammingVerification.method === 'camera') {
      const t = setTimeout(() => onJammingVerificationComplete?.(), JAM_VERIFICATION_DURATION_MS);
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
          setTimeout(() => onJammingVerificationComplete?.(), 1500);
        }
      };
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }
  }, [jammingVerification?.targetId, jammingVerification?.method, verificationTargetCoords?.lat, verificationTargetCoords?.lon, onJammingVerificationComplete]);

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
    const ring = fovPolygon(cam.latitude, cam.longitude, cam.fovDeg, cameraLookAtBearing.bearing, radius);
    return {
      type: 'FeatureCollection' as const,
      features: [{ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [ring] }, properties: {} }],
    };
  }, [cameraLookAtBearing, cameraLookAtRequest]);

  const highlightedAssets = useMemo(
    () => ALL_MAP_ASSETS.filter(a =>
      (highlightedSensorIds.includes(a.id) || a.id === hoveredSensorIdFromCard)
      && a.id !== cameraLookAtBearing?.cameraId
    ),
    [highlightedSensorIds, hoveredSensorIdFromCard, cameraLookAtBearing?.cameraId]
  );

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

  const fovGeoJSON = useMemo(() => {
    if (!hoveredAsset) return null;
    if (hoveredAsset.id === cameraLookAtBearing?.cameraId) return null;
    const ring = fovPolygon(
      hoveredAsset.latitude,
      hoveredAsset.longitude,
      hoveredAsset.fovDeg,
      hoveredAsset.bearingDeg,
      FOV_RADIUS_M
    );
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
          properties: {},
        },
      ],
    };
  }, [hoveredAsset]);

  const fovFillLayerStyle: FillLayer = {
    id: 'fov-fill',
    type: 'fill',
    paint: {
      'fill-color': 'rgba(59, 130, 246, 0.25)',
      'fill-outline-color': 'rgba(96, 165, 250, 0.8)',
    },
  };

  const fovLineLayerStyle = {
    id: 'fov-line',
    type: 'line',
    paint: {
      'line-color': 'rgba(96, 165, 250, 0.9)',
      'line-width': 1.5,
    },
  };

  return (
    <div className={`absolute inset-0 bg-[#0a0a0a] overflow-hidden z-0 ${planningMode ? 'cursor-crosshair' : ''}`}>

      {/* Planning mode overlay banner */}
      {planningMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-violet-500/15 border border-violet-500/30 backdrop-blur-sm shadow-lg">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[12px] font-medium text-violet-200" dir="rtl">לחץ על המפה להוספת נקודות ציון</span>
          </div>
        </div>
      )}

      <Map
        ref={mapRef}
        {...viewState}
        reuseMaps
        onMove={evt => setViewState(prev => ({ ...evt.viewState, transitionDuration: 0 }))}
        onClick={(evt) => {
          if (planningMode && onMapClick) {
            onMapClick(evt.lngLat.lat, evt.lngLat.lng);
          }
        }}
        style={{width: '100%', height: '100%'}}
        mapStyle={mapStyleId === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/dark-v11'}
        mapboxAccessToken={TOKEN}
        attributionControl={false}
        cursor={planningMode ? 'crosshair' : undefined}
      >
        {/* Navigation Control (Zoom/Compass) */}
        <div className="absolute top-24 left-4">
             <NavigationControl position="top-left" showCompass={true} showZoom={true} visualizer="dark" />
        </div>

        {/* Map style toggle */}
        <div className="absolute top-4 left-4 z-10">
          <div className="flex rounded overflow-hidden border border-white/10 text-[10px] font-medium">
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

        {/* FOV cone on hover (drawn under markers) */}
        {fovGeoJSON && (
          <Source id="fov-source" type="geojson" data={fovGeoJSON}>
            <Layer {...fovFillLayerStyle} />
            <Layer {...fovLineLayerStyle} />
          </Source>
        )}

        {/* FOV for highlighted sensors (always visible) */}
        {highlightedAssets.map(asset => {
          const ring = fovPolygon(
            asset.latitude,
            asset.longitude,
            asset.fovDeg,
            asset.bearingDeg,
            FOV_RADIUS_M
          );
          const data = {
            type: 'FeatureCollection' as const,
            features: [
              {
                type: 'Feature' as const,
                geometry: { type: 'Polygon' as const, coordinates: [ring] },
                properties: {},
              },
            ],
          };
          return (
            <Source
              key={`sensor-fov-${asset.id}`}
              id={`sensor-fov-${asset.id}`}
              type="geojson"
              data={data}
            >
              <Layer
                id={`sensor-fov-fill-${asset.id}`}
                type="fill"
                paint={{
                  'fill-color': 'rgba(56, 189, 248, 0.18)',
                  'fill-outline-color': 'rgba(56, 189, 248, 0.9)',
                }}
              />
              <Layer
                id={`sensor-fov-line-${asset.id}`}
                type="line"
                paint={{
                  'line-color': 'rgba(56, 189, 248, 0.9)',
                  'line-width': 2,
                }}
              />
            </Source>
          );
        })}

        {/* Post-jam verification: camera FOV cone pointing at target */}
        {verificationFovGeoJSON && jammingVerification?.method === 'camera' && (
          <Source id="jam-verification-fov" type="geojson" data={verificationFovGeoJSON}>
            <Layer
              id="jam-verification-fov-fill"
              type="fill"
              paint={{
                'fill-color': 'rgba(34, 197, 94, 0.22)',
                'fill-outline-color': 'rgba(34, 197, 94, 0.9)',
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
                'fill-color': 'rgba(6, 182, 212, 0.20)',
                'fill-outline-color': 'rgba(6, 182, 212, 0.9)',
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
                <div className="pointer-events-none select-none rounded bg-black/85 px-2 py-1 font-mono text-[10px] text-cyan-200 border border-cyan-400/50 shadow-lg whitespace-nowrap">
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
              <div className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-950/95 border border-emerald-500/60 shadow-lg">
                <Camera size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-200 whitespace-nowrap">מצלמה מפנה לאימות</span>
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
                  <span className="text-[10px] font-bold text-amber-200 whitespace-nowrap px-2 py-0.5 rounded bg-black/80 border border-amber-500/50">אומת שיבוש</span>
                </div>
              </Marker>
            )}
          </>
        )}

        {/* Dynamic Target Markers */}
        {/* Target trail lines for classified entities */}
        {uniqueTargets.filter(t => t.entityStage === 'classified' && t.trail && t.trail.length >= 2).map(target => (
          <Source key={`trail-${target.id}`} id={`trail-${target.id}`} type="geojson" data={{
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates: target.trail!.map(p => [p.lon, p.lat]) },
          }}>
            <Layer id={`trail-line-${target.id}`} type="line" paint={{
              'line-color': target.mitigationStatus === 'mitigating' ? '#fa5252' : target.classifiedType === 'bird' ? '#fbbf24' : '#fa5252',
              'line-width': 2,
              'line-opacity': 0.6,
              'line-dasharray': [2, 2],
            }} />
          </Source>
        ))}

        {uniqueTargets.map(target => {
            const [lat, lon] = target.coordinates.split(',').map(c => parseFloat(c.trim()));
            if (isNaN(lat) || isNaN(lon)) return null;
            if (target.id === jammingTargetId) return null;
            if (target.flowType === 4) return null;

            const isActive = target.id === activeTargetId;
            const stage = target.entityStage;
            const isCritical = target.status === 'detection' || target.status === 'event';
            const isClassified = stage === 'classified';
            const isBird = target.classifiedType === 'bird';
            const isDrone = target.classifiedType === 'drone';
            const isMitigating = target.mitigationStatus === 'mitigating';
            const isMitigated = target.mitigationStatus === 'mitigated';
            const isExpiredCuas = target.status === 'expired' && !!target.entityStage;

            const dotSize = isExpiredCuas ? 'w-3 h-3'
              : stage === 'raw_detection' ? 'w-3 h-3'
              : isClassified ? 'w-5 h-5'
              : 'w-4 h-4';

            const dotColor = isExpiredCuas ? 'bg-zinc-600/50 border-zinc-600/30'
              : stage === 'raw_detection' ? 'bg-zinc-400/60 border-zinc-400/40'
              : isMitigating ? 'bg-red-500 border-red-400'
              : isMitigated ? 'bg-zinc-500 border-zinc-400'
              : isClassified && isBird ? 'bg-amber-400 border-amber-300'
              : isClassified ? 'bg-red-500 border-white'
              : isCritical ? 'bg-red-500 border-white'
              : 'bg-amber-500 border-white';

            const showPulse = !isExpiredCuas && (isMitigating || (stage === 'raw_detection' && !isClassified));
            const pulseColor = isMitigating ? 'bg-red-500' : 'bg-zinc-400';

            let droneHeadingDeg = 0;
            if (isDrone && target.trail && target.trail.length >= 2) {
              const t = target.trail;
              const p0 = t[t.length - 2];
              const p1 = t[t.length - 1];
              droneHeadingDeg = bearingDegrees(p0.lat, p0.lon, p1.lat, p1.lon) - 90;
            }

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
                      className={`relative group cursor-pointer transition-all duration-200 ${isActive ? 'z-50' : 'z-10'} ${isExpiredCuas ? 'opacity-40' : ''}`}
                    >
                        {showPulse && (
                            <div className={`absolute -inset-3 rounded-full opacity-40 animate-ping ${pulseColor}`} />
                        )}

                        {/* Hover backdrop */}
                        <div className="absolute -inset-2.5 rounded-full bg-white/0 group-hover:bg-white/[0.08] transition-colors duration-150 pointer-events-none" />

                        {isClassified && isDrone ? (
                          <DroneIcon rotationDeg={droneHeadingDeg} color={isMitigated ? undefined : '#fa5252'} disabled={isMitigated} />
                        ) : (
                          <div className={`${dotSize} rounded-full border-2 shadow-lg transition-all ${dotColor} ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} />
                        )}

                        {/* Map Info Card — hover-only tooltip */}
                        {isClassified ? (
                          <div className={`
                            absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 z-20
                            ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                          `}
                            style={{ left: isDrone ? '34px' : '24px' }}
                          >
                            <div className={`
                              bg-black/40 backdrop-blur-md text-white rounded border whitespace-nowrap
                              ${isBird ? 'border-amber-500/20' : isMitigated ? 'border-zinc-600/40' : 'border-red-500/20'}
                            `}>
                              <div className="flex items-center gap-1.5 px-2 py-1" dir="rtl">
                                <span className="text-[10px] font-semibold truncate max-w-[120px]">{target.name}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`
                            absolute top-1/2 -translate-y-1/2
                            bg-black/90 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded border border-white/10 whitespace-nowrap
                            transition-all duration-200 pointer-events-none flex items-center gap-1
                            ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                          `} style={{ left: '20px' }}>
                            {isExpiredCuas ? (
                              <span className="text-zinc-500">נצפה לאחרונה — {target.lastSeenAt || target.timestamp}</span>
                            ) : stage === 'raw_detection' ? (
                              <span className="text-zinc-400">זיהוי לא ידוע</span>
                            ) : (
                              <>
                                {isCritical ? <ShieldAlert size={9} className="text-red-500" /> : <AlertTriangle size={9} className="text-amber-500" />}
                                <span className="font-mono">{target.name || target.id}</span>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="min-w-[200px]" dir="rtl">
                      {target.classifiedType !== 'bird' && target.mitigationStatus !== 'mitigated' && (
                        <>
                          <ContextMenuItem onSelect={() => onContextMenuAction?.('mitigate', 'target', target.id)}>
                            <Zap className="size-4" />
                            שיבוש
                          </ContextMenuItem>
                          <ContextMenuItem onSelect={() => onContextMenuAction?.('mitigate-all', 'target', target.id)}>
                            <Radio className="size-4" />
                            שיבוש מרחבי
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

        {/* Static missile launcher assets (weaponized sites) */}
        {LAUNCHER_ASSETS.map(launcher => (
          <Marker
            key={launcher.id}
            longitude={launcher.longitude}
            latitude={launcher.latitude}
            anchor="bottom"
          >
            <div
              className={`relative cursor-pointer rounded-full p-1 transition-all duration-150 ${hoveredLauncherId === launcher.id ? 'bg-white/[0.08]' : ''}`}
              onMouseEnter={() => setHoveredLauncherId(launcher.id)}
              onMouseLeave={() => setHoveredLauncherId(null)}
            >
              {hoveredLauncherId === launcher.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 text-xs font-medium text-white bg-black/95 border border-white/20 rounded shadow-lg font-['Inter'] whitespace-nowrap z-50">
                  <div>משגר טילים {launcher.id}</div>
                </div>
              )}
              <LauncherIcon />
            </div>
          </Marker>
        ))}

        {/* Regulus effector coverage rings (shown on hover or when active) */}
        {regulusEffectors.map(reg => {
          const isHovered = hoveredRegulusId === reg.id;
          const isActive = reg.status === 'active';
          if (!isHovered && !isActive) return null;
          const ring = fovPolygon(reg.lat, reg.lon, 360, 0, reg.coverageRadiusM);
          return (
            <Source key={`reg-coverage-${reg.id}`} id={`reg-coverage-${reg.id}`} type="geojson" data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Polygon', coordinates: [ring] },
            }}>
              <Layer id={`reg-coverage-fill-${reg.id}`} type="fill" paint={{
                'fill-color': isActive ? '#4ade80' : '#12b886',
                'fill-opacity': isActive ? 0.12 : 0.08,
              }} />
              <Layer id={`reg-coverage-line-${reg.id}`} type="line" paint={{
                'line-color': isActive ? '#4ade80' : '#12b886',
                'line-width': isActive ? 1.5 : 1,
                'line-dasharray': isActive ? [1, 0] : [4, 4],
                'line-opacity': 0.5,
              }} />
            </Source>
          );
        })}

        {/* Regulus effector markers — same visual as sensor assets */}
        {regulusEffectors.map(reg => {
          const isHovered = hoveredRegulusId === reg.id;
          const isActive = reg.status === 'active';
          return (
            <Marker key={reg.id} longitude={reg.lon} latitude={reg.lat} anchor="bottom">
              <ContextMenu>
              <ContextMenuTrigger asChild>
              <div
                className={`relative group cursor-pointer rounded-full p-1.5 transition-all duration-200 ${isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : ''} ${isHovered && !isActive ? 'bg-white/10' : ''}`}
                onMouseEnter={() => setHoveredRegulusId(reg.id)}
                onMouseLeave={() => setHoveredRegulusId(null)}
              >
                {isActive && (
                  <div className="absolute -inset-2 rounded-full border border-green-400/60 animate-pulse bg-green-500/10" />
                )}
                <SensorIcon fill={isActive ? '#4ade80' : undefined} />
                {(isHovered || isActive) && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 text-xs font-medium text-white bg-black/95 border border-white/20 rounded shadow-lg font-['Inter'] whitespace-nowrap pointer-events-none z-50" style={{ minWidth: 'max-content' }}>
                    <div>{reg.name}</div>
                    <div className="text-white/70 mt-0.5">
                      {isActive ? 'פעיל — שיבוש' : reg.id}
                    </div>
                  </div>
                )}
              </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[200px]" dir="rtl">
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
                <ContextMenuItem onSelect={() => onContextMenuAction?.('activate', 'effector', reg.id)}>
                  <Zap className="size-4" />
                  הפעל שיבוש
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => onContextMenuAction?.('mute-alerts', 'effector', reg.id)}>
                  <BellOff className="size-4" />
                  השתקת התראות
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onContextMenuAction?.('settings', 'effector', reg.id)}>
                  <Settings className="size-4" />
                  הגדרות מתקדמות
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onContextMenuAction?.('calibrate', 'effector', reg.id)}>
                  <Wrench className="size-4" />
                  כיול
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onContextMenuAction?.('edit', 'effector', reg.id)}>
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
                className={`relative group cursor-pointer rounded-full p-1.5 transition-all duration-200 ${
                  isHighlighted || isFlickering ? 'scale-110' : ''
                } ${isHoveredFromCard && !isSelected ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-[#0a0a0a] rounded-full' : ''} ${isJammerActive ? 'scale-110' : ''} ${isHovered && !isHighlighted && !isJammerActive && !isSelected ? 'bg-white/10' : ''} ${isFlickering ? 'animate-pulse ring-2 ring-cyan-400/60 ring-offset-1 ring-offset-[#0a0a0a]' : ''}`}
                onMouseEnter={() => setHoveredAsset(asset)}
                onMouseLeave={() => setHoveredAsset(null)}
              >
                {isJammerActive && (
                  <div className="absolute -inset-2 rounded-full border border-white/30 animate-pulse" />
                )}
                {isHighlighted && !isJammerActive && (
                  <div className={`absolute -inset-2 rounded-full border animate-pulse ${isHoveredFromCard ? 'border-white/50 border-2' : 'border-white/30'}`} />
                )}
                <Icon fill={isSelected ? '#a78bfa' : undefined} />
                {(isHovered || isHighlighted) && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 text-xs font-medium text-white bg-black/95 border border-white/20 rounded shadow-lg font-['Inter'] whitespace-nowrap pointer-events-none z-50"
                    style={{ minWidth: 'max-content' }}
                  >
                    <div>{asset.typeLabel}</div>
                    <div className="text-white/70 mt-0.5">
                      FOV {asset.fovDeg}° · {asset.id}
                    </div>
                  </div>
                )}
              </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[200px]" dir="rtl">
                <ContextMenuLabel>{asset.typeLabel} — {asset.id}</ContextMenuLabel>
                <ContextMenuSeparator />
                {isCamera && (
                  <ContextMenuItem onSelect={() => onContextMenuAction?.('show-video', 'sensor', asset.id)}>
                    <Maximize2 className="size-4" />
                    הצג שידור
                  </ContextMenuItem>
                )}
                <ContextMenuItem onSelect={() => onContextMenuAction?.('open-tab', 'sensor', asset.id)}>
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
                <ContextMenuItem onSelect={() => onContextMenuAction?.('mute-alerts', 'sensor', asset.id)}>
                  <BellOff className="size-4" />
                  השתקת התראות
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onContextMenuAction?.('settings', 'sensor', asset.id)}>
                  <Settings className="size-4" />
                  הגדרות מתקדמות
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onContextMenuAction?.('calibrate', 'sensor', asset.id)}>
                  <Wrench className="size-4" />
                  כיול
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onContextMenuAction?.('edit', 'sensor', asset.id)}>
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 text-xs font-medium text-white bg-black/95 border border-cyan-400/60 rounded shadow-lg font-['Inter'] whitespace-nowrap z-50">
                    <div>טיל לאיתור {missile.targetId}</div>
                    <div className="text-white/70 mt-0.5">
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
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[9px] font-mono text-violet-200 bg-black/90 border border-violet-400/30 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <div className={`pointer-events-none select-none rounded px-2 py-1 font-mono text-[10px] border shadow-lg whitespace-nowrap ${
                    activeDrone.phase === 'rtb'
                      ? 'bg-black/85 text-zinc-300 border-zinc-500/50'
                      : 'bg-black/85 text-cyan-200 border-cyan-400/50'
                  }`}>
                    <span>{distKm < 1 ? `${Math.round(distM)}m` : `${distKm.toFixed(1)}km`}</span>
                    <span className="text-white/50 mx-1">·</span>
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

      </Map>

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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] border border-white/5 rounded-3xl opacity-20 pointer-events-none flex items-center justify-center">
         <div className="w-full h-full border-x border-white/5" />
      </div>

      {/* Coordinates / Map UI */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-1 pointer-events-none bg-black/50 backdrop-blur p-2 rounded border border-white/10">
         <div className="flex items-center gap-2 text-white/60 text-xs font-mono uppercase">
           <MapIcon size={14} />
           <span>Sector 7G / North District</span>
         </div>
         <div className="text-white/40 text-[10px] font-mono">
           LAT: {viewState.latitude.toFixed(4)}° N | LON: {viewState.longitude.toFixed(4)}° E
         </div>
      </div>

      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
         <Crosshair size={32} strokeWidth={1} />
      </div>

      {controlIndicator && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900/90 backdrop-blur-md border border-emerald-400/60 shadow-lg shadow-emerald-500/20 animate-pulse" style={{ animationDuration: '3s' }}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-sm font-bold text-emerald-200 font-['Inter']">אתה בשליטה</span>
          </div>
        </div>
      )}

    </div>
  );
};
