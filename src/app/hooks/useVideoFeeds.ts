/**
 * useVideoFeeds — owns the video-panel state slice:
 *
 *   - `tabs` array (each tab owns feeds + layout + activeFeedIndex)
 *   - `activeTabIndex` for the header tab strip
 *   - active-tab projections (`feeds`, `layout`, `activeFeedIndex`)
 *   - `cameraOwnership` map (`self` / `other` / `none`)
 *   - `cameraZoomById` map for the per-tile zoom controls
 *
 * Pin click opens a new tab. Drag onto the panel adds a stream to the
 * active tab as split view.
 *
 * Persistence schema (`c2.video-tabs.v2`):
 *   { activeTabIndex, tabs: [{ id, layout, activeFeedIndex, feeds }] }
 * Reads also accept the legacy `c2.video-layout.v1` flat shape and
 * migrate on first write. `playback` state is intentionally not
 * persisted — it's a transient scrub session.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CameraFeed,
  CameraFeedTab,
  DayNightMode,
  LayoutKind,
} from "@/app/components/camera-v2/types";

const TABS_STORAGE_KEY = "c2.video-tabs.v2";
const LEGACY_STORAGE_KEY = "c2.video-layout.v1";
const LAYOUT_KINDS: LayoutKind[] = [
  "single",
  "stack-2",
  "grid-2x2",
  "hero-filmstrip",
];
const DAY_NIGHT_MODES: DayNightMode[] = ["day", "night"];
/** Per-tab stream cap (`hero-filmstrip` accommodates 1 hero + up to 4 thumbs). */
export const MAX_VIDEO_FEEDS = 5;

interface PersistedV2Snapshot {
  activeTabIndex: number;
  tabs: CameraFeedTab[];
}

interface LegacyPersistedShape {
  layout?: unknown;
  activeFeedIndex?: unknown;
  heroIndex?: unknown;
  feeds?: unknown;
}

interface PersistedTabShape {
  id?: unknown;
  layout?: unknown;
  activeFeedIndex?: unknown;
  feeds?: unknown;
}

const DEFAULT_SNAPSHOT: PersistedV2Snapshot = {
  activeTabIndex: 0,
  tabs: [],
};

let tabIdCounter = 0;
function newTabId(): string {
  tabIdCounter += 1;
  return `tab-${tabIdCounter}-${Date.now()}`;
}

function sanitizeFeeds(raw: unknown): CameraFeed[] {
  if (!Array.isArray(raw)) return [];
  const out: CameraFeed[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as { cameraId?: unknown; mode?: unknown };
    if (typeof r.cameraId !== "string" || r.cameraId.length === 0) continue;
    const mode: DayNightMode = DAY_NIGHT_MODES.includes(r.mode as DayNightMode)
      ? (r.mode as DayNightMode)
      : "day";
    out.push({ cameraId: r.cameraId, mode });
    if (out.length >= MAX_VIDEO_FEEDS) break;
  }
  return out;
}

function sanitizeTab(raw: unknown): CameraFeedTab | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as PersistedTabShape;
  const feeds = sanitizeFeeds(r.feeds);
  if (feeds.length === 0) return null;
  const layout = LAYOUT_KINDS.includes(r.layout as LayoutKind)
    ? (r.layout as LayoutKind)
    : "single";
  const rawActive =
    typeof r.activeFeedIndex === "number" ? r.activeFeedIndex : 0;
  const activeFeedIndex = Number.isFinite(rawActive)
    ? Math.min(Math.max(0, Math.floor(rawActive)), feeds.length - 1)
    : 0;
  const id =
    typeof r.id === "string" && r.id.length > 0 ? r.id : newTabId();
  return { id, feeds, layout, activeFeedIndex };
}

function loadLegacySnapshot(): PersistedV2Snapshot {
  if (typeof window === "undefined") return DEFAULT_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_SNAPSHOT;
    const parsed = JSON.parse(raw) as LegacyPersistedShape;
    const layout = LAYOUT_KINDS.includes(parsed.layout as LayoutKind)
      ? (parsed.layout as LayoutKind)
      : "grid-2x2";
    const rawActive =
      typeof parsed.activeFeedIndex === "number"
        ? parsed.activeFeedIndex
        : typeof parsed.heroIndex === "number"
          ? parsed.heroIndex
          : 0;
    const activeFeedIndex = Number.isFinite(rawActive)
      ? Math.max(0, Math.floor(rawActive))
      : 0;
    const feeds = sanitizeFeeds(parsed.feeds);
    if (feeds.length === 0) return DEFAULT_SNAPSHOT;
    return {
      activeTabIndex: 0,
      tabs: [
        {
          id: newTabId(),
          feeds,
          layout,
          activeFeedIndex: Math.min(activeFeedIndex, feeds.length - 1),
        },
      ],
    };
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function loadPersistedSnapshot(): PersistedV2Snapshot {
  if (typeof window === "undefined") return DEFAULT_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return loadLegacySnapshot();
    const parsed = JSON.parse(raw) as {
      activeTabIndex?: unknown;
      tabs?: unknown;
    };
    const tabs: CameraFeedTab[] = [];
    if (Array.isArray(parsed.tabs)) {
      for (const item of parsed.tabs) {
        const tab = sanitizeTab(item);
        if (tab) tabs.push(tab);
      }
    }
    const rawActive =
      typeof parsed.activeTabIndex === "number" ? parsed.activeTabIndex : 0;
    const activeTabIndex = Number.isFinite(rawActive)
      ? Math.max(0, Math.floor(rawActive))
      : 0;
    if (tabs.length === 0) return DEFAULT_SNAPSHOT;
    return {
      activeTabIndex: Math.min(activeTabIndex, tabs.length - 1),
      tabs,
    };
  } catch {
    return loadLegacySnapshot();
  }
}

function tabsForPersist(tabs: CameraFeedTab[]): CameraFeedTab[] {
  return tabs.map((tab) => ({
    id: tab.id,
    layout: tab.layout,
    activeFeedIndex: tab.activeFeedIndex,
    feeds: tab.feeds.map(({ cameraId, mode }) => ({ cameraId, mode })),
  }));
}

function clampActiveTabIndex(index: number, tabCount: number): number {
  if (tabCount === 0) return 0;
  return Math.min(Math.max(index, 0), tabCount - 1);
}

function makeFeed(deviceId: string): CameraFeed {
  return { cameraId: deviceId, mode: "day" };
}

function makeTab(deviceId: string): CameraFeedTab {
  return {
    id: newTabId(),
    feeds: [makeFeed(deviceId)],
    layout: "single",
    activeFeedIndex: 0,
  };
}

function patchActiveTab(
  tabs: CameraFeedTab[],
  activeTabIndex: number,
  patch: (tab: CameraFeedTab) => CameraFeedTab,
): CameraFeedTab[] {
  const idx = clampActiveTabIndex(activeTabIndex, tabs.length);
  if (tabs.length === 0) return tabs;
  return tabs.map((tab, i) => (i === idx ? patch(tab) : tab));
}

export interface VideoFeedsApi {
  tabs: CameraFeedTab[];
  activeTabIndex: number;
  setActiveTabIndex: (next: number) => void;

  feeds: CameraFeed[];
  setFeeds: React.Dispatch<React.SetStateAction<CameraFeed[]>>;
  isOpen: boolean;
  closeAll: () => void;
  closeTab: (index: number) => void;

  layout: LayoutKind;
  setLayout: (next: LayoutKind) => void;

  activeFeedIndex: number;
  setActiveFeedIndex: (next: number) => void;

  cameraOwnership: Record<string, "self" | "other" | "none">;
  setCameraOwnership: React.Dispatch<
    React.SetStateAction<Record<string, "self" | "other" | "none">>
  >;
  cameraZoomById: Record<string, number>;
  setCameraZoomById: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;

  pinnedDeviceIds: ReadonlySet<string>;
  openDeviceTab: (deviceId: string) => void;
  addDeviceToActiveTab: (deviceId: string) => void;
  addDeviceToTab: (tabIndex: number, deviceId: string) => void;
  mergeTabIntoTab: (sourceTabIndex: number, targetTabIndex: number) => void;
  focusTabFeed: (tabIndex: number, feedIndex: number) => void;
  unpinDevice: (deviceId: string) => void;
  recordTileFocus: (cameraId: string) => void;
}

export function useVideoFeeds(): VideoFeedsApi {
  const initial = loadPersistedSnapshot();
  const [tabs, setTabs] = useState<CameraFeedTab[]>(() => initial.tabs);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(
    () => initial.activeTabIndex,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        TABS_STORAGE_KEY,
        JSON.stringify({
          activeTabIndex,
          tabs: tabsForPersist(tabs),
        } satisfies PersistedV2Snapshot),
      );
    } catch {
      // ignore
    }
  }, [activeTabIndex, tabs]);

  useEffect(() => {
    if (tabs.length === 0) return;
    if (activeTabIndex >= tabs.length) {
      setActiveTabIndex(Math.max(0, tabs.length - 1));
    }
  }, [tabs.length, activeTabIndex]);

  const [cameraOwnership, setCameraOwnership] = useState<
    Record<string, "self" | "other" | "none">
  >({});
  const [cameraZoomById, setCameraZoomById] = useState<
    Record<string, number>
  >({});

  const focusOrderRef = useRef<string[]>([]);
  const activeTabIndexRef = useRef(activeTabIndex);
  activeTabIndexRef.current = activeTabIndex;

  const safeActiveTabIndex = clampActiveTabIndex(activeTabIndex, tabs.length);
  const activeTab = tabs[safeActiveTabIndex];

  const feeds = activeTab?.feeds ?? [];
  const layout = activeTab?.layout ?? "single";
  const activeFeedIndex = activeTab?.activeFeedIndex ?? 0;

  const pinnedDeviceIds = useMemo(() => {
    const set = new Set<string>();
    for (const tab of tabs) {
      for (const f of tab.feeds) {
        if (f.cameraId) set.add(f.cameraId);
      }
    }
    return set;
  }, [tabs]);

  const setFeeds = useCallback(
    (action: React.SetStateAction<CameraFeed[]>) => {
      setTabs((prev) => {
        if (prev.length === 0) return prev;
        const idx = clampActiveTabIndex(activeTabIndex, prev.length);
        const currentFeeds = prev[idx]?.feeds ?? [];
        const nextFeeds =
          typeof action === "function" ? action(currentFeeds) : action;
        return prev.map((tab, i) =>
          i === idx ? { ...tab, feeds: nextFeeds } : tab,
        );
      });
    },
    [activeTabIndex],
  );

  const setLayout = useCallback(
    (next: LayoutKind) => {
      setTabs((prev) =>
        patchActiveTab(prev, activeTabIndex, (tab) => ({ ...tab, layout: next })),
      );
    },
    [activeTabIndex],
  );

  const setActiveFeedIndex = useCallback(
    (next: number) => {
      setTabs((prev) =>
        patchActiveTab(prev, activeTabIndex, (tab) => ({
          ...tab,
          activeFeedIndex: Math.min(
            Math.max(next, 0),
            Math.max(tab.feeds.length - 1, 0),
          ),
        })),
      );
    },
    [activeTabIndex],
  );

  const closeAll = useCallback(() => {
    setTabs([]);
    setActiveTabIndex(0);
  }, []);

  const closeTab = useCallback((index: number) => {
    setTabs((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setActiveTabIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  }, []);

  const recordTileFocus = useCallback((cameraId: string) => {
    if (!cameraId) return;
    focusOrderRef.current = [
      cameraId,
      ...focusOrderRef.current.filter((id) => id !== cameraId),
    ];
  }, []);

  const deviceAlreadyPinned = useCallback(
    (deviceId: string) => pinnedDeviceIds.has(deviceId),
    [pinnedDeviceIds],
  );

  const openDeviceTab = useCallback(
    (deviceId: string) => {
      if (deviceAlreadyPinned(deviceId)) return;
      setTabs((prev) => {
        const next = [...prev, makeTab(deviceId)];
        setActiveTabIndex(next.length - 1);
        return next;
      });
    },
    [deviceAlreadyPinned],
  );

  const appendDeviceToTab = useCallback(
    (
      prev: CameraFeedTab[],
      tabIndex: number,
      deviceId: string,
    ): CameraFeedTab[] | null => {
      if (prev.some((tab) => tab.feeds.some((f) => f.cameraId === deviceId))) {
        return null;
      }

      if (prev.length === 0) {
        return [makeTab(deviceId)];
      }

      const idx = clampActiveTabIndex(tabIndex, prev.length);
      const tab = prev[idx];
      if (!tab || tab.feeds.length >= MAX_VIDEO_FEEDS) return null;

      const nextFeeds = [...tab.feeds, makeFeed(deviceId)];
      const nextLayout =
        tab.layout === "single" && nextFeeds.length === 2 ? "stack-2" : tab.layout;

      return prev.map((t, i) =>
        i === idx ? { ...t, feeds: nextFeeds, layout: nextLayout } : t,
      );
    },
    [],
  );

  const addDeviceToTab = useCallback(
    (tabIndex: number, deviceId: string) => {
      if (deviceAlreadyPinned(deviceId)) return;

      setTabs((prev) => {
        const next = appendDeviceToTab(prev, tabIndex, deviceId);
        if (!next) return prev;
        if (prev.length === 0) setActiveTabIndex(0);
        else setActiveTabIndex(clampActiveTabIndex(tabIndex, next.length));
        return next;
      });
    },
    [appendDeviceToTab, deviceAlreadyPinned],
  );

  const addDeviceToActiveTab = useCallback(
    (deviceId: string) => {
      if (deviceAlreadyPinned(deviceId)) return;

      setTabs((prev) => {
        const idx =
          prev.length === 0
            ? 0
            : clampActiveTabIndex(activeTabIndexRef.current, prev.length);
        const next = appendDeviceToTab(prev, idx, deviceId);
        if (!next) return prev;
        if (prev.length === 0) setActiveTabIndex(0);
        return next;
      });
    },
    [appendDeviceToTab, deviceAlreadyPinned],
  );

  const mergeTabIntoTab = useCallback(
    (sourceTabIndex: number, targetTabIndex: number) => {
      if (sourceTabIndex === targetTabIndex) return;

      setTabs((prev) => {
        if (
          sourceTabIndex < 0 ||
          targetTabIndex < 0 ||
          sourceTabIndex >= prev.length ||
          targetTabIndex >= prev.length
        ) {
          return prev;
        }

        const source = prev[sourceTabIndex];
        const target = prev[targetTabIndex];
        const existingIds = new Set(
          target.feeds.map((f) => f.cameraId).filter(Boolean),
        );
        const incoming = source.feeds.filter(
          (f) => f.cameraId && !existingIds.has(f.cameraId),
        );

        if (target.feeds.length + incoming.length > MAX_VIDEO_FEEDS) {
          return prev;
        }

        const nextFeeds = [...target.feeds, ...incoming];
        const nextLayout =
          target.layout === "single" && nextFeeds.length >= 2
            ? "stack-2"
            : target.layout;

        const next = prev
          .map((t, i) =>
            i === targetTabIndex
              ? { ...t, feeds: nextFeeds, layout: nextLayout }
              : t,
          )
          .filter((_, i) => i !== sourceTabIndex);

        let mergedTargetIndex = targetTabIndex;
        if (sourceTabIndex < targetTabIndex) mergedTargetIndex -= 1;

        setActiveTabIndex((active) => {
          if (active === sourceTabIndex) return mergedTargetIndex;
          if (active > sourceTabIndex) return active - 1;
          return active;
        });

        return next;
      });
    },
    [],
  );

  const focusTabFeed = useCallback((tabIndex: number, feedIndex: number) => {
    setActiveTabIndex(tabIndex);
    setTabs((prev) => {
      if (tabIndex < 0 || tabIndex >= prev.length) return prev;
      const tab = prev[tabIndex];
      const clamped = Math.min(
        Math.max(feedIndex, 0),
        Math.max(tab.feeds.length - 1, 0),
      );
      return prev.map((t, i) =>
        i === tabIndex ? { ...t, activeFeedIndex: clamped } : t,
      );
    });
  }, []);

  const unpinDevice = useCallback((deviceId: string) => {
    setTabs((prev) => {
      const removedTabIndices: number[] = [];
      const next: CameraFeedTab[] = [];

      prev.forEach((tab, i) => {
        const filtered = tab.feeds.filter((f) => f.cameraId !== deviceId);
        if (filtered.length === 0) {
          removedTabIndices.push(i);
          return;
        }
        const activeFeedIndex = Math.min(
          tab.activeFeedIndex,
          filtered.length - 1,
        );
        next.push({ ...tab, feeds: filtered, activeFeedIndex });
      });

      setActiveTabIndex((active) => {
        if (next.length === 0) return 0;
        let adjusted = active;
        for (const removed of removedTabIndices.sort((a, b) => a - b)) {
          if (adjusted > removed) adjusted -= 1;
          else if (adjusted === removed) {
            adjusted = Math.min(adjusted, next.length - 1);
          }
        }
        return Math.min(Math.max(adjusted, 0), next.length - 1);
      });

      return next;
    });
  }, []);

  return {
    tabs,
    activeTabIndex: safeActiveTabIndex,
    setActiveTabIndex,
    feeds,
    setFeeds,
    isOpen: tabs.length > 0,
    closeAll,
    closeTab,
    layout,
    setLayout,
    activeFeedIndex,
    setActiveFeedIndex,
    cameraOwnership,
    setCameraOwnership,
    cameraZoomById,
    setCameraZoomById,
    pinnedDeviceIds,
    openDeviceTab,
    addDeviceToActiveTab,
    addDeviceToTab,
    mergeTabIntoTab,
    focusTabFeed,
    unpinDevice,
    recordTileFocus,
  };
}
