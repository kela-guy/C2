import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Crosshair } from '@/lib/icons/central';
import { MOCK_TARGETS, type PathfinderTarget } from './pathfinderFixtures';

type Mode =
  | 'idle'
  | 'arming'
  | 'hunting'
  | 'snapped'
  | 'locked'
  | 'released';

interface AutoTrackOverlayProps {
  armed: boolean;
  onReleased: () => void;
  targets?: PathfinderTarget[];
}

const SNAP_RADIUS_PX = 64;
const RELEASE_FADE_MS = 180;

const KEYFRAMES = `
@keyframes reticle-spin {
  to { transform: rotate(360deg); }
}
@keyframes brackets-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.05); }
}
.autotrack-reticle-spin {
  animation: reticle-spin 4s linear infinite;
}
.autotrack-brackets-out {
  animation: brackets-out ${RELEASE_FADE_MS}ms ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .autotrack-reticle-spin { animation: none; }
  .autotrack-brackets-out { animation: none; opacity: 0; }
}
`;

export function AutoTrackOverlay({
  armed,
  onReleased,
  targets = MOCK_TARGETS,
}: AutoTrackOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(performance.now());
  const targetPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const releaseTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [snappedId, setSnappedId] = useState<string | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [releasedId, setReleasedId] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const release = useCallback(() => {
    setMode('released');
    setReleasedId((prev) => prev ?? lockedId);
    setLockedId(null);
    setSnappedId(null);
    if (releaseTimerRef.current != null) {
      window.clearTimeout(releaseTimerRef.current);
    }
    releaseTimerRef.current = window.setTimeout(() => {
      releaseTimerRef.current = null;
      setReleasedId(null);
      setMode('idle');
      onReleased();
    }, RELEASE_FADE_MS);
  }, [lockedId, onReleased]);

  useEffect(() => {
    if (armed && mode === 'idle') {
      setMode('arming');
      startTimeRef.current = performance.now();
    } else if (!armed && mode !== 'idle' && mode !== 'released') {
      release();
    }
  }, [armed, mode, release]);

  useEffect(() => {
    if (mode === 'locked') {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          release();
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    return undefined;
  }, [mode, release]);

  useEffect(() => {
    if (mode === 'idle') return;
    const tick = () => {
      const tSec = (performance.now() - startTimeRef.current) / 1000;
      const positions: Record<string, { x: number; y: number }> = {};
      for (const target of targets) {
        positions[target.id] = target.path(tSec);
      }
      targetPositionsRef.current = positions;

      const container = containerRef.current;
      const pointer = pointerPosRef.current;
      if (container && pointer && (mode === 'hunting' || mode === 'snapped')) {
        const rect = container.getBoundingClientRect();
        const pointerXPx = pointer.x * rect.width;
        const pointerYPx = pointer.y * rect.height;
        let nearestId: string | null = null;
        let nearestDist = Number.POSITIVE_INFINITY;
        for (const target of targets) {
          const pos = positions[target.id];
          if (!pos) continue;
          const dx = pos.x * rect.width - pointerXPx;
          const dy = pos.y * rect.height - pointerYPx;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestId = target.id;
          }
        }
        const inSnap = nearestId != null && nearestDist <= SNAP_RADIUS_PX;
        if (inSnap) {
          if (mode !== 'snapped') setMode('snapped');
          if (snappedId !== nearestId) setSnappedId(nearestId);
        } else {
          if (mode !== 'hunting') setMode('hunting');
          if (snappedId !== null) setSnappedId(null);
        }
      }

      forceTick((n) => (n + 1) % 1_000_000);
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [mode, snappedId, targets]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      if (releaseTimerRef.current != null)
        window.clearTimeout(releaseTimerRef.current);
    };
  }, []);

  const handlePointerEnter = useCallback(() => {
    if (mode === 'arming') setMode('hunting');
  }, [mode]);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      pointerPosRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    },
    [],
  );

  const handlePointerLeave = useCallback(() => {
    pointerPosRef.current = null;
    if (mode === 'hunting' || mode === 'snapped') {
      setMode('arming');
      setSnappedId(null);
    }
  }, [mode]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (mode === 'snapped' && snappedId) {
        setLockedId(snappedId);
        setMode('locked');
      } else if (mode === 'locked') {
        const container = containerRef.current;
        const lockedPos =
          lockedId != null ? targetPositionsRef.current[lockedId] : null;
        const lockedTarget = lockedId
          ? targets.find((t) => t.id === lockedId)
          : null;
        if (container && lockedPos && lockedTarget) {
          const rect = container.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          const half = lockedTarget.size * 0.5;
          const insideBox =
            px >= lockedPos.x - half &&
            px <= lockedPos.x + half &&
            py >= lockedPos.y - half &&
            py <= lockedPos.y + half;
          if (!insideBox) release();
        }
      }
    },
    [mode, snappedId, lockedId, targets, release],
  );

  if (mode === 'idle' && releasedId == null) return null;

  const isInteractive =
    mode === 'hunting' ||
    mode === 'snapped' ||
    mode === 'locked' ||
    mode === 'arming';

  const lockedTarget = lockedId ? targets.find((t) => t.id === lockedId) : null;
  const lockedPos = lockedId ? targetPositionsRef.current[lockedId] : null;
  const snappedTarget = snappedId
    ? targets.find((t) => t.id === snappedId)
    : null;
  const snappedPos = snappedId ? targetPositionsRef.current[snappedId] : null;
  const releasedTarget = releasedId
    ? targets.find((t) => t.id === releasedId)
    : null;
  const releasedPos = releasedId
    ? targetPositionsRef.current[releasedId]
    : null;
  const pointer = pointerPosRef.current;
  const showReticle =
    (mode === 'hunting' || mode === 'snapped') && pointer != null;

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`absolute inset-0 z-20 ${
        isInteractive ? 'pointer-events-auto' : 'pointer-events-none'
      } ${showReticle ? 'cursor-none' : ''}`}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
    >
      <style>{KEYFRAMES}</style>

      {showReticle && pointer && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${pointer.x * 100}%`,
            top: `${pointer.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="autotrack-reticle-spin text-accent-warning">
            <Crosshair size={28} strokeWidth={2} aria-hidden />
          </div>
        </div>
      )}

      {snappedTarget && snappedPos && mode === 'snapped' && (
        <CornerBrackets
          x={snappedPos.x}
          y={snappedPos.y}
          size={snappedTarget.size}
          variant="snapped"
        />
      )}

      {lockedTarget && lockedPos && mode === 'locked' && (
        <CornerBrackets
          x={lockedPos.x}
          y={lockedPos.y}
          size={lockedTarget.size}
          variant="locked"
          label={lockedTarget.label}
        />
      )}

      {releasedTarget && releasedPos && mode === 'released' && (
        <CornerBrackets
          x={releasedPos.x}
          y={releasedPos.y}
          size={releasedTarget.size}
          variant="released"
        />
      )}
    </div>
  );
}

function CornerBrackets({
  x,
  y,
  size,
  variant,
  label,
}: {
  x: number;
  y: number;
  size: number;
  variant: 'snapped' | 'locked' | 'released';
  label?: string;
}) {
  const colorClass =
    variant === 'locked'
      ? 'text-accent-success'
      : 'text-accent-warning';
  const strokeWidth = variant === 'locked' ? 2 : 1.5;
  const dashArray = variant === 'snapped' ? '4 3' : undefined;
  const outerClass =
    variant === 'released' ? 'autotrack-brackets-out' : '';

  return (
    <div
      className={`pointer-events-none absolute ${outerClass}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${size * 100}%`,
        aspectRatio: '1 / 1',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={`size-full overflow-visible ${colorClass}`}
        aria-hidden
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <polyline points="0,18 0,0 18,0" />
          <polyline points="82,0 100,0 100,18" />
          <polyline points="0,82 0,100 18,100" />
          <polyline points="82,100 100,100 100,82" />
        </g>
      </svg>
      {label && variant === 'locked' && (
        <span
          className="absolute font-mono text-[9px] uppercase tracking-[0.18em] text-accent-success"
          style={{
            left: 'calc(100% + 4px)',
            top: 'calc(100% + 2px)',
          }}
        >
          LOCK · {label}
        </span>
      )}
    </div>
  );
}
