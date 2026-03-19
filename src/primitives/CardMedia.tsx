import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, ShieldAlert, AlertTriangle, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { CARD_TOKENS } from './tokens';

export interface CardMediaProps {
  src?: string;
  type?: 'video' | 'image';
  placeholder?: 'camera' | 'none';
  overlay?: React.ReactNode;
  badge?: 'threat' | 'warning' | 'bird' | null;
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
  alt = 'תצפית מטרה',
}: CardMediaProps) {
  if (!src && placeholder === 'none') return null;

  const isVideo = type === 'video';
  const height = isVideo ? 'h-[160px]' : 'h-[100px]';

  return (
    <div
      className={`relative w-full overflow-hidden group bg-black ${height} ${className}`}
      style={{ ...(aspectRatio ? { aspectRatio } : {}), borderBottom: `1px solid ${CARD_TOKENS.surface.level2}` }}
    >
      {src && isVideo ? (
        showControls ? (
          <VideoWithControls src={src} />
        ) : (
          <video
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
          className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity grayscale contrast-125"
        />
      ) : null}

      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {badge && (
        <div className="absolute bottom-0 inset-x-0 p-2 flex justify-between items-end">
          <div className="flex gap-1">
            {badge === 'bird' && <ShieldAlert size={14} className="text-amber-400" aria-hidden="true" />}
            {badge === 'threat' && <ShieldAlert size={14} className="text-red-500" aria-hidden="true" />}
            {badge === 'warning' && <AlertTriangle size={14} className="text-zinc-400" aria-hidden="true" />}
          </div>
        </div>
      )}

      {isVideo && !showControls && (
        <>
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
              <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
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
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
          <Camera size={10} className="text-white/70" aria-hidden="true" />
          <span className="text-[9px] text-white/70 font-mono">Playback</span>
        </div>
      )}

      {trackingLabel && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-cyan-900/80 border border-cyan-400/30 px-2 py-0.5 rounded" dir="rtl">
          <Camera size={10} className="text-cyan-300" aria-hidden="true" />
          <span className="text-[9px] font-semibold text-cyan-200">{trackingLabel}</span>
        </div>
      )}

      {overlay && (
        <div className="absolute inset-0 pointer-events-none">{overlay}</div>
      )}
    </div>
  );
}

function VideoWithControls({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
  }, []);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <video
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
          className="w-full h-1 bg-white/15 rounded-full cursor-pointer mb-1.5 group/scrub"
          role="slider"
          tabIndex={0}
          aria-label="מיקום בסרטון"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${formatTime(progress)} מתוך ${formatTime(duration)}`}
          onClick={handleScrub}
          onKeyDown={(e) => {
            const v = videoRef.current;
            if (!v) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 5); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); }
          }}
        >
          <div
            className="h-full bg-cyan-400 rounded-full relative transition-all"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover/scrub:opacity-100 transition-opacity shadow" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button onClick={skip(-5)} className="text-white/60 hover:text-white transition-colors" aria-label="הרצה אחורה 5 שניות">
            <SkipBack size={12} aria-hidden="true" />
          </button>
          <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition-colors" aria-label={playing ? 'השהה' : 'הפעל'}>
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </button>
          <button onClick={skip(5)} className="text-white/60 hover:text-white transition-colors" aria-label="הרצה קדימה 5 שניות">
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
