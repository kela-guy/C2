import { useState, useMemo, useCallback, useRef } from 'react';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Camera } from 'lucide-react';

const TOKEN = 'pk.eyJ1IjoiZ3V5c2hhIiwiYSI6ImNtZ3htODN0dTE2dGMybXFrYWRlZmN5MGMifQ.dIQzO3kIdQaES0pfedlRvA';
const EARTH_RADIUS_M = 6371000;
const FOV_RADIUS_M = 1200;

const SENSOR = {
  id: 'test-camera',
  lat: 32.47,
  lon: 35.0,
  fovDeg: 90,
  bearingDeg: 45,
};

function destination(lat: number, lon: number, distM: number, bearingDeg: number): [number, number] {
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distM / EARTH_RADIUS_M;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function fovPolygon(lat: number, lon: number, fovDeg: number, bearingDeg: number, radiusM: number): [number, number][] {
  const center: [number, number] = [lon, lat];
  if (fovDeg >= 360) {
    const points: [number, number][] = [center];
    for (let i = 0; i <= 32; i++) {
      points.push(destination(lat, lon, radiusM, (i / 32) * 360));
    }
    points.push(center);
    return points;
  }
  const startAngle = bearingDeg - fovDeg / 2;
  const steps = Math.max(8, Math.floor((fovDeg / 360) * 32));
  const points: [number, number][] = [center];
  for (let i = 0; i <= steps; i++) {
    points.push(destination(lat, lon, radiusM, startAngle + (fovDeg * i) / steps));
  }
  points.push(center);
  return points;
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as any[] };

export default function FovTestPage() {
  const mapRef = useRef<MapRef>(null);
  const [hovered, setHovered] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: SENSOR.lat,
    longitude: SENSOR.lon,
    zoom: 13.5,
  });

  const fovGeoJSON = useMemo(() => {
    if (!hovered) return EMPTY_FC;
    const ring = fovPolygon(SENSOR.lat, SENSOR.lon, SENSOR.fovDeg, SENSOR.bearingDeg, FOV_RADIUS_M);
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
        properties: {},
      }],
    };
  }, [hovered]);

  const pushFov = useCallback((data: typeof EMPTY_FC) => {
    const map = (mapRef.current as any)?.getMap?.() ?? mapRef.current;
    if (!map) return;
    const src = (map as any).getSource?.('test-fov');
    if (src && typeof src.setData === 'function') {
      src.setData(data);
      (map as any).triggerRepaint?.();
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, color: '#fff', fontFamily: 'sans-serif', fontSize: 14, background: 'rgba(0,0,0,0.7)', padding: '12px 16px', borderRadius: 8 }}>
        <strong>FOV Test</strong> — Hover the camera icon. FOV should appear.
        <br />
        <span style={{ color: hovered ? '#22d3ee' : '#888' }}>
          {hovered ? 'HOVERED — FOV should be visible' : 'Not hovered'}
        </span>
      </div>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        mapboxAccessToken={TOKEN}
      >
        <Source id="test-fov" type="geojson" data={fovGeoJSON}>
          <Layer id="test-fov-fill" type="fill" paint={{
            'fill-color': 'rgba(34, 211, 238, 0.40)',
            'fill-outline-color': 'rgba(34, 211, 238, 1.0)',
          }} />
          <Layer id="test-fov-line" type="line" paint={{
            'line-color': 'rgba(34, 211, 238, 1.0)',
            'line-width': 2.5,
          }} />
        </Source>

        <Marker
          latitude={SENSOR.lat}
          longitude={SENSOR.lon}
          anchor="center"
        >
          <div
            onMouseEnter={() => {
              setHovered(true);
              const ring = fovPolygon(SENSOR.lat, SENSOR.lon, SENSOR.fovDeg, SENSOR.bearingDeg, FOV_RADIUS_M);
              pushFov({
                type: 'FeatureCollection' as const,
                features: [{ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [ring] }, properties: {} }],
              });
            }}
            onMouseLeave={() => {
              setHovered(false);
              pushFov(EMPTY_FC);
            }}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: hovered ? 'rgba(34,211,238,0.3)' : 'rgba(0,0,0,0.6)',
              border: '2px solid #22d3ee',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <Camera size={18} color="#22d3ee" />
          </div>
        </Marker>
      </Map>
    </div>
  );
}
