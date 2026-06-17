/**
 * Co-located doc module for the Motion foundation — the three-spring system
 * in `@/lib/springs`. Meta lives in `registry/manifest.json`.
 *
 * These demos import the real tokens (`spring`, `springExit`) so the
 * styleguide always reflects what ships.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring, springExit, type SpeedName } from '@/lib/springs';
import springsSrc from '@/lib/springs.ts?raw';
import type { ComponentDocModule } from '../registry/types';

const TIERS: { name: SpeedName; use: string }[] = [
  { name: 'fast', use: 'hover, focus rings, fades, small toggles' },
  { name: 'moderate', use: 'dropdowns, tabs, switch thumb, accordion' },
  { name: 'slow', use: 'dialogs, drawers, sheets' },
];

/** Fires all three springs across a track; click (or Replay) to re-run. */
function SpeedTracks() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {TIERS.map((tier) => (
        <div key={tier.name} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-white">{tier.name}</span>
            <span className="text-white/40">{tier.use}</span>
          </div>
          <div className="relative h-6 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.span
              key={`${tier.name}-${run}`}
              className="absolute top-1/2 left-1 size-4 -translate-y-1/2 rounded-full bg-white"
              initial={{ x: 0 }}
              animate={{ x: 260 }}
              transition={spring[tier.name]}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="self-start rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-[var(--motion-fast)] hover:bg-white/15"
      >
        Replay
      </button>
    </div>
  );
}

/** Two modals on spring.slow; only the close differs — same vs faster exit. */
function SlowInFasterOut() {
  const [same, setSame] = useState(false);
  const [faster, setFaster] = useState(false);
  return (
    <div className="flex w-full max-w-md gap-4">
      {[
        { label: 'Same exit (drags)', open: same, set: setSame, exit: spring.slow },
        { label: 'Faster exit', open: faster, set: setFaster, exit: springExit.slow },
      ].map((col) => (
        <div key={col.label} className="flex flex-1 flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => col.set((v) => !v)}
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-[var(--motion-fast)] hover:bg-white/15"
          >
            Toggle
          </button>
          <div className="relative flex h-28 w-full items-center justify-center rounded-lg bg-white/[0.04]">
            <AnimatePresence>
              {col.open && (
                <motion.div
                  className="flex size-20 items-center justify-center rounded-lg bg-white/15 text-center text-[10px] text-white/70"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: spring.slow }}
                  exit={{ opacity: 0, scale: 0.9, transition: col.exit }}
                >
                  {col.label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

export const motionDoc: ComponentDocModule = {
  id: 'motion',
  source: springsSrc,
  usage: `import { spring, springExit } from "@/lib/springs"

// Entrance on a tier; exit one tier faster (slow in, faster out).
<motion.div
  animate={{ opacity: 1, y: 0, transition: spring.moderate }}
  exit={{ opacity: 0, y: 8, transition: springExit.moderate }}
/>

// CSS / Radix overlays read the mirrored vars and helper classes:
//   --motion-fast | --motion-moderate | --motion-slow (+ *-exit)
//   .overlay-motion-fast | -moderate | -slow`,
  examples: [
    {
      id: 'three-speeds',
      title: 'Three speeds',
      description:
        'Every animation picks one of three springs — fast (0.08s, no bounce), moderate (0.16s, light bounce), slow (0.24s, more bounce). Nothing invents its own timing.',
      render: () => <SpeedTracks />,
    },
    {
      id: 'slow-in-faster-out',
      title: 'Slow in, faster out',
      description:
        'Both modals open on spring.slow. The left closes on the same slow spring and drags; the right closes on springExit.slow — one tier faster, no bounce — so it is gone a tier quicker.',
      render: () => <SlowInFasterOut />,
    },
  ],
};
