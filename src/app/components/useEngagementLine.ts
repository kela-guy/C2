import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl';

export interface EngagementPairGeo {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  assetId: string;
  distanceM: number;
}

type PointFeature = {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'Point'; coordinates: [number, number] };
};

export type ParticleGeoJson = {
  type: 'FeatureCollection';
  features: PointFeature[];
};

const EMPTY_COLLECTION: ParticleGeoJson = { type: 'FeatureCollection', features: [] };

const SPRING_LUT = (() => {
  const stiffness = 160, damping = 70, mass = 1;
  const steps = 300;
  const dt = 1 / 120;
  let x = 0, v = 0;
  const lut: number[] = [];
  for (let i = 0; i <= steps; i++) {
    lut.push(Math.max(0, Math.min(x, 1.5)));
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
  }
  return lut;
})();

function easeSpring(t: number): number {
  const idx = t * (SPRING_LUT.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, SPRING_LUT.length - 1);
  return SPRING_LUT[lo] + (SPRING_LUT[hi] - SPRING_LUT[lo]) * (idx - lo);
}

export function useEngagementLine(config: {
  id: string;
  pair: EngagementPairGeo | null;
  mapRef: React.RefObject<MapRef | null>;
}): { particleGeoJson: ParticleGeoJson } {
  const { id, pair, mapRef } = config;
  const active = !!pair;
  const pairRef = useRef(pair);
  pairRef.current = pair;

  const particleTRef = useRef<number[]>(Array.from({ length: 3 }, (_, i) => i / 3));
  const [particleGeoJson, setParticleGeoJson] = useState<ParticleGeoJson>(EMPTY_COLLECTION);

  // Dash animation
  useEffect(() => {
    if (!active) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const layerId = `${id}-engagement-line-dash`;
    const D = 4;
    const PERIOD = D + D;
    const TOTAL_STEPS = 32;
    let step = 0;
    let lastTime = 0;
    let frameId: number;

    const animate = (time: number) => {
      if (time - lastTime > 20) {
        lastTime = time;
        step = (step + 1) % TOTAL_STEPS;
        const s = (step / TOTAL_STEPS) * PERIOD;
        const pattern: number[] =
          s < 0.01       ? [D, D] :
          s < D          ? [0, s, D, D - s] :
          s > PERIOD - 0.01 ? [D, D] :
                           [s - D, D, PERIOD - s, 0.01];
        try {
          const map = (mapRef.current as any)?.getMap?.() ?? mapRef.current;
          if (map?.getLayer?.(layerId)) {
            map.setPaintProperty(layerId, 'line-dasharray', pattern);
          }
        } catch {}
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [active, id, mapRef]);

  // Particle animation
  useEffect(() => {
    if (!active) {
      setParticleGeoJson(EMPTY_COLLECTION);
      return;
    }
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let frameId: number;
    let lastTime = 0;
    const SPEED = 0.25;
    const COUNT = 3;
    const ts = particleTRef.current;

    const animate = (time: number) => {
      const dt = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;
      const p = pairRef.current;
      if (!p) { frameId = requestAnimationFrame(animate); return; }

      for (let i = 0; i < COUNT; i++) {
        ts[i] = (ts[i] + SPEED * dt) % 1;
      }

      const features: PointFeature[] = ts.map((t) => {
        const eased = easeSpring(t);
        return {
          type: 'Feature' as const,
          properties: {} as Record<string, never>,
          geometry: {
            type: 'Point' as const,
            coordinates: [
              p.fromLon + (p.toLon - p.fromLon) * eased,
              p.fromLat + (p.toLat - p.fromLat) * eased,
            ] as [number, number],
          },
        };
      });

      setParticleGeoJson({ type: 'FeatureCollection', features });
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [active]);

  return { particleGeoJson };
}
