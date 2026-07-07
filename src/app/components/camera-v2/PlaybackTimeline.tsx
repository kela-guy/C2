/**
 * Playback transport — minimal investigation control surface.
 *
 * Anatomy (physical left -> right inside a `<DirIsland direction="ltr">`):
 *
 *   [Play/Pause]   [Scrubber]   [00:32 / -00:28]   [Exit]
 *
 * Time always flows L→R regardless of app direction; that's why the
 * whole surface lives inside an LTR DirIsland. Hebrew tooltip labels
 * still render correctly because the island only repositions chrome,
 * not text.
 *
 * The transport is purely presentational. Scrubbing, play/pause, and
 * exit bubble up to `PlaybackContainer`, which owns the `<video>`
 * element and the playback state.
 *
 * Status chrome (loading / buffering / ended / error) is rendered by
 * `PlaybackContainer` over the video frame, not here — keeping this
 * file focused on the operator's transport vocabulary.
 */

import { useCallback, useId } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Pause, Play, X } from '@/lib/icons/central';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { DirIsland } from '@/lib/direction';
import { useStrings } from '@/lib/intl';
import type { PlaybackState } from './types';

interface PlaybackTimelineProps {
  state: PlaybackState;
  onScrub: (positionSec: number) => void;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  onPlayPause: () => void;
  onExit?: () => void;
}

function fmtClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mm = Math.floor(safe / 60).toString().padStart(2, '0');
  const ss = (safe % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function PlaybackTimeline({
  state,
  onScrub,
  onScrubbingChange,
  onPlayPause,
  onExit,
}: PlaybackTimelineProps) {
  const t = useStrings().camera.playback;
  const { positionSec, durationSec, isPlaying, status } = state;
  const remaining = Math.max(0, durationSec - positionSec);
  const transportDisabled =
    status === 'loading' || status === 'error' || durationSec <= 0;

  // While the operator drags the scrubber thumb we need to suspend the
  // sync effect in the container (so it doesn't fight the pointer).
  // Radix Slider drives this through onValueCommit / onValueChange.
  const handleSliderChange = useCallback(
    (values: number[]) => {
      const v = values[0] ?? 0;
      onScrubbingChange?.(true);
      onScrub(v);
    },
    [onScrub, onScrubbingChange],
  );
  const handleSliderCommit = useCallback(
    (values: number[]) => {
      const v = values[0] ?? 0;
      onScrub(v);
      onScrubbingChange?.(false);
    },
    [onScrub, onScrubbingChange],
  );

  return (
    <DirIsland
      direction="ltr"
      className="absolute inset-x-0 bottom-0 z-30 pointer-events-auto"
    >
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 via-black/45 to-transparent pointer-events-none" />

      <div
        className="relative flex items-center gap-2 px-2 py-1.5"
        // The transport itself shouldn't propagate keyboard shortcuts up
        // to the tile (which would re-toggle playback or fullscreen).
        onKeyDownCapture={(e) => {
          if (
            e.key === 'p' || e.key === 'P' ||
            e.key === 'f' || e.key === 'F' ||
            e.key === 's' || e.key === 'S' ||
            e.key === 'd' || e.key === 'D' ||
            e.key === 'x' || e.key === 'X' ||
            e.key === 't' || e.key === 'T'
          ) {
            e.stopPropagation();
          }
        }}
      >
        <TransportButton
          label={isPlaying ? t.pause : t.play}
          onClick={onPlayPause}
          disabled={transportDisabled}
          primary
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </TransportButton>

        <PlaybackScrubber
          positionSec={positionSec}
          durationSec={durationSec}
          disabled={transportDisabled}
          onChange={handleSliderChange}
          onCommit={handleSliderCommit}
        />

        <span className="font-mono text-xs tabular-nums text-white/85 min-w-[40px] text-end">
          {fmtClock(positionSec)}
        </span>
        <span className="font-mono text-xs tabular-nums text-white/55 min-w-[44px] text-end">
          -{fmtClock(remaining)}
        </span>

        {onExit && (
          <TransportButton label={t.exitPlayback} onClick={onExit}>
            <X size={14} />
          </TransportButton>
        )}
      </div>
    </DirIsland>
  );
}

interface TransportButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}

function TransportButton({
  label,
  onClick,
  disabled,
  primary,
  children,
}: TransportButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={`size-9 inline-flex items-center justify-center transition-colors duration-150 ease-out
            focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none
            disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]
            ${primary
              ? 'text-white hover:bg-white/15'
              : 'text-white/85 hover:text-white hover:bg-state-hover-overlay'}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface PlaybackScrubberProps {
  positionSec: number;
  durationSec: number;
  disabled?: boolean;
  onChange: (values: number[]) => void;
  onCommit: (values: number[]) => void;
}

/**
 * Accessible scrubber backed by Radix Slider. The thumb hit area is
 * intentionally generous (16px) so an operator can grab it on a
 * rendered tile at common dashboard sizes.
 */
function PlaybackScrubber({
  positionSec,
  durationSec,
  disabled,
  onChange,
  onCommit,
}: PlaybackScrubberProps) {
  const t = useStrings().camera.playback;
  const max = Math.max(1, durationSec);
  const sliderId = useId();

  return (
    <div className="relative flex-1 flex items-center">
      <SliderPrimitive.Root
        id={sliderId}
        min={0}
        max={max}
        step={0.1}
        value={[Math.min(max, Math.max(0, positionSec))]}
        onValueChange={onChange}
        onValueCommit={onCommit}
        disabled={disabled || durationSec <= 0}
        aria-label={t.playbackPositionAriaLabel}
        className="relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50"
      >
        <SliderPrimitive.Track className="relative grow h-1.5 bg-white/15 overflow-visible">
          <SliderPrimitive.Range className="absolute h-full bg-red-400" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={t.playbackPositionAriaLabel}
          className="block size-4 rounded-full bg-red-300 ring-2 ring-red-500 shadow-md hover:scale-110 transition-transform focus-visible:ring-4 focus-visible:ring-red-300/50 focus-visible:outline-none disabled:pointer-events-none"
        />
      </SliderPrimitive.Root>
    </div>
  );
}
