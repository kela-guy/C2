/**
 * Sandbox-only mock targets that move along simple parametric paths.
 *
 * `path(tSeconds)` returns coordinates normalized to the video viewport
 * (`x`, `y` in 0..1). `size` is the target footprint as a fraction of
 * viewport width so the locked-on box scales with the parent regardless
 * of the actual pixel size of the video shell.
 */

export interface PathfinderTarget {
  id: string;
  label: string;
  size: number;
  path: (tSec: number) => { x: number; y: number };
}

export const MOCK_TARGETS: PathfinderTarget[] = [
  {
    id: 'target-a',
    label: 'WALKER · A',
    size: 0.06,
    path: (t) => ({
      x: 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.35)),
      y: 0.55 + 0.04 * Math.sin(t * 0.9),
    }),
  },
  {
    id: 'target-b',
    label: 'CONVOY · B',
    size: 0.08,
    path: (t) => {
      const loop = ((t * 0.06) % 1 + 1) % 1;
      return {
        x: 0.1 + 0.78 * loop,
        y: 0.7 + 0.05 * Math.sin(t * 0.5 + 1.2),
      };
    },
  },
  {
    id: 'target-c',
    label: 'ROTOR · C',
    size: 0.07,
    path: (t) => {
      const angle = t * 0.4;
      return {
        x: 0.65 + 0.18 * Math.cos(angle),
        y: 0.38 + 0.12 * Math.sin(angle),
      };
    },
  },
];
