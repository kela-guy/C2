/**
 * Playback scrubber for the bottom half of a Live-vs-Playback split tile.
 *
 * Drives `currentTime` on a <video> element via `onScrub`. The component
 * itself is presentational; the parent owns the playing/paused state and
 * the actual <video> ref.
 */

import { ChevronsLeft, ChevronsRight, Pause, Play } from 'lucide-react';
import type { PlaybackState } from './types';

interface PlaybackTimelineProps {
  state: PlaybackState;
  onScrub: (positionSec: number) => void;
  onPlayPause: () => void;
  onJumpRelative: (deltaSec: number) => void;
}

function fmtClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mm = Math.floor(safe / 60).toString().padStart(2, '0');
  const ss = (safe % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function PlaybackTimeline({ state, onScrub, onPlayPause, onJumpRelative }: PlaybackTimelineProps) {
  const { positionSec, durationSec, isPlaying } = state;
  const remaining = Math.max(0, durationSec - positionSec);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20" dir="ltr">
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 via-black/45 to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-2 px-2 pb-2 pt-1">
        <button
          type="button"
          onClick={() => onJumpRelative(-10)}
          aria-label="Jump back 10 seconds"
          className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none active:scale-[0.97]"
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="p-1.5 text-white/95 hover:text-white hover:bg-white/15 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none active:scale-[0.97]"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          type="button"
          onClick={() => onJumpRelative(10)}
          aria-label="Jump forward 10 seconds"
          className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none active:scale-[0.97]"
        >
          <ChevronsRight size={14} />
        </button>

        <span className="font-mono text-[10px] tabular-nums text-white/85 min-w-[40px] text-end">
          {fmtClock(positionSec)}
        </span>

        <input
          type="range"
          min={0}
          max={Math.max(1, durationSec)}
          step={0.1}
          value={positionSec}
          onChange={(e) => onScrub(parseFloat(e.target.value))}
          aria-label="Playback position"
          className="flex-1 accent-red-400 cursor-pointer"
        />

        <span className="font-mono text-[10px] tabular-nums text-white/55 min-w-[44px]">
          -{fmtClock(remaining)}
        </span>
      </div>
    </div>
  );
}
