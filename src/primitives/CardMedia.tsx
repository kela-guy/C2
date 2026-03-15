import React from 'react';
import { Camera, ShieldAlert, AlertTriangle } from 'lucide-react';

export interface CardMediaProps {
  src?: string;
  type?: 'video' | 'image';
  placeholder?: 'camera' | 'none';
  overlay?: React.ReactNode;
  badge?: 'threat' | 'warning' | 'bird' | null;
  aspectRatio?: string;
  className?: string;
}

export function CardMedia({
  src,
  type = 'image',
  placeholder = 'none',
  overlay,
  badge,
  aspectRatio,
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
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
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

      {isVideo && (
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

      {overlay && (
        <div className="absolute inset-0 pointer-events-none">{overlay}</div>
      )}
    </div>
  );
}
