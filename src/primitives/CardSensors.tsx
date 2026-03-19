import React from 'react';
import { CARD_TOKENS } from './tokens';

export interface CardSensor {
  id: string;
  typeLabel: string;
  icon?: React.ElementType;
  distanceLabel?: string;
  detectedAt?: string;
}

export interface CardSensorsProps {
  sensors: CardSensor[];
  label?: string;
  onSensorHover?: (id: string | null) => void;
  className?: string;
}

export function CardSensors({
  sensors,
  label = 'חיישנים',
  onSensorHover,
  className = '',
}: CardSensorsProps) {
  if (sensors.length === 0) return null;

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`} style={{ borderTop: `1px solid ${CARD_TOKENS.surface.level2}` }} dir="rtl">
      {sensors.map((sensor) => {
        const SensorIcon = sensor.icon;
        return (
          <div
            key={sensor.id}
            className="flex items-center gap-2 text-[11px] text-white hover:brightness-125 hover:border-cyan-500/30 rounded px-2 py-1.5 transition-colors group/sensor relative w-full text-right cursor-default"
            style={{ backgroundColor: CARD_TOKENS.surface.level4, border: '1px solid rgba(255, 255, 255, 0.1)' }}
            onMouseEnter={() => onSensorHover?.(sensor.id)}
            onMouseLeave={() => onSensorHover?.(null)}
            aria-label={`${sensor.typeLabel} — ${sensor.id}`}
          >
            {SensorIcon && (
              <span className="shrink-0 opacity-60" aria-hidden="true">
                <SensorIcon size={16} fill="currentColor" />
              </span>
            )}
            <span className="text-xs">{sensor.typeLabel}</span>
            <div className="flex-1" />
            {sensor.detectedAt && (
              <span className="text-xs text-white font-mono tabular-nums">
                {sensor.detectedAt}
              </span>
            )}
            {sensor.distanceLabel && (
              <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                {sensor.distanceLabel}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
