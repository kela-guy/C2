import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ChevronDown, Satellite, Radio, Zap, TriangleAlert, MapPin, Maximize2,
  Eye, EyeOff, Activity, X, Target, Scan, Ruler, VideoOff, Signal,
  Check, Loader2, Circle, Play, ArrowRight, Crosshair, Ban, Plane,
  Rocket, Ship, Filter, ShieldAlert, AlertTriangle, History,
  CheckCircle2, ListTodo, Clock, BatteryMedium, Pause, Home, Navigation,
  RotateCcw, Hand, Film, ChevronUp, Camera, Route, ScanLine, Mountain,
  Copy, ArrowUpDown, SlidersHorizontal, Radar,
} from 'lucide-react';
import { CameraIcon, SensorIcon, RadarIcon, DroneHiveIcon } from '../app/components/TacticalMap';

const LUCIDE_ICONS = [
  { name: 'ChevronDown', component: ChevronDown },
  { name: 'ChevronUp', component: ChevronUp },
  { name: 'Satellite', component: Satellite },
  { name: 'Radio', component: Radio },
  { name: 'Zap', component: Zap },
  { name: 'TriangleAlert', component: TriangleAlert },
  { name: 'MapPin', component: MapPin },
  { name: 'Maximize2', component: Maximize2 },
  { name: 'Eye', component: Eye },
  { name: 'EyeOff', component: EyeOff },
  { name: 'Activity', component: Activity },
  { name: 'X', component: X },
  { name: 'Target', component: Target },
  { name: 'Scan', component: Scan },
  { name: 'Ruler', component: Ruler },
  { name: 'VideoOff', component: VideoOff },
  { name: 'Signal', component: Signal },
  { name: 'Check', component: Check },
  { name: 'Loader2', component: Loader2 },
  { name: 'Circle', component: Circle },
  { name: 'Play', component: Play },
  { name: 'ArrowRight', component: ArrowRight },
  { name: 'Crosshair', component: Crosshair },
  { name: 'Ban', component: Ban },
  { name: 'Plane', component: Plane },
  { name: 'Rocket', component: Rocket },
  { name: 'Ship', component: Ship },
  { name: 'Filter', component: Filter },
  { name: 'ShieldAlert', component: ShieldAlert },
  { name: 'AlertTriangle', component: AlertTriangle },
  { name: 'History', component: History },
  { name: 'CheckCircle2', component: CheckCircle2 },
  { name: 'ListTodo', component: ListTodo },
  { name: 'Clock', component: Clock },
  { name: 'BatteryMedium', component: BatteryMedium },
  { name: 'Pause', component: Pause },
  { name: 'Home', component: Home },
  { name: 'Navigation', component: Navigation },
  { name: 'RotateCcw', component: RotateCcw },
  { name: 'Hand', component: Hand },
  { name: 'Film', component: Film },
  { name: 'Camera', component: Camera },
  { name: 'Route', component: Route },
  { name: 'ScanLine', component: ScanLine },
  { name: 'Mountain', component: Mountain },
  { name: 'Copy', component: Copy },
  { name: 'ArrowUpDown', component: ArrowUpDown },
  { name: 'SlidersHorizontal', component: SlidersHorizontal },
  { name: 'Radar', component: Radar },
];

const CUSTOM_ICONS = [
  { name: 'CameraIcon', component: CameraIcon },
  { name: 'SensorIcon', component: SensorIcon },
  { name: 'RadarIcon', component: RadarIcon },
  { name: 'DroneHiveIcon', component: DroneHiveIcon },
];

function IconCell({ name, children, onCopy }: { name: string; children: React.ReactNode; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer group"
    >
      <div className="relative border border-dashed border-white/20 p-1 rounded">
        {children}
      </div>
      <span className="text-[9px] text-zinc-400 group-hover:text-zinc-300 font-mono truncate max-w-full">
        {copied ? 'copied!' : name}
      </span>
    </button>
  );
}

const COLOR_CLASSES = [
  { label: 'Default', className: 'text-zinc-400' },
  { label: 'Active', className: 'text-white' },
  { label: 'Danger', className: 'text-red-400' },
  { label: 'Warning', className: 'text-amber-400' },
  { label: 'Success', className: 'text-emerald-400' },
  { label: 'Primary', className: 'text-[#74c0fc]' },
];

const meta = {
  title: 'Primitives/Icons',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const LucideIcons: Story = {
  render: () => (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Lucide Icons ({LUCIDE_ICONS.length})</h2>
      <p className="text-xs text-zinc-400 mb-4">Click any icon to copy its import statement. Dashed border shows the hitbox.</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
        {LUCIDE_ICONS.map(({ name, component: Icon }) => (
          <IconCell key={name} name={name} onCopy={() => navigator.clipboard.writeText(`import { ${name} } from "lucide-react";`)}>
            <Icon size={14} className="text-zinc-300 group-hover:text-white transition-colors" />
          </IconCell>
        ))}
      </div>
    </div>
  ),
};

export const CustomIcons: Story = {
  render: () => (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Custom TacticalMap Icons ({CUSTOM_ICONS.length})</h2>
      <p className="text-xs text-zinc-400 mb-4">SVG icons from TacticalMap. Shown at multiple sizes with hitbox overlay.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CUSTOM_ICONS.map(({ name, component: Icon }) => (
          <div key={name} className="flex flex-col items-center gap-3 p-4 rounded-lg border border-white/10">
            <span className="text-[10px] text-zinc-400 font-mono">{name}</span>
            <div className="flex gap-4 items-end">
              {[11, 14, 16, 28].map((size) => (
                <div key={size} className="flex flex-col items-center gap-1">
                  <div className="border border-dashed border-white/20 p-0.5 rounded">
                    <Icon size={size} fill="currentColor" className="text-zinc-300" />
                  </div>
                  <span className="text-[8px] text-zinc-400">{size}px</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(`import { ${name} } from "../app/components/TacticalMap";`)}
              className="text-[9px] text-zinc-400 hover:text-zinc-300 font-mono transition-colors"
            >
              click to copy import
            </button>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const IconSizes: Story = {
  render: () => {
    const [size, setSize] = useState(14);
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-zinc-300">Size: {size}px</label>
          <input type="range" min={10} max={28} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="גודל אייקון" />
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
          {LUCIDE_ICONS.slice(0, 16).map(({ name, component: Icon }) => (
            <div key={name} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed border-white/10">
              <div className="border border-dashed border-white/20 p-1 rounded">
                <Icon size={size} className="text-zinc-300" />
              </div>
              <span className="text-[9px] text-zinc-400 font-mono">{name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const IconColors: Story = {
  render: () => {
    const sampleIcons = [Target, Eye, Crosshair, Radio, Rocket, ShieldAlert, Check, X];
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white">Icon Colors</h2>
        <p className="text-xs text-zinc-400">Icons shown in all contextual color states used across the CUAS system.</p>
        {COLOR_CLASSES.map(({ label, className }) => (
          <div key={label}>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              {label} <code className="text-[10px] text-zinc-400 font-mono">{className}</code>
            </h3>
            <div className="flex gap-4">
              {sampleIcons.map((Icon, i) => (
                <div key={i} className="border border-dashed border-white/10 p-1.5 rounded">
                  <Icon size={16} className={className} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  },
};
