import React, { memo, useCallback } from 'react';
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
  'flex items-center gap-2 text-xs text-white hover:bg-white/[0.08] rounded px-2 py-1.5 transition-colors group/sensor relative w-full text-end';
const buttonRowClassName =
  `${rowClassName} cursor-pointer font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 active:bg-white/[0.04]`;
const rowStyle = { backgroundColor: CARD_TOKENS.surface.level4 } as const;

export function CardSensors({
  sensors,
  label = 'Sensors',
  onSensorHover,
  onSensorClick,
  className = '',
}: CardSensorsProps) {
  if (sensors.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`} style={{ boxShadow: `inset 0 1px 0 0 ${CARD_TOKENS.surface.level2}` }}>
      {sensors.map((sensor) => (
        <SensorRow
          key={sensor.id}
          sensor={sensor}
          onSensorClick={onSensorClick}
          onSensorHover={onSensorHover}
        />
      ))}
    </div>
  );
}

interface SensorRowProps {
  sensor: CardSensor;
  onSensorHover?: (id: string | null) => void;
  onSensorClick?: (id: string) => void;
}

const SensorRow = memo(function SensorRow({ sensor, onSensorHover, onSensorClick }: SensorRowProps) {
  const SensorIcon = sensor.icon;
  const aria = `${sensor.typeLabel} — ${sensor.id}`;
  const hoverEnter = useCallback(() => onSensorHover?.(sensor.id), [onSensorHover, sensor.id]);
  const hoverLeave = useCallback(() => onSensorHover?.(null), [onSensorHover]);
  const handleClick = useCallback(() => onSensorClick?.(sensor.id), [onSensorClick, sensor.id]);

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
        <span className="text-xs text-zinc-400 font-mono tabular-nums">
          {sensor.distanceLabel}
        </span>
      )}
    </>
  );

  if (onSensorClick) {
    return (
      <button
        type="button"
        className={buttonRowClassName}
        style={rowStyle}
        aria-label={aria}
        onClick={handleClick}
        onMouseEnter={hoverEnter}
        onMouseLeave={hoverLeave}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={`${rowClassName} cursor-default`}
      style={rowStyle}
      onMouseEnter={hoverEnter}
      onMouseLeave={hoverLeave}
      aria-label={aria}
    >
      {inner}
    </div>
  );
});
