import { Pin, Video } from '@/lib/icons/central';
import { useStrings } from '@/lib/intl';

export function VideoPanelEmptyState() {
  const t = useStrings();

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center"
      data-testid="video-panel-empty"
    >
      <Video size={32} className="text-slate-9" aria-hidden />
      <p className="text-[13px] font-semibold leading-5 text-slate-12">
        {t.camera.panel.emptyTitle}
      </p>
      <p className="max-w-[240px] text-xs leading-relaxed text-slate-10">
        {t.camera.panel.hintBefore}
        <Pin size={12} className="mx-0.5 inline-block align-[-2px] text-slate-11" aria-hidden />
        {t.camera.panel.hintAfter}
      </p>
    </div>
  );
}
