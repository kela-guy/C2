/**
 * Drop-in `<Profiler>` wrapper that forwards to the perf renderCounters
 * aggregator. Use to measure a panel-level subtree:
 *
 *   <PerfProfiled id="Dashboard.RightPane">
 *     <RightPane />
 *   </PerfProfiled>
 *
 * In production builds:
 *   - React's `<Profiler>` only emits `onRender` when running against a
 *     profiling-enabled build of `react-dom`. With the standard build
 *     (which is what we ship to prod) the callback never fires.
 *   - Even if it did, `recordRender` is a no-op when `import.meta.env.DEV`
 *     is false.
 *
 *   So the cost in production is exactly the cost of one extra fiber,
 *   which is negligible. We can leave wrappers in place permanently.
 */

import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';
import { recordRender } from '@/lib/perf/renderCounters';

interface PerfProfiledProps {
  id: string;
  children: ReactNode;
}

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration, startTime) => {
  recordRender(id, phase, actualDuration, baseDuration, startTime);
};

export function PerfProfiled({ id, children }: PerfProfiledProps): React.JSX.Element {
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
