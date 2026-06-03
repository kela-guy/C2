/**
 * Sample tactical content for the map sandbox so atmosphere / fog /
 * lighting tweaks have something to render against. Coordinates centre
 * on northern Israel — same area as the Mapbox screenshot that prompted
 * this sandbox.
 *
 * Kept intentionally small (a handful of entities). The point is to read
 * scene effects, not to stress-test the renderer.
 */

import type { CesiumHtmlMarker, CesiumPolyline } from '@/primitives/CesiumMap';
import { accentHex } from '@/primitives/accentHex';

export const MAP_SANDBOX_CENTER = { lat: 33.0, lon: 35.5, heightM: 50_000 };

export const MAP_SANDBOX_MARKERS: CesiumHtmlMarker[] = [
  {
    id: 'cam-north',
    lat: 33.142,
    lon: 35.612,
    content: null,
    fov: {
      rangeM: 4_000,
      bearingDeg: 220,
      widthDeg: 60,
      color: accentHex('cyan'),
      opacity: 0.35,
    },
  },
  {
    id: 'cam-south',
    lat: 32.911,
    lon: 35.488,
    content: null,
    fov: {
      rangeM: 5_500,
      bearingDeg: 35,
      widthDeg: 45,
      color: accentHex('info'),
      opacity: 0.35,
    },
  },
  {
    id: 'radar-center',
    lat: 33.035,
    lon: 35.545,
    content: null,
    coverageRadiusM: 8_000,
    coverageColor: accentHex('historical'),
  },
];

export const MAP_SANDBOX_POLYLINES: CesiumPolyline[] = [
  {
    id: 'drone-trail',
    color: accentHex('success'),
    width: 2,
    points: [
      { lat: 33.072, lon: 35.430 },
      { lat: 33.078, lon: 35.462 },
      { lat: 33.061, lon: 35.498 },
      { lat: 33.044, lon: 35.521 },
      { lat: 33.022, lon: 35.535 },
      { lat: 33.003, lon: 35.552 },
    ],
  },
  {
    id: 'engagement',
    color: accentHex('danger'),
    width: 3,
    dashed: true,
    points: [
      { lat: 33.035, lon: 35.545 },
      { lat: 32.971, lon: 35.616 },
    ],
    particles: {
      count: 6,
      color: accentHex('danger'),
      speed: 0.3,
    },
  },
];
