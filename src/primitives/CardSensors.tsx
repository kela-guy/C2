import React from 'react';

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
  onSensorClick?: (id: string) => void;
  className?: string;
}

export function CardSensors({
  sensors,
  label = 'חיישנים',
  onSensorHover,
  onSensorClick,
  className = '',
}: CardSensorsProps) {
  if (sensors.length === 0) return null;

  return (
    <div className={`flex flex-col gap-1 pt-2 border-t border-white/5 ${className}`} dir="rtl">
      <span className="text-[10px] text-zinc-500 font-semibold pb-0.5">
        {label} ({sensors.length})
      </span>
      {sensors.map((sensor) => {
        const SensorIcon = sensor.icon;
        return (
          <div
            key={sensor.id}
            className="flex items-center gap-2 text-[11px] bg-black/30 border border-white/10 text-gray-300 cursor-pointer hover:bg-white/10 hover:border-cyan-500/30 rounded px-2 py-1.5 transition-colors group/sensor relative"
            onMouseEnter={() => onSensorHover?.(sensor.id)}
            onMouseLeave={() => onSensorHover?.(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSensorClick?.(sensor.id);
            }}
            title={sensor.id}
          >
            {SensorIcon && (
              <span className="shrink-0 opacity-60">
                <SensorIcon size={16} fill="currentColor" />
              </span>
            )}
            <span className="font-['Inter'] text-xs">{sensor.typeLabel}</span>
            <div className="flex-1" />
            {sensor.detectedAt && (
              <span className="text-[9px] text-zinc-600 font-mono tabular-nums">
                {sensor.detectedAt}
              </span>
            )}
            {sensor.distanceLabel && (
              <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
                {sensor.distanceLabel}
              </span>
            )}
            <span className="opacity-0 group-hover/sensor:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 bg-black/90 px-1.5 py-0.5 rounded text-[9px] text-white -top-5 whitespace-nowrap pointer-events-none z-10">
              {sensor.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}
