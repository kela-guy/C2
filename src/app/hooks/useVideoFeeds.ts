/**
 * useVideoFeeds — owns the video-panel state slice:
 *
 *   - `feeds` array (camera ids currently mounted in tiles)
 *   - operator-chosen `layout` + `heroIndex`, persisted to
 *     localStorage so the panel reopens in the same shape
 *   - `cameraOwnership` map (`self` / `other` / `none`)
 *   - `cameraZoomById` map for the per-tile zoom controls
 *   - clamp logic for `heroIndex` when feeds shrink below it
 *
 * The hook is intentionally state-only — the legacy Dashboard's
 * imperative callbacks (`handleTakeControl`, drag-to-pin handlers,
 * etc.) compose these primitives, but stay in the Dashboard for
 * now because they touch UI panels and tour state. A future PR
 * can lift the obvious ones in.
 */

import { useCallback, useEffect, useState } from "react";
import type { CameraFeed, LayoutKind } from "@/app/components/camera-v2/types";

const LAYOUT_STORAGE_KEY = "c2.video-layout.v1";
const LAYOUT_KINDS: LayoutKind[] = [
  "single",
  "stack-2",
  "grid-2x2",
  "hero-filmstrip",
];
/** `hero-filmstrip` accommodates 1 hero + up to 4 thumbs. */
export const MAX_VIDEO_FEEDS = 5;

interface PersistedLayout {
  layout: LayoutKind;
  heroIndex: number;
}

function loadPersistedLayout(): PersistedLayout {
  if (typeof window === "undefined")
    return { layout: "grid-2x2", heroIndex: 0 };
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return { layout: "grid-2x2", heroIndex: 0 };
    const parsed = JSON.parse(raw) as Partial<PersistedLayout>;
    const layout = LAYOUT_KINDS.includes(parsed.layout as LayoutKind)
      ? (parsed.layout as LayoutKind)
      : "grid-2x2";
    const heroIndex =
      typeof parsed.heroIndex === "number" && Number.isFinite(parsed.heroIndex)
        ? Math.max(0, Math.floor(parsed.heroIndex))
        : 0;
    return { layout, heroIndex };
  } catch {
    return { layout: "grid-2x2", heroIndex: 0 };
  }
}

export interface VideoFeedsApi {
  feeds: CameraFeed[];
  setFeeds: React.Dispatch<React.SetStateAction<CameraFeed[]>>;
  isOpen: boolean;
  closeAll: () => void;

  layout: LayoutKind;
  setLayout: (next: LayoutKind) => void;

  heroIndex: number;
  setHeroIndex: (next: number) => void;

  cameraOwnership: Record<string, "self" | "other" | "none">;
  setCameraOwnership: React.Dispatch<
    React.SetStateAction<Record<string, "self" | "other" | "none">>
  >;
  cameraZoomById: Record<string, number>;
  setCameraZoomById: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
}

export function useVideoFeeds(): VideoFeedsApi {
  const [feeds, setFeeds] = useState<CameraFeed[]>([]);
  const [layout, setLayout] = useState<LayoutKind>(
    () => loadPersistedLayout().layout,
  );
  const [heroIndex, setHeroIndex] = useState<number>(
    () => loadPersistedLayout().heroIndex,
  );

  // Persist layout + hero index. Non-critical — silently swallow
  // quota / SecurityError so the operator's session continues.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify({ layout, heroIndex } satisfies PersistedLayout),
      );
    } catch {
      // ignore
    }
  }, [layout, heroIndex]);

  // Clamp heroIndex when feeds shrink below it so the hero slot
  // can't point past the array end. The panel renders its own
  // fallback on out-of-bounds values, but this also keeps the
  // localStorage value sane on the next reload.
  useEffect(() => {
    if (feeds.length === 0) return;
    if (heroIndex >= feeds.length) setHeroIndex(0);
  }, [feeds.length, heroIndex]);

  const [cameraOwnership, setCameraOwnership] = useState<
    Record<string, "self" | "other" | "none">
  >({});
  const [cameraZoomById, setCameraZoomById] = useState<
    Record<string, number>
  >({});

  const closeAll = useCallback(() => setFeeds([]), []);

  return {
    feeds,
    setFeeds,
    isOpen: feeds.length > 0,
    closeAll,
    layout,
    setLayout,
    heroIndex,
    setHeroIndex,
    cameraOwnership,
    setCameraOwnership,
    cameraZoomById,
    setCameraZoomById,
  };
}
