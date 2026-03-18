import React, { useState, useMemo, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  SENSOR_ASSETS,
  CAMERA_ASSETS,
  RADAR_ASSETS,
  DRONE_HIVE_ASSETS,
  REGULUS_EFFECTORS,
  LAUNCHER_ASSETS,
  SensorIcon,
  CameraIcon,
  RadarIcon,
  DroneHiveIcon,
  LauncherIcon,
} from './TacticalMap';

export function DevicesIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 5C4 4.44772 4.44772 4 5 4H9C9.55228 4 10 4.44772 10 5V9C10 9.55228 9.55228 10 9 10H5C4.44772 10 4 9.55228 4 9V5Z" stroke="currentColor" strokeWidth="1.995" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 15C4 14.4477 4.44772 14 5 14H9C9.55228 14 10 14.4477 10 15V19C10 19.5523 9.55228 20 9 20H5C4.44772 20 4 19.5523 4 19V15Z" stroke="currentColor" strokeWidth="1.995" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 5C14 4.44772 14.4477 4 15 4H19C19.5523 4 20 4.44772 20 5V9C20 9.55228 19.5523 10 19 10H15C14.4477 10 14 9.55228 14 9V5Z" stroke="currentColor" strokeWidth="1.995" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 17C14 15.3431 15.3431 14 17 14C18.6569 14 20 15.3431 20 17C20 18.6569 18.6569 20 17 20C15.3431 20 14 18.6569 14 17Z" stroke="currentColor" strokeWidth="1.995" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

type DeviceType = 'sensor' | 'camera' | 'radar' | 'jammer' | 'drone_hive' | 'launcher';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  lat: number;
  lon: number;
  status: 'available' | 'active' | 'offline';
  fovDeg?: number;
  bearingDeg?: number;
  coverageRadiusM?: number;
  Icon: React.FC<{ size?: number; fill?: string }>;
}

const TYPE_ORDER: DeviceType[] = ['sensor', 'camera', 'radar', 'drone_hive', 'jammer', 'launcher'];

const TYPE_LABELS: Record<DeviceType, string> = {
  sensor: 'חיישנים',
  camera: 'מצלמות',
  radar: 'מכ"מים',
  drone_hive: 'כוורות',
  jammer: 'משבשים',
  launcher: 'משגרים',
};

const TYPE_FILTER_ICONS: Record<DeviceType, React.FC<{ size?: number; fill?: string }>> = {
  sensor: SensorIcon,
  camera: CameraIcon,
  radar: RadarIcon,
  drone_hive: DroneHiveIcon,
  jammer: SensorIcon,
  launcher: LauncherIcon,
};

const STATUS_SORT: Record<string, number> = { offline: 0, active: 1, available: 2 };

const ALL_DEVICES: Device[] = [
  ...SENSOR_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'sensor' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    fovDeg: a.fovDeg, bearingDeg: a.bearingDeg, Icon: SensorIcon,
  })),
  ...CAMERA_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'camera' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    fovDeg: a.fovDeg, bearingDeg: a.bearingDeg, Icon: CameraIcon,
  })),
  ...RADAR_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'radar' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    fovDeg: a.fovDeg, bearingDeg: a.bearingDeg, Icon: RadarIcon,
  })),
  ...DRONE_HIVE_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'drone_hive' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    Icon: DroneHiveIcon,
  })),
  ...REGULUS_EFFECTORS.map(e => ({
    id: e.id, name: e.name, type: 'jammer' as DeviceType,
    lat: e.lat, lon: e.lon,
    status: (e.status === 'active' ? 'active' : e.status === 'inactive' ? 'offline' : 'available') as Device['status'],
    coverageRadiusM: e.coverageRadiusM, Icon: SensorIcon,
  })),
  ...LAUNCHER_ASSETS.map(l => ({
    id: l.id, name: 'משגר טילים', type: 'launcher' as DeviceType,
    lat: l.latitude, lon: l.longitude, status: 'available' as const,
    Icon: LauncherIcon,
  })),
];

function DeviceRow({
  device,
  isExpanded,
  onToggle,
  onHover,
}: {
  device: Device;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
}) {
  const metricParts: string[] = [device.id];
  if (device.fovDeg != null) metricParts.push(`${device.fovDeg}°`);
  if (device.coverageRadiusM != null) metricParts.push(`${(device.coverageRadiusM / 1000).toFixed(1)}km`);

  const statusColor =
    device.status === 'active' ? 'bg-amber-500'
    : device.status === 'offline' ? 'bg-red-500'
    : 'bg-emerald-500';

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-2.5 px-4 py-2 text-right hover:bg-white/[0.04] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 rounded-none"
        dir="rtl"
        onMouseEnter={() => onHover(device.id)}
        onMouseLeave={() => onHover(null)}
      >
        <div className="w-8 h-8 rounded bg-[#333] flex items-center justify-center shrink-0 mt-0.5">
          <device.Icon size={20} fill="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-[#dee2e6] truncate">{device.name}</span>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 truncate">
            {metricParts.join(' · ')}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pt-2 pb-2 bg-white/5" dir="rtl">
              <div className="flex flex-row flex-nowrap gap-3">
                <DetailRow label="מיקום" value={`${device.lat.toFixed(4)}, ${device.lon.toFixed(4)}`} />
                {device.bearingDeg != null && <DetailRow label="כיוון" value={`${device.bearingDeg}°`} />}
                {device.fovDeg != null && <DetailRow label="שדה ראייה" value={`${device.fovDeg}°`} />}
                {device.coverageRadiusM != null && (
                  <DetailRow label="כיסוי" value={`${device.coverageRadiusM.toLocaleString()}m`} />
                )}
                {device.type === 'jammer' && (
                  <DetailRow label="מצב" value={device.status === 'active' ? 'פעיל' : 'זמין'} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-full flex flex-col justify-center items-start gap-1 text-xs">
      <span className="text-white/60 text-[10px]">{label}</span>
      <span className="text-zinc-300 font-mono tabular-nums text-[11px]">{value}</span>
    </div>
  );
}

interface DevicesPanelProps {
  open: boolean;
  onClose: () => void;
  onFlyTo: (lat: number, lon: number) => void;
  onDeviceHover?: (id: string | null) => void;
  noTransition?: boolean;
}

export function DevicesPanel({ open, onClose, onFlyTo, onDeviceHover, noTransition }: DevicesPanelProps) {
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<DeviceType>>(new Set(TYPE_ORDER));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleTypeToggle = useCallback((type: DeviceType) => {
    setActiveTypes(prev => {
      const allActive = prev.size === TYPE_ORDER.length;
      const onlyThis = prev.size === 1 && prev.has(type);
      if (allActive || (!onlyThis && !prev.has(type))) {
        return new Set([type]);
      }
      if (onlyThis) {
        return new Set(TYPE_ORDER);
      }
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next.size === 0 ? new Set(TYPE_ORDER) : next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_DEVICES
      .filter(d => activeTypes.has(d.type))
      .filter(d => !q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
      .sort((a, b) => (STATUS_SORT[a.status] ?? 2) - (STATUS_SORT[b.status] ?? 2));
  }, [query, activeTypes]);

  const grouped = useMemo(() => {
    const groups: { type: DeviceType; label: string; devices: Device[] }[] = [];
    for (const type of TYPE_ORDER) {
      const devices = filtered.filter(d => d.type === type);
      if (devices.length > 0) {
        groups.push({ type, label: TYPE_LABELS[type], devices });
      }
    }
    return groups;
  }, [filtered]);

  const handleRowClick = useCallback((device: Device) => {
    setExpandedId(prev => prev === device.id ? null : device.id);
    onFlyTo(device.lat, device.lon);
  }, [onFlyTo]);

  return (
    <aside
      className={`absolute top-0 bottom-0 right-0 w-96 bg-[#141414] border-l border-white/10 flex flex-col z-10 ${noTransition ? '' : 'transition-all duration-300 ease-in-out'} ${open ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 px-4 pt-3 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-white uppercase tracking-wider" dir="rtl">
            מכשירים ({ALL_DEVICES.length})
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="relative" dir="rtl">
          <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חיפוש..."
            className="w-full bg-white/[0.04] border border-white/10 rounded text-[12px] text-zinc-300 placeholder-zinc-600 pr-7 pl-2 py-1.5 outline-none focus:border-white/20 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Type filter toggles */}
        <TooltipPrimitive.Provider delayDuration={150} skipDelayDuration={400}>
          <div className="flex items-center gap-1">
            {TYPE_ORDER.map(type => {
              const FilterIcon = TYPE_FILTER_ICONS[type];
              const isActive = activeTypes.has(type);
              const allActive = activeTypes.size === TYPE_ORDER.length;
              const count = ALL_DEVICES.filter(d => d.type === type).length;
              return (
                <TooltipPrimitive.Root key={type}>
                  <TooltipPrimitive.Trigger asChild>
                    <button
                      onClick={() => handleTypeToggle(type)}
                      className={`p-1.5 rounded transition-colors ${
                        isActive && !allActive
                          ? 'bg-white/10 text-zinc-300 ring-1 ring-white/10'
                          : 'text-white/60 hover:text-zinc-400 hover:bg-white/[0.04]'
                      }`}
                    >
                      <FilterIcon size={20} fill="currentColor" />
                    </button>
                  </TooltipPrimitive.Trigger>
                  <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                      side="top"
                      sideOffset={6}
                      className="px-2 py-1 rounded bg-zinc-800 border border-white/10 text-[10px] text-zinc-300 whitespace-nowrap z-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                      dir="rtl"
                    >
                      {TYPE_LABELS[type]} ({count})
                    </TooltipPrimitive.Content>
                  </TooltipPrimitive.Portal>
                </TooltipPrimitive.Root>
              );
            })}
          </div>
        </TooltipPrimitive.Provider>
      </div>

      {/* Device list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {grouped.length === 0 ? (
          <div className="px-3 py-8 text-center text-[12px] text-zinc-600" dir="rtl">
            אין מכשירים תואמים
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.type}>
              <div className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white/70 border-b border-white/5" dir="rtl">
                {group.label} ({group.devices.length})
              </div>
              {group.devices.map(device => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isExpanded={expandedId === device.id}
                  onToggle={() => handleRowClick(device)}
                  onHover={onDeviceHover ?? (() => {})}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
