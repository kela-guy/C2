import React, { useState, useEffect, useMemo } from 'react';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Crosshair, Map as MapIcon, AlertTriangle, ShieldAlert } from 'lucide-react';
import { TargetSystem } from '@/imports/ListOfSystems';

const TOKEN = 'pk.eyJ1IjoiZ3V5c2hhIiwiYSI6ImNtZ3htODN0dTE2dGMybXFrYWRlZmN5MGMifQ.dIQzO3kIdQaES0pfedlRvA';

export const TacticalMap = ({ 
  focusCoords, 
  targets = [], 
  activeTargetId, 
  onMarkerClick 
}: { 
  focusCoords?: { lat: number, lon: number } | null;
  targets?: TargetSystem[];
  activeTargetId?: string | null;
  onMarkerClick?: (targetId: string) => void;
}) => {
  const [viewState, setViewState] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
    zoom: 12.5,
    pitch: 45,
    bearing: -17.6,
    transitionDuration: 0,
  });

  // Fly to coords when they change
  useEffect(() => {
    if (focusCoords) {
        setViewState(prev => ({
            ...prev,
            latitude: focusCoords.lat,
            longitude: focusCoords.lon,
            zoom: 15,
            transitionDuration: 2000,
        }));
    }
  }, [focusCoords]);

  // Dedup targets to be safe
  const uniqueTargets = useMemo(() => {
      const seen = new Set();
      return targets.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
      });
  }, [targets]);

  return (
    <div className="absolute inset-0 bg-[#0a0a0a] overflow-hidden z-0">
      
      <Map
        {...viewState}
        reuseMaps
        onMove={evt => setViewState(prev => ({ ...evt.viewState, transitionDuration: 0 }))}
        style={{width: '100%', height: '100%'}}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={TOKEN}
        attributionControl={false}
      >
        {/* Navigation Control (Zoom/Compass) */}
        <div className="absolute top-24 left-4">
             <NavigationControl position="top-left" showCompass={true} showZoom={true} visualizer="dark" />
        </div>

        {/* Dynamic Markers */}
        {uniqueTargets.map(target => {
            const [lat, lon] = target.coordinates.split(',').map(c => parseFloat(c.trim()));
            if (isNaN(lat) || isNaN(lon)) return null;

            const isActive = target.id === activeTargetId;
            const isCritical = target.status === 'active' || target.status === 'engaged';

            return (
                <Marker 
                    key={target.id}
                    longitude={lon} 
                    latitude={lat} 
                    anchor="bottom"
                    onClick={(e) => {
                        e.originalEvent.stopPropagation();
                        onMarkerClick?.(target.id);
                    }}
                >
                    <div className={`relative group cursor-pointer transition-all duration-300 ${isActive ? 'scale-125 z-50' : 'scale-100 z-10'}`}>
                        {/* Pulse Ring for Active/Critical */}
                        {(isActive || isCritical) && (
                            <div className={`absolute -inset-4 rounded-full opacity-50 animate-ping ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`} />
                        )}
                        
                        {/* Marker Dot */}
                        <div className={`
                            w-4 h-4 rounded-full border-2 border-white shadow-lg transition-colors
                            ${isCritical ? 'bg-red-500 shadow-red-500/50' : 'bg-amber-500 shadow-amber-500/50'}
                            ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}
                        `} />

                        {/* Label (Always visible if active, otherwise on hover) */}
                        <div className={`
                            absolute -top-10 left-1/2 -translate-x-1/2 
                            bg-black/90 backdrop-blur text-white text-[10px] px-2 py-1 rounded border border-white/20 whitespace-nowrap 
                            transition-all duration-200 pointer-events-none flex items-center gap-1
                            ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}
                        `}>
                            {isCritical ? <ShieldAlert size={10} className="text-red-500" /> : <AlertTriangle size={10} className="text-amber-500" />}
                            <span className="font-mono font-bold">{target.id}</span>
                        </div>
                        
                        {/* Connection Line to bottom (if needed for 3D feel) */}
                        <div className="absolute top-full left-1/2 w-[1px] h-8 bg-gradient-to-b from-white/50 to-transparent -translate-x-1/2 pointer-events-none" />
                    </div>
                </Marker>
            );
        })}

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

    </div>
  );
};
