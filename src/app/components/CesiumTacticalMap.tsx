/**
 * CesiumTacticalMap — drop-in replacement for `TacticalMap` powered by CesiumJS.
 *
 * Mounts in `Dashboard` when the URL contains `?map=cesium`. Default is still
 * Mapbox (`TacticalMap`).
 *
 * **Batch 1 — Phases 2 + 3 (this revision):** every asset/detection now
 * renders as a real `<MapMarker>` SVG via the new `htmlMarkers` prop on
 * `CesiumMap`. Icons + threat-accent rings + heading rotation + click /
 * hover / right-click context menu are all wired through. Any prop the
 * dashboard passes to `TacticalMap` is accepted; visual + interaction
 * features that don't ship yet are documented in `docs/cesium-parity.md`.
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CesiumMap,
  type CesiumHtmlMarker,
  MapMarker,
  resolveMarkerStyle,
  type Affiliation,
  type InteractionState,
} from '@/primitives';
import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  DRONE_HIVE_ASSETS,
  LIDAR_ASSETS,
  WEAPON_SYSTEM_ASSETS,
  LAUNCHER_ASSETS,
  REGULUS_EFFECTORS,
  CameraIcon,
  RadarIcon,
  LidarIcon,
  DroneHiveIcon,
  LauncherIcon,
  SensorIcon,
  DroneIcon,
} from './TacticalMap';
import type { TacticalMapProps } from './TacticalMap';
import type { Detection } from '@/imports/ListOfSystems';

const CESIUM_ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

/** 2D scene "height" is orthographic frustum extent. 80 km gives a city view. */
const DEFAULT_INITIAL_VIEW = { lat: 32.466, lon: 35.005, heightM: 80_000 };

/** Pixel size for the SVG icon inside each MapMarker shell. */
const SENSOR_SURFACE = 36;
const TARGET_SURFACE = 40;

/**
 * Map a `Detection.status` onto an `InteractionState` so we can reuse the
 * existing `markerStyles.ts` palette. Mirrors the pairing the Mapbox map uses.
 */
function detectionInteractionState(d: Detection): InteractionState {
  switch (d.status) {
    case 'tracking':
      return 'active';
    case 'event':
    case 'event_neutralized':
    case 'event_resolved':
      return 'alert';
    case 'expired':
      return 'expired';
    case 'suspicion':
      return 'default';
    case 'detection':
    default:
      return 'default';
  }
}

/**
 * Right-click context-menu state. Mirrors what TacticalMap's Mapbox
 * implementation feeds back through `onContextMenuAction`.
 */
type ContextMenuState = {
  x: number;
  y: number;
  elementType: 'target' | 'sensor' | 'effector';
  elementId: string;
};

export function CesiumTacticalMap({
  targets,
  activeTargetId,
  hoveredTargetIdFromCard,
  hoveredSensorIdFromCard,
  selectedAssetId,
  offlineAssetIds,
  regulusEffectors,
  friendlyDrones,
  launcherEffectors,
  jammingJammerAssetId,
  onMarkerClick,
  onAssetClick,
  onContextMenuAction,
}: TacticalMapProps) {
  const offlineSet = useMemo(() => new Set(offlineAssetIds ?? []), [offlineAssetIds]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Tracks which marker the cursor is currently over (DOM-level hover).
  // Drives the white-on-hover ring + tooltip visibility regardless of
  // whether the hover came from this map or from the card sidebar.
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  // Stable callbacks, used inside memoised marker arrays.
  const onMarkerClickRef = useRef(onMarkerClick);
  const onAssetClickRef = useRef(onAssetClick);
  const onContextMenuActionRef = useRef(onContextMenuAction);
  onMarkerClickRef.current = onMarkerClick;
  onAssetClickRef.current = onAssetClick;
  onContextMenuActionRef.current = onContextMenuAction;

  const openContextMenu = useCallback(
    (e: React.MouseEvent, elementType: ContextMenuState['elementType'], elementId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, elementType, elementId });
    },
    [],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const fireContextAction = useCallback(
    (action: string) => {
      if (!contextMenu) return;
      onContextMenuActionRef.current?.(action, contextMenu.elementType, contextMenu.elementId);
      setContextMenu(null);
    },
    [contextMenu],
  );

  /**
   * Compose every asset registry + every dynamic prop into a single
   * `htmlMarkers[]`. Each entry pairs a geographic position with a React
   * node — usually a `<MapMarker>` SVG. Cesium's per-frame loop projects
   * the position to canvas coords; React handles the rest.
   *
   * Dedupe by id (LAUNCHER_ASSETS + launcherEffectors prop overlap).
   */
  const htmlMarkers = useMemo<CesiumHtmlMarker[]>(() => {
    const out: CesiumHtmlMarker[] = [];
    const seen = new Set<string>();

    /** Helper for friendly assets (cameras / radars / lidars / hives / weapons / launchers). */
    const pushFriendlyAsset = (
      id: string,
      lat: number,
      lon: number,
      icon: ReactNode,
      label: string,
      surfaceSize: number = SENSOR_SURFACE,
    ) => {
      if (seen.has(id)) return;
      seen.add(id);
      const isOffline = offlineSet.has(id);
      const isSelected = selectedAssetId === id;
      const isHoveredFromCard = hoveredSensorIdFromCard === id;
      const isHoveredOnMap = hoveredMarkerId === id;
      const isHovered = isHoveredFromCard || isHoveredOnMap;
      const affiliation: Affiliation = 'friendly';
      const state: InteractionState = isOffline
        ? 'disabled'
        : isHovered
          ? 'hovered'
          : isSelected
            ? 'selected'
            : 'default';
      const style = resolveMarkerStyle(state, affiliation);
      out.push({
        id,
        lat,
        lon,
        zIndex: isHovered ? 40 : isSelected ? 30 : 10,
        content: (
          <MapMarker
            icon={icon}
            style={style}
            surfaceSize={surfaceSize}
            label={label}
            showLabel={isHovered || isSelected}
            pulse={isHovered || isSelected}
          />
        ),
        onClick: () => onAssetClickRef.current?.(id),
        onContextMenu: (e) => openContextMenu(e, 'sensor', id),
        onMouseEnter: () => setHoveredMarkerId(id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === id ? null : current)),
      });
    };

    // Targets — hostile by default, state from `Detection.status`.
    if (targets) {
      for (const t of targets) {
        const [lat, lon] = (t.coordinates ?? '').split(',').map((s) => parseFloat(s.trim()));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        const isActive = activeTargetId === t.id;
        const isHoveredFromCard = hoveredTargetIdFromCard === t.id;
        const isHoveredOnMap = hoveredMarkerId === t.id;
        const isHovered = isHoveredFromCard || isHoveredOnMap;
        const baseState = detectionInteractionState(t);
        const state: InteractionState = isHovered
          ? 'hovered'
          : isActive
            ? 'selected'
            : baseState;
        const style = resolveMarkerStyle(state, 'hostile');
        out.push({
          id: t.id,
          lat,
          lon,
          zIndex: isHovered ? 60 : isActive ? 50 : 20,
          content: (
            <MapMarker
              icon={<DroneIcon />}
              style={style}
              surfaceSize={TARGET_SURFACE}
              label={t.name ?? t.id}
              showLabel={isHovered || isActive}
              pulse={isHovered || isActive}
            />
          ),
          onClick: () => onMarkerClickRef.current?.(t.id),
          onContextMenu: (e) => openContextMenu(e, 'target', t.id),
          onMouseEnter: () => setHoveredMarkerId(t.id),
          onMouseLeave: () => setHoveredMarkerId((current) => (current === t.id ? null : current)),
        });
      }
    }

    // Static asset registries.
    for (const a of CAMERA_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <CameraIcon />, a.typeLabel);
    }
    for (const a of RADAR_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <RadarIcon />, a.typeLabel);
    }
    for (const a of LIDAR_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <LidarIcon />, a.typeLabel);
    }
    for (const a of DRONE_HIVE_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <DroneHiveIcon />, a.typeLabel);
    }
    for (const a of WEAPON_SYSTEM_ASSETS) {
      pushFriendlyAsset(a.id, a.latitude, a.longitude, <LauncherIcon size={32} />, a.typeLabel, 48);
    }
    for (const l of LAUNCHER_ASSETS) {
      pushFriendlyAsset(l.id, l.latitude, l.longitude, <LauncherIcon size={32} />, l.id, 48);
    }

    // Regulus effectors — friendly assets but treated as effectors for context menu.
    // Default state, only flips to `'jammer'` (green ring + pulse) when this
    // specific Regulus is actively jamming.
    const effectors = regulusEffectors ?? REGULUS_EFFECTORS;
    for (const e of effectors) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const isJamming = jammingJammerAssetId === e.id;
      const isHoveredFromCard = hoveredSensorIdFromCard === e.id;
      const isHoveredOnMap = hoveredMarkerId === e.id;
      const isHovered = isHoveredFromCard || isHoveredOnMap;
      const state: InteractionState = isHovered
        ? 'hovered'
        : isJamming
          ? 'jammer'
          : 'default';
      const style = resolveMarkerStyle(state, 'friendly');
      out.push({
        id: e.id,
        lat: e.lat,
        lon: e.lon,
        zIndex: isHovered ? 40 : 15,
        content: (
          <MapMarker
            icon={<SensorIcon />}
            style={style}
            surfaceSize={SENSOR_SURFACE}
            label={e.name}
            showLabel={isHovered}
            pulse={isHovered}
          />
        ),
        onClick: () => onAssetClickRef.current?.(e.id),
        onContextMenu: (ev) => openContextMenu(ev, 'effector', e.id),
        onMouseEnter: () => setHoveredMarkerId(e.id),
        onMouseLeave: () => setHoveredMarkerId((current) => (current === e.id ? null : current)),
      });
    }

    // Friendly drones — heading rotation if available.
    if (friendlyDrones) {
      for (const d of friendlyDrones) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        const isHovered = hoveredMarkerId === d.id;
        const state: InteractionState = isHovered ? 'hovered' : 'default';
        const style = resolveMarkerStyle(state, 'friendly');
        out.push({
          id: d.id,
          lat: d.lat,
          lon: d.lon,
          zIndex: isHovered ? 40 : 25,
          content: (
            <MapMarker
              icon={<DroneIcon rotationDeg={d.headingDeg ?? 0} />}
              style={style}
              surfaceSize={SENSOR_SURFACE}
              heading={d.headingDeg}
              label={d.name}
              showLabel={isHovered}
              pulse={isHovered}
            />
          ),
          onClick: () => onAssetClickRef.current?.(d.id),
          onMouseEnter: () => setHoveredMarkerId(d.id),
          onMouseLeave: () => setHoveredMarkerId((current) => (current === d.id ? null : current)),
        });
      }
    }

    // Launcher effectors (dashboard prop) — overlaps LAUNCHER_ASSETS, dedupe applies.
    if (launcherEffectors) {
      for (const l of launcherEffectors) {
        const lat = (l as unknown as { lat?: number }).lat;
        const lon = (l as unknown as { lon?: number }).lon;
        if (typeof lat !== 'number' || typeof lon !== 'number') continue;
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        const isHovered = hoveredMarkerId === l.id;
        const state: InteractionState = isHovered ? 'hovered' : 'default';
        const style = resolveMarkerStyle(state, 'friendly');
        out.push({
          id: l.id,
          lat,
          lon,
          zIndex: isHovered ? 40 : 15,
          content: (
            <MapMarker
              icon={<LauncherIcon size={32} />}
              style={style}
              surfaceSize={48}
              label={(l as unknown as { name?: string }).name ?? l.id}
              showLabel={isHovered}
              pulse={isHovered}
            />
          ),
          onClick: () => onAssetClickRef.current?.(l.id),
          onContextMenu: (e) => openContextMenu(e, 'effector', l.id),
          onMouseEnter: () => setHoveredMarkerId(l.id),
          onMouseLeave: () => setHoveredMarkerId((current) => (current === l.id ? null : current)),
        });
      }
    }

    return out;
  }, [
    targets,
    activeTargetId,
    hoveredTargetIdFromCard,
    hoveredSensorIdFromCard,
    selectedAssetId,
    offlineSet,
    regulusEffectors,
    friendlyDrones,
    launcherEffectors,
    jammingJammerAssetId,
    hoveredMarkerId,
    openContextMenu,
  ]);

  if (!CESIUM_ION_TOKEN) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="rounded-md bg-amber-500/10 px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <strong>Cesium token missing.</strong> Set <code className="font-mono">VITE_CESIUM_ION_TOKEN</code> in <code className="font-mono">.env.local</code> and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Phase indicator — physical-left so RTL chrome doesn't bury it. */}
      <div
        className="pointer-events-none absolute top-2 left-2 z-10 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-200 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
        aria-live="polite"
      >
        Cesium backend — Phases 2+3 ({htmlMarkers.length} markers)
      </div>

      <CesiumMap
        ionToken={CESIUM_ION_TOKEN}
        initialView={DEFAULT_INITIAL_VIEW}
        htmlMarkers={htmlMarkers}
        sceneMode="2D"
        className="absolute inset-0"
      />

      {contextMenu && (
        <CesiumContextMenu
          state={contextMenu}
          onClose={closeContextMenu}
          onAction={fireContextAction}
        />
      )}
    </div>
  );
}

/**
 * Right-click context menu shown over the Cesium canvas. Action ids match
 * what the existing Mapbox handler in `Dashboard.tsx` looks for in
 * `onContextMenuAction(action, elementType, elementId)`.
 */
function CesiumContextMenu({
  state,
  onClose,
  onAction,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const items = state.elementType === 'target'
    ? [
        { id: 'open-card', label: 'פתח כרטיס' },
        { id: 'mitigate', label: 'שיבוש' },
        { id: 'mitigate-all', label: 'שיבוש כולל' },
        { id: 'track', label: 'מעקב' },
        { id: 'investigate', label: 'חקירה' },
        { id: 'dismiss', label: 'דחייה' },
      ]
    : state.elementType === 'sensor'
      ? [{ id: 'view-feed', label: 'צפה בהזנה' }]
      : [];

  if (items.length === 0) {
    onClose();
    return null;
  }

  return (
    <>
      {/* Backdrop closes the menu on outside click. */}
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-50 min-w-[160px] rounded-md bg-[#1c1c20] py-1 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.5)]"
        style={{ top: state.y, left: state.x }}
        role="menu"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={() => onAction(item.id)}
            className="block w-full px-3 py-1.5 text-end text-[12px] hover:bg-white/[0.08] focus-visible:bg-white/[0.08] focus-visible:outline-none cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
