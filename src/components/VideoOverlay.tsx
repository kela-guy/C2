import React from "react";
import { Film, Camera } from "lucide-react";

export function VideoOverlay({
  imageSrc,
  cameraLabel,
  isLive = true,
}: {
  imageSrc?: string;
  cameraLabel?: string;
  isLive?: boolean;
}) {
  return (
    <div className="relative w-full aspect-video rounded overflow-hidden bg-[#0d0d0d] border border-white/10">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt="Video feed"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
          <Film size={24} />
          <span className="text-[10px] font-medium">אין וידאו</span>
        </div>
      )}

      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {isLive && (
          <div className="flex items-center gap-1 bg-red-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
        {cameraLabel && (
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-zinc-300">
            <Camera size={10} />
            {cameraLabel}
          </div>
        )}
      </div>
    </div>
  );
}
