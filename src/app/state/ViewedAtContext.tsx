/**
 * Global time-machine clock. Owns `viewedAtMs` — the wall-clock
 * the dashboard renders at — plus playback state. When the value
 * is within `LIVE_EPSILON_MS` of `Date.now()`, `isLive` is true and
 * every consumer skips its history-projection codepath, leaving
 * the live sim at zero overhead.
 *
 * Drag the footer scrubber backward → `seekTo` flips out of live.
 * Hit Play (or click a History row) → `play()` advances `viewedAtMs`
 * via rAF until it catches the live edge again. Reduced-motion
 * users get instant seeks; the rAF loop is skipped entirely.
 */

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export interface ViewedAtApi {
  /** The wall-clock the whole dashboard projects to. */
  viewedAtMs: number;
  /** True when `viewedAtMs` is within ~250ms of now. */
  isLive: boolean;
  /** True when the rAF clock is advancing `viewedAtMs`. */
  playing: boolean;
  /** Playback rate (no-op while live). */
  speed: PlaybackSpeed;
  /** Replace `viewedAtMs`; pauses if you seek away from now. */
  seekTo: (nextMs: number) => void;
  /** Relative seek (`+/- ms`). */
  jog: (deltaMs: number) => void;
  /** Start the rAF clock. No-op if already live. */
  play: () => void;
  /** Stop the rAF clock. */
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (next: PlaybackSpeed) => void;
  /** Snap back to live. */
  reset: () => void;
}

/** Within 250ms of now ⇒ live. Slightly larger than one rAF tick. */
const LIVE_EPSILON_MS = 250;

const ViewedAtContext = createContext<ViewedAtApi | null>(null);

interface ViewedAtProviderProps {
  children: ReactNode;
}

function ViewedAtProviderImpl({ children }: ViewedAtProviderProps) {
  const [viewedAtMs, setViewedAtMs] = useState(() => Date.now());
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const [isLive, setIsLive] = useState(true);
  const prefersReducedMotionRef = useRef(false);
  const playingRef = useRef(playing);
  const speedRef = useRef<PlaybackSpeed>(speed);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      prefersReducedMotionRef.current = mq.matches;
      if (mq.matches) setPlaying(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const checkLive = useCallback((nextMs: number) => {
    return Math.abs(nextMs - Date.now()) <= LIVE_EPSILON_MS;
  }, []);

  const seekTo = useCallback(
    (nextMs: number) => {
      const clamped = Math.min(nextMs, Date.now());
      const live = checkLive(clamped);
      setViewedAtMs(live ? Date.now() : clamped);
      setIsLive(live);
      if (live) setPlaying(false);
    },
    [checkLive],
  );

  const play = useCallback(() => {
    if (prefersReducedMotionRef.current) return;
    setPlaying(true);
  }, []);

  const pause = useCallback(() => setPlaying(false), []);

  const togglePlay = useCallback(() => {
    if (prefersReducedMotionRef.current) return;
    setPlaying((p) => !p);
  }, []);

  const jog = useCallback(
    (deltaMs: number) => {
      seekTo(viewedAtMs + deltaMs);
    },
    [seekTo, viewedAtMs],
  );

  const setSpeed = useCallback((next: PlaybackSpeed) => {
    setSpeedState(next);
  }, []);

  const reset = useCallback(() => {
    setViewedAtMs(Date.now());
    setIsLive(true);
    setPlaying(false);
  }, []);

  // 1 Hz live re-pin — when isLive, viewedAtMs follows the wall clock
  // so projected views render at "now" without waking projection
  // selectors more often than necessary.
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setViewedAtMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  // rAF playback loop — advances viewedAtMs by elapsed * speed every
  // frame while playing. Catches the live edge → flips to live mode
  // and stops.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setViewedAtMs((prev) => {
        const next = prev + dt * speedRef.current;
        const nowMs = Date.now();
        if (next >= nowMs - LIVE_EPSILON_MS) {
          setIsLive(true);
          setPlaying(false);
          return nowMs;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const api = useMemo<ViewedAtApi>(
    () => ({
      viewedAtMs,
      isLive,
      playing,
      speed,
      seekTo,
      jog,
      play,
      pause,
      togglePlay,
      setSpeed,
      reset,
    }),
    [
      viewedAtMs,
      isLive,
      playing,
      speed,
      seekTo,
      jog,
      play,
      pause,
      togglePlay,
      setSpeed,
      reset,
    ],
  );

  return (
    <ViewedAtContext.Provider value={api}>{children}</ViewedAtContext.Provider>
  );
}

export const ViewedAtProvider = memo(ViewedAtProviderImpl);
ViewedAtProvider.displayName = "ViewedAtProvider";

export function useViewedAt(): ViewedAtApi {
  const ctx = useContext(ViewedAtContext);
  if (!ctx) {
    throw new Error("useViewedAt must be used inside <ViewedAtProvider>");
  }
  return ctx;
}
