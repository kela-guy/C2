import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dashboard } from '../Dashboard';
import { CustomizerPanel, PRODUCTION_DEFAULT } from './CustomizerPanel';
import { compatStyles } from './compat';
import {
  deriveTokens,
  MONO_DEFAULT,
  okStr,
  projectPaletteToSandbox,
  type ThemeConfig,
} from './tokens';

const STORAGE_KEY = 'c2-theme-sandbox-config';
const PALETTE_STORAGE_KEY = 'c2-theme-sandbox-palette';

/**
 * Theme Color Sandbox.
 *
 * Mounts the real production `<Dashboard />` in a scoped root that also
 * hosts the customizer panel. The customizer writes CSS variables that
 * the sandbox scope + compat.ts stylesheet cascade into every hardcoded
 * color in the Dashboard, so palette picks re-skin the whole platform
 * live. The customizer collapses to a thin chevron tab so the Dashboard
 * can take the full viewport when the operator wants an unobstructed
 * view.
 *
 * Reach it at `/theme-sandbox` in dev.
 */
export default function ThemeSandbox() {
  const [config, setConfig] = useState<ThemeConfig>(() => loadConfig());
  const [paletteOverride, setPaletteOverride] = useState<Record<
    string,
    string
  > | null>(() => loadPalette());
  const [customizerOpen, setCustomizerOpen] = useState(true);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Storage may be unavailable in private/incognito — silently degrade.
    }
  }, [config]);

  useEffect(() => {
    try {
      if (paletteOverride) {
        window.localStorage.setItem(
          PALETTE_STORAGE_KEY,
          JSON.stringify(paletteOverride),
        );
      } else {
        window.localStorage.removeItem(PALETTE_STORAGE_KEY);
      }
    } catch {
      // Storage may be unavailable — silently degrade.
    }
  }, [paletteOverride]);

  const inlineStyle = useMemo(
    () => buildInlineStyle(config, paletteOverride),
    [config, paletteOverride],
  );

  const handleReset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(PALETTE_STORAGE_KEY);
    } catch {
      // Storage may be unavailable — silently degrade.
    }
    setConfig(MONO_DEFAULT);
    setPaletteOverride(null);
  }, []);

  const handleApplyPalette = useCallback(
    (parsed: Record<string, string>) => setPaletteOverride(parsed),
    [],
  );

  const handleClearPalette = useCallback(() => setPaletteOverride(null), []);

  return (
    <div
      data-theme-sandbox-scope=""
      className="relative flex h-screen w-full bg-surface-1 text-slate-12"
      style={inlineStyle}
    >
      <style>{sliderStyles}</style>
      <style>{compatStyles}</style>

      {/* Real production Dashboard — inherits the scoped tokens + compat
          overrides so the whole platform repaints live from the customizer. */}
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <Dashboard />
      </div>

      {/* Width-animating wrapper: shrinks to 0 when collapsed, letting the
          Dashboard slot flex-grow to fill the freed space. */}
      <div
        className={`flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
          customizerOpen ? 'w-80' : 'w-0'
        }`}
      >
        <CustomizerPanel
          config={config}
          onChange={setConfig}
          onReset={handleReset}
          onCollapse={() => setCustomizerOpen(false)}
          paletteOverride={paletteOverride}
          onApplyPalette={handleApplyPalette}
          onClearPalette={handleClearPalette}
        />
      </div>

      {/* Chevron tab — glued to the customizer's inline-start edge. Tracks
          the wrapper's outer edge (end-80 open, end-0 closed) so it always
          sits on the seam between the Dashboard and the customizer. */}
      <button
        type="button"
        onClick={() => setCustomizerOpen((v: boolean) => !v)}
        aria-label={customizerOpen ? 'Collapse customizer' : 'Expand customizer'}
        className={`absolute top-1/2 z-40 -translate-y-1/2 flex h-16 w-5 items-center justify-center rounded-s border border-e-0 border-border-default bg-surface-3 text-slate-11 shadow-2 transition-[inset-inline-end] duration-300 ease-in-out hover:text-slate-12 ${
          customizerOpen ? 'end-80' : 'end-0'
        }`}
      >
        {customizerOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}

function loadConfig(): ThemeConfig {
  if (typeof window === 'undefined') return PRODUCTION_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return PRODUCTION_DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    return {
      ...PRODUCTION_DEFAULT,
      ...parsed,
      primary: { ...PRODUCTION_DEFAULT.primary, ...parsed.primary },
      secondary: { ...PRODUCTION_DEFAULT.secondary, ...parsed.secondary },
    };
  } catch {
    return PRODUCTION_DEFAULT;
  }
}

function loadPalette(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Compose the inline CSS-variable style applied to the sandbox root.
 * Layering order:
 *   1. `deriveTokens(config)` — the sandbox's own slate ramp + accents.
 *   2. Raw `paletteOverride` — the pasted tweakcn `--primary`, `--card`,
 *      `--muted`, … tokens that shadcn utilities (`bg-primary`, `bg-card`)
 *      resolve against.
 *   3. `projectPaletteToSandbox` — the same imported tokens re-emitted
 *      under sandbox names (`--surface-*`, `--slate-*`, `--border-*`,
 *      `--primary-color`, …) so `compat.ts` remaps of hardcoded classes
 *      pick them up.
 *   4. Color-section overrides — reassert the current `config.primary`
 *      and `config.secondary` on top of the imported accent so any pick
 *      in the Color section wins, even after a palette is imported.
 */
function buildInlineStyle(
  config: ThemeConfig,
  paletteOverride: Record<string, string> | null,
): React.CSSProperties {
  const base = deriveTokens(config);
  if (!paletteOverride) return base as unknown as React.CSSProperties;

  const projected = projectPaletteToSandbox(paletteOverride);
  const primaryStr = okStr(config.primary);
  const secondaryStr = okStr(config.secondary);

  return {
    ...base,
    ...paletteOverride,
    ...projected,
    '--primary-color': primaryStr,
    '--primary': primaryStr,
    '--ring': primaryStr,
    '--sidebar-primary': primaryStr,
    '--sidebar-ring': primaryStr,
    '--secondary-color': secondaryStr,
    '--secondary': secondaryStr,
  } as unknown as React.CSSProperties;
}

// ── Native slider paint job ───────────────────────────────────────────────
//
// Scoped so it only affects the sandbox's range inputs. Uses semantic
// tokens so the slider itself repaints along with everything else when the
// operator drags a picker. Exported so sibling sandboxes (e.g.
// theme-sandbox-orange) can reuse the same paint job for CustomizerPanel.

export const sliderStyles = `
.theme-sandbox-slider {
  --track-h: 6px;
  --thumb: 14px;
}
.theme-sandbox-slider::-webkit-slider-runnable-track {
  height: var(--track-h);
  border-radius: 999px;
  background: var(--track-bg, var(--surface-5));
  box-shadow: inset 0 0 0 1px var(--border-subtle);
}
.theme-sandbox-slider::-moz-range-track {
  height: var(--track-h);
  border-radius: 999px;
  background: var(--track-bg, var(--surface-5));
  box-shadow: inset 0 0 0 1px var(--border-subtle);
}
.theme-sandbox-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: var(--thumb);
  width: var(--thumb);
  border-radius: 999px;
  background: var(--slate-12);
  border: 2px solid var(--slate-1);
  margin-top: calc((var(--track-h) - var(--thumb)) / 2);
  box-shadow: var(--shadow-2), 0 0 0 1px var(--border-strong);
  cursor: pointer;
}
.theme-sandbox-slider::-moz-range-thumb {
  height: var(--thumb);
  width: var(--thumb);
  border-radius: 999px;
  background: var(--slate-12);
  border: 2px solid var(--slate-1);
  box-shadow: var(--shadow-2), 0 0 0 1px var(--border-strong);
  cursor: pointer;
}
.theme-sandbox-slider:focus-visible {
  outline: none;
}
.theme-sandbox-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary-color) 40%, transparent);
}
.theme-sandbox-slider:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary-color) 40%, transparent);
}
`;
