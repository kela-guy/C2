import { COMMIT_SHORT, IS_STAGING } from '@/lib/deployEnv';

export function StagingBadge() {
  if (!IS_STAGING) return null;
  return (
    <div
      role="status"
      aria-label="Staging environment"
      className="pointer-events-none fixed right-3 top-3 z-50 inline-flex select-none items-center gap-1.5 rounded-full border border-border-default bg-accent-warning-tint px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-warning shadow-[var(--shadow-2)] backdrop-blur"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-accent-warning" />
      Staging
      {COMMIT_SHORT && (
        <span aria-hidden className="text-slate-10">
          {COMMIT_SHORT}
        </span>
      )}
    </div>
  );
}
