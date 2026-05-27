import { useCallback, useEffect, useMemo, useState } from 'react';
import { Orb, type AgentState } from '@/app/components/ui/orb';
import {
  OrbConfigPanel,
  type OrbColors,
  type ShapePreset,
  type ShapeState,
  type VolumeMode,
} from './OrbConfigPanel';

type NamedShapePreset = Exclude<ShapePreset, 'custom'>;

const SHAPE_PRESETS: Record<NamedShapePreset, ShapeState> = {
  circle: {
    preset: 'circle',
    widthPx: 320,
    heightPx: 320,
    rotationDeg: 0,
    skewXDeg: 0,
    skewYDeg: 0,
    radiusMode: 'round',
    wobbleAmount: 0,
    wobblePeriodSec: 7,
  },
  ellipse: {
    preset: 'ellipse',
    widthPx: 380,
    heightPx: 280,
    rotationDeg: 0,
    skewXDeg: 0,
    skewYDeg: 0,
    radiusMode: 'round',
    wobbleAmount: 0,
    wobblePeriodSec: 7,
  },
  blob: {
    preset: 'blob',
    widthPx: 360,
    heightPx: 320,
    rotationDeg: -8,
    skewXDeg: 0,
    skewYDeg: 0,
    radiusMode: 'morph',
    wobbleAmount: 0.55,
    wobblePeriodSec: 8,
  },
  free: {
    preset: 'free',
    widthPx: 380,
    heightPx: 380,
    rotationDeg: 0,
    skewXDeg: 0,
    skewYDeg: 0,
    radiusMode: 'free',
    wobbleAmount: 0,
    wobblePeriodSec: 7,
  },
};

function applyPreset(preset: ShapePreset): ShapeState {
  if (preset === 'custom') return SHAPE_PRESETS.circle;
  return SHAPE_PRESETS[preset];
}

const DEFAULTS = {
  agentState: 'talking' as AgentState,
  // Orb shader gradient endpoints — Three.js Color uniforms, not CSS.
  colors: ['#CADCFC', '#A0B9D1'] as OrbColors,
  seed: 42,
  volumeMode: 'auto' as VolumeMode,
  manualInput: 0.6,
  manualOutput: 0.8,
  shape: SHAPE_PRESETS.circle,
  darkMode: true,
};

const STATE_LABEL: Record<string, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  listening: 'Listening',
  talking: 'Talking',
};

const MORPH_STOPS: number[][] = [
  [50, 50, 50, 50, 50, 50, 50, 50],
  [62, 38, 70, 30, 55, 45, 65, 35],
  [30, 70, 40, 60, 70, 30, 55, 45],
  [55, 45, 35, 65, 60, 40, 30, 70],
  [70, 30, 60, 40, 40, 60, 50, 50],
];

function morphFrame(values: number[], amount: number): string {
  const a = values.map((v) => 50 + (v - 50) * amount);
  return `${a[0]}% ${a[1]}% ${a[2]}% ${a[3]}% / ${a[4]}% ${a[5]}% ${a[6]}% ${a[7]}%`;
}

function buildMorphKeyframes(amount: number): string {
  const frames = MORPH_STOPS.map((s) => morphFrame(s, amount));
  return `@keyframes orbMorph {
  0%   { border-radius: ${frames[0]}; }
  20%  { border-radius: ${frames[1]}; }
  40%  { border-radius: ${frames[2]}; }
  60%  { border-radius: ${frames[3]}; }
  80%  { border-radius: ${frames[4]}; }
  100% { border-radius: ${frames[0]}; }
}`;
}

export default function OrbSandbox() {
  const [agentState, setAgentState] = useState<AgentState>(DEFAULTS.agentState);
  const [colors, setColors] = useState<OrbColors>(DEFAULTS.colors);
  const [seed, setSeed] = useState(DEFAULTS.seed);
  const [volumeMode, setVolumeMode] = useState<VolumeMode>(DEFAULTS.volumeMode);
  const [manualInput, setManualInput] = useState(DEFAULTS.manualInput);
  const [manualOutput, setManualOutput] = useState(DEFAULTS.manualOutput);
  const [shape, setShape] = useState<ShapeState>(DEFAULTS.shape);
  const [darkMode, setDarkMode] = useState(DEFAULTS.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains('dark');
    root.classList.toggle('dark', darkMode);
    return () => {
      root.classList.toggle('dark', had);
    };
  }, [darkMode]);

  const handleRandomizeSeed = useCallback(() => {
    setSeed(Math.floor(Math.random() * 2 ** 32));
  }, []);

  const handleShapePreset = useCallback((preset: ShapePreset) => {
    setShape(applyPreset(preset));
  }, []);

  const handleShapeFieldChange = useCallback(
    <K extends keyof ShapeState>(key: K, value: ShapeState[K]) => {
      setShape((prev) => ({ ...prev, [key]: value, preset: 'custom' }));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setAgentState(DEFAULTS.agentState);
    setColors(DEFAULTS.colors);
    setSeed(DEFAULTS.seed);
    setVolumeMode(DEFAULTS.volumeMode);
    setManualInput(DEFAULTS.manualInput);
    setManualOutput(DEFAULTS.manualOutput);
    setShape(DEFAULTS.shape);
    setDarkMode(DEFAULTS.darkMode);
  }, []);

  const stateLabel = STATE_LABEL[agentState ?? 'idle'];

  const morphCss = useMemo(() => buildMorphKeyframes(shape.wobbleAmount), [shape.wobbleAmount]);

  const isMorph = shape.radiusMode === 'morph';
  const isFree = shape.radiusMode === 'free';
  const isRound = shape.radiusMode === 'round';

  const wrapperStyle: React.CSSProperties = {
    width: shape.widthPx,
    height: shape.heightPx,
    transform: `rotate(${shape.rotationDeg}deg) skew(${shape.skewXDeg}deg, ${shape.skewYDeg}deg)`,
    borderRadius: isRound ? '50%' : isFree ? '0' : undefined,
    animation: isMorph ? `orbMorph ${shape.wobblePeriodSec}s ease-in-out infinite` : undefined,
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-slate-12">
      <style>{morphCss}</style>

      <div className="absolute inset-0 flex items-center justify-center">
        {isRound ? (
          <div
            className="relative bg-surface-3 p-[6px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]"
            style={wrapperStyle}
          >
            <div
              className="size-full overflow-hidden bg-surface-1 shadow-[inset_0_0_24px_rgba(0,0,0,0.4)]"
              style={{ borderRadius: 'inherit' }}
            >
              <Orb
                colors={colors}
                seed={seed}
                agentState={agentState}
                volumeMode={volumeMode}
                manualInput={manualInput}
                manualOutput={manualOutput}
              />
            </div>
          </div>
        ) : (
          <div
            className="relative overflow-hidden"
            style={{
              ...wrapperStyle,
              background: isFree ? 'transparent' : 'var(--surface-1)',
              boxShadow: isFree
                ? '0 0 60px rgba(0,0,0,0.6)'
                : 'inset 0 0 24px rgba(0,0,0,0.4)',
            }}
          >
            <Orb
              colors={colors}
              seed={seed}
              agentState={agentState}
              volumeMode={volumeMode}
              manualInput={manualInput}
              manualOutput={manualOutput}
            />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 text-[12px] text-slate-10">
        <span className="font-mono">/orb-sandbox</span>
        <span>{stateLabel}</span>
      </div>

      <OrbConfigPanel
        agentState={agentState}
        onAgentStateChange={setAgentState}
        colors={colors}
        onColorsChange={setColors}
        seed={seed}
        onSeedChange={setSeed}
        onRandomizeSeed={handleRandomizeSeed}
        volumeMode={volumeMode}
        onVolumeModeChange={setVolumeMode}
        manualInput={manualInput}
        onManualInputChange={setManualInput}
        manualOutput={manualOutput}
        onManualOutputChange={setManualOutput}
        shape={shape}
        onShapePreset={handleShapePreset}
        onShapeFieldChange={handleShapeFieldChange}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        onReset={handleReset}
      />
    </div>
  );
}
