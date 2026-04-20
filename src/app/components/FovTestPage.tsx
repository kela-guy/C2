import { useState, useMemo, useCallback, useRef } from 'react';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Camera } from 'lucide-react';
import { fovPolygon, FOV_RADIUS_M } from '@/app/lib/mapGeo';
import { MAPBOX_TOKEN, getMapInstance, tryMapOp } from '@/app/lib/mapUtils';

const SENSOR = {
  id: 'test-camera',
  lat: 32.47,
  lon: 35.0,
  fovDeg: 90,
  bearingDeg: 45,
} as const;

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as never[] };

const FOV_FILL_PAINT = {
  'fill-color': 'rgba(34, 211, 238, 0.40)',
  'fill-outline-color': 'rgba(34, 211, 238, 1.0)',
} as const;

const FOV_LINE_PAINT = {
  'line-color': 'rgba(34, 211, 238, 1.0)',
  'line-width': 2.5,
} as const;

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

  const pushFov = useCallback((data: typeof EMPTY_FC | typeof fovGeoJSON) => {
    tryMapOp('FovTestPage.pushFov', () => {
      const map = getMapInstance(mapRef);
      if (!map) return;
      const src = map.getSource('test-fov') as mapboxgl.GeoJSONSource | undefined;
      if (src?.setData) {
        src.setData(data);
        map.triggerRepaint();
      }
    });
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
        mapboxAccessToken={MAPBOX_TOKEN}
        reuseMaps
        antialias={false}
        renderWorldCopies={false}
        maxTileCacheSize={50}
      >
        <Source id="test-fov" type="geojson" data={fovGeoJSON}>
          <Layer id="test-fov-fill" type="fill" paint={FOV_FILL_PAINT} />
          <Layer id="test-fov-line" type="line" paint={FOV_LINE_PAINT} />
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
