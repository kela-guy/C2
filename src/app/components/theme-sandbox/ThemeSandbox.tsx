import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@/lib/icons/central';
import { Dashboard } from '../Dashboard';
import { CustomizerPanel, PRODUCTION_DEFAULT } from './CustomizerPanel';
import {
  deriveTokens,
  MONO_DEFAULT,
  okStr,
  projectPaletteToSandbox,
  type Mode,
  type ThemeConfig,
} from './tokens';
import { TWEAKCN_ORANGE } from './presets';

/**
 * Named starting palettes. `production` boots from the live palette.css
 * projection; `tweakcn-orange` boots from the imported shadcn/tweakcn
 * orange theme (see ./presets.ts). Each preset persists to its own
 * storage keys so switching routes never clobbers the other's state.
 */
export type ThemeSandboxPreset = 'production' | 'tweakcn-orange';

interface PresetSpec {
  storageKey: string;
  paletteStorageKey: string;
  defaultFor: (mode?: Mode) => ThemeConfig;
}

const PRESETS: Record<ThemeSandboxPreset, PresetSpec> = {
  production: {
    storageKey: 'c2-theme-sandbox-config',
    paletteStorageKey: 'c2-theme-sandbox-palette',
    defaultFor: () => PRODUCTION_DEFAULT,
  },
  'tweakcn-orange': {
    storageKey: 'c2-theme-orange-sandbox-config',
    paletteStorageKey: 'c2-theme-orange-sandbox-palette',
    defaultFor: (mode) => TWEAKCN_ORANGE[mode === 'light' ? 'light' : 'dark'],
  },
};

/**
 * Theme Color Sandbox.
 *
 * Mounts the real production `<Dashboard />` in a scoped root that also
 * hosts the customizer panel. The customizer writes the palette.css CSS
 * variables inline on the scope; production components consume those
 * tokens directly, so palette picks re-skin the whole platform live —
 * no compat stylesheet needed. The customizer collapses to a thin
 * chevron tab so the Dashboard can take the full viewport when the
 * operator wants an unobstructed view.
 *
 * One component serves every starting palette via the `preset` prop —
 * `/theme-sandbox` (production) and `/theme-orange-sandbox`
 * (tweakcn-orange) in dev.
 */
export default function ThemeSandbox({
  preset = 'production',
}: {
  preset?: ThemeSandboxPreset;
}) {
  const spec = PRESETS[preset];
  const [config, setConfig] = useState<ThemeConfig>(() => loadConfig(spec));
  const [paletteOverride, setPaletteOverride] = useState<Record<
    string,
    string
  > | null>(() => loadPalette(spec));
  const [customizerOpen, setCustomizerOpen] = useState(true);

  useEffect(() => {
    try {
      window.localStorage.setItem(spec.storageKey, JSON.stringify(config));
    } catch {
      // Storage may be unavailable in private/incognito — silently degrade.
    }
  }, [config, spec]);

  useEffect(() => {
    try {
      if (paletteOverride) {
        window.localStorage.setItem(
          spec.paletteStorageKey,
          JSON.stringify(paletteOverride),
        );
      } else {
        window.localStorage.removeItem(spec.paletteStorageKey);
      }
    } catch {
      // Storage may be unavailable — silently degrade.
    }
  }, [paletteOverride, spec]);

  const inlineStyle = useMemo(
    () => buildInlineStyle(config, paletteOverride),
    [config, paletteOverride],
  );

  const handleReset = useCallback(() => {
    try {
      window.localStorage.removeItem(spec.storageKey);
      window.localStorage.removeItem(spec.paletteStorageKey);
    } catch {
      // Storage may be unavailable — silently degrade.
    }
    setConfig(MONO_DEFAULT);
    setPaletteOverride(null);
  }, [spec]);

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

      {/* Real production Dashboard — inherits the scoped tokens so the
          whole platform repaints live from the customizer. */}
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

function loadConfig(spec: PresetSpec): ThemeConfig {
  if (typeof window === 'undefined') return spec.defaultFor();
  try {
    const raw = window.localStorage.getItem(spec.storageKey);
    if (!raw) return spec.defaultFor();
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    const base = spec.defaultFor(parsed.mode);
    return {
      ...base,
      ...parsed,
      primary: { ...base.primary, ...parsed.primary },
      secondary: { ...base.secondary, ...parsed.secondary },
    };
  } catch {
    return spec.defaultFor();
  }
}

function loadPalette(spec: PresetSpec): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(spec.paletteStorageKey);
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
// operator drags a picker.

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
