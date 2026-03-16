import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, ShieldAlert, AlertTriangle, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export interface CardMediaProps {
  src?: string;
  type?: 'video' | 'image';
  placeholder?: 'camera' | 'none';
  overlay?: React.ReactNode;
  badge?: 'threat' | 'warning' | 'bird' | null;
  aspectRatio?: string;
  showControls?: boolean;
  className?: string;
}

export function CardMedia({
  src,
  type = 'image',
  placeholder = 'none',
  overlay,
  badge,
  aspectRatio,
  showControls = false,
  className = '',
}: CardMediaProps) {
  if (!src && placeholder === 'none') return null;

  const isVideo = type === 'video';
  const height = isVideo ? 'h-[160px]' : 'h-[100px]';

  return (
    <div
      className={`relative w-full overflow-hidden border-b border-white/5 group bg-black ${height} ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
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
          />
        )
      ) : src ? (
        <img
          src={src}
          alt="Target"
          className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity grayscale contrast-125"
        />
      ) : null}

      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {badge && (
        <div className="absolute bottom-0 inset-x-0 p-2 flex justify-between items-end">
          <div className="flex gap-1">
            {badge === 'bird' && <ShieldAlert size={14} className="text-amber-400" />}
            {badge === 'threat' && <ShieldAlert size={14} className="text-red-500" />}
            {badge === 'warning' && <AlertTriangle size={14} className="text-zinc-400" />}
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
            <Camera size={10} className="text-white/70" />
            <span className="text-[9px] text-white/70 font-mono">PTZ</span>
          </div>
        </>
      )}

      {isVideo && showControls && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
          <Camera size={10} className="text-white/70" />
          <span className="text-[9px] text-white/70 font-mono">Playback</span>
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
      />

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-1.5 px-2">
        <div
          className="w-full h-1 bg-white/15 rounded-full cursor-pointer mb-1.5 group/scrub"
          onClick={handleScrub}
        >
          <div
            className="h-full bg-cyan-400 rounded-full relative transition-all"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover/scrub:opacity-100 transition-opacity shadow" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button onClick={skip(-5)} className="text-white/60 hover:text-white transition-colors">
            <SkipBack size={12} />
          </button>
          <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition-colors">
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={skip(5)} className="text-white/60 hover:text-white transition-colors">
            <SkipForward size={12} />
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
