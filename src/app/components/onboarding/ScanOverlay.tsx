/**
 * Theatrical "scanning" overlay for the onboarding flow.
 *
 * Several white glow lines sweep across the map to sell the feeling that Kela
 * is actively reading the terrain. This is a progress indicator, not a real
 * line-of-sight pass — the score stays an estimate (see ProtectionScoreHud).
 *
 * Craft (ui-craft): only `transform` + `opacity` animate (never layout props).
 * The glow is baked into each line so the compositor moves the whole layer.
 * Reduced motion falls back to a single static line + dim, with no sweep.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Staggered sweep lanes — slightly different speeds read as "working". */
const LANES = [
  { delay: 0, duration: 2.1 },
  { delay: 0.55, duration: 2.4 },
  { delay: 1.05, duration: 1.9 },
];

const LINE_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.05) 80%, transparent 100%)',
  filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.7))',
  willChange: 'transform',
};

export function ScanOverlay() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Dim the map so the sweep is the single focal point. */}
      <motion.div
        className="absolute inset-0 bg-black/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      {/* Faint static scan grid — texture, not motion. */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {prefersReducedMotion ? (
        <div className="absolute inset-x-0 top-1/2 h-[2px]" style={LINE_STYLE} />
      ) : (
        height > 0 &&
        LANES.map((lane, i) => (
          <motion.div
            key={i}
            className="absolute inset-x-0 top-0 h-[2px]"
            style={LINE_STYLE}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: [-40, height + 40], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: lane.duration,
              delay: lane.delay,
              ease: 'linear',
              repeat: Infinity,
              repeatDelay: 0.2,
              times: [0, 0.08, 0.92, 1],
            }}
          />
        ))
      )}
    </div>
  );
}
