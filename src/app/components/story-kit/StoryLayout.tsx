/**
 * The scrollytelling shell: a two-pane layout (scrolling narrative + sticky
 * live stage) with the reference's chrome — a top breadcrumb, a scroll-progress
 * hairline, fixed top/bottom blur fades, and a floating "Settings" pill holding
 * the light/dark Mood toggle, a Home link, and chapter jumps.
 *
 * The whole surface is painted from the `--story-*` palette set on the root, so
 * the Mood toggle repaints everything at once. Pass `chapters`; the layout maps
 * them to left-column `StorySection`s and a right-column `StoryStage`.
 *
 * Pinned LTR via `<DirIsland>` so the English editorial layout stays stable
 * when the app is running in Hebrew/RTL — component demos inside chapters
 * can still set their own `dir` for locale previews.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DirIsland } from '@/lib/direction';
import { paletteVars, PALETTES, type Mood } from './palette';
import { useScrollOpacity } from './useScrollOpacity';
import { writeToClipboard } from './clipboard';
import { Fade } from './Fade';
import { StorySection } from './StorySection';
import { StoryStage } from './StoryStage';
import type { StoryChapter } from './types';
import { Sun, Moon, Home, Settings, SparklesFilled, Check } from '@/lib/icons/central';
import { cn } from '@/app/components/ui/utils';

interface StoryLayoutProps {
  title: string;
  /** Small mono kicker before the title in the breadcrumb. */
  kicker?: string;
  homeHref?: string;
  chapters: StoryChapter[];
  /**
   * Optional "build this" prompt. When provided, a second footer pill copies it
   * to the clipboard so a reader can hand it to their own coding agent.
   */
  aiPrompt?: string;
}

export function StoryLayout({ title, kicker, homeHref = '/', chapters, aiPrompt }: StoryLayoutProps) {
  const [activeId, setActiveId] = useState<string | null>(chapters[0]?.id ?? null);
  const [mood, setMood] = useState<Mood>('dark');
  const leftRef = useRef<HTMLDivElement>(null);
  useScrollOpacity(leftRef);

  return (
    <DirIsland
      direction="ltr"
      className="relative min-h-screen w-full font-[family:var(--font-sans)]"
    >
      <div
        data-mood={mood}
        style={{
          ...paletteVars(PALETTES[mood]),
          backgroundColor: 'var(--story-bg)',
          color: 'var(--story-ink)',
        }}
        className="relative min-h-screen w-full"
      >
      <ScrollProgress />

      {/* Breadcrumb */}
      <div className="fixed start-5 top-4 z-40 flex items-center gap-1.5 font-[family:var(--font-mono)] text-[12px] text-[color:var(--story-muted)]">
        {kicker && <span className="opacity-70">{kicker}</span>}
        {kicker && <span className="opacity-40">·</span>}
        <span className="text-[color:var(--story-ink)]">{title}</span>
      </div>

      {/* Scroll-clipped fades */}
      <Fade side="top" height={110} stop="50%" className="fixed inset-x-0 top-0 z-30" />
      <Fade side="bottom" height={140} blur={1} stop="25%" className="fixed inset-x-0 bottom-0 z-30" />

      {/* Two-pane grid */}
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 lg:grid-cols-2">
        <div ref={leftRef} className="flex flex-col items-center lg:items-end">
          {chapters.map((ch, i) => (
            <StorySection
              key={ch.id}
              id={ch.id}
              index={i + 1}
              label={ch.label}
              stage={ch.stage}
              takeaway={ch.takeaway}
              onActive={setActiveId}
            >
              {ch.prose}
            </StorySection>
          ))}
        </div>
        <div className="relative hidden lg:block">
          <div className="sticky top-0 flex h-screen items-stretch p-3">
            <div
              className="relative w-full overflow-hidden rounded-[24px]"
              style={{ backgroundColor: 'var(--story-panel)' }}
            >
              <StoryStage chapters={chapters} activeId={activeId} />
            </div>
          </div>
        </div>
      </div>

      <FooterPill
        title={title}
        mood={mood}
        onToggleMood={() => setMood((m) => (m === 'dark' ? 'light' : 'dark'))}
        homeHref={homeHref}
        chapters={chapters}
        activeId={activeId}
        aiPrompt={aiPrompt}
      />
      </div>
    </DirIsland>
  );
}

/** Hairline at the very top whose width tracks document scroll progress. */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[2px]">
      <div
        ref={ref}
        className="h-full w-full origin-left"
        style={{ backgroundColor: 'var(--story-accent)', transform: 'scaleX(0)' }}
      />
    </div>
  );
}

function FooterPill({
  title,
  mood,
  onToggleMood,
  homeHref,
  chapters,
  activeId,
  aiPrompt,
}: {
  title: string;
  mood: Mood;
  onToggleMood: () => void;
  homeHref: string;
  chapters: StoryChapter[];
  activeId: string | null;
  aiPrompt?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fixed bottom-6 start-1/2 z-40 -translate-x-1/2 rtl:translate-x-1/2"
    >
      {open && (
        <div
          className="absolute bottom-[calc(100%+8px)] start-1/2 z-10 w-60 -translate-x-1/2 rtl:translate-x-1/2 overflow-hidden rounded-xl border p-1.5 shadow-xl backdrop-blur"
          style={{ borderColor: 'var(--story-border)', backgroundColor: 'var(--story-bg)' }}
        >
            <button
              type="button"
              onClick={onToggleMood}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[color:var(--story-ink)] hover:bg-[var(--story-surface)]"
            >
              {mood === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              Mood: {mood === 'dark' ? 'Light' : 'Dark'}
            </button>
            <a
              href={homeHref}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[color:var(--story-ink)] hover:bg-[var(--story-surface)]"
            >
              <Home size={15} />
              Home
            </a>
            <div className="my-1 h-px" style={{ backgroundColor: 'var(--story-border)' }} />
            <div className="max-h-52 overflow-y-auto">
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => jump(ch.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-[12px] hover:bg-[var(--story-surface)]',
                    ch.id === activeId
                      ? 'text-[color:var(--story-ink)]'
                      : 'text-[color:var(--story-muted)]',
                  )}
                >
                  <span className="font-[family:var(--font-mono)] opacity-50">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate capitalize">{ch.label.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>
      )}

      <div className="relative z-10 flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg backdrop-blur"
          style={{ borderColor: 'var(--story-border)', backgroundColor: 'var(--story-surface)' }}
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: 'var(--story-accent)' }}
          />
          <span className="text-[13px] font-medium text-[color:var(--story-ink)]">{title}</span>
          <span className="ms-1 inline-flex items-center gap-1 text-[12px] text-[color:var(--story-muted)]">
            <Settings size={13} />
            Settings
          </span>
        </button>

        {aiPrompt && <CopyPromptPill prompt={aiPrompt} />}
      </div>
    </div>
  );
}

/** Footer pill that copies a "build this" prompt, with an inline confirm swap. */
function CopyPromptPill({ prompt }: { prompt: string }) {
  const prefersReducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    const ok = await writeToClipboard(prompt);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 1600);
  };

  const swap = prefersReducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, scale: 0.85 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.85 },
      };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Prompt copied to clipboard' : 'Copy implementation prompt'}
      title={copied ? 'Copied' : 'Copy a generic prompt to build this in your own app'}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-lg backdrop-blur"
      style={{ borderColor: 'var(--story-border)', backgroundColor: 'var(--story-surface)' }}
    >
      <span className="inline-flex size-[13px] items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span key="check" {...swap} className="inline-flex" aria-hidden>
              <Check size={13} style={{ color: 'var(--story-accent)' }} strokeWidth={3} />
            </motion.span>
          ) : (
            <motion.span key="sparkles" {...swap} className="inline-flex" aria-hidden>
              <SparklesFilled size={13} style={{ color: 'var(--story-accent)' }} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="text-[13px] font-medium text-[color:var(--story-ink)]">
        {copied ? 'Copied' : 'Copy prompt'}
      </span>
    </button>
  );
}
