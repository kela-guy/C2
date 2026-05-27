/**
 * Dev-only clipboard helper for the Handoff Inspector.
 *
 * Mirrors the fallback path in `src/primitives/CopyButton.tsx` (hidden
 * textarea + `document.execCommand('copy')`) so non-HTTPS dev hosts still
 * work. The primitive's helper is intentionally not exported, so the
 * inspector duplicates the ~25 lines rather than touching production code.
 */
export async function writeToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to legacy path
  }

  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.setAttribute('data-handoff-inspector', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
