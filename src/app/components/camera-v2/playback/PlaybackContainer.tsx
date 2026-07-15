/**
 * Playback investigation surface.
 *
 * One layout: a 50/50 vertical split where Live keeps the top half
 * (rendered by `CameraFeedTile`) and this container fills the bottom
 * half. The container owns the playback `<video>` ref, wires every
 * media event (`loadedmetadata`, `error`, `waiting`, `playing`,
 * `pause`, `ended`, autoplay rejection), and renders the status chrome
 * (loading spinner, buffering spinner, replay overlay, error card).
 *
 * The transport (`PlaybackTimeline`) renders inside the bottom strip.
 * Time always flows left-to-right via `<DirIsland direction="ltr">`
 * inside the timeline; surrounding chrome (the small exit X) follows
 * app direction.
 */

import { useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, Play, RotateCcw, X } from '@/lib/icons/central';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { AppLoader } from '@/shared/components/ui/app-loader';
import { useStrings, type Strings } from '@/lib/intl';
import { PlaybackTimeline } from '../PlaybackTimeline';
import { PLAYBACK_BUFFERING_GRACE_MS } from './playbackDefaults';
import type { PlaybackState } from '../types';

interface PlaybackContainerProps {
  /** Source URL for the playback `<video>`. */
  src: string;
  state: PlaybackState;
  onPatch: (patch: Partial<PlaybackState>) => void;
  onExit: () => void;
}

export function PlaybackContainer({ src, state, onPatch, onExit }: PlaybackContainerProps) {
  const t = useStrings().camera.playback;
  const videoRef = useRef<HTMLVideoElement>(null);
  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync `<video>.currentTime` to state when state moves (and we're not
  // currently scrubbing — scrubbing flips `isScrubbing` so the effect
  // bows out and lets the pointer drive the slider).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (state.isScrubbing) return;
    if (Math.abs(v.currentTime - state.positionSec) > 0.5) {
      v.currentTime = state.positionSec;
    }
  }, [state.positionSec, state.isScrubbing]);

  // Sync play/pause. Autoplay-rejection is treated as `paused` so we
  // surface a Play button instead of a console error.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (state.isPlaying && v.paused) {
      const promise = v.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          onPatch({ isPlaying: false, status: 'paused' });
        });
      }
    } else if (!state.isPlaying && !v.paused) {
      v.pause();
    }
  }, [state.isPlaying, onPatch]);

  const setBufferingGrace = useCallback(() => {
    if (bufferingTimerRef.current) clearTimeout(bufferingTimerRef.current);
    bufferingTimerRef.current = setTimeout(() => {
      onPatch({ status: 'buffering' });
    }, PLAYBACK_BUFFERING_GRACE_MS);
  }, [onPatch]);
  const clearBufferingGrace = useCallback(() => {
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }
  }, []);
  useEffect(() => () => clearBufferingGrace(), [clearBufferingGrace]);

  const handleScrub = useCallback(
    (positionSec: number) => {
      const clamped = Math.max(0, Math.min(state.durationSec || positionSec, positionSec));
      onPatch({ positionSec: clamped });
    },
    [onPatch, state.durationSec],
  );

  const handlePlayPause = useCallback(() => {
    onPatch({ isPlaying: !state.isPlaying });
  }, [onPatch, state.isPlaying]);

  const handleScrubbingChange = useCallback(
    (isScrubbing: boolean) => {
      onPatch({ isScrubbing });
    },
    [onPatch],
  );

  const handleRetry = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    onPatch({ status: 'loading', errorMessage: undefined });
  }, [onPatch]);

  return (
    <div className="absolute inset-x-0 bottom-0 top-1/2 z-30 border-t-2 border-red-500/80 bg-black overflow-hidden">
      <video
        ref={videoRef}
        key={`${state.sourceId ?? 'pb'}-${src}`}
        src={src}
        autoPlay={false}
        muted
        playsInline
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: 'sepia(0.18) contrast(1.05)' }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          const realDuration = Number.isFinite(v.duration) ? v.duration : 0;
          const positionSec = Math.min(state.positionSec, realDuration);
          onPatch({
            durationSec: realDuration,
            positionSec,
            status: state.isPlaying ? 'playing' : 'paused',
          });
        }}
        onError={() => {
          clearBufferingGrace();
          onPatch({
            status: 'error',
            errorMessage: t.feedUnavailable,
            isPlaying: false,
          });
        }}
        onWaiting={setBufferingGrace}
        onPlaying={() => {
          clearBufferingGrace();
          onPatch({ status: 'playing' });
        }}
        onPause={() => {
          if (state.status !== 'ended' && state.status !== 'error') {
            onPatch({ status: 'paused' });
          }
        }}
        onEnded={() => {
          clearBufferingGrace();
          onPatch({ status: 'ended', isPlaying: false });
        }}
      >
        <track kind="captions" />
      </video>

      {/* PLAYBACK header strip — always present so the operator never
          mistakes this surface for the live feed. */}
      <div
        className="absolute inset-x-0 top-0 h-9 z-10 bg-gradient-to-b from-black/75 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute top-2 inset-x-2 z-20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-red-600/90 px-1.5 py-0.5">
          <span
            className="size-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
            Playback
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onExit}
              aria-label={t.exitPlayback}
              className="size-7 inline-flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors duration-[var(--motion-fast)] ease-out focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none active:scale-[0.97]"
            >
              <X size={12} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {t.exitPlayback}
          </TooltipContent>
        </Tooltip>
      </div>

      <PlaybackStatusChrome
        status={state.status}
        durationSec={state.durationSec}
        errorMessage={state.errorMessage}
        strings={t}
        onReplay={() => {
          onPatch({ positionSec: 0, isPlaying: true, status: 'playing' });
          if (videoRef.current) videoRef.current.currentTime = 0;
        }}
        onRetry={handleRetry}
      />

      <PlaybackTimeline
        state={state}
        onScrub={handleScrub}
        onScrubbingChange={handleScrubbingChange}
        onPlayPause={handlePlayPause}
        onExit={onExit}
      />

      {/* Status banner: aria-live for screen readers while keeping
          loud states visible inside `PlaybackStatusChrome`. */}
      <span aria-live="polite" className="sr-only">
        {ariaStatusMessage(state.status, state.errorMessage, t)}
      </span>
    </div>
  );
}

function ariaStatusMessage(
  status: PlaybackState['status'],
  errorMessage: string | undefined,
  t: Strings['camera']['playback'],
): string {
  switch (status) {
    case 'idle':
      return '';
    case 'loading':
      return t.loading;
    case 'buffering':
      return t.buffering;
    case 'playing':
      return t.playing;
    case 'paused':
      return t.paused;
    case 'ended':
      return t.ended;
    case 'error':
      return errorMessage ? t.errorWithMessage(errorMessage) : t.errorGeneric;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

interface PlaybackStatusChromeProps {
  status: PlaybackState['status'];
  durationSec: number;
  errorMessage?: string;
  strings: Strings['camera']['playback'];
  onReplay: () => void;
  onRetry: () => void;
}

function PlaybackStatusChrome({
  status,
  durationSec,
  errorMessage,
  strings,
  onReplay,
  onRetry,
}: PlaybackStatusChromeProps) {
  if (status === 'loading' || (status === 'idle' && durationSec === 0)) {
    return (
      <div
        role="status"
        aria-label={strings.loading}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/60 pointer-events-none"
      >
        <AppLoader size={40} label={strings.loading} className="text-white/85" />
        <span className="text-xs text-white/85 font-mono tracking-wider uppercase">
          {strings.loadingEllipsis}
        </span>
      </div>
    );
  }
  if (status === 'buffering') {
    return (
      <div
        role="status"
        aria-label={strings.buffering}
        className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 pointer-events-none"
      >
        <AppLoader size={40} label={strings.buffering} className="text-white/85" />
      </div>
    );
  }
  if (status === 'ended') {
    return (
      <div
        role="status"
        aria-label={strings.ended}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/60"
      >
        <button
          type="button"
          onClick={onReplay}
          aria-label={strings.replayFromStart}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white text-xs uppercase tracking-wider font-semibold hover:bg-red-400 active:scale-[0.97] transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <Play size={12} />
          {strings.playAgain}
        </button>
        <span className="text-xs text-white/55 uppercase tracking-wider">
          {strings.ended}
        </span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div
        role="alert"
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/70 px-3 text-center"
      >
        <AlertTriangle size={20} className="text-red-300" aria-hidden="true" />
        <span className="text-xs text-white max-w-[220px]">
          {errorMessage ?? strings.errorUnknown}
        </span>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 ring-1 ring-inset ring-white/15 text-xs text-white uppercase tracking-wider hover:bg-white/15 active:scale-[0.97] transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <RotateCcw size={11} />
          {strings.tryAgain}
        </button>
      </div>
    );
  }
  return null;
}
