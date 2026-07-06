import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dashboard } from '../Dashboard';
import { CustomizerPanel } from '../theme-sandbox/CustomizerPanel';
import { compatStyles } from '../theme-sandbox/compat';
import { sliderStyles } from '../theme-sandbox/ThemeSandbox';
import {
  deriveTokens,
  MONO_DEFAULT,
  okStr,
  projectPaletteToSandbox,
  type ThemeConfig,
} from '../theme-sandbox/tokens';
import { TWEAKCN_ORANGE } from './presets';

const STORAGE_KEY = 'c2-theme-orange-sandbox-config';
const PALETTE_STORAGE_KEY = 'c2-theme-orange-sandbox-palette';

/**
 * Tweakcn Orange Sandbox.
 *
 * Twin of `/theme-sandbox` that boots with the imported shadcn/tweakcn
 * orange theme. Mounts the real production `<Dashboard />` in the
 * scoped root next to a collapsible customizer panel — same interaction
 * model as `/theme-sandbox`, just with a different starting palette.
 *
 * Reach it at `/theme-orange-sandbox` in dev.
 */
export default function ThemeOrangeSandbox() {
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

      {/* Chevron tab — glued to the customizer's inline-start edge. */}
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
  if (typeof window === 'undefined') return TWEAKCN_ORANGE.dark;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return TWEAKCN_ORANGE.dark;
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    const base = TWEAKCN_ORANGE[parsed.mode === 'light' ? 'light' : 'dark'];
    return {
      ...base,
      ...parsed,
      primary: { ...base.primary, ...parsed.primary },
      secondary: { ...base.secondary, ...parsed.secondary },
    };
  } catch {
    return TWEAKCN_ORANGE.dark;
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
 * Same layering as `ThemeSandbox.buildInlineStyle`:
 * sandbox tokens → raw tweakcn vars → projected sandbox names → user's
 * Color-section primary/secondary picks always win at the top.
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
