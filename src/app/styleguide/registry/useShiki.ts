/**
 * Reusable, dual-theme syntax highlighting for the manifest-driven docs.
 *
 * One lazily-created `shiki` highlighter is shared across every code block on
 * the page (the import + WASM grammar load is expensive, so it must be a
 * singleton). Highlighting runs `github-light` + `github-dark` with
 * `defaultColor: 'dark'`, emitting `--shiki-dark` CSS variables so the dark
 * control-room surface wins while staying light-theme ready — mirroring the
 * exact markup shadcn's docs ship.
 */
import { useEffect, useState } from 'react';

type Highlighter = Awaited<ReturnType<typeof import('shiki')['createHighlighter']>>;

export type ShikiLang = 'tsx' | 'ts' | 'bash' | 'css';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: ['tsx', 'ts', 'bash', 'css'],
      }),
    );
  }
  return highlighterPromise;
}

/**
 * Returns shiki-highlighted HTML for `code`, or `null` until the highlighter
 * has loaded (callers should render a plain `<pre>` fallback meanwhile).
 */
export function useShikiHtml(code: string, lang: ShikiLang = 'tsx'): string | null {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      setHtml(
        highlighter.codeToHtml(code, {
          lang,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: 'dark',
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  return html;
}
