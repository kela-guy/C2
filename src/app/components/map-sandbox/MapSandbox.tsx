/**
 * `/map-sandbox` route. DEV-only.
 *
 * A full-viewport `<CesiumMap>` with a side-mounted config panel for
 * live tweaking of scene settings. The panel state flows through
 * `useMapSettings` (localStorage-persisted), gets imperatively applied
 * to the viewer through `applyCesiumSettings`, and is mirrored to a
 * copy-paste TS block so values flow back into `CesiumMap.tsx`.
 *
 * Nothing here touches global config or production code. The sandbox
 * passes a `onViewerReady` callback into the otherwise prop-identical
 * `<CesiumMap>` so it can re-assert settings after Cesium-internal
 * mutations (scene-mode flips, async terrain landing) would stomp them.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type * as Cesium from 'cesium';

import { CesiumMap } from '@/primitives/CesiumMap';
import { applyCesiumSettings } from '@/primitives/applyCesiumSettings';
import { MapConfigPanel } from './MapConfigPanel';
import {
  MAP_SANDBOX_CENTER,
  MAP_SANDBOX_MARKERS,
  MAP_SANDBOX_POLYLINES,
} from './mapSandboxFixtures';
import { diffFromDefaults, serializeMapSettings } from './settingsCodeBlock';
import { useMapSettings } from './useMapSettings';

const CESIUM_ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';

export default function MapSandbox() {
  const api = useMapSettings();
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  const handleViewerReady = useCallback((viewer: Cesium.Viewer) => {
    viewerRef.current = viewer;
    applyCesiumSettings(viewer, api.settings);
  }, [api.settings]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    applyCesiumSettings(viewer, api.settings);
  }, [api.settings]);

  const codeBlock = useMemo(() => serializeMapSettings(api.settings), [api.settings]);
  const diffLines = useMemo(() => diffFromDefaults(api.settings), [api.settings]);

  if (!CESIUM_ION_TOKEN) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-surface-1 text-slate-11">
        <div className="rounded-md bg-accent-warning-tint px-4 py-3 text-sm shadow-[0_0_0_1px_var(--border-default)]">
          <strong>Cesium token missing.</strong> Set{' '}
          <code className="font-mono">VITE_CESIUM_ION_TOKEN</code> in{' '}
          <code className="font-mono">.env.local</code> and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-surface-void">
      <CesiumMap
        ionToken={CESIUM_ION_TOKEN}
        initialView={MAP_SANDBOX_CENTER}
        htmlMarkers={MAP_SANDBOX_MARKERS}
        polylines={MAP_SANDBOX_POLYLINES}
        sceneMode={api.settings.sceneMode}
        mapViewMode={api.settings.mapStyle}
        onViewerReady={handleViewerReady}
        className="absolute inset-0"
      />
      <MapConfigPanel api={api} codeBlock={codeBlock} diffLines={diffLines} />
    </div>
  );
}
