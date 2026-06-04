/**
 * Strips source comments from a code snippet so the styleguide code previews
 * render clean, comment-free code (the design intent is to show the *shape* of
 * the API, not the inline narration).
 *
 * It is a small hand-rolled scanner rather than a regex so it never strips
 * comment-looking sequences that live inside strings/template literals (e.g.
 * `'https://…'` or `` `a // b` ``). Comment-only lines are dropped entirely
 * (including JSX `{/* … *​/}` lines that reduce to `{}`); trailing inline
 * comments are trimmed; and runs of blank lines left behind are collapsed to a
 * single blank so the snippet stays readable.
 *
 * Scope: handles C-style `//` line + `/* *​/` block comments (tsx/ts/js/jsx/
 * css/scss/json5/…) and `#` line comments for shell/yaml/python-ish langs.
 */

const HASH_COMMENT_LANGS = new Set([
  'bash',
  'sh',
  'shell',
  'zsh',
  'python',
  'py',
  'yaml',
  'yml',
  'toml',
  'dockerfile',
]);

export function stripCodeComments(code: string, lang?: string): string {
  if (!code) return code;

  const useHash = !!lang && HASH_COMMENT_LANGS.has(lang);
  const lines = code.split('\n');
  const outLines: string[] = [];

  // State that must persist across lines: block comments (`/* … */`) and
  // multi-line template literals (`` ` ``) both span newlines.
  let inBlock = false;
  let inString: string | null = null;

  for (const line of lines) {
    const wasBlank = line.trim() === '';
    let out = '';
    let removedComment = false;
    let i = 0;

    while (i < line.length) {
      const ch = line[i];
      const next = line[i + 1];

      if (inBlock) {
        removedComment = true;
        if (ch === '*' && next === '/') {
          inBlock = false;
          i += 2;
        } else {
          i += 1;
        }
        continue;
      }

      if (inString) {
        out += ch;
        if (ch === '\\' && i + 1 < line.length) {
          out += line[i + 1];
          i += 2;
          continue;
        }
        if (ch === inString) inString = null;
        i += 1;
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
        out += ch;
        i += 1;
        continue;
      }

      if (!useHash && ch === '/' && next === '/') {
        removedComment = true;
        break; // rest of the line is a line comment
      }
      if (!useHash && ch === '/' && next === '*') {
        inBlock = true;
        removedComment = true;
        i += 2;
        continue;
      }
      if (useHash && ch === '#') {
        removedComment = true;
        break;
      }

      out += ch;
      i += 1;
    }

    const trimmedFull = out.trim();

    // A line that was *only* a comment (or a JSX comment that collapsed to an
    // empty `{}`) is dropped entirely so no orphan blank/braces remain.
    if (removedComment && (trimmedFull === '' || trimmedFull === '{}')) continue;

    // Preserve intentional blank lines from the source; collapse later.
    if (!removedComment && wasBlank) {
      outLines.push('');
      continue;
    }

    outLines.push(out.replace(/\s+$/, ''));
  }

  // Collapse 2+ consecutive blanks to one, then trim leading/trailing blanks.
  const collapsed: string[] = [];
  for (const l of outLines) {
    if (l.trim() === '' && collapsed.length > 0 && collapsed[collapsed.length - 1].trim() === '') {
      continue;
    }
    collapsed.push(l);
  }
  while (collapsed.length > 0 && collapsed[0].trim() === '') collapsed.shift();
  while (collapsed.length > 0 && collapsed[collapsed.length - 1].trim() === '') collapsed.pop();

  return collapsed.join('\n');
}
