import React, { useState, useMemo, useCallback } from 'react';
import { X, Search, Camera, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { LAYOUT_TOKENS } from '@/primitives/tokens';
import {
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

type DeviceType = 'camera' | 'radar' | 'jammer' | 'drone_hive' | 'launcher' | 'drone';
type OperationalStatus = 'operational' | 'malfunctioning';
type CameraCapability = 'video' | 'photo';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  lat: number;
  lon: number;
  status: 'available' | 'active' | 'offline';
  operationalStatus: OperationalStatus;
  fovDeg?: number;
  bearingDeg?: number;
  coverageRadiusM?: number;
  batteryPct?: number;
  capabilities?: CameraCapability[];
  altitude?: string;
  Icon: React.FC<{ size?: number; fill?: string }>;
}

const TYPE_ORDER: DeviceType[] = ['camera', 'radar', 'drone_hive', 'drone', 'jammer', 'launcher'];

const TYPE_LABELS: Record<DeviceType, string> = {
  camera: 'מצלמות',
  radar: 'מכ"מים',
  drone_hive: 'כוורות',
  drone: 'רחפנים',
  jammer: 'משבשים',
  launcher: 'משגרים',
};

const DroneDeviceIcon = ({ size = 28, fill = "white" }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M23.334 15.7502L9.33696 0.583495L5.86139 4.0835L10.5007 11.0835L9.32456 15.7502L10.5007 20.4168L5.86139 27.4168L9.32456 30.6801L23.334 15.7502Z"
      fill={fill}
      stroke="#0a0a0a"
      strokeWidth="1"
    />
  </svg>
);

const TYPE_FILTER_ICONS: Record<DeviceType, React.FC<{ size?: number; fill?: string }>> = {
  camera: CameraIcon,
  radar: RadarIcon,
  drone_hive: DroneHiveIcon,
  drone: DroneDeviceIcon,
  jammer: SensorIcon,
  launcher: LauncherIcon,
};

const STATUS_SORT: Record<string, number> = { offline: 0, active: 1, available: 2 };

const SENSOR_BATTERY: Record<string, number | undefined> = {
  'SENS-NVT-MAGOS-N': 82,
  'SENS-NVT-MAGOS-S': 45,
};

const CAMERA_CAPS: Record<string, CameraCapability[]> = {
  'CAM-NVT-PTZ-N': ['video', 'photo'],
  'CAM-NVT-PIXELSIGHT': ['video'],
};

const DEVICE_HEALTH: Record<string, OperationalStatus> = {
  'SENS-NVT-MAGOS-S': 'malfunctioning',
  'REG-NVT-SOUTH': 'malfunctioning',
};

const ALL_DEVICES: Device[] = [
  ...CAMERA_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'camera' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as OperationalStatus,
    fovDeg: a.fovDeg, bearingDeg: a.bearingDeg, Icon: CameraIcon,
    batteryPct: a.id === 'CAM-NVT-PTZ-N' ? 18 : undefined,
    capabilities: CAMERA_CAPS[a.id],
  })),
  ...RADAR_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'radar' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as OperationalStatus,
    fovDeg: a.fovDeg, bearingDeg: a.bearingDeg, Icon: RadarIcon,
    batteryPct: SENSOR_BATTERY[a.id],
  })),
  ...DRONE_HIVE_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'drone_hive' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    operationalStatus: 'operational' as OperationalStatus,
    Icon: DroneHiveIcon,
    batteryPct: 91,
  })),
  ...REGULUS_EFFECTORS.map(e => ({
    id: e.id, name: e.name, type: 'jammer' as DeviceType,
    lat: e.lat, lon: e.lon,
    status: (e.status === 'active' ? 'active' : e.status === 'inactive' ? 'offline' : 'available') as Device['status'],
    operationalStatus: (DEVICE_HEALTH[e.id] ?? 'operational') as OperationalStatus,
    coverageRadiusM: e.coverageRadiusM, Icon: SensorIcon,
  })),
  ...LAUNCHER_ASSETS.map(l => ({
    id: l.id, name: 'משגר טילים', type: 'launcher' as DeviceType,
    lat: l.latitude, lon: l.longitude, status: 'available' as const,
    operationalStatus: 'operational' as OperationalStatus,
    Icon: LauncherIcon,
  })),
  { id: 'FRIENDLY-01', name: 'סיור-3', type: 'drone' as DeviceType,
    lat: 31.218, lon: 34.652, status: 'active' as const,
    operationalStatus: 'operational' as OperationalStatus,
    altitude: '80 מ׳', Icon: DroneDeviceIcon,
  },
  { id: 'FRIENDLY-02', name: 'תצפית-7', type: 'drone' as DeviceType,
    lat: 31.225, lon: 34.678, status: 'active' as const,
    operationalStatus: 'operational' as OperationalStatus,
    altitude: '110 מ׳', Icon: DroneDeviceIcon,
  },
];

function JamIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={size} height={size} className={className}>
      <path d="M22 12C19.5 10.5 19.5 5 17.5 5C15.5 5 15.5 10 13 10C10.5 10 10.5 2 8 2C5.5 2 5 10.5 2 12C5 13.5 5.5 22 8 22C10.5 22 10.5 14 13 14C15.5 14 15.5 19 17.5 19C19.5 19 19 13.5 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BatteryIcon({ pct }: { pct: number }) {
  const color = pct > 60 ? '#34d399' : pct > 30 ? '#fbbf24' : pct >= 20 ? '#fb923c' : '#f87171';
  const fillWidth = Math.max(1, (pct / 100) * 17);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={16} height={16}>
      <rect x="1" y="5" width="19" height="14" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="2.5" y="6.5" width={fillWidth} height="11" rx="1" fill={color} />
      <rect x="20" y="10" width="3" height="4" rx="1" fill={color} />
    </svg>
  );
}

function DeviceRow({
  device,
  isExpanded,
  onToggle,
  onHover,
  onJamActivate,
}: {
  device: Device;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
  onJamActivate?: (jammerId: string) => void;
}) {
  const metricParts: string[] = [device.id];
  if (device.coverageRadiusM != null) metricParts.push(`${(device.coverageRadiusM / 1000).toFixed(1)}km`);

  const isMalfunctioning = device.operationalStatus === 'malfunctioning';

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-right hover:bg-white/[0.04] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 rounded-none border-b border-white/[0.06]"
        dir="rtl"
        onMouseEnter={() => onHover(device.id)}
        onMouseLeave={() => onHover(null)}
      >
        <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${isMalfunctioning ? 'bg-orange-900/40' : 'bg-[#333]'}`}>
          <device.Icon size={20} fill={isMalfunctioning ? '#f97316' : 'white'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[13px] font-medium truncate ${isMalfunctioning ? 'text-orange-300' : 'text-[#dee2e6]'}`}>{device.name}</span>
              {isMalfunctioning && <AlertTriangle size={11} className="text-orange-400 shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {device.batteryPct != null && (
                <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-white/50 align-middle">
                  <BatteryIcon pct={device.batteryPct} />
                  {device.batteryPct}%
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-white/50 truncate">
            {metricParts.join(' · ')}
          </div>
        </div>
        {device.type === 'jammer' && (() => {
          const isDisabled = isMalfunctioning || device.status === 'active';
          const disabledReason = isMalfunctioning ? 'המכשיר בתקלה' : device.status === 'active' ? 'שיבוש כבר פעיל' : undefined;
          const btn = (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onJamActivate?.(device.id); }}
              disabled={isDisabled}
              className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 active:bg-red-500/30"
            >
              <JamIcon size={12} />
              {device.status === 'active' ? 'שיבוש פעיל' : 'הפעל'}
            </button>
          );

          if (!disabledReason) return btn;

          return (
            <TooltipPrimitive.Provider delayDuration={150}>
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {btn}
                  </span>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content
                    side="top"
                    sideOffset={6}
                    className="px-2 py-1 rounded bg-zinc-800 border border-white/10 text-[10px] text-zinc-300 whitespace-nowrap z-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                    dir="rtl"
                  >
                    {disabledReason}
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            </TooltipPrimitive.Provider>
          );
        })()}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col bg-white/10" dir="rtl">
              {device.type === 'camera' && (
                <div className="relative w-full h-[200px] rounded overflow-hidden bg-black border border-white/10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera size={24} className="text-white/20" />
                  </div>
                  <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
                    <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-medium text-white/90 uppercase tracking-wide">Live</span>
                  </div>
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
                    <Camera size={10} className="text-white/70" />
                    <span className="text-[9px] text-white/70 font-mono">PTZ</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
                <DetailRow label="מיקום" value={`${device.lat.toFixed(4)}, ${device.lon.toFixed(4)}`} />
                {device.bearingDeg != null && <DetailRow label="כיוון" value={`${device.bearingDeg}°`} />}
                {device.fovDeg != null && <DetailRow label="שדה ראייה" value={`${device.fovDeg}°`} />}
                {device.coverageRadiusM != null && (
                  <DetailRow label="כיסוי" value={`${device.coverageRadiusM.toLocaleString()}m`} />
                )}
                {device.altitude != null && <DetailRow label="גובה" value={device.altitude} />}
                <DetailRow
                  label="תקינות"
                  value={isMalfunctioning ? 'תקלה' : 'תקין'}
                  color={isMalfunctioning ? 'text-orange-400' : 'text-emerald-400'}
                />
                {device.batteryPct != null && (
                  <DetailRow
                    label="סוללה"
                    value={`${device.batteryPct}%`}
                    color={device.batteryPct <= 20 ? 'text-red-400' : device.batteryPct <= 40 ? 'text-amber-400' : 'text-emerald-400'}
                  />
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="w-full flex flex-col justify-center items-start gap-1 text-xs">
      <span className="text-white/60 text-[10px]">{label}</span>
      <span className={`font-sans tabular-nums text-xs ${color ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

interface DevicesPanelProps {
  open: boolean;
  onClose: () => void;
  onFlyTo: (lat: number, lon: number) => void;
  onDeviceHover?: (id: string | null) => void;
  onJamActivate?: (jammerId: string) => void;
  noTransition?: boolean;
}

export function DevicesPanel({ open, onClose, onFlyTo, onDeviceHover, onJamActivate, noTransition }: DevicesPanelProps) {
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

  const hasActiveFilters = query.trim().length > 0 || activeTypes.size !== TYPE_ORDER.length;

  const handleReset = useCallback(() => {
    setQuery('');
    setActiveTypes(new Set(TYPE_ORDER));
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
      className={`absolute top-0 bottom-0 right-0 bg-[#141414] border-l border-white/10 flex flex-col z-10 font-sans ${noTransition ? '' : 'transition-all duration-300 ease-in-out'} ${open ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
      style={{ width: LAYOUT_TOKENS.sidebarWidthPx }}
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
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        isActive && !allActive
                          ? 'bg-white/15 text-white ring-1 ring-white/30'
                          : 'text-white hover:text-zinc-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <FilterIcon size={type === 'launcher' ? 24 : 20} fill="currentColor" />
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

            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="mr-auto px-2 py-1 rounded text-[11px] text-white/70 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
                title="איפוס"
                aria-label="איפוס סינון"
              >
                ניקוי
              </button>
            )}
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
              <div className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/5" dir="rtl">
                {group.label} ({group.devices.length})
              </div>
              {group.devices.map(device => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isExpanded={expandedId === device.id}
                  onToggle={() => handleRowClick(device)}
                  onHover={onDeviceHover ?? (() => {})}
                  onJamActivate={onJamActivate}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
