/**
 * Drone-specific HUD overlay - mounts only when status.deviceType === 'drone'.
 *
 * Right-edge stat column inspired by DJI Fly:
 *   - Battery % with bar
 *   - Signal bars
 *   - Distance from home
 *   - Heading vs home (relative degrees)
 */

import { Battery, BatteryLow, Compass, Home, SignalHigh, SignalLow } from 'lucide-react';
import type { CameraStatus } from './types';

interface DroneHudProps {
  status: CameraStatus;
}

function bearingDelta(from: number, to: number): number {
  return (((to - from + 540) % 360) - 180);
}

export function DroneHud({ status }: DroneHudProps) {
  if (status.deviceType !== 'drone') return null;

  const battery = status.batteryPct ?? 100;
  const signal = status.signalPct ?? 100;
  const distance = status.distanceFromHomeM ?? 0;
  const headingToHomeDelta = Math.round(bearingDelta(status.bearingDeg, 0));

  const batteryColor = battery <= 20 ? 'text-red-400' : battery <= 40 ? 'text-amber-300' : 'text-emerald-300';
  const signalColor = signal <= 25 ? 'text-red-400' : signal <= 50 ? 'text-amber-300' : 'text-emerald-300';

  return (
    <div
      className="absolute z-20 right-3 top-24 bottom-24 flex items-center pointer-events-none"
      dir="ltr"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-1.5 bg-black/45 backdrop-blur-sm ring-1 ring-inset ring-white/10 px-2 py-2">
        <Tile
          icon={battery <= 20 ? <BatteryLow size={13} className={batteryColor} /> : <Battery size={13} className={batteryColor} />}
          label="BAT"
          value={`${Math.round(battery)}%`}
          accent={batteryColor}
          bar={battery / 100}
        />
        <Tile
          icon={signal <= 25 ? <SignalLow size={13} className={signalColor} /> : <SignalHigh size={13} className={signalColor} />}
          label="SIG"
          value={`${Math.round(signal)}%`}
          accent={signalColor}
          bar={signal / 100}
        />
        <Tile
          icon={<Home size={12} className="text-white/70" />}
          label="HOME"
          value={`${Math.round(distance)}m`}
        />
        <Tile
          icon={<Compass size={12} className="text-white/70" />}
          label="REL"
          value={`${headingToHomeDelta >= 0 ? '+' : ''}${headingToHomeDelta}\u00b0`}
        />
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
  bar,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  bar?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[64px]">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[8.5px] font-medium text-white/55 uppercase tracking-[0.18em]">{label}</span>
      </div>
      <span className={`font-mono text-[12px] leading-none tabular-nums ${accent ?? 'text-white/95'}`}>
        {value}
      </span>
      {typeof bar === 'number' && (
        <div className="h-0.5 w-full bg-white/10 overflow-hidden">
          <div
            className={`h-full ${accent ? accent.replace('text-', 'bg-') : 'bg-white/60'}`}
            style={{ width: `${Math.max(0, Math.min(1, bar)) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
