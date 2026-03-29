import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { X, Search, Camera, AlertTriangle, MapPin, BellOff, Wrench, Check, Loader2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { LAYOUT_TOKENS } from '@/primitives/tokens';
import { StatusChip } from '@/primitives/StatusChip';
import {
  CAMERA_ASSETS,
  RADAR_ASSETS,
  DRONE_HIVE_ASSETS,
  REGULUS_EFFECTORS,
  LAUNCHER_ASSETS,
  LIDAR_ASSETS,
  WEAPON_SYSTEM_ASSETS,
  SensorIcon,
  CameraIcon,
  RadarIcon,
  DroneHiveIcon,
  LauncherIcon,
  LidarIcon,
} from './TacticalMap';

export const DEVICE_CAMERA_DRAG_TYPE = 'DEVICE_CAMERA';
export interface DeviceCameraDragItem {
  cameraId: string;
  label: string;
}

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

type DeviceType = 'camera' | 'radar' | 'dock' | 'drone' | 'ecm' | 'launcher' | 'lidar' | 'weapon_system';
type ConnectionState = 'online' | 'offline' | 'error' | 'warning';
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
  connectionState: ConnectionState;
  fovDeg?: number;
  bearingDeg?: number;
  coverageRadiusM?: number;
  batteryPct?: number;
  capabilities?: CameraCapability[];
  altitude?: string;
  Icon: React.FC<{ size?: number; fill?: string }>;
}

const TYPE_ORDER: DeviceType[] = ['camera', 'radar', 'dock', 'drone', 'ecm', 'launcher', 'lidar', 'weapon_system'];

const TYPE_LABELS: Record<DeviceType, string> = {
  camera: 'מצלמות',
  radar: 'מכ"מים',
  dock: 'כוורות',
  drone: 'רחפנים',
  ecm: 'משבשים',
  launcher: 'משגרים',
  lidar: 'לידר',
  weapon_system: 'מערכות נשק',
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
  dock: DroneHiveIcon,
  drone: DroneDeviceIcon,
  ecm: SensorIcon,
  launcher: LauncherIcon,
  lidar: LidarIcon,
  weapon_system: LauncherIcon,
};

const STATUS_SORT: Record<string, number> = { offline: 0, active: 1, available: 2 };

const SENSOR_BATTERY: Record<string, number | undefined> = {
  'SENS-NVT-MAGOS-N': 82,
  'SENS-NVT-MAGOS-S': 45,
  'RAD-NVT-RADA': 97,
  'RAD-NVT-ELTA': 74,
  'LIDAR-NVT-01': 63,
};

const CAMERA_CAPS: Record<string, CameraCapability[]> = {
  'CAM-NVT-PTZ-N': ['video', 'photo'],
  'CAM-NVT-PIXELSIGHT': ['video'],
};

const DEVICE_HEALTH: Record<string, OperationalStatus> = {
  'SENS-NVT-MAGOS-S': 'malfunctioning',
  'REG-NVT-SOUTH': 'malfunctioning',
};

export const DEVICE_CONNECTION: Record<string, ConnectionState> = {
  'SENS-NVT-MAGOS-S': 'warning',
  'REG-NVT-SOUTH': 'error',
  'FRIENDLY-02': 'offline',
  'LIDAR-NVT-01': 'warning',
};

const CAMERA_PRESETS: Record<string, string[]> = {
  'CAM-NVT-PTZ-N': ['זום', 'לילה', 'רגיל'],
  'CAM-NVT-PIXELSIGHT': ['רגיל', 'תרמי'],
};

const ALL_DEVICES: Device[] = [
  ...CAMERA_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'camera' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as OperationalStatus,
    connectionState: (DEVICE_CONNECTION[a.id] ?? 'online') as ConnectionState,
    fovDeg: a.fovDeg, bearingDeg: a.bearingDeg, Icon: CameraIcon,
    batteryPct: a.id === 'CAM-NVT-PTZ-N' ? 18 : undefined,
    capabilities: CAMERA_CAPS[a.id],
  })),
  ...RADAR_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'radar' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as OperationalStatus,
    connectionState: (DEVICE_CONNECTION[a.id] ?? 'online') as ConnectionState,
    fovDeg: a.fovDeg, bearingDeg: a.bearingDeg, Icon: RadarIcon,
  })),
  ...DRONE_HIVE_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'dock' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    operationalStatus: 'operational' as OperationalStatus,
    connectionState: 'online' as ConnectionState,
    Icon: DroneHiveIcon,
    batteryPct: 91,
  })),
  ...REGULUS_EFFECTORS.map(e => ({
    id: e.id, name: e.name, type: 'ecm' as DeviceType,
    lat: e.lat, lon: e.lon,
    status: (e.status === 'active' ? 'active' : e.status === 'inactive' ? 'offline' : 'available') as Device['status'],
    operationalStatus: (DEVICE_HEALTH[e.id] ?? 'operational') as OperationalStatus,
    connectionState: (DEVICE_CONNECTION[e.id] ?? 'online') as ConnectionState,
    coverageRadiusM: e.coverageRadiusM, Icon: SensorIcon,
  })),
  ...LAUNCHER_ASSETS.map(l => ({
    id: l.id, name: 'משגר טילים', type: 'launcher' as DeviceType,
    lat: l.latitude, lon: l.longitude, status: 'available' as const,
    operationalStatus: 'operational' as OperationalStatus,
    connectionState: 'online' as ConnectionState,
    Icon: LauncherIcon,
  })),
  ...LIDAR_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'lidar' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    operationalStatus: (DEVICE_HEALTH[a.id] ?? 'operational') as OperationalStatus,
    connectionState: (DEVICE_CONNECTION[a.id] ?? 'online') as ConnectionState,
    fovDeg: a.fovDeg, bearingDeg: a.bearingDeg, Icon: LidarIcon,
  })),
  ...WEAPON_SYSTEM_ASSETS.map(a => ({
    id: a.id, name: a.typeLabel, type: 'weapon_system' as DeviceType,
    lat: a.latitude, lon: a.longitude, status: 'available' as const,
    operationalStatus: 'operational' as OperationalStatus,
    connectionState: 'online' as ConnectionState,
    Icon: LauncherIcon,
  })),
  { id: 'FRIENDLY-01', name: 'סיור-3', type: 'drone' as DeviceType,
    lat: 32.470, lon: 35.005, status: 'active' as const,
    operationalStatus: 'operational' as OperationalStatus,
    connectionState: 'online' as ConnectionState,
    altitude: '80 מ׳', Icon: DroneDeviceIcon,
  },
  { id: 'FRIENDLY-02', name: 'תצפית-7', type: 'drone' as DeviceType,
    lat: 32.463, lon: 34.998, status: 'active' as const,
    operationalStatus: 'operational' as OperationalStatus,
    connectionState: (DEVICE_CONNECTION['FRIENDLY-02'] ?? 'online') as ConnectionState,
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
  const colorClass = pct > 60 ? 'text-emerald-400' : pct > 30 ? 'text-amber-400' : pct >= 20 ? 'text-orange-400' : 'text-red-400';
  const fillWidth = Math.max(1, (pct / 100) * 17);
  return (
    <svg className={colorClass} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width={16} height={16}>
      <rect x="1" y="5" width="19" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="2.5" y="6.5" width={fillWidth} height="11" rx="1" fill="currentColor" />
      <rect x="20" y="10" width="3" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

const CONNECTION_STATE_LABELS: Record<ConnectionState, string> = {
  online: 'מחובר',
  offline: 'לא מקוון',
  error: 'שגיאה',
  warning: 'אזהרה',
};

const CONNECTION_STATE_COLORS: Record<ConnectionState, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-zinc-500',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
};

const CONNECTION_STATE_CHIP_COLORS: Record<ConnectionState, 'green' | 'gray' | 'red' | 'orange'> = {
  online: 'green',
  offline: 'gray',
  error: 'red',
  warning: 'orange',
};

function DeviceRow({
  device,
  isExpanded,
  onToggle,
  onHover,
  onJamActivate,
  onFlyTo,
  isMuted,
  muteRemaining,
  onToggleMute,
}: {
  device: Device;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
  onJamActivate?: (jammerId: string) => void;
  onFlyTo: (lat: number, lon: number) => void;
  isMuted: boolean;
  muteRemaining: string | null;
  onToggleMute: (deviceId: string) => void;
}) {
  const metricParts: string[] = [];
  if (device.coverageRadiusM != null) metricParts.push(`${(device.coverageRadiusM / 1000).toFixed(1)}km`);

  const isMalfunctioning = device.operationalStatus === 'malfunctioning';
  const isCamera = device.type === 'camera';
  const presets = CAMERA_PRESETS[device.id];

  const [activePreset, setActivePreset] = useState(presets?.[0] ?? '');
  const [wipersOn, setWipersOn] = useState(false);
  const [calibState, setCalibState] = useState<'idle' | 'running' | 'done'>('idle');

  useEffect(() => {
    if (calibState !== 'running') return;
    const t = setTimeout(() => setCalibState('done'), 2000);
    return () => clearTimeout(t);
  }, [calibState]);

  useEffect(() => {
    if (calibState !== 'done') return;
    const t = setTimeout(() => setCalibState('idle'), 1500);
    return () => clearTimeout(t);
  }, [calibState]);

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DEVICE_CAMERA_DRAG_TYPE,
    item: { cameraId: device.id, label: device.name } satisfies DeviceCameraDragItem,
    canDrag: isCamera,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [device.id, device.name, isCamera]);

  const statRows: { label: string; value: string; color?: string }[] = [
    { label: 'מיקום', value: `${device.lat.toFixed(4)}, ${device.lon.toFixed(4)}` },
  ];
  if (device.bearingDeg != null) statRows.push({ label: 'כיוון', value: `${device.bearingDeg}°` });
  if (device.fovDeg != null) statRows.push({ label: 'שדה ראייה', value: `${device.fovDeg}°` });
  if (device.coverageRadiusM != null) statRows.push({ label: 'כיסוי', value: `${device.coverageRadiusM.toLocaleString()}m` });
  if (device.altitude != null) statRows.push({ label: 'גובה', value: device.altitude });
  statRows.push({
    label: 'תקינות',
    value: isMalfunctioning ? 'תקלה' : 'תקין',
    color: isMalfunctioning ? 'text-orange-400' : 'text-emerald-400',
  });
  if (device.batteryPct != null) {
    statRows.push({
      label: 'סוללה',
      value: `${device.batteryPct}%`,
      color: device.batteryPct <= 20 ? 'text-red-400' : device.batteryPct <= 40 ? 'text-amber-400' : 'text-emerald-400',
    });
  }

  const showStatusDot = device.connectionState !== 'online';
  const isOffline = device.connectionState === 'offline';

  return (
    <Collapsible open={isExpanded} style={isDragging ? { opacity: 0.4 } : undefined}>
      <div
        ref={isCamera ? dragRef : undefined}
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className={`flex items-center justify-center gap-2.5 px-4 py-2.5 text-right transition-[background-color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 border-b border-white/[0.06] ${
          isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04] active:bg-white/[0.06]'
        } ${isCamera ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        onMouseEnter={() => onHover(device.id)}
        onMouseLeave={() => onHover(null)}
      >
        <div className={`relative w-8 h-8 rounded flex items-center justify-center shrink-0 ${isMalfunctioning ? 'bg-orange-900/40' : 'bg-white/10'}`}>
          <device.Icon size={20} fill={isMalfunctioning ? '#f97316' : 'white'} />
          {showStatusDot && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-zinc-950 ${CONNECTION_STATE_COLORS[device.connectionState]}`}
                  aria-label={CONNECTION_STATE_LABELS[device.connectionState]}
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                showArrow={false}
                className="px-2 py-1 text-[10px] text-zinc-300 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] whitespace-nowrap"
              >
                {CONNECTION_STATE_LABELS[device.connectionState]}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[13px] font-medium truncate ${isMalfunctioning ? 'text-orange-300' : 'text-zinc-300'}`}>{device.name}</span>
              {isMalfunctioning && <AlertTriangle size={11} className="text-orange-400 shrink-0" />}
              {device.connectionState !== 'online' && (
                <StatusChip
                  label={CONNECTION_STATE_LABELS[device.connectionState]}
                  color={CONNECTION_STATE_CHIP_COLORS[device.connectionState]}
                  className="h-5 px-1.5 text-[10px] leading-none"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isMuted && muteRemaining && (
                <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-white">
                  <BellOff size={12} className="text-white" />
                  {muteRemaining}
                </span>
              )}
              {device.batteryPct != null && (
                <span className="flex items-center gap-1.5 text-[11px] font-['Heebo'] tabular-nums text-white/50 align-middle">
                  <BatteryIcon pct={device.batteryPct} />
                  {device.batteryPct}%
                </span>
              )}
            </div>
          </div>
          {metricParts.length > 0 && (
            <div className="text-[11px] font-mono tabular-nums text-white/50 truncate">
              {metricParts.join(' · ')}
            </div>
          )}
        </div>
        {device.type === 'ecm' && (() => {
          const isDisabled = isOffline || isMalfunctioning || device.status === 'active';
          const disabledReason = isOffline ? 'המכשיר לא מקוון' : isMalfunctioning ? 'המכשיר בתקלה' : device.status === 'active' ? 'שיבוש כבר פעיל' : undefined;
          const btn = (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onJamActivate?.(device.id); }}
              disabled={isDisabled}
              className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-[background-color,transform] duration-150 ease-out disabled:opacity-40 disabled:cursor-not-allowed bg-[oklch(0.348_0.111_17)] text-[oklch(0.927_0.062_17)] ring-1 ring-inset ring-[oklch(0.348_0.111_17_/_0.4)] hover:bg-[oklch(0.445_0.151_17)] active:scale-[0.98] active:bg-[oklch(0.295_0.082_17)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <JamIcon size={12} />
              {device.status === 'active' ? 'שיבוש פעיל' : 'הפעל'}
            </button>
          );

          if (!disabledReason) return btn;

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  {btn}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                showArrow={false}
                className="px-2 py-1 text-[10px] text-zinc-300 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] whitespace-nowrap"
              >
                {disabledReason}
              </TooltipContent>
            </Tooltip>
          );
        })()}
      </div>

      <CollapsibleContent className="overflow-hidden animate-in fade-in-0 duration-200">
        <div className="flex flex-col bg-white/[0.03]">
          {isCamera && presets && (
            <Tabs value={activePreset} onValueChange={setActivePreset} onClick={(e) => e.stopPropagation()}>
              <TabsList variant="line" className="justify-end items-end px-3" aria-label="מצב מצלמה">
                {presets.map((preset) => (
                  <TabsTrigger key={preset} value={preset}>
                    {preset}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {isCamera && (
            <div className="relative w-full h-[200px] overflow-hidden bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera size={24} className="text-white/20" />
              </div>
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-sm">
                <div className="size-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
                <span className="text-[9px] font-medium text-white/90 uppercase tracking-wide">Live</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-x-4 gap-y-5 px-4 py-3">
            {statRows.map(row => (
              <DetailRow key={row.label} label={row.label} value={row.value} color={row.color} />
            ))}
          </div>

          <div className="flex items-center gap-2 px-2 py-1.5 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFlyTo(device.lat, device.lon); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
              aria-label="מרכז במפה"
            >
              <MapPin size={12} />
              מרכז במפה
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleMute(device.id); }}
              aria-pressed={isMuted}
              disabled={isOffline}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-[background-color,color,transform] duration-150 ease-out cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none ${
                isMuted
                  ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                  : 'text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90'
              } ${isOffline ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`}
              aria-label={isMuted ? 'בטל השתקה' : 'השתק'}
            >
              <BellOff size={12} />
              {isMuted ? 'בטל השתקה' : 'השתק'}
            </button>

            {device.type === 'drone' && (
              <>
                <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/60">מגבים</span>
                  <Switch
                    checked={wipersOn}
                    onCheckedChange={setWipersOn}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isOffline}
                    aria-label="מגבים"
                    className="h-[18px] w-8 data-[state=checked]:bg-sky-500/80 data-[state=unchecked]:bg-white/10"
                  />
                </div>
                <button
                  type="button"
                  disabled={isOffline || calibState !== 'idle'}
                  aria-busy={calibState === 'running'}
                  onClick={(e) => { e.stopPropagation(); setCalibState('running'); }}
                  className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 hover:text-white/90 active:scale-[0.98] transition-[background-color,color,transform] duration-150 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:outline-none"
                  aria-label="כיול"
                >
                  {calibState === 'running' ? (
                    <Loader2 size={12} className="animate-spin motion-reduce:animate-none" />
                  ) : calibState === 'done' ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Wrench size={12} />
                  )}
                  {calibState === 'running' ? 'מכייל...' : calibState === 'done' ? 'הושלם' : 'כיול'}
                </button>
              </>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
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
  width?: number;
  focusedDeviceId?: string | null;
}

export function DevicesPanel({ open, onClose, onFlyTo, onDeviceHover, onJamActivate, noTransition, width, focusedDeviceId }: DevicesPanelProps) {
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<DeviceType>>(new Set(TYPE_ORDER));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const focusedRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusedDeviceId) return;
    const device = ALL_DEVICES.find(d => d.id === focusedDeviceId);
    if (!device) return;
    setExpandedId(focusedDeviceId);
    setActiveTypes(prev => {
      if (prev.has(device.type)) return prev;
      const next = new Set(prev);
      next.add(device.type);
      return next;
    });
    setQuery('');
    requestAnimationFrame(() => {
      focusedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [focusedDeviceId]);

  const [mutedDevices, setMutedDevices] = useState<Map<string, number>>(new Map());
  const [, setTick] = useState(0);

  useEffect(() => {
    if (mutedDevices.size === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setMutedDevices(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [deviceId, expiry] of next) {
          if (expiry <= now) {
            next.delete(deviceId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [mutedDevices.size > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMute = useCallback((deviceId: string) => {
    setMutedDevices(prev => {
      const next = new Map(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.set(deviceId, Date.now() + 30 * 60 * 1000);
      }
      return next;
    });
  }, []);

  const getMuteRemaining = useCallback((deviceId: string): string | null => {
    const expiry = mutedDevices.get(deviceId);
    if (!expiry) return null;
    const remaining = Math.max(0, expiry - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [mutedDevices]);

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

  const typeCounts = useMemo(() => {
    const counts = {} as Record<DeviceType, number>;
    for (const type of TYPE_ORDER) {
      counts[type] = ALL_DEVICES.filter(d => d.type === type).length;
    }
    return counts;
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
  }, []);

  return (
    <aside
      className={`absolute top-0 bottom-0 right-0 bg-zinc-950 border-l border-white/10 flex flex-col z-10 font-sans ${noTransition ? '' : 'transition-transform duration-300 ease-out'} ${open ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
      style={{ width: width ?? LAYOUT_TOKENS.sidebarWidthPx }}
    >
      <div className="flex flex-col gap-2 px-4 pt-3 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-white uppercase tracking-wider">
            מכשירים ({ALL_DEVICES.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 -m-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            aria-label="סגור"
          >
            <X size={14} />
          </button>
        </div>

        <div className="relative">
          <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חיפוש..."
            className="w-full bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded text-[12px] text-zinc-300 placeholder-zinc-600 pr-7 pl-7 py-1.5 outline-none focus:shadow-[0_0_0_1px_rgba(255,255,255,0.25)] focus:ring-1 focus:ring-white/15 transition-shadow"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              aria-label="נקה חיפוש"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1">
            {TYPE_ORDER.map(type => {
              const FilterIcon = TYPE_FILTER_ICONS[type];
              const isActive = activeTypes.has(type);
              const allActive = activeTypes.size === TYPE_ORDER.length;
              const count = typeCounts[type];
              return (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleTypeToggle(type)}
                      aria-label={TYPE_LABELS[type]}
                      className={`p-2 rounded transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                        isActive && !allActive
                          ? 'bg-white/15 text-white ring-1 ring-white/30'
                          : 'text-white hover:text-zinc-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <FilterIcon size={type === 'launcher' || type === 'weapon_system' ? 24 : 20} fill="currentColor" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    showArrow={false}
                    className="px-2 py-1 text-[10px] text-zinc-300 bg-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] whitespace-nowrap"
                  >
                    {TYPE_LABELS[type]} ({count})
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="mr-auto px-2 py-1 rounded text-[11px] text-white/70 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                aria-label="איפוס סינון"
              >
                ניקוי
              </button>
            )}
          </div>
        </TooltipProvider>
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="px-3 py-8 text-center text-[12px] text-zinc-600">
            אין מכשירים תואמים
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.type}>
              <div className="px-4 py-1.5 text-xs font-normal uppercase tracking-wider text-white border-b border-white/5 bg-white/5">
                {group.label} ({group.devices.length})
              </div>
              {group.devices.map(device => (
                <div key={device.id} ref={device.id === focusedDeviceId ? focusedRowRef : undefined}>
                  <DeviceRow
                    device={device}
                    isExpanded={expandedId === device.id}
                    onToggle={() => handleRowClick(device)}
                    onHover={onDeviceHover ?? (() => {})}
                    onJamActivate={onJamActivate}
                    onFlyTo={onFlyTo}
                    isMuted={mutedDevices.has(device.id)}
                    muteRemaining={getMuteRemaining(device.id)}
                    onToggleMute={handleToggleMute}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
