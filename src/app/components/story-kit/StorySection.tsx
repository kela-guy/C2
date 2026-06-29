/**
 * One chapter in the scrolling left column: mono eyebrow, narrative, optional
 * takeaway. Reports itself active (via `useActiveSection`) when it crosses the
 * focal band so the sticky stage swaps to its demo. Sizing matches the
 * reference: a 776px column (max-w + 48px padding) giving a 680px reading width.
 *
 * Below `lg` the sticky stage column is hidden, so the demo is rendered inline
 * here instead for a single-column reading experience.
 */

import { useCallback, useRef, type ReactNode } from 'react';
import { useActiveSection } from './useActiveSection';
import { Eyebrow, Takeaway } from './prose';

interface StorySectionProps {
  id: string;
  index: number;
  label: string;
  stage: ReactNode;
  takeaway?: ReactNode;
  children: ReactNode;
  onActive: (id: string) => void;
}

export function StorySection({
  id,
  index,
  label,
  stage,
  takeaway,
  children,
  onActive,
}: StorySectionProps) {
  const ref = useRef<HTMLElement>(null);
  const handleActive = useCallback(() => onActive(id), [onActive, id]);
  useActiveSection(ref, handleActive);

  return (
    <section
      ref={ref}
      id={id}
      className="flex min-h-screen w-full max-w-[776px] flex-col justify-center px-12 py-24"
    >
      <Eyebrow index={index}>{label}</Eyebrow>

      {/* Single-column fallback: the sticky stage is hidden below lg. */}
      <div className="mt-8 lg:hidden">{stage}</div>

      <div className="mt-8 flex flex-col gap-6">{children}</div>

      {takeaway && <Takeaway>{takeaway}</Takeaway>}
    </section>
  );
}
