import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useDialKit } from 'dialkit';
import { DroneIcon } from '@/shared/components/TacticalMap';
import { SensorIcon } from './TacticalMap';
import { MapMarker } from '@/primitives/MapMarker';
import { resolveMarkerStyle, AFFILIATIONS } from '@/primitives/mapMarkerStates';
import { haversineDistanceM, bearingDegrees } from './TacticalMap';
import { cn } from '@/shared/components/ui/utils';
import type { FeatureCollection, Point } from 'geojson';

const TOKEN = 'pk.eyJ1IjoiZ3V5c2hhIiwiYSI6ImNtZ3htODN0dTE2dGMybXFrYWRlZmN5MGMifQ.dIQzO3kIdQaES0pfedlRvA';

const EFFECTOR = { lat: 32.4666, lon: 35.0013, name: 'Regulus North' };
const DRONE_START = { lat: 32.4690, lon: 35.0040 };

const BADGE_BASE = 'rounded px-2 py-1 font-mono text-xs tabular-nums whitespace-nowrap pointer-events-none select-none shadow-[0_2px_8px_rgba(0,0,0,0.4)]';

function contrastTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

const DRONE_SPEED = 0.00006;
const TURN_RATE = 0.08;
const HOME_RADIUS = 0.004;

type EaseType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic' | 'spring' | 'expo' | 'back' | 'custom';

type BezierPoints = [number, number, number, number];

function solveCubicBezier(t: number, [x1, y1, x2, y2]: BezierPoints): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const x = 3 * x1 * mid * (1 - mid) ** 2 + 3 * x2 * mid ** 2 * (1 - mid) + mid ** 3;
    if (x < t) lo = mid; else hi = mid;
  }

  const u = (lo + hi) / 2;
  return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u ** 2 * (1 - u) + u ** 3;
}

function applyEasing(t: number, type: EaseType, bezier?: BezierPoints): number {
  switch (type) {
    case 'linear':
      return t;
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    case 'cubic':
      return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    case 'spring': {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return 1 - Math.cos(t * Math.PI * 2.5) * (1 - t) ** 2.2;
    }
    case 'expo':
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;
    case 'back': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
    }
    case 'custom':
      return solveCubicBezier(t, bezier ?? [0.25, 0.1, 0.25, 1]);
    default:
      return t;
  }
}

export default function MapIconsPlayground() {
  const mapRef = useRef<MapRef>(null);

  const [saveFlash, setSaveFlash] = useState(false);
  const pRef = useRef<any>(null);

  const handleAction = useCallback((action: string) => {
    if (action === 'saveConfig') {
      const v = pRef.current;
      if (!v) return;
      const config = {
        line: { color: v.line.color, mitigatingColor: v.line.mitigatingColor, width: v.line.width, dashLength: v.line.dashLength, animSpeed: v.line.animSpeed },
        particles: { count: v.particles.count, dotSize: v.particles.dotSize, glowSize: v.particles.glowSize, speed: v.particles.speed, opacity: v.particles.opacity, easing: v.particles.easing, stretch: v.particles.stretch, tailSegments: v.particles.tailSegments },
      };
      localStorage.setItem('engagement-line:config', JSON.stringify(config));
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    }
  }, []);

  const p = useDialKit('Engagement Line', {
    simulation: {
      droneMoving: true,
      showLine: true,
      showBadge: true,
      showParticles: true,
      mitigating: false,
    },
    line: {
      color: '#ffffff',
      mitigatingColor: '#ef4444',
      width: [2, 0.5, 6, 0.5],
      dashLength: [4, 1, 12, 0.5],
      animSpeed: [50, 20, 150, 5],
    },
    particles: {
      count: [3, 2, 12, 1],
      dotSize: [4, 1, 8, 0.5],
      glowSize: [14, 0, 20, 1],
      speed: [0.2, 0.1, 2, 0.05],
      opacity: [0.9, 0.1, 1, 0.05],
      easing: {
        type: 'select' as const,
        options: [
          { value: 'linear', label: 'Linear' },
          { value: 'ease-in', label: 'Ease In' },
          { value: 'ease-out', label: 'Ease Out' },
          { value: 'ease-in-out', label: 'Ease In-Out' },
          { value: 'cubic', label: 'Cubic' },
          { value: 'spring', label: 'Spring' },
          { value: 'expo', label: 'Exponential' },
          { value: 'back', label: 'Back' },
          { value: 'custom', label: 'Custom Curve' },
        ],
        default: 'custom',
      },
      curve: { type: 'spring' as const, stiffness: 530, damping: 70, mass: 1 },
      stretch: [0, 0, 0.15, 0.005],
      tailSegments: [0, 0, 8, 1],
    },
    hoverPulse: {
      color: '#ffffff',
      startOpacity: [0.3, 0.05, 1, 0.05],
      startScale: [1.0, 0.5, 1.5, 0.05],
      endScale: [2.0, 1.0, 3.0, 0.1],
      durationMs: [1650, 200, 3000, 50],
      easing: {
        type: 'select' as const,
        options: [
          { value: 'ease-out', label: 'Ease Out' },
          { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'Smooth Decel' },
          { value: 'cubic-bezier(0.0, 0, 0.2, 1)', label: 'Gentle Out' },
          { value: 'linear', label: 'Linear' },
        ],
        default: 'cubic-bezier(0.0, 0, 0.2, 1)',
      },
    },
    saveConfig: { type: 'action' as const, label: 'Save Config' },
  }, {
    onAction: handleAction,
  });
  pRef.current = p;

  const [viewState, setViewState] = useState({
    latitude: (EFFECTOR.lat + DRONE_START.lat) / 2,
    longitude: (EFFECTOR.lon + DRONE_START.lon) / 2,
    zoom: 16,
  });

  const [droneLat, setDroneLat] = useState(DRONE_START.lat);
  const [droneLon, setDroneLon] = useState(DRONE_START.lon);
  const [droneHeading, setDroneHeading] = useState(0);
  const loiterRef = useRef({ heading: Math.random() * Math.PI * 2, targetHeading: Math.random() * Math.PI * 2, tick: 0, nextTurnTick: 10 });
  const dronePos = useRef({ lat: DRONE_START.lat, lon: DRONE_START.lon });

  useEffect(() => {
    if (!p.simulation.droneMoving) return;
    const interval = setInterval(() => {
      const state = loiterRef.current;
      const pos = dronePos.current;
      state.tick++;

      if (state.tick >= state.nextTurnTick) {
        state.targetHeading = Math.random() * Math.PI * 2;
        state.nextTurnTick = state.tick + 10 + Math.floor(Math.random() * 20);
      }

      const dFromHome = Math.sqrt((pos.lat - DRONE_START.lat) ** 2 + (pos.lon - DRONE_START.lon) ** 2);
      if (dFromHome > HOME_RADIUS) {
        state.targetHeading = Math.atan2(DRONE_START.lon - pos.lon, DRONE_START.lat - pos.lat);
      }

      let diff = state.targetHeading - state.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      state.heading += Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE);

      const newLat = pos.lat + Math.cos(state.heading) * DRONE_SPEED;
      const newLon = pos.lon + Math.sin(state.heading) * DRONE_SPEED;
      const hdg = bearingDegrees(pos.lat, pos.lon, newLat, newLon);

      pos.lat = newLat;
      pos.lon = newLon;
      setDroneLat(newLat);
      setDroneLon(newLon);
      setDroneHeading(hdg);
    }, 500);
    return () => clearInterval(interval);
  }, [p.simulation.droneMoving]);

  // Dash animation
  useEffect(() => {
    if (!p.simulation.showLine) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const D = p.line.dashLength;
    const PERIOD = D + D;
    const TOTAL_STEPS = 32;
    let step = 0;
    let lastTime = 0;
    let frameId: number;

    const animate = (time: number) => {
      if (time - lastTime > p.line.animSpeed) {
        lastTime = time;
        step = (step + 1) % TOTAL_STEPS;
        const s = (step / TOTAL_STEPS) * PERIOD;
        const pattern: number[] =
          s < 0.01          ? [D, D] :
          s < D             ? [0, s, D, D - s] :
          s > PERIOD - 0.01 ? [D, D] :
                              [s - D, D, PERIOD - s, 0.01];
        try {
          const map = (mapRef.current as any)?.getMap?.() ?? mapRef.current;
          if (map?.getLayer?.('playground-line-dash')) {
            map.setPaintProperty('playground-line-dash', 'line-dasharray', pattern);
          }
        } catch { /* layer may not exist yet */ }
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [p.simulation.showLine, p.line.dashLength, p.line.animSpeed]);

  // Particle animation
  const particleTRef = useRef<number[]>([]);
  const [particleGeoJson, setParticleGeoJson] = useState<FeatureCollection<Point>>({
    type: 'FeatureCollection', features: [],
  });

  useEffect(() => {
    const count = p.particles.count;
    if (particleTRef.current.length !== count) {
      particleTRef.current = Array.from({ length: count }, (_, i) => i / count);
    }
  }, [p.particles.count]);

  const droneLatRef = useRef(droneLat);
  const droneLonRef = useRef(droneLon);
  droneLatRef.current = droneLat;
  droneLonRef.current = droneLon;

  const curveConfig = p.particles.curve as {
    type: string;
    ease?: [number, number, number, number];
    stiffness?: number; damping?: number; mass?: number;
    visualDuration?: number; bounce?: number;
  };
  const customBezier: BezierPoints = curveConfig.type === 'easing' && curveConfig.ease
    ? curveConfig.ease
    : [0.25, 0.1, 0.25, 1];

  const customSpringLut = useRef<number[]>([]);
  if (curveConfig.type === 'spring') {
    let stiffness: number;
    let damping: number;
    let mass: number;

    if (curveConfig.stiffness != null) {
      stiffness = curveConfig.stiffness;
      damping = curveConfig.damping ?? 10;
      mass = curveConfig.mass ?? 1;
    } else {
      const dur = curveConfig.visualDuration ?? 0.5;
      const bounce = curveConfig.bounce ?? 0;
      mass = 1;
      stiffness = (2 * Math.PI / dur) ** 2;
      damping = (1 - bounce) * 2 * Math.sqrt(stiffness * mass);
    }

    const steps = 300;
    const dt = 1 / 120;
    let x = 0, v = 0;
    const lut: number[] = [];
    for (let i = 0; i <= steps; i++) {
      lut.push(Math.max(0, Math.min(x, 1.5)));
      const springForce = -stiffness * (x - 1);
      const dampForce = -damping * v;
      const a = (springForce + dampForce) / mass;
      v += a * dt;
      x += v * dt;
    }
    customSpringLut.current = lut;
  }

  const bezierRef = useRef(customBezier);
  bezierRef.current = customBezier;
  const springLutRef = useRef(customSpringLut.current);
  springLutRef.current = customSpringLut.current;
  const curveTypeRef = useRef(curveConfig.type);
  curveTypeRef.current = curveConfig.type;
  const stretchRef = useRef(p.particles.stretch);
  stretchRef.current = p.particles.stretch;
  const tailSegmentsRef = useRef(p.particles.tailSegments);
  tailSegmentsRef.current = p.particles.tailSegments;
  const speedRef = useRef(p.particles.speed);
  speedRef.current = p.particles.speed;
  const easingRef = useRef(p.particles.easing);
  easingRef.current = p.particles.easing;

  useEffect(() => {
    if (!p.simulation.showLine || !p.simulation.showParticles) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let frameId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      const dt = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;

      const ts = particleTRef.current;
      const currentSpeed = speedRef.current;
      for (let i = 0; i < ts.length; i++) {
        ts[i] = (ts[i] + currentSpeed * dt) % 1;
      }

      const eLat = EFFECTOR.lat;
      const eLon = EFFECTOR.lon;
      const tLat = droneLatRef.current;
      const tLon = droneLonRef.current;
      const ease = easingRef.current as EaseType;
      const bz = bezierRef.current;
      const isCustomSpring = ease === 'custom' && curveTypeRef.current === 'spring';
      const lut = springLutRef.current;

      const stretchAmt = stretchRef.current;
      const tailSegs = Math.round(tailSegmentsRef.current);

      const easeT = (t: number) => {
        if (isCustomSpring && lut.length > 0) {
          const idx = t * (lut.length - 1);
          const lo = Math.floor(idx);
          const hi = Math.min(lo + 1, lut.length - 1);
          const frac = idx - lo;
          return lut[lo] + (lut[hi] - lut[lo]) * frac;
        }
        return applyEasing(t, ease, bz);
      };

      const features: Array<{ type: 'Feature'; properties: { trail: number }; geometry: { type: 'Point'; coordinates: [number, number] } }> = [];

      for (const t of ts) {
        const eased = easeT(t);
        features.push({
          type: 'Feature',
          properties: { trail: 0 },
          geometry: {
            type: 'Point',
            coordinates: [
              eLon + (tLon - eLon) * eased,
              eLat + (tLat - eLat) * eased,
            ],
          },
        });

        for (let s = 1; s <= tailSegs; s++) {
          const trailT = ((t - stretchAmt * s) % 1 + 1) % 1;
          const trailEased = easeT(trailT);
          features.push({
            type: 'Feature',
            properties: { trail: s },
            geometry: {
              type: 'Point',
              coordinates: [
                eLon + (tLon - eLon) * trailEased,
                eLat + (tLat - eLat) * trailEased,
              ],
            },
          });
        }
      }

      setParticleGeoJson({ type: 'FeatureCollection', features });
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [p.simulation.showLine, p.simulation.showParticles]);

  const distanceM = haversineDistanceM(droneLat, droneLon, EFFECTOR.lat, EFFECTOR.lon);
  const midLat = (droneLat + EFFECTOR.lat) / 2;
  const midLon = (droneLon + EFFECTOR.lon) / 2;

  const activeLineColor = p.simulation.mitigating ? p.line.mitigatingColor : p.line.color;
  const badgeTextColor = contrastTextColor(activeLineColor);

  const droneStyle = resolveMarkerStyle(p.simulation.mitigating ? 'active' : 'selected', 'hostile');
  const effectorStyle = resolveMarkerStyle(p.simulation.mitigating ? 'active' : 'default', 'friendly');

  const [pulseHovered, setPulseHovered] = useState(false);

  return (
    <div dir="ltr" className="h-screen flex flex-col text-white font-sans bg-[#0a0a0a]">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] shrink-0 z-10">
        <Link to="/" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          Back
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <h1 className="text-sm font-semibold text-zinc-200 tracking-wide">
          Engagement Line Playground
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {saveFlash && (
            <span className="text-[10px] text-emerald-400 font-medium animate-pulse">
              Saved
            </span>
          )}
          <button
            onClick={() => handleAction('saveConfig')}
            className={cn(
              'px-2.5 py-1 rounded text-[10px] font-medium transition-colors',
              'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white',
            )}
          >
            Save Config
          </button>
          <div className={cn(
            'px-2.5 py-1 rounded text-[10px] font-mono tabular-nums',
            'bg-black/40 border border-white/[0.08] text-zinc-400',
          )}>
            {distanceM < 1000 ? `${Math.round(distanceM)}m` : `${(distanceM / 1000).toFixed(1)} km`}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/satellite-v9"
          mapboxAccessToken={TOKEN}
        >
          {/* Engagement line */}
          {p.simulation.showLine && (
            <Source id="playground-line" type="geojson" data={{
              type: 'Feature' as const,
              properties: {},
              geometry: {
                type: 'LineString' as const,
                coordinates: [
                  [EFFECTOR.lon, EFFECTOR.lat],
                  [droneLon, droneLat],
                ],
              },
            }}>
              <Layer
                id="playground-line-dash"
                type="line"
                paint={{
                  'line-color': activeLineColor,
                  'line-width': p.line.width,
                  'line-dasharray': [p.line.dashLength, p.line.dashLength],
                }}
              />
            </Source>
          )}

          {/* Traveling particles */}
          {p.simulation.showLine && p.simulation.showParticles && (
            <Source id="playground-particles" type="geojson" data={particleGeoJson}>
              <Layer
                id="playground-particle-glow"
                type="circle"
                paint={{
                  'circle-radius': [
                    'interpolate', ['linear'], ['get', 'trail'],
                    0, p.particles.glowSize,
                    Math.max(1, Math.round(p.particles.tailSegments)), p.particles.glowSize * 0.2,
                  ],
                  'circle-color': activeLineColor,
                  'circle-opacity': [
                    'interpolate', ['linear'], ['get', 'trail'],
                    0, p.particles.opacity * 0.25,
                    Math.max(1, Math.round(p.particles.tailSegments)), 0,
                  ],
                  'circle-blur': 1,
                }}
              />
              <Layer
                id="playground-particle-core"
                type="circle"
                paint={{
                  'circle-radius': [
                    'interpolate', ['linear'], ['get', 'trail'],
                    0, p.particles.dotSize,
                    Math.max(1, Math.round(p.particles.tailSegments)), p.particles.dotSize * 0.3,
                  ],
                  'circle-color': activeLineColor,
                  'circle-opacity': [
                    'interpolate', ['linear'], ['get', 'trail'],
                    0, p.particles.opacity,
                    Math.max(1, Math.round(p.particles.tailSegments)), p.particles.opacity * 0.1,
                  ],
                }}
              />
            </Source>
          )}

          {/* Distance badge */}
          {p.simulation.showBadge && p.simulation.showLine && (
            <Marker latitude={midLat} longitude={midLon} anchor="center">
              <div
                className={BADGE_BASE}
                style={{ backgroundColor: activeLineColor, color: badgeTextColor }}
              >
                {distanceM < 1000 ? `${Math.round(distanceM)}m` : `${(distanceM / 1000).toFixed(1)} km`}
              </div>
            </Marker>
          )}

          {/* Effector marker */}
          <Marker latitude={EFFECTOR.lat} longitude={EFFECTOR.lon} anchor="center">
            <div className="relative flex flex-col items-center">
              <MapMarker
                icon={<SensorIcon fill={effectorStyle.glyphColor} />}
                surfaceSize={36}
                ringSize={28}
                style={effectorStyle}
                label={EFFECTOR.name}
                showLabel
              />
            </div>
          </Marker>

          {/* Drone marker */}
          <Marker latitude={droneLat} longitude={droneLon} anchor="center">
            <div className="relative flex flex-col items-center">
              {p.simulation.mitigating && (
                <div className="absolute -inset-3 rounded-full opacity-40 animate-ping bg-red-500" />
              )}
              <MapMarker
                icon={<DroneIcon rotationDeg={droneHeading - 90} color={droneStyle.glyphColor} />}
                surfaceSize={36}
                ringSize={28}
                style={droneStyle}
                label="Hostile Drone"
                showLabel
              />
            </div>
          </Marker>
        </Map>
      </div>

      {/* Hover Pulse Preview */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#0c0c0e] px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0">Hover Pulse Preview</span>
          <div className="flex items-center gap-8">
            {AFFILIATIONS.map(aff => {
              const baseStyle = resolveMarkerStyle('default', aff);
              const ringDiameter = 32;
              return (
                <div
                  key={aff}
                  className="flex flex-col items-center gap-2"
                  onMouseEnter={() => setPulseHovered(true)}
                  onMouseLeave={() => setPulseHovered(false)}
                >
                  <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
                    <MapMarker
                      icon={<SensorIcon fill={baseStyle.glyphColor} />}
                      surfaceSize={42}
                      ringSize={ringDiameter}
                      style={baseStyle}
                    />
                    {pulseHovered && (
                      <div
                        className="absolute rounded-full pointer-events-none will-change-[transform,opacity]"
                        style={{
                          width: ringDiameter,
                          height: ringDiameter,
                          top: '50%',
                          left: '50%',
                          background: p.hoverPulse.color,
                          animation: `hoverPulseRipple ${p.hoverPulse.durationMs}ms ${p.hoverPulse.easing} infinite`,
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{aff}</span>
                </div>
              );
            })}
          </div>
          <div className="ml-auto text-[10px] text-zinc-600 font-mono tabular-nums">
            {p.hoverPulse.durationMs}ms · {p.hoverPulse.startScale}×→{p.hoverPulse.endScale}× · α {p.hoverPulse.startOpacity}→0
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hoverPulseRipple {
          from {
            opacity: ${p.hoverPulse.startOpacity};
            transform: translate(-50%, -50%) scale(${p.hoverPulse.startScale});
          }
          to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(${p.hoverPulse.endScale});
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .will-change-\\[transform\\,opacity\\] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
