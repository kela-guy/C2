/**
 * Focused code block — binds prose to demo by showing only the relevant lines,
 * inside a clean white (elevated) card with a hairline border and a subtle
 * warm band behind the lines that matter. Dependency-free: a tiny scanner
 * tokenises JS/TS/JSX-ish source for the reference's minimal editorial theme
 * (orange for calls / object keys / JSX tags / numbers, teal for strings, ink
 * for plain identifiers and operators, muted for keywords and brackets), so it
 * never pulls in a full highlighter.
 */

import { useMemo } from 'react';
import { cn } from '@/app/components/ui/utils';

type TokenClass =
  | 'comment'
  | 'string'
  | 'number'
  | 'accent' // call / object key / JSX tag name
  | 'keyword'
  | 'ink' // plain identifiers + operators
  | 'sep' // brackets + separators
  | 'ws';

interface Token {
  t: string;
  c: TokenClass;
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'import', 'from', 'export', 'default', 'type', 'interface', 'new', 'await',
  'async', 'class', 'extends', 'true', 'false', 'null', 'undefined', 'void',
  'number', 'string', 'boolean', 'switch', 'case', 'break', 'continue', 'this',
  'in', 'of', 'typeof', 'instanceof',
]);

const TOKEN_COLOR: Record<TokenClass, string | undefined> = {
  comment: 'var(--story-muted)',
  string: 'var(--story-code-string)',
  number: 'var(--story-accent)',
  accent: 'var(--story-accent)',
  keyword: 'var(--story-muted)',
  ink: 'var(--story-ink)',
  sep: 'var(--story-muted)',
  ws: undefined,
};

// Multi-char operators (ink) and JSX bracket pairs (sep), longest first.
const MULTI: [string, TokenClass][] = [
  ['===', 'ink'], ['!==', 'ink'], ['...', 'ink'],
  ['</', 'sep'], ['/>', 'sep'],
  ['=>', 'ink'], ['==', 'ink'], ['!=', 'ink'], ['<=', 'ink'], ['>=', 'ink'],
  ['&&', 'ink'], ['||', 'ink'], ['??', 'ink'],
];

// Single brackets / separators render muted; every other punctuation is an
// operator (ink). A colon is an operator so object keys read against it.
const SINGLE_SEP = new Set(['(', ')', '{', '}', '[', ']', ',', ';', '<', '>', '.', '/']);

const isWordStart = (ch: string) => /[A-Za-z_$]/.test(ch);
const isWord = (ch: string) => /[A-Za-z0-9_$]/.test(ch);

function scanLine(line: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === '/' && line[i + 1] === '/') {
      out.push({ t: line.slice(i), c: 'comment' });
      break;
    }
    if (/\s/.test(ch)) {
      let j = i;
      while (j < line.length && /\s/.test(line[j])) j++;
      out.push({ t: line.slice(i, j), c: 'ws' });
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) {
        if (line[j] === '\\') j++;
        j++;
      }
      j = Math.min(j + 1, line.length);
      out.push({ t: line.slice(i, j), c: 'string' });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      out.push({ t: line.slice(i, j), c: 'number' });
      i = j;
      continue;
    }
    if (isWordStart(ch)) {
      let j = i;
      while (j < line.length && isWord(line[j])) j++;
      // Classified in a second pass once neighbours are known.
      out.push({ t: line.slice(i, j), c: 'ink' });
      i = j;
      continue;
    }
    const multi = MULTI.find((m) => line.startsWith(m[0], i));
    if (multi) {
      out.push({ t: multi[0], c: multi[1] });
      i += multi[0].length;
      continue;
    }
    out.push({ t: ch, c: SINGLE_SEP.has(ch) ? 'sep' : 'ink' });
    i++;
  }

  classifyWords(out);
  return out;
}

/**
 * Reclassify identifier tokens by their neighbours, the way the reference does:
 * a name is accented when it is a call (`name(`), an object key (`name:`), or a
 * JSX tag (`<name` / `</name`); keywords mute; everything else is plain ink.
 */
function classifyWords(tokens: Token[]) {
  const idx = tokens.map((_, k) => k).filter((k) => tokens[k].c !== 'ws');
  const posInMeaningful = new Map<number, number>();
  idx.forEach((k, p) => posInMeaningful.set(k, p));

  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k];
    // Only freshly-scanned words are 'ink' here; punctuation is already typed.
    if (tok.c !== 'ink' || !isWordStart(tok.t[0])) continue;

    const p = posInMeaningful.get(k)!;
    const prev = p > 0 ? tokens[idx[p - 1]] : undefined;
    const next = p < idx.length - 1 ? tokens[idx[p + 1]] : undefined;

    const isTag = !!prev && prev.c === 'sep' && prev.t.includes('<');
    const isCall = !!next && next.t[0] === '(';
    const isKey = !!next && next.t === ':';

    if (isTag || isCall || isKey) tok.c = 'accent';
    else if (KEYWORDS.has(tok.t)) tok.c = 'keyword';
    else tok.c = 'ink';
  }
}

interface CodeBlockProps {
  code: string;
  /** 1-based line numbers to sit on the highlight band. */
  highlightLines?: number[];
  className?: string;
}

export function CodeBlock({ code, highlightLines = [], className }: CodeBlockProps) {
  const lines = useMemo(() => code.replace(/\n$/, '').split('\n').map(scanLine), [code]);
  const hot = useMemo(() => new Set(highlightLines), [highlightLines]);

  return (
    <div
      className={cn('overflow-hidden rounded-lg border', className)}
      style={{
        borderColor: 'var(--story-border)',
        backgroundColor: 'var(--story-code-bg)',
      }}
    >
      <pre
        data-prose
        className="overflow-x-auto py-4 font-[family:var(--font-code)] text-[13px] leading-[1.5]"
      >
        <code className="block whitespace-pre">
          {lines.map((tokens, idx) => (
            <div
              key={idx}
              className="px-4"
              style={{ backgroundColor: hot.has(idx + 1) ? 'var(--story-code-band)' : 'transparent' }}
            >
              {tokens.length === 0
                ? '\u00A0'
                : tokens.map((tok, k) => (
                    <span key={k} style={{ color: TOKEN_COLOR[tok.c] }}>
                      {tok.t}
                    </span>
                  ))}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
