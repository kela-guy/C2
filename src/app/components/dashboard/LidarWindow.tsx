import { X } from "@/lib/icons/central";

const LIDAR_FEED_SRC = "/videos/lidar-feed.mp4";

interface LidarWindowProps {
  onClose: () => void;
  closeAriaLabel: string;
}

export function LidarWindow({ onClose, closeAriaLabel }: LidarWindowProps) {
  return (
    <div className="pointer-events-auto absolute bottom-3 end-3 z-30 w-[320px] overflow-hidden rounded-none border border-border-default bg-surface-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between border-b border-border-default bg-surface-3">
        <div className="flex h-8 w-full items-center gap-1.5 px-1.5">
          <span className="size-1.5 rounded-full bg-accent-danger animate-pulse motion-reduce:animate-none" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-12">
            LiDAR — LIDAR-NVT-01
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeAriaLabel}
          className="flex size-8 flex-col items-center justify-center rounded text-slate-10 transition-colors hover:bg-state-hover hover:text-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <X size={14} />
        </button>
      </div>
      <video
        key={LIDAR_FEED_SRC}
        src={LIDAR_FEED_SRC}
        autoPlay
        loop
        muted
        playsInline
        className="block aspect-video w-full bg-surface-void object-cover"
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
