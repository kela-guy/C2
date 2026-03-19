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
  /** When set, each row is a real `<button>` (keyboard + screen readers). */
  onSensorClick?: (id: string) => void;
  className?: string;
}

const rowClassName =
  'flex items-center gap-2 text-[11px] text-white hover:brightness-125 hover:border-cyan-500/30 rounded px-2 py-1.5 transition-colors group/sensor relative w-full text-right border border-white/10';
const rowStyle = { backgroundColor: CARD_TOKENS.surface.level4 } as const;

export function CardSensors({
  sensors,
  label = 'חיישנים',
  onSensorHover,
  onSensorClick,
  className = '',
}: CardSensorsProps) {
  if (sensors.length === 0) return null;

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`} style={{ borderTop: `1px solid ${CARD_TOKENS.surface.level2}` }} dir="rtl">
      {sensors.map((sensor) => {
        const SensorIcon = sensor.icon;
        const aria = `${sensor.typeLabel} — ${sensor.id}`;
        const hoverEnter = () => onSensorHover?.(sensor.id);
        const hoverLeave = () => onSensorHover?.(null);

        const inner = (
          <>
            {SensorIcon && (
              <span className="shrink-0 opacity-60" aria-hidden="true">
                <SensorIcon size={16} fill="currentColor" />
              </span>
            )}
            <span className="text-xs">{sensor.typeLabel}</span>
            <span className="flex-1 min-w-0 block" aria-hidden="true" />
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
          </>
        );

        if (onSensorClick) {
          return (
            <button
              key={sensor.id}
              type="button"
              className={`${rowClassName} cursor-pointer font-sans`}
              style={rowStyle}
              aria-label={aria}
              onClick={() => onSensorClick(sensor.id)}
              onMouseEnter={hoverEnter}
              onMouseLeave={hoverLeave}
            >
              {inner}
            </button>
          );
        }

        return (
          <div
            key={sensor.id}
            className={`${rowClassName} cursor-default`}
            style={rowStyle}
            onMouseEnter={hoverEnter}
            onMouseLeave={hoverLeave}
            aria-label={aria}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
