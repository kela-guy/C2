import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, ShieldAlert, AlertTriangle, Play, Pause, SkipBack, SkipForward, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { cn } from '@/shared/components/ui/utils';

export const MEDIA_BADGE_CONFIG = {
  threat: { icon: ShieldAlert, color: 'text-red-500', usage: 'Confirmed threat detection' },
  warning: { icon: AlertTriangle, color: 'text-zinc-400', usage: 'Unconfirmed or low-confidence' },
  bird: { icon: ShieldAlert, color: 'text-amber-400', usage: 'Bird / false positive' },
} as const;

export type MediaBadgeType = keyof typeof MEDIA_BADGE_CONFIG;

export interface CardMediaProps {
  src?: string;
  type?: 'video' | 'image';
  placeholder?: 'camera' | 'none';
  overlay?: React.ReactNode;
  badge?: MediaBadgeType | null;
  trackingLabel?: string;
  aspectRatio?: string;
  showControls?: boolean;
  className?: string;
  alt?: string;
}

export function CardMedia({
  src,
  type = 'image',
  placeholder = 'none',
  overlay,
  badge,
  trackingLabel,
  aspectRatio,
  showControls = false,
  className = '',
  alt = 'Surveillance',
}: CardMediaProps) {
  const [expanded, setExpanded] = useState(false);
  const savedTimeRef = useRef(0);
  const inlineVideoRef = useRef<HTMLVideoElement>(null);

  if (!src && placeholder === 'none') return null;

  const isVideo = type === 'video';
  const height = isVideo ? 'h-[160px]' : 'h-[100px]';

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inlineVideoRef.current) {
      savedTimeRef.current = inlineVideoRef.current.currentTime;
    }
    setExpanded(true);
  };

  return (
    <>
      <div
        className={`relative w-full overflow-hidden group/media bg-black ${height} ${className}`}
        style={{ ...(aspectRatio ? { aspectRatio } : {}) }}
      >
        {src && isVideo ? (
          showControls ? (
            <VideoWithControls src={src} ref={inlineVideoRef} />
          ) : (
            <video
              key={src}
              src={src}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <track kind="captions" />
            </video>
          )
        ) : src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover opacity-70 group-hover/media:opacity-90 transition-opacity grayscale contrast-125"
          />
        ) : null}

        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        {badge && MEDIA_BADGE_CONFIG[badge] && (() => {
          const bc = MEDIA_BADGE_CONFIG[badge];
          const BadgeIcon = bc.icon;
          return (
            <div className="absolute bottom-0 inset-x-0 p-2 flex justify-between items-end">
              <div className="flex gap-1">
                <BadgeIcon size={14} className={bc.color} aria-hidden="true" />
              </div>
            </div>
          );
        })()}

        {isVideo && !showControls && (
          <>
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
                <div className="size-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
                <span className="text-[9px] font-medium text-white/90 uppercase tracking-wide">
                  Live
                </span>
              </div>
            </div>
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
              <Camera size={10} className="text-white/70" aria-hidden="true" />
              <span className="text-[9px] text-white/70 font-mono">PTZ</span>
            </div>
          </>
        )}

        {isVideo && showControls && (
          <>
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
              <Camera size={10} className="text-white/70" aria-hidden="true" />
              <span className="text-[9px] text-white/70 font-mono">Playback</span>
            </div>
            <button
              onClick={handleExpand}
              className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity duration-200 cursor-pointer"
              aria-label="Expand recording"
            >
              <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-[0_0_0_1px_rgba(255,255,255,0.15)]">
                <Maximize2 size={13} className="text-white/90" aria-hidden="true" />
                <span className="text-[11px] font-medium text-white/90">Expand</span>
              </div>
            </button>
          </>
        )}

        {trackingLabel && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-cyan-900/80 shadow-[0_0_0_1px_rgba(34,211,238,0.3)] px-2 py-0.5 rounded">
            <Camera size={10} className="text-cyan-300" aria-hidden="true" />
            <span className="text-[9px] font-semibold text-cyan-200">{trackingLabel}</span>
          </div>
        )}

        {overlay && (
          <div className="absolute inset-0 pointer-events-none">{overlay}</div>
        )}
      </div>

      {src && isVideo && (
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent
            className={cn(
              'w-[90vw] max-w-[800px] gap-0 border-0 bg-black p-0 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_25px_60px_rgba(0,0,0,0.6)] sm:max-w-[800px]',
              '[&>button]:text-white/80 [&>button]:hover:bg-black/80 [&>button]:hover:text-white [&>button]:bg-black/60',
            )}
          >
            <DialogTitle className="sr-only">Expanded recording</DialogTitle>
            <LightboxVideo src={src} initialTime={savedTimeRef.current} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function LightboxVideo({ src, initialTime }: { src: string; initialTime: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onMeta = () => {
      setDuration(v.duration);
      v.currentTime = initialTime;
    };
    const onTime = () => setProgress(v.currentTime);

    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [initialTime]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const skip = useCallback((delta: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  }, []);

  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
  }, []);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const scale = duration > 0 ? progress / duration : 0;

  return (
    <div className="relative bg-black">
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        className="w-full"
        style={{ maxHeight: '70vh' }}
      >
        <track kind="captions" />
      </video>

      <div className="bg-zinc-950 px-4 py-3">
        <div
          className="relative mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/15 group/scrub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          role="slider"
          tabIndex={0}
          aria-label="Video position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${formatTime(progress)} of ${formatTime(duration)}`}
          onClick={handleScrub}
          onKeyDown={(e) => {
            const v = videoRef.current;
            if (!v) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 5); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); }
          }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <div
              className="h-full w-full origin-left rounded-full bg-cyan-400 transition-transform duration-100"
              style={{ transform: `scaleX(${scale})` }}
            />
          </div>
          <div
            className="pointer-events-none absolute top-1/2 z-[1] h-3 w-3 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/scrub:opacity-100"
            style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <button onClick={skip(-5)} className="text-white/60 hover:text-white transition-colors cursor-pointer" aria-label="Skip back 5 seconds">
            <SkipBack size={14} aria-hidden="true" />
          </button>
          <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition-colors cursor-pointer" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
          </button>
          <button onClick={skip(5)} className="text-white/60 hover:text-white transition-colors cursor-pointer" aria-label="Skip forward 5 seconds">
            <SkipForward size={14} aria-hidden="true" />
          </button>
          <span className="text-[11px] text-zinc-400 font-mono tabular-nums ml-2">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

const VideoWithControls = React.forwardRef<HTMLVideoElement, { src: string }>(
  function VideoWithControls({ src }, forwardedRef) {
    const localRef = useRef<HTMLVideoElement>(null);
    const videoRef = (forwardedRef as React.RefObject<HTMLVideoElement>) || localRef;
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play();
        setPlaying(true);
      } else {
        v.pause();
        setPlaying(false);
      }
    }, [videoRef]);

    const skip = useCallback((delta: number) => (e: React.MouseEvent) => {
      e.stopPropagation();
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
    }, [videoRef]);

    const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const v = videoRef.current;
      if (!v) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      v.currentTime = pct * v.duration;
    }, [videoRef]);

    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;

      const onTime = () => setProgress(v.currentTime);
      const onMeta = () => setDuration(v.duration);

      v.addEventListener('timeupdate', onTime);
      v.addEventListener('loadedmetadata', onMeta);
      return () => {
        v.removeEventListener('timeupdate', onTime);
        v.removeEventListener('loadedmetadata', onMeta);
      };
    }, [videoRef]);

    const pct = duration > 0 ? (progress / duration) * 100 : 0;
    const scale = duration > 0 ? progress / duration : 0;

    return (
      <>
        <video
          key={src}
          ref={videoRef}
          src={src}
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <track kind="captions" />
        </video>

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-1.5 px-2">
          <div
            className="relative mb-1.5 h-1 w-full cursor-pointer rounded-full bg-white/15 group/scrub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            role="slider"
            tabIndex={0}
            aria-label="Video position"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${formatTime(progress)} of ${formatTime(duration)}`}
            onClick={handleScrub}
            onKeyDown={(e) => {
              const v = videoRef.current;
              if (!v) return;
              if (e.key === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 5); }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); }
            }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              <div
                className="h-full w-full origin-left rounded-full bg-cyan-400 transition-transform duration-100"
                style={{ transform: `scaleX(${scale})` }}
              />
            </div>
            <div
              className="pointer-events-none absolute top-1/2 z-[1] h-2.5 w-2.5 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/scrub:opacity-100"
              style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          <div className="flex items-center justify-center gap-3">
            <button onClick={skip(-5)} className="text-white/60 hover:text-white transition-colors" aria-label="Skip back 5 seconds">
              <SkipBack size={12} aria-hidden="true" />
            </button>
            <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition-colors" aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
            <button onClick={skip(5)} className="text-white/60 hover:text-white transition-colors" aria-label="Skip forward 5 seconds">
              <SkipForward size={12} aria-hidden="true" />
            </button>
            <span className="text-[9px] text-zinc-400 font-mono tabular-nums ml-2">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </>
    );
  }
);

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
